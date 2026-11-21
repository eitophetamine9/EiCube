export type TabId = 'cube' | 'other' | 'learn';

export class TabManager {
  private activeTab: TabId = 'cube';
  private onTabChange?: (tab: TabId) => void;

  constructor(onTabChange?: (tab: TabId) => void) {
    this.onTabChange = onTabChange;
    this.setupListeners();
  }

  getActiveTab(): TabId {
    return this.activeTab;
  }

  setTab(tab: TabId): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;

    // Update buttons
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('[data-tab-target]');
    tabButtons.forEach((btn) => {
      const target = btn.getAttribute('data-tab-target');
      const isSelected = target === tab;
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      btn.classList.toggle('is-active', isSelected);
    });

    // Update panels
    const cubePanel = document.getElementById('tab-cube-panel');
    const otherPanel = document.getElementById('tab-other-panel');
    const learnPanel = document.getElementById('tab-learn-panel');

    if (cubePanel) {
      cubePanel.classList.toggle('is-active', tab === 'cube');
      cubePanel.setAttribute('aria-hidden', tab === 'cube' ? 'false' : 'true');
    }
    if (otherPanel) {
      otherPanel.classList.toggle('is-active', tab === 'other');
      otherPanel.setAttribute('aria-hidden', tab === 'other' ? 'false' : 'true');
    }
    if (learnPanel) {
      learnPanel.classList.toggle('is-active', tab === 'learn');
      learnPanel.setAttribute('aria-hidden', tab === 'learn' ? 'false' : 'true');
    }

    this.onTabChange?.(tab);
  }

  private setupListeners(): void {
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('[data-tab-target]');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab-target') as TabId;
        if (target) {
          this.setTab(target);
        }
      });
    });
  }
}
