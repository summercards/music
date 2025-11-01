/**
 * Level definition for the second song. Similar structure to
 * song1.js. The spawns array can be edited to define a specific
 * pattern for this track.
 */

module.exports = {
  title: '快乐小蜜蜂',
  file: 'assets/audio/song2.wav',
  // Extended duration to 120 seconds for a full 2‑minute track.
  duration: 120,
  // Pattern for the second song. Uses the same interval as song1 but
  // reverses the lane and type ordering to create a different rhythm.
  spawns: (() => {
    const config = require('../config');
    const spawns = [];
    const interval = 0.8;
    const total = 120;
    const laneCount = config.numLanes;
    const typeCount = config.blockTypes.length;
    for (let i = 0; ; i++) {
      const t = parseFloat((i * interval).toFixed(2));
      if (t > total) break;
      // Reverse lane sequence and type sequence
      const lane = (laneCount - 1) - (i % laneCount);
      const type = (typeCount - 1) - (i % typeCount);
      spawns.push({ time: t, type, lane });
    }
    return spawns;
  })()
};