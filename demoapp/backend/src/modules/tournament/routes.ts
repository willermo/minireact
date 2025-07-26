import { FastifyInstance } from "fastify";
import { tournamentController } from "./controller.js";
import {
  createTournamentSchema,
  joinTournamentSchema,
  startTournamentSchema,
  getTournamentSchema,
  getTournamentsSchema,
  setTournamentCompleteSchema,
} from "./schemas.js";
import { requireAdmin, requireAuth } from "../../middleware/auth";

/**
 * Tournament routes
 *
 * Handles all tournament-related HTTP endpoints
 */
export default async function tournamentRoutes(fastify: FastifyInstance) {
  /***************************************
   *                                     *
   *   Debug and monitoring endpoints    *
   *                                     *
   ***************************************/

  // Health check endpoint
  fastify.get("/status", tournamentController.getStatus);

  /***************************************
   *                                     *
   *   Tournament management endpoints   *
   *                                     *
   ***************************************/

  // Create a new tournament
  fastify.post("/", {
    schema: createTournamentSchema,
    preValidation: [requireAuth],
    handler: tournamentController.createTournament,
  });

  // Join a tournament
  fastify.post("/:tournamentId/join", {
    schema: joinTournamentSchema,
    preValidation: [requireAuth],
    handler: tournamentController.joinTournament,
  });

  // Start a tournament
  fastify.post("/:tournamentId/start", {
    schema: startTournamentSchema,
    preValidation: [requireAuth],
    handler: tournamentController.startTournament,
  });

  // Get tournament details
  fastify.get("/:tournamentId", {
    schema: getTournamentSchema,
    handler: tournamentController.getTournament,
  });

  // Get all tournaments
  fastify.get("/", {
    schema: getTournamentsSchema,
    handler: tournamentController.getTournaments,
  });

  // Set tournament complete
  fastify.patch("/:tournamentId/complete", {
    schema: setTournamentCompleteSchema,
    handler: tournamentController.setTournamentComplete,
  });
}
