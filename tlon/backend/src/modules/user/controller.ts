import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcrypt";
import crypto from "crypto";
import db from "../../db/index"; // Must use .js extension for ESM compatibility
import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { fileTypeFromBuffer } from "file-type";
import {
  AVATAR_DIR,
  storeDefaultAvatar,
  storeCustomAvatar,
} from "../../utils/store_avatar";
import {
  UserDTO,
  User,
  PublicUser,
  CreateUser,
  mapUserDTOToUser,
  mapUserDTOToPublicUser,
} from "../../types/user";
import type {
  GetMeRequest,
  GetUsersRequest,
  GetUserByIdRequest,
  GetUserByEmailRequest,
  GetUserByUsernameRequest,
  GetUserByDisplayNameRequest,
  CreateUserRequest,
  DeleteUserByIdRequest,
  DeleteUserByEmailRequest,
  UpdatePasswordRequest,
  SetPasswordForGoogleUserRequest,
  UpdateDisplayNameRequest,
  GetAvatarRequest,
  UploadNewAvatarRequest,
  GetUserRoleRequest,
  UserIsAdminRequest,
  PromoteToAdminRequest,
  DemoteToUserRequest,
} from "./schemas";

type UserRetrievalKeyId = {
  type: "id";
  value: number;
};

type UserRetrievalKeyEmail = {
  type: "email";
  value: string;
};

type UserRetrievalKeyUsername = {
  type: "username";
  value: string;
};

type UserRetrievalKeyDisplayName = {
  type: "display_name";
  value: string;
};

type UserRetrievalKey =
  | UserRetrievalKeyId
  | UserRetrievalKeyEmail
  | UserRetrievalKeyUsername
  | UserRetrievalKeyDisplayName;

export const userHelperFunctions = {
  /**
   * Retrieves a user by specified key type and value
   *
   * Looks up a user in the database using the provided key (id, email, username, or display_name)
   * and returns either the full User or PublicUser object based on the requested type.
   *
   * @param {UserRetrievalKey} key - The key to search by (id, email, username, or display_name)
   * @param {"user" | "publicUser"} userType - Whether to return the full User object or the PublicUser object
   * @returns {Promise<User | PublicUser | null>} - The user if found, or null if not found
   */
  async getUserByKey(
    key: UserRetrievalKey,
    userType: "user" | "publicUser"
  ): Promise<User | PublicUser | null> {
    const user: UserDTO = await db("users")
      .where({ [key.type]: key.value })
      .first();
    if (!user) return null;

    if (userType === "user") {
      return mapUserDTOToUser(user);
    } else {
      return mapUserDTOToPublicUser(user);
    }
  },

  /**
   * Update a user's password
   *
   * Updates the password hash for a specific user and sets the updated_at timestamp
   * to the current time. This function expects the password to already be hashed.
   *
   * @param {number} userId - The ID of the user to update
   * @param {string} passwordHash - The new password hash (already hashed with bcrypt)
   * @returns {Promise<void>} - Promise that resolves when the password is updated
   */
  async updateUserPassword(userId: number, passwordHash: string) {
    await db("users").where({ id: userId }).update({
      password_hash: passwordHash,
      updated_at: db.fn.now(),
    });
  },

  /**
   * Create a new user
   *
   * Creates a new user in the database with the provided information.
   * Hashes the user's password before storing it and assigns a default avatar.
   * Returns a PublicUser object (without sensitive data) of the created user.
   *
   * @param {CreateUser} userData - The user data to create
   * @param {string} userData.firstName - The user's first name
   * @param {string} userData.lastName - The user's last name
   * @param {string} userData.username - The username to use for login
   * @param {string} userData.displayName - The display name to show in the UI
   * @param {string} userData.email - The email address to associate with the user
   * @param {string} userData.password - The password to use for the user (plain text)
   * @param {boolean} [userData.twoFactorEnabled] - Whether two-factor authentication is enabled
   * @returns {Promise<PublicUser>} - The created user (public profile without sensitive data)
   */
  async createUser(userData: CreateUser): Promise<PublicUser> {
    const {
      firstName,
      lastName,
      username,
      displayName,
      email,
      password,
      twoFactorEnabled,
      gdprConsent = false, // Default to false for admin creation
    } = userData;

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user into the database
    const [user] = await db("users")
      .insert({
        first_name: firstName,
        last_name: lastName,
        username,
        display_name: displayName,
        avatar_filename: storeDefaultAvatar(),
        email,
        password_hash: passwordHash,
        two_factor_enabled: twoFactorEnabled,
        gdpr_consent: gdprConsent,
        gdpr_consent_date: gdprConsent ? new Date().toISOString() : null,
      })
      .returning("*");

    return mapUserDTOToPublicUser(user);
  },

  /**
   * Anonymize a user for GDPR compliance (soft deletion)
   *
   * Replaces all user data with anonymized values while preserving the user record
   * for referential integrity (match history, etc.). Uses UUID-based unique values
   * to avoid enumeration and maintain database constraints.
   *
   * @param {number} userId - The ID of the user to anonymize
   * @returns {Promise<void>} - Promise that resolves when anonymization is complete
   */
  async anonymizeUser(userId: number): Promise<void> {
    // Get current user data to access avatar filename
    const currentUser = await db("users").where("id", userId).first();
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Delete current avatar if it's not a default avatar
    if (
      currentUser.avatar_filename &&
      currentUser.avatar_filename !== "default-avatar.png" &&
      currentUser.avatar_filename !== "deleted-user-avatar.png"
    ) {
      try {
        await fs.unlink(path.join(AVATAR_DIR, currentUser.avatar_filename));
        console.log(`Deleted avatar file: ${currentUser.avatar_filename}`);
      } catch (error) {
        console.error(
          "Error deleting user avatar during anonymization:",
          error
        );
        // Don't throw - avatar deletion failure shouldn't prevent anonymization
      }
    }

    const uuid = crypto.randomUUID().slice(0, 8);
    const randomPassword = await bcrypt.hash(crypto.randomUUID(), 12);

    const anonymizedData = {
      first_name: "Deleted",
      last_name: "User",
      username: `deleted_user_${uuid}`,
      display_name: `Deleted User ${uuid}`,
      email: `deleted_${uuid}@user.local`,
      password_hash: randomPassword,
      google_avatar_url: null,
      avatar_filename: "deleted-user-avatar.png",
      role: "user",
      auth_provider: "local",
      provider_id: null,
      is_verified: false,
      is_online: false,
      two_factor_enabled: false,
      two_factor_secret: null,
      gdpr_consent: false,
      gdpr_consent_date: null,
      created_at: new Date(0), // Epoch
      updated_at: new Date(0), // Epoch
    };

    await db("users").where("id", userId).update(anonymizedData);
  },
};

/**id
 * User controller
 *
 * Handles user related endpoints
 */
export const userController = {
  /***************************************
   *                                     *
   *   Debug and monitoring endpoints    *
   *                                     *
   ***************************************/

  /**
   * Get user service status - health check endpoint
   * Returns 200 OK if the user service is running correctly
   *
   * @async
   * @param {FastifyRequest} request - The Fastify request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<void>} - Promise that resolves when the status is sent
   */
  async getStatus(request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send({ status: "User routes are ready" });
  },

  /***************************************
   *                                     *
   *     User management endpoints       *
   *                                     *
   ***************************************/

  /**
   * Return currently authenticated user's profile
   *
   * Retrieves the full profile of the currently authenticated user based on
   * the userId in the JWT token. Returns user data with sensitive fields excluded.
   *
   * @async
   * @param {FastifyRequest<GetMeRequest>} request - The Fastify request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Promise that resolves when the user profile is sent
   * @throws {401} - If user is not authenticated (UNAUTHORIZED)
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async getMe(request: FastifyRequest<GetMeRequest>, reply: FastifyReply) {
    if (!request.user?.userId) {
      return reply
        .status(401)
        .send({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }
    const publicUser = (await userHelperFunctions.getUserByKey(
      { type: "id", value: request.user.userId },
      "publicUser"
    )) as PublicUser;

    if (!publicUser) {
      return reply
        .status(404)
        .send({ code: "USER_NOT_FOUND", message: "User not found" });
    }
    return reply.status(200).send({
      message: "User found",
      data: { user: publicUser },
    });
  },

  /**
   * Get all users
   *
   * Retrieves a list of all users in the system with public profile information.
   * Requires authentication. Removes sensitive data before returning results.
   *
   * @async
   * @param {FastifyRequest<GetUsersRequest>} request - The Fastify request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns a list of all user public profiles
   * @throws {500} - If database query fails (INTERNAL_SERVER_ERROR)
   */
  async getUsers(
    request: FastifyRequest<GetUsersRequest>,
    reply: FastifyReply
  ) {
    try {
      const users: UserDTO[] = await db("users").select("*");

      // Map UserDTO to User and then to PublicUser
      const publicUsers = users.map(userDto => mapUserDTOToPublicUser(userDto));

      return reply.status(200).send({
        message: "Users fetched successfully",
        data: { users: publicUsers },
      });
    } catch (error) {
      return reply.status(500).send({
        message: "Failed to fetch users",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * Find a user by ID
   *
   * Retrieves a user's public profile based on their unique ID.
   * Requires authentication. Returns only non-sensitive user data.
   *
   * @async
   * @param {FastifyRequest<GetUserByIdRequest>} request - Request containing user ID parameter
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns the user's public profile
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If database query fails (INTERNAL_SERVER_ERROR)
   */
  async getUserById(
    request: FastifyRequest<GetUserByIdRequest>,
    reply: FastifyReply
  ) {
    try {
      const publicUser = (await userHelperFunctions.getUserByKey(
        { type: "id", value: request.params.id },
        "publicUser"
      )) as PublicUser;

      if (!publicUser)
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      return reply.status(200).send({
        data: { user: publicUser },
        message: "User found",
      });
    } catch (error) {
      return reply.status(500).send({
        message: "Failed to fetch user",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * Find a user by email
   *
   * Retrieves a user's public profile based on their email address.
   * Requires authentication. Returns only non-sensitive user data.
   *
   * @async
   * @param {FastifyRequest<GetUserByEmailRequest>} request - Request containing email parameter
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns the user's public profile
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If database query fails (INTERNAL_SERVER_ERROR)
   */
  async getUserByEmail(
    request: FastifyRequest<GetUserByEmailRequest>,
    reply: FastifyReply
  ) {
    try {
      const publicUser = (await userHelperFunctions.getUserByKey(
        { type: "email", value: request.params.email },
        "publicUser"
      )) as PublicUser;

      if (!publicUser)
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      return reply.status(200).send({
        data: { user: publicUser },
        message: "User found",
      });
    } catch (error) {
      return reply.status(500).send({
        message: "Failed to fetch user",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * Find a user by username
   *
   * Retrieves a user's public profile based on their unique username.
   * Requires authentication. Returns only non-sensitive user data.
   *
   * @async
   * @param {FastifyRequest<GetUserByUsernameRequest>} request - Request containing username parameter
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns the user's public profile
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If database query fails (INTERNAL_SERVER_ERROR)
   */
  async getUserByUsername(
    request: FastifyRequest<GetUserByUsernameRequest>,
    reply: FastifyReply
  ) {
    try {
      const publicUser = (await userHelperFunctions.getUserByKey(
        { type: "username", value: request.params.username },
        "publicUser"
      )) as PublicUser;

      if (!publicUser)
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      return reply.status(200).send({
        data: { user: publicUser },
        message: "User found",
      });
    } catch (error) {
      return reply.status(500).send({
        message: "Failed to fetch user",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * Find a user by display name
   *
   * Retrieves a user's public profile based on their display name.
   * Requires authentication. Returns only non-sensitive user data.
   *
   * @async
   * @param {FastifyRequest<GetUserByDisplayNameRequest>} request - Request containing displayName parameter
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns the user's public profile
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If database query fails (INTERNAL_SERVER_ERROR)
   */
  async getUserByDisplayName(
    request: FastifyRequest<GetUserByDisplayNameRequest>,
    reply: FastifyReply
  ) {
    try {
      const publicUser = (await userHelperFunctions.getUserByKey(
        { type: "display_name", value: request.params.displayName },
        "publicUser"
      )) as PublicUser;

      if (!publicUser)
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      return reply.status(200).send({
        data: { user: publicUser },
        message: "User found",
      });
    } catch (error) {
      return reply.status(500).send({
        message: "Failed to fetch user",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * Create a new user
   *
   * Creates a new user in the database with the provided information.
   * Hashes the user's password before storing it and assigns a default avatar.
   * Returns a PublicUser object (without sensitive data) of the created user.
   *
   * @async
   * @param {FastifyRequest<CreateUserRequest>} request - The Fastify request object
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns the created user (public profile without sensitive data)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async createUser(
    request: FastifyRequest<CreateUserRequest>,
    reply: FastifyReply
  ) {
    try {
      const user = await userHelperFunctions.createUser(request.body);
      return reply.status(200).send({
        data: user,
        message: "User created successfully",
      });
    } catch (error) {
      return reply.status(500).send({
        message: "Failed to create user",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },

  /**
   * Delete a user by ID (GDPR-compliant soft deletion)
   *
   * Anonymizes a user's personal data while preserving the user record for
   * referential integrity (match history, etc.). Prevents deletion of the last admin.
   *
   * @async
   * @param {FastifyRequest<DeleteUserByIdRequest>} request - Request with user ID parameter
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns success message or error response
   * @throws {400} - If trying to delete the last admin (CANNOT_DELETE_LAST_ADMIN)
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async deleteUserById(
    request: FastifyRequest<DeleteUserByIdRequest>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const targetUserId = parseInt(String(id), 10);
      if (isNaN(targetUserId)) {
        return reply.status(400).send({
          code: "INVALID_USER_ID",
          message: "Invalid user ID",
        });
      }

      // Check if target user exists
      const user = await db("users").where({ id: targetUserId }).first();
      if (!user) {
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      // Prevent deleting any admin user - they must be demoted first
      if (user.role === "admin") {
        return reply.status(400).send({
          code: "CANNOT_DELETE_ADMIN",
          message:
            "Cannot delete admin users. Please demote the user to regular user first, then delete.",
        });
      }

      // Log the admin deletion for audit purposes
      console.log(
        `Admin deletion initiated: ID ${targetUserId}, Username: ${user.username}, Email: ${user.email}`
      );

      // Anonymize the user data (soft deletion)
      await userHelperFunctions.anonymizeUser(targetUserId);

      // Log successful anonymization
      console.log(`User successfully anonymized by admin: ID ${targetUserId}`);

      return reply.status(200).send({
        message: `User ${user.username} deleted successfully. Personal data has been anonymized.`,
      });
    } catch (error) {
      console.error("Error during admin user deletion:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete user",
      });
    }
  },

  /**
   * Delete a user by email (GDPR-compliant soft deletion)
   *
   * Anonymizes a user's personal data while preserving the user record for
   * referential integrity (match history, etc.). Prevents deletion of the last admin.
   *
   * @async
   * @param {FastifyRequest<DeleteUserByEmailRequest>} request - Request with email parameter
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns success message or error response
   * @throws {400} - If trying to delete the last admin (CANNOT_DELETE_LAST_ADMIN)
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async deleteUserByEmail(
    request: FastifyRequest<DeleteUserByEmailRequest>,
    reply: FastifyReply
  ) {
    try {
      const { email } = request.params;

      // Check if target user exists
      const user = await db("users").where({ email }).first();
      if (!user) {
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      // Prevent deleting any admin user - they must be demoted first
      if (user.role === "admin") {
        return reply.status(400).send({
          code: "CANNOT_DELETE_ADMIN",
          message:
            "Cannot delete admin users. Please demote the user to regular user first, then delete.",
        });
      }

      // Log the admin deletion for audit purposes
      console.log(
        `Admin deletion initiated: ID ${user.id}, Username: ${user.username}, Email: ${user.email}`
      );

      // Anonymize the user data (soft deletion)
      await userHelperFunctions.anonymizeUser(user.id);

      // Log successful anonymization
      console.log(`User successfully anonymized by admin: ID ${user.id}`);

      return reply.status(200).send({
        message: `User ${user.email} deleted successfully. Personal data has been anonymized.`,
      });
    } catch (error) {
      console.error("Error during admin user deletion:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete user",
      });
    }
  },

  /**
   * Update a user's password
   *
   * Changes the user's password after verifying their current password.
   * Validates password strength, hashes the new password, and updates it in the database.
   *
   * @async
   * @param {FastifyRequest<UpdatePasswordRequest>} request - Request with current and new password
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns success response with updated user data
   * @throws {400} - If passwords don't match strength requirements or validation fails
   * @throws {401} - If current password is incorrect (INVALID_CREDENTIALS)
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async updatePassword(
    request: FastifyRequest<UpdatePasswordRequest>,
    reply: FastifyReply
  ) {
    try {
      const { currentPassword, newPassword } = request.body;
      const userId = (request.user as { userId: number }).userId;

      // Validate new password
      if (
        !newPassword ||
        typeof newPassword !== "string" ||
        newPassword.length < 8
      ) {
        return reply.status(400).send({
          code: "INVALID_PASSWORD",
          message: "New password must be at least 8 characters long",
        });
      }

      // Get user with password
      const user = await db("users").where({ id: userId }).first();

      if (!user) {
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );
      if (!isPasswordValid) {
        return reply.status(400).send({
          code: "INVALID_PASSWORD",
          message: "Current password is incorrect",
        });
      }

      // Password strength validation
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

      if (!passwordRegex.test(newPassword)) {
        return reply.status(400).send({
          code: "INVALID_PASSWORD",
          message:
            "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character",
        });
      }

      // Hash new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await userHelperFunctions.updateUserPassword(userId, newPasswordHash);

      // Get updated public user
      const updatedUser: PublicUser | null =
        await userHelperFunctions.getUserByKey(
          {
            type: "id",
            value: userId,
          },
          "publicUser"
        );
      if (!updatedUser) {
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found after update",
        });
      }
      return reply.status(200).send({
        message: "Password updated successfully",
        data: { user: updatedUser },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update password",
      });
    }
  },

  /**
   * Set password for Google-authenticated users
   *
   * Allows users who initially authenticated via Google OAuth to set a password
   * for traditional login. Validates that the user exists, has Google auth enabled,
   * and the password meets complexity requirements.
   *
   * @async
   * @param {FastifyRequest<SetPasswordForGoogleUserRequest>} request - Request with password in body
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns success message or error response
   * @throws {401} - If user not authenticated (UNAUTHORIZED)
   * @throws {400} - If user not found (USER_NOT_FOUND) or password invalid (INVALID_PASSWORD)
   * @throws {403} - If user is not a Google user (NOT_GOOGLE_USER)
   * @throws {500} - If server error occurs
   */
  async setPasswordForGoogleUser(
    request: FastifyRequest<SetPasswordForGoogleUserRequest>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "Not authenticated" });
      }

      // Get the user
      const user: PublicUser | null = await userHelperFunctions.getUserByKey(
        { type: "id", value: userId },
        "publicUser"
      );
      if (!user) {
        return reply.status(404).send({ message: "User not found" });
      }

      // Check if user is Google-authenticated
      if (user.authProvider !== "google" || !user.providerId) {
        return reply.status(400).send({
          message: "Password can only be set for Google-authenticated users",
        });
      }

      // Password strength validation
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

      if (!passwordRegex.test(request.body.password)) {
        return reply.status(400).send({
          code: "INVALID_PASSWORD",
          message:
            "Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character",
        });
      }

      // Hash new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(
        request.body.password,
        saltRounds
      );

      // Update password
      await userHelperFunctions.updateUserPassword(userId, newPasswordHash);

      return reply.status(200).send({ message: "Password set successfully" });
    } catch (error) {
      console.error("Error setting password:", error);
      return reply.status(500).send({
        message: "An error occurred while setting the password",
      });
    }
  },

  /**
   * Update a user's display name
   *
   * Changes the display name of the currently authenticated user.
   * Validates the new display name, updates it in the database, and returns updated user profile.
   *
   * @async
   * @param {FastifyRequest<UpdateDisplayNameRequest>} request - Request with new display name
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns success response with updated user data
   * @throws {400} - If display name is invalid (INVALID_DISPLAY_NAME) or already exists (DISPLAY_NAME_EXISTS)
   * @throws {401} - If user is not authenticated (UNAUTHORIZED)
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async updateDisplayName(
    request: FastifyRequest<UpdateDisplayNameRequest>,
    reply: FastifyReply
  ) {
    try {
      const { displayName } = request.body;
      const userId = (request.user as { userId: number }).userId;

      // Validate display name
      if (
        !displayName ||
        typeof displayName !== "string" ||
        displayName.trim().length === 0
      ) {
        return reply.status(400).send({
          code: "INVALID_DISPLAY_NAME",
          message: "Display name cannot be empty",
        });
      }

      // Check if display name already exists
      const existingUserByDisplayName: PublicUser | null =
        await userHelperFunctions.getUserByKey(
          { type: "display_name", value: displayName },
          "publicUser"
        );
      if (existingUserByDisplayName) {
        return reply.status(400).send({
          code: "DISPLAY_NAME_ALREADY_TAKEN",
          message: "Display name already taken",
        });
      }

      // Update display name in database
      await db("users").where({ id: userId }).update({
        display_name: displayName.trim(),
        updated_at: db.fn.now(),
      });

      // Get updated user
      const publicUser: PublicUser | null =
        await userHelperFunctions.getUserByKey(
          { type: "id", value: userId },
          "publicUser"
        );
      if (!publicUser) {
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found after update",
        });
      }

      return reply.status(200).send({
        message: "Display name updated successfully",
        data: { user: publicUser },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update display name",
      });
    }
  },

  /**
   * Delete the current user's account (GDPR self-deletion)
   *
   * Anonymizes the user's personal data while preserving the user record for
   * referential integrity (match history, etc.). This satisfies GDPR's "Right to Erasure"
   * while maintaining game statistics and match records.
   *
   * @async
   * @param {FastifyRequest} request - The authenticated request
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns success response when deletion is complete
   * @throws {401} - If user is not authenticated (UNAUTHORIZED)
   * @throws {404} - If user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async deleteMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as { userId: number })?.userId;
      if (!userId) {
        return reply.status(401).send({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Check if user exists
      const user = await db("users").where({ id: userId }).first();
      if (!user) {
        return reply.status(404).send({
          code: "USER_NOT_FOUND",
          message: "User not found",
        });
      }

      // Prevent admin users from deleting themselves - they must be demoted first
      if (user.role === "admin") {
        return reply.status(400).send({
          code: "CANNOT_DELETE_ADMIN",
          message:
            "Admin users cannot delete their own accounts. Please demote yourself or ask another admin to demote you to regular user first, then delete your account.",
        });
      }

      // Log the deletion for audit purposes
      console.log(
        `User self-deletion initiated: ID ${userId}, Username: ${user.username}, Email: ${user.email}`
      );

      // Anonymize the user data
      await userHelperFunctions.anonymizeUser(userId);

      // Clear all authentication cookies to log out the user
      const COOKIE_NAME = process.env.JWT_COOKIE_NAME as string;
      const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME as string;
      const REFRESH_TOKEN_COOKIE_NAME = process.env
        .REFRESH_TOKEN_COOKIE_NAME as string;

      reply.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      reply.clearCookie(CSRF_COOKIE_NAME, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      reply.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      // Log successful anonymization
      console.log(`User successfully anonymized: ID ${userId}`);

      return reply.status(200).send({
        message:
          "Account successfully deleted. Your personal data has been anonymized while preserving match history.",
      });
    } catch (error) {
      console.error("Error during user self-deletion:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred while deleting your account",
      });
    }
  },

  /**
   * Get a user's avatar image
   *
   * Serves the avatar image file for a user based on the filename.
   * Determines the correct MIME type based on file extension and streams the file.
   *
   * @async
   * @param {FastifyRequest<GetAvatarRequest>} request - Request containing avatar filename parameter
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns the avatar image as a stream
   * @throws {404} - If avatar file not found (AVATAR_NOT_FOUND)
   * @throws {500} - If server error occurs serving the file (FAILED_TO_SERVE_AVATAR)
   */
  async getAvatar(
    request: FastifyRequest<GetAvatarRequest>,
    reply: FastifyReply
  ) {
    const mimeTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    const { filename } = request.params;

    // Prevent directory traversal
    if (filename.includes("/") || filename.includes("..")) {
      return reply.status(400).send({
        code: "INVALID_FILENAME",
        message: "Invalid filename",
      });
    }

    // Validate filename format (UUID + extension)
    const fileExt = path.extname(filename).slice(1).toLowerCase();
    const baseName = path.basename(filename, `.${fileExt}`);

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
      !uuidRegex.test(baseName) &&
      filename !== "default-avatar.png" &&
      filename !== "deleted-user-avatar.png"
    ) {
      return reply.status(400).send({
        code: "INVALID_FILENAME_FORMAT",
        message: "Invalid filename format",
      });
    }

    // Restrict allowed extensions
    const allowedExtensions = Object.keys(mimeTypeMap) as Array<
      keyof typeof mimeTypeMap
    >;
    if (!allowedExtensions.includes(fileExt)) {
      return reply.status(400).send({
        code: "INVALID_FILE_TYPE",
        message: "Invalid file type",
      });
    }

    const filePath = path.join(AVATAR_DIR, filename);

    try {
      // Verify file exists and is accessible
      await fs.access(filePath);
      const fileBuffer = await fs.readFile(filePath);

      // Validate file content matches extension
      const fileType = await fileTypeFromBuffer(fileBuffer);
      if (!fileType || !allowedExtensions.includes(fileType.ext)) {
        return reply.status(400).send({
          code: "INVALID_FILE_CONTENT",
          message: "Invalid file content",
        });
      }

      // Set security headers
      const mimeType = mimeTypeMap[fileType.ext] || "application/octet-stream";
      reply.header("Content-Type", mimeType);
      reply.header("Cache-Control", "public, max-age=86400");
      reply.header("X-Content-Type-Options", "nosniff");

      // Use the validated buffer to create a stream
      const stream = createReadStream(filePath);
      return reply.status(200).send(stream);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return reply.status(404).send({
          code: "AVATAR_NOT_FOUND",
          message: "Avatar not found",
        });
      }
      console.error("Error serving avatar:", error);
      return reply.status(500).send({
        code: "FAILED_TO_SERVE_AVATAR",
        message: "Failed to serve avatar",
      });
    }
  },

  /**
   * Upload a new avatar image
   *
   * Handles file upload for user profile avatars. Validates mimetype, saves the file
   * to the appropriate directory with a unique filename, and updates the user's record.
   * Automatically creates avatar directory if it doesn't exist.
   *
   * @async
   * @param {FastifyRequest<UploadNewAvatarRequest>} request - Request with multipart file upload
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns success with filename and url, or error
   * @throws {400} - If no file uploaded (NO_FILE_UPLOADED) or invalid file type (INVALID_FILE_TYPE)
   * @throws {401} - If user not authenticated (USER_ID_NOT_FOUND)
   * @throws {500} - If file upload fails (FAILED_TO_UPLOAD_AVATAR)
   */
  async uploadNewAvatar(
    request: FastifyRequest<UploadNewAvatarRequest>,
    reply: FastifyReply
  ) {
    try {
      // Get the file from the multipart form data
      const data = await (request as any).file();
      if (!data) {
        return reply.status(400).send({
          code: "NO_FILE_UPLOADED",
          message: "No file uploaded",
        });
      }

      const userId = request.user.userId;
      if (!userId) {
        return reply
          .status(401)
          .send({ error: "Unauthorized - No user ID in token" });
      }

      // Read the file buffer
      const buffer = await data.toBuffer();

      // Validate the file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      const fileType = await fileTypeFromBuffer(buffer);

      if (!fileType || !allowedTypes.includes(fileType.mime)) {
        return reply.status(400).send({
          error:
            "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed",
        });
      }

      // Validate file size (max 2MB)
      if (buffer.length > 2 * 1024 * 1024) {
        return reply.status(400).send({
          code: "FILE_TOO_LARGE",
          message: "File too large. Maximum size is 2MB.",
        });
      }

      // Get the old avatar filename if it exists
      const oldAvatar = await db("users")
        .where({ id: userId })
        .select("avatar_filename")
        .first();

      // Store the new avatar
      const newFilename = await storeCustomAvatar(
        oldAvatar?.avatar_filename || null,
        {
          data: buffer,
          mimetype: fileType.mime,
        }
      );

      // Update the user's avatar in the database
      await db("users")
        .where({ id: userId })
        .update({ avatar_filename: newFilename });

      return reply.status(200).send({
        data: {
          filename: newFilename,
          url: `${newFilename}`,
        },
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      return reply.status(500).send({
        code: "FAILED_TO_UPLOAD_AVATAR",
        message: "Failed to upload avatar",
      });
    }
  },

  /**
   * Get a user's role by ID (admin only)
   *
   * Retrieves the role of a specific user based on their ID.
   * This endpoint is restricted to administrators only.
   *
   * @async
   * @param {FastifyRequest<GetUserRoleRequest>} request - Request containing user ID parameter
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns success response with user role information
   * @throws {400} - If user ID is invalid (INVALID_USER_ID)
   * @throws {404} - If target user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async getUserRole(
    request: FastifyRequest<GetUserRoleRequest>,
    reply: FastifyReply
  ) {
    try {
      const userId = parseInt(request.params.id, 10);
      if (isNaN(userId)) {
        return reply
          .status(400)
          .send({ code: "INVALID_USER_ID", message: "Invalid user ID" });
      }

      const user = await db("users")
        .select("role")
        .where({ id: userId })
        .first();

      if (!user) {
        return reply
          .status(404)
          .send({ code: "USER_NOT_FOUND", message: "User not found" });
      }

      return reply.status(200).send({
        message: "User role retrieved successfully",
        data: { role: user.role },
      });
    } catch (error) {
      console.error("Error getting user role:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      });
    }
  },

  /**
   * Check if the current user has admin privileges
   *
   * Verifies if the authenticated user has administrator role in the system.
   * Used for authorization checks and UI state management.
   *
   * @async
   * @param {FastifyRequest<UserIsAdminRequest>} request - Request with authenticated user token
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Returns object with isAdmin boolean flag
   * @throws {401} - If user ID is not found in token (USER_ID_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async userIsAdmin(
    request: FastifyRequest<UserIsAdminRequest>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request.user as any)?.userId;
      if (!userId) {
        return reply.status(401).send({
          code: "USER_ID_NOT_FOUND",
          message: "User ID not found in token",
        });
      }

      const user = await db("users")
        .select("role")
        .where({ id: userId })
        .first();

      return reply.status(200).send({
        message: "User is admin",
        data: { isAdmin: user?.role === "admin" },
      });
    } catch (error) {
      console.error("Error checking admin status:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      });
    }
  },

  /**
   * Promote a user to admin role
   *
   * Changes a regular user's role to administrator, granting them additional privileges.
   * This operation can only be performed by existing administrators.
   *
   * @async
   * @param {FastifyRequest<PromoteToAdminRequest>} request - Request containing target user ID
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Promise that resolves when promotion is complete
   * @throws {400} - If user ID is invalid (INVALID_USER_ID)
   * @throws {404} - If target user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async promoteToAdmin(
    request: FastifyRequest<PromoteToAdminRequest>,
    reply: FastifyReply
  ) {
    try {
      const targetUserId = parseInt(request.params.id, 10);
      if (isNaN(targetUserId)) {
        return reply
          .status(400)
          .send({ code: "INVALID_USER_ID", message: "Invalid user ID" });
      }

      // Check if target user exists
      const user = await db("users").where({ id: targetUserId }).first();
      if (!user) {
        return reply
          .status(404)
          .send({ code: "USER_NOT_FOUND", message: "User not found" });
      }

      // Update user role to admin
      await db("users")
        .where({ id: targetUserId })
        .update({ role: "admin", updated_at: db.fn.now() });

      return reply.status(200).send({
        message: "User promoted to admin successfully",
      });
    } catch (error) {
      console.error("Error promoting user to admin:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      });
    }
  },

  /**
   * Demote an admin to regular user
   *
   * Changes a user with administrator role to a regular user role.
   * Prevents demotion of the last admin to maintain system access.
   * This operation can only be performed by existing administrators.
   *
   * @async
   * @param {FastifyRequest<DemoteToUserRequest>} request - Request containing target user ID
   * @param {FastifyReply} reply - The Fastify reply object
   * @returns {Promise<FastifyReply>} - Promise that resolves when demotion is complete
   * @throws {400} - If user ID is invalid (INVALID_USER_ID) or is the last admin (CANNOT_DEMOTE_LAST_ADMIN)
   * @throws {404} - If target user not found (USER_NOT_FOUND)
   * @throws {500} - If server error occurs (INTERNAL_SERVER_ERROR)
   */
  async demoteToUser(
    request: FastifyRequest<DemoteToUserRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const targetUserId = parseInt(request.params.id, 10);
      if (isNaN(targetUserId)) {
        reply
          .status(400)
          .send({ code: "INVALID_USER_ID", message: "Invalid user ID" });
        return;
      }

      // Check if target user exists and is an admin
      const user = await db("users").where({ id: targetUserId }).first();
      if (!user) {
        reply
          .status(404)
          .send({ code: "USER_NOT_FOUND", message: "User not found" });
        return;
      }

      // Prevent demoting the last admin
      const adminCount = await db("users")
        .where({ role: "admin" })
        .count("* as count")
        .first();
      if (
        adminCount &&
        Number(adminCount.count) <= 1 &&
        user.role === "admin"
      ) {
        return reply.status(400).send({
          code: "CANNOT_DEMOTE_LAST_ADMIN",
          message: "Cannot demote the last admin. Promote another admin first.",
        });
      }

      // Update user role to user
      await db("users")
        .where({ id: targetUserId })
        .update({ role: "user", updated_at: db.fn.now() });

      return reply.status(200).send({
        message: "User demoted to regular user successfully",
      });
    } catch (error) {
      console.error("Error demoting admin to user:", error);
      return reply.status(500).send({
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      });
    }
  },
};
