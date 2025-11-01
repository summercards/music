/**
 * Contains simple visual effects used in the game. Each effect
 * instance exposes `update(dt)` and `render(ctx)` methods. Effects
 * manage their own lifespan and visual state.
 */

/**
 * ExpandingSquareEffect draws an expanding outline square at a given
 * position, fading out over its lifetime. It can be used to
 * highlight a collision between the player and a falling block.
 */
class ExpandingSquareEffect {
  /**
   * Construct a new expanding square effect.
   *
   * @param {number} x - x coordinate of the effect centre.
   * @param {number} y - y coordinate of the effect centre.
   * @param {string} color - CSS colour used for the square outline.
   */
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color || '#ffffff';
    this.life = 0.4;
    this.maxLife = 0.4;
    this.size = 40;
    this.growth = 160; // pixels per second increase in size
    this.lineWidth = 3;
  }

  /** Update the effect state.
   * @param {number} dt - Delta time in seconds.
   */
  update(dt) {
    this.life -= dt;
    this.size += this.growth * dt;
  }

  /** Render the effect on the canvas context.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    // Fade out based on remaining life
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    const half = this.size / 2;
    ctx.beginPath();
    ctx.strokeRect(this.x - half, this.y - half, this.size, this.size);
    ctx.closePath();
    ctx.restore();
  }
}

module.exports = {
  ExpandingSquareEffect
};