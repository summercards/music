/**
 * Player module
 *
 * The Player class encapsulates the behaviour and rendering logic for the
 * controllable block at the bottom of the screen. It listens for touch
 * events (driven externally) via the setPosition method and performs a
 * gentle scale animation when the scene first loads. After the entry
 * animation completes, the block continues to pulse in size based on
 * configurable amplitude and frequency parameters defined in config.js.
 * Horizontal movement is eased so that the block feels responsive yet
 * smooth.
 */

const config = require('../config');

class Player {
  /**
   * Constructs a new player instance.
   *
   * @param {Object} options
   * @param {HTMLCanvasElement} options.canvas - The canvas to render on.
   */
  constructor({ canvas }) {
    this.canvas = canvas;
    // Use a square size from config to define both width and height.
    this.size = config.player.size;
    this.width = this.size;
    this.height = this.size;
    // Initial position horizontally centred near the bottom edge.
    this.x = (canvas.width - this.width) / 2;
    this.y = canvas.height - this.height - 20;
    // Target position used for smooth interpolation.
    this.targetX = this.x;
    // Scaling values for the entry animation.
    this.scale = 1.0;
    this.animationTime = 0;
    this.animationDuration = 0.8; // seconds
    // Pulsing parameters from config. These control the continuous
    // rhythmic scaling that occurs after the entry animation.
    this.pulseTime = 0;
    this.pulseAmplitude = config.player.pulseAmplitude;
    this.pulseFrequency = config.player.pulseFrequency;
  }

  /**
   * Updates the player's state. Called on each frame by the game loop.
   * Smoothly interpolates the position and drives the scale animation.
   *
   * @param {number} dt - Delta time in seconds since the last frame.
   */
  update(dt) {
    // Update entry animation progress. Compute a base scale that
    // gradually settles from a bounce into 1.0. We multiply this
    // baseline with the continuous pulse scale to get the final scale.
    let entryScale = 1;
    if (this.animationTime < this.animationDuration) {
      this.animationTime += dt;
      const progress = Math.min(this.animationTime / this.animationDuration, 1);
      // Bounce effect: starts large, shrinks, then settles at scale 1.
      entryScale = 0.8 + 0.2 * Math.sin(progress * Math.PI * 2);
    }
    // Update pulsing time and compute pulsing scale. The sine wave
    // oscillates between -1 and 1. We offset it by 1 so the pulse
    // scales around the base size. Example: amplitude 0.15 yields
    // oscillation between 0.85 and 1.15.
    this.pulseTime += dt;
    const pulsePhase = 2 * Math.PI * this.pulseFrequency * this.pulseTime;
    const pulseScale = 1 + this.pulseAmplitude * Math.sin(pulsePhase);
    // Combine entry bounce and continuous pulse.
    this.scale = entryScale * pulseScale;
    // Interpolate towards the target X position for smooth movement.
    // The multiplier controls how quickly the block catches up.
    const interp = Math.min(dt * 10, 1);
    this.x += (this.targetX - this.x) * interp;
  }

  /**
   * Sets the target horizontal position based on touch input. The value
   * should be the touch's X coordinate relative to the canvas. This
   * method clamps the player to the canvas bounds.
   *
   * @param {number} touchX - X coordinate of the user's touch.
   */
  setPosition(touchX) {
    const half = this.width / 2;
    // Clamp so that the block never leaves the screen.
    const clamped = Math.max(half, Math.min(this.canvas.width - half, touchX));
    // Convert to top-left coordinate for the rectangle.
    this.targetX = clamped - half;
  }

  /**
   * Renders the player block on the provided 2D context.
   *
   * @param {CanvasRenderingContext2D} ctx - Rendering context.
   */
  render(ctx) {
    ctx.save();
    // Translate to the centre of the block for scaling.
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(this.scale, this.scale);
    // Draw the base rectangle representing the player.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    // Optionally draw an outline to improve contrast on dark backgrounds.
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }
}

module.exports = Player;