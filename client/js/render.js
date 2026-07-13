// ============================================================
// Column composition
// ============================================================
function drawColumn(originX, camTop, p, color, glow) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(originX, 0, COL_W, HEIGHT);
  ctx.clip();
  ctx.translate(originX, 0);

  const t = performance.now() * 0.00022;

  drawCaveBg();
  drawStars(camTop);
  drawPurpleDust(camTop); 
  drawCaveMist(camTop, t);
  drawCaveWalls(camTop);
  drawSkyLanterns(camTop, t);

  const groundScreenY = GROUND_Y - camTop;
  drawRiverGlow(groundScreenY);

  if (groundScreenY < HEIGHT + 60) {
    drawPlatform(0, groundScreenY, COL_W, true);
  }

  for (const plat of pattern) {
    const sy = plat.y - camTop;
    if (sy < -40 || sy > HEIGHT + 40) continue;
    const px = platformX(plat.frac);
    drawPlatform(px, sy, PLATFORM_W, false, plat.crystal);
  }

  drawCharacter(p.x, (p.y - PLAYER_H / 2) - camTop, color, glow, p.facing);

  ctx.restore();
}

// ---------- deep cave background (dark purple) ----------
function drawCaveBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0,    '#0b0318'); // Deep black-purple
  grad.addColorStop(0.3,  '#130a2a');
  grad.addColorStop(0.7,  '#1b0c38');
  grad.addColorStop(1,    '#14062a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, COL_W, HEIGHT);
}

// ---------- faint ambient white/cyan dust particles ----------
function drawStars(camTop) {
  const tile = 1400;
  const now = performance.now() * 0.002;
  for (const s of stars) {
    let sy = (s.yFrac - camTop * 0.12) % tile;
    if (sy < 0) sy += tile;
    if (sy > HEIGHT) continue;
    const twinkle = 0.5 + 0.5 * Math.sin(now + s.phase);
    ctx.globalAlpha = 0.15 + twinkle * 0.25;
    ctx.fillStyle = '#b0a0ff'; 
    const x = s.xFrac * COL_W;
    if (s.spark) {
      ctx.fillRect(x - 2, sy, 4, 1);
      ctx.fillRect(x, sy - 2, 1, 4);
    } else {
      ctx.fillRect(x, sy, s.size, s.size);
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- purple dream dust (tiny stars) ----------
function drawPurpleDust(camTop) {
  const now = performance.now() * 0.001;
  const seed = 12345;
  const count = 200; 
  const layerCam = camTop * 0.05; 

  for (let i = 0; i < count; i++) {
    const x = ((i * 7919 + seed) % COL_W);
    const yBase = ((i * 6271 + seed * 3) % 1600) - 100;
    let sy = yBase - layerCam;
    
    if (sy < -20) sy += 1600;
    if (sy > HEIGHT) continue;

    const twinkle = 0.6 + 0.4 * Math.sin(now * 1.5 + i * 1.7);
    ctx.globalAlpha = 0.15 + twinkle * 0.4;

    ctx.fillStyle = '#e060ff';
    ctx.shadowColor = '#e060ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(x, sy, 1.5, 1.5);
  }
  
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ---------- realistic atmospheric fog (clouds) ----------
function drawCaveMist(camTop, t) {
  const layerCam = camTop * CLOUD_PARALLAX;
  const tileStart = Math.floor(layerCam / CLOUD_TILE) - 1;
  const tileEnd   = Math.ceil((layerCam + HEIGHT) / CLOUD_TILE) + 1;
  for (let k = tileStart; k <= tileEnd; k++) {
    for (const c of cloudPuffs) {
      const worldY = k * CLOUD_TILE + c.dy;
      const sy = worldY - layerCam;
      if (sy < -80 || sy > HEIGHT + 80) continue;
      const sx = c.xFrac * COL_W;
      
      const grad = ctx.createRadialGradient(sx, sy, 4, sx, sy, c.w / 2);
      grad.addColorStop(0,   'rgba(110, 70, 170, 0.25)');
      grad.addColorStop(0.4, 'rgba(70, 40, 120, 0.12)');
      grad.addColorStop(1,   'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = grad;
      ctx.shadowColor = '#4a2070';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.ellipse(sx, sy, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

// ---------- brick cave walls with glowing teal moss ----------
function drawCaveWalls(camTop) {
  const layerCam = camTop * WALL_PARALLAX;
  const brickH = 14;

  // --- LEFT WALL ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -20);
  for (let sy = -20; sy <= HEIGHT + 20; sy += 2) {
    const worldY = sy + layerCam;
    ctx.lineTo(wallDepth(worldY, 0), sy);
  }
  ctx.lineTo(0, HEIGHT + 20);
  ctx.closePath();
  
  ctx.fillStyle = '#1c103a';
  ctx.fill();

  ctx.strokeStyle = '#0d0720';
  ctx.lineWidth = 1;
  for (let sy = -20; sy <= HEIGHT + 20; sy += brickH) {
    const worldY = sy + layerCam;
    const leftEdge = wallDepth(worldY, 0);
    
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(leftEdge, sy);
    ctx.stroke();

    const offset = (Math.floor((sy + layerCam) / brickH) % 2) * 10;
    for (let px = 8 + offset; px < leftEdge; px += 24) {
      ctx.beginPath();
      ctx.moveTo(px, sy);
      ctx.lineTo(px, sy + brickH);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = '#2de8b0';
  ctx.shadowColor = '#2de8b0';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let sy = -20; sy <= HEIGHT + 20; sy += 1) {
    const worldY = sy + layerCam;
    const x = wallDepth(worldY, 0);
    sy === -20 ? ctx.moveTo(x, sy) : ctx.lineTo(x, sy);
  }
  ctx.stroke();
  ctx.restore();

  // --- RIGHT WALL ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(COL_W, -20);
  for (let sy = -20; sy <= HEIGHT + 20; sy += 2) {
    const worldY = sy + layerCam;
    ctx.lineTo(COL_W - wallDepth(worldY, 4.2), sy);
  }
  ctx.lineTo(COL_W, HEIGHT + 20);
  ctx.closePath();
  ctx.fillStyle = '#1c103a';
  ctx.fill();

  ctx.strokeStyle = '#0d0720';
  ctx.lineWidth = 1;
  for (let sy = -20; sy <= HEIGHT + 20; sy += brickH) {
    const worldY = sy + layerCam;
    const rightEdge = COL_W - wallDepth(worldY, 4.2);
    ctx.beginPath();
    ctx.moveTo(COL_W, sy);
    ctx.lineTo(rightEdge, sy);
    ctx.stroke();

    const offset = (Math.floor((sy + layerCam) / brickH) % 2) * 10;
    for (let px = COL_W - 8 - offset; px > rightEdge; px -= 24) {
      ctx.beginPath();
      ctx.moveTo(px, sy);
      ctx.lineTo(px, sy + brickH);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = '#2de8b0';
  ctx.shadowColor = '#2de8b0';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let sy = -20; sy <= HEIGHT + 20; sy += 1) {
    const worldY = sy + layerCam;
    const x = COL_W - wallDepth(worldY, 4.2);
    sy === -20 ? ctx.moveTo(x, sy) : ctx.lineTo(x, sy);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------- Warm, Dim Sky Lanterns ----------
function drawSkyLanterns(camTop, t) {
  const now = performance.now();
  const layerCam = camTop * 0.04;
  const seed = 97531;
  const count = 18; 
  const margin = 45;

  for (let i = 0; i < count; i++) {
    const x = margin + ((i * 1357 + seed * 2) % (COL_W - margin * 2));
    const yBase = ((i * 7291 + seed * 7) % 1300) - 150;
    let sy = yBase - layerCam;

    if (sy < -60) sy += 1350;
    if (sy > HEIGHT) continue;

    const w = 8 + ((i * 13 + seed) % 6);
    const h = 14 + ((i * 11 + seed) % 8);
    const floatOffset = Math.sin(now * 0.0008 + i * 1.3) * 2;
    const driftX = Math.sin(now * 0.0006 + i * 0.9) * 6;

    ctx.save();
    ctx.translate(x + driftX, sy + floatOffset);

    const glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, w * 2);
    glowGrad.addColorStop(0, `rgba(255, 150, 50, 0.15)`);
    glowGrad.addColorStop(1, `rgba(255, 150, 50, 0)`);
    ctx.fillStyle = glowGrad;
    ctx.fillRect(-w * 2, -w * 2, w * 4, w * 4);

    const bodyGrad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
    bodyGrad.addColorStop(0,    'rgba(255, 140, 20, 0.4)');
    bodyGrad.addColorStop(0.3,  'rgba(255, 200, 80, 0.8)');
    bodyGrad.addColorStop(0.7,  'rgba(255, 200, 80, 0.8)');
    bodyGrad.addColorStop(1,    'rgba(255, 140, 20, 0.4)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-w/2 + 1, -h);
    ctx.lineTo(w/2 - 1, -h);
    ctx.lineTo(w/2 + 1, 2);
    ctx.lineTo(-w/2 - 1, 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(255, 245, 200, 0.9)';
    ctx.fillRect(-1.5, -2, 3, 5);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(180, 100, 30, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-w/2 + 1, -h);
    ctx.lineTo(w/2 - 1, -h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w/2 - 1, 2);
    ctx.lineTo(w/2 + 1, 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 200, 100, 0.2)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, 6);
    ctx.stroke();

    ctx.restore();
  }
}

// ---------- massive cyan waterfalls (pixel art style) ----------
function drawBgWaterfalls(camTop, t) {
  const now = performance.now();

  for (const bwf of bgWaterfalls) {
    const sx = bwf.xFrac * COL_W;
    const w  = bwf.w;
    const visTop = -10;
    const visBot = HEIGHT + 10;
    const len    = visBot - visTop;

    const glowW = w * 4;
    const hGrad = ctx.createLinearGradient(sx - glowW*0.3, 0, sx + glowW*0.7, 0);
    hGrad.addColorStop(0,    'rgba(0, 180, 255, 0)');
    hGrad.addColorStop(0.3,  'rgba(30, 220, 255, 0.1)');
    hGrad.addColorStop(0.5,  'rgba(60, 240, 255, 0.2)');
    hGrad.addColorStop(0.7,  'rgba(30, 220, 255, 0.1)');
    hGrad.addColorStop(1,    'rgba(0, 180, 255, 0)');
    ctx.fillStyle = hGrad;
    ctx.fillRect(sx - glowW*0.3, visTop, glowW, len);

    ctx.fillStyle = 'rgba(80, 220, 255, 0.25)';
    ctx.fillRect(sx, visTop, w, len);
    
    ctx.fillStyle = 'rgba(200, 245, 255, 0.4)';
    ctx.fillRect(sx + w * 0.3, visTop, w * 0.4, len);

    const seed = (bwf.xFrac * 10000) | 0;
    const count = Math.max(12, Math.floor(w * 1.0));
    for (let i = 0; i < count; i++) {
      const xOff = ((i * 313 + seed) % (w - 4)) + 2;
      const speed = 0.6 + ((i * 7 + seed) % 12) / 10;
      const phase = ((i * 127 + seed * 3) % 300);
      let yPos = (now * 0.08 * speed + phase) % (len + 80) - 40;
      const length = 8 + ((i * 53 + seed) % 50);
      const alpha = 0.15 + ((i * 11 + seed) % 9) / 25;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(sx + xOff, yPos, 1.5, length);
    }

    const bandSpacing = 40;
    const speed = now * 0.08;
    const offset = speed % bandSpacing;
    ctx.fillStyle = 'rgba(220, 250, 255, 0.3)';
    for (let yy = visTop - bandSpacing + offset; yy < visBot; yy += bandSpacing) {
      ctx.fillRect(sx, yy, w, 3);
    }
    const slowOffset = (now * 0.03) % (bandSpacing * 1.5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let yy = visTop - bandSpacing * 1.5 + slowOffset; yy < visBot; yy += bandSpacing * 1.5) {
      ctx.fillRect(sx, yy, w, 6);
    }
  }
}

// ---------- glowing pool at valley floor ----------
function drawRiverGlow(groundScreenY) {
  if (groundScreenY < -60 || groundScreenY > HEIGHT + 200) return;
  const w  = 50;
  const sx = COL_W / 2 - w / 2;

  const bloom = ctx.createRadialGradient(COL_W / 2, groundScreenY, 0, COL_W / 2, groundScreenY, 100);
  bloom.addColorStop(0,   'rgba(30, 200, 255, 0.3)');
  bloom.addColorStop(0.6, 'rgba(30, 200, 255, 0.1)');
  bloom.addColorStop(1,   'rgba(30, 200, 255, 0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, groundScreenY - 50, COL_W, 180);
  
  const grad = ctx.createLinearGradient(0, groundScreenY, 0, groundScreenY + 150);
  grad.addColorStop(0,   'rgba(60, 230, 255, 0.5)');
  grad.addColorStop(0.5, 'rgba(30, 200, 255, 0.2)');
  grad.addColorStop(1,   'rgba(0, 180, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(sx, groundScreenY, w, 150);
}

// ---------- actual gameplay platforms (brick body + teal moss) ----------
function drawPlatform(x, topY, w, isGround, crystal) {
  const h = isGround ? 26 : PLATFORM_H;

  const bgrad = ctx.createLinearGradient(0, topY, 0, topY + h);
  bgrad.addColorStop(0, isGround ? '#261642' : '#1c103a');
  bgrad.addColorStop(1, isGround ? '#12092a' : '#0f0720');
  ctx.fillStyle = bgrad;
  ctx.fillRect(x, topY, w, h);

  ctx.strokeStyle = '#060310';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, topY + 1, w - 2, h - 2);

  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  for (let bx = 0; bx < w; bx += 14) {
    ctx.beginPath();
    ctx.moveTo(x + bx, topY + 4);
    ctx.lineTo(x + bx, topY + h);
    ctx.stroke();
  }

  ctx.fillStyle = '#2de8b0';
  ctx.shadowColor = '#2de8b0';
  ctx.shadowBlur = 12;
  ctx.fillRect(x, topY - 3, w, 5);
  ctx.shadowBlur = 0;
}

// ---------- player character sprite ----------
function drawCharacter(x, topY, color, glow, facing) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillRect(x, topY + 10, PLAYER_W, PLAYER_H - 10);
  ctx.fillStyle = '#f3d9b1'; // skin tone
  ctx.fillRect(x + 3, topY, PLAYER_W - 6, 12);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, topY - 2, PLAYER_W - 2, 6);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1a1330'; // eye
  const eyeX = facing >= 0 ? x + PLAYER_W - 8 : x + 4;
  ctx.fillRect(eyeX, topY + 5, 3, 3);
  ctx.restore();
}

// ============================================================
// 🆕 MULTIPLAYER FULL-SCREEN RENDERER
// Uses ALL your exact visual functions above.
// Call this from your multiplayer main.js instead of drawColumn.
// ============================================================
function drawFullGame(state, camY) {
  const t = performance.now() * 0.00022;

  // --- All your beautiful background layers (unchanged) ---
  drawCaveBg();
  drawStars(camY);
  drawPurpleDust(camY);
  drawCaveMist(camY, t);
  drawCaveWalls(camY);
  drawSkyLanterns(camY, t);
  drawBgWaterfalls(camY, t);

  // --- Ground ---
  const groundScreenY = GROUND_Y - camY;
  drawRiverGlow(groundScreenY);
  if (groundScreenY < window.HEIGHT + 60) {
    drawPlatform(0, groundScreenY, window.WIDTH, true);
  }

  // --- Platforms (from server state) ---
  for (const plat of state.pattern) {
    const sy = plat.y - camY;
    if (sy < -40 || sy > window.HEIGHT + 40) continue;
    const px = platformX(plat.frac);
    drawPlatform(px, sy, PLATFORM_W, false, plat.crystal);
  }

  // --- Both players ---
  const p1 = state.p1;
  const p2 = state.p2;
  if (p1) {
    drawCharacter(p1.x, (p1.y - PLAYER_H / 2) - camY, '#4fd6ff', '#2fb8e8', p1.facing);
  }
  if (p2) {
    drawCharacter(p2.x, (p2.y - PLAYER_H / 2) - camY, '#ff6fb0', '#e84f95', p2.facing);
  }
}