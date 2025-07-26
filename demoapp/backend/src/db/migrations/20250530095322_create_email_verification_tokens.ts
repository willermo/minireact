import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("verification_tokens", table => {
    table.increments("id").primary();
    table
      .integer("userId")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("token", 64).notNullable().unique();
    table.timestamp("expiresAt").notNullable();
    table.timestamps(true, true);

    table.index(["userId"]);
    table.index(["token"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("verification_tokens");
}
