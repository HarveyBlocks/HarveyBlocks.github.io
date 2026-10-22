/**
 * @fileoverview Swarm Engine - Master controller for the multi-agent ecosystem.
 * Orchestrates spatial boundary physics, adaptive population balancing, broadphase collision,
 * and cyclic predator-prey conversion logic.
 * @module core/SwarmEngine
 */

import { CONFIG } from '../config/simulationConfig.js';
import { FACTION_COUNT, SCENE_WALLS } from '../config/factions.js';
import { Boundary } from './Boundary.js';
import { SpatialGrid } from './SpatialGrid.js';
import { Unit } from './Unit.js';
import { clamp } from '../utils/math.js';

/**
 * High-cohesion engine orchestrating units, spatial indexing, adaptive game mechanics,
 * and boundary collisions.
 */
export class SwarmEngine {
  /**
   * Constructs a SwarmEngine instance.
   *
   * @param {HTMLElement} [container] - DOM container element where units are mounted.
   */
  constructor(container) {
    /** @type {HTMLElement | undefined} */
    this.container = container;
    /** @type {Boundary} */
    this.boundary = new Boundary(CONFIG.wallThickness, CONFIG.softWallRange);
    /** @type {SpatialGrid} */
    this.spatialGrid = new SpatialGrid(CONFIG.gridCell);
    /** @type {Unit[]} */
    this.units = [];

    /** @type {number[]} Desired counts per faction */
    this.counts = [25, 25, 25];
    /** @type {number[]} Dynamic aggression ratios [0..1] per faction */
    this.autoAlpha = [0.5, 0.5, 0.5];
    /** @type {number} Frame counter */
    this.frame = 0;
    /** @type {import('../types/index.js').WallConfig} Current wall preset */
    this.currentWalls = SCENE_WALLS[1];

    /** @type {number} Viewport width in pixels */
    this.width = 0;
    /** @type {number} Viewport height in pixels */
    this.height = 0;
    /** @type {number} Responsive scale factor */
    this.scale = 1;

    // Derived physical quantities scaled with viewport
    this.unitSize = CONFIG.unitSize;
    this.range = CONFIG.perceptionRange;
    this.danger = CONFIG.dangerDistance;
    this.separationRadius = CONFIG.separationRadius;
    this.baseForce = CONFIG.baseForce;
    this.maxForce = CONFIG.maxForce;
    this.mainForce = CONFIG.baseForce * CONFIG.mainForceMultiplier;
    this.convertRadius = CONFIG.conversionRadius;
    this.baseSpeed = CONFIG.maxSpeed * CONFIG.unitSize;
    this.ghostMargin = CONFIG.unitSize * CONFIG.ghostMargin;
    this.wallThickness = CONFIG.wallThickness;
    this.softRange = CONFIG.softWallRange;
    this.pad = CONFIG.wallThickness + CONFIG.unitSize * 0.5;
  }

  /**
   * Recalculates all scale-dependent simulation constants based on new dimensions.
   *
   * @param {number} width - Viewport width in pixels.
   * @param {number} height - Viewport height in pixels.
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.boundary.resize(width, height);

    const minDim = Math.min(width, height);
    let s = minDim / CONFIG.referenceSize;
    if (!Number.isFinite(s) || s <= 0) s = CONFIG.scaleMin;
    s = clamp(s, CONFIG.scaleMin, CONFIG.scaleMax);
    this.scale = s;

    this.unitSize = CONFIG.unitSize * s;
    this.range = CONFIG.perceptionRange * s;
    this.spatialGrid.resize(width, height, CONFIG.gridCell * s);
    this.danger = CONFIG.dangerDistance * s;
    this.separationRadius = CONFIG.separationRadius * s;
    this.baseForce = CONFIG.baseForce * s;
    this.maxForce = CONFIG.maxForce * s;
    this.mainForce = this.baseForce * CONFIG.mainForceMultiplier;
    this.convertRadius = CONFIG.conversionRadius * s;
    this.baseSpeed = CONFIG.maxSpeed * this.unitSize;
    this.ghostMargin = this.unitSize * CONFIG.ghostMargin;
    this.wallThickness = CONFIG.wallThickness * s;
    this.softRange = CONFIG.softWallRange * s;
    this.pad = this.wallThickness + this.unitSize * 0.5;

    this.boundary.setScale(this.wallThickness, this.softRange);
  }

  /**
   * Applies a new wall layout preset to the boundary.
   *
   * @param {import('../types/index.js').WallConfig} walls - New wall configuration.
   */
  setWalls(walls) {
    this.currentWalls = walls;
    this.boundary.setWalls(walls);
  }

  /**
   * Reinitializes the entire population according to current count targets.
   */
  rebuild() {
    for (let i = 0; i < this.units.length; i++) {
      this.units[i].destroy();
    }
    this.units = [];

    const pad = this.pad;
    const usableW = Math.max(1, this.width - pad * 2);
    const usableH = Math.max(1, this.height - pad * 2);

    for (let f = 0; f < FACTION_COUNT; f++) {
      for (let i = 0; i < this.counts[f]; i++) {
        let x = pad + Math.random() * usableW;
        let y = pad + Math.random() * usableH;
        if (!Number.isFinite(x)) x = this.width * 0.5;
        if (!Number.isFinite(y)) y = this.height * 0.5;

        this.units.push(new Unit(f, x, y, this.container));
      }
    }

    this.autoAlpha.fill(0.5);
  }

  /**
   * Synchronizes the active unit count of a specific faction to match a target count.
   *
   * @param {number} faction - Faction identifier.
   * @param {number} target - Target population count.
   */
  syncCount(faction, target) {
    this.counts[faction] = target;
    const current = this.units.filter(u => u.faction === faction);

    if (current.length < target) {
      const pad = this.pad;
      const usableW = Math.max(1, this.width - pad * 2);
      const usableH = Math.max(1, this.height - pad * 2);

      for (let i = current.length; i < target; i++) {
        let x = pad + Math.random() * usableW;
        let y = pad + Math.random() * usableH;
        if (!Number.isFinite(x)) x = this.width * 0.5;
        if (!Number.isFinite(y)) y = this.height * 0.5;

        this.units.push(new Unit(faction, x, y, this.container));
      }
      return;
    }

    if (current.length > target) {
      for (let i = target; i < current.length; i++) {
        const u = current[i];
        u.destroy();
        const idx = this.units.indexOf(u);
        if (idx >= 0) {
          this.units.splice(idx, 1);
        }
      }
    }
  }

  /**
   * Clamps all unit positions within current bounds after a viewport resize.
   */
  clampUnitsInside() {
    const pad = this.pad;
    const maxX = Math.max(pad, this.width - pad);
    const maxY = Math.max(pad, this.height - pad);

    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      u.x = clamp(u.x, pad, maxX);
      u.y = clamp(u.y, pad, maxY);
    }
  }

  /**
   * Advances the simulation by one physical integration step.
   *
   * @param {number} dt - Frame delta time normalized to standard 60fps frame.
   */
  update(dt) {
    const n = FACTION_COUNT;
    const frame = ++this.frame;
    /** @type {Array<Unit | number>} */
    const conversions = [];

    // Count living units per faction
    const liveCounts = new Array(n).fill(0);
    for (let i = 0; i < this.units.length; i++) {
      liveCounts[this.units[i].faction]++;
    }
    const total = this.units.length;

    // Dynamically adjust aggression according to population equilibrium
    this.#updateAggression(liveCounts, total, dt);

    // Compute dynamic speed handicap limits
    const speedLimits = new Array(n);
    for (let f = 0; f < n; f++) {
      const ratio = total ? liveCounts[f] / total : 0;
      const sc = CONFIG.speedScaleMin + (CONFIG.speedScaleMax - CONFIG.speedScaleMin) * (1 - ratio);
      speedLimits[f] = this.baseSpeed * sc;
    }

    // Broadphase spatial partitioning and neighbor perception
    this.spatialGrid.build(this.units);
    this.spatialGrid.assignNeighbors(this.units, this.range, n, this.boundary);

    // Steering decision and physics integration
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      const intent = u.decide(frame, this.autoAlpha[u.faction], this.boundary, this.danger, this.range);
      u.act(
        intent,
        dt,
        speedLimits[u.faction],
        this.boundary,
        this.baseForce,
        this.mainForce,
        this.maxForce,
        this.separationRadius,
        this.scale
      );

      // Check conversion contacts
      for (let j = 0; j < u.prey.length; j++) {
        const p = u.prey[j];
        if (p.d < this.convertRadius) {
          conversions.push(p.unit, u.faction);
          break;
        }
      }

      u.updateGhosts(this.width, this.height, this.ghostMargin, this.boundary);
    }

    // Execute conversions in batch
    for (let i = 0; i < conversions.length; i += 2) {
      /** @type {Unit} */ (conversions[i]).setFaction(/** @type {number} */ (conversions[i + 1]));
    }
  }

  /**
   * Returns a telemetry snapshot of active unit counts and aggression values.
   *
   * @returns {import('../types/index.js').SimulationStats}
   */
  getStats() {
    const liveCounts = new Array(FACTION_COUNT).fill(0);
    for (let i = 0; i < this.units.length; i++) {
      const f = this.units[i].faction;
      if (f < FACTION_COUNT) liveCounts[f]++;
    }

    return {
      counts: [...this.counts],
      liveCounts,
      autoAlpha: [...this.autoAlpha],
      totalUnits: this.units.length,
      frame: this.frame,
      isRunning: true
    };
  }

  /**
   * Updates per-faction aggression balance using game-theoretic ecological model.
   *
   * @param {number[]} liveCounts - Active counts per faction.
   * @param {number} total - Total active population.
   * @param {number} dt - Frame delta time.
   */
  #updateAggression(liveCounts, total, dt) {
    if (total <= 0) return;

    const n = FACTION_COUNT;
    const baseline = 1 / n;
    const eps = 0.05;
    const k = 1 - Math.pow(CONFIG.aggressionSmooth, dt);

    for (let f = 0; f < n; f++) {
      const self = Math.max(liveCounts[f] / total / baseline, eps);
      const up = Math.max(liveCounts[(f - 1 + n) % n] / total / baseline, eps);
      const down = Math.max(liveCounts[(f + 1) % n] / total / baseline, eps);

      const signal =
        CONFIG.aggressionDown * Math.log(down) -
        CONFIG.aggressionUp * Math.log(up) -
        CONFIG.aggressionSelf * Math.log(self);

      const target = 1 / (1 + Math.exp(-CONFIG.aggressionSlope * signal));
      const next = this.autoAlpha[f] + (target - this.autoAlpha[f]) * k;
      this.autoAlpha[f] = clamp(next, CONFIG.aggressionMin, CONFIG.aggressionMax);
    }
  }
}
