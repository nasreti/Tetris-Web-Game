const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 38;
const LOCK_FLASH_MS = 260;
const LINE_CLEAR_FLASH_MS = 420;
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
    label: "40 Lines",
    bannerText: "CLEAR 40 LINES!"
  },
  blitz: {
    label: "Blitz",
    bannerText: "BLITZ — RACE THE CLOCK!"
  },
  endless: {
    label: "Endless",
    bannerText: "ENDLESS — SURVIVE & CLIMB!"
  }
};

/** Curated nature photos (Unsplash) — random each session / game */
const NATURE_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1518173946684-a395c4c0d5b6?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80"
];

function randomNatureImageUrl() {
  return NATURE_BACKGROUNDS[Math.floor(Math.random() * NATURE_BACKGROUNDS.length)];
}

function applyNatureBackground(el) {
  if (!el) return;
  const url = randomNatureImageUrl();
  el.style.backgroundImage = `linear-gradient(0deg, rgba(6, 10, 20, 0.25), rgba(6, 10, 20, 0.35)), url("${url}")`;
}

const boardCanvas = document.getElementById("board");
const ctx = boardCanvas.getContext("2d");

function syncBoardCanvasSize() {
  boardCanvas.width = COLS * BLOCK_SIZE;
  boardCanvas.height = ROWS * BLOCK_SIZE;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
}

syncBoardCanvasSize();

const holdCanvas = document.getElementById("holdCanvas");
const holdCtx = holdCanvas.getContext("2d");

const usernameModal = document.getElementById("usernameModal");
const usernameForm = document.getElementById("usernameForm");
const usernameInput = document.getElementById("usernameInput");
const menuScreen = document.getElementById("menuScreen");
const menuNatureBg = document.getElementById("menuNatureBg");
const gameScreen = document.getElementById("gameScreen");
const gameNatureBg = document.getElementById("gameNatureBg");
const gameGuiRoot = document.getElementById("gameGuiRoot");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const playerName = document.getElementById("playerName");
const menuUsername = document.getElementById("menuUsername");
const gameModeLabel = document.getElementById("gameModeLabel");
const recordsModal = document.getElementById("recordsModal");
const aboutModal = document.getElementById("aboutModal");
const openRecordsBtn = document.getElementById("openRecordsBtn");
const recordsClose = document.getElementById("recordsClose");
const aboutClose = document.getElementById("aboutClose");
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
const leaderboardList = document.getElementById("leaderboardList");
const modeBannerOverlay = document.getElementById("modeBannerOverlay");
const modeBannerText = document.getElementById("modeBannerText");
const lineProgressFill = document.getElementById("lineProgressFill");
const boardStackEl = document.getElementById("boardStack");

const endlessStatBlocks = document.querySelectorAll(".endless-only");

let lockFlashCells = null;
let lockFlashT0 = 0;
let lineClearFlashT0 = 0;

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

let keysDown = { down: false, left: false };

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
  cx.strokeStyle = "rgba(255,255,255,0.055)";
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
  ctx.fillStyle = "rgba(4, 8, 18, 0.22)";
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

  const now = performance.now();

  if (lockFlashCells && now - lockFlashT0 < LOCK_FLASH_MS) {
    const t = (now - lockFlashT0) / LOCK_FLASH_MS;
    const alpha = Math.sin(t * Math.PI) * 0.52;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    lockFlashCells.forEach(({ x, y }) => {
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
        ctx.fillRect(x, y, 1, 1);
      }
    });
  } else if (lockFlashCells) {
    lockFlashCells = null;
  }

  if (lineClearFlashT0 > 0) {
    const elapsed = now - lineClearFlashT0;
    if (elapsed < LINE_CLEAR_FLASH_MS) {
      const t = elapsed / LINE_CLEAR_FLASH_MS;
      const alpha = 0.48 * Math.sin(t * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(0, 0, COLS, ROWS);
    } else {
      lineClearFlashT0 = 0;
    }
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

function canMoveLeft(piece) {
  if (!piece) return false;
  const test = {
    type: piece.type,
    shape: piece.shape.map((r) => [...r]),
    x: piece.x - 1,
    y: piece.y
  };
  return !collides(test);
}

function mergePiece() {
  const flashCells = [];
  currentPiece.shape.forEach((row, dy) => {
    row.forEach((value, dx) => {
      if (value) {
        const bx = currentPiece.x + dx;
        const by = currentPiece.y + dy;
        board[by][bx] = currentPiece.type;
        flashCells.push({ x: bx, y: by });
      }
    });
  });
  piecesPlaced += 1;
  triggerLockFx(flashCells);
}

function triggerLockFx(cells) {
  lockFlashCells = cells;
  lockFlashT0 = performance.now();
  if (boardStackEl) {
    boardStackEl.classList.remove("fx-shake-lock");
    boardStackEl.offsetWidth;
    boardStackEl.classList.add("fx-shake-lock");
  }
}

function triggerLineClearFx() {
  lineClearFlashT0 = performance.now();
  if (boardStackEl) {
    boardStackEl.classList.remove("fx-shake-line");
    boardStackEl.offsetWidth;
    boardStackEl.classList.add("fx-shake-line");
  }
}

function clearLines() {
  const rowsToClear = [];
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    let full = true;
    for (let x = 0; x < COLS; x += 1) {
      if (!board[y][x]) {
        full = false;
        break;
      }
    }
    if (full) rowsToClear.push(y);
  }

  const cleared = rowsToClear.length;
  if (cleared === 0) return;

  triggerLineClearFx();

  for (const y of rowsToClear.sort((a, b) => b - a)) {
    board.splice(y, 1);
    board.unshift(Array(COLS).fill(0));
  }

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

function checkWinLose() {
  if (!gameRunning) return;
  if (selectedMode === "lines40" && lines >= LINE_GOAL_40) {
    endGameWin40();
  }
}

function endGameWin40() {
  gameRunning = false;
  releaseLeftKey();
  const elapsed = performance.now() - gameStartPerf;
  saveBestTime(username, elapsed);
  showResult("40 Lines clear!", `Time: ${formatTimeMs(elapsed)}`);
}

function endGameBlitzTime() {
  gameRunning = false;
  releaseLeftKey();
  saveBestBlitz(username, score);
  showResult("Time's up!", `Final score: ${score.toLocaleString()}`);
}

function endGameOver() {
  gameRunning = false;
  releaseLeftKey();
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
  const cw = 118;
  const ch = 82;
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

function updateLineProgress() {
  if (!lineProgressFill) return;
  let pct = 0;
  if (selectedMode === "lines40") {
    pct = Math.min(1, lines / LINE_GOAL_40);
  } else if (selectedMode === "blitz") {
    if (gameRunning && blitzEndPerf > 0) {
      const left = Math.max(0, blitzEndPerf - performance.now());
      pct = 1 - left / BLITZ_MS;
    }
  } else {
    pct = Math.min(1, lines / 120);
  }
  lineProgressFill.style.height = `${Math.max(0, Math.min(1, pct)) * 100}%`;
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
  updateLineProgress();
}

function updateWallGuiNudge() {
  if (!gameGuiRoot) return;
  if (!gameRunning || countingDown || !currentPiece) {
    gameGuiRoot.classList.remove("gui-nudge-left");
    return;
  }
  const blockedLeft = !canMoveLeft(currentPiece);
  if (keysDown.left && blockedLeft) {
    gameGuiRoot.classList.add("gui-nudge-left");
  } else {
    gameGuiRoot.classList.remove("gui-nudge-left");
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
  lockFlashCells = null;
  lockFlashT0 = 0;
  lineClearFlashT0 = 0;
  if (boardStackEl) {
    boardStackEl.classList.remove("fx-shake-lock", "fx-shake-line");
  }
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

function openGameFromMenu(mode) {
  if (mode) {
    selectedMode = mode;
  }
  if (!username) {
    usernameModal.classList.remove("hidden");
    usernameInput.focus();
    return;
  }
  applyNatureBackground(gameNatureBg);
  menuScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  playerName.textContent = username;
  applyModeUi();
  showModeBannerThenCountdown();
}

function showModeBannerThenCountdown() {
  if (modeBannerText) {
    modeBannerText.textContent = MODE_INFO[selectedMode].bannerText;
  }
  if (modeBannerOverlay) modeBannerOverlay.classList.remove("hidden");
  setTimeout(() => {
    if (modeBannerOverlay) modeBannerOverlay.classList.add("hidden");
    runCountdown();
  }, 2400);
}

function applyModeUi() {
  const info = MODE_INFO[selectedMode];
  gameModeLabel.textContent = info.label;
}

function releaseLeftKey() {
  keysDown.left = false;
  if (gameGuiRoot) gameGuiRoot.classList.remove("gui-nudge-left");
}

function returnToMenu() {
  gameRunning = false;
  countingDown = false;
  releaseLeftKey();
  if (modeBannerOverlay) modeBannerOverlay.classList.add("hidden");
  countdownOverlay.classList.add("hidden");
  gameScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
  applyNatureBackground(menuNatureBg);
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
  updateWallGuiNudge();
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
    keysDown.left = true;
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
  if (e.key === "ArrowLeft") releaseLeftKey();
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
  applyNatureBackground(menuNatureBg);
  refreshLeaderboard();
});

document.querySelectorAll(".tetro-row[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    openGameFromMenu(btn.dataset.mode);
  });
});

openRecordsBtn.addEventListener("click", () => {
  refreshLeaderboard();
  recordsModal.classList.remove("hidden");
});

recordsClose.addEventListener("click", () => {
  recordsModal.classList.add("hidden");
});

const openAboutBtn = document.getElementById("openAboutBtn");
openAboutBtn.addEventListener("click", () => {
  aboutModal.classList.remove("hidden");
});

aboutClose.addEventListener("click", () => {
  aboutModal.classList.add("hidden");
});

backToMenuBtn.addEventListener("click", () => {
  returnToMenu();
});

resultOk.addEventListener("click", () => {
  resultModal.classList.add("hidden");
  returnToMenu();
});

window.addEventListener("blur", () => {
  keysDown.down = false;
  releaseLeftKey();
});

window.addEventListener("load", () => {
  usernameInput.focus();
});
