// ============================================================
// Gameplay platforms — identical pattern feeds both columns,
// so neither player ever gets an easier/harder climb than the other.
// ============================================================
let pattern = [];

function seedPattern() {
  pattern = [];
  let prevFrac = 0.5;
  let y = 0;
  for (let i = 0; i < 6; i++) {
    const dy = 58 + Math.random() * 50;
    y -= dy;
    prevFrac = clamp(prevFrac + (Math.random() - 0.5) * 0.85, 0.1, 0.9);
    pattern.push({ y, frac: prevFrac, crystal: Math.random() < 0.2 });
  }
}

function ensurePatternAbove(targetY) {
  while (pattern[pattern.length - 1].y > targetY) {
    const last = pattern[pattern.length - 1];
    const dy = 58 + Math.random() * 50;
    const y = last.y - dy;
    const frac = clamp(last.frac + (Math.random() - 0.5) * 0.85, 0.1, 0.9);
    pattern.push({ y, frac, crystal: Math.random() < 0.2 });
  }
}

function platformX(frac) { return frac * (COL_W - PLATFORM_W); }

// ============================================================
// Decorative background — none of this is collidable.
// Cave vibe: deep purple, large bg waterfalls, crystal sparkles.
// ============================================================
let stars = [];
let cloudPuffs = [];
let islandTemplate = [];
let bgWaterfalls = [];   // large non-gameplay waterfall columns in the bg

function seedDecor() {
  // pixel sparkles — cyan and lavender to match cave palette
  stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      xFrac:  Math.random(),
      yFrac:  Math.random() * 1400,
      size:   Math.random() < 0.12 ? 2.4 : Math.random() < 0.4 ? 1.6 : 1,
      phase:  Math.random() * Math.PI * 2,
      spark:  Math.random() < 0.15
    });
  }

  // deep purple / indigo mist blobs replacing old pink clouds
  cloudPuffs = [];
  for (let i = 0; i < 12; i++) {
    const hueRoll = Math.random();
    cloudPuffs.push({
      xFrac: Math.random(),
      dy:    Math.random() * CLOUD_TILE,
      w:     110 + Math.random() * 180,
      h:     35  + Math.random() * 30,
      hue:   hueRoll < 0.4
               ? 'rgba(140,60,220,0.30)'
               : hueRoll < 0.7
                 ? 'rgba(100,40,190,0.25)'
                 : 'rgba(60,120,220,0.20)'
    });
  }

  // small background floating stone islands
  islandTemplate = [];
  for (let i = 0; i < 5; i++) {
    islandTemplate.push({
      xFrac: Math.random() < 0.5
               ? 0.05 + Math.random() * 0.22
               : 0.73 + Math.random() * 0.22,
      dy:   Math.random() * ISLAND_TILE,
      w:    28 + Math.random() * 28,
      drip: Math.random() < 0.75
    });
  }

  // large background waterfall columns — wide, dramatic, always full-height
  // reference has: 1 wide central fall + 2 thinner flanking falls
  bgWaterfalls = [
    { xFrac: 0.42, w: 22 },   // centre-left — widest
    { xFrac: 0.55, w: 18 },   // centre-right
    { xFrac: 0.12, w: 11 },   // left flank
    { xFrac: 0.82, w: 11 },   // right flank
  ];
}

// jagged cave-wall silhouette depth — chunkier rocks than before
function wallDepth(worldY, seedOffset) {
  return 24
    + 16 * Math.sin(worldY * 0.009 + seedOffset)
    +  9 * Math.sin(worldY * 0.024 + seedOffset * 1.7)
    +  4 * Math.sin(worldY * 0.061 + seedOffset * 0.8);
}
