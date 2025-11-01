/**
 * Block module
 *
 * Each block represents a falling note in the rhythm game. Blocks have
 * different colours and optional animations depending on their type.
 * When they collide with the player's block they award points; when
 * they reach the bottom of the screen they deduct points. This class
 * encapsulates the update and render logic for the block.
 */

class Block {
  /**
   * Constructs a new block instance.
   *
   * @param {Object} options
   * @param {number} options.x - X coordinate (centre) where the block starts.
   * @param {number} options.y - Y coordinate (top) where the block starts.
   * @param {number} options.size - Width/height of the square block.
   * @param {number} options.speed - Falling speed (pixels per second).
   * @param {Object} options.type - Block type definition containing colour and effect.
   */
  constructor({ x, y, size, speed, type }) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = speed;
    this.type = type;
    // Initialise effect state.
    this.rotation = 0;
    this.pulseTime = 0;
    this.alpha = 1;
  }

  /**
   * Updates the block's position and applies any animations based on its type.
   *
   * @param {number} dt - Delta time in seconds since the last update.
   */
  update(dt) {
    // Move downward at a constant speed.
    this.y += this.speed * dt;
    // Apply effect animations. Different types can have different behaviours.
    switch (this.type.effect) {
      case 'rotate':
        // Rotate continuously. One full rotation every second.
        this.rotation += dt * Math.PI * 2;
        break;
      case 'pulse':
        // Pulse the scale by adjusting alpha between 0.5 and 1.
        this.pulseTime += dt;
        this.alpha = 0.7 + 0.3 * Math.sin(this.pulseTime * Math.PI * 2);
        break;
      case 'fade':
        // Gradually fade out as it falls.
        this.alpha = Math.max(0, this.alpha - dt * 0.3);
        break;
      default:
        break;
    }
  }

  /**
   * Renders the block on the provided 2D context. Effects are applied
   * using the canvas API (rotation, alpha, etc.).
   *
   * @param {CanvasRenderingContext2D} ctx - Rendering context.
   */
  render(ctx) {
    ctx.save();
    // Translate to centre of the block for transformations.
    const half = this.size / 2;
    ctx.translate(this.x, this.y + half);
    // Apply rotation if needed.
    if (this.type.effect === 'rotate') {
      ctx.rotate(this.rotation);
    }
    // Apply alpha for fade and pulse effects.
    if (this.type.effect === 'pulse' || this.type.effect === 'fade') {
      ctx.globalAlpha = this.alpha;
    }
    // Draw square. Colour comes from the type definition.
    ctx.fillStyle = this.type.color;
    ctx.fillRect(-half, -half, this.size, this.size);
    // Optional outline for better visibility.
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-half, -half, this.size, this.size);
    ctx.restore();
  }
}

module.exports = Block;