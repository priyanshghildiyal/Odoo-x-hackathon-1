import dotenv from 'dotenv';
import path from 'node:path';
import {
  fileURLToPath
} from 'node:url';

dotenv.config();
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const databasePath = process.env.DATABASE_PATH || './database/stockwise.db';

export const config = {
  rootDir,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  databasePath: path.isAbsolute(databasePath) ? databasePath : path.resolve(rootDir, databasePath),
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-only-stockwise-secret-change-me'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};

if (!config.jwtSecret || (config.nodeEnv === 'production' && config.jwtSecret.length < 32)) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 characters in production.');
}
