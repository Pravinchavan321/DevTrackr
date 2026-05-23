import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger.js';

let geminiClients = null;

const getGeminiApiKeys = () => {
  const configuredKeys = [
    ...(process.env.GEMINI_API_KEYS || '').split(','),
    process.env.GEMINI_API_KEY || ''
  ];

  const seen = new Set();
  return configuredKeys
    .map((key) => key.trim())
    .filter(Boolean)
    .filter((key) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const initGemini = () => {
  try {
    const apiKeys = getGeminiApiKeys();

    if (!apiKeys.length) {
      geminiClients = [];
      logger.warn('GEMINI_API_KEY or GEMINI_API_KEYS not set - AI features will be disabled');
      return null;
    }

    geminiClients = apiKeys.map((apiKey) => new GoogleGenerativeAI(apiKey));
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    logger.info(`Gemini AI clients initialized with model: ${modelName} (${geminiClients.length} key(s) configured)`);
    return geminiClients[0];
  } catch (error) {
    geminiClients = [];
    logger.error('Failed to initialize Gemini', { error: error.message });
    return null;
  }
};

const getGeminiClients = () => {
  if (!geminiClients) {
    initGemini();
  }
  return geminiClients || [];
};

const getGeminiClient = () => {
  return getGeminiClients()[0] || null;
};

export { initGemini, getGeminiApiKeys, getGeminiClient, getGeminiClients };
