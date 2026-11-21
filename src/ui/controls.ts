import { RubiksCubeScene } from '../render/RubiksCubeScene';
import { generateScramble } from '../cube/scramble';
import { invertMove, parseAlgorithm } from '../cube/notation';
import { toast } from './toast';

export class ControlsManager {
  private container: HTMLElement;
  private scene: RubiksCubeScene;
  private moveHistory: string[] = [];
  private isPrimeMode: boolean = false;
  private isDoubleMode: boolean = false;

  // Timer state
  private timerInterval: number | null = null;
  private timerStartTime: number = 0;
  private timerElapsedMs: number = 0;
  private isTimerRunning: boolean = false;
  private isAwaitingFirstMoveAfterScramble: boolean = false;

  constructor(container: HTMLElement, scene: RubiksCubeScene) {
    this.container = container;
    this.scene = scene;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="controls-overlay">
        <!-- Top status bar with Solved badge and Timer -->
        <div class="controls-status-bar">
          <div class="status-left">
            <div id="solved-badge" class="badge-solved">
              <span class="badge-dot"></span>
              <span id="solved-text">Solved</span>
            </div>
            <div class="timer-box">
              <span class="timer-label">TIMER</span>
              <span id="timer-display" class="timer-display">00:00.00</span>
              <button id="btn-timer-reset" class="btn-icon-subtle" title="Reset timer" aria-label="Reset timer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="status-right">
            <div class="speed-control">
              <label for="speed-slider" class="speed-label">Speed</label>
              <input type="range" id="speed-slider" min="60" max="400" step="20" value="200" title="Animation duration" />
              <span id="speed-val" class="speed-val">200ms</span>
            </div>
          </div>
        </div>

        <!-- Scramble text banner (visible when scrambled) -->
        <div id="scramble-banner" class="scramble-banner" style="display: none;">
          <div class="scramble-label">Scramble:</div>
          <div id="scramble-notation" class="scramble-notation"></div>
          <button id="btn-copy-scramble" class="btn-icon-subtle" title="Copy scramble" aria-label="Copy scramble notation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>

        <!-- Bottom action bar -->
        <div class="controls-bottom-bar">
          <!-- Main operation buttons -->
          <div class="primary-actions-group">
            <button id="btn-scramble" class="btn btn-primary btn-scramble">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
              Scramble
            </button>

            <button id="btn-reset" class="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              Reset
            </button>

            <button id="btn-undo" class="btn btn-secondary" title="Undo last move">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 14 4 9l5-5"></path>
                <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
              </svg>
              Undo
            </button>
          </div>

          <!-- On-screen Cube Move Buttons Pad -->
          <div class="move-buttons-pad">
            <!-- Modifiers toggles -->
            <div class="modifiers-bar">
              <button id="btn-toggle-prime" class="btn-toggle-modifier" title="Toggle prime (counter-clockwise) turns">
                Prime (<strong>'</strong>)
              </button>
              <button id="btn-toggle-double" class="btn-toggle-modifier" title="Toggle double (180°) turns">
                Double (<strong>2</strong>)
              </button>
            </div>

            <!-- Main 6 Face Buttons -->
            <div class="face-buttons-row">
              ${['U', 'D', 'L', 'R', 'F', 'B']
                .map(
                  (f) => `
                <button class="btn-move-key" data-move="${f}" aria-label="Turn ${f} face">
                  <span class="move-letter">${f}</span>
                  <span class="move-subscript"></span>
                </button>
              `
                )
                .join('')}
            </div>

            <!-- Secondary Moves (Slices, Rotations, Wide) -->
            <div class="secondary-moves-row">
              <span class="sec-label">Slices:</span>
              ${['M', 'E', 'S']
                .map((m) => `<button class="btn-sec-move" data-move="${m}">${m}</button>`)
                .join('')}
              <span class="sec-separator"></span>
              <span class="sec-label">Rotate:</span>
              ${['x', 'y', 'z']
                .map((m) => `<button class="btn-sec-move" data-move="${m}">${m}</button>`)
                .join('')}
              <span class="sec-separator"></span>
              <span class="sec-label">Wide:</span>
              ${['r', 'l', 'u', 'd', 'f', 'b']
                .map((m) => `<button class="btn-sec-move" data-move="${m}">${m}</button>`)
                .join('')}
            </div>
          </div>

          <!-- Move History drawer / strip -->
          <div class="history-strip">
            <div class="history-header">
              <span class="history-title">Move History (<span id="history-count">0</span>)</span>
              <button id="btn-clear-history" class="btn-text-sm" aria-label="Clear move history">Clear</button>
            </div>
            <div id="history-list" class="history-list">
              <span class="history-empty">No moves yet. Rotate the cube or use keyboard keys U, D, L, R, F, B.</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // Scramble button
    this.container.querySelector('#btn-scramble')?.addEventListener('click', () => {
      this.handleScramble();
    });

    // Reset button
    this.container.querySelector('#btn-reset')?.addEventListener('click', () => {
      this.handleReset();
    });

    // Undo button
    this.container.querySelector('#btn-undo')?.addEventListener('click', () => {
      this.handleUndo();
    });

    // Speed slider
    const speedSlider = this.container.querySelector<HTMLInputElement>('#speed-slider');
    const speedVal = this.container.querySelector<HTMLElement>('#speed-val');
    speedSlider?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      this.scene.setSpeed(val);
      if (speedVal) speedVal.textContent = `${val}ms`;
    });

    // Modifier toggles
    const primeToggle = this.container.querySelector<HTMLButtonElement>('#btn-toggle-prime');
    const doubleToggle = this.container.querySelector<HTMLButtonElement>('#btn-toggle-double');

    primeToggle?.addEventListener('click', () => {
      this.isPrimeMode = !this.isPrimeMode;
      if (this.isPrimeMode) this.isDoubleMode = false;
      this.updateModifierUI();
    });

    doubleToggle?.addEventListener('click', () => {
      this.isDoubleMode = !this.isDoubleMode;
      if (this.isDoubleMode) this.isPrimeMode = false;
      this.updateModifierUI();
    });

    // Move buttons click
    const moveButtons = this.container.querySelectorAll<HTMLButtonElement>('[data-move]');
    moveButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const baseMove = btn.getAttribute('data-move');
        if (!baseMove) return;

        let fullMove = baseMove;
        if (this.isPrimeMode) fullMove += "'";
        else if (this.isDoubleMode) fullMove += '2';

        this.executeMove(fullMove);

        // Reset toggles after move
        if (this.isPrimeMode || this.isDoubleMode) {
          this.isPrimeMode = false;
          this.isDoubleMode = false;
          this.updateModifierUI();
        }
      });
    });

    // Timer reset button
    this.container.querySelector('#btn-timer-reset')?.addEventListener('click', () => {
      this.resetTimer();
    });

    // Clear history button
    this.container.querySelector('#btn-clear-history')?.addEventListener('click', () => {
      this.clearHistory();
    });

    // Copy scramble button
    this.container.querySelector('#btn-copy-scramble')?.addEventListener('click', async () => {
      const notationEl = this.container.querySelector('#scramble-notation');
      if (notationEl?.textContent) {
        try {
          await navigator.clipboard.writeText(notationEl.textContent);
          toast.show('Scramble copied to clipboard!');
        } catch {
          toast.show(notationEl.textContent);
        }
      }
    });
  }

  private updateModifierUI(): void {
    const primeToggle = this.container.querySelector('#btn-toggle-prime');
    const doubleToggle = this.container.querySelector('#btn-toggle-double');
    primeToggle?.classList.toggle('is-active', this.isPrimeMode);
    doubleToggle?.classList.toggle('is-active', this.isDoubleMode);

    const subscripts = this.container.querySelectorAll<HTMLElement>('.move-subscript');
    subscripts.forEach((el) => {
      if (this.isPrimeMode) el.textContent = "'";
      else if (this.isDoubleMode) el.textContent = '2';
      else el.textContent = '';
    });
  }

  handleScramble(): void {
    const scramble = generateScramble(22);
    const moves = parseAlgorithm(scramble);

    // Show scramble banner
    const banner = this.container.querySelector<HTMLElement>('#scramble-banner');
    const notation = this.container.querySelector<HTMLElement>('#scramble-notation');
    if (banner && notation) {
      notation.textContent = scramble;
      banner.style.display = 'flex';
    }

    // Stop and reset timer
    this.stopTimer();
    this.resetTimer();
    this.isAwaitingFirstMoveAfterScramble = true;

    // Fast animation on 3D cube
    this.scene.executeAlgorithm(moves, false, true, () => {
      toast.show('Cube scrambled! Timer will start on your next move.');
    });
  }

  handleReset(): void {
    this.scene.resetCube();
    this.stopTimer();
    this.resetTimer();
    this.isAwaitingFirstMoveAfterScramble = false;
    const banner = this.container.querySelector<HTMLElement>('#scramble-banner');
    if (banner) banner.style.display = 'none';
    toast.show('Cube reset to solved state.');
  }

  handleUndo(): void {
    if (this.moveHistory.length === 0) {
      toast.show('No moves to undo.');
      return;
    }

    const lastMove = this.moveHistory.pop()!;
    const inverse = invertMove(lastMove);
    this.scene.executeMove(inverse, false);
    this.renderHistory();
  }

  executeMove(notation: string, viewRelative: boolean = true): void {
    // If waiting for first move after scramble, start timer!
    if (this.isAwaitingFirstMoveAfterScramble) {
      this.isAwaitingFirstMoveAfterScramble = false;
      this.startTimer();
    }

    this.scene.executeMove(notation, viewRelative);
  }

  recordMove(notation: string): void {
    this.moveHistory.push(notation);
    this.renderHistory();
  }

  clearHistory(): void {
    this.moveHistory = [];
    this.renderHistory();
  }

  private renderHistory(): void {
    const list = this.container.querySelector<HTMLElement>('#history-list');
    const count = this.container.querySelector<HTMLElement>('#history-count');
    if (!list) return;

    if (count) count.textContent = String(this.moveHistory.length);

    if (this.moveHistory.length === 0) {
      list.innerHTML = `<span class="history-empty">No moves yet. Rotate the cube or use keyboard keys U, D, L, R, F, B.</span>`;
      return;
    }

    list.innerHTML = this.moveHistory
      .map((m, idx) => `<span class="history-chip" title="Move ${idx + 1}">${m}</span>`)
      .join('');

    // Scroll to end
    list.scrollLeft = list.scrollWidth;
  }

  updateSolvedState(isSolved: boolean): void {
    const badge = this.container.querySelector<HTMLElement>('#solved-badge');
    const text = this.container.querySelector<HTMLElement>('#solved-text');

    if (badge && text) {
      if (isSolved) {
        badge.classList.remove('is-unsolved');
        badge.classList.add('is-solved');
        text.textContent = 'Solved';

        if (this.isTimerRunning) {
          this.stopTimer();
          toast.show(`Cube Solved in ${this.formatTime(this.timerElapsedMs)}!`);
        }
      } else {
        badge.classList.remove('is-solved');
        badge.classList.add('is-unsolved');
        text.textContent = 'Unsolved';
      }
    }
  }

  // Timer functions
  private startTimer(): void {
    if (this.isTimerRunning) return;
    this.isTimerRunning = true;
    this.timerStartTime = performance.now() - this.timerElapsedMs;

    this.timerInterval = window.setInterval(() => {
      this.timerElapsedMs = performance.now() - this.timerStartTime;
      this.updateTimerDisplay();
    }, 30);
  }

  private stopTimer(): void {
    if (!this.isTimerRunning) return;
    this.isTimerRunning = false;
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private resetTimer(): void {
    this.stopTimer();
    this.timerElapsedMs = 0;
    this.isAwaitingFirstMoveAfterScramble = false;
    this.updateTimerDisplay();
  }

  private updateTimerDisplay(): void {
    const display = this.container.querySelector<HTMLElement>('#timer-display');
    if (display) {
      display.textContent = this.formatTime(this.timerElapsedMs);
    }
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);

    const pad = (n: number) => (n < 10 ? '0' + n : String(n));
    return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
  }
}
