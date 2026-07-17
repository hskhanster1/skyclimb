const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Server } = require('socket.io');
const cors = require('cors');

// ---------------------------------------------------------------
// Config (Risk Register R5) — origin defaults to '*' for local dev;
// set ALLOWED_ORIGIN at deploy time (Phase 11) to lock this down.
// ---------------------------------------------------------------
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const RECONNECT_GRACE_MS = 15000; // R3 — window to reclaim a slot after a drop
const JOIN_TIMEOUT_MS = 20000;    // R10 — disconnect sockets that never join
const ROOM_ID_REGEX = /^[A-Za-z0-9_-]{1,32}$/; // R6

const app = express();
app.disable('x-powered-by'); // R9 — don't advertise the framework in headers
app.use(cors({ origin: ALLOWED_ORIGIN }));

// Serve the client files (index.html, css/, js/) from the same server that
// runs socket.io, so the page can be opened at http://localhost:3000 (or
// wherever this is hosted) and `io()` "just works" with no hardcoded URL.
app.use(express.static(path.join(__dirname, '..', 'client')));

// R9 — generic error handler so an unhandled exception on an HTTP route
// never leaks a stack trace, regardless of NODE_ENV.
app.use((err, req, res, next) => {
  console.error('[http error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ALLOWED_ORIGIN } });

// ---------------------------------------------------------------
// R8 — lightweight structured logging. Not a full audit trail, but
// survives a process restart, which console.log alone doesn't.
// ---------------------------------------------------------------
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'events.log');
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) { /* ignore */ }

function logEvent(type, data) {
  const entry = { ts: new Date().toISOString(), type, ...data };
  console.log(`[${entry.ts}] ${type}`, data);
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error('Failed to write log:', e.message);
  }
}

// ---------------------------------------------------------------
// R2 — simple per-socket rate limiting (fixed window)
// ---------------------------------------------------------------
function makeLimiter(maxEvents, windowMs) {
  return function isRateLimited(state) {
    const now = Date.now();
    if (!state.windowStart || now - state.windowStart > windowMs) {
      state.windowStart = now;
      state.count = 0;
    }
    state.count += 1;
    return state.count > maxEvents;
  };
}
const inputRateLimited = makeLimiter(40, 1000);  // generous headroom above real keyboard rates
const joinRateLimited  = makeLimiter(5, 10000);

// ---------- Game Constants (copied from your client) ----------
const PLAYER_W = 24, PLAYER_H = 32;
const PLATFORM_W = 62, PLATFORM_H = 14;
const GRAVITY = 0.55;
const JUMP_V = -11.6;
const MOVE_ACC = 0.65;
const MOVE_MAX = 4.3;
const FRICTION = 0.84;
const GROUND_Y = 0;
const COL_W = 400; // fixed logical width (your client will scale this)

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function platformX(frac) { return frac * (COL_W - PLATFORM_W); }

// ---------- Player Factory ----------
function freshPlayer() {
  return {
    x: COL_W / 2 - PLAYER_W / 2,
    y: GROUND_Y - PLAYER_H / 2,
    vx: 0, vy: 0,
    onGround: true,
    facing: 1,
    height: 0,
  };
}

// ---------- Platform Generation (from world.js) ----------
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
seedPattern();

// ---------- Physics Update (from player.js) ----------
function updatePlayer(p, keys, jumpQueued) {
  const moveLeft = keys.left;
  const moveRight = keys.right;

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
    if (prevFootY <= GROUND_Y && newFootY >= GROUND_Y) {
      p.y = GROUND_Y - PLAYER_H / 2;
      p.vy = 0;
      p.onGround = true;
    } else {
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

  if (p.onGround && jumpQueued) {
    p.vy = JUMP_V;
    p.onGround = false;
  }

  // Calculate height
  p.height = Math.max(0, Math.round((GROUND_Y - (p.y + PLAYER_H / 2)) / 9));
}

// ---------- Game State ----------
const rooms = {};

const VALID_TIMER_DURATIONS = [0, 30, 60]; // 0 = unlimited

function getRoom(roomId, requestedDuration) {
  if (!rooms[roomId]) {
    const duration = VALID_TIMER_DURATIONS.includes(requestedDuration) ? requestedDuration : 60;
    rooms[roomId] = {
      players: [null, null], // index 0 = P1, index 1 = P2
      tokens: [null, null],  // R3 — per-slot reconnection secret
      pendingDisconnect: [null, null], // R3 — grace-period timers
      keys: [{ left: false, right: false }, { left: false, right: false }],
      jumpQueued: [false, false],
      timeLeft: duration,
      timerDuration: duration, // set once by whoever creates the room; later joiners can't change it mid-match
      gameActive: false,
      gameEnded: false,
      pattern: [],
      winner: null,
    };
    // Each room gets its own freshly-randomized starting pattern — reseed
    // the shared generator (fresh Math.random() calls) rather than reusing
    // whatever was seeded once at server startup, which was previously
    // being copied identically into every room (every online match had the
    // same initial ~40-70m layout as a result).
    seedPattern();
    rooms[roomId].pattern = JSON.parse(JSON.stringify(pattern));
  }
  return rooms[roomId];
}

function broadcastRoomStatus(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  io.to(roomId).emit('roomStatus', {
    p1Connected: room.players[0] !== null,
    p2Connected: room.players[1] !== null,
  });
}

function maybeCleanupRoom(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const nobodyPresent = room.players[0] === null && room.players[1] === null;
  const nobodyPending = !room.pendingDisconnect[0] && !room.pendingDisconnect[1];
  if (nobodyPresent && nobodyPending) {
    delete rooms[roomId]; // Risk Register R1
  }
}

// ---------- Server Game Loop (60hz) ----------
setInterval(() => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (!room.gameActive) continue; // paused (reconnect grace) or already fully ended

    // 1. Timer
    let justEnded = false;
    if (room.timerDuration !== 0) {
      room.timeLeft -= 1 / 60;
      if (room.timeLeft <= 0) {
        room.timeLeft = 0;
        room.gameActive = false;
        room.gameEnded = true;
        justEnded = true;
        // Determine winner
        const p1e = room.players[0];
        const p2e = room.players[1];
        if (p1e && p2e) {
          if (p1e.height > p2e.height) room.winner = 0;
          else if (p2e.height > p1e.height) room.winner = 1;
          else room.winner = -1; // draw
        }
        logEvent('match_ended', { roomId, winner: room.winner, reason: 'timer' });
      }
    }

    // 2. Physics for both players (skipped on the tick the match just ended)
    const p1 = room.players[0];
    const p2 = room.players[1];
    if (!p1 || !p2) continue;

    if (!justEnded) {
      // Ensure platforms generate above
      const minY = Math.min(p1.y, p2.y);
      if (room.pattern.length > 0) {
        while (room.pattern[room.pattern.length - 1].y > minY - 600) {
          const last = room.pattern[room.pattern.length - 1];
          const dy = 58 + Math.random() * 50;
          const y = last.y - dy;
          const frac = clamp(last.frac + (Math.random() - 0.5) * 0.85, 0.1, 0.9);
          room.pattern.push({ y, frac, crystal: Math.random() < 0.2 });
        }
      }

      // Update P1
      updatePlayer(p1, room.keys[0], room.jumpQueued[0]);
      room.jumpQueued[0] = false;

      // Update P2
      updatePlayer(p2, room.keys[1], room.jumpQueued[1]);
      room.jumpQueued[1] = false;
    }

    // 3. Broadcast state to room — this now ALSO fires on the tick the
    // match just ended, which is the one that was previously being skipped
    io.to(roomId).emit('state', {
      p1: { x: p1.x, y: p1.y, facing: p1.facing, height: p1.height },
      p2: { x: p2.x, y: p2.y, facing: p2.facing, height: p2.height },
      pattern: room.pattern,
      timeLeft: room.timeLeft,
      timerDuration: room.timerDuration,
      gameActive: room.gameActive,
      gameEnded: room.gameEnded,
      winner: room.winner,
    });
  }
}, 1000 / 60);

// ---------- Socket.IO Connection ----------
io.on('connection', (socket) => {
  logEvent('connected', { socketId: socket.id });
  let currentRoom = null;
  let playerIndex = -1;
  let hasJoined = false;

  // R10 — a socket that never joins a room shouldn't hold a connection open forever
  const joinTimeoutHandle = setTimeout(() => {
    if (!hasJoined) {
      logEvent('join_timeout_disconnect', { socketId: socket.id });
      socket.disconnect(true);
    }
  }, JOIN_TIMEOUT_MS);

  socket.on('join', (payload) => {
   try {
    const { roomId, token } = payload || {};

    // R2 — rate limit join attempts per socket
    if (joinRateLimited(socket._joinRate || (socket._joinRate = {}))) {
      socket.emit('error', 'Too many join attempts — please slow down');
      return;
    }

    // R6 — validate roomId shape before using it as a key/room name
    if (typeof roomId !== 'string' || !ROOM_ID_REGEX.test(roomId)) {
      socket.emit('error', 'Invalid room code (letters, numbers, - and _ only, max 32 chars)');
      return;
    }

    // SD-003 — a socket that calls join() again without disconnecting from
    // its previous room must not leave a ghost slot occupied there forever
    // (this silently bypassed the R1 room-cleanup fix). Free the old slot
    // first, exactly as if it had disconnected from that room.
    if (currentRoom && currentRoom !== roomId && playerIndex !== -1) {
      const oldRoom = rooms[currentRoom];
      if (oldRoom) {
        const oldIdx = playerIndex;
        oldRoom.players[oldIdx] = null;
        oldRoom.tokens[oldIdx] = null;
        oldRoom.keys[oldIdx] = { left: false, right: false };
        oldRoom.jumpQueued[oldIdx] = false;
        socket.leave(currentRoom);
        broadcastRoomStatus(currentRoom);
        maybeCleanupRoom(currentRoom);
        logEvent('left_room_for_rejoin', { oldRoomId: currentRoom, player: oldIdx, socketId: socket.id });
      }
      currentRoom = null;
      playerIndex = -1;
    }

    const room = getRoom(roomId, payload && payload.timerDuration);

    // R3 — attempt to reclaim a slot within the reconnection grace period
    if (typeof token === 'string') {
      for (let i = 0; i < 2; i++) {
        if (room.tokens[i] === token && room.pendingDisconnect[i]) {
          clearTimeout(room.pendingDisconnect[i].timeoutHandle);
          room.pendingDisconnect[i] = null;
          currentRoom = roomId;
          playerIndex = i;
          hasJoined = true;
          clearTimeout(joinTimeoutHandle);

          socket.join(roomId);
          socket.emit('assigned', { player: i, token, timerDuration: room.timerDuration });
          logEvent('reconnected', { roomId, player: i, socketId: socket.id });

          if (room.players[0] !== null && room.players[1] !== null) {
            room.gameActive = true; // resume — position/score are untouched
            io.to(roomId).emit('opponentReconnected', { player: i });
          }
          broadcastRoomStatus(roomId);
          return;
        }
      }
    }

    // Normal fresh join — assign the next free slot
    let idx;
    if (room.players[0] === null) idx = 0;
    else if (room.players[1] === null) idx = 1;
    else {
      socket.emit('error', 'Room full');
      return;
    }

    currentRoom = roomId;
    playerIndex = idx;
    hasJoined = true;
    clearTimeout(joinTimeoutHandle);

    const newToken = crypto.randomBytes(16).toString('hex');
    room.players[idx] = freshPlayer();
    room.tokens[idx] = newToken;
    room.keys[idx] = { left: false, right: false };
    room.jumpQueued[idx] = false;

    socket.join(roomId);
    socket.emit('assigned', { player: idx, token: newToken, timerDuration: room.timerDuration });
    logEvent('joined', { roomId, player: idx, socketId: socket.id });
    broadcastRoomStatus(roomId);

    // If both players are present, start the game
    if (room.players[0] !== null && room.players[1] !== null) {
      room.gameActive = true;
      room.gameEnded = false;
      room.timeLeft = room.timerDuration || 60;
      room.winner = null;
      io.to(roomId).emit('gameStart');
      logEvent('match_started', { roomId });
    }
   } catch (err) {
     // Defense-in-depth (SD-002): one malformed packet must never take down
     // the process for every other player in every other room.
     console.error('[join handler error]', err);
     logEvent('handler_error', { event: 'join', socketId: socket.id, error: err.message });
     socket.emit('error', 'Invalid request');
   }
  });

  // Input handling
  socket.on('input', (payload) => {
   try {
    if (playerIndex === -1 || !currentRoom) return;

    // R2 — rate limit input events per socket
    if (inputRateLimited(socket._inputRate || (socket._inputRate = {}))) return;

    const room = getRoom(currentRoom);
    if (!room.gameActive) return;

    // R4 — coerce to booleans rather than trusting the payload's shape
    const left = (payload && payload.left) === true;
    const right = (payload && payload.right) === true;
    const jump = (payload && payload.jump) === true;

    room.keys[playerIndex].left = left;
    room.keys[playerIndex].right = right;
    if (jump) room.jumpQueued[playerIndex] = true;
   } catch (err) {
     console.error('[input handler error]', err);
     logEvent('handler_error', { event: 'input', socketId: socket.id, error: err.message });
   }
  });

  socket.on('disconnect', () => {
   try {
    clearTimeout(joinTimeoutHandle);
    logEvent('disconnected', { socketId: socket.id, roomId: currentRoom, player: playerIndex });

    if (playerIndex !== -1 && currentRoom) {
      const room = getRoom(currentRoom);
      const wasActive = room.gameActive;
      const idx = playerIndex;

      if (wasActive) {
        // R3 — give the player a grace period to reconnect before treating
        // this as a real departure. Position/score are left untouched.
        room.gameActive = false;
        io.to(currentRoom).emit('opponentPaused', {
          player: idx,
          graceSeconds: Math.round(RECONNECT_GRACE_MS / 1000),
        });

        room.pendingDisconnect[idx] = {
          timeoutHandle: setTimeout(() => {
            room.players[idx] = null;
            room.tokens[idx] = null;
            room.pendingDisconnect[idx] = null;
            room.gameEnded = true;
            io.to(currentRoom).emit('opponentLeft', { player: idx });
            logEvent('opponent_left_final', { roomId: currentRoom, player: idx });
            broadcastRoomStatus(currentRoom);
            maybeCleanupRoom(currentRoom);
          }, RECONNECT_GRACE_MS),
        };
      } else {
        // Wasn't mid-match (e.g. still in the lobby) — free the slot now
        room.players[idx] = null;
        room.tokens[idx] = null;
        room.keys[idx] = { left: false, right: false };
        room.jumpQueued[idx] = false;
        broadcastRoomStatus(currentRoom);
        maybeCleanupRoom(currentRoom);
      }
    }
   } catch (err) {
     console.error('[disconnect handler error]', err);
     logEvent('handler_error', { event: 'disconnect', socketId: socket.id, error: err.message });
   }
  });
});

// SD-002 — last-resort safety net. Per-handler try/catch above is the real
// fix; this exists purely so an unforeseen exception type logs loudly and
// the process keeps serving other rooms, instead of one bad packet from one
// player silently ending the match for everyone on the server.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException — process kept alive]', err);
  try {
    logEvent('uncaught_exception', { error: err.message, stack: err.stack });
  } catch (logErr) {
    console.error('Failed to log uncaught exception:', logErr.message);
  }
});

const PORT = process.env.PORT || 3000; // Render/Railway/Fly.io assign this dynamically
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
