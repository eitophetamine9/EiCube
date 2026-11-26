import {
  MOVES_GLOSSARY,
  MOVE_CATEGORIES,
  MoveCategoryId,
  MoveGlossaryItem,
} from './content/movesGlossaryData';
import { initThemeControls } from './ui/theme';
import { MatrixBackdrop } from './ui/matrixBackdrop';

document.addEventListener('DOMContentLoaded', () => {
  initThemeControls();
  new MatrixBackdrop();

  const mount = document.getElementById('moves-glossary-mount');
  if (!mount) return;

  const params = new URLSearchParams(window.location.search);
  const puzzleParam = params.get('puzzle');

  let activeFilter: MoveCategoryId | 'all' = 'all';
  if (puzzleParam === 'pyraminx') {
    activeFilter = 'pyraminx';
  } else if (puzzleParam === '4x4') {
    activeFilter = 'inner4x4';
  }

  let searchQuery = '';

  const renderPage = () => {
    const filteredCategories =
      activeFilter === 'all'
        ? MOVE_CATEGORIES
        : MOVE_CATEGORIES.filter((cat) => cat.id === activeFilter);

    const q = searchQuery.trim().toLowerCase();

    mount.innerHTML = `
      <div class="moves-page-wrapper">
        <header class="guide-header">
          <div class="guide-header-badge">Animated WCA Notation Reference</div>
          <h1 class="guide-title">Every Turn, Explained in Motion</h1>
          <p class="guide-subtitle">
            Watch the exact layers each symbol turns across 3x3, 4x4, and Pyraminx before jumping back to practice.
          </p>

          <div class="moves-glossary-toolbar">
            <div class="guide-tabs-bar" role="tablist" aria-label="Filter moves by category">
              <button class="btn-guide-tab ${activeFilter === 'all' ? 'is-active' : ''}" data-cat="all">
                All Moves (64)
              </button>
              ${MOVE_CATEGORIES.map(
                (cat) => `
                <button class="btn-guide-tab ${activeFilter === cat.id ? 'is-active' : ''}" data-cat="${cat.id}">
                  ${cat.id === 'faces' ? 'Faces' : cat.id === 'slices' ? 'Slices (M, E, S)' : cat.id === 'rotations' ? 'Rotations (x, y, z)' : cat.id === 'wide' ? 'Wide (Rw..Bw)' : cat.id === 'inner4x4' ? '4x4 Inner (2R..2B)' : 'Pyraminx'}
                </button>
              `
              ).join('')}
            </div>

            <div class="moves-search-wrap">
              <label for="moves-search-input" class="sr-only">Filter moves by notation or name</label>
              <input
                type="search"
                id="moves-search-input"
                class="moves-search-input"
                placeholder="Filter notation (e.g. M', 2R, Rw)..."
                value="${searchQuery.replace(/"/g, '&quot;')}"
              />
            </div>
          </div>
        </header>

        <div id="moves-categories-container" class="moves-categories-container">
          ${renderSections(filteredCategories, q)}
        </div>
      </div>
    `;

    attachListeners();
  };

  const renderSections = (categories: typeof MOVE_CATEGORIES, query: string): string => {
    let html = '';
    let totalShown = 0;

    for (const cat of categories) {
      const items = MOVES_GLOSSARY.filter((item) => {
        if (item.category !== cat.id) return false;
        if (!query) return true;
        return (
          item.notation.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query) ||
          item.layersDescription.toLowerCase().includes(query) ||
          item.puzzleTag.toLowerCase().includes(query)
        );
      });

      if (items.length === 0) continue;
      totalShown += items.length;

      html += `
        <section class="guide-section moves-glossary-section" id="cat-${cat.id}">
          <div class="section-heading-row">
            <h2 class="guide-section-heading">
              <span class="guide-section-num">${items.length}</span>
              ${cat.title}
            </h2>
            <span class="video-badge-pill">${cat.badge}</span>
          </div>
          <p class="guide-section-desc">${cat.summary}</p>

          <div class="moves-gif-grid">
            ${items.map((item) => renderMoveCard(item)).join('')}
          </div>
        </section>
      `;
    }

    if (totalShown === 0) {
      return `
        <div class="moves-empty-state">
          <p>No moves matched "<strong>${query.replace(/</g, '&lt;')}</strong>".</p>
          <button id="btn-clear-move-search" class="btn btn-secondary">Clear Filter</button>
        </div>
      `;
    }

    return html;
  };

  const renderMoveCard = (item: MoveGlossaryItem): string => {
    const encodedTry = encodeURIComponent(item.notation);
    return `
      <article class="move-gif-card">
        <div class="move-gif-stage">
          <img
            src="${item.gifPath}"
            alt="Animated 3D demonstration of move ${item.notation} (${item.title})"
            width="200"
            height="200"
            loading="lazy"
          />
          <span class="move-gif-puzzle-pill">${item.puzzleTag}</span>
        </div>

        <div class="move-gif-body">
          <div class="move-gif-header">
            <span class="move-gif-notation ${item.isPrime ? 'is-prime' : ''}">${item.notation}</span>
            <div class="move-gif-titles">
              <h3 class="move-gif-title">${item.title}</h3>
              <span class="move-gif-dir">${item.direction}</span>
            </div>
          </div>

          <p class="move-gif-desc">${item.layersDescription}</p>

          <div class="speedcube-recognition">
            <span class="rec-label">Tip:</span> ${item.speedcubingTip}
          </div>

          <div class="move-gif-actions">
            <a href="./index.html?puzzle=${item.tryPuzzle}&try=${encodedTry}" class="btn btn-sm btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Try ${item.notation} in 3D
            </a>
          </div>
        </div>
      </article>
    `;
  };

  const attachListeners = () => {
    mount.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat') as MoveCategoryId | 'all';
        if (cat && cat !== activeFilter) {
          activeFilter = cat;
          renderPage();
        }
      });
    });

    const input = mount.querySelector<HTMLInputElement>('#moves-search-input');
    input?.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value;
      const container = mount.querySelector<HTMLElement>('#moves-categories-container');
      if (container) {
        const filteredCategories =
          activeFilter === 'all'
            ? MOVE_CATEGORIES
            : MOVE_CATEGORIES.filter((cat) => cat.id === activeFilter);
        container.innerHTML = renderSections(filteredCategories, searchQuery.trim().toLowerCase());
        container.querySelector('#btn-clear-move-search')?.addEventListener('click', () => {
          searchQuery = '';
          renderPage();
        });
      }
    });
  };

  renderPage();
});
