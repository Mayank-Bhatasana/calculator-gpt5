import { read, write } from './storage.js';

const KEY = 'memory';

export class Memory {
  constructor() {
    this.value = read(KEY, null);
  }
  has() { return this.value !== null; }
  clear() { this.value = null; this.persist(); }
  recall() { return this.value ?? 0; }
  set(v) { this.value = v; this.persist(); }
  add(v) { this.value = (this.value ?? 0) + v; this.persist(); }
  sub(v) { this.value = (this.value ?? 0) - v; this.persist(); }
  persist() { write(KEY, this.value); }
}