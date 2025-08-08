/**
 * Programmer mode: base conversions, word sizes, signed/unsigned, and bitwise ops.
 */

export const BASES = ['HEX','DEC','OCT','BIN'];

export function parseByBase(str, base) {
  const clean = String(str).trim().toUpperCase();
  let radix = 10;
  switch (base) {
    case 'HEX': radix = 16; break;
    case 'DEC': radix = 10; break;
    case 'OCT': radix = 8; break;
    case 'BIN': radix = 2; break;
    default: radix = 10;
  }
  if (radix !== 10 && clean.includes('.')) throw new Error('no-fraction-in-non-dec');
  const n = parseInt(clean, radix);
  if (!Number.isFinite(n) || Number.isNaN(n)) throw new Error('invalid-number');
  return n;
}

export function formatByBase(n, base, wordSize = 32, signed = false) {
  let v = maskToWord(n, wordSize);
  if (signed) v = twosToSigned(v, wordSize);
  switch (base) {
    case 'HEX': return (signed && v < 0 ? '-' : '') + Math.abs(v >>> 0).toString(16).toUpperCase();
    case 'DEC': return String(v);
    case 'OCT': return (signed && v < 0 ? '-' : '') + Math.abs(v >>> 0).toString(8);
    case 'BIN': return (signed && v < 0 ? '-' : '') + Math.abs(v >>> 0).toString(2);
    default: return String(v);
  }
}

export function maskToWord(n, wordSize) {
  if (wordSize === 64) {
    // Use BigInt path for 64-bit masking then convert back (lossy for >2^53-1, but UI is demonstration)
    const mask = (1n << 64n) - 1n;
    const v = BigInt(Math.trunc(n)) & mask;
    // Return Number for UI; values beyond Number range will be approximate
    return Number(v);
  }
  const mask = (1 << wordSize) - 1;
  return (n >>> 0) & mask;
}

export function twosToSigned(v, wordSize) {
  if (wordSize === 64) {
    const big = BigInt(Math.trunc(v));
    const signBit = 1n << 63n;
    return Number((big & signBit) ? (big - (1n << 64n)) : big);
  }
  const signBit = 1 << (wordSize - 1);
  return (v & signBit) ? v - (1 << wordSize) : v;
}

function normalizeOperands(a, b, wordSize) {
  const mA = maskToWord(a, wordSize) >>> 0;
  const mB = maskToWord(b, wordSize) >>> 0;
  return [mA, mB];
}

export function bitAnd(a, b, wordSize) {
  const [x, y] = normalizeOperands(a, b, wordSize);
  return (x & y) >>> 0;
}
export function bitOr(a, b, wordSize) {
  const [x, y] = normalizeOperands(a, b, wordSize);
  return (x | y) >>> 0;
}
export function bitXor(a, b, wordSize) {
  const [x, y] = normalizeOperands(a, b, wordSize);
  return (x ^ y) >>> 0;
}
export function bitNot(a, wordSize) {
  const x = maskToWord(a, wordSize) >>> 0;
  return (~x) >>> 0;
}
export function shl(a, n, wordSize) {
  return maskToWord((a >>> 0) << (n >>> 0), wordSize) >>> 0;
}
export function shr(a, n, wordSize) {
  return ((a >>> 0) >>> (n >>> 0)) >>> 0;
}