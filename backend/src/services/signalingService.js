export class SignalingService {
  constructor(roomRepository, tokenService) {
    this.roomRepository = roomRepository;
    this.tokenService = tokenService;
    // Map<roomId, Map<ws, { userId, displayName, role, joinedAt }>>
    this.roomSubscribers = new Map();
  }

  /**
   * Get metadata for all participants in a room.
   */
  getParticipants(roomId) {
    const subscribers = this.roomSubscribers.get(roomId);
    if (!subscribers) return [];
    const list = [];
    subscribers.forEach((meta) => {
      list.push({ ...meta });
    });
    return list;
  }

  broadcastToRoom(roomId, message, excludeSocket = null) {
    const subscribers = this.roomSubscribers.get(roomId);
    if (!subscribers) return;

    subscribers.forEach((meta, socket) => {
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

  /**
   * Send a message to a specific user in a room by userId.
   */
  sendToUser(roomId, targetUserId, message) {
    const subscribers = this.roomSubscribers.get(roomId);
    if (!subscribers) return false;

    for (const [socket, meta] of subscribers.entries()) {
      if (meta.userId === targetUserId && socket.readyState === 1) {
        try {
          socket.send(JSON.stringify(message));
          return true;
        } catch (err) {
          console.error('[WebSocket] Failed to send to user:', err.message);
        }
      }
    }
    return false;
  }

  /**
   * Disconnect a specific user from a room (kick).
   */
  disconnectUser(roomId, targetUserId, reason = 'Removed by trainer') {
    const subscribers = this.roomSubscribers.get(roomId);
    if (!subscribers) return false;

    for (const [socket, meta] of subscribers.entries()) {
      if (meta.userId === targetUserId) {
        try {
          socket.send(JSON.stringify({ __signal: true, type: 'kicked', reason }));
          socket.close(1000, reason);
        } catch (err) {
          console.error('[WebSocket] Error kicking user:', err.message);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Trainer command signals — only processed if sender is a trainer.
   */
  static TRAINER_COMMANDS = new Set([
    'mute-all', 'force-mute', 'kick', 'spotlight', 'clear-spotlight', 'dismiss-hand', 'end-class'
  ]);

  async connectRoomSocket(ws, roomIdentifier, token) {
    // Validate JWT token
    let participant = null;
    if (token) {
      participant = this.tokenService.verifyToken(token);
    }

    if (!participant) {
      ws.close(1008, 'Invalid or missing token');
      return;
    }

    const room = await this.roomRepository.findByIdOrJanusId(roomIdentifier);
    if (!room) {
      ws.close(1008, 'Room not found');
      return;
    }

    // Verify token was issued for this room
    const actualRoomId = room.id;
    if (participant.roomId !== actualRoomId && participant.roomId !== String(room.janusId)) {
      ws.close(1008, 'Token not valid for this room');
      return;
    }

    if (!this.roomSubscribers.has(actualRoomId)) {
      this.roomSubscribers.set(actualRoomId, new Map());
    }

    const meta = {
      userId: participant.userId,
      displayName: participant.displayName,
      role: participant.role,
      joinedAt: new Date().toISOString()
    };

    this.roomSubscribers.get(actualRoomId).set(ws, meta);

    console.log(
      `[WebSocket] ${meta.displayName} (${meta.role}) connected to room ${actualRoomId}. Subscribers: ${this.roomSubscribers.get(actualRoomId).size}`
    );

    // Notify others of join
    this.broadcastToRoom(actualRoomId, {
      __signal: true,
      type: 'participant-joined',
      userId: meta.userId,
      displayName: meta.displayName,
      role: meta.role
    }, ws);

    ws.on('message', (rawData) => {
      try {
        const message = JSON.parse(rawData);
        if (!message.__signal || !message.type) {
          console.warn('[WebSocket] Invalid signal format received');
          return;
        }

        // Enforce trainer-only commands
        if (SignalingService.TRAINER_COMMANDS.has(message.type)) {
          if (meta.role !== 'trainer') {
            console.warn(`[WebSocket] Non-trainer ${meta.displayName} attempted command: ${message.type}`);
            return;
          }
          this.handleTrainerCommand(actualRoomId, message, ws, meta);
          return;
        }

        // Tag signal with sender info
        const enriched = {
          ...message,
          senderId: meta.userId,
          senderName: meta.displayName,
          senderRole: meta.role
        };
        this.broadcastToRoom(actualRoomId, enriched, ws);
      } catch (err) {
        console.error('[WebSocket] Error processing message:', err.message);
      }
    });

    ws.on('close', () => {
      const subs = this.roomSubscribers.get(actualRoomId);
      if (!subs) return;

      subs.delete(ws);
      console.log(`[WebSocket] ${meta.displayName} disconnected from room ${actualRoomId}. Subscribers: ${subs.size}`);

      // Notify others of leave
      this.broadcastToRoom(actualRoomId, {
        __signal: true,
        type: 'participant-left',
        userId: meta.userId,
        displayName: meta.displayName,
        role: meta.role
      });

      if (subs.size === 0) {
        this.roomSubscribers.delete(actualRoomId);
      }
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Connection error:', err.message);
    });
  }

  handleTrainerCommand(roomId, message, senderWs, senderMeta) {
    switch (message.type) {
      case 'mute-all': {
        this.broadcastToRoom(roomId, {
          __signal: true,
          type: 'mute-all',
          trainerId: senderMeta.userId,
          trainerName: senderMeta.displayName
        }, senderWs);
        break;
      }

      case 'force-mute': {
        if (!message.targetUserId) return;
        this.sendToUser(roomId, message.targetUserId, {
          __signal: true,
          type: 'force-mute',
          trainerId: senderMeta.userId,
          trainerName: senderMeta.displayName
        });
        break;
      }

      case 'kick': {
        if (!message.targetUserId) return;
        this.disconnectUser(roomId, message.targetUserId, message.reason || 'Removed by trainer');
        // Notify others
        this.broadcastToRoom(roomId, {
          __signal: true,
          type: 'participant-kicked',
          userId: message.targetUserId,
          trainerId: senderMeta.userId
        });
        break;
      }

      case 'spotlight': {
        if (!message.targetUserId) return;
        this.broadcastToRoom(roomId, {
          __signal: true,
          type: 'spotlight',
          targetUserId: message.targetUserId,
          trainerId: senderMeta.userId
        });
        break;
      }

      case 'clear-spotlight': {
        this.broadcastToRoom(roomId, {
          __signal: true,
          type: 'clear-spotlight',
          trainerId: senderMeta.userId
        });
        break;
      }

      case 'dismiss-hand': {
        if (!message.targetUserId) return;
        this.sendToUser(roomId, message.targetUserId, {
          __signal: true,
          type: 'dismiss-hand',
          trainerId: senderMeta.userId,
          trainerName: senderMeta.displayName
        });
        break;
      }

      case 'end-class': {
        this.broadcastToRoom(roomId, {
          __signal: true,
          type: 'end-class',
          trainerId: senderMeta.userId,
          trainerName: senderMeta.displayName
        });
        break;
      }
    }
  }
}
