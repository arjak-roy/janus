export class MessageController {
  constructor(messageService) {
    this.messageService = messageService;
  }

  createMessage = async (req, res) => {
    try {
      const message = await this.messageService.createMessage(req.params.roomId, req.body);
      res.json({ success: true, message });
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') {
        return res.status(400).json({ success: false, error: error.message });
      }
      if (error.code === 'ROOM_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }

      console.error('Create message error:', error);
      return res.status(500).json({ success: false, error: 'Failed to save message' });
    }
  };

  getMessages = async (req, res) => {
    try {
      const messages = await this.messageService.getMessages(req.params.roomId, req.query.limit);
      res.json({ success: true, messages });
    } catch (error) {
      if (error.code === 'ROOM_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      return res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
  };
}
