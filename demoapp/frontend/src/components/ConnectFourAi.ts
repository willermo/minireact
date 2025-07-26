import type { PlayerConfig } from '../types/games';

export function getAiMove(
  board: (number | null)[][],
  playerIndex: number,
  players: PlayerConfig[]
): number | null {
  const difficulty = players[playerIndex].difficulty || 'Easy';
  
  const validCols = getValidMoves(board);
  if (validCols.length === 0) {
    return null;
  }

  if (difficulty === 'Easy') {
    const move = validCols[Math.floor(Math.random() * validCols.length)];
    return move;
  }

  const drop = (col: number, idx: number) => {
    const newBoard = board.map((row) => row.slice());
    for (let r = newBoard.length - 1; r >= 0; r--) {
      if (newBoard[r][col] === null) {
        newBoard[r][col] = idx;
        break;
      }
    }
    return newBoard;
  };

  if (difficulty === 'Medium') {
    for (let col of validCols) {
      const nextBoard = drop(col, playerIndex);
      if (isWinningMove(nextBoard, playerIndex)) {
        return col;
      }
    }
    
    const nextPlayer = (playerIndex + 1) % players.length;
    for (let col of validCols) {
      const opponentBoard = drop(col, nextPlayer);
      if (isWinningMove(opponentBoard, nextPlayer)) {
        return col;
      }
    }
    
    return validCols[Math.floor(Math.random() * validCols.length)];
  }

  if (difficulty === 'Hard' || difficulty === 'Expert') {
    for (let col of validCols) {
      const nextBoard = drop(col, playerIndex);
      if (isWinningMove(nextBoard, playerIndex)) {
        return col;
      }
    }
    
    const nextPlayer = (playerIndex + 1) % players.length;
    for (let col of validCols) {
      const opponentBoard = drop(col, nextPlayer);
      if (isWinningMove(opponentBoard, nextPlayer)) {
        return col;
      }
    }
    
    if (difficulty === 'Expert') {
      for (let col1 of validCols) {
        const board1 = drop(col1, playerIndex);
        const validCols2 = getValidMoves(board1);
        
        let forcedWin = true;
        for (let col2 of validCols2) {
          const board2 = drop.call({}, col2, nextPlayer);
          const validCols3 = getValidMoves(board2);
          
          let canWin = false;
          for (let col3 of validCols3) {
            const board3 = drop.call({}, col3, playerIndex);
            if (isWinningMove(board3, playerIndex)) {
              canWin = true;
              break;
            }
          }
          
          if (!canWin) {
            forcedWin = false;
            break;
          }
        }
        
        if (forcedWin) {
          return col1;
        }
      }
    }
    
    for (let col of validCols) {
      const board1 = drop(col, playerIndex);
      const nextMoves = getValidMoves(board1);
      
      let threatCount = 0;
      for (let nextCol of nextMoves) {
        const board2 = drop.call({}, nextCol, playerIndex);
        if (isWinningMove(board2, playerIndex)) {
          threatCount++;
        }
      }
      
      if (threatCount >= 2) {
        return col;
      }
    }
    
    const center = Math.floor(board[0].length / 2);
    if (validCols.includes(center)) {
      return center;
    }
    
    return validCols[Math.floor(Math.random() * validCols.length)];
  }
  
  return validCols[Math.floor(Math.random() * validCols.length)];
}

function isWinningMove(board: (number | null)[][], playerIndex: number): boolean {
  const ROWS = board.length;
  const COLS = board[0].length;
  
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (board[r][c] === playerIndex && 
          board[r][c+1] === playerIndex && 
          board[r][c+2] === playerIndex && 
          board[r][c+3] === playerIndex) {
        return true;
      }
    }
  }
  
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === playerIndex && 
          board[r+1][c] === playerIndex && 
          board[r+2][c] === playerIndex && 
          board[r+3][c] === playerIndex) {
        return true;
      }
    }
  }
  
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (board[r][c] === playerIndex && 
          board[r+1][c+1] === playerIndex && 
          board[r+2][c+2] === playerIndex && 
          board[r+3][c+3] === playerIndex) {
        return true;
      }
    }
  }
  
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 3; c < COLS; c++) {
      if (board[r][c] === playerIndex && 
          board[r+1][c-1] === playerIndex && 
          board[r+2][c-2] === playerIndex && 
          board[r+3][c-3] === playerIndex) {
        return true;
      }
    }
  }
  
  return false;
}

function getValidMoves(board: (number | null)[][]): number[] {
  const validMoves = [];
  for (let c = 0; c < board[0].length; c++) {
    if (board[0][c] === null) {
      validMoves.push(c);
    }
  }
  return validMoves;
}