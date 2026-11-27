import { CubeState } from '../cube/CubeState';
import { RubiksCubeScene } from '../render/RubiksCubeScene';
import { COLOR_SCHEMES, ColorSchemeId } from '../cube/types';
import { parseAlgorithm } from '../cube/notation';
import { TrainerPuzzleType } from './controls';
import { TabId } from './tabs';

export interface LandingPageCallbacks {
  onLaunchTrainer: (puzzle?: TrainerPuzzleType) => void;
  onNavigateTab: (tab: TabId) => void;
  initialSensitivity?: number;
}

const DEMO_SEQUENCES = [
  "R U R' U'",
  "F R U' R' F'",
  "M2 U M2 U2 M2 U M2",
];

/**
 * Renders the zero-login editorial Landing Page with a live interactive 3D showcase stage,
 * capabilities bento strip, and quick-launch puzzle cards.
 */
export class LandingPageManager {
  private container: HTMLElement;
  private callbacks: LandingPageCallbacks;
  private showcaseScene: RubiksCubeScene | null = null;
  private showcaseState: CubeState | null = null;
  private demoTimer: number | null = null;
  private isActive = true;
  private demoIndex = 0;

  constructor(container: HTMLElement, callbacks: LandingPageCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
    this.mountShowcase();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="landing-page">
        <!-- Hero Band -->
        <section class="landing-hero" aria-labelledby="landing-hero-title">
          <div class="landing-wrap landing-hero-grid">
            <div class="landing-hero-copy">
              <div class="landing-eyebrow">
                <span class="landing-eyebrow-dot" aria-hidden="true"></span>
                <span>ZERO-LOGIN 3D SPEEDSOLVING STUDIO // v1.0.3</span>
              </div>
              <h1 id="landing-hero-title" class="landing-title">
                Precision 3D cubing, straight from the browser.
              </h1>
              <p class="landing-lead">
                Practice 2x2, 3x3, 4x4, and Pyraminx with quaternion full-sphere camera rotation, WCA 15-second inspection, and OLL/PLL drills — no account required.
              </p>

              <div class="landing-hero-actions">
                <button type="button" class="btn btn-primary btn-landing-cta" id="btn-landing-start">
                  <span>Start Solving</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
                <a class="btn btn-secondary btn-landing-cta" href="./moves.html">
                  <span>Explore Move GIFs</span>
                </a>
              </div>

              <dl class="landing-meta-strip" aria-label="Studio specifications">
                <div class="landing-meta-item">
                  <dt>Puzzles</dt>
                  <dd>2x2, 3x3, 4x4, Pyraminx</dd>
                </div>
                <div class="landing-meta-item">
                  <dt>Camera</dt>
                  <dd>Full-Sphere X/Y/Z</dd>
                </div>
                <div class="landing-meta-item">
                  <dt>Timing</dt>
                  <dd>WCA + Ao5 / Ao12</dd>
                </div>
              </dl>
            </div>

            <div class="landing-hero-stage">
              <div class="landing-stage-frame">
                <div class="landing-stage-topbar">
                  <span class="landing-stage-badge">
                    <span class="landing-live-dot" aria-hidden="true"></span>
                    Interactive Stage • Drag in 3D
                  </span>
                  <div class="landing-stage-top-actions">
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-landing-demo-turn">Run Trigger</button>
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-landing-reset-view">Reset</button>
                  </div>
                </div>
                <div id="landing-cube-stage" class="landing-cube-canvas-host" aria-label="Interactive 3D Rubik's Cube showcase"></div>
                <div class="landing-stage-footer">
                  <span class="landing-stage-caption">Tumbling 3-axis quaternion orbit. Click and drag to inspect freely.</span>
                  <button type="button" class="landing-stage-link" id="btn-landing-open-trainer">Open Full Studio -></button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Capabilities Strip -->
        <section class="landing-section" aria-labelledby="landing-cap-title">
          <div class="landing-wrap">
            <div class="landing-section-head">
              <span class="landing-section-kicker">Architecture</span>
              <h2 id="landing-cap-title" class="landing-section-title">Built for uninterrupted fingertricks and spatial clarity.</h2>
            </div>

            <div class="landing-cap-grid">
              <article class="landing-cap-card">
                <div class="landing-cap-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"></circle>
                    <ellipse cx="12" cy="12" rx="9" ry="3.5"></ellipse>
                    <line x1="12" y1="3" x2="12" y2="21"></line>
                  </svg>
                </div>
                <h3>Full-Sphere X / Y / Z Orbit</h3>
                <p>Quaternion arcball tracks pitch, yaw, and screen-space roll without gimbal locks or awkward vertical stops.</p>
              </article>

              <article class="landing-cap-card">
                <div class="landing-cap-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="13" r="8"></circle>
                    <polyline points="12 9 12 13 15 15"></polyline>
                    <line x1="9" y1="2" x2="15" y2="2"></line>
                  </svg>
                </div>
                <h3>WCA Inspection & Session Stats</h3>
                <p>15-second audio countdown cues, +2 and DNF toggles, and persistent trimmed Ao5 / Ao12 tracking.</p>
              </article>

              <article class="landing-cap-card">
                <div class="landing-cap-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                    <polyline points="2 17 12 22 22 17"></polyline>
                    <polyline points="2 12 12 17 22 12"></polyline>
                  </svg>
                </div>
                <h3>OLL, PLL & Parity Drills</h3>
                <p>Automatically invert and scramble directly to any algorithm case so you drill recognition instead of repeating setups.</p>
              </article>

              <article class="landing-cap-card">
                <div class="landing-cap-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M7 7l10 10-5 5V2l5 5L7 17"></path>
                  </svg>
                </div>
                <h3>Custom Palettes & WebBLE</h3>
                <p>Switch classic black bezel, stickerless bright, or high-contrast finishes and pair Bluetooth smart cubes over GATT.</p>
              </article>
            </div>
          </div>
        </section>

        <!-- Quick Launch Puzzles -->
        <section class="landing-section landing-section-puzzles" aria-labelledby="landing-puzzles-title">
          <div class="landing-wrap">
            <div class="landing-section-head">
              <span class="landing-section-kicker">Puzzles</span>
              <h2 id="landing-puzzles-title" class="landing-section-title">Jump directly into a puzzle stage.</h2>
            </div>

            <div class="landing-puzzle-grid">
              <button type="button" class="landing-puzzle-card" data-launch-puzzle="3x3">
                <div class="landing-puzzle-meta">
                  <span class="landing-puzzle-tag">3x3x3</span>
                  <span class="landing-puzzle-arrow" aria-hidden="true">-&gt;</span>
                </div>
                <h3>Standard Speedcube</h3>
                <p>Full CFOP trainer with slice turns (M, E, S), wide turns, and 20-move scrambles.</p>
              </button>

              <button type="button" class="landing-puzzle-card" data-launch-puzzle="2x2">
                <div class="landing-puzzle-meta">
                  <span class="landing-puzzle-tag">2x2x2</span>
                  <span class="landing-puzzle-arrow" aria-hidden="true">-&gt;</span>
                </div>
                <h3>Pocket Cube</h3>
                <p>Rapid corner permutations tailored for Ortega OLL and PBL pattern drills.</p>
              </button>

              <button type="button" class="landing-puzzle-card" data-launch-puzzle="4x4">
                <div class="landing-puzzle-meta">
                  <span class="landing-puzzle-tag">4x4x4</span>
                  <span class="landing-puzzle-arrow" aria-hidden="true">-&gt;</span>
                </div>
                <h3>Rubiks Revenge</h3>
                <p>Includes inner slice planes (2R, 2L, M, E, S), wide turns, and 40-move center scrambles.</p>
              </button>

              <button type="button" class="landing-puzzle-card" data-launch-puzzle="pyraminx">
                <div class="landing-puzzle-meta">
                  <span class="landing-puzzle-tag">Tetrahedron</span>
                  <span class="landing-puzzle-arrow" aria-hidden="true">-&gt;</span>
                </div>
                <h3>Pyraminx</h3>
                <p>Full solid vertex and axial layer turns with zero-gap matte mesh geometry.</p>
              </button>
            </div>
          </div>
        </section>

        <!-- Minimal Editorial Footer -->
        <footer class="landing-footer">
          <div class="landing-wrap landing-footer-inner">
            <div class="landing-footer-brand">
              <strong>EiCube</strong>
              <span>Browser 3D Puzzle Trainer • Version 1.0.3</span>
            </div>
            <div class="landing-footer-links">
              <button type="button" class="btn-text-sm" id="btn-landing-footer-learn">Learn Puzzles</button>
              <a class="btn-text-sm" href="./moves.html">Move Glossary GIFs</a>
              <a class="btn-text-sm" href="https://github.com/eitophetamine9/EiCube" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
        </footer>
      </div>
    `;

    document.getElementById('btn-landing-start')?.addEventListener('click', () => {
      this.callbacks.onLaunchTrainer('3x3');
    });

    document.getElementById('btn-landing-open-trainer')?.addEventListener('click', () => {
      this.callbacks.onLaunchTrainer('3x3');
    });

    document.getElementById('btn-landing-footer-learn')?.addEventListener('click', () => {
      this.callbacks.onNavigateTab('learn');
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-launch-puzzle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const puzzle = btn.dataset.launchPuzzle as TrainerPuzzleType;
        if (puzzle) {
          this.callbacks.onLaunchTrainer(puzzle);
        }
      });
    });
  }

  private mountShowcase(): void {
    const stageHost = document.getElementById('landing-cube-stage');
    if (!stageHost) return;

    this.showcaseState = new CubeState(3);
    this.showcaseScene = new RubiksCubeScene(stageHost, this.showcaseState, {
      enableSound: false,
    });
    if (this.callbacks.initialSensitivity !== undefined) {
      this.showcaseScene.setRotateSpeed(this.callbacks.initialSensitivity);
    }

    document.getElementById('btn-landing-demo-turn')?.addEventListener('click', () => {
      if (!this.showcaseScene || this.showcaseScene.isBusy()) return;
      const seq = DEMO_SEQUENCES[this.demoIndex % DEMO_SEQUENCES.length];
      this.demoIndex += 1;
      const moves = parseAlgorithm(seq);
      if (moves.length > 0) {
        this.showcaseScene.executeAlgorithm(moves, false, false);
      }
    });

    document.getElementById('btn-landing-reset-view')?.addEventListener('click', () => {
      if (!this.showcaseScene) return;
      this.showcaseScene.resetCube();
      this.showcaseScene.resetCameraView();
    });

    // Gentle idle showcase turn only if user has not requested reduced motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) {
      this.demoTimer = window.setInterval(() => {
        if (!this.isActive || !this.showcaseScene || this.showcaseScene.isBusy()) return;
        // Subtle 2-move alternating trigger to keep showcase alive without scrambling unrecoverably
        const seq = this.demoIndex % 2 === 0 ? "R U R' U'" : "U R U' R'";
        this.demoIndex += 1;
        this.showcaseScene.executeAlgorithm(parseAlgorithm(seq), false, false);
      }, 6500);
    }
  }

  public setActive(active: boolean): void {
    this.isActive = active;
    if (active) {
      window.dispatchEvent(new Event('resize'));
    }
  }

  public setCameraSensitivity(sensitivity: number): void {
    this.showcaseScene?.setRotateSpeed(sensitivity);
  }

  public setColorScheme(scheme: ColorSchemeId): void {
    if (scheme in COLOR_SCHEMES) {
      this.showcaseScene?.setColorScheme(scheme);
    }
  }

  public destroy(): void {
    if (this.demoTimer !== null) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
    }
    this.showcaseScene?.dispose();
    this.showcaseScene = null;
  }
}
