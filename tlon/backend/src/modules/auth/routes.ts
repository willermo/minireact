import { FastifyInstance } from "fastify";
import { authController } from "./controller";
import {
  registerSchema,
  loginSchema,
  logoutSchema,
  logoutEverywhereSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  enable2FASchema,
  setup2FASchema,
  disable2FASchema,
  verify2FASchema,
  getCurrentSessionSchema,
  validateSessionSchema,
  getSessionsSchema,
  getAllSessionsSchema,
  deleteSessionSchema,
  verifyEmailSchema,
  verifyPasswordSchema,
  resendVerificationSchema,
} from "./schemas";
import { requireAdmin, requireAuth } from "../../middleware/auth";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 */
export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get("/status", authController.getStatus);

  fastify.post("/register", {
    schema: registerSchema,
    handler: authController.register,
  });

  fastify.post("/login", {
    schema: loginSchema,
    handler: authController.login,
  });

  fastify.post("/google-login", {
    schema: googleLoginSchema,
    handler: authController.googleLogin,
  });

  fastify.post("/logout", {
    schema: logoutSchema,
    handler: authController.logout,
  });

  fastify.post("/logout-everywhere", {
    schema: logoutEverywhereSchema,
    handler: authController.logoutEverywhere,
  });

  fastify.post("/forgot-password", {
    schema: forgotPasswordSchema,
    handler: authController.forgotPassword,
  });

  fastify.post("/reset-password", {
    schema: resetPasswordSchema,
    handler: authController.resetPassword,
  });

  fastify.post("/refresh-token", {
    schema: refreshTokenSchema,
    handler: authController.refreshToken,
  });

  fastify.post("/setup-2fa", {
    schema: setup2FASchema,
    handler: authController.setup2FA,
  });

  fastify.post("/enable-2fa", {
    schema: enable2FASchema,
    handler: authController.enable2FA,
  });

  fastify.post("/disable-2fa", {
    schema: disable2FASchema,
    handler: authController.disable2FA,
  });

  fastify.post("/verify-2fa", {
    schema: verify2FASchema,
    handler: authController.verify2FA,
  });

  fastify.get("/session/current", {
    preValidation: [requireAuth],
    schema: getCurrentSessionSchema,
    handler: authController.getCurrentSession,
  });

  fastify.get("/validate-session", {
    preValidation: [requireAuth],
    schema: validateSessionSchema,
    handler: authController.validateSession,
  });

  fastify.get("/sessions/me", {
    preValidation: [requireAuth],
    schema: getSessionsSchema,
    handler: authController.getSessions,
  });

  fastify.get("/admin/sessions", {
    preValidation: [requireAdmin],
    schema: getAllSessionsSchema,
    handler: authController.getAllSessions,
  });

  fastify.delete("/sessions/:id/revoke", {
    preValidation: [requireAuth],
    schema: deleteSessionSchema,
    handler: authController.deleteSession,
  });

  fastify.get("/verify-email", {
    schema: verifyEmailSchema,
    handler: authController.verifyEmail,
  });

  fastify.post("/verify-password", {
    schema: verifyPasswordSchema,
    handler: authController.verifyPassword,
  });

  fastify.post("/resend-verification", {
    schema: resendVerificationSchema,
    handler: authController.resendVerification,
  });
}
