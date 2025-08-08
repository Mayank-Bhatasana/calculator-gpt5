# Calculator (HTML/CSS/JS)

A full‑featured calculator web app with Basic, Scientific, and Programmer modes, history and memory persistence, keyboard shortcuts, multiple themes, and offline support via PWA. No frameworks, no build steps — just open `index.html`.

## Features
- Basic: +, −, ×, ÷, %, (), ±, decimal, CE, AC, ⌫
- Scientific: sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, ln, log10, exp, 10^x, e^x, x^y (^), x², x³, √, ∛, 1/x, |x|, floor, ceil, n!
- DEG/RAD toggle (persisted)
- Programmer: HEX/DEC/OCT/BIN, 8/16/32/64-bit with two’s complement, signed/unsigned, AND/OR/XOR/NOT/SHL/SHR
- History (100 items) with reuse and delete; Memory (MC/MR/M+/M−/MS) — both persisted
- Undo/Redo (50 steps)
- Themes: System, Light, Dark, AMOLED (WCAG‑conscious)
- Accessibility: semantic markup, ARIA live updates, keyboard navigation
- Keyboard: 
  - Digits 0–9, ., + - * / %, (), Enter/= for equals
  - Backspace (delete char), Delete (CE), Esc (AC)
  - R (toggle RAD/DEG), H (toggle History), S (Scientific), P (Programmer), B (Basic), T (cycle themes)
  - Memory: press M then +/−/R/C/S
- PWA: manifest + service worker (cache‑first app shell)

## Run locally
- Clone or download this repository
- Open `index.html` in a modern browser
- Optional: serve via a simple static server to enable service worker on localhost

## GitHub Pages
- Settings → Pages → Deploy from branch → `main` → `/ (root)`

## Screenshots
You can add screenshots of the app here.

## Tests
Open `tests/tests.html` in a browser to run basic parser/evaluator tests.

## Notes
- Icons at `pwa/icons/icon-192.png` and `icon-512.png` are referenced by the manifest. Add your own PNGs to avoid warnings when installing the PWA.
- For 64‑bit programmer ops, results larger than 2^53−1 are approximated in Number for UI purposes.
