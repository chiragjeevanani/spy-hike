import { ApiError } from '../utils/ApiError.js';
import { isProd } from '../config/env.js';

// 404 fallback for any route that didn't match. Placed after all routers.
export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler. Turns ApiError (and a few well-known library errors)
// into a consistent JSON body: { error: { message, details? } }.
// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Mongoose validation → 400 with field messages.
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.fromEntries(
      Object.entries(err.errors || {}).map(([field, e]) => [field, e.message]),
    );
  }

  // Duplicate key (e.g. unique email) → 409.
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists`;
  }

  // Malformed ObjectId in a path param → 404 rather than a 500.
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }

  if (statusCode >= 500 && !isProd) {
    // Surface unexpected server errors in dev/test logs for debugging.
    console.error(err);
  }

  const body = { error: { message } };
  if (details) body.error.details = details;
  res.status(statusCode).json(body);
}
