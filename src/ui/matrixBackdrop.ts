/**
 * Dual-theme subtle binary matrix rain canvas backdrop.
 * Dark mode: deep forest-emerald falling binary streams with crisp soft-glowing lead digits.
 * Light mode: correlated muted sage-forest ink streams over the daylight sky-mist backdrop.
 * Respects prefers-reduced-motion by rendering a clean static single frame.
 */
interface RainColumn {
  y: number;
  speed: number;
  length: number;
  chars: string[];
}

export class MatrixBackdrop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private columns: RainColumn[] = [];
  private colWidth: number = 22;
  private fontSize: number = 14;
  private width: number = 0;
  private height: number = 0;
  private rafId: number | null = null;
  private lastTick: number = 0;
  private reducedMotion: boolean = false;
  private isDark: boolean = false;

  private onResizeBound: () => void;
  private onThemeChangeBound: () => void;

  constructor(canvasId: string = 'matrix-bg-canvas') {
    let existing = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!existing) {
      existing = document.createElement('canvas');
      existing.id = canvasId;
      existing.className = 'matrix-bg-canvas';
      existing.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(existing, document.body.firstChild);
    }

    this.canvas = existing;
    this.ctx = this.canvas.getContext('2d');
    this.isDark = document.documentElement.dataset.theme === 'dark';

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
      if (this.reducedMotion) {
        this.stop();
        this.drawFrame(0);
      } else {
        this.start();
      }
    });

    this.onResizeBound = () => this.resize();
    this.onThemeChangeBound = () => {
      this.isDark = document.documentElement.dataset.theme === 'dark';
      if (this.reducedMotion) {
        this.drawFrame(0);
      }
    };

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('eicube-themechange', this.onThemeChangeBound);

    this.resize();
    if (this.reducedMotion) {
      this.drawFrame(0);
    } else {
      this.start();
    }
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.max(1, Math.floor(this.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(this.height * dpr));

    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const isMobile = this.width <= 768;
    this.colWidth = isMobile ? 24 : 26;
    this.fontSize = isMobile ? 13 : 14;
    const count = Math.ceil(this.width / this.colWidth);

    this.columns = [];
    for (let i = 0; i < count; i++) {
      const length = 10 + Math.floor(Math.random() * 16);
      const chars: string[] = [];
      for (let k = 0; k < length; k++) {
        chars.push(Math.random() > 0.5 ? '1' : '0');
      }
      this.columns.push({
        y: Math.random() * (this.height + 300) - 200,
        speed: 32 + Math.random() * 58,
        length,
        chars,
      });
    }
  }

  private drawFrame(deltaSec: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.font = `600 ${this.fontSize}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textBaseline = 'top';

    const stepY = this.fontSize * 1.42;

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      if (deltaSec > 0) {
        col.y += col.speed * deltaSec;
        if (Math.random() < 0.08) {
          const idx = Math.floor(Math.random() * col.chars.length);
          col.chars[idx] = Math.random() > 0.5 ? '1' : '0';
        }
        if (col.y - col.length * stepY > this.height + 40) {
          col.y = -40 - Math.random() * 180;
          col.speed = 32 + Math.random() * 58;
        }
      }

      const x = i * this.colWidth + 6;
      for (let j = 0; j < col.length; j++) {
        const y = col.y - j * stepY;
        if (y < -20 || y > this.height + 20) continue;

        const fade = 1 - j / col.length;
        const isHead = j === 0;

        if (this.isDark) {
          if (isHead) {
            ctx.fillStyle = 'rgba(74, 222, 128, 0.42)';
            ctx.shadowColor = 'rgba(34, 197, 94, 0.45)';
            ctx.shadowBlur = 8;
          } else {
            ctx.shadowBlur = 0;
            const alpha = (0.04 + fade * 0.24).toFixed(3);
            ctx.fillStyle = `rgba(22, 138, 66, ${alpha})`;
          }
        } else {
          ctx.shadowBlur = 0;
          if (isHead) {
            ctx.fillStyle = 'rgba(22, 101, 52, 0.22)';
          } else {
            const alpha = (0.02 + fade * 0.11).toFixed(3);
            ctx.fillStyle = `rgba(38, 94, 58, ${alpha})`;
          }
        }

        ctx.fillText(col.chars[j], x, y);
      }
      ctx.shadowBlur = 0;
    }
  }

  private tick = (now: number): void => {
    if (this.rafId === null) return;
    const elapsed = now - this.lastTick;
    // Target smooth ~30fps cadence for low CPU/GPU overhead alongside Three.js
    if (elapsed >= 32) {
      const deltaSec = Math.min(elapsed, 100) / 1000;
      this.lastTick = now;
      this.drawFrame(deltaSec);
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTick = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('eicube-themechange', this.onThemeChangeBound);
  }
}
