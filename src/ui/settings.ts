export interface KeybindMap {
  [action: string]: string; // action e.g. 'U', 'U\'', 'D', 'D\'', 'L', 'L\'', 'R', 'R\'', 'F', 'F\'', 'B', 'B\'', 'M', 'E', 'S', etc.
}

export const DEFAULT_KEYBINDS: KeybindMap = {
  // Regular
  U: 'KeyU',
  D: 'KeyD',
  L: 'KeyL',
  R: 'KeyR',
  F: 'KeyF',
  B: 'KeyB',
  // Direct primes (empty by default so Shift+key works, but user can bind dedicated keys!)
  "U'": '',
  "D'": '',
  "L'": '',
  "R'": '',
  "F'": '',
  "B'": '',
  // Slices & rotations
  M: 'KeyM',
  E: 'KeyE',
  S: 'KeyS',
  x: 'KeyX',
  y: 'KeyY',
  z: 'KeyZ',
};

export const TWOHAND_SPEEDCUBE_KEYBINDS: KeybindMap = {
  U: 'KeyJ',
  "U'": 'KeyF',
  R: 'KeyI',
  "R'": 'KeyK',
  L: 'KeyD',
  "L'": 'KeyE',
  F: 'KeyH',
  "F'": 'KeyG',
  D: 'KeyS',
  "D'": 'KeyL',
  B: 'KeyW',
  "B'": 'KeyO',
  M: 'KeyM',
  E: 'KeyC',
  S: 'KeyV',
  x: 'KeyX',
  y: 'KeyY',
  z: 'KeyZ',
};

const STORAGE_KEY = 'eicube_keybinds_v2';

export class SettingsManager {
  private keybinds: KeybindMap;
  private modalEl: HTMLElement | null = null;
  private isModalOpen: boolean = false;
  private listeningAction: string | null = null;
  private onKeybindsChange?: (keybinds: KeybindMap) => void;

  constructor(onKeybindsChange?: (keybinds: KeybindMap) => void) {
    this.onKeybindsChange = onKeybindsChange;
    this.keybinds = this.loadKeybinds();
    if (typeof document !== 'undefined') {
      this.createModal();
    }
  }

  loadKeybinds(): KeybindMap {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_KEYBINDS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore
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

  setKeybind(action: string, code: string): void {
    // Check conflicts
    const conflictAction = Object.keys(this.keybinds).find(
      (act) => act !== action && this.keybinds[act] === code
    );
    if (conflictAction) {
      this.keybinds[conflictAction] = '';
    }
    this.keybinds[action] = code;
    this.saveKeybinds(this.keybinds);
    this.renderKeybindRows();
  }

  applyPreset(presetName: 'default' | 'twohand'): void {
    if (presetName === 'twohand') {
      this.keybinds = { ...TWOHAND_SPEEDCUBE_KEYBINDS };
    } else {
      this.keybinds = { ...DEFAULT_KEYBINDS };
    }
    this.saveKeybinds(this.keybinds);
    this.renderKeybindRows();
  }

  resetToDefaults(): void {
    this.applyPreset('default');
  }

  getKeybinds(): KeybindMap {
    return { ...this.keybinds };
  }

  isOpen(): boolean {
    return this.isModalOpen;
  }

  open(initialActionToRebind?: string): void {
    if (!this.modalEl) return;
    this.isModalOpen = true;
    this.modalEl.classList.add('is-open');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.listeningAction = initialActionToRebind || null;
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
          <div class="modal-header-left">
            <h2 id="settings-modal-title" class="modal-title">Custom Keybinds & Controls</h2>
            <span class="modal-badge">Full Customization</span>
          </div>
          <button class="modal-close" aria-label="Close settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="presets-row">
            <span class="preset-label">Quick Presets:</span>
            <button id="preset-default" class="btn btn-sm btn-secondary">Standard (U, D, L, R, F, B)</button>
            <button id="preset-twohand" class="btn btn-sm btn-primary">Two-Hand Pro Speedcubing</button>
          </div>
          <p class="modal-intro">
            Click any button to assign your preferred key (e.g. set <strong>R</strong> to <strong>D</strong>, or assign single dedicated keys to prime moves like <strong>R'</strong> or <strong>U'</strong> without holding Shift!).
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
    modal.querySelector('#preset-default')?.addEventListener('click', () => this.applyPreset('default'));
    modal.querySelector('#preset-twohand')?.addEventListener('click', () => this.applyPreset('twohand'));

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
        // Ignore standalone modifiers
        if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(code)) {
          return;
        }

        this.setKeybind(this.listeningAction, code);
        this.listeningAction = null;
      }
    });
  }

  private renderKeybindRows(): void {
    if (!this.modalEl) return;
    const grid = this.modalEl.querySelector<HTMLElement>('#keybinds-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const actions = [
      // Regular Clockwise
      { id: 'U', label: 'Up (U)', desc: 'Clockwise top' },
      { id: "U'", label: "Up Prime (U')", desc: 'Counter-clockwise top' },
      { id: 'D', label: 'Down (D)', desc: 'Clockwise bottom' },
      { id: "D'", label: "Down Prime (D')", desc: 'Counter-clockwise bottom' },
      { id: 'L', label: 'Left (L)', desc: 'Clockwise left' },
      { id: "L'", label: "Left Prime (L')", desc: 'Counter-clockwise left' },
      { id: 'R', label: 'Right (R)', desc: 'Clockwise right' },
      { id: "R'", label: "Right Prime (R')", desc: 'Counter-clockwise right' },
      { id: 'F', label: 'Front (F)', desc: 'Clockwise front' },
      { id: "F'", label: "Front Prime (F')", desc: 'Counter-clockwise front' },
      { id: 'B', label: 'Back (B)', desc: 'Clockwise back' },
      { id: "B'", label: "Back Prime (B')", desc: 'Counter-clockwise back' },
      // Slices
      { id: 'M', label: 'Middle Slice (M)', desc: 'Between L and R' },
      { id: 'E', label: 'Equator Slice (E)', desc: 'Between U and D' },
      { id: 'S', label: 'Standing Slice (S)', desc: 'Between F and B' },
      // Rotations
      { id: 'x', label: 'Rotation X', desc: 'Roll forward/back' },
      { id: 'y', label: 'Rotation Y', desc: 'Turn left/right' },
      { id: 'z', label: 'Rotation Z', desc: 'Tilt clockwise/counter' },
    ];

    actions.forEach((act) => {
      const row = document.createElement('div');
      row.className = 'keybind-item';
      const isListening = this.listeningAction === act.id;
      const code = this.keybinds[act.id] || '';
      const displayKey = isListening ? 'Press key...' : code ? formatKeyCode(code) : 'None';

      row.innerHTML = `
        <div class="keybind-info">
          <span class="keybind-label">${act.label}</span>
          <span class="keybind-desc">${act.desc}</span>
        </div>
        <button class="keybind-btn ${isListening ? 'is-listening' : ''} ${!code ? 'is-unassigned' : ''}" data-action="${act.id}" aria-label="Rebind ${act.label}">
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
