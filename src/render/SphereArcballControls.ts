import * as THREE from 'three';

/**
 * Pure Shoemake virtual sphere + hyperbolic sheet projection helper.
 * Maps normalized pointer coordinates (-1..1 around element center, scaled by min(w, h))
 * onto a continuous 3D surface so pointer trajectories generate smooth X, Y, AND Z rotation axes.
 */
export function projectPointerToArcballSphere(nx: number, ny: number, radius: number = 0.78): THREE.Vector3 {
  const d2 = nx * nx + ny * ny;
  const r2 = radius * radius;
  let z: number;

  if (d2 <= r2 * 0.5) {
    // Inside sphere cap
    z = Math.sqrt(Math.max(0, r2 - d2));
  } else {
    // Smooth hyperbolic sheet outside r / sqrt(2) — naturally transitions into Z-axis roll
    z = (r2 * 0.5) / Math.sqrt(d2);
  }

  return new THREE.Vector3(nx, ny, z).normalize();
}

/**
 * Computes an incremental camera-space quaternion rotating arcball point vFrom to vTo,
 * amplified cleanly by dragSensitivity across all X, Y, and Z axes.
 */
export function computeArcballDeltaQuaternion(
  vFrom: THREE.Vector3,
  vTo: THREE.Vector3,
  camera: THREE.Camera,
  sensitivity: number
): { quaternion: THREE.Quaternion; axis: THREE.Vector3; angle: number } {
  const localAxis = new THREE.Vector3().crossVectors(vFrom, vTo);
  const sinAngle = localAxis.length();

  if (sinAngle < 1e-6) {
    return {
      quaternion: new THREE.Quaternion(),
      axis: new THREE.Vector3(0, 1, 0),
      angle: 0,
    };
  }

  localAxis.normalize();
  const baseAngle = Math.atan2(sinAngle, THREE.MathUtils.clamp(vFrom.dot(vTo), -1, 1));
  const scaledAngle = baseAngle * sensitivity * 1.45;

  // Transform view-space arcball axis into world space using camera orientation!
  // Negating the rotation orbits the camera opposite to pointer drag so the puzzle follows the hand 1:1.
  const worldAxis = localAxis.clone().applyQuaternion(camera.quaternion).normalize();
  const q = new THREE.Quaternion().setFromAxisAngle(worldAxis, -scaledAngle);

  return { quaternion: q, axis: worldAxis, angle: -scaledAngle };
}

/**
 * Custom full-sphere XYZ arcball controller for unconstrained 3D puzzle inspection.
 * Supports mouse drag, single-finger touch orbit/roll, mouse wheel zoom, two-finger pinch + Z-twist,
 * and frame-rate-independent exponential inertia.
 */
export class SphereArcballControls {
  public enabled: boolean = true;
  public rotateSpeed: number = 2.0;
  public zoomSpeed: number = 1.15;
  public minDistance: number = 2.5;
  public maxDistance: number = 20;
  public dampingFactor: number = 9.5; // higher = snappier stop, lower = longer glide
  public target: THREE.Vector3 = new THREE.Vector3();

  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private screen = { left: 0, top: 0, width: 1, height: 1 };

  private activePointers: Map<number, { x: number; y: number }> = new Map();
  private prevSphereVec: THREE.Vector3 | null = null;
  private prevPinchDist: number | null = null;
  private prevPinchAngle: number | null = null;

  // Inertial angular velocity
  private inertiaAxis: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private inertiaAngularVel: number = 0; // radians per second
  private lastDeltaTimeSec: number = 1 / 60;

  // Bound event listeners
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onContextMenuBound: (e: Event) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.handleResize();

    this.onPointerDownBound = this.onPointerDown.bind(this);
    this.onPointerMoveBound = this.onPointerMove.bind(this);
    this.onPointerUpBound = this.onPointerUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onContextMenuBound = (e: Event) => e.preventDefault();

    this.domElement.addEventListener('pointerdown', this.onPointerDownBound);
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);
    window.addEventListener('pointercancel', this.onPointerUpBound);
    this.domElement.addEventListener('wheel', this.onWheelBound, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenuBound);
    this.domElement.style.touchAction = 'none';
  }

  public stopInertia(): void {
    this.inertiaAngularVel = 0;
    this.prevSphereVec = null;
  }

  public handleResize(): void {
    const rect = this.domElement.getBoundingClientRect();
    this.screen = {
      left: rect.left,
      top: rect.top,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
    };
  }

  private pointerToNDC(clientX: number, clientY: number): { nx: number; ny: number } {
    const minDim = Math.max(1, Math.min(this.screen.width, this.screen.height));
    const cx = this.screen.left + this.screen.width * 0.5;
    const cy = this.screen.top + this.screen.height * 0.5;
    return {
      nx: (clientX - cx) / (minDim * 0.5),
      ny: (cy - clientY) / (minDim * 0.5),
    };
  }

  private applyCameraQuaternion(q: THREE.Quaternion): void {
    const eye = this.camera.position.clone().sub(this.target);
    eye.applyQuaternion(q);
    this.camera.up.applyQuaternion(q).normalize();
    this.camera.position.copy(this.target).add(eye);
    this.camera.lookAt(this.target);
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.enabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;

    this.handleResize();
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.activePointers.size === 1) {
      const { nx, ny } = this.pointerToNDC(e.clientX, e.clientY);
      this.prevSphereVec = projectPointerToArcballSphere(nx, ny);
      this.inertiaAngularVel = 0;
      this.prevPinchDist = null;
      this.prevPinchAngle = null;
    } else if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      this.prevPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      this.prevPinchAngle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      this.prevSphereVec = null;
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.activePointers.has(e.pointerId)) return;
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (!this.enabled) {
      this.stopInertia();
      return;
    }

    if (this.activePointers.size === 1) {
      const { nx, ny } = this.pointerToNDC(e.clientX, e.clientY);
      const currVec = projectPointerToArcballSphere(nx, ny);

      if (this.prevSphereVec) {
        const { quaternion, axis, angle } = computeArcballDeltaQuaternion(
          this.prevSphereVec,
          currVec,
          this.camera,
          this.rotateSpeed
        );

        if (Math.abs(angle) > 1e-6) {
          this.applyCameraQuaternion(quaternion);
          this.inertiaAxis.copy(axis);
          // Estimate angular velocity smoothly
          const instVel = angle / Math.max(0.008, this.lastDeltaTimeSec);
          this.inertiaAngularVel = THREE.MathUtils.clamp(instVel, -18, 18);
        }
      }
      this.prevSphereVec = currVec;
    } else if (this.activePointers.size === 2) {
      const pts = Array.from(this.activePointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const twistAngle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);

      if (this.prevPinchDist && dist > 10) {
        const scale = this.prevPinchDist / dist;
        this.zoomByFactor(scale);
      }
      if (this.prevPinchAngle !== null) {
        let dTwist = twistAngle - this.prevPinchAngle;
        if (dTwist > Math.PI) dTwist -= Math.PI * 2;
        if (dTwist < -Math.PI) dTwist += Math.PI * 2;

        if (Math.abs(dTwist) > 1e-4) {
          // Pure Z-axis camera-space roll on two-finger twist!
          const viewZ = new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion).normalize();
          const qRoll = new THREE.Quaternion().setFromAxisAngle(viewZ, dTwist);
          this.applyCameraQuaternion(qRoll);
        }
      }

      this.prevPinchDist = dist;
      this.prevPinchAngle = twistAngle;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size === 0) {
      this.prevSphereVec = null;
      this.prevPinchDist = null;
      this.prevPinchAngle = null;
    } else if (this.activePointers.size === 1) {
      const remaining = Array.from(this.activePointers.values())[0];
      const { nx, ny } = this.pointerToNDC(remaining.x, remaining.y);
      this.prevSphereVec = projectPointerToArcballSphere(nx, ny);
      this.prevPinchDist = null;
      this.prevPinchAngle = null;
    }
  }

  private onWheel(e: WheelEvent): void {
    if (!this.enabled) return;
    e.preventDefault();
    const factor = 1 + Math.sign(e.deltaY) * 0.08 * this.zoomSpeed;
    this.zoomByFactor(factor);
  }

  private zoomByFactor(factor: number): void {
    const eye = this.camera.position.clone().sub(this.target);
    const len = eye.length();
    if (len < 1e-4) return;
    const nextLen = THREE.MathUtils.clamp(len * factor, this.minDistance, this.maxDistance);
    eye.setLength(nextLen);
    this.camera.position.copy(this.target).add(eye);
  }

  public update(deltaMs: number = 16.67): void {
    const dt = Math.max(0.001, Math.min(0.06, deltaMs / 1000));
    this.lastDeltaTimeSec = dt;

    if (this.activePointers.size === 0 && Math.abs(this.inertiaAngularVel) > 0.015 && this.enabled) {
      const stepAngle = this.inertiaAngularVel * dt;
      const q = new THREE.Quaternion().setFromAxisAngle(this.inertiaAxis, stepAngle);
      this.applyCameraQuaternion(q);
      this.inertiaAngularVel *= Math.exp(-this.dampingFactor * dt);
    } else if (this.activePointers.size === 0) {
      this.inertiaAngularVel = 0;
    }

    // Clamp zoom distance smoothly
    const eye = this.camera.position.clone().sub(this.target);
    const dist = eye.length();
    if (dist > 1e-4) {
      const clamped = THREE.MathUtils.clamp(dist, this.minDistance, this.maxDistance);
      if (Math.abs(clamped - dist) > 1e-4) {
        eye.setLength(clamped);
        this.camera.position.copy(this.target).add(eye);
      }
    }
    this.camera.lookAt(this.target);
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDownBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup', this.onPointerUpBound);
    window.removeEventListener('pointercancel', this.onPointerUpBound);
    this.domElement.removeEventListener('wheel', this.onWheelBound);
    this.domElement.removeEventListener('contextmenu', this.onContextMenuBound);
    this.domElement.style.touchAction = 'auto';
    this.activePointers.clear();
  }
}
