import CryptoJS from 'crypto-js';
import logger from '../config/logger.js';

const getSecret = () => {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is missing.');
  }
  return secret;
};

export const encrypt = (text) => {
  try {
    const secret = getSecret();
    const encrypted = CryptoJS.AES.encrypt(text, secret).toString();
    return encrypted;
  } catch (error) {
    logger.error('Error encrypting token', { error: error.message });
    throw error;
  }
};

export const decrypt = (cipherText) => {
  try {
    const secret = getSecret();
    const bytes = CryptoJS.AES.decrypt(cipherText, secret);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error('Decryption resulted in empty string');
    }
    return decrypted;
  } catch (error) {
    logger.error('Error decrypting token', { error: error.message });
    throw error;
  }
};

// Aliases for compatibility
export const encryptToken = encrypt;
export const decryptToken = decrypt;

