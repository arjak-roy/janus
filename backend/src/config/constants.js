export const PORT = Number(process.env.PORT || 8080);

export const JANUS_HTTP = process.env.JANUS_HTTP_URL || 'http://janus-gateway:8088/janus';
export const JANUS_API_SECRET = process.env.JANUS_API_SECRET || '';

export const ROOM_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
export const ROOM_MAX_IDLE_AGE_MS = 60 * 60 * 1000;
export const allowedOriginPatterns = [
  /^https?:\/\/localhost(?::\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^https?:\/\/13\.51\.211\.112(?::\d+)?$/  // <-- ADD THIS LINE
];
