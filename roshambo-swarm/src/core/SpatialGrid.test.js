import test from 'node:test';
import assert from 'node:assert/strict';
import { SpatialGrid } from './SpatialGrid.js';
import { Boundary } from './Boundary.js';
import { SCENE_WALLS } from '../config/factions.js';

test('SpatialGrid partitions units into cells and discovers neighbors', () => {
  const grid = new SpatialGrid(100);
  grid.resize(800, 600);

  const boundary = new Boundary(14, 14);
  boundary.resize(800, 600);
  boundary.setWalls(SCENE_WALLS[1]);

  // Mock units without DOM dependencies
  class MockUnit {
    constructor(id, faction, x, y) {
      this.id = id;
      this.faction = faction;
      this.x = x;
      this.y = y;
      this.prey = [];
      this.foe = [];
      this.mate = [];
      this.nearestFoeDistance = Infinity;
    }

    clearPerception() {
      this.prey.length = 0;
      this.foe.length = 0;
      this.mate.length = 0;
      this.nearestFoeDistance = Infinity;
    }

    recordNeighbour(other, kind, dx, dy, d) {
      this[kind].push({ unit: other, dx, dy, d });
      if (kind === 'foe' && d < this.nearestFoeDistance) {
        this.nearestFoeDistance = d;
      }
    }
  }

  // Factions: 0: Rock, 1: Scissors, 2: Paper
  // 0 hunts 1 (prey), 0 is hunted by 2 (foe)
  const unitA = new MockUnit('a', 0, 100, 100); // Rock
  const unitB = new MockUnit('b', 1, 110, 100); // Scissors (10px away -> prey to Rock)
  const unitC = new MockUnit('c', 2, 100, 120); // Paper (20px away -> foe to Rock)
  const unitD = new MockUnit('d', 0, 105, 105); // Rock (mate to Rock)
  const unitFar = new MockUnit('far', 1, 700, 500); // Far away

  /** @type {any[]} */
  const units = [unitA, unitB, unitC, unitD, unitFar];

  grid.build(units);
  grid.assignNeighbors(units, 50, 3, boundary);

  // Check unitA's perception
  assert.equal(unitA.prey.length, 1);
  assert.equal(unitA.prey[0].unit.id, 'b');

  assert.equal(unitA.foe.length, 1);
  assert.equal(unitA.foe[0].unit.id, 'c');
  assert.equal(unitA.nearestFoeDistance, 20);

  assert.equal(unitA.mate.length, 1);
  assert.equal(unitA.mate[0].unit.id, 'd');

  // Verify far unit was not perceived
  assert.ok(!unitA.prey.some(p => p.unit.id === 'far'));
});
