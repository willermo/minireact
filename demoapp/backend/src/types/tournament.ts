import type { PublicUser } from "./user";
import type { GameType, GameMode } from "./games";
import type { EnrichedMatch } from "./matches";

/***********************
 *                     *
 *  Tournament Types   *
 *                     *
 ***********************/

export type TournamentStatus = "pending" | "active" | "completed" | "cancelled";

export type TournamentParticipantDTO = {
  id: number;
  tournament_id: number;
  user_id: number;
  joined_at: string;
};

export type TournamentParticipant = {
  id: number;
  tournamentId: number;
  userId: number;
  joinedAt: string;
};

export type EnrichedTournamentParticipantDTO = TournamentParticipantDTO & {
  user: {
    display_name: string;
    avatar_filename: string;
  };
};

export type EnrichedTournamentParticipant = TournamentParticipant & {
  user: {
    displayName: string;
    avatar: string;
  };
};

export type TournamentDTO = {
  id: number;
  name: string;
  game_type: GameType;
  game_mode: GameMode;
  status: TournamentStatus;
  created_by: number;
  winner_id: number | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  metadata: Record<string, any> | null;
};

export type Tournament = {
  id: number;
  name: string;
  gameType: GameType;
  gameMode: GameMode;
  status: TournamentStatus;
  createdBy: number;
  winnerId: number | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  metadata: Record<string, any> | null;
};

export type EnrichedTournamentDTO = TournamentDTO & {
  participants: EnrichedTournamentParticipantDTO[];
  matches?: EnrichedMatch[];
};

export type EnrichedTournament = Tournament & {
  participants: EnrichedTournamentParticipant[];
  matches?: EnrichedMatch[];
};

// Tournament ladder entry for displaying standings
export type TournamentLadderEntry = {
  userId: number;
  displayName: string;
  avatar: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesDraw: number;
  gamesLost: number;
  points: number;
  rank: number;
};

/***********************
 *                     *
 *  Mapping Functions  *
 *                     *
 ***********************/

export function mapTournamentDTOToTournament(dto: TournamentDTO): Tournament {
  return {
    id: dto.id,
    name: dto.name,
    gameType: dto.game_type,
    gameMode: dto.game_mode,
    status: dto.status,
    createdBy: dto.created_by,
    winnerId: dto.winner_id,
    createdAt: dto.created_at,
    startedAt: dto.started_at,
    endedAt: dto.ended_at,
    metadata: dto.metadata,
  };
}

export function mapTournamentToTournamentDTO(
  tournament: Tournament
): TournamentDTO {
  return {
    id: tournament.id,
    name: tournament.name,
    game_type: tournament.gameType,
    game_mode: tournament.gameMode,
    status: tournament.status,
    created_by: tournament.createdBy,
    winner_id: tournament.winnerId,
    created_at: tournament.createdAt,
    started_at: tournament.startedAt,
    ended_at: tournament.endedAt,
    metadata: tournament.metadata,
  };
}

export function mapTournamentParticipantDTOToTournamentParticipant(
  dto: TournamentParticipantDTO
): TournamentParticipant {
  return {
    id: dto.id,
    tournamentId: dto.tournament_id,
    userId: dto.user_id,
    joinedAt: dto.joined_at,
  };
}

export function mapEnrichedTournamentParticipantDTOToEnrichedTournamentParticipant(
  dto: EnrichedTournamentParticipantDTO
): EnrichedTournamentParticipant {
  return {
    id: dto.id,
    tournamentId: dto.tournament_id,
    userId: dto.user_id,
    joinedAt: dto.joined_at,
    user: {
      displayName: dto.user.display_name,
      avatar: dto.user.avatar_filename,
    },
  };
}

export function mapEnrichedTournamentDTOToEnrichedTournament(
  dto: EnrichedTournamentDTO
): EnrichedTournament {
  return {
    ...mapTournamentDTOToTournament(dto),
    participants: dto.participants.map(
      mapEnrichedTournamentParticipantDTOToEnrichedTournamentParticipant
    ),
    matches: dto.matches,
  };
}

/***********************
 *                     *
 *  Helper Functions   *
 *                     *
 ***********************/

// Generate round robin matches for tournament participants
export function generateRoundRobinMatches(
  participantIds: number[]
): Array<[number, number]> {
  const matches: Array<[number, number]> = [];

  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      matches.push([participantIds[i], participantIds[j]]);
    }
  }

  return matches;
}

// Calculate tournament ladder from matches
export function calculateTournamentLadder(
  participants: EnrichedTournamentParticipant[],
  matches: EnrichedMatch[]
): TournamentLadderEntry[] {
  const ladder: TournamentLadderEntry[] = participants.map(participant => ({
    userId: participant.userId,
    displayName: participant.user.displayName,
    avatar: participant.user.avatar,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesDraw: 0,
    gamesLost: 0,
    points: 0,
    rank: 0,
  }));

  // Process completed matches
  matches
    .filter(match => match.state === "ended")
    .forEach(match => {
      const participants = match.participants;
      if (participants.length !== 2) return; // Only handle 1v1 matches

      const [player1, player2] = participants;
      const player1Entry = ladder.find(
        entry => entry.userId === player1.userId
      );
      const player2Entry = ladder.find(
        entry => entry.userId === player2.userId
      );

      if (!player1Entry || !player2Entry) return;

      // Update games played
      player1Entry.gamesPlayed++;
      player2Entry.gamesPlayed++;

      // Determine winner and update stats
      const hasWinner = participants.some(p => p.isWinner);

      if (!hasWinner) {
        // Draw
        player1Entry.gamesDraw++;
        player2Entry.gamesDraw++;
        player1Entry.points += 1;
        player2Entry.points += 1;
      } else {
        // Someone won
        if (player1.isWinner) {
          player1Entry.gamesWon++;
          player2Entry.gamesLost++;
          player1Entry.points += 3;
        } else {
          player2Entry.gamesWon++;
          player1Entry.gamesLost++;
          player2Entry.points += 3;
        }
      }
    });

  // Sort by points (descending), then by games won, then by games played
  const sortedLadder = ladder.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
    return b.gamesPlayed - a.gamesPlayed;
  });

  // Assign ranks
  sortedLadder.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return sortedLadder;
}

/***********************
 *                     *
 *  Request Types      *
 *                     *
 ***********************/

export type CreateTournamentRequest = {
  name: string;
  gameType: GameType;
  gameMode: GameMode;
};

export type JoinTournamentRequest = {
  userId: number;
  password: string;
};
