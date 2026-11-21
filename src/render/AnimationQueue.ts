import { ResolvedTurn } from '../cube/types';

export interface QueuedMove {
  turn: ResolvedTurn;
  isScramble?: boolean;
  onComplete?: () => void;
}

export type MoveCallback = (turn: ResolvedTurn, isQueueEmpty: boolean) => void;

export class AnimationQueue {
  private queue: QueuedMove[] = [];
  private activeMove: QueuedMove | null = null;
  private progress: number = 0; // 0 to 1
  private duration: number = 200; // ms base duration
  private baseDuration: number = 200;
  private onMoveStart?: (move: QueuedMove) => void;
  private onMoveStep?: (move: QueuedMove, easedProgress: number) => void;
  private onMoveComplete?: (move: QueuedMove) => void;

  constructor(baseDuration: number = 200) {
    this.baseDuration = baseDuration;
    this.duration = baseDuration;
  }

  setBaseDuration(ms: number): void {
    this.baseDuration = Math.max(40, Math.min(800, ms));
    this.duration = this.baseDuration;
  }

  getBaseDuration(): number {
    return this.baseDuration;
  }

  enqueue(turn: ResolvedTurn, isScramble: boolean = false, onComplete?: () => void): void {
    this.queue.push({ turn, isScramble, onComplete });
  }

  enqueueMultiple(turns: ResolvedTurn[], isScramble: boolean = false, onAllComplete?: () => void): void {
    turns.forEach((turn, idx) => {
      const isLast = idx === turns.length - 1;
      this.queue.push({
        turn,
        isScramble,
        onComplete: isLast ? onAllComplete : undefined,
      });
    });
  }

  clear(): void {
    this.queue = [];
  }

  getQueueLength(): number {
    return this.queue.length + (this.activeMove ? 1 : 0);
  }

  isBusy(): boolean {
    return this.activeMove !== null || this.queue.length > 0;
  }

  setCallbacks(callbacks: {
    onStart: (move: QueuedMove) => void;
    onStep: (move: QueuedMove, easedProgress: number) => void;
    onComplete: (move: QueuedMove) => void;
  }): void {
    this.onMoveStart = callbacks.onStart;
    this.onMoveStep = callbacks.onStep;
    this.onMoveComplete = callbacks.onComplete;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  tick(deltaMs: number, reducedMotion: boolean = false): void {
    // If no active move, start next from queue
    if (!this.activeMove) {
      if (this.queue.length === 0) return;
      this.activeMove = this.queue.shift()!;
      this.progress = 0;

      // Dynamically scale duration if queue is deep or during scramble
      if (reducedMotion) {
        this.duration = 0.001;
      } else if (this.activeMove.isScramble) {
        this.duration = Math.min(50, this.baseDuration * 0.25);
      } else if (this.queue.length > 4) {
        this.duration = Math.max(60, this.baseDuration * 0.4);
      } else if (this.queue.length > 1) {
        this.duration = Math.max(100, this.baseDuration * 0.7);
      } else {
        this.duration = this.baseDuration;
      }

      this.onMoveStart?.(this.activeMove);
    }

    if (this.activeMove) {
      if (this.duration <= 1) {
        this.progress = 1;
      } else {
        this.progress += deltaMs / this.duration;
      }

      const clamped = Math.min(1, Math.max(0, this.progress));
      const eased = this.easeInOutCubic(clamped);
      this.onMoveStep?.(this.activeMove, eased);

      if (this.progress >= 1) {
        const finished = this.activeMove;
        this.activeMove = null;
        this.progress = 0;
        this.onMoveComplete?.(finished);
        finished.onComplete?.();
      }
    }
  }
}
