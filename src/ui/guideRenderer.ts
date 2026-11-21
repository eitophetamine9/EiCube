import { GUIDE_DATA, GuideStep } from '../content/guideData';
import { toast } from './toast';

export class GuideRenderer {
  private container: HTMLElement;
  private onTryAlgorithm: (notation: string) => void;

  constructor(container: HTMLElement, onTryAlgorithm: (notation: string) => void) {
    this.container = container;
    this.onTryAlgorithm = onTryAlgorithm;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="guide-wrapper">
        <header class="guide-header">
          <div class="guide-header-badge">Solving Guide</div>
          <h1 class="guide-title">How to Solve the 3x3 Rubik's Cube</h1>
          <p class="guide-subtitle">
            Master the layer-by-layer beginner method used by world-class cubers. Understand cube notation, follow step-by-step cases, and run any algorithm directly on the 3D trainer.
          </p>
        </header>

        <!-- Notation Reference Section -->
        <section class="guide-section" id="notation-section">
          <h2 class="guide-section-heading">
            <span class="guide-section-num">00</span>
            Cube Notation Guide
          </h2>
          <p class="guide-section-desc">
            Standard WCA notation assigns a letter to each layer. Capital letters mean a 90° clockwise turn looking directly at that face. An apostrophe (<strong>'</strong>) means prime (counter-clockwise), and a <strong>2</strong> means a 180° double turn.
          </p>

          <div class="notation-grid">
            ${this.renderNotationGroup('Face Turns', GUIDE_DATA.notation.faces)}
            ${this.renderNotationGroup('Turn Modifiers', GUIDE_DATA.notation.modifiers)}
            ${this.renderNotationGroup('Slice Turns', GUIDE_DATA.notation.slices)}
            ${this.renderNotationGroup('Cube Rotations', GUIDE_DATA.notation.rotations)}
            ${this.renderNotationGroup('Wide Layer Turns', GUIDE_DATA.notation.wide)}
          </div>
        </section>

        <!-- Step-by-Step Layer-by-Layer Sections -->
        <section class="guide-section" id="steps-section">
          <h2 class="guide-section-heading">
            <span class="guide-section-num">01</span>
            Layer-by-Layer Beginner Method (7 Steps)
          </h2>
          <div class="steps-container">
            ${GUIDE_DATA.steps.map((step) => this.renderStep(step)).join('')}
          </div>
        </section>

        <!-- Advanced / CFOP & Finger Tricks -->
        <section class="guide-section" id="advanced-section">
          <h2 class="guide-section-heading">
            <span class="guide-section-num">02</span>
            ${GUIDE_DATA.advanced.cfopTitle}
          </h2>
          <p class="guide-section-desc">
            Once you comfortably solve the cube in under 2 minutes with the beginner method, speedcubers transition to CFOP (Fridrich Method), which solves the cube in four fluid stages:
          </p>
          <div class="cfop-grid">
            ${GUIDE_DATA.advanced.cfopStages
              .map(
                (stage) => `
              <div class="cfop-card">
                <div class="cfop-header">
                  <span class="cfop-badge">${stage.stage}</span>
                  <h3 class="cfop-title">${stage.name}</h3>
                </div>
                <p class="cfop-desc">${stage.description}</p>
                <div class="cfop-cases">Cases: <strong>${stage.cases}</strong></div>
              </div>
            `
              )
              .join('')}
          </div>

          <h3 class="guide-subsection-heading">Pro Finger Tricks & Ergonomics</h3>
          <div class="tips-grid">
            ${GUIDE_DATA.advanced.fingerTricks
              .map(
                (trick) => `
              <div class="tip-card">
                <h4 class="tip-title">${trick.title}</h4>
                <p class="tip-desc">${trick.text}</p>
              </div>
            `
              )
              .join('')}
          </div>
        </section>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderNotationGroup(
    groupTitle: string,
    items: { code: string; name: string; description: string; demoAlgorithm: string }[]
  ): string {
    return `
      <div class="notation-card-group">
        <h3 class="notation-group-title">${groupTitle}</h3>
        <div class="notation-items">
          ${items
            .map(
              (item) => `
            <div class="notation-item">
              <div class="notation-code-box">
                <code>${item.code}</code>
              </div>
              <div class="notation-text">
                <div class="notation-name">${item.name}</div>
                <div class="notation-desc">${item.description}</div>
              </div>
              <button class="btn btn-sm btn-outline btn-try-alg" data-alg="${item.demoAlgorithm}" title="Try ${item.code} on 3D cube">
                Try
              </button>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private renderStep(step: GuideStep): string {
    return `
      <div class="step-card" id="${step.id}">
        <div class="step-header">
          <div class="step-indicator">Step ${step.stepNumber}</div>
          <div class="step-header-text">
            <h3 class="step-title">${step.title}</h3>
            <div class="step-subtitle">${step.subtitle}</div>
          </div>
        </div>

        <div class="step-details-grid">
          <div class="step-detail-box">
            <h4 class="detail-label">Goal</h4>
            <p class="detail-text">${step.goal}</p>
          </div>
          <div class="step-detail-box">
            <h4 class="detail-label">Recognition & Positioning</h4>
            <p class="detail-text">${step.recognition}</p>
          </div>
        </div>

        ${
          step.tip
            ? `<div class="step-tip-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>${step.tip}</span>
              </div>`
            : ''
        }

        <div class="step-algorithms">
          <h4 class="algorithms-label">Step Algorithms</h4>
          <div class="algorithms-list">
            ${step.algorithms
              .map(
                (alg) => `
              <div class="alg-card">
                <div class="alg-meta">
                  <div class="alg-name">${alg.name}</div>
                  <div class="alg-notation"><code>${alg.notation}</code></div>
                </div>
                <p class="alg-desc">${alg.description}</p>
                <div class="alg-actions">
                  <button class="btn btn-sm btn-primary btn-try-alg" data-alg="${alg.notation}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Try it on the cube
                  </button>
                  <button class="btn btn-sm btn-secondary btn-copy-alg" data-alg="${alg.notation}" aria-label="Copy notation ${alg.notation}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
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

  private attachEventListeners(): void {
    // Try algorithm buttons
    const tryButtons = this.container.querySelectorAll<HTMLButtonElement>('.btn-try-alg');
    tryButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const alg = btn.getAttribute('data-alg');
        if (alg) {
          this.onTryAlgorithm(alg);
        }
      });
    });

    // Copy notation buttons
    const copyButtons = this.container.querySelectorAll<HTMLButtonElement>('.btn-copy-alg');
    copyButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const alg = btn.getAttribute('data-alg');
        if (alg) {
          try {
            await navigator.clipboard.writeText(alg);
            toast.show(`Copied: ${alg}`);
          } catch {
            toast.show(`Algorithm: ${alg}`);
          }
        }
      });
    });
  }
}
