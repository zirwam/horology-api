/**
 * Global error handler
 * Catches all errors thrown in routes and services.
 * Never leaks stack traces or internal details to the client.
 */

const errorHandler = (err, req, res, next) => {
  // Log full error server-side (swap for Winston/Datadog in production)
  console.error(`[error] ${req.method} ${req.path}`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Anthropic API errors
  if (err.name === 'AnthropicError' || err.status) {
    return res.status(502).json({
      error: 'AI service error',
      message: 'Could not reach valuation AI. Please try again.',
    });
  }

  // CORS errors
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // JSON parse errors from AI response
  if (err instanceof SyntaxError) {
    return res.status(502).json({
      error: 'AI response parse error',
      message: 'Received unexpected response from AI. Please try again.',
    });
  }

  // Generic server error — never expose internals
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Something went wrong. Please try again.',
  });
};

module.exports = { errorHandler };
