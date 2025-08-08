/**
 * Tokenizer + Shunting Yard + RPN evaluator for basic/scientific calculator.
 * - Supports functions, constants, unary minus, parentheses, and ^ exponent.
 * - Avoids eval().
 */

const TWO_PI = Math.PI * 2;

const OPERATORS = {
  '+': { prec: 2, assoc: 'L', args: 2, fn: (a,b) => a + b },
  '-': { prec: 2, assoc: 'L', args: 2, fn: (a,b) => a - b },
  '*': { prec: 3, assoc: 'L', args: 2, fn: (a,b) => a * b },
  '/': { prec: 3, assoc: 'L', args: 2, fn: (a,b) => b === 0 ? NaN : a / b },
  '%': { prec: 3, assoc: 'L', args: 2, fn: (a,b) => a % b },
  '^': { prec: 4, assoc: 'R', args: 2, fn: (a,b) => Math.pow(a, b) },
  'u-': { prec: 5, assoc: 'R', args: 1, fn: (a) => -a }, // unary minus
};

const FUNCTIONS = {
  sin: (x, m) => Math.sin(m === 'DEG' ? toRad(x) : x),
  cos: (x, m) => Math.cos(m === 'DEG' ? toRad(x) : x),
  tan: (x, m) => Math.tan(m === 'DEG' ? toRad(x) : x),
  asin: (x) => Math.asin(x),
  acos: (x) => Math.acos(x),
  atan: (x) => Math.atan(x),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  ln: (x) => Math.log(x),
  log10: (x) => Math.log10(x),
  exp: (x) => Math.exp(x),
  tenpow: (x) => Math.pow(10, x),
  epow: (x) => Math.pow(Math.E, x),
  square: (x) => x * x,
  cube: (x) => x * x * x,
  sqrt: (x) => Math.sqrt(x),
  cbrt: (x) => Math.cbrt(x),
  inv: (x) => 1 / x,
  abs: (x) => Math.abs(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  factorial: (x) => factorial(x),
};

const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
};

function toRad(deg) { return deg * Math.PI / 180; }

function factorial(n) {
  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) throw new Error('factorial-domain');
  if (n > 170) throw new Error('factorial-overflow'); // beyond ~1.197e+308 double
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/**
 * Tokenize expression string into numbers, names, operators, and parentheses.
 */
export function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];

    if (/\s/.test(ch)) { i++; continue; }

    if (/[0-9.]/.test(ch)) {
      let num = ch; i++;
      while (i < expr.length && /[0-9._eE+-]/.test(expr[i])) {
        const c = expr[i];
        num += c; i++;
        // stop +/- scanning if not part of exponent
        if ((c === '+' || c === '-') && !(num.endsWith('e+') || num.endsWith('e-') || num.endsWith('E+') || num.endsWith('E-'))) {
          // backtrack one char
          num = num.slice(0, -1);
          i--;
          break;
        }
      }
      const value = Number(num.replaceAll('_', ''));
      if (!Number.isFinite(value)) throw new Error('malformed-number');
      tokens.push({ type: 'num', value });
      continue;
    }

    if (/[A-Za-z]/.test(ch)) {
      let name = ch; i++;
      while (i < expr.length && /[A-Za-z0-9_]/.test(expr[i])) { name += expr[i++]; }
      tokens.push({ type: 'name', value: name });
      continue;
    }

    if ('+-*/%^(),'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++; continue;
    }

    throw new Error('unexpected-char');
  }
  return tokens;
}

/**
 * Convert tokens to Reverse Polish Notation using Shunting Yard.
 */
export function toRPN(tokens, angleMode = 'RAD') {
  const out = [];
  const stack = [];

  let prevType = 'start';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (t.type === 'num') {
      out.push(t);
      prevType = 'num';
      continue;
    }

    if (t.type === 'name') {
      // function or constant
      const name = t.value;
      if (name in FUNCTIONS) {
        stack.push({ type: 'func', value: name });
      } else if (name in CONSTANTS) {
        out.push({ type: 'num', value: CONSTANTS[name] });
      } else {
        throw new Error('unknown-name');
      }
      prevType = 'name';
      continue;
    }

    if (t.type === 'op') {
      if (t.value === ',') {
        // argument separator (not used in this build, but reserved)
        while (stack.length && stack[stack.length - 1].value !== '(') {
          out.push(stack.pop());
        }
        if (!stack.length) throw new Error('separator-misuse');
        continue;
      }
      if (t.value === '(') {
        stack.push(t);
        prevType = '(';
        continue;
      }
      if (t.value === ')') {
        while (stack.length && stack[stack.length - 1].value !== '(') out.push(stack.pop());
        if (!stack.length) throw new Error('mismatched-paren');
        stack.pop(); // remove '('
        // if function on top of stack, pop it to output
        if (stack.length && stack[stack.length - 1].type === 'func') out.push(stack.pop());
        prevType = ')';
        continue;
      }

      // operator
      let op = t.value;
      if (op === '-' && (prevType === 'start' || prevType === '(' || prevType === 'op')) {
        op = 'u-';
      }

      const o1 = OPERATORS[op];
      if (!o1) throw new Error('unknown-op');

      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type === 'func') { out.push(stack.pop()); continue; }
        if (top.type === 'op') {
          const o2 = OPERATORS[top.value];
          if (o2 && ((o1.assoc === 'L' && o1.prec <= o2.prec) || (o1.assoc === 'R' && o1.prec < o2.prec))) {
            out.push(stack.pop());
            continue;
          }
        }
        break;
      }
      stack.push({ type: 'op', value: op });
      prevType = 'op';
      continue;
    }
  }

  while (stack.length) {
    const s = stack.pop();
    if (s.value === '(' || s.value === ')') throw new Error('mismatched-paren');
    out.push(s);
  }

  return out;
}

/**
 * Evaluate RPN.
 */
export function evalRPN(rpn, angleMode = 'RAD') {
  const st = [];
  for (const t of rpn) {
    if (t.type === 'num') { st.push(t.value); continue; }
    if (t.type === 'op') {
      const op = OPERATORS[t.value];
      if (!op) throw new Error('unknown-op');
      const args = [];
      for (let i = 0; i < op.args; i++) {
        if (!st.length) throw new Error('malformed-rpn');
        args.unshift(st.pop());
      }
      const v = op.fn(...args);
      if (!Number.isFinite(v)) return NaN;
      st.push(v);
      continue;
    }
    if (t.type === 'func') {
      const fn = FUNCTIONS[t.value];
      if (!fn) throw new Error('unknown-func');
      const a = st.pop(); // all functions unary in this build
      if (a === undefined) throw new Error('malformed-rpn');
      let result;
      if (['sin','cos','tan'].includes(t.value)) {
        result = fn(a, angleMode);
      } else {
        result = fn(a);
      }
      if (!Number.isFinite(result)) return NaN;
      st.push(result);
      continue;
    }
  }
  if (st.length !== 1) throw new Error('malformed-rpn');
  return st[0];
}

/**
 * High-level evaluation: returns { value, error }
 */
export function evaluateExpression(expr, angleMode = 'RAD') {
  try {
    const tokens = tokenize(expr);
    const rpn = toRPN(tokens, angleMode);
    const value = evalRPN(rpn, angleMode);
    if (Number.isNaN(value)) {
      return { value: null, error: 'error_domain' };
    }
    return { value, error: null };
  } catch (e) {
    const msg = String(e?.message ?? '');
    if (msg.includes('factorial-domain')) return { value: null, error: 'error_domain' };
    if (msg.includes('factorial-overflow')) return { value: null, error: 'error_overflow' };
    return { value: null, error: 'error_malformed' };
  }
}