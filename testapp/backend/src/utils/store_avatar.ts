import { promises as fs } from "fs";
import * as path from "path";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";

export const AVATAR_DIR = path.join(process.cwd(), "storage", "avatars");

/**
 * Downloads and stores an avatar image from a URL
 * @param avatarUrl - URL of the avatar image to download
 * @returns Promise that resolves with the generated filename
 */
export async function storeGoogleAvatar(
  avatarUrl: string | undefined
): Promise<string | null> {
  const defaultAvatar = "default-avatar.png";
  try {
    // Ensure avatar directory exists
    await fs.mkdir(AVATAR_DIR, { recursive: true });
    if (!avatarUrl) {
      return defaultAvatar;
    }
    // Generate a random filename with .jpg extension
    const filename = `${uuidv4()}.jpg`;
    const filePath = path.join(AVATAR_DIR, filename);

    // Download the image
    const response = await fetch(avatarUrl || "");
    if (!response.ok) {
      throw new Error(`Failed to download avatar: ${response.statusText}`);
    }

    // Get the image buffer
    const buffer = await response.buffer();

    // Save the file
    await fs.writeFile(filePath, buffer);

    return filename;
  } catch (error) {
    console.error("Error storing avatar:", error);
    throw new Error(
      `Failed to store avatar: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function storeDefaultAvatar(): string {
  const defaultAvatar = "default-avatar.png";
  return defaultAvatar;
}

export async function storeCustomAvatar(
  oldAvatarFilename: string | null,
  file: { data: Buffer; mimetype: string }
): Promise<string | null> {
  const defaultAvatar = "default-avatar.png";
  try {
    // Ensure avatar directory exists
    await fs.mkdir(AVATAR_DIR, { recursive: true });

    const fileExt = file.mimetype.split("/")[1];
    const filename = `${uuidv4()}.${fileExt}`;
    const filePath = path.join(AVATAR_DIR, filename);

    // Delete old avatar if it's not the default one
    if (oldAvatarFilename && oldAvatarFilename !== defaultAvatar) {
      try {
        await fs.unlink(path.join(AVATAR_DIR, oldAvatarFilename));
      } catch (error) {
        console.error("Error deleting old avatar:", error);
      }
    }

    // Save the file
    await fs.writeFile(filePath, file.data);

    return filename;
  } catch (error) {
    console.error("Error storing avatar:", error);
    throw new Error(
      `Failed to store avatar: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
