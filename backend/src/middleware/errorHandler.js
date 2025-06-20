// backend/src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });

  let error = {
    message: err.message || 'Internal server error',
    status: err.status || 500
  };

  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = 'Validation error';
  } else if (err.name === 'UnauthorizedError') {
    error.status = 401;
    error.message = 'Unauthorized';
  } else if (err.name === 'JsonWebTokenError') {
    error.status = 401;
    error.message = 'Invalid token';
  } else if (err.code === '23505') {
    error.status = 409;
    error.message = 'Duplicate entry';
  }

  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal server error';
  }

  res.status(error.status).json({
    success: false,
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;