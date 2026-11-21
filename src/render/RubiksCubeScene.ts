import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CubeState } from '../cube/CubeState';
import { AnimationQueue, QueuedMove } from './AnimationQueue';
import { CameraVectors, Face, FACE_COLORS, FaceOrientationMap, ResolvedTurn } from '../cube/types';
import { resolveCameraFaces } from '../cube/cameraResolver';
import { resolveTurn } from '../cube/moves';

interface CubieMeshItem {
  id: string;
  group: THREE.Group;
  initialCoords: [number, number, number];
}

export class RubiksCubeScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
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
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4.2;
    this.controls.maxDistance = 13.0;
    this.controls.rotateSpeed = 0.85;

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

    // Animation Loop
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight1.position.set(6, 8, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, 1.2);
    dirLight2.position.set(-7, -6, -6);
    this.scene.add(dirLight2);

    const rimLight = new THREE.DirectionalLight(0xe2e8f0, 0.9);
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

        // Notify listeners
        const isSolved = this.cubeState.isSolved();
        this.onSolvedChange?.(isSolved);
        this.onMoveExecuted?.(move.turn.notation, move.turn.notation);

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

  setSpeed(durationMs: number): void {
    this.queue.setBaseDuration(durationMs);
  }

  getSpeed(): number {
    return this.queue.getBaseDuration();
  }

  isBusy(): boolean {
    return this.queue.isBusy();
  }

  private handleResize(): void {
    if (this.isDestroyed || !this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
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

  dispose(): void {
    this.isDestroyed = true;
    this.resizeObserver.disconnect();
    this.controls.dispose();

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
}
