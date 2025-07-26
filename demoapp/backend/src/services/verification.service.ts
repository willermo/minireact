import { randomBytes } from "crypto";
import db from "../db/index";
import type { FastifyBaseLogger } from "fastify";
import { sendVerificationEmail } from "./email.service";

export async function generateVerificationToken(
  userId: number
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  await db("verification_tokens").insert({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function verifyToken(token: string): Promise<number | null> {
  const result = await db("verification_tokens")
    .where("token", token)
    .andWhere("expiresAt", ">", new Date())
    .first();

  if (!result) {
    return null;
  }

  // Delete the used token
  await db("verification_tokens").where("id", result.id).delete();

  return result.userId;
}

export async function sendUserVerificationEmail(
  email: string,
  userId: number,
  logger?: FastifyBaseLogger
): Promise<void> {
  const token = await generateVerificationToken(userId);
  await sendVerificationEmail(email, token, logger);
}
