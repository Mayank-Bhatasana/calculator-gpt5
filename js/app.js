import { nf } from './i18n.js';
import { read, write } from './storage.js';
import { History, renderHistory } from './history.js';
import { Memory } from './memory.js';
import { toast, setText, show, hide, setExpanded, announceResult } from './ui.js';
import { evaluateExpression } from './calculator-core.js';
import { BASES, parseByBase, formatByBase, bitAnd, bitOr, bitXor, bitNot, shl, shr } from './programmer.js';

const el = (id) => document.getElementById(id);

// State
const state = {
  mode: read('mode', 'basic'), // basic | scientific | programmer
  angle: read('angle', 'RAD'), // DEG | RAD
  theme: read('theme', 'system'), // system | light | dark | amoled
  expr: read('lastExpr', ''),
  result: 0,
  undo: [],
  redo: [],
  base: read('base', 'DEC'),
  wordSize: read('wordSize', 32),
  signed: read('signed', false),
};

const hist = new History();
const mem = new Memory();

// PWA install prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  el('install-btn').hidden = false;
});

document.addEventListener('DOMContentLoaded', init);

function init() {
  // Theme
  document.documentElement.setAttribute('data-theme', state.theme);

  // Hook topbar controls
  const modeSelect = el('mode-select');
  modeSelect.value = state.mode;
  modeSelect.addEventListener('change', () => setMode(modeSelect.value));

  const angleSelect = el('angle-select');
  angleSelect.value = state.angle;
  angleSelect.addEventListener('change', () => {
    state.angle = angleSelect.value;
    write('angle', state.angle);
  });

  const themeSelect = el('theme-select');
  themeSelect.value = state.theme;
  themeSelect.addEventListener('change', () => {
    state.theme = themeSelect.value;
    write('theme', state.theme);
    document.documentElement.setAttribute('data-theme', state.theme);
  });

  const baseSelect = el('base-select');
  const wordSizeSelect = el('wordsize-select');
  const signedToggle = el('signed-toggle');
  baseSelect.value = state.base;
  wordSizeSelect.value = String(state.wordSize);
  signedToggle.checked = state.signed;

  baseSelect.addEventListener('change', () => {
    state.base = baseSelect.value;
    write('base', state.base);
    applyProgrammerDigits();
  });
  wordSizeSelect.addEventListener('change', () => {
    state.wordSize = Number(wordSizeSelect.value);
    write('wordSize', state.wordSize);
  });
  signedToggle.addEventListener('change', () => {
    state.signed = signedToggle.checked;
    write('signed', state.signed);
  });

  // History
  const histBtn = el('history-toggle');
  const histPanel = el('history-panel');
  const histList = el('history-list');
  const histClear = el('history-clear');

  const showHistory = state.mode !== 'programmer' ? false : false; // start hidden
  if (showHistory) { show(histPanel); setExpanded(histBtn, true); } else { hide(histPanel); setExpanded(histBtn, false); }

  renderHistory(hist, histList);
  histBtn.addEventListener('click', () => {
    const isHidden = histPanel.hidden;
    if (isHidden) show(histPanel); else hide(histPanel);
    setExpanded(histBtn, isHidden);
  });
  histClear.addEventListener('click', () => {
    hist.clear();
    renderHistory(hist, histList);
    toast('History cleared');
  });
  histList.addEventListener('history:select', (e) => {
    const { expression, result } = e.detail.item;
    setExpression(expression);
    setResult(result);
  });

  // Memory indicator
  updateMemoryIndicator();

  // Memory buttons
  document.querySelectorAll('[data-mem]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-mem');
      handleMemory(action);
    });
  });

  // Keypads
  document.querySelectorAll('#basic-pad .key').forEach(k => k.addEventListener('click', onBasicKey));
  document.querySelectorAll('#scientific-pad .key').forEach(k => k.addEventListener('click', onScientificKey));
  document.querySelectorAll('#programmer-pad .key').forEach(k => k.addEventListener('click', onProgrammerKey));

  // Programmer-only digits should reflect base
  applyProgrammerDigits();

  // Restore expression
  setExpression(state.expr || '');
  updateDisplay();

  // Keyboard shortcuts
  window.addEventListener('keydown', onKeyDown);

  // PWA install button
  el('install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      toast('App installed');
      el('install-btn').hidden = true;
      deferredPrompt = null;
    }
  });

  // Mode
  setMode(state.mode);
}

function setMode(mode) {
  state.mode = mode;
  write('mode', state.mode);

  const sci = el('scientific-pad');
  const prog = el('programmer-pad');
  const progControls = el('programmer-controls');

  if (mode === 'basic') {
    hide(sci); hide(prog); hide(progControls);
  } else if (mode === 'scientific') {
    show(sci); hide(prog); hide(progControls);
  } else {
    hide(sci); show(prog); show(progControls);
  }
  el('mode-select').value = mode;
}

function updateDisplay() {
  const exprEl = el('expression');
  const resEl = el('result');
  setText(exprEl, state.expr || '');
  setText(resEl, formatNumber(state.result));
}

function formatNumber(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 'Error';
  // Limit display precision but keep internal numeric
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) return v.toExponential(8);
  return nf.format(Number.parseFloat(v.toPrecision(12)));
}

function setExpression(expr) {
  pushUndo();
  state.expr = expr;
  write('lastExpr', state.expr);
  updateDisplay();
}

function appendToExpression(chunk) {
  pushUndo();
  state.expr += chunk;
  write('lastExpr', state.expr);
  updateDisplay();
}

function backspace() {
  pushUndo();
  state.expr = state.expr.slice(0, -1);
  write('lastExpr', state.expr);
  updateDisplay();
}

function clearEntry() {
  pushUndo();
  // Clear current number token
  state.expr = state.expr.replace(/([0-9.]+|[A-Za-z]+)$|(\)$)/, '');
  write('lastExpr', state.expr);
  updateDisplay();
}

function allClear() {
  pushUndo();
  state.expr = '';
  state.result = 0;
  write('lastExpr', state.expr);
  updateDisplay();
}

function setResult(v) {
  state.result = v;
  announceResult(formatNumber(v));
}

function evaluate() {
  if (!state.expr.trim()) return;
  const { value, error } = evaluateExpression(state.expr, state.angle);
  if (error || value === null || !Number.isFinite(value)) {
    setResult(Number.NaN);
    toast('Error');
    return;
  }
  setResult(value);
  // Add to history
  hist.add(state.expr, formatNumber(value));
  renderHistory(hist, el('history-list'));
}

function onBasicKey(e) {
  const btn = e.currentTarget;
  const val = btn.getAttribute('data-val');
  const act = btn.getAttribute('data-act');
  const op = btn.getAttribute('data-op');

  if (val) {
    appendToExpression(val);
    return;
  }
  if (act) {
    switch (act) {
      case 'ac': allClear(); break;
      case 'ce': clearEntry(); break;
      case 'percent': appendToExpression('%'); break;
      case 'backspace': backspace(); break;
      case 'decimal': appendToExpression('.'); break;
      case 'sign': appendToExpression('(-1)*'); break; // simple sign toggle as multiply by -1
      case 'open-paren': appendToExpression('('); break;
      case 'close-paren': appendToExpression(')'); break;
      case 'equals': evaluate(); break;
    }
    return;
  }
  if (op) {
    switch (op) {
      case 'divide': appendToExpression('/'); break;
      case 'multiply': appendToExpression('*'); break;
      case 'minus': appendToExpression('-'); break;
      case 'plus': appendToExpression('+'); break;
      case 'pow': appendToExpression('^'); break;
    }
  }
}

function onScientificKey(e) {
  const btn = e.currentTarget;
  const fn = btn.getAttribute('data-fn');
  const c = btn.getAttribute('data-const');

  if (c) {
    appendToExpression(c);
    return;
  }
  if (fn) {
    // functions are single-argument; wrap as fn(...)
    if (fn === 'factorial') {
      appendToExpression('factorial(');
    } else {
      appendToExpression(fn + '(');
    }
    return;
  }
}

function onProgrammerKey(e) {
  const btn = e.currentTarget;
  const prog = btn.getAttribute('data-prog');
  const val = btn.getAttribute('data-val');

  if (val) {
    // Limit to allowed digits by base
    const allowed = {
      HEX: '0123456789ABCDEF',
      DEC: '0123456789',
      OCT: '01234567',
      BIN: '01',
    }[state.base];
    if (allowed.includes(val)) appendToExpression(val);
    else toast('Invalid for base');
    return;
  }

  if (prog) {
    // Apply bitwise on last two integers in expression if possible:
    try {
      const m = state.expr.match(/(-?\d+)\s*([+\-*/%^])?\s*(-?\d+)?$/);
      if (!m) throw new Error('no-op');
      let a = parseInt(m[1], 10);
      let b = m[3] !== undefined ? parseInt(m[3], 10) : 0;

      let result = 0;
      const ws = state.wordSize;

      switch (prog) {
        case 'and': result = bitAnd(a, b, ws); break;
        case 'or': result = bitOr(a, b, ws); break;
        case 'xor': result = bitXor(a, b, ws); break;
        case 'not': result = bitNot(a, ws); break;
        case 'shl': result = shl(a, b || 1, ws); break;
        case 'shr': result = shr(a, b || 1, ws); break;
      }

      setResult(result);
      appendToExpression(''); // trigger save
    } catch {
      toast('Bitwise op requires integers');
    }
  }
}

function applyProgrammerDigits() {
  // Hide hex digit buttons if base doesn't allow them
  const hexRow = document.querySelector('#programmer-pad .base-keys');
  if (!hexRow) return;
  if (state.base === 'HEX') hexRow.style.display = 'grid';
  else hexRow.style.display = 'none';
}

function onKeyDown(e) {
  // Keyboard shortcuts
  const k = e.key;

  // Mode toggles
  if (k.toLowerCase() === 's') { setMode('scientific'); el('mode-select').value = 'scientific'; return; }
  if (k.toLowerCase() === 'p') { setMode('programmer'); el('mode-select').value = 'programmer'; return; }
  if (k.toLowerCase() === 'b') { setMode('basic'); el('mode-select').value = 'basic'; return; }
  if (k.toLowerCase() === 'r') { state.angle = state.angle === 'RAD' ? 'DEG' : 'RAD'; write('angle', state.angle); el('angle-select').value = state.angle; toast('Angle: ' + state.angle); return; }
  if (k.toLowerCase() === 'h') { const panel = el('history-panel'); const vis = panel.hidden; if (vis) show(panel); else hide(panel); setExpanded(el('history-toggle'), vis); return; }
  if (k.toLowerCase() === 't') { cycleTheme(); return; }

  // Memory shortcuts: M, then +/-/R/C/S
  if (k.toLowerCase() === 'm') {
    // next key
    window.addEventListener('keydown', memHandler, { once: true });
    return;
  }

  if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'y') { redo(); return; }

  if ((k >= '0' && k <= '9') || k === '.') { appendToExpression(k); return; }
  if (k === '+') { appendToExpression('+'); return; }
  if (k === '-') { appendToExpression('-'); return; }
  if (k === '*') { appendToExpression('*'); return; }
  if (k === '/') { appendToExpression('/'); return; }
  if (k === '%') { appendToExpression('%'); return; }
  if (k === '(' || k === ')') { appendToExpression(k); return; }
  if (k === 'Enter' || k === '=') { e.preventDefault(); evaluate(); return; }
  if (k === 'Backspace') { e.preventDefault(); backspace(); return; }
  if (k === 'Delete') { e.preventDefault(); clearEntry(); return; }
  if (k === 'Escape') { allClear(); return; }
}

function memHandler(e) {
  const map = { '+': 'mplus', '-': 'mminus', 'r': 'mr', 'R': 'mr', 'c': 'mc', 'C': 'mc', 's': 'ms', 'S': 'ms' };
  const act = map[e.key];
  if (act) handleMemory(act);
}

function handleMemory(action) {
  switch (action) {
    case 'mc': mem.clear(); toast('Memory cleared'); break;
    case 'mr': setResult(mem.recall()); break;
    case 'ms': mem.set(state.result || 0); break;
    case 'mplus': mem.add(state.result || 0); break;
    case 'mminus': mem.sub(state.result || 0); break;
  }
  updateMemoryIndicator();
}

function updateMemoryIndicator() {
  const mi = el('memory-indicator');
  if (mem.has()) mi.classList.add('on'); else mi.classList.remove('on');
}

function cycleTheme() {
  const order = ['system','light','dark','amoled'];
  const i = order.indexOf(state.theme);
  const next = order[(i + 1) % order.length];
  state.theme = next;
  write('theme', state.theme);
  document.documentElement.setAttribute('data-theme', state.theme);
  el('theme-select').value = state.theme;
  toast('Theme: ' + next);
}

function pushUndo() {
  state.undo.push({ expr: state.expr });
  if (state.undo.length > 50) state.undo.shift();
  state.redo.length = 0;
}
function undo() {
  const last = state.undo.pop();
  if (!last) return;
  state.redo.push({ expr: state.expr });
  state.expr = last.expr;
  write('lastExpr', state.expr);
  updateDisplay();
}
function redo() {
  const last = state.redo.pop();
  if (!last) return;
  state.undo.push({ expr: state.expr });
  state.expr = last.expr;
  write('lastExpr', state.expr);
  updateDisplay();
}