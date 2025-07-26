import { z } from "zod";
import { PublicUser } from "../../types/user";

import {
  // cookie names
  refreshTokenCookieName,

  // validation schemas
  emailSchema,
  passwordSchema,
  usernameSchema,
  displayNameSchema,
  nameSchema,

  // headers schemas
  jsonHeadersSchema,
  protectedHeadersSchema,
  csrfOnlyHeadersSchema,

  // response schemas
  successResponseSchema,
  errorResponseSchema,

  // helper types
  JsonHeaders,
  ProtectedHeaders,
  CsrfOnlyHeaders,
  SimpleSuccessResponse,
  SuccessResponse,
  ErrorResponse,

  // helper functions
  createSuccessResponse,
} from "../commonSchemas";

/**************
 *            *
 *  Register  *
 *            *
 **************/

/* body schemas */
const registerBodySchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    username: usernameSchema,
    displayName: displayNameSchema,
    email: emailSchema,
    password: passwordSchema,
    twoFactorEnabled: z.boolean().optional().default(false),
    gdprConsent: z.boolean().refine(val => val === true, {
      message: "GDPR consent is required to register",
    }),
  })
  .refine(
    data =>
      data.username !== data.password && data.password !== data.displayName,
    {
      message: "Password cannot be the same as username or display name",
      path: ["password"],
    }
  );

/* response schemas */
const twoFactorRequiredDataSchema = z.object({
  requires2FASetup: z.boolean(),
  qrCode: z.string(),
  secret: z.string(),
  email: z.string(),
});

const registerSuccessDataSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  role: z.enum(["user", "admin"], {
    required_error: "Role is required",
    invalid_type_error: "Invalid role. Must be 'user' or 'admin'",
  }),
});

const registerSuccessResponseSchema = createSuccessResponse(
  registerSuccessDataSchema
);

const twoFactorRequiredResponseSchema = createSuccessResponse(
  twoFactorRequiredDataSchema
);

/* types */
type RegisterInput = z.infer<typeof registerBodySchema>;
type RegisterSuccessResponse = z.infer<typeof registerSuccessResponseSchema>;
type TwoFactorRequiredResponse = z.infer<
  typeof twoFactorRequiredResponseSchema
>;

/* exports */

export const registerSchema = {
  headers: jsonHeadersSchema,
  body: registerBodySchema,
  response: {
    200: registerSuccessResponseSchema,
    202: twoFactorRequiredResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type RegisterRequest = {
  Headers: JsonHeaders;
  Body: RegisterInput;
  Reply: RegisterSuccessResponse | TwoFactorRequiredResponse | ErrorResponse;
};

/***********
 *         *
 *  Login  *
 *         *
 ***********/

/* body schemas */
const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

/* response schemas */
const userDataSchema = z.object({
  user: z.custom<PublicUser>(),
  refreshToken: z.string().optional(),
  requiresTwoFactor: z.boolean(),
});

const twoFactorDataSchema = z.object({
  email: z.string(),
  requiresTwoFactor: z.boolean(),
});

const loginResponseSchema = createSuccessResponse(userDataSchema);
const twoFactorResponseSchema = createSuccessResponse(twoFactorDataSchema);

/* types */
type LoginInput = z.infer<typeof loginBodySchema>;
type LoginResponse = z.infer<typeof loginResponseSchema>;
type TwoFactorResponse = z.infer<typeof twoFactorResponseSchema>;

/* exports */
export const loginSchema = {
  headers: jsonHeadersSchema,
  body: loginBodySchema,
  response: {
    200: loginResponseSchema,
    202: twoFactorResponseSchema,
    400: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type LoginRequest = {
  Headers: JsonHeaders;
  Body: LoginInput;
  Reply: LoginResponse | TwoFactorResponse | ErrorResponse;
};

/*****************
 *               *
 *  Google login *
 *               *
 ****************/

/* body schemas */
const googleLoginBodySchema = z.object({
  token: z.string({ required_error: "Google token is required" }),
});

/* response schemas */
const googleUserDataSchema = z.object({
  user: z.custom<PublicUser>(),
  refreshToken: z.string().optional(),
  requirePasswordSetup: z.boolean(),
});

const googleLoginResponseSchema = createSuccessResponse(googleUserDataSchema);

/* types */
type GoogleLoginInput = z.infer<typeof googleLoginBodySchema>;
type GoogleLoginResponse = z.infer<typeof googleLoginResponseSchema>;

/* exports */
export const googleLoginSchema = {
  headers: jsonHeadersSchema,
  body: googleLoginBodySchema,
  response: {
    200: googleLoginResponseSchema,
    500: errorResponseSchema,
  },
};

export type GoogleLoginRequest = {
  Headers: JsonHeaders;
  Body: GoogleLoginInput;
  Reply: GoogleLoginResponse | ErrorResponse;
};

/************
 *          *
 *  Logout  *
 *          *
 ************/

/* exports */
export const logoutSchema = {
  headers: csrfOnlyHeadersSchema,
};

export type LogoutRequest = {
  Headers: CsrfOnlyHeaders;
  Reply: SuccessResponse<z.ZodVoid> | ErrorResponse;
};

/************************
 *                      *
 *  Logout everywhere   *
 *                      *
 ************************/

/* exports */
export const logoutEverywhereSchema = {
  headers: csrfOnlyHeadersSchema,
};

export type LogoutEverywhereRequest = {
  Headers: CsrfOnlyHeaders;
  Reply: SuccessResponse<z.ZodVoid> | ErrorResponse;
};

/*********************
 *                   *
 *  Forgot Password  *
 *                   *
 ********************/

/* body schemas */
const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

/* response schemas */

/* types */
type ForgotPasswordInput = z.infer<typeof forgotPasswordBodySchema>;
type ForgotPasswordResponse = z.infer<typeof successResponseSchema>;

/* exports */
export const forgotPasswordSchema = {
  headers: jsonHeadersSchema,
  body: forgotPasswordBodySchema,
  response: {
    200: successResponseSchema,
    500: errorResponseSchema,
  },
};

export type ForgotPasswordRequest = {
  Headers: JsonHeaders;
  Body: ForgotPasswordInput;
  Reply: ForgotPasswordResponse | ErrorResponse;
};

/********************
 *                  *
 *  Reset Password  *
 *                  *
 *******************/

/* body schemas */
const resetPasswordBodySchema = z.object({
  token: z.string(),
  password: passwordSchema,
});

/* response schemas */

/* types */
type ResetPasswordInput = z.infer<typeof resetPasswordBodySchema>;
type ResetPasswordResponse = z.infer<typeof successResponseSchema>;

/* exports */
export const resetPasswordSchema = {
  headers: jsonHeadersSchema,
  body: resetPasswordBodySchema,
  response: {
    200: successResponseSchema,
    500: errorResponseSchema,
  },
};

export type ResetPasswordRequest = {
  Headers: JsonHeaders;
  Body: ResetPasswordInput;
  Reply: ResetPasswordResponse | ErrorResponse;
};

/*******************
 *                 *
 *  Refresh token  *
 *                 *
 ******************/

/* body schemas */
const refreshTokenBodySchema = z.object({
  tokens: z.array(z.string()),
});

/* response schemas */
const refreshTokenDataSchema = z.object({
  authTokenExpiresIn: z.number(),
  refreshTokenExpiresIn: z.number(),
});

/* error response schemas */
const invalidTokenErrorSchema = z.object({
  code: z.literal("INVALID_TOKEN"),
  message: z.string(),
});
const invalidRefreshTokenErrorSchema = z.object({
  code: z.literal("INVALID_REFRESH_TOKEN"),
  message: z.string(),
});

const sessionMismatchErrorSchema = z.object({
  code: z.literal("SESSION_MISMATCH"),
  message: z.string(),
});

const noSessionSchema = z.object({
  code: z.literal("NO_SESSION"),
  message: z.string(),
});

const refreshTokenResponseSchema = createSuccessResponse(
  refreshTokenDataSchema
);

/* types */
type RefreshTokenInput = z.infer<typeof refreshTokenBodySchema>;
type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;
type InvalidRefreshTokenErrorResponse = z.infer<
  typeof invalidRefreshTokenErrorSchema
>;
type SessionMismatchErrorResponse = z.infer<typeof sessionMismatchErrorSchema>;

/* exports */
export const refreshTokenSchema = {
  headers: protectedHeadersSchema,
  body: refreshTokenBodySchema,
  response: {
    200: refreshTokenResponseSchema,
    204: noSessionSchema,
    401: z.union([
      invalidTokenErrorSchema,
      invalidRefreshTokenErrorSchema,
      sessionMismatchErrorSchema,
    ]),
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type RefreshTokenRequest = {
  Headers: ProtectedHeaders;
  Body: RefreshTokenInput;
  Reply:
    | RefreshTokenResponse
    | InvalidRefreshTokenErrorResponse
    | SessionMismatchErrorResponse
    | ErrorResponse;
  Cookies: {
    [refreshTokenCookieName]?: string | undefined;
  };
};

/***************
 *             *
 *  Setup 2FA  *
 *             *
 **************/

/* response schemas */
const setup2FADataSchema = z.object({
  secret: z.string(),
  qrCode: z.string(),
});

const setup2FAResponseSchema = createSuccessResponse(setup2FADataSchema);

/* types */
type Setup2FAResponse = z.infer<typeof setup2FAResponseSchema>;

/* exports */
export const setup2FASchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: setup2FAResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type Setup2FARequest = {
  Headers: CsrfOnlyHeaders;
  Reply: Setup2FAResponse | ErrorResponse;
};

/****************
 *              *
 *  Enable 2FA  *
 *              *
 ***************/

/* body schemas */
const enable2FABodySchema = z.object({
  code: z.string(),
  email: emailSchema,
});

/* types */
type Enable2FAInput = z.infer<typeof enable2FABodySchema>;

/* exports */
export const enable2FASchema = {
  headers: jsonHeadersSchema,
  body: enable2FABodySchema,
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type Enable2FARequest = {
  Headers: JsonHeaders;
  Body: Enable2FAInput;
  Reply: SimpleSuccessResponse | ErrorResponse;
};

/*****************
 *               *
 *  Disable 2FA  *
 *               *
 ****************/

/* types */
type Disable2FAResponse = z.infer<typeof successResponseSchema>;

/* exports */
export const disable2FASchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: successResponseSchema,
    500: errorResponseSchema,
  },
};

export type Disable2FARequest = {
  Headers: CsrfOnlyHeaders;
  Reply: Disable2FAResponse | ErrorResponse;
};

/****************
 *              *
 *  Verify 2FA  *
 *             *
 ***************/

/* body schemas */
const verify2FABodySchema = z.object({
  code: z.string(),
  email: emailSchema,
});

/* response schemas */
const verify2FADataSchema = z.object({
  user: z.custom<PublicUser>(),
});

const verify2FAResponseSchema = createSuccessResponse(verify2FADataSchema);

/* types */
type Verify2FAInput = z.infer<typeof verify2FABodySchema>;
type Verify2FAResponse = z.infer<typeof verify2FAResponseSchema>;

/* exports */
export const verify2FASchema = {
  headers: jsonHeadersSchema,
  body: verify2FABodySchema,
  response: {
    200: verify2FAResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type Verify2FARequest = {
  Headers: JsonHeaders;
  Body: Verify2FAInput;
  Reply: Verify2FAResponse | ErrorResponse;
};

/**********************
 *                    *
 *  Sessions/current  *
 *                    *
 *********************/

/* response schemas */
const getCurrentSessionDataSchema = z.object({
  session: z.object({
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    deviceInfo: z.string().nullable(),
    lastUsedAt: z.string().datetime().nullable(),
    currentTime: z.string().datetime(),
  }),
});

const getCurrentSessionResponseSchema = createSuccessResponse(
  getCurrentSessionDataSchema
);

/* types */
type CurrentSessionResponse = z.infer<typeof getCurrentSessionResponseSchema>;

/* exports */
export const getCurrentSessionSchema = {
  headers: protectedHeadersSchema,
  response: {
    200: getCurrentSessionResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetCurrentSessionRequest = {
  Headers: ProtectedHeaders;
  Reply: CurrentSessionResponse | ErrorResponse;
};

/**********************
 *                    *
 *  Validate session  *
 *                    *
 **********************/

/* response schemas */
const validateSessionDataSchema = z.object({
  valid: z.boolean(),
  refreshTokenExpiresAt: z.string().datetime(),
  authTokenExpiresAt: z.string().datetime(),
});

const validateSessionResponseSchema = createSuccessResponse(
  validateSessionDataSchema
);

/* types */
type ValidateSessionResponse = z.infer<typeof validateSessionResponseSchema>;

/* exports */
export const validateSessionSchema = {
  headers: csrfOnlyHeadersSchema,
  response: {
    200: validateSessionResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type ValidateSessionRequest = {
  Headers: CsrfOnlyHeaders;
  Reply: ValidateSessionResponse | ErrorResponse;
};

/*****************
 *               *
 *  Sessions/me  *
 *               *
 ****************/

/* response schemas */
const getSessionsDataSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string().uuid(),
      createdAt: z.string().datetime(),
      deviceInfo: z.string().nullable(),
      lastUsedAt: z.string().datetime().nullable(),
    })
  ),
});

const getSessionsResponseSchema = createSuccessResponse(getSessionsDataSchema);

/* types */
type SessionsResponse = z.infer<typeof getSessionsResponseSchema>;

/* exports */
export const getSessionsSchema = {
  headers: protectedHeadersSchema,
  response: {
    200: getSessionsResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetSessionsRequest = {
  Headers: ProtectedHeaders;
  Reply: SessionsResponse | ErrorResponse;
};

/********************
 *                  *
 *  admin/sessions  *
 *                  *
 *******************/

/* response schemas */
const getAllSessionsDataSchema = z.object({
  sessions: z.array(
    z.object({
      id: z.string().uuid(),
      createdAt: z.string().datetime(),
      deviceInfo: z.string().nullable(),
      lastUsedAt: z.string().datetime().nullable(),
      userId: z.number().int().positive(),
      username: z.string(),
    })
  ),
});

const getAllSessionsResponseSchema = createSuccessResponse(
  getAllSessionsDataSchema
);

/* types */
type GetAllSessionsResponse = z.infer<typeof getAllSessionsResponseSchema>;

/* exports */
export const getAllSessionsSchema = {
  headers: protectedHeadersSchema,
  response: {
    200: getAllSessionsResponseSchema,
    500: errorResponseSchema,
  },
};

export type GetAllSessionsRequest = {
  Headers: ProtectedHeaders;
  Reply: GetAllSessionsResponse | ErrorResponse;
};

/******************
 *                *
 *  Sessions/:id  *
 *                *
 *****************/

/* body schemas */

/* response schemas */
const deleteSessionResponseSchema = createSuccessResponse(z.object({}));

/* types */
type DeleteSessionResponse = z.infer<typeof deleteSessionResponseSchema>;

/* exports */
export const deleteSessionSchema = {
  headers: protectedHeadersSchema,
  params: z.object({
    id: z.string().uuid("Invalid session ID format"),
  }),
  response: {
    204: z.void(), // No content on success
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type DeleteSessionRequest = {
  Headers: ProtectedHeaders;
  Params: {
    id: string;
  };
  Reply: DeleteSessionResponse | ErrorResponse;
};

/******************
 *                *
 *  Verify email  *
 *                *
 *****************/

/* exports */
export const verifyEmailSchema = {
  querystring: z.object({
    token: z.string(),
  }),
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type VerifyEmailRequest = {
  Querystring: {
    token: string;
  };
  Reply: SimpleSuccessResponse | ErrorResponse;
};

/*********************
 *                   *
 *  Verify Password  *
 *                   *
 ********************/

/* body schemas */
const verifyPasswordBodySchema = z.object({
  userId: z.number().int().positive(),
  password: passwordSchema,
});

/* response schemas */
const verifyPasswordDataSchema = z.object({
  valid: z.boolean(),
});

const verifyPasswordResponseSchema = createSuccessResponse(
  verifyPasswordDataSchema
);

/* types */
type VerifyPasswordInput = z.infer<typeof verifyPasswordBodySchema>;
type VerifyPasswordResponse = z.infer<typeof verifyPasswordResponseSchema>;

/* exports */
export const verifyPasswordSchema = {
  body: verifyPasswordBodySchema,
  response: {
    200: verifyPasswordResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type VerifyPasswordRequest = {
  Body: VerifyPasswordInput;
  Reply: VerifyPasswordResponse | ErrorResponse;
};

/*************************
 *                       *
 *  Resend verification  *
 *                       *
 ************************/

/* body schemas */
const resendVerificationBodySchema = z.object({
  email: emailSchema,
});

/* types */
type ResendVerificationInput = z.infer<typeof resendVerificationBodySchema>;

/* exports */
export const resendVerificationSchema = {
  body: resendVerificationBodySchema,
  response: {
    200: successResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
};

export type ResendVerificationRequest = {
  Body: ResendVerificationInput;
  Reply: SimpleSuccessResponse | ErrorResponse;
};
