/**
 * Centralized Error Handling Middleware for Express
 */
const errorHandler = (err, req, res, next) => {
  console.error('SERVER_ERROR: ', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Handle specific database errors (like Prisma unique constraint failures)
  if (err.code === 'P2002') {
    return res.status(400).json({
      error: 'Unique constraint violation. Field already exists in database.',
      fields: err.meta?.target || [],
    });
  }

  res.status(statusCode).json({
    error: message,
    // Only send stack trace in development mode
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
