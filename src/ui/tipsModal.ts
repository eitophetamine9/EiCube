export class TipsModal {
  private modalEl: HTMLElement | null = null;
  private isModalOpen: boolean = false;
  private onJumpToStep?: (stepId: string) => void;

  constructor(onJumpToStep?: (stepId: string) => void) {
    this.onJumpToStep = onJumpToStep;
    this.createModal();
  }

  isOpen(): boolean {
    return this.isModalOpen;
  }

  open(): void {
    if (!this.modalEl) return;
    this.isModalOpen = true;
    this.modalEl.classList.add('is-open');
    this.modalEl.setAttribute('aria-hidden', 'false');
  }

  close(): void {
    if (!this.modalEl) return;
    this.isModalOpen = false;
    this.modalEl.classList.remove('is-open');
    this.modalEl.setAttribute('aria-hidden', 'true');
  }

  private createModal(): void {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'tips-modal-title');

    modal.innerHTML = `
      <div class="modal-card tips-card">
        <div class="modal-header">
          <div class="tips-header-left">
            <div class="tips-badge-icon">?</div>
            <div>
              <h2 id="tips-modal-title" class="modal-title">Solving Diagnostic & Quick Tips</h2>
              <p class="modal-subtitle">Stuck? Choose where you are to get instant guidance</p>
            </div>
          </div>
          <button class="modal-close" aria-label="Close tips">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="tips-list">
            <!-- Tip 1 -->
            <div class="tip-accordion-item">
              <div class="tip-q">
                <span class="tip-num">1</span>
                <span>White Cross edges flipped or wrong side color?</span>
              </div>
              <div class="tip-a">
                <p>If a white edge has its white sticker on the front instead of facing white, use the flipping algorithm: <code>F' U' R U</code>. Always ensure side colors match adjacent centers!</p>
                <button class="btn btn-sm btn-outline btn-tip-jump" data-step="step-1">Go to Step 1 Guide</button>
              </div>
            </div>

            <!-- Tip 2 -->
            <div class="tip-accordion-item">
              <div class="tip-q">
                <span class="tip-num">2</span>
                <span>Corner stuck in the first layer facing wrong direction?</span>
              </div>
              <div class="tip-a">
                <p>Do the right-hand trigger <code>R U R' U'</code> once to pop the corner piece up to the top layer. Then position it over the correct slot and repeat <code>R U R' U'</code> until solved.</p>
                <button class="btn btn-sm btn-outline btn-tip-jump" data-step="step-2">Go to Step 2 Guide</button>
              </div>
            </div>

            <!-- Tip 3 -->
            <div class="tip-accordion-item">
              <div class="tip-q">
                <span class="tip-num">3</span>
                <span>Middle layer edge is stuck or inverted?</span>
              </div>
              <div class="tip-a">
                <p>Insert any dummy yellow piece into that middle slot using <code>U R U' R' U' F' U F</code>. This kicks the trapped edge up to the top layer so you can insert it properly.</p>
                <button class="btn btn-sm btn-outline btn-tip-jump" data-step="step-3">Go to Step 3 Guide</button>
              </div>
            </div>

            <!-- Tip 4 -->
            <div class="tip-accordion-item">
              <div class="tip-q">
                <span class="tip-num">4</span>
                <span>Yellow Cross: Dot, 'L' angle, or line?</span>
              </div>
              <div class="tip-a">
                <p>Hold the horizontal line across or the 'L' shape in the top-left (9 and 12 o'clock), then execute: <code>F R U R' U' F'</code>.</p>
                <button class="btn btn-sm btn-outline btn-tip-jump" data-step="step-4">Go to Step 4 Guide</button>
              </div>
            </div>

            <!-- Tip 5 -->
            <div class="tip-accordion-item">
              <div class="tip-q">
                <span class="tip-num">5</span>
                <span>Final Step: Cube looks scrambled while twisting corners?</span>
              </div>
              <div class="tip-a">
                <p><strong>MOST COMMON MISTAKE:</strong> Always finish the 4th move (<code>D</code>) in <code>(R' D' R D)</code>! Do NOT rotate the entire cube; turn ONLY the top layer (<code>U</code>) to bring the next unsolved corner to the front-right.</p>
                <button class="btn btn-sm btn-outline btn-tip-jump" data-step="step-7">Go to Final Step Guide</button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="btn-open-full-guide" class="btn btn-primary">Open Full Solving Guide</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    // Listeners
    modal.querySelector('.modal-close')?.addEventListener('click', () => this.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    const jumpButtons = modal.querySelectorAll<HTMLButtonElement>('.btn-tip-jump');
    jumpButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = btn.getAttribute('data-step');
        if (step) {
          this.close();
          this.onJumpToStep?.(step);
        }
      });
    });

    modal.querySelector('#btn-open-full-guide')?.addEventListener('click', () => {
      this.close();
      this.onJumpToStep?.('step-1');
    });

    window.addEventListener('keydown', (e) => {
      if (this.isModalOpen && e.key === 'Escape') {
        this.close();
      }
    });
  }
}
