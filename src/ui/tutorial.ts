const TUTORIAL_STORAGE_KEY = 'eicube_tutorial_dismissed_v1';

export interface TutorialStep {
  title: string;
  badge: string;
  description: string;
  targetSelector?: string;
}

export class TutorialOverlay {
  private overlayEl: HTMLElement | null = null;
  private currentStep: number = 0;
  private highlightedElement: HTMLElement | null = null;
  private isTransitioning: boolean = false;

  private desktopSteps: TutorialStep[] = [
    {
      title: 'Turn, Orbit & Zoom',
      badge: 'Desktop Tour 1/4: 3D Stage',
      description:
        'Drag puzzle pieces directly to turn layers. Drag the background to orbit, and scroll or pinch to zoom.',
      targetSelector: '#cube-viewport-container',
    },
    {
      title: 'Instant Puzzle Switcher',
      badge: 'Desktop Tour 2/4: Puzzles',
      description:
        'Switch instantly between 3x3, 2x2, 4x4, and Pyraminx right from the top bar.',
      targetSelector: '.puzzle-mini-picker',
    },
    {
      title: 'Move Pad & Keybinds',
      badge: 'Desktop Tour 3/4: Controls',
      description:
        'Execute face, slice (M/M\'), and rotation turns. Click any key chip to customize keyboard shortcuts.',
      targetSelector: '.trainer-left-sidebar',
    },
    {
      title: 'Video Guides & Speedcubing',
      badge: 'Desktop Tour 4/4: Learn',
      description:
        'Watch curated HD video tutorials and test speedcubing algorithms with 1-click execution on the 3D puzzle.',
      targetSelector: '[data-tab-target="learn"]',
    },
  ];

  private mobileSteps: TutorialStep[] = [
    {
      title: 'Touch, Turn & Orbit',
      badge: 'Mobile Tour 1/4: 3D Stage',
      description:
        'Swipe any cube face or pyraminx layer directly to turn it. Swipe empty space to orbit the camera, and pinch to zoom.',
      targetSelector: '#cube-viewport-container',
    },
    {
      title: 'Navigation & Burger Menu',
      badge: 'Mobile Tour 2/4: Navigation',
      description:
        'Tap the burger menu icon up top to switch between 3x3, 2x2, 4x4, and Pyraminx, or to open learning guides and settings.',
      targetSelector: '#btn-mobile-menu-toggle',
    },
    {
      title: 'Thumb Dock & Quick Moves',
      badge: 'Mobile Tour 3/4: Controls',
      description:
        'Use the bottom thumb dock for one-tap Scramble, Undo, Move History, and full keypad moves on any puzzle.',
      targetSelector: '.mobile-bottom-dock',
    },
    {
      title: 'Pro Video Guides & Algorithms',
      badge: 'Mobile Tour 4/4: Speedcubing',
      description:
        'Open the burger menu and tap Learn Puzzles to watch HD video guides and test advanced speedcubing algorithms with 1 tap.',
      targetSelector: '#btn-mobile-menu-toggle',
    },
  ];

  constructor() {
    this.createOverlay();
    this.checkAutoShow();
  }

  private isMobileView(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  }

  private getActiveSteps(): TutorialStep[] {
    return this.isMobileView() ? this.mobileSteps : this.desktopSteps;
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
    this.renderStep(false);
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
        <div class="tutorial-step-body" id="tutorial-step-body">
          <div class="tutorial-badge" id="tutorial-badge">Tour 1 of 4</div>
          <h2 class="tutorial-title" id="tutorial-title">Tutorial Title</h2>
          <p class="tutorial-desc" id="tutorial-desc">Tutorial text</p>
        </div>

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
        this.renderStep(true);
      }
    });

    overlay.querySelector('#tutorial-next-btn')?.addEventListener('click', () => {
      const steps = this.getActiveSteps();
      if (this.currentStep < steps.length - 1) {
        this.currentStep++;
        this.renderStep(true);
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

      const steps = this.getActiveSteps();
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (this.currentStep < steps.length - 1) {
          this.currentStep++;
          this.renderStep(true);
        } else {
          this.close();
        }
      } else if (e.key === 'ArrowLeft') {
        if (this.currentStep > 0) {
          this.currentStep--;
          this.renderStep(true);
        }
      }
    });
  }

  private renderStep(animate: boolean = false): void {
    if (!this.overlayEl) return;
    const steps = this.getActiveSteps();

    // Clamp currentStep if bounds shifted due to orientation/screen changes
    if (this.currentStep >= steps.length) {
      this.currentStep = steps.length - 1;
    }
    const step = steps[this.currentStep];

    const bodyEl = this.overlayEl.querySelector<HTMLElement>('#tutorial-step-body');

    if (animate && bodyEl) {
      if (this.isTransitioning) return;
      this.isTransitioning = true;
      bodyEl.classList.add('is-fading-out');

      setTimeout(() => {
        this.updateStepDOM(steps, step);
        bodyEl.classList.remove('is-fading-out');
        bodyEl.classList.add('is-entering');

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bodyEl.classList.remove('is-entering');
            this.isTransitioning = false;
          });
        });
      }, 150);
    } else {
      this.updateStepDOM(steps, step);
    }
  }

  private updateStepDOM(steps: TutorialStep[], step: TutorialStep): void {
    if (!this.overlayEl) return;

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
      nextBtn.textContent = this.currentStep === steps.length - 1 ? 'Start Solving' : 'Next';
    }

    if (dots) {
      dots.innerHTML = '';
      steps.forEach((_, idx) => {
        const dot = document.createElement('span');
        dot.className = `tutorial-dot ${idx === this.currentStep ? 'is-active' : ''}`;
        dot.style.cursor = 'pointer';
        dot.title = `Step ${idx + 1}`;
        dot.addEventListener('click', () => {
          if (this.currentStep !== idx) {
            this.currentStep = idx;
            this.renderStep(true);
          }
        });
        dots.appendChild(dot);
      });
    }

    this.applyHighlight(step.targetSelector);
  }
}
