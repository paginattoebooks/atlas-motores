// Entry point: wires language + currency together and reveals the page once
// both are ready (or a safety timeout elapses, whichever comes first) so
// visitors never see a flash of one language/currency swapped for another.
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  resolveInitialLanguage,
  languageFromCountry,
  loadDictionary,
  applyTranslations,
  storeLanguage
} from './modules/language.js';
import { detectCountry } from './modules/geolocation.js';
import { currencyForCountry, localeForLanguage, applyPrices } from './modules/currency.js';
import { getRates } from './modules/exchange-rates.js';

const REVEAL_TIMEOUT_MS = 700;

let revealed = false;
function reveal() {
  if (revealed) return;
  revealed = true;
  document.documentElement.removeAttribute('data-i18n-loading');
}
setTimeout(reveal, REVEAL_TIMEOUT_MS);

// Kept so a manual language change can reformat already-converted prices
// with the new locale without re-fetching rates or geo data.
const state = { lang: DEFAULT_LANGUAGE, currencyCode: null, rates: null };

async function applyLanguage(lang, dictOverride) {
  const dict = dictOverride || await loadDictionary(lang).catch(() => null);
  if (!dict) {
    if (lang !== DEFAULT_LANGUAGE) return applyLanguage(DEFAULT_LANGUAGE);
    return null;
  }
  applyTranslations(dict);
  state.lang = lang;
  if (state.currencyCode) {
    applyPrices({ currencyCode: state.currencyCode, rates: state.rates, locale: localeForLanguage(lang) });
  }
  return dict;
}

function setupLanguageSelector(activeLang) {
  const select = document.getElementById('langSelect');
  if (!select) return;
  select.value = activeLang;
  select.addEventListener('change', (event) => {
    const lang = event.target.value;
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    storeLanguage(lang);
    applyLanguage(lang);
  });
}

async function init() {
  const countryPromise = detectCountry();
  const ratesPromise = getRates();

  let lang = resolveInitialLanguage();
  if (!lang) {
    const country = await countryPromise;
    lang = languageFromCountry(country) || DEFAULT_LANGUAGE;
  }

  const [dict, country, ratesPayload] = await Promise.all([
    loadDictionary(lang).catch(() => null),
    countryPromise,
    ratesPromise
  ]);

  await applyLanguage(lang, dict);
  setupLanguageSelector(state.lang);

  const currencyCode = currencyForCountry(country);
  if (currencyCode && ratesPayload && ratesPayload.rates) {
    state.currencyCode = currencyCode;
    state.rates = ratesPayload.rates;
    applyPrices({ currencyCode, rates: ratesPayload.rates, locale: localeForLanguage(state.lang) });
  }
  // No country match, no rates, or conversion failed: original base-currency
  // prices already rendered in the HTML remain untouched — safe fallback.

  reveal();
}

init().catch(reveal);
