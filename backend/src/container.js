import { prisma } from './data/prismaClient.js';
import { RoomRepository } from './data/roomRepository.js';
import { MessageRepository } from './data/messageRepository.js';
import { JanusApiService } from './services/janusApiService.js';
import { RoomService } from './services/roomService.js';
import { MessageService } from './services/messageService.js';
import { HealthService } from './services/healthService.js';
import { SignalingService } from './services/signalingService.js';
import { TokenService } from './services/tokenService.js';
import { CleanupService } from './services/cleanupService.js';
import { RoomController } from './controllers/roomController.js';
import { MessageController } from './controllers/messageController.js';
import { HealthController } from './controllers/healthController.js';
import { SignalingController } from './controllers/signalingController.js';

export function createContainer() {
  const roomRepository = new RoomRepository(prisma);
  const messageRepository = new MessageRepository(prisma);

  const janusApiService = new JanusApiService();
  const tokenService = new TokenService();
  const roomService = new RoomService(roomRepository, janusApiService);
  const messageService = new MessageService(roomRepository, messageRepository);
  const healthService = new HealthService(prisma);
  const signalingService = new SignalingService(roomRepository, tokenService);
  const cleanupService = new CleanupService(roomRepository, janusApiService);

  return {
    prisma,
    cleanupService,
    controllers: {
      roomController: new RoomController(roomService, tokenService, signalingService),
      messageController: new MessageController(messageService),
      healthController: new HealthController(healthService),
      signalingController: new SignalingController(signalingService)
    }
  };
}
