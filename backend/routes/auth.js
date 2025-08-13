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
const emailService = require('../services/emailService');
const speakeasy = require('speakeasy');

const router = express.Router();

// Login route
router.post('/login', validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { email, password, twoFactorToken } = req.body;

  console.log('Login attempt:', { email });

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

  if (requires2FA && has2FAEnabled) {
    // Verify 2FA token
    if (!twoFactorToken) {
      return res.status(400).json({
        error: true,
        message: 'Two-factor token required',
        code: 'TWO_FA_REQUIRED'
      });
    }

    const verified = authService.verify2FAToken(user._id, twoFactorToken);
    if (!verified) {
      throw new AppError('Invalid two-factor token', 401, 'INVALID_TWO_FA_TOKEN');
    }
  } else if (requires2FA && !has2FAEnabled) {
    return res.status(403).json({
      error: true,
      message: '2FA setup required for this role',
      code: 'TWO_FA_SETUP_REQUIRED'
    });
  }

  // Generate tokens
  const accessToken = authService.generateAccessToken(user._id, user.tokenVersion || 0);
  const refreshToken = authService.generateRefreshToken(user._id);

  // Save refresh token
  await authService.saveRefreshToken(user._id, refreshToken);

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

// Register route
router.post('/register', validateBody(registerSchema), asyncHandler(async (req, res) => {
  const { email, password, companyName, contactPerson } = req.body;

  console.log('Registration attempt:', { email, companyName, contactPerson });

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('User already exists with this email', 400, 'USER_EXISTS');
  }

  // Create user without any roles initially
  const user = new User({
    email: email.toLowerCase(),
    password,
    profile: {
      companyName: companyName || '',
      contactPerson: contactPerson || email.split('@')[0]
    },
    roles: [] // Start with no roles - they'll get assigned when vendor profile is created
  });

  await user.save();
  console.log('User created successfully:', user._id);

  // Generate tokens
  const accessToken = authService.generateAccessToken(user._id, user.tokenVersion || 0);
  const refreshToken = authService.generateRefreshToken(user._id);

  // Save refresh token
  await authService.saveRefreshToken(user._id, refreshToken);

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  console.log('Registration completed for:', user.email);

  res.status(201).json({
    message: 'User registered successfully',
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

  const userId = authService.verifyRefreshToken(refreshToken);
  if (!userId) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 404, 'USER_NOT_FOUND');
  }

  // Check if refresh token exists in database
  const storedRefreshToken = await authService.getRefreshToken(userId);
  if (storedRefreshToken !== refreshToken) {
    console.warn(`Possible refresh token reuse detected for user ${userId}`);
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Generate new tokens
  const accessToken = authService.generateAccessToken(userId, user.tokenVersion || 0);
  const newRefreshToken = authService.generateRefreshToken(userId);

  // Replace old refresh token with new one
  await authService.replaceRefreshToken(userId, refreshToken, newRefreshToken);

  console.log('Token refreshed successfully for:', user.email);

  res.json({
    message: 'Token refreshed successfully',
    accessToken,
    refreshToken: newRefreshToken
  });
}));

// Logout route
router.post('/logout', auth.authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  console.log('Attempting to logout user:', userId);

  // Remove refresh token from database
  await authService.deleteRefreshToken(userId);

  console.log('Logout successful for user:', userId);

  res.json({
    message: 'Logout successful'
  });
}));

// Forgot password route
router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;

  console.log('Attempting forgot password for email:', email);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.log('User not found for forgot password:', email);
    return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  }

  // Create reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  // Send email with reset token
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
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

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    throw new AppError('There was an error sending the email. Please try again later.', 500, 'EMAIL_SEND_ERROR');
  }
}));

// Reset password route
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  console.log('Attempting reset password with token:', token);

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired token', 400, 'INVALID_TOKEN');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate existing tokens
  await user.save();

  console.log('Password reset successfully for:', user.email);

  res.json({ message: 'Password reset successfully' });
}));

// Verify email route
router.post('/verify-email', validateBody(verifyEmailSchema), asyncHandler(async (req, res) => {
  const { token } = req.body;

  console.log('Attempting email verification with token:', token);

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired token', 400, 'INVALID_TOKEN');
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  console.log('Email verified successfully for:', user.email);

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

  // Create verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save();

  // Send email with verification token
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
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

    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    throw new AppError('There was an error sending the email. Please try again later.', 500, 'EMAIL_SEND_ERROR');
  }
}));

// Generate 2FA secret route
router.get('/generate-2fa-secret', auth.authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  console.log('Generating 2FA secret for user:', userId);

  const secret = speakeasy.generateSecret({ length: 20 });

  // Store secret temporarily (e.g., in memory or cache)
  authService.store2FASecret(userId, secret.base32);

  res.json({
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url
  });
}));

// Setup 2FA route
router.post('/setup-2fa', auth.authenticateToken, validateBody(setup2FASchema), asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  console.log('Setting up 2FA for user:', userId);

  const secret = authService.get2FASecret(userId);
  if (!secret) {
    throw new AppError('2FA secret not found. Please generate a new secret.', 400, 'SECRET_NOT_FOUND');
  }

  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow a window of 2 tokens in either direction
  });

  if (!verified) {
    throw new AppError('Invalid two-factor token', 401, 'INVALID_TWO_FA_TOKEN');
  }

  // Enable 2FA for user
  await authService.enable2FA(userId, secret);

  console.log('2FA enabled successfully for user:', userId);

  res.json({ message: 'Two-factor authentication enabled successfully' });
}));

// Disable 2FA route
router.post('/disable-2fa', auth.authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  console.log('Disabling 2FA for user:', userId);

  // Disable 2FA for user
  await authService.disable2FA(userId);

  console.log('2FA disabled successfully for user:', userId);

  res.json({ message: 'Two-factor authentication disabled successfully' });
}));

module.exports = router;
