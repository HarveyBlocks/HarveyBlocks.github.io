/**
 * @fileoverview Faction definitions and boundary wall presets for the Roshambo Swarm.
 * @module config/factions
 */

/**
 * Faction visual styles and metadata.
 * Cyclic predator-prey relationship:
 * - Rock (0) beats Scissors (1)
 * - Scissors (1) beats Paper (2)
 * - Paper (2) beats Rock (0)
 *
 * (b.faction - a.faction + 3) % 3:
 * 1 => b is prey to a
 * 2 => b is predator/foe to a
 * 0 => b is mate/same faction
 *
 * @type {readonly import('../types/index.js').FactionStyle[]}
 */
export const FACTIONS = Object.freeze([
  {
    id: 0,
    name: 'Rock',
    icon: 'fa-solid fa-hand-back-fist',
    color: '#64748b' // Slate 500
  },
  {
    id: 1,
    name: 'Scissors',
    icon: 'fa-solid fa-hand-scissors',
    color: '#0284c7' // Sky 600
  },
  {
    id: 2,
    name: 'Paper',
    icon: 'fa-solid fa-hand',
    color: '#d97706' // Amber 600
  }
]);

/**
 * Total number of competing factions.
 * @type {number}
 */
export const FACTION_COUNT = FACTIONS.length;

/**
 * Human-readable scene labels for UI selector buttons.
 * @type {Readonly<Record<number, string>>}
 */
export const SCENE_LABELS = Object.freeze({
  1: 'Fully open (Toroidal)',
  2: 'Fully walled',
  3: 'Corners walled, edges open',
  4: 'Corners open, edges walled'
});

/**
 * Edge wall segment configurations for each scene preset.
 * Each edge array contains 4 segments representing 25% increments along that edge.
 * `true` = solid barrier, `false` = open toroidal pass-through.
 *
 * @type {Readonly<Record<number, import('../types/index.js').WallConfig>>}
 */
export const SCENE_WALLS = Object.freeze({
  1: Object.freeze({
    L: Object.freeze([false, false, false, false]),
    R: Object.freeze([false, false, false, false]),
    T: Object.freeze([false, false, false, false]),
    B: Object.freeze([false, false, false, false])
  }),
  2: Object.freeze({
    L: Object.freeze([true, true, true, true]),
    R: Object.freeze([true, true, true, true]),
    T: Object.freeze([true, true, true, true]),
    B: Object.freeze([true, true, true, true])
  }),
  3: Object.freeze({
    L: Object.freeze([true, false, false, true]),
    R: Object.freeze([true, false, false, true]),
    T: Object.freeze([true, false, false, true]),
    B: Object.freeze([true, false, false, true])
  }),
  4: Object.freeze({
    L: Object.freeze([false, true, true, false]),
    R: Object.freeze([false, true, true, false]),
    T: Object.freeze([false, true, true, false]),
    B: Object.freeze([false, true, true, false])
  })
});
