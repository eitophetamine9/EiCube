import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PyraminxState, PYRA_COLOR_HEX, generatePyraminxScramble } from '../cube/pyraminxState';

// Regular tetrahedron dimensions
const S = 2.4;
const H = S * Math.sqrt(2 / 3);
const R_INSCRIBED = (S * Math.sqrt(3)) / 6;
const R_CIRCUMSCRIBED = (S * Math.sqrt(3)) / 3;

const V_TOP = new THREE.Vector3(0, (3 * H) / 4, 0);
const V_FRONT_LEFT = new THREE.Vector3(-S / 2, -H / 4, R_INSCRIBED);
const V_FRONT_RIGHT = new THREE.Vector3(S / 2, -H / 4, R_INSCRIBED);
const V_BACK = new THREE.Vector3(0, -H / 4, -R_CIRCUMSCRIBED);

const AXIS_U = V_TOP.clone().normalize();
const AXIS_L = V_FRONT_LEFT.clone().normalize();
const AXIS_R = V_FRONT_RIGHT.clone().normalize();
const AXIS_B = V_BACK.clone().normalize();

const MOVE_AXES: Record<string, THREE.Vector3> = {
  u: AXIS_U,
  U: AXIS_U,
  l: AXIS_L,
  L: AXIS_L,
  r: AXIS_R,
  R: AXIS_R,
  b: AXIS_B,
  B: AXIS_B,
};

// Exact piece indices (faceIdx, stickerIdx) affected by each base move
const MOVE_PIECES: Record<string, Array<[number, number]>> = {
  u: [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  U: [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 1], [1, 2], [1, 3],
    [2, 0], [2, 1], [2, 2], [2, 3],
  ],
  l: [
    [0, 4],
    [2, 8],
    [3, 4],
  ],
  L: [
    [0, 4], [0, 1], [0, 2], [0, 5],
    [2, 8], [2, 7], [2, 6], [2, 5],
    [3, 4], [3, 1], [3, 2], [3, 5],
  ],
  r: [
    [0, 8],
    [1, 4],
    [3, 8],
  ],
  R: [
    [0, 8], [0, 3], [0, 6], [0, 7],
    [1, 4], [1, 1], [1, 5], [1, 2],
    [3, 8], [3, 3], [3, 6], [3, 7],
  ],
  b: [
    [1, 8],
    [2, 4],
    [3, 0],
  ],
  B: [
    [1, 8], [1, 7], [1, 6], [1, 3],
    [2, 4], [2, 1], [2, 5], [2, 2],
    [3, 0], [3, 7], [3, 6], [3, 3],
  ],
};

interface PyraQueuedMove {
  move: string;
  isScramble?: boolean;
  onComplete?: () => void;
}

interface DragTarget {
  startX: number;
  startY: number;
  hitPoint: THREE.Vector3;
  faceIdx: number;
  stickerIdx: number;
  pointerId: number;
}

export class PyraminxScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private state: PyraminxState;
  private mainGroup: THREE.Group;
  private pivotGroup: THREE.Group;
  private pieceGroups: THREE.Group[][] = []; // [faceIdx][stickerIdx]
  private stickerMeshes: THREE.Mesh[][] = []; // [faceIndex][stickerIndex]
  private isDestroyed: boolean = false;
  private lastTime: number = 0;
  private resizeObserver: ResizeObserver;
  private onSolvedChange?: (isSolved: boolean) => void;
  private onMoveExecuted?: (notation: string) => void;

  // Animation Queue State
  private queue: PyraQueuedMove[] = [];
  private activeMove: PyraQueuedMove | null = null;
  private animProgress: number = 0;
  private animDuration: number = 200;
  private baseDuration: number = 200;
  private activePieces: THREE.Group[] = [];
  private activeAxis: THREE.Vector3 = new THREE.Vector3();
  private activeAngle: number = 0;

  // Mouse & Touch Direct Drag State
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private dragTarget: DragTarget | null = null;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;

  constructor(
    container: HTMLElement,
    callbacks?: {
      onSolvedChange?: (isSolved: boolean) => void;
      onMoveExecuted?: (notation: string) => void;
    }
  ) {
    this.container = container;
    this.onSolvedChange = callbacks?.onSolvedChange;
    this.onMoveExecuted = callbacks?.onMoveExecuted;
    this.state = new PyraminxState();

    this.scene = new THREE.Scene();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 0.8, 5.2);

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

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 11.0;
    this.controls.rotateSpeed = 0.85;

    // Three-point studio lighting
    this.setupLighting();

    this.mainGroup = new THREE.Group();
    this.pivotGroup = new THREE.Group();
    this.scene.add(this.mainGroup);
    this.mainGroup.add(this.pivotGroup);

    this.buildSolidPyraminx();

    // Mouse & Touch Drag Listeners (Capture phase ensures piece drag disables OrbitControls immediately)
    this.onPointerDownBound = this.onPointerDown.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound = this.onPointerUp.bind(this);

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDownBound, { capture: true });
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);
    window.addEventListener('pointercancel', this.onPointerUpBound);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight1.position.set(5, 7, 6);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, 1.2);
    dirLight2.position.set(-6, -5, -5);
    this.scene.add(dirLight2);

    const rimLight = new THREE.DirectionalLight(0xe2e8f0, 0.9);
    rimLight.position.set(0, 6, -7);
    this.scene.add(rimLight);
  }

  private buildSolidPyraminx(): void {
    // Clear existing children
    while (this.mainGroup.children.length > 0) {
      const obj = this.mainGroup.children[0];
      this.mainGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }
    this.mainGroup.add(this.pivotGroup);

    this.pieceGroups = [[], [], [], []];
    this.stickerMeshes = [[], [], [], []];

    // Solid inner dark core (scaled to 0.58 so it provides interior shadow without clipping through rotating layers)
    const coreScale = 0.58;
    const coreGeom = new THREE.BufferGeometry();
    const cTop = V_TOP.clone().multiplyScalar(coreScale);
    const cFL = V_FRONT_LEFT.clone().multiplyScalar(coreScale);
    const cFR = V_FRONT_RIGHT.clone().multiplyScalar(coreScale);
    const cB = V_BACK.clone().multiplyScalar(coreScale);

    const coreVertices = new Float32Array([
      // Face 0: Front
      cTop.x, cTop.y, cTop.z,
      cFL.x, cFL.y, cFL.z,
      cFR.x, cFR.y, cFR.z,
      // Face 1: Right
      cTop.x, cTop.y, cTop.z,
      cFR.x, cFR.y, cFR.z,
      cB.x, cB.y, cB.z,
      // Face 2: Left
      cTop.x, cTop.y, cTop.z,
      cB.x, cB.y, cB.z,
      cFL.x, cFL.y, cFL.z,
      // Face 3: Bottom
      cFL.x, cFL.y, cFL.z,
      cB.x, cB.y, cB.z,
      cFR.x, cFR.y, cFR.z,
    ]);
    coreGeom.setAttribute('position', new THREE.BufferAttribute(coreVertices, 3));
    coreGeom.computeVertexNormals();

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.35,
      metalness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    this.mainGroup.add(coreMesh);

    // Faces:
    // Face 0: Front (Green)
    // Face 1: Right (Red)
    // Face 2: Left (Blue)
    // Face 3: Bottom (Yellow)
    const faceDefinitions = [
      { a: V_TOP, b: V_FRONT_LEFT, c: V_FRONT_RIGHT, colorKey: 'G' },
      { a: V_TOP, b: V_FRONT_RIGHT, c: V_BACK, colorKey: 'R' },
      { a: V_TOP, b: V_BACK, c: V_FRONT_LEFT, colorKey: 'B' },
      { a: V_FRONT_LEFT, b: V_BACK, c: V_FRONT_RIGHT, colorKey: 'Y' },
    ];

    faceDefinitions.forEach((def, faceIdx) => {
      this.buildFaceStickersWithBlackBorder(faceIdx, def.a, def.b, def.c);
    });

    this.updateColors();
  }

  private buildFaceStickersWithBlackBorder(
    faceIdx: number,
    A: THREE.Vector3,
    B: THREE.Vector3,
    C: THREE.Vector3
  ): void {
    const faceCenter = new THREE.Vector3().add(A).add(B).add(C).divideScalar(3);
    const faceNormal = faceCenter.clone().normalize();

    const getPoint = (u: number, v: number) => {
      return new THREE.Vector3()
        .addScaledVector(A, 1 - u - v)
        .addScaledVector(B, u)
        .addScaledVector(C, v);
    };

    const rawTriangles: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [];

    // Row 0: top triangle (idx 0)
    rawTriangles.push([getPoint(0, 0), getPoint(1 / 3, 0), getPoint(0, 1 / 3)]);

    // Row 1: (idx 1, 2, 3)
    rawTriangles.push([getPoint(1 / 3, 0), getPoint(2 / 3, 0), getPoint(1 / 3, 1 / 3)]);
    rawTriangles.push([getPoint(1 / 3, 1 / 3), getPoint(0, 1 / 3), getPoint(1 / 3, 0)]); // inverted
    rawTriangles.push([getPoint(0, 1 / 3), getPoint(1 / 3, 1 / 3), getPoint(0, 2 / 3)]);

    // Row 2: (idx 4, 5, 6, 7, 8)
    rawTriangles.push([getPoint(2 / 3, 0), getPoint(1, 0), getPoint(2 / 3, 1 / 3)]);
    rawTriangles.push([getPoint(2 / 3, 1 / 3), getPoint(1 / 3, 1 / 3), getPoint(2 / 3, 0)]); // inverted
    rawTriangles.push([getPoint(1 / 3, 1 / 3), getPoint(2 / 3, 1 / 3), getPoint(1 / 3, 2 / 3)]);
    rawTriangles.push([getPoint(1 / 3, 2 / 3), getPoint(0, 2 / 3), getPoint(1 / 3, 1 / 3)]); // inverted
    rawTriangles.push([getPoint(0, 2 / 3), getPoint(1 / 3, 2 / 3), getPoint(0, 1)]);

    const blackPlasticMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.35,
      metalness: 0.1,
    });

    rawTriangles.forEach((pts, stickerIdx) => {
      let p0 = pts[0].clone();
      let p1 = pts[1].clone();
      let p2 = pts[2].clone();

      // Ensure counter-clockwise outward winding
      const cross = new THREE.Vector3()
        .subVectors(p1, p0)
        .cross(new THREE.Vector3().subVectors(p2, p0));
      if (cross.dot(faceNormal) < 0) {
        const tmp = p1;
        p1 = p2;
        p2 = tmp;
      }

      const center = new THREE.Vector3().add(p0).add(p1).add(p2).divideScalar(3);

      // 1. Black 3D piece backing plate with beveled side walls
      const frameOffset = faceNormal.clone().multiplyScalar(0.016);
      const frameShrink = 0.94;
      const f0 = p0.clone().sub(center).multiplyScalar(frameShrink).add(center).add(frameOffset);
      const f1 = p1.clone().sub(center).multiplyScalar(frameShrink).add(center).add(frameOffset);
      const f2 = p2.clone().sub(center).multiplyScalar(frameShrink).add(center).add(frameOffset);

      // Base footprint on core surface
      const b0 = p0.clone().sub(center).multiplyScalar(frameShrink).add(center);
      const b1 = p1.clone().sub(center).multiplyScalar(frameShrink).add(center);
      const b2 = p2.clone().sub(center).multiplyScalar(frameShrink).add(center);

      // Construct solid 3D piece geometry (top face + 3 beveled side skirts)
      const frameVertices = new Float32Array([
        // Top cap
        f0.x, f0.y, f0.z,
        f1.x, f1.y, f1.z,
        f2.x, f2.y, f2.z,
        // Side 0
        f0.x, f0.y, f0.z,
        f1.x, f1.y, f1.z,
        b1.x, b1.y, b1.z,
        b1.x, b1.y, b1.z,
        b0.x, b0.y, b0.z,
        f0.x, f0.y, f0.z,
        // Side 1
        f1.x, f1.y, f1.z,
        f2.x, f2.y, f2.z,
        b2.x, b2.y, b2.z,
        b2.x, b2.y, b2.z,
        b1.x, b1.y, b1.z,
        f1.x, f1.y, f1.z,
        // Side 2
        f2.x, f2.y, f2.z,
        f0.x, f0.y, f0.z,
        b0.x, b0.y, b0.z,
        b0.x, b0.y, b0.z,
        b2.x, b2.y, b2.z,
        f2.x, f2.y, f2.z,
      ]);

      const frameGeom = new THREE.BufferGeometry();
      frameGeom.setAttribute('position', new THREE.BufferAttribute(frameVertices, 3));
      frameGeom.computeVertexNormals();

      const frameMesh = new THREE.Mesh(frameGeom, blackPlasticMat);
      frameMesh.userData = { faceIdx, stickerIdx };

      // 2. Colored sticker: inset with scale 0.80 to yield the 20% bold black speedcube border
      const stickerShrink = 0.80;
      const stickerOffset = faceNormal.clone().multiplyScalar(0.024);
      const s0 = p0.clone().sub(center).multiplyScalar(stickerShrink).add(center).add(stickerOffset);
      const s1 = p1.clone().sub(center).multiplyScalar(stickerShrink).add(center).add(stickerOffset);
      const s2 = p2.clone().sub(center).multiplyScalar(stickerShrink).add(center).add(stickerOffset);

      const stickerGeom = new THREE.BufferGeometry();
      stickerGeom.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array([
          s0.x, s0.y, s0.z,
          s1.x, s1.y, s1.z,
          s2.x, s2.y, s2.z,
        ]), 3)
      );
      stickerGeom.computeVertexNormals();

      const stickerMat = new THREE.MeshStandardMaterial({
        color: 0x111317,
        roughness: 0.22,
        metalness: 0.05,
      });

      const stickerMesh = new THREE.Mesh(stickerGeom, stickerMat);
      stickerMesh.userData = { faceIdx, stickerIdx };

      // Encapsulate into an individual piece group for dynamic 3D rotation
      const pieceGroup = new THREE.Group();
      pieceGroup.userData = { faceIdx, stickerIdx };
      pieceGroup.add(frameMesh);
      pieceGroup.add(stickerMesh);

      this.mainGroup.add(pieceGroup);
      this.pieceGroups[faceIdx][stickerIdx] = pieceGroup;
      this.stickerMeshes[faceIdx][stickerIdx] = stickerMesh;
    });
  }

  updateColors(): void {
    for (let f = 0; f < 4; f++) {
      for (let s = 0; s < 9; s++) {
        const colorKey = this.state.faces[f][s];
        const hex = PYRA_COLOR_HEX[colorKey];
        const mesh = this.stickerMeshes[f]?.[s];
        if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.color.set(hex);
        }
      }
    }
  }

  // =========================================================================
  // DYNAMIC ANIMATION ENGINE
  // =========================================================================

  executeMove(move: string, isScramble: boolean = false, onComplete?: () => void): void {
    this.queue.push({ move, isScramble, onComplete });
  }

  executeAlgorithm(moves: string[], isScramble: boolean = false, onAllComplete?: () => void): void {
    moves.forEach((m, idx) => {
      const isLast = idx === moves.length - 1;
      this.queue.push({
        move: m,
        isScramble,
        onComplete: isLast ? onAllComplete : undefined,
      });
    });
  }

  scramble(): string {
    const sc = generatePyraminxScramble(14);
    const moves = sc.split(' ');
    this.executeAlgorithm(moves, true, () => {
      this.onSolvedChange?.(this.state.isSolved());
    });
    return sc;
  }

  reset(): void {
    this.queue = [];
    if (this.activeMove) {
      for (const pGroup of this.activePieces) {
        this.mainGroup.attach(pGroup);
        pGroup.position.set(0, 0, 0);
        pGroup.quaternion.identity();
      }
      this.pivotGroup.quaternion.identity();
      this.activeMove = null;
      this.activePieces = [];
    }
    this.state.reset();
    this.updateColors();
    this.onSolvedChange?.(true);
  }

  setSpeed(durationMs: number): void {
    this.baseDuration = Math.max(40, Math.min(800, durationMs));
  }

  getSpeed(): number {
    return this.baseDuration;
  }

  isBusy(): boolean {
    return this.activeMove !== null || this.queue.length > 0;
  }

  getState(): PyraminxState {
    return this.state;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private startNextMove(): void {
    if (this.queue.length === 0) return;
    this.activeMove = this.queue.shift()!;
    this.animProgress = 0;

    if (this.activeMove.isScramble) {
      this.animDuration = Math.min(45, this.baseDuration * 0.25);
    } else if (this.queue.length > 3) {
      this.animDuration = Math.max(60, this.baseDuration * 0.4);
    } else if (this.queue.length > 1) {
      this.animDuration = Math.max(100, this.baseDuration * 0.7);
    } else {
      this.animDuration = this.baseDuration;
    }

    const m = this.activeMove.move.trim();
    const isPrime = m.endsWith("'");
    const base = m.replace("'", '');

    const pieceIndices = MOVE_PIECES[base];
    const axis = MOVE_AXES[base];
    if (!pieceIndices || !axis) {
      this.finishActiveMove();
      return;
    }

    this.activeAxis.copy(axis);
    this.activeAngle = (isPrime ? 1 : -1) * ((2 * Math.PI) / 3);
    this.activePieces = [];

    // Reset pivot group to identity
    this.pivotGroup.position.set(0, 0, 0);
    this.pivotGroup.quaternion.identity();

    // Attach affected piece groups to pivot
    for (const [f, s] of pieceIndices) {
      const pGroup = this.pieceGroups[f]?.[s];
      if (pGroup) {
        this.activePieces.push(pGroup);
        this.pivotGroup.attach(pGroup);
      }
    }
  }

  private finishActiveMove(): void {
    if (!this.activeMove) return;
    const moveStr = this.activeMove.move;
    const isScramble = this.activeMove.isScramble;
    const onDone = this.activeMove.onComplete;

    // Reattach piece groups back to mainGroup and reset local transforms
    for (const pGroup of this.activePieces) {
      this.mainGroup.attach(pGroup);
      pGroup.position.set(0, 0, 0);
      pGroup.quaternion.identity();
    }
    this.pivotGroup.quaternion.identity();

    // Apply logical move to PyraminxState
    this.state.applyMove(moveStr);
    this.updateColors();

    const isSolved = this.state.isSolved();
    this.onSolvedChange?.(isSolved);
    if (!isScramble) {
      this.onMoveExecuted?.(moveStr);
    }

    this.activeMove = null;
    this.activePieces = [];

    onDone?.();
  }

  // =========================================================================
  // MOUSE & TOUCH DIRECT DRAG-TO-TURN INTERACTION
  // =========================================================================

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (this.isBusy()) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.mainGroup.children, true);

    // Filter intersects to find piece meshes
    const hit = intersects.find(
      (item) => item.object.userData && typeof item.object.userData.faceIdx === 'number'
    );

    if (!hit) {
      // User clicked on background: allow OrbitControls to rotate view
      this.dragTarget = null;
      this.controls.enabled = true;
      this.renderer.domElement.style.cursor = 'grabbing';
      return;
    }

    // User clicked ON THE PYRAMINX: Immediately freeze camera controls!
    this.controls.enabled = false;
    this.renderer.domElement.style.cursor = 'grabbing';

    this.dragTarget = {
      startX: e.clientX,
      startY: e.clientY,
      hitPoint: hit.point.clone(),
      faceIdx: hit.object.userData.faceIdx,
      stickerIdx: hit.object.userData.stickerIdx,
      pointerId: e.pointerId,
    };
  }

  private onPointerMove(e: PointerEvent): void {
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
      const intersects = this.raycaster.intersectObjects(this.mainGroup.children, true);
      const hit = intersects.some(
        (item) => item.object.userData && typeof item.object.userData.faceIdx === 'number'
      );
      this.renderer.domElement.style.cursor = hit ? 'grab' : 'default';
      return;
    }

    if (e.pointerId !== this.dragTarget.pointerId) return;
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  private onPointerUp(e: PointerEvent): void {
    this.controls.enabled = true; // Always restore camera control for subsequent background drags

    const target = this.dragTarget;
    this.dragTarget = null;
    this.renderer.domElement.style.cursor = 'grab';

    if (!target || e.pointerId !== target.pointerId) return;

    const dx = e.clientX - target.startX;
    const dy = e.clientY - target.startY;
    const dist = Math.hypot(dx, dy);

    if (dist >= 16) {
      this.resolveAndExecuteDragTurn(target, dx, dy);
    }
  }

  private getCandidateMoves(faceIdx: number, stickerIdx: number): string[] {
    // Apex corner tips
    if (faceIdx === 0 && stickerIdx === 0) return ['u', "u'"];
    if (faceIdx === 1 && stickerIdx === 0) return ['u', "u'"];
    if (faceIdx === 2 && stickerIdx === 0) return ['u', "u'"];

    if (faceIdx === 0 && stickerIdx === 4) return ['l', "l'"];
    if (faceIdx === 2 && stickerIdx === 8) return ['l', "l'"];
    if (faceIdx === 3 && stickerIdx === 4) return ['l', "l'"];

    if (faceIdx === 0 && stickerIdx === 8) return ['r', "r'"];
    if (faceIdx === 1 && stickerIdx === 4) return ['r', "r'"];
    if (faceIdx === 3 && stickerIdx === 8) return ['r', "r'"];

    if (faceIdx === 1 && stickerIdx === 8) return ['b', "b'"];
    if (faceIdx === 2 && stickerIdx === 4) return ['b', "b'"];
    if (faceIdx === 3 && stickerIdx === 0) return ['b', "b'"];

    // Layer pieces: find which layers contain this piece
    const candidates: string[] = [];
    const layers = ['U', 'L', 'R', 'B'];
    for (const l of layers) {
      const pieces = MOVE_PIECES[l];
      if (pieces.some(([f, s]) => f === faceIdx && s === stickerIdx)) {
        candidates.push(l, `${l}'`);
      }
    }

    return candidates.length > 0 ? candidates : ['U', "U'"];
  }

  private resolveAndExecuteDragTurn(target: DragTarget, dx: number, dy: number): void {
    const candidates = this.getCandidateMoves(target.faceIdx, target.stickerIdx);

    const toScreen = (worldPos: THREE.Vector3): THREE.Vector2 => {
      const v = worldPos.clone().project(this.camera);
      const rect = this.renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((v.x + 1) * rect.width) / 2,
        ((-v.y + 1) * rect.height) / 2
      );
    };

    const dragScreen = new THREE.Vector2(dx, dy).normalize();
    const hitPoint = target.hitPoint;
    const s0 = toScreen(hitPoint);

    let bestMove = candidates[0];
    let bestScore = -Infinity;

    for (const move of candidates) {
      const isPrime = move.endsWith("'");
      const base = move.replace("'", '');
      const axis = MOVE_AXES[base];
      if (!axis) continue;

      // Angular velocity vector: clockwise is -angle around axis, counter-clockwise is +angle
      const dirSign = isPrime ? 1 : -1;
      const omega = axis.clone().multiplyScalar(dirSign);

      // Linear tangent velocity vector at hitPoint = omega x hitPoint
      const vel = new THREE.Vector3().crossVectors(omega, hitPoint);
      if (vel.lengthSq() < 1e-6) continue;

      const pProjected = hitPoint.clone().add(vel.clone().normalize().multiplyScalar(0.2));
      const s1 = toScreen(pProjected);
      const screenDir = s1.clone().sub(s0);

      if (screenDir.lengthSq() < 1e-4) continue;
      screenDir.normalize();

      const score = dragScreen.dot(screenDir);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    if (bestScore > 0.3) {
      this.executeMove(bestMove);
    }
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

    // Step active animation
    if (this.activeMove) {
      this.animProgress += delta / this.animDuration;
      if (this.animProgress >= 1) {
        this.animProgress = 1;
        this.finishActiveMove();
      } else {
        const eased = this.easeInOutCubic(this.animProgress);
        this.pivotGroup.quaternion.setFromAxisAngle(this.activeAxis, this.activeAngle * eased);
      }
    } else if (this.queue.length > 0) {
      this.startNextMove();
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }

  dispose(): void {
    this.isDestroyed = true;
    this.resizeObserver.disconnect();
    this.controls.dispose();

    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDownBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup', this.onPointerUpBound);
    window.removeEventListener('pointercancel', this.onPointerUpBound);

    this.mainGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
