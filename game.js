const MenuScene = require('./scripts/menuScene');

/**
 * 微信小游戏的入口。该文件创建画布、实例化菜单场景，注册触摸事件并启动
 * 主渲染循环。场景实例通过 changeScene 函数进行切换。
 */

// 创建游戏画布。在微信小游戏平台上，canvas API 与 HTML5 Canvas 类似。
// wx.createCanvas 默认返回 300×150 大小的画布，这里调整为屏幕大小。
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 将画布大小调整到设备屏幕尺寸。系统信息提供了不包含状态栏和导航条的窗口尺寸。
const { windowWidth, windowHeight } = wx.getSystemInfoSync();
canvas.width = windowWidth;
canvas.height = windowHeight;

// 全局变量保存当前活动场景。场景对象包含 update、render 方法以及可选的触摸事件处理方法。
let currentScene;

/**
 * 替换当前场景为新的场景。场景会接收画布、绘图上下文以及 changeScene 回调。
 * 通过传入 changeScene，场景内部可以触发场景切换。
 *
 * @param {Object} scene - 下一个要运行的场景对象。
 */
function changeScene(scene) {
  currentScene = scene;
}

// Instantiate the initial menu scene.
changeScene(new MenuScene({ canvas, ctx, changeScene }));

// 注册触摸事件，如果当前场景定义了相应的处理器就委托给它。
// onTouchMove 用于跟踪手指拖动，onTouchStart 用于处理点击。
wx.onTouchStart((e) => {
  if (currentScene && currentScene.onTouchStart) {
    currentScene.onTouchStart(e);
  }
});

wx.onTouchMove((e) => {
  if (currentScene && currentScene.onTouchMove) {
    currentScene.onTouchMove(e);
  }
});

wx.onTouchEnd((e) => {
  if (currentScene && currentScene.onTouchEnd) {
    currentScene.onTouchEnd(e);
  }
});

// 主游戏循环。不直接使用 wx.requestAnimationFrame，因为某些环境（如开放数据域）不支持。
// 优先使用全局的 requestAnimationFrame，若不存在则用 setTimeout 模拟。
// 这样可在不同运行环境下保持渲染流畅。
const rAF = (cb) => {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(cb);
  }
  return setTimeout(() => cb(Date.now()), 1000 / 60);
};
let lastTime = Date.now();
function loop(ts) {
  // Some environments pass a timestamp (ts) into rAF callbacks. If
  // provided we use it to compute dt, otherwise we derive dt from
  // Date.now().
  const now = ts ? ts : Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  if (currentScene && currentScene.update) {
    currentScene.update(dt);
  }
  if (currentScene && currentScene.render) {
    currentScene.render();
  }
  rAF(loop);
}
// 使用 rAF 而不是 wx.requestAnimationFrame 启动循环
rAF(loop);