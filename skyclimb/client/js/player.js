function freshPlayer() {
  return {
    x: COL_W / 2 - PLAYER_W / 2,
    y: GROUND_Y - PLAYER_H / 2,
    vx: 0, vy: 0,
    onGround: true,
    facing: 1
  };
}

function updatePlayer(p, keys) {
  const moveLeft = held.has(keys.left);
  const moveRight = held.has(keys.right);

  if (moveLeft && !moveRight) {
    p.vx -= MOVE_ACC;
    p.facing = -1;
  } else if (moveRight && !moveLeft) {
    p.vx += MOVE_ACC;
    p.facing = 1;
  } else {
    p.vx *= FRICTION;
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
  }
  p.vx = clamp(p.vx, -MOVE_MAX, MOVE_MAX);

  p.vy += GRAVITY;
  const prevFootY = p.y + PLAYER_H / 2;

  p.x += p.vx;
  p.x = clamp(p.x, 0, COL_W - PLAYER_W);
  p.y += p.vy;

  const newFootY = p.y + PLAYER_H / 2;
  p.onGround = false;

  if (p.vy > 0) {
    // ground catch
    if (prevFootY <= GROUND_Y && newFootY >= GROUND_Y) {
      p.y = GROUND_Y - PLAYER_H / 2;
      p.vy = 0;
      p.onGround = true;
    } else {
      // platform catch — nearest valid platform under feet this frame.
      // a platform is landable if its surface (plat.y) sits anywhere
      // between where the foot started and where it ended up this frame.
      let best = null;
      for (const plat of pattern) {
        if (plat.y < prevFootY || plat.y > newFootY) continue;
        const px = platformX(plat.frac);
        const overlapsX = p.x + PLAYER_W > px && p.x < px + PLATFORM_W;
        if (overlapsX) {
          if (best === null || plat.y < best.y) best = plat;
        }
      }
      if (best) {
        p.y = best.y - PLAYER_H / 2;
        p.vy = 0;
        p.onGround = true;
      }
    }
  }

  if (p.onGround && (jumpQueued.p1 && keys === KEYMAP.p1 || jumpQueued.p2 && keys === KEYMAP.p2)) {
    p.vy = JUMP_V;
    p.onGround = false;
  }
}

function heightOf(p) {
  return Math.max(0, Math.round((GROUND_Y - (p.y + PLAYER_H / 2)) / 9));
}
