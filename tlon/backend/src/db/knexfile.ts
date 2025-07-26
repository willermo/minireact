import path from 'path';
import dotenv from 'dotenv';
import type { Knex } from 'knex';

// Load environment variables
dotenv.config({ path: process.env.ENV_FILE || '.env' });

// Get the directory path - compatible with both CommonJS and ESM
const currentDirPath = __dirname || path.resolve(process.cwd(), 'src/db');


// Knex configuration
export default {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILE || '../../data/database.sqlite',
    },
    migrations: {
      directory: path.resolve(currentDirPath, 'migrations'),
      extension: 'ts',
      loadExtensions: ['.js', '.ts'],
    },
    seeds: {
      directory: path.resolve(currentDirPath, 'seeds'),
      loadExtensions: ['.js', '.ts'],
    },
    useNullAsDefault: true,
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILE || '../../data/database.sqlite',
    },
    migrations: {
      directory: path.resolve(currentDirPath, 'migrations'),
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: path.resolve(currentDirPath, 'seeds'),
      loadExtensions: ['.js'],
    },
    useNullAsDefault: true,
  },
} as { [key: string]: Knex.Config };
