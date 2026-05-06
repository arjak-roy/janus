import { ROOM_CLEANUP_INTERVAL_MS } from '../config/constants.js';

export function startRoomCleanupJob(cleanupService) {
  return setInterval(() => {
    cleanupService.cleanupEmptyRooms();
  }, ROOM_CLEANUP_INTERVAL_MS);
}
