export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'eicube_theme_v1';
const LIGHT_THEME_COLOR = '#D7E6EC';
const DARK_THEME_COLOR = '#040A06';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Ignore storage read errors
  }
  return 'light';
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = mode;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', mode === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage write errors
  }

  window.dispatchEvent(new CustomEvent('eicube-themechange', { detail: { theme: mode } }));

  // Sync any toggle buttons on the page
  const buttons = document.querySelectorAll<HTMLElement>('[data-theme-toggle]');
  buttons.forEach((btn) => {
    const isDark = mode === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('title', isDark ? 'Switch to Daylight Theme' : 'Switch to Dark Studio Theme');
    btn.setAttribute('aria-label', isDark ? 'Switch to Daylight Theme' : 'Switch to Dark Studio Theme');
    const label = btn.querySelector('.theme-toggle-label');
    if (label) {
      label.textContent = isDark ? 'Light' : 'Dark';
    }
    const mobileLabel = btn.querySelector('.link-label');
    if (mobileLabel) {
      mobileLabel.textContent = isDark ? 'Switch to Daylight Theme' : 'Switch to Dark Theme';
    }
  });
}

export function toggleTheme(): ThemeMode {
  const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

export function initThemeControls(): ThemeMode {
  const initial = getStoredTheme();
  applyTheme(initial);

  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleTheme();
    });
  });

  return initial;
}
