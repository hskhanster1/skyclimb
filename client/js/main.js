(function () {
  const canvas    = document.getElementById('game');
  const ctxLocal  = canvas.getContext('2d');
  const stage     = document.getElementById('stage');
  const startOverlay = document.getElementById('start-overlay');
  const startText    = document.getElementById('start-text');
  const score1El  = document.getElementById('score1');
  const score2El  = document.getElementById('score2');
  const timerEl   = document.getElementById('timer-display');
  const restartBtn = document.getElementById('restartBtn');
  const timerBtns  = document.querySelectorAll('.timer-btn');
  const timerSection = document.getElementById('timer-section');
  const controlsRow = document.getElementById('controls-row');
  const menuBtn = document.getElementById('menuBtn');

  const modeSelect   = document.getElementById('mode-select');
  const localModeBtn = document.getElementById('localModeBtn');
  const onlineModeBtn = document.getElementById('onlineModeBtn');
  const lobby     = document.getElementById('lobby');
  const roomInput = document.getElementById('roomInput');
  const connectBtn = document.getElementById('connectBtn');
  const statusEl  = document.getElementById('status');
  const roomStatusEl = document.getElementById('roomStatus');
  const localHints  = document.querySelectorAll('.local-only-hint');
  const onlineHints = document.querySelectorAll('.online-only-hint');

  window.ctx = ctxLocal;

  // 'local' or 'online' — set once the player picks a mode on the title screen
  let MODE = null;

  // ---------- sizing ----------
  window.WIDTH = 0; window.HEIGHT = 0; window.COL_W = 0;
  function resize() {
    const maxW = Math.min(window.innerWidth - 32, 920);
    const maxH = Math.min(window.innerHeight - 230, 640);
    window.WIDTH  = Math.max(480, Math.floor(maxW / 2) * 2);
    window.HEIGHT = Math.max(360, Math.floor(maxH));
    window.COL_W  = window.WIDTH / 2;
    canvas.width  = window.WIDTH;
    canvas.height = window.HEIGHT;
    stage.style.width  = window.WIDTH  + 'px';
    stage.style.height = window.HEIGHT + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- shared camera helper (used by both modes) ----------
  function updateCamera(camPrev, p) {
    const targetTop = (p.y + PLAYER_H / 2) - HEIGHT * 0.62;
    const clamped   = Math.min(targetTop, -HEIGHT * 0.62 + 40);
    return camPrev + (clamped - camPrev) * 0.12;
  }

  function drawDivider() {
    ctx.save();
    const dg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    dg.addColorStop(0,   'rgba(255,255,255,0)');
    dg.addColorStop(0.5, 'rgba(180,150,255,0.85)');
    dg.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.strokeStyle = dg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(COL_W, 0); ctx.lineTo(COL_W, HEIGHT); ctx.stroke();
    ctx.restore();
  }

  function setTimerHud(secondsLeft, duration) {
    if (duration > 0) {
      const secs = Math.ceil(Math.max(0, secondsLeft));
      timerEl.textContent = '⏱ ' + secs + 's';
      timerEl.style.color = secs <= 10 ? '#ff6060' : '#ffe27a';
    } else {
      timerEl.textContent = '⏱ ∞';
      timerEl.style.color = '#ffe27a';
    }
  }

  // ================================================================
  // MODE SELECT
  // ================================================================
  function goToMenu() {
    // Tear down whatever mode we were in and return to the title screen
    if (MODE === 'online' && socket) {
      socket.disconnect();
      socket = null;
    }
    netState = null;
    playerIndex = -1;
    myToken = null; // abandoning this session entirely — don't try to reconnect into it later
    gameActive = false;
    gameEnded = false;
    p1 = null; p2 = null;

    MODE = null;
    stage.classList.add('hidden');
    controlsRow.classList.add('hidden');
    lobby.classList.add('hidden');
    startOverlay.classList.add('hidden');
    roomStatusEl.classList.add('hidden');
    roomStatusEl.textContent = '';
    statusEl.textContent = '● Not connected';
    statusEl.style.color = '';
    modeSelect.classList.remove('hidden');
  }
  menuBtn.addEventListener('click', goToMenu);

  localModeBtn.addEventListener('click', () => {
    MODE = 'local';
    modeSelect.classList.add('hidden');
    lobby.classList.add('hidden');
    controlsRow.classList.remove('hidden');
    timerSection.classList.remove('hidden');
    stage.classList.remove('hidden');
    localHints.forEach(el => el.classList.remove('hidden'));
    onlineHints.forEach(el => el.classList.add('hidden'));
    startText.innerHTML = 'CLICK TO START<span>both players ready up on the same keyboard</span>';
    startOverlay.classList.remove('hidden');
    resize();
  });

  onlineModeBtn.addEventListener('click', () => {
    MODE = 'online';
    modeSelect.classList.add('hidden');
    lobby.classList.remove('hidden');
    controlsRow.classList.remove('hidden');
    timerSection.classList.remove('hidden'); // pick a duration before connecting
    stage.classList.remove('hidden');
    localHints.forEach(el => el.classList.add('hidden'));
    onlineHints.forEach(el => el.classList.remove('hidden'));
    startText.innerHTML = 'ENTER A ROOM CODE<span>and hit Connect — share the code with your opponent</span>';
    startOverlay.classList.remove('hidden');
    resize();
  });

  // ================================================================
  // LOCAL MODE
  // ================================================================
  let TIMER_DURATION = 60;        // local mode
  let ONLINE_TIMER_DURATION = 60; // online mode — only takes effect for whoever creates the room
  timerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timerBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const duration = parseInt(btn.dataset.duration, 10);
      if (MODE === 'local') {
        TIMER_DURATION = duration;
        restartLocal();
      } else if (MODE === 'online') {
        ONLINE_TIMER_DURATION = duration;
      }
    });
  });

  function syncTimerButtonUI(duration) {
    timerBtns.forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.duration, 10) === duration);
    });
  }

  let timeLeft   = TIMER_DURATION;
  let gameActive = false;
  let gameEnded  = false;
  let lastTime   = null;
  let p1, p2, cam1, cam2;

  window.held       = new Set();
  window.jumpQueued = { p1: false, p2: false };

  function restartLocal() {
    seedPattern();
    seedDecor();
    p1   = freshPlayer(); p2   = freshPlayer();
    cam1 = -HEIGHT * 0.62; cam2 = -HEIGHT * 0.62;
    timeLeft   = TIMER_DURATION;
    gameActive = true;
    gameEnded  = false;
    lastTime   = null;
    startOverlay.classList.add('hidden');
    stage.focus();
  }

  function showWinnerLocal() {
    const h1 = heightOf(p1), h2 = heightOf(p2);
    if (h1 > h2)      startText.innerHTML = '🏆 PLAYER 1 WINS!<span>Press R or click Restart</span>';
    else if (h2 > h1) startText.innerHTML = '🏆 PLAYER 2 WINS!<span>Press R or click Restart</span>';
    else              startText.innerHTML = '🤝 DRAW!<span>Press R or click Restart</span>';
    startOverlay.classList.remove('hidden');
  }

  // ================================================================
  // ONLINE MODE
  // ================================================================
  // The server runs its own physics in a fixed 400px-wide logical column
  // (see server/server.js: COL_W = 400). Our canvas column is however
  // wide the window resize made it, so incoming x positions need to be
  // rescaled into local pixel space before we draw them.
  const SERVER_COL_W = 400;

  let socket = null;
  let playerIndex = -1; // which slot the server assigned us: 0 or 1
  let myToken = null;   // reconnection token — lets us reclaim our slot after a drop
  let netState = null;
  let netCam1 = 0, netCam2 = 0;
  let onlineKeys = { left: false, right: false };
  let onlineJump = false;

  // Smoothed render positions for online mode. The server only sends a new
  // state ~60 times/sec over a real network with variable latency and
  // jitter — rendering the raw values directly makes movement look jerky
  // or briefly "teleport," which can look like falling through a platform
  // even though the server's own physics never actually got it wrong.
  // Lerping toward each new value instead of snapping to it smooths that
  // out. `null` means "snap immediately" (used right when a match starts).
  let smooth1 = null, smooth2 = null;
  const SMOOTH_FACTOR = 0.35;

  function sendInput() {
    if (socket && socket.connected && playerIndex !== -1) {
      socket.emit('input', { left: onlineKeys.left, right: onlineKeys.right, jump: onlineJump });
    }
  }

  function connectToServer() {
    if (socket) { socket.disconnect(); socket = null; }
    netState = null;
    playerIndex = -1;
    roomStatusEl.classList.add('hidden');
    roomStatusEl.textContent = '';

    const roomId = roomInput.value.trim() || 'race1';
    statusEl.textContent = '● Connecting...';
    statusEl.style.color = '#ffe27a';

    socket = io(); // same origin — server.js serves the client, so no URL needed

    socket.on('connect', () => {
      statusEl.textContent = '● Connected, joining...';
      statusEl.style.color = '#4fd6ff';
      // If we have a token from a previous slot in this room, the server
      // will use it to reclaim that slot if we're still within the grace
      // period; otherwise it's ignored and we join fresh. timerDuration is
      // only honored if we're the one creating the room — see server.js.
      socket.emit('join', { roomId, token: myToken, timerDuration: ONLINE_TIMER_DURATION });
    });

    socket.on('assigned', ({ player, token, timerDuration }) => {
      playerIndex = player;
      myToken = token;
      if (typeof timerDuration === 'number') {
        ONLINE_TIMER_DURATION = timerDuration; // reflect the room's actual setting
        syncTimerButtonUI(timerDuration);       // e.g. if the other player already set 30s
      }
      statusEl.textContent = `● You are Player ${player + 1}`;
      statusEl.style.color = '#2de8b0';
      startText.innerHTML = `WAITING FOR PLAYER ${player === 0 ? 2 : 1}...`;
    });

    socket.on('roomStatus', ({ p1Connected, p2Connected }) => {
      roomStatusEl.classList.remove('hidden');
      roomStatusEl.textContent = `P1: ${p1Connected ? '✅' : '⏳'}  P2: ${p2Connected ? '✅' : '⏳'}`;
    });

    socket.on('opponentPaused', ({ player, graceSeconds }) => {
      startText.innerHTML = `⏸ PLAYER ${player + 1}'S CONNECTION DROPPED<span>Waiting up to ${graceSeconds}s for them to reconnect...</span>`;
      startOverlay.classList.remove('hidden');
    });

    socket.on('opponentReconnected', () => {
      startOverlay.classList.add('hidden');
      stage.focus();
    });

    socket.on('opponentLeft', ({ player }) => {
      netState = null;
      startText.innerHTML = `⚠ PLAYER ${player + 1} DISCONNECTED<span>Click Restart or Connect to start a new match</span>`;
      startOverlay.classList.remove('hidden');
    });

    socket.on('gameStart', () => {
      startOverlay.classList.add('hidden');
      netCam1 = -HEIGHT * 0.62; netCam2 = -HEIGHT * 0.62;
      smooth1 = null; smooth2 = null; // snap to correct position on the first frame of the new match
      stage.focus();
    });

    socket.on('state', (state) => {
      netState = state;
      if (state.gameEnded) showWinnerOnline(state);
    });

    socket.on('error', (msg) => {
      statusEl.textContent = '✖ ' + msg;
      statusEl.style.color = '#ff6fb0';
      alert(msg);
    });

    socket.on('disconnect', () => {
      statusEl.textContent = '✖ Disconnected';
      statusEl.style.color = '#ff6fb0';
      startOverlay.classList.remove('hidden');
      startText.innerHTML = 'DISCONNECTED<span>Click Restart to reconnect</span>';
    });
  }

  function showWinnerOnline(state) {
    if (state.winner === 0)      startText.innerHTML = '🏆 PLAYER 1 WINS!<span>Click Restart to rematch</span>';
    else if (state.winner === 1) startText.innerHTML = '🏆 PLAYER 2 WINS!<span>Click Restart to rematch</span>';
    else                          startText.innerHTML = '🤝 DRAW!<span>Click Restart to rematch</span>';
    startOverlay.classList.remove('hidden');
  }

  connectBtn.addEventListener('click', connectToServer);
  roomInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') connectToServer(); });

  // ================================================================
  // SHARED INPUT / RESTART
  // ================================================================
  startOverlay.addEventListener('click', () => {
    stage.focus();
    if (MODE === 'local' && !gameActive) restartLocal();
  });
  stage.addEventListener('click', () => stage.focus());

  restartBtn.addEventListener('click', () => {
    if (MODE === 'local') restartLocal();
    else if (MODE === 'online') connectToServer();
  });

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['a', 'd', 'w', 'arrowleft', 'arrowright', 'arrowup', ' '].includes(k)) e.preventDefault();

    if (k === 'r' && !e.repeat) {
      if (MODE === 'local') restartLocal();
      else if (MODE === 'online') connectToServer();
      return;
    }

    if (MODE === 'local') {
      held.add(k);
      if (k === KEYMAP.p1.jump && !e.repeat) jumpQueued.p1 = true;
      if (k === KEYMAP.p2.jump && !e.repeat) jumpQueued.p2 = true;
    } else if (MODE === 'online') {
      if (k === 'a' || k === 'arrowleft') onlineKeys.left = true;
      if (k === 'd' || k === 'arrowright') onlineKeys.right = true;
      if (k === 'w' || k === 'arrowup') onlineJump = true;
      sendInput();
    }
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (MODE === 'local') {
      held.delete(k);
    } else if (MODE === 'online') {
      if (k === 'a' || k === 'arrowleft') onlineKeys.left = false;
      if (k === 'd' || k === 'arrowright') onlineKeys.right = false;
      if (k === 'w' || k === 'arrowup') onlineJump = false;
      sendInput();
    }
  });

  // ================================================================
  // MAIN LOOP
  // ================================================================
  function frame(ts) {
    if (MODE === 'local' && p1) {
      if (gameActive && !gameEnded) {
        if (lastTime !== null && TIMER_DURATION > 0) {
          const dt = Math.min((ts - lastTime) / 1000, 0.1);
          timeLeft -= dt;
          if (timeLeft <= 0) {
            timeLeft = 0;
            gameEnded = true;
            gameActive = false;
            showWinnerLocal();
          }
        }
        lastTime = ts;
      }

      if (gameActive) {
        updatePlayer(p1, KEYMAP.p1);
        updatePlayer(p2, KEYMAP.p2);
        jumpQueued.p1 = false;
        jumpQueued.p2 = false;
        ensurePatternAbove(Math.min(p1.y, p2.y) - HEIGHT);
        cam1 = updateCamera(cam1, p1);
        cam2 = updateCamera(cam2, p2);
      }

      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      drawColumn(0,     cam1, p1, '#4fd6ff', '#2fb8e8');
      drawColumn(COL_W, cam2, p2, '#ff6fb0', '#e84f95');
      drawDivider();

      score1El.textContent = heightOf(p1) + 'm';
      score2El.textContent = heightOf(p2) + 'm';
      setTimerHud(timeLeft, TIMER_DURATION);

    } else if (MODE === 'online' && netState) {
      const scaleX = (COL_W - PLAYER_W) / (SERVER_COL_W - PLAYER_W);
      const target1 = { x: netState.p1.x * scaleX, y: netState.p1.y, facing: netState.p1.facing };
      const target2 = { x: netState.p2.x * scaleX, y: netState.p2.y, facing: netState.p2.facing };

      if (!smooth1) smooth1 = { ...target1 };
      if (!smooth2) smooth2 = { ...target2 };
      smooth1.x += (target1.x - smooth1.x) * SMOOTH_FACTOR;
      smooth1.y += (target1.y - smooth1.y) * SMOOTH_FACTOR;
      smooth1.facing = target1.facing; // no need to smooth a direction flip
      smooth2.x += (target2.x - smooth2.x) * SMOOTH_FACTOR;
      smooth2.y += (target2.y - smooth2.y) * SMOOTH_FACTOR;
      smooth2.facing = target2.facing;

      pattern = netState.pattern; // world.js's shared `pattern` var — drawColumn reads it directly

      netCam1 = updateCamera(netCam1, smooth1);
      netCam2 = updateCamera(netCam2, smooth2);

      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      drawColumn(0,     netCam1, smooth1, '#4fd6ff', '#2fb8e8');
      drawColumn(COL_W, netCam2, smooth2, '#ff6fb0', '#e84f95');
      drawDivider();

      score1El.textContent = netState.p1.height + 'm';
      score2El.textContent = netState.p2.height + 'm';
      setTimerHud(netState.timeLeft, netState.timerDuration);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
