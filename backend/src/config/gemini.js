import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger.js';

let geminiClient = null;

const initGemini = () => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn('GEMINI_API_KEY not set - AI features will be disabled');
      return null;
    }

    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    logger.info(`Gemini AI client initialized with model: ${modelName}`);
    return geminiClient;
  } catch (error) {
    logger.error('Failed to initialize Gemini', { error: error.message });
    return null;
  }
};

const getGeminiClient = () => {
  if (!geminiClient) {
    return initGemini();
  }
  return geminiClient;
};

export { initGemini, getGeminiClient };
