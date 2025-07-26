import { FastifyReply, FastifyRequest } from "fastify";
import { userHelperFunctions } from "../user/controller";
import bcrypt from "bcrypt";
import { tokenStore } from "./token-store";
import { sendPasswordResetEmail } from "../../services/email.service";
import {
  sendUserVerificationEmail,
  verifyToken,
} from "../../services/verification.service";
import db from "../../db/index.js";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { storeGoogleAvatar } from "../../utils/store_avatar";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { addDays } from "date-fns";
import type {
  RegisterRequest,
  LoginRequest,
  LogoutRequest,
  LogoutEverywhereRequest,
  GoogleLoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
  Enable2FARequest,
  Setup2FARequest,
  Disable2FARequest,
  Verify2FARequest,
  GetCurrentSessionRequest,
  ValidateSessionRequest,
  GetSessionsRequest,
  GetAllSessionsRequest,
  DeleteSessionRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  VerifyPasswordRequest,
} from "./schemas";
import { User, PublicUser } from "../../types/user";

// Cookies names
const COOKIE_NAME = process.env.JWT_COOKIE_NAME as string;
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME as string;
const REFRESH_TOKEN_COOKIE_NAME = process.env
  .REFRESH_TOKEN_COOKIE_NAME as string;

/**
 * Transforms session data from database format to a consistent JavaScript-friendly camelCase format
 * for responses in session endpoints. Maps database snake_case fields to camelCase and
 * conditionally adds user information if available.
 *
 * @param {any} session - The session object from database with snake_case properties
 * @returns {object} - Transformed session object with camelCase properties
 */
const transformSession = (session: any) => ({
  id: session.id,
  createdAt: session.created_at,
  deviceInfo: session.device_info,
  lastUsedAt: session.last_used_at,
  // For admin endpoint
  ...(session.user_id && {
    userId: session.user_id,
    username: session.username,
  }),
});

/**
 * Invalidates a specific user session by its ID
 * Used for both logout process and session deletion
 *
 * @param {string} sessionId - ID of the session to invalidate
 * @param {number} userId - ID of the user who owns the session
 * @returns {Promise<boolean>} - True if session was found and deleted, false if session not found
 */
const invalidateSession = async (
  sessionId: string,
  userId: number
): Promise<boolean> => {
  const session = await db("refresh_tokens")
    .where({ id: sessionId, user_id: userId })
    .first();

  if (!session) return false;

  await db("refresh_tokens").where({ id: sessionId }).del();
  return true;
};

/**
 * Invalidates all sessions for a specific user
 * Used for security-sensitive operations like logout everywhere and password changes
 *
 * @param {number} userId - ID of the user whose sessions should be invalidated
 * @returns {Promise<void>} - Promise that resolves when all sessions are deleted
 */
const invalidateAllUserSessions = async (userId: number): Promise<void> => {
  await db("refresh_tokens").where({ user_id: userId }).del();
};

/**
 * Auth controller
 *
 * Handles authentication related endpoints
 */
export const authController = {
  /***************************************
   *                                     *
   *   Debug and monitoring endpoints    *
   *                                     *
   ***************************************/

  /**
   * Get authentication service status - health check endpoint
   * Returns 200 OK if the authentication service is running correctly
   *
   * @async
   * @param {FastifyRequest} request - The Fastify request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<void>} - Promise that resolves when the status is sent
   */
  async getStatus(request: FastifyRequest, reply: FastifyReply) {
    return reply
      .status(200)
      .send({ status: "Authentication routes are ready" });
  },

  /***************************************
   *                                     *
   *      Authentication endpoints       *
   *                                     *
   ***************************************/

  /**
   * Register a new user with the application
   * Creates a new user account and handles email verification flow
   * Supports optional 2FA setup during registration
   *
   * @async
   * @param {FastifyRequest<RegisterRequest>} request - The Fastify request with registration data
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<void>} - Promise that resolves when registration is completed
   *
   * @throws {409} - If email is already registered (AUTH_EMAIL_ALREADY_REGISTERED)
   * @throws {409} - If username is already taken (AUTH_USERNAME_TAKEN)
   * @throws {409} - If display name is already in use (AUTH_DISPLAY_NAME_TAKEN)
   * @throws {500} - On internal server error (INTERNAL_SERVER_ERROR)
   */
  async register(
    request: FastifyRequest<RegisterRequest>,
    reply: FastifyReply
  ) {
    try {
      const {
        firstName,
        lastName,
        username,
        displayName,
        email,
        password,
        twoFactorEnabled,
        gdprConsent,
      } = request.body;

      // Check if user already exists (email)
      const existingUserByEmail = await userHelperFunctions.getUserByKey(
        { type: "email", value: email },
        "publicUser"
      );
      if (existingUserByEmail) {
        return reply.status(409).send({
          code: "AUTH_EMAIL_ALREADY_REGISTERED",
          message: "This email is already registered",
          field: "email",
        });
      }

      // Check if user already exists (username)
      const existingUserByUsername = await userHelperFunctions.getUserByKey(
        { type: "username", value: username },
        "publicUser"
      );
      if (existingUserByUsername) {
        return reply.status(409).send({
          code: "AUTH_USERNAME_TAKEN",
          message: "This username is already taken",
          field: "username",
        });
      }

      // Check if user already exists (display name)
      const existingUserByDisplayName = await userHelperFunctions.getUserByKey(
        { type: "display_name", value: displayName },
        "publicUser"
      );
      if (existingUserByDisplayName) {
        return reply.status(409).send({
          code: "AUTH_DISPLAY_NAME_TAKEN",
          message: "This display name is already in use",
          field: "displayName",
        });
      }

      // Create new user with 2FA disabled initially
      const user = await userHelperFunctions.createUser({
        firstName,
        lastName,
        username,
        displayName,
        email,
        password,
        twoFactorEnabled: false, // Start with 2FA disabled
        gdprConsent,
      });

      // If 2FA was requested, set up the secret and return it
      if (twoFactorEnabled) {
        const secret = authenticator.generateSecret();
        await db("users").where({ id: user.id }).update({
          two_factor_secret: secret,
          updated_at: new Date(),
        });

        // Generate OTP auth URL
        const appName = "Transcendence";
        const otpauth = authenticator.keyuri(email, appName, secret);
        const qrCode = await QRCode.toDataURL(otpauth);

        // Send email verification alongside 2FA setup
        await sendUserVerificationEmail(email, user.id, request.log);

        return reply.status(202).send({
          message: "User registered. Please complete 2FA setup.",
          data: {
            requires2FASetup: true,
            qrCode,
            secret,
            email: user.email,
          },
        });
      }

      await sendUserVerificationEmail(email, user.id, request.log);

      return reply.status(200).send({
        message: "User registered successfully",
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during registration",
      });
    }
  },

  /**
   * Authenticate a user with email and password
   * Handles standard login flow, two-factor authentication checks, and session creation
   * Sets auth token, refresh token, and CSRF token cookies on successful login
   *
   * @async
   * @param {FastifyRequest<LoginRequest>} request - The Fastify request with login credentials
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<void>} - Promise that resolves when the login is completed
   *
   * @throws {400} - If credentials are invalid (INVALID_CREDENTIALS)
   * @throws {403} - If user must use Google auth (GOOGLE_AUTH_REQUIRED)
   * @throws {202} - If two-factor authentication is required (not an error)
   * @throws {500} - On internal server error (INTERNAL_SERVER_ERROR)
   */
  async login(request: FastifyRequest<LoginRequest>, reply: FastifyReply) {
    try {
      const { email, password, rememberMe = false } = request.body;

      // Find user by email
      const user = (await userHelperFunctions.getUserByKey(
        { type: "email", value: email },
        "user"
      )) as User;
      if (!user) {
        return reply.status(400).send({
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
          field: "email",
        });
      }

      // If user is authenticated with Google, redirect to Google login
      if (user.authProvider === "google") {
        return reply.status(403).send({
          code: "GOOGLE_AUTH_REQUIRED",
          message: "You must use Google to login",
          field: "authProvider",
        });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return reply.status(400).send({
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
          field: "password",
        });
      }

      // Check if user has 2FA enabled
      if (user.twoFactorEnabled) {
        // Don't sign token yet, just indicate 2FA is required
        return reply.status(202).send({
          data: {
            requiresTwoFactor: true,
            email: user.email,
          },
          message: "Two factor authentication required",
        });
      }

      // Create JWT token with jti for token revocation
      const sessionId = crypto.randomUUID();
      const authToken = await reply.jwtSign(
        {
          userId: user.id,
          email: user.email,
          username: user.username,
          sessionId,
          longLived: rememberMe,
        },
        {
          jti: sessionId,
          iss: "transcendence",
          aud: "transcendence",
          expiresIn: "7m",
        }
      );

      // Create refresh token
      const refreshToken = crypto.randomBytes(40).toString("hex");
      await db("refresh_tokens").insert({
        id: sessionId,
        user_id: user.id,
        token: refreshToken,
        expires_at: addDays(new Date(), rememberMe ? 30 : 7),
        device_info: request.headers["user-agent"] || null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Set auth token in HttpOnly cookie
      reply.setCookie(COOKIE_NAME, authToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 12, // 12 hours
      });

      // Set refresh token in HttpOnly cookie
      reply.setCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
      });

      // Generate and set CSRF token in readable cookie
      const csrfToken = `csrf_${crypto.randomUUID()}`;
      reply.setCookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 12, // 12 hours
      });

      // Return user data (excluding sensitive data)
      const { password: _1, twoFactorSecret: _2, ...publicUser } = user;

      // log successful login attempt
      request.log.info({
        event: "user_login",
        userId: user.id,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        status: "success",
      });

      return reply.status(200).send({
        message: "Login successful",
        data: {
          user: publicUser as PublicUser,
          refreshToken,
          requiresTwoFactor: user.twoFactorEnabled,
        },
      });
    } catch (error) {
      request.log.warn({
        event: "user_login",
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        status: "failed",
        error: error instanceof Error ? error.message : (error as string),
      });
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "An error occurred during login",
      });
    }
  },

  /**
   * Authenticate a user with Google OAuth
   * Validates Google ID token, creates or updates user account, and establishes session
   * Handles both new user signup and existing user login via Google
   *
   * @async
   * @param {FastifyRequest<GoogleLoginRequest>} request - The Fastify request with Google token
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<void>} - Promise that resolves when Google authentication is completed
   *
   * @throws {500} - If Google token is invalid (GOOGLE_AUTH_ERROR)
   * @throws {500} - If user creation fails (INTERNAL_SERVER_ERROR)
   */
  async googleLogin(
    request: FastifyRequest<GoogleLoginRequest>,
    reply: FastifyReply
  ) {
    try {
      const { token } = request.body;
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const rememberMe = false; // Default to false for OAuth logins
      let requirePasswordSetup = false;

      // Verify the Google token
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload?.email) {
        throw new Error("Invalid Google token");
      }

      // Find existing user
      let user = (await userHelperFunctions.getUserByKey(
        { type: "email", value: payload.email },
        "publicUser"
      )) as PublicUser;

      // If user doesn't exist, create it
      if (!user) {
        // Generate a username from email (remove everything after @ and make lowercase)
        const baseUsername = payload.email.split("@")[0].toLowerCase();
        let username = baseUsername;
        let usernameSuffix = 1;

        // Check if username already exists and find an available one
        while (await db("users").where("username", username).first()) {
          username = `${baseUsername}${usernameSuffix++}`;
        }

        // Create new user with Google profile data
        const userId = (
          await db("users")
            .insert({
              first_name: payload.given_name || "",
              last_name: payload.family_name || "",
              username,
              display_name: username,
              email: payload.email,
              // Set a random password that won't be used
              password_hash: await bcrypt.hash(
                crypto.randomBytes(16).toString("hex"),
                10
              ),
              google_avatar_url: payload.picture,
              avatar_filename: await storeGoogleAvatar(payload.picture),
              role: "user",
              auth_provider: "google",
              provider_id: payload.sub,
              is_verified: payload.email_verified,
              is_online: true,
              created_at: new Date(),
              updated_at: new Date(),
            })
            .returning("id")
        )[0].id;

        // Get the newly created user
        user = (await userHelperFunctions.getUserByKey(
          { type: "id", value: userId },
          "publicUser"
        )) as PublicUser;
        if (!user) {
          return reply.status(500).send({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user",
          });
        }
        requirePasswordSetup = true;
      } else if (user.authProvider === "local") {
        // enrich user with google profile data
        await db("users")
          .where("id", user.id)
          .update({
            google_avatar_url: payload.picture,
            avatar_filename: await storeGoogleAvatar(payload.picture),
            auth_provider: "google",
            provider_id: payload.sub,
            is_verified: payload.email_verified,
            two_factor_enabled: false,
          });
      }

      // Generate JWT with user data
      const sessionId = crypto.randomUUID();
      const authToken = await reply.jwtSign(
        {
          userId: user.id,
          email: user.email,
          username: user.username,
          sessionId,
          longLived: rememberMe,
        },
        {
          jti: sessionId,
          iss: "transcendence",
          aud: "transcendence",
          expiresIn: "7m",
        }
      );

      // Create refresh token
      const refreshToken = crypto.randomBytes(40).toString("hex");
      await db("refresh_tokens").insert({
        id: sessionId,
        user_id: user.id,
        token: refreshToken,
        expires_at: addDays(new Date(), rememberMe ? 30 : 7),
        device_info: request.headers["user-agent"] || null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Set auth cookie
      reply.setCookie(COOKIE_NAME, authToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 12, // 12 hours
      });

      // Set refresh token in HttpOnly cookie
      reply.setCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
      });

      // Generate and set CSRF token in readable cookie
      const csrfToken = `csrf_${crypto.randomUUID()}`;
      reply.setCookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 12, // 12 hours
      });

      // log successful login attempt
      request.log.info({
        event: "user_login",
        userId: user.id,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        status: "success",
      });

      return reply.status(200).send({
        message: "Google authentication successful",
        data: {
          user,
          refreshToken,
          requirePasswordSetup,
        },
      });
    } catch (error) {
      request.log.warn({
        event: "user_login",
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        status: "failed",
        error: error instanceof Error ? error.message : (error as string),
      });
      return reply.status(500).send({
        code: "GOOGLE_AUTH_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Google authentication failed",
      });
    }
  },

  /**
   * Log out a user from the current device/session
   * Invalidates the current session, clears all authentication cookies,
   * and removes the refresh token from the database
   *
   * @async
   * @param {FastifyRequest<LogoutRequest>} request - The Fastify request with current user session
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<void>} - Promise that resolves when the logout is completed
   *
   * @throws {500} - If an error occurs during logout (LOGOUT_ERROR)
   */
  async logout(request: FastifyRequest<LogoutRequest>, reply: FastifyReply) {
    try {
      // Invalidate current session
      if (request.user?.sessionId) {
        await invalidateSession(request.user.sessionId, request.user.userId);
      }

      // Clear the auth token cookie
      reply.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
      });

      // Clear the refresh token cookie
      reply.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
      });

      // Clear the CSRF token cookie
      reply.clearCookie(CSRF_COOKIE_NAME, {
        httpOnly: false,
        secure: true,
        sameSite: "strict",
        path: "/",
      });

      return reply.status(200).send({
        message: "Successfully logged out",
      });
    } catch (error) {
      return reply.status(500).send({
        code: "LOGOUT_ERROR",
        message: "An error occurred during logout",
      });
    }
  },

  /**
   * Logs out the current user from all devices
   *
   * Invalidates all refresh tokens for the user, effectively terminating all active sessions.
   * Also clears authentication cookies from the current session.
   *
   * @async
   * @param {FastifyRequest<LogoutEverywhereRequest>} request - The authenticated request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 204 (No Content) on successful logout
   * @throws {401} - If user is not authenticated
   * @throws {500} - If logout fails with LOGOUT_ERROR code
   */
  async logoutEverywhere(
    request: FastifyRequest<LogoutEverywhereRequest>,
    reply: FastifyReply
  ) {
    try {
      await invalidateAllUserSessions(request.user.userId);
      // Clear the auth token cookie
      reply.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
      });

      // Clear the CSRF token cookie
      reply.clearCookie(CSRF_COOKIE_NAME, {
        httpOnly: false,
        secure: true,
        sameSite: "strict",
        path: "/",
      });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send({
        code: "LOGOUT_ERROR",
        message: "An error occurred during logout",
      });
    }
  },

  /***************************************
   *                                     *
   *    Password management endpoints    *
   *                                     *
   ***************************************/

  /**
   * Handles forgot password request and generates a reset token
   *
   * Checks if the user exists, generates a password reset token, and sends a reset email.
   * Does not reveal whether an email exists in the system for security reasons.
   *
   * @async
   * @param {FastifyRequest<ForgotPasswordRequest>} request - The Fastify request with email in body
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with success message regardless of email existence
   * @throws {500} - If there's a server error (INTERNAL_SERVER_ERROR)
   */
  async forgotPassword(
    request: FastifyRequest<ForgotPasswordRequest>,
    reply: FastifyReply
  ) {
    const { email } = request.body;
    const FRONTEND_URL =
      process.env.NODE_ENV === "development"
        ? process.env.FRONTEND_HTTPS_URL
        : process.env.FRONTEND_NGINX_URL;
    try {
      // Check if user exists (but don't reveal if they don't)
      const user = await userHelperFunctions.getUserByKey(
        { type: "email", value: email },
        "publicUser"
      );
      if (!user) {
        // Don't reveal if the user doesn't exist
        return reply.status(200).send({
          message:
            "If an account with that email exists, a password reset link has been sent.",
        });
      }

      // Generate and store reset token
      const token = await tokenStore.createToken(email, 1, request.log);

      await sendPasswordResetEmail(email, token, request.log);
      request.log.info(`Password reset token for ${email}: ${token}`);
      request.log.info(
        `Reset URL: ${FRONTEND_URL}/reset-password?token=${token}`
      );

      return reply.status(200).send({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    } catch (error) {
      request.log.error(error);
      15;
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while processing your request.",
      });
    }
  },

  /**
   * Resets user password using provided token
   *
   * Validates the reset token, verifies it's not expired or used, updates the user's password,
   * and marks the token as used.
   *
   * @async
   * @param {FastifyRequest<ResetPasswordRequest>} request - The request with token and new password
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with success message on success
   * @throws {400} - If token is invalid or expired (INVALID_TOKEN, TOKEN_EXPIRED)
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If there's a server error (INTERNAL_SERVER_ERROR)
   */
  async resetPassword(
    request: FastifyRequest<ResetPasswordRequest>,
    reply: FastifyReply
  ) {
    const { token, password } = request.body;

    try {
      // Validate token
      const { email, valid, message } = await tokenStore.validateToken(
        token,
        request.log
      );
      if (!valid) {
        return reply.status(400).send({
          code: "INVALID_TOKEN",
          message: message || "Invalid or expired token",
        });
      }

      // Find user by email
      const user = await db("users").where({ email }).first();
      if (!user) {
        return reply.status(400).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      // Hash the new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update user's password
      await db("users").where({ id: user.id }).update({
        password_hash: passwordHash,
        updated_at: new Date(),
      });

      // Mark token as used
      await tokenStore.markTokenAsUsed(token, request.log);

      return reply.status(200).send({
        message: "Password has been reset successfully",
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while resetting your password",
      });
    }
  },

  /***************************************
   *                                     *
   *      JWT management endpoints       *
   *                                     *
   ***************************************/

  /**
   * Refreshes authentication tokens using HTTP-only cookies
   *
   * Validates the current refresh token cookie, optionally rotates tokens for security,
   * and sets new HTTP-only cookies. Supports selective token refresh (auth and/or refresh tokens)
   * based on request body. Maintains session persistence and updates last_used_at timestamps.
   *
   * @async
   * @param {FastifyRequest<RefreshTokenRequest>} request - Request with tokens array indicating which tokens to refresh
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns appropriate HTTP status based on outcome
   * @throws {204} - If no refresh token found (NO_SESSION)
   * @throws {401} - If JWT token can't be decoded (INVALID_TOKEN)
   * @throws {401} - If refresh token is invalid (INVALID_REFRESH_TOKEN)
   * @throws {401} - If session has expired (SESSION_EXPIRED)
   * @throws {500} - If refresh operation fails (REFRESH_ERROR)
   */
  async refreshToken(
    request: FastifyRequest<RefreshTokenRequest>,
    reply: FastifyReply
  ) {
    try {
      const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME];

      // Validate the refresh token
      if (!refreshToken) {
        return reply.status(204).send({
          code: "NO_SESSION",
          message: "No active session found",
        });
      }

      // Verify the current JWT to get session info
      let currentUser:
        | {
            userId: number;
            email: string;
            username: string;
            sessionId: string;
            longLived: boolean;
          }
        | undefined;
      try {
        await request.jwtVerify();
        currentUser = request.user;
      } catch (jwtError) {
        // If JWT is expired but we have a valid refresh token, we'll continue
        if (
          (jwtError as { code?: string }).code !==
          "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED"
        ) {
          throw jwtError;
        }
        // Get the user from the token even if it's expired
        try {
          const { user } = await request.jwtVerify<{
            user: typeof currentUser;
          }>({ ignoreExpiration: true });
          currentUser = user;
        } catch (decodeError) {
          // If we can't decode the token at all, it's invalid
          return reply.status(401).send({
            code: "INVALID_TOKEN",
            message: "Invalid authentication token",
          });
        }
      }

      // Find refresh token in database
      const tokenRecord = await db("refresh_tokens")
        .where({ token: refreshToken })
        .first();

      if (!tokenRecord || new Date(tokenRecord.expires_at) < new Date()) {
        return reply.status(401).send({
          code: "INVALID_REFRESH_TOKEN",
          message: "Invalid or expired refresh token",
        });
      }

      // If we have a current user from JWT, verify session ID matches
      if (currentUser?.sessionId && currentUser.sessionId !== tokenRecord.id) {
        return reply.status(401).send({
          code: "SESSION_MISMATCH",
          message: "Session ID does not match refresh token",
        });
      }

      // Get user from token
      const user = await userHelperFunctions.getUserByKey(
        { type: "id", value: tokenRecord.user_id },
        "publicUser"
      );
      if (!user) {
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      }
      // Generate new session ID for rotation
      const newSessionId = crypto.randomUUID();
      let authToken: string;
      let newRefreshToken: string;
      let csrfToken: string;

      if (request.body.tokens.includes("auth")) {
        // Create new access token with session ID
        authToken = await reply.jwtSign(
          {
            userId: user.id,
            email: user.email,
            username: user.username,
            sessionId: newSessionId,
            longLived: currentUser?.longLived,
          },
          {
            jti: newSessionId,
            iss: "transcendence",
            aud: "transcendence",
            expiresIn: "7m",
          }
        );

        reply.setCookie(COOKIE_NAME, authToken, {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          path: "/",
          maxAge: 60 * 60 * 12, // 12 hours
        });
      }

      if (request.body.tokens.includes("refresh")) {
        // Create new refresh token
        newRefreshToken = crypto.randomBytes(40).toString("hex");

        // Save new refresh token, delete old one in a transaction
        await db.transaction(async trx => {
          // Delete the old refresh token
          await trx("refresh_tokens").where({ id: tokenRecord.id }).delete();

          // Insert the new refresh token with the new session ID
          await trx("refresh_tokens").insert({
            id: request.body.tokens.includes("auth")
              ? newSessionId
              : tokenRecord.id,
            user_id: user.id,
            token: newRefreshToken,
            expires_at: addDays(new Date(), currentUser?.longLived ? 30 : 7),
            device_info: tokenRecord.device_info,
            created_at: new Date(),
            updated_at: new Date(),
            last_used_at: new Date(),
          });
        });
        // Set the refresh token in an HTTP-only cookie
        reply.setCookie(REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, {
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          maxAge: currentUser?.longLived ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
        });
      } else if (request.body.tokens.includes("auth")) {
        await db.transaction(async trx => {
          await trx("refresh_tokens").where({ id: tokenRecord.id }).update({
            id: newSessionId,
            updated_at: new Date(),
            last_used_at: new Date(),
          });
        });
      }

      // Set cookies
      if (request.body.tokens.includes("auth")) {
        // Generate and set CSRF token in readable cookie
        const csrfToken = `csrf_${crypto.randomUUID()}`;
        reply.setCookie(CSRF_COOKIE_NAME, csrfToken, {
          httpOnly: false,
          secure: true,
          sameSite: "strict",
          path: "/",
          maxAge: 60 * 60 * 12, // 12 hours
        });
      }
      if (request.body.tokens.includes("refresh")) {
      }

      return reply.status(200).send({
        data: {
          authTokenExpiresIn: request.body.tokens.includes("auth")
            ? 7 * 60
            : request.user.exp,
          refreshTokenExpiresIn: request.body.tokens.includes("refresh")
            ? request.user.longLived
              ? 30 * 24 * 60 * 60
              : 7 * 24 * 60 * 60
            : tokenRecord.expires_at,
        },
        message: "Refresh token generated successfully",
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred refreshing the token",
      });
    }
  },

  /***************************************
   *                                     *
   *      2FA management endpoints       *
   *                                     *
   ***************************************/

  /**
   * Sets up two-factor authentication for an authenticated user
   *
   * Generates a 2FA secret for the user, creates an OTP auth URL, generates a QR code,
   * and saves the secret to the user record. Does not enable 2FA yet - that requires verification
   * with the enable2FA endpoint.
   *
   * @async
   * @param {FastifyRequest<Setup2FARequest>} request - The authenticated request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with secret and QR code for 2FA setup
   * @throws {401} - If user is not authenticated
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async setup2FA(
    request: FastifyRequest<Setup2FARequest>,
    reply: FastifyReply
  ) {
    try {
      // Verify current user
      await (request as any).jwtVerify();
      const payload = request.user as { userId: number };

      const user = (await userHelperFunctions.getUserByKey(
        { type: "id", value: payload.userId },
        "user"
      )) as User;
      if (!user) {
        return reply
          .status(404)
          .send({ code: "USER_NOT_FOUND", message: "User not found" });
      }

      // Generate a secret
      const secret = authenticator.generateSecret();

      // Store temporarily (will be confirmed when user verifies)
      await db("users").where({ id: user.id }).update({
        two_factor_secret: secret,
        updated_at: new Date(),
      });

      // Generate OTP auth URL
      const appName = "Transcendence";
      const otpauth = authenticator.keyuri(user.email, appName, secret);

      // Generate QR code
      const qrCode = await QRCode.toDataURL(otpauth);

      return reply.status(200).send({
        message: "2FA setup successfully",
        data: {
          secret,
          qrCode,
        },
      });
    } catch (error) {
      console.error("2FA setup error:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during 2FA setup",
      });
    }
  },

  /**
   * Enables two-factor authentication for a user account
   *
   * Verifies the provided 2FA code against the stored secret and enables 2FA on the user account.
   * Works for both authenticated users and during registration flow (email-based identification).
   *
   * @async
   * @param {FastifyRequest<Enable2FARequest>} request - Request with 2FA verification code and optional email
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with success message when 2FA is enabled
   * @throws {400} - If request is missing parameters (INVALID_REQUEST)
   * @throws {400} - If verification code is invalid (INVALID_CODE)
   * @throws {401} - If user is not authenticated
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async enable2FA(
    request: FastifyRequest<Enable2FARequest>,
    reply: FastifyReply
  ) {
    try {
      const { code, email } = request.body;

      // Find user by email (for registration flow)
      const user = (await userHelperFunctions.getUserByKey(
        { type: "email", value: email },
        "user"
      )) as User;
      if (!user) {
        return reply
          .status(404)
          .send({ code: "USER_NOT_FOUND", message: "User not found" });
      }

      // Verify the code
      const secret = user.twoFactorSecret;

      if (!secret) {
        return reply.status(400).send({
          code: "TWO_FACTOR_NOT_SETUP",
          message: "2FA not set up yet. Please set up 2FA first.",
        });
      }

      const isValid = authenticator.verify({
        token: code,
        secret: secret || "",
      });

      if (!isValid) {
        return reply.status(401).send({
          code: "INVALID_VERIFICATION_CODE",
          message: "Invalid verification code",
        });
      }

      // Enable 2FA
      await db("users").where({ id: user.id }).update({
        two_factor_enabled: true,
        updated_at: new Date(),
      });

      return reply.status(200).send({
        message: "Two-factor authentication enabled successfully",
      });
    } catch (error) {
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred enabling 2FA",
      });
    }
  },

  /**
   * Disables two-factor authentication for the authenticated user
   *
   * Updates the user's record to turn off 2FA and removes the stored 2FA secret.
   * This endpoint requires authentication via JWT.
   *
   * @async
   * @param {FastifyRequest<Disable2FARequest>} request - The authenticated request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with success message on successful disable
   * @throws {401} - If user is not authenticated
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async disable2FA(
    request: FastifyRequest<Disable2FARequest>,
    reply: FastifyReply
  ) {
    try {
      // Verify current user
      await (request as any).jwtVerify();
      const payload = request.user as { userId: number };

      // Update user
      await db("users").where({ id: payload.userId }).update({
        two_factor_enabled: false,
        two_factor_secret: null,
        updated_at: new Date(),
      });

      return reply.status(200).send({
        message: "Two-factor authentication disabled successfully",
      });
    } catch (error) {
      console.error("2FA disable error:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred disabling 2FA",
      });
    }
  },

  /**
   * Verifies a two-factor authentication code during login
   *
   * Validates the provided 2FA code against the user's stored secret. If valid,
   * creates a JWT token, session record, and necessary cookies for authentication.
   * This is used as the second step in a 2FA-enabled login flow.
   *
   * @async
   * @param {FastifyRequest<Verify2FARequest>} request - Request with 2FA code and user email
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with user data and session info on successful verification
   * @throws {400} - If verification code is invalid (INVALID_CODE)
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async verify2FA(
    request: FastifyRequest<Verify2FARequest>,
    reply: FastifyReply
  ) {
    try {
      const { code, email } = request.body;

      // Find user
      const user = (await userHelperFunctions.getUserByKey(
        { type: "email", value: email },
        "user"
      )) as User;
      if (!user) {
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "Invalid email or code",
        });
      }

      // Verify code
      const isValid = authenticator.verify({
        token: code,
        secret: user.twoFactorSecret || "",
      });

      if (!isValid) {
        return reply.status(401).send({
          code: "INVALID_VERIFICATION_CODE",
          message: "Invalid verification code",
        });
      }

      // Code is valid, sign JWT and proceed with login
      // Generate JWT with user data
      const sessionId = crypto.randomUUID();
      const authToken = await reply.jwtSign(
        {
          userId: user.id,
          email: user.email,
          username: user.username,
          sessionId,
          longLived: false,
        },
        {
          jti: sessionId,
          iss: "transcendence",
          aud: "transcendence",
          expiresIn: "7m",
        }
      );

      // Create refresh token - ADDED
      const refreshToken = crypto.randomBytes(40).toString("hex");

      // Store session in database - ADDED
      await db("refresh_tokens").insert({
        id: sessionId,
        user_id: user.id,
        token: refreshToken,
        expires_at: addDays(new Date(), 7), // Default to 7 days for 2FA verification
        device_info: request.headers["user-agent"] || null,
        created_at: new Date(),
        updated_at: new Date(),
        last_used_at: new Date(),
      });

      // Set auth token in HttpOnly cookie
      reply.setCookie(COOKIE_NAME, authToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 12, // 12 hours
      });

      // Set refresh token in HttpOnly cookie - ADDED
      reply.setCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days (default for non-remember-me)
      });

      // Generate and set CSRF token in readable cookie
      const csrfToken = `csrf_${crypto.randomUUID()}`;
      reply.setCookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 12, // 12 hours
      });

      // Return user data (excluding password)
      const { password: _1, twoFactorSecret: _2, ...publicUser } = user;

      return reply.status(200).send({
        message: "2FA verification successful",
        data: {
          user: publicUser as PublicUser,
        },
      });
    } catch (error) {
      console.error("2FA verification error:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during 2FA verification",
      });
    }
  },

  /***************************************
   *                                     *
   *    Session management endpoints     *
   *                                     *
   ***************************************/

  /**
   * Retrieves the current active session for the authenticated user
   *
   * Fetches details about the user's current session using the session ID from JWT.
   * Returns formatted session data including expiration time and current time for client-side calculations.
   *
   * @async
   * @param {FastifyRequest<GetCurrentSessionRequest>} request - The authenticated request object with JWT
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with session data including expiration time
   * @throws {401} - If no active session found (UNAUTHORIZED)
   * @throws {404} - If session not found in database (SESSION_NOT_FOUND)
   * @throws {500} - If server error occurs (SESSION_FETCH_ERROR)
   */
  async getCurrentSession(
    request: FastifyRequest<GetCurrentSessionRequest>,
    reply: FastifyReply
  ) {
    try {
      // Get the current session ID from the JWT
      const sessionId = request.user?.sessionId;
      if (!sessionId) {
        return reply.status(401).send({
          code: "UNAUTHORIZED",
          message: "No active session found",
        });
      }

      // Get the current session
      const session = await db("refresh_tokens")
        .where({
          id: sessionId,
          user_id: request.user.userId,
        })
        .select("id", "created_at", "expires_at", "device_info", "last_used_at")
        .first();

      if (!session) {
        return reply.status(404).send({
          code: "SESSION_NOT_FOUND",
          message: "Current session not found",
        });
      }

      return reply.status(200).send({
        data: {
          session: {
            ...transformSession(session),
            expiresAt: session.expires_at,
            currentTime: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error("Current session error:", error);
      return reply.status(500).send({
        code: "SESSION_FETCH_ERROR",
        message: "An error occurred retrieving current session data",
      });
    }
  },

  /**
   * Validates the current user session
   *
   * Checks if the user's session is valid by verifying the session ID from JWT
   * against the database record. Returns validity status and token expiration times.
   * Used by client to determine if session refresh is needed.
   *
   * @async
   * @param {FastifyRequest<ValidateSessionRequest>} request - The authenticated request object with JWT
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with validity status and token expiration times
   * @throws {401} - If no active session found (NO_SESSION)
   * @throws {401} - If session not found in database (INVALID_SESSION)
   * @throws {500} - If server error occurs (VALIDATION_ERROR)
   */
  async validateSession(
    request: FastifyRequest<ValidateSessionRequest>,
    reply: FastifyReply
  ) {
    try {
      const sessionId = request.user?.sessionId;
      const authTokenExpiryTime = new Date(request.user?.exp! * 1000);
      if (!sessionId) {
        return reply.status(401).send({
          code: "NO_SESSION",
          message: "No active session found",
        });
      }

      const session = await db("refresh_tokens")
        .where({
          id: sessionId,
          user_id: request.user.userId,
        })
        .select("expires_at")
        .first();

      if (
        !session ||
        new Date(session.expires_at) <= new Date() ||
        authTokenExpiryTime <= new Date()
      ) {
        return reply.status(200).send({
          data: {
            valid: false,
            refreshTokenExpiresAt: new Date(session.expires_at).toISOString(),
            authTokenExpiresAt: authTokenExpiryTime.toISOString(),
          },
          message: "Session is invalid or expired",
        });
      }

      return reply.status(200).send({
        data: {
          valid: true,
          refreshTokenExpiresAt: new Date(session.expires_at).toISOString(),
          authTokenExpiresAt: authTokenExpiryTime.toISOString(),
        },
        message: "Session is valid",
      });
    } catch (error) {
      console.error("Session validation error:", error);
      return reply.status(500).send({
        code: "VALIDATION_ERROR",
        message: "Error validating session",
      });
    }
  },

  /**
   * Retrieves all active sessions for the authenticated user
   *
   * Fetches and returns a list of all active sessions belonging to the current user.
   * Session data is transformed to a consistent format with the transformSession helper.
   *
   * @async
   * @param {FastifyRequest<GetSessionsRequest>} request - The authenticated request object with JWT
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with array of session objects
   * @throws {500} - If database or server error occurs (SESSION_FETCH_ERROR)
   */
  async getSessions(
    request: FastifyRequest<GetSessionsRequest>,
    reply: FastifyReply
  ) {
    try {
      const sessions = (
        await db("refresh_tokens")
          .where("user_id", request.user.userId)
          .select("id", "created_at", "device_info", "last_used_at")
      ).map(transformSession);
      return reply.status(200).send({ sessions });
    } catch (error) {
      console.error("Session data error:", error);
      return reply.status(500).send({
        code: "SESSION_FETCH_ERROR",
        message: "An error occurred retrieving session data",
      });
    }
  },

  /**
   * Retrieves all active sessions across all users (admin endpoint)
   *
   * Admin endpoint that fetches all active sessions in the system with user information.
   * Joins user and session data and transforms it to a consistent format.
   *
   * @async
   * @param {FastifyRequest<GetAllSessionsRequest>} request - The authenticated admin request
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with array of all session objects including user data
   * @throws {500} - If database or server error occurs (ADMIN_SESSION_FETCH_ERROR)
   */
  async getAllSessions(
    request: FastifyRequest<GetAllSessionsRequest>,
    reply: FastifyReply
  ) {
    try {
      const sessions = (
        await db("refresh_tokens")
          .join("users", "refresh_tokens.user_id", "users.id")
          .select(
            "refresh_tokens.id",
            "refresh_tokens.created_at",
            "refresh_tokens.device_info",
            "refresh_tokens.last_used_at",
            "users.id as user_id",
            "users.username"
          )
      ).map(transformSession);
      return reply.status(200).send({ sessions });
    } catch (error) {
      console.error("Admin session data error:", error);
      return reply.status(500).send({
        code: "ADMIN_SESSION_FETCH_ERROR",
        message: "An error occurred retrieving all sessions data",
      });
    }
  },

  /**
   * Deletes a specific session by ID
   *
   * Allows users to invalidate a specific session (such as logging out from a specific device).
   * Uses the invalidateSession helper function to remove the session from the database.
   * Only allows users to delete their own sessions for security.
   *
   * @async
   * @param {FastifyRequest<DeleteSessionRequest>} request - The authenticated request with session ID parameter
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 204 (No Content) on successful deletion
   * @throws {404} - If session not found or doesn't belong to user (SESSION_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async deleteSession(
    request: FastifyRequest<DeleteSessionRequest>,
    reply: FastifyReply
  ) {
    try {
      const wasDeleted = await invalidateSession(
        request.params.id,
        request.user.userId
      );

      if (!wasDeleted) {
        return reply.status(404).send({
          code: "SESSION_NOT_FOUND",
          message:
            "Session not found or you don't have permission to delete it",
        });
      }

      return reply.status(204).send();
    } catch (error) {
      console.error("Session deletion error:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while deleting the session",
      });
    }
  },

  /****************************
   *                          *
   *  Verification endpoints  *
   *                          *
   ***************************/

  /**
   * Verifies a user's email address using a token
   *
   * Validates the provided verification token and marks the user's email as verified
   * if the token is valid. This endpoint is typically accessed via a link in an
   * email sent to the user during registration or email change.
   *
   * @async
   * @param {FastifyRequest<VerifyEmailRequest>} request - The request with verification token
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with success message on successful verification
   * @throws {400} - If token is missing (MISSING_TOKEN)
   * @throws {400} - If token format is invalid (INVALID_TOKEN)
   * @throws {400} - If token has expired (TOKEN_EXPIRED)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async verifyEmail(
    request: FastifyRequest<VerifyEmailRequest>,
    reply: FastifyReply
  ) {
    const { token } = request.query;

    if (!token) {
      return reply.status(400).send({
        code: "MISSING_TOKEN",
        message: "Verification token is required",
      });
    }
    try {
      const userId = await verifyToken(token);
      if (!userId) {
        return reply.status(400).send({
          code: "INVALID_TOKEN",
          message: "Invalid or expired email verification token",
        });
      }

      // Update user's verification status
      await db("users").where("id", userId).update({ is_verified: true });

      return reply.status(200).send({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during email verification",
      });
    }
  },

  /**
   * Verifies if a provided password matches a user's stored password
   *
   * Validates a password against a user's stored password hash. This endpoint
   * is typically used during sensitive operations requiring re-authentication.
   * Does not create or update any authentication state.
   *
   * @async
   * @param {FastifyRequest<VerifyPasswordRequest>} request - The request with userId and password
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with success status if password is valid
   * @throws {401} - If password is incorrect (INVALID_PASSWORD)
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async verifyPassword(
    request: FastifyRequest<VerifyPasswordRequest>,
    reply: FastifyReply
  ) {
    try {
      const { userId, password } = request.body;

      // Find user by ID
      const user = await db("users").where("id", userId).first();

      if (!user) {
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!isPasswordValid) {
        return reply.status(401).send({
          code: "INVALID_PASSWORD",
          message: "Invalid password",
        });
      }

      return reply.status(200).send({
        message: "Password verified successfully",
        data: {
          valid: true,
        },
      });
    } catch (error) {
      console.error("Password verification error:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during password verification",
      });
    }
  },

  /**
   * Resends a verification email to an unverified user
   *
   * Checks if the user exists and is not already verified, then sends a new
   * verification email with a token link. Used when the original verification
   * email was lost or expired.
   *
   * @async
   * @param {FastifyRequest<ResendVerificationRequest>} request - The request with user's email
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns 200 with success message if email sent
   * @throws {400} - If email already verified (USER_ALREADY_VERIFIED)
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async resendVerification(
    request: FastifyRequest<ResendVerificationRequest>,
    reply: FastifyReply
  ) {
    try {
      const { email } = request.body;
      const user = await db("users").where("email", email).first();

      if (!user) {
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.is_verified) {
        return reply.status(400).send({
          code: "EMAIL_ALREADY_VERIFIED",
          message: "Email is already verified",
        });
      }

      await sendUserVerificationEmail(user.email, user.id, request.log);
      return reply.status(200).send({
        message: "Verification email sent successfully",
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        code: "EMAIL_VERIFICATION_ERROR",
        message: "Failed to resend verification email",
      });
    }
  },
};
