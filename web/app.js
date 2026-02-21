(function runSnakieWeb() {
  "use strict";

  const engineLib = window.SnakieWeb;
  if (!engineLib) {
    throw new Error("SnakieWeb engine not loaded.");
  }

  const SnakeEngine = engineLib.SnakeEngine;
  const DIRECTIONS = engineLib.DIRECTIONS;
  const MODES = engineLib.MODES;

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("highScore");
  const levelEl = document.getElementById("level");
  const comboEl = document.getElementById("combo");
  const statusLine = document.getElementById("statusLine");

  const modeSelect = document.getElementById("modeSelect");
  const sizeSelect = document.getElementById("sizeSelect");
  const speedRange = document.getElementById("speedRange");
  const gridToggle = document.getElementById("gridToggle");

  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const restartBtn = document.getElementById("restartBtn");
  const padButtons = document.querySelectorAll(".pad-btn");

  const HIGH_SCORE_KEY = "snakie.web.highscore";
  let highScore = Number(window.localStorage.getItem(HIGH_SCORE_KEY) || 0);

  let engine = null;
  let running = false;
  let accumulator = 0;
  let lastFrameTs = performance.now();

  function speedToTick(speedLevel) {
    const speed = Number(speedLevel);
    const mapping = {
      1: 178,
      2: 160,
      3: 145,
      4: 130,
      5: 118,
    };
    return mapping[speed] || 145;
  }

  function createEngine() {
    const size = Number(sizeSelect.value);
    const mode = modeSelect.value;
    engine = new SnakeEngine({
      width: size,
      height: size,
      mode: mode,
      baseTickMs: speedToTick(speedRange.value),
      minTickMs: 68,
    });
    running = true;
    accumulator = 0;
    setStatus("游戏开始，祝你好运。");
    syncHud();
  }

  function syncHud() {
    if (!engine) {
      return;
    }
    scoreEl.textContent = String(engine.score);
    highScoreEl.textContent = String(highScore);
    levelEl.textContent = String(engine.level);
    comboEl.textContent = "x" + engine.combo;
    pauseBtn.textContent = engine.paused ? "继续" : "暂停";
  }

  function setStatus(text) {
    statusLine.textContent = text;
  }

  function saveHighScoreIfNeeded() {
    if (!engine) {
      return;
    }
    if (engine.score > highScore) {
      highScore = engine.score;
      window.localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
      setStatus("新纪录！最高分已更新。");
    }
  }

  function handleStepResult(result) {
    if (!result) {
      return;
    }
    if (result.status === "ate") {
      if (engine.food && engine.food.type === "golden") {
        setStatus("吃到金色食物，奖励分翻倍。");
      } else {
        setStatus("吃到食物，继续冲分。");
      }
    } else if (result.status === "game_over") {
      running = false;
      saveHighScoreIfNeeded();
      if (result.reason === "wall") {
        setStatus("撞墙，游戏结束。");
      } else if (result.reason === "self") {
        setStatus("咬到自己，游戏结束。");
      } else if (result.reason === "obstacle") {
        setStatus("撞到障碍物，游戏结束。");
      } else {
        setStatus("游戏结束。");
      }
    } else if (result.status === "win") {
      running = false;
      saveHighScoreIfNeeded();
      setStatus("你清空了棋盘，通关！");
    }
  }

  function gridMetrics() {
    const width = engine.width;
    const height = engine.height;
    const tile = Math.floor(Math.min(canvas.width / width, canvas.height / height));
    const boardWidth = tile * width;
    const boardHeight = tile * height;
    const offsetX = Math.floor((canvas.width - boardWidth) / 2);
    const offsetY = Math.floor((canvas.height - boardHeight) / 2);
    return { tile: tile, boardWidth: boardWidth, boardHeight: boardHeight, offsetX: offsetX, offsetY: offsetY };
  }

  function drawBoardBackdrop(metrics) {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0d1a24");
    gradient.addColorStop(1, "#112c1f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(10, 20, 28, 0.8)";
    ctx.fillRect(metrics.offsetX, metrics.offsetY, metrics.boardWidth, metrics.boardHeight);
  }

  function drawGrid(metrics) {
    if (!gridToggle.checked) {
      return;
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= engine.width; x += 1) {
      const px = metrics.offsetX + x * metrics.tile + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, metrics.offsetY);
      ctx.lineTo(px, metrics.offsetY + metrics.boardHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= engine.height; y += 1) {
      const py = metrics.offsetY + y * metrics.tile + 0.5;
      ctx.beginPath();
      ctx.moveTo(metrics.offsetX, py);
      ctx.lineTo(metrics.offsetX + metrics.boardWidth, py);
      ctx.stroke();
    }
  }

  function drawCell(x, y, metrics, fill, radiusScale) {
    const px = metrics.offsetX + x * metrics.tile;
    const py = metrics.offsetY + y * metrics.tile;
    const pad = Math.max(1, Math.floor(metrics.tile * 0.07));
    const radius = Math.max(2, Math.floor(metrics.tile * radiusScale));
    ctx.fillStyle = fill;
    roundRect(ctx, px + pad, py + pad, metrics.tile - pad * 2, metrics.tile - pad * 2, radius);
    ctx.fill();
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, Math.floor(width / 2), Math.floor(height / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawSnake(metrics) {
    for (let i = engine.snake.length - 1; i >= 0; i -= 1) {
      const cell = engine.snake[i];
      if (i === 0) {
        drawCell(cell.x, cell.y, metrics, "#f2c14e", 0.24);
      } else {
        drawCell(cell.x, cell.y, metrics, "#31c48d", 0.21);
      }
    }

    const head = engine.snake[0];
    const eyeSize = Math.max(2, Math.floor(metrics.tile * 0.1));
    const px = metrics.offsetX + head.x * metrics.tile;
    const py = metrics.offsetY + head.y * metrics.tile;
    let dx1 = metrics.tile * 0.28;
    let dx2 = metrics.tile * 0.62;
    let dy = metrics.tile * 0.3;
    if (engine.direction === DIRECTIONS.DOWN) {
      dy = metrics.tile * 0.62;
    }
    if (engine.direction === DIRECTIONS.LEFT || engine.direction === DIRECTIONS.RIGHT) {
      dy = metrics.tile * 0.32;
      if (engine.direction === DIRECTIONS.LEFT) {
        dx1 = metrics.tile * 0.3;
        dx2 = metrics.tile * 0.3;
      } else {
        dx1 = metrics.tile * 0.62;
        dx2 = metrics.tile * 0.62;
      }
    }
    ctx.fillStyle = "#2a2110";
    ctx.beginPath();
    ctx.arc(px + dx1, py + dy, eyeSize, 0, Math.PI * 2);
    ctx.arc(px + dx2, py + dy, eyeSize, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFood(metrics, timeMs) {
    if (!engine.food) {
      return;
    }
    const pulse = 0.78 + Math.sin(timeMs / 140) * 0.16;
    const color = engine.food.type === "golden" ? "#ffd166" : "#ef476f";
    const x = metrics.offsetX + engine.food.x * metrics.tile + metrics.tile / 2;
    const y = metrics.offsetY + engine.food.y * metrics.tile + metrics.tile / 2;
    const radius = Math.max(4, (metrics.tile * 0.28) * pulse);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (engine.food.type === "golden") {
      ctx.strokeStyle = "rgba(255, 241, 191, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawObstacles(metrics) {
    engine.obstacles.forEach(function drawObstacle(key) {
      const parts = key.split(",");
      const x = Number(parts[0]);
      const y = Number(parts[1]);
      drawCell(x, y, metrics, "#355070", 0.19);
    });
  }

  function drawOverlay(text) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f4f1de";
    ctx.font = "700 44px 'Bungee'";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.font = "600 18px 'Space Grotesk'";
    ctx.fillText("按“开始新游戏”重新挑战", canvas.width / 2, canvas.height / 2 + 44);
  }

  function drawFrame(timeMs) {
    if (!engine) {
      return;
    }
    const metrics = gridMetrics();
    drawBoardBackdrop(metrics);
    drawGrid(metrics);
    drawObstacles(metrics);
    drawFood(metrics, timeMs);
    drawSnake(metrics);

    if (engine.paused && !engine.gameOver) {
      drawOverlay("暂停中");
    } else if (engine.gameOver && !engine.won) {
      drawOverlay("游戏结束");
    } else if (engine.won) {
      drawOverlay("通关");
    }
  }

  function loop(nowTs) {
    const delta = nowTs - lastFrameTs;
    lastFrameTs = nowTs;

    if (engine && running && !engine.paused && !engine.gameOver) {
      accumulator += delta;
      while (accumulator >= engine.tickMs) {
        const result = engine.step();
        accumulator -= engine.tickMs;
        handleStepResult(result);
      }
      syncHud();
      saveHighScoreIfNeeded();
    }

    drawFrame(nowTs);
    window.requestAnimationFrame(loop);
  }

  function applyDirectionFromInput(direction) {
    if (!engine || !running) {
      return;
    }
    engine.setDirection(direction);
  }

  function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "w") {
      applyDirectionFromInput(DIRECTIONS.UP);
      event.preventDefault();
    } else if (key === "arrowdown" || key === "s") {
      applyDirectionFromInput(DIRECTIONS.DOWN);
      event.preventDefault();
    } else if (key === "arrowleft" || key === "a") {
      applyDirectionFromInput(DIRECTIONS.LEFT);
      event.preventDefault();
    } else if (key === "arrowright" || key === "d") {
      applyDirectionFromInput(DIRECTIONS.RIGHT);
      event.preventDefault();
    } else if (key === " ") {
      if (engine) {
        engine.togglePause();
        setStatus(engine.paused ? "游戏已暂停。" : "继续游戏。");
        syncHud();
      }
      event.preventDefault();
    } else if (key === "enter") {
      createEngine();
      event.preventDefault();
    }
  }

  startBtn.addEventListener("click", function onStart() {
    createEngine();
  });

  pauseBtn.addEventListener("click", function onPause() {
    if (!engine) {
      return;
    }
    engine.togglePause();
    setStatus(engine.paused ? "游戏已暂停。" : "继续游戏。");
    syncHud();
  });

  restartBtn.addEventListener("click", function onRestart() {
    if (!engine) {
      createEngine();
      return;
    }
    engine.reset({
      width: Number(sizeSelect.value),
      height: Number(sizeSelect.value),
      mode: modeSelect.value,
      baseTickMs: speedToTick(speedRange.value),
      minTickMs: 68,
    });
    running = true;
    setStatus("已重开，继续冲分。");
    syncHud();
  });

  padButtons.forEach(function bindPad(button) {
    const direction = button.dataset.dir;
    const handler = function padInput(event) {
      applyDirectionFromInput(direction);
      event.preventDefault();
    };
    button.addEventListener("mousedown", handler);
    button.addEventListener("touchstart", handler, { passive: false });
  });

  window.addEventListener("keydown", handleKeyDown);

  modeSelect.value = MODES.CLASSIC;
  highScoreEl.textContent = String(highScore);
  createEngine();
  lastFrameTs = performance.now();
  window.requestAnimationFrame(loop);
})();
