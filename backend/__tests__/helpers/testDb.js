import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import logger from '../../src/config/logger.js';

process.env.NODE_ENV = 'test';

let mongod = null;

export const connectTestDb = async () => {
  try {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    await mongoose.connect(mongoUri);
    logger.info('Test database connected');
  } catch (error) {
    logger.error('Test database connection error', { error: error.message });
    throw error;
  }
};

export const disconnectTestDb = async () => {
  try {
    if (mongoose.connection.isConnected) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }

    if (mongod) {
      await mongod.stop();
    }

    logger.info('Test database disconnected');
  } catch (error) {
    logger.error('Test database disconnection error', { error: error.message });
    throw error;
  }
};

export const clearTestDb = async () => {
  try {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    logger.info('Test database cleared');
  } catch (error) {
    logger.error('Test database clear error', { error: error.message });
    throw error;
  }
};
