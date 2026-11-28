import { toast } from './toast';
import { COLOR_SCHEMES, ColorSchemeId } from '../cube/types';
import { applyTheme, getStoredTheme, ThemeMode } from './theme';
import { soundEngine, TURN_SOUND_PROFILES, TurnSoundProfile } from '../audio/soundEngine';

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
  // Slices & prime slices
  M: 'KeyM',
  "M'": '',
  E: 'KeyE',
  "E'": '',
  S: 'KeyS',
  "S'": '',
  // Rotations
  x: 'KeyX',
  "x'": '',
  y: 'KeyY',
  "y'": '',
  z: 'KeyZ',
  "z'": '',
  // Wide moves (4x4 & 3x3)
  Rw: '',
  "Rw'": '',
  Lw: '',
  "Lw'": '',
  Uw: '',
  "Uw'": '',
  Dw: '',
  "Dw'": '',
  Fw: '',
  "Fw'": '',
  Bw: '',
  "Bw'": '',
  // 4x4 Inner middle slices
  '2R': '',
  "2R'": '',
  '2L': '',
  "2L'": '',
  '2U': '',
  "2U'": '',
  '2D': '',
  "2D'": '',
  '2F': '',
  "2F'": '',
  '2B': '',
  "2B'": '',
  // Pyraminx tips
  u: '',
  "u'": '',
  l: '',
  "l'": '',
  r: '',
  "r'": '',
  b: '',
  "b'": '',
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
  // Slices
  M: 'KeyM',
  "M'": 'KeyN',
  E: 'KeyC',
  "E'": '',
  S: 'KeyV',
  "S'": '',
  // Rotations
  x: 'KeyT',
  "x'": '',
  y: 'KeyY',
  "y'": '',
  z: 'KeyP',
  "z'": '',
  // Wide
  Rw: 'KeyU',
  "Rw'": '',
  Lw: '',
  "Lw'": '',
  Uw: '',
  "Uw'": '',
  // Pyraminx tips
  u: 'Digit7',
  "u'": 'Digit8',
  l: 'Digit9',
  "l'": 'Digit0',
  r: 'Minus',
  "r'": 'Equal',
  b: 'BracketLeft',
  "b'": 'BracketRight',
};

const STORAGE_KEY = 'eicube_keybinds_v2';
const SENSITIVITY_STORAGE_KEY = 'eicube_cam_sensitivity_v1';
const SCHEME_STORAGE_KEY = 'eicube_color_scheme_v1';
const DEFAULT_CAMERA_SENSITIVITY = 2.0;

export class SettingsManager {
  private keybinds: KeybindMap;
  private cameraSensitivity: number;
  private colorScheme: ColorSchemeId;
  private modalEl: HTMLElement | null = null;
  private isModalOpen: boolean = false;
  private activePage: 'general' | 'keybinds' = 'general';
  private activeKeybindPuzzle: '3x3' | '2x2' | '4x4' | 'pyraminx' = '3x3';
  private listeningAction: string | null = null;
  private onKeybindsChange?: (keybinds: KeybindMap) => void;
  private onSensitivityChange?: (speed: number) => void;
  private onColorSchemeChange?: (scheme: ColorSchemeId) => void;

  constructor(
    onKeybindsChange?: (keybinds: KeybindMap) => void,
    onSensitivityChange?: (speed: number) => void,
    onColorSchemeChange?: (scheme: ColorSchemeId) => void
  ) {
    this.onKeybindsChange = onKeybindsChange;
    this.onSensitivityChange = onSensitivityChange;
    this.onColorSchemeChange = onColorSchemeChange;
    this.keybinds = this.loadKeybinds();
    this.cameraSensitivity = this.loadCameraSensitivity();
    this.colorScheme = this.loadColorScheme();
    if (typeof document !== 'undefined') {
      this.createModal();
    }
  }

  loadCameraSensitivity(): number {
    try {
      const raw = localStorage.getItem(SENSITIVITY_STORAGE_KEY);
      if (raw !== null) {
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed)) {
          return Math.max(0.5, Math.min(5.0, parsed));
        }
      }
    } catch {
      // Ignore
    }
    return DEFAULT_CAMERA_SENSITIVITY;
  }

  getCameraSensitivity(): number {
    return this.cameraSensitivity;
  }

  setCameraSensitivity(speed: number): void {
    const clamped = Math.round(Math.max(0.5, Math.min(5.0, speed)) * 10) / 10;
    this.cameraSensitivity = clamped;
    try {
      localStorage.setItem(SENSITIVITY_STORAGE_KEY, String(clamped));
    } catch {
      // Ignore
    }
    const modalSlider = this.modalEl?.querySelector<HTMLInputElement>('#modal-pov-slider');
    const modalVal = this.modalEl?.querySelector<HTMLElement>('#modal-pov-val');
    if (modalSlider) modalSlider.value = String(clamped);
    if (modalVal) modalVal.textContent = `${clamped.toFixed(1)}×`;
    this.onSensitivityChange?.(clamped);
  }

  loadColorScheme(): ColorSchemeId {
    try {
      const raw = localStorage.getItem(SCHEME_STORAGE_KEY);
      if (raw === 'contrast') {
        localStorage.setItem(SCHEME_STORAGE_KEY, 'pastel');
        return 'pastel';
      }
      if (raw && raw in COLOR_SCHEMES) {
        return raw as ColorSchemeId;
      }
    } catch {
      // Ignore
    }
    return 'classic';
  }

  getColorScheme(): ColorSchemeId {
    return this.colorScheme;
  }

  setColorScheme(scheme: ColorSchemeId): void {
    if (!(scheme in COLOR_SCHEMES)) return;
    this.colorScheme = scheme;
    try {
      localStorage.setItem(SCHEME_STORAGE_KEY, scheme);
    } catch {
      // Ignore
    }
    this.modalEl?.querySelectorAll<HTMLButtonElement>('[data-scheme-choice]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.schemeChoice === scheme);
    });
    this.onColorSchemeChange?.(scheme);
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
    const warningEl = this.modalEl?.querySelector<HTMLElement>('#keybind-conflict-warning');

    if (code) {
      // Check conflicts
      const conflictAction = Object.keys(this.keybinds).find(
        (act) => act !== action && this.keybinds[act] === code
      );
      if (conflictAction) {
        this.keybinds[conflictAction] = '';
        if (warningEl) {
          warningEl.textContent = `Rebound ${action} to ${formatKeyCode(code)} (cleared ${conflictAction})`;
          warningEl.style.display = 'block';
        }
        toast.show(`Bound ${action} to ${formatKeyCode(code)} (cleared ${conflictAction})`);
      } else {
        if (warningEl) {
          warningEl.style.display = 'none';
        }
        toast.show(`Bound ${action} to ${formatKeyCode(code)}`);
      }
    } else {
      if (warningEl) {
        warningEl.style.display = 'none';
      }
      toast.show(`Cleared keybind for ${action}`);
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
    this.setCameraSensitivity(DEFAULT_CAMERA_SENSITIVITY);
    this.setColorScheme('classic');
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
    if (initialActionToRebind) {
      if (/^2[RLUDFB]/i.test(initialActionToRebind)) {
        this.activeKeybindPuzzle = '4x4';
      } else if (/^[ulrb]'?$/.test(initialActionToRebind)) {
        this.activeKeybindPuzzle = 'pyraminx';
      }
      this.setPage('keybinds');
    } else {
      this.setPage(this.activePage);
    }
    this.renderKeybindRows();
    const closeBtn = this.modalEl.querySelector<HTMLButtonElement>('.modal-close');
    closeBtn?.focus();
  }

  public setPage(page: 'general' | 'keybinds'): void {
    this.activePage = page;
    if (!this.modalEl) return;
    this.modalEl.querySelectorAll<HTMLButtonElement>('[data-settings-page]').forEach((btn) => {
      const active = btn.dataset.settingsPage === page;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    this.modalEl.querySelectorAll<HTMLElement>('[data-settings-panel]').forEach((panel) => {
      const active = panel.dataset.settingsPanel === page;
      panel.style.display = active ? 'block' : 'none';
    });
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
            <h2 id="settings-modal-title" class="modal-title">Studio Settings</h2>
            <span class="modal-badge">v1.0.4</span>
          </div>
          <button class="modal-close" aria-label="Close settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="settings-tabs-bar" role="tablist" aria-label="Settings Pages">
          <button type="button" class="btn-picker is-active" data-settings-page="general" role="tab" aria-selected="true">General</button>
          <button type="button" class="btn-picker" data-settings-page="keybinds" role="tab" aria-selected="false">Custom Keybinds</button>
        </div>

        <div class="modal-body">
          <!-- Page 1: General Settings -->
          <div class="settings-page" data-settings-panel="general">
            <div class="settings-scheme-row settings-theme-icon-row">
              <div class="sensitivity-info">
                <span class="keybind-label">Theme Appearance</span>
                <span class="keybind-desc">Switch between Daylight and Dark Matrix mode</span>
              </div>
              <div class="theme-icons-group" role="group" aria-label="Theme Appearance">
                <button type="button" class="btn-picker btn-theme-icon ${getStoredTheme() === 'light' ? 'is-active' : ''}" data-settings-theme="light" title="Daylight Theme" aria-label="Daylight Theme">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                </button>
                <button type="button" class="btn-picker btn-theme-icon ${getStoredTheme() === 'dark' ? 'is-active' : ''}" data-settings-theme="dark" title="Dark Matrix Theme" aria-label="Dark Matrix Theme">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                </button>
              </div>
            </div>

            <div class="settings-scheme-row">
              <div class="sensitivity-info">
                <span class="keybind-label">Turn Sound Effects</span>
                <span class="keybind-desc">Choose 1 of 3 tactile speedcubing sound profiles and adjust volume</span>
              </div>
              <div class="sfx-controls-stack">
                <div class="scheme-pills-group" role="group" aria-label="Sound Effect Profile">
                  ${(Object.keys(TURN_SOUND_PROFILES) as TurnSoundProfile[])
                    .map(
                      (id) =>
                        `<button type="button" class="btn-picker ${
                          soundEngine.getProfile() === id ? 'is-active' : ''
                        }" data-sfx-profile="${id}" title="${TURN_SOUND_PROFILES[id].description}">${TURN_SOUND_PROFILES[id].name}</button>`
                    )
                    .join('')}
                  <button type="button" id="btn-sfx-preview" class="btn btn-sm btn-secondary">Preview</button>
                </div>
                <div class="sensitivity-slider-group sfx-volume-row">
                  <label for="modal-sfx-volume" class="speed-label">Volume</label>
                  <input type="range" id="modal-sfx-volume" min="0" max="100" step="5" value="${Math.round(soundEngine.getVolume() * 100)}" aria-label="Turn Sound Volume" />
                  <span id="modal-sfx-vol-val" class="speed-val">${Math.round(soundEngine.getVolume() * 100)}%</span>
                </div>
              </div>
            </div>

            <div class="settings-scheme-row">
              <div class="sensitivity-info">
                <span class="keybind-label">IRL Cube Color Themes</span>
                <span class="keybind-desc">Switch between real-world speedcube plastics and color palettes</span>
              </div>
              <div class="scheme-swatch-grid" role="group" aria-label="Cube Color Scheme">
                ${(Object.keys(COLOR_SCHEMES) as ColorSchemeId[])
                  .map((id) => {
                    const p = COLOR_SCHEMES[id];
                    const swatches = [p.cubeFaces.U, p.cubeFaces.F, p.cubeFaces.R, p.cubeFaces.B, p.cubeFaces.L, p.cubeFaces.D]
                      .map((hex) => `<span class="scheme-swatch-dot" style="background:${hex};"></span>`)
                      .join('');
                    return `
                      <button type="button" class="scheme-swatch-card ${this.colorScheme === id ? 'is-active' : ''}" data-scheme-choice="${id}">
                        <span class="scheme-swatch-dots">${swatches}</span>
                        <span class="scheme-swatch-name">${p.name}</span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>

            <div class="settings-sensitivity-row">
              <div class="sensitivity-info">
                <label for="modal-pov-slider" class="keybind-label">Drag Sensitivity</label>
                <span class="keybind-desc">Adjust how fast dragging rotates across all X, Y, Z sphere axes</span>
              </div>
              <div class="sensitivity-slider-group">
                <input type="range" id="modal-pov-slider" min="0.5" max="5.0" step="0.1" value="${this.cameraSensitivity.toFixed(1)}" aria-label="Drag Sensitivity" />
                <span id="modal-pov-val" class="speed-val">${this.cameraSensitivity.toFixed(1)}×</span>
              </div>
            </div>
          </div>

          <!-- Page 2: Custom Keybinds -->
          <div class="settings-page" data-settings-panel="keybinds" style="display: none;">
            <div class="presets-row">
              <span class="preset-label">Quick Presets:</span>
              <button id="preset-default" class="btn btn-sm btn-secondary">Standard (U, D, L, R, F, B)</button>
              <button id="preset-twohand" class="btn btn-sm btn-primary">Two-Hand Pro Speedcubing</button>
            </div>
            <div class="keybind-puzzle-tabs" role="tablist" aria-label="Puzzle Keybind Sections">
              <button type="button" class="btn-picker ${this.activeKeybindPuzzle === '3x3' ? 'is-active' : ''}" data-keybind-puzzle="3x3">3×3</button>
              <button type="button" class="btn-picker ${this.activeKeybindPuzzle === '2x2' ? 'is-active' : ''}" data-keybind-puzzle="2x2">2×2</button>
              <button type="button" class="btn-picker ${this.activeKeybindPuzzle === '4x4' ? 'is-active' : ''}" data-keybind-puzzle="4x4">4×4</button>
              <button type="button" class="btn-picker ${this.activeKeybindPuzzle === 'pyraminx' ? 'is-active' : ''}" data-keybind-puzzle="pyraminx">Pyraminx</button>
            </div>
            <p class="modal-intro">
              Click any button to assign your preferred key (e.g. set <strong>R</strong> to <strong>D</strong>, or assign single dedicated keys to prime moves like <strong>R'</strong> or <strong>U'</strong> without holding Shift!).
            </p>
            <div id="keybind-conflict-warning" class="settings-warning" style="display: none;"></div>
            <div class="keybinds-table-container">
              <div class="keybinds-grid" id="keybinds-grid"></div>
            </div>
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
    modal.querySelector<HTMLInputElement>('#modal-pov-slider')?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.setCameraSensitivity(val);
    });
    modal.querySelectorAll<HTMLButtonElement>('[data-scheme-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const scheme = btn.dataset.schemeChoice as ColorSchemeId;
        if (scheme) this.setColorScheme(scheme);
      });
    });

    const syncThemePills = (mode: ThemeMode) => {
      modal.querySelectorAll<HTMLButtonElement>('[data-settings-theme]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.settingsTheme === mode);
      });
    };

    modal.querySelectorAll<HTMLButtonElement>('[data-settings-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.settingsTheme as ThemeMode;
        if (mode === 'light' || mode === 'dark') {
          applyTheme(mode);
          syncThemePills(mode);
        }
      });
    });

    modal.querySelectorAll<HTMLButtonElement>('[data-settings-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.settingsPage as 'general' | 'keybinds';
        if (page === 'general' || page === 'keybinds') {
          this.setPage(page);
        }
      });
    });

    modal.querySelectorAll<HTMLButtonElement>('[data-keybind-puzzle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pz = btn.dataset.keybindPuzzle as '3x3' | '2x2' | '4x4' | 'pyraminx';
        if (pz) {
          this.activeKeybindPuzzle = pz;
          modal.querySelectorAll<HTMLButtonElement>('[data-keybind-puzzle]').forEach((b) => {
            b.classList.toggle('is-active', b.dataset.keybindPuzzle === pz);
          });
          this.renderKeybindRows();
        }
      });
    });

    modal.querySelectorAll<HTMLButtonElement>('[data-sfx-profile]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prof = btn.dataset.sfxProfile as TurnSoundProfile;
        if (prof && prof in TURN_SOUND_PROFILES) {
          soundEngine.setProfile(prof);
          modal.querySelectorAll<HTMLButtonElement>('[data-sfx-profile]').forEach((b) => {
            b.classList.toggle('is-active', b.dataset.sfxProfile === prof);
          });
          soundEngine.preview(prof);
        }
      });
    });

    modal.querySelector('#btn-sfx-preview')?.addEventListener('click', () => {
      soundEngine.preview();
    });

    modal.querySelector<HTMLInputElement>('#modal-sfx-volume')?.addEventListener('input', (e) => {
      const pct = parseInt((e.target as HTMLInputElement).value, 10);
      soundEngine.setVolume(pct / 100);
      const label = modal.querySelector<HTMLElement>('#modal-sfx-vol-val');
      if (label) label.textContent = `${pct}%`;
    });

    window.addEventListener('eicube-themechange', (e) => {
      const mode = (e as CustomEvent<{ theme: ThemeMode }>).detail?.theme;
      if (mode) syncThemePills(mode);
    });

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
        if (
          [
            'ShiftLeft',
            'ShiftRight',
            'ControlLeft',
            'ControlRight',
            'AltLeft',
            'AltRight',
            'MetaLeft',
            'MetaRight',
          ].includes(code)
        ) {
          return;
        }

        const actionToRebind = this.listeningAction;
        this.listeningAction = null; // Clear listening BEFORE saving so re-render shows the new key!

        if (code === 'Backspace' || code === 'Delete') {
          this.setKeybind(actionToRebind, '');
        } else {
          this.setKeybind(actionToRebind, code);
        }
      }
    });
  }

  private renderKeybindRows(): void {
    if (!this.modalEl) return;
    this.modalEl.querySelectorAll<HTMLButtonElement>('[data-keybind-puzzle]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.keybindPuzzle === this.activeKeybindPuzzle);
    });

    const grid = this.modalEl.querySelector<HTMLElement>('#keybinds-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const faces = [
      { id: 'U', label: 'Up (U)', desc: 'Clockwise top layer' },
      { id: "U'", label: "Up Prime (U')", desc: 'Counter-clockwise top layer' },
      { id: 'D', label: 'Down (D)', desc: 'Clockwise bottom layer' },
      { id: "D'", label: "Down Prime (D')", desc: 'Counter-clockwise bottom layer' },
      { id: 'L', label: 'Left (L)', desc: 'Clockwise left layer' },
      { id: "L'", label: "Left Prime (L')", desc: 'Counter-clockwise left layer' },
      { id: 'R', label: 'Right (R)', desc: 'Clockwise right layer' },
      { id: "R'", label: "Right Prime (R')", desc: 'Counter-clockwise right layer' },
      { id: 'F', label: 'Front (F)', desc: 'Clockwise front layer' },
      { id: "F'", label: "Front Prime (F')", desc: 'Counter-clockwise front layer' },
      { id: 'B', label: 'Back (B)', desc: 'Clockwise back layer' },
      { id: "B'", label: "Back Prime (B')", desc: 'Counter-clockwise back layer' },
    ];
    const slices = [
      { id: 'M', label: 'Middle Slice (M)', desc: 'Between L and R (follows L downward)' },
      { id: "M'", label: "Middle Prime (M')", desc: 'Upward middle slice (follows R)' },
      { id: 'E', label: 'Equator Slice (E)', desc: 'Between U and D (follows D)' },
      { id: "E'", label: "Equator Prime (E')", desc: 'Opposite equator slice' },
      { id: 'S', label: 'Standing Slice (S)', desc: 'Between F and B (follows F)' },
      { id: "S'", label: "Standing Prime (S')", desc: 'Opposite standing slice' },
    ];
    const rotations = [
      { id: 'x', label: 'Cube Rotation X', desc: 'Roll forward (follows R)' },
      { id: "x'", label: "Cube Rotation X'", desc: 'Roll backward (follows L)' },
      { id: 'y', label: 'Cube Rotation Y', desc: 'Turn left (follows U)' },
      { id: "y'", label: "Cube Rotation Y'", desc: 'Turn right (follows D)' },
      { id: 'z', label: 'Cube Rotation Z', desc: 'Tilt clockwise (follows F)' },
      { id: "z'", label: "Cube Rotation Z'", desc: 'Tilt counter-clockwise (follows B)' },
    ];
    const wide = [
      { id: 'Rw', label: 'Wide Right (Rw)', desc: 'Turn Right + Middle layers' },
      { id: "Rw'", label: "Wide Right Prime (Rw')", desc: 'Counter Right + Middle layers' },
      { id: 'Lw', label: 'Wide Left (Lw)', desc: 'Turn Left + Middle layers' },
      { id: "Lw'", label: "Wide Left Prime (Lw')", desc: 'Counter Left + Middle layers' },
      { id: 'Uw', label: 'Wide Up (Uw)', desc: 'Turn Top + Equator layers' },
      { id: "Uw'", label: "Wide Up Prime (Uw')", desc: 'Counter Top + Equator layers' },
      { id: 'Dw', label: 'Wide Down (Dw)', desc: 'Turn Bottom + Equator layers' },
      { id: "Dw'", label: "Wide Down Prime (Dw')", desc: 'Counter Bottom + Equator layers' },
      { id: 'Fw', label: 'Wide Front (Fw)', desc: 'Turn Front + Standing layers' },
      { id: "Fw'", label: "Wide Front Prime (Fw')", desc: 'Counter Front + Standing layers' },
      { id: 'Bw', label: 'Wide Back (Bw)', desc: 'Turn Back + Standing layers' },
      { id: "Bw'", label: "Wide Back Prime (Bw')", desc: 'Counter Back + Standing layers' },
    ];
    const inner4x4 = [
      { id: '2R', label: 'Inner Right (2R)', desc: 'Inner layer adjacent to Right' },
      { id: "2R'", label: "Inner Right Prime (2R')", desc: 'Counter inner Right layer' },
      { id: '2L', label: 'Inner Left (2L)', desc: 'Inner layer adjacent to Left' },
      { id: "2L'", label: "Inner Left Prime (2L')", desc: 'Counter inner Left layer' },
      { id: '2U', label: 'Inner Up (2U)', desc: 'Inner layer adjacent to Up' },
      { id: "2U'", label: "Inner Up Prime (2U')", desc: 'Counter inner Up layer' },
      { id: '2D', label: 'Inner Down (2D)', desc: 'Inner layer adjacent to Down' },
      { id: "2D'", label: "Inner Down Prime (2D')", desc: 'Counter inner Down layer' },
      { id: '2F', label: 'Inner Front (2F)', desc: 'Inner layer adjacent to Front' },
      { id: "2F'", label: "Inner Front Prime (2F')", desc: 'Counter inner Front layer' },
      { id: '2B', label: 'Inner Back (2B)', desc: 'Inner layer adjacent to Back' },
      { id: "2B'", label: "Inner Back Prime (2B')", desc: 'Counter inner Back layer' },
    ];
    const pyraTips = [
      { id: 'u', label: 'Pyraminx Top Tip (u)', desc: 'Top corner tip' },
      { id: "u'", label: "Pyraminx Top Tip Prime (u')", desc: 'Counter top tip' },
      { id: 'l', label: 'Pyraminx Left Tip (l)', desc: 'Left corner tip' },
      { id: "l'", label: "Pyraminx Left Tip Prime (l')", desc: 'Counter left tip' },
      { id: 'r', label: 'Pyraminx Right Tip (r)', desc: 'Right corner tip' },
      { id: "r'", label: "Pyraminx Right Tip Prime (r')", desc: 'Counter right tip' },
      { id: 'b', label: 'Pyraminx Back Tip (b)', desc: 'Back corner tip' },
      { id: "b'", label: "Pyraminx Back Tip Prime (b')", desc: 'Counter back tip' },
    ];
    const pyraLayers = [
      { id: 'U', label: 'Pyraminx Top Layer (U)', desc: 'Axial rotation around top vertex' },
      { id: "U'", label: "Pyraminx Top Layer Prime (U')", desc: 'Counter-clockwise top layer' },
      { id: 'L', label: 'Pyraminx Left Layer (L)', desc: 'Axial rotation around left vertex' },
      { id: "L'", label: "Pyraminx Left Layer Prime (L')", desc: 'Counter-clockwise left layer' },
      { id: 'R', label: 'Pyraminx Right Layer (R)', desc: 'Axial rotation around right vertex' },
      { id: "R'", label: "Pyraminx Right Layer Prime (R')", desc: 'Counter-clockwise right layer' },
      { id: 'B', label: 'Pyraminx Back Layer (B)', desc: 'Axial rotation around back vertex' },
      { id: "B'", label: "Pyraminx Back Layer Prime (B')", desc: 'Counter-clockwise back layer' },
    ];

    const sectionsByPuzzle: Record<
      '3x3' | '2x2' | '4x4' | 'pyraminx',
      Array<{ title: string; items: Array<{ id: string; label: string; desc: string }> }>
    > = {
      '3x3': [
        { title: '3×3 Outer Face Turns', items: faces },
        { title: 'Middle Slices (M, E, S)', items: slices },
        { title: 'Wide Two-Layer Turns', items: wide },
        { title: 'Cube Rotations (x, y, z)', items: rotations },
      ],
      '2x2': [
        { title: '2×2 Outer Face Turns', items: faces },
        { title: 'Cube Rotations (x, y, z)', items: rotations },
      ],
      '4x4': [
        { title: '4×4 Outer Face Turns', items: faces },
        { title: '4×4 Inner Middle Slices (2R–2B)', items: inner4x4 },
        { title: 'Middle Slices (M, E, S)', items: slices },
        { title: 'Wide Two-Layer Turns', items: wide },
        { title: 'Cube Rotations (x, y, z)', items: rotations },
      ],
      pyraminx: [
        { title: 'Pyraminx Axial Layers (U, L, R, B)', items: pyraLayers },
        { title: 'Pyraminx Corner Tips (u, l, r, b)', items: pyraTips },
      ],
    };

    const sections = sectionsByPuzzle[this.activeKeybindPuzzle];

    sections.forEach((sec) => {
      const heading = document.createElement('div');
      heading.className = 'keybinds-section-heading';
      heading.textContent = sec.title;
      grid.appendChild(heading);

      sec.items.forEach((act) => {
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
