import { Router } from 'express';

export function createRoomRoutes(roomController, messageController, roomCreateLimiter, messageLimiter) {
  const router = Router();

  router.post('/api/rooms', roomCreateLimiter, roomController.createRoom);
  router.get('/api/rooms', roomController.getRooms);
  router.get('/api/rooms/:id', roomController.getRoomById);

  router.post('/api/rooms/:roomId/messages', messageLimiter, messageController.createMessage);
  router.get('/api/rooms/:roomId/messages', messageController.getMessages);

  return router;
}
