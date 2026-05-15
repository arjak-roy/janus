/**
 * JanusService — wraps the janus-gateway JS SDK into a clean API
 * for our React components. Handles:
 *   - Session lifecycle
 *   - VideoRoom plugin (publish/subscribe, screen share)
 *   - TextRoom plugin (real-time chat via data channels)
 *
 * NOTE: Janus is loaded via <script> tag in index.html (not via npm import)
 * because the janus-gateway npm package is incompatible with Vite's ESM bundler.
 * We access it as window.Janus.
 */
import adapter from 'webrtc-adapter';

// Connect to Janus via the nginx reverse proxy (/janus-ws)
// This avoids cross-origin issues and works on Windows/WSL2
const JANUS_WS = import.meta.env.VITE_JANUS_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:${window.location.port}/janus-ws`;

const IPV4_HOSTNAME_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function resolveIceServers() {
  const fromEnv = import.meta.env.VITE_ICE_SERVERS_JSON;
  if (fromEnv) {
    try {
      const parsed = JSON.parse(fromEnv);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (err) {
      console.warn('[JanusService] Invalid VITE_ICE_SERVERS_JSON. Falling back to defaults.', err);
    }
  }

  // Prefer direct LAN paths first; add TURN only when explicitly configured.
  const fallback = [{ urls: 'stun:stun.l.google.com:19302' }];
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;
  if (turnUrl && turnUsername && turnCredential) {
    fallback.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential
    });
  }
  return fallback;
}

function getJanus() {
  const J = window.Janus;
  if (!J) {
    throw new Error(
      'Janus library not loaded. Ensure janus.js is included via <script> tag in index.html.'
    );
  }
  return J;
}

function resolveMediaAccessError(err, opts = { audio: true, video: true }) {
  const featurePolicy = document.permissionsPolicy || document.featurePolicy;
  const hasPolicyCheck = typeof featurePolicy?.allowsFeature === 'function';
  const cameraAllowed = !opts.video || !hasPolicyCheck || featurePolicy.allowsFeature('camera');
  const microphoneAllowed = !opts.audio || !hasPolicyCheck || featurePolicy.allowsFeature('microphone');
  const runsInIframe = window.top !== window.self;
  const usesHttpsIpOrigin =
    window.location.protocol === 'https:' && IPV4_HOSTNAME_RE.test(window.location.hostname);

  if (!window.isSecureContext) {
    if (usesHttpsIpOrigin) {
      return 'Camera access requires a trusted HTTPS hostname. This meeting is loaded from an HTTPS IP address, and browsers often block camera/microphone until that origin uses a trusted TLS certificate on a real hostname. Use a trusted hostname or localhost for development.';
    }

    return 'Camera access requires a secure context. Open the meeting from trusted HTTPS or localhost.';
  }

  if (runsInIframe && (!cameraAllowed || !microphoneAllowed)) {
    const blockedFeatures = [
      opts.video && !cameraAllowed ? 'camera' : null,
      opts.audio && !microphoneAllowed ? 'microphone' : null
    ].filter(Boolean);

    if (blockedFeatures.length > 0) {
      return `The embedding page is blocking ${blockedFeatures.join(' and ')} access for this meeting iframe. Allow those features on the parent page response and on the iframe allow attribute.`;
    }
  }

  const errorMap = {
    NotAllowedError: 'Camera/microphone permission denied. Please allow access in your browser settings.',
    NotFoundError: 'No camera or microphone found on this device.',
    NotReadableError: 'Camera or microphone is already in use by another application.',
    OverconstrainedError: 'Camera does not support the requested resolution.',
    AbortError: 'Camera access was aborted.',
    SecurityError: 'Camera access requires a secure context. Open the meeting from trusted HTTPS or localhost.'
  };

  return errorMap[err?.name] || `Camera error: ${err?.message || 'Unknown error'}`;
}

function shouldRetryAudioOnly(err) {
  return err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError';
}

function buildTrackCapture(enabled, deviceId) {
  if (!enabled) return false;
  if (!deviceId) return true;
  return { deviceId: { exact: deviceId } };
}

function buildMediaConstraints(opts) {
  return {
    audio: buildTrackCapture(opts.audio, opts.audioDeviceId),
    video: buildTrackCapture(opts.video, opts.videoDeviceId)
  };
}

function buildPublisherTracks(opts) {
  return [
    { type: 'audio', capture: buildTrackCapture(opts.audio, opts.audioDeviceId) },
    { type: 'video', capture: buildTrackCapture(opts.video, opts.videoDeviceId), simulcast: !!opts.video }
  ];
}

class JanusService {
  constructor() {
    this.janus = null;
    this.videoRoomHandle = null;
    this.textRoomHandle = null;
    this.screenShareHandle = null;

    this.myId = null;
    this.myPrivateId = null;
    this.myStream = null;
    this.screenStream = null;

    // Callbacks the React layer can register
    this.onLocalStream = null;
    this.onRemoteStream = null;
    this.onRemoteGone = null;
    this.onChatMessage = null;
    this.onSignal = null;  // For custom signaling (hand raise, whiteboard sync, etc.)
    this.onError = null;

    this._feeds = {};       // publisherId -> { rfid, stream }
    this._initialized = false;
    this._textRoomReady = false;
    this.initialPublishOptions = { audio: true, video: true };

    // WebSocket for signaling (hand-raise, whiteboard)
    this.signalWs = null;
    this._signalWsReady = false;
    this._currentRoomId = null;
  }

  // ── Initialise the Janus library (once) ─────────────────
  initLibrary() {
    return new Promise((resolve, reject) => {
      if (this._initialized) return resolve();

      const Janus = getJanus();

      Janus.init({
        debug: 'all',
        dependencies: Janus.useDefaultDependencies({ adapter }),
        callback: () => {
          this._initialized = true;
          console.log('[JanusService] Library initialised successfully');
          resolve();
        }
      });
    });
  }

  // ── Create a Janus session ──────────────────────────────
  connect() {
    const Janus = getJanus();
    return new Promise((resolve, reject) => {
      this.janus = new Janus({
        server: JANUS_WS,
        iceServers: resolveIceServers(),
        success: () => {
          console.log('[JanusService] Connected to Janus gateway');
          resolve();
        },
        error: (err) => {
          console.error('[JanusService] Connection error:', err);
          this.onError?.(err);
          reject(err);
        },
        destroyed: () => console.log('[JanusService] Session destroyed')
      });
    });
  }

  // ── VideoRoom: join as publisher ────────────────────────
  joinRoom(roomId, displayName = 'User') {
    return new Promise((resolve, reject) => {
      this.janus.attach({
        plugin: 'janus.plugin.videoroom',
        success: (handle) => {
          this.videoRoomHandle = handle;

          handle.send({
            message: {
              request: 'join',
              room: Number(roomId),
              ptype: 'publisher',
              display: displayName
            }
          });

          resolve(handle);
        },
        error: (err) => {
          console.error('[JanusService] VideoRoom attach error:', err);
          reject(err);
        },
        iceState: (state) => {
          console.log('[JanusService] Publisher ICE state:', state);
          if (state === 'disconnected') {
            // ICE disconnected — start a grace period for recovery
            this._iceDisconnectTimer = window.setTimeout(() => {
              console.warn('[JanusService] ICE still disconnected, attempting ICE restart');
              if (this.videoRoomHandle) {
                this.videoRoomHandle.createOffer({
                  iceRestart: true,
                  tracks: buildPublisherTracks(this.initialPublishOptions),
                  success: (jsep) => {
                    this.videoRoomHandle.send({
                      message: { request: 'configure', restart: true },
                      jsep
                    });
                  },
                  error: (err) => console.error('[JanusService] ICE restart offer error:', err)
                });
              }
            }, 3000);
          } else if (state === 'connected' || state === 'completed') {
            if (this._iceDisconnectTimer) {
              window.clearTimeout(this._iceDisconnectTimer);
              this._iceDisconnectTimer = null;
            }
          } else if (state === 'failed') {
            if (this._iceDisconnectTimer) {
              window.clearTimeout(this._iceDisconnectTimer);
              this._iceDisconnectTimer = null;
            }
            console.error('[JanusService] Publisher ICE failed, attempting immediate restart');
            if (this.videoRoomHandle) {
              this.videoRoomHandle.createOffer({
                iceRestart: true,
                tracks: buildPublisherTracks(this.initialPublishOptions),
                success: (jsep) => {
                  this.videoRoomHandle.send({
                    message: { request: 'configure', restart: true },
                    jsep
                  });
                },
                error: (err) => console.error('[JanusService] ICE restart offer error:', err)
              });
            }
          }
        },
        webrtcState: (isConnected) => {
          console.log('[JanusService] Publisher WebRTC state:', isConnected ? 'up' : 'down');
        },
        slowLink: (uplink, lost) => {
          console.warn(`[JanusService] Publisher slow link: uplink=${uplink}, lost=${lost}`);
        },
        onmessage: (msg, jsep) => this._onVideoRoomMessage(msg, jsep),
        onlocaltrack: (track, on) => {
          console.log('[JanusService] Local track', track.kind, on ? 'added' : 'removed');
          if (on) {
            if (!this.myStream) this.myStream = new MediaStream();
            // Replace existing track of the same kind (handles renegotiation)
            const existing = this.myStream.getTracks().find(t => t.kind === track.kind);
            if (existing && existing.id !== track.id) {
              this.myStream.removeTrack(existing);
            }
            if (!this.myStream.getTracks().find(t => t.id === track.id)) {
              this.myStream.addTrack(track);
            }
          } else if (this.myStream) {
            // During renegotiation, only remove if no replacement of same kind was already added
            const sameKind = this.myStream.getTracks().filter(t => t.kind === track.kind);
            if (sameKind.length > 1) {
              // A newer track of same kind exists, safe to remove the old one
              this.myStream.removeTrack(track);
            } else if (sameKind.length === 1 && sameKind[0].id === track.id) {
              // Delay removal briefly — a replacement track may arrive immediately after
              setTimeout(() => {
                if (this.myStream && !this.myStream.getTracks().find(t => t.kind === track.kind && t.id !== track.id)) {
                  this.myStream.removeTrack(track);
                  this.onLocalStream?.(this.myStream);
                }
              }, 200);
              return; // Don't notify yet
            }
          }
          // Always call callback so React knows there's an update
          if (this.myStream) this.onLocalStream?.(this.myStream);
        },
        oncleanup: () => {
          this.myStream = null;
        }
      });
    });
  }

  // ── Publish own camera+mic feed ─────────────────────────
  async publishOwnFeed(opts = { audio: true, video: true }) {
    if (!opts.audio && !opts.video) {
      this.videoRoomHandle.createOffer({
        tracks: [
          { type: 'audio', capture: false },
          { type: 'video', capture: false }
        ],
        success: (jsep) => {
          this.videoRoomHandle.send({
            message: { request: 'configure', audio: false, video: false },
            jsep
          });
        },
        error: (err) => {
          console.error('[JanusService] Publish offer error:', err);
          this.onError?.(err);
        }
      });
      return;
    }

    // First, verify we can actually access the camera/mic
    try {
      const testStream = await navigator.mediaDevices.getUserMedia(buildMediaConstraints(opts));
      // Stop the test tracks immediately — Janus will request its own
      testStream.getTracks().forEach(t => t.stop());
      console.log('[JanusService] getUserMedia test passed');
    } catch (err) {
      const friendlyMsg = resolveMediaAccessError(err, opts);
      console.error(`[JanusService] getUserMedia failed (${err?.name || 'UnknownError'}):`, err?.message || err);
      this.onError?.(friendlyMsg);

      // Only retry audio-only when the camera constraints/device are the issue.
      if (opts.video && shouldRetryAudioOnly(err)) {
        console.warn('[JanusService] Falling back to audio-only...');
        return this.publishOwnFeed({
          ...opts,
          video: false,
          videoDeviceId: undefined
        });
      }
      return;
    }

    this.videoRoomHandle.createOffer({
      tracks: buildPublisherTracks(opts),
      success: (jsep) => {
        this.videoRoomHandle.send({
          message: { request: 'configure', audio: opts.audio, video: opts.video },
          jsep
        });
      },
      error: (err) => {
        console.error('[JanusService] Publish offer error:', err);
        this.onError?.(err);
      }
    });
  }

  // ── Screen Share (second publisher handle) ──────────────
  startScreenShare(roomId, displayName = 'Screen') {
    return new Promise((resolve, reject) => {
      let publishSent = false;

      const doPublish = (handle) => {
        if (publishSent) return;
        publishSent = true;

        handle.createOffer({
          tracks: [
            { type: 'screen', capture: true },
            { type: 'audio', capture: false }
          ],
          success: (jsep) => {
            handle.send({
              message: { request: 'configure', video: true, audio: false },
              jsep
            });
            resolve(handle);
          },
          error: (err) => {
            console.error('[JanusService] Screen share offer error:', err);
            reject(err);
          }
        });
      };

      this.janus.attach({
        plugin: 'janus.plugin.videoroom',
        success: (handle) => {
          this.screenShareHandle = handle;
          handle.send({
            message: {
              request: 'join',
              room: Number(roomId),
              ptype: 'publisher',
              display: `${displayName} (screen)`
            }
          });
        },
        onmessage: (msg, jsep) => {
          // Wait for the 'joined' event before publishing
          if (msg.videoroom === 'joined' && this.screenShareHandle) {
            doPublish(this.screenShareHandle);
          }
          // Handle answer from Janus
          if (jsep && this.screenShareHandle) {
            this.screenShareHandle.handleRemoteJsep({ jsep });
          }
        },
        onlocaltrack: (track, on) => {
          if (on) {
            if (!this.screenStream) this.screenStream = new MediaStream();
            if (!this.screenStream.getTracks().find(t => t.id === track.id)) {
              this.screenStream.addTrack(track);
              if (track.kind === 'video') {
                track.onended = () => this.stopScreenShare();
              }
            }
          } else if (this.screenStream) {
            this.screenStream.removeTrack(track);
          }
        },
        error: (err) => reject(err)
      });
    });
  }

  stopScreenShare() {
    if (this.screenShareHandle) {
      this.screenShareHandle.send({ message: { request: 'unpublish' } });
      this.screenShareHandle.detach();
      this.screenShareHandle = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
  }

  // ── WebSocket Signaling (hand-raise, whiteboard) ────────
  connectSignaling(roomId, token) {
    if (this._signalWsReady) {
      console.warn('[JanusService] Signaling already connected');
      return Promise.resolve();
    }

    this._currentRoomId = roomId;
    return new Promise((resolve, reject) => {
      let settled = false;
      let handshakeAcked = false;
      let handshakeTimeout = null;

      const clearHandshakeTimeout = () => {
        if (handshakeTimeout) {
          window.clearTimeout(handshakeTimeout);
          handshakeTimeout = null;
        }
      };

      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        clearHandshakeTimeout();
        this._signalWsReady = true;
        resolve();
      };

      const rejectOnce = (error) => {
        if (settled) return;
        settled = true;
        clearHandshakeTimeout();
        this._signalWsReady = false;
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
        const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port}/api/rooms/${roomId}/ws${tokenParam}`;
        
        this.signalWs = new WebSocket(wsUrl);

        this.signalWs.onopen = () => {
          console.log('[JanusService] Signaling WebSocket connected, waiting for ready handshake');
          handshakeTimeout = window.setTimeout(() => {
            rejectOnce(new Error('Session signaling handshake timed out. Please rejoin the meeting.'));
            if (this.signalWs?.readyState === WebSocket.OPEN) {
              this.signalWs.close(1000, 'Handshake timeout');
            }
          }, 5000);
        };

        this.signalWs.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.__signal && message.type === 'signaling-ready') {
              handshakeAcked = true;
              console.log('[JanusService] Signaling handshake acknowledged');
              resolveOnce();
              return;
            }
            if (message.__signal && message.type) {
              this.onSignal?.(message);
            }
          } catch (err) {
            console.error('[JanusService] Error parsing signal:', err);
          }
        };

        this.signalWs.onerror = (err) => {
          console.error('[JanusService] WebSocket error:', err);
          this.onError?.('Signaling connection error.');
          if (!handshakeAcked) {
            rejectOnce(new Error('Signaling connection failed before authentication completed.'));
          }
        };

        this.signalWs.onclose = (event) => {
          this._signalWsReady = false;
          const reason = event.reason ? ` (${event.reason})` : '';
          console.log(`[JanusService] Signaling WebSocket closed: ${event.code}${reason}`);

          if (!handshakeAcked) {
            if (event.code === 1008) {
              rejectOnce(new Error('Signaling authorization failed. Rejoin using a valid meeting link.'));
              return;
            }
            rejectOnce(new Error('Signaling connection closed before the session became ready.'));
          }
        };
      } catch (err) {
        rejectOnce(err);
      }
    });
  }

  sendSignalViaWebSocket(signal) {
    if (!this._signalWsReady || !this.signalWs) {
      console.warn('[JanusService] WebSocket not ready, cannot send signal:', signal.type);
      return false;
    }
    try {
      this.signalWs.send(JSON.stringify({
        __signal: true,
        ...signal
      }));
      return true;
    } catch (err) {
      console.error('[JanusService] Error sending signal:', err);
      return false;
    }
  }

  // ── Subscribe to a remote publisher ─────────────────────
  _subscribeToFeed(publisherId, display) {
    this.janus.attach({
      plugin: 'janus.plugin.videoroom',
      success: (handle) => {
        this._feeds[publisherId] = { handle, display, stream: null };
        handle.send({
          message: { request: 'join', room: this._currentRoom, ptype: 'subscriber', feed: publisherId }
        });
      },
      error: (err) => console.error('Subscribe attach error:', err),
      iceState: (state) => {
        console.log(`[JanusService] Subscriber ICE state (${display}):`, state);
        if (state === 'disconnected' || state === 'failed') {
          console.warn(`[JanusService] Subscriber ICE ${state} for ${display}, requesting keyframe`);
          const handle = this._feeds[publisherId]?.handle;
          if (handle) {
            handle.send({ message: { request: 'configure', restart: true } });
          }
        }
      },
      webrtcState: (isConnected) => {
        console.log(`[JanusService] Subscriber WebRTC state (${display}):`, isConnected ? 'up' : 'down');
      },
      slowLink: (uplink, lost) => {
        console.warn(`[JanusService] Subscriber slow link (${display}): uplink=${uplink}, lost=${lost}`);
      },
      onmessage: (msg, jsep) => {
        if (jsep) {
          const handle = this._feeds[publisherId]?.handle;
          handle?.createAnswer({
            jsep,
            // Explicitly receive all media — do not send anything
            media: { audioSend: false, videoSend: false },
            success: (answerJsep) => {
              handle.send({ message: { request: 'start' }, jsep: answerJsep });
            },
            error: (err) => {
              console.error(`[JanusService] Subscriber createAnswer error (${display}):`, err);
            }
          });
        }
      },
      onremotetrack: (track, mid, on) => {
        if (!this._feeds[publisherId]) return;
        if (on) {
          if (!this._feeds[publisherId].stream) {
            this._feeds[publisherId].stream = new MediaStream();
          }
          const stream = this._feeds[publisherId].stream;
          // Replace existing track of the same kind to handle renegotiation
          const existingTrack = stream.getTracks().find(t => t.kind === track.kind);
          if (existingTrack && existingTrack.id !== track.id) {
            stream.removeTrack(existingTrack);
          }
          if (!stream.getTracks().find(t => t.id === track.id)) {
            stream.addTrack(track);
          }
          this.onRemoteStream?.(publisherId, display, stream);
        } else if (this._feeds[publisherId].stream) {
          // Only remove if this exact track is still in the stream
          const stream = this._feeds[publisherId].stream;
          const trackInStream = stream.getTracks().find(t => t.id === track.id);
          if (trackInStream) {
            stream.removeTrack(trackInStream);
          }
          // Only notify gone if no tracks remain; otherwise it's a renegotiation
          if (stream.getTracks().length > 0) {
            this.onRemoteStream?.(publisherId, display, stream);
          }
        }
      },
      oncleanup: () => {
        this.onRemoteGone?.(publisherId);
        delete this._feeds[publisherId];
      }
    });
  }

  // ── Internal: process VideoRoom events ──────────────────
  _onVideoRoomMessage(msg, jsep) {
    const event = msg.videoroom;

    if (event === 'joined') {
      this.myId = msg.id;
      this.myPrivateId = msg.private_id;
      this._currentRoom = msg.room;

      // Publish our own feed now
      this.publishOwnFeed(this.initialPublishOptions);

      // Subscribe to existing publishers
      if (msg.publishers) {
        msg.publishers.forEach((pub) => {
          if (!this._feeds[pub.id]) {
            this._subscribeToFeed(pub.id, pub.display);
          }
        });
      }
    } else if (event === 'event') {
      // New publisher arrived
      if (msg.publishers) {
        msg.publishers.forEach((pub) => {
          if (!this._feeds[pub.id]) {
            this._subscribeToFeed(pub.id, pub.display);
          }
        });
      }
      // Publisher left
      if (msg.leaving) {
        const leaving = msg.leaving;
        if (this._feeds[leaving]) {
          this._feeds[leaving].handle.detach();
          this.onRemoteGone?.(leaving);
          delete this._feeds[leaving];
        }
      }
      if (msg.unpublished) {
        const unpub = msg.unpublished;
        if (unpub === 'ok') return; // our own unpublish ack
        if (this._feeds[unpub]) {
          this._feeds[unpub].handle.detach();
          this.onRemoteGone?.(unpub);
          delete this._feeds[unpub];
        }
      }
    }

    // Handle incoming JSEP (answer to our offer, or renegotiation offer)
    if (jsep) {
      this.videoRoomHandle.handleRemoteJsep({ jsep });
    }
  }

  // ── TextRoom (chat via data channels) ──────────────────
  joinTextRoom(roomId, displayName = 'User') {
    const Janus = getJanus();
    const username = `user-${Janus.randomString(8)}`;
    const setupTransaction = Janus.randomString(12);
    const joinTransaction = Janus.randomString(12);
    const numericRoomId = Number(roomId);
    this._textRoomReady = false;

    return new Promise((resolve, reject) => {
      let settled = false;
      let joinSent = false;
      const joinTimeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('TextRoom join timed out'));
        }
      }, 12000);

      const resolveReady = () => {
        if (settled) return;
        settled = true;
        clearTimeout(joinTimeout);
        this._textRoomReady = true;
        console.log('[JanusService] TextRoom joined successfully');
        resolve();
      };

      const rejectJoin = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(joinTimeout);
        this._textRoomReady = false;
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const sendJoinMessage = () => {
        if (joinSent || !this.textRoomHandle) return;
        joinSent = true;
        this.textRoomHandle.data({
          text: JSON.stringify({
            textroom: 'join',
            room: numericRoomId,
            username,
            display: displayName,
            transaction: joinTransaction
          })
        });
      };

      this.janus.attach({
        plugin: 'janus.plugin.textroom',
        success: (handle) => {
          this.textRoomHandle = handle;
          // TextRoom needs a data-channel only PeerConnection
          handle.createOffer({
            media: { audio: false, video: false, data: true },
            success: (jsep) => {
              handle.send({
                message: { request: 'setup' },
                jsep,
                transaction: setupTransaction
              });
            },
            error: (err) => rejectJoin(err)
          });
        },
        ondataopen: () => {
          console.log('[JanusService] TextRoom data channel open, joining room', roomId);
          sendJoinMessage();
        },
        ondata: (rawData) => {
          try {
            const data = JSON.parse(rawData);

            // Handle join success across Janus textroom variants
            if (data.textroom === 'joined') {
              if (!data.room || Number(data.room) === numericRoomId) {
                resolveReady();
              }
              return;
            }

            if (data.textroom === 'success') {
              // Some versions may report success with transaction instead of joined
              if (data.transaction === joinTransaction || Number(data.room) === numericRoomId) {
                resolveReady();
              }
              return;
            }

            // Handle errors from TextRoom plugin
            if (data.textroom === 'error') {
              console.error('[JanusService] TextRoom error:', data.error_code, data.error);
              if (!this._textRoomReady || data.transaction === joinTransaction) {
                rejectJoin(new Error(`TextRoom error: ${data.error}`));
              } else {
                this.onError?.(`Chat error: ${data.error}`);
              }
              return;
            }

            if (data.textroom === 'message') {
              // Parse inner text — it may be a signal or a plain chat message
              let innerPayload = null;
              try { innerPayload = JSON.parse(data.text); } catch (_) {}

              if (innerPayload && innerPayload.__signal && innerPayload.type) {
                // Custom signal message — route to onSignal
                this.onSignal?.(innerPayload);
              } else {
                // Regular chat message
                this.onChatMessage?.({
                  sender: data.display || data.from,
                  content: data.text,
                  timestamp: data.date || new Date().toISOString()
                });
              }
            }
          } catch (e) {
            // Not JSON — ignore
          }
        },
        onmessage: (msg, jsep) => {
          if (jsep) {
            this.textRoomHandle.handleRemoteJsep({ jsep });
          }

          // Some Janus flows report setup success here before ondataopen.
          if (msg?.textroom === 'success' && msg?.transaction === setupTransaction) {
            sendJoinMessage();
          }
        },
        error: (err) => rejectJoin(err)
      });
    });
  }

  sendChatMessage(roomId, text) {
    // Prefer WebSocket for real-time delivery + server persistence
    if (this.sendChatViaWebSocket(text)) {
      return;
    }

    // Fallback: TextRoom data channel
    const Janus = getJanus();
    if (!this.textRoomHandle || !this._textRoomReady) {
      console.warn('[JanusService] Neither WebSocket nor TextRoom ready, cannot send chat message');
      return;
    }
    this.textRoomHandle.data({
      text: JSON.stringify({
        textroom: 'message',
        room: Number(roomId),
        text,
        transaction: Janus.randomString(12)
      })
    });
  }

  sendChatViaWebSocket(content) {
    if (!this._signalWsReady || !this.signalWs) {
      return false;
    }
    try {
      this.signalWs.send(JSON.stringify({
        __signal: true,
        type: 'chat-message',
        content
      }));
      return true;
    } catch (err) {
      console.error('[JanusService] Error sending chat via WebSocket:', err);
      return false;
    }
  }

  // ── Signaling (hand raise, whiteboard, etc.) ───────────
  sendSignal(roomId, payload) {
    const Janus = getJanus();
    
    // Try WebSocket first (preferred method)
    if (this._signalWsReady && this.signalWs) {
      if (this.sendSignalViaWebSocket(payload)) {
        return { sent: true, transport: 'websocket' };
      }
    }

    // Fallback to TextRoom if available
    if (!this.textRoomHandle || !this._textRoomReady) {
      console.warn('[JanusService] Neither WebSocket nor TextRoom ready for signal:', payload.type);
      return { sent: false, transport: 'none' };
    }

    try {
      this.textRoomHandle.data({
        text: JSON.stringify({
          textroom: 'message',
          room: Number(roomId),
          text: JSON.stringify({ __signal: true, ...payload }),
          transaction: Janus.randomString(12)
        })
      });
      return { sent: true, transport: 'textroom' };
    } catch (err) {
      console.error('[JanusService] Error sending signal via TextRoom:', err);
      return { sent: false, transport: 'none' };
    }
  }

  // ── Media toggles ──────────────────────────────────────
  toggleAudio(muted) {
    if (!this.videoRoomHandle) return;
    if (muted) this.videoRoomHandle.muteAudio();
    else this.videoRoomHandle.unmuteAudio();
  }

  toggleVideo(disabled) {
    if (!this.videoRoomHandle) return;
    if (disabled) this.videoRoomHandle.muteVideo();
    else this.videoRoomHandle.unmuteVideo();
  }

  // ── Cleanup ────────────────────────────────────────────
  destroy() {
    // Clear any pending ICE restart timer
    if (this._iceDisconnectTimer) {
      window.clearTimeout(this._iceDisconnectTimer);
      this._iceDisconnectTimer = null;
    }

    // Close WebSocket signaling
    if (this.signalWs) {
      this.signalWs.close();
      this.signalWs = null;
    }
    this._signalWsReady = false;

    // Stop local camera/mic tracks to release the camera
    if (this.myStream) {
      this.myStream.getTracks().forEach((t) => t.stop());
      this.myStream = null;
    }

    // Stop screen share tracks locally
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    this.screenShareHandle = null;
    this._feeds = {};
    this.videoRoomHandle = null;
    this.textRoomHandle = null;
    this._textRoomReady = false;
    this.initialPublishOptions = { audio: true, video: true };

    // Let Janus.destroy() handle session teardown and all handle detaches
    // in one request — avoids "Couldn't find any session" race errors.
    this.janus?.destroy();
    this.janus = null;
  }
}

export const janusService = new JanusService();
export { resolveMediaAccessError };
