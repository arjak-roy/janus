import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { janusService } from '../janus/JanusService.js';
import WhiteboardSync from './WhiteboardSync.jsx';
import DOMPurify from 'dompurify';
import './Classroom.css';

// ── SVG Icon Components ──────────────────────────────────
const IconMic = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>);
const IconMicOff = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.48-.35 2.17"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>);
const IconCam = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>);
const IconCamOff = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>);
const IconScreenShare = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="12 8 8 12 10 12 10 14 14 14 14 12 16 12 12 8"/></svg>);
const IconWhiteboard = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>);
const IconLeave = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z"/><line x1="23" y1="1" x2="17" y2="7"/><line x1="17" y1="1" x2="23" y2="7"/></svg>);
const IconPeople = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IconChat = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>);
const IconSend = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>);
const IconClose = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const IconHandRaise = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a1 1 0 0 0-2 0"/><path d="M16 8V4a1 1 0 0 0-2 0v2"/><path d="M14 8V3a1 1 0 0 0-2 0v5"/><path d="M12 12V7a1 1 0 0 0-2 0v5"/><path d="M7 15a5 5 0 0 0 3.46 2.95"/><path d="M18 11a1 1 0 0 1 1 1v1a8 8 0 0 1-8 8h-1a8 8 0 0 1-6.83-3.83L2 16"/></svg>);
const IconPin = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24z"/></svg>);
const IconUnpin = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>);
const IconWarning = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);

function resolveBackendUrl() {
  const configured = (import.meta.env.VITE_BACKEND_URL || '').trim();
  if (!configured) return '';
  const isLocalPage = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  if (!isLocalPage && /localhost|127\.0\.0\.1/.test(configured)) {
    console.warn('[Classroom] Ignoring localhost backend URL for LAN client; falling back to same-origin /api.');
    return '';
  }
  return configured;
}

const BACKEND_URL = resolveBackendUrl();

export default function Classroom() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Media state
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [joining, setJoining] = useState(true);
  const [localStreamReady, setLocalStreamReady] = useState(false);
  const [error, setError] = useState(null);

  // UI State
  const [activeSidebar, setActiveSidebar] = useState(null); // 'chat' | 'people' | null
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const seenMessageKeysRef = useRef(new Set());

  // Participants
  const [remoteFeeds, setRemoteFeeds] = useState({}); // id -> { display, stream }
  const [screenShareFeeds, setScreenShareFeeds] = useState({}); // id -> { display, stream }
  const [uiNotice, setUiNotice] = useState(null); // { type: 'error'|'info', text }
  const localVideoRef = useRef(null);
  const displayName = useRef(`User-${Math.floor(Math.random() * 9000 + 1000)}`);

  // Hand raise
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState({}); // { [display]: true }

  // Pin/Focus mode
  const [pinnedFeed, setPinnedFeed] = useState(null); // { type: 'local'|'remote'|'screen', pubId?, display?, stream? }

  // Whiteboard signal routing
  const whiteboardSignalHandler = useRef(null);

  const appendUniqueMessages = useCallback((incomingMessages) => {
    if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) return;

    setMessages((prev) => {
      const next = [...prev];

      for (const raw of incomingMessages) {
        const sender = raw.sender || 'Unknown';
        const content = raw.content || '';
        const timestamp = raw.timestamp || raw.createdAt || new Date().toISOString();
        const key = raw.id ? `id:${raw.id}` : `raw:${sender}|${content}|${timestamp}`;

        if (seenMessageKeysRef.current.has(key)) continue;
        seenMessageKeysRef.current.add(key);

        next.push({
          id: raw.id,
          sender,
          content,
          timestamp,
          self: sender === displayName.current
        });
      }

      return next;
    });
  }, []);

  // Update clock
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Connect to Janus on mount ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    seenMessageKeysRef.current.clear();
    setMessages([]);

    async function init() {
      try {
        // Pre-check: verify room exists via backend
        const checkRes = await fetch(`${BACKEND_URL}/api/rooms/${roomId}`);
        if (!checkRes.ok) {
          const data = await checkRes.json().catch(() => ({}));
          throw new Error(data.error || 'Room not found. Check the room ID and try again.');
        }

        await janusService.initLibrary();
        await janusService.connect();

        // Wire up callbacks
        janusService.onLocalStream = (stream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            setLocalStreamReady(true);
          }
        };

        janusService.onRemoteStream = (pubId, display, stream) => {
          if (!cancelled) {
            // Detect screen share feeds by display name convention
            if (display && display.endsWith('(screen)')) {
              setScreenShareFeeds((prev) => ({ ...prev, [pubId]: { display, stream } }));
            } else {
              setRemoteFeeds((prev) => ({ ...prev, [pubId]: { display, stream } }));
            }
          }
        };

        janusService.onRemoteGone = (pubId) => {
          if (!cancelled) {
            setRemoteFeeds((prev) => {
              const copy = { ...prev };
              delete copy[pubId];
              return copy;
            });
            setScreenShareFeeds((prev) => {
              const copy = { ...prev };
              delete copy[pubId];
              return copy;
            });
          }
        };

        janusService.onChatMessage = (msg) => {
          if (!cancelled) {
            appendUniqueMessages([msg]);
            if (activeSidebar !== 'chat') {
              // optional: show a notification dot
            }
          }
        };

        janusService.onError = (err) => {
          console.error('Janus error:', err);
          if (!cancelled) {
            const msg = typeof err === 'string' ? err : (err?.message || 'An unknown error occurred');
            setError(msg);
          }
        };

        janusService.onSignal = (signal) => {
          if (cancelled) return;
          if (signal.type === 'hand-raise') {
            setRaisedHands((prev) => {
              if (signal.raised) return { ...prev, [signal.display]: true };
              const copy = { ...prev };
              delete copy[signal.display];
              return copy;
            });
          } else if (signal.type === 'wb-delta' || signal.type === 'wb-snapshot' || signal.type === 'wb-request-snapshot') {
            whiteboardSignalHandler.current?.(signal);
          }
        };

        // Join Video + Text rooms
        await janusService.joinRoom(roomId, displayName.current);
        
        // Connect WebSocket for realtime signaling (hand-raise, whiteboard)
        try {
          await janusService.connectSignaling(roomId);
        } catch (wsErr) {
          console.warn('[Classroom] WebSocket signaling connection failed:', wsErr);
          if (!cancelled) {
            setUiNotice({
              type: 'info',
              text: 'Realtime signaling unavailable. Some features may be limited.'
            });
            setTimeout(() => setUiNotice(null), 5000);
          }
        }

        try {
          await janusService.joinTextRoom(roomId, displayName.current);
        } catch (textErr) {
          console.warn('[Classroom] TextRoom unavailable, using backend chat fallback:', textErr);
          if (!cancelled) {
            setUiNotice({
              type: 'info',
              text: 'Realtime chat channel unavailable. Using message sync fallback.'
            });
            setTimeout(() => setUiNotice(null), 5000);
          }
        }

        if (!cancelled) {
          setConnected(true);
          setJoining(false);
        }
      } catch (err) {
        console.error('Failed to join classroom:', err);
        if (!cancelled) {
          const msg = typeof err === 'string' ? err : (err?.message || 'Failed to connect to video server');
          setError(msg);
          setJoining(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      janusService.destroy();
    };
  }, [roomId, appendUniqueMessages]);

  // Poll persisted chat messages as a reliable fallback across clients
  useEffect(() => {
    let cancelled = false;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/messages?limit=200`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.success || !Array.isArray(data.messages)) return;

        const normalized = data.messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          content: m.content,
          timestamp: m.createdAt
        }));
        appendUniqueMessages(normalized);
      } catch {
        // Silent fallback: realtime path may still be active.
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, appendUniqueMessages]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeSidebar === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSidebar]);

  // ── Handlers ────────────────────────────────────────────
  const handleToggleMic = useCallback(() => {
    const next = !micOn;
    setMicOn(next);
    janusService.toggleAudio(!next);
  }, [micOn]);

  const handleToggleCam = useCallback(() => {
    const next = !camOn;
    setCamOn(next);
    janusService.toggleVideo(!next);
  }, [camOn]);

  const handleScreenShare = useCallback(async () => {
    if (sharing) {
      janusService.stopScreenShare();
      setSharing(false);
    } else {
      try {
        await janusService.startScreenShare(roomId, displayName.current);
        setSharing(true);
        setShowWhiteboard(false); // Can't share and whiteboard in same view easily
      } catch (err) {
        console.error('Screen share failed:', err);
        setUiNotice({ type: 'error', text: 'Screen sharing failed. Please try again or check browser permissions.' });
        setTimeout(() => setUiNotice(null), 5000);
      }
    }
  }, [sharing, roomId]);

  const toggleWhiteboard = useCallback(() => {
    setShowWhiteboard((prev) => !prev);
    if (!showWhiteboard && sharing) {
      // stop sharing if switching to whiteboard
      janusService.stopScreenShare();
      setSharing(false);
    }
    // Opening whiteboard unpins
    if (!showWhiteboard) setPinnedFeed(null);
  }, [showWhiteboard, sharing]);

  const toggleSidebar = (sidebar) => {
    setActiveSidebar(activeSidebar === sidebar ? null : sidebar);
  };

  const handleSendChat = useCallback((e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const outgoing = chatInput.trim();
    janusService.sendChatMessage(roomId, outgoing);

    // Persist to backend
    fetch(`${BACKEND_URL}/api/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: displayName.current, content: outgoing })
    }).catch(() => {
      setUiNotice({ type: 'error', text: 'Message not saved to server.' });
      setTimeout(() => setUiNotice(null), 3000);
    });

    setChatInput('');
  }, [chatInput, roomId]);

  const handleLeave = useCallback(() => {
    // Auto-lower hand before leaving
    if (handRaised) {
      janusService.sendSignal(roomId, { type: 'hand-raise', raised: false, display: displayName.current });
    }
    janusService.destroy();
    navigate('/');
  }, [navigate, handRaised, roomId]);

  const handleToggleHand = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    janusService.sendSignal(roomId, { type: 'hand-raise', raised: next, display: displayName.current });
  }, [handRaised, roomId]);

  const handlePin = useCallback((feedInfo) => {
    setPinnedFeed((prev) => {
      // If same feed is already pinned, unpin
      if (prev && prev.pubId === feedInfo.pubId && prev.type === feedInfo.type) return null;
      return feedInfo;
    });
    // Pinning hides whiteboard
    setShowWhiteboard(false);
  }, []);

  const handleUnpin = useCallback(() => {
    setPinnedFeed(null);
  }, []);

  const handleSendSignal = useCallback((payload) => {
    janusService.sendSignal(roomId, payload);
  }, [roomId]);

  // Layout Logic
  const remoteEntries = Object.entries(remoteFeeds);
  const screenShareEntries = Object.entries(screenShareFeeds);
  const totalFeeds = 1 + remoteEntries.length; // 1 = local
  const hasPresentation = showWhiteboard || sharing || screenShareEntries.length > 0 || pinnedFeed !== null;
  const raisedHandCount = Object.keys(raisedHands).length + (handRaised ? 1 : 0);

  // Auto-clear pin if the pinned participant left
  useEffect(() => {
    if (pinnedFeed && pinnedFeed.type === 'remote' && pinnedFeed.pubId) {
      if (!remoteFeeds[pinnedFeed.pubId]) setPinnedFeed(null);
    }
    if (pinnedFeed && pinnedFeed.type === 'screen' && pinnedFeed.pubId) {
      if (!screenShareFeeds[pinnedFeed.pubId]) setPinnedFeed(null);
    }
  }, [remoteFeeds, screenShareFeeds, pinnedFeed]);

  const renderVideoGrid = () => {
    let gridClass = 'video-grid';
    if (hasPresentation) {
      gridClass += ' video-grid--presentation';
    } else {
      gridClass += ` video-grid--${Math.min(totalFeeds, 6)}`;
    }

    // Filter out pinned feed from grid
    const filteredRemote = remoteEntries.filter(([pubId]) =>
      !(pinnedFeed && pinnedFeed.type === 'remote' && pinnedFeed.pubId === pubId)
    );

    return (
      <div className={gridClass}>
        {/* Local feed */}
        {!(pinnedFeed && pinnedFeed.type === 'local') && (
          <div className="video-tile" id="local-video-tile">
            <video ref={localVideoRef} autoPlay playsInline muted />
            <div className="video-tile__info">
              <span className="video-tile__name">You</span>
              <div className="video-tile__status">
                {!micOn && <span className="status-icon"><IconMicOff /></span>}
              </div>
            </div>
            {handRaised && <div className="hand-raise-badge"><IconHandRaise /></div>}
            <button className="pin-button" onClick={() => handlePin({ type: 'local', pubId: 'local', display: 'You', stream: localVideoRef.current?.srcObject })} title="Pin"><IconPin /></button>
            {(!localStreamReady && !error) && <div className="video-tile__overlay"><div className="spinner" /></div>}
            {error && (
              <div className="video-tile__overlay video-tile__overlay--error">
                <span className="error-icon"><IconWarning /></span>
                <p className="error-text">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Remote feeds */}
        {filteredRemote.map(([pubId, { display, stream }]) => (
          <RemoteVideo
            key={pubId}
            pubId={pubId}
            display={display}
            stream={stream}
            handRaised={!!raisedHands[display]}
            onPin={() => handlePin({ type: 'remote', pubId, display, stream })}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="meet-classroom">
      
      {/* Toast notice */}
      {uiNotice && (
        <div className={`meet-notice meet-notice--${uiNotice.type}`}>
          {uiNotice.text}
          <button className="meet-notice__close" onClick={() => setUiNotice(null)}><IconClose /></button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="meet-main">
        {/* Stage (Whiteboard, Screen Share, or Pinned feed) */}
        {hasPresentation && (
          <div className="meet-presentation-stage">
            {showWhiteboard && (
              <WhiteboardSync
                roomId={roomId}
                sendSignal={handleSendSignal}
                signalBus={whiteboardSignalHandler}
              />
            )}
            {/* Pinned feed */}
            {pinnedFeed && !showWhiteboard && (
              <div className="pinned-video-container">
                <PinnedVideo feed={pinnedFeed} />
                <button className="unpin-button" onClick={handleUnpin} title="Unpin">
                  <IconUnpin /> <span>Unpin</span>
                </button>
              </div>
            )}
            {/* Remote screen shares (only if not pinned and no whiteboard) */}
            {!pinnedFeed && !showWhiteboard && screenShareEntries.map(([pubId, { display, stream }]) => (
              <div key={`screen-${pubId}`} className="pinned-video-container">
                <RemoteVideo pubId={pubId} display={display} stream={stream} handRaised={false} onPin={() => handlePin({ type: 'screen', pubId, display, stream })} />
              </div>
            ))}
          </div>
        )}

        {/* Videos Grid */}
        <div className={`meet-videos-container ${hasPresentation ? 'sidebar-mode' : ''}`}>
          {renderVideoGrid()}
        </div>

        {/* Right Sidebar */}
        {activeSidebar && (
          <div className="meet-sidebar glass-panel">
            <div className="meet-sidebar__header">
              <h3>{activeSidebar === 'chat' ? 'In-call messages' : 'People'}</h3>
              <button className="icon-button" onClick={() => setActiveSidebar(null)}><IconClose /></button>
            </div>

            {activeSidebar === 'chat' && (
              <div className="meet-chat">
                <div className="meet-chat__messages">
                  {messages.length === 0 && (
                    <div className="meet-chat__empty">
                      <p>Messages can only be seen by people in the call and are deleted when the call ends.</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`chat-message ${m.self ? 'chat-message--self' : ''}`}>
                      <div className="chat-message__header">
                        <span className="chat-message__sender">{m.self ? 'You' : m.sender}</span>
                        <span className="chat-message__time">
                          {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="chat-message__body">{DOMPurify.sanitize(m.content)}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form className="meet-chat__input" onSubmit={handleSendChat}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send a message to everyone"
                  />
                  <button type="submit" disabled={!chatInput.trim()} className="icon-button send-btn">
                    <IconSend />
                  </button>
                </form>
              </div>
            )}

            {activeSidebar === 'people' && (
              <div className="meet-people">
                <div className="people-list">
                  <div className="person-row">
                    <div className="person-avatar">Y</div>
                    <span className="person-name">{displayName.current} (You)</span>
                    <div className="person-controls">
                      {handRaised && <span className="person-hand"><IconHandRaise /></span>}
                      {!micOn && <span className="person-muted"><IconMicOff /></span>}
                    </div>
                  </div>
                  {remoteEntries.map(([pubId, { display }]) => (
                    <div className="person-row" key={pubId}>
                      <div className="person-avatar">{display?.charAt(0) || 'P'}</div>
                      <span className="person-name">{display || 'Participant'}</span>
                      <div className="person-controls">
                        {raisedHands[display] && <span className="person-hand"><IconHandRaise /></span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="meet-bottom-bar">
        <div className="meet-bottom-bar__left">
          <span className="time-display">{currentTime}</span>
          <span className="divider">|</span>
          <span className="room-id">{roomId}</span>
        </div>

        <div className="meet-bottom-bar__center">
          <button className={`meet-btn ${!micOn ? 'meet-btn--danger' : ''}`} onClick={handleToggleMic} title={micOn ? 'Turn off microphone' : 'Turn on microphone'}>
            <span className="meet-btn__icon">{micOn ? <IconMic /> : <IconMicOff />}</span>
          </button>
          <button className={`meet-btn ${!camOn ? 'meet-btn--danger' : ''}`} onClick={handleToggleCam} title={camOn ? 'Turn off camera' : 'Turn on camera'}>
            <span className="meet-btn__icon">{camOn ? <IconCam /> : <IconCamOff />}</span>
          </button>
          
          <button className={`meet-btn ${sharing ? 'meet-btn--active' : ''}`} onClick={handleScreenShare} title="Present now">
            <span className="meet-btn__icon"><IconScreenShare /></span>
          </button>
          
          <button className={`meet-btn ${showWhiteboard ? 'meet-btn--active' : ''}`} onClick={toggleWhiteboard} title="Whiteboard">
            <span className="meet-btn__icon"><IconWhiteboard /></span>
          </button>

          <button className={`meet-btn ${handRaised ? 'meet-btn--active' : ''}`} onClick={handleToggleHand} title={handRaised ? 'Lower hand' : 'Raise hand'}>
            <span className="meet-btn__icon"><IconHandRaise /></span>
          </button>

          <button className="meet-btn meet-btn--leave" onClick={handleLeave} title="Leave call">
            <span className="meet-btn__icon"><IconLeave /></span>
          </button>
        </div>

        <div className="meet-bottom-bar__right">
          <button className={`meet-btn meet-btn--small ${activeSidebar === 'people' ? 'meet-btn--active' : ''}`} onClick={() => toggleSidebar('people')} title="Show everyone">
            <span className="meet-btn__icon"><IconPeople /></span>
            {raisedHandCount > 0 && activeSidebar !== 'people' && <span className="notification-badge">{raisedHandCount}</span>}
          </button>
          <button className={`meet-btn meet-btn--small ${activeSidebar === 'chat' ? 'meet-btn--active' : ''}`} onClick={() => toggleSidebar('chat')} title="Chat with everyone">
            <span className="meet-btn__icon"><IconChat /></span>
            {messages.length > 0 && activeSidebar !== 'chat' && <span className="notification-dot" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Separate component for remote video to manage srcObject ──
function RemoteVideo({ pubId, display, stream, handRaised, onPin }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-tile" id={`remote-${pubId}`}>
      <video ref={videoRef} autoPlay playsInline />
      <div className="video-tile__info">
        <span className="video-tile__name">{display || 'Participant'}</span>
      </div>
      {handRaised && <div className="hand-raise-badge"><IconHandRaise /></div>}
      {onPin && <button className="pin-button" onClick={onPin} title="Pin"><IconPin /></button>}
    </div>
  );
}

// ── Pinned video (full-size in presentation stage) ──
function PinnedVideo({ feed }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && feed.stream) {
      videoRef.current.srcObject = feed.stream;
    }
  }, [feed.stream]);

  return (
    <div className="pinned-video">
      <video ref={videoRef} autoPlay playsInline muted={feed.type === 'local'} />
      <div className="pinned-video__info">
        <span className="pinned-video__name">{feed.display || 'Participant'}</span>
      </div>
    </div>
  );
}

