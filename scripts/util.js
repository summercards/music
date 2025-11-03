/**
 * 工具函数集合，用于整个游戏中。通过封装常用的任务（如碰撞检测和随机数生成），
 * 这些辅助函数让游戏代码保持简洁。
 */

/**
 * 生成指定范围内的随机浮点数。
 *
 * @param {number} min 范围下界（包含）。
 * @param {number} max 范围上界（不包含）。
 * @returns {number} 一个介于 min 和 max 之间的伪随机数。
 */
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * 简单的轴对齐包围盒（AABB）碰撞检测。如果两个矩形相交则返回 true。
 * 用于判断玩家方块与下落方块的碰撞。
 *
 * @param {number} ax 第一个矩形的 X 坐标。
 * @param {number} ay 第一个矩形的 Y 坐标。
 * @param {number} aw 第一个矩形的宽度。
 * @param {number} ah 第一个矩形的高度。
 * @param {number} bx 第二个矩形的 X 坐标。
 * @param {number} by 第二个矩形的 Y 坐标。
 * @param {number} bw 第二个矩形的宽度。
 * @param {number} bh 第二个矩形的高度。
 * @returns {boolean} 如果相交则为 true，否则为 false。
 */
function rectIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

module.exports = {
  randomRange,
  rectIntersect,
  /**
   * 在提供的上下文上绘制圆角矩形。此帮助函数创建一个带圆角的路径并填充，
   * 适用于创建卡片式面板等现代 UI 元素。调用者需在调用前设置好填充或描边颜色。
   *
   * @param {CanvasRenderingContext2D} ctx canvas 2D 上下文。
   * @param {number} x 左上角的 X 坐标。
   * @param {number} y 左上角的 Y 坐标。
   * @param {number} width 矩形的宽度。
   * @param {number} height 矩形的高度。
   * @param {number} radius 圆角半径。
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