import { THEME_STORAGE_KEY } from '@/lib/theme/constants'

export function ThemeHydrationScript() {
  const script = `
(() => {
  const key = '${THEME_STORAGE_KEY}';
  const valid = new Set(['light', 'dark', 'system']);
  const root = document.documentElement;

  let preference = 'dark';
  try {
    const raw = window.localStorage.getItem(key);
    if (raw && valid.has(raw)) preference = raw;
  } catch {}

  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolvedTheme = preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;

  root.setAttribute('data-theme', resolvedTheme);
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.style.colorScheme = resolvedTheme;
})();
`

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}

