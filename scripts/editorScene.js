const GameScene = require('./gameScene');
// Note: We intentionally do not require MenuScene here to avoid
// circular dependency issues. It will be required dynamically
// within goBack().
const config = require('../config');
const { drawRoundedRect } = require('./util');

/**
 * EditorScene implements a timeline‑based level editor. A vertical track
 * represents the entire song duration; users can tap on the track to
 * place notes at specific times and scroll through the timeline using
 * up/down buttons on the right. The left side shows a time scale,
 * while controls for song selection, block type selection, saving and
 * testing sit at the top and bottom of the screen.
 */
class EditorScene {
  constructor({ canvas, ctx, changeScene }) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.changeScene = changeScene;
    // Load levels from the levels directory. Each level exports title,
    // duration, file and optionally spawns.
    this.levels = [require('../levels/song1'), require('../levels/song2')];
    this.currentLevelIndex = 0;
    // Pixel height per second of timeline. Adjust to change the scale
    // of the editor; larger values produce a longer track.
    this.pxPerSecond = 50;
    // Scroll offset in pixels from the top of the timeline.
    this.scrollOffset = 0;
    // Selected block type index (0..config.blockTypes.length-1)
    this.selectedBlockType = 0;
    // Spawns array for the current level. Each element has a `time` in
    // seconds and `type` index. Populated in updateLevelData().
    this.spawns = [];
    // Output JSON string for save feedback
    this.outputText = '';
    // Cache bounding boxes for UI interaction
    this.bounds = {};
    // Populate spawns and reset state based on the first level
    this.updateLevelData();
    // Scroll handle dragging state
    this.scrollHandleDragging = false;
    this.scrollHandleOffset = 0;
  }

  /**
   * Called when switching songs to load existing spawns and reset the
   * scroll offset and output.
   */
  updateLevelData() {
    const level = this.levels[this.currentLevelIndex];
    this.spawns = Array.isArray(level.spawns) ? level.spawns.slice() : [];
    // Ensure spawns are sorted by time
    this.spawns.sort((a, b) => a.time - b.time);
    this.scrollOffset = 0;
    this.outputText = '';
  }

  /**
   * Compute layout values used in rendering and interaction. This method
   * calculates positions and dimensions of the timeline viewport,
   * control panels and scroll bar based on the current canvas size and
   * song duration.
   */
  computeLayout() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    // Margins and panel dimensions
    this.headerHeight = 140; // space for title, song selection and block types
    this.footerHeight = 80;  // space for save/test/back buttons
    this.marginX = 20;
    this.scaleWidth = 60;    // width reserved for time scale
    this.scrollBarWidth = 24; // width for scroll buttons
    // Timeline viewport coordinates and dimensions
    this.viewportX = this.marginX + this.scaleWidth;
    this.viewportY = this.headerHeight;
    this.viewportWidth = width - this.marginX * 2 - this.scaleWidth - this.scrollBarWidth - 10; // 10px spacing between track and scroll bar
    this.viewportHeight = height - this.headerHeight - this.footerHeight;
    // Scroll bar x coordinate
    this.scrollBarX = this.viewportX + this.viewportWidth + 10;
    // Total height of the timeline based on song duration
    const level = this.levels[this.currentLevelIndex];
    this.timelineHeightPx = level.duration * this.pxPerSecond;
    // Limit scrollOffset to valid range
    const maxScroll = Math.max(0, this.timelineHeightPx - this.viewportHeight);
    this.scrollOffset = Math.min(this.scrollOffset, maxScroll);
    this.scrollOffset = Math.max(this.scrollOffset, 0);
  }

  /**
   * Navigate to the previous song. Wraps around at the beginning of
   * the level list.
   */
  prevSong() {
    this.currentLevelIndex = (this.currentLevelIndex - 1 + this.levels.length) % this.levels.length;
    this.updateLevelData();
  }

  /**
   * Navigate to the next song. Wraps around at the end of the list.
   */
  nextSong() {
    this.currentLevelIndex = (this.currentLevelIndex + 1) % this.levels.length;
    this.updateLevelData();
  }

  /**
   * Scroll the timeline up by half the viewport height.
   */
  scrollUp() {
    this.scrollOffset = Math.max(0, this.scrollOffset - this.viewportHeight * 0.5);
  }

  /**
   * Scroll the timeline down by half the viewport height.
   */
  scrollDown() {
    const maxScroll = Math.max(0, this.timelineHeightPx - this.viewportHeight);
    this.scrollOffset = Math.min(maxScroll, this.scrollOffset + this.viewportHeight * 0.5);
  }

  /**
   * Save the current spawn pattern. Copies the JSON representation to
   * the clipboard if possible and stores it in outputText for display.
   */
  saveSpawns() {
    // Sort spawns and round times to 3 decimal places
    this.spawns.sort((a, b) => a.time - b.time);
    this.outputText = JSON.stringify(this.spawns, null, 2);
    if (wx.setClipboardData) {
      wx.setClipboardData({ data: this.outputText });
    }
  }

  /**
   * Launch a game scene to test the current pattern. Clones the
   * selected song and assigns the current spawns array.
   */
  playTest() {
    const level = this.levels[this.currentLevelIndex];
    const song = Object.assign({}, level);
    song.spawns = this.spawns.slice();
    this.changeScene(new GameScene({ canvas: this.canvas, ctx: this.ctx, song, changeScene: this.changeScene }));
  }

  /**
   * Return to the menu scene.
   */
  goBack() {
    // Dynamically require MenuScene to break circular dependency.
    const MenuSceneClass = require('./menuScene');
    this.changeScene(new MenuSceneClass({ canvas: this.canvas, ctx: this.ctx, changeScene: this.changeScene }));
  }

  /**
   * Determine if a coordinate falls within a bounding box. Boxes are
   * defined by x, y, w, h properties.
   */
  _hitBox(box, x, y) {
    return box && x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
  }

  /**
   * Handle touch start events. Determines if a control was tapped or
   * if the timeline was clicked to add or remove a note.
   */
  onTouchStart(e) {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    // Precompute layout and bounding boxes to ensure interactions
    this.computeLayout();
    // If tapping scroll handle, begin dragging
    if (this._hitBox(this.bounds.scrollHandle, x, y)) {
      this.scrollHandleDragging = true;
      // Store offset within handle to keep handle grip constant
      this.scrollHandleOffset = y - this.bounds.scrollHandle.y;
      return;
    }
    // Check if tapping on an existing note to start dragging.
    if (this.bounds.noteBoxes) {
      for (let i = 0; i < this.bounds.noteBoxes.length; i++) {
        const nb = this.bounds.noteBoxes[i];
        if (this._hitBox(nb, x, y)) {
          // Begin dragging this note; store its index
          this.dragging = true;
          this.dragNoteIndex = i;
          return;
        }
      }
    }
    // Check song navigation
    if (this._hitBox(this.bounds.songPrev, x, y)) {
      this.prevSong();
      return;
    }
    if (this._hitBox(this.bounds.songNext, x, y)) {
      this.nextSong();
      return;
    }
    // Block type selection
    if (this.bounds.blockBoxes) {
      for (let i = 0; i < this.bounds.blockBoxes.length; i++) {
        if (this._hitBox(this.bounds.blockBoxes[i], x, y)) {
          this.selectedBlockType = i;
          return;
        }
      }
    }
    // Scroll buttons
    if (this._hitBox(this.bounds.scrollUp, x, y)) {
      this.scrollUp();
      return;
    }
    if (this._hitBox(this.bounds.scrollDown, x, y)) {
      this.scrollDown();
      return;
    }
    // Save/Test/Back buttons
    if (this._hitBox(this.bounds.save, x, y)) {
      this.saveSpawns();
      return;
    }
    if (this._hitBox(this.bounds.test, x, y)) {
      this.playTest();
      return;
    }
    if (this._hitBox(this.bounds.back, x, y)) {
      this.goBack();
      return;
    }
    // Track area: add or remove a note. Determine lane from x position.
    if (this._hitBox(this.bounds.track, x, y)) {
      const localY = y - this.viewportY;
      const time = (this.scrollOffset + localY) / this.pxPerSecond;
      const level = this.levels[this.currentLevelIndex];
      if (time < 0 || time > level.duration) {
        return;
      }
      // Determine which lane was tapped. Divide track width into equal lanes.
      const laneCount = config.numLanes;
      const laneWidth = this.viewportWidth / laneCount;
      const localX = x - this.viewportX;
      let lane = Math.floor(localX / laneWidth);
      if (lane < 0) lane = 0;
      if (lane >= laneCount) lane = laneCount - 1;
      // If a note exists within both time threshold and same lane, remove it
      const thresholdPx = 10;
      const thresholdTime = thresholdPx / this.pxPerSecond;
      for (let i = 0; i < this.spawns.length; i++) {
        const spawn = this.spawns[i];
        if (spawn.lane === lane && Math.abs(spawn.time - time) <= thresholdTime) {
          this.spawns.splice(i, 1);
          return;
        }
      }
      // Otherwise add a new note with lane
      const roundedTime = parseFloat(time.toFixed(2));
      this.spawns.push({ time: roundedTime, type: this.selectedBlockType, lane });
      this.spawns.sort((a, b) => a.time - b.time);
      return;
    }
  }

  /**
   * Handle touch move events. If dragging a note, update its
   * lane and time based on pointer position.
   */
  onTouchMove(e) {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    // Handle scroll bar dragging
    if (this.scrollHandleDragging) {
      // Compute layout to update handle position
      this.computeLayout();
      const trackY = this.viewportY;
      const trackH = this.viewportHeight;
      const arrowH = 24; // matches height used in render for arrows
      const scrollBarH = trackH - arrowH * 2;
      const maxScroll = Math.max(0, this.timelineHeightPx - this.viewportHeight);
      if (maxScroll > 0) {
        // Compute new handle Y by subtracting stored offset
        let handleY = y - this.scrollHandleOffset;
        // Constrain handle within scroll bar region
        const handleHeight = this.bounds.scrollHandle.h;
        const minY = trackY + arrowH;
        const maxY = trackY + trackH - arrowH - handleHeight;
        handleY = Math.max(minY, Math.min(maxY, handleY));
        // Compute new scrollOffset based on handle position
        const ratio = (handleY - minY) / (maxY - minY);
        this.scrollOffset = ratio * maxScroll;
      }
      return;
    }
    // Handle note dragging
    if (!this.dragging) return;
    // Compute layout to interpret coordinates
    this.computeLayout();
    const note = this.spawns[this.dragNoteIndex];
    if (!note) return;
    // Clamp y within timeline
    const localY = y - this.viewportY;
    let newTime = (this.scrollOffset + localY) / this.pxPerSecond;
    const level = this.levels[this.currentLevelIndex];
    newTime = Math.max(0, Math.min(level.duration, newTime));
    // Determine lane from x
    const laneCount = config.numLanes;
    const laneWidth = this.viewportWidth / laneCount;
    const localX = x - this.viewportX;
    let lane = Math.floor(localX / laneWidth);
    if (lane < 0) lane = 0;
    if (lane >= laneCount) lane = laneCount - 1;
    note.time = parseFloat(newTime.toFixed(2));
    note.lane = lane;
    return;
  }

  /**
   * Handle touch end events. If dragging, finalize the note
   * position and re-sort spawns.
   */
  onTouchEnd(e) {
    if (this.scrollHandleDragging) {
      this.scrollHandleDragging = false;
      return;
    }
    if (this.dragging) {
      this.dragging = false;
      this.dragNoteIndex = null;
      // Re-sort by time after drag
      this.spawns.sort((a, b) => a.time - b.time);
    }
  }

  /**
   * Main update loop. Currently unused as the editor has no time‑based
   * animation, but provided for future extensions.
   */
  update(dt) {
    // No dynamic behaviour needed yet.
  }

  /**
   * Render the editor UI, including controls, timeline and notes. The
   * layout is recalculated each frame to adapt to screen size or
   * level changes.
   */
  render() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    // Compute layout positions
    this.computeLayout();
    // Dark gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0f1935');
    grad.addColorStop(1, '#141a47');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px sans-serif';
    ctx.fillText('乐谱编辑器', width / 2, 40);
    // Song selector display with arrows
    const level = this.levels[this.currentLevelIndex];
    const songY = 75;
    const arrowSize = 28;
    const songBoxW = 200;
    const songBoxH = 32;
    const songBoxX = (width - songBoxW) / 2;
    // Left arrow area
    this.bounds.songPrev = { x: songBoxX, y: songY - songBoxH / 2, w: songBoxW / 2, h: songBoxH };
    // Right arrow area
    this.bounds.songNext = { x: songBoxX + songBoxW / 2, y: songY - songBoxH / 2, w: songBoxW / 2, h: songBoxH };
    // Draw arrow backgrounds lightly
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(this.bounds.songPrev.x, this.bounds.songPrev.y, this.bounds.songPrev.w, this.bounds.songPrev.h);
    ctx.fillRect(this.bounds.songNext.x, this.bounds.songNext.y, this.bounds.songNext.w, this.bounds.songNext.h);
    // Arrows
    ctx.fillStyle = '#7a8ec4';
    ctx.font = '20px sans-serif';
    ctx.fillText('<', this.bounds.songPrev.x + this.bounds.songPrev.w / 2, songY + 6);
    ctx.fillText('>', this.bounds.songNext.x + this.bounds.songNext.w / 2, songY + 6);
    // Song title
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText(level.title, width / 2, songY + 6);
    // Block type selection row
    const blockY = 110;
    const blockSize = 40;
    const spacing = 20;
    const totalW = config.blockTypes.length * blockSize + (config.blockTypes.length - 1) * spacing;
    let startX = (width - totalW) / 2;
    this.bounds.blockBoxes = [];
    for (let i = 0; i < config.blockTypes.length; i++) {
      const bx = startX + i * (blockSize + spacing);
      const by = blockY;
      this.bounds.blockBoxes.push({ x: bx, y: by, w: blockSize, h: blockSize });
      ctx.fillStyle = config.blockTypes[i].color;
      drawRoundedRect(ctx, bx, by, blockSize, blockSize, 6);
      if (i === this.selectedBlockType) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx - 2, by - 2, blockSize + 4, blockSize + 4);
      }
    }
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#8c9bd6';
    ctx.fillText('选择方块类型', width / 2, blockY - 10);
    // Draw timeline background panel
    const trackX = this.viewportX;
    const trackY = this.viewportY;
    const trackW = this.viewportWidth;
    const trackH = this.viewportHeight;
    // Track bounding box for hit detection
    this.bounds.track = { x: trackX, y: trackY, w: trackW, h: trackH };
    ctx.fillStyle = '#1c2547';
    drawRoundedRect(ctx, trackX, trackY, trackW, trackH, 6);
    // Draw lane separators inside the track for clarity. Use subtle lines
    // dividing the track into equal width lanes based on the number
    // of block types.
    const laneCountRender = config.numLanes;
    if (laneCountRender > 1) {
      const laneWidthRender = trackW / laneCountRender;
      ctx.strokeStyle = '#2e3c6a';
      ctx.lineWidth = 1;
      for (let i = 1; i < laneCountRender; i++) {
        const lineX = trackX + laneWidthRender * i;
        ctx.beginPath();
        ctx.moveTo(lineX, trackY);
        ctx.lineTo(lineX, trackY + trackH);
        ctx.stroke();
      }
    }
    // Draw time scale on the left of the track
    ctx.textAlign = 'right';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#8c9bd6';
    // Determine which tick marks fall within the viewport
    const levelDuration = level.duration;
    const startTime = this.scrollOffset / this.pxPerSecond;
    const endTime = (this.scrollOffset + trackH) / this.pxPerSecond;
    // We draw major ticks every 5 seconds and minor ticks every second
    const firstMajor = Math.ceil(startTime / 5) * 5;
    for (let t = firstMajor; t <= endTime; t += 5) {
      const yPos = trackY + (t * this.pxPerSecond) - this.scrollOffset;
      if (yPos >= trackY && yPos <= trackY + trackH) {
        // Major tick
        ctx.strokeStyle = '#4e567c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(trackX - 5, yPos);
        ctx.lineTo(trackX, yPos);
        ctx.stroke();
        ctx.fillText(`${t}s`, trackX - 8, yPos + 4);
      }
    }
    // Minor ticks (every second) with small lines, no labels
    const firstMinor = Math.ceil(startTime);
    for (let t = firstMinor; t <= endTime; t++) {
      // Skip multiples of 5 (already drawn as major)
      if (t % 5 === 0) continue;
      const yPos = trackY + (t * this.pxPerSecond) - this.scrollOffset;
      if (yPos >= trackY && yPos <= trackY + trackH) {
        ctx.strokeStyle = '#3a416b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(trackX - 3, yPos);
        ctx.lineTo(trackX, yPos);
        ctx.stroke();
      }
    }
    // Draw notes on the track. Notes are positioned by lane and time.
    ctx.textAlign = 'center';
    this.bounds.noteBoxes = [];
    const laneCount = config.numLanes;
    const laneWidth = trackW / laneCount;
    for (let i = 0; i < this.spawns.length; i++) {
      const note = this.spawns[i];
      const noteY = trackY + (note.time * this.pxPerSecond) - this.scrollOffset;
      if (noteY < trackY - 20 || noteY > trackY + trackH + 20) continue;
      const noteW = Math.max(28, laneWidth * 0.6);
      const noteH = 16;
      const noteX = trackX + laneWidth * note.lane + (laneWidth - noteW) / 2;
      // Safely look up block type definition. If type is out of range,
      // default to the first block type to avoid undefined errors.
      const typeDef = config.blockTypes[note.type] || config.blockTypes[0];
      ctx.fillStyle = typeDef.color;
      drawRoundedRect(ctx, noteX, noteY - noteH / 2, noteW, noteH, 4);
      // Store bounding box for interaction
      this.bounds.noteBoxes.push({ x: noteX, y: noteY - noteH / 2, w: noteW, h: noteH });
    }
    // Draw scroll bar area on the right
    const arrowH = 24;
    const arrowW = this.scrollBarWidth;
    const upY = trackY;
    const downY = trackY + trackH - arrowH;
    this.bounds.scrollUp = { x: this.scrollBarX, y: upY, w: arrowW, h: arrowH };
    this.bounds.scrollDown = { x: this.scrollBarX, y: downY, w: arrowW, h: arrowH };
    // Up arrow background
    ctx.fillStyle = '#2e3c6a';
    drawRoundedRect(ctx, this.scrollBarX, upY, arrowW, arrowH, 4);
    // Down arrow background
    ctx.fillStyle = '#2e3c6a';
    drawRoundedRect(ctx, this.scrollBarX, downY, arrowW, arrowH, 4);
    // Draw arrow symbols
    ctx.fillStyle = '#7a8ec4';
    ctx.font = '16px sans-serif';
    ctx.fillText('▲', this.scrollBarX + arrowW / 2, upY + 18);
    ctx.fillText('▼', this.scrollBarX + arrowW / 2, downY + 18);
    // Draw scroll handle between up and down arrows. The handle height
    // reflects the ratio of the viewport height to the total timeline
    // height. A minimum height ensures usability. Position is
    // proportional to scrollOffset. Only show handle if timeline is
    // taller than the viewport.
    const scrollBarHeight = trackH - arrowH * 2;
    const maxScroll = Math.max(0, this.timelineHeightPx - this.viewportHeight);
    let handleHeight = scrollBarHeight;
    if (maxScroll > 0) {
      handleHeight = (this.viewportHeight / this.timelineHeightPx) * scrollBarHeight;
    }
    // Enforce a minimum handle size
    handleHeight = Math.max(30, handleHeight);
    // Compute handle Y position
    const minHandleY = trackY + arrowH;
    const maxHandleY = trackY + trackH - arrowH - handleHeight;
    let handleY = minHandleY;
    if (maxScroll > 0) {
      const ratio = this.scrollOffset / maxScroll;
      handleY = minHandleY + ratio * (maxHandleY - minHandleY);
    }
    // Draw handle
    ctx.fillStyle = '#3a416b';
    drawRoundedRect(ctx, this.scrollBarX, handleY, arrowW, handleHeight, 4);
    // Save handle bounding box for interaction
    this.bounds.scrollHandle = { x: this.scrollBarX, y: handleY, w: arrowW, h: handleHeight };
    // Draw footer buttons: save, test, back
    const buttonY = height - this.footerHeight + 20;
    const btnH = 40;
    const btnSpacing = 20;
    const btnW = Math.min(120, (width - this.marginX * 2 - btnSpacing * 2) / 3);
    const saveX = this.marginX;
    const testX = saveX + btnW + btnSpacing;
    const backX = testX + btnW + btnSpacing;
    this.bounds.save = { x: saveX, y: buttonY, w: btnW, h: btnH };
    this.bounds.test = { x: testX, y: buttonY, w: btnW, h: btnH };
    this.bounds.back = { x: backX, y: buttonY, w: btnW, h: btnH };
    // Save button
    ctx.fillStyle = '#ff6bcb';
    drawRoundedRect(ctx, saveX, buttonY, btnW, btnH, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText('保存', saveX + btnW / 2, buttonY + btnH / 2 + 5);
    // Test button
    ctx.fillStyle = '#5b86e5';
    drawRoundedRect(ctx, testX, buttonY, btnW, btnH, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('测试', testX + btnW / 2, buttonY + btnH / 2 + 5);
    // Back button
    ctx.fillStyle = '#4e567c';
    drawRoundedRect(ctx, backX, buttonY, btnW, btnH, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('返回', backX + btnW / 2, buttonY + btnH / 2 + 5);
    // Display output text below buttons if available
    if (this.outputText) {
      ctx.font = '12px monospace';
      ctx.fillStyle = '#d6d7e9';
      const jsonY = buttonY + btnH + 16;
      const lines = this.outputText.split('\n');
      const maxLines = Math.min(6, lines.length);
      for (let i = 0; i < maxLines; i++) {
        ctx.fillText(lines[i], width / 2, jsonY + i * 14);
      }
    }
    ctx.textAlign = 'left';
  }
}

module.exports = EditorScene;