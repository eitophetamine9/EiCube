import { Face, ColorSchemeId } from '../cube/types';
import {
  CubeState,
  FaceStickersNet,
  createCubeStateFromFaceNet,
  createSolvedFaceNet,
  extractFaceNet,
} from '../cube/CubeState';
import { resolveTurn } from '../cube/moves';
import { solveCube3x3, SolveResult, validateFaceNet } from '../cube/solver3x3';
import {
  RgbColor,
  classifyRgbColor,
  reclassifyAllFacesWithCenters,
  sampleRgbFromMediaSource,
} from '../cube/colorClassifier';
import { getMoveGifMeta } from '../content/movesGlossaryData';
import { RubiksCubeScene } from '../render/RubiksCubeScene';
import { toast } from './toast';

export interface HelpCubeCallbacks {
  getCurrentTrainerCube: () => CubeState | null;
  getColorScheme: () => ColorSchemeId;
  getCameraSensitivity: () => number;
  onOpenInTrainer: (state: CubeState) => void;
  onGoToSmartCube: () => void;
}

const FACE_ORDER: Face[] = ['U', 'F', 'R', 'B', 'L', 'D'];

const FACE_LABELS: Record<Face, { short: string; colorName: string; holdHint: string }> = {
  U: { short: 'U · Top', colorName: 'White', holdHint: 'White center facing you, Green edge pointing down' },
  F: { short: 'F · Front', colorName: 'Green', holdHint: 'Green center facing you, White edge on top' },
  R: { short: 'R · Right', colorName: 'Red', holdHint: 'Red center facing you, White edge on top' },
  B: { short: 'B · Back', colorName: 'Blue', holdHint: 'Blue center facing you, White edge on top' },
  L: { short: 'L · Left', colorName: 'Orange', holdHint: 'Orange center facing you, White edge on top' },
  D: { short: 'D · Bottom', colorName: 'Yellow', holdHint: 'Yellow center facing you, Green edge on top' },
};

const BRUSH_HEX: Record<Face, string> = {
  U: '#f8fafc',
  D: '#facc15',
  F: '#22c55e',
  B: '#3b82f6',
  R: '#ef4444',
  L: '#f97316',
};

const SAMPLE_SCRAMBLE = ['R', 'U', "R'", 'F', "D'", 'L', 'U2', "F'", 'R'];

export class HelpCubeManager {
  private container: HTMLElement;
  private callbacks: HelpCubeCallbacks;

  private net: FaceStickersNet;
  private capturedFaces: Set<Face> = new Set();
  private capturedRgbByFace: Partial<Record<Face, RgbColor[]>> = {};

  private inputMode: 'upload' | 'webcam' = 'upload';
  private activeBrush: Face = 'U';
  private activeScanFace: Face = 'U';

  // Webcam state
  private cameraConsentGranted: boolean = false;
  private mediaStream: MediaStream | null = null;
  private webcamError: string = '';
  private mirrorWebcam: boolean = true;
  private autoScanEnabled: boolean = true;
  private stepAutoAdvance: boolean = false;
  private rafId: number | null = null;
  private stableKey: string = '';
  private stableSince: number = 0;
  private liveSampled: Face[] = Array(9).fill('U');
  private lastSampleTime: number = 0;

  // Solver & 3D playback state
  private solveResult: SolveResult = {
    solvable: true,
    alreadySolved: true,
    diagnostics: [],
    stages: [],
    moves: [],
  };
  private scene3d: RubiksCubeScene | null = null;
  private currentStepIndex: number = 0; // 0 = initial scanned state
  private isPlaying: boolean = false;
  private playTimer: number | null = null;
  private playbackSpeedMs: number = 650;
  private isGuideExpanded: boolean = true;

  // DOM refs
  private videoEl: HTMLVideoElement | null = null;
  private previewViewportEl: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: HelpCubeCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.net = this.buildSampleScrambledNet();
    FACE_ORDER.forEach((f) => this.capturedFaces.add(f));

    this.render();
    this.recomputeSolution(true);
  }

  private buildSampleScrambledNet(): FaceStickersNet {
    const cube = new CubeState(3);
    for (const m of SAMPLE_SCRAMBLE) {
      const turn = resolveTurn(m, undefined, 3);
      cube.applyTurn(turn.axis, turn.layers, turn.angle);
    }
    return extractFaceNet(cube);
  }

  public setActive(isActive: boolean): void {
    if (!isActive) {
      this.pausePlayback();
      this.stopWebcam();
    } else if (this.scene3d) {
      window.dispatchEvent(new Event('resize'));
    }
  }

  public setColorScheme(scheme: ColorSchemeId): void {
    this.scene3d?.setColorScheme(scheme);
  }

  public setCameraSensitivity(speed: number): void {
    this.scene3d?.setRotateSpeed(speed);
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="help-cube-shell">
        <header class="help-cube-hero">
          <div class="help-hero-copy">
            <span class="help-kicker">Physical 3x3 Scanner & Visual Solver</span>
            <h2>Help with Cube</h2>
            <p>Upload photos of all 6 sides or scan live with your camera (with your consent), preview your exact physical cube in 3D, and follow the step-by-step guide with move GIFs.</p>
          </div>
          <div class="help-preset-actions">
            <button type="button" class="btn btn-sm btn-secondary" id="help-btn-sample">Load Sample Cube</button>
            <button type="button" class="btn btn-sm btn-secondary" id="help-btn-from-trainer">Use Current 3x3</button>
            <button type="button" class="btn btn-sm btn-secondary" id="help-btn-reset-solved">Reset Solved</button>
          </div>
        </header>

        <div class="help-cube-grid">
          <!-- LEFT COLUMN: Capture (Upload / Webcam) + Editable 2D Net -->
          <section class="help-card help-scanner-card">
            <div class="help-mode-tabs" role="tablist" aria-label="Physical Cube Input Mode">
              <button type="button" class="help-mode-tab ${this.inputMode === 'upload' ? 'is-active' : ''}" data-help-mode="upload">
                Upload 6 Sides
              </button>
              <button type="button" class="help-mode-tab ${this.inputMode === 'webcam' ? 'is-active' : ''}" data-help-mode="webcam">
                Live Webcam Scanner
              </button>
            </div>

            <div id="help-upload-pane" class="help-input-pane ${this.inputMode === 'upload' ? 'is-active' : ''}">
              <p class="help-subnote">
                Keep <strong>White on Top</strong> and <strong>Green in Front</strong> as your reference. Upload a clear square-ish photo for each face — colors auto-calibrate from your 6 centers.
              </p>
              <div class="help-upload-grid" id="help-upload-grid"></div>
            </div>

            <div id="help-webcam-pane" class="help-input-pane ${this.inputMode === 'webcam' ? 'is-active' : ''}">
              <div class="help-latency-disclaimer" role="note">
                <p style="margin: 0;"><strong>Note for Speedcubers:</strong> Browser webcam color tracking runs frame-by-frame and has noticeable latency during fast turns. For real-time, zero-latency turn capture while solving, use a <strong>Bluetooth Smart Cube</strong> on the main solving page instead.</p>
                <button type="button" class="btn btn-xs btn-secondary" id="help-btn-goto-smartcube">Connect Smart Cube on Puzzle Page</button>
              </div>
              <div id="help-webcam-stage"></div>
            </div>

            <div class="help-net-section">
              <div class="help-net-header">
                <div>
                  <h3>2D Cube Net (Tap to Fix Stickers)</h3>
                  <p class="help-subnote">Pick a color brush below, then click any sticker (except centers) if lighting caused a misread.</p>
                </div>
                <span class="help-scan-count" id="help-scan-count">6 / 6 sides</span>
              </div>

              <div class="help-brush-bar" role="group" aria-label="Sticker Color Brush">
                ${FACE_ORDER.map(
                  (f) => `
                  <button type="button" class="help-brush-btn ${this.activeBrush === f ? 'is-active' : ''}" data-brush-face="${f}" title="${FACE_LABELS[f].colorName} (${f})">
                    <span class="brush-swatch" style="background:${BRUSH_HEX[f]}"></span>
                    <span>${FACE_LABELS[f].colorName}</span>
                  </button>
                `
                ).join('')}
              </div>

              <div class="help-net-layout" id="help-net-layout"></div>

              <div id="help-diagnostics" class="help-diagnostics"></div>
            </div>
          </section>

          <!-- RIGHT COLUMN: 3D Render + Collapsible Solving Guide + Move GIFs -->
          <section class="help-card help-solver-card">
            <div class="help-orientation-banner">
              <span>Hold your physical cube: <strong>White on Top (U)</strong> · <strong>Green in Front (F)</strong></span>
              <div class="help-transfer-actions">
                <button type="button" class="btn btn-xs btn-secondary" id="help-btn-copy-solution">Copy Moves</button>
                <button type="button" class="btn btn-xs btn-primary" id="help-btn-open-trainer">Open in 3x3 Trainer</button>
              </div>
            </div>

            <div class="help-3d-viewport-wrap">
              <div id="help-3d-viewport" class="help-3d-viewport"></div>
              <div class="help-playback-bar">
                <div class="help-playback-buttons">
                  <button type="button" class="btn btn-sm btn-secondary" id="help-step-reset" title="Reset to Scanned State">Reset</button>
                  <button type="button" class="btn btn-sm btn-secondary" id="help-step-prev" title="Previous Move">Prev</button>
                  <button type="button" class="btn btn-sm btn-primary" id="help-step-play" title="Play / Pause Solution">Play</button>
                  <button type="button" class="btn btn-sm btn-secondary" id="help-step-next" title="Next Move">Next</button>
                </div>
                <div class="help-playback-meta">
                  <span id="help-step-progress">Step 0 / 0</span>
                  <div class="help-speed-group" role="group" aria-label="Playback Speed">
                    <button type="button" class="btn btn-xs ${this.playbackSpeedMs === 1100 ? 'btn-primary' : 'btn-secondary'}" data-help-speed="1100">0.5x</button>
                    <button type="button" class="btn btn-xs ${this.playbackSpeedMs === 650 ? 'btn-primary' : 'btn-secondary'}" data-help-speed="650">1x</button>
                    <button type="button" class="btn btn-xs ${this.playbackSpeedMs === 320 ? 'btn-primary' : 'btn-secondary'}" data-help-speed="320">2x</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Collapsible Solving Guide Dropdown -->
            <div class="help-guide-dropdown">
              <button
                type="button"
                id="help-guide-toggle"
                class="help-guide-toggle"
                aria-expanded="${this.isGuideExpanded ? 'true' : 'false'}"
                aria-controls="help-guide-body"
              >
                <div class="help-guide-toggle-title">
                  <span>Solving Guide & Move GIFs</span>
                  <span class="help-guide-badge" id="help-guide-badge">Ready</span>
                </div>
                <svg class="guide-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <div id="help-guide-body" class="help-guide-body ${this.isGuideExpanded ? 'is-open' : ''}">
                <div id="help-active-gif-card" class="help-active-gif-card"></div>
                <div id="help-stages-list" class="help-stages-list"></div>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;

    this.previewViewportEl = this.container.querySelector('#help-3d-viewport');
    this.init3DScene();
    this.bindStaticListeners();
    this.renderUploadGrid();
    this.renderWebcamStage();
    this.render2DNet();
  }

  private init3DScene(): void {
    if (!this.previewViewportEl) return;
    const cubeState = createCubeStateFromFaceNet(this.net);
    if (this.scene3d) {
      this.scene3d.setCubeState(cubeState);
      return;
    }
    this.scene3d = new RubiksCubeScene(this.previewViewportEl, cubeState, {
      enableSound: true,
    });
    this.scene3d.setColorScheme(this.callbacks.getColorScheme());
    this.scene3d.setRotateSpeed(this.callbacks.getCameraSensitivity());
    this.scene3d.setSpeed(Math.min(350, Math.round(this.playbackSpeedMs * 0.55)));
  }

  private bindStaticListeners(): void {
    this.container.querySelectorAll<HTMLButtonElement>('[data-help-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.helpMode as 'upload' | 'webcam';
        if (!mode || mode === this.inputMode) return;
        this.inputMode = mode;
        this.container.querySelectorAll('[data-help-mode]').forEach((b) => {
          b.classList.toggle('is-active', (b as HTMLElement).dataset.helpMode === mode);
        });
        this.container.querySelector('#help-upload-pane')?.classList.toggle('is-active', mode === 'upload');
        this.container.querySelector('#help-webcam-pane')?.classList.toggle('is-active', mode === 'webcam');
        if (mode === 'upload') {
          this.stopWebcam();
        } else {
          this.renderWebcamStage();
        }
      });
    });

    this.container.querySelector('#help-btn-sample')?.addEventListener('click', () => {
      this.net = this.buildSampleScrambledNet();
      this.capturedRgbByFace = {};
      FACE_ORDER.forEach((f) => this.capturedFaces.add(f));
      this.renderUploadGrid();
      this.render2DNet();
      this.recomputeSolution(true);
      toast.show('Loaded sample scrambled 3x3 cube.');
    });

    this.container.querySelector('#help-btn-from-trainer')?.addEventListener('click', () => {
      const trainerCube = this.callbacks.getCurrentTrainerCube();
      if (!trainerCube || trainerCube.size !== 3) {
        toast.show('Switch the main Puzzle Trainer to 3x3 to import its state.');
        return;
      }
      this.net = extractFaceNet(trainerCube);
      this.capturedRgbByFace = {};
      FACE_ORDER.forEach((f) => this.capturedFaces.add(f));
      this.renderUploadGrid();
      this.render2DNet();
      this.recomputeSolution(true);
      toast.show('Imported current 3x3 Trainer state.');
    });

    this.container.querySelector('#help-btn-reset-solved')?.addEventListener('click', () => {
      this.net = createSolvedFaceNet();
      this.capturedRgbByFace = {};
      FACE_ORDER.forEach((f) => this.capturedFaces.add(f));
      this.renderUploadGrid();
      this.render2DNet();
      this.recomputeSolution(true);
    });

    this.container.querySelector('#help-btn-goto-smartcube')?.addEventListener('click', () => {
      this.stopWebcam();
      this.callbacks.onGoToSmartCube();
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-brush-face]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.brushFace as Face;
        if (!f) return;
        this.activeBrush = f;
        this.container.querySelectorAll('[data-brush-face]').forEach((b) => {
          b.classList.toggle('is-active', (b as HTMLElement).dataset.brushFace === f);
        });
      });
    });

    this.container.querySelector('#help-guide-toggle')?.addEventListener('click', () => {
      this.isGuideExpanded = !this.isGuideExpanded;
      const toggle = this.container.querySelector('#help-guide-toggle');
      const body = this.container.querySelector('#help-guide-body');
      toggle?.setAttribute('aria-expanded', String(this.isGuideExpanded));
      body?.classList.toggle('is-open', this.isGuideExpanded);
    });

    this.container.querySelector('#help-step-reset')?.addEventListener('click', () => {
      this.jumpToStep(0);
    });
    this.container.querySelector('#help-step-prev')?.addEventListener('click', () => {
      this.pausePlayback();
      this.stepPrev();
    });
    this.container.querySelector('#help-step-next')?.addEventListener('click', () => {
      this.pausePlayback();
      this.stepNext();
    });
    this.container.querySelector('#help-step-play')?.addEventListener('click', () => {
      if (this.isPlaying) {
        this.pausePlayback();
      } else {
        this.startPlayback();
      }
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-help-speed]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ms = Number(btn.dataset.helpSpeed);
        if (!ms) return;
        this.playbackSpeedMs = ms;
        this.scene3d?.setSpeed(Math.min(350, Math.round(ms * 0.55)));
        this.container.querySelectorAll<HTMLButtonElement>('[data-help-speed]').forEach((b) => {
          const active = Number(b.dataset.helpSpeed) === ms;
          b.classList.toggle('btn-primary', active);
          b.classList.toggle('btn-secondary', !active);
        });
        if (this.isPlaying) {
          this.pausePlayback();
          this.startPlayback();
        }
      });
    });

    this.container.querySelector('#help-btn-copy-solution')?.addEventListener('click', async () => {
      if (!this.solveResult.solvable || this.solveResult.moves.length === 0) {
        toast.show('No solution moves to copy yet.');
        return;
      }
      try {
        await navigator.clipboard.writeText(this.solveResult.moves.join(' '));
        toast.show(`Copied ${this.solveResult.moves.length} moves to clipboard.`);
      } catch {
        toast.show(this.solveResult.moves.join(' '));
      }
    });

    this.container.querySelector('#help-btn-open-trainer')?.addEventListener('click', () => {
      const check = validateFaceNet(this.net);
      if (!check.valid) {
        toast.show('Fix sticker validation warnings before opening in Trainer.');
        return;
      }
      const state = createCubeStateFromFaceNet(this.net);
      this.callbacks.onOpenInTrainer(state);
    });
  }

  private renderUploadGrid(): void {
    const grid = this.container.querySelector('#help-upload-grid');
    if (!grid) return;

    grid.innerHTML = FACE_ORDER.map((face) => {
      const meta = FACE_LABELS[face];
      const hasFace = this.capturedFaces.has(face);
      const miniCells = this.net[face]
        .map((c) => `<span class="mini-sticker" style="background:${BRUSH_HEX[c]}"></span>`)
        .join('');

      return `
        <label class="help-upload-slot ${hasFace ? 'is-captured' : ''}" data-upload-face="${face}">
          <input type="file" accept="image/*" class="help-file-input" data-file-face="${face}" />
          <div class="upload-slot-top">
            <span class="upload-face-badge" style="border-left: 3px solid ${BRUSH_HEX[face]}">${meta.short}</span>
            <span class="upload-color-tag">${meta.colorName} Center</span>
          </div>
          <div class="upload-slot-body">
            <div class="upload-mini-grid">${miniCells}</div>
            <span class="upload-slot-cta">${hasFace ? 'Replace Photo' : 'Upload Photo'}</span>
          </div>
          <span class="upload-slot-hint">${meta.holdHint}</span>
        </label>
      `;
    }).join('');

    grid.querySelectorAll<HTMLInputElement>('[data-file-face]').forEach((input) => {
      input.addEventListener('change', () => {
        const face = input.dataset.fileFace as Face;
        const file = input.files?.[0];
        if (!face || !file) return;
        this.handleImageUpload(face, file);
      });
    });
  }

  private handleImageUpload(face: Face, file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cellsRgb = sampleRgbFromMediaSource(
          img,
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          0.72,
          false
        );
        this.applyCapturedFaceSample(face, cellsRgb);
        toast.show(`Scanned ${FACE_LABELS[face].colorName} (${face}) face from photo.`);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  private applyCapturedFaceSample(face: Face, cellsRgb: RgbColor[]): void {
    this.capturedRgbByFace[face] = cellsRgb;
    this.capturedFaces.add(face);

    // Build center anchors from whatever faces have been RGB-sampled so far
    const anchors: Partial<Record<Face, RgbColor>> = {};
    FACE_ORDER.forEach((f) => {
      const c = this.capturedRgbByFace[f];
      if (c && c.length === 9) anchors[f] = c[4];
    });

    if (Object.keys(anchors).length >= 2) {
      const reclass = reclassifyAllFacesWithCenters(this.capturedRgbByFace);
      FACE_ORDER.forEach((f) => {
        if (reclass[f]) this.net[f] = reclass[f]!;
      });
    } else {
      this.net[face] = cellsRgb.map((rgb, i) => (i === 4 ? face : classifyRgbColor(rgb)));
    }

    this.renderUploadGrid();
    this.render2DNet();
    this.recomputeSolution(true);
  }

  private renderWebcamStage(): void {
    const stage = this.container.querySelector('#help-webcam-stage');
    if (!stage) return;

    if (!this.cameraConsentGranted) {
      stage.innerHTML = `
        <div class="help-consent-box">
          <h4>Camera Permission & Privacy Consent</h4>
          <p>
            EiCube processes webcam video frames <strong>100% locally inside your browser</strong> to sample sticker colors. No camera images or video are ever uploaded or stored.
          </p>
          ${this.webcamError ? `<p class="help-error-inline">${this.webcamError}</p>` : ''}
          <div class="help-consent-actions">
            <button type="button" class="btn btn-sm btn-primary" id="help-btn-allow-camera">Allow Camera & Start Scanner</button>
          </div>
        </div>
      `;
      stage.querySelector('#help-btn-allow-camera')?.addEventListener('click', () => {
        this.requestAndStartWebcam();
      });
      return;
    }

    stage.innerHTML = `
      <div class="help-webcam-live">
        <div class="webcam-face-pills" role="group" aria-label="Target Face to Capture">
          ${FACE_ORDER.map(
            (f) => `
            <button type="button" class="btn btn-xs ${this.activeScanFace === f ? 'btn-primary' : 'btn-secondary'}" data-scan-face="${f}">
              <span class="pill-dot" style="background:${BRUSH_HEX[f]}"></span>
              ${f}
            </button>
          `
          ).join('')}
        </div>

        <p class="help-subnote" id="help-scan-instruction">
          Align <strong>${FACE_LABELS[this.activeScanFace].colorName} (${this.activeScanFace})</strong> inside the square: ${FACE_LABELS[this.activeScanFace].holdHint}.
        </p>

        <div class="webcam-viewport-box">
          <video id="help-webcam-video" autoplay playsinline muted class="${this.mirrorWebcam ? 'is-mirrored' : ''}"></video>
          <div class="webcam-reticle" aria-hidden="true">
            <div class="reticle-grid" id="help-reticle-grid">
              ${Array.from({ length: 9 })
                .map((_, idx) => `<div class="reticle-cell" data-reticle-idx="${idx}"><span class="reticle-dot"></span></div>`)
                .join('')}
            </div>
          </div>
          <div class="webcam-stability-badge" id="help-stability-badge">Align 3x3 face</div>
        </div>

        <div class="webcam-controls-row">
          <button type="button" class="btn btn-sm btn-primary" id="help-btn-capture-face">Capture ${this.activeScanFace} Face</button>
          <button type="button" class="btn btn-sm btn-secondary" id="help-btn-stop-camera">Stop Camera</button>
          <label class="webcam-toggle-label">
            <input type="checkbox" id="help-chk-autoscan" ${this.autoScanEnabled ? 'checked' : ''} />
            <span>Auto-Scan</span>
          </label>
          <label class="webcam-toggle-label">
            <input type="checkbox" id="help-chk-mirror" ${this.mirrorWebcam ? 'checked' : ''} />
            <span>Mirror</span>
          </label>
          <label class="webcam-toggle-label" title="Auto-advance guide step when camera sees the expected next front face">
            <input type="checkbox" id="help-chk-step-advance" ${this.stepAutoAdvance ? 'checked' : ''} />
            <span>Step Auto-Advance</span>
          </label>
        </div>
      </div>
    `;

    this.videoEl = stage.querySelector('#help-webcam-video');
    if (this.videoEl && this.mediaStream) {
      this.videoEl.srcObject = this.mediaStream;
    }

    stage.querySelectorAll<HTMLButtonElement>('[data-scan-face]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.scanFace as Face;
        if (!f) return;
        this.activeScanFace = f;
        this.stableKey = '';
        this.renderWebcamStage();
      });
    });

    stage.querySelector('#help-btn-capture-face')?.addEventListener('click', () => {
      this.captureCurrentWebcamFrame(true);
    });

    stage.querySelector('#help-btn-stop-camera')?.addEventListener('click', () => {
      this.stopWebcam();
      this.cameraConsentGranted = false;
      this.renderWebcamStage();
    });

    stage.querySelector<HTMLInputElement>('#help-chk-autoscan')?.addEventListener('change', (e) => {
      this.autoScanEnabled = (e.target as HTMLInputElement).checked;
      this.stableKey = '';
    });

    stage.querySelector<HTMLInputElement>('#help-chk-mirror')?.addEventListener('change', (e) => {
      this.mirrorWebcam = (e.target as HTMLInputElement).checked;
      this.videoEl?.classList.toggle('is-mirrored', this.mirrorWebcam);
    });

    stage.querySelector<HTMLInputElement>('#help-chk-step-advance')?.addEventListener('change', (e) => {
      this.stepAutoAdvance = (e.target as HTMLInputElement).checked;
    });
  }

  private async requestAndStartWebcam(): Promise<void> {
    this.webcamError = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.webcamError = 'Webcam capture is not supported in this browser or context (requires HTTPS/localhost).';
      this.renderWebcamStage();
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      this.cameraConsentGranted = true;
      this.renderWebcamStage();
      this.startWebcamLoop();
      toast.show('Camera scanner active.');
    } catch (err) {
      this.cameraConsentGranted = false;
      this.webcamError = `Camera access denied or unavailable (${(err as Error)?.message || 'permission rejected'}).`;
      this.renderWebcamStage();
    }
  }

  private stopWebcam(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.videoEl = null;
  }

  private startWebcamLoop(): void {
    const tick = (now: number) => {
      if (!this.mediaStream || !this.videoEl) return;

      if (this.videoEl.readyState >= 2 && now - this.lastSampleTime > 120) {
        this.lastSampleTime = now;
        const w = this.videoEl.videoWidth || 640;
        const h = this.videoEl.videoHeight || 480;
        const cellsRgb = sampleRgbFromMediaSource(this.videoEl, w, h, 0.72, this.mirrorWebcam);

        const anchors: Partial<Record<Face, RgbColor>> = {};
        FACE_ORDER.forEach((f) => {
          const c = this.capturedRgbByFace[f];
          if (c && c.length === 9) anchors[f] = c[4];
        });

        this.liveSampled = cellsRgb.map((rgb) =>
          classifyRgbColor(rgb, Object.keys(anchors).length >= 2 ? anchors : undefined)
        );
        this.updateReticleDots(this.liveSampled);

        // Live Step Auto-Advance when following guide
        if (this.stepAutoAdvance && this.solveResult.solvable && this.currentStepIndex < this.solveResult.moves.length) {
          this.checkLiveStepAdvance();
        } else if (this.autoScanEnabled) {
          const key = this.liveSampled.join('');
          const badge = this.container.querySelector('#help-stability-badge');
          if (this.liveSampled[4] === this.activeScanFace && key === this.stableKey) {
            const elapsed = now - this.stableSince;
            if (badge) badge.textContent = `Hold steady... ${Math.min(100, Math.round((elapsed / 650) * 100))}%`;
            if (elapsed >= 650) {
              this.stableKey = '';
              this.applyCapturedFaceSample(this.activeScanFace, cellsRgb);
              toast.show(`Auto-captured ${FACE_LABELS[this.activeScanFace].colorName} (${this.activeScanFace})!`);
              const nextIdx = (FACE_ORDER.indexOf(this.activeScanFace) + 1) % FACE_ORDER.length;
              this.activeScanFace = FACE_ORDER[nextIdx];
              this.renderWebcamStage();
              return;
            }
          } else {
            this.stableKey = key;
            this.stableSince = now;
            if (badge) {
              badge.textContent =
                this.liveSampled[4] === this.activeScanFace
                  ? `Detected ${this.activeScanFace} center — hold steady`
                  : `Show ${FACE_LABELS[this.activeScanFace].colorName} center`;
            }
          }
        }
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private captureCurrentWebcamFrame(advanceFace: boolean): void {
    if (!this.videoEl || this.videoEl.readyState < 2) {
      toast.show('Camera feed is still warming up.');
      return;
    }
    const w = this.videoEl.videoWidth || 640;
    const h = this.videoEl.videoHeight || 480;
    const cellsRgb = sampleRgbFromMediaSource(this.videoEl, w, h, 0.72, this.mirrorWebcam);
    this.applyCapturedFaceSample(this.activeScanFace, cellsRgb);
    toast.show(`Captured ${FACE_LABELS[this.activeScanFace].colorName} (${this.activeScanFace}).`);
    if (advanceFace) {
      const nextIdx = (FACE_ORDER.indexOf(this.activeScanFace) + 1) % FACE_ORDER.length;
      this.activeScanFace = FACE_ORDER[nextIdx];
      this.renderWebcamStage();
    }
  }

  private checkLiveStepAdvance(): void {
    const nextIdx = this.currentStepIndex + 1;
    if (nextIdx > this.solveResult.moves.length) return;
    const expectedCube = createCubeStateFromFaceNet(this.net);
    for (let i = 0; i < nextIdx; i++) {
      const turn = resolveTurn(this.solveResult.moves[i], undefined, 3);
      expectedCube.applyTurn(turn.axis, turn.layers, turn.angle);
    }
    const expectedFront = extractFaceNet(expectedCube).F;
    if (expectedFront.join('') === this.liveSampled.join('')) {
      this.stepNext();
      toast.show(`Move detected! Advanced to step ${nextIdx}.`);
    }
  }

  private updateReticleDots(cells: Face[]): void {
    const dots = this.container.querySelectorAll<HTMLElement>('.reticle-cell');
    dots.forEach((cell, idx) => {
      const f = cells[idx] || 'U';
      const dot = cell.querySelector<HTMLElement>('.reticle-dot');
      if (dot) dot.style.background = BRUSH_HEX[f];
    });
  }

  private render2DNet(): void {
    const netContainer = this.container.querySelector('#help-net-layout');
    const countEl = this.container.querySelector('#help-scan-count');
    if (countEl) {
      countEl.textContent = `${this.capturedFaces.size} / 6 sides`;
    }
    if (!netContainer) return;

    const renderFaceNet = (face: Face, areaClass: string) => {
      const cells = this.net[face]
        .map((c, idx) => {
          const isCenter = idx === 4;
          return `
            <button
              type="button"
              class="net-sticker ${isCenter ? 'is-center' : ''}"
              style="background:${BRUSH_HEX[c]}"
              data-net-face="${face}"
              data-net-idx="${idx}"
              title="${isCenter ? `${FACE_LABELS[face].colorName} center (fixed)` : `Click to set ${FACE_LABELS[this.activeBrush].colorName}`}"
              ${isCenter ? 'disabled' : ''}
            >${isCenter ? face : ''}</button>
          `;
        })
        .join('');

      return `
        <div class="help-net-face ${areaClass}">
          <span class="net-face-label">${face}</span>
          <div class="net-face-grid">${cells}</div>
        </div>
      `;
    };

    netContainer.innerHTML = `
      <div class="help-net-cross">
        ${renderFaceNet('U', 'area-u')}
        ${renderFaceNet('L', 'area-l')}
        ${renderFaceNet('F', 'area-f')}
        ${renderFaceNet('R', 'area-r')}
        ${renderFaceNet('B', 'area-b')}
        ${renderFaceNet('D', 'area-d')}
      </div>
    `;

    netContainer.querySelectorAll<HTMLButtonElement>('[data-net-face]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const face = btn.dataset.netFace as Face;
        const idx = Number(btn.dataset.netIdx);
        if (!face || Number.isNaN(idx) || idx === 4) return;
        this.net[face][idx] = this.activeBrush;
        this.capturedFaces.add(face);
        this.render2DNet();
        this.renderUploadGrid();
        this.recomputeSolution(true);
      });
    });
  }

  private recomputeSolution(resetStep: boolean): void {
    this.pausePlayback();
    this.solveResult = solveCube3x3(this.net);
    if (resetStep) {
      this.currentStepIndex = 0;
    }

    const diagEl = this.container.querySelector('#help-diagnostics');
    if (diagEl) {
      if (!this.solveResult.solvable) {
        diagEl.innerHTML = this.solveResult.diagnostics
          .map((d) => `<div class="diag-pill is-error">${d}</div>`)
          .join('');
      } else if (this.solveResult.alreadySolved) {
        diagEl.innerHTML = `<div class="diag-pill is-ok">Cube is already solved! Load a scramble or scan a scrambled cube to see the guide.</div>`;
      } else {
        diagEl.innerHTML = `<div class="diag-pill is-ok">Valid 3x3 cube verified — ready in <strong>${this.solveResult.moves.length} moves</strong> (${this.solveResult.stages.length} steps).</div>`;
      }
    }

    if (this.solveResult.solvable) {
      const state = createCubeStateFromFaceNet(this.net);
      for (let i = 0; i < this.currentStepIndex; i++) {
        const t = resolveTurn(this.solveResult.moves[i], undefined, 3);
        state.applyTurn(t.axis, t.layers, t.angle);
      }
      this.scene3d?.setCubeState(state);
    }

    this.renderGuideAndGif();
    this.updatePlaybackDisplay();
  }

  private renderGuideAndGif(): void {
    const badgeEl = this.container.querySelector('#help-guide-badge');
    const gifCardEl = this.container.querySelector('#help-active-gif-card');
    const stagesEl = this.container.querySelector('#help-stages-list');

    if (badgeEl) {
      if (!this.solveResult.solvable) {
        badgeEl.textContent = 'Check stickers';
      } else if (this.solveResult.alreadySolved) {
        badgeEl.textContent = 'Solved';
      } else {
        badgeEl.textContent = `${this.solveResult.moves.length} moves · ${this.solveResult.stages.length} steps`;
      }
    }

    if (!gifCardEl || !stagesEl) return;

    if (!this.solveResult.solvable) {
      gifCardEl.innerHTML = `<div class="gif-empty-note">Fix the sticker diagnostics on the 2D net to generate the 3D solving guide and move GIFs.</div>`;
      stagesEl.innerHTML = '';
      return;
    }

    if (this.solveResult.alreadySolved) {
      gifCardEl.innerHTML = `<div class="gif-empty-note">Your cube is already solved. Try <strong>Load Sample Cube</strong> or scan a scrambled 3x3 to preview turn GIFs!</div>`;
      stagesEl.innerHTML = '';
      return;
    }

    const activeIdx = Math.min(this.currentStepIndex, this.solveResult.moves.length - 1);
    const activeMove = this.solveResult.moves[activeIdx];
    const gifMeta = getMoveGifMeta(activeMove);
    const isCompleted = this.currentStepIndex >= this.solveResult.moves.length;

    gifCardEl.innerHTML = `
      <div class="help-gif-spotlight">
        ${
          gifMeta
            ? `
          <div class="gif-thumb-box">
            <img src="${gifMeta.gifPath}" alt="3D animated ${gifMeta.notation} move" loading="eager" />
            ${gifMeta.repeatCount === 2 ? `<span class="gif-repeat-badge">2x</span>` : ''}
          </div>
        `
            : ''
        }
        <div class="gif-spotlight-info">
          <div class="gif-spotlight-kicker">${isCompleted ? 'Solve Complete' : `Next Move (#${activeIdx + 1} of ${this.solveResult.moves.length})`}</div>
          <div class="gif-spotlight-notation">${isCompleted ? 'Solved!' : activeMove}</div>
          <p class="gif-spotlight-desc">
            ${
              isCompleted
                ? 'Every stage is complete. Click Reset to replay from your scanned cube.'
                : gifMeta?.description ?? 'Execute this turn while keeping White on Top and Green in Front.'
            }
          </p>
        </div>
      </div>
    `;

    let globalMoveOffset = 0;
    stagesEl.innerHTML = this.solveResult.stages
      .map((stage) => {
        const startOffset = globalMoveOffset;
        const chipsHtml = stage.moves
          .map((mv, localIdx) => {
            const absIdx = startOffset + localIdx;
            const isDone = absIdx < this.currentStepIndex;
            const isCurrent = absIdx === this.currentStepIndex;
            return `<button type="button" class="help-move-chip ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}" data-move-step="${absIdx + 1}">${mv}</button>`;
          })
          .join('');
        globalMoveOffset += stage.moves.length;

        const isStageActive =
          this.currentStepIndex >= startOffset && this.currentStepIndex < globalMoveOffset;

        return `
          <div class="help-stage-item ${isStageActive ? 'is-active' : ''}">
            <div class="help-stage-head">
              <strong>${stage.title}</strong>
              <span>${stage.moves.length} moves</span>
            </div>
            <p class="help-stage-hint">${stage.hint}</p>
            <div class="help-stage-moves">${chipsHtml}</div>
          </div>
        `;
      })
      .join('');

    stagesEl.querySelectorAll<HTMLButtonElement>('[data-move-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = Number(btn.dataset.moveStep);
        if (!Number.isNaN(target)) {
          this.pausePlayback();
          this.jumpToStep(target);
        }
      });
    });
  }

  private updatePlaybackDisplay(): void {
    const progressEl = this.container.querySelector('#help-step-progress');
    const playBtn = this.container.querySelector('#help-step-play');
    const total = this.solveResult.moves.length;
    if (progressEl) {
      progressEl.textContent = `Step ${this.currentStepIndex} / ${total}`;
    }
    if (playBtn) {
      playBtn.textContent = this.isPlaying ? 'Pause' : 'Play';
    }
  }

  private jumpToStep(stepIndex: number): void {
    if (!this.solveResult.solvable) return;
    const clamped = Math.max(0, Math.min(this.solveResult.moves.length, stepIndex));
    this.currentStepIndex = clamped;

    const state = createCubeStateFromFaceNet(this.net);
    for (let i = 0; i < clamped; i++) {
      const t = resolveTurn(this.solveResult.moves[i], undefined, 3);
      state.applyTurn(t.axis, t.layers, t.angle);
    }
    this.scene3d?.setCubeState(state);
    this.renderGuideAndGif();
    this.updatePlaybackDisplay();
  }

  private stepNext(): void {
    if (!this.solveResult.solvable) return;
    if (this.currentStepIndex >= this.solveResult.moves.length) {
      this.pausePlayback();
      return;
    }
    const move = this.solveResult.moves[this.currentStepIndex];
    this.currentStepIndex++;
    this.scene3d?.executeMove(move, false, false);
    this.renderGuideAndGif();
    this.updatePlaybackDisplay();
  }

  private stepPrev(): void {
    if (!this.solveResult.solvable || this.currentStepIndex <= 0) return;
    this.jumpToStep(this.currentStepIndex - 1);
  }

  private startPlayback(): void {
    if (!this.solveResult.solvable || this.solveResult.moves.length === 0) return;
    if (this.currentStepIndex >= this.solveResult.moves.length) {
      this.jumpToStep(0);
    }
    this.isPlaying = true;
    this.updatePlaybackDisplay();
    this.stepNext();
    this.playTimer = window.setInterval(() => {
      if (this.currentStepIndex >= this.solveResult.moves.length) {
        this.pausePlayback();
        return;
      }
      this.stepNext();
    }, this.playbackSpeedMs);
  }

  private pausePlayback(): void {
    this.isPlaying = false;
    if (this.playTimer !== null) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    this.updatePlaybackDisplay();
  }
}
