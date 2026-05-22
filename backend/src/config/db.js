import mongoose from 'mongoose';
import logger from './logger.js';

const MAX_RETRIES = 5;
let retries = 0;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });

    logger.info('MongoDB connected successfully', {
      host: conn.connection.host,
      database: conn.connection.db.name
    });

    return conn;
  } catch (error) {
    retries++;
    logger.error(`MongoDB connection failed (Attempt ${retries}/${MAX_RETRIES})`, {
      error: error.message
    });

    if (retries < MAX_RETRIES) {
      const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);
      logger.info(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDB();
    } else {
      logger.error('MongoDB connection failed after max retries');
      process.exit(1);
    }
  }
};

export default connectDB;
