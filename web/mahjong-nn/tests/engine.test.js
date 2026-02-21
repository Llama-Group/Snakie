const assert = require("assert");
const lib = require("../engine.js");

const handToCounts = lib.handToCounts;
const isWinningHand = lib.isWinningHand;
const chooseHeuristicDiscard = lib.chooseHeuristicDiscard;
const MahjongNeuralAgent = lib.MahjongNeuralAgent;
const MahjongRound = lib.MahjongRound;
const makeRng = lib.makeRng;

function run(name, fn) {
  try {
    fn();
    console.log("[PASS]", name);
  } catch (error) {
    console.error("[FAIL]", name);
    throw error;
  }
}

run("winning hand detection", function testWinning() {
  // 123m 123m 123p 789s 55p
  const hand = [0, 1, 2, 0, 1, 2, 9, 10, 11, 24, 25, 26, 13, 13];
  const counts = handToCounts(hand);
  assert.strictEqual(isWinningHand(counts), true);
});

run("non-winning hand detection", function testNonWinning() {
  const hand = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14];
  const counts = handToCounts(hand);
  assert.strictEqual(isWinningHand(counts), false);
});

run("heuristic discard chooses existing tile", function testHeuristic() {
  const hand = [0, 0, 1, 2, 3, 4, 9, 10, 11, 18, 19, 20, 25, 26];
  const counts = handToCounts(hand);
  const decision = chooseHeuristicDiscard(counts);
  assert.ok(decision.tile >= 0);
  assert.ok(counts[decision.tile] > 0);
});

run("neural agent trains and chooses legal discard", function testAgentTraining() {
  const rng = makeRng(7);
  const agent = new MahjongNeuralAgent({ random: rng, hiddenSize: 24 });
  const result = agent.train({ samples: 320, epochs: 1, learningRate: 0.03 });
  assert.ok(result.averageLoss > 0);
  assert.ok(result.steps > 0);

  const hand = [0, 0, 1, 2, 3, 4, 9, 10, 11, 18, 19, 20, 25, 26];
  const counts = handToCounts(hand);
  const discard = agent.chooseDiscard(counts);
  assert.ok(counts[discard] > 0);
});

run("round can initialize and progress", function testRoundFlow() {
  const rng = makeRng(11);
  const agent = new MahjongNeuralAgent({ random: rng, hiddenSize: 16 });
  agent.train({ samples: 120, epochs: 1, learningRate: 0.03 });

  const round = new MahjongRound({
    random: rng,
    agentFactory: () => agent,
  });

  round.init();
  let state = round.getState();
  assert.strictEqual(state.status, "playing");
  assert.strictEqual(state.players.length, 4);

  if (state.current === 0 && state.waitingForDiscard) {
    const tile = state.players[0].hand[0];
    assert.strictEqual(round.discard(tile), true);
  }
  round.runAITurns(4);
  state = round.getState();
  assert.ok(["playing", "win", "draw"].includes(state.status));
});

console.log("Mahjong NN engine tests passed.");
