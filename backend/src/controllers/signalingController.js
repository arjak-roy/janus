export class SignalingController {
  constructor(signalingService) {
    this.signalingService = signalingService;
  }

  handleSocket = async (ws, req) => {
    try {
      const token = req.query?.token || null;
      await this.signalingService.connectRoomSocket(ws, req.params.roomId, token);
    } catch (err) {
      console.error('[WebSocket] Error in signaling endpoint:', err.message);
      ws.close(1011, 'Internal server error');
    }
  };
}
