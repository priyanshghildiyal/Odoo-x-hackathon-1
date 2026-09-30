export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.'
    }
  });
}

export function errorHandler(error, req, res, next) {
  const status = Number(error.status) || 500;
  if (status >= 500) console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    path: req.path
  }));
  res.status(status).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: status >= 500 ? 'Something went wrong. Please try again.' : error.message
    }
  });
}
