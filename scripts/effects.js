/**
 * 游戏中使用的简单视觉特效集合。每个特效实例都暴露 `update(dt)` 和 `render(ctx)` 方法，
 * 用于更新自身状态和渲染。特效负责管理自己的生命周期和视觉状态。
 */

/**
 * ExpandingSquareEffect 在给定位置绘制一个逐渐扩大的方框，并在生命周期内淡出。
 * 可用于在玩家与下落方块碰撞时产生扩散特效。
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
    this.growth = 160; // 每秒增加的尺寸（像素）
    this.lineWidth = 3;
  }

  /** 更新特效状态。
   * @param {number} dt 距离上次更新的秒数。
   */
  update(dt) {
    this.life -= dt;
    this.size += this.growth * dt;
  }

  /** 在画布上下文上渲染该特效。
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