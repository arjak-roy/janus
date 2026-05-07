import express from 'express';
import cors from 'cors';
import expressWs from 'express-ws';
import { corsOptions } from './middleware/corsConfig.js';
import { roomCreateLimiter, messageLimiter } from './middleware/rateLimiters.js';
import { createHealthRoutes } from './routes/healthRoutes.js';
import { createRoomRoutes } from './routes/roomRoutes.js';
import { createContainer } from './container.js';

function captureRawJsonBody(req, _res, buf, encoding) {
  if (!buf?.length) {
    return;
  }

  const rawBody = buf.toString(encoding || 'utf8');
  req.rawBodyPreview = rawBody.length > 512 ? `${rawBody.slice(0, 512)}...` : rawBody;
}

function handleJsonParseError(err, req, res, next) {
  const isJsonParseError =
    err?.type === 'entity.parse.failed' ||
    (err instanceof SyntaxError && err.status === 400 && 'body' in err);

  if (!isJsonParseError) {
    return next(err);
  }

  const contentType = req.headers['content-type'] || 'unknown';
  console.warn(
    `[HTTP] Invalid JSON payload for ${req.method} ${req.originalUrl} (content-type: ${contentType})`,
    req.rawBodyPreview || '<empty>'
  );

  return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
}

export function createApp() {
  const app = express();
  expressWs(app);

  app.set('trust proxy', 1);
  app.use(cors(corsOptions));
  app.use(express.json({ verify: captureRawJsonBody }));

  const container = createContainer();
  const { roomController, messageController, healthController, signalingController } = container.controllers;

  app.use(createHealthRoutes(healthController));
  app.use(createRoomRoutes(roomController, messageController, roomCreateLimiter, messageLimiter));

  app.ws('/api/rooms/:roomId/ws', signalingController.handleSocket);
  app.use(handleJsonParseError);

  return { app, container };
}
