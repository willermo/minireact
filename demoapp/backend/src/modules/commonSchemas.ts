import { z } from "zod";

import type { JSONValue } from "../types/matches";

// Cookie names
export const refreshTokenCookieName = process.env
  .REFRESH_TOKEN_COOKIE_NAME as string;
export const authTokenCookieName = process.env.AUTH_TOKEN_COOKIE_NAME as string;
export const csrfTokenCookieName = process.env.CSRF_TOKEN_COOKIE_NAME as string;

/************************
 *                      *
 *  Validation schemas  *
 *                      *
 ***********************/
export const emailSchema = z
  .string({ required_error: "Email is required" })
  .email("Invalid email address")
  .max(255, "Email must be less than 255 characters");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:'",.<>/?`~]+$/,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
  );

export const usernameSchema = z
  .string()
  .min(2, "Username must be at least 2 characters")
  .max(30, "Username must be less than 30 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores"
  );

export const displayNameSchema = z
  .string()
  .min(2, "Display name must be at least 2 characters")
  .max(30, "Display name must be less than 30 characters")
  .regex(
    /^[A-Za-zÀ-ÖØ-öø-ÿ\'\- ]+$/,
    "Display name can only contain letters, spaces, hyphens, and apostrophes"
  );

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(50, "Name must be less than 50 characters")
  .regex(
    /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]+$/,
    "Name can only contain letters, spaces, hyphens, and apostrophes"
  );

/*****************************
 *                           *
 *  Common response schemas  *
 *                           *
 ****************************/

/* Common Headers schemas */
// Base schema with no required headers
export const minimalHeadersSchema = z.object({}).catchall(z.any());

// For endpoints that require JSON
export const jsonHeadersSchema = minimalHeadersSchema.extend({
  "content-type": z.literal("application/json"),
});

// For protected endpoints that need CSRF
export const protectedHeadersSchema = jsonHeadersSchema.extend({
  "x-csrf-token": z.string().min(1, "CSRF token is required"),
});

// For endpoints that need CSRF but not necessarily JSON
export const csrfOnlyHeadersSchema = minimalHeadersSchema.extend({
  "x-csrf-token": z.string().min(1, "CSRF token is required"),
});

/* Base response schemas */
export const baseResponseSchema = z.object({
  message: z.string().optional(),
});

export const successResponseSchema = z.object({
  ...baseResponseSchema.shape,
});

export const errorResponseSchema = z.object({
  ...baseResponseSchema.shape,
  code: z.string(),
  field: z.string().optional(),
});

/* Helper types */
export type MinimalHeaders = z.infer<typeof minimalHeadersSchema>;
export type JsonHeaders = z.infer<typeof jsonHeadersSchema>;
export type ProtectedHeaders = z.infer<typeof protectedHeadersSchema>;
export type CsrfOnlyHeaders = z.infer<typeof csrfOnlyHeadersSchema>;

export type SimpleSuccessResponse = z.infer<typeof successResponseSchema>;
export type SuccessResponse<T extends z.ZodTypeAny> = SimpleSuccessResponse & {
  data: z.infer<T>;
};

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/* Helper functions for consistent responses */
export const createSuccessResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    message: z.string().optional(),
  });

export const jsonValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.lazy(() => jsonValueSchema)),
  z.record(
    z.string(),
    z.lazy(() => jsonValueSchema)
  ),
]) as z.ZodType<JSONValue>;
