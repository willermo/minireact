import knex, { Knex } from "knex";
import dotenv from "dotenv";
import knexConfig from "./knexfile"; // Removed .js extension for ESM

dotenv.config();

// Ensure env is one of the valid environment keys
const env = (process.env.NODE_ENV || "development") as "development" | "production";
const config = knexConfig[env];

const db = knex(config);

export default db;
