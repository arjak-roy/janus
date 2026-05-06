export class SignalingController {
  constructor(signalingService) {
    this.signalingService = signalingService;
  }

  handleSocket = async (ws, req) => {
    try {
      await this.signalingService.connectRoomSocket(ws, req.params.roomId);
    } catch (err) {
      console.error('[WebSocket] Error in signaling endpoint:', err.message);
      ws.close(1011, 'Internal server error');
    }
  };
}
