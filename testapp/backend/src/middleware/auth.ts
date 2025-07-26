import { FastifyRequest, FastifyReply } from "fastify";
import db from "../db";

// Extend Fastify types to include our custom session
declare module "fastify" {
  interface FastifyRequest {
    session?: {
      id: string;
      userId: number;
      expiresAt: Date;
    };
  }
}

/**
 * Middleware to verify JWT and check if user is an admin
 */
export const requireAdmin = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // First verify auth and session
  const isAuthenticated = await requireAuth(request, reply);
  if (!isAuthenticated) return false;

  try {
    // Get user ID from token
    const user = request.user;
    if (!user) {
      reply.status(401).send({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
      return false;
    }

    // Check if user is admin
    const dbUser = await db("users").where({ id: user.userId }).first();
    if (dbUser?.role !== "admin") {
      reply.status(403).send({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
      return false;
    }

    return true;
  } catch (err) {
    console.error("Admin check error:", err);
    reply.status(500).send({
      code: "INTERNAL_SERVER_ERROR",
      message: "Error verifying admin status",
    });
    return false;
  }
};

/**
 * Middleware to verify JWT only
 */
export const requireAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> => {
  try {
    await request.jwtVerify();

    const user = request.user;

    if (!user?.sessionId) {
      reply.status(401).send({
        code: "INVALID_SESSION",
        message: "Session ID missing from token",
      });
      return false;
    }

    // Check if session exists and is not expired
    const session = await db("refresh_tokens")
      .where({ id: user.sessionId })
      .where("expires_at", ">", new Date())
      .first();

    if (!session || new Date(session.expires_at) < new Date()) {
      reply.status(401).send({
        code: "INVALID_SESSION",
        message: "Session not found or expired",
      });
      return false;
    }

    // Update last_used_at timestamp
    await db("refresh_tokens").where({ id: user.sessionId }).update({
      last_used_at: new Date(),
      updated_at: new Date(),
    });

    // Add session to request for use in route handlers
    request.session = {
      id: user.sessionId,
      userId: user.userId,
      expiresAt: session.expires_at,
    };

    return true;
  } catch (error) {
    const err = error as Error & { code?: string; statusCode?: number };

    // Handle JWT specific errors
    if (err.code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED") {
      reply.status(401).send({
        code: "TOKEN_EXPIRED",
        message: "Token has expired",
      });
    } else if (err.code === "FST_JWT_AUTHORIZATION_TOKEN_INVALID") {
      reply.status(401).send({
        code: "INVALID_TOKEN",
        message: "Invalid token",
      });
    } else {
      console.error("Auth error:", err);
      reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during authentication",
      });
    }

    return false;
  }
};
