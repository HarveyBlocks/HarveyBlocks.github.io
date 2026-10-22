/**
 * @fileoverview Type definitions and JSDoc schemas for Roshambo Swarm simulation.
 * @module types
 */

/**
 * 2D Cartesian coordinate vector.
 * @typedef {Object} Vector2D
 * @property {number} x - Horizontal coordinate.
 * @property {number} y - Vertical coordinate.
 */

/**
 * 2D Velocity vector.
 * @typedef {Object} Velocity2D
 * @property {number} vx - Horizontal velocity component.
 * @property {number} vy - Vertical velocity component.
 */

/**
 * Boundary Edge identifier.
 * @typedef {'L' | 'R' | 'T' | 'B'} BoundaryEdge
 */

/**
 * Visual styling and metadata for a swarm faction.
 * @typedef {Object} FactionStyle
 * @property {number} id - Faction identifier (0: Rock, 1: Scissors, 2: Paper).
 * @property {string} name - Faction display name.
 * @property {string} icon - Font Awesome icon class name.
 * @property {string} color - Hex/CSS color code representing the faction.
 */

/**
 * Boundary layout for a simulation scene.
 * Each edge is divided into an equal number of segments (e.g. 4);
 * `true` represents a solid wall segment, `false` an open/wrap segment.
 * @typedef {Object} WallConfig
 * @property {readonly boolean[]} L - Left edge segments ordered top to bottom.
 * @property {readonly boolean[]} R - Right edge segments ordered top to bottom.
 * @property {readonly boolean[]} T - Top edge segments ordered left to right.
 * @property {readonly boolean[]} B - Bottom edge segments ordered left to right.
 */

/**
 * Result of a raycast probe query.
 * @typedef {Object} RayHit
 * @property {number} s - Distance from origin to intersection point.
 * @property {BoundaryEdge} edge - Intersected boundary edge.
 * @property {number} t - Normalized coordinate [0, 1] along the intersected edge.
 */

/**
 * Neighbor perception record for an agent.
 * @typedef {Object} NeighborRecord
 * @property {import('../core/Unit.js').Unit} unit - Observed neighbor unit reference.
 * @property {number} dx - Perceived horizontal displacement.
 * @property {number} dy - Perceived vertical displacement.
 * @property {number} d - Perceived Euclidean distance.
 */

/**
 * Steering decision intent produced by an agent's brain.
 * @typedef {Object} SteeringIntent
 * @property {number} dx - Desired direction X (unit vector component).
 * @property {number} dy - Desired direction Y (unit vector component).
 * @property {number} chase - Chase behavior contribution weight.
 * @property {number} flee - Flee behavior contribution weight.
 */

/**
 * Real-time simulation statistics snapshot for UI telemetry.
 * @typedef {Object} SimulationStats
 * @property {number[]} counts - Target counts configured per faction.
 * @property {number[]} liveCounts - Actual active units currently alive per faction.
 * @property {number[]} autoAlpha - Current adaptive aggression ratio [0..1] per faction.
 * @property {number} totalUnits - Total population count.
 * @property {number} frame - Current simulation frame counter.
 * @property {boolean} isRunning - Whether the simulation loop is actively ticking.
 */

export {};
