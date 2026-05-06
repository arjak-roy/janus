export class RoomController {
  constructor(roomService) {
    this.roomService = roomService;
  }

  createRoom = async (req, res) => {
    try {
      const room = await this.roomService.createRoom(req.body);
      res.json({ success: true, room });
    } catch (error) {
      if (String(error.message || '').startsWith('JANUS_CREATE_FAILED|')) {
        const reason = error.message.split('|')[1] || 'unknown';
        console.error(`[Backend] Janus room creation failed. ${reason}`);
        return res.status(502).json({ success: false, error: 'Failed to create room on media server' });
      }

      console.error('Create room error:', error);
      return res.status(500).json({ success: false, error: 'Failed to create room' });
    }
  };

  getRooms = async (req, res) => {
    try {
      const rooms = await this.roomService.getRooms();
      res.json({ success: true, rooms });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
    }
  };

  getRoomById = async (req, res) => {
    try {
      const room = await this.roomService.getRoomByIdentifier(req.params.id);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      return res.json({ success: true, room });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch room' });
    }
  };
}
