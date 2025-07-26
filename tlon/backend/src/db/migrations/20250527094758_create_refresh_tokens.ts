import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("refresh_tokens", table => {
    table.string("id", 36).primary().notNullable();
    table
      .integer("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("token").notNullable().unique();
    table.timestamp("expires_at").notNullable();
    table.string("device_info").nullable();
    table.timestamps(true, true);

    table.index(["user_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("refresh_tokens");
}
