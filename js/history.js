import { read, write } from './storage.js';

const KEY = 'history';
const MAX_ITEMS = 100;

export class History {
  constructor() {
    this.items = read(KEY, []);
  }

  add(expression, result) {
    const entry = { expression, result, ts: Date.now() };
    this.items.unshift(entry);
    if (this.items.length > MAX_ITEMS) this.items.length = MAX_ITEMS;
    this.persist();
  }

  clear() {
    this.items = [];
    this.persist();
  }

  removeAt(index) {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);
      this.persist();
    }
  }

  persist() {
    write(KEY, this.items);
  }
}

export function renderHistory(hist, listEl) {
  listEl.innerHTML = '';
  hist.items.forEach((it, idx) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.tabIndex = 0;
    li.innerHTML = `<div class="expr">${it.expression}</div><div class="res">${it.result}</div>`;
    li.addEventListener('click', () => {
      listEl.dispatchEvent(new CustomEvent('history:select', { detail: { index: idx, item: it } }));
    });
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        li.click();
      }
      if (e.key === 'Delete') {
        hist.removeAt(idx);
        renderHistory(hist, listEl);
      }
    });
    listEl.appendChild(li);
  });
}