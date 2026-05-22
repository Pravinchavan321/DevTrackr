import CryptoJS from 'crypto-js';
import logger from '../config/logger.js';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'default_secret_32_chars_minimum';

export const encryptToken = (token) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(token, ENCRYPTION_SECRET).toString();
    return encrypted;
  } catch (error) {
    logger.error('Error encrypting token', { error: error.message });
    throw error;
  }
};

export const decryptToken = (encryptedToken) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    logger.error('Error decrypting token', { error: error.message });
    throw error;
  }
};
