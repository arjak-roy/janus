export class RoomService {
  constructor(roomRepository, janusApiService) {
    this.roomRepository = roomRepository;
    this.janusApiService = janusApiService;
  }

  async createRoom(payload) {
    const { name, isPrivate, maxUsers } = payload;
    const janusId = Math.floor(1000 + Math.random() * 99000);
    const roomConfig = {
      name: name || `Room ${janusId}`,
      isPrivate: isPrivate || false,
      maxUsers: maxUsers || 6
    };

    const [videoResult, textResult] = await Promise.all([
      this.janusApiService.createJanusRoom('janus.plugin.videoroom', janusId, roomConfig),
      this.janusApiService.createJanusRoom('janus.plugin.textroom', janusId, roomConfig)
    ]);

    if (videoResult?.error || textResult?.error) {
      const reason = `Video: ${videoResult?.error}, Text: ${textResult?.error}`;
      throw new Error(`JANUS_CREATE_FAILED|${reason}`);
    }

    const room = await this.roomRepository.create({
      janusId,
      name: roomConfig.name,
      isPrivate: roomConfig.isPrivate,
      maxUsers: roomConfig.maxUsers
    });

    return room;
  }

  getRooms() {
    return this.roomRepository.findManyWithMessageCount();
  }

  getRoomByIdentifier(identifier) {
    return this.roomRepository.findByIdOrJanusId(identifier);
  }
}
