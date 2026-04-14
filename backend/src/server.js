import { envConfig } from './config/env.js';
import app from './app.js';
import logger from './utils/logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function startServer() {
  try {
    // Validate Database Connection
    await prisma.$connect();
    logger.info('Database connected successfully.');

    const PORT = envConfig.port || 4000;
    
    app.listen(PORT, () => {
      logger.info(`Server started. Listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

startServer();
