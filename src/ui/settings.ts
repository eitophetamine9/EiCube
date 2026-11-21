export interface KeybindMap {
  [action: string]: string; // action e.g. 'U', 'D', 'L', 'R', 'F', 'B', 'M', 'E', 'S', 'x', 'y', 'z', etc. -> Key code e.g. 'KeyU', 'KeyR'
}

export const DEFAULT_KEYBINDS: KeybindMap = {
  U: 'KeyU',
  D: 'KeyD',
  L: 'KeyL',
  R: 'KeyR',
  F: 'KeyF',
  B: 'KeyB',
  M: 'KeyM',
  E: 'KeyE',
  S: 'KeyS',
  x: 'KeyX',
  y: 'KeyY',
  z: 'KeyZ',
};

const STORAGE_KEY = 'eicube_keybinds_v1';

export class SettingsManager {
  private keybinds: KeybindMap;
  private modalEl: HTMLElement | null = null;
  private isModalOpen: boolean = false;
  private listeningAction: string | null = null;
  private onKeybindsChange?: (keybinds: KeybindMap) => void;

  constructor(onKeybindsChange?: (keybinds: KeybindMap) => void) {
    this.onKeybindsChange = onKeybindsChange;
    this.keybinds = this.loadKeybinds();
    this.createModal();
  }

  loadKeybinds(): KeybindMap {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_KEYBINDS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore fallback
    }
    return { ...DEFAULT_KEYBINDS };
  }

  saveKeybinds(binds: KeybindMap): void {
    this.keybinds = binds;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(binds));
    } catch {
      // Ignore
    }
    this.onKeybindsChange?.(binds);
  }

  resetToDefaults(): void {
    this.keybinds = { ...DEFAULT_KEYBINDS };
    this.saveKeybinds(this.keybinds);
    this.renderKeybindRows();
  }

  getKeybinds(): KeybindMap {
    return { ...this.keybinds };
  }

  isOpen(): boolean {
    return this.isModalOpen;
  }

  open(): void {
    if (!this.modalEl) return;
    this.isModalOpen = true;
    this.modalEl.classList.add('is-open');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.renderKeybindRows();
    const closeBtn = this.modalEl.querySelector<HTMLButtonElement>('.modal-close');
    closeBtn?.focus();
  }

  close(): void {
    if (!this.modalEl) return;
    this.isModalOpen = false;
    this.listeningAction = null;
    this.modalEl.classList.remove('is-open');
    this.modalEl.setAttribute('aria-hidden', 'true');
  }

  private createModal(): void {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'settings-modal-title');

    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h2 id="settings-modal-title" class="modal-title">Keyboard Controls & Settings</h2>
          <button class="modal-close" aria-label="Close settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-intro">
            Click any key button to rebind it. Hold <strong>Shift</strong> for inverse (prime) moves, or <strong>Alt / Option</strong> for double turns.
          </p>
          <div id="keybind-conflict-warning" class="settings-warning" style="display: none;"></div>
          <div class="keybinds-table-container">
            <div class="keybinds-grid" id="keybinds-grid"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="btn-reset-keybinds" class="btn btn-secondary">Reset to Defaults</button>
          <button id="btn-done-keybinds" class="btn btn-primary">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    // Listeners
    modal.querySelector('.modal-close')?.addEventListener('click', () => this.close());
    modal.querySelector('#btn-done-keybinds')?.addEventListener('click', () => this.close());
    modal.querySelector('#btn-reset-keybinds')?.addEventListener('click', () => this.resetToDefaults());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isModalOpen) return;

      if (e.key === 'Escape') {
        if (this.listeningAction) {
          this.listeningAction = null;
          this.renderKeybindRows();
        } else {
          this.close();
        }
        return;
      }

      if (this.listeningAction) {
        e.preventDefault();
        e.stopPropagation();

        const code = e.code;
        // Ignore modifier keys by themselves
        if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(code)) {
          return;
        }

        // Check conflicts
        const conflictAction = Object.keys(this.keybinds).find(
          (act) => act !== this.listeningAction && this.keybinds[act] === code
        );

        const warningEl = this.modalEl?.querySelector<HTMLElement>('#keybind-conflict-warning');

        if (conflictAction) {
          if (warningEl) {
            warningEl.textContent = `Key "${formatKeyCode(code)}" is already bound to "${conflictAction}". Conflict resolved by swapping.`;
            warningEl.style.display = 'block';
          }
          // Swap or unbind conflicting
          this.keybinds[conflictAction] = '';
        } else if (warningEl) {
          warningEl.style.display = 'none';
        }

        this.keybinds[this.listeningAction] = code;
        this.listeningAction = null;
        this.saveKeybinds(this.keybinds);
        this.renderKeybindRows();
      }
    });
  }

  private renderKeybindRows(): void {
    if (!this.modalEl) return;
    const grid = this.modalEl.querySelector<HTMLElement>('#keybinds-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const actions = [
      { id: 'U', label: 'Up Face (U)', desc: 'Top layer' },
      { id: 'D', label: 'Down Face (D)', desc: 'Bottom layer' },
      { id: 'L', label: 'Left Face (L)', desc: 'Left layer' },
      { id: 'R', label: 'Right Face (R)', desc: 'Right layer' },
      { id: 'F', label: 'Front Face (F)', desc: 'Front layer' },
      { id: 'B', label: 'Back Face (B)', desc: 'Back layer' },
      { id: 'M', label: 'Middle Slice (M)', desc: 'Between L and R' },
      { id: 'E', label: 'Equator Slice (E)', desc: 'Between U and D' },
      { id: 'S', label: 'Standing Slice (S)', desc: 'Between F and B' },
      { id: 'x', label: 'Cube Rotation X', desc: 'Roll forward/back' },
      { id: 'y', label: 'Cube Rotation Y', desc: 'Turn left/right' },
      { id: 'z', label: 'Cube Rotation Z', desc: 'Tilt clockwise/counter' },
    ];

    actions.forEach((act) => {
      const row = document.createElement('div');
      row.className = 'keybind-item';
      const isListening = this.listeningAction === act.id;
      const code = this.keybinds[act.id] || '';
      const displayKey = isListening ? 'Press key...' : formatKeyCode(code);

      row.innerHTML = `
        <div class="keybind-info">
          <span class="keybind-label">${act.label}</span>
          <span class="keybind-desc">${act.desc}</span>
        </div>
        <button class="keybind-btn ${isListening ? 'is-listening' : ''}" data-action="${act.id}" aria-label="Rebind ${act.label}">
          <kbd>${displayKey}</kbd>
        </button>
      `;

      row.querySelector('.keybind-btn')?.addEventListener('click', () => {
        this.listeningAction = act.id;
        this.renderKeybindRows();
      });

      grid.appendChild(row);
    });
  }
}

export function formatKeyCode(code: string): string {
  if (!code) return 'None';
  if (code.startsWith('Key')) return code.slice(3).toUpperCase();
  if (code.startsWith('Digit')) return code.slice(5);
  switch (code) {
    case 'Space': return 'Space';
    case 'Enter': return 'Enter';
    case 'ArrowUp': return '↑';
    case 'ArrowDown': return '↓';
    case 'ArrowLeft': return '←';
    case 'ArrowRight': return '→';
    default: return code;
  }
}
