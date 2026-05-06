import { ROOM_MAX_IDLE_AGE_MS } from '../config/constants.js';

export class CleanupService {
  constructor(roomRepository, janusApiService) {
    this.roomRepository = roomRepository;
    this.janusApiService = janusApiService;
  }

  async cleanupEmptyRooms() {
    try {
      const rooms = await this.roomRepository.findAll();

      for (const room of rooms) {
        try {
          const participants = await this.janusApiService.listParticipants(room.janusId);
          const ageMs = Date.now() - new Date(room.createdAt).getTime();

          if (participants.length === 0 && ageMs > ROOM_MAX_IDLE_AGE_MS) {
            await Promise.all([
              this.janusApiService.destroyJanusRoom('janus.plugin.videoroom', room.janusId),
              this.janusApiService.destroyJanusRoom('janus.plugin.textroom', room.janusId)
            ]);
            await this.roomRepository.deleteById(room.id);
            console.log(`[Cleanup] Removed empty room ${room.janusId} (${room.name})`);
          }
        } catch (err) {
          console.error(`[Cleanup] Error checking room ${room.janusId}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Cleanup] Room cleanup failed:', err.message);
    }
  }
}
