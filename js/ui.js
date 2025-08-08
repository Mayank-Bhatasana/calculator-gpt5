/**
 * UI helpers: aria live updates, toast, focus management
 */
let toastTimer;

export function setText(el, text) {
  if (el) el.textContent = text;
}

export function show(el) {
  if (el) el.hidden = false;
}

export function hide(el) {
  if (el) el.hidden = true;
}

export function setExpanded(btn, expanded) {
  if (btn) btn.setAttribute('aria-expanded', String(expanded));
}

export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; el.textContent = ''; }, 2500);
}

export function announceResult(text) {
  const res = document.getElementById('result');
  if (res) {
    res.setAttribute('aria-live', 'polite');
    res.textContent = text;
  }
}