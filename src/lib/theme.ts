export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'ui_theme';

export function getStoredTheme(): ThemeMode {
  return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function setTheme(theme: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

/** Call once at app boot, before first render, to avoid a flash of the wrong theme. */
export function applyStoredTheme(): void {
  applyTheme(getStoredTheme());
}
