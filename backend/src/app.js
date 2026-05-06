import express from 'express';
import cors from 'cors';
import expressWs from 'express-ws';
import { corsOptions } from './middleware/corsConfig.js';
import { roomCreateLimiter, messageLimiter } from './middleware/rateLimiters.js';
import { createHealthRoutes } from './routes/healthRoutes.js';
import { createRoomRoutes } from './routes/roomRoutes.js';
import { createContainer } from './container.js';

export function createApp() {
  const app = express();
  expressWs(app);

  app.set('trust proxy', 1);
  app.use(cors(corsOptions));
  app.use(express.json());

  const container = createContainer();
  const { roomController, messageController, healthController, signalingController } = container.controllers;

  app.use(createHealthRoutes(healthController));
  app.use(createRoomRoutes(roomController, messageController, roomCreateLimiter, messageLimiter));

  app.ws('/api/rooms/:roomId/ws', signalingController.handleSocket);

  return { app, container };
}
