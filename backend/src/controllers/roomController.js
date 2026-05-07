export class RoomController {
  constructor(roomService, tokenService, signalingService) {
    this.roomService = roomService;
    this.tokenService = tokenService;
    this.signalingService = signalingService;
  }

  createRoom = async (req, res) => {
    try {
      // If API_SHARED_SECRET is configured, require it for room creation
      const apiSecret = req.headers['x-api-secret'];
      if (!this.tokenService.verifyApiSecret(apiSecret)) {
        return res.status(401).json({ success: false, error: 'Invalid API secret' });
      }

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

  destroyRoom = async (req, res) => {
    try {
      const apiSecret = req.headers['x-api-secret'];
      if (!this.tokenService.verifyApiSecret(apiSecret)) {
        return res.status(401).json({ success: false, error: 'Invalid API secret' });
      }

      const room = await this.roomService.destroyRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      return res.json({ success: true, destroyed: true });
    } catch (error) {
      console.error('Destroy room error:', error);
      return res.status(500).json({ success: false, error: 'Failed to destroy room' });
    }
  };

  /**
   * POST /api/rooms/:id/token
   * Body: { userId, displayName, role: 'trainer'|'candidate' }
   * Header: x-api-secret (required if configured)
   */
  generateToken = async (req, res) => {
    try {
      const apiSecret = req.headers['x-api-secret'];
      if (!this.tokenService.verifyApiSecret(apiSecret)) {
        return res.status(401).json({ success: false, error: 'Invalid API secret' });
      }

      const { userId, displayName, role } = req.body || {};
      if (!userId || !displayName || !role) {
        return res.status(400).json({ success: false, error: 'userId, displayName, and role are required' });
      }

      if (!['trainer', 'candidate'].includes(role)) {
        return res.status(400).json({ success: false, error: 'role must be trainer or candidate' });
      }

      const room = await this.roomService.getRoomByIdentifier(req.params.id);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }

      const token = this.tokenService.generateToken({
        userId,
        displayName,
        role,
        roomId: room.id
      });

      return res.json({
        success: true,
        token,
        room: {
          id: room.id,
          janusId: room.janusId,
          name: room.name,
          title: room.title
        }
      });
    } catch (error) {
      console.error('Generate token error:', error);
      return res.status(500).json({ success: false, error: 'Failed to generate token' });
    }
  };

  /**
   * GET /api/rooms/:id/participants
   */
  getParticipants = async (req, res) => {
    try {
      const room = await this.roomService.getRoomByIdentifier(req.params.id);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }

      const participants = this.signalingService.getParticipants(room.id);
      return res.json({ success: true, participants });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to get participants' });
    }
  };
}
