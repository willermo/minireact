// backend/src/modules/auth/token-store.ts
import { FastifyBaseLogger } from "fastify";
import db from "../../db/index.js";
import { v4 as uuidv4 } from "uuid";
import { addHours } from "date-fns";

export interface PasswordResetToken {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TokenStore {
  private static instance: TokenStore;
  private inMemoryStore = new Map<string, { email: string; expiresAt: Date }>();

  private constructor() {}

  public static getInstance(): TokenStore {
    if (!TokenStore.instance) {
      TokenStore.instance = new TokenStore();
    }
    return TokenStore.instance;
  }

  public async createToken(
    email: string,
    expiresInHours: number = 1,
    logger?: FastifyBaseLogger
  ): Promise<string> {
    const token = uuidv4();
    const expiresAt = addHours(new Date(), expiresInHours);

    try {
      await db("password_reset_tokens").insert({
        token,
        email,
        expires_at: expiresAt,
        used: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } catch (error) {
      logger?.error("Error creating password reset token:", error);
      throw new Error("Failed to create password reset token");
    }

    return token;
  }

  public async validateToken(
    token: string,
    logger?: FastifyBaseLogger
  ): Promise<{ email: string; valid: boolean; message?: string }> {
    try {
      const tokenData = await db("password_reset_tokens")
        .where({ token, used: false })
        .where("expires_at", ">", new Date())
        .first();

      if (!tokenData) {
        return {
          email: "",
          valid: false,
          message: "Invalid or expired token",
        };
      }

      return { email: tokenData.email, valid: true };
    } catch (error) {
      logger?.error("Error validating password reset token:", error);
      return { email: "", valid: false, message: "Error validating token" };
    }
  }

  public async markTokenAsUsed(
    token: string,
    logger?: FastifyBaseLogger
  ): Promise<void> {
    try {
      await db("password_reset_tokens").where({ token }).update({
        used: true,
        updated_at: new Date(),
      });
    } catch (error) {
      logger?.error("Error marking token as used:", error);
      throw new Error("Failed to mark token as used");
    }
  }
}

export const tokenStore = TokenStore.getInstance();
