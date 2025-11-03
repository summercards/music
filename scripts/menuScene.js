const GameScene = require('./gameScene');
const EditorScene = require('./editorScene');
const { drawRoundedRect } = require('./util');
const config = require('../config');
// 从 levels 目录加载关卡元数据。每个模块导出标题、音频路径、时长以及可选的 spawns。
const level1 = require('../levels/song1');
const level2 = require('../levels/song2');

/**
 * MenuScene 展示主菜单，供玩家选择歌曲进入游戏。页面以列表形式显示可用曲目及其时长，
 * 点击列表项会进入相应的 GameScene；也提供进入乐谱编辑器的入口。
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
    // 从导入的模块组装可用关卡列表。可以在 levels 目录添加更多关卡并在此处加载。
    // 列表末尾追加一个内置的编辑器条目。
    this.songs = [level1, level2];
    // 追加编辑器条目，用 isEditor 标志区分真实关卡。
    this.editorEntry = { title: '乐谱编辑器', isEditor: true };
  }

  /**
   * Update method for the menu. Currently unused because the menu has
   * no time‑dependent behaviour, but kept for future extension.
   *
   * @param {number} dt - Delta time in seconds.
   */
  update(dt) {
    // 菜单目前不需要动态更新
  }

  /**
   * Renders the menu screen. Displays the game title and the list of
   * songs with semi‑transparent backgrounds to indicate tappable
   * areas.
   */
  render() {
    const ctx = this.ctx;
    // 绘制深蓝色的纵向渐变背景
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#0f1935');
    grad.addColorStop(1, '#141a47');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // 游戏标题
    ctx.fillStyle = '#ffffff';
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('音乐游戏', this.canvas.width / 2, 80);
    // 副标题/提示
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#8c9bd6';
    ctx.fillText('请选择一首歌曲开始', this.canvas.width / 2, 120);
    // 计算列表项的布局参数
    const totalEntries = this.songs.length + 1;
    const cardHeight = 65;
    const cardSpacing = 25;
    const listHeight = totalEntries * cardHeight + (totalEntries - 1) * cardSpacing;
    let startY = (this.canvas.height - listHeight) / 2 + 40;
    const cardWidth = Math.min(320, this.canvas.width - 60);
    for (let i = 0; i < totalEntries; i++) {
      const y = startY + i * (cardHeight + cardSpacing);
      const x = (this.canvas.width - cardWidth) / 2;
      // 确定条目是歌曲还是编辑器
      const entry = i < this.songs.length ? this.songs[i] : this.editorEntry;
      // 绘制带圆角的面板背景
      ctx.fillStyle = entry.isEditor ? '#3a2d78' : '#1c2547';
      drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 16);
      // 左侧图标或占位符
      const iconRadius = 18;
      const iconX = x + 20 + iconRadius;
      const iconY = y + cardHeight / 2;
      ctx.beginPath();
      if (entry.isEditor) {
        // 编辑器条目：绘制紫色圆圈和加号
        ctx.fillStyle = '#7e5bef';
        ctx.arc(iconX, iconY, iconRadius, 0, Math.PI * 2);
        ctx.fill();
        // 加号符号
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(iconX - 6, iconY);
        ctx.lineTo(iconX + 6, iconY);
        ctx.moveTo(iconX, iconY - 6);
        ctx.lineTo(iconX, iconY + 6);
        ctx.stroke();
      } else {
        // 歌曲条目：循环使用 blockTypes 的颜色作为图标
        const colour = config.blockTypes[i % config.blockTypes.length].color;
        ctx.fillStyle = colour;
        ctx.arc(iconX, iconY, iconRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      // 绘制歌曲标题和副标题/时长
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
    // 底部提示文字
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
    // 使用与 render 相同的布局参数检测点击，确保触摸区域与绘制的卡片完全重合。
    const totalEntries = this.songs.length + 1;
    const cardHeight = 65;
    const cardSpacing = 25;
    const listHeight = totalEntries * cardHeight + (totalEntries - 1) * cardSpacing;
    let startY = (this.canvas.height - listHeight) / 2 + 40;
    const cardWidth = Math.min(320, this.canvas.width - 60);
    const cardX = (this.canvas.width - cardWidth) / 2;
    for (let i = 0; i < totalEntries; i++) {
      const yTop = startY + i * (cardHeight + cardSpacing);
      // 如果触摸点在当前卡片范围内
      if (y >= yTop && y <= yTop + cardHeight && x >= cardX && x <= cardX + cardWidth) {
        if (i < this.songs.length) {
          // 点击歌曲条目：克隆歌曲对象，并尝试从本地存储读取谱面
          const selected = this.songs[i];
          const songCopy = Object.assign({}, selected);
          try {
            if (wx.getStorageSync) {
              const saved = wx.getStorageSync('spawns_' + selected.title);
              if (Array.isArray(saved)) {
                songCopy.spawns = saved.slice();
              }
            }
          } catch (err) {
            // 忽略本地存储错误
          }
          this.changeScene(new GameScene({ canvas: this.canvas, ctx: this.ctx, song: songCopy, changeScene: this.changeScene }));
        } else {
          // 点击编辑器条目：进入编辑器
          this.changeScene(new EditorScene({ canvas: this.canvas, ctx: this.ctx, changeScene: this.changeScene }));
        }
        return;
      }
    }
  }
}

module.exports = MenuScene;