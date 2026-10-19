import { AppError } from '../middleware/errorHandler.js';

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new AppError('Email is required and must be a string.', 400);
  }
  const normalized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new AppError('Invalid email address format.', 400);
  }
  return normalized;
}

export function validateRequired(data, fields) {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new AppError(`Missing required field: '${field}'.`, 400);
    }
  }
}

export function validateString(value, fieldName, minLength = 1, maxLength = 255) {
  if (typeof value !== 'string') {
    throw new AppError(`Field '${fieldName}' must be a string.`, 400);
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new AppError(`Field '${fieldName}' must be at least ${minLength} characters long.`, 400);
  }
  if (trimmed.length > maxLength) {
    throw new AppError(`Field '${fieldName}' cannot exceed ${maxLength} characters.`, 400);
  }
  return trimmed;
}

export function validateOptionalString(value, fieldName, maxLength = 1000) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new AppError(`Field '${fieldName}' must be a string.`, 400);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new AppError(`Field '${fieldName}' cannot exceed ${maxLength} characters.`, 400);
  }
  return trimmed;
}
