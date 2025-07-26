import { z } from "zod";
import {
  minimalHeadersSchema,
  csrfOnlyHeadersSchema,
  jsonHeadersSchema,
  protectedHeadersSchema,
  createSuccessResponse,
  nameSchema,
  errorResponseSchema,
} from "../commonSchemas.js";

/***********************
 *                     *
 *  Tournament Schemas *
 *                     *
 ***********************/

// Game type and mode schemas
const gameTypeSchema = z.enum(["pong", "tic_tac_toe", "connect4"]);
const gameModeSchema = z.enum(["1v1", "2v2"]);
const tournamentStatusSchema = z.enum([
  "pending",
  "active",
  "completed",
  "cancelled",
]);

// Tournament creation request
export const createTournamentBodySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters long"),
  gameType: gameTypeSchema,
  gameMode: gameModeSchema,
});

// Join tournament request
export const joinTournamentParamsSchema = z.object({
  tournamentId: z.string().regex(/^\d+$/, "Tournament ID must be a number"),
});

export const joinTournamentBodySchema = z.object({
  userId: z.number().int().positive("User ID must be a positive integer"),
  password: z.string().min(1, "Password is required"),
});

// Start tournament request
export const startTournamentParamsSchema = z.object({
  tournamentId: z.string().regex(/^\d+$/, "Tournament ID must be a number"),
});

// Get tournament request
export const getTournamentParamsSchema = z.object({
  tournamentId: z.string().regex(/^\d+$/, "Tournament ID must be a number"),
});

/***********************
 *                     *
 *  Response Schemas   *
 *                     *
 ***********************/

// Tournament participant schema
const tournamentParticipantSchema = z.object({
  id: z.number(),
  tournamentId: z.number(),
  userId: z.number(),
  joinedAt: z.string(),
  user: z.object({
    displayName: z.string(),
    avatar: z.string(),
  }),
});

// Tournament ladder entry schema
const tournamentLadderEntrySchema = z.object({
  userId: z.number(),
  displayName: z.string(),
  avatar: z.string(),
  gamesPlayed: z.number(),
  gamesWon: z.number(),
  gamesDraw: z.number(),
  gamesLost: z.number(),
  points: z.number(),
});

// Basic tournament schema
const tournamentSchema = z.object({
  id: z.number(),
  name: z.string(),
  gameType: gameTypeSchema,
  gameMode: gameModeSchema,
  status: tournamentStatusSchema,
  createdBy: z.number(),
  winnerId: z.number().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  metadata: z.record(z.any()).nullable(),
});

// Enriched tournament schema (with participants and matches)
const enrichedTournamentSchema = tournamentSchema.extend({
  participants: z.array(tournamentParticipantSchema),
  matches: z.array(z.any()).optional(), // Match schema would be imported from matches module
  ladder: z.array(tournamentLadderEntrySchema).optional(),
});

// Set tournament complete params schema
const setTournamentCompleteParamsSchema = z.object({
  tournamentId: z.string().regex(/^\d+$/, "Tournament ID must be a number"),
});

// Set tournament data schema
const setTournamentCompleteDataSchema = z.object({
  tournamentId: z.number(),
});

// Response schemas - declared before use
const createTournamentResponseSchema = createSuccessResponse(tournamentSchema);
const joinTournamentResponseSchema = createSuccessResponse(
  tournamentParticipantSchema
);
const startTournamentResponseSchema = createSuccessResponse(
  enrichedTournamentSchema
);
const getTournamentResponseSchema = createSuccessResponse(
  enrichedTournamentSchema
);
const getTournamentsResponseSchema = createSuccessResponse(
  z.array(enrichedTournamentSchema)
);

const setTournamentCompleteResponseSchema = createSuccessResponse(
  setTournamentCompleteDataSchema
);

// Schema exports for Fastify routes
export const createTournamentSchema = {
  headers: protectedHeadersSchema,
  body: createTournamentBodySchema,
  response: {
    201: createTournamentResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export const joinTournamentSchema = {
  headers: protectedHeadersSchema,
  params: joinTournamentParamsSchema,
  body: joinTournamentBodySchema,
  response: {
    200: joinTournamentResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export const startTournamentSchema = {
  headers: csrfOnlyHeadersSchema,
  params: startTournamentParamsSchema,
  response: {
    200: startTournamentResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export const getTournamentSchema = {
  headers: minimalHeadersSchema,
  params: getTournamentParamsSchema,
  response: {
    200: getTournamentResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export const getTournamentsSchema = {
  headers: minimalHeadersSchema,
  response: {
    200: getTournamentsResponseSchema,
    500: errorResponseSchema,
  },
};

export const setTournamentCompleteSchema = {
  headers: protectedHeadersSchema,
  params: setTournamentCompleteParamsSchema,
  response: {
    200: setTournamentCompleteResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

/***********************
 *                     *
 *  Type Exports       *
 *                     *
 ***********************/

export type CreateTournamentRequest = {
  Headers: z.infer<typeof protectedHeadersSchema>;
  Body: z.infer<typeof createTournamentBodySchema>;
};

export type JoinTournamentRequest = {
  Headers: z.infer<typeof protectedHeadersSchema>;
  Params: z.infer<typeof joinTournamentParamsSchema>;
  Body: z.infer<typeof joinTournamentBodySchema>;
};

export type StartTournamentRequest = {
  Headers: z.infer<typeof protectedHeadersSchema>;
  Params: z.infer<typeof startTournamentParamsSchema>;
};

export type GetTournamentRequest = {
  Headers: z.infer<typeof minimalHeadersSchema>;
  Params: z.infer<typeof getTournamentParamsSchema>;
};

export type GetTournamentsRequest = {
  Headers: z.infer<typeof minimalHeadersSchema>;
};

export type CreateTournamentResponse = z.infer<
  typeof createTournamentResponseSchema
>;
export type JoinTournamentResponse = z.infer<
  typeof joinTournamentResponseSchema
>;
export type StartTournamentResponse = z.infer<
  typeof startTournamentResponseSchema
>;
export type GetTournamentResponse = z.infer<typeof getTournamentResponseSchema>;
export type GetTournamentsResponse = z.infer<
  typeof getTournamentsResponseSchema
>;
export type SetTournamentCompleteRequest = {
  Headers: z.infer<typeof protectedHeadersSchema>;
  Params: z.infer<typeof setTournamentCompleteParamsSchema>;
};
