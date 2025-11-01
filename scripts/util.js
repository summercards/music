/**
 * Utility functions used throughout the game. These helpers keep the
 * game code clean and encapsulate common tasks such as collision
 * detection and random number generation.
 */

/**
 * Generates a random floating‑point number within the provided range.
 *
 * @param {number} min - The lower bound of the range (inclusive).
 * @param {number} max - The upper bound of the range (exclusive).
 * @returns {number} A pseudo‑random number between min and max.
 */
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Simple axis‑aligned bounding box (AABB) collision check. Returns true
 * if the two rectangles intersect. This helper is used to determine
 * collisions between the player and falling blocks.
 *
 * @param {number} ax - X coordinate of the first rectangle.
 * @param {number} ay - Y coordinate of the first rectangle.
 * @param {number} aw - Width of the first rectangle.
 * @param {number} ah - Height of the first rectangle.
 * @param {number} bx - X coordinate of the second rectangle.
 * @param {number} by - Y coordinate of the second rectangle.
 * @param {number} bw - Width of the second rectangle.
 * @param {number} bh - Height of the second rectangle.
 * @returns {boolean} True if the rectangles intersect; otherwise false.
 */
function rectIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

module.exports = {
  randomRange,
  rectIntersect,
  /**
   * Draw a rounded rectangle on the given context. This helper creates a
   * path with rounded corners and fills it. It's useful for creating
   * card‑like panels consistent with modern UI designs. The caller
   * should set fillStyle or strokeStyle before invoking this function.
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D context.
   * @param {number} x - X coordinate of the top left corner.
   * @param {number} y - Y coordinate of the top left corner.
   * @param {number} width - Width of the rectangle.
   * @param {number} height - Height of the rectangle.
   * @param {number} radius - Corner radius in pixels.
   */
  drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, Math.min(width, height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }
};