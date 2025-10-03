import Joi from 'joi'
import { ValidationError } from './errors.js'

// User registration validation schema
export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().trim().lowercase().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  username: Joi.string().trim().lowercase().min(3).max(20)
    .pattern(/^[a-zA-Z0-9_-]+$/).required().messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 20 characters',
      'string.pattern.base': 'Username can only contain letters, numbers, underscores, and dashes',
      'any.required': 'Username is required'
    }),
  password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Password confirmation does not match',
    'any.required': 'Password confirmation is required'
  })
})

// User login validation schema
export const loginSchema = Joi.object({
  username: Joi.string().trim().required().messages({
    'any.required': 'Username is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
})

// Password reset request schema
export const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
})

// Password reset schema
export const passwordResetSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    })
})

// Product validation schema
export const productSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).required(),
  artist: Joi.string().trim().min(1).max(100).required(),
  price: Joi.number().positive().precision(2).required(),
  genre: Joi.string().trim().min(1).max(50).required(),
  year: Joi.number().integer().min(1900).max(new Date().getFullYear()).required(),
  stock: Joi.number().integer().min(0).required(),
  image: Joi.string().trim().optional()
})

// Cart item validation schema
export const cartItemSchema = Joi.object({
  productId: Joi.number().integer().positive().required().messages({
    'number.base': 'Product ID must be a number',
    'number.positive': 'Product ID must be positive',
    'any.required': 'Product ID is required'
  }),
  quantity: Joi.number().integer().min(1).max(10).optional().messages({
    'number.min': 'Quantity must be at least 1',
    'number.max': 'Quantity cannot exceed 10'
  })
})

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      // Use our custom ValidationError class
      return next(ValidationError.fromJoiError(error))
    }

    // Replace req.body with validated and sanitized data
    req.body = value
    next()
  }
}