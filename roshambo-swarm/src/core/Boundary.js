/**
 * @fileoverview Spatial boundary manager that answers solidity, ray casting,
 * toroidal wrap perception, soft repulsion forces, and collision settling.
 * Zero DOM dependencies for pure geometric calculation and testing.
 * @module core/Boundary
 */

import { CONFIG } from '../config/simulationConfig.js';
import { SCENE_WALLS } from '../config/factions.js';

/**
 * Handles geometry, ray-testing, and collision constraints across solid and open boundaries.
 */
export class Boundary {
  /**
   * Constructs a Boundary instance.
   *
   * @param {number} [wallThickness=CONFIG.wallThickness] - Nominal thickness of solid wall segments.
   * @param {number} [softRange=CONFIG.softWallRange] - Distance range over which soft wall force acts.
   */
  constructor(wallThickness = CONFIG.wallThickness, softRange = CONFIG.softWallRange) {
    /** @type {number} */
    this.width = 0;
    /** @type {number} */
    this.height = 0;
    /** @type {number} */
    this.wallThickness = wallThickness;
    /** @type {number} */
    this.softRange = softRange;
    /** @type {import('../types/index.js').WallConfig} */
    this.walls = SCENE_WALLS[1];
  }

  /**
   * Updates the stage dimensions used for boundary math.
   *
   * @param {number} width - Stage width in pixels.
   * @param {number} height - Stage height in pixels.
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  /**
   * Updates the scaled physical dimensions of the boundary.
   *
   * @param {number} wallThickness - Scaled wall thickness.
   * @param {number} softRange - Scaled soft-wall repulsion range.
   */
  setScale(wallThickness, softRange) {
    this.wallThickness = wallThickness;
    this.softRange = softRange;
  }

  /**
   * Applies a new wall layout configuration.
   *
   * @param {import('../types/index.js').WallConfig} walls - Per-edge solid/open configuration.
   */
  setWalls(walls) {
    this.walls = walls;
  }

  /**
   * Checks whether the specified boundary segment along an edge is solid.
   *
   * @param {import('../types/index.js').BoundaryEdge} edge - Boundary edge identifier ('L'|'R'|'T'|'B').
   * @param {number} t - Normalized coordinate along the edge in [0, 1].
   * @returns {boolean} True if the segment is an impassable solid wall.
   */
  isSolid(edge, t) {
    if (!Number.isFinite(t)) return false;
    const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
    const idx = Math.min(
      CONFIG.segmentsPerEdge - 1,
      Math.floor(clamped * CONFIG.segmentsPerEdge)
    );
    return Boolean(this.walls[edge][idx]);
  }

  /**
   * Casts a ray from `(x, y)` along `angle` and returns the distance to
   * the first solid barrier, passing through open toroidal boundary segments.
   *
   * @param {number} x - Ray origin X.
   * @param {number} y - Ray origin Y.
   * @param {number} angle - Ray direction angle in radians.
   * @returns {number} Distance to the first solid wall, or Infinity if completely open.
   */
  castRay(x, y, angle) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let px = x;
    let py = y;
    let total = 0;

    for (let bounce = 0; bounce < CONFIG.probeBounces; bounce++) {
      const hit = this.#firstHit(px, py, dx, dy);
      if (!hit) return Infinity;

      total += hit.s;
      if (this.isSolid(hit.edge, hit.t)) return total;

      // Wrap through the open edge to the opposing edge
      if (hit.edge === 'L') px = this.width - CONFIG.epsilon;
      else if (hit.edge === 'R') px = CONFIG.epsilon;
      else if (hit.edge === 'T') py = this.height - CONFIG.epsilon;
      else py = CONFIG.epsilon;
    }

    return Infinity;
  }

  /**
   * Computes the shortest perceivable displacement from `from` to `(bx, by)`.
   * When direct line-of-sight is blocked by a solid wall, tries toroidal mirror copies
   * across unobstructed open edges.
   *
   * @param {{x: number, y: number}} from - Observer coordinates.
   * @param {number} bx - Target X.
   * @param {number} by - Target Y.
   * @returns {{dx: number, dy: number}} Perceived displacement vector.
   */
  perceiveDelta(from, bx, by) {
    if (!this.#segmentBlocked(from.x, from.y, bx, by)) {
      return { dx: bx - from.x, dy: by - from.y };
    }

    let best = null;
    let bestDistSq = Infinity;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;

        const cx = bx + i * this.width;
        const cy = by + j * this.height;
        if (this.#segmentBlocked(from.x, from.y, cx, cy)) continue;

        const dx = cx - from.x;
        const dy = cy - from.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDistSq) {
          bestDistSq = d2;
          best = { dx, dy };
        }
      }
    }

    return best ?? { dx: bx - from.x, dy: by - from.y };
  }

  /**
   * Computes the perceivable distance between two points taking into account walls and wraps.
   *
   * @param {{x: number, y: number}} from - Observer position.
   * @param {number} bx - Target X.
   * @param {number} by - Target Y.
   * @returns {number} Perceived Euclidean distance.
   */
  perceiveDist(from, bx, by) {
    const delta = this.perceiveDelta(from, bx, by);
    return Math.hypot(delta.dx, delta.dy);
  }

  /**
   * Calculates the soft repulsive force steering an agent away from approaching solid walls.
   *
   * @param {{x: number, y: number}} p - Current agent position.
   * @param {number} strength - Base force scale factor.
   * @returns {{x: number, y: number}} Force vector pushing away from solid boundaries.
   */
  softForce(p, strength) {
    const magnitude = strength * CONFIG.softWallStrength;
    const rt = this.wallThickness;
    const rr = this.softRange;
    const W = this.width;
    const H = this.height;

    let fx = 0;
    let fy = 0;

    if (p.x < rt + rr && this.isSolid('L', p.y / H)) {
      const d = p.x - rt;
      if (d < rr) {
        const k = 1 - Math.max(0, Math.min(rr, d)) / rr;
        fx += k * k * magnitude;
      }
    }
    if (p.x > W - rt - rr && this.isSolid('R', p.y / H)) {
      const d = W - rt - p.x;
      if (d < rr) {
        const k = 1 - Math.max(0, Math.min(rr, d)) / rr;
        fx -= k * k * magnitude;
      }
    }
    if (p.y < rt + rr && this.isSolid('T', p.x / W)) {
      const d = p.y - rt;
      if (d < rr) {
        const k = 1 - Math.max(0, Math.min(rr, d)) / rr;
        fy += k * k * magnitude;
      }
    }
    if (p.y > H - rt - rr && this.isSolid('B', p.x / W)) {
      const d = H - rt - p.y;
      if (d < rr) {
        const k = 1 - Math.max(0, Math.min(rr, d)) / rr;
        fy -= k * k * magnitude;
      }
    }

    return { x: fx, y: fy };
  }

  /**
   * Wraps or clamps an agent's coordinates and applies collision response
   * depending on whether the boundary edge is open or solid.
   *
   * @param {{x: number, y: number, vx: number, vy: number}} u - Agent with position and velocity.
   */
  settle(u) {
    const W = this.width;
    const H = this.height;
    const bounce = CONFIG.collisionBounce;

    if (u.x < 0) {
      if (this.isSolid('L', u.y / H)) {
        u.x = 0;
        if (u.vx < 0) u.vx *= -bounce;
      } else {
        u.x += W;
      }
    } else if (u.x > W) {
      if (this.isSolid('R', u.y / H)) {
        u.x = W;
        if (u.vx > 0) u.vx *= -bounce;
      } else {
        u.x -= W;
      }
    }

    if (u.y < 0) {
      if (this.isSolid('T', u.x / W)) {
        u.y = 0;
        if (u.vy < 0) u.vy *= -bounce;
      } else {
        u.y += H;
      }
    } else if (u.y > H) {
      if (this.isSolid('B', u.x / W)) {
        u.y = H;
        if (u.vy > 0) u.vy *= -bounce;
      } else {
        u.y -= H;
      }
    }
  }

  /**
   * Finds the first intersection of a ray with any of the four bounding edges.
   *
   * @param {number} x - Ray origin X.
   * @param {number} y - Ray origin Y.
   * @param {number} dx - Ray unit direction X.
   * @param {number} dy - Ray unit direction Y.
   * @returns {import('../types/index.js').RayHit | null} First hit or null if ray misses.
   */
  #firstHit(x, y, dx, dy) {
    const W = this.width;
    const H = this.height;
    const eps = CONFIG.epsilon;
    /** @type {import('../types/index.js').RayHit | null} */
    let best = null;

    if (dx < -eps) {
      const s = -x / dx;
      if (s > eps) {
        const t = (y + s * dy) / H;
        if (t >= -eps && t <= 1 + eps) best = { s, edge: 'L', t };
      }
    }
    if (dx > eps) {
      const s = (W - x) / dx;
      if (s > eps && (!best || s < best.s)) {
        const t = (y + s * dy) / H;
        if (t >= -eps && t <= 1 + eps) best = { s, edge: 'R', t };
      }
    }
    if (dy < -eps) {
      const s = -y / dy;
      if (s > eps && (!best || s < best.s)) {
        const t = (x + s * dx) / W;
        if (t >= -eps && t <= 1 + eps) best = { s, edge: 'T', t };
      }
    }
    if (dy > eps) {
      const s = (H - y) / dy;
      if (s > eps && (!best || s < best.s)) {
        const t = (x + s * dx) / W;
        if (t >= -eps && t <= 1 + eps) best = { s, edge: 'B', t };
      }
    }

    if (best) best.t = Math.max(0, Math.min(1, best.t));
    return best;
  }

  /**
   * Tests whether a straight line segment between two points intersects an impassable solid wall.
   *
   * @param {number} x1 - Start X.
   * @param {number} y1 - Start Y.
   * @param {number} x2 - End X.
   * @param {number} y2 - End Y.
   * @returns {boolean} True if obstructed by a solid boundary segment.
   */
  #segmentBlocked(x1, y1, x2, y2) {
    const W = this.width;
    const H = this.height;
    const eps = CONFIG.epsilon;
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (dx < -eps) {
      const s = -x1 / dx;
      if (s > eps && s < 1 - eps) {
        const t = (y1 + s * dy) / H;
        if (t >= 0 && t <= 1 && this.isSolid('L', t)) return true;
      }
    }
    if (dx > eps) {
      const s = (W - x1) / dx;
      if (s > eps && s < 1 - eps) {
        const t = (y1 + s * dy) / H;
        if (t >= 0 && t <= 1 && this.isSolid('R', t)) return true;
      }
    }
    if (dy < -eps) {
      const s = -y1 / dy;
      if (s > eps && s < 1 - eps) {
        const t = (x1 + s * dx) / W;
        if (t >= 0 && t <= 1 && this.isSolid('T', t)) return true;
      }
    }
    if (dy > eps) {
      const s = (H - y1) / dy;
      if (s > eps && s < 1 - eps) {
        const t = (x1 + s * dx) / W;
        if (t >= 0 && t <= 1 && this.isSolid('B', t)) return true;
      }
    }

    return false;
  }
}
