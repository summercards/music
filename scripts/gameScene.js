const Player = require('./player');
const Block = require('./block');
const { randomRange, rectIntersect, drawRoundedRect } = require('./util');
const { ExpandingSquareEffect } = require('./effects');
const config = require('../config');

// Block types are defined in config.js (config.blockTypes). They
// determine the colour and effect of each falling block. See
// config/blockTypes for details.

/**
 * GameScene manages the core gameplay loop for a selected song. It
 * spawns falling blocks, tracks score, drives the player character
 * and audio playback, and handles the transition back to the menu
 * upon completion.
 */
class GameScene {
  /**
   * Constructs a new GameScene.
   *
   * @param {Object} options
   * @param {HTMLCanvasElement} options.canvas - The canvas to draw on.
   * @param {CanvasRenderingContext2D} options.ctx - 2D rendering context.
   * @param {Object} options.song - Selected song definition containing file and duration.
   * @param {Function} options.changeScene - Function to switch to a different scene.
   */
  constructor({ canvas, ctx, song, changeScene }) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.song = song;
    this.changeScene = changeScene;
    // Player controlled block
    this.player = new Player({ canvas });
    // Array of currently active falling blocks
    this.blocks = [];
    // Spawn pattern and pointers. If song.spawns is defined, blocks
    // will be generated according to this array, otherwise random
    // spawning will occur at a fixed interval. See update() for
    // details.
    this.spawns = Array.isArray(song.spawns) ? song.spawns.slice() : [];
    this.spawnIndex = 0;
    this.spawnInterval = 0.8; // seconds between random spawns
    this.spawnTimer = 0;
    // Score and timing
    this.score = 0;
    this.misses = 0;
    this.timeElapsed = 0;
    this.duration = song.duration;
    this.gameOver = false;
    // Score feedback effects for visualising hits and misses
    this.scoreEffects = [];
    // Visual effects such as collision flashes
    this.effects = [];
    // Create and configure audio
    this.audioCtx = wx.createInnerAudioContext();
    this.audioCtx.autoplay = false;
    // Path must be relative to package root. Song.file is assumed to
    // begin with "assets/audio/..." which is bundled into the game
    // package by the WeChat developer tool.
    this.audioCtx.src = song.file;
    // When the song ends we finish the game
    this.audioCtx.onEnded(() => {
      this.endGame();
    });
    this.audioCtx.onError((err) => {
      console.warn('Audio error', err);
      this.endGame();
    });
    // Begin playback once the context is ready. Some platforms may
    // require user interaction before playback; in that case the
    // audio will start on the first touch event.
    this.audioStarted = false;
    // Determine whether to use timed pattern spawns or random spawns
    this.usePattern = this.spawns.length > 0;

    // Placeholder for return button bounding box; will be set in render()
    this.returnButtonBounds = null;

    // Precompute lane positions for spawning. Lanes correspond to block
    // types defined in config. Each lane's x coordinate is the
    // horizontal center of that lane. These positions are used when
    // spawning pattern notes with a lane property.
    this.lanePositions = [];
    const laneCount = config.numLanes;
    const laneWidth = this.canvas.width / laneCount;
    for (let i = 0; i < laneCount; i++) {
      this.lanePositions.push(laneWidth * i + laneWidth / 2);
    }
  }

  /**
   * Called every frame to update the game state. Handles spawning,
   * movement, collisions and scoring. When the time limit is reached
   * the scene transitions back to the menu.
   *
   * @param {number} dt - Delta time in seconds since the last update.
   */
  update(dt) {
    if (this.gameOver) return;
    // Lazily start the music once the first frame runs. We do this in
    // update rather than the constructor because some devices prohibit
    // autoplay until the user interacts with the page.
    if (!this.audioStarted) {
      this.audioStarted = true;
      // Use a try/catch in case playback fails silently on certain
      // platforms (e.g. due to missing user gesture). Errors are
      // handled by onError registered in the constructor.
      try {
        this.audioCtx.play();
      } catch (e) {
        console.warn('Unable to start audio immediately:', e);
      }
    }
    // Advance timers
    this.timeElapsed += dt;
    // Spawn blocks according to pattern or random interval
    if (this.usePattern) {
      while (this.spawnIndex < this.spawns.length && this.timeElapsed >= this.spawns[this.spawnIndex].time) {
        const spawnDef = this.spawns[this.spawnIndex];
        // Use lane position if provided in the spawn definition
        this.spawnBlockOfType(spawnDef.type, spawnDef.lane);
        this.spawnIndex++;
      }
    } else {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer -= this.spawnInterval;
        this.spawnBlockRandom();
      }
    }
    // Update player
    this.player.update(dt);
    // Update blocks and check collisions
    const toRemove = [];
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      block.update(dt);
      // Check for collision with player
      const blockLeft = block.x - block.size / 2;
      const blockTop = block.y;
      if (
        rectIntersect(
          blockLeft,
          blockTop,
          block.size,
          block.size,
          this.player.x,
          this.player.y,
          this.player.width,
          this.player.height
        )
      ) {
        // Collision: remove block and award points based on block type
        const pts = block.type && typeof block.type.score === 'number' ? block.type.score : config.scoring.hit;
        this.score += pts;
        this.addScoreEffect(block.x, block.y, `+${pts}`);
        // Trigger a collision visual effect using the block's colour
        this.effects.push(new ExpandingSquareEffect(block.x, block.y, block.type.color));
        toRemove.push(i);
        continue;
      }
      // Check if block has fallen past the bottom
      if (block.y - block.size / 2 > this.canvas.height) {
        this.misses += 1;
        // Apply penalty and ensure score does not go below zero
        if (config.scoring.miss > 0) {
          this.score = Math.max(0, this.score - config.scoring.miss);
          this.addScoreEffect(block.x, this.canvas.height - 60, `-${config.scoring.miss}`);
        }
        toRemove.push(i);
      }
    }
    // Remove collided or missed blocks from the array
    // Remove from the end to avoid index shifting
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.blocks.splice(toRemove[i], 1);
    }
    // End game if time expired
    if (this.timeElapsed >= this.duration) {
      this.endGame();
    }
    // Update score feedback effects
    this.updateScoreEffects(dt);

    // Update visual effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const eff = this.effects[i];
      eff.update(dt);
      if (eff.life <= 0) {
        this.effects.splice(i, 1);
      }
    }
  }

  /**
   * Spawn a block with a random type. Uses the blockTypes defined in
   * config.js. Randomises the horizontal position and speed.
   */
  spawnBlockRandom() {
    const typeDef = config.blockTypes[Math.floor(Math.random() * config.blockTypes.length)];
    // Randomly choose a lane for spawning when using random spawns
    const lane = Math.floor(Math.random() * config.numLanes);
    this._spawnBlockWithTypeDef(typeDef, lane);
  }

  /**
   * Spawn a block of a specific type index. If the type index is
   * invalid the call is ignored. Randomises horizontal position and
   * speed like the random spawn.
   *
   * @param {number} typeIndex - Index into config.blockTypes.
   */
  /**
   * Spawn a block of the specified type. If a lane index is
   * provided, the block's x position will be aligned to that lane's
   * centre. Otherwise a random horizontal position is chosen.
   *
   * @param {number} typeIndex Index into config.blockTypes.
   * @param {number} [lane] Optional lane index to align the block.
   */
  spawnBlockOfType(typeIndex, lane) {
    if (typeIndex < 0 || typeIndex >= config.blockTypes.length) return;
    const typeDef = config.blockTypes[typeIndex];
    this._spawnBlockWithTypeDef(typeDef, lane);
  }

  /**
   * Internal helper to create a new block from a type definition.
   * Assigns random x position and speed, spawns just above the top.
   *
   * @param {Object} typeDef - Block type definition containing colour and effect.
   */
  _spawnBlockWithTypeDef(typeDef, lane) {
    const size = 40;
    let x;
    if (typeof lane === 'number' && this.lanePositions && lane >= 0 && lane < this.lanePositions.length) {
      x = this.lanePositions[lane];
    } else {
      // Choose random horizontal position if lane is undefined or out of range
      x = randomRange(size / 2, this.canvas.width - size / 2);
    }
    const y = -size;
    // Use the fixed speed defined on the block type instead of random speed
    const speed = typeDef.speed || 200;
    const block = new Block({ x, y, size, speed, type: typeDef });
    this.blocks.push(block);
  }

  /**
   * Add a visual score effect at a given position. Effects move upwards
   * and fade out over their lifespan.
   *
   * @param {number} x - X coordinate where the effect starts.
   * @param {number} y - Y coordinate where the effect starts.
   * @param {string} text - Display text (e.g. '+1' or '-1').
   */
  addScoreEffect(x, y, text) {
    this.scoreEffects.push({
      x,
      y,
      text,
      life: 0.8,
      maxLife: 0.8,
      dy: -60,
      alpha: 1.0,
      color: text.startsWith('+') ? '#2ecc71' : '#e74c3c'
    });
  }

  /**
   * Update all active score effects. Moves them and adjusts their
   * opacity. Removes effects that have expired.
   *
   * @param {number} dt - Delta time in seconds.
   */
  updateScoreEffects(dt) {
    for (let i = this.scoreEffects.length - 1; i >= 0; i--) {
      const eff = this.scoreEffects[i];
      eff.life -= dt;
      if (eff.life <= 0) {
        this.scoreEffects.splice(i, 1);
        continue;
      }
      eff.y += eff.dy * dt;
      eff.alpha = eff.life / eff.maxLife;
    }
  }

  /**
   * Renders the current state of the game. Draws the background,
   * player, blocks, score and a simple progress bar representing the
   * song's remaining time. When the game is over a result message is
   * shown.
   */
  render() {
    const ctx = this.ctx;
    // Dark gradient background for gameplay
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#0f1935');
    grad.addColorStop(1, '#141a47');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Progress bar: draw a rounded track and a filling bar based on remaining time
    const barWidth = Math.min(this.canvas.width * 0.8, 300);
    const barHeight = 10;
    const barX = (this.canvas.width - barWidth) / 2;
    const barY = 20;
    const progress = Math.min(1, this.timeElapsed / this.duration);
    // Track
    ctx.fillStyle = '#2e3c6a';
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 5);
    // Remaining bar (countdown) drawn from right to left to visually shrink
    const remWidth = barWidth * (1 - progress);
    if (remWidth > 0) {
      ctx.fillStyle = '#7e5bef';
      // Use clip to round left corners of the fill
      drawRoundedRect(ctx, barX, barY, remWidth, barHeight, 5);
    }
    // Score panel: small rounded rectangle in the top left
    const scorePadW = 120;
    const scorePadH = 36;
    const scorePadX = 15;
    const scorePadY = 40;
    ctx.fillStyle = '#1c2547';
    drawRoundedRect(ctx, scorePadX, scorePadY, scorePadW, scorePadH, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`得分: ${this.score}`, scorePadX + scorePadW / 2, scorePadY + scorePadH / 2 + 6);
    ctx.textAlign = 'left';

    // Draw return (exit) button in the top right corner. When tapped
    // this will immediately end the game and return to the menu.
    const btnW = 64;
    const btnH = 28;
    const btnX = this.canvas.width - btnW - 15;
    const btnY = scorePadY; // align with score panel vertically
    ctx.fillStyle = '#2e3c6a';
    drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('返回', btnX + btnW / 2, btnY + btnH / 2 + 5);
    ctx.textAlign = 'left';
    // Update return button bounds for hit detection
    this.returnButtonBounds = { x: btnX, y: btnY, w: btnW, h: btnH };
    // Draw player and blocks
    this.player.render(ctx);
    for (const block of this.blocks) {
      block.render(ctx);
    }
    // Draw visual effects (e.g., collision flashes) after blocks but before score feedback
    for (const eff of this.effects) {
      eff.render(ctx);
    }
    // Draw score feedback effects on top of blocks and player
    for (const eff of this.scoreEffects) {
      ctx.save();
      ctx.globalAlpha = eff.alpha;
      ctx.fillStyle = eff.color;
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(eff.text, eff.x, eff.y);
      ctx.restore();
    }
    // End game overlay
    if (this.gameOver) {
      // Semi‑transparent dark overlay
      ctx.fillStyle = 'rgba(15, 25, 53, 0.85)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      // Central card for results
      const cardW = Math.min(260, this.canvas.width * 0.8);
      const cardH = 180;
      const cardX = (this.canvas.width - cardW) / 2;
      const cardY = (this.canvas.height - cardH) / 2;
      ctx.fillStyle = '#1c2547';
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 12);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '28px sans-serif';
      ctx.fillText('游戏结束', cardX + cardW / 2, cardY + 40);
      ctx.font = '22px sans-serif';
      ctx.fillText(`得分: ${this.score}`, cardX + cardW / 2, cardY + 80);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#8c9bd6';
      ctx.fillText('点击屏幕返回主页', cardX + cardW / 2, cardY + 130);
      ctx.textAlign = 'left';
    }
  }

  /**
   * Handles touch start events. Moves the player under the finger.
   * When the game is over, a tap triggers a return to the menu.
   *
   * @param {Object} e - Touch event object from wx.onTouchStart.
   */
  onTouchStart(e) {
    if (this.gameOver) {
      // Load the menu scene on game over tap
      const MenuScene = require('./menuScene');
      this.changeScene(new MenuScene({ canvas: this.canvas, ctx: this.ctx, changeScene: this.changeScene }));
      return;
    }
    // Check return button tap to exit early
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    if (this.returnButtonBounds && touchX >= this.returnButtonBounds.x && touchX <= this.returnButtonBounds.x + this.returnButtonBounds.w && touchY >= this.returnButtonBounds.y && touchY <= this.returnButtonBounds.y + this.returnButtonBounds.h) {
      // Stop audio and return to menu immediately
      try {
        this.audioCtx.stop();
      } catch (err) {
        // ignore
      }
      const MenuScene = require('./menuScene');
      this.changeScene(new MenuScene({ canvas: this.canvas, ctx: this.ctx, changeScene: this.changeScene }));
      return;
    }
    const touch = e.touches[0];
    this.player.setPosition(touch.clientX);
  }

  /**
   * Handles touch move events. Continuously updates the player's
   * horizontal position to track the finger.
   *
   * @param {Object} e - Touch event object from wx.onTouchMove.
   */
  onTouchMove(e) {
    if (this.gameOver) return;
    const touch = e.touches[0];
    this.player.setPosition(touch.clientX);
  }

  /**
   * Called when the song finishes or the timer expires. Stops audio
   * playback and sets the gameOver flag, allowing the overlay to be
   * rendered. Further input will return to the menu.
   */
  endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    // Stop audio playback if still running
    try {
      this.audioCtx.stop();
    } catch (e) {
      // ignore if already stopped
    }
  }
}

module.exports = GameScene;