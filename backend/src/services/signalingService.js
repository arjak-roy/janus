export class SignalingService {
  constructor(roomRepository) {
    this.roomRepository = roomRepository;
    this.roomSubscribers = new Map();
  }

  broadcastToRoom(roomId, message, excludeSocket = null) {
    const subscribers = this.roomSubscribers.get(roomId);
    if (!subscribers) return;

    subscribers.forEach((socket) => {
      if (socket === excludeSocket) return;
      if (socket.readyState === 1) {
        try {
          socket.send(JSON.stringify(message));
        } catch (err) {
          console.error('[WebSocket] Failed to send to subscriber:', err.message);
        }
      }
    });
  }

  async connectRoomSocket(ws, roomIdentifier) {
    const room = await this.roomRepository.findByIdOrJanusId(roomIdentifier);
    if (!room) {
      ws.close(1008, 'Room not found');
      return;
    }

    const actualRoomId = room.id;
    if (!this.roomSubscribers.has(actualRoomId)) {
      this.roomSubscribers.set(actualRoomId, new Set());
    }
    this.roomSubscribers.get(actualRoomId).add(ws);

    console.log(
      `[WebSocket] Client connected to room ${actualRoomId}. Subscribers: ${this.roomSubscribers.get(actualRoomId).size}`
    );

    ws.on('message', (rawData) => {
      try {
        const message = JSON.parse(rawData);
        if (!message.__signal || !message.type) {
          console.warn('[WebSocket] Invalid signal format received');
          return;
        }
        this.broadcastToRoom(actualRoomId, message, ws);
      } catch (err) {
        console.error('[WebSocket] Error processing message:', err.message);
      }
    });

    ws.on('close', () => {
      const subs = this.roomSubscribers.get(actualRoomId);
      if (!subs) return;

      subs.delete(ws);
      console.log(`[WebSocket] Client disconnected from room ${actualRoomId}. Subscribers: ${subs.size}`);
      if (subs.size === 0) {
        this.roomSubscribers.delete(actualRoomId);
      }
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Connection error:', err.message);
    });
  }
}
