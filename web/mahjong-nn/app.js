(function bootMahjongNN() {
  "use strict";

  const lib = window.MahjongNN;
  if (!lib) {
    throw new Error("MahjongNN engine missing.");
  }

  const tileToLabel = lib.tileToLabel;
  const handToCounts = lib.handToCounts;
  const MahjongNeuralAgent = lib.MahjongNeuralAgent;
  const MahjongRound = lib.MahjongRound;

  const wallLeftEl = document.getElementById("wallLeft");
  const turnCountEl = document.getElementById("turnCount");
  const currentPlayerEl = document.getElementById("currentPlayer");
  const trainStepsEl = document.getElementById("trainSteps");
  const trainLossEl = document.getElementById("trainLoss");
  const statusLine = document.getElementById("statusLine");
  const logsEl = document.getElementById("logs");

  const newGameBtn = document.getElementById("newGameBtn");
  const trainBtn = document.getElementById("trainBtn");
  const autoBtn = document.getElementById("autoBtn");

  const humanTilesEl = document.getElementById("humanTiles");
  const p2TilesEl = document.getElementById("p2Tiles");
  const p3TilesEl = document.getElementById("p3Tiles");
  const p4TilesEl = document.getElementById("p4Tiles");

  const sharedAgent = new MahjongNeuralAgent({ hiddenSize: 56 });
  const round = new MahjongRound({
    agentFactory: function factory() {
      return sharedAgent;
    },
  });

  let autoMode = false;
  let aiTimer = null;

  function setStatus(text) {
    statusLine.textContent = text;
  }

  function suitClass(tile) {
    return "s" + Math.floor(tile / 9);
  }

  function renderConcealed(container, count) {
    container.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const back = document.createElement("span");
      back.className = "back-tile";
      container.appendChild(back);
    }
  }

  function renderHumanTiles(state) {
    humanTilesEl.innerHTML = "";
    const canDiscard =
      state.status === "playing" && state.waitingForDiscard && state.current === 0;

    const hand = state.players[0].hand.slice().sort(function sortNum(a, b) {
      return a - b;
    });
    for (let i = 0; i < hand.length; i += 1) {
      const tile = hand[i];
      const btn = document.createElement("button");
      btn.className = "tile-btn " + suitClass(tile);
      btn.textContent = tileToLabel(tile);
      btn.disabled = !canDiscard;
      btn.addEventListener("click", function onDiscard() {
        if (!round.discard(tile)) {
          return;
        }
        render();
        runAIFlow();
      });
      humanTilesEl.appendChild(btn);
    }
  }

  function renderStats(state) {
    wallLeftEl.textContent = String(state.wallLeft);
    turnCountEl.textContent = String(state.turn);
    currentPlayerEl.textContent = state.status === "playing" ? "P" + (state.current + 1) : "-";
    trainStepsEl.textContent = String(sharedAgent.trainingSteps);
    trainLossEl.textContent =
      sharedAgent.lastLoss === null ? "-" : sharedAgent.lastLoss.toFixed(4);
  }

  function renderLogs(state) {
    logsEl.textContent = state.logs.join("\n");
    logsEl.scrollTop = logsEl.scrollHeight;
  }

  function renderStatus(state) {
    if (state.status === "idle") {
      setStatus("点击“新开一局”开始。");
      return;
    }
    if (state.status === "draw") {
      setStatus("流局：牌墙耗尽。");
      return;
    }
    if (state.status === "win") {
      if (state.winner === 0) {
        setStatus("你自摸胡牌了。");
      } else {
        setStatus("P" + (state.winner + 1) + " 自摸胡牌。");
      }
      return;
    }
    if (state.current === 0 && state.waitingForDiscard) {
      const hint = lib.chooseHeuristicDiscard(handToCounts(state.players[0].hand));
      setStatus("轮到你出牌。建议：" + tileToLabel(hint.tile));
      return;
    }
    if (state.waitingForDiscard) {
      setStatus("P" + (state.current + 1) + " 思考中...");
      return;
    }
    setStatus("牌局进行中。");
  }

  function render() {
    const state = round.getState();
    renderStats(state);
    renderHumanTiles(state);
    renderConcealed(p2TilesEl, state.players[1].handSize);
    renderConcealed(p3TilesEl, state.players[2].handSize);
    renderConcealed(p4TilesEl, state.players[3].handSize);
    renderLogs(state);
    renderStatus(state);
  }

  function runAIFlow() {
    if (aiTimer) {
      window.clearTimeout(aiTimer);
      aiTimer = null;
    }

    function step() {
      const state = round.getState();
      if (
        state.status !== "playing" ||
        !state.waitingForDiscard ||
        state.current === 0
      ) {
        render();
        return;
      }

      round.runAITurns(1);
      render();

      if (autoMode) {
        aiTimer = window.setTimeout(step, 260);
      } else {
        aiTimer = window.setTimeout(step, 240);
      }
    }

    aiTimer = window.setTimeout(step, 180);
  }

  function newGame() {
    round.init();
    render();
    runAIFlow();
  }

  function trainAI() {
    trainBtn.disabled = true;
    setStatus("AI 训练中...");

    window.setTimeout(function startTrain() {
      const result = sharedAgent.train({
        samples: 1800,
        epochs: 2,
        learningRate: 0.02,
      });
      trainBtn.disabled = false;
      setStatus("训练完成，平均损失 " + result.averageLoss.toFixed(4));
      render();
    }, 20);
  }

  newGameBtn.addEventListener("click", function onNewGame() {
    newGame();
  });

  trainBtn.addEventListener("click", function onTrain() {
    trainAI();
  });

  autoBtn.addEventListener("click", function onAuto() {
    autoMode = !autoMode;
    autoBtn.textContent = autoMode ? "停止自动推进" : "AI 自动推进";
    if (autoMode) {
      runAIFlow();
      setStatus("自动推进已开启。");
    } else {
      setStatus("自动推进已关闭。");
    }
  });

  trainAI();
  newGame();
})();
