/**
 * Safe localStorage wrapper with namespacing and JSON parsing.
 */
const NAMESPACE = 'calc:v1:';

function getKey(key) {
  return `${NAMESPACE}${key}`;
}

export function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(getKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(getKey(key), JSON.stringify(value));
  } catch {
    // ignore quota or serialization issues
  }
}

export function remove(key) {
  try { localStorage.removeItem(getKey(key)); } catch {}
}