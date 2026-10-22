/**
 * @fileoverview Main Application Orchestrator for Roshambo Swarm Simulation.
 * Initializes core engine, boundary physics, DOM renderers, UI controller,
 * and runs the high-performance animation loop.
 * @module main
 */

import { CONFIG } from './config/simulationConfig.js';
import { SCENE_WALLS } from './config/factions.js';
import { SwarmEngine } from './core/SwarmEngine.js';
import { WallRenderer } from './ui/WallRenderer.js';
import { PanelController } from './ui/PanelController.js';

/**
 * Main application coordinator class.
 */
export class App {
  constructor() {
    // DOM Element Lookups
    const stage = /** @type {HTMLElement} */ (document.getElementById('stage'));
    const wallsContainer = /** @type {HTMLElement} */ (document.getElementById('walls'));
    const panelEl = /** @type {HTMLElement} */ (document.getElementById('panel'));
    const hambBtn = /** @type {HTMLElement} */ (document.getElementById('hamb'));
    const speedInput = /** @type {HTMLInputElement} */ (document.getElementById('speed'));
    const speedVal = /** @type {HTMLElement} */ (document.getElementById('speedVal'));
    const segContainer = /** @type {HTMLElement} */ (document.getElementById('seg'));
    const rowsContainer = /** @type {HTMLElement} */ (document.getElementById('rows'));
    const btnStart = /** @type {HTMLButtonElement} */ (document.getElementById('btnStart'));
    const btnStop = /** @type {HTMLButtonElement} */ (document.getElementById('btnStop'));
    const btnReset = /** @type {HTMLButtonElement} */ (document.getElementById('btnReset'));

    if (!stage || !wallsContainer || !panelEl || !hambBtn) {
      throw new Error('Required DOM root elements missing in index.html');
    }

    /** @type {HTMLElement} */
    this.stage = stage;
    /** @type {SwarmEngine} */
    this.engine = new SwarmEngine(stage);
    /** @type {WallRenderer} */
    this.wallRenderer = new WallRenderer(wallsContainer);

    /** @type {boolean} Simulation active state */
    this.running = false;
    /** @type {number} Current speed scalar */
    this.speed = CONFIG.speedReference;
    /** @type {number} Current active scene index */
    this.scene = 1;
    /** @type {number} Timestamp of the previous animation frame */
    this.lastTime = 0;
    /** @type {number} Frame ticker for UI telemetry throttle */
    this.frameTicker = 0;
    /** @type {boolean} Whether initial layout bootstrap has finished */
    this.booted = false;
    /** @type {number} Retry counter for initial DOM measurement */
    this.bootAttempts = 0;

    /** @type {number} Current measured stage width */
    this.width = 0;
    /** @type {number} Current measured stage height */
    this.height = 0;

    /** @type {PanelController} UI controller */
    this.panelController = new PanelController({
      panelEl,
      hambBtn,
      speedInput,
      speedVal,
      segContainer,
      rowsContainer,
      btnStart,
      btnStop,
      btnReset,
      callbacks: {
        onSpeedChange: (newSpeed) => {
          this.speed = newSpeed;
        },
        onSceneChange: (newScene) => {
          this.setScene(newScene);
        },
        onCountChange: (faction, count) => {
          this.engine.syncCount(faction, count);
        },
        onStart: () => {
          this.setRunning(true);
        },
        onStop: () => {
          this.setRunning(false);
        },
        onReset: () => {
          this.setRunning(false);
          this.engine.rebuild();
          this.panelController.updateTelemetry(this.engine.getStats());
        }
      }
    });

    this.#initEvents();
  }

  /**
   * Initializes the application once the DOM and viewport measurements are ready.
   */
  init() {
    this.#boot();
  }

  /**
   * Boots the engine layout and starts the animation loop.
   */
  #boot() {
    this.#measure();

    if (this.width <= 0 || this.height <= 0) {
      this.bootAttempts++;
      if (this.bootAttempts < 30) {
        requestAnimationFrame(() => this.#boot());
        return;
      }
      this.width = window.innerWidth || 375;
      this.height = window.innerHeight || 667;
    }

    if (this.booted) return;
    this.booted = true;

    this.#applyDimensions();
    this.engine.rebuild();
    this.setRunning(false);
    this.panelController.updateTelemetry(this.engine.getStats());

    requestAnimationFrame(this.#animationLoop);
  }

  /**
   * Measures the stage DOM dimensions.
   */
  #measure() {
    this.width = this.stage.clientWidth || window.innerWidth || 0;
    this.height = this.stage.clientHeight || window.innerHeight || 0;
    if (this.width < 10) this.width = window.innerWidth || 375;
    if (this.height < 10) this.height = window.innerHeight || 667;
  }

  /**
   * Applies measured dimensions to engine, stage CSS variable, and wall renderer.
   */
  #applyDimensions() {
    this.engine.resize(this.width, this.height);
    this.stage.style.setProperty('--s', this.engine.scale.toFixed(3));
    this.wallRenderer.renderWalls(
      this.engine.currentWalls,
      this.width,
      this.height,
      this.engine.wallThickness
    );
    this.panelController.applyPanelScale(this.width, this.height);
  }

  /**
   * Changes the active obstacle scene preset.
   *
   * @param {number} sceneId - Scene index.
   */
  setScene(sceneId) {
    if (this.scene === sceneId) return;

    this.setRunning(false);
    this.scene = sceneId;
    const walls = SCENE_WALLS[sceneId] || SCENE_WALLS[1];
    this.engine.setWalls(walls);

    this.#measure();
    this.#applyDimensions();
    this.lastTime = 0;
    this.engine.rebuild();
    this.panelController.updateTelemetry(this.engine.getStats());
  }

  /**
   * Sets whether the simulation is currently running or paused.
   *
   * @param {boolean} isRunning - Running state.
   */
  setRunning(isRunning) {
    this.running = isRunning;
    this.panelController.setRunningState(isRunning);
  }

  /**
   * Main requestAnimationFrame simulation loop.
   *
   * @param {number} time - High-resolution timestamp in milliseconds.
   */
  #animationLoop = (time) => {
    try {
      if (!this.lastTime) this.lastTime = time;

      let dt = (time - this.lastTime) / 16.6667;
      this.lastTime = time;
      dt *= this.speed / CONFIG.speedReference;
      dt = Math.max(0, Math.min(CONFIG.maxFrameDelta, dt));

      if (dt > 0 && this.running) {
        this.engine.update(dt);
      }

      if (++this.frameTicker % 5 === 0) {
        this.panelController.updateTelemetry(this.engine.getStats());
      }
    } catch (err) {
      console.error('Simulation loop error:', err);
    } finally {
      requestAnimationFrame(this.#animationLoop);
    }
  };

  /**
   * Binds window resize and orientation events.
   */
  #initEvents() {
    window.addEventListener('resize', () => {
      this.#measure();
      if (this.width <= 0 || this.height <= 0) return;
      this.#applyDimensions();
      this.engine.clampUnitsInside();
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.#measure();
        if (this.width <= 0 || this.height <= 0) return;
        this.#applyDimensions();
        this.engine.clampUnitsInside();
      }, 120);
    });
  }
}

// Auto-bootstrap when loaded in browser
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    // Expose app instance to window for testability / inspection
    /** @type {any} */ (window).roshamboApp = app;
  });
}
