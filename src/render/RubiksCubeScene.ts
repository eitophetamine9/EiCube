import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { CubeState } from '../cube/CubeState';
import { AnimationQueue, QueuedMove } from './AnimationQueue';
import { Axis, CameraVectors, Face, FACE_COLORS, FaceOrientationMap, ResolvedTurn } from '../cube/types';
import { resolveCameraFaces } from '../cube/cameraResolver';
import { resolveTurn } from '../cube/moves';

interface CubieMeshItem {
  id: string;
  group: THREE.Group;
  initialCoords: [number, number, number];
}

interface DragTarget {
  startX: number;
  startY: number;
  hitPoint: THREE.Vector3;
  cubieWorldPos: THREE.Vector3;
  normal: THREE.Vector3; // cardinal normal (±1, 0, 0), (0, ±1, 0), or (0, 0, ±1)
  pointerId: number;
}

export class RubiksCubeScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: TrackballControls;
  private cubeGroup: THREE.Group;
  private pivotGroup: THREE.Group;
  private cubieItems: CubieMeshItem[] = [];
  private cubeState: CubeState;
  private queue: AnimationQueue;
  private size: number = 3;
  private isDestroyed: boolean = false;
  private lastTime: number = 0;
  private reducedMotion: boolean = false;
  private onSolvedChange?: (isSolved: boolean) => void;
  private onMoveExecuted?: (notation: string, viewRelativeNotation: string) => void;
  private resizeObserver: ResizeObserver;

  // Mouse & Touch Drag-to-Turn State
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private dragTarget: DragTarget | null = null;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;

  constructor(
    container: HTMLElement,
    cubeState: CubeState,
    callbacks?: {
      onSolvedChange?: (isSolved: boolean) => void;
      onMoveExecuted?: (notation: string, viewRelativeNotation: string) => void;
    }
  ) {
    this.container = container;
    this.cubeState = cubeState;
    this.size = cubeState.size;
    this.onSolvedChange = callbacks?.onSolvedChange;
    this.onMoveExecuted = callbacks?.onMoveExecuted;

    // Media query for reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
    });

    // Three.js Scene Setup
    this.scene = new THREE.Scene();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(4.4, 3.4, 5.2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute(
      'aria-label',
      `Interactive 3D ${this.size}x${this.size} Rubik's Cube. Drag layers directly to turn, drag background to orbit, scroll or pinch to zoom.`
    );
    this.container.appendChild(this.renderer.domElement);

    // TrackballControls for smooth 360-degree all-angle inspection with zero POV locking
    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.noPan = true;
    this.controls.rotateSpeed = 2.2;
    this.controls.zoomSpeed = 1.2;
    this.controls.staticMoving = false;
    this.controls.dynamicDampingFactor = 0.28;
    this.updateCameraDistance();

    // Lighting
    this.setupLighting();

    // Cube Groups
    this.cubeGroup = new THREE.Group();
    this.pivotGroup = new THREE.Group();
    this.scene.add(this.cubeGroup);
    this.cubeGroup.add(this.pivotGroup);

    // Create 3D Cubie Meshes
    this.buildCubies();

    // Animation Queue Setup
    this.queue = new AnimationQueue(200);
    this.setupAnimationQueue();

    // Handle Window Resize
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    // Mouse & Touch Drag-to-Turn Listeners (Capture phase ensures cube drag disables OrbitControls immediately)
    this.onPointerDownBound = this.onPointerDown.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound = this.onPointerUp.bind(this);

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDownBound, { capture: true });
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);
    window.addEventListener('pointercancel', this.onPointerUpBound);

    // Animation Loop
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private setupLighting(): void {
    const hemi = new THREE.HemisphereLight(0xf4f8fa, 0xd4dfca, 0.85);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xffffff, 0.72);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.85);
    dirLight1.position.set(6, 8, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xdbe5ec, 0.9);
    dirLight2.position.set(-7, -5, -6);
    this.scene.add(dirLight2);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.75);
    rimLight.position.set(0, 8, -7);
    this.scene.add(rimLight);
  }

  private buildCubies(): void {
    // Clear existing
    this.cubieItems.forEach((item) => {
      this.cubeGroup.remove(item.group);
      item.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    });
    this.cubieItems = [];

    const cubieSize = 0.94;
    const stickerSize = 0.82;
    const stickerOffset = 0.472;
    const bodyGeometry = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.35,
      metalness: 0.1,
    });

    const stickerGeometry = new THREE.PlaneGeometry(stickerSize, stickerSize);

    const stickerMaterials: Record<Face, THREE.MeshStandardMaterial> = {
      U: new THREE.MeshStandardMaterial({ color: FACE_COLORS.U, roughness: 0.2, metalness: 0.05 }),
      D: new THREE.MeshStandardMaterial({ color: FACE_COLORS.D, roughness: 0.2, metalness: 0.05 }),
      F: new THREE.MeshStandardMaterial({ color: FACE_COLORS.F, roughness: 0.2, metalness: 0.05 }),
      B: new THREE.MeshStandardMaterial({ color: FACE_COLORS.B, roughness: 0.2, metalness: 0.05 }),
      R: new THREE.MeshStandardMaterial({ color: FACE_COLORS.R, roughness: 0.2, metalness: 0.05 }),
      L: new THREE.MeshStandardMaterial({ color: FACE_COLORS.L, roughness: 0.2, metalness: 0.05 }),
    };

    for (const cubieData of this.cubeState.cubies) {
      const [x, y, z] = cubieData.coords;
      const cubieGroup = new THREE.Group();
      cubieGroup.position.set(x, y, z);

      // Black body
      const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
      cubieGroup.add(bodyMesh);

      // Stickers
      cubieData.stickers.forEach((sticker) => {
        const stickerMesh = new THREE.Mesh(stickerGeometry, stickerMaterials[sticker.color]);
        const [nx, ny, nz] = sticker.normal;

        stickerMesh.position.set(nx * stickerOffset, ny * stickerOffset, nz * stickerOffset);

        if (nx === 1) stickerMesh.rotation.y = Math.PI / 2;
        else if (nx === -1) stickerMesh.rotation.y = -Math.PI / 2;
        else if (ny === 1) stickerMesh.rotation.x = -Math.PI / 2;
        else if (ny === -1) stickerMesh.rotation.x = Math.PI / 2;
        else if (nz === 1) stickerMesh.rotation.y = 0;
        else if (nz === -1) stickerMesh.rotation.y = Math.PI;

        cubieGroup.add(stickerMesh);
      });

      this.cubeGroup.add(cubieGroup);
      this.cubieItems.push({
        id: cubieData.id,
        group: cubieGroup,
        initialCoords: [x, y, z],
      });
    }
  }

  private setupAnimationQueue(): void {
    let affectedMeshes: THREE.Group[] = [];
    let currentTurn: ResolvedTurn | null = null;

    this.queue.setCallbacks({
      onStart: (move: QueuedMove) => {
        currentTurn = move.turn;
        affectedMeshes = [];

        // Reset pivot
        this.pivotGroup.rotation.set(0, 0, 0);
        this.pivotGroup.position.set(0, 0, 0);
        this.pivotGroup.scale.set(1, 1, 1);

        const axisIdx = currentTurn.axis === 'x' ? 0 : currentTurn.axis === 'y' ? 1 : 2;

        // Find cubies in the affected layers
        for (const item of this.cubieItems) {
          const pos = new THREE.Vector3();
          item.group.getWorldPosition(pos);
          const coord = axisIdx === 0 ? pos.x : axisIdx === 1 ? pos.y : pos.z;

          const inLayer = currentTurn.layers.some((l) => Math.abs(coord - l) < 0.2);
          if (inLayer) {
            affectedMeshes.push(item.group);
            this.pivotGroup.attach(item.group);
          }
        }
      },
      onStep: (_move: QueuedMove, easedProgress: number) => {
        if (!currentTurn) return;
        const currentAngle = currentTurn.angle * easedProgress;
        if (currentTurn.axis === 'x') {
          this.pivotGroup.rotation.x = currentAngle;
        } else if (currentTurn.axis === 'y') {
          this.pivotGroup.rotation.y = currentAngle;
        } else if (currentTurn.axis === 'z') {
          this.pivotGroup.rotation.z = currentAngle;
        }
      },
      onComplete: (move: QueuedMove) => {
        if (!currentTurn) return;

        // Reattach meshes back to cubeGroup
        for (const mesh of affectedMeshes) {
          this.cubeGroup.attach(mesh);
          // Snap position and rotation to prevent numerical drift
          mesh.position.x = Math.round(mesh.position.x * 2) / 2;
          mesh.position.y = Math.round(mesh.position.y * 2) / 2;
          mesh.position.z = Math.round(mesh.position.z * 2) / 2;

          // Snap quaternion to nearest orthogonal orientation
          this.snapMeshOrientation(mesh);
        }

        // Reset pivot
        this.pivotGroup.rotation.set(0, 0, 0);

        // Update pure logical cube state
        this.cubeState.applyTurn(currentTurn.axis, currentTurn.layers, currentTurn.angle);

        // Notify listeners (only notify onMoveExecuted if it is NOT a scramble turn)
        const isSolved = this.cubeState.isSolved();
        this.onSolvedChange?.(isSolved);
        if (!move.isScramble) {
          this.onMoveExecuted?.(move.turn.notation, move.turn.notation);
        }

        currentTurn = null;
        affectedMeshes = [];
      },
    });
  }

  private snapMeshOrientation(mesh: THREE.Group): void {
    const rotMatrix = new THREE.Matrix4().makeRotationFromQuaternion(mesh.quaternion);
    const elements = rotMatrix.elements;

    // Basis vectors
    const vX = new THREE.Vector3(elements[0], elements[1], elements[2]);
    const vY = new THREE.Vector3(elements[4], elements[5], elements[6]);

    const snapVector = (v: THREE.Vector3) => {
      const absX = Math.abs(v.x);
      const absY = Math.abs(v.y);
      const absZ = Math.abs(v.z);
      if (absX > absY && absX > absZ) {
        return new THREE.Vector3(Math.sign(v.x), 0, 0);
      } else if (absY > absZ) {
        return new THREE.Vector3(0, Math.sign(v.y), 0);
      } else {
        return new THREE.Vector3(0, 0, Math.sign(v.z));
      }
    };

    const snappedX = snapVector(vX);
    const snappedY = snapVector(vY);
    const snappedZ = new THREE.Vector3().crossVectors(snappedX, snappedY);

    const snappedMatrix = new THREE.Matrix4().makeBasis(snappedX, snappedY, snappedZ);
    mesh.quaternion.setFromRotationMatrix(snappedMatrix);
  }

  /**
   * Retrieves current camera vectors relative to cube center.
   */
  getCameraVectors(): CameraVectors {
    // Vector from origin (0,0,0) toward camera
    const forwardTowardCam = this.camera.position.clone().normalize();
    // Camera right in world coordinates
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion).normalize();
    // Camera up in world coordinates
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion).normalize();

    return {
      forwardTowardCamera: [forwardTowardCam.x, forwardTowardCam.y, forwardTowardCam.z],
      up: [up.x, up.y, up.z],
      right: [right.x, right.y, right.z],
    };
  }

  /**
   * Computes the current camera face orientation map.
   */
  getCameraFaceMap(): FaceOrientationMap {
    return resolveCameraFaces(this.getCameraVectors());
  }

  /**
   * Executes a move notation.
   * If viewRelative is true, resolves against the camera at this exact instant!
   */
  executeMove(
    notation: string,
    viewRelative: boolean = true,
    isScramble: boolean = false,
    onComplete?: () => void
  ): void {
    const faceMap = viewRelative ? this.getCameraFaceMap() : undefined;
    const turn = resolveTurn(notation, faceMap, this.size);
    this.queue.enqueue(turn, isScramble, onComplete);
  }

  /**
   * Enqueues an algorithm string (e.g. "R U R' U'").
   */
  executeAlgorithm(
    algMoves: string[],
    viewRelative: boolean = true,
    isScramble: boolean = false,
    onAllComplete?: () => void
  ): void {
    const faceMap = viewRelative ? this.getCameraFaceMap() : undefined;
    const turns = algMoves.map((m) => resolveTurn(m, faceMap, this.size));
    this.queue.enqueueMultiple(turns, isScramble, onAllComplete);
  }

  resetCube(): void {
    this.queue.clear();
    this.cubeState.reset();
    this.buildCubies();
    this.onSolvedChange?.(true);
  }

  setSize(newSize: number): void {
    if (newSize < 2 || newSize > 5) return;
    this.queue.clear();
    this.size = newSize;
    this.cubeState = new CubeState(newSize);
    this.buildCubies();
    
    this.updateCameraDistance();
    this.onSolvedChange?.(true);
  }

  getCubeState(): CubeState {
    return this.cubeState;
  }

  getSize(): number {
    return this.size;
  }

  setSpeed(durationMs: number): void {
    this.queue.setBaseDuration(durationMs);
  }

  setRotateSpeed(speed: number): void {
    this.controls.rotateSpeed = Math.max(0.5, Math.min(5.0, speed));
  }

  getRotateSpeed(): number {
    return this.controls.rotateSpeed;
  }

  getSpeed(): number {
    return this.queue.getBaseDuration();
  }

  isBusy(): boolean {
    return this.queue.isBusy();
  }

  private updateCameraDistance(): void {
    if (this.isDestroyed || !this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    const aspect = width / height;
    // Bounding radius based on cube size
    const rBound = (this.size / 2) * Math.SQRT2 * 1.05;
    const vFovRad = (this.camera.fov * Math.PI) / 360;
    const halfTan = Math.tan(vFovRad);

    const isMobile = width <= 768;
    const marginFactor = isMobile ? 1.40 : 1.24;

    const fitFactor = Math.min(1.0, aspect / 0.95);
    const targetDist = (rBound / (halfTan * fitFactor)) * marginFactor;

    const currentDir = this.camera.position.clone().normalize();
    if (currentDir.lengthSq() < 0.1) {
      currentDir.set(4.4, 3.4, 5.2).normalize();
    }
    this.camera.position.copy(currentDir).multiplyScalar(targetDist);
    this.controls.minDistance = targetDist * 0.55;
    this.controls.maxDistance = targetDist * 2.5;
    this.controls.handleResize();
    this.controls.update();
  }

  private handleResize(): void {
    if (this.isDestroyed || !this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.updateCameraDistance();
  }

  private animate(time: number): void {
    if (this.isDestroyed) return;

    const delta = Math.min(time - this.lastTime, 100);
    this.lastTime = time;

    this.controls.update();
    this.queue.tick(delta, this.reducedMotion);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }

  public resetCameraView(): void {
    const defaultDir = new THREE.Vector3(4.4, 3.4, 5.2).normalize();
    this.camera.position.copy(defaultDir);
    this.camera.up.set(0, 1, 0);
    this.controls.target.set(0, 0, 0);
    (this.controls as any)._lastAngle = 0;
    this.updateCameraDistance();
  }

  dispose(): void {
    this.isDestroyed = true;
    this.resizeObserver.disconnect();
    this.controls.dispose();

    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDownBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup', this.onPointerUpBound);
    window.removeEventListener('pointercancel', this.onPointerUpBound);

    this.cubieItems.forEach((item) => {
      item.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    });

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  // =========================================================================
  // MOUSE & TOUCH LAYER DRAG INTERACTION
  // =========================================================================

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (this.queue.isBusy()) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cubeGroup.children, true);

    if (intersects.length === 0) {
      // User clicked on the background: Allow OrbitControls to change perspective!
      this.dragTarget = null;
      this.controls.enabled = true;
      this.renderer.domElement.style.cursor = 'grabbing';
      return;
    }

    // User clicked ON THE CUBE: Immediately lock camera controls so perspective does NOT follow or tilt!
    this.controls.enabled = false;
    (this.controls as any)._lastAngle = 0;
    this.renderer.domElement.style.cursor = 'grabbing';

    const hit = intersects[0];
    let cubieGroup: THREE.Group | null = null;
    let curr: THREE.Object3D | null = hit.object;
    while (curr && curr.parent && curr.parent !== this.cubeGroup) {
      curr = curr.parent;
    }
    if (curr instanceof THREE.Group) {
      cubieGroup = curr;
    }
    if (!cubieGroup) return;

    const cubieWorldPos = new THREE.Vector3();
    cubieGroup.getWorldPosition(cubieWorldPos);

    let worldNormal = new THREE.Vector3(0, 0, 1);
    if (hit.face) {
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
    }

    // Snap to nearest cardinal axis
    const ax = Math.abs(worldNormal.x);
    const ay = Math.abs(worldNormal.y);
    const az = Math.abs(worldNormal.z);
    const cardinalNormal = new THREE.Vector3();
    if (ax > ay && ax > az) {
      cardinalNormal.set(Math.sign(worldNormal.x), 0, 0);
    } else if (ay > az) {
      cardinalNormal.set(0, Math.sign(worldNormal.y), 0);
    } else {
      cardinalNormal.set(0, 0, Math.sign(worldNormal.z));
    }

    this.dragTarget = {
      startX: e.clientX,
      startY: e.clientY,
      hitPoint: hit.point.clone(),
      cubieWorldPos: cubieWorldPos.clone(),
      normal: cardinalNormal,
      pointerId: e.pointerId,
    };
  }

  private onPointerMove(e: PointerEvent): void {
    // Dynamic hand cursor feedback
    if (!this.dragTarget) {
      if (this.controls.enabled && (e.buttons === 1 || e.buttons === 2)) {
        this.renderer.domElement.style.cursor = 'grabbing';
        return;
      }

      const rect = this.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.cubeGroup.children, true);
      this.renderer.domElement.style.cursor = intersects.length > 0 ? 'grab' : 'default';
      return;
    }

    if (e.pointerId !== this.dragTarget.pointerId) return;
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  private onPointerUp(e: PointerEvent): void {
    this.controls.enabled = true; // Always restore camera control for subsequent background drags
    (this.controls as any)._lastAngle = 0;

    const target = this.dragTarget;
    this.dragTarget = null;
    this.renderer.domElement.style.cursor = 'grab';

    if (!target || e.pointerId !== target.pointerId) {
      return;
    }

    const dx = e.clientX - target.startX;
    const dy = e.clientY - target.startY;
    const dist = Math.hypot(dx, dy);

    if (dist >= 18) {
      this.resolveAndExecuteDragTurn(target, dx, dy);
    }
  }

  private resolveAndExecuteDragTurn(target: DragTarget, dx: number, dy: number): void {
    const normal = target.normal;
    const u1 = new THREE.Vector3();
    const u2 = new THREE.Vector3();

    if (Math.abs(normal.x) > 0.9) {
      u1.set(0, 1, 0); // Y
      u2.set(0, 0, 1); // Z
    } else if (Math.abs(normal.y) > 0.9) {
      u1.set(1, 0, 0); // X
      u2.set(0, 0, 1); // Z
    } else {
      u1.set(1, 0, 0); // X
      u2.set(0, 1, 0); // Y
    }

    const toScreen = (worldPos: THREE.Vector3): THREE.Vector2 => {
      const v = worldPos.clone().project(this.camera);
      const rect = this.renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((v.x + 1) * rect.width) / 2,
        ((-v.y + 1) * rect.height) / 2
      );
    };

    const P = target.hitPoint;
    const s0 = toScreen(P);
    const s1 = toScreen(P.clone().add(u1));
    const s2 = toScreen(P.clone().add(u2));

    const dir1 = s1.clone().sub(s0);
    const dir2 = s2.clone().sub(s0);

    const dragScreen = new THREE.Vector2(dx, dy);

    const proj1 = dir1.length() > 0 ? dragScreen.dot(dir1.clone().normalize()) : 0;
    const proj2 = dir2.length() > 0 ? dragScreen.dot(dir2.clone().normalize()) : 0;

    let worldDragDir: THREE.Vector3;
    if (Math.abs(proj1) > Math.abs(proj2)) {
      worldDragDir = u1.clone().multiplyScalar(Math.sign(proj1));
    } else {
      worldDragDir = u2.clone().multiplyScalar(Math.sign(proj2));
    }

    const rotVector = new THREE.Vector3().crossVectors(normal, worldDragDir);
    let rotAxis: Axis = 'y';
    let angleSign = 1;

    if (Math.abs(rotVector.x) > 0.9) {
      rotAxis = 'x';
      angleSign = Math.sign(rotVector.x);
    } else if (Math.abs(rotVector.y) > 0.9) {
      rotAxis = 'y';
      angleSign = Math.sign(rotVector.y);
    } else if (Math.abs(rotVector.z) > 0.9) {
      rotAxis = 'z';
      angleSign = Math.sign(rotVector.z);
    }

    const angle = angleSign * (Math.PI / 2);

    const cubiePos = target.cubieWorldPos;
    const rawCoord = rotAxis === 'x' ? cubiePos.x : rotAxis === 'y' ? cubiePos.y : cubiePos.z;

    const validLayers: number[] = this.cubeState.layers;
    const closestLayer = validLayers.reduce((prev: number, curr: number) =>
      Math.abs(curr - rawCoord) < Math.abs(prev - rawCoord) ? curr : prev
    );

    let physicalFace: Face = 'U';
    let isClockwise = false;

    if (rotAxis === 'x') {
      if (closestLayer > 0.2) {
        physicalFace = 'R';
        isClockwise = angle < 0;
      } else if (closestLayer < -0.2) {
        physicalFace = 'L';
        isClockwise = angle > 0;
      }
    } else if (rotAxis === 'y') {
      if (closestLayer > 0.2) {
        physicalFace = 'U';
        isClockwise = angle < 0;
      } else if (closestLayer < -0.2) {
        physicalFace = 'D';
        isClockwise = angle > 0;
      }
    } else if (rotAxis === 'z') {
      if (closestLayer > 0.2) {
        physicalFace = 'F';
        isClockwise = angle < 0;
      } else if (closestLayer < -0.2) {
        physicalFace = 'B';
        isClockwise = angle > 0;
      }
    }

    let notation = '';
    const cameraMap = this.getCameraFaceMap();
    const viewFace = (Object.keys(cameraMap) as Face[]).find((vf) => cameraMap[vf] === physicalFace) || physicalFace;

    if (this.size === 3 && Math.abs(closestLayer) <= 0.2) {
      // 3x3 Slice turn (M, E, S)
      if (rotAxis === 'x') notation = angle > 0 ? 'M' : "M'";
      else if (rotAxis === 'y') notation = angle > 0 ? 'E' : "E'";
      else if (rotAxis === 'z') notation = angle < 0 ? 'S' : "S'";
    } else if (this.size === 4 && Math.abs(closestLayer) < 1.0) {
      // 4x4 Inner slice turn (2R, 2L, 2U, 2D, 2F, 2B)
      notation = isClockwise ? `2${viewFace}` : `2${viewFace}'`;
    } else {
      notation = isClockwise ? viewFace : `${viewFace}'`;
    }

    const turn: ResolvedTurn = {
      axis: rotAxis,
      layers: [closestLayer],
      angle: angle,
      notation: notation,
    };

    this.queue.enqueue(turn, false);
  }
}
