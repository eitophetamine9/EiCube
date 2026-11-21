import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PyraminxState, PYRA_COLOR_HEX, generatePyraminxScramble } from '../cube/pyraminxState';

export class PyraminxScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private state: PyraminxState;
  private mainGroup: THREE.Group;
  private stickerMeshes: THREE.Mesh[][] = []; // [faceIndex][stickerIndex]
  private isDestroyed: boolean = false;
  private resizeObserver: ResizeObserver;
  private onSolvedChange?: (isSolved: boolean) => void;

  constructor(container: HTMLElement, callbacks?: { onSolvedChange?: (isSolved: boolean) => void }) {
    this.container = container;
    this.onSolvedChange = callbacks?.onSolvedChange;
    this.state = new PyraminxState();

    this.scene = new THREE.Scene();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 1.2, 5.0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 10.0;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight1.position.set(5, 7, 5);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, 1.0);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);

    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);

    this.buildPyraminx();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private buildPyraminx(): void {
    // Clear
    while (this.mainGroup.children.length > 0) {
      const obj = this.mainGroup.children[0];
      this.mainGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }
    this.stickerMeshes = [[], [], [], []];

    // Regular tetrahedron vertices
    const s = 2.4;
    const h = s * Math.sqrt(2 / 3);
    const r = (s * Math.sqrt(3)) / 6;
    const R = (s * Math.sqrt(3)) / 3;

    const vTop = new THREE.Vector3(0, (3 * h) / 4, 0);
    const vFrontLeft = new THREE.Vector3(-s / 2, -h / 4, r);
    const vFrontRight = new THREE.Vector3(s / 2, -h / 4, r);
    const vBack = new THREE.Vector3(0, -h / 4, -R);

    // Faces:
    // Face 0: Front face (vTop, vFrontLeft, vFrontRight) -> Green
    // Face 1: Right face (vTop, vFrontRight, vBack) -> Red
    // Face 2: Left face  (vTop, vBack, vFrontLeft) -> Blue
    // Face 3: Bottom face (vFrontLeft, vBack, vFrontRight) -> Yellow
    const faceDefinitions = [
      { a: vTop, b: vFrontLeft, c: vFrontRight, colorKey: 'G' },
      { a: vTop, b: vFrontRight, c: vBack, colorKey: 'R' },
      { a: vTop, b: vBack, c: vFrontLeft, colorKey: 'B' },
      { a: vFrontLeft, b: vBack, c: vFrontRight, colorKey: 'Y' },
    ];

    faceDefinitions.forEach((def, faceIdx) => {
      this.buildFaceTriangles(faceIdx, def.a, def.b, def.c);
    });

    this.updateColors();
  }

  private buildFaceTriangles(
    faceIdx: number,
    A: THREE.Vector3,
    B: THREE.Vector3,
    C: THREE.Vector3
  ): void {
    // Subdivide triangle ABC into 9 small triangles (3 rows)
    // Row 0: 1 triangle
    // Row 1: 3 triangles (2 upright, 1 inverted)
    // Row 2: 5 triangles (3 upright, 2 inverted)
    const getPoint = (u: number, v: number) => {
      // barycentric coords: A * (1 - u - v) + B * u + C * v
      return new THREE.Vector3()
        .addScaledVector(A, 1 - u - v)
        .addScaledVector(B, u)
        .addScaledVector(C, v);
    };

    const triangles: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [];

    // Row 0: top triangle (idx 0)
    triangles.push([getPoint(0, 0), getPoint(1 / 3, 0), getPoint(0, 1 / 3)]);

    // Row 1: (idx 1, 2, 3)
    triangles.push([getPoint(1 / 3, 0), getPoint(2 / 3, 0), getPoint(1 / 3, 1 / 3)]);
    triangles.push([getPoint(1 / 3, 1 / 3), getPoint(0, 1 / 3), getPoint(1 / 3, 0)]); // inverted
    triangles.push([getPoint(0, 1 / 3), getPoint(1 / 3, 1 / 3), getPoint(0, 2 / 3)]);

    // Row 2: (idx 4, 5, 6, 7, 8)
    triangles.push([getPoint(2 / 3, 0), getPoint(1, 0), getPoint(2 / 3, 1 / 3)]);
    triangles.push([getPoint(2 / 3, 1 / 3), getPoint(1 / 3, 1 / 3), getPoint(2 / 3, 0)]); // inverted
    triangles.push([getPoint(1 / 3, 1 / 3), getPoint(2 / 3, 1 / 3), getPoint(1 / 3, 2 / 3)]);
    triangles.push([getPoint(1 / 3, 2 / 3), getPoint(0, 2 / 3), getPoint(1 / 3, 1 / 3)]); // inverted
    triangles.push([getPoint(0, 2 / 3), getPoint(1 / 3, 2 / 3), getPoint(0, 1)]);

    // Create 3D meshes for each of the 9 triangles
    triangles.forEach((pts, stickerIdx) => {
      // Calculate normal and slightly shrink triangle for border effect
      const center = new THREE.Vector3()
        .add(pts[0])
        .add(pts[1])
        .add(pts[2])
        .divideScalar(3);

      const shrink = 0.93;
      const p0 = pts[0].clone().sub(center).multiplyScalar(shrink).add(center);
      const p1 = pts[1].clone().sub(center).multiplyScalar(shrink).add(center);
      const p2 = pts[2].clone().sub(center).multiplyScalar(shrink).add(center);

      const geom = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        p0.x, p0.y, p0.z,
        p1.x, p1.y, p1.z,
        p2.x, p2.y, p2.z,
      ]);
      geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geom.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        color: 0x111317,
        roughness: 0.25,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geom, mat);
      this.mainGroup.add(mesh);
      this.stickerMeshes[faceIdx][stickerIdx] = mesh;
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

  executeMove(move: string): void {
    this.state.applyMove(move);
    this.updateColors();
    const solved = this.state.isSolved();
    this.onSolvedChange?.(solved);
  }

  scramble(): string {
    const sc = generatePyraminxScramble(14);
    const moves = sc.split(' ');
    moves.forEach((m) => this.state.applyMove(m));
    this.updateColors();
    this.onSolvedChange?.(this.state.isSolved());
    return sc;
  }

  reset(): void {
    this.state.reset();
    this.updateColors();
    this.onSolvedChange?.(true);
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

  private animate(): void {
    if (this.isDestroyed) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }

  dispose(): void {
    this.isDestroyed = true;
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
