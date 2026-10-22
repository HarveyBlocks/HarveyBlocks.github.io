/**
 * @fileoverview WallRenderer - DOM renderer for physical boundary walls.
 * Converts geometric boundary configurations into styled DOM wall segments.
 * @module ui/WallRenderer
 */

import { CONFIG } from '../config/simulationConfig.js';

/**
 * Handles the construction and positioning of solid boundary wall DOM nodes.
 */
export class WallRenderer {
  /**
   * Constructs a WallRenderer.
   *
   * @param {HTMLElement} container - DOM parent element that contains wall segments (e.g., `#walls`).
   */
  constructor(container) {
    /** @type {HTMLElement} */
    this.container = container;
  }

  /**
   * Clears any existing wall elements from the container.
   */
  clear() {
    this.container.innerHTML = '';
  }

  /**
   * Renders solid wall segments based on current wall config and stage dimensions.
   *
   * @param {import('../types/index.js').WallConfig} walls - Wall configuration per edge.
   * @param {number} width - Viewport width in pixels.
   * @param {number} height - Viewport height in pixels.
   * @param {number} thickness - Physical thickness of walls in pixels.
   */
  renderWalls(walls, width, height, thickness) {
    this.clear();
    if (width <= 0 || height <= 0) return;

    const segments = CONFIG.segmentsPerEdge;
    /** @type {Array<import('../types/index.js').BoundaryEdge>} */
    const edges = ['L', 'R', 'T', 'B'];

    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      const segs = walls[edge];
      if (!segs) continue;

      for (let i = 0; i < segments; i++) {
        if (!segs[i]) continue;

        const t0 = i / segments;
        const t1 = (i + 1) / segments;
        const div = document.createElement('div');
        div.className = 'wall-seg';

        if (edge === 'L') {
          div.style.left = '0';
          div.style.top = `${(t0 * height).toFixed(2)}px`;
          div.style.width = `${thickness.toFixed(2)}px`;
          div.style.height = `${((t1 - t0) * height).toFixed(2)}px`;
        } else if (edge === 'R') {
          div.style.right = '0';
          div.style.top = `${(t0 * height).toFixed(2)}px`;
          div.style.width = `${thickness.toFixed(2)}px`;
          div.style.height = `${((t1 - t0) * height).toFixed(2)}px`;
        } else if (edge === 'T') {
          div.style.top = '0';
          div.style.left = `${(t0 * width).toFixed(2)}px`;
          div.style.height = `${thickness.toFixed(2)}px`;
          div.style.width = `${((t1 - t0) * width).toFixed(2)}px`;
        } else {
          div.style.bottom = '0';
          div.style.left = `${(t0 * width).toFixed(2)}px`;
          div.style.height = `${thickness.toFixed(2)}px`;
          div.style.width = `${((t1 - t0) * width).toFixed(2)}px`;
        }

        this.container.appendChild(div);
      }
    }
  }
}
