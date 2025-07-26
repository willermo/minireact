import { FastifyReply, FastifyRequest } from "fastify";
import db from "../../db/index.js";
import {
  mapMatchParticipantToMatchParticipantDTO,
  mapMatchSettingsToMatchSettingsDTO,
  mapEnrichedMatchDTOToEnrichedMatch,
  mapMatchDTOToMatch,
} from "../../types/matches";

import type {
  MatchDTO,
  Match,
  EnrichedMatch,
  EnrichedMatchDTO,
  MatchParticipantDTO,
  EnrichedMatchParticipantDTO,
} from "../../types/matches";

import type { MatchState } from "../../types/games";

import type {
  GetMatchesRequest,
  GetUserMatchesRequest,
  CreateMatchRequest,
  StartMatchRequest,
  EndMatchRequest,
  AbortMatchRequest,
  GetMatchDetailRequest,
  GetTournamentMatchDetailsRequest,
} from "./schemas";

export const GameController = {
  /***************************************
   *                                     *
   *   Debug and monitoring endpoints    *
   *                                     *
   ***************************************/

  /**
   * Get game service status - health check endpoint
   * Returns 200 OK if the game service is running correctly
   *
   * @async
   * @param {FastifyRequest} request - The Fastify request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<void>} - Promise that resolves when the status is sent
   */
  async getStatus(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({ status: "Game service ready" });
  },

  /********************
   *                  *
   *  Game endpoints  *
   *                  *
   ********************/

  /**
   * Get global match history
   * Returns a list of matches ordered by creation time (descending)
   *
   * @async
   * @param {FastifyRequest} request - The Fastify request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<void>} - Promise that resolves when the history is sent
   * @throws {500} - If an error occurs (INTERNAL_SERVER_ERROR)
   */
  async getMatches(
    request: FastifyRequest<GetMatchesRequest>,
    reply: FastifyReply
  ) {
    try {
      // Get base match data - only retrieve ended or aborted matches
      const matches = await db("matches")
        .select("*")
        .whereIn("state", ["ended", "aborted"])
        .orderBy("created_at", "desc")
        .limit(20);

      // Process matches with enriched participant data
      const enrichedMatchesDTO: EnrichedMatchDTO[] = await Promise.all(
        matches.map(async match => {
          // Get participants for this match
          const participantsDTO = await db("match_participants")
            .where("match_id", match.id)
            .select("*");

          // Get user data for all participants in a single query
          const userIds = participantsDTO.map(p => p.user_id);
          const users = await db("users")
            .whereIn("id", userIds)
            .select("id", "display_name", "avatar_filename");

          // Create a user lookup map
          interface UserInfoMap {
            [userId: number]: {
              displayName: string;
              avatar: string;
            };
          }

          const userMap = users.reduce<UserInfoMap>((acc, user) => {
            acc[user.id] = {
              displayName: user.display_name,
              avatar: user.avatar_filename,
            };
            return acc;
          }, {} as UserInfoMap);

          // Enrich participants with user data
          const enrichedParticipantsDTO: EnrichedMatchParticipantDTO[] =
            participantsDTO.map(
              participant =>
                ({
                  user_id: participant.user_id,
                  is_winner: !!participant.is_winner,
                  user: userMap[participant.user_id],
                } as EnrichedMatchParticipantDTO)
            );

          // Create the EnrichedMatchDTO
          return {
            id: match.id,
            game_type: match.game_type,
            match_type: match.match_type,
            tournament_id: match.tournament_id,
            game_mode: match.game_mode,
            created_by: match.created_by,
            state: match.state,
            created_at: match.created_at,
            started_at: match.started_at,
            ended_at: match.ended_at,
            metadata: match.metadata,
            participants: enrichedParticipantsDTO,
          } as EnrichedMatchDTO;
        })
      );

      // Convert the DTO to frontend format for the response
      const enrichedMatches = enrichedMatchesDTO.map(
        mapEnrichedMatchDTOToEnrichedMatch
      );

      return reply.status(200).send({
        message: "Matches fetched successfully",
        data: enrichedMatches,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error fetching matches",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * Get global match history
   * Returns a list of matches ordered by creation time (descending)
   *
   * @async
   * @param {FastifyRequest} request - The Fastify request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<void>} - Promise that resolves when the history is sent
   * @throws {500} - If an error occurs (INTERNAL_SERVER_ERROR)
   */
  async getTournamentMatches(
    request: FastifyRequest<GetMatchesRequest>,
    reply: FastifyReply
  ) {
    try {
      // Get base match data - only retrieve ended or aborted matches
      const matches = await db("matches")
        .select("*")
        .whereIn("state", ["created", "started"]);

      // Process matches with enriched participant data
      const enrichedMatchesDTO: EnrichedMatchDTO[] = await Promise.all(
        matches.map(async match => {
          // Get participants for this match
          const participantsDTO = await db("match_participants")
            .where("match_id", match.id)
            .select("*");

          // Get user data for all participants in a single query
          const userIds = participantsDTO.map(p => p.user_id);
          const users = await db("users")
            .whereIn("id", userIds)
            .select("id", "display_name", "avatar_filename");

          // Create a user lookup map
          interface UserInfoMap {
            [userId: number]: {
              displayName: string;
              avatar: string;
            };
          }

          const userMap = users.reduce<UserInfoMap>((acc, user) => {
            acc[user.id] = {
              displayName: user.display_name,
              avatar: user.avatar_filename,
            };
            return acc;
          }, {} as UserInfoMap);

          // Enrich participants with user data
          const enrichedParticipantsDTO: EnrichedMatchParticipantDTO[] =
            participantsDTO.map(
              participant =>
                ({
                  user_id: participant.user_id,
                  is_winner: !!participant.is_winner,
                  user: userMap[participant.user_id],
                } as EnrichedMatchParticipantDTO)
            );

          // Create the EnrichedMatchDTO
          return {
            id: match.id,
            game_type: match.game_type,
            match_type: match.match_type,
            tournament_id: match.tournament_id,
            game_mode: match.game_mode,
            created_by: match.created_by,
            state: match.state,
            created_at: match.created_at,
            started_at: match.started_at,
            ended_at: match.ended_at,
            metadata: match.metadata,
            participants: enrichedParticipantsDTO,
          } as EnrichedMatchDTO;
        })
      );

      // Convert the DTO to frontend format for the response
      const enrichedMatches = enrichedMatchesDTO.map(
        mapEnrichedMatchDTOToEnrichedMatch
      );

      return reply.status(200).send({
        message: "Matches fetched successfully",
        data: enrichedMatches,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error fetching matches",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * Get user match history
   * Returns a list of matches for a specific user ordered by creation time (descending)
   *
   * @async
   * @param {FastifyRequest} request - The Fastify request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<void>} - Promise that resolves when the history is sent
   * @throws {401} - If user is not authenticated (UNAUTHORIZED)
   * @throws {500} - If an error occurs (INTERNAL_SERVER_ERROR)
   */
  async getUserMatches(
    request: FastifyRequest<GetUserMatchesRequest>,
    reply: FastifyReply
  ) {
    try {
      const userId = parseInt(request.params.userId);

      // Get match IDs where user is a participant
      const matchIds = await db("match_participants")
        .where("user_id", userId)
        .pluck("match_id");

      if (matchIds.length === 0) {
        return reply.status(200).send({
          message: "No matches found for this user",
          data: [],
        });
      }

      // Get base match data for matches where user is a participant
      const matches = await db("matches")
        .whereIn("id", matchIds)
        .whereIn("state", ["ended", "aborted"])
        .select("*")
        .orderBy("created_at", "desc");

      // Process matches with enriched participant data
      const enrichedMatchesDTO: EnrichedMatchDTO[] = (await Promise.all(
        matches.map(async match => {
          // Get participants for this match
          const participantsDTO = await db("match_participants")
            .where("match_id", match.id)
            .select("*");

          // Get user data for all participants in a single query
          const userIds = participantsDTO.map(p => p.user_id);
          const users = await db("users")
            .whereIn("id", userIds)
            .select("id", "display_name", "avatar_filename");

          // Create a user lookup map
          interface UserInfoMap {
            [userId: number]: {
              displayName: string;
              avatar: string;
            };
          }

          const userMap = users.reduce<UserInfoMap>((acc, user) => {
            acc[user.id] = {
              displayName: user.display_name,
              avatar: user.avatar_filename,
            };
            return acc;
          }, {} as UserInfoMap);

          // Enrich participants with user data
          const enrichedParticipantsDTO: EnrichedMatchParticipantDTO[] =
            participantsDTO.map(
              participant =>
                ({
                  user_id: participant.user_id,
                  is_winner: !!participant.is_winner,
                  user: userMap[participant.user_id],
                } as EnrichedMatchParticipantDTO)
            );

          // Create the EnrichedMatchDTO
          return {
            id: match.id,
            game_type: match.game_type,
            match_type: match.match_type,
            tournament_id: match.tournament_id,
            game_mode: match.game_mode,
            created_by: match.created_by,
            state: match.state,
            created_at: match.created_at,
            started_at: match.started_at,
            ended_at: match.ended_at,
            metadata: match.metadata,
            participants: enrichedParticipantsDTO,
          } as EnrichedMatchDTO;
        })
      )) as EnrichedMatchDTO[];

      // Convert the DTO to frontend format for the response
      const enrichedMatches = enrichedMatchesDTO.map(
        mapEnrichedMatchDTOToEnrichedMatch
      );

      return reply.status(200).send({
        message: "User matches fetched successfully",
        data: enrichedMatches,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error fetching user match history",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * Create a new match
   *
   * @async
   * @param {FastifyRequest} request - Fastify request
   * @param {FastifyReply} reply - Fastify reply
   * @returns {Promise<void>} - Promise that resolves when the match is created
   * @throws {401} - If user is not authenticated (UNAUTHORIZED)
   * @throws {500} - If an error occurs (INTERNAL_SERVER_ERROR)
   */
  async createMatch(
    request: FastifyRequest<CreateMatchRequest>,
    reply: FastifyReply
  ) {
    try {
      const { matchSettings, participants } = request.body;
      const {
        game_type,
        match_type,
        tournament_id,
        game_mode,
        created_by,
        state,
        created_at,
        started_at,
        ended_at,
        metadata,
      } = mapMatchSettingsToMatchSettingsDTO(matchSettings);
      const participantsDTO = participants.map(participant =>
        mapMatchParticipantToMatchParticipantDTO(participant)
      );
      const [matchId] = await db("matches").insert({
        game_type,
        match_type,
        tournament_id,
        game_mode,
        created_by,
        state,
        created_at,
        started_at,
        ended_at,
        metadata,
      });
      await db("match_participants").insert(
        participantsDTO.map((p: any) => ({
          match_id: matchId,
          user_id: p.user_id,
          is_winner: false,
        }))
      );
      const created = await db("matches").where("id", matchId).first();
      const ps = await db("match_participants").where("match_id", matchId);
      const dataDTO = {
        ...created,
        participants: ps.map((p: any) => ({
          user_id: p.user_id,
          is_winner: !!p.is_winner,
        })),
      };
      const data = mapEnrichedMatchDTOToEnrichedMatch(dataDTO);
      return reply.status(201).send({ message: "Match created", data });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error creating match",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * start an existing match
   *
   * @async
   * @param {FastifyRequest} request - Fastify request
   * @param {FastifyReply} reply - Fastify reply
   * @returns {Promise<void>} - Promise that resolves when the match is started
   * @throws {404} - If match not found (MATCH_NOT_FOUND)
   * @throws {400} - If cannot start match in current state (INVALID_MATCH_STATE)
   * @throws {500} - If an error occurs (INTERNAL_SERVER_ERROR)
   */
  async startMatch(
    request: FastifyRequest<StartMatchRequest>,
    reply: FastifyReply
  ) {
    try {
      const { matchId: matchIdStr } = request.params as { matchId: string };
      const matchId = parseInt(matchIdStr, 10);

      if (isNaN(matchId)) {
        return reply.status(400).send({
          message: "Invalid match ID format",
          code: "INVALID_MATCH_ID",
        });
      }
      const match = await db("matches").where("id", matchId).first();
      if (!match) {
        return reply
          .status(404)
          .send({ message: "Match not found", code: "MATCH_NOT_FOUND" });
      }
      if (["ended", "aborted"].includes(match.state)) {
        return reply.status(400).send({
          message: "Cannot start match in current state",
          code: "INVALID_MATCH_STATE",
        });
      }
      await db("matches")
        .where("id", matchId)
        .update({ state: "started", started_at: new Date().toISOString() });
      const updated = await db("matches").where("id", matchId).first();
      const ps = await db("match_participants").where("match_id", matchId);
      const dataDTO = {
        ...updated,
        participants: ps.map((p: any) => ({
          user_id: p.user_id,
          is_winner: !!p.is_winner,
        })),
      };
      const data = mapEnrichedMatchDTOToEnrichedMatch(dataDTO);
      return reply.status(200).send({ message: "Match started", data });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error starting match",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * End an existing match
   *
   * @async
   * @param {FastifyRequest} request - Fastify request
   * @param {FastifyReply} reply - Fastify reply
   * @returns {Promise<void>} - Promise that resolves when the match is ended
   * @throws {404} - If match not found (MATCH_NOT_FOUND)
   * @throws {400} - If cannot end match in current state (INVALID_MATCH_STATE)
   * @throws {500} - If an error occurs (INTERNAL_SERVER_ERROR)
   */
  async endMatch(
    request: FastifyRequest<EndMatchRequest>,
    reply: FastifyReply
  ) {
    try {
      const { matchId: matchIdStr } = request.params as { matchId: string };
      const matchId = parseInt(matchIdStr, 10);

      if (isNaN(matchId)) {
        return reply.status(400).send({
          message: "Invalid match ID format",
          code: "INVALID_MATCH_ID",
        });
      }
      const { winners, updatedMetadata } = request.body as any;
      const match = await db("matches").where("id", matchId).first();
      if (!match) {
        return reply
          .status(404)
          .send({ message: "Match not found", code: "MATCH_NOT_FOUND" });
      }
      if (!["created", "started"].includes(match.state)) {
        return reply.status(400).send({
          message: "Cannot end match in current state",
          code: "INVALID_MATCH_STATE",
        });
      }
      await db("matches")
        .where("id", matchId)
        .update({ state: "ended", ended_at: new Date().toISOString() });
      await db("match_participants")
        .where("match_id", matchId)
        .update({ is_winner: false });
      if (Array.isArray(winners)) {
        await db("match_participants")
          .where("match_id", matchId)
          .whereIn("user_id", winners)
          .update({ is_winner: true });
      }
      const updated = await db("matches").where("id", matchId).first();
      const ps = await db("match_participants").where("match_id", matchId);
      const dataDTO = {
        ...updated,
        participants: ps.map((p: any) => ({
          user_id: p.user_id,
          is_winner: !!p.is_winner,
        })),
      };
      // Process metadata updates if provided
      if (updatedMetadata && typeof updatedMetadata === "object") {
        // Get current metadata
        const currentMetadata = match.metadata
          ? typeof match.metadata === "string"
            ? JSON.parse(match.metadata)
            : match.metadata
          : {};

        // Merge current metadata with updates
        const mergedMetadata = { ...currentMetadata, ...updatedMetadata };

        // Update the database with merged metadata
        await db("matches")
          .where("id", matchId)
          .update({ metadata: JSON.stringify(mergedMetadata) });

        // Update the data object to include the updated metadata for the response
        dataDTO.metadata = mergedMetadata;
      }
      const data = mapEnrichedMatchDTOToEnrichedMatch(dataDTO);
      return reply.status(200).send({ message: "Match ended", data });
    } catch (error) {
      request.log.error(error);
      return reply
        .status(500)
        .send({ message: "Error ending match", code: "INTERNAL_SERVER_ERROR" });
    }
  },

  /**
   * Abort an existing match
   *
   * @async
   * @param {FastifyRequest} request - Fastify request
   * @param {FastifyReply} reply - Fastify reply
   * @returns {Promise<void>} - Promise that resolves when the match is aborted
   * @throws {404} - If match not found (MATCH_NOT_FOUND)
   * @throws {400} - If cannot abort match in current state (INVALID_MATCH_STATE)
   * @throws {500} - If an error occurs (INTERNAL_SERVER_ERROR)
   */
  async abortMatch(
    request: FastifyRequest<AbortMatchRequest>,
    reply: FastifyReply
  ) {
    try {
      const { matchId: matchIdStr } = request.params as { matchId: string };
      const matchId = parseInt(matchIdStr, 10);

      if (isNaN(matchId)) {
        return reply.status(400).send({
          message: "Invalid match ID format",
          code: "INVALID_MATCH_ID",
        });
      }
      const match = await db("matches").where("id", matchId).first();
      if (!match) {
        return reply
          .status(404)
          .send({ message: "Match not found", code: "MATCH_NOT_FOUND" });
      }
      if (["ended", "aborted"].includes(match.state)) {
        return reply.status(400).send({
          message: "Cannot abort match in current state",
          code: "INVALID_MATCH_STATE",
        });
      }
      await db("matches")
        .where("id", matchId)
        .update({ state: "aborted", ended_at: new Date().toISOString() });
      const updated = await db("matches").where("id", matchId).first();
      const ps = await db("match_participants").where("match_id", matchId);
      const dataDTO = {
        ...updated,
        participants: ps.map((p: any) => ({
          user_id: p.user_id,
          is_winner: !!p.is_winner,
        })),
      };
      const data = mapEnrichedMatchDTOToEnrichedMatch(dataDTO);
      return reply.status(200).send({ message: "Match aborted", data });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error aborting match",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * Get a match detail
   *
   * @async
   * @param {FastifyRequest} request - Fastify request
   * @param {FastifyReply} reply - Fastify reply
   * @returns {Promise<void>} - Promise that resolves when the match detail is retrieved
   * @throws {404} - If match not found (MATCH_NOT_FOUND)
   * @throws {500} - If an error occurs (INTERNAL_SERVER_ERROR)
   */
  async getMatchDetail(
    request: FastifyRequest<GetMatchDetailRequest>,
    reply: FastifyReply
  ) {
    type MatchDetail = {
      matchId: number;
      gameState: MatchState;
      participants: {
        userId: number;
        isWinner: boolean;
        user: {
          displayName: string;
          avatar: string;
        };
      }[];
      isDraw: boolean;
      winners?: {
        userId: number;
        displayName: string;
        avatar: string;
      }[];
    };
    const { matchId: matchIdStr } = request.params as { matchId: string };
    const matchId = parseInt(matchIdStr, 10);

    if (isNaN(matchId)) {
      return reply.status(400).send({
        message: "Invalid match ID format",
        code: "INVALID_MATCH_ID",
      });
    }
    const matchDTO: MatchDTO = await db("matches").where("id", matchId).first();
    if (!matchDTO) {
      return reply
        .status(404)
        .send({ message: "Match not found", code: "MATCH_NOT_FOUND" });
    }

    // Get participants for this match
    const participantsDTO = await db("match_participants")
      .where("match_id", matchId)
      .select("*");

    // Get user data for all participants in a single query
    const userIds = participantsDTO.map(p => p.user_id);
    const users = await db("users")
      .whereIn("id", userIds)
      .select("id", "display_name", "avatar_filename");

    // Create a user lookup map
    interface UserInfoMap {
      [userId: number]: {
        displayName: string;
        avatar: string;
      };
    }

    const userMap = users.reduce<UserInfoMap>((acc, user) => {
      acc[user.id] = {
        displayName: user.display_name,
        avatar: user.avatar_filename,
      };
      return acc;
    }, {} as UserInfoMap);

    // Enrich participants with user data
    const enrichedParticipantsDTO: EnrichedMatchParticipantDTO[] =
      participantsDTO.map(
        participant =>
          ({
            user_id: participant.user_id,
            is_winner: !!participant.is_winner,
            user: userMap[participant.user_id],
          } as EnrichedMatchParticipantDTO)
      );

    // Create the EnrichedMatchDTO
    const enrichedMatchDTO: EnrichedMatchDTO = {
      id: matchDTO.id,
      game_type: matchDTO.game_type,
      match_type: matchDTO.match_type,
      tournament_id: matchDTO.tournament_id,
      game_mode: matchDTO.game_mode,
      created_by: matchDTO.created_by,
      state: matchDTO.state,
      created_at: matchDTO.created_at,
      started_at: matchDTO.started_at,
      ended_at: matchDTO.ended_at,
      metadata: matchDTO.metadata,
      participants: enrichedParticipantsDTO,
    };

    const enrichedMatch: EnrichedMatch =
      mapEnrichedMatchDTOToEnrichedMatch(enrichedMatchDTO);

    // Determine winners from participants
    const winners = enrichedMatch.participants
      .filter(participant => participant.isWinner)
      .map(participant => ({
        userId: participant.userId,
        displayName: participant.user?.displayName || "",
        avatar: participant.user?.avatar || "",
      }));

    // Determine if it's a draw (no winners or all participants are winners)
    const isDraw =
      winners.length === 0 ||
      winners.length === enrichedMatch.participants.length;

    const data: MatchDetail = {
      matchId: enrichedMatch.id,
      gameState: enrichedMatch.state,
      participants: enrichedMatch.participants.map(participant => ({
        userId: participant.userId,
        isWinner: participant.isWinner,
        user: {
          displayName: participant.user?.displayName || "",
          avatar: participant.user?.avatar || "",
        },
      })),
      isDraw,
      winners: winners.length > 0 ? winners : undefined,
    };
    return reply.status(200).send({ message: "Match detail", data });
  },

  /**
   * Get all match details for a tournament
   *
   * @async
   * @param {FastifyRequest} request - Fastify request
   * @param {FastifyReply} reply - Fastify reply
   * @returns {Promise<void>} - Promise that resolves when the tournament match details are retrieved
   * @throws {404} - If tournament not found (TOURNAMENT_NOT_FOUND)
   * @throws {500} - If an error occurs (INTERNAL_SERVER_ERROR)
   */
  async getTournamentMatchDetails(
    request: FastifyRequest<GetTournamentMatchDetailsRequest>,
    reply: FastifyReply
  ) {
    try {
      const { tournamentId: tournamentIdStr } = request.params;
      const tournamentId = parseInt(tournamentIdStr, 10);

      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          message: "Invalid tournament ID format",
          code: "INVALID_TOURNAMENT_ID",
        });
      }

      // First verify tournament exists
      const tournament = await db("tournaments")
        .where("id", tournamentId)
        .first();
      if (!tournament) {
        return reply.status(404).send({
          message: "Tournament not found",
          code: "TOURNAMENT_NOT_FOUND",
        });
      }

      // Get all matches for this tournament
      const matches = await db("matches").where("tournament_id", tournamentId);

      if (matches.length === 0) {
        return reply.status(200).send({
          message: "Tournament match details",
          data: [],
        });
      }

      // Get all match IDs
      const matchIds = matches.map(match => match.id);

      // Get all participants for all matches in a single query
      const allParticipants = await db("match_participants")
        .whereIn("match_id", matchIds)
        .select("*");

      // Get all unique user IDs
      const userIds = [...new Set(allParticipants.map(p => p.user_id))];

      // Get all user data in a single query
      const users = await db("users")
        .whereIn("id", userIds)
        .select("id", "display_name", "avatar_filename");

      // Create user lookup map
      interface UserInfoMap {
        [userId: number]: {
          displayName: string;
          avatar: string;
        };
      }

      const userMap = users.reduce<UserInfoMap>((acc, user) => {
        acc[user.id] = {
          displayName: user.display_name,
          avatar: user.avatar_filename,
        };
        return acc;
      }, {} as UserInfoMap);

      // Group participants by match ID
      const participantsByMatch = allParticipants.reduce<{
        [matchId: number]: any[];
      }>((acc, participant) => {
        if (!acc[participant.match_id]) {
          acc[participant.match_id] = [];
        }
        acc[participant.match_id].push(participant);
        return acc;
      }, {});

      // Process all matches
      const matchDetailsData = matches.map(match => {
        const matchParticipants = participantsByMatch[match.id] || [];

        // Enrich participants with user data
        const enrichedParticipants = matchParticipants.map(participant => ({
          userId: participant.user_id,
          isWinner: !!participant.is_winner,
          user: {
            displayName: userMap[participant.user_id]?.displayName || "",
            avatar: userMap[participant.user_id]?.avatar || "",
          },
        }));

        // Determine winners
        const winners = enrichedParticipants
          .filter(participant => participant.isWinner)
          .map(participant => ({
            userId: participant.userId,
            displayName: participant.user.displayName,
            avatar: participant.user.avatar,
          }));

        // Determine if it's a draw
        const isDraw =
          winners.length === 0 ||
          winners.length === enrichedParticipants.length;

        return {
          matchId: match.id,
          gameState: match.state,
          participants: enrichedParticipants,
          isDraw,
          winners: winners.length > 0 ? winners : undefined,
        };
      });

      return reply.status(200).send({
        message: "Tournament match details",
        data: matchDetailsData,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error getting tournament match details",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
};
