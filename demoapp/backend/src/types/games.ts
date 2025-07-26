// Player types
export type PlayerType = "player" | "ai";

// AI difficulty levels
export type Difficulty = "Beginner" | "Easy" | "Medium" | "Hard" | "Expert";

// Game type (pong, tic_tac_toe, connect4)
export type GameType = "pong" | "tic_tac_toe" | "connect4";

// Game mode (1v1 or 2v2)
export type GameMode = "1v1" | "2v2" | "manyvsmany";

// Match type (skirmish, ranked or tournament)
export type MatchType = "skirmish" | "ranked" | "tournament";

export type PlayerConfig = {
  id: number;
  type: PlayerType;
  color: string;
  difficulty: Difficulty;
  avatar: string;
  name?: string; // Optional name property
  userId?: number; // Optional user ID property
};

export type GameSettings = {
  gameType: GameType;
  matchType: MatchType;
  tournamentId: number | null;
  gameMode: GameMode;
  players: PlayerConfig[];
  targetScore: number;
};

export type MatchState = "created" | "started" | "ended" | "aborted";

export const DEFAULT_COLORS = [
  "#e53e3e",
  "#3182ce",
  "#38a169",
  "#d69e2e",
  "#805ad5",
  "#dd6b20",
];

export const pong1v1SkirmishDefault: GameSettings = {
  gameType: "pong",
  matchType: "skirmish",
  tournamentId: null,
  gameMode: "1v1",
  players: [
    {
      id: 0,
      type: "player",
      color: DEFAULT_COLORS[0],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "Player 1",
    },
    {
      id: 1,
      type: "ai",
      color: DEFAULT_COLORS[1],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "Marvin 2",
    },
  ],
  targetScore: 5,
};

export const pong2v2SkirmishDefault: GameSettings = {
  gameType: "pong",
  matchType: "skirmish",
  tournamentId: null,
  gameMode: "2v2",
  players: [
    {
      id: 0,
      type: "player",
      color: DEFAULT_COLORS[0],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "Player 1",
    },
    {
      id: 1,
      type: "ai",
      color: DEFAULT_COLORS[1],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "Marvin 2",
    },
    {
      id: 2,
      type: "player",
      color: DEFAULT_COLORS[2],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "Player 3",
    },
    {
      id: 3,
      type: "ai",
      color: DEFAULT_COLORS[3],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "Marvin 4",
    },
  ],
  targetScore: 5,
};

export const pong1v1RankedDefault: GameSettings = {
  gameType: "pong",
  matchType: "ranked",
  tournamentId: null,
  gameMode: "1v1",
  players: [
    {
      id: 0,
      type: "player",
      color: DEFAULT_COLORS[0],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "",
    },
    {
      id: 1,
      type: "player",
      color: DEFAULT_COLORS[1],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "",
    },
  ],
  targetScore: 5,
};

export const pong2v2RankedDefault: GameSettings = {
  gameType: "pong",
  matchType: "ranked",
  tournamentId: null,
  gameMode: "2v2",
  players: [
    {
      id: 0,
      type: "player",
      color: DEFAULT_COLORS[0],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "",
    },
    {
      id: 1,
      type: "player",
      color: DEFAULT_COLORS[1],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "",
    },
    {
      id: 2,
      type: "player",
      color: DEFAULT_COLORS[2],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "",
    },
    {
      id: 3,
      type: "player",
      color: DEFAULT_COLORS[3],
      difficulty: "Medium",
      avatar: "default-avatar.png",
      name: "",
    },
  ],
  targetScore: 5,
};
