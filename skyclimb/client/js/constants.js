// ---------- gameplay tuning ----------
const PLAYER_W = 24, PLAYER_H = 32;
const PLATFORM_W = 62, PLATFORM_H = 14;
const GRAVITY = 0.55;
const JUMP_V = -11.6;
const MOVE_ACC = 0.65;
const MOVE_MAX = 4.3;
const FRICTION = 0.84;
const GROUND_Y = 0;

// ---------- decorative background tuning ----------
const ISLAND_TILE = 600;     // mini floating islands repeat every N px of world height
const ISLAND_PARALLAX = 0.5;
const CLOUD_TILE = 700;      // soft cloud puffs repeat every N px
const CLOUD_PARALLAX = 0.35;
const WALL_PARALLAX = 0.18;  // canyon walls drift the slowest (furthest away)

const KEYMAP = {
  p1: { left: 'a', right: 'd', jump: 'w' },
  p2: { left: 'arrowleft', right: 'arrowright', jump: 'arrowup' }
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
