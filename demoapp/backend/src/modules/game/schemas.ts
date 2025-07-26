import { z } from "zod";
import {
  // headers schemas
  minimalHeadersSchema,
  csrfOnlyHeadersSchema,
  protectedHeadersSchema,
  errorResponseSchema,

  // helper types
  MinimalHeaders,
  JsonHeaders,
  ProtectedHeaders,
  CsrfOnlyHeaders,
  SimpleSuccessResponse,
  SuccessResponse,
  ErrorResponse,

  // helper functions
  createSuccessResponse,

  // helper schemas
  jsonValueSchema,
} from "../commonSchemas";

const gameTypeSchema = z.enum(["pong", "tic_tac_toe", "connect4"]);
const matchTypeSchema = z.enum(["ranked", "tournament"]);
const stateSchema = z.enum(["created", "started", "ended", "aborted"]);
const gameModeSchema = z.enum(["1v1", "2v2", "manyvsmany"]);

const matchSchema = z.object({
  gameType: gameTypeSchema,
  matchType: matchTypeSchema,
  tournamentId: z.number().nullable(),
  gameMode: gameModeSchema,
  createdBy: z.number(),
  state: stateSchema,
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  metadata: z.record(z.string(), jsonValueSchema),
});

const userSchema = z.object({
  displayName: z.string(),
  avatar: z.string(),
});

const participantsSchema = z
  .array(
    z.object({
      userId: z.number(),
      isWinner: z.boolean(),
      user: userSchema.optional(),
    })
  )
  .min(2, { message: "At least two participants are required" });

const matchResponseSchema = z.object({
  id: z.number(),
  gameType: gameTypeSchema,
  matchType: matchTypeSchema,
  tournamentId: z.number().nullable(),
  gameMode: gameModeSchema,
  createdBy: z.number(),
  state: stateSchema,
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  metadata: jsonValueSchema,
  participants: participantsSchema,
});

/*****************
 *               *
 *  get matches  *
 *               *
 *****************/

/* response schemas */
const getMatchesDataSchema = z.array(matchResponseSchema);

const getMatchesSuccessResponseSchema =
  createSuccessResponse(getMatchesDataSchema);

/* types */
type GetMatchesResponse = z.infer<typeof getMatchesSuccessResponseSchema>;

export const getMatchesSchema = {
  headers: minimalHeadersSchema,
  response: {
    200: getMatchesSuccessResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetMatchesRequest = {
  Headers: MinimalHeaders;
  Reply: GetMatchesResponse | ErrorResponse;
};

/*****************************
 *                           *
 *  get matches/user/:userId *
 *                           *
 *****************************/

/* params schemas */
const getUserMatchesParamsSchema = z.object({
  userId: z.string(),
});

/* response schemas */
const getUserMatchesDataSchema = z.array(matchResponseSchema);

const getUserMatchesSuccessResponseSchema = createSuccessResponse(
  getUserMatchesDataSchema
);

/* types */
type GetUserMatchesResponse = z.infer<
  typeof getUserMatchesSuccessResponseSchema
>;
type GetUserMatchesParams = z.infer<typeof getUserMatchesParamsSchema>;

export const getUserMatchesSchema = {
  headers: csrfOnlyHeadersSchema,
  params: getUserMatchesParamsSchema,
  response: {
    200: getUserMatchesSuccessResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetUserMatchesRequest = {
  Params: GetUserMatchesParams;
  Headers: CsrfOnlyHeaders;
  Reply: GetUserMatchesResponse | ErrorResponse;
};

/***********************
 *                     *
 *  post create-match  *
 *                     *
 ***********************/

/* body schemas */
const createMatchBodySchema = z.object({
  matchSettings: matchSchema,
  participants: participantsSchema,
});

/* response schemas */
const createMatchDataSchema = matchResponseSchema;

const createMatchSuccessResponseSchema = createSuccessResponse(
  createMatchDataSchema
);

/* types */
type CreateMatchResponse = z.infer<typeof createMatchSuccessResponseSchema>;
type CreateMatchBody = z.infer<typeof createMatchBodySchema>;

export const createMatchSchema = {
  headers: protectedHeadersSchema,
  body: createMatchBodySchema,
  response: {
    201: createMatchSuccessResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type CreateMatchRequest = {
  Headers: ProtectedHeaders;
  Body: CreateMatchBody;
  Reply: CreateMatchResponse | ErrorResponse;
};

/**********************************
 *                                *
 *  patch matches/:matchId/start  *
 *                                *
 **********************************/

/* params schemas */
const startMatchParamsSchema = z.object({
  matchId: z.string(),
});

/* response schemas */
const startMatchDataSchema = matchResponseSchema;

const startMatchSuccessResponseSchema =
  createSuccessResponse(startMatchDataSchema);

/* types */
type StartMatchResponse = z.infer<typeof startMatchSuccessResponseSchema>;
type StartMatchParams = z.infer<typeof startMatchParamsSchema>;

export const startMatchSchema = {
  headers: csrfOnlyHeadersSchema,
  params: startMatchParamsSchema,
  response: {
    200: startMatchSuccessResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type StartMatchRequest = {
  Headers: ProtectedHeaders;
  Params: StartMatchParams;
  Reply: StartMatchResponse | ErrorResponse;
};

/********************************
 *                              *
 *  patch matches/:matchId/end  *
 *                              *
 ********************************/

/* params schemas */
const endMatchParamsSchema = z.object({
  matchId: z.string(),
});

/* body schemas */
const endMatchBodySchema = z.object({
  winners: z.array(z.number()).min(0),
  updatedMetadata: z.record(z.any()).optional(),
});

/* response schemas */
const endMatchDataSchema = matchResponseSchema;

const endMatchSuccessResponseSchema = createSuccessResponse(endMatchDataSchema);

/* types */
type EndMatchResponse = z.infer<typeof endMatchSuccessResponseSchema>;
type EndMatchParams = z.infer<typeof endMatchParamsSchema>;
type EndMatchBody = z.infer<typeof endMatchBodySchema>;

export const endMatchSchema = {
  headers: protectedHeadersSchema,
  params: endMatchParamsSchema,
  body: endMatchBodySchema,
  response: {
    200: endMatchSuccessResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type EndMatchRequest = {
  Params: EndMatchParams;
  Body: EndMatchBody;
  Headers: ProtectedHeaders;
  Reply: EndMatchResponse | ErrorResponse;
};

/**********************************
 *                                *
 *  patch matches/:matchId/abort  *
 *                                *
 **********************************/

/* params schemas */
const abortMatchParamsSchema = z.object({
  matchId: z.string(),
});

/* response schemas */
const abortMatchDataSchema = matchResponseSchema;

const abortMatchSuccessResponseSchema =
  createSuccessResponse(abortMatchDataSchema);

/* types */
type AbortMatchResponse = z.infer<typeof abortMatchSuccessResponseSchema>;
type AbortMatchParams = z.infer<typeof abortMatchParamsSchema>;

export const abortMatchSchema = {
  headers: csrfOnlyHeadersSchema,
  params: abortMatchParamsSchema,
  response: {
    200: abortMatchSuccessResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type AbortMatchRequest = {
  Params: AbortMatchParams;
  Headers: ProtectedHeaders;
  Reply: AbortMatchResponse | ErrorResponse;
};

/******************************
 *                            *
 *  get match-detail/:matchId *
 *                            *
 ******************************/

/* params schemas */
const getMatchDetailParamsSchema = z.object({
  matchId: z.string(),
});

/* response schemas */
const getMatchDetailDataSchema = z.object({
  matchId: z.number(),
  gameState: stateSchema,
  participants: participantsSchema,
  isDraw: z.boolean().optional(),
  winners: z
    .array(
      z.object({
        userId: z.number(),
        displayName: z.string(),
        avatar: z.string(),
      })
    )
    .optional(),
});

const getMatchDetailSuccessResponseSchema = createSuccessResponse(
  getMatchDetailDataSchema
);

/* types */
type GetMatchDetailResponse = z.infer<
  typeof getMatchDetailSuccessResponseSchema
>;
type GetMatchDetailParams = z.infer<typeof getMatchDetailParamsSchema>;

export const getMatchDetailSchema = {
  headers: minimalHeadersSchema,
  params: getMatchDetailParamsSchema,
  response: {
    200: getMatchDetailSuccessResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetMatchDetailRequest = {
  Params: GetMatchDetailParams;
  Headers: MinimalHeaders;
  Reply: GetMatchDetailResponse | ErrorResponse;
};

/**************************************
 *                                    *
 *  get tournament-match-details/:id  *
 *                                    *
 **************************************/

/* params schemas */
const getTournamentMatchDetailsParamsSchema = z.object({
  tournamentId: z.string(),
});

/* response schemas */
const getTournamentMatchDetailsDataSchema = z.array(
  z.object({
    matchId: z.number(),
    gameState: stateSchema,
    participants: participantsSchema,
    isDraw: z.boolean().optional(),
    winners: z
      .array(
        z.object({
          userId: z.number(),
          displayName: z.string(),
          avatar: z.string(),
        })
      )
      .optional(),
  })
);

const getTournamentMatchDetailsSuccessResponseSchema = createSuccessResponse(
  getTournamentMatchDetailsDataSchema
);

/* types */
type GetTournamentMatchDetailsResponse = z.infer<
  typeof getTournamentMatchDetailsSuccessResponseSchema
>;
type GetTournamentMatchDetailsParams = z.infer<
  typeof getTournamentMatchDetailsParamsSchema
>;

export const getTournamentMatchDetailsSchema = {
  headers: minimalHeadersSchema,
  params: getTournamentMatchDetailsParamsSchema,
  response: {
    200: getTournamentMatchDetailsSuccessResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetTournamentMatchDetailsRequest = {
  Params: GetTournamentMatchDetailsParams;
  Headers: MinimalHeaders;
  Reply: GetTournamentMatchDetailsResponse | ErrorResponse;
};
