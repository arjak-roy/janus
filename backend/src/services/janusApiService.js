import { JANUS_API_SECRET, JANUS_HTTP } from '../config/constants.js';

export class JanusApiService {
  async janusRequest(sessionId, handleId, body) {
    const url = sessionId
      ? handleId
        ? `${JANUS_HTTP}/${sessionId}/${handleId}`
        : `${JANUS_HTTP}/${sessionId}`
      : JANUS_HTTP;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(JANUS_API_SECRET ? { ...body, apisecret: JANUS_API_SECRET } : body)
    });
    return res.json();
  }

  async janusLongPoll(sessionId) {
    const url = `${JANUS_HTTP}/${sessionId}?maxev=1`;
    const res = await fetch(url, { method: 'GET' });
    return res.json();
  }

  async createJanusRoom(plugin, roomId, roomConfig) {
    try {
      const sessResp = await this.janusRequest(null, null, {
        janus: 'create',
        transaction: `txn-${Date.now()}`
      });
      const sessionId = sessResp?.data?.id;
      if (!sessionId) throw new Error('Failed to create Janus session');

      const attachResp = await this.janusRequest(sessionId, null, {
        janus: 'attach',
        plugin,
        transaction: `txn-${Date.now()}`
      });
      const handleId = attachResp?.data?.id;
      if (!handleId) throw new Error(`Failed to attach ${plugin}`);

      let message;
      if (plugin === 'janus.plugin.videoroom') {
        message = {
          request: 'create',
          room: roomId,
          description: roomConfig.name || `Room ${roomId}`,
          publishers: roomConfig.maxUsers || 6,
          bitrate: 512000,
          fir_freq: 10,
          audiocodec: 'opus',
          videocodec: 'vp8',
          is_private: roomConfig.isPrivate || false
        };
      } else if (plugin === 'janus.plugin.textroom') {
        message = {
          request: 'create',
          room: roomId,
          description: roomConfig.name || `Chat ${roomId}`,
          is_private: roomConfig.isPrivate || false,
          history: 100
        };
      }

      const createResp = await this.janusRequest(sessionId, handleId, {
        janus: 'message',
        body: message,
        transaction: `txn-${Date.now()}`
      });

      const pollResp = await this.janusLongPoll(sessionId);

      await this.janusRequest(sessionId, handleId, {
        janus: 'detach',
        transaction: `txn-${Date.now()}`
      });
      await this.janusRequest(sessionId, null, {
        janus: 'destroy',
        transaction: `txn-${Date.now()}`
      });

      return pollResp?.plugindata?.data || createResp?.plugindata?.data;
    } catch (err) {
      console.error(`[Janus] Failed to create room in ${plugin}:`, err.message);
      return { error: err.message };
    }
  }

  async destroyJanusRoom(plugin, roomId) {
    try {
      const sessResp = await this.janusRequest(null, null, {
        janus: 'create',
        transaction: `txn-${Date.now()}`
      });
      const sessionId = sessResp?.data?.id;
      if (!sessionId) return;

      const attachResp = await this.janusRequest(sessionId, null, {
        janus: 'attach',
        plugin,
        transaction: `txn-${Date.now()}`
      });
      const handleId = attachResp?.data?.id;
      if (!handleId) return;

      await this.janusRequest(sessionId, handleId, {
        janus: 'message',
        body: { request: 'destroy', room: roomId },
        transaction: `txn-${Date.now()}`
      });
      await this.janusLongPoll(sessionId);

      await this.janusRequest(sessionId, handleId, {
        janus: 'detach',
        transaction: `txn-${Date.now()}`
      });
      await this.janusRequest(sessionId, null, {
        janus: 'destroy',
        transaction: `txn-${Date.now()}`
      });
      console.log(`[Janus] Destroyed ${plugin} room ${roomId}`);
    } catch (err) {
      console.error(`[Janus] Failed to destroy room ${roomId} in ${plugin}:`, err.message);
    }
  }

  async listParticipants(roomId) {
    const sessResp = await this.janusRequest(null, null, {
      janus: 'create',
      transaction: `txn-${Date.now()}`
    });
    const sessionId = sessResp?.data?.id;
    if (!sessionId) {
      return [];
    }

    const attachResp = await this.janusRequest(sessionId, null, {
      janus: 'attach',
      plugin: 'janus.plugin.videoroom',
      transaction: `txn-${Date.now()}`
    });
    const handleId = attachResp?.data?.id;
    if (!handleId) {
      return [];
    }

    await this.janusRequest(sessionId, handleId, {
      janus: 'message',
      body: { request: 'listparticipants', room: roomId },
      transaction: `txn-${Date.now()}`
    });

    const pollResp = await this.janusLongPoll(sessionId);
    const participants = pollResp?.plugindata?.data?.participants || [];

    await this.janusRequest(sessionId, handleId, {
      janus: 'detach',
      transaction: `txn-${Date.now()}`
    });
    await this.janusRequest(sessionId, null, {
      janus: 'destroy',
      transaction: `txn-${Date.now()}`
    });

    return participants;
  }
}
