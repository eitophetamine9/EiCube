export type SolvePenalty = 'OK' | '+2' | 'DNF';

export interface SolveRecord {
  id: string;
  timestamp: number;
  puzzle: string;
  rawMs: number;
  penalty: SolvePenalty;
  moves: number;
  mode: 'free' | 'drill';
  label?: string;
}

export interface PuzzleStatsSummary {
  count: number;
  pb: number | null;
  mean: number | null;
  ao5: number | null;
  ao12: number | null;
}

/**
 * Returns the penalty-adjusted solve duration in milliseconds, or null for DNF.
 */
export function getEffectiveTimeMs(record: SolveRecord): number | null {
  if (record.penalty === 'DNF') return null;
  return record.penalty === '+2' ? record.rawMs + 2000 : record.rawMs;
}

/**
 * Computes WCA trimmed Ao5 or Ao12 from records ordered newest-first.
 * Drops the single fastest and single slowest solve (a single DNF counts as slowest;
 * two or more DNFs result in null / DNF average).
 */
export function calculateWcaAverage(records: SolveRecord[], count: 5 | 12): number | null {
  if (records.length < count) return null;
  const windowRecords = records.slice(0, count);

  const validTimes: number[] = [];
  let dnfCount = 0;

  for (const rec of windowRecords) {
    const eff = getEffectiveTimeMs(rec);
    if (eff === null) {
      dnfCount += 1;
    } else {
      validTimes.push(eff);
    }
  }

  if (dnfCount > 1) return null;

  validTimes.sort((a, b) => a - b);
  // Drop fastest
  validTimes.shift();
  // Drop slowest (if no DNF in window, drop highest numeric time; if 1 DNF, DNF was already slowest)
  if (dnfCount === 0) {
    validTimes.pop();
  }

  if (validTimes.length === 0) return null;
  const sum = validTimes.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / validTimes.length);
}

/**
 * Computes full session metrics for one puzzle type from newest-first records.
 */
export function summarizePuzzleStats(records: SolveRecord[], puzzle: string): PuzzleStatsSummary {
  const matching = records.filter((r) => r.puzzle === puzzle);
  if (matching.length === 0) {
    return { count: 0, pb: null, mean: null, ao5: null, ao12: null };
  }

  const validTimes = matching
    .map(getEffectiveTimeMs)
    .filter((v): v is number => v !== null);

  const pb = validTimes.length > 0 ? Math.min(...validTimes) : null;
  const mean =
    validTimes.length > 0
      ? Math.round(validTimes.reduce((acc, v) => acc + v, 0) / validTimes.length)
      : null;

  return {
    count: matching.length,
    pb,
    mean,
    ao5: calculateWcaAverage(matching, 5),
    ao12: calculateWcaAverage(matching, 12),
  };
}

export function formatSolveTime(ms: number | null): string {
  if (ms === null) return 'DNF';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  if (minutes > 0) {
    return `${minutes}:${pad(seconds)}.${pad(hundredths)}`;
  }
  return `${seconds}.${pad(hundredths)}s`;
}

const STATS_STORAGE_KEY = 'eicube_solve_history_v1';
const MAX_STORED_SOLVES = 120;

export class SessionStatsManager {
  private records: SolveRecord[] = [];
  private modalEl: HTMLElement | null = null;
  private activeFilterPuzzle: string = '3x3';
  private onChange?: () => void;

  constructor(onChange?: () => void) {
    this.onChange = onChange;
    this.records = this.load();
    if (typeof document !== 'undefined') {
      this.createModal();
    }
  }

  private load(): SolveRecord[] {
    try {
      const raw = localStorage.getItem(STATS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  }

  private save(): void {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(this.records.slice(0, MAX_STORED_SOLVES)));
    } catch {
      // Ignore storage errors
    }
    this.onChange?.();
  }

  public addSolve(entry: Omit<SolveRecord, 'id' | 'timestamp'>): SolveRecord {
    const rec: SolveRecord = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    this.records.unshift(rec);
    if (this.records.length > MAX_STORED_SOLVES) {
      this.records = this.records.slice(0, MAX_STORED_SOLVES);
    }
    this.save();
    this.renderModalBody();
    return rec;
  }

  public getSummary(puzzle: string): PuzzleStatsSummary {
    return summarizePuzzleStats(this.records, puzzle);
  }

  public setPenalty(id: string, penalty: SolvePenalty): void {
    const target = this.records.find((r) => r.id === id);
    if (!target) return;
    target.penalty = target.penalty === penalty ? 'OK' : penalty;
    this.save();
    this.renderModalBody();
  }

  public deleteSolve(id: string): void {
    this.records = this.records.filter((r) => r.id !== id);
    this.save();
    this.renderModalBody();
  }

  public clearPuzzle(puzzle: string): void {
    this.records = this.records.filter((r) => r.puzzle !== puzzle);
    this.save();
    this.renderModalBody();
  }

  public open(puzzle?: string): void {
    if (puzzle) this.activeFilterPuzzle = puzzle;
    if (!this.modalEl) return;
    this.renderModalBody();
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
    modal.setAttribute('aria-labelledby', 'stats-modal-title');
    modal.innerHTML = `
      <div class="modal-card modal-card-wide">
        <div class="modal-header">
          <div class="modal-header-left">
            <h2 id="stats-modal-title" class="modal-title">Session Timing & WCA Averages</h2>
            <span class="modal-badge">Local History</span>
          </div>
          <button class="modal-close" aria-label="Close session stats">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body" id="stats-modal-body"></div>
        <div class="modal-footer">
          <button type="button" id="btn-clear-puzzle-stats" class="btn btn-secondary">Clear Puzzle Solves</button>
          <button type="button" id="btn-close-stats-done" class="btn btn-primary">Done</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modalEl = modal;

    modal.querySelector('.modal-close')?.addEventListener('click', () => this.close());
    modal.querySelector('#btn-close-stats-done')?.addEventListener('click', () => this.close());
    modal.querySelector('#btn-clear-puzzle-stats')?.addEventListener('click', () => {
      this.clearPuzzle(this.activeFilterPuzzle);
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });
  }

  private renderModalBody(): void {
    const body = this.modalEl?.querySelector<HTMLElement>('#stats-modal-body');
    if (!body) return;

    const puzzles = ['3x3', '2x2', '4x4', 'pyraminx'];
    const summary = this.getSummary(this.activeFilterPuzzle);
    const filtered = this.records.filter((r) => r.puzzle === this.activeFilterPuzzle);

    body.innerHTML = `
      <div class="stats-filter-row" role="tablist" aria-label="Filter solves by puzzle">
        ${puzzles
          .map(
            (p) =>
              `<button type="button" class="btn btn-sm ${
                p === this.activeFilterPuzzle ? 'btn-primary' : 'btn-secondary'
              }" data-stats-puzzle="${p}">${p === 'pyraminx' ? 'Pyraminx' : p}</button>`
          )
          .join('')}
      </div>

      <div class="stats-kpi-grid">
        <div class="stats-kpi-card">
          <span class="stats-kpi-label">Best Single (PB)</span>
          <strong class="stats-kpi-val">${summary.pb !== null ? formatSolveTime(summary.pb) : '--'}</strong>
        </div>
        <div class="stats-kpi-card">
          <span class="stats-kpi-label">Current Ao5</span>
          <strong class="stats-kpi-val">${summary.ao5 !== null ? formatSolveTime(summary.ao5) : '--'}</strong>
        </div>
        <div class="stats-kpi-card">
          <span class="stats-kpi-label">Current Ao12</span>
          <strong class="stats-kpi-val">${summary.ao12 !== null ? formatSolveTime(summary.ao12) : '--'}</strong>
        </div>
        <div class="stats-kpi-card">
          <span class="stats-kpi-label">Session Mean (${summary.count})</span>
          <strong class="stats-kpi-val">${summary.mean !== null ? formatSolveTime(summary.mean) : '--'}</strong>
        </div>
      </div>

      ${
        filtered.length === 0
          ? `<div class="stats-empty-box">No solves recorded for ${this.activeFilterPuzzle} yet. Hit Scramble, solve cleanly, and your WCA stats will update here.</div>`
          : `<div class="stats-table-wrap">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>Mode</th>
                    <th>Moves</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered
                    .map((rec, idx) => {
                      const eff = getEffectiveTimeMs(rec);
                      const timeText =
                        rec.penalty === '+2'
                          ? `${formatSolveTime(eff)} (+2)`
                          : formatSolveTime(eff);
                      const tps =
                        rec.rawMs > 0 && rec.moves > 0
                          ? (rec.moves / (rec.rawMs / 1000)).toFixed(1)
                          : '0.0';
                      return `
                        <tr>
                          <td>#${filtered.length - idx}</td>
                          <td><strong class="stats-time-cell ${rec.penalty === 'DNF' ? 'is-dnf' : ''}">${timeText}</strong></td>
                          <td>${rec.mode === 'drill' ? rec.label || 'Drill' : 'Free Solve'}</td>
                          <td>${rec.moves} (${tps} TPS)</td>
                          <td class="stats-row-actions">
                            <button type="button" class="btn-tag-mini ${rec.penalty === '+2' ? 'is-active' : ''}" data-stat-pen="+2" data-stat-id="${rec.id}">+2</button>
                            <button type="button" class="btn-tag-mini ${rec.penalty === 'DNF' ? 'is-active' : ''}" data-stat-pen="DNF" data-stat-id="${rec.id}">DNF</button>
                            <button type="button" class="btn-tag-mini" data-stat-del="${rec.id}" aria-label="Delete solve">Del</button>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>`
      }
    `;

    body.querySelectorAll<HTMLButtonElement>('[data-stats-puzzle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.statsPuzzle;
        if (p) {
          this.activeFilterPuzzle = p;
          this.renderModalBody();
        }
      });
    });

    body.querySelectorAll<HTMLButtonElement>('[data-stat-pen]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.statId;
        const pen = btn.dataset.statPen as SolvePenalty;
        if (id && pen) this.setPenalty(id, pen);
      });
    });

    body.querySelectorAll<HTMLButtonElement>('[data-stat-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.statDel;
        if (id) this.deleteSolve(id);
      });
    });
  }
}
