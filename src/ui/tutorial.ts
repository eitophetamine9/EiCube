const TUTORIAL_STORAGE_KEY = 'eicube_tutorial_dismissed_v1';

export class TutorialOverlay {
  private overlayEl: HTMLElement | null = null;
  private currentStep: number = 0;
  private steps = [
    {
      title: 'Real 3D Interactive Cube',
      description:
        'Click and drag anywhere on the cube or background to orbit. Scroll or pinch to zoom in and out. The camera is clamped so you never lose sight of your puzzle.',
      badge: 'Step 1 of 4: View & Orbit',
    },
    {
      title: 'Camera-Relative Turns',
      description:
        'Moves adapt to where you look! Pressing "R" always turns whichever face is currently on your right, "U" turns the top, and "F" turns the front facing you. Rotate the view 180° and "R" will intuitively turn the new right face.',
      badge: 'Step 2 of 4: Smart Moves',
    },
    {
      title: 'Keyboard Controls & Customization',
      description:
        'Use U, D, L, R, F, B on your keyboard. Hold Shift for prime (counter-clockwise) turns, or use the on-screen buttons. Want custom shortcuts? Open Settings to rebind any move with conflict detection.',
      badge: 'Step 3 of 4: Keybinds',
    },
    {
      title: 'Scramble, Timer & Solving Guide',
      description:
        'Hit "Scramble" for an official random sequence. Practice solving with the built-in timer, or click the "Learn" tab to master the beginner layer-by-layer method with interactive "Try it on cube" algorithm buttons!',
      badge: 'Step 4 of 4: Learn & Train',
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
    if (!this.overlayEl) return;
    this.overlayEl.classList.remove('is-open');
    this.overlayEl.setAttribute('aria-hidden', 'true');
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
        <div class="tutorial-badge" id="tutorial-badge">Step 1 of 4</div>
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
        dots.appendChild(dot);
      });
    }
  }
}
