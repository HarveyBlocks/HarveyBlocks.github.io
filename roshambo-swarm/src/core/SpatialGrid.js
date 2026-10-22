/**
 * @fileoverview High-performance 2D spatial hashing grid for efficient O(N) local neighbor queries.
 * Decouples spatial binning logic from swarm physics and rendering.
 * @module core/SpatialGrid
 */

/**
 * 2D Spatial Hash Grid for broadphase collision and perception neighbor discovery.
 */
export class SpatialGrid {
  /**
   * Constructs a SpatialGrid instance.
   *
   * @param {number} [cellSize=140] - Edge dimension of each grid bucket in pixels.
   */
  constructor(cellSize = 140) {
    /** @type {number} */
    this.cellSize = cellSize;
    /** @type {number} */
    this.width = 0;
    /** @type {number} */
    this.height = 0;
    /** @type {number} */
    this.numCellsX = 1;
    /** @type {number} */
    this.numCellsY = 1;
    /** @type {Map<number, import('./Unit.js').Unit[]>} */
    this.grid = new Map();
    /** @type {number[]} Temporary reused buffer for neighbor cell indices */
    this.cellBuffer = [];
  }

  /**
   * Resizes the spatial partitioning structure based on stage bounds and cell size.
   *
   * @param {number} width - Simulation width in pixels.
   * @param {number} height - Simulation height in pixels.
   * @param {number} [cellSize] - Optional updated cell size in pixels.
   */
  resize(width, height, cellSize) {
    this.width = width;
    this.height = height;
    if (cellSize && cellSize > 0) {
      this.cellSize = cellSize;
    }
    this.numCellsX = Math.max(1, Math.ceil(this.width / this.cellSize));
    this.numCellsY = Math.max(1, Math.ceil(this.height / this.cellSize));
    this.clear();
  }

  /**
   * Clears all buckets in the spatial hash grid.
   */
  clear() {
    this.grid.clear();
  }

  /**
   * Inserts an agent into the spatial grid based on its current position.
   *
   * @param {import('./Unit.js').Unit} unit - Agent to bin.
   */
  insert(unit) {
    let gx = Math.floor(unit.x / this.cellSize) % this.numCellsX;
    if (gx < 0) gx += this.numCellsX;
    let gy = Math.floor(unit.y / this.cellSize) % this.numCellsY;
    if (gy < 0) gy += this.numCellsY;

    const key = gx * this.numCellsY + gy;
    let bucket = this.grid.get(key);
    if (!bucket) {
      bucket = [];
      this.grid.set(key, bucket);
    }
    bucket.push(unit);
  }

  /**
   * Populates the grid with all units, clearing each unit's perception buffers.
   *
   * @param {import('./Unit.js').Unit[]} units - Array of active swarm agents.
   */
  build(units) {
    this.clear();
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      u.clearPerception();
      this.insert(u);
    }
  }

  /**
   * Performs neighbor perception assignment across 9-cell local neighborhoods.
   * Identifies prey, predator (foe), and mate relationships for each unit.
   *
   * @param {import('./Unit.js').Unit[]} units - All units to process.
   * @param {number} perceptionRange - Perception distance threshold.
   * @param {number} factionCount - Total number of cyclic factions.
   * @param {import('./Boundary.js').Boundary} boundary - Spatial boundary for wrap/occlusion math.
   */
  assignNeighbors(units, perceptionRange, factionCount, boundary) {
    const nx = this.numCellsX;
    const ny = this.numCellsY;
    const rangeSq = perceptionRange * perceptionRange;
    const cellBuffer = this.cellBuffer;

    for (let i = 0; i < units.length; i++) {
      const a = units[i];
      let cx = Math.floor(a.x / this.cellSize) % nx;
      if (cx < 0) cx += nx;
      let cy = Math.floor(a.y / this.cellSize) % ny;
      if (cy < 0) cy += ny;

      cellBuffer.length = 0;

      for (let ox = -1; ox <= 1; ox++) {
        const gx = ((cx + ox) % nx + nx) % nx;
        for (let oy = -1; oy <= 1; oy++) {
          const gy = ((cy + oy) % ny + ny) % ny;
          const key = gx * ny + gy;

          if (cellBuffer.includes(key)) continue;
          cellBuffer.push(key);

          const bucket = this.grid.get(key);
          if (!bucket) continue;

          for (let k = 0; k < bucket.length; k++) {
            const b = bucket[k];
            if (b === a) continue;

            const delta = boundary.perceiveDelta(a, b.x, b.y);
            const d2 = delta.dx * delta.dx + delta.dy * delta.dy;
            if (d2 > rangeSq) continue;

            const d = Math.sqrt(d2) || 1e-6;
            const rel = (b.faction - a.faction + factionCount) % factionCount;

            if (rel === 1) {
              a.recordNeighbour(b, 'prey', delta.dx, delta.dy, d);
            } else if (rel === factionCount - 1) {
              a.recordNeighbour(b, 'foe', delta.dx, delta.dy, d);
            } else {
              a.recordNeighbour(b, 'mate', delta.dx, delta.dy, d);
            }
          }
        }
      }
    }
  }
}
