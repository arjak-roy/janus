export class RoomService {
  constructor(roomRepository, janusApiService) {
    this.roomRepository = roomRepository;
    this.janusApiService = janusApiService;
  }

  async createRoom(payload) {
    const { name, title, isPrivate, maxUsers, isLiveClass, creatorId, creatorName } = payload || {};
    const janusId = Math.floor(1000 + Math.random() * 99000);
    const roomConfig = {
      name: name || title || `Room ${janusId}`,
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
      title: title || null,
      isPrivate: roomConfig.isPrivate,
      isLiveClass: isLiveClass || false,
      maxUsers: roomConfig.maxUsers,
      creatorId: creatorId || null,
      creatorName: creatorName || null
    });

    return room;
  }

  async destroyRoom(identifier) {
    const room = await this.roomRepository.findByIdOrJanusId(identifier);
    if (!room) return null;

    // Destroy in Janus (best-effort)
    await Promise.allSettled([
      this.janusApiService.destroyJanusRoom('janus.plugin.videoroom', room.janusId),
      this.janusApiService.destroyJanusRoom('janus.plugin.textroom', room.janusId)
    ]);

    await this.roomRepository.deleteById(room.id);
    return room;
  }

  getRooms() {
    return this.roomRepository.findManyWithMessageCount();
  }

  getRoomByIdentifier(identifier) {
    return this.roomRepository.findByIdOrJanusId(identifier);
  }
}
