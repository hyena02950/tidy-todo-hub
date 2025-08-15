const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const authService = require('../services/authService');
const realtimeService = require('../services/realtimeService');
const auth = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../validators/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: true,
    message: 'Too many authentication attempts, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: true,
    message: 'Too many login attempts, please try again later.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register endpoint with real-time notification
router.post('/register', authLimiter, validateRegistration, asyncHandler(async (req, res) => {
  const { email, password, companyName, contactPerson } = req.body;
  
  console.log('Registration attempt:', { email, companyName, contactPerson });

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: true,
        message: 'User already exists with this email',
        code: 'USER_EXISTS'
      });
    }

    // Create user with default role
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      profile: {
        name: contactPerson,
        companyName
      },
      roles: [{ role: 'vendor_admin' }], // Default role, will be updated when vendor is created
      isActive: true,
      emailVerified: true // For simplicity, auto-verify emails
    });

    await user.save();

    // Generate tokens
    const deviceInfo = authService.getDeviceInfo(req);
    const accessToken = authService.generateAccessToken(user._id, user.tokenVersion || 0);
    const refreshToken = await authService.generateRefreshToken(user._id, deviceInfo);

    // Prepare user data for response
    const userData = {
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
      profile: user.profile
    };

    // Send real-time notification to admins about new user registration
    realtimeService.notifyNewUserRegistration(userData);

    console.log('User registered successfully:', userData.email);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      accessToken,
      refreshToken,
      user: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: true,
      message: 'Registration failed. Please try again.',
      code: 'REGISTRATION_ERROR'
    });
  }
}));

// Login endpoint
router.post('/login', loginLimiter, validateLogin, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email });

  try {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        error: true,
        message: 'Account is inactive',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Validate password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        error: true,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const deviceInfo = authService.getDeviceInfo(req);
    const accessToken = authService.generateAccessToken(user._id, user.tokenVersion || 0);
    const refreshToken = await authService.generateRefreshToken(user._id, deviceInfo);

    // Prepare user data for response
    const userData = {
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
      profile: user.profile
    };

    console.log('User logged in successfully:', userData.email);

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: true,
      message: 'Login failed. Please try again.',
      code: 'LOGIN_ERROR'
    });
  }
}));

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  console.log('Token refresh attempt');

  try {
    if (!refreshToken) {
      return res.status(400).json({
        error: true,
        message: 'Refresh token is required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    const deviceInfo = authService.getDeviceInfo(req);
    const refreshedData = await authService.refreshAccessToken(refreshToken, deviceInfo);

    console.log('Token refreshed successfully for user:', refreshedData.user.email);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: refreshedData.accessToken,
      refreshToken: refreshedData.refreshToken,
      user: refreshedData.user
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: true,
      message: error.message || 'Invalid or expired refresh token',
      code: error.code || 'INVALID_REFRESH_TOKEN'
    });
  }
}));

// Logout endpoint
router.post('/logout', auth.authenticateToken, asyncHandler(async (req, res) => {
  const { refreshToken, logoutAllDevices } = req.body;
  
  console.log('Logout attempt for user:', req.user.email);

  try {
    if (logoutAllDevices) {
      // Revoke all refresh tokens for the user
      await authService.revokeAllUserTokens(req.user.id, 'Logout all devices');
      console.log('Logged out from all devices for user:', req.user.email);
    } else if (refreshToken) {
      // Revoke specific refresh token
      await authService.revokeRefreshToken(refreshToken, 'Logout');
      console.log('Logged out from current device for user:', req.user.email);
    } else {
      return res.status(400).json({
        error: true,
        message: 'Refresh token is required for single device logout',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: true,
      message: 'Logout failed. Please try again.',
      code: 'LOGOUT_ERROR'
    });
  }
}));

// Verify email endpoint
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  console.log('Email verification attempt');

  try {
    if (!token) {
      return res.status(400).json({
        error: true,
        message: 'Verification token is required',
        code: 'VERIFICATION_TOKEN_REQUIRED'
      });
    }

    const userId = await authService.verifyEmailToken(token);

    console.log('Email verified successfully for user:', userId);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({
      error: true,
      message: error.message || 'Invalid or expired verification token',
      code: error.code || 'INVALID_VERIFICATION_TOKEN'
    });
  }
}));

// Forgot password endpoint
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  console.log('Forgot password attempt:', { email, ipAddress, userAgent });

  try {
    if (!email) {
      return res.status(400).json({
        error: true,
        message: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    }

    const resetData = await authService.generatePasswordResetToken(email, ipAddress, userAgent);
    if (!resetData) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'Password reset email sent if user exists'
      });
    }

    const { token, user } = resetData;

    // TODO: Send email with reset link
    console.log('Password reset token generated for user:', user.email, 'Token:', token);

    res.json({
      success: true,
      message: 'Password reset email sent if user exists'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to generate password reset token. Please try again.',
      code: 'FORGOT_PASSWORD_ERROR'
    });
  }
}));

// Reset password endpoint
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  
  console.log('Reset password attempt');

  try {
    if (!token || !newPassword) {
      return res.status(400).json({
        error: true,
        message: 'Token and new password are required',
        code: 'TOKEN_PASSWORD_REQUIRED'
      });
    }

    const user = await authService.resetPassword(token, newPassword);

    console.log('Password reset successfully for user:', user.email);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({
      error: true,
      message: error.message || 'Invalid or expired reset token',
      code: error.code || 'INVALID_RESET_TOKEN'
    });
  }
}));

// Setup 2FA endpoint
router.post('/setup-2fa', auth.authenticateToken, asyncHandler(async (req, res) => {
  console.log('2FA setup attempt for user:', req.user.email);

  try {
    const setupData = await authService.setup2FA(req.user.id);

    console.log('2FA setup data generated for user:', req.user.email);

    res.json({
      success: true,
      message: '2FA setup data generated successfully',
      data: setupData
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to setup 2FA',
      code: error.code || 'TWO_FA_SETUP_ERROR'
    });
  }
}));

// Verify 2FA endpoint
router.post('/verify-2fa', auth.authenticateToken, asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  console.log('2FA verification attempt for user:', req.user.email);

  try {
    if (!token) {
      return res.status(400).json({
        error: true,
        message: '2FA token is required',
        code: 'TWO_FA_TOKEN_REQUIRED'
      });
    }

    const verified = await authService.verify2FA(req.user.id, token);

    console.log('2FA verified successfully for user:', req.user.email);

    res.json({
      success: true,
      message: '2FA verified successfully'
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(400).json({
      error: true,
      message: error.message || 'Invalid 2FA token',
      code: error.code || 'INVALID_2FA_TOKEN'
    });
  }
}));

// Disable 2FA endpoint
router.post('/disable-2fa', auth.authenticateToken, asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  console.log('2FA disable attempt for user:', req.user.email);

  try {
    if (!token) {
      return res.status(400).json({
        error: true,
        message: '2FA token is required',
        code: 'TWO_FA_TOKEN_REQUIRED'
      });
    }

    const disabled = await authService.disable2FA(req.user.id, token);

    console.log('2FA disabled successfully for user:', req.user.email);

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });

  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(400).json({
      error: true,
      message: error.message || 'Invalid 2FA token',
      code: error.code || 'INVALID_2FA_TOKEN'
    });
  }
}));

module.exports = router;
