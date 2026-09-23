// Currency resolution and display formatting. This module only ever changes
// what visitors *see* — it never touches checkout links or payment amounts.
export const BASE_CURRENCY = 'USD';

// Acréscimo de 8,76% que a plataforma de pagamento aplica na conversão
// cambial. Somado uma única vez, depois da conversão, para que o preço
// exibido fique próximo do valor cobrado no checkout.
export const CHECKOUT_FX_MARKUP = 1.0876;

const COUNTRY_CURRENCY_MAP = {
  BR: 'BRL',
  US: 'USD', PR: 'USD', EC: 'USD', SV: 'USD',
  GB: 'GBP',
  MX: 'MXN',
  AR: 'ARS',
  CO: 'COP',
  CL: 'CLP',
  CA: 'CAD',
  AU: 'AUD',
  JP: 'JPY',
  CH: 'CHF', LI: 'CHF',
  // Eurozone
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR',
  AT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SI: 'EUR', SK: 'EUR',
  EE: 'EUR', LV: 'EUR', LT: 'EUR', CY: 'EUR', MT: 'EUR', HR: 'EUR',
  PE: 'PEN', UY: 'UYU', PY: 'PYG', BO: 'BOB', VE: 'VES', CR: 'CRC',
  GT: 'GTQ', PA: 'PAB', DO: 'DOP', HN: 'HNL', NI: 'NIO',
  NZ: 'NZD', IN: 'INR', ZA: 'ZAR', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN'
};

const LANGUAGE_LOCALE_MAP = {
  pt: 'pt-BR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT'
};

export function currencyForCountry(countryCode) {
  if (!countryCode) return null;
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || null;
}

export function localeForLanguage(lang) {
  return LANGUAGE_LOCALE_MAP[lang] || 'en-US';
}

export function convertFromUsd(amountUsd, currencyCode, rates) {
  if (!currencyCode || currencyCode === BASE_CURRENCY) return amountUsd;
  const rate = rates && rates[currencyCode];
  if (!rate || typeof rate !== 'number') return null;
  return amountUsd * rate * CHECKOUT_FX_MARKUP;
}

export function formatCurrency(amount, currencyCode, locale) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return null;
  }
}

// Updates every [data-price-usd] element on the page. Elements are left
// untouched (original base-currency text stays visible) whenever the
// conversion or formatting can't be completed — the page never ends up
// without a price.
export function applyPrices({ currencyCode, rates, locale }) {
  if (!currencyCode || currencyCode === BASE_CURRENCY) return false;

  const priceEls = document.querySelectorAll('[data-price-usd]');
  let appliedAny = false;

  priceEls.forEach((el) => {
    const usd = parseFloat(el.getAttribute('data-price-usd'));
    if (Number.isNaN(usd)) return;
    const converted = convertFromUsd(usd, currencyCode, rates);
    if (converted == null) return;
    const formatted = formatCurrency(converted, currencyCode, locale);
    if (!formatted) return;
    el.textContent = formatted;
    appliedAny = true;
  });

  return appliedAny;
}
