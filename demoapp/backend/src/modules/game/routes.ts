import { FastifyInstance } from "fastify";
import { GameController } from "./controller";
import {
  getMatchesSchema,
  getUserMatchesSchema,
  createMatchSchema,
  startMatchSchema,
  endMatchSchema,
  abortMatchSchema,
  getMatchDetailSchema,
  getTournamentMatchDetailsSchema,
} from "./schemas";
import { requireAuth } from "../../middleware/auth";

export default async function gameRoutes(fastify: FastifyInstance) {
  fastify.get("/status", GameController.getStatus);

  fastify.get("/matches", {
    schema: getMatchesSchema,
    handler: GameController.getMatches,
  });

  fastify.get("/tournament-matches", {
    schema: getMatchesSchema,
    handler: GameController.getTournamentMatches,
  });

  fastify.get("/matches/user/:userId", {
    preValidation: [requireAuth],
    schema: getUserMatchesSchema,
    handler: GameController.getUserMatches,
  });

  // Create a new match
  fastify.post("/create-match", {
    preValidation: [requireAuth],
    schema: createMatchSchema,
    handler: GameController.createMatch,
  });

  // Start an existing match
  fastify.patch("/matches/:matchId/start", {
    preValidation: [requireAuth],
    schema: startMatchSchema,
    handler: GameController.startMatch,
  });

  // End an existing match
  fastify.patch("/matches/:matchId/end", {
    preValidation: [requireAuth],
    schema: endMatchSchema,
    handler: GameController.endMatch,
  });

  // Abort an existing match
  fastify.patch("/matches/:matchId/abort", {
    preValidation: [requireAuth],
    schema: abortMatchSchema,
    handler: GameController.abortMatch,
  });

  fastify.get("/match-detail/:matchId", {
    schema: getMatchDetailSchema,
    handler: GameController.getMatchDetail,
  });

  fastify.get("/tournament-match-details/:tournamentId", {
    schema: getTournamentMatchDetailsSchema,
    handler: GameController.getTournamentMatchDetails,
  });
}
