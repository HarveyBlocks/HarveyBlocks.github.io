import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  hypot,
  normalizeAngle,
  angleDifference,
  lerp,
  interpolateAggressionColor,
  normalizeVector
} from './math.js';

test('clamp restricts values to min and max boundaries', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(0, 0, 10), 0);
  assert.equal(clamp(10, 0, 10), 10);
});

test('hypot calculates accurate Euclidean length', () => {
  assert.equal(hypot(3, 4), 5);
  assert.equal(hypot(0, 0), 0);
  assert.equal(hypot(0, -7), 7);
});

test('normalizeAngle restricts radians to [-PI, PI]', () => {
  assert.ok(Math.abs(normalizeAngle(0) - 0) < 1e-6);
  assert.ok(Math.abs(normalizeAngle(Math.PI) - Math.PI) < 1e-6);
  assert.ok(Math.abs(normalizeAngle(3 * Math.PI) - Math.PI) < 1e-6);
  assert.ok(Math.abs(normalizeAngle(-3 * Math.PI) - -Math.PI) < 1e-6);
});

test('angleDifference computes shortest signed angular displacement', () => {
  const diff1 = angleDifference(Math.PI / 2, 0);
  assert.ok(Math.abs(diff1 - Math.PI / 2) < 1e-6);

  const diff2 = angleDifference(0, Math.PI / 2);
  assert.ok(Math.abs(diff2 - (-Math.PI / 2)) < 1e-6);

  // Crosses discontinuity: 3.10 rad to -3.10 rad
  const diff3 = angleDifference(-3.10, 3.10);
  assert.ok(Math.abs(diff3 - (2 * Math.PI - 6.20)) < 1e-2);
});

test('lerp correctly blends between values', () => {
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(lerp(10, 20, 0.5), 15);
  assert.equal(lerp(10, 20, 1), 20);
});

test('interpolateAggressionColor returns valid CSS rgb string', () => {
  const colLow = interpolateAggressionColor(0);
  assert.ok(colLow.startsWith('rgb(') && colLow.endsWith(')'));

  const colMid = interpolateAggressionColor(0.5);
  assert.ok(colMid.startsWith('rgb(') && colMid.endsWith(')'));

  const colHigh = interpolateAggressionColor(1.0);
  assert.ok(colHigh.startsWith('rgb(') && colHigh.endsWith(')'));
});

test('normalizeVector returns unit vector and length', () => {
  const norm = normalizeVector(3, 4);
  assert.ok(Math.abs(norm.x - 0.6) < 1e-6);
  assert.ok(Math.abs(norm.y - 0.8) < 1e-6);
  assert.equal(norm.length, 5);

  const zeroNorm = normalizeVector(0, 0, Math.PI / 2);
  assert.ok(Math.abs(zeroNorm.x - 0) < 1e-4);
  assert.ok(Math.abs(zeroNorm.y - 1) < 1e-4);
  assert.equal(zeroNorm.length, 0);
});
