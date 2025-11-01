const GameScene = require('./gameScene');
const EditorScene = require('./editorScene');
const { drawRoundedRect } = require('./util');
const config = require('../config');
// Load level metadata from the levels directory. Each module exports
// title, file, duration and optionally spawns.
const level1 = require('../levels/song1');
const level2 = require('../levels/song2');

/**
 * MenuScene presents the home screen where players can choose a song
 * before beginning play. A simple list displays the available
 * tracks along with their durations. Tapping an entry transitions
 * into the GameScene with the selected song.
 */
class MenuScene {
  /**
   * Constructs a new MenuScene instance.
   *
   * @param {Object} options
   * @param {HTMLCanvasElement} options.canvas - Canvas used for drawing.
   * @param {CanvasRenderingContext2D} options.ctx - 2D rendering context.
   * @param {Function} options.changeScene - Function for switching scenes.
   */
  constructor({ canvas, ctx, changeScene }) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.changeScene = changeScene;
    // Assemble a list of available levels from imported modules. Each
    // entry inherits properties exported by its module. Additional
    // level modules can be added to the levels directory and loaded
    // here. An extra entry for the built‑in level editor is appended.
    this.songs = [level1, level2];
    // Append an editor entry to allow editing custom patterns. The
    // `isEditor` flag is used to distinguish it from real levels.
    this.editorEntry = { title: '乐谱编辑器', isEditor: true };
  }

  /**
   * Update method for the menu. Currently unused because the menu has
   * no time‑dependent behaviour, but kept for future extension.
   *
   * @param {number} dt - Delta time in seconds.
   */
  update(dt) {
    // No dynamic behaviour needed on the menu for now.
  }

  /**
   * Renders the menu screen. Displays the game title and the list of
   * songs with semi‑transparent backgrounds to indicate tappable
   * areas.
   */
  render() {
    const ctx = this.ctx;
    // Draw a vertical gradient background reminiscent of a deep blue night.
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#0f1935');
    grad.addColorStop(1, '#141a47');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('音乐游戏', this.canvas.width / 2, 80);
    // Subtitle / instruction
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#8c9bd6';
    ctx.fillText('请选择一首歌曲开始', this.canvas.width / 2, 120);
    // Layout parameters for entries
    const totalEntries = this.songs.length + 1;
    const cardHeight = 65;
    const cardSpacing = 25;
    const listHeight = totalEntries * cardHeight + (totalEntries - 1) * cardSpacing;
    let startY = (this.canvas.height - listHeight) / 2 + 40;
    const cardWidth = Math.min(320, this.canvas.width - 60);
    for (let i = 0; i < totalEntries; i++) {
      const y = startY + i * (cardHeight + cardSpacing);
      const x = (this.canvas.width - cardWidth) / 2;
      // Determine entry data (song or editor)
      const entry = i < this.songs.length ? this.songs[i] : this.editorEntry;
      // Panel background with rounded corners
      ctx.fillStyle = entry.isEditor ? '#3a2d78' : '#1c2547';
      drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 16);
      // Icon or placeholder on the left
      const iconRadius = 18;
      const iconX = x + 20 + iconRadius;
      const iconY = y + cardHeight / 2;
      ctx.beginPath();
      if (entry.isEditor) {
        // Editor entry: draw a purple circle with a plus sign
        ctx.fillStyle = '#7e5bef';
        ctx.arc(iconX, iconY, iconRadius, 0, Math.PI * 2);
        ctx.fill();
        // Plus symbol
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(iconX - 6, iconY);
        ctx.lineTo(iconX + 6, iconY);
        ctx.moveTo(iconX, iconY - 6);
        ctx.lineTo(iconX, iconY + 6);
        ctx.stroke();
      } else {
        // Song entry: assign colour based on block type index (cycling)
        const colour = config.blockTypes[i % config.blockTypes.length].color;
        ctx.fillStyle = colour;
        ctx.arc(iconX, iconY, iconRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      // Song title and subtitle/duration
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px sans-serif';
      const textX = x + 20 + iconRadius * 2 + 12;
      const textY = y + cardHeight / 2 - 4;
      if (entry.isEditor) {
        ctx.fillText(entry.title, textX, textY);
      } else {
        ctx.fillText(entry.title, textX, textY);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#8c9bd6';
        ctx.fillText(`${entry.duration}s`, textX, textY + 20);
      }
    }
    // Footer instruction at the bottom
    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#7a8ec4';
    ctx.fillText('向左右滑动控制方块移动', this.canvas.width / 2, this.canvas.height - 40);
    ctx.textAlign = 'left';
  }

  /**
   * Handles touch start events on the menu. Determines whether a
   * song entry was tapped and, if so, switches to the game scene with
   * that song.
   *
   * @param {Object} e - Touch event from wx.onTouchStart.
   */
  onTouchStart(e) {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    // Use the same layout calculations from render to detect touches on
    // the rounded cards. This ensures the touch areas align with the
    // drawn UI elements.
    const totalEntries = this.songs.length + 1;
    const cardHeight = 65;
    const cardSpacing = 25;
    const listHeight = totalEntries * cardHeight + (totalEntries - 1) * cardSpacing;
    let startY = (this.canvas.height - listHeight) / 2 + 40;
    const cardWidth = Math.min(320, this.canvas.width - 60);
    const cardX = (this.canvas.width - cardWidth) / 2;
    for (let i = 0; i < totalEntries; i++) {
      const yTop = startY + i * (cardHeight + cardSpacing);
      // If touch within this card's bounds
      if (y >= yTop && y <= yTop + cardHeight && x >= cardX && x <= cardX + cardWidth) {
        if (i < this.songs.length) {
          const selected = this.songs[i];
          this.changeScene(new GameScene({ canvas: this.canvas, ctx: this.ctx, song: selected, changeScene: this.changeScene }));
        } else {
          this.changeScene(new EditorScene({ canvas: this.canvas, ctx: this.ctx, changeScene: this.changeScene }));
        }
        return;
      }
    }
  }
}

module.exports = MenuScene;