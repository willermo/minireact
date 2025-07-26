import type { GameType, MatchType, GameMode, MatchState } from "./games";

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/***********************
 *                     *
 *  Match Participant  *
 *                     *
 ***********************/

export type MatchParticipantInfo = {
  displayName: string;
  avatar: string;
  isWinner: boolean;
};

export type MatchParticipantDTO = {
  user_id: number;
  is_winner: boolean;
};

export type MatchParticipant = {
  userId: number;
  isWinner: boolean;
};

export type EnrichedMatchParticipantDTO = MatchParticipantDTO & {
  user?: {
    displayName: string;
    avatar: string;
  };
};

export type EnrichedMatchParticipant = MatchParticipant & {
  user?: {
    displayName: string;
    avatar: string;
  };
};

export function mapMatchParticipantDTOToMatchParticipant(
  dto: MatchParticipantDTO
): MatchParticipant {
  return {
    userId: dto.user_id,
    isWinner: dto.is_winner,
  } as MatchParticipant;
}

export function mapMatchParticipantToMatchParticipantDTO(
  participant: MatchParticipant
): MatchParticipantDTO {
  return {
    user_id: participant.userId,
    is_winner: participant.isWinner,
  } as MatchParticipantDTO;
}

export function mapEnrichedMatchParticipantDTOToEnrichedMatchParticipant(
  dto: EnrichedMatchParticipantDTO
): EnrichedMatchParticipant {
  return {
    userId: dto.user_id,
    isWinner: dto.is_winner,
    user: dto.user,
  } as EnrichedMatchParticipant;
}

export function mapEnrichedMatchParticipantToEnrichedMatchParticipantDTO(
  participant: EnrichedMatchParticipant
): EnrichedMatchParticipantDTO {
  return {
    user_id: participant.userId,
    is_winner: participant.isWinner,
    user: participant.user,
  } as EnrichedMatchParticipantDTO;
}

/********************
 *                  *
 *  Match Settings  *
 *                  *
 ********************/

export type MatchSettingsDTO = {
  game_type: GameType;
  match_type: Omit<MatchType, "skirmish">;
  tournament_id: number | null;
  game_mode: GameMode;
  created_by: number;
  state: MatchState;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  metadata: Record<string, JSONValue>;
};

export type MatchSettings = {
  gameType: GameType;
  matchType: Omit<MatchType, "skirmish">;
  tournamentId: number | null;
  gameMode: GameMode;
  createdBy: number;
  state: MatchState;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  metadata: Record<string, JSONValue>;
};

export function mapMatchSettingsDTOToMatchSettings(
  dto: MatchSettingsDTO
): MatchSettings {
  return {
    gameType: dto.game_type,
    matchType: dto.match_type,
    tournamentId: dto.tournament_id,
    gameMode: dto.game_mode,
    createdBy: dto.created_by,
    state: dto.state,
    createdAt: dto.created_at,
    startedAt: dto.started_at,
    endedAt: dto.ended_at,
    metadata: dto.metadata,
  } as MatchSettings;
}

export function mapMatchSettingsToMatchSettingsDTO(
  settings: MatchSettings
): MatchSettingsDTO {
  return {
    game_type: settings.gameType,
    match_type: settings.matchType,
    tournament_id: settings.tournamentId,
    game_mode: settings.gameMode,
    created_by: settings.createdBy,
    state: settings.state,
    created_at: settings.createdAt,
    started_at: settings.startedAt,
    ended_at: settings.endedAt,
    metadata: settings.metadata,
  } as MatchSettingsDTO;
}

export type MatchDTO = {
  id: number;
  game_type: GameType;
  match_type: Omit<MatchType, "skirmish">;
  tournament_id: number | null;
  game_mode: GameMode;
  created_by: number;
  state: MatchState;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  metadata: Record<string, JSONValue>;
  participants: MatchParticipantDTO[];
};

export type Match = {
  id: number;
  gameType: GameType;
  matchType: Omit<MatchType, "skirmish">;
  tournamentId: number | null;
  gameMode: GameMode;
  createdBy: number;
  state: MatchState;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  metadata: Record<string, JSONValue>;
  participants: MatchParticipant[];
};

export type EnrichedMatchDTO = Omit<MatchDTO, "participants"> & {
  participants: EnrichedMatchParticipantDTO[];
};

export type EnrichedMatch = Omit<Match, "participants"> & {
  participants: EnrichedMatchParticipant[];
};

export function mapMatchDTOToMatch(dto: MatchDTO): Match {
  return {
    id: dto.id,
    gameType: dto.game_type,
    matchType: dto.match_type,
    tournamentId: dto.tournament_id,
    gameMode: dto.game_mode,
    createdBy: dto.created_by,
    state: dto.state,
    createdAt: dto.created_at,
    startedAt: dto.started_at,
    endedAt: dto.ended_at,
    metadata: dto.metadata,
    participants: dto.participants.map(
      mapMatchParticipantDTOToMatchParticipant
    ),
  } as Match;
}

export function mapMatchToMatchDTO(match: Match): MatchDTO {
  return {
    id: match.id,
    game_type: match.gameType,
    match_type: match.matchType,
    tournament_id: match.tournamentId,
    game_mode: match.gameMode,
    created_by: match.createdBy,
    state: match.state,
    created_at: match.createdAt,
    started_at: match.startedAt,
    ended_at: match.endedAt,
    metadata: match.metadata,
    participants: match.participants.map(
      mapMatchParticipantToMatchParticipantDTO
    ),
  } as MatchDTO;
}

export function mapEnrichedMatchDTOToEnrichedMatch(
  dto: EnrichedMatchDTO
): EnrichedMatch {
  return {
    id: dto.id,
    gameType: dto.game_type,
    matchType: dto.match_type,
    tournamentId: dto.tournament_id,
    gameMode: dto.game_mode,
    createdBy: dto.created_by,
    state: dto.state,
    createdAt: dto.created_at,
    startedAt: dto.started_at,
    endedAt: dto.ended_at,
    metadata: dto.metadata,
    participants: dto.participants.map(
      mapEnrichedMatchParticipantDTOToEnrichedMatchParticipant
    ),
  } as EnrichedMatch;
}

export function mapEnrichedMatchToEnrichedMatchDTO(
  match: EnrichedMatch
): EnrichedMatchDTO {
  return {
    id: match.id,
    game_type: match.gameType,
    match_type: match.matchType,
    tournament_id: match.tournamentId,
    game_mode: match.gameMode,
    created_by: match.createdBy,
    state: match.state,
    created_at: match.createdAt,
    started_at: match.startedAt,
    ended_at: match.endedAt,
    metadata: match.metadata,
    participants: match.participants.map(
      mapEnrichedMatchParticipantToEnrichedMatchParticipantDTO
    ),
  } as EnrichedMatchDTO;
}

/**********************
 *                    *
 *  Match db schemas  *
 *                    *
 **********************/
export type MatchCreationRequestBody = {
  matchSettings: MatchSettings;
  participants: MatchParticipant[];
};
