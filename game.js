const MenuScene = require('./scripts/menuScene');

/**
 * Entry point for the WeChat mini game. This file creates the canvas,
 * instantiates the menu scene, hooks up touch events and kicks off
 * the main render loop. Scene instances are swapped out via the
 * changeScene function passed to each scene.
 */

// Create the game canvas. On the minigame platform the canvas API
// closely resembles the HTML5 Canvas API. wx.createCanvas returns a
// canvas element sized at 300×150 by default; we resize it to match
// the screen.
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// Resize the canvas to fill the device screen. System info provides
// the window dimensions excluding status bar and navigation bar.
const { windowWidth, windowHeight } = wx.getSystemInfoSync();
canvas.width = windowWidth;
canvas.height = windowHeight;

// Global variable to hold the currently active scene. Scenes are
// objects with update, render and optional touch handler methods.
let currentScene;

/**
 * Replaces the current scene with a new one. Scenes accept the
 * canvas, context and the changeScene callback. This function is
 * passed into scenes so they can trigger scene transitions.
 *
 * @param {Object} scene - The next scene to run.
 */
function changeScene(scene) {
  currentScene = scene;
}

// Instantiate the initial menu scene.
changeScene(new MenuScene({ canvas, ctx, changeScene }));

// Setup touch events and delegate to the active scene if the scene
// defines the corresponding handler. onTouchMove is useful for
// tracking finger drags, while onTouchStart handles taps.
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

// Main game loop. We avoid using wx.requestAnimationFrame directly
// because it is not available in all WeChat runtimes (e.g. open data
// subcontexts). Instead we rely on the global requestAnimationFrame if
// present, and fall back to setTimeout as a polyfill. This ensures
// smooth rendering across different environments.
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
// Kick off the loop using rAF rather than wx.requestAnimationFrame
rAF(loop);