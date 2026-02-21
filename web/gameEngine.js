//
//  Snakie Web Engine
//  Copyright © 2026
//

(function universalModule(root, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
    return;
  }
  root.SnakieWeb = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function makeModule() {
  "use strict";

  const DIRECTIONS = Object.freeze({
    UP: "UP",
    DOWN: "DOWN",
    LEFT: "LEFT",
    RIGHT: "RIGHT",
  });

  const MODES = Object.freeze({
    CLASSIC: "classic",
    WARP: "warp",
    CHALLENGE: "challenge",
  });

  const DIRECTION_VECTORS = Object.freeze({
    [DIRECTIONS.UP]: Object.freeze({ x: 0, y: -1 }),
    [DIRECTIONS.DOWN]: Object.freeze({ x: 0, y: 1 }),
    [DIRECTIONS.LEFT]: Object.freeze({ x: -1, y: 0 }),
    [DIRECTIONS.RIGHT]: Object.freeze({ x: 1, y: 0 }),
  });

  function makeKey(x, y) {
    return x + "," + y;
  }

  function isOpposite(dirA, dirB) {
    if (!dirA || !dirB) {
      return false;
    }
    return (
      (dirA === DIRECTIONS.UP && dirB === DIRECTIONS.DOWN) ||
      (dirA === DIRECTIONS.DOWN && dirB === DIRECTIONS.UP) ||
      (dirA === DIRECTIONS.LEFT && dirB === DIRECTIONS.RIGHT) ||
      (dirA === DIRECTIONS.RIGHT && dirB === DIRECTIONS.LEFT)
    );
  }

  class SnakeEngine {
    constructor(options) {
      this.random = options && typeof options.random === "function" ? options.random : Math.random;
      this.now = options && typeof options.now === "function" ? options.now : function nowFactory() {
        return Date.now();
      };

      this.defaultConfig = {
        width: 20,
        height: 20,
        mode: MODES.CLASSIC,
        baseTickMs: 145,
        minTickMs: 72,
        comboWindowMs: 3200,
      };

      this.reset(options || {});
    }

    reset(overrides) {
      const config = Object.assign({}, this.defaultConfig, overrides || {});
      this.width = Number(config.width);
      this.height = Number(config.height);
      this.mode = config.mode || MODES.CLASSIC;
      this.baseTickMs = Number(config.baseTickMs);
      this.minTickMs = Number(config.minTickMs);
      this.comboWindowMs = Number(config.comboWindowMs);

      this.gameOver = false;
      this.won = false;
      this.paused = false;

      this.score = 0;
      this.level = 1;
      this.combo = 1;
      this.lastPoints = 0;
      this.foodsEaten = 0;
      this.tickMs = this.baseTickMs;
      this.lastEatAt = 0;

      const centerX = Math.floor(this.width / 2);
      const centerY = Math.floor(this.height / 2);

      this.snake = [
        { x: centerX, y: centerY },
        { x: centerX - 1, y: centerY },
        { x: centerX - 2, y: centerY },
      ];

      this.direction = DIRECTIONS.RIGHT;
      this.pendingDirection = null;
      this.obstacles = new Set();
      this.food = null;
      this.spawnFood();
      if (this.mode === MODES.CHALLENGE) {
        this.spawnObstacles(3);
      }
    }

    setDirection(nextDirection) {
      if (!DIRECTION_VECTORS[nextDirection]) {
        return false;
      }
      const base = this.pendingDirection || this.direction;
      if (isOpposite(base, nextDirection)) {
        return false;
      }
      this.pendingDirection = nextDirection;
      return true;
    }

    togglePause() {
      if (this.gameOver) {
        return false;
      }
      this.paused = !this.paused;
      return true;
    }

    step() {
      if (this.gameOver) {
        return { status: "game_over", reason: "finished" };
      }
      if (this.paused) {
        return { status: "paused" };
      }

      if (this.pendingDirection && !isOpposite(this.direction, this.pendingDirection)) {
        this.direction = this.pendingDirection;
      }
      this.pendingDirection = null;

      const movement = DIRECTION_VECTORS[this.direction];
      const head = this.snake[0];
      let nextX = head.x + movement.x;
      let nextY = head.y + movement.y;

      if (this.mode === MODES.WARP) {
        nextX = this.wrap(nextX, this.width);
        nextY = this.wrap(nextY, this.height);
      } else if (!this.inBounds(nextX, nextY)) {
        this.gameOver = true;
        return { status: "game_over", reason: "wall" };
      }

      const foodEaten = this.food && this.food.x === nextX && this.food.y === nextY;
      if (this.hitsSnake(nextX, nextY, !foodEaten)) {
        this.gameOver = true;
        return { status: "game_over", reason: "self" };
      }
      if (this.obstacles.has(makeKey(nextX, nextY))) {
        this.gameOver = true;
        return { status: "game_over", reason: "obstacle" };
      }

      this.snake.unshift({ x: nextX, y: nextY });
      if (!foodEaten) {
        this.snake.pop();
        this.updateCombo(false);
        return { status: "moved" };
      }

      this.foodsEaten += 1;
      this.lastPoints = this.calculatePoints(this.food);
      this.score += this.lastPoints;
      this.updateSpeedAndLevel();

      if (this.mode === MODES.CHALLENGE && this.foodsEaten % 3 === 0) {
        this.spawnObstacles(1);
      }

      const canContinue = this.spawnFood();
      if (!canContinue) {
        this.won = true;
        this.gameOver = true;
        return { status: "win" };
      }

      return { status: "ate", type: this.food.type, points: this.lastPoints };
    }

    calculatePoints(food) {
      this.updateCombo(true);
      let points = food.type === "golden" ? 3 : 1;
      if (this.combo > 1) {
        points += this.combo - 1;
      }
      return points;
    }

    updateCombo(ateFood) {
      if (!ateFood) {
        if (this.now() - this.lastEatAt > this.comboWindowMs) {
          this.combo = 1;
        }
        return;
      }

      const nowTs = this.now();
      if (this.lastEatAt > 0 && nowTs - this.lastEatAt <= this.comboWindowMs) {
        this.combo += 1;
      } else {
        this.combo = 1;
      }
      this.lastEatAt = nowTs;
    }

    updateSpeedAndLevel() {
      this.level = 1 + Math.floor(this.score / 8);
      this.tickMs = Math.max(this.minTickMs, this.baseTickMs - (this.level - 1) * 7);
    }

    spawnFood() {
      const cell = this.randomEmptyCell(true);
      if (!cell) {
        this.food = null;
        return false;
      }

      let goldenChance = 0.06;
      if (this.mode === MODES.CHALLENGE) {
        goldenChance = 0.18;
      }
      this.food = {
        x: cell.x,
        y: cell.y,
        type: this.random() < goldenChance ? "golden" : "normal",
      };
      return true;
    }

    spawnObstacles(count) {
      let spawned = 0;
      while (spawned < count) {
        const cell = this.randomEmptyCell(false);
        if (!cell) {
          return spawned > 0;
        }
        const tooCloseToHead =
          Math.abs(cell.x - this.snake[0].x) + Math.abs(cell.y - this.snake[0].y) <= 2;
        if (tooCloseToHead) {
          continue;
        }
        this.obstacles.add(makeKey(cell.x, cell.y));
        spawned += 1;
      }
      return true;
    }

    randomEmptyCell(skipFood) {
      const blocked = new Set();
      for (let i = 0; i < this.snake.length; i += 1) {
        blocked.add(makeKey(this.snake[i].x, this.snake[i].y));
      }
      this.obstacles.forEach(function each(key) {
        blocked.add(key);
      });
      if (!skipFood && this.food) {
        blocked.add(makeKey(this.food.x, this.food.y));
      }

      const empty = [];
      for (let x = 0; x < this.width; x += 1) {
        for (let y = 0; y < this.height; y += 1) {
          const key = makeKey(x, y);
          if (!blocked.has(key)) {
            empty.push({ x: x, y: y });
          }
        }
      }

      if (empty.length === 0) {
        return null;
      }
      const index = Math.floor(this.random() * empty.length);
      return empty[index];
    }

    hitsSnake(x, y, ignoreTail) {
      const limit = ignoreTail ? this.snake.length - 1 : this.snake.length;
      for (let i = 0; i < limit; i += 1) {
        const cell = this.snake[i];
        if (cell.x === x && cell.y === y) {
          return true;
        }
      }
      return false;
    }

    inBounds(x, y) {
      return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    wrap(value, max) {
      if (value < 0) {
        return max - 1;
      }
      if (value >= max) {
        return 0;
      }
      return value;
    }

    getSnapshot() {
      return {
        width: this.width,
        height: this.height,
        mode: this.mode,
        snake: this.snake.slice(),
        food: this.food ? { x: this.food.x, y: this.food.y, type: this.food.type } : null,
        obstacles: Array.from(this.obstacles),
        direction: this.direction,
        score: this.score,
        level: this.level,
        combo: this.combo,
        tickMs: this.tickMs,
        gameOver: this.gameOver,
        won: this.won,
        paused: this.paused,
      };
    }
  }

  return {
    SnakeEngine: SnakeEngine,
    DIRECTIONS: DIRECTIONS,
    MODES: MODES,
  };
});
