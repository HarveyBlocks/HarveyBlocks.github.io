/**
 * @fileoverview PanelController - Manages UI controls, sliders, scene switches,
 * interactive drawer states, and telemetry data display.
 * @module ui/PanelController
 */

import { FACTIONS, FACTION_COUNT, SCENE_LABELS } from '../config/factions.js';
import { interpolateAggressionColor } from '../utils/math.js';

/**
 * Controller managing user input panel and UI telemetry displays.
 */
export class PanelController {
  /**
   * Constructs a PanelController.
   *
   * @param {Object} options - Configuration and DOM bindings.
   * @param {HTMLElement} options.panelEl - Floating control panel element.
   * @param {HTMLElement} options.hambBtn - Hamburger menu trigger button.
   * @param {HTMLInputElement} options.speedInput - Speed range slider input.
   * @param {HTMLElement} options.speedVal - Speed value label.
   * @param {HTMLElement} options.segContainer - Scene selection buttons container.
   * @param {HTMLElement} options.rowsContainer - Faction rows container.
   * @param {HTMLButtonElement} options.btnStart - Start button.
   * @param {HTMLButtonElement} options.btnStop - Stop button.
   * @param {HTMLButtonElement} options.btnReset - Reset button.
   * @param {Object} options.callbacks - Event handler callbacks.
   * @param {(speed: number) => void} options.callbacks.onSpeedChange - Fired when speed slider updates.
   * @param {(sceneId: number) => void} options.callbacks.onSceneChange - Fired when scene changes.
   * @param {(faction: number, count: number) => void} options.callbacks.onCountChange - Fired when population slider changes.
   * @param {() => void} options.callbacks.onStart - Fired when Start is pressed.
   * @param {() => void} options.callbacks.onStop - Fired when Stop is pressed.
   * @param {() => void} options.callbacks.onReset - Fired when Reset is pressed.
   */
  constructor({
    panelEl,
    hambBtn,
    speedInput,
    speedVal,
    segContainer,
    rowsContainer,
    btnStart,
    btnStop,
    btnReset,
    callbacks
  }) {
    this.panelEl = panelEl;
    this.hambBtn = hambBtn;
    this.speedInput = speedInput;
    this.speedVal = speedVal;
    this.segContainer = segContainer;
    this.rowsContainer = rowsContainer;
    this.btnStart = btnStart;
    this.btnStop = btnStop;
    this.btnReset = btnReset;
    this.callbacks = callbacks;

    /** @type {HTMLElement[]} Badges displaying active unit count per faction */
    this.countBadges = [];
    /** @type {HTMLElement[]} Badges displaying dynamic aggression factor per faction */
    this.aggressionBadges = [];
    /** @type {HTMLInputElement[]} Sliders controlling population per faction */
    this.countSliders = [];
    /** @type {number | null} Timeout ID for hover-hide debounce */
    this.hideTimer = null;
    /** @type {number} Current active scene index */
    this.currentScene = 1;

    this.#initPanelToggle();
    this.#initControls();
    this.#renderScenes();
    this.#renderFactionRows();
  }

  /**
   * Updates the UI state when simulation starts or stops.
   *
   * @param {boolean} isRunning - Whether the simulation is currently active.
   */
  setRunningState(isRunning) {
    this.btnStart.classList.toggle('on', isRunning);
    this.btnStart.classList.toggle('go', isRunning);
    this.btnStop.classList.toggle('on', !isRunning);
  }

  /**
   * Updates scene button highlights.
   *
   * @param {number} sceneId - Active scene index.
   */
  setActiveScene(sceneId) {
    this.currentScene = sceneId;
    const buttons = this.segContainer.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.classList.toggle('on', Number(btn.dataset.scene) === sceneId);
    });
  }

  /**
   * Scales the panel based on screen dimensions for comfortable touch and desktop usability.
   *
   * @param {number} width - Viewport width.
   * @param {number} height - Viewport height.
   */
  applyPanelScale(width, height) {
    const minDim = Math.min(width, height);
    const panelScale = Math.max(0.95, Math.min(1.45, minDim / 780));
    const transformStr = `scale(${panelScale.toFixed(3)})`;
    this.panelEl.style.transform = transformStr;
    this.hambBtn.style.transform = transformStr;
  }

  /**
   * Refreshes telemetry counters and aggression labels.
   *
   * @param {import('../types/index.js').SimulationStats} stats - Current telemetry snapshot.
   */
  updateTelemetry(stats) {
    for (let f = 0; f < FACTION_COUNT; f++) {
      if (this.countBadges[f]) {
        this.countBadges[f].textContent = String(stats.liveCounts[f] ?? 0);
      }
      if (this.aggressionBadges[f]) {
        const val = stats.autoAlpha[f] ?? 0.5;
        this.aggressionBadges[f].textContent = val.toFixed(2);
        this.aggressionBadges[f].style.color = interpolateAggressionColor(val);
      }
    }
  }

  /**
   * Initializes panel hover / click toggle mechanisms.
   */
  #initPanelToggle() {
    const hasHover = window.matchMedia('(hover: hover)').matches;

    const show = () => {
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      if (this.panelEl.classList.contains('hide')) {
        this.panelEl.classList.remove('hide');
        this.hambBtn.style.opacity = '0';
        this.hambBtn.style.pointerEvents = 'none';
      }
    };

    const hide = () => {
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      if (!this.panelEl.classList.contains('hide')) {
        this.panelEl.classList.add('hide');
        this.hambBtn.style.opacity = '1';
        this.hambBtn.style.pointerEvents = 'auto';
      }
    };

    const scheduleHide = () => {
      if (this.hideTimer) clearTimeout(this.hideTimer);
      this.hideTimer = window.setTimeout(() => {
        this.hideTimer = null;
        if (!this.panelEl.matches(':hover')) hide();
      }, 300);
    };

    if (hasHover) {
      this.hambBtn.addEventListener('mouseenter', show);
      this.hambBtn.addEventListener('mouseleave', scheduleHide);
      this.panelEl.addEventListener('mouseenter', () => {
        if (this.hideTimer) {
          clearTimeout(this.hideTimer);
          this.hideTimer = null;
        }
      });
      this.panelEl.addEventListener('mouseleave', scheduleHide);
    } else {
      this.hambBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (this.panelEl.classList.contains('hide')) show();
        else hide();
      });

      document.addEventListener('click', e => {
        const target = /** @type {Node} */ (e.target);
        if (!this.panelEl.contains(target) && !this.hambBtn.contains(target)) {
          hide();
        }
      });
    }
  }

  /**
   * Binds global simulation control buttons and sliders.
   */
  #initControls() {
    this.btnStart.addEventListener('click', () => this.callbacks.onStart());
    this.btnStop.addEventListener('click', () => this.callbacks.onStop());
    this.btnReset.addEventListener('click', () => this.callbacks.onReset());

    this.speedInput.addEventListener('input', () => {
      const speed = Number(this.speedInput.value);
      this.speedVal.textContent = String(speed);
      this.callbacks.onSpeedChange(speed);
    });
  }

  /**
   * Renders scene selection buttons with accessibility attributes.
   */
  #renderScenes() {
    this.segContainer.innerHTML = '';
    const sceneIds = Object.keys(SCENE_LABELS).map(Number);

    for (let i = 0; i < sceneIds.length; i++) {
      const id = sceneIds[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = String(id);
      btn.dataset.scene = String(id);
      btn.title = SCENE_LABELS[id] || `Scene ${id}`;
      btn.setAttribute('aria-label', `Switch to Scene ${id}: ${SCENE_LABELS[id]}`);

      btn.addEventListener('click', () => {
        if (id !== this.currentScene) {
          this.setActiveScene(id);
          this.callbacks.onSceneChange(id);
        }
      });

      this.segContainer.appendChild(btn);
    }

    this.setActiveScene(this.currentScene);
  }

  /**
   * Renders the population sliders and status rows for each faction.
   */
  #renderFactionRows() {
    this.rowsContainer.innerHTML = '';
    this.countBadges = [];
    this.aggressionBadges = [];
    this.countSliders = [];

    for (let f = 0; f < FACTION_COUNT; f++) {
      const faction = FACTIONS[f];
      const row = document.createElement('div');
      row.className = 'row';

      const icon = document.createElement('i');
      icon.className = `ic ${faction.icon}`;
      icon.style.color = faction.color;
      icon.title = faction.name;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '60';
      slider.value = '25';
      slider.setAttribute('aria-label', `${faction.name} population count`);

      const countBadge = document.createElement('span');
      countBadge.className = 'cnt';
      countBadge.textContent = '25';

      slider.addEventListener('input', () => {
        const val = Number(slider.value);
        countBadge.textContent = String(val);
        this.callbacks.onCountChange(f, val);
      });

      const aggressionBadge = document.createElement('span');
      aggressionBadge.className = 'agg';
      aggressionBadge.textContent = '0.50';
      aggressionBadge.title = `${faction.name} dynamic aggression`;

      row.append(icon, slider, countBadge, aggressionBadge);
      this.rowsContainer.appendChild(row);

      this.countSliders.push(slider);
      this.countBadges.push(countBadge);
      this.aggressionBadges.push(aggressionBadge);
    }
  }
}
