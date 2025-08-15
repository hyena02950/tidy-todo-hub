const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { loginSchema, registerSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema, setup2FASchema } = require('../validators/auth');
const { validateBody } = require('../middleware/validate');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const authService = require('../services/authService');
const emailService = require('../utils/emailService');
const speakeasy = require('speakeasy');

const router = express.Router();

// Login route
router.post('/login', validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { email, password, twoFactorToken } = req.body;

  console.log('Login attempt:', { email, has2FA: !!twoFactorToken });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    // Increment login attempts and lock account if needed
    await user.incLoginAttempts();
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Check if 2FA is required and enabled
  const requires2FA = await authService.requires2FA(user._id);
  const has2FAEnabled = await authService.has2FAEnabled(user._id);

  console.log('2FA Status:', { requires2FA, has2FAEnabled, userRoles: user.roles.map(r => r.role) });

  if (requires2FA && !has2FAEnabled) {
    return res.status(403).json({
      error: true,
      message: '2FA setup required for this role',
      code: 'TWO_FA_SETUP_REQUIRED',
      requires2FASetup: true,
      tempUserId: user._id
    });
  }

  if (requires2FA && has2FAEnabled) {
    // Only require 2FA token if 2FA is enabled
    if (!twoFactorToken || twoFactorToken.trim() === '') {
      return res.status(400).json({
        error: true,
        message: 'Two-factor token required',
        code: 'TWO_FA_REQUIRED',
        requires2FA: true,
        tempUserId: user._id
      });
    }

    try {
      const verified = await authService.verify2FA(user._id, twoFactorToken);
      if (!verified) {
        throw new AppError('Invalid two-factor token', 401, 'INVALID_TWO_FA_TOKEN');
      }
    } catch (error) {
      console.error('2FA verification failed:', error);
      throw new AppError('Invalid two-factor token', 401, 'INVALID_TWO_FA_TOKEN');
    }
  }

  // Generate tokens using the new auth service methods
  const deviceInfo = authService.getDeviceInfo(req);
  const accessToken = authService.generateAccessToken(user._id, user.tokenVersion || 0);
  const refreshToken = await authService.generateRefreshToken(user._id, deviceInfo);

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  console.log('Login successful for:', user.email);

  res.json({
    message: 'Login successful',
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
      profile: user.profile
    }
  });
}));

// Register route - Auto-assign vendor_admin role
router.post('/register', validateBody(registerSchema), asyncHandler(async (req, res) => {
  const { email, password, companyName, contactPerson } = req.body;

  console.log('Registration attempt:', { email, companyName, contactPerson });

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('User already exists with this email', 400, 'USER_EXISTS');
  }

  // Create user with vendor_admin role by default
  const user = new User({
    email: email.toLowerCase(),
    password,
    profile: {
      companyName: companyName || '',
      contactPerson: contactPerson || email.split('@')[0]
    },
    roles: [{
      role: 'vendor_admin'
    }] // Auto-assign vendor_admin role
  });

  await user.save();
  console.log('User created successfully with vendor_admin role:', user._id);

  // Generate tokens using the new auth service methods
  const deviceInfo = authService.getDeviceInfo(req);
  const accessToken = authService.generateAccessToken(user._id, user.tokenVersion || 0);
  const refreshToken = await authService.generateRefreshToken(user._id, deviceInfo);

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  console.log('Registration completed for:', user.email);

  res.status(201).json({
    message: 'User registered successfully with vendor admin role',
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
      profile: user.profile
    }
  });
}));

// Refresh token route
router.post('/refresh-token', validateBody(refreshTokenSchema), asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  console.log('Attempting to refresh token');

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
  }

  // Use the new refresh token method
  const deviceInfo = authService.getDeviceInfo(req);
  const result = await authService.refreshAccessToken(refreshToken, deviceInfo);

  console.log('Token refreshed successfully for user:', result.user.email);

  res.json({
    message: 'Token refreshed successfully',
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: result.user
  });
}));

// Logout route
router.post('/logout', auth.authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { refreshToken, logoutAllDevices } = req.body;

  console.log('Attempting to logout user:', userId);

  if (logoutAllDevices) {
    // Revoke all user tokens
    await authService.revokeAllUserTokens(userId, 'User logout all devices');
  } else if (refreshToken) {
    // Revoke specific refresh token
    await authService.revokeRefreshToken(refreshToken, 'User logout');
  }

  console.log('Logout successful for user:', userId);

  res.json({
    message: 'Logout successful'
  });
}));

// Forgot password route
router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;
  const deviceInfo = authService.getDeviceInfo(req);

  console.log('Attempting forgot password for email:', email);

  const result = await authService.generatePasswordResetToken(
    email, 
    deviceInfo.ipAddress, 
    deviceInfo.userAgent
  );

  if (!result) {
    // Don't reveal if email exists
    return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  }

  const { token, user } = result;

  // Send email with reset token
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please click on the following link, or paste this into your browser to complete the process:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;

  try {
    await emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset',
      text: message
    });

    console.log('Password reset email sent to:', user.email);

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new AppError('There was an error sending the email. Please try again later.', 500, 'EMAIL_SEND_ERROR');
  }
}));

// Reset password route
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  console.log('Attempting reset password with token:', token);

  const user = await authService.resetPassword(token, password);

  console.log('Password reset successfully for:', user.email);

  res.json({ message: 'Password reset successfully' });
}));

// Verify email route
router.post('/verify-email', validateBody(verifyEmailSchema), asyncHandler(async (req, res) => {
  const { token } = req.body;

  console.log('Attempting email verification with token:', token);

  const userId = await authService.verifyEmailToken(token);

  console.log('Email verified successfully for user:', userId);

  res.json({ message: 'Email verified successfully' });
}));

// Request new verification email route
router.post('/request-verification-email', auth.authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.emailVerified) {
    return res.status(400).json({ message: 'Email already verified' });
  }

  // Generate verification token using auth service
  const token = await authService.generateEmailVerificationToken(user._id, user.email);

  // Send email with verification token
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  const message = `Please click on the following link, or paste this into your browser to verify your email address:\n\n${verificationUrl}\n\nIf you did not request this, please ignore this email.`;

  try {
    await emailService.sendEmail({
      to: user.email,
      subject: 'Email Verification',
      text: message
    });

    console.log('Verification email sent to:', user.email);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new AppError('There was an error sending the email. Please try again later.', 500, 'EMAIL_SEND_ERROR');
  }
}));

// Setup 2FA route
router.post('/setup-2fa', auth.authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  console.log('Setting up 2FA for user:', userId);

  const result = await authService.setup2FA(userId);

  res.json({
    secret: result.secret,
    qrCode: result.qrCode,
    backupCodes: result.backupCodes,
    required: result.required
  });
}));

// Enable 2FA route
router.post('/enable-2fa', auth.authenticateToken, validateBody(setup2FASchema), asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  console.log('Enabling 2FA for user:', userId);

  await authService.enable2FA(userId, token);

  console.log('2FA enabled successfully for user:', userId);

  res.json({ message: 'Two-factor authentication enabled successfully' });
}));

// Disable 2FA route
router.post('/disable-2fa', auth.authenticateToken, asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  console.log('Disabling 2FA for user:', userId);

  await authService.disable2FA(userId, token);

  console.log('2FA disabled successfully for user:', userId);

  res.json({ message: 'Two-factor authentication disabled successfully' });
}));

module.exports = router;
