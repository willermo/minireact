import { apiFetch } from "./api";
import type { PublicUser } from "../types/user";

/**
 * Fetches all users from the API and updates the store
 * @throws {Error} If the fetch request fails
 */
export async function fetchUsers(): Promise<PublicUser[]> {
  try {
    const response = await apiFetch("/api/users/getUsers");
    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }
    const result = await response.json();
    const { users } = result.data;
    const validUsers = users.filter((user: PublicUser) => {
      return !user.username.startsWith("deleted_user_");
    });
    return validUsers;
  } catch (error) {
    throw error;
  }
}

/**
 * Deletes a user by ID
 * @param userId - The ID of the user to delete
 * @throws {Error} If the delete request fails
 */
export async function deleteUser(userId: number) {
  try {
    const response = await apiFetch(`/api/users/deleteUserById/${userId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message);
    }

    // Remove the user from the state
  } catch (error) {
    throw error;
  }
}

/**
 * Promotes a user to admin
 * @param userId - The ID of the user to promote
 * @throws {Error} If the promotion request fails
 */
export async function promoteUser(userId: number) {
  try {
    const response = await apiFetch(`/api/users/${userId}/promote`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to promote user");
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Demotes a user to user
 * @param userId - The ID of the user to demote
 * @throws {Error} If the demotion request fails
 */
export async function demoteUser(userId: number) {
  try {
    const response = await apiFetch(`/api/users/${userId}/demote`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to demote user");
    }
  } catch (error) {
    throw error;
  }
}
