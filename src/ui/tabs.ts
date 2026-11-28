export type TabId = 'home' | 'cube' | 'learn' | 'help';

const TAB_PANEL_MAP: Record<TabId, string> = {
  home: 'tab-home-panel',
  cube: 'tab-cube-panel',
  learn: 'tab-learn-panel',
  help: 'tab-help-panel',
};

export class TabManager {
  private activeTab: TabId = 'home';
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

    // Update panels uniformly
    (Object.keys(TAB_PANEL_MAP) as TabId[]).forEach((id) => {
      const panel = document.getElementById(TAB_PANEL_MAP[id]);
      if (panel) {
        const isCurrent = id === tab;
        panel.classList.toggle('is-active', isCurrent);
        panel.setAttribute('aria-hidden', isCurrent ? 'false' : 'true');
      }
    });

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
