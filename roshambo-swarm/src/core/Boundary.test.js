import test from 'node:test';
import assert from 'node:assert/strict';
import { Boundary } from './Boundary.js';
import { SCENE_WALLS } from '../config/factions.js';

test('Boundary correctly detects solid edges based on wall configuration', () => {
  const boundary = new Boundary(14, 14);
  boundary.resize(800, 600);

  // Scene 1: Fully open (all false)
  boundary.setWalls(SCENE_WALLS[1]);
  assert.equal(boundary.isSolid('L', 0.1), false);
  assert.equal(boundary.isSolid('R', 0.5), false);
  assert.equal(boundary.isSolid('T', 0.9), false);
  assert.equal(boundary.isSolid('B', 0.3), false);

  // Scene 2: Fully walled (all true)
  boundary.setWalls(SCENE_WALLS[2]);
  assert.equal(boundary.isSolid('L', 0.1), true);
  assert.equal(boundary.isSolid('R', 0.5), true);
  assert.equal(boundary.isSolid('T', 0.9), true);
  assert.equal(boundary.isSolid('B', 0.3), true);

  // Scene 3: Corners walled [true, false, false, true]
  boundary.setWalls(SCENE_WALLS[3]);
  assert.equal(boundary.isSolid('L', 0.1), true); // in first 25%
  assert.equal(boundary.isSolid('L', 0.5), false); // in middle 50%
  assert.equal(boundary.isSolid('L', 0.9), true); // in last 25%
});

test('Boundary settle wraps positions across open boundaries', () => {
  const boundary = new Boundary(14, 14);
  boundary.resize(800, 600);
  boundary.setWalls(SCENE_WALLS[1]); // Fully open

  // Crossed left boundary (< 0)
  const unitLeft = { x: -5, y: 300, vx: -2, vy: 0 };
  boundary.settle(unitLeft);
  assert.equal(unitLeft.x, 795);
  assert.equal(unitLeft.vx, -2); // Unaltered velocity

  // Crossed right boundary (> 800)
  const unitRight = { x: 805, y: 300, vx: 2, vy: 0 };
  boundary.settle(unitRight);
  assert.equal(unitRight.x, 5);
  assert.equal(unitRight.vx, 2);
});

test('Boundary settle clamps and bounces positions against solid walls', () => {
  const boundary = new Boundary(14, 14);
  boundary.resize(800, 600);
  boundary.setWalls(SCENE_WALLS[2]); // Fully walled

  // Hit left wall
  const unitLeft = { x: -5, y: 300, vx: -4, vy: 0 };
  boundary.settle(unitLeft);
  assert.equal(unitLeft.x, 0); // Clamped to 0
  assert.ok(unitLeft.vx > 0); // Bounced positive (restitution)

  // Hit right wall
  const unitRight = { x: 805, y: 300, vx: 4, vy: 0 };
  boundary.settle(unitRight);
  assert.equal(unitRight.x, 800);
  assert.ok(unitRight.vx < 0);
});

test('Boundary castRay detects solid wall intersections', () => {
  const boundary = new Boundary(14, 14);
  boundary.resize(800, 600);
  boundary.setWalls(SCENE_WALLS[2]); // Fully walled

  // Ray cast from center (400, 300) directly to the right (angle 0)
  const dist = boundary.castRay(400, 300, 0);
  assert.ok(Math.abs(dist - 400) < 1e-4);
});
