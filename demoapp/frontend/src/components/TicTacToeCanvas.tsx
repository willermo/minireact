import { createElement, useEffect, useState, useRef } from "@minireact";
import { getBestMove, type Cell, type Winner } from "./TicTacToeAiMC";
import type { PlayerConfig } from "@/types/games";

export type Mode = "ai" | "local";

export interface TicTacToeCanvasProps {
  mode: Mode;
  aiLevel: number;
  resetKey: number;
  playerColors?: [string, string];
  onGameEnd: (result: Winner) => void;
  demoMode?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  players?: PlayerConfig[];
}

export default function TicTacToeCanvas({
  mode,
  aiLevel,
  resetKey,
  playerColors = ["#3182ce", "#e53e3e"],  // Default colors
  onGameEnd,
  demoMode = false,
  canvasWidth = 240,
  canvasHeight = 240,
  players = [],
}: TicTacToeCanvasProps) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState<boolean>(true);
  const [animMap, setAnimMap] = useState<boolean[]>(Array(9).fill(false));
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const animationRef = useRef<number | null>(null);

  const cellSize = Math.min(canvasWidth / 3, canvasHeight / 3) - 8;

  const isCurrentTurnAI = (): boolean => {
    if (mode !== "ai" || demoMode) return false;
    if (players.length < 2) return !xTurn;
    
    if (xTurn) return players[0].type === "ai";
    else return players[1].type === "ai";
  };

  useEffect(() => {
    setBoard(Array(9).fill(null));
    setXTurn(true);
    setAnimMap(Array(9).fill(false));
    setGameEnded(false);
    setAiThinking(false);
  }, [resetKey]);

  useEffect(() => {
    if (!demoMode) return;
    let demoBoard: Cell[] = Array(9).fill(null);
    let demoXTurn = true;
    let demoGameEnded = false;
    let lastMoveTime = Date.now();
    
    // Create a separate div container for autonomous rendering (like ConnectFour canvas)
    const containerId = `tictactoe-demo-${Math.random().toString(36).substr(2, 9)}`;
    
    const checkWinnerDemo = (b: Cell[]): Winner => {
      const lines = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6],
      ] as const;
      for (const [a, c, d] of lines) {
        if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
      }
      if (b.every((cell) => cell !== null)) return "draw";
      return null;
    };

    const resetDemoGame = () => {
      demoBoard = Array(9).fill(null);
      demoXTurn = true;
      demoGameEnded = false;
      lastMoveTime = Date.now();
      renderDemoBoard();
    };

    const renderDemoBoard = () => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      container.className = 'flex justify-center items-center';
      container.style.width = `${canvasWidth}px`;
      container.style.height = `${canvasHeight}px`;
      container.style.maxHeight = '180px';
      const gridContainer = document.createElement('div');
      gridContainer.className = 'grid grid-cols-3 gap-2';
      gridContainer.style.width = 'fit-content';
      const cellSize = Math.min(canvasWidth / 3, canvasHeight / 3) - 8;
      const totalGridWidth = cellSize * 3 + 2 * 8 ;
      const rightOffset = (canvasWidth - totalGridWidth) / 2 + totalGridWidth / 4;
      gridContainer.style.marginLeft = `${rightOffset}px`;
      
      for (let i = 0; i < 9; i++) {
        const button = document.createElement('button');
        button.className = 'flex items-center justify-center themed-bg border border-gray-600 font-bold';
        button.style.width = `${cellSize}px`;
        button.style.height = `${cellSize}px`;
        button.style.fontSize = `${cellSize * 0.6}px`;
        button.style.cursor = 'default';
        
        if (demoBoard[i]) {
          const span = document.createElement('span');
          span.className = 'animate-bounce-in';
          span.style.color = demoBoard[i] === 'X' ? playerColors[0] : playerColors[1];
          span.textContent = demoBoard[i];
          button.appendChild(span);
        }
        
        gridContainer.appendChild(button);
      }
      
      container.appendChild(gridContainer);
    };

    const demoGameLoop = () => {
      const currentTime = Date.now();
      
      const result = checkWinnerDemo(demoBoard);
      if (result && !demoGameEnded) {
        demoGameEnded = true;
        onGameEnd(result);
        setTimeout(() => {
          resetDemoGame();
        }, 2000);
        animationRef.current = requestAnimationFrame(demoGameLoop);
        return;
      }
      if (!demoGameEnded && currentTime - lastMoveTime > 1500) {
        const move = getBestMove(demoBoard, aiLevel);
        if (move !== null) {
          demoBoard[move] = demoXTurn ? "X" : "O";
          demoXTurn = !demoXTurn;
          lastMoveTime = Date.now();
          renderDemoBoard();
        } else {
        }
      }
      if (demoMode) {
        animationRef.current = requestAnimationFrame(demoGameLoop);
      }
    };
    const insertDemoContainer = () => {
      const reactContainer = document.getElementById('tic_tac_toe-canvas');
      if (reactContainer) {
        reactContainer.innerHTML = `<div id="${containerId}"></div>`;
        renderDemoBoard();
        const timeoutId = setTimeout(() => {
          demoGameLoop();
        }, 500);
        return () => {
          clearTimeout(timeoutId);
        };
      }
    };
    const timeoutId = setTimeout(insertDemoContainer, 100);
    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [demoMode, aiLevel, onGameEnd, canvasWidth, canvasHeight, playerColors]);

  useEffect(() => {
    if (demoMode) return;
    if (gameEnded) {
      const timeout = setTimeout(() => {
        setBoard(Array(9).fill(null));
        setXTurn(true);
        setAnimMap(Array(9).fill(false));
        setGameEnded(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [demoMode, gameEnded]);

  const checkWinner = (b: Cell[]): Winner => {
    const lines = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6],
    ] as const;
    for (const [a, c, d] of lines) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    if (b.every((cell) => cell !== null)) return "draw";
    return null;
  };

  const makeMove = (idx: number): void => {
    if (board[idx] !== null || checkWinner(board) !== null) return;
    const next: Cell[] = [...board];
    const nextAnim = [...animMap];
    next[idx] = xTurn ? "X" : "O";
    nextAnim[idx] = true;
    setBoard(next);
    setAnimMap(nextAnim);
    setXTurn(!xTurn);
  };

  useEffect(() => {
    if (demoMode) return;
    
    const result = checkWinner(board);
    
    if (result) {
      setGameEnded(true);
      onGameEnd(result);
      return;
    }
    if (isCurrentTurnAI() && !gameEnded) {
      setAiThinking(true);
      const move = getBestMove(board, aiLevel);
      if (move !== null) {
        setTimeout(() => {
          makeMove(move);
          setAiThinking(false);
        }, 400);
      } else {
        setAiThinking(false);
      }
    }
  }, [board, xTurn, gameEnded, demoMode, mode, onGameEnd, players, aiLevel]);
  const getSymbolColor = (symbol: Cell): string => {
    if (symbol === "X") return playerColors[0];
    if (symbol === "O") return playerColors[1];
    return "";
  };

  return createElement(
    "div",
    {
      id: "tic_tac_toe-canvas",
      className: demoMode ? "" : "grid grid-cols-3 gap-2",
      style: demoMode ? "" : `width: ${canvasWidth}px; height: ${canvasHeight}px; max-height: 180px;`
    },
    demoMode ? null : board.map((val, i) =>
      createElement(
        "button",
        {
          key: i,
          onClick: () => {
            if (demoMode) return;
            if (aiThinking) return;
            if (isCurrentTurnAI()) return;
            if (gameEnded) return;
            makeMove(i);
          },
          className:
            "flex items-center justify-center themed-bg border border-gray-600 font-bold",
          style: `width: ${cellSize}px; height: ${cellSize}px; font-size: ${cellSize * 0.6}px;`
        },
        val &&
          createElement(
            "span",
            { 
              className: "animate-bounce-in",
              style: `color: ${getSymbolColor(val)};`
            },
            val
          )
      )
    )
  );
}