import User from '../models/User.model.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokenHelper.js';
import logger from '../config/logger.js';

class AuthService {
  async register(name, email, password) {
    try {
      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        const error = new Error('User with this email already exists');
        error.statusCode = 409;
        throw error;
      }

      // Create new user
      const user = new User({ name, email, password });
      await user.save();

      // Generate tokens
      const accessToken = signAccessToken(user._id);
      const refreshToken = signRefreshToken(user._id);

      // Save refresh token to database
      user.refreshToken = refreshToken;
      await user.save();

      logger.info('User registered successfully', { userId: user._id, email });

      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          githubConnected: user.githubConnected
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Registration error', { error: error.message });
      throw error;
    }
  }

  async login(email, password) {
    try {
      // Find user and select password field
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
      }

      // Compare password
      const isPasswordCorrect = await user.comparePassword(password);
      if (!isPasswordCorrect) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
      }

      // Generate tokens
      const accessToken = signAccessToken(user._id);
      const refreshToken = signRefreshToken(user._id);

      // Save refresh token to database
      user.refreshToken = refreshToken;
      await user.save();

      logger.info('User logged in successfully', { userId: user._id, email });

      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          githubConnected: user.githubConnected
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Login error', { error: error.message });
      throw error;
    }
  }

  async refresh(token) {
    try {
      // Verify the refresh token and extract userId
      const decoded = verifyRefreshToken(token);

      // Find user by decoded userId and select refreshToken field
      const user = await User.findById(decoded.userId).select('+refreshToken');

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 401;
        throw error;
      }

      // Verify stored refreshToken matches the cookie token
      if (user.refreshToken !== token) {
        const error = new Error('Invalid refresh token');
        error.statusCode = 401;
        throw error;
      }

      // Generate new access token
      const accessToken = signAccessToken(user._id);

      logger.info('Token refreshed successfully', { userId: user._id });

      return { accessToken };
    } catch (error) {
      logger.debug('Token refresh error', { error: error.message });
      throw error;
    }
  }

  async logout(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { refreshToken: null },
        { new: true }
      );

      logger.info('User logged out successfully', { userId });

      return { message: 'Logged out successfully' };
    } catch (error) {
      logger.error('Logout error', { error: error.message });
      throw error;
    }
  }

  async getCurrentUser(userId) {
    try {
      const user = await User.findById(userId).select(
        '-password -refreshToken -githubAccessToken'
      );

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      return user;
    } catch (error) {
      logger.error('Get current user error', { error: error.message });
      throw error;
    }
  }
}

export default new AuthService();
