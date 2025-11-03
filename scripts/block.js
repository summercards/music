/**
 * 方块模块。
 *
 * 每个方块代表节奏游戏中的一个落下音符。方块根据其类型具有不同
 * 的颜色和可选的动画效果。当它们与玩家的方块碰撞时会加分；
 * 当它们落到底部未被接住时会扣分。此类封装了方块的更新和绘制逻辑。
 */

class Block {
  /**
   * 构造新的方块实例。
   *
   * @param {Object} options 配置对象
   * @param {number} options.x 方块起始中心的 X 坐标
   * @param {number} options.y 方块起始顶端的 Y 坐标
   * @param {number} options.size 方块边长
   * @param {number} options.speed 下落速度（像素/秒）
   * @param {Object} options.type 方块类型定义，包含颜色和特效等
   */
  constructor({ x, y, size, speed, type }) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = speed;
    this.type = type;
    // 初始化特效状态。
    this.rotation = 0;
    this.pulseTime = 0;
    this.alpha = 1;
  }

  /**
   * 更新方块的位置，并根据类型应用动画。
   *
   * @param {number} dt 距离上次更新的时间间隔（秒）
   */
  update(dt) {
    // 以恒定速度向下移动。
    this.y += this.speed * dt;
    // 应用特效动画。不同类型具有不同的动画行为。
    switch (this.type.effect) {
      case 'rotate':
        // 持续旋转：每秒一圈。
        this.rotation += dt * Math.PI * 2;
        break;
      case 'pulse':
        // 脉动：通过调整 alpha 在 0.5 到 1 之间变化。
        this.pulseTime += dt;
        this.alpha = 0.7 + 0.3 * Math.sin(this.pulseTime * Math.PI * 2);
        break;
      case 'fade':
        // 随下落逐渐淡出。
        this.alpha = Math.max(0, this.alpha - dt * 0.3);
        break;
      default:
        break;
    }
  }

  /**
   * 在提供的 2D 上下文上渲染方块。效果通过 canvas API（旋转、透明度等）实现。
   *
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   */
  render(ctx) {
    ctx.save();
    // 将坐标原点平移到方块中心，便于执行变换。
    const half = this.size / 2;
    ctx.translate(this.x, this.y + half);
    // 如有需要，应用旋转。
    if (this.type.effect === 'rotate') {
      ctx.rotate(this.rotation);
    }
    // 为淡出和脉动效果设置透明度。
    if (this.type.effect === 'pulse' || this.type.effect === 'fade') {
      ctx.globalAlpha = this.alpha;
    }
    // 绘制正方形，颜色来自类型定义。
    ctx.fillStyle = this.type.color;
    ctx.fillRect(-half, -half, this.size, this.size);
    // 可选描边以提升可见性。
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-half, -half, this.size, this.size);
    ctx.restore();
  }
}

module.exports = Block;