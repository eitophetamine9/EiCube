const TUTORIAL_STORAGE_KEY = 'eicube_tutorial_dismissed_v1';

interface TutorialStep {
  title: string;
  badge: string;
  description: string;
  targetSelector?: string;
}

export class TutorialOverlay {
  private overlayEl: HTMLElement | null = null;
  private currentStep: number = 0;
  private highlightedElement: HTMLElement | null = null;

  private steps: TutorialStep[] = [
    {
      title: 'Turn, Orbit & Zoom',
      badge: 'Navigation 1/4: 3D Stage',
      description:
        'Drag puzzle pieces directly to turn layers. Drag the background to orbit, and pinch or scroll to zoom.',
      targetSelector: '#cube-viewport',
    },
    {
      title: 'Instant Puzzle Switcher',
      badge: 'Navigation 2/4: Puzzles',
      description:
        'Switch instantly between 3×3, 2×2, 4×4, and Pyraminx right from the top bar.',
      targetSelector: '.puzzle-mini-picker',
    },
    {
      title: 'Move Pad & Keybinds',
      badge: 'Navigation 3/4: Controls',
      description:
        'Execute face, slice (M/M\'), and rotation turns. Click any key chip to customize keyboard shortcuts.',
      targetSelector: '.trainer-left-sidebar',
    },
    {
      title: 'Video Guides & Speedcubing',
      badge: 'Navigation 4/4: Learn',
      description:
        'Watch curated HD video tutorials and test speedcubing algorithms with 1-click execution on the 3D puzzle.',
      targetSelector: '[data-tab="learn"]',
    },
  ];

  constructor() {
    this.createOverlay();
    this.checkAutoShow();
  }

  private checkAutoShow(): void {
    try {
      const dismissed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!dismissed) {
        this.open();
      }
    } catch {
      this.open();
    }
  }

  open(): void {
    if (!this.overlayEl) return;
    this.currentStep = 0;
    this.renderStep();
    this.overlayEl.classList.add('is-open');
    this.overlayEl.setAttribute('aria-hidden', 'false');
  }

  close(): void {
    this.clearHighlight();
    if (!this.overlayEl) return;
    this.overlayEl.classList.remove('is-open');
    this.overlayEl.setAttribute('aria-hidden', 'true');
  }

  private clearHighlight(): void {
    if (this.highlightedElement) {
      this.highlightedElement.classList.remove('tutorial-spotlight-active');
      this.highlightedElement = null;
    }
  }

  private applyHighlight(selector?: string): void {
    this.clearHighlight();
    if (!selector) return;

    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
      el.classList.add('tutorial-spotlight-active');
      this.highlightedElement = el;
    }
  }

  private setDontShowAgain(val: boolean): void {
    try {
      if (val) {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      } else {
        localStorage.removeItem(TUTORIAL_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }

  private createOverlay(): void {
    const overlay = document.createElement('div');
    overlay.className = 'tutorial-backdrop';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-labelledby', 'tutorial-title');

    overlay.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-badge" id="tutorial-badge">Navigation 1 of 4</div>
        <h2 class="tutorial-title" id="tutorial-title">Tutorial Title</h2>
        <p class="tutorial-desc" id="tutorial-desc">Tutorial text</p>

        <div class="tutorial-dots" id="tutorial-dots"></div>

        <div class="tutorial-footer">
          <label class="tutorial-checkbox-label">
            <input type="checkbox" id="tutorial-dont-show" />
            <span>Don't show again</span>
          </label>
          <div class="tutorial-buttons">
            <button id="tutorial-prev-btn" class="btn btn-secondary">Previous</button>
            <button id="tutorial-next-btn" class="btn btn-primary">Next</button>
          </div>
        </div>
        <button class="tutorial-skip" id="tutorial-skip-btn">Skip Tutorial</button>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayEl = overlay;

    // Listeners
    overlay.querySelector('#tutorial-prev-btn')?.addEventListener('click', () => {
      if (this.currentStep > 0) {
        this.currentStep--;
        this.renderStep();
      }
    });

    overlay.querySelector('#tutorial-next-btn')?.addEventListener('click', () => {
      if (this.currentStep < this.steps.length - 1) {
        this.currentStep++;
        this.renderStep();
      } else {
        const checkbox = overlay.querySelector<HTMLInputElement>('#tutorial-dont-show');
        if (checkbox?.checked) {
          this.setDontShowAgain(true);
        }
        this.close();
      }
    });

    overlay.querySelector('#tutorial-skip-btn')?.addEventListener('click', () => {
      const checkbox = overlay.querySelector<HTMLInputElement>('#tutorial-dont-show');
      if (checkbox?.checked) {
        this.setDontShowAgain(true);
      }
      this.close();
    });

    overlay.querySelector('#tutorial-dont-show')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.setDontShowAgain(checked);
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!this.overlayEl?.classList.contains('is-open')) return;

      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (this.currentStep < this.steps.length - 1) {
          this.currentStep++;
          this.renderStep();
        } else {
          this.close();
        }
      } else if (e.key === 'ArrowLeft') {
        if (this.currentStep > 0) {
          this.currentStep--;
          this.renderStep();
        }
      }
    });
  }

  private renderStep(): void {
    if (!this.overlayEl) return;
    const step = this.steps[this.currentStep];

    const badge = this.overlayEl.querySelector<HTMLElement>('#tutorial-badge');
    const title = this.overlayEl.querySelector<HTMLElement>('#tutorial-title');
    const desc = this.overlayEl.querySelector<HTMLElement>('#tutorial-desc');
    const prevBtn = this.overlayEl.querySelector<HTMLButtonElement>('#tutorial-prev-btn');
    const nextBtn = this.overlayEl.querySelector<HTMLButtonElement>('#tutorial-next-btn');
    const dots = this.overlayEl.querySelector<HTMLElement>('#tutorial-dots');

    if (badge) badge.textContent = step.badge;
    if (title) title.textContent = step.title;
    if (desc) desc.textContent = step.description;

    if (prevBtn) {
      prevBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';
    }

    if (nextBtn) {
      nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Start Solving' : 'Next';
    }

    if (dots) {
      dots.innerHTML = '';
      this.steps.forEach((_, idx) => {
        const dot = document.createElement('span');
        dot.className = `tutorial-dot ${idx === this.currentStep ? 'is-active' : ''}`;
        dot.style.cursor = 'pointer';
        dot.title = `Step ${idx + 1}`;
        dot.addEventListener('click', () => {
          this.currentStep = idx;
          this.renderStep();
        });
        dots.appendChild(dot);
      });
    }

    this.applyHighlight(step.targetSelector);
  }
}
