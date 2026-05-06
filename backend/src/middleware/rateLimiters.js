import rateLimit from 'express-rate-limit';

export const roomCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many rooms created. Try again later.' }
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many messages. Slow down.' }
});
