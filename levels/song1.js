/**
 * 第一首歌曲的关卡定义。此模块导出歌曲的元数据以及可选的方块生成序列。
 * 如果提供了 spawns 数组，游戏将按照数组中指定的时间、方块类型和轨道生成下落方块；
 * 如果未提供 spawns，则游戏会退回到默认的随机生成模式。
 */

module.exports = {
  title: '魔法师的情书',
  // 音频文件在包内的相对路径
  file: 'assets/audio/song1.wav',
  // 曲目时长（秒），用于进度条和结束条件。应与音频文件实际时长一致。
  // 为了完整的两分钟体验，延长到 120 秒。
  duration: 120,
  // 方块生成序列。每个条目包含 `time`（从歌曲开始起的秒数）、`type` 索引（0..2）
  // 和 `lane` 索引（0..numLanes-1）。此模式按顺序生成，覆盖整个时长。
  spawns: (() => {
    const config = require('../config');
    const spawns = [];
    const interval = 0.8; // 每次生成之间的时间间隔（秒）
    const total = 120;
    const laneCount = config.numLanes;
    const typeCount = config.blockTypes.length;
    // 从时间 0.0 开始生成节奏模式
    for (let i = 0; ; i++) {
      const t = parseFloat((i * interval).toFixed(2));
      if (t > total) break;
      const lane = i % laneCount;
      const type = i % typeCount;
      spawns.push({ time: t, type, lane });
    }
    return spawns;
  })()
};