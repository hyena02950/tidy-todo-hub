
const Joi = require('joi');
const AppError = require('../utils/AppError');

const validateBody = (schema) => {
  return (req, res, next) => {
    console.log('Validating request body:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      console.log('Validation errors:', JSON.stringify(errors, null, 2));

      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors));
    }

    req.body = value;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    console.log('Validating request query:', JSON.stringify(req.query, null, 2));
    
    const { error, value } = schema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      console.log('Query validation errors:', JSON.stringify(errors, null, 2));

      return next(new AppError('Query validation failed', 400, 'QUERY_VALIDATION_ERROR', errors));
    }

    req.query = value;
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    console.log('Validating request params:', JSON.stringify(req.params, null, 2));
    
    const { error, value } = schema.validate(req.params);

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      console.log('Params validation errors:', JSON.stringify(errors, null, 2));

      return next(new AppError('Invalid parameters', 400, 'PARAM_VALIDATION_ERROR', errors));
    }

    req.params = value;
    next();
  };
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams
};
