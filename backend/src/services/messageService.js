export class MessageService {
  constructor(roomRepository, messageRepository) {
    this.roomRepository = roomRepository;
    this.messageRepository = messageRepository;
  }

  async createMessage(roomIdentifier, payload) {
    const { sender, content } = payload;
    if (!sender || !content) {
      const error = new Error('sender and content are required');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const room = await this.roomRepository.findByIdOrJanusId(roomIdentifier);
    if (!room) {
      const error = new Error('Room not found');
      error.code = 'ROOM_NOT_FOUND';
      throw error;
    }

    return this.messageRepository.create({
      roomId: room.id,
      sender,
      content
    });
  }

  async getMessages(roomIdentifier, rawLimit) {
    const room = await this.roomRepository.findByIdOrJanusId(roomIdentifier);
    if (!room) {
      const error = new Error('Room not found');
      error.code = 'ROOM_NOT_FOUND';
      throw error;
    }

    const limit = Math.min(Number(rawLimit) || 100, 500);
    return this.messageRepository.findByRoomId(room.id, limit);
  }
}
