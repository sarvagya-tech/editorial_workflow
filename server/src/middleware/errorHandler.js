export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, req, res, next) {
  // Operational custom errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  }

  // Prisma known request errors
  if (err.code === 'P2002') {
    const target = err.meta?.target ? ` (${err.meta.target.join(', ')})` : '';
    return res.status(409).json({
      error: `A record with this unique value already exists${target}.`,
      statusCode: 409,
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      error: 'Foreign key constraint violation: referenced record does not exist.',
      statusCode: 400,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: err.meta?.cause || 'Requested record was not found.',
      statusCode: 404,
    });
  }

  // PostgreSQL custom trigger errors (42601, P0001, etc.)
  if (err.message && err.message.includes('Editorial Audit Violation')) {
    return res.status(403).json({
      error: 'Action prohibited: Timeline audit events are strictly immutable and cannot be updated or deleted.',
      statusCode: 403,
    });
  }

  console.error('[Unhandled Server Error]:', err);
  return res.status(500).json({
    error: 'An unexpected internal server error occurred.',
    statusCode: 500,
  });
}
