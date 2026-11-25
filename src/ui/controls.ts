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
  private activeMoveGroup: string = 'faces';
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
    this.activeMoveGroup = puzzle === 'pyraminx' ? 'layers' : 'faces';
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
            <button class="btn-picker ${this.activePuzzle === 'pyraminx' ? 'is-active' : ''}" data-trainer-puzzle="pyraminx">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                <polygon points="12 3 3 20 21 20"></polygon>
              </svg>
              Pyra
            </button>
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
              </button>
            </div>
            <span id="telemetry-moves-pill" class="telemetry-moves-pill">0 moves</span>
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

          <!-- Speed & POV Sensitivity Sliders -->
          <div class="speed-control">
            <label for="speed-slider" class="speed-label">Speed</label>
            <input type="range" id="speed-slider" min="60" max="400" step="20" value="200" title="Animation duration" />
            <span id="speed-val" class="speed-val">200ms</span>
          </div>

          <div class="speed-control sensitivity-control" title="Camera orbit sensitivity">
            <label for="pov-slider" class="speed-label">POV</label>
            <input type="range" id="pov-slider" min="0.5" max="5.0" step="0.1" value="${this.settings.getCameraSensitivity().toFixed(1)}" title="Camera POV orbit sensitivity" />
            <span id="pov-val" class="speed-val">${this.settings.getCameraSensitivity().toFixed(1)}×</span>
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

        <!-- LEFT SIDEBAR: Beautified Keybinds & Move Controls -->
        <aside class="controls-sidebar-left">
          <div class="sidebar-header">
            <span class="sidebar-title">${this.getPuzzleDisplayName()} Moves</span>
            <div class="sidebar-header-actions">
              <button id="btn-edit-keybinds" class="btn-text-sm" title="Rebind any key">Edit Keys</button>
              <button id="btn-close-left-sidebar" class="btn-icon-subtle btn-close-sidebar" aria-label="Close Moves Pad">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <div class="moves-filter-bar" role="tablist" aria-label="Move Category Filter">
            ${this.renderMoveFilterPills()}
          </div>

          <!-- Scoped Moves Pad (reduces visual clutter while keeping all moves 1 tap away) -->
          <div id="moves-pad-scroll" class="moves-pad-scroll">
            ${this.renderMovesPad(getBindDisplay)}
          </div>

          <div class="moves-sidebar-footer">
            <a href="./moves.html?puzzle=${this.activePuzzle}" class="btn-moves-more-info" title="Open visual GIF guide explaining every move">
              <span class="more-info-left">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>More Info</span>
              </span>
              <span class="more-info-sub">GIF Guide &rarr;</span>
            </a>
          </div>
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

  private getMoveGroups(): { id: string; label: string }[] {
    if (this.activePuzzle === 'pyraminx') {
      return [
        { id: 'layers', label: 'Layers' },
        { id: 'tips', label: 'Tips' },
        { id: 'rotations', label: 'Rot.' },
      ];
    }
    if (this.activePuzzle === '2x2') {
      return [
        { id: 'faces', label: 'Faces' },
        { id: 'rotations', label: 'Rot.' },
      ];
    }
    if (this.activePuzzle === '4x4') {
      return [
        { id: 'faces', label: 'Faces' },
        { id: 'slices', label: 'Slices' },
        { id: 'inner', label: 'Inner' },
        { id: 'wide', label: 'Wide' },
        { id: 'rotations', label: 'Rot.' },
      ];
    }
    return [
      { id: 'faces', label: 'Faces' },
      { id: 'slices', label: 'Slices' },
      { id: 'wide', label: 'Wide' },
      { id: 'rotations', label: 'Rot.' },
    ];
  }

  private renderMoveFilterPills(): string {
    const groups = this.getMoveGroups();
    if (!groups.some((g) => g.id === this.activeMoveGroup)) {
      this.activeMoveGroup = groups[0].id;
    }
    return groups
      .map(
        (g) =>
          `<button class="btn-move-filter ${this.activeMoveGroup === g.id ? 'is-active' : ''}" data-move-group="${g.id}" role="tab" aria-selected="${this.activeMoveGroup === g.id}">${g.label}</button>`
      )
      .join('');
  }

  private renderPairGrid(
    pairs: { move: string; prime: string }[],
    getBindDisplay: (act: string) => string,
    titlePrefix: string
  ): string {
    return `
      <div class="moves-vertical-grid">
        ${pairs
          .map(
            (p) => `
          <div class="move-pair-row">
            <button class="btn-sidebar-move" data-move="${p.move}" title="${titlePrefix} ${p.move}">
              <span class="move-name">${p.move}</span>
              <kbd class="key-tag" data-rebind-action="${p.move}">${getBindDisplay(p.move)}</kbd>
            </button>
            <button class="btn-sidebar-move btn-prime" data-move="${p.prime}" title="${titlePrefix} ${p.prime}">
              <span class="move-name">${p.prime}</span>
              <kbd class="key-tag" data-rebind-action="${p.prime}">${getBindDisplay(p.prime)}</kbd>
            </button>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  private renderMovesPad(getBindDisplay: (act: string) => string): string {
    if (this.activePuzzle === 'pyraminx') {
      if (this.activeMoveGroup === 'tips') {
        return `
          <div class="moves-section">
            <div class="moves-section-label">Corner Tips (120°)</div>
            ${this.renderPairGrid(
              [
                { move: 'u', prime: "u'" },
                { move: 'l', prime: "l'" },
                { move: 'r', prime: "r'" },
                { move: 'b', prime: "b'" },
              ],
              getBindDisplay,
              'Tip'
            )}
          </div>
        `;
      }
      if (this.activeMoveGroup === 'rotations') {
        return `
          <div class="moves-section">
            <div class="moves-section-label">Puzzle Rotations</div>
            ${this.renderPairGrid(
              [
                { move: 'x', prime: "x'" },
                { move: 'y', prime: "y'" },
                { move: 'z', prime: "z'" },
              ],
              getBindDisplay,
              'Rotate'
            )}
          </div>
        `;
      }
      return `
        <div class="moves-section">
          <div class="moves-section-label">Axial Layers (120°)</div>
          ${this.renderPairGrid(
            [
              { move: 'U', prime: "U'" },
              { move: 'L', prime: "L'" },
              { move: 'R', prime: "R'" },
              { move: 'B', prime: "B'" },
            ],
            getBindDisplay,
            'Turn'
          )}
        </div>
      `;
    }

    if (this.activeMoveGroup === 'slices') {
      const label = this.activePuzzle === '4x4' ? 'Dual Middle Slices (M, E, S)' : 'Middle Slices (M, E, S)';
      return `
        <div class="moves-section">
          <div class="moves-section-label">${label}</div>
          ${this.renderPairGrid(
            [
              { move: 'M', prime: "M'" },
              { move: 'E', prime: "E'" },
              { move: 'S', prime: "S'" },
            ],
            getBindDisplay,
            'Slice'
          )}
        </div>
      `;
    }

    if (this.activeMoveGroup === 'inner' && this.activePuzzle === '4x4') {
      return `
        <div class="moves-section">
          <div class="moves-section-label">4×4 Inner Middle Slices</div>
          ${this.renderPairGrid(
            [
              { move: '2R', prime: "2R'" },
              { move: '2L', prime: "2L'" },
              { move: '2U', prime: "2U'" },
              { move: '2D', prime: "2D'" },
              { move: '2F', prime: "2F'" },
              { move: '2B', prime: "2B'" },
            ],
            getBindDisplay,
            'Inner'
          )}
        </div>
      `;
    }

    if (this.activeMoveGroup === 'wide') {
      return `
        <div class="moves-section">
          <div class="moves-section-label">Wide Two-Layer Turns</div>
          ${this.renderPairGrid(
            [
              { move: 'Rw', prime: "Rw'" },
              { move: 'Lw', prime: "Lw'" },
              { move: 'Uw', prime: "Uw'" },
              { move: 'Dw', prime: "Dw'" },
              { move: 'Fw', prime: "Fw'" },
              { move: 'Bw', prime: "Bw'" },
            ],
            getBindDisplay,
            'Wide'
          )}
        </div>
      `;
    }

    if (this.activeMoveGroup === 'rotations') {
      return `
        <div class="moves-section">
          <div class="moves-section-label">Cube Rotations</div>
          ${this.renderPairGrid(
            [
              { move: 'x', prime: "x'" },
              { move: 'y', prime: "y'" },
              { move: 'z', prime: "z'" },
            ],
            getBindDisplay,
            'Rotate'
          )}
        </div>
      `;
    }

    const facePairs =
      this.activePuzzle === '2x2'
        ? [
            { move: 'R', prime: "R'" },
            { move: 'U', prime: "U'" },
            { move: 'F', prime: "F'" },
            { move: 'L', prime: "L'" },
            { move: 'D', prime: "D'" },
            { move: 'B', prime: "B'" },
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
        <div class="moves-section-label">Outer Face Turns</div>
        ${this.renderPairGrid(facePairs, getBindDisplay, 'Execute')}
      </div>
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

    // Camera POV sensitivity slider
    const povSlider = this.container.querySelector<HTMLInputElement>('#pov-slider');
    const povVal = this.container.querySelector<HTMLElement>('#pov-val');
    povSlider?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.settings.setCameraSensitivity(val);
      if (povVal) povVal.textContent = `${val.toFixed(1)}×`;
    });

    // Move category filter pills inside Moves Pad
    const filterButtons = this.container.querySelectorAll<HTMLButtonElement>('[data-move-group]');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const grp = btn.getAttribute('data-move-group');
        if (grp && grp !== this.activeMoveGroup) {
          this.activeMoveGroup = grp;
          this.refreshMovesPadBody();
        }
      });
    });

    this.attachMovePadButtonListeners();

    // Edit keybinds button
    this.container.querySelector('#btn-edit-keybinds')?.addEventListener('click', () => {
      this.settings.open();
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

  private getBindDisplay(action: string): string {
    const keybinds = this.settings.getKeybinds();
    const code = keybinds[action];
    if (code) return formatKeyCode(code);
    if (action.endsWith("'")) {
      const base = action.slice(0, -1);
      const baseCode = keybinds[base];
      return baseCode ? `⇧${formatKeyCode(baseCode)}` : '-';
    }
    return '-';
  }

  private refreshMovesPadBody(): void {
    const filterButtons = this.container.querySelectorAll<HTMLButtonElement>('[data-move-group]');
    filterButtons.forEach((btn) => {
      const active = btn.getAttribute('data-move-group') === this.activeMoveGroup;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    const scrollEl = this.container.querySelector<HTMLElement>('#moves-pad-scroll');
    if (scrollEl) {
      scrollEl.innerHTML = this.renderMovesPad((act) => this.getBindDisplay(act));
      this.attachMovePadButtonListeners();
    }
  }

  private attachMovePadButtonListeners(): void {
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

  refreshSensitivityDisplay(): void {
    const val = this.settings.getCameraSensitivity();
    const povSlider = this.container.querySelector<HTMLInputElement>('#pov-slider');
    const povVal = this.container.querySelector<HTMLElement>('#pov-val');
    if (povSlider) povSlider.value = val.toFixed(1);
    if (povVal) povVal.textContent = `${val.toFixed(1)}×`;
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
      const size = this.activePuzzle === '2x2' ? 2 : this.activePuzzle === '4x4' ? 4 : 3;
      const len = size === 2 ? 14 : size === 4 ? 38 : 22;
      scramble = generateScramble(len, size);
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
    const telemetryMoves = this.container.querySelector<HTMLElement>('#telemetry-moves-pill');
    if (!list) return;

    const total = this.moveHistory.length;
    if (count) count.textContent = String(total);
    if (mobileCount) mobileCount.textContent = String(total);
    if (telemetryMoves) telemetryMoves.textContent = `${total} ${total === 1 ? 'move' : 'moves'}`;

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
