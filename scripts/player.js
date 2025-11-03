/**
 * 玩家模块。
 *
 * Player 类封装了位于屏幕底部的可控制方块的行为和渲染逻辑。
 * 它通过外部调用的 setPosition 方法监听触摸事件，并在场景载入时
 * 执行一个轻微的缩放动画。进入动画完成后，方块会按照配置中的
 * 振幅和频率持续呼吸（脉冲）动画。横向移动通过插值实现，使
 * 操作既灵敏又平滑。
 */

const config = require('../config');

class Player {
  /**
   * 构造一个新的玩家实例。
   *
   * @param {Object} options 选项对象
   * @param {HTMLCanvasElement} options.canvas 渲染所用的画布
   */
  constructor({ canvas }) {
    this.canvas = canvas;
    // 从配置中读取方块尺寸，宽高一致
    this.size = config.player.size;
    this.width = this.size;
    this.height = this.size;
    // 初始位置：水平居中，靠近底部
    this.x = (canvas.width - this.width) / 2;
    this.y = canvas.height - this.height - 20;
    // 目标位置，用于平滑插值
    this.targetX = this.x;
    // 入场动画的缩放相关变量
    this.scale = 1.0;
    this.animationTime = 0;
    this.animationDuration = 0.8; // 单位：秒
    // 脉冲参数来自配置，用于控制入场动画之后持续的节奏缩放
    this.pulseTime = 0;
    this.pulseAmplitude = config.player.pulseAmplitude;
    this.pulseFrequency = config.player.pulseFrequency;
  }

  /**
   * 更新玩家状态。每一帧由游戏循环调用。
   * 用于平滑插值移动并驱动缩放动画。
   *
   * @param {number} dt 距离上一帧的时间间隔（秒）
   */
  update(dt) {
    // 更新入场动画进度，计算基础缩放，让其从弹跳逐渐回落到 1.0。
    // 最终缩放是基础缩放与脉冲缩放相乘得到。
    let entryScale = 1;
    if (this.animationTime < this.animationDuration) {
      this.animationTime += dt;
      const progress = Math.min(this.animationTime / this.animationDuration, 1);
      // 弹跳效果：开始时较大，逐渐缩小，最后稳定在 1
      entryScale = 0.8 + 0.2 * Math.sin(progress * Math.PI * 2);
    }
    // 更新脉冲时间并计算脉冲缩放。正弦波在 -1 到 1 之间振荡，
    // 通过加 1 使其在基础尺寸附近缩放。例如振幅为 0.15 时，缩放范围在 0.85 到 1.15 之间。
    this.pulseTime += dt;
    const pulsePhase = 2 * Math.PI * this.pulseFrequency * this.pulseTime;
    const pulseScale = 1 + this.pulseAmplitude * Math.sin(pulsePhase);
    // 组合入场弹跳与持续脉冲
    this.scale = entryScale * pulseScale;
    // 平滑地插值移动到目标 X 位置，乘数控制跟随的快慢
    const interp = Math.min(dt * 10, 1);
    this.x += (this.targetX - this.x) * interp;
  }

  /**
   * 根据触摸输入设置目标水平位置。
   * 值应该是触摸事件相对于画布的 X 坐标。此方法会将玩家限制在画布范围内。
   *
   * @param {number} touchX 用户触摸的 X 坐标
   */
  setPosition(touchX) {
    const half = this.width / 2;
    // 限制方块不会离开屏幕
    const clamped = Math.max(half, Math.min(this.canvas.width - half, touchX));
    // 将中心坐标转换为矩形的左上角坐标。
    this.targetX = clamped - half;
  }

  /**
   * 在给定的 2D 上下文上绘制玩家方块。
   *
   * @param {CanvasRenderingContext2D} ctx 渲染上下文
   */
  render(ctx) {
    ctx.save();
    // 平移到方块中心以便缩放
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(this.scale, this.scale);
    // 绘制表示玩家的基本矩形
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    // 可选：绘制轮廓提高在深色背景上的对比
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }
}

module.exports = Player;