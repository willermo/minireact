import { createElement, useEffect, useRef, Fragment } from "@minireact";

import type { GameMode, PlayerConfig } from "../types/games";

interface PongCanvasProps {
  demoMode?: boolean;
  canvasId?: string;
  canvasWidth?: number;
  targetScore?: number | null;
  onWinner: (winnerIdx: number, score: string) => void;
  aiLevel?: number;
  playerColors?: string[];
  players: PlayerConfig[];
  gameMode: GameMode;
  gameActive?: boolean;
}

interface AIDifficulty {
  reactionDelay: number;
  prediction: boolean;
  speed: number;
  errorMargin: number;
  maxSpeed: number;
}

const getAIDifficulty = (level: number): AIDifficulty => {
  const difficulties: AIDifficulty[] = [
    {
      reactionDelay: 60,
      prediction: false,
      speed: 6,
      errorMargin: 80,
      maxSpeed: 8,
    },
    {
      reactionDelay: 40,
      prediction: false,
      speed: 7,
      errorMargin: 50,
      maxSpeed: 8,
    },
    {
      reactionDelay: 25,
      prediction: false,
      speed: 8,
      errorMargin: 30,
      maxSpeed: 9,
    },
    {
      reactionDelay: 15,
      prediction: true,
      speed: 9,
      errorMargin: 15,
      maxSpeed: 9,
    },
    {
      reactionDelay: 8,
      prediction: true,
      speed: 9,
      errorMargin: 8,
      maxSpeed: 11,
    },
  ];

  const idx = Math.max(1, Math.min(level, difficulties.length)) - 1;
  return difficulties[idx];
};

export default function PongCanvas({
  demoMode = false,
  canvasId = "pong-canvas",
  canvasWidth = 800,
  targetScore = 3,
  onWinner,
  aiLevel = 1,
  playerColors = ["#e53e3e", "#3182ce", "#38a169", "#d69e2e"],
  players,
  gameMode,
  gameActive = true,
}: PongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const countdownRef = useRef<number>(3);
  const countdownStartTimeRef = useRef<number>(0);
  const ballActiveRef = useRef<boolean>(false);
  const isFirstStartRef = useRef<boolean>(true);
  const CANVAS_RATIO = 0.75;
  const ELEMENT_RATIO = canvasWidth / 800;
  const WIDTH = canvasWidth;
  const HEIGHT = canvasWidth * CANVAS_RATIO;
  const INITIAL_SPEED_X = 7 * ELEMENT_RATIO;
  const INITIAL_SPEED_Y = 5 * ELEMENT_RATIO;
  const TARGET_FPS = 60;
  const FIXED_TIMESTEP = 1000 / TARGET_FPS;
  const aiStateRef = useRef(new Map());

  useEffect(() => {
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "pong-canvas-simple";
      canvasRef.current = canvas;
    }
    const container = document.getElementById(canvasId);
    if (!container) return;
    if (!canvas.parentElement) container.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const is2v2 = gameMode === "2v2";
    let paddles: {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      player: PlayerConfig;
    }[] = [];
    if (!is2v2) {
      paddles = [
        {
          x: 10 * ELEMENT_RATIO,
          y: HEIGHT / 2 - 40 * ELEMENT_RATIO,
          w: 10 * ELEMENT_RATIO,
          h: 80 * ELEMENT_RATIO,
          color: playerColors[0],
          player: players[0],
        },
        {
          x: WIDTH - 20 * ELEMENT_RATIO,
          y: HEIGHT / 2 - 40 * ELEMENT_RATIO,
          w: 10 * ELEMENT_RATIO,
          h: 80 * ELEMENT_RATIO,
          color: playerColors[1],
          player: players[1],
        },
      ];
    } else {
      paddles = [
        {
          x: 10 * ELEMENT_RATIO,
          y: HEIGHT / 4 - 40 * ELEMENT_RATIO,
          w: 10 * ELEMENT_RATIO,
          h: 80 * ELEMENT_RATIO,
          color: playerColors[0],
          player: players[0],
        },
        {
          x: 150 * ELEMENT_RATIO,
          y: (3 * HEIGHT) / 4 - 40 * ELEMENT_RATIO,
          w: 10 * ELEMENT_RATIO,
          h: 80 * ELEMENT_RATIO,
          color: playerColors[1],
          player: players[1],
        },
        {
          x: WIDTH - 20 * ELEMENT_RATIO,
          y: HEIGHT / 4 - 40 * ELEMENT_RATIO,
          w: 10 * ELEMENT_RATIO,
          h: 80 * ELEMENT_RATIO,
          color: playerColors[2],
          player: players[2],
        },
        {
          x: WIDTH - 150 * ELEMENT_RATIO,
          y: (3 * HEIGHT) / 4 - 40 * ELEMENT_RATIO,
          w: 10 * ELEMENT_RATIO,
          h: 80 * ELEMENT_RATIO,
          color: playerColors[3],
          player: players[3],
        },
      ];
    }

    const ball = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: 0,
      vy: 0,
      r: 8 * ELEMENT_RATIO,
    };

    const scores = is2v2 ? [0, 0] : [0, 0];
    let raf = 0;
    let isRunning = gameActive;
    const keys: Record<string, boolean> = {};
    const down = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = true);
    const up = (e: KeyboardEvent) => (keys[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    const predictBallPosition = (
      ball: any,
      paddle: any,
      isLeftPaddle: boolean,
      HEIGHT: number
    ) => {
      if ((isLeftPaddle && ball.vx >= 0) || (!isLeftPaddle && ball.vx <= 0)) {
        return ball.y;
      }

      let x = ball.x;
      let y = ball.y;
      let vx = Math.abs(ball.vx);
      let vy = ball.vy;
      let iterations = 0;
      const targetX = isLeftPaddle ? paddle.x + paddle.w : paddle.x;
      const maxIterations = 50;

      while (iterations < maxIterations) {
        const deltaX = Math.abs(targetX - x);
        if (deltaX < 1) break;
        const timeToTarget = deltaX / vx;
        if (timeToTarget <= 0) break;
        const futureY = y + vy * timeToTarget;
        if (futureY < 0) {
          const timeToWall = -y / vy;
          x += vx * timeToWall;
          y = 0;
          vy = -vy;
        } else if (futureY > HEIGHT) {
          const timeToWall = (HEIGHT - y) / vy;
          x += vx * timeToWall;
          y = HEIGHT;
          vy = -vy;
        } else {
          return futureY;
        }
        iterations++;
      }
      return y;
    };

    const resetBall = (isGameStart = false) => {
      resetAIState();
      ball.x = WIDTH / 2;
      ball.y = HEIGHT / 2;
      ball.vx = (Math.random() > 0.5 ? 1 : -1) * INITIAL_SPEED_X;
      ball.vy = (Math.random() * 2 - 1) * INITIAL_SPEED_Y;

      if (isGameStart || isFirstStartRef.current) {
        countdownRef.current = 3;
        countdownStartTimeRef.current = performance.now();
        ballActiveRef.current = false;
        isFirstStartRef.current = false;
      } else {
        ballActiveRef.current = true;
      }
    };

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.strokeStyle = "#555";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2, 0);
      ctx.lineTo(WIDTH / 2, HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${32 * ELEMENT_RATIO}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${scores[0]}`, WIDTH / 4, 40 * ELEMENT_RATIO);
      ctx.fillText(`${scores[1]}`, (WIDTH / 4) * 3, 40 * ELEMENT_RATIO);

      paddles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
      });

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      if (!ballActiveRef.current && countdownRef.current > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        ctx.fillStyle = "#fff";
        ctx.font = `bold ${80 * ELEMENT_RATIO}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(
          countdownRef.current.toString(),
          WIDTH / 2,
          HEIGHT / 2 + 20 * ELEMENT_RATIO
        );

        ctx.font = `${24 * ELEMENT_RATIO}px sans-serif`;
        ctx.fillText("Get Ready!", WIDTH / 2, HEIGHT / 2 - 40 * ELEMENT_RATIO);
      }
    };

    const updatePositions = (deltaTime: number) => {
      frameCountRef.current++;
      // Normalizza deltaTime a 60 FPS (16.67ms)
      const normalizedDelta = deltaTime / FIXED_TIMESTEP;
      const moveSpeed = 10 * normalizedDelta;

      if (paddles[0].player.type === "player") {
        if (keys["w"] && paddles[0].y > 0) paddles[0].y -= moveSpeed;
        if (keys["s"] && paddles[0].y + paddles[0].h < HEIGHT)
          paddles[0].y += moveSpeed;
      } else if (paddles[0].player.type === "ai") {
        aiControl(paddles[0], ball, 0, normalizedDelta);
      }
      if (!is2v2) {
        if (paddles[1].player.type === "player") {
          if (keys["i"] && paddles[1].y > 0) paddles[1].y -= moveSpeed;
          if (keys["k"] && paddles[1].y + paddles[1].h < HEIGHT)
            paddles[1].y += moveSpeed;
        } else if (paddles[1].player.type === "ai") {
          aiControl(paddles[1], ball, 1, normalizedDelta);
        }
      } else {
        if (paddles[1].player.type === "player") {
          if (keys["t"] && paddles[1].y > 0) paddles[1].y -= moveSpeed;
          if (keys["g"] && paddles[1].y + paddles[1].h < HEIGHT)
            paddles[1].y += moveSpeed;
        } else if (paddles[1].player.type === "ai") {
          aiControl(paddles[1], ball, 1, normalizedDelta);
        }
        if (paddles[2].player.type === "player") {
          if (keys["u"] && paddles[2].y > 0) paddles[2].y -= moveSpeed;
          if (keys["j"] && paddles[2].y + paddles[2].h < HEIGHT)
            paddles[2].y += moveSpeed;
        } else if (paddles[2].player.type === "ai") {
          aiControl(paddles[2], ball, 2, normalizedDelta);
        }
        if (paddles[3].player.type === "player") {
          if (keys["o"] && paddles[3].y > 0) paddles[3].y -= moveSpeed;
          if (keys["l"] && paddles[3].y + paddles[3].h < HEIGHT)
            paddles[3].y += moveSpeed;
        } else if (paddles[3].player.type === "ai") {
          aiControl(paddles[3], ball, 3, normalizedDelta);
        }
      }
    };

    const aiControl = (
      paddle: any,
      ball: any,
      paddleIdx: number,
      normalizedDelta: number
    ) => {
      const isLeftPaddle = paddle.x < WIDTH / 2;
      const aiConfig = getAIDifficulty(aiLevel);
      if (!aiStateRef.current.has(paddleIdx)) {
        aiStateRef.current.set(paddleIdx, {
          targetY: paddle.y + paddle.h / 2,
          currentVelocity: 0,
          reactionTimer: 0,
          lastBallDirectionX: Math.sign(ball.vx),
          lastBallDirectionY: Math.sign(ball.vy),
          anticipationError: 0,
          isActive: false,
          smoothingFactor: aiConfig.prediction ? 0.12 : 0.08,
          lastUpdateFrame: frameCountRef.current,
        });
      }

      const aiState = aiStateRef.current.get(paddleIdx);
      const centerY = paddle.y + paddle.h / 2;
      const ballMovingTowardsPaddle =
        (isLeftPaddle && ball.vx < 0) || (!isLeftPaddle && ball.vx > 0);
      const deltaFrames = frameCountRef.current - aiState.lastUpdateFrame;
      aiState.lastUpdateFrame = frameCountRef.current;
      const currentDirectionX = Math.sign(ball.vx);
      const currentDirectionY = Math.sign(ball.vy);
      if (
        aiState.lastBallDirectionX !== currentDirectionX ||
        aiState.lastBallDirectionY !== currentDirectionY
      ) {
        aiState.reactionTimer = aiConfig.reactionDelay;
        aiState.lastBallDirectionX = currentDirectionX;
        aiState.lastBallDirectionY = currentDirectionY;
        aiState.anticipationError =
          (Math.random() - 0.5) * aiConfig.errorMargin;
      }

      if (ball.vx === 0 && ball.vy === 0) {
        return;
      }
      if (aiState.reactionTimer > 0) {
        aiState.reactionTimer -= normalizedDelta;
        aiState.currentVelocity *= Math.pow(0.92, normalizedDelta);
        return;
      } else {
        let newTargetY = ball.y;
        if (ballMovingTowardsPaddle) {
          let defensePosition;
          if (aiConfig.prediction) {
            defensePosition = predictBallPosition(
              ball,
              paddle,
              isLeftPaddle,
              HEIGHT
            );
            const errorFactor = 1 - (aiLevel - 1) / 4;
            const errorMargin =
              (Math.random() * 2 - 1) * (aiConfig.errorMargin * errorFactor);
            defensePosition += errorMargin;
            const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const predictionOffset =
              ballSpeed * 0.12 * (aiLevel === 5 ? 1 : 0.7);
            defensePosition += predictionOffset * (isLeftPaddle ? 1 : -1);
          } else {
            defensePosition = ball.y;
            const errorMargin = (Math.random() * 2 - 1) * aiConfig.errorMargin;
            defensePosition += errorMargin;
          }
          const centerBiasFactor = aiConfig.prediction ? 0.05 : 0.15;
          const centerBias = (HEIGHT / 2 - defensePosition) * centerBiasFactor;
          newTargetY = Math.max(
            paddle.h / 2,
            Math.min(HEIGHT - paddle.h / 2, defensePosition + centerBias)
          );
          aiState.isActive = true;
        } else {
          const ballDistance = isLeftPaddle ? ball.x : WIDTH - ball.x;
          if (ballDistance > WIDTH * 0.8) {
            aiState.targetY = HEIGHT / 2;
            aiState.isActive = false;
          }
        }
        aiState.targetY =
          aiState.targetY +
          (newTargetY - aiState.targetY) * aiState.smoothingFactor;
      }
      const distanceToTarget = aiState.targetY - centerY;
      const absDistance = Math.abs(distanceToTarget);
      const direction = Math.sign(distanceToTarget);
      let desiredSpeed = 0;
      if (aiState.isActive) {
        const distanceToBall = Math.abs(
          ball.x - (isLeftPaddle ? paddle.x : paddle.x)
        );
        const urgencyFactor = Math.max(0.4, 1 - distanceToBall / (WIDTH * 0.7));
        const baseSpeed = aiConfig.speed * urgencyFactor;
        const distanceBasedSpeed = Math.min(baseSpeed, absDistance * 0.1);
        desiredSpeed = distanceBasedSpeed;
      } else {
        const returnSpeed = aiConfig.speed * 0.3;
        desiredSpeed = Math.min(returnSpeed, absDistance * 0.06);
      }

      const targetVelocity = direction * desiredSpeed;
      const acceleration = aiConfig.prediction ? 0.25 : 0.15;
      const velocityDiff = targetVelocity - aiState.currentVelocity;
      aiState.currentVelocity += velocityDiff * acceleration * normalizedDelta;
      aiState.currentVelocity = Math.max(
        -aiConfig.maxSpeed,
        Math.min(aiConfig.maxSpeed, aiState.currentVelocity)
      );
      const deltaTime = Math.min(deltaFrames, 3) * normalizedDelta;
      paddle.y += aiState.currentVelocity * deltaTime;
      paddle.y = Math.max(0, Math.min(HEIGHT - paddle.h, paddle.y));
      if (Math.abs(aiState.currentVelocity) > aiConfig.maxSpeed * 1.5) {
        aiState.currentVelocity *= 0.5;
      }
    };
    const resetAIState = () => {
      aiStateRef.current.clear();
    };
    const checkCollisionsAndScore = () => {
      paddles.forEach(p => {
        const ballLeft = ball.x - ball.r;
        const ballRight = ball.x + ball.r;
        const ballTop = ball.y - ball.r;
        const ballBottom = ball.y + ball.r;
        const paddleLeft = p.x;
        const paddleRight = p.x + p.w;
        const paddleTop = p.y;
        const paddleBottom = p.y + p.h;
        if (
          ballRight > paddleLeft &&
          ballLeft < paddleRight &&
          ballBottom > paddleTop &&
          ballTop < paddleBottom
        ) {
          const relativeIntersectY = (ball.y - (p.y + p.h / 2)) / (p.h / 2);
          const fromLeft = ball.x < p.x + p.w / 2;
          ball.vx = Math.abs(ball.vx) * (fromLeft ? -1 : 1);
          const maxBounceAngle = Math.PI / 3; // 60 gradi max
          const bounceAngle = relativeIntersectY * maxBounceAngle;
          const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          ball.vx = Math.cos(bounceAngle) * speed * (fromLeft ? -1 : 1);
          ball.vy = Math.sin(bounceAngle) * speed;
          const speedIncrease = 1.02;
          ball.vx *= speedIncrease;
          ball.vy *= speedIncrease;
          const maxSpeed = 12 * ELEMENT_RATIO;
          const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          if (currentSpeed > maxSpeed) {
            ball.vx = (ball.vx / currentSpeed) * maxSpeed;
            ball.vy = (ball.vy / currentSpeed) * maxSpeed;
          }
          if (fromLeft) {
            ball.x = paddleLeft - ball.r - 1;
          } else {
            ball.x = paddleRight + ball.r + 1;
          }
        }
      });
      if (ball.y - ball.r < 0 || ball.y + ball.r > HEIGHT) {
        ball.vy = -ball.vy;
      }
      if (ball.y - ball.r < 0) {
        ball.y = ball.r;
        ball.vy = Math.abs(ball.vy);
      } else if (ball.y + ball.r > HEIGHT) {
        ball.y = HEIGHT - ball.r;
        ball.vy = -Math.abs(ball.vy);
      }
      if (!is2v2) {
        if (ball.x - ball.r < 0) {
          scores[1]++;
          resetBall();
        } else if (ball.x + ball.r > WIDTH) {
          scores[0]++;
          resetBall();
        }
      } else {
        if (ball.x - ball.r < 0) {
          const leftBlocked = paddles
            .slice(0, 2)
            .some(p => ball.y > p.y && ball.y < p.y + p.h);
          if (!leftBlocked) {
            scores[1]++;
            resetBall();
          }
        } else if (ball.x + ball.r > WIDTH) {
          const rightBlocked = paddles
            .slice(2, 4)
            .some(p => ball.y > p.y && ball.y < p.y + p.h);

          if (!rightBlocked) {
            scores[0]++;
            resetBall();
          }
        }
      }
    };

    const checkWinner = () => {
      if (targetScore === null) return null;
      if (scores[0] >= targetScore) {
        return 0;
      }
      if (scores[1] >= targetScore) {
        return 1;
      }
      return null;
    };

    const demoModeReset = () => {
      scores[0] = 0;
      scores[1] = 0;
      isRunning = true;
      lastTimeRef.current = performance.now();
      isFirstStartRef.current = true; // Reset for demo mode
      resetBall(true);
      gameLoop();
    };

    const gameLoop = (currentTime: number = performance.now()) => {
      if (!isRunning) return;

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      const clampedDelta = Math.min(deltaTime, 50);

      if (!ballActiveRef.current) {
        const timeSinceStart = currentTime - countdownStartTimeRef.current;
        const newCountdown = Math.max(0, Math.ceil(3 - timeSinceStart / 1000));

        if (newCountdown !== countdownRef.current) {
          countdownRef.current = newCountdown;
        }

        if (timeSinceStart >= 3000) {
          ballActiveRef.current = true;
        }
      }

      if (gameActive) {
        updatePositions(clampedDelta);
        const normalizedDelta = clampedDelta / FIXED_TIMESTEP;

        if (ballActiveRef.current) {
          ball.x += ball.vx * normalizedDelta;
          ball.y += ball.vy * normalizedDelta;
          checkCollisionsAndScore();
        }

        draw();
      }
      const winIdx = checkWinner();
      if (winIdx !== null) {
        isRunning = false;
        if (demoMode) {
          setTimeout(() => demoModeReset(), 2000);
        } else {
          const finalScore = `${scores[0]} - ${scores[1]}`;
          onWinner(winIdx, finalScore);
        }
        return;
      }
      raf = requestAnimationFrame(gameLoop);
    };

    const startTimeout = setTimeout(() => {
      lastTimeRef.current = performance.now();
      resetBall(true);
      gameLoop();
    }, 600);

    return () => {
      clearTimeout(startTimeout);
      isRunning = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      if (canvas && canvas.parentElement === container) {
        try {
          container.removeChild(canvas);
        } catch (e) {}
      }
    };
  }, [
    targetScore,
    onWinner,
    aiLevel,
    playerColors,
    players,
    gameMode,
    gameActive,
  ]);
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex justify-center"
        id={canvasId}
        style={{
          width: `${WIDTH}px`,
          height: `${HEIGHT}px`,
          margin: "auto",
        }}
      />
      {gameActive && !demoMode && (
        <div className="mt-4 px-4 py-2 bg-gray-800 bg-opacity-80 rounded-lg">
          <div className="text-white text-sm font-medium text-center mb-2">
            Controls
          </div>
          <div className="flex gap-6 text-xs text-gray-300">
            {gameMode === "1v1" ? (
              <>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] text-gray-400">Player 1</div>
                  <div className="flex gap-1">
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      W
                    </div>
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      S
                    </div>
                  </div>
                  <div className="text-[10px]">Up / Down</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] text-gray-400">Player 2</div>
                  <div className="flex gap-1">
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      I
                    </div>
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      K
                    </div>
                  </div>
                  <div className="text-[10px]">Up / Down</div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] text-gray-400">Left Top</div>
                  <div className="flex gap-1">
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      W
                    </div>
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      S
                    </div>
                  </div>
                  <div className="text-[10px]">Up / Down</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] text-gray-400">Left Bottom</div>
                  <div className="flex gap-1">
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      T
                    </div>
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      G
                    </div>
                  </div>
                  <div className="text-[10px]">Up / Down</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] text-gray-400">Right Top</div>
                  <div className="flex gap-1">
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      U
                    </div>
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      J
                    </div>
                  </div>
                  <div className="text-[10px]">Up / Down</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] text-gray-400">Right Bottom</div>
                  <div className="flex gap-1">
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      O
                    </div>
                    <div className="px-2 py-1 bg-gray-700 rounded text-white font-mono">
                      L
                    </div>
                  </div>
                  <div className="text-[10px]">Up / Down</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
