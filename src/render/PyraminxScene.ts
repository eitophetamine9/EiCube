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

    // Three-point studio lighting matching the 3x3 cube
    this.setupLighting();

    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);

    this.buildSolidPyraminx();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

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
    // Clear existing
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

    // Solid dark plastic core
    const coreGeom = new THREE.BufferGeometry();
    const coreVertices = new Float32Array([
      // Face 0: Front
      vTop.x, vTop.y, vTop.z,
      vFrontLeft.x, vFrontLeft.y, vFrontLeft.z,
      vFrontRight.x, vFrontRight.y, vFrontRight.z,
      // Face 1: Right
      vTop.x, vTop.y, vTop.z,
      vFrontRight.x, vFrontRight.y, vFrontRight.z,
      vBack.x, vBack.y, vBack.z,
      // Face 2: Left
      vTop.x, vTop.y, vTop.z,
      vBack.x, vBack.y, vBack.z,
      vFrontLeft.x, vFrontLeft.y, vFrontLeft.z,
      // Face 3: Bottom
      vFrontLeft.x, vFrontLeft.y, vFrontLeft.z,
      vBack.x, vBack.y, vBack.z,
      vFrontRight.x, vFrontRight.y, vFrontRight.z,
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
      { a: vTop, b: vFrontLeft, c: vFrontRight, colorKey: 'G' },
      { a: vTop, b: vFrontRight, c: vBack, colorKey: 'R' },
      { a: vTop, b: vBack, c: vFrontLeft, colorKey: 'B' },
      { a: vFrontLeft, b: vBack, c: vFrontRight, colorKey: 'Y' },
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
    // True outward normal from tetrahedron center (0,0,0) to the face
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

      const center = new THREE.Vector3()
        .add(p0)
        .add(p1)
        .add(p2)
        .divideScalar(3);

      // 1. Black 3D piece backing plate with beveled side walls
      const frameOffset = faceNormal.clone().multiplyScalar(0.016);
      const frameShrink = 0.94; // Clean, dark grooved seam between pieces
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
        // Side 0: f0 - f1 - b1, b1 - b0 - f0
        f0.x, f0.y, f0.z,
        f1.x, f1.y, f1.z,
        b1.x, b1.y, b1.z,
        b1.x, b1.y, b1.z,
        b0.x, b0.y, b0.z,
        f0.x, f0.y, f0.z,
        // Side 1: f1 - f2 - b2, b2 - b1 - f1
        f1.x, f1.y, f1.z,
        f2.x, f2.y, f2.z,
        b2.x, b2.y, b2.z,
        b2.x, b2.y, b2.z,
        b1.x, b1.y, b1.z,
        f1.x, f1.y, f1.z,
        // Side 2: f2 - f0 - b0, b0 - b2 - f2
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
      this.mainGroup.add(frameMesh);

      // 2. Colored sticker: inset with scale 0.80 to give signature speedcube black border!
      const stickerShrink = 0.80; // 20% bold black border around every piece
      const stickerOffset = faceNormal.clone().multiplyScalar(0.024); // cleanly elevated on top
      const s0 = p0.clone().sub(center).multiplyScalar(stickerShrink).add(center).add(stickerOffset);
      const s1 = p1.clone().sub(center).multiplyScalar(stickerShrink).add(center).add(stickerOffset);
      const s2 = p2.clone().sub(center).multiplyScalar(stickerShrink).add(center).add(stickerOffset);

      const stickerGeom = new THREE.BufferGeometry();
      stickerGeom.setAttribute(
        'position',
        new THREE.BufferAttribute(
          new Float32Array([
            s0.x, s0.y, s0.z,
            s1.x, s1.y, s1.z,
            s2.x, s2.y, s2.z,
          ]),
          3
        )
      );
      stickerGeom.computeVertexNormals();

      const stickerMat = new THREE.MeshStandardMaterial({
        color: 0x111317,
        roughness: 0.22,
        metalness: 0.05,
      });

      const stickerMesh = new THREE.Mesh(stickerGeom, stickerMat);
      this.mainGroup.add(stickerMesh);
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
