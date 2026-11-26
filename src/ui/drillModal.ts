import { ADVANCED_SPEEDCUBING_DATA, SpeedcubeAlgorithmItem } from '../content/guideData';
import { invertAlgorithm, parseAlgorithm } from '../cube/notation';
import { TrainerPuzzleType } from './controls';

export interface DrillCaseSelection {
  puzzle: TrainerPuzzleType;
  item: SpeedcubeAlgorithmItem;
  setupMoves: string[];
  solutionMoves: string[];
}

/**
 * Expands and inverts an algorithm string into setup moves (to scramble into the case)
 * and forward solution moves.
 */
export function buildDrillMoves(
  puzzle: TrainerPuzzleType,
  notation: string
): { setupMoves: string[]; solutionMoves: string[] } {
  const cleaned = notation.replace(/\+/g, ' ');
  if (puzzle === 'pyraminx') {
    const tokens = cleaned.split(/[\s()]+/).filter(Boolean);
    const inv = tokens
      .slice()
      .reverse()
      .map((t) => (t.endsWith("'") ? t.slice(0, -1) : t.endsWith('2') ? t : `${t}'`));
    return { setupMoves: inv, solutionMoves: tokens };
  }

  // Normalize any 2Uw2 tokens safely to Uw2 so 4x4 parity algorithms expand cleanly
  const normalizedInput = cleaned.replace(/\b2Uw2\b/g, 'Uw2');
  const solutionMoves = parseAlgorithm(normalizedInput);
  const invertedStr = invertAlgorithm(normalizedInput);
  const setupMoves = parseAlgorithm(invertedStr);
  return { setupMoves, solutionMoves };
}

export class DrillModal {
  private modalEl: HTMLElement | null = null;
  private activePuzzle: TrainerPuzzleType = '3x3';
  private onSelectCase: (selection: DrillCaseSelection) => void;

  constructor(onSelectCase: (selection: DrillCaseSelection) => void) {
    this.onSelectCase = onSelectCase;
    if (typeof document !== 'undefined') {
      this.createModal();
    }
  }

  public open(puzzle?: TrainerPuzzleType): void {
    if (puzzle) this.activePuzzle = puzzle;
    if (!this.modalEl) return;
    this.renderBody();
    this.modalEl.classList.add('is-open');
    this.modalEl.setAttribute('aria-hidden', 'false');
  }

  public close(): void {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('is-open');
    this.modalEl.setAttribute('aria-hidden', 'true');
  }

  public isOpen(): boolean {
    return Boolean(this.modalEl?.classList.contains('is-open'));
  }

  private createModal(): void {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'drill-modal-title');
    modal.innerHTML = `
      <div class="modal-card modal-card-wide">
        <div class="modal-header">
          <div class="modal-header-left">
            <h2 id="drill-modal-title" class="modal-title">OLL / PLL / Parity Algorithm Drills</h2>
            <span class="modal-badge">Auto-Setup</span>
          </div>
          <button class="modal-close" aria-label="Close drill picker">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body" id="drill-modal-body"></div>
        <div class="modal-footer">
          <button type="button" id="btn-close-drill" class="btn btn-secondary">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modalEl = modal;

    modal.querySelector('.modal-close')?.addEventListener('click', () => this.close());
    modal.querySelector('#btn-close-drill')?.addEventListener('click', () => this.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });
  }

  private renderBody(): void {
    const body = this.modalEl?.querySelector<HTMLElement>('#drill-modal-body');
    if (!body) return;

    const puzzles: TrainerPuzzleType[] = ['3x3', '2x2', '4x4', 'pyraminx'];
    const section = ADVANCED_SPEEDCUBING_DATA[this.activePuzzle];

    body.innerHTML = `
      <p class="modal-intro">
        Select an algorithm below. EiCube applies the exact inverse setup automatically so you can drill recognition and timed execution straight from your next move.
      </p>
      <div class="stats-filter-row" role="tablist" aria-label="Choose drill puzzle">
        ${puzzles
          .map(
            (p) =>
              `<button type="button" class="btn btn-sm ${
                p === this.activePuzzle ? 'btn-primary' : 'btn-secondary'
              }" data-drill-puzzle="${p}">${p === 'pyraminx' ? 'Pyraminx' : p}</button>`
          )
          .join('')}
      </div>

      <div class="drill-cases-grid">
        ${section.algorithms
          .map(
            (alg) => `
          <div class="drill-case-card">
            <div class="drill-case-top">
              <span class="speedcube-category-chip">${alg.category}</span>
              <strong>${alg.name}</strong>
            </div>
            <p class="drill-case-rec">${alg.recognition || alg.description}</p>
            <div class="drill-case-footer">
              <code class="drill-case-alg">${alg.notation}</code>
              <button type="button" class="btn btn-sm btn-primary" data-drill-start="${alg.id}">Start Drill</button>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    body.querySelectorAll<HTMLButtonElement>('[data-drill-puzzle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.drillPuzzle as TrainerPuzzleType;
        if (p) {
          this.activePuzzle = p;
          this.renderBody();
        }
      });
    });

    body.querySelectorAll<HTMLButtonElement>('[data-drill-start]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const algId = btn.dataset.drillStart;
        const item = section.algorithms.find((a) => a.id === algId);
        if (!item) return;
        const { setupMoves, solutionMoves } = buildDrillMoves(this.activePuzzle, item.notation);
        this.close();
        this.onSelectCase({
          puzzle: this.activePuzzle,
          item,
          setupMoves,
          solutionMoves,
        });
      });
    });
  }
}
