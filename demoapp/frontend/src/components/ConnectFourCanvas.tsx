import { createElement, useEffect, useRef } from "@minireact";
import type { PlayerConfig } from "../types/games";
import { getAiMove } from "./ConnectFourAi";

interface ConnectFourCanvasProps {
  demoMode?: boolean;
  canvasId?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  players: PlayerConfig[];
  onWinner?: (winnerIdx: number) => void;
  onDraw?: () => void;
  gameKey?: number;
  onMove?: (col: number, playerIdx: number) => boolean;
  currentPlayer?: number;
  board?: (number | null)[][];
  gameActive?: boolean;
}

export default function ConnectFourCanvas({
  demoMode = false,
  canvasId = "connect-four-canvas",
  canvasWidth = 700,
  canvasHeight = 600,
  players,
  onWinner,
  onDraw,
  gameKey = 0,
  onMove,
  currentPlayer = 0,
  board: externalBoard,
  gameActive = true,
}: ConnectFourCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const ROWS = 6;
  const COLS = 7 + Math.max(0, players.length - 2);
  
  const maxCellSizeFromWidth = canvasWidth / COLS;
  const maxCellSizeFromHeight = canvasHeight / ROWS;
  const CELL_SIZE = Math.min(maxCellSizeFromWidth, maxCellSizeFromHeight, 80);
  
  const boardWidth = COLS * CELL_SIZE;
  const boardHeight = ROWS * CELL_SIZE;
  
  const actualCanvasWidth = boardWidth + (CELL_SIZE / 2);
  const actualCanvasHeight = boardHeight + (CELL_SIZE / 2);

  const initializeBoard = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, actualCanvasWidth, actualCanvasHeight);
    
    ctx.fillStyle = "#2563eb";
    const radius = 12;
    ctx.beginPath();
    ctx.roundRect(0, 0, actualCanvasWidth, actualCanvasHeight, radius);
    ctx.fill();

    const isDarkTheme = document.documentElement.classList.contains('dark');
    const holeColor = isDarkTheme ? "#1f2937" : "#ffffff";

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = (col + 0.5) * CELL_SIZE + (CELL_SIZE / 4);
        const y = (row + 0.5) * CELL_SIZE + (CELL_SIZE / 4);

        ctx.beginPath();
        ctx.arc(x, y, CELL_SIZE * 0.4, 0, 2 * Math.PI);
        ctx.fillStyle = holeColor;
        ctx.fill();
      }
    }
  };

  const drawCell = (ctx: CanvasRenderingContext2D, row: number, col: number, playerIdx: number | null) => {
    const x = (col + 0.5) * CELL_SIZE + (CELL_SIZE / 4);
    const y = (row + 0.5) * CELL_SIZE + (CELL_SIZE / 4);

    const isDarkTheme = document.documentElement.classList.contains('dark');
    const holeColor = isDarkTheme ? "#1f2937" : "#ffffff";

    ctx.beginPath();
    ctx.arc(x, y, CELL_SIZE * 0.4, 0, 2 * Math.PI);
    
    if (playerIdx !== null) {
      ctx.fillStyle = players[playerIdx]?.color || "#888888";
    } else {
      ctx.fillStyle = holeColor;
    }
    ctx.fill();
  };

  const drawFullBoard = (ctx: CanvasRenderingContext2D, board: any[][], animatingPiece: any) => {
    initializeBoard(ctx);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (board[row][col] !== null) {
          drawCell(ctx, row, col, board[row][col]);
        }
      }
    }

    if (animatingPiece) {
      const x = (animatingPiece.col + 0.5) * CELL_SIZE + (CELL_SIZE / 4);
      const y = animatingPiece.y;
      
      ctx.beginPath();
      ctx.arc(x, y, CELL_SIZE * 0.4, 0, 2 * Math.PI);
      ctx.fillStyle = players[animatingPiece.player]?.color || "#888888";
      ctx.fill();
    }
  };

  useEffect(() => {
    const checkCanvas = () => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      if (!canvas) {
        setTimeout(checkCanvas, 10);
        return;
      }
      canvasRef.current = canvas;
    };
    
    checkCanvas();
  }, [canvasId]);

  useEffect(() => {
    if (demoMode || !externalBoard) return;
    
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    initializeBoard(ctx);
    
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (externalBoard[row][col] !== null) {
          drawCell(ctx, row, col, externalBoard[row][col]);
        }
      }
    }
  }, [demoMode, externalBoard, canvasId]);

  const prevBoardRef = useRef<(number | null)[][]>([]);
  
  useEffect(() => {
    if (demoMode || !externalBoard) return;
    
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const prevBoard = prevBoardRef.current;
    
    if (prevBoard.length === ROWS && prevBoard[0]?.length === COLS) {
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (prevBoard[row][col] !== externalBoard[row][col]) {
            drawCell(ctx, row, col, externalBoard[row][col]);
          }
        }
      }
    }
    
    prevBoardRef.current = externalBoard.map(row => [...row]);
  }, [externalBoard, demoMode, canvasId]);

  useEffect(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    

    if (!demoMode) {
      const gameBoard = externalBoard || Array(ROWS).fill(0).map(() => Array(COLS).fill(null));
      
      const handleCanvasClick = (event: MouseEvent) => {
        if (!gameActive || !onMove) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const clickedCol = Math.floor((x - CELL_SIZE / 4) / CELL_SIZE);
        
        if (clickedCol >= 0 && clickedCol < COLS) {
          const currentPlayerConfig = players[currentPlayer];
          if (currentPlayerConfig && currentPlayerConfig.type === 'ai') {
            return;
          }
          
          onMove(clickedCol, currentPlayer);
        }
      };
      
      canvas.addEventListener('click', handleCanvasClick);
      
      initializeBoard(ctx);
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (gameBoard[row][col] !== null) {
            drawCell(ctx, row, col, gameBoard[row][col]);
          }
        }
      }
      
      return () => {
        canvas.removeEventListener('click', handleCanvasClick);
      };
    }

    let board = Array(ROWS).fill(0).map(() => Array(COLS).fill(null));
    let currentPlayerDemo = 0;
    let gameOver = false;
    let lastMoveTime = Date.now();
    let animatingPiece: any = null;

    const checkWin = (board: any[][], row: number, col: number, player: number): boolean => {
      const directions = [
        { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 }
      ];
      
      for (let { dr, dc } of directions) {
        let count = 1;
        for (let d = -1; d <= 1; d += 2) {
          let r = row + d * dr;
          let c = col + d * dc;
          while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
            count++;
            r += d * dr;
            c += d * dc;
          }
        }
        if (count >= 4) return true;
      }
      return false;
    };

    const resetGame = () => {
      board = Array(ROWS).fill(0).map(() => Array(COLS).fill(null));
      currentPlayerDemo = 0;
      gameOver = false;
      lastMoveTime = Date.now();
      animatingPiece = null;
    };

    const gameLoop = () => {
      const currentTime = Date.now();

      if (animatingPiece) {
        const targetY = (animatingPiece.targetRow + 0.5) * CELL_SIZE + (CELL_SIZE / 4);
        animatingPiece.y += 8;
        if (animatingPiece.y >= targetY) {
          board[animatingPiece.targetRow][animatingPiece.col] = animatingPiece.player;
          if (checkWin(board, animatingPiece.targetRow, animatingPiece.col, animatingPiece.player)) {
            gameOver = true;
            if (onWinner) onWinner(animatingPiece.player);
            setTimeout(() => {
              resetGame();
            }, 2000);
          } else {
            const isFull = board[0].every((cell: any) => cell !== null);
            if (isFull) {
              gameOver = true;
              setTimeout(() => {
                resetGame();
              }, 2000);
            } else {
              currentPlayerDemo = (currentPlayerDemo + 1) % players.length;
              lastMoveTime = Date.now();
            }
          }
          animatingPiece = null;
        }
      }

      if (!gameOver && !animatingPiece && currentTime - lastMoveTime > 1000) {
        const move = getAiMove(board, currentPlayerDemo, players);
        
        if (move !== null) {
          let targetRow = -1;
          for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][move] === null) {
              targetRow = r;
              break;
            }
          }
          if (targetRow !== -1) {
            animatingPiece = {
              col: move,
              targetRow,
              y: -CELL_SIZE * 0.4,
              player: currentPlayerDemo,
            };
          } else {
          }
        } else {
        }
      }

      drawFullBoard(ctx, board, animatingPiece);
      
      if (demoMode) {
        animationRef.current = requestAnimationFrame(gameLoop);
      }
    };

    const timeoutId = setTimeout(() => {
      gameLoop();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [demoMode, players, onWinner, onDraw, gameKey, onMove, currentPlayer, externalBoard, gameActive, actualCanvasWidth, actualCanvasHeight, CELL_SIZE, ROWS, COLS]);

  return (
    <div className="flex justify-center items-center">
      <canvas
        ref={canvasRef}
        id={canvasId}
        width={actualCanvasWidth}
        height={actualCanvasHeight}
        className="rounded-lg shadow-lg bg-blue-600"
        style={{
          maxWidth: "100%",
          height: "auto",
          display: "block",
        }}
      />
    </div>
  );
}
