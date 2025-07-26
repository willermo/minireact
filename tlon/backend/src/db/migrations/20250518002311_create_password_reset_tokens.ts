import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create the table with a text field for UUID
  await knex.schema.createTable("password_reset_tokens", table => {
    table.increments("id").primary();
    table.string("email").notNullable().index();
    table.string("token").notNullable().unique();
    table.timestamp("expires_at").notNullable();
    table.boolean("used").notNullable().defaultTo(false);
    table.timestamps(true, true);

    table.index(["email", "used"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("password_reset_tokens");
}
