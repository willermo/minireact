// Tournament Controller
import { FastifyReply, FastifyRequest } from "fastify";
import db from "../../db/index.js"; // Must use .js extension for ESM compatibility
import bcrypt from "bcrypt";

import type {
  CreateTournamentRequest,
  JoinTournamentRequest,
  StartTournamentRequest,
  GetTournamentRequest,
  GetTournamentsRequest,
  SetTournamentCompleteRequest,
} from "./schemas";

import {
  mapTournamentDTOToTournament,
  mapEnrichedTournamentDTOToEnrichedTournament,
  mapEnrichedTournamentParticipantDTOToEnrichedTournamentParticipant,
  generateRoundRobinMatches,
  calculateTournamentLadder,
  type TournamentDTO,
  type EnrichedTournamentDTO,
  type EnrichedTournamentParticipantDTO,
} from "../../types/tournament";

import {
  mapEnrichedMatchDTOToEnrichedMatch,
  type EnrichedMatchDTO,
} from "../../types/matches";

const tournamentHelperFunctions = {
  /**
   * Retrieves enriched tournament data including participants, matches, and ladder
   *
   * Fetches a tournament by its ID and enriches it with related data including
   * participant details, match information, and the current tournament ladder.
   *
   * @param {number} tournamentId - The ID of the tournament to retrieve
   * @returns {Promise<TournamentDTO | null>} - The enriched tournament data if found, or null if not found
   */
  async getEnrichedTournament(tournamentId: number, userId: number) {
    try {
      const tournamentDTO: TournamentDTO = await db("tournaments")
        .where("id", tournamentId)
        .first();

      if (!tournamentDTO) {
        return null;
      }

      // Get participants with user data
      const participantsDTO: EnrichedTournamentParticipantDTO[] = await db(
        "tournament_participants"
      )
        .join("users", "tournament_participants.user_id", "users.id")
        .where("tournament_participants.tournament_id", tournamentId)
        .select(
          "tournament_participants.*",
          "users.display_name",
          "users.avatar_filename"
        )
        .then(rows =>
          rows.map(row => ({
            id: row.id,
            tournament_id: row.tournament_id,
            user_id: row.user_id,
            joined_at: row.joined_at,
            user: {
              display_name: row.display_name,
              avatar_filename: row.avatar_filename,
            },
          }))
        );

      // Get tournament matches with participants
      const matchesDTO: EnrichedMatchDTO[] = await db("matches")
        .where("tournament_id", tournamentId)
        .select("*")
        .then(async matches => {
          return await Promise.all(
            matches.map(async match => {
              const participants = await db("match_participants")
                .join("users", "match_participants.user_id", "users.id")
                .where("match_participants.match_id", match.id)
                .select(
                  "match_participants.*",
                  "users.display_name",
                  "users.avatar_filename"
                );

              return {
                ...match,
                participants: participants.map(p => ({
                  user_id: p.user_id,
                  is_winner: !!p.is_winner,
                  user: {
                    display_name: p.display_name,
                    avatar_filename: p.avatar_filename,
                  },
                })),
              };
            })
          );
        });

      // Create enriched tournament DTO
      const enrichedTournamentDTO: EnrichedTournamentDTO = {
        ...tournamentDTO,
        participants: participantsDTO,
        matches: matchesDTO.map(mapEnrichedMatchDTOToEnrichedMatch),
      };

      // Convert to domain object
      const enrichedTournament = mapEnrichedTournamentDTOToEnrichedTournament(
        enrichedTournamentDTO
      );

      // Calculate and add ladder
      if (enrichedTournament.matches) {
        const ladder = calculateTournamentLadder(
          enrichedTournament.participants,
          enrichedTournament.matches
        );
        (enrichedTournament as any).ladder = ladder;
      }

      // Check for completed tournaments
      if (
        enrichedTournament.status === "active" &&
        enrichedTournament.matches?.every(m => m.state === "ended")
      ) {
        await db("tournaments").where("id", tournamentId).update({
          status: "completed",
          ended_at: new Date().toISOString(),
        });
        enrichedTournament.status = "completed";
        enrichedTournament.endedAt = new Date().toISOString();
      }

      // reset inconsistent match states due to navigation or other reasons
      if (enrichedTournament.matches) {
        for (const match of enrichedTournament.matches) {
          if (match.state === "started") {
            await db("matches").where("id", match.id).update({
              state: "created",
              started_at: null,
              ended_at: null,
            });
            match.state = "created";
            match.startedAt = null;
            match.endedAt = null;
          }
        }
      }

      return enrichedTournament;
    } catch (error) {
      console.error("Error getting enriched tournament:", error);
      return null;
    }
  },
};

/**
 * Tournament controller
 *
 * Handles tournament related endpoints
 */
export const tournamentController = {
  /***************************************
   *                                     *
   *   Debug and monitoring endpoints    *
   *                                     *
   ***************************************/

  /**
   * Get tournament status
   *
   * @async
   * @param {FastifyRequest} request - The Fastify request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<void>} - Promise that resolves when the status is fetched
   */
  async getStatus(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({ status: "Tournament routes are ready" });
  },

  /***************************************
   *                                     *
   *   Tournament management endpoints   *
   *                                     *
   ***************************************/

  /**
   * Create a new tournament
   */
  async createTournament(
    request: FastifyRequest<CreateTournamentRequest>,
    reply: FastifyReply
  ) {
    try {
      const { name, gameType, gameMode } = request.body;
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          message: "Authentication required",
          code: "UNAUTHORIZED",
        });
      }

      // Create tournament in database
      const [tournamentId] = await db("tournaments").insert({
        name,
        game_type: gameType,
        game_mode: gameMode,
        status: "pending",
        created_by: userId,
        created_at: new Date().toISOString(),
      });

      // Fetch the created tournament
      const tournamentDTO = await db("tournaments")
        .where("id", tournamentId)
        .first();

      if (!tournamentDTO) {
        return reply.status(500).send({
          message: "Failed to create tournament",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      const tournament = mapTournamentDTOToTournament(tournamentDTO);

      return reply.status(201).send({
        message: "Tournament created successfully",
        data: tournament,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error creating tournament",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  // Additional methods will be added in next step
  async joinTournament(
    request: FastifyRequest<JoinTournamentRequest>,
    reply: FastifyReply
  ) {
    try {
      const { tournamentId: tournamentIdStr } = request.params;
      const { userId, password } = request.body;
      const tournamentId = parseInt(tournamentIdStr, 10);

      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          message: "Invalid tournament ID format",
          code: "INVALID_TOURNAMENT_ID",
        });
      }

      // Check if tournament exists and is joinable
      const tournament = await db("tournaments")
        .where("id", tournamentId)
        .first();
      if (!tournament) {
        return reply.status(404).send({
          message: "Tournament not found",
          code: "TOURNAMENT_NOT_FOUND",
        });
      }

      if (tournament.status !== "pending") {
        return reply.status(400).send({
          message: "Tournament cannot be joined in current state",
          code: "INVALID_TOURNAMENT_STATE",
        });
      }

      // Check if user already joined
      const existingParticipant = await db("tournament_participants")
        .where("tournament_id", tournamentId)
        .where("user_id", userId)
        .first();

      if (existingParticipant) {
        return reply.status(409).send({
          message: "User already joined this tournament",
          code: "USER_ALREADY_JOINED",
        });
      }

      // Verify user exists
      const user = await db("users").where("id", userId).first();
      if (!user) {
        return reply.status(404).send({
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Verify password using shared bcrypt logic
      if (!password || !user.password_hash) {
        return reply.status(400).send({
          message: "Password verification failed - missing data",
          code: "INVALID_PASSWORD_DATA",
        });
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        return reply.status(401).send({
          message: "Invalid password",
          code: "INVALID_PASSWORD",
        });
      }

      // Add user to tournament
      const [participantId] = await db("tournament_participants").insert({
        tournament_id: tournamentId,
        user_id: userId,
        joined_at: new Date().toISOString(),
      });

      // Fetch the created participant with user data
      const participantDTO = await db("tournament_participants")
        .join("users", "tournament_participants.user_id", "users.id")
        .where("tournament_participants.id", participantId)
        .select(
          "tournament_participants.*",
          "users.display_name",
          "users.avatar_filename"
        )
        .first();

      if (!participantDTO) {
        return reply.status(500).send({
          message: "Failed to join tournament",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      const enrichedParticipantDTO: EnrichedTournamentParticipantDTO = {
        id: participantDTO.id,
        tournament_id: participantDTO.tournament_id,
        user_id: participantDTO.user_id,
        joined_at: participantDTO.joined_at,
        user: {
          display_name: participantDTO.display_name,
          avatar_filename: participantDTO.avatar_filename,
        },
      };

      const participant =
        mapEnrichedTournamentParticipantDTOToEnrichedTournamentParticipant(
          enrichedParticipantDTO
        );

      return reply.status(200).send({
        message: "Successfully joined tournament",
        data: participant,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error joining tournament",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  async startTournament(
    request: FastifyRequest<StartTournamentRequest>,
    reply: FastifyReply
  ) {
    try {
      const { tournamentId: tournamentIdStr } = request.params;
      const tournamentId = parseInt(tournamentIdStr, 10);
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          message: "Authentication required",
          code: "UNAUTHORIZED",
        });
      }

      if (isNaN(tournamentId)) {
        return reply.status(400).send({
          message: "Invalid tournament ID format",
          code: "INVALID_TOURNAMENT_ID",
        });
      }

      // Check if tournament exists and can be started
      const tournament = await db("tournaments")
        .where("id", tournamentId)
        .first();
      if (!tournament) {
        return reply.status(404).send({
          message: "Tournament not found",
          code: "TOURNAMENT_NOT_FOUND",
        });
      }

      if (tournament.created_by !== userId) {
        return reply.status(403).send({
          message: "Only tournament creator can start the tournament",
          code: "FORBIDDEN",
        });
      }

      if (tournament.status !== "pending") {
        return reply.status(400).send({
          message: "Tournament cannot be started in current state",
          code: "INVALID_TOURNAMENT_STATE",
        });
      }

      // Get tournament participants
      const participants = await db("tournament_participants")
        .where("tournament_id", tournamentId)
        .select("user_id");

      if (participants.length < 2) {
        return reply.status(400).send({
          message: "Tournament needs at least 2 participants to start",
          code: "INSUFFICIENT_PARTICIPANTS",
        });
      }

      // Generate round robin matches
      const participantIds = participants.map(p => p.user_id);
      const matchPairs = generateRoundRobinMatches(participantIds);

      // Create matches in the database
      const matchPromises = matchPairs.map(async ([player1Id, player2Id]) => {
        const [matchId] = await db("matches").insert({
          game_type: tournament.game_type,
          match_type: "tournament",
          tournament_id: tournamentId,
          game_mode: tournament.game_mode,
          created_by: userId,
          state: "created",
          created_at: new Date().toISOString(),
          metadata: JSON.stringify({}),
        });

        await db("match_participants").insert([
          { match_id: matchId, user_id: player1Id, is_winner: false },
          { match_id: matchId, user_id: player2Id, is_winner: false },
        ]);

        return matchId;
      });

      await Promise.all(matchPromises);

      // Update tournament status
      await db("tournaments").where("id", tournamentId).update({
        status: "active",
        started_at: new Date().toISOString(),
      });

      // Fetch enriched tournament data
      const enrichedTournament =
        await tournamentHelperFunctions.getEnrichedTournament(
          tournamentId,
          userId
        );

      return reply.status(200).send({
        message: "Tournament started successfully",
        data: enrichedTournament,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error starting tournament",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  async getTournament(
    request: FastifyRequest<GetTournamentRequest>,
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

      const enrichedTournament =
        await tournamentHelperFunctions.getEnrichedTournament(
          tournamentId,
          request.user?.userId
        );

      if (!enrichedTournament) {
        return reply.status(404).send({
          message: "Tournament not found",
          code: "TOURNAMENT_NOT_FOUND",
        });
      }

      return reply.status(200).send({
        message: "Tournament fetched successfully",
        data: enrichedTournament,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error fetching tournament",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  async getTournaments(
    request: FastifyRequest<GetTournamentsRequest>,
    reply: FastifyReply
  ) {
    try {
      const tournaments = await db("tournaments")
        .select("*")
        .orderBy("created_at", "desc");

      const enrichedTournaments = await Promise.all(
        tournaments.map(async tournament => {
          return await tournamentHelperFunctions.getEnrichedTournament(
            tournament.id,
            request.user?.userId
          );
        })
      );

      return reply.status(200).send({
        message: "Tournaments fetched successfully",
        data: enrichedTournaments.filter(t => t !== null),
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        message: "Error fetching tournaments",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  async setTournamentComplete(
    request: FastifyRequest<SetTournamentCompleteRequest>,
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

      await db("tournaments").where("id", tournamentId).update({
        status: "completed",
        ended_at: new Date().toISOString(),
      });

      return reply.status(200).send({
        message: "Tournament completed successfully",
        data: { tournamentId },
      });
    } catch (error) {
      request.log.error("Error setting tournament complete:", error);
      return reply.status(500).send({
        message: "Error setting tournament complete",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
};
