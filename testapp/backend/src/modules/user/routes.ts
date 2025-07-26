import { FastifyInstance } from "fastify";
import { userController } from "./controller";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { z } from "zod";
import {
  getMeSchema,
  getUsersSchema,
  getUserByIdSchema,
  getUserByEmailSchema,
  getUserByUsernameSchema,
  getUserByDisplayNameSchema,
  createUserSchema,
  deleteUserByIdSchema,
  deleteUserByEmailSchema,
  updatePasswordSchema,
  setPasswordForGoogleUserSchema,
  updateDisplayNameSchema,
  getAvatarSchema,
  uploadNewAvatarSchema,
  getUserRoleSchema,
  userIsAdminSchema,
  promoteToAdminSchema,
  demoteToUserSchema,
} from "./schemas";

const isAdminResponseSchema = z.object({
  isAdmin: z.boolean(),
});

/**
 * User routes module.
 *
 * @note Authentication is required for all routes in this module.
 */
export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get("/status", userController.getStatus);

  fastify.get("/me", {
    preValidation: [requireAuth],
    schema: getMeSchema,
    handler: userController.getMe,
  });

  fastify.get("/getUsers", {
    preValidation: [requireAuth],
    schema: getUsersSchema,
    handler: userController.getUsers,
  });

  fastify.get("/getUserById/:id", {
    preValidation: [requireAuth],
    schema: getUserByIdSchema,
    handler: userController.getUserById,
  });

  fastify.get("/getUserByEmail/:email", {
    preValidation: [requireAuth],
    schema: getUserByEmailSchema,
    handler: userController.getUserByEmail,
  });

  fastify.get("/getUserByUsername/:username", {
    preValidation: [requireAuth],
    schema: getUserByUsernameSchema,
    handler: userController.getUserByUsername,
  });

  fastify.get("/getUserByDisplayName/:displayName", {
    preValidation: [requireAuth],
    schema: getUserByDisplayNameSchema,
    handler: userController.getUserByDisplayName,
  });

  fastify.post("/createUser", {
    schema: createUserSchema,
    handler: userController.createUser,
  });

  fastify.delete("/deleteUserById/:id", {
    preValidation: [requireAdmin],
    schema: deleteUserByIdSchema,
    handler: userController.deleteUserById,
  });

  fastify.delete("/deleteUserByEmail/:email", {
    preValidation: [requireAdmin],
    schema: deleteUserByEmailSchema,
    handler: userController.deleteUserByEmail,
  });

  fastify.post("/updatePassword", {
    schema: updatePasswordSchema,
    handler: userController.updatePassword,
  });

  fastify.post("/setPasswordForGoogleUser", {
    schema: setPasswordForGoogleUserSchema,
    handler: userController.setPasswordForGoogleUser,
  });

  fastify.post("/updateDisplayName", {
    schema: updateDisplayNameSchema,
    handler: userController.updateDisplayName,
  });

  fastify.delete("/me", {
    preValidation: [requireAuth],
    handler: userController.deleteMe,
  });

  fastify.get("/avatar/:filename", {
    schema: getAvatarSchema,
    handler: userController.getAvatar,
  });

  fastify.post("/uploadNewAvatar", {
    schema: uploadNewAvatarSchema,
    handler: userController.uploadNewAvatar,
  });

  fastify.get("/:id/role", {
    preValidation: [requireAdmin],
    schema: getUserRoleSchema,
    handler: userController.getUserRole,
  });

  fastify.get("/isAdmin", {
    preValidation: [requireAuth],
    schema: userIsAdminSchema,
    handler: userController.userIsAdmin,
  });

  fastify.post("/:id/promote", {
    preValidation: [requireAdmin],
    schema: promoteToAdminSchema,
    handler: userController.promoteToAdmin,
  });

  fastify.post("/:id/demote", {
    preValidation: [requireAdmin],
    schema: demoteToUserSchema,
    handler: userController.demoteToUser,
  });
}
