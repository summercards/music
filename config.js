/**
 * Global configuration for the music game. This module centralises
 * parameters that affect gameplay, appearance and scoring so that
 * changes to these values can be made in a single place. Levels
 * reference these values for consistent behaviour across songs.
 */

module.exports = {
  /**
   * Number of horizontal lanes in the game. Blocks will fall along
   * these lanes, and the editor timeline will be divided into this
   * many columns. The number of block types (colours) can be less
   * than the lane count; lanes cycle through available types when
   * generating patterns. Set this to 6 to create six distinct lanes
   * across the screen.
   */
  numLanes: 6,
  /**
   * Player settings control the size and pulsing animation of the
   * player's square. `size` specifies the width and height (in
   * pixels) of the square. `pulseAmplitude` determines how much the
   * square scales around its base size (e.g. 0.2 = ±20%), and
   * `pulseFrequency` controls how many full scale cycles happen per
   * second.
   */
  player: {
    size: 60,
    pulseAmplitude: 0.15,
    pulseFrequency: 1.5
  },

  /**
   * Scoring rules used across all levels. The `hit` value is the
   * number of points awarded when the player catches a falling block.
   * The `miss` value is the penalty applied when a block reaches
   * the bottom of the screen without being caught.
   */
  scoring: {
    hit: 1,
    miss: 1
  },

  /**
   * Definitions of block types available in the game. Each entry
   * defines a colour and an optional effect identifier. New types
   * can be added here and will automatically become available for
   * both gameplay and the editor. Effects are interpreted by the
   * Block class.
   */
  blockTypes: [
    // Updated colours to better fit the dark, playful aesthetic. Blocks are
    // vibrant against the deep blue background while remaining harmonious.
    { color: '#ff6bcb', effect: null },      // pink plain block
    { color: '#5b86e5', effect: 'rotate' },  // blue rotating block
    { color: '#f8c967', effect: 'pulse' }    // yellow pulsing block
  ]
};