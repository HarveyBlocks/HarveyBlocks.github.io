/**
 * @fileoverview DOM Renderer for visual unit representation and toroidal ghost projections.
 * Decouples presentation logic and CSS transforms from unit physics and decision making.
 * @module ui/UnitRenderer
 */

import { FACTIONS } from '../config/factions.js';
import { CONFIG } from '../config/simulationConfig.js';

/**
 * Manages DOM elements, icons, and ghost projections for an individual swarm agent.
 */
export class UnitRenderer {
  /**
   * Constructs a UnitRenderer.
   *
   * @param {HTMLElement} container - DOM parent container where elements are mounted.
   * @param {number} faction - Initial faction index.
   * @param {number} initialX - Starting X position in pixels.
   * @param {number} initialY - Starting Y position in pixels.
   * @param {number} initialRotation - Starting icon rotation angle in radians.
   */
  constructor(container, faction, initialX, initialY, initialRotation) {
    /** @type {HTMLElement} */
    this.container = container;
    /** @type {number} */
    this.faction = faction;

    // Primary DOM unit node
    this.el = document.createElement('div');
    this.el.className = 'unit';

    this.icon = document.createElement('i');
    this.icon.className = FACTIONS[faction].icon;
    this.icon.style.transform = `rotate(${initialRotation.toFixed(3)}rad)`;

    this.el.appendChild(this.icon);
    this.el.style.color = FACTIONS[faction].color;
    this.el.style.transform = `translate3d(${initialX.toFixed(1)}px, ${initialY.toFixed(1)}px, 0)`;

    this.container.appendChild(this.el);

    /**
     * Ghost clone nodes for seamless toroidal screen wrap rendering.
     * @type {Array<{el: HTMLElement, icon: HTMLElement}>}
     */
    this.ghosts = [];
    for (let i = 0; i < CONFIG.ghostSlots; i++) {
      const g = document.createElement('div');
      g.className = 'unit ghost';
      const gi = document.createElement('i');
      gi.className = FACTIONS[faction].icon;
      g.appendChild(gi);
      g.style.color = FACTIONS[faction].color;
      g.style.display = 'none';
      this.container.appendChild(g);
      this.ghosts.push({ el: g, icon: gi });
    }
  }

  /**
   * Updates faction visual identity (icon glyph and CSS color).
   *
   * @param {number} newFaction - Updated faction index.
   */
  updateFaction(newFaction) {
    this.faction = newFaction;
    const style = FACTIONS[newFaction];
    if (!style) return;

    this.icon.className = style.icon;
    this.el.style.color = style.color;

    for (let i = 0; i < this.ghosts.length; i++) {
      const g = this.ghosts[i];
      g.icon.className = style.icon;
      g.el.style.color = style.color;
    }
  }

  /**
   * Updates the primary element's on-screen position.
   *
   * @param {number} x - X coordinate in pixels.
   * @param {number} y - Y coordinate in pixels.
   */
  updatePosition(x, y) {
    this.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }

  /**
   * Updates the rotation of the icon glyph.
   *
   * @param {number} rotation - Rotation angle in radians.
   */
  updateRotation(rotation) {
    this.icon.style.transform = `rotate(${rotation.toFixed(3)}rad)`;
  }

  /**
   * Synchronizes toroidal ghost projections around open boundaries.
   *
   * @param {number} x - Agent X position.
   * @param {number} y - Agent Y position.
   * @param {number} rotation - Agent icon rotation.
   * @param {number} width - Screen width.
   * @param {number} height - Screen height.
   * @param {number} margin - Distance margin to activate ghost projection.
   * @param {import('../core/Boundary.js').Boundary} boundary - Spatial boundary to check edge solidity.
   */
  updateGhosts(x, y, rotation, width, height, margin, boundary) {
    const openL = !boundary.isSolid('L', y / height);
    const openR = !boundary.isSolid('R', y / height);
    const openU = !boundary.isSolid('T', x / width);
    const openD = !boundary.isSolid('B', x / width);

    const positions = [];
    if (x < margin && openL) positions.push([x + width, y]);
    if (x > width - margin && openR) positions.push([x - width, y]);
    if (y < margin && openU) positions.push([x, y + height]);
    if (y > height - margin && openD) positions.push([x, y - height]);

    if (x < margin && y < margin && openL && openU) {
      positions.push([x + width, y + height]);
    }
    if (x > width - margin && y < margin && openR && openU) {
      positions.push([x - width, y + height]);
    }
    if (x < margin && y > height - margin && openL && openD) {
      positions.push([x + width, y - height]);
    }
    if (x > width - margin && y > height - margin && openR && openD) {
      positions.push([x - width, y - height]);
    }

    const rotStr = `rotate(${rotation.toFixed(3)}rad)`;

    for (let i = 0; i < this.ghosts.length; i++) {
      const g = this.ghosts[i];
      if (i < positions.length) {
        g.el.style.display = 'flex';
        g.el.style.transform = `translate3d(${positions[i][0].toFixed(1)}px, ${positions[i][1].toFixed(1)}px, 0)`;
        g.icon.style.transform = rotStr;
      } else if (g.el.style.display !== 'none') {
        g.el.style.display = 'none';
      }
    }
  }

  /**
   * Destroys all DOM elements associated with this unit.
   */
  destroy() {
    this.el.remove();
    for (let i = 0; i < this.ghosts.length; i++) {
      this.ghosts[i].el.remove();
    }
  }
}
