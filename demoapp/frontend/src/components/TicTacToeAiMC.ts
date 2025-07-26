export type Cell = "X" | "O" | null;
export type Winner = "X" | "O" | "draw" | null;

const SIMULATIONS: Record<number, number> = {
  4: 250,
  5: 500,
};
export function getBestMove(board: Cell[], level: number): number | null {
  const available = board
    .map((v, i) => (v === null ? i : null))
    .filter((i): i is number => i !== null);
  if (available.length === 0) return null;
  if (level === 1) {
    return randomChoice(available);
  }
  if (level === 2 || level === 3) {
    const threshold = level === 2 ? 0.6 : 0.3;
    if (Math.random() < threshold) {
      return randomChoice(available);
    }
  }
  const sims = SIMULATIONS[level] ?? 100;
  return monteCarloMove(board, "O", sims);
}
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function monteCarloMove(board: Cell[], player: "X" | "O", simulations: number): number {
  const available = board
    .map((v, i) => (v === null ? i : null))
    .filter((i): i is number => i !== null);
  let bestMove = available[0];
  let bestScore = -Infinity;
  for (const move of available) {
    let wins = 0;
    for (let i = 0; i < simulations; i++) {
      const result = simulateRandomPlayout(applyMove(board, move, player), opponent(player));
      if (result === player) wins++;
      else if (result === "draw") wins += 0.5;
    }
    const winRate = wins / simulations;
    if (winRate > bestScore) {
      bestScore = winRate;
      bestMove = move;
    }
  }
  return bestMove;
}
function applyMove(board: Cell[], index: number, player: "X" | "O"): Cell[] {
  const newBoard = board.slice();
  newBoard[index] = player;
  return newBoard;
}
function opponent(player: "X" | "O"): "X" | "O" {
  return player === "O" ? "X" : "O";
}
function simulateRandomPlayout(startBoard: Cell[], turn: "X" | "O"): Winner {
  const board = startBoard.slice();
  let current = turn;
  while (true) {
    const avail = board
      .map((v, i) => (v === null ? i : null))
      .filter((i): i is number => i !== null);
    const winner = checkWinner(board);
    if (winner !== null) return winner;
    const move = randomChoice(avail);
    board[move] = current;
    current = opponent(current);
  }
}

function checkWinner(b: Cell[]): Winner {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ] as const;

  for (const [a, c, d] of lines) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) {
      return b[a];
    }
  }
  if (b.every(cell => cell !== null)) return "draw";
  return null;
}
