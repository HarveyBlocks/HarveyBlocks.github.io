/**
 * @fileoverview Autonomous swarm agent entity.
 * Implements steering behaviors, predator evasion, prey pursuit, wall avoidance,
 * and adaptive flocking dynamics with strict JSDoc typing.
 * @module core/Unit
 */

import { CONFIG } from '../config/simulationConfig.js';
import { angleDifference, normalizeAngle } from '../utils/math.js';
import { UnitRenderer } from '../ui/UnitRenderer.js';

/**
 * An individual agent navigating the three-faction swarm ecosystem.
 */
export class Unit {
  /**
   * Constructs a Unit instance.
   *
   * @param {number} faction - Faction index (0: Rock, 1: Scissors, 2: Paper).
   * @param {number} startX - Initial X position in pixels.
   * @param {number} startY - Initial Y position in pixels.
   * @param {HTMLElement} [container] - DOM container node for rendering.
   */
  constructor(faction, startX, startY, container) {
    /** @type {number} */
    this.faction = faction;
    /** @type {number} */
    this.x = startX;
    /** @type {number} */
    this.y = startY;

    const angle = Math.random() * Math.PI * 2;
    /** @type {number} */
    this.vx = Math.cos(angle) * 2;
    /** @type {number} */
    this.vy = Math.sin(angle) * 2;
    /** @type {number} Heading direction angle in radians */
    this.heading = angle;
    /** @type {number} Wander wander angle in radians */
    this.wander = Math.random() * Math.PI * 2;
    /** @type {number} Visual icon rotation angle in radians */
    this.rotation = angle + CONFIG.iconAngleOffset;

    /** @type {Unit | null} Current targeted prey unit */
    this.target = null;
    /** @type {Unit | null} Reference to predator currently pursuing this unit */
    this.claimedBy = null;
    /** @type {number} Distance to closest predator in current frame */
    this.nearestFoeDistance = Infinity;

    /** @type {number} Last known prey waypoint X */
    this.memoryX = 0;
    /** @type {number} Last known prey waypoint Y */
    this.memoryY = 0;
    /** @type {number} Frame number when waypoint was recorded */
    this.memoryFrame = -1e9;

    /** @type {import('../types/index.js').NeighborRecord[]} Perceived prey units */
    this.prey = [];
    /** @type {import('../types/index.js').NeighborRecord[]} Perceived predator units */
    this.foe = [];
    /** @type {import('../types/index.js').NeighborRecord[]} Perceived allied units */
    this.mate = [];

    /** @type {UnitRenderer | null} Visual renderer delegate */
    this.renderer = container
      ? new UnitRenderer(container, faction, this.x, this.y, this.rotation)
      : null;
  }

  /**
   * Converts this unit to a new faction and resets transient hunting targets.
   *
   * @param {number} newFaction - Target faction identifier.
   */
  setFaction(newFaction) {
    if (this.faction === newFaction) return;

    this.faction = newFaction;
    if (this.renderer) {
      this.renderer.updateFaction(newFaction);
    }

    this.target = null;
    this.nearestFoeDistance = Infinity;
    this.memoryFrame = -1e9;
  }

  /**
   * Clears per-frame perception buffers before neighbor discovery.
   */
  clearPerception() {
    this.prey.length = 0;
    this.foe.length = 0;
    this.mate.length = 0;
    this.claimedBy = null;
    this.nearestFoeDistance = Infinity;
  }

  /**
   * Records an observed neighbor into the appropriate relationship list.
   *
   * @param {Unit} other - The observed neighbor unit.
   * @param {'prey'|'foe'|'mate'} kind - Relationship category.
   * @param {number} dx - Relative displacement X.
   * @param {number} dy - Relative displacement Y.
   * @param {number} d - Perceived distance.
   */
  recordNeighbour(other, kind, dx, dy, d) {
    this[kind].push({ unit: other, dx, dy, d });
    if (kind === 'foe' && d < this.nearestFoeDistance) {
      this.nearestFoeDistance = d;
    }
  }

  /**
   * Evaluates perceived stimuli and produces the desired steering intent.
   *
   * @param {number} frame - Current simulation frame counter.
   * @param {number} aggression - Aggression alpha [0..1] for this unit's faction.
   * @param {import('./Boundary.js').Boundary} boundary - Spatial boundary for environmental probes.
   * @param {number} dangerDistance - Scaled danger distance.
   * @param {number} perceptionRange - Scaled perception range.
   * @returns {import('../types/index.js').SteeringIntent}
   */
  decide(frame, aggression, boundary, dangerDistance, perceptionRange) {
    const bias = aggression * 2 - 1;
    const chaseMul = Math.pow(CONFIG.aggressionBase, bias);
    const fleeMul = Math.pow(CONFIG.aggressionBase, -bias);

    let mixX = 0;
    let mixY = 0;
    let chase = 0;
    let flee = 0;

    if (this.foe.length > 0) {
      const f = this.#computeFlee(fleeMul, boundary, dangerDistance, perceptionRange);
      mixX += f.dx;
      mixY += f.dy;
      flee = f.weight;
    }

    if (this.prey.length > 0) {
      const c = this.#computeChase(frame, aggression, chaseMul, boundary, dangerDistance, perceptionRange);
      mixX += c.dx;
      mixY += c.dy;
      chase = c.weight;
    }

    if (chase + flee < CONFIG.fallbackWeight) {
      const fb = this.#computeFallback(frame, boundary);
      mixX += fb.dx;
      mixY += fb.dy;
    }

    const mag = Math.hypot(mixX, mixY);
    if (mag > 1e-4) {
      mixX /= mag;
      mixY /= mag;
    } else {
      mixX = Math.cos(this.heading);
      mixY = Math.sin(this.heading);
    }

    return { dx: mixX, dy: mixY, chase, flee };
  }

  /**
   * Applies the decided steering intent to physics, integrates velocity and position,
   * handles boundary collisions, and updates rendering.
   *
   * @param {import('../types/index.js').SteeringIntent} intent - Movement intent.
   * @param {number} dt - Frame delta time factor.
   * @param {number} speedLimit - Current speed ceiling for this unit's faction.
   * @param {import('./Boundary.js').Boundary} boundary - Boundary collider.
   * @param {number} baseForce - Scaled base propulsion force.
   * @param {number} mainForce - Scaled main heading force.
   * @param {number} maxForce - Scaled maximum clamped force.
   * @param {number} separationRadius - Scaled separation distance.
   * @param {number} scale - Current viewport scale factor.
   */
  act(intent, dt, speedLimit, boundary, baseForce, mainForce, maxForce, separationRadius, scale) {
    let turnRate = CONFIG.turnBase;
    if (intent.flee > intent.chase * 2) {
      turnRate = CONFIG.turnFlee;
    } else if (intent.chase > intent.flee * 2) {
      turnRate = CONFIG.turnChase;
    } else if (intent.chase + intent.flee > 0.1) {
      turnRate = (CONFIG.turnChase + CONFIG.turnFlee) * 0.5;
    }

    const wantAngle = Math.atan2(intent.dy, intent.dx);
    const diff = angleDifference(wantAngle, this.heading);
    this.heading += Math.max(-turnRate, Math.min(turnRate, diff));

    let fx = Math.cos(this.heading) * mainForce;
    let fy = Math.sin(this.heading) * mainForce;

    const soft = boundary.softForce(this, baseForce);
    fx += soft.x;
    fy += soft.y;

    if (this.mate.length > 0) {
      const sep = this.#separationForce(separationRadius, baseForce);
      fx += sep.x;
      fy += sep.y;
    }

    const mag = Math.hypot(fx, fy);
    if (mag > maxForce) {
      const k = maxForce / mag;
      fx *= k;
      fy *= k;
    }

    const damp = Math.pow(CONFIG.damping, dt);
    this.vx = (this.vx + fx * dt) * damp;
    this.vy = (this.vy + fy * dt) * damp;

    this.vx += (Math.random() - 0.5) * CONFIG.jitter * scale * dt;
    this.vy += (Math.random() - 0.5) * CONFIG.jitter * scale * dt;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > speedLimit) {
      const k = speedLimit / speed;
      this.vx *= k;
      this.vy *= k;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    boundary.settle(this);

    this.#updateRotation(speed);

    if (this.renderer) {
      this.renderer.updatePosition(this.x, this.y);
    }
  }

  /**
   * Synchronizes toroidal ghost projections around boundary thresholds.
   *
   * @param {number} width - Screen width in pixels.
   * @param {number} height - Screen height in pixels.
   * @param {number} margin - Border distance margin.
   * @param {import('./Boundary.js').Boundary} boundary - Spatial boundary.
   */
  updateGhosts(width, height, margin, boundary) {
    if (this.renderer) {
      this.renderer.updateGhosts(this.x, this.y, this.rotation, width, height, margin, boundary);
    }
  }

  /**
   * Cleans up allocated resources and DOM nodes.
   */
  destroy() {
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
  }

  /**
   * Computes the flee contribution vector.
   *
   * @param {number} fleeMul - Aggression flee multiplier.
   * @param {import('./Boundary.js').Boundary} boundary - Spatial boundary.
   * @param {number} danger - Scaled danger distance.
   * @param {number} range - Scaled perception range.
   * @returns {{dx: number, dy: number, weight: number}}
   */
  #computeFlee(fleeMul, boundary, danger, range) {
    let fx = 0;
    let fy = 0;
    let wsum = 0;

    for (let i = 0; i < this.foe.length; i++) {
      const f = this.foe[i];
      const w = 1 / (f.d * f.d + 1);
      wsum += w;
      fx -= f.dx * w;
      fy -= f.dy * w;
    }

    const mag = Math.hypot(fx, fy);
    if (mag < wsum * CONFIG.surroundEps) {
      [fx, fy] = this.#openDirection(boundary, danger);
    } else if (mag > 1e-6) {
      fx /= mag;
      fy /= mag;
    } else {
      fx = Math.cos(this.heading);
      fy = Math.sin(this.heading);
    }

    [fx, fy] = this.#avoidWalls(fx, fy, boundary, danger);

    if (this.nearestFoeDistance < danger * CONFIG.scatterTrigger && this.mate.length > 0) {
      [fx, fy] = this.#scatter(fx, fy, range);
    }

    const ratio = danger / Math.max(this.nearestFoeDistance, danger * CONFIG.fleeClampFactor);
    const weight = Math.min(ratio * ratio, CONFIG.fleeWeightCap) * fleeMul;

    return { dx: fx * weight, dy: fy * weight, weight };
  }

  /**
   * Computes the chase contribution vector.
   *
   * @param {number} frame - Current frame number.
   * @param {number} aggression - Faction aggression alpha.
   * @param {number} chaseMul - Aggression chase multiplier.
   * @param {import('./Boundary.js').Boundary} boundary - Spatial boundary.
   * @param {number} danger - Scaled danger distance.
   * @param {number} range - Scaled perception range.
   * @returns {{dx: number, dy: number, weight: number}}
   */
  #computeChase(frame, aggression, chaseMul, boundary, danger, range) {
    this.#selectTarget();

    if (this.target) {
      this.target.claimedBy = this;
      this.memoryX = this.target.x;
      this.memoryY = this.target.y;
      this.memoryFrame = frame;
    }

    const near = danger * CONFIG.chaseSuppressNear;
    const far = danger * CONFIG.chaseSuppressFar;

    let suppress = 0;
    if (this.nearestFoeDistance > far) {
      suppress = 1;
    } else if (this.nearestFoeDistance > near) {
      suppress = (this.nearestFoeDistance - near) / (far - near);
    }
    suppress += (1 - suppress) * aggression * CONFIG.aggressionSuppressSoft;
    if (suppress > 1) suppress = 1;

    if (suppress <= 0.02 || !this.target) {
      return { dx: 0, dy: 0, weight: 0 };
    }

    const t = this.target;
    const px = t.x + t.vx * CONFIG.predictFrames;
    const py = t.y + t.vy * CONFIG.predictFrames;
    const delta = boundary.perceiveDelta(this, px, py);
    const dist = Math.hypot(delta.dx, delta.dy) || 1;
    const distFactor = 1 / (1 + dist / (range * CONFIG.chaseDistanceNorm));

    const weight = distFactor * suppress * CONFIG.chaseGlobalDamp * chaseMul;
    return {
      dx: (delta.dx / dist) * weight,
      dy: (delta.dy / dist) * weight,
      weight
    };
  }

  /**
   * Selects or clears optimal hunting target among perceived prey.
   */
  #selectTarget() {
    if (this.target) {
      const stillVisible = this.prey.some(p => p.unit === this.target);
      const sameFaction = this.target.faction === this.faction;
      const stolen = this.target.claimedBy && this.target.claimedBy !== this;
      if (!stillVisible || sameFaction || stolen) {
        this.target = null;
      }
    }

    if (this.target) return;

    let best = null;
    let bestScore = -Infinity;

    for (let i = 0; i < this.prey.length; i++) {
      const p = this.prey[i];
      if (p.unit.claimedBy && p.unit.claimedBy !== this) continue;
      const score = 1 / (p.d + 1);
      if (score > bestScore) {
        bestScore = score;
        best = p.unit;
      }
    }

    if (!best) {
      let minD = Infinity;
      for (let i = 0; i < this.prey.length; i++) {
        const p = this.prey[i];
        if (p.d < minD) {
          minD = p.d;
          best = p.unit;
        }
      }
    }

    this.target = best;
  }

  /**
   * Computes fallback motion towards remembered target position or stochastic wandering.
   *
   * @param {number} frame - Current frame.
   * @param {import('./Boundary.js').Boundary} boundary - Spatial boundary.
   * @returns {{dx: number, dy: number}}
   */
  #computeFallback(frame, boundary) {
    if (frame - this.memoryFrame < CONFIG.memoryFrames) {
      const delta = boundary.perceiveDelta(this, this.memoryX, this.memoryY);
      const dist = Math.hypot(delta.dx, delta.dy);
      if (dist > CONFIG.memoryMinDistance) {
        return { dx: delta.dx / dist, dy: delta.dy / dist };
      }
    }

    this.wander += (Math.random() - 0.5) * CONFIG.wanderRate;
    return { dx: Math.cos(this.wander), dy: Math.sin(this.wander) };
  }

  /**
   * Finds the most promising open escape direction avoiding nearby predators and walls.
   *
   * @param {import('./Boundary.js').Boundary} boundary - Spatial boundary.
   * @param {number} danger - Scaled danger distance.
   * @returns {[number, number]} Escape direction unit vector [x, y].
   */
  #openDirection(boundary, danger) {
    const length = danger * CONFIG.openDirectionProbeFactor;
    const minDist = length * CONFIG.openDirectionMinFactor;
    const samples = CONFIG.openDirectionSamples;

    let bestX = Math.cos(this.heading);
    let bestY = Math.sin(this.heading);
    let bestScore = -Infinity;

    for (let k = 0; k < samples; k++) {
      const angle = (k * Math.PI * 2) / samples;
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);

      if (boundary.castRay(this.x, this.y, angle) < minDist) continue;

      const px = this.x + ux * length;
      const py = this.y + uy * length;
      let minD = Infinity;

      for (let i = 0; i < this.foe.length; i++) {
        const f = this.foe[i];
        const d = boundary.perceiveDist({ x: px, y: py }, f.unit.x, f.unit.y);
        if (d < minD) minD = d;
      }

      if (minD > bestScore) {
        bestScore = minD;
        bestX = ux;
        bestY = uy;
      }
    }

    return [bestX, bestY];
  }

  /**
   * Deflects escape vectors away from impending solid barriers and corners.
   *
   * @param {number} fx - Desired flee direction X.
   * @param {number} fy - Desired flee direction Y.
   * @param {import('./Boundary.js').Boundary} boundary - Spatial boundary.
   * @param {number} danger - Scaled danger distance.
   * @returns {[number, number]} Deflected flee direction vector [x, y].
   */
  #avoidWalls(fx, fy, boundary, danger) {
    const left = boundary.castRay(this.x, this.y, Math.PI);
    const right = boundary.castRay(this.x, this.y, 0);
    const up = boundary.castRay(this.x, this.y, -Math.PI / 2);
    const down = boundary.castRay(this.x, this.y, Math.PI / 2);

    const nearL = left < danger;
    const nearR = right < danger;
    const nearU = up < danger;
    const nearD = down < danger;

    if (!nearL && !nearR && !nearU && !nearD) return [fx, fy];

    const axisX = nearL || nearR;
    const axisY = nearU || nearD;

    if (axisX && axisY) {
      const candidates = [];
      if (nearL || nearR) candidates.push([0, 1], [0, -1]);
      if (nearU || nearD) candidates.push([1, 0], [-1, 0]);

      let bestX = 0;
      let bestY = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < candidates.length; i++) {
        const [cx, cy] = candidates[i];
        if (nearL && cx < 0) continue;
        if (nearR && cx > 0) continue;
        if (nearU && cy < 0) continue;
        if (nearD && cy > 0) continue;
        const sc = cx * fx + cy * fy;
        if (sc > bestScore) {
          bestScore = sc;
          bestX = cx;
          bestY = cy;
        }
      }

      let ix = 0;
      let iy = 0;
      if (nearL) ix = 1; else if (nearR) ix = -1;
      if (nearU) iy = 1; else if (nearD) iy = -1;
      const im = Math.hypot(ix, iy) || 1;
      ix /= im;
      iy /= im;

      if (bestScore > -Infinity) {
        fx = bestX * CONFIG.cornerSlide + ix * CONFIG.cornerInward;
        fy = bestY * CONFIG.cornerSlide + iy * CONFIG.cornerInward;
      } else {
        fx = ix;
        fy = iy;
      }
    } else if (axisX) {
      if (nearL && fx < 0) {
        if (Math.abs(fy) > CONFIG.cornerFacingMin) {
          const m = Math.hypot(fx, fy);
          fy = Math.sign(fy) * m;
          fx = 0;
        } else {
          fx = 1;
          fy = 0;
        }
      } else if (nearR && fx > 0) {
        if (Math.abs(fy) > CONFIG.cornerFacingMin) {
          const m = Math.hypot(fx, fy);
          fy = Math.sign(fy) * m;
          fx = 0;
        } else {
          fx = -1;
          fy = 0;
        }
      }
    } else if (axisY) {
      if (nearU && fy < 0) {
        if (Math.abs(fx) > CONFIG.cornerFacingMin) {
          const m = Math.hypot(fx, fy);
          fx = Math.sign(fx) * m;
          fy = 0;
        } else {
          fy = 1;
          fx = 0;
        }
      } else if (nearD && fy > 0) {
        if (Math.abs(fx) > CONFIG.cornerFacingMin) {
          const m = Math.hypot(fx, fy);
          fx = Math.sign(fx) * m;
          fy = 0;
        } else {
          fy = -1;
          fx = 0;
        }
      }
    }

    const mag = Math.hypot(fx, fy);
    if (mag > 1e-4) {
      fx /= mag;
      fy /= mag;
    } else {
      fx = Math.cos(this.heading);
      fy = Math.sin(this.heading);
    }
    return [fx, fy];
  }

  /**
   * Adds lateral scatter vector when multiple mates are fleeing in the same corridor.
   *
   * @param {number} fx - Desired flee vector X.
   * @param {number} fy - Desired flee vector Y.
   * @param {number} range - Perception range.
   * @returns {[number, number]} Scattered direction vector [x, y].
   */
  #scatter(fx, fy, range) {
    const perpX = -fy;
    const perpY = fx;
    const r = range * CONFIG.scatterRadiusFraction;
    const r2 = r * r;
    let sx = 0;
    let sy = 0;
    let count = 0;

    for (let i = 0; i < this.mate.length; i++) {
      const m = this.mate[i];
      if (m.d * m.d > r2) continue;

      const dot = perpX * m.dx + perpY * m.dy;
      const w = 1 / (m.d + 1);
      if (dot > 0) {
        sx -= perpX * w;
        sy -= perpY * w;
      } else {
        sx += perpX * w;
        sy += perpY * w;
      }
      count++;
    }

    if (count === 0) return [fx, fy];

    const mag = Math.hypot(sx, sy) || 1;
    sx /= mag;
    sy /= mag;

    const weight = Math.min(
      CONFIG.scatterWeightMin + count * CONFIG.scatterWeightStep,
      CONFIG.scatterWeightMax
    );

    const nfx = fx + sx * weight;
    const nfy = fy + sy * weight;
    const nm = Math.hypot(nfx, nfy) || 1;
    return [nfx / nm, nfy / nm];
  }

  /**
   * Computes repulsive separation force pushing away from nearby mates to prevent clumping.
   *
   * @param {number} radius - Separation threshold.
   * @param {number} weight - Base force scale.
   * @returns {{x: number, y: number}}
   */
  #separationForce(radius, weight) {
    let sx = 0;
    let sy = 0;
    let count = 0;

    for (let i = 0; i < this.mate.length; i++) {
      const m = this.mate[i];
      if (count >= CONFIG.separationMax) break;
      if (m.d >= radius) continue;

      const w = 1 - m.d / radius;
      sx += (-m.dx / m.d) * w;
      sy += (-m.dy / m.d) * w;
      count++;
    }

    const mag = Math.hypot(sx, sy);
    if (mag > 1) {
      sx /= mag;
      sy /= mag;
    }

    return {
      x: sx * weight * CONFIG.separationWeight,
      y: sy * weight * CONFIG.separationWeight
    };
  }

  /**
   * Smooths the icon rotation toward velocity direction.
   *
   * @param {number} speed - Current velocity magnitude.
   */
  #updateRotation(speed) {
    if (speed <= CONFIG.rotationMinSpeed) return;

    const targetAngle = Math.atan2(this.vy, this.vx) + CONFIG.iconAngleOffset;
    const diff = angleDifference(targetAngle, this.rotation);

    const t = Math.min(1, speed / CONFIG.rotationSpeedNorm);
    const k = CONFIG.rotationSmoothMin + (CONFIG.rotationSmoothMax - CONFIG.rotationSmoothMin) * t;
    this.rotation += diff * k;

    if (this.renderer) {
      this.renderer.updateRotation(this.rotation);
    }
  }
}
