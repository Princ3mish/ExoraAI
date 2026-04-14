import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const requiredEnvs = ['PORT', 'DATABASE_URL'];

for (const envVar of requiredEnvs) {
  if (!process.env[envVar]) {
    logger.error(`Critical Error: Missing required environment variable - ${envVar}`);
    process.exit(1);
  }
}

export const envConfig = {
  port: process.env.PORT,
  databaseUrl: process.env.DATABASE_URL,
};
