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

export function validateEnum(value, fieldName, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new AppError(`Invalid value '${value}' for field '${fieldName}'. Allowed values: ${allowedValues.join(', ')}`, 400);
  }
  return value;
}

export function validatePagination(pageQuery, limitQuery, defaultLimit = 20, maxLimit = 100) {
  let page = 1;
  if (pageQuery !== undefined && pageQuery !== null && pageQuery !== '') {
    const parsedPage = Number(pageQuery);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new AppError("Field 'page' must be a positive integer.", 400);
    }
    page = parsedPage;
  }

  let limit = defaultLimit;
  if (limitQuery !== undefined && limitQuery !== null && limitQuery !== '') {
    const parsedLimit = Number(limitQuery);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      throw new AppError(`Field 'limit' must be a positive integer between 1 and ${maxLimit}.`, 400);
    }
    if (parsedLimit > maxLimit) {
      throw new AppError(`Field 'limit' cannot exceed maximum allowed page size of ${maxLimit}.`, 400);
    }
    limit = parsedLimit;
  }

  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function validateFutureDate(dateStr, fieldName = 'scheduledAt') {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new AppError(`Field '${fieldName}' must be a valid ISO-8601 date string.`, 400);
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new AppError(`Field '${fieldName}' is not a valid date string.`, 400);
  }
  if (date.getTime() <= Date.now()) {
    throw new AppError(`Field '${fieldName}' must be a future date and time.`, 400);
  }
  return date;
}

export function validateBulkArticleIds(articleIds, maxBatchSize = 100) {
  if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
    throw new AppError("Field 'articleIds' must be a non-empty array of article IDs.", 400);
  }
  if (articleIds.length > maxBatchSize) {
    throw new AppError(`Batch size cannot exceed ${maxBatchSize} articles. Received: ${articleIds.length}.`, 400);
  }
  const seen = new Set();
  const cleanIds = [];
  for (const id of articleIds) {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new AppError("Each item in 'articleIds' must be a non-empty string ID.", 400);
    }
    const cleanId = id.trim();
    if (seen.has(cleanId)) {
      throw new AppError(`Duplicate article ID '${cleanId}' detected in request payload. Each ID must be unique.`, 400);
    }
    seen.add(cleanId);
    cleanIds.push(cleanId);
  }
  return cleanIds;
}


