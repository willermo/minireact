import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("refresh_tokens", table => {
    table.timestamp("last_used_at").nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("refresh_tokens", table => {
    table.dropColumn("last_used_at");
  });
}
