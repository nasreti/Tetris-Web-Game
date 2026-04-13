const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const LINE_GOAL_40 = 40;
const BLITZ_MS = 120000;
const SPRINT_DROP_MS = 520;
const BLITZ_BASE_DROP_MS = 700;

const COLORS = {
  I: "#00d7ff",
  O: "#ffd700",
  T: "#b159ff",
  S: "#50f27d",
  Z: "#ff4e4e",
  J: "#4d79ff",
  L: "#ffa043"
};

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ]
};

const MODE_INFO = {
  lines40: {
    title: "40 Lines",
    desc: "Clear 40 lines as fast as you can. The timer starts when the round begins.",
    tag: "SPRINT",
    label: "40 Lines"
  },
  blitz: {
    title: "Blitz",
    desc: "Two minutes on the clock — score as high as you can before time runs out.",
    tag: "BLITZ",
    label: "Blitz"
  },
  endless: {
    title: "Endless",
    desc: "Classic Tetris: level increases as you clear lines. Survive as long as you can.",
    tag: "ENDLESS",
    label: "Endless"
  }
};

const boardCanvas = document.getElementById("board");
const ctx = boardCanvas.getContext("2d");
ctx.scale(BLOCK_SIZE, BLOCK_SIZE);

const holdCanvas = document.getElementById("holdCanvas");
const holdCtx = holdCanvas.getContext("2d");

const usernameModal = document.getElementById("usernameModal");
const usernameForm = document.getElementById("usernameForm");
const usernameInput = document.getElementById("usernameInput");
const menuScreen = document.getElementById("menuScreen");
const gameScreen = document.getElementById("gameScreen");
const playButton = document.getElementById("playButton");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const backFromMenuBtn = document.getElementById("backFromMenuBtn");
const playerName = document.getElementById("playerName");
const menuUsername = document.getElementById("menuUsername");
const menuClock = document.getElementById("menuClock");
const gameModeLabel = document.getElementById("gameModeLabel");
const nextQueueEl = document.getElementById("nextQueue");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownText = document.getElementById("countdownText");
const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultBody = document.getElementById("resultBody");
const resultOk = document.getElementById("resultOk");

const statPieces = document.getElementById("statPieces");
const statPps = document.getElementById("statPps");
const statLines = document.getElementById("statLines");
const linesGoal = document.getElementById("linesGoal");
const statTime = document.getElementById("statTime");
const timeLabel = document.getElementById("timeLabel");
const linesLabel = document.getElementById("linesLabel");
const statScore = document.getElementById("statScore");
const statLevel = document.getElementById("statLevel");
const detailTitle = document.getElementById("detailTitle");
const detailDesc = document.getElementById("detailDesc");
const detailTag = document.getElementById("detailTag");
const leaderboardList = document.getElementById("leaderboardList");

const endlessStatBlocks = document.querySelectorAll(".endless-only");

let username = "";
let selectedMode = "lines40";
let board = createMatrix(COLS, ROWS);
let currentPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let piecesPlaced = 0;
let dropCounter = 0;
let dropInterval = SPRINT_DROP_MS;
let lastTime = 0;
let gameRunning = false;
let paused = false;
let countingDown = false;
let gameStartPerf = 0;
let blitzEndPerf = 0;
let holdType = null;
let holdUsed = false;
let pieceBag = [];
let previewTypes = [];

let keysDown = { down: false };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function refillBag() {
  pieceBag = shuffle(["I", "O", "T", "S", "Z", "J", "L"]);
}

function takeFromBag() {
  if (pieceBag.length === 0) refillBag();
  return pieceBag.pop();
}

function createMatrix(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(0));
}

function rotate(matrix) {
  return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
}

function createPiece(type) {
  return {
    type,
    shape: SHAPES[type].map((row) => [...row]),
    x: Math.floor(COLS / 2) - 2,
    y: 0
  };
}

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + amt);
  const g = Math.min(255, ((n >> 8) & 255) + amt);
  const b = Math.min(255, (n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

function darken(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - amt);
  const g = Math.max(0, ((n >> 8) & 255) - amt);
  const b = Math.max(0, (n & 255) - amt);
  return `rgb(${r},${g},${b})`;
}

/** Draw one cell in board space (unit coords), with bevel */
function drawBeveledCell(cx, x, y, baseHex, opts = {}) {
  const { ghost = false, alpha = 1 } = opts;
  const pad = 0.04;
  const x0 = x + pad;
  const y0 = y + pad;
  const w = 1 - pad * 2;
  const h = 1 - pad * 2;

  cx.save();
  cx.globalAlpha = alpha;

  if (ghost) {
    cx.strokeStyle = "rgba(255,255,255,0.6)";
    cx.lineWidth = 0.07;
    cx.strokeRect(x0, y0, w, h);
    cx.restore();
    return;
  }

  const top = lighten(baseHex, 45);
  const bot = darken(baseHex, 35);
  const g = cx.createLinearGradient(x0, y0, x0 + w, y0 + h);
  g.addColorStop(0, top);
  g.addColorStop(0.45, baseHex);
  g.addColorStop(1, bot);
  cx.fillStyle = g;
  cx.fillRect(x0, y0, w, h);

  cx.strokeStyle = "rgba(0,0,0,0.35)";
  cx.lineWidth = 0.04;
  cx.strokeRect(x0, y0, w, h);

  cx.fillStyle = "rgba(255,255,255,0.12)";
  cx.fillRect(x0, y0, w, h * 0.22);
  cx.fillStyle = "rgba(0,0,0,0.18)";
  cx.fillRect(x0, y0 + h * 0.72, w, h * 0.28);

  cx.restore();
}

function drawGridLines(cx) {
  cx.strokeStyle = "rgba(255,255,255,0.08)";
  cx.lineWidth = 0.02;
  for (let x = 0; x <= COLS; x += 1) {
    cx.beginPath();
    cx.moveTo(x, 0);
    cx.lineTo(x, ROWS);
    cx.stroke();
  }
  for (let y = 0; y <= ROWS; y += 1) {
    cx.beginPath();
    cx.moveTo(0, y);
    cx.lineTo(COLS, y);
    cx.stroke();
  }
}

function getGhostY(piece) {
  const test = {
    ...piece,
    shape: piece.shape.map((r) => [...r]),
    x: piece.x,
    y: piece.y
  };
  while (!collides(test)) {
    test.y += 1;
  }
  test.y -= 1;
  return test.y;
}

function drawBoard() {
  ctx.clearRect(0, 0, COLS, ROWS);
  ctx.fillStyle = "rgba(5, 8, 18, 0.35)";
  ctx.fillRect(0, 0, COLS, ROWS);
  drawGridLines(ctx);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const cell = board[y][x];
      if (cell) {
        drawBeveledCell(ctx, x, y, COLORS[cell]);
      }
    }
  }

  if (currentPiece && gameRunning) {
    const gy = getGhostY(currentPiece);
    const ghostPiece = { ...currentPiece, y: gy };
    ghostPiece.shape.forEach((row, dy) => {
      row.forEach((v, dx) => {
        if (v) drawBeveledCell(ctx, ghostPiece.x + dx, ghostPiece.y + dy, COLORS[ghostPiece.type], { ghost: true });
      });
    });
  }

  if (currentPiece) {
    currentPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawBeveledCell(ctx, currentPiece.x + x, currentPiece.y + y, COLORS[currentPiece.type]);
        }
      });
    });
  }
}

function collides(piece) {
  return piece.shape.some((row, y) =>
    row.some((value, x) => {
      if (!value) return false;
      const boardX = piece.x + x;
      const boardY = piece.y + y;
      return (
        boardX < 0 ||
        boardX >= COLS ||
        boardY >= ROWS ||
        (boardY >= 0 && board[boardY][boardX] !== 0)
      );
    })
  );
}

function mergePiece() {
  currentPiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        board[currentPiece.y + y][currentPiece.x + x] = currentPiece.type;
      }
    });
  });
  piecesPlaced += 1;
}

function clearLines() {
  let cleared = 0;
  outer: for (let y = ROWS - 1; y >= 0; y -= 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!board[y][x]) {
        continue outer;
      }
    }
    board.splice(y, 1);
    board.unshift(Array(COLS).fill(0));
    cleared += 1;
    y += 1;
  }

  if (cleared > 0) {
    if (selectedMode === "endless" || selectedMode === "blitz") {
      const scoring = [0, 100, 300, 500, 800];
      score += scoring[cleared] * level;
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(120, BLITZ_BASE_DROP_MS - (level - 1) * 55);
    } else {
      lines += cleared;
    }
    updateHud();
    checkWinLose();
  }
}

function checkWinLose() {
  if (!gameRunning) return;
  if (selectedMode === "lines40" && lines >= LINE_GOAL_40) {
    endGameWin40();
  }
}

function endGameWin40() {
  gameRunning = false;
  const elapsed = performance.now() - gameStartPerf;
  saveBestTime(username, elapsed);
  showResult("40 Lines clear!", `Time: ${formatTimeMs(elapsed)}`);
}

function endGameBlitzTime() {
  gameRunning = false;
  saveBestBlitz(username, score);
  showResult("Time's up!", `Final score: ${score.toLocaleString()}`);
}

function endGameOver() {
  gameRunning = false;
  if (selectedMode === "blitz") {
    saveBestBlitz(username, score);
  }
  showResult("Game over", `Score: ${score.toLocaleString()}`);
}

function showResult(title, body) {
  resultTitle.textContent = title;
  resultBody.textContent = body;
  resultModal.classList.remove("hidden");
  refreshLeaderboard();
}

function ensurePreview() {
  while (previewTypes.length < 6) {
    previewTypes.push(takeFromBag());
  }
}

function spawnPiece() {
  ensurePreview();
  const type = previewTypes.shift();
  previewTypes.push(takeFromBag());
  currentPiece = createPiece(type);
  holdUsed = false;
  if (collides(currentPiece)) {
    endGameOver();
  }
  buildNextPreviews();
}

function swapHold() {
  if (!gameRunning || paused || !currentPiece) return;
  if (holdUsed) return;
  holdUsed = true;
  const cur = currentPiece.type;
  if (holdType == null) {
    ensurePreview();
    holdType = cur;
    currentPiece = createPiece(previewTypes.shift());
    previewTypes.push(takeFromBag());
  } else {
    const swap = holdType;
    holdType = cur;
    currentPiece = createPiece(swap);
  }
  if (collides(currentPiece)) {
    endGameOver();
    return;
  }
  drawHold();
  buildNextPreviews();
}

function drawHold() {
  const s = holdCanvas.width;
  holdCtx.setTransform(1, 0, 0, 1, 0, 0);
  holdCtx.clearRect(0, 0, s, s);
  if (!holdType) return;
  const shape = SHAPES[holdType];
  const rows = shape.length;
  const cols = shape[0].length;
  const cell = Math.min(s / 4, s / rows, s / cols) * 0.85;
  const ox = (s - cols * cell) / 2;
  const oy = (s - rows * cell) / 2;
  const hex = COLORS[holdType];
  shape.forEach((row, y) => {
    row.forEach((v, x) => {
      if (v) {
        holdCtx.save();
        holdCtx.translate(ox + x * cell, oy + y * cell);
        holdCtx.scale(cell, cell);
        drawBeveledCell(holdCtx, 0, 0, hex);
        holdCtx.restore();
      }
    });
  });
}

let nextCanvases = [];

function buildNextPreviews() {
  nextQueueEl.innerHTML = "";
  nextCanvases = [];
  const show = previewTypes.slice(0, 5);
  const cw = 100;
  const ch = 72;
  show.forEach((type) => {
    const c = document.createElement("canvas");
    c.className = "next-preview";
    c.width = cw;
    c.height = ch;
    const nctx = c.getContext("2d");
    const shape = SHAPES[type];
    const rows = shape.length;
    const cols = shape[0].length;
    const cell = Math.min(cw / cols, ch / rows) * 0.82;
    const ox = (cw - cols * cell) / 2;
    const oy = (ch - rows * cell) / 2;
    const hex = COLORS[type];
    shape.forEach((row, y) => {
      row.forEach((v, x) => {
        if (v) {
          nctx.save();
          nctx.translate(ox + x * cell, oy + y * cell);
          nctx.scale(cell, cell);
          drawBeveledCell(nctx, 0, 0, hex);
          nctx.restore();
        }
      });
    });
    nextQueueEl.appendChild(c);
    nextCanvases.push(c);
  });
}

function dropPiece() {
  if (!gameRunning || paused) return;
  currentPiece.y += 1;
  if (collides(currentPiece)) {
    currentPiece.y -= 1;
    mergePiece();
    clearLines();
    if (gameRunning) {
      spawnPiece();
      drawHold();
    }
  }
  dropCounter = 0;
}

function movePiece(offset) {
  if (!gameRunning || paused) return;
  currentPiece.x += offset;
  if (collides(currentPiece)) {
    currentPiece.x -= offset;
  }
}

function rotatePiece() {
  if (!gameRunning || paused) return;
  const previous = currentPiece.shape;
  currentPiece.shape = rotate(currentPiece.shape);
  if (collides(currentPiece)) {
    currentPiece.x += 1;
    if (collides(currentPiece)) {
      currentPiece.x -= 2;
      if (collides(currentPiece)) {
        currentPiece.x += 1;
        currentPiece.shape = previous;
      }
    }
  }
}

function hardDrop() {
  if (!gameRunning || paused) return;
  while (!collides(currentPiece)) {
    currentPiece.y += 1;
  }
  currentPiece.y -= 1;
  mergePiece();
  clearLines();
  if (gameRunning) {
    spawnPiece();
    drawHold();
  }
  dropCounter = 0;
}

function formatTimeMs(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const frac = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(frac).padStart(3, "0")}`;
}

function formatTimeRemaining(ms) {
  return formatTimeMs(ms);
}

function updateHud() {
  statPieces.textContent = String(piecesPlaced);
  const elapsedSec = gameRunning ? (performance.now() - gameStartPerf) / 1000 : 0;
  const pps = elapsedSec > 0.2 ? piecesPlaced / elapsedSec : 0;
  statPps.textContent = `${pps.toFixed(2)}/S`;

  if (selectedMode === "lines40") {
    statLines.textContent = `${lines}`;
    linesGoal.textContent = `/${LINE_GOAL_40}`;
    linesLabel.textContent = "LINES";
    const elapsed = gameRunning ? performance.now() - gameStartPerf : 0;
    statTime.textContent = formatTimeMs(elapsed);
    timeLabel.textContent = "TIME";
  } else if (selectedMode === "blitz") {
    statLines.textContent = String(lines);
    linesGoal.textContent = "";
    linesLabel.textContent = "LINES";
    const left = gameRunning ? Math.max(0, blitzEndPerf - performance.now()) : BLITZ_MS;
    statTime.textContent = formatTimeRemaining(left);
    timeLabel.textContent = "TIME LEFT";
    statScore.textContent = String(score);
    statLevel.textContent = String(level);
  } else {
    statLines.textContent = String(lines);
    linesGoal.textContent = "";
    linesLabel.textContent = "LINES";
    const elapsed = gameRunning ? performance.now() - gameStartPerf : 0;
    statTime.textContent = formatTimeMs(elapsed);
    timeLabel.textContent = "TIME";
    statScore.textContent = String(score);
    statLevel.textContent = String(level);
  }
}

function applyModeRules() {
  if (selectedMode === "lines40") {
    dropInterval = SPRINT_DROP_MS;
    endlessStatBlocks.forEach((el) => el.classList.add("hidden"));
  } else if (selectedMode === "blitz") {
    dropInterval = BLITZ_BASE_DROP_MS;
    endlessStatBlocks.forEach((el) => el.classList.remove("hidden"));
  } else {
    dropInterval = BLITZ_BASE_DROP_MS;
    endlessStatBlocks.forEach((el) => el.classList.remove("hidden"));
  }
}

function resetRound() {
  board = createMatrix(COLS, ROWS);
  score = 0;
  lines = 0;
  level = 1;
  piecesPlaced = 0;
  dropCounter = 0;
  holdType = null;
  holdUsed = false;
  previewTypes = [];
  refillBag();
  ensurePreview();
  applyModeRules();
  spawnPiece();
  drawHold();
  updateHud();
  drawBoard();
}

function beginAfterCountdown() {
  countingDown = false;
  gameStartPerf = performance.now();
  if (selectedMode === "blitz") {
    blitzEndPerf = gameStartPerf + BLITZ_MS;
  }
  gameRunning = true;
  paused = false;
  lastTime = performance.now();
  resetRound();
  loop();
}

function runCountdown() {
  countingDown = true;
  countdownOverlay.classList.remove("hidden");
  const nums = [3, 2, 1];
  let idx = 0;

  function showNext() {
    if (idx < nums.length) {
      countdownText.textContent = String(nums[idx]);
      idx += 1;
      setTimeout(showNext, 1000);
      return;
    }
    countdownText.textContent = "GO";
    setTimeout(() => {
      countdownOverlay.classList.add("hidden");
      countingDown = false;
      beginAfterCountdown();
    }, 500);
  }

  showNext();
}

function openGameFromMenu() {
  if (!username) {
    usernameModal.classList.remove("hidden");
    usernameInput.focus();
    return;
  }
  menuScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  gameModeLabel.textContent = MODE_INFO[selectedMode].label;
  playerName.textContent = username;
  applyModeUi();
  runCountdown();
}

function applyModeUi() {
  const info = MODE_INFO[selectedMode];
  detailTitle.textContent = info.title;
  gameModeLabel.textContent = info.label;
}

function returnToMenu() {
  gameRunning = false;
  countingDown = false;
  countdownOverlay.classList.add("hidden");
  gameScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
  resultModal.classList.add("hidden");
}

const LS = {
  best40: "tetris_best40",
  bestBlitz: "tetris_bestBlitz"
};

function saveBestTime(name, ms) {
  try {
    const prev = JSON.parse(localStorage.getItem(LS.best40) || "null");
    if (!prev || ms < prev.ms) {
      localStorage.setItem(LS.best40, JSON.stringify({ name, ms }));
    }
  } catch {
    /* ignore */
  }
}

function saveBestBlitz(name, sc) {
  try {
    const prev = JSON.parse(localStorage.getItem(LS.bestBlitz) || "null");
    if (!prev || sc > prev.score) {
      localStorage.setItem(LS.bestBlitz, JSON.stringify({ name, score: sc }));
    }
  } catch {
    /* ignore */
  }
}

function refreshLeaderboard() {
  leaderboardList.innerHTML = "";
  try {
    const t = JSON.parse(localStorage.getItem(LS.best40) || "null");
    if (t) {
      const li = document.createElement("li");
      li.innerHTML = `<span>40 Lines</span><span>${t.name} · ${formatTimeMs(t.ms)}</span>`;
      leaderboardList.appendChild(li);
    }
    const b = JSON.parse(localStorage.getItem(LS.bestBlitz) || "null");
    if (b) {
      const li = document.createElement("li");
      li.innerHTML = `<span>Blitz</span><span>${b.name} · ${b.score.toLocaleString()}</span>`;
      leaderboardList.appendChild(li);
    }
    if (!t && !b) {
      const li = document.createElement("li");
      li.textContent = "No records yet.";
      leaderboardList.appendChild(li);
    }
  } catch {
    leaderboardList.innerHTML = "<li>—</li>";
  }
}

function loop(now = performance.now()) {
  if (!gameRunning) return;
  const delta = Math.min(now - lastTime, 50);
  lastTime = now;

  if (!paused && !countingDown) {
    let mult = 1;
    if (keysDown.down) mult = 12;
    dropCounter += delta * mult;
    while (dropCounter >= dropInterval) {
      dropPiece();
      if (!gameRunning) break;
    }

    if (selectedMode === "blitz" && gameRunning) {
      if (performance.now() >= blitzEndPerf) {
        endGameBlitzTime();
      }
    }
  }

  updateHud();
  drawBoard();
  if (gameRunning) {
    requestAnimationFrame(loop);
  }
}

document.addEventListener("keydown", (e) => {
  if (usernameModal && !usernameModal.classList.contains("hidden") && e.key !== "Tab") {
    return;
  }
  if (resultModal && !resultModal.classList.contains("hidden")) {
    if (e.key === "Enter" || e.key === "Escape") resultOk.click();
    return;
  }

  if (!gameRunning || countingDown) {
    return;
  }

  if (e.key === "ArrowDown") {
    keysDown.down = true;
    e.preventDefault();
  }
  if (e.key === "ArrowLeft") {
    movePiece(-1);
    e.preventDefault();
  }
  if (e.key === "ArrowRight") {
    movePiece(1);
    e.preventDefault();
  }
  if (e.key === "ArrowUp") {
    rotatePiece();
    e.preventDefault();
  }
  if (e.key === " ") {
    e.preventDefault();
    hardDrop();
  }
  if (e.key.toLowerCase() === "p") {
    paused = !paused;
  }
  if (e.key === "Shift" || e.key.toLowerCase() === "c") {
    swapHold();
    e.preventDefault();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowDown") keysDown.down = false;
});

usernameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const entered = usernameInput.value.trim();
  if (!entered) return;
  username = entered;
  playerName.textContent = username;
  menuUsername.textContent = username;
  usernameModal.classList.add("hidden");
  menuScreen.classList.remove("hidden");
  refreshLeaderboard();
});

playButton.addEventListener("click", () => {
  openGameFromMenu();
});

backToMenuBtn.addEventListener("click", () => {
  returnToMenu();
});

backFromMenuBtn.addEventListener("click", () => {
  /* optional: could minimize app */
});

resultOk.addEventListener("click", () => {
  resultModal.classList.add("hidden");
  returnToMenu();
});

document.querySelectorAll(".mode-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".mode-card").forEach((c) => {
      c.classList.remove("is-selected");
      c.setAttribute("aria-selected", "false");
    });
    card.classList.add("is-selected");
    card.setAttribute("aria-selected", "true");
    selectedMode = card.dataset.mode;
    const info = MODE_INFO[selectedMode];
    detailTitle.textContent = info.title;
    detailDesc.textContent = info.desc;
    detailTag.textContent = info.tag;
  });
});

function tickMenuClock() {
  const d = new Date();
  menuClock.textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
setInterval(tickMenuClock, 1000);
tickMenuClock();

window.addEventListener("load", () => {
  usernameInput.focus();
  const first = document.querySelector('.mode-card[data-mode="lines40"]');
  if (first) {
    const info = MODE_INFO.lines40;
    detailTitle.textContent = info.title;
    detailDesc.textContent = info.desc;
    detailTag.textContent = info.tag;
  }
});
