import type { Knex } from "knex";

/**
 * Initial migration to create users table
 */
export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("users", table => {
    table.increments("id").primary();
    table.string("first_name").notNullable();
    table.string("last_name").notNullable();
    table.string("username").notNullable().unique();
    table.string("display_name").notNullable().unique();
    table.string("email").notNullable().unique();
    table.string("password_hash").notNullable();
    table.string("google_avatar_url").nullable();
    table.string("avatar_filename").nullable();
    table.enum("role", ["user", "admin"]).defaultTo("user");
    table.enum("auth_provider", ["local", "google"]).defaultTo("local");
    table.string("provider_id");
    table.boolean("is_verified").defaultTo(false);
    table.boolean("is_online").defaultTo(false);
    table.boolean("two_factor_enabled").defaultTo(false);
    table.string("two_factor_secret").nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("users");
}
