export const PORT = Number(process.env.PORT || 8080);

export const JANUS_HTTP = process.env.JANUS_HTTP_URL || 'http://172.28.0.1:8088/janus';
export const JANUS_API_SECRET = process.env.JANUS_API_SECRET || '';

// JWT for participant authentication
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '2h';

// Shared secret for admin API → Janus backend room/token requests
export const API_SHARED_SECRET = process.env.API_SHARED_SECRET || '';

export const ROOM_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
export const ROOM_MAX_IDLE_AGE_MS = 60 * 60 * 1000;
export const allowedOriginPatterns = [
  /^https?:\/\/localhost(?::\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^https?:\/\/13\.51\.211\.112(?::\d+)?$/,
  // Additional origins (set via CORS_ORIGINS env as comma-separated list)
  ...(process.env.CORS_ORIGINS || '').split(',').filter(Boolean).map(origin => {
    const escaped = origin.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}$`);
  })
];
