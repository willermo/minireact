import type { Knex } from "knex";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export async function up(knex: Knex): Promise<void> {
  const hasUsersTable = await knex.schema.hasTable("users");

  if (!hasUsersTable) {
    console.log("Users table doesn't exist yet. Skipping admin user creation.");
    return;
  }

  // Once we know the table exists, proceed with admin user check
  if (!process.env.ADMIN_USER_EMAIL || !process.env.ADMIN_USER_PASSWORD) {
    console.log("Admin user environment variables not set. Skipping.");
    return;
  }

  const adminExists = await knex("users")
    .where({ email: process.env.ADMIN_USER_EMAIL })
    .first();

  if (!adminExists) {
    await knex("users").insert({
      email: process.env.ADMIN_USER_EMAIL,
      username: process.env.ADMIN_USER_USERNAME,
      display_name: process.env.ADMIN_USER_DISPLAY_NAME,
      first_name: process.env.ADMIN_USER_FIRST_NAME,
      last_name: process.env.ADMIN_USER_LAST_NAME,
      password_hash: await bcrypt.hash(process.env.ADMIN_USER_PASSWORD, 10),
      avatar_filename: "default-avatar.png",
      role: "admin",
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  try {
    const hasUsersTable = await knex.schema.hasTable("users");

    if (hasUsersTable && process.env.ADMIN_USER_EMAIL) {
      await knex("users").where({ email: process.env.ADMIN_USER_EMAIL }).del();
      console.log("Admin user removed successfully");
    }
  } catch (error) {
    console.error("Error removing admin user:", error);
  }
}
