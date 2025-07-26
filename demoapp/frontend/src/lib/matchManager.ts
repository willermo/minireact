import type { GameSettings } from "../types/games";

import type {
  MatchSettings,
  MatchParticipant,
  MatchCreationRequestBody,
  JSONValue,
} from "../types/matches";

import { apiFetch } from "../lib/api";

export const createMatch = async (
  gameSettings: GameSettings,
  creatorID: number
) => {
  const matchSettings: MatchSettings = {
    gameType: gameSettings.gameType,
    matchType: gameSettings.matchType,
    tournamentId: gameSettings.tournamentId,
    gameMode: gameSettings.gameMode,
    createdBy: creatorID,
    state: "created",
    createdAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
    metadata: {
      targetScore: gameSettings.targetScore,
      result: null,
    },
  };
  const participants: MatchParticipant[] = gameSettings.players.map(player => ({
    userId: player.userId!,
    isWinner: false,
  }));

  const matchParams: MatchCreationRequestBody = {
    matchSettings,
    participants,
  };
  try {
    const response = await apiFetch("/api/games/create-match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(matchParams),
    });
    if (response.ok) {
      const { data } = await response.json();
      return data.id;
    }
  } catch (error) {
    console.error("Error creating game:", error);
    return null;
  }
};

export const startMatch = async (matchId: number) => {
  try {
    await apiFetch(`/api/games/matches/${matchId}/start`, {
      method: "PATCH",
    });
  } catch (error) {
    console.error("Error starting game:", error);
  }
};

export const createAndStartMatch = async (
  gameSettings: GameSettings,
  creatorID: number
) => {
  const matchId = await createMatch(gameSettings, creatorID);
  if (matchId) {
    await startMatch(matchId);
    return matchId;
  }
  return null;
};

export const abortMatch = async (matchId: number) => {
  try {
    await apiFetch(`/api/games/matches/${matchId}/abort`, {
      method: "PATCH",
    });
  } catch (error) {
    console.error("Error aborting game:", error);
  }
};

export const endMatch = async (
  gameSettings: GameSettings,
  matchId: number,
  winnerId: number,
  updatedMetadata: Record<string, JSONValue>
) => {
  const winners: number[] = [];

  if (gameSettings.gameType === "pong") {
    if (winnerId === 0) {
      winners.push(gameSettings.players[0].userId!);
    } else if (winnerId === 1) {
      winners.push(gameSettings.players[1].userId!);
    }
    if (gameSettings.gameMode === "2v2") {
      if (winnerId === 0) {
        winners.push(gameSettings.players[2].userId!);
      } else if (winnerId === 1) {
        winners.push(gameSettings.players[3].userId!);
      }
    }
  } else if (gameSettings.gameType === "connect4") {
    if (winnerId >= 0 && winnerId < gameSettings.players.length) {
      winners.push(gameSettings.players[winnerId].userId!);
    }
  } else if (gameSettings.gameType === "tic_tac_toe") {
    if (winnerId >= 0 && winnerId < gameSettings.players.length) {
      winners.push(gameSettings.players[winnerId].userId!);
    }
  }

  try {
    await apiFetch(`/api/games/matches/${matchId}/end`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ winners, updatedMetadata }),
    });
  } catch (error) {
    console.error("Error ending game:", error);
  }
};
