/**
 * Level definition for the first song. This module exports
 * metadata about the song and an optional list of spawn events. When
 * spawns are provided the game will spawn falling blocks at the
 * specified times and with the given block type index. If no
 * spawns are provided the game will fall back to random spawning.
 */

module.exports = {
  title: '魔法师的情书',
  // Relative path to the audio file within the package
  file: 'assets/audio/song1.wav',
  // Duration of the track in seconds. Used for progress bar and end
  // condition. Ideally this matches the actual length of the file.
  // Extended duration to 120 seconds for a full 2‑minute track.
  duration: 120,
  // Pattern of blocks to spawn. Each entry specifies a `time` (in
  // seconds from the start of the song), a `type` index (0..2) and a
  // `lane` index (0..numLanes-1). This pattern is procedurally
  // generated to span the entire duration in a repeating sequence.
  spawns: (() => {
    const config = require('../config');
    const spawns = [];
    const interval = 0.8; // seconds between spawns
    const total = 120;
    const laneCount = config.numLanes;
    const typeCount = config.blockTypes.length;
    // Generate spawns starting at t=0.0
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