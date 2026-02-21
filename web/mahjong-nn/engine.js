//
//  Mahjong NN Web Engine
//  Simplified mahjong with neural-network discard AI.
//

(function universalModule(root, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
    return;
  }
  root.MahjongNN = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createModule() {
  "use strict";

  const TILE_TYPES = 27;
  const SUIT_LABELS = ["万", "筒", "条"];

  function tileToLabel(index) {
    const rank = (index % 9) + 1;
    const suit = Math.floor(index / 9);
    return String(rank) + SUIT_LABELS[suit];
  }

  function makeRng(seed) {
    let value = seed || 1;
    return function rng() {
      value = (value * 1103515245 + 12345) % 2147483648;
      return value / 2147483648;
    };
  }

  function shuffle(list, random) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  }

  function createWall(random) {
    const wall = [];
    for (let tile = 0; tile < TILE_TYPES; tile += 1) {
      wall.push(tile, tile, tile, tile);
    }
    return shuffle(wall, random || Math.random);
  }

  function handToCounts(hand) {
    const counts = new Array(TILE_TYPES).fill(0);
    for (let i = 0; i < hand.length; i += 1) {
      counts[hand[i]] += 1;
    }
    return counts;
  }

  function countsToInput(counts) {
    const input = new Array(TILE_TYPES);
    for (let i = 0; i < TILE_TYPES; i += 1) {
      input[i] = counts[i] / 4;
    }
    return input;
  }

  function cloneCounts(counts) {
    return counts.slice();
  }

  function removeTileFromHand(hand, tile) {
    const index = hand.indexOf(tile);
    if (index < 0) {
      return false;
    }
    hand.splice(index, 1);
    return true;
  }

  function canFormMelds(counts, memo) {
    const key = counts.join(",");
    if (memo.has(key)) {
      return memo.get(key);
    }

    let first = -1;
    for (let i = 0; i < TILE_TYPES; i += 1) {
      if (counts[i] > 0) {
        first = i;
        break;
      }
    }
    if (first === -1) {
      memo.set(key, true);
      return true;
    }

    if (counts[first] >= 3) {
      counts[first] -= 3;
      if (canFormMelds(counts, memo)) {
        counts[first] += 3;
        memo.set(key, true);
        return true;
      }
      counts[first] += 3;
    }

    const suit = Math.floor(first / 9);
    const rank = first % 9;
    const i1 = first + 1;
    const i2 = first + 2;
    if (rank <= 6 && Math.floor(i1 / 9) === suit && Math.floor(i2 / 9) === suit) {
      if (counts[i1] > 0 && counts[i2] > 0) {
        counts[first] -= 1;
        counts[i1] -= 1;
        counts[i2] -= 1;
        if (canFormMelds(counts, memo)) {
          counts[first] += 1;
          counts[i1] += 1;
          counts[i2] += 1;
          memo.set(key, true);
          return true;
        }
        counts[first] += 1;
        counts[i1] += 1;
        counts[i2] += 1;
      }
    }

    memo.set(key, false);
    return false;
  }

  function isWinningHand(counts) {
    let total = 0;
    for (let i = 0; i < TILE_TYPES; i += 1) {
      total += counts[i];
    }
    if (total !== 14) {
      return false;
    }

    for (let pair = 0; pair < TILE_TYPES; pair += 1) {
      if (counts[pair] >= 2) {
        const next = cloneCounts(counts);
        next[pair] -= 2;
        if (canFormMelds(next, new Map())) {
          return true;
        }
      }
    }
    return false;
  }

  function analyzeBlocks(counts, memo) {
    const key = counts.join(",");
    if (memo.has(key)) {
      return memo.get(key);
    }

    let first = -1;
    for (let i = 0; i < TILE_TYPES; i += 1) {
      if (counts[i] > 0) {
        first = i;
        break;
      }
    }
    if (first === -1) {
      const emptyScore = { melds: 0, pairs: 0, taatsu: 0, score: 0 };
      memo.set(key, emptyScore);
      return emptyScore;
    }

    function better(a, b) {
      if (a.score !== b.score) {
        return a.score > b.score;
      }
      if (a.melds !== b.melds) {
        return a.melds > b.melds;
      }
      if (a.pairs !== b.pairs) {
        return a.pairs > b.pairs;
      }
      return a.taatsu > b.taatsu;
    }

    let best = null;

    function tryOption(mutator, deltaMeld, deltaPair, deltaTaatsu) {
      mutator(-1);
      const sub = analyzeBlocks(counts, memo);
      mutator(+1);
      const candidate = {
        melds: sub.melds + deltaMeld,
        pairs: sub.pairs + deltaPair,
        taatsu: sub.taatsu + deltaTaatsu,
      };
      candidate.score = candidate.melds * 100 + candidate.pairs * 16 + candidate.taatsu * 8;
      if (!best || better(candidate, best)) {
        best = candidate;
      }
    }

    if (counts[first] >= 3) {
      tryOption(function mutate(sign) {
        counts[first] += sign * 3;
      }, 1, 0, 0);
    }

    const suit = Math.floor(first / 9);
    const rank = first % 9;
    const i1 = first + 1;
    const i2 = first + 2;

    if (rank <= 6 && Math.floor(i1 / 9) === suit && Math.floor(i2 / 9) === suit) {
      if (counts[i1] > 0 && counts[i2] > 0) {
        tryOption(function mutate(sign) {
          counts[first] += sign;
          counts[i1] += sign;
          counts[i2] += sign;
        }, 1, 0, 0);
      }
    }

    if (counts[first] >= 2) {
      tryOption(function mutate(sign) {
        counts[first] += sign * 2;
      }, 0, 1, 0);
    }

    if (rank <= 7 && Math.floor(i1 / 9) === suit && counts[i1] > 0) {
      tryOption(function mutate(sign) {
        counts[first] += sign;
        counts[i1] += sign;
      }, 0, 0, 1);
    }

    if (rank <= 6 && Math.floor(i2 / 9) === suit && counts[i2] > 0) {
      tryOption(function mutate(sign) {
        counts[first] += sign;
        counts[i2] += sign;
      }, 0, 0, 1);
    }

    tryOption(function mutate(sign) {
      counts[first] += sign;
    }, 0, 0, 0);

    memo.set(key, best);
    return best;
  }

  function evaluateHandPotential(counts) {
    const result = analyzeBlocks(cloneCounts(counts), new Map());
    const needMeld = Math.max(0, 4 - result.melds);
    const hasPair = result.pairs > 0;
    const penalty = needMeld * 24 + (hasPair ? 0 : 14);
    const reward = result.melds * 40 + Math.min(result.pairs, 1) * 18 + result.taatsu * 6;
    return reward - penalty;
  }

  function chooseHeuristicDiscard(counts) {
    let bestTile = -1;
    let bestScore = -Infinity;
    for (let tile = 0; tile < TILE_TYPES; tile += 1) {
      if (counts[tile] <= 0) {
        continue;
      }
      counts[tile] -= 1;
      const score = evaluateHandPotential(counts);
      counts[tile] += 1;
      if (score > bestScore) {
        bestScore = score;
        bestTile = tile;
      }
    }
    return { tile: bestTile, score: bestScore };
  }

  class TinyDenseNetwork {
    constructor(inputSize, hiddenSize, outputSize, random) {
      this.inputSize = inputSize;
      this.hiddenSize = hiddenSize;
      this.outputSize = outputSize;
      this.random = random || Math.random;

      this.w1 = new Array(inputSize * hiddenSize);
      this.b1 = new Array(hiddenSize).fill(0);
      this.w2 = new Array(hiddenSize * outputSize);
      this.b2 = new Array(outputSize).fill(0);
      this.initWeights();
    }

    initWeights() {
      const scale1 = Math.sqrt(2 / this.inputSize);
      const scale2 = Math.sqrt(2 / this.hiddenSize);
      for (let i = 0; i < this.w1.length; i += 1) {
        this.w1[i] = (this.random() * 2 - 1) * scale1;
      }
      for (let i = 0; i < this.w2.length; i += 1) {
        this.w2[i] = (this.random() * 2 - 1) * scale2;
      }
    }

    forward(input) {
      const hidden = new Array(this.hiddenSize);
      for (let h = 0; h < this.hiddenSize; h += 1) {
        let sum = this.b1[h];
        for (let i = 0; i < this.inputSize; i += 1) {
          sum += input[i] * this.w1[i * this.hiddenSize + h];
        }
        hidden[h] = sum > 0 ? sum : 0;
      }

      const logits = new Array(this.outputSize);
      let maxLogit = -Infinity;
      for (let o = 0; o < this.outputSize; o += 1) {
        let sum = this.b2[o];
        for (let h = 0; h < this.hiddenSize; h += 1) {
          sum += hidden[h] * this.w2[h * this.outputSize + o];
        }
        logits[o] = sum;
        if (sum > maxLogit) {
          maxLogit = sum;
        }
      }

      let total = 0;
      const probs = new Array(this.outputSize);
      for (let o = 0; o < this.outputSize; o += 1) {
        const expVal = Math.exp(logits[o] - maxLogit);
        probs[o] = expVal;
        total += expVal;
      }
      for (let o = 0; o < this.outputSize; o += 1) {
        probs[o] /= total;
      }

      return { hidden, probs, logits };
    }

    trainSample(input, target, learningRate) {
      const forward = this.forward(input);
      const probs = forward.probs;
      const hidden = forward.hidden;

      let loss = -Math.log(Math.max(1e-12, probs[target]));

      const gradLogits = probs.slice();
      gradLogits[target] -= 1;

      for (let h = 0; h < this.hiddenSize; h += 1) {
        for (let o = 0; o < this.outputSize; o += 1) {
          const idx = h * this.outputSize + o;
          this.w2[idx] -= learningRate * hidden[h] * gradLogits[o];
        }
      }
      for (let o = 0; o < this.outputSize; o += 1) {
        this.b2[o] -= learningRate * gradLogits[o];
      }

      const gradHidden = new Array(this.hiddenSize).fill(0);
      for (let h = 0; h < this.hiddenSize; h += 1) {
        let sum = 0;
        for (let o = 0; o < this.outputSize; o += 1) {
          sum += this.w2[h * this.outputSize + o] * gradLogits[o];
        }
        gradHidden[h] = hidden[h] > 0 ? sum : 0;
      }

      for (let i = 0; i < this.inputSize; i += 1) {
        for (let h = 0; h < this.hiddenSize; h += 1) {
          const idx = i * this.hiddenSize + h;
          this.w1[idx] -= learningRate * input[i] * gradHidden[h];
        }
      }
      for (let h = 0; h < this.hiddenSize; h += 1) {
        this.b1[h] -= learningRate * gradHidden[h];
      }

      return loss;
    }

    predict(input) {
      return this.forward(input).probs;
    }
  }

  function generateTrainingExample(random) {
    const wall = createWall(random);
    const hand = wall.slice(0, 14).sort(function sortNum(a, b) {
      return a - b;
    });
    const counts = handToCounts(hand);
    const heuristic = chooseHeuristicDiscard(cloneCounts(counts));

    return {
      input: countsToInput(counts),
      target: heuristic.tile,
      handCounts: counts,
    };
  }

  class MahjongNeuralAgent {
    constructor(config) {
      const random = (config && config.random) || Math.random;
      const hidden = (config && config.hiddenSize) || 48;
      this.network = new TinyDenseNetwork(TILE_TYPES, hidden, TILE_TYPES, random);
      this.random = random;
      this.trainingSteps = 0;
      this.lastLoss = null;
    }

    train(options) {
      const samples = (options && options.samples) || 1200;
      const epochs = (options && options.epochs) || 2;
      const learningRate = (options && options.learningRate) || 0.02;

      const dataset = [];
      for (let i = 0; i < samples; i += 1) {
        dataset.push(generateTrainingExample(this.random));
      }

      let lossSum = 0;
      let seen = 0;
      for (let epoch = 0; epoch < epochs; epoch += 1) {
        shuffle(dataset, this.random);
        for (let i = 0; i < dataset.length; i += 1) {
          const sample = dataset[i];
          const loss = this.network.trainSample(sample.input, sample.target, learningRate);
          lossSum += loss;
          seen += 1;
        }
      }

      this.trainingSteps += samples * epochs;
      this.lastLoss = lossSum / Math.max(1, seen);
      return {
        averageLoss: this.lastLoss,
        steps: this.trainingSteps,
      };
    }

    chooseDiscard(handCounts) {
      const probs = this.network.predict(countsToInput(handCounts));
      let best = -1;
      let bestProb = -Infinity;

      for (let tile = 0; tile < TILE_TYPES; tile += 1) {
        if (handCounts[tile] <= 0) {
          continue;
        }
        if (probs[tile] > bestProb) {
          bestProb = probs[tile];
          best = tile;
        }
      }

      if (best >= 0) {
        return best;
      }
      return chooseHeuristicDiscard(handCounts).tile;
    }
  }

  class MahjongRound {
    constructor(options) {
      this.random = (options && options.random) || Math.random;
      this.agentFactory = (options && options.agentFactory) || function createDefaultAgent() {
        return new MahjongNeuralAgent({ random: Math.random });
      };
      this.playerCount = 4;
      this.players = [];
      this.wall = [];
      this.turn = 0;
      this.current = 0;
      this.waitingForDiscard = false;
      this.status = "idle";
      this.winner = -1;
      this.logs = [];
    }

    init() {
      this.wall = createWall(this.random);
      this.players = [];
      for (let i = 0; i < this.playerCount; i += 1) {
        this.players.push({
          id: i,
          isHuman: i === 0,
          hand: [],
          agent: i === 0 ? null : this.agentFactory(),
        });
      }

      for (let round = 0; round < 13; round += 1) {
        for (let p = 0; p < this.playerCount; p += 1) {
          this.players[p].hand.push(this.wall.pop());
        }
      }
      for (let p = 0; p < this.playerCount; p += 1) {
        this.players[p].hand.sort(function sortNum(a, b) {
          return a - b;
        });
      }

      this.turn = 1;
      this.current = 0;
      this.waitingForDiscard = false;
      this.status = "playing";
      this.winner = -1;
      this.logs = ["牌局开始。"];
      this.drawForCurrent();
    }

    drawForCurrent() {
      if (this.status !== "playing") {
        return;
      }
      if (this.wall.length <= 0) {
        this.status = "draw";
        this.logs.push("流局：牌墙已空。");
        return;
      }
      const player = this.players[this.current];
      const tile = this.wall.pop();
      player.hand.push(tile);
      player.hand.sort(function sortNum(a, b) {
        return a - b;
      });

      this.logs.push("P" + (this.current + 1) + " 摸牌。");
      if (isWinningHand(handToCounts(player.hand))) {
        this.status = "win";
        this.winner = this.current;
        this.waitingForDiscard = false;
        this.logs.push("P" + (this.current + 1) + " 自摸胡牌。");
        return;
      }

      this.waitingForDiscard = true;
    }

    discard(tile) {
      if (this.status !== "playing" || !this.waitingForDiscard) {
        return false;
      }
      const player = this.players[this.current];
      if (!removeTileFromHand(player.hand, tile)) {
        return false;
      }
      this.logs.push("P" + (this.current + 1) + " 打出 " + tileToLabel(tile) + "。");

      this.waitingForDiscard = false;
      this.current = (this.current + 1) % this.playerCount;
      this.turn += 1;
      this.drawForCurrent();
      return true;
    }

    runAITurns(maxSteps) {
      const limit = typeof maxSteps === "number" ? maxSteps : 12;
      let steps = 0;
      while (
        steps < limit &&
        this.status === "playing" &&
        this.waitingForDiscard &&
        this.current !== 0
      ) {
        const player = this.players[this.current];
        const counts = handToCounts(player.hand);
        const discard = player.agent.chooseDiscard(counts);
        this.discard(discard);
        steps += 1;
      }
      return steps;
    }

    getState() {
      return {
        status: this.status,
        winner: this.winner,
        turn: this.turn,
        current: this.current,
        wallLeft: this.wall.length,
        waitingForDiscard: this.waitingForDiscard,
        logs: this.logs.slice(-40),
        players: this.players.map(function mapPlayer(player) {
          return {
            id: player.id,
            isHuman: player.isHuman,
            handSize: player.hand.length,
            hand: player.hand.slice(),
          };
        }),
      };
    }
  }

  return {
    TILE_TYPES,
    SUIT_LABELS,
    tileToLabel,
    makeRng,
    createWall,
    handToCounts,
    countsToInput,
    isWinningHand,
    chooseHeuristicDiscard,
    TinyDenseNetwork,
    MahjongNeuralAgent,
    MahjongRound,
  };
});
