/**
 * Very small i18n scaffolding for strings and formatters.
 */
export const strings = {
  en: {
    error_div0: 'Cannot divide by zero',
    error_malformed: 'Malformed expression',
    error_domain: 'Domain error',
    error_range: 'Range error',
    error_overflow: 'Overflow',
    cleared: 'Cleared',
    history_cleared: 'History cleared',
    memory_cleared: 'Memory cleared',
    installed_prompt: 'Install this app for offline use',
  }
};

export const locale = 'en';

export function t(key) {
  return strings[locale][key] ?? key;
}

export const nf = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 12,
  useGrouping: true,
});