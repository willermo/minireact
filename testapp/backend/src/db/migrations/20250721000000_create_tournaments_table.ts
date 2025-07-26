import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create tournaments table
  await knex.schema.createTable("tournaments", table => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table
      .string("game_type")
      .notNullable()
      .checkIn(["pong", "tic_tac_toe", "connect4"]);
    table
      .string("game_mode")
      .notNullable()
      .checkIn(["1v1", "2v2"]);
    table
      .string("status")
      .notNullable()
      .defaultTo("pending")
      .checkIn(["pending", "active", "completed", "cancelled"]);
    table
      .integer("created_by")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.integer("winner_id").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("started_at").nullable();
    table.timestamp("ended_at").nullable();
    table.json("metadata").nullable(); // For additional tournament settings
  });

  // Create tournament_participants table
  await knex.schema.createTable("tournament_participants", table => {
    table.increments("id").primary();
    table
      .integer("tournament_id")
      .notNullable()
      .references("id")
      .inTable("tournaments")
      .onDelete("CASCADE");
    table
      .integer("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamp("joined_at").notNullable().defaultTo(knex.fn.now());
    
    // Ensure unique participant per tournament
    table.unique(["tournament_id", "user_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("tournament_participants");
  await knex.schema.dropTableIfExists("tournaments");
}
