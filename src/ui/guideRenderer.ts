import { GUIDE_DATA, GuideStep, ADVANCED_SPEEDCUBING_DATA } from '../content/guideData';
import { OTHER_CUBES_GUIDES } from '../content/otherCubesData';
import { PUZZLE_VIDEOS, VideoTutorial } from '../content/videoData';
import { MOVES_GLOSSARY, MoveGlossaryItem } from '../content/movesGlossaryData';
import { toast } from './toast';

export type GuidePuzzleCategory = '3x3' | '2x2' | '4x4' | 'pyraminx';

function resolveGuideGif(notationOrCode: string, puzzle: GuidePuzzleCategory): MoveGlossaryItem | null {
  const cleanTokens = notationOrCode
    .replace(/[()+]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/2$/, ''))
    .filter(Boolean);

  const preferredPool =
    puzzle === 'pyraminx'
      ? MOVES_GLOSSARY.filter((m) => m.category === 'pyraminx')
      : puzzle === '4x4'
        ? MOVES_GLOSSARY.filter((m) => m.category !== 'pyraminx')
        : MOVES_GLOSSARY.filter((m) => m.category !== 'pyraminx' && m.category !== 'inner4x4');

  for (const tok of cleanTokens) {
    const exact = preferredPool.find((m) => m.notation === tok);
    if (exact) return exact;
  }

  // Fallback to matching base letter (e.g. R' -> R)
  for (const tok of cleanTokens) {
    const base = tok.replace("'", '');
    const match = preferredPool.find((m) => m.notation === base);
    if (match) return match;
  }

  return preferredPool[0] || MOVES_GLOSSARY[0] || null;
}

function renderInlineGifPreview(notationOrCode: string, puzzle: GuidePuzzleCategory): string {
  const item = resolveGuideGif(notationOrCode, puzzle);
  if (!item) return '';
  return `
    <div class="guide-inline-gif-box" title="${item.title} (${item.direction})">
      <img class="guide-inline-gif" src="${item.gifPath}" alt="${item.notation} turn visual animation" loading="lazy" />
      <span class="guide-inline-gif-tag">${item.notation}</span>
    </div>
  `;
}

export class GuideRenderer {
  private container: HTMLElement;
  private currentCategory: GuidePuzzleCategory = '3x3';
  private onTryAlgorithm: (notation: string, category: GuidePuzzleCategory) => void;

  constructor(
    container: HTMLElement,
    onTryAlgorithm: (notation: string, category: GuidePuzzleCategory) => void
  ) {
    this.container = container;
    this.onTryAlgorithm = onTryAlgorithm;
    this.render();
  }

  setCategory(cat: GuidePuzzleCategory): void {
    if (this.currentCategory === cat) return;
    this.currentCategory = cat;
    this.render();
  }

  private render(): void {
    const videos = PUZZLE_VIDEOS[this.currentCategory] || [];

    this.container.innerHTML = `
      <div class="guide-wrapper">
        <header class="guide-header">
          <div class="guide-header-badge">Interactive Video & Written Guides</div>
          <h1 class="guide-title">Learn Puzzles: Master Every Method</h1>
          <p class="guide-subtitle">
            Watch verified video tutorials and master step-by-step layer methods for 3×3, 2×2, 4×4, and Pyraminx.
          </p>

          <!-- Guide Puzzle Selector Tabs -->
          <div class="guide-tabs-bar" role="tablist">
            <button class="btn-guide-tab ${this.currentCategory === '3x3' ? 'is-active' : ''}" data-guide-cat="3x3">
              <span class="guide-tab-icon">3×3</span>
              <span>Rubik's Cube</span>
            </button>
            <button class="btn-guide-tab ${this.currentCategory === '2x2' ? 'is-active' : ''}" data-guide-cat="2x2">
              <span class="guide-tab-icon">2×2</span>
              <span>Pocket Cube</span>
            </button>
            <button class="btn-guide-tab ${this.currentCategory === '4x4' ? 'is-active' : ''}" data-guide-cat="4x4">
              <span class="guide-tab-icon">4×4</span>
              <span>Rubik's Revenge</span>
            </button>
            <button class="btn-guide-tab ${this.currentCategory === 'pyraminx' ? 'is-active' : ''}" data-guide-cat="pyraminx">
              <span class="guide-tab-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polygon points="12 3 3 20 21 20"></polygon>
                </svg>
              </span>
              <span>Pyraminx</span>
            </button>
          </div>
        </header>

        <!-- YouTube Video Tutorials Section -->
        <section class="guide-section video-tutorials-section">
          <div class="section-heading-row">
            <h2 class="guide-section-heading">
              <span class="guide-section-num">VID</span>
              YouTube Video Tutorials
            </h2>
            <span class="video-badge-pill">Curated High-Definition</span>
          </div>

          <div class="video-tutorials-grid">
            ${videos.map((vid) => this.renderVideoCard(vid)).join('')}
          </div>
        </section>

        <!-- Dynamic Puzzle Written Step Guide -->
        ${this.renderPuzzleContent()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderVideoCard(vid: VideoTutorial): string {
    return `
      <div class="video-tutorial-card">
        <div class="video-embed-container">
          <iframe
            src="https://www.youtube-nocookie.com/embed/${vid.videoId}?rel=0"
            title="${vid.title}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy"
          ></iframe>
        </div>
        <div class="video-info-box">
          <div class="video-meta-top">
            <span class="video-creator">${vid.creator}</span>
            <span class="video-views">${vid.views}</span>
            <span class="video-duration">${vid.duration}</span>
          </div>
          <h3 class="video-title">${vid.title}</h3>
          <p class="video-desc">${vid.description}</p>

          <!-- Chapters -->
          <div class="video-chapters-box">
            <div class="chapters-label">Video Chapters:</div>
            <div class="chapters-pills">
              ${vid.chapters
                .map(
                  (ch) => `
                <a href="https://www.youtube.com/watch?v=${vid.videoId}&t=${ch.seconds}s" target="_blank" rel="noopener noreferrer" class="chapter-pill" title="Jump to ${ch.title} on YouTube">
                  <span class="chapter-time">${ch.time}</span>
                  <span class="chapter-name">${ch.title}</span>
                </a>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderPuzzleContent(): string {
    if (this.currentCategory === '3x3') {
      return `
        <!-- Notation Reference Section -->
        <section class="guide-section" id="notation-section">
          <h2 class="guide-section-heading">
            <span class="guide-section-num">00</span>
            3×3 Notation Reference
          </h2>
          <p class="guide-section-desc">
            Standard WCA notation assigns a letter to each layer. Capital letters mean a 90° clockwise turn. An apostrophe (<strong>'</strong>) indicates prime (counter-clockwise), and <strong>2</strong> indicates a 180° double turn.
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
            3×3 Beginner Layer-by-Layer Method (7 Steps)
          </h2>
          <div class="steps-container">
            ${GUIDE_DATA.steps.map((step) => this.render3x3Step(step)).join('')}
          </div>
        </section>

        <!-- Advanced / CFOP & Finger Tricks -->
        <section class="guide-section" id="advanced-section">
          <h2 class="guide-section-heading">
            <span class="guide-section-num">02</span>
            ${GUIDE_DATA.advanced.cfopTitle}
          </h2>
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
        </section>

        <!-- Speedcubing Algorithms Section -->
        ${this.renderSpeedcubingSection()}
      `;
    }

    // Other puzzles: 2x2, 4x4, Pyraminx
    const guide = OTHER_CUBES_GUIDES[this.currentCategory];
    if (!guide) return '';

    return `
      <section class="guide-section">
        <h2 class="guide-section-heading">
          <span class="guide-section-num">01</span>
          ${guide.name} Step-by-Step Guide
        </h2>
        <p class="guide-section-desc">${guide.summary}</p>
        <div class="steps-container">
          ${guide.steps
            .map(
              (step, idx) => `
            <div class="step-card">
              <div class="step-header">
                <div class="step-indicator">Step ${idx + 1}</div>
                <div class="step-header-text">
                  <h3 class="step-title">${step.title}</h3>
                  <div class="step-subtitle">${step.description}</div>
                </div>
              </div>

              <div class="step-details-grid">
                <div class="step-detail-box">
                  <h4 class="detail-label">Recognition & Positioning</h4>
                  <p class="detail-text">${step.recognition}</p>
                </div>
              </div>

              <div class="step-algorithms">
                <h4 class="algorithms-label">Step Algorithms</h4>
                <div class="algorithms-list">
                  ${step.algorithms
                    .map(
                      (alg) => `
                    <div class="alg-card">
                      ${renderInlineGifPreview(alg.notation, this.currentCategory)}
                      <div class="alg-meta">
                        <div class="alg-name">${alg.name}</div>
                        <div class="alg-notation"><code>${alg.notation}</code></div>
                      </div>
                      <p class="alg-desc">${alg.desc}</p>
                      <div class="alg-actions">
                        <button class="btn btn-sm btn-primary btn-try-alg" data-alg="${alg.notation}">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                          Try it on puzzle
                        </button>
                        <button class="btn btn-sm btn-secondary btn-copy-alg" data-alg="${alg.notation}">
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
          `
            )
            .join('')}
        </div>
      </section>

      <!-- Speedcubing Algorithms Section -->
      ${this.renderSpeedcubingSection()}
    `;
  }

  private renderSpeedcubingSection(): string {
    const data = ADVANCED_SPEEDCUBING_DATA[this.currentCategory];
    if (!data) return '';

    return `
      <!-- Advanced Speedcubing Algorithms Section -->
      <section class="guide-section speedcubing-algorithms-section" id="speedcubing-section">
        <div class="section-heading-row">
          <h2 class="guide-section-heading">
            <span class="guide-section-num">SPEED</span>
            ${data.title}
          </h2>
          <span class="speedcube-method-badge">${data.methodName}</span>
        </div>
        <p class="guide-section-desc">${data.subtitle}</p>

        <!-- Pro Speedcubing Video Overview -->
        <div class="speedcube-video-card-wrap">
          ${this.renderVideoCard(data.video)}
        </div>

        <div class="speedcube-algs-grid">
          ${data.algorithms
            .map(
              (alg) => `
            <div class="speedcube-alg-card">
              <div class="speedcube-card-header">
                ${renderInlineGifPreview(alg.notation, this.currentCategory)}
                <div class="speedcube-card-titles">
                  <span class="speedcube-category-chip">${alg.category}</span>
                  <h3 class="speedcube-alg-name">${alg.name}</h3>
                </div>
              </div>
              <div class="speedcube-notation-box">
                <code>${alg.notation}</code>
              </div>
              ${
                alg.recognition
                  ? `<div class="speedcube-recognition">
                      <span class="rec-label">Recognition:</span> ${alg.recognition}
                    </div>`
                  : ''
              }
              <p class="speedcube-alg-desc">${alg.description}</p>
              <div class="alg-actions">
                <button class="btn btn-sm btn-primary btn-try-alg" data-alg="${alg.notation}" title="Execute on 3D puzzle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Try on puzzle
                </button>
                <button class="btn btn-sm btn-secondary btn-copy-alg" data-alg="${alg.notation}" title="Copy notation">
                  Copy
                </button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </section>
    `;
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
              ${renderInlineGifPreview(item.demoAlgorithm || item.code, '3x3')}
              <div class="notation-code-box">
                <code>${item.code}</code>
              </div>
              <div class="notation-text">
                <div class="notation-name">${item.name}</div>
                <div class="notation-desc">${item.description}</div>
              </div>
              <button class="btn btn-sm btn-outline btn-try-alg" data-alg="${item.demoAlgorithm}">
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

  private render3x3Step(step: GuideStep): string {
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
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
                ${renderInlineGifPreview(alg.notation, '3x3')}
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
                  <button class="btn btn-sm btn-secondary btn-copy-alg" data-alg="${alg.notation}">
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
    // Guide Category Tabs
    const catTabs = this.container.querySelectorAll<HTMLButtonElement>('[data-guide-cat]');
    catTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const cat = tab.getAttribute('data-guide-cat') as GuidePuzzleCategory;
        if (cat) {
          this.setCategory(cat);
        }
      });
    });

    // Try algorithm buttons
    const tryButtons = this.container.querySelectorAll<HTMLButtonElement>('.btn-try-alg');
    tryButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const alg = btn.getAttribute('data-alg');
        if (alg) {
          this.onTryAlgorithm(alg, this.currentCategory);
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
