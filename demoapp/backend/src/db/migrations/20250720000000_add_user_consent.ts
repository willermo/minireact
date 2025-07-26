import type { Knex } from "knex";

/**
 * Migration to add GDPR consent field to users table
 */
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable("users", table => {
    table.boolean("gdpr_consent").notNullable().defaultTo(false);
    table.timestamp("gdpr_consent_date").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable("users", table => {
    table.dropColumn("gdpr_consent");
    table.dropColumn("gdpr_consent_date");
  });
}
