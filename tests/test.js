import { tokenize, toRPN, evalRPN, evaluateExpression } from '../js/calculator-core.js';
import { bitAnd, bitOr, bitXor, shl, shr } from '../js/programmer.js';

const out = document.getElementById('out');
function log(line) { out.textContent += line + '\n'; }
function assertEq(name, got, want) {
  const ok = (Number.isNaN(want) && Number.isNaN(got)) || Math.abs(got - want) < 1e-9;
  log(`${ok ? '✓' : '✗'} ${name}: ${got} ${ok ? '==' : '!='} ${want}`);
}

function run() {
  // Basic precedence and parentheses
  assertEq('1+2*3', evaluateExpression('1+2*3').value, 7);
  assertEq('(1+2)*3', evaluateExpression('(1+2)*3').value, 9);
  assertEq('2^3^2', evaluateExpression('2^3^2').value, 512);

  // Unary minus
  assertEq('-3^2', evaluateExpression('-3^2').value, -9);

  // Factorial
  assertEq('factorial(5)', evaluateExpression('factorial(5)').value, 120);

  // Trig rad/deg
  assertEq('sin(pi/2) rad', evaluateExpression('sin(pi/2)', 'RAD').value, 1);
  assertEq('sin(90) deg', Math.round(evaluateExpression('sin(90)', 'DEG').value*1000)/1000, 1);

  // Bitwise
  assertEq('AND', bitAnd(0b1100, 0b1010, 8), 0b1000);
  assertEq('OR', bitOr(0b1100, 0b1010, 8), 0b1110);
  assertEq('XOR', bitXor(0b1100, 0b1010, 8), 0b0110);
  assertEq('SHL', shl(0b0001, 2, 8), 0b0100);
  assertEq('SHR', shr(0b1000, 3, 8), 0b0001);

  log('\nDone.');
}

run();