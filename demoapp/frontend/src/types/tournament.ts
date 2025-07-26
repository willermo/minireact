import type { Match } from "./matches";

// Tournament types mirroring backend types
export type GameType = "pong" | "tic_tac_toe" | "connect4";
export type GameMode = "1v1" | "2v2";
export type TournamentStatus = "pending" | "active" | "completed" | "cancelled";

// Basic tournament structure
export interface Tournament {
  id: number;
  name: string;
  gameType: GameType;
  gameMode: GameMode;
  status: TournamentStatus;
  createdBy: number;
  winnerId?: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  metadata?: Record<string, any>;
}

// Tournament participant
export interface TournamentParticipant {
  id: number;
  tournamentId: number;
  userId: number;
  joinedAt: string;
  user?: {
    displayName: string;
    avatarFilename?: string;
  };
}

// Tournament ladder entry
export interface TournamentLadderEntry {
  userId: number;
  displayName: string;
  avatar: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesDraw: number;
  gamesLost: number;
  points: number;
  rank: number;
}

// Enriched tournament with participants, matches, and ladder
export interface EnrichedTournament extends Tournament {
  participants: TournamentParticipant[];
  matches?: Match[];
  ladder?: TournamentLadderEntry[];
}

// API Request types
export interface CreateTournamentRequest {
  name: string;
  gameType: GameType;
  gameMode: GameMode;
}

export interface JoinTournamentRequest {
  userId: number;
  password: string;
}

// API Response types
export interface TournamentResponse {
  message: string;
  data: Tournament;
}

export interface EnrichedTournamentResponse {
  message: string;
  data: EnrichedTournament;
}

export interface TournamentsResponse {
  message: string;
  data: EnrichedTournament[];
}

export interface TournamentParticipantResponse {
  message: string;
  data: TournamentParticipant;
}
