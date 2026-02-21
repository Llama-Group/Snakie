const assert = require("assert");
const engineModule = require("../gameEngine.js");

const SnakeEngine = engineModule.SnakeEngine;
const DIRECTIONS = engineModule.DIRECTIONS;
const MODES = engineModule.MODES;

function keyOf(cell) {
  return cell.x + "," + cell.y;
}

function runTest(name, fn) {
  try {
    fn();
    console.log("[PASS]", name);
  } catch (error) {
    console.error("[FAIL]", name);
    throw error;
  }
}

runTest("initial state has valid snake and food", function testInitialState() {
  const engine = new SnakeEngine({ width: 12, height: 12, random: () => 0 });
  assert.strictEqual(engine.snake.length, 3);
  assert.ok(engine.food);
  const snakeCells = new Set(engine.snake.map(keyOf));
  assert.ok(!snakeCells.has(keyOf(engine.food)));
});

runTest("reverse direction is rejected", function testReverseDirection() {
  const engine = new SnakeEngine({ width: 12, height: 12, random: () => 0 });
  engine.direction = DIRECTIONS.RIGHT;
  const accepted = engine.setDirection(DIRECTIONS.LEFT);
  assert.strictEqual(accepted, false);
  const beforeX = engine.snake[0].x;
  engine.step();
  assert.strictEqual(engine.snake[0].x, beforeX + 1);
});

runTest("eating food increases length and score", function testEatFood() {
  const engine = new SnakeEngine({ width: 14, height: 14, random: () => 0 });
  const head = engine.snake[0];
  engine.direction = DIRECTIONS.RIGHT;
  engine.food = { x: head.x + 1, y: head.y, type: "normal" };

  const lengthBefore = engine.snake.length;
  const scoreBefore = engine.score;
  const result = engine.step();

  assert.strictEqual(result.status, "ate");
  assert.strictEqual(engine.snake.length, lengthBefore + 1);
  assert.ok(engine.score > scoreBefore);
});

runTest("classic mode wall collision ends game", function testWallCollisionClassic() {
  const engine = new SnakeEngine({ width: 6, height: 6, mode: MODES.CLASSIC, random: () => 0 });
  engine.snake = [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }];
  engine.direction = DIRECTIONS.LEFT;
  engine.food = { x: 5, y: 5, type: "normal" };

  const result = engine.step();
  assert.strictEqual(result.status, "game_over");
  assert.strictEqual(result.reason, "wall");
});

runTest("warp mode wraps at board edge", function testWarpMode() {
  const engine = new SnakeEngine({ width: 6, height: 6, mode: MODES.WARP, random: () => 0 });
  engine.snake = [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }];
  engine.direction = DIRECTIONS.LEFT;
  engine.food = { x: 5, y: 5, type: "normal" };

  const result = engine.step();
  assert.strictEqual(result.status, "moved");
  assert.strictEqual(engine.snake[0].x, 5);
  assert.strictEqual(engine.snake[0].y, 2);
});

runTest("challenge mode obstacle collision ends game", function testObstacleCollision() {
  const engine = new SnakeEngine({ width: 8, height: 8, mode: MODES.CHALLENGE, random: () => 0 });
  engine.snake = [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }];
  engine.direction = DIRECTIONS.RIGHT;
  engine.food = { x: 7, y: 7, type: "normal" };
  engine.obstacles = new Set(["4,3"]);

  const result = engine.step();
  assert.strictEqual(result.status, "game_over");
  assert.strictEqual(result.reason, "obstacle");
});

runTest("self collision is detected", function testSelfCollision() {
  const engine = new SnakeEngine({ width: 10, height: 10, random: () => 0 });
  engine.snake = [
    { x: 2, y: 2 },
    { x: 2, y: 3 },
    { x: 1, y: 3 },
    { x: 1, y: 2 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 3, y: 2 },
  ];
  engine.direction = DIRECTIONS.UP;
  engine.food = { x: 9, y: 9, type: "normal" };

  const result = engine.step();
  assert.strictEqual(result.status, "game_over");
  assert.strictEqual(result.reason, "self");
});

runTest("combo scoring increases when eating quickly", function testCombo() {
  let now = 1000;
  const engine = new SnakeEngine({
    width: 12,
    height: 12,
    random: () => 0,
    now: () => now,
  });

  engine.direction = DIRECTIONS.RIGHT;
  engine.food = { x: engine.snake[0].x + 1, y: engine.snake[0].y, type: "normal" };
  engine.step();
  const scoreAfterFirstFood = engine.score;

  now += 800;
  engine.food = { x: engine.snake[0].x + 1, y: engine.snake[0].y, type: "normal" };
  engine.step();

  assert.ok(engine.score - scoreAfterFirstFood >= 2);
  assert.ok(engine.combo >= 2);
});

console.log("All game engine tests passed.");
