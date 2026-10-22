/**
 * @fileoverview Central configuration for physical constants, perception radiuses,
 * steering dynamics, and spatial boundaries of the Roshambo Swarm simulation.
 * @module config/simulationConfig
 */

/**
 * Immutable configuration dictionary for all simulation heuristics and scales.
 */
export const CONFIG = Object.freeze({
  /** Stage reference dimension in pixels for scale normalization */
  referenceSize: 760,
  /** Minimum allowable scale factor on small screens */
  scaleMin: 0.45,
  /** Maximum allowable scale factor on ultra-wide screens */
  scaleMax: 1.15,

  /** Reference speed index corresponding to 100% normal speed */
  speedReference: 20,
  /** Upper bound on frame delta to prevent physics blowout on lag */
  maxFrameDelta: 2.5,
  /** Velocity damping per reference frame */
  damping: 0.9,

  /** Number of discrete wall partitions per boundary edge */
  segmentsPerEdge: 4,
  /** Maximum number of wrap bounces for raycast probes */
  probeBounces: 4,
  /** Floating-point precision epsilon */
  epsilon: 1e-9,
  /** Nominal thickness of solid boundary walls */
  wallThickness: 14,
  /** Distance range over which soft repulsive boundary force activates */
  softWallRange: 14,
  /** Multiplier for soft wall exponential repulsion force */
  softWallStrength: 4.5,
  /** Velocity restitution coefficient when bouncing off solid walls */
  collisionBounce: 0.25,

  /** Corner slide factor when avoiding perpendicular corner walls */
  cornerSlide: 0.65,
  /** Inward deflection factor when sliding along corner walls */
  cornerInward: 0.35,
  /** Minimum angle deviation from perpendicular wall to allow slide */
  cornerFacingMin: 0.15,

  /** Nominal unit icon diameter in pixels */
  unitSize: 24,
  /** Icon orientation offset in radians (Font Awesome icons point upward by default) */
  iconAngleOffset: Math.PI / 2,
  /** Minimum speed required before rotating the unit icon */
  rotationMinSpeed: 0.12,
  /** Minimum slerp smoothing factor for rotational alignment */
  rotationSmoothMin: 0.18,
  /** Maximum slerp smoothing factor for rotational alignment */
  rotationSmoothMax: 0.42,
  /** Speed normalization denominator for rotation smoothing */
  rotationSpeedNorm: 2,

  /** Maximum perception radius for detecting neighbors */
  perceptionRange: 140,
  /** Spatial hash grid cell size in pixels */
  gridCell: 140,
  /** Distance at which predator presence triggers heightened flee reaction */
  dangerDistance: 65,
  /** Inter-agent collision separation radius */
  separationRadius: 38,
  /** Weight applied to flocking separation force */
  separationWeight: 1.0,
  /** Maximum number of nearest mates considered for separation */
  separationMax: 8,
  /** Contact radius triggering prey faction conversion */
  conversionRadius: 17,

  /** Base propulsion acceleration */
  baseForce: 0.30,
  /** Multiplier for active heading propulsion */
  mainForceMultiplier: 1.8,
  /** Clamped maximum total force per frame */
  maxForce: 2.1,
  /** Stochastic Brownian motion perturbation */
  jitter: 0.02,

  /** Nominal maximum speed coefficient */
  maxSpeed: 2.8 / 24,
  /** Speed handicap scaling for dominating factions (minimum speed factor) */
  speedScaleMin: 0.35,
  /** Speed advantage scaling for endangered factions (maximum speed factor) */
  speedScaleMax: 1.0,

  /** Future lookahead frame count for trajectory prediction */
  predictFrames: 14,
  /** Base turning rate in radians per frame */
  turnBase: 0.10,
  /** Turning rate while actively pursuing prey */
  turnChase: 0.17,
  /** Turning rate while actively fleeing predators */
  turnFlee: 0.24,

  /** Duration (in frames) an agent remembers the last seen target position */
  memoryFrames: 70,
  /** Minimum distance to memory position before abandoning waypoint */
  memoryMinDistance: 8,
  /** Rate of random heading wander when idle */
  wanderRate: 0.14,

  /** Maximum weight cap for flee vector */
  fleeWeightCap: 8,
  /** Clamp factor for minimum flee distance denominator */
  fleeClampFactor: 0.2,
  /** Minimum scatter weight for escaping clusters */
  scatterWeightMin: 0.08,
  /** Per-mate scatter weight increment */
  scatterWeightStep: 0.03,
  /** Maximum scatter weight cap */
  scatterWeightMax: 0.22,
  /** Fraction of perception range used for scatter calculations */
  scatterRadiusFraction: 0.55,
  /** Multiplier for danger distance triggering flock scatter */
  scatterTrigger: 2.0,

  /** Epsilon threshold to detect when unit is trapped or surrounded */
  surroundEps: 0.12,
  /** Number of radial ray samples tested to find escape opening */
  openDirectionSamples: 12,
  /** Probe length factor for open direction discovery */
  openDirectionProbeFactor: 2.2,
  /** Minimum clear distance factor required for open direction */
  openDirectionMinFactor: 0.5,

  /** Global damping applied to chase behavior */
  chaseGlobalDamp: 0.55,
  /** Danger distance multiplier below which chase is completely suppressed */
  chaseSuppressNear: 1.5,
  /** Danger distance multiplier above which chase is fully allowed */
  chaseSuppressFar: 2.5,
  /** Normalization factor for chase distance falloff */
  chaseDistanceNorm: 0.55,
  /** Threshold below which agent falls back to memory/wandering */
  fallbackWeight: 0.05,

  /** Exponential base for aggression-dependent chase/flee balance */
  aggressionBase: 3.5,
  /** Weight of prey population abundance in aggression calculation */
  aggressionDown: 0.9,
  /** Weight of predator population threat in aggression calculation */
  aggressionUp: 1.1,
  /** Weight of self population density in aggression calculation */
  aggressionSelf: 0.7,
  /** Sigmoid steepness for auto-aggression scaling */
  aggressionSlope: 1.8,
  /** Minimum clamped aggression alpha */
  aggressionMin: 0.08,
  /** Maximum clamped aggression alpha */
  aggressionMax: 0.92,
  /** Temporal smoothing rate for aggression adjustments */
  aggressionSmooth: 0.97,
  /** Softening coefficient for danger suppression under high aggression */
  aggressionSuppressSoft: 0.9,

  /** Number of ghost avatar clones allocated for seamless toroidal wrapping */
  ghostSlots: 4,
  /** Screen border margin (in unitSize units) for activating ghost clones */
  ghostMargin: 1.1
});
