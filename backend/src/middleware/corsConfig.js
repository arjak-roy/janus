import { allowedOriginPatterns } from '../config/constants.js';

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin denied: ${origin}`));
  },
  credentials: true
};
