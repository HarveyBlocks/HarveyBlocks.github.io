/**
 * @fileoverview Pure mathematical and geometric utility functions for simulation physics,
 * vector operations, angle arithmetic, and color interpolation.
 * @module utils/math
 */

/**
 * Clamps a number between a lower and upper bound.
 *
 * @param {number} value - The input value.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {number} Clamped value.
 */
export function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Computes the Euclidean distance of a 2D vector (hypotenuse).
 *
 * @param {number} dx - Delta X.
 * @param {number} dy - Delta Y.
 * @returns {number} Euclidean distance.
 */
export function hypot(dx, dy) {
  return Math.hypot(dx, dy);
}

/**
 * Normalizes an angle into the range [-PI, PI].
 *
 * @param {number} angle - Input angle in radians.
 * @returns {number} Normalized angle in radians.
 */
export function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Computes the shortest signed angular difference from current to target angle.
 *
 * @param {number} target - Target angle in radians.
 * @param {number} current - Current angle in radians.
 * @returns {number} Signed difference in [-PI, PI].
 */
export function angleDifference(target, current) {
  return normalizeAngle(target - current);
}

/**
 * Linearly interpolates between two numbers.
 *
 * @param {number} start - Start value.
 * @param {number} end - End value.
 * @param {number} t - Interpolation factor [0..1].
 * @returns {number} Interpolated value.
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Computes an RGB color representing aggression intensity on a spectrum:
 * - Low aggression (< 0.5): transitions from cyan-blue to neutral slate
 * - High aggression (>= 0.5): transitions from neutral slate to vibrant coral-red
 *
 * @param {number} aggression - Aggression value in [0, 1].
 * @returns {string} CSS rgb() color string.
 */
export function interpolateAggressionColor(aggression) {
  const a = clamp(aggression, 0, 1);
  const t = a < 0.5 ? a * 2 : (a - 0.5) * 2;
  const r = a < 0.5 ? lerp(2, 100, t) : lerp(100, 225, t);
  const g = a < 0.5 ? lerp(132, 116, t) : lerp(116, 29, t);
  const b = a < 0.5 ? lerp(199, 139, t) : lerp(139, 72, t);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * Normalizes a 2D vector, with fallback to an optional heading angle if length is near zero.
 *
 * @param {number} x - Vector X component.
 * @param {number} y - Vector Y component.
 * @param {number} [fallbackHeading=0] - Heading angle in radians if magnitude is negligible.
 * @returns {{x: number, y: number, length: number}} Normalized vector and original length.
 */
export function normalizeVector(x, y, fallbackHeading = 0) {
  const mag = Math.hypot(x, y);
  if (mag > 1e-4) {
    return { x: x / mag, y: y / mag, length: mag };
  }
  return {
    x: Math.cos(fallbackHeading),
    y: Math.sin(fallbackHeading),
    length: 0
  };
}
