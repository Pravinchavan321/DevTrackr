import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { initGemini } from './config/gemini.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Gemini (optional if API key is not set)
    initGemini();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();
