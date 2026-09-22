// Language detection, dictionary loading and DOM translation.
export const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'fr', 'de', 'it'];
export const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'atlas_lang';

// Fallback only — never the primary signal (browser language always wins when supported).
const COUNTRY_LANGUAGE_MAP = {
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', UY: 'es', PY: 'es', BO: 'es', GT: 'es', CR: 'es', PA: 'es', DO: 'es', HN: 'es', SV: 'es', NI: 'es',
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr',
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  IT: 'it', SM: 'it', VA: 'it',
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', IN: 'en', ZA: 'en'
};

const dictionaryCache = new Map();

export function getStoredLanguage() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage unavailable (private mode, disabled storage) — silently ignore.
  }
}

export function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return null;
  const candidates = (navigator.languages && navigator.languages.length)
    ? navigator.languages
    : [navigator.language || navigator.userLanguage].filter(Boolean);
  for (const raw of candidates) {
    const code = String(raw).slice(0, 2).toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(code)) return code;
  }
  return null;
}

export function languageFromCountry(countryCode) {
  if (!countryCode) return null;
  return COUNTRY_LANGUAGE_MAP[countryCode.toUpperCase()] || null;
}

// Resolves language without any network access (manual choice or browser setting).
export function resolveInitialLanguage() {
  return getStoredLanguage() || detectBrowserLanguage();
}

export async function loadDictionary(lang) {
  if (dictionaryCache.has(lang)) return dictionaryCache.get(lang);
  const response = await fetch(`/i18n/locales/${lang}.json`, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Failed to load dictionary: ${lang}`);
  const data = await response.json();
  dictionaryCache.set(lang, data);
  return data;
}

export function applyTranslations(dict) {
  if (!dict) return;

  if (dict['meta.lang']) document.documentElement.setAttribute('lang', dict['meta.lang']);
  if (dict['meta.title']) document.title = dict['meta.title'];
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && dict['meta.description']) {
    metaDescription.setAttribute('content', dict['meta.description']);
  }

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] != null) el.textContent = dict[key];
  });

  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key] != null) el.innerHTML = dict[key];
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const spec = el.getAttribute('data-i18n-attr');
    spec.split('|').forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (attr && key && dict[key] != null) el.setAttribute(attr.trim(), dict[key]);
    });
  });
}
