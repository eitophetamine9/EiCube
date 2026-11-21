import { RubiksCubeScene } from '../render/RubiksCubeScene';
import { generateScramble } from '../cube/scramble';
import { generatePyraminxScramble } from '../cube/pyraminxState';
import { invertMove, parseAlgorithm } from '../cube/notation';
import { SettingsManager, formatKeyCode } from './settings';
import { toast } from './toast';

export type TrainerPuzzleType = '3x3' | '2x2' | '4x4' | 'pyraminx';

export class ControlsManager {
  private container: HTMLElement;
  private scene: RubiksCubeScene;
  private settings: SettingsManager;
  private activePuzzle: TrainerPuzzleType = '3x3';
  private onPuzzleChange?: (puzzle: TrainerPuzzleType) => void;
  private onExecuteMoveDirect?: (move: string, isScramble?: boolean) => void;
  private onSpeedChange?: (speedMs: number) => void;
  private moveHistory: string[] = [];

  // Timer state
  private timerInterval: number | null = null;
  private timerStartTime: number = 0;
  private timerElapsedMs: number = 0;
  private isTimerRunning: boolean = false;
  private isAwaitingFirstMoveAfterScramble: boolean = false;

  constructor(
    container: HTMLElement,
    scene: RubiksCubeScene,
    settings: SettingsManager,
    callbacks?: {
      onPuzzleChange?: (puzzle: TrainerPuzzleType) => void;
      onExecuteMoveDirect?: (move: string, isScramble?: boolean) => void;
      onSpeedChange?: (speedMs: number) => void;
    }
  ) {
    this.container = container;
    this.scene = scene;
    this.settings = settings;
    this.onPuzzleChange = callbacks?.onPuzzleChange;
    this.onExecuteMoveDirect = callbacks?.onExecuteMoveDirect;
    this.onSpeedChange = callbacks?.onSpeedChange;
    this.render();
  }

  getActivePuzzle(): TrainerPuzzleType {
    return this.activePuzzle;
  }

  setTrainerPuzzle(puzzle: TrainerPuzzleType, skipNotify: boolean = false): void {
    if (this.activePuzzle === puzzle) return;
    this.activePuzzle = puzzle;
    this.clearHistory();
    this.resetTimer();
    this.render();
    if (!skipNotify) {
      this.onPuzzleChange?.(puzzle);
    }
  }

  private render(): void {
    const keybinds = this.settings.getKeybinds();

    const getBindDisplay = (action: string) => {
      const code = keybinds[action];
      if (code) return formatKeyCode(code);
      if (action.endsWith("'")) {
        const base = action.slice(0, -1);
        const baseCode = keybinds[base];
        return baseCode ? `⇧${formatKeyCode(baseCode)}` : '-';
      }
      return '-';
    };

    this.container.innerHTML = `
      <div class="trainer-viewport-overlay">
        <!-- Top Floating Status Bar -->
        <div class="floating-top-bar">
          <!-- Puzzle Selector inside Trainer -->
          <div class="puzzle-mini-picker">
            <span class="picker-label">Puzzle:</span>
            <button class="btn-picker ${this.activePuzzle === '3x3' ? 'is-active' : ''}" data-trainer-puzzle="3x3">3×3</button>
            <button class="btn-picker ${this.activePuzzle === '2x2' ? 'is-active' : ''}" data-trainer-puzzle="2x2">2×2</button>
            <button class="btn-picker ${this.activePuzzle === '4x4' ? 'is-active' : ''}" data-trainer-puzzle="4x4">4×4</button>
            <button class="btn-picker ${this.activePuzzle === 'pyraminx' ? 'is-active' : ''}" data-trainer-puzzle="pyraminx">▲ Pyra</button>
          </div>

          <div class="status-group">
            <div id="solved-badge" class="badge-solved">
              <span class="badge-dot"></span>
              <span id="solved-text">Solved</span>
            </div>
            <div class="timer-box">
              <span class="timer-label">TIMER</span>
              <span id="timer-display" class="timer-display">00:00.00</span>
              <button id="btn-timer-reset" class="btn-icon-subtle" title="Reset timer" aria-label="Reset timer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="top-action-buttons">
            <button id="btn-scramble" class="btn btn-sm btn-scramble">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
              Scramble
            </button>

            <button id="btn-reset" class="btn btn-sm btn-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              Reset
            </button>

            <button id="btn-undo" class="btn btn-sm btn-secondary" title="Undo last move">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 14 4 9l5-5"></path>
                <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
              </svg>
              Undo
            </button>
          </div>

          <!-- Speed Slider -->
          <div class="speed-control">
            <label for="speed-slider" class="speed-label">Speed</label>
            <input type="range" id="speed-slider" min="60" max="400" step="20" value="200" title="Animation duration" />
            <span id="speed-val" class="speed-val">200ms</span>
          </div>
        </div>

        <!-- Scramble notation banner -->
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

        <!-- LEFT SIDEBAR: Keybinds & Move Controls -->
        <aside class="controls-sidebar-left">
          <div class="sidebar-header">
            <span class="sidebar-title">${this.getPuzzleDisplayName()} Moves</span>
            <div class="sidebar-header-actions">
              <button id="btn-edit-keybinds" class="btn-text-sm" title="Rebind any key">Edit Keys</button>
              <button id="btn-close-left-sidebar" class="btn-icon-subtle btn-close-sidebar" aria-label="Close Moves Pad">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- Moves Pad according to active puzzle -->
          ${this.renderMovesPad(getBindDisplay)}
        </aside>

        <!-- RIGHT SIDEBAR: Vertical Move History -->
        <aside class="history-sidebar-right">
          <div class="sidebar-header">
            <div class="history-header-left">
              <span class="sidebar-title">Move History</span>
              <span id="history-count" class="history-count-badge">0</span>
            </div>
            <div class="sidebar-header-actions">
              <button id="btn-clear-history" class="btn-text-sm" aria-label="Clear move history">Clear</button>
              <button id="btn-close-right-sidebar" class="btn-icon-subtle btn-close-sidebar" aria-label="Close Move History">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <div id="history-vertical-list" class="history-vertical-list">
            <div class="history-empty-vertical">
              <span>No moves yet.</span>
              <small>Click keys on the left or press keyboard keys.</small>
            </div>
          </div>
        </aside>

        <!-- Mobile Drawer Backdrop -->
        <div id="mobile-drawer-backdrop" class="mobile-drawer-backdrop"></div>

        <!-- Mobile Bottom Dock (Thumb-friendly controls for phones & tablets) -->
        <nav class="mobile-bottom-dock" aria-label="Mobile Controls">
          <button id="btn-mobile-moves" class="btn-dock-item" aria-label="Toggle Moves Pad">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Moves</span>
          </button>

          <button id="btn-mobile-scramble" class="btn-dock-item btn-dock-scramble" aria-label="Scramble">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
              <line x1="4" y1="4" x2="9" y2="9"></line>
            </svg>
            <span>Scramble</span>
          </button>

          <button id="btn-mobile-undo" class="btn-dock-item" aria-label="Undo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 14 4 9l5-5"></path>
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
            </svg>
            <span>Undo</span>
          </button>

          <button id="btn-mobile-history" class="btn-dock-item" aria-label="Toggle Move History">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9"></circle>
              <polyline points="12 7 12 12 15 15"></polyline>
            </svg>
            <span>History (<span id="mobile-history-count">0</span>)</span>
          </button>
        </nav>
      </div>
    `;

    this.attachEventListeners();
  }

  private getPuzzleDisplayName(): string {
    switch (this.activePuzzle) {
      case '3x3': return '3×3';
      case '2x2': return '2×2';
      case '4x4': return '4×4';
      case 'pyraminx': return 'Pyraminx';
    }
  }

  private renderMovesPad(getBindDisplay: (act: string) => string): string {
    if (this.activePuzzle === 'pyraminx') {
      return `
        <div class="moves-section">
          <div class="moves-section-label">Layer Turns</div>
          <div class="moves-vertical-grid">
            ${[
              { move: 'U', prime: "U'" },
              { move: 'L', prime: "L'" },
              { move: 'R', prime: "R'" },
              { move: 'B', prime: "B'" },
            ]
              .map(
                (p) => `
              <div class="move-pair-row">
                <button class="btn-sidebar-move" data-move="${p.move}" title="Turn ${p.move}">
                  <span class="move-name">${p.move}</span>
                  <kbd class="key-tag" data-rebind-action="${p.move}">${getBindDisplay(p.move)}</kbd>
                </button>
                <button class="btn-sidebar-move btn-prime" data-move="${p.prime}" title="Turn ${p.prime}">
                  <span class="move-name">${p.prime}</span>
                  <kbd class="key-tag" data-rebind-action="${p.prime}">${getBindDisplay(p.prime)}</kbd>
                </button>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="moves-section">
          <div class="moves-section-label">Tip Rotations</div>
          <div class="moves-vertical-grid">
            ${[
              { move: 'u', prime: "u'" },
              { move: 'l', prime: "l'" },
              { move: 'r', prime: "r'" },
              { move: 'b', prime: "b'" },
            ]
              .map(
                (p) => `
              <div class="move-pair-row">
                <button class="btn-sidebar-move" data-move="${p.move}">
                  <span class="move-name">${p.move}</span>
                </button>
                <button class="btn-sidebar-move btn-prime" data-move="${p.prime}">
                  <span class="move-name">${p.prime}</span>
                </button>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    // 2x2, 3x3, 4x4
    const pairs =
      this.activePuzzle === '2x2'
        ? [
            { move: 'R', prime: "R'" },
            { move: 'U', prime: "U'" },
            { move: 'F', prime: "F'" },
            { move: 'L', prime: "L'" },
          ]
        : [
            { move: 'R', prime: "R'" },
            { move: 'L', prime: "L'" },
            { move: 'U', prime: "U'" },
            { move: 'D', prime: "D'" },
            { move: 'F', prime: "F'" },
            { move: 'B', prime: "B'" },
          ];

    return `
      <div class="moves-section">
        <div class="moves-section-label">Face Moves</div>
        <div class="moves-vertical-grid">
          ${pairs
            .map(
              (pair) => `
            <div class="move-pair-row">
              <button class="btn-sidebar-move" data-move="${pair.move}" title="Execute ${pair.move}">
                <span class="move-name">${pair.move}</span>
                <kbd class="key-tag" data-rebind-action="${pair.move}">${getBindDisplay(pair.move)}</kbd>
              </button>
              <button class="btn-sidebar-move btn-prime" data-move="${pair.prime}" title="Execute ${pair.prime}">
                <span class="move-name">${pair.prime}</span>
                <kbd class="key-tag" data-rebind-action="${pair.prime}">${getBindDisplay(pair.prime)}</kbd>
              </button>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      ${
        this.activePuzzle === '4x4'
          ? `<div class="moves-section">
              <div class="moves-section-label">Wide Layer Turns</div>
              <div class="moves-vertical-grid">
                ${[
                  { move: 'Rw', prime: "Rw'" },
                  { move: 'Uw', prime: "Uw'" },
                  { move: 'Fw', prime: "Fw'" },
                ]
                  .map(
                    (p) => `
                  <div class="move-pair-row">
                    <button class="btn-sidebar-move" data-move="${p.move}">
                      <span class="move-name">${p.move}</span>
                    </button>
                    <button class="btn-sidebar-move btn-prime" data-move="${p.prime}">
                      <span class="move-name">${p.prime}</span>
                    </button>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>`
          : ''
      }

      ${
        this.activePuzzle === '3x3'
          ? `<div class="moves-section">
              <div class="moves-section-label">Slices & Rotations</div>
              <div class="moves-inline-row">
                ${['M', 'E', 'S']
                  .map(
                    (m) => `
                  <button class="btn-sec-pill" data-move="${m}" title="Slice ${m}">
                    <span>${m}</span>
                    <kbd>${getBindDisplay(m)}</kbd>
                  </button>
                `
                  )
                  .join('')}
              </div>
              <div class="moves-inline-row" style="margin-top: 6px;">
                ${['x', 'y', 'z']
                  .map(
                    (r) => `
                  <button class="btn-sec-pill" data-move="${r}" title="Rotate ${r}">
                    <span>${r}</span>
                    <kbd>${getBindDisplay(r)}</kbd>
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>`
          : ''
      }
    `;
  }

  private attachEventListeners(): void {
    // Puzzle mini-picker tabs
    const pickers = this.container.querySelectorAll<HTMLButtonElement>('[data-trainer-puzzle]');
    pickers.forEach((btn) => {
      btn.addEventListener('click', () => {
        const pz = btn.getAttribute('data-trainer-puzzle') as TrainerPuzzleType;
        if (pz && pz !== this.activePuzzle) {
          this.setTrainerPuzzle(pz);
        }
      });
    });

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
      this.onSpeedChange?.(val);
      if (speedVal) speedVal.textContent = `${val}ms`;
    });

    // Move buttons click
    const moveButtons = this.container.querySelectorAll<HTMLButtonElement>('[data-move]');
    moveButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target && target.classList.contains('key-tag')) {
          const action = target.getAttribute('data-rebind-action');
          if (action) {
            this.settings.open(action);
            return;
          }
        }

        const move = btn.getAttribute('data-move');
        if (move) {
          this.executeMove(move);
        }
      });
    });

    // Edit keybinds button
    this.container.querySelector('#btn-edit-keybinds')?.addEventListener('click', () => {
      this.settings.open();
    });

    // Direct click on kbd tags to rebind
    const rebindTags = this.container.querySelectorAll<HTMLElement>('[data-rebind-action]');
    rebindTags.forEach((tag) => {
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = tag.getAttribute('data-rebind-action');
        if (action) {
          this.settings.open(action);
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

    // Mobile Dock & Drawers
    const leftSidebar = this.container.querySelector<HTMLElement>('.controls-sidebar-left');
    const rightSidebar = this.container.querySelector<HTMLElement>('.history-sidebar-right');
    const backdrop = this.container.querySelector<HTMLElement>('#mobile-drawer-backdrop');

    const closeDrawers = () => {
      leftSidebar?.classList.remove('is-open-mobile');
      rightSidebar?.classList.remove('is-open-mobile');
      backdrop?.classList.remove('is-open');
    };

    this.container.querySelector('#btn-mobile-moves')?.addEventListener('click', () => {
      rightSidebar?.classList.remove('is-open-mobile');
      const willOpen = !leftSidebar?.classList.contains('is-open-mobile');
      leftSidebar?.classList.toggle('is-open-mobile', willOpen);
      backdrop?.classList.toggle('is-open', willOpen);
    });

    this.container.querySelector('#btn-mobile-history')?.addEventListener('click', () => {
      leftSidebar?.classList.remove('is-open-mobile');
      const willOpen = !rightSidebar?.classList.contains('is-open-mobile');
      rightSidebar?.classList.toggle('is-open-mobile', willOpen);
      backdrop?.classList.toggle('is-open', willOpen);
    });

    this.container.querySelector('#btn-mobile-scramble')?.addEventListener('click', () => {
      closeDrawers();
      this.handleScramble();
    });

    this.container.querySelector('#btn-mobile-undo')?.addEventListener('click', () => {
      this.handleUndo();
    });

    this.container.querySelector('#btn-close-left-sidebar')?.addEventListener('click', () => {
      closeDrawers();
    });

    this.container.querySelector('#btn-close-right-sidebar')?.addEventListener('click', () => {
      closeDrawers();
    });

    backdrop?.addEventListener('click', () => {
      closeDrawers();
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

  refreshKeybindLabels(): void {
    const keybinds = this.settings.getKeybinds();
    const tags = this.container.querySelectorAll<HTMLElement>('[data-rebind-action]');
    tags.forEach((tag) => {
      const action = tag.getAttribute('data-rebind-action');
      if (action) {
        const code = keybinds[action];
        if (code) {
          tag.textContent = formatKeyCode(code);
        } else if (action.endsWith("'")) {
          const base = action.slice(0, -1);
          const baseCode = keybinds[base];
          tag.textContent = baseCode ? `⇧${formatKeyCode(baseCode)}` : '-';
        } else {
          tag.textContent = '-';
        }
      }
    });
  }

  handleScramble(): void {
    // Clear move history so scramble moves are never shown or recorded in user history
    this.clearHistory();

    let scramble = '';
    if (this.activePuzzle === 'pyraminx') {
      scramble = generatePyraminxScramble(14);
      const moves = scramble.split(' ');
      moves.forEach((m) => this.onExecuteMoveDirect?.(m, true));
    } else {
      const len = this.activePuzzle === '2x2' ? 14 : this.activePuzzle === '4x4' ? 24 : 22;
      scramble = generateScramble(len);
      const moves = parseAlgorithm(scramble);
      this.scene.executeAlgorithm(moves, false, true, () => {
        toast.show('Puzzle scrambled! Timer starts on your next move.');
      });
    }

    const banner = this.container.querySelector<HTMLElement>('#scramble-banner');
    const notation = this.container.querySelector<HTMLElement>('#scramble-notation');
    if (banner && notation) {
      notation.textContent = scramble;
      banner.style.display = 'flex';
    }

    this.stopTimer();
    this.resetTimer();
    this.isAwaitingFirstMoveAfterScramble = true;
  }

  handleReset(): void {
    if (this.activePuzzle === 'pyraminx') {
      this.onExecuteMoveDirect?.('RESET');
    } else {
      this.scene.resetCube();
    }
    this.stopTimer();
    this.resetTimer();
    this.isAwaitingFirstMoveAfterScramble = false;
    const banner = this.container.querySelector<HTMLElement>('#scramble-banner');
    if (banner) banner.style.display = 'none';
    toast.show('Puzzle reset to solved state.');
  }

  handleUndo(): void {
    if (this.moveHistory.length === 0) {
      toast.show('No moves to undo.');
      return;
    }

    const lastMove = this.moveHistory.pop()!;
    const inverse = invertMove(lastMove);
    this.executeMove(inverse, false);
    this.renderHistory();
  }

  executeMove(notation: string, viewRelative: boolean = true): void {
    if (this.isAwaitingFirstMoveAfterScramble) {
      this.isAwaitingFirstMoveAfterScramble = false;
      this.startTimer();
    }

    if (this.activePuzzle === 'pyraminx') {
      this.onExecuteMoveDirect?.(notation, false);
    } else {
      this.scene.executeMove(notation, viewRelative);
    }
  }

  recordMove(notation: string): void {
    if (this.isAwaitingFirstMoveAfterScramble) {
      this.isAwaitingFirstMoveAfterScramble = false;
      this.startTimer();
    }
    this.moveHistory.push(notation);
    this.renderHistory();
  }

  clearHistory(): void {
    this.moveHistory = [];
    this.renderHistory();
  }

  private renderHistory(): void {
    const list = this.container.querySelector<HTMLElement>('#history-vertical-list');
    const count = this.container.querySelector<HTMLElement>('#history-count');
    const mobileCount = this.container.querySelector<HTMLElement>('#mobile-history-count');
    if (!list) return;

    if (count) count.textContent = String(this.moveHistory.length);
    if (mobileCount) mobileCount.textContent = String(this.moveHistory.length);

    if (this.moveHistory.length === 0) {
      list.innerHTML = `
        <div class="history-empty-vertical">
          <span>No moves yet.</span>
          <small>Click keys on the left or press keyboard keys.</small>
        </div>
      `;
      return;
    }

    list.innerHTML = this.moveHistory
      .map(
        (m, idx) => `
        <div class="history-row-item">
          <span class="history-step-idx">#${idx + 1}</span>
          <span class="history-move-chip ${m.includes("'") ? 'is-prime' : ''} ${m.includes('2') ? 'is-double' : ''}">${m}</span>
        </div>
      `
      )
      .join('');

    list.scrollTop = list.scrollHeight;
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
          toast.show(`Puzzle Solved in ${this.formatTime(this.timerElapsedMs)}!`);
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
