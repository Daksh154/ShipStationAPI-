function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] Error: ${err.message}`, err.details || '');
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = errorHandler;
