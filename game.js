(function(){
'use strict';
// ... rest of game.js code ...
// Only showing relevant part for brevity in this snippet
// Player object initialization with smaller size
const player = {
  x: W*0.5-18, // adjusted for new width
  y: 280,
  w: 36, // reduced from 40 (~10% smaller)
  h: 47, // reduced from 52 (~10% smaller)
  vx: 0, vy: 0,
  onGround: false,
  jumpsLeft: ALLOW_DOUBLE?2:1,
  facing: 1,
  anim: 'idle',
  animTime: 0,
  squashX: 1,
  squashY: 1,
  trailT: 0
};
// When drawing sprite, it uses player.w and player.h, so scaling is automatic
// Also ensure placePlayerOnPlatform uses player.w/h dynamically
})();