
const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  twoFactorToken: Joi.string().length(6).optional().allow('', null)
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  companyName: Joi.string().min(2).max(100).optional(),
  contactPerson: Joi.string().min(2).max(100).optional()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required()
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().required()
});

const setup2FASchema = Joi.object({
  token: Joi.string().length(6).required()
});

// Validation middleware functions
const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: true,
      message: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

const validateRegistration = (req, res, next) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: true,
      message: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

const validateRefreshToken = (req, res, next) => {
  const { error } = refreshTokenSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: true,
      message: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

const validateForgotPassword = (req, res, next) => {
  const { error } = forgotPasswordSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: true,
      message: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

const validateResetPassword = (req, res, next) => {
  const { error } = resetPasswordSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: true,
      message: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

const validateVerifyEmail = (req, res, next) => {
  const { error } = verifyEmailSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: true,
      message: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

const validateSetup2FA = (req, res, next) => {
  const { error } = setup2FASchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: true,
      message: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

module.exports = {
  // Schemas
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  setup2FASchema,
  
  // Middleware functions
  validateLogin,
  validateRegistration,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateSetup2FA
};
