import { OTHER_CUBES_GUIDES, PuzzleGuide } from '../content/otherCubesData';
import { RubiksCubeScene } from '../render/RubiksCubeScene';
import { PyraminxScene } from '../render/PyraminxScene';
import { CubeState } from '../cube/CubeState';
import { parseAlgorithm } from '../cube/notation';
import { generateScramble } from '../cube/scramble';
import { toast } from './toast';

export type OtherPuzzleType = '3x3' | '2x2' | '4x4' | 'pyraminx';

export class OtherCubesManager {
  private container: HTMLElement;
  private currentPuzzle: OtherPuzzleType = '3x3';
  private onSolveVersion?: (puzzle: OtherPuzzleType) => void;
  private cameraSensitivity: number = 2.0;

  // 3D Scenes
  private cubeScene: RubiksCubeScene | null = null;
  private pyraScene: PyraminxScene | null = null;
  private cubeState: CubeState;

  constructor(
    container: HTMLElement,
    callbacks?: {
      onSolveVersion?: (puzzle: OtherPuzzleType) => void;
      initialSensitivity?: number;
    }
  ) {
    this.container = container;
    this.onSolveVersion = callbacks?.onSolveVersion;
    if (typeof callbacks?.initialSensitivity === 'number') {
      this.cameraSensitivity = callbacks.initialSensitivity;
    }
    this.cubeState = new CubeState(3);
    this.render();
  }

  setCameraSensitivity(speed: number): void {
    this.cameraSensitivity = speed;
    this.cubeScene?.setRotateSpeed(speed);
    this.pyraScene?.setRotateSpeed(speed);
  }

  setPuzzle(puzzle: OtherPuzzleType): void {
    if (this.currentPuzzle === puzzle) return;
    this.currentPuzzle = puzzle;
    this.render();
  }

  private render(): void {
    const guide = OTHER_CUBES_GUIDES[this.currentPuzzle];

    this.container.innerHTML = `
      <div class="other-cubes-wrapper">
        <!-- Puzzle Selection Bar -->
        <div class="puzzle-selector-bar">
          <div class="selector-heading">
            <span class="selector-badge">Puzzles</span>
            <span class="selector-title">Select Puzzle:</span>
          </div>
          <div class="puzzle-tabs-group" role="tablist">
            <button class="btn-puzzle-tab ${this.currentPuzzle === '3x3' ? 'is-active' : ''}" data-puzzle="3x3">
              <span class="puzzle-tab-icon">3×3</span>
              <span>Rubik's Cube</span>
            </button>
            <button class="btn-puzzle-tab ${this.currentPuzzle === '2x2' ? 'is-active' : ''}" data-puzzle="2x2">
              <span class="puzzle-tab-icon">2×2</span>
              <span>Pocket Cube</span>
            </button>
            <button class="btn-puzzle-tab ${this.currentPuzzle === '4x4' ? 'is-active' : ''}" data-puzzle="4x4">
              <span class="puzzle-tab-icon">4×4</span>
              <span>Rubik's Revenge</span>
            </button>
            <button class="btn-puzzle-tab ${this.currentPuzzle === 'pyraminx' ? 'is-active' : ''}" data-puzzle="pyraminx">
              <span class="puzzle-tab-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polygon points="12 3 3 20 21 20"></polygon>
                </svg>
              </span>
              <span>Pyraminx</span>
            </button>
          </div>
        </div>

        <!-- 3D Interactive Playground for Selected Puzzle -->
        <div class="other-playground-card">
          <div class="playground-header">
            <div class="playground-title-group">
              <h2 class="playground-title">${guide.name}</h2>
              <span class="difficulty-pill ${guide.difficulty.toLowerCase()}">${guide.difficulty}</span>
            </div>
            <div class="playground-actions">
              <!-- Primary CTA: Solve this version -->
              <button id="btn-solve-this-version" class="btn btn-sm btn-solve-version" title="Load this puzzle into the main Puzzle Trainer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Solve this version
              </button>

              <button id="btn-other-scramble" class="btn btn-sm btn-scramble">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="16 3 21 3 21 8"></polyline>
                  <line x1="4" y1="20" x2="21" y2="3"></line>
                </svg>
                Scramble
              </button>
              <button id="btn-other-reset" class="btn btn-sm btn-secondary">Reset</button>
            </div>
          </div>

          <!-- Canvas Container -->
          <div class="other-canvas-viewport" id="other-canvas-viewport"></div>

          <!-- Quick Move Controls -->
          <div class="other-quick-moves" id="other-quick-moves">
            ${this.renderQuickMoveButtons()}
          </div>
        </div>

        <!-- Dedicated Solving Guide for Selected Puzzle -->
        <div class="other-guide-section">
          <div class="other-guide-header">
            <h3 class="other-guide-title">${guide.name} Step-by-Step Guide</h3>
            <p class="other-guide-desc">${guide.summary}</p>
          </div>

          <div class="other-steps-list">
            ${guide.steps.map((st, idx) => this.renderGuideStep(st, idx + 1)).join('')}
          </div>
        </div>
      </div>
    `;

    this.init3DScene();
    this.attachEventListeners();
  }

  private renderQuickMoveButtons(): string {
    if (this.currentPuzzle === '3x3') {
      return `
        <span class="quick-move-label">Turns:</span>
        ${['R', "R'", 'U', "U'", 'F', "F'", 'L', "L'", 'D', "D'", 'B', "B'"]
          .map((m) => `<button class="btn-sec-move" data-other-move="${m}">${m}</button>`)
          .join('')}
      `;
    } else if (this.currentPuzzle === '2x2') {
      return `
        <span class="quick-move-label">Turns:</span>
        ${['R', "R'", 'U', "U'", 'F', "F'", 'L', "L'"]
          .map((m) => `<button class="btn-sec-move" data-other-move="${m}">${m}</button>`)
          .join('')}
      `;
    } else if (this.currentPuzzle === '4x4') {
      return `
        <span class="quick-move-label">Outer:</span>
        ${['R', "R'", 'U', "U'", 'F', "F'"]
          .map((m) => `<button class="btn-sec-move" data-other-move="${m}">${m}</button>`)
          .join('')}
        <span class="quick-move-label" style="margin-left: 8px;">Wide:</span>
        ${['Rw', "Rw'", 'Uw', "Uw'", 'Fw', "Fw'"]
          .map((m) => `<button class="btn-sec-move" data-other-move="${m}">${m}</button>`)
          .join('')}
      `;
    } else {
      // Pyraminx
      return `
        <span class="quick-move-label">Layers:</span>
        ${['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'"]
          .map((m) => `<button class="btn-sec-move" data-other-move="${m}">${m}</button>`)
          .join('')}
        <span class="quick-move-label" style="margin-left: 8px;">Tips:</span>
        ${['u', "u'", 'l', "l'", 'r', "r'", 'b', "b'"]
          .map((m) => `<button class="btn-sec-move" data-other-move="${m}">${m}</button>`)
          .join('')}
      `;
    }
  }

  private renderGuideStep(
    step: PuzzleGuide['steps'][0],
    num: number
  ): string {
    return `
      <div class="step-card">
        <div class="step-header">
          <div class="step-indicator">Step ${num}</div>
          <div class="step-header-text">
            <h4 class="step-title">${step.title}</h4>
            <div class="step-subtitle">${step.description}</div>
          </div>
        </div>

        <div class="step-details-grid">
          <div class="step-detail-box">
            <h5 class="detail-label">Recognition & Positioning</h5>
            <p class="detail-text">${step.recognition}</p>
          </div>
        </div>

        <div class="step-algorithms">
          <h5 class="algorithms-label">Step Algorithms</h5>
          <div class="algorithms-list">
            ${step.algorithms
              .map(
                (alg) => `
              <div class="alg-card">
                <div class="alg-meta">
                  <div class="alg-name">${alg.name}</div>
                  <div class="alg-notation"><code>${alg.notation}</code></div>
                </div>
                <p class="alg-desc">${alg.desc}</p>
                <div class="alg-actions">
                  <button class="btn btn-sm btn-primary btn-try-other-alg" data-alg="${alg.notation}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Try on puzzle
                  </button>
                  <button class="btn btn-sm btn-secondary btn-copy-alg" data-alg="${alg.notation}" aria-label="Copy ${alg.notation}">
                    Copy
                  </button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  private init3DScene(): void {
    const mount = this.container.querySelector<HTMLElement>('#other-canvas-viewport');
    if (!mount) return;

    // Dispose previous
    if (this.cubeScene) {
      this.cubeScene.dispose();
      this.cubeScene = null;
    }
    if (this.pyraScene) {
      this.pyraScene.dispose();
      this.pyraScene = null;
    }

    if (this.currentPuzzle === 'pyraminx') {
      this.pyraScene = new PyraminxScene(mount, {
        onSolvedChange: (solved) => {
          if (solved) toast.show('Pyraminx Solved!');
        },
      });
      this.pyraScene.setRotateSpeed(this.cameraSensitivity);
    } else {
      const size = this.currentPuzzle === '2x2' ? 2 : this.currentPuzzle === '4x4' ? 4 : 3;
      this.cubeState = new CubeState(size);
      this.cubeScene = new RubiksCubeScene(mount, this.cubeState, {
        onSolvedChange: (solved) => {
          if (solved) toast.show(`${this.currentPuzzle} Solved!`);
        },
      });
      this.cubeScene.setRotateSpeed(this.cameraSensitivity);
    }
  }

  private attachEventListeners(): void {
    // Puzzle tabs switch
    const tabs = this.container.querySelectorAll<HTMLButtonElement>('[data-puzzle]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const pz = tab.getAttribute('data-puzzle') as OtherPuzzleType;
        if (pz && pz !== this.currentPuzzle) {
          this.currentPuzzle = pz;
          this.render();
        }
      });
    });

    // "Solve this version" button
    this.container.querySelector('#btn-solve-this-version')?.addEventListener('click', () => {
      this.onSolveVersion?.(this.currentPuzzle);
    });

    // Scramble button
    this.container.querySelector('#btn-other-scramble')?.addEventListener('click', () => {
      if (this.currentPuzzle === 'pyraminx') {
        const sc = this.pyraScene?.scramble();
        if (sc) toast.show(`Scrambled Pyraminx: ${sc}`);
      } else {
        const size = this.currentPuzzle === '2x2' ? 2 : this.currentPuzzle === '4x4' ? 4 : 3;
        const length = size === 2 ? 14 : size === 4 ? 38 : 22;
        const sc = generateScramble(length, size);
        const moves = parseAlgorithm(sc);
        this.cubeScene?.executeAlgorithm(moves, false, true);
        toast.show(`Scrambled ${this.currentPuzzle}: ${sc}`);
      }
    });

    // Reset button
    this.container.querySelector('#btn-other-reset')?.addEventListener('click', () => {
      if (this.currentPuzzle === 'pyraminx') {
        this.pyraScene?.reset();
      } else {
        this.cubeScene?.resetCube();
      }
      toast.show('Puzzle reset to solved state.');
    });

    // Quick move buttons
    const moveButtons = this.container.querySelectorAll<HTMLButtonElement>('[data-other-move]');
    moveButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = btn.getAttribute('data-other-move');
        if (!m) return;
        if (this.currentPuzzle === 'pyraminx') {
          this.pyraScene?.executeMove(m);
        } else {
          this.cubeScene?.executeMove(m, false);
        }
      });
    });

    // Try algorithm on puzzle
    const tryButtons = this.container.querySelectorAll<HTMLButtonElement>('.btn-try-other-alg');
    tryButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const alg = btn.getAttribute('data-alg');
        if (!alg) return;

        // Scroll to 3D playground
        this.container.querySelector('.other-playground-card')?.scrollIntoView({ behavior: 'smooth' });

        if (this.currentPuzzle === 'pyraminx') {
          const tokens = alg.split(/[\s()]+/).filter(Boolean);
          tokens.forEach((t) => this.pyraScene?.executeMove(t));
          toast.show(`Ran algorithm on Pyraminx: ${alg}`);
        } else {
          const moves = parseAlgorithm(alg);
          this.cubeScene?.executeAlgorithm(moves, false, false, () => {
            toast.show(`Completed: ${alg}`);
          });
        }
      });
    });

    // Copy algorithm
    const copyButtons = this.container.querySelectorAll<HTMLButtonElement>('.btn-copy-alg');
    copyButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const alg = btn.getAttribute('data-alg');
        if (alg) {
          try {
            await navigator.clipboard.writeText(alg);
            toast.show(`Copied: ${alg}`);
          } catch {
            toast.show(alg);
          }
        }
      });
    });
  }
}
