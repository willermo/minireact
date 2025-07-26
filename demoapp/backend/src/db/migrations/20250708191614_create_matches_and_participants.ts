import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Matches table
  await knex.schema.createTable("matches", table => {
    table.increments("id").primary();
    table
      .string("game_type")
      .notNullable()
      .checkIn(["pong", "tic_tac_toe", "connect4"]);
    table.string("match_type").notNullable().checkIn(["ranked", "tournament"]);
    table
      .integer("tournament_id")
      .nullable()
      .references("id")
      .inTable("tournaments")
      .onDelete("SET NULL");
    table
      .string("game_mode")
      .notNullable()
      .checkIn(["1v1", "2v2", "manyvsmany"]);
    table
      .integer("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .string("state")
      .notNullable()
      .defaultTo("created")
      .checkIn(["created", "started", "ended", "aborted"]);
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("started_at").nullable();
    table.timestamp("ended_at").nullable();
    table.json("metadata").nullable();
  });

  // Participants table
  await knex.schema.createTable("match_participants", table => {
    table.increments("id").primary();
    table
      .integer("match_id")
      .notNullable()
      .references("id")
      .inTable("matches")
      .onDelete("CASCADE");
    table
      .integer("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.boolean("is_winner").notNullable().defaultTo(false);
    table.unique(["match_id", "user_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("match_participants");
  await knex.schema.dropTableIfExists("matches");
}
