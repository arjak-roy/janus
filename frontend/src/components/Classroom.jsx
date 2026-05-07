import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { janusService } from '../janus/JanusService.js';
import WhiteboardSync from './WhiteboardSync.jsx';
import DOMPurify from 'dompurify';
import './Classroom.css';

// ── SVG Icons ────────────────────────────────────────────
const IconMic = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>);
const IconMicOff = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.48-.35 2.17"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>);
const IconCam = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>);
const IconCamOff = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>);
const IconScreenShare = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="12 8 8 12 10 12 10 14 14 14 14 12 16 12 12 8"/></svg>);
const IconWhiteboard = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>);
const IconLeave = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>);
const IconPeople = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IconChat = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>);
const IconSend = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>);
const IconClose = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const IconHandRaise = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a1 1 0 0 0-2 0"/><path d="M16 8V4a1 1 0 0 0-2 0v2"/><path d="M14 8V3a1 1 0 0 0-2 0v5"/><path d="M12 12V7a1 1 0 0 0-2 0v5"/><path d="M7 15a5 5 0 0 0 3.46 2.95"/><path d="M18 11a1 1 0 0 1 1 1v1a8 8 0 0 1-8 8h-1a8 8 0 0 1-6.83-3.83L2 16"/></svg>);
const IconPin = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24z"/></svg>);
const IconUnpin = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>);
const IconWarning = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);
const IconMuteAll = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.48-.35 2.17"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>);
const IconKick = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>);
const IconSpotlight = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>);

function resolveBackendUrl() {
  const configured = (import.meta.env.VITE_BACKEND_URL || '').trim();
  if (!configured) return '';
  const isLocalPage = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  if (!isLocalPage && /localhost|127\.0\.0\.1/.test(configured)) return '';
  return configured;
}

const BACKEND_URL = resolveBackendUrl();

function parseTokenPayload(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

export default function Classroom() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || null;
  const tokenPayload = parseTokenPayload(token);
  const displayName = useRef(tokenPayload?.displayName || `User-${Math.floor(Math.random() * 9000 + 1000)}`);
  const userRole = tokenPayload?.role || 'candidate';
  const isTrainer = userRole === 'trainer';

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [joining, setJoining] = useState(true);
  const [localStreamReady, setLocalStreamReady] = useState(false);
  const [error, setError] = useState(null);

  const [activeSidebar, setActiveSidebar] = useState(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [uiNotice, setUiNotice] = useState(null);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const seenMessageKeysRef = useRef(new Set());

  const [remoteFeeds, setRemoteFeeds] = useState({});
  const [screenShareFeeds, setScreenShareFeeds] = useState({});
  const localVideoRef = useRef(null);

  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState({});
  const [pinnedFeed, setPinnedFeed] = useState(null);
  const [spotlightUserId, setSpotlightUserId] = useState(null);

  const whiteboardSignalHandler = useRef(null);
  const [duration, setDuration] = useState(0);
  const startTimeRef = useRef(Date.now());

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
        next.push({ id: raw.id, sender, content, timestamp, self: sender === displayName.current });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const update = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // ── Connect to Janus ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    seenMessageKeysRef.current.clear();
    setMessages([]);

    async function init() {
      try {
        const checkRes = await fetch(`${BACKEND_URL}/api/rooms/${roomId}`);
        if (!checkRes.ok) {
          const data = await checkRes.json().catch(() => ({}));
          throw new Error(data.error || 'Room not found.');
        }
        await janusService.initLibrary();
        await janusService.connect();

        janusService.onLocalStream = (stream) => {
          if (localVideoRef.current) { localVideoRef.current.srcObject = stream; setLocalStreamReady(true); }
        };
        janusService.onRemoteStream = (pubId, display, stream) => {
          if (cancelled) return;
          if (display?.endsWith('(screen)')) setScreenShareFeeds((p) => ({ ...p, [pubId]: { display, stream } }));
          else setRemoteFeeds((p) => ({ ...p, [pubId]: { display, stream } }));
        };
        janusService.onRemoteGone = (pubId) => {
          if (cancelled) return;
          setRemoteFeeds((p) => { const c = { ...p }; delete c[pubId]; return c; });
          setScreenShareFeeds((p) => { const c = { ...p }; delete c[pubId]; return c; });
        };
        janusService.onChatMessage = (msg) => { if (!cancelled) appendUniqueMessages([msg]); };
        janusService.onError = (err) => { if (!cancelled) setError(typeof err === 'string' ? err : err?.message || 'Error'); };
        janusService.onSignal = (signal) => { if (!cancelled) handleIncomingSignal(signal); };

        await janusService.joinRoom(roomId, displayName.current);
        try { await janusService.connectSignaling(roomId, token); } catch { if (!cancelled) { setUiNotice({ type: 'info', text: 'Signaling unavailable.' }); setTimeout(() => setUiNotice(null), 5000); } }
        try { await janusService.joinTextRoom(roomId, displayName.current); } catch { /* fallback */ }

        if (!cancelled) { setConnected(true); setJoining(false); }
      } catch (err) {
        if (!cancelled) { setError(typeof err === 'string' ? err : err?.message || 'Failed to connect'); setJoining(false); }
      }
    }
    init();
    return () => { cancelled = true; janusService.destroy(); };
  }, [roomId, token, appendUniqueMessages]);

  // ── Handle signals ──────────────────────────────────────
  const handleIncomingSignal = useCallback((signal) => {
    switch (signal.type) {
      case 'hand-raise':
        setRaisedHands((prev) => {
          if (signal.raised) return { ...prev, [signal.senderName || signal.display]: true };
          const c = { ...prev }; delete c[signal.senderName || signal.display]; return c;
        });
        break;
      case 'mute-all':
        if (!isTrainer) { setMicOn(false); janusService.toggleAudio(true); setUiNotice({ type: 'info', text: `${signal.trainerName || 'Trainer'} muted everyone.` }); setTimeout(() => setUiNotice(null), 4000); }
        break;
      case 'force-mute':
        setMicOn(false); janusService.toggleAudio(true);
        setUiNotice({ type: 'info', text: `Muted by ${signal.trainerName || 'trainer'}.` }); setTimeout(() => setUiNotice(null), 4000);
        break;
      case 'kicked':
        janusService.destroy(); setError('You were removed from this class.');
        break;
      case 'spotlight':
        setSpotlightUserId(signal.targetUserId);
        break;
      case 'clear-spotlight':
        setSpotlightUserId(null);
        break;
      case 'dismiss-hand':
        setHandRaised(false);
        setUiNotice({ type: 'info', text: 'Your hand was lowered by the trainer.' }); setTimeout(() => setUiNotice(null), 3000);
        break;
      case 'end-class':
        setUiNotice({ type: 'error', text: 'The class has ended.' });
        setTimeout(() => { janusService.destroy(); navigate('/'); }, 3000);
        break;
      case 'participant-joined':
        setUiNotice({ type: 'info', text: `${signal.displayName} joined.` }); setTimeout(() => setUiNotice(null), 3000);
        break;
      case 'participant-left':
        setUiNotice({ type: 'info', text: `${signal.displayName} left.` }); setTimeout(() => setUiNotice(null), 3000);
        break;
      case 'wb-delta': case 'wb-snapshot': case 'wb-request-snapshot':
        whiteboardSignalHandler.current?.(signal);
        break;
      default: break;
    }
  }, [isTrainer, navigate]);

  // Poll chat
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/messages?limit=200`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.success) return;
        appendUniqueMessages(data.messages.map((m) => ({ id: m.id, sender: m.sender, content: m.content, timestamp: m.createdAt })));
      } catch { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [roomId, appendUniqueMessages]);

  useEffect(() => { if (activeSidebar === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeSidebar]);

  // ── Handlers ────────────────────────────────────────────
  const handleToggleMic = useCallback(() => { const n = !micOn; setMicOn(n); janusService.toggleAudio(!n); }, [micOn]);
  const handleToggleCam = useCallback(() => { const n = !camOn; setCamOn(n); janusService.toggleVideo(!n); }, [camOn]);
  const handleScreenShare = useCallback(async () => {
    if (sharing) { janusService.stopScreenShare(); setSharing(false); }
    else { try { await janusService.startScreenShare(roomId, displayName.current); setSharing(true); setShowWhiteboard(false); } catch { setUiNotice({ type: 'error', text: 'Screen share failed.' }); setTimeout(() => setUiNotice(null), 4000); } }
  }, [sharing, roomId]);
  const toggleWhiteboard = useCallback(() => { setShowWhiteboard((p) => !p); if (!showWhiteboard && sharing) { janusService.stopScreenShare(); setSharing(false); } if (!showWhiteboard) setPinnedFeed(null); }, [showWhiteboard, sharing]);
  const toggleSidebar = (s) => setActiveSidebar(activeSidebar === s ? null : s);
  const handleSendChat = useCallback((e) => {
    e.preventDefault(); if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    janusService.sendChatMessage(roomId, msg);
    fetch(`${BACKEND_URL}/api/rooms/${roomId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: displayName.current, content: msg }) }).catch(() => {});
    setChatInput('');
  }, [chatInput, roomId]);
  const handleLeave = useCallback(() => {
    if (handRaised) janusService.sendSignal(roomId, { type: 'hand-raise', raised: false, display: displayName.current });
    janusService.destroy(); navigate('/');
  }, [navigate, handRaised, roomId]);
  const handleToggleHand = useCallback(() => { const n = !handRaised; setHandRaised(n); janusService.sendSignal(roomId, { type: 'hand-raise', raised: n, display: displayName.current }); }, [handRaised, roomId]);
  const handlePin = useCallback((f) => { setPinnedFeed((p) => (p && p.pubId === f.pubId && p.type === f.type) ? null : f); setShowWhiteboard(false); }, []);
  const handleUnpin = useCallback(() => setPinnedFeed(null), []);
  const handleSendSignal = useCallback((payload) => janusService.sendSignal(roomId, payload), [roomId]);

  // ── Trainer Commands ────────────────────────────────────
  const handleMuteAll = useCallback(() => { janusService.sendSignal(roomId, { type: 'mute-all' }); setUiNotice({ type: 'info', text: 'All participants muted.' }); setTimeout(() => setUiNotice(null), 3000); }, [roomId]);
  const handleForceMute = useCallback((uid) => janusService.sendSignal(roomId, { type: 'force-mute', targetUserId: uid }), [roomId]);
  const handleKick = useCallback((uid) => janusService.sendSignal(roomId, { type: 'kick', targetUserId: uid }), [roomId]);
  const handleSpotlight = useCallback((uid) => { janusService.sendSignal(roomId, { type: 'spotlight', targetUserId: uid }); setSpotlightUserId(uid); }, [roomId]);
  const handleClearSpotlight = useCallback(() => { janusService.sendSignal(roomId, { type: 'clear-spotlight' }); setSpotlightUserId(null); }, [roomId]);
  const handleDismissHand = useCallback((uid) => janusService.sendSignal(roomId, { type: 'dismiss-hand', targetUserId: uid }), [roomId]);
  const handleEndClass = useCallback(() => { janusService.sendSignal(roomId, { type: 'end-class' }); setTimeout(() => { janusService.destroy(); navigate('/'); }, 1000); }, [roomId, navigate]);

  // Layout
  const remoteEntries = Object.entries(remoteFeeds);
  const screenShareEntries = Object.entries(screenShareFeeds);
  const totalFeeds = 1 + remoteEntries.length;
  const hasPresentation = showWhiteboard || sharing || screenShareEntries.length > 0 || pinnedFeed !== null;
  const raisedHandCount = Object.keys(raisedHands).length + (handRaised ? 1 : 0);

  useEffect(() => {
    if (pinnedFeed?.type === 'remote' && pinnedFeed.pubId && !remoteFeeds[pinnedFeed.pubId]) setPinnedFeed(null);
    if (pinnedFeed?.type === 'screen' && pinnedFeed.pubId && !screenShareFeeds[pinnedFeed.pubId]) setPinnedFeed(null);
  }, [remoteFeeds, screenShareFeeds, pinnedFeed]);

  // ── Render ──────────────────────────────────────────────
  const renderVideoGrid = () => {
    let gridClass = 'teams-video-grid';
    if (hasPresentation) gridClass += ' teams-video-grid--filmstrip';
    else if (totalFeeds <= 2) gridClass += ' teams-video-grid--few';
    else gridClass += ' teams-video-grid--gallery';

    const filteredRemote = remoteEntries.filter(([pubId]) => !(pinnedFeed?.type === 'remote' && pinnedFeed.pubId === pubId));

    return (
      <div className={gridClass}>
        {!(pinnedFeed?.type === 'local') && (
          <div className="teams-tile" id="local-video-tile">
            <video ref={localVideoRef} autoPlay playsInline muted />
            <div className="teams-tile__label">
              <span className="teams-tile__name">{displayName.current}</span>
              {isTrainer && <span className="teams-badge-role teams-badge-role--trainer">Trainer</span>}
              {!micOn && <span className="teams-tile__muted"><IconMicOff /></span>}
            </div>
            {handRaised && <div className="teams-hand-badge"><IconHandRaise /></div>}
            <button className="teams-pin-btn" onClick={() => handlePin({ type: 'local', pubId: 'local', display: displayName.current, stream: localVideoRef.current?.srcObject })} title="Pin"><IconPin /></button>
            {(!localStreamReady && !error) && <div className="teams-tile__overlay"><div className="spinner" /></div>}
            {error && <div className="teams-tile__overlay teams-tile__overlay--error"><IconWarning /><p>{error}</p></div>}
          </div>
        )}
        {filteredRemote.map(([pubId, { display, stream }]) => (
          <RemoteVideo key={pubId} pubId={pubId} display={display} stream={stream} handRaised={!!raisedHands[display]} onPin={() => handlePin({ type: 'remote', pubId, display, stream })} />
        ))}
      </div>
    );
  };

  return (
    <div className="teams-classroom">
      {uiNotice && (
        <div className={`teams-toast teams-toast--${uiNotice.type}`}>
          {uiNotice.text}
          <button className="teams-toast__close" onClick={() => setUiNotice(null)}><IconClose /></button>
        </div>
      )}

      {/* Header */}
      <div className="teams-header">
        <div className="teams-header__left">
          <div className="teams-live-indicator"><span className="teams-live-dot" /><span>LIVE</span></div>
          <span className="teams-header__title">{isTrainer ? 'Live Class' : 'Class'} — Room {roomId}</span>
          <span className="teams-header__duration">{formatDuration(duration)}</span>
        </div>
        <div className="teams-header__right">
          <span className="teams-header__count"><IconPeople /> {totalFeeds}</span>
          <span className="teams-header__time">{currentTime}</span>
        </div>
      </div>

      {/* Main */}
      <div className="teams-main">
        {hasPresentation && (
          <div className="teams-stage">
            {showWhiteboard && <WhiteboardSync roomId={roomId} sendSignal={handleSendSignal} signalBus={whiteboardSignalHandler} />}
            {pinnedFeed && !showWhiteboard && (
              <div className="teams-pinned"><PinnedVideo feed={pinnedFeed} /><button className="teams-unpin-btn" onClick={handleUnpin}><IconUnpin /> Unpin</button></div>
            )}
            {!pinnedFeed && !showWhiteboard && screenShareEntries.map(([pubId, { display, stream }]) => (
              <div key={`screen-${pubId}`} className="teams-pinned">
                <RemoteVideo pubId={pubId} display={display} stream={stream} handRaised={false} onPin={() => handlePin({ type: 'screen', pubId, display, stream })} />
              </div>
            ))}
          </div>
        )}

        <div className={`teams-grid-area ${hasPresentation ? 'teams-grid-area--side' : ''}`}>
          {renderVideoGrid()}
        </div>

        {activeSidebar && (
          <div className="teams-sidebar">
            <div className="teams-sidebar__head"><h3>{activeSidebar === 'chat' ? 'Chat' : 'Participants'}</h3><button onClick={() => setActiveSidebar(null)}><IconClose /></button></div>
            {activeSidebar === 'chat' && (
              <div className="teams-chat">
                <div className="teams-chat__list">
                  {messages.length === 0 && <p className="teams-chat__empty">No messages yet.</p>}
                  {messages.map((m, i) => (
                    <div key={i} className={`teams-msg ${m.self ? 'teams-msg--self' : ''}`}>
                      {!m.self && <div className="teams-msg__avatar">{(m.sender || 'P')[0].toUpperCase()}</div>}
                      <div className="teams-msg__body">
                        {!m.self && <span className="teams-msg__sender">{m.sender}</span>}
                        <div className="teams-msg__bubble">{DOMPurify.sanitize(m.content)}</div>
                        <span className="teams-msg__time">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form className="teams-chat__form" onSubmit={handleSendChat}>
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." />
                  <button type="submit" disabled={!chatInput.trim()}><IconSend /></button>
                </form>
              </div>
            )}
            {activeSidebar === 'people' && (
              <div className="teams-people">
                <div className="teams-person">
                  <div className="teams-person__av">{displayName.current[0].toUpperCase()}</div>
                  <div className="teams-person__info"><span className="teams-person__name">{displayName.current} (You)</span><span className={`teams-person__role teams-person__role--${userRole}`}>{isTrainer ? 'Trainer' : 'Candidate'}</span></div>
                  <div className="teams-person__acts">{handRaised && <IconHandRaise />}{!micOn && <IconMicOff />}</div>
                </div>
                {remoteEntries.map(([pubId, { display }]) => (
                  <div className="teams-person" key={pubId}>
                    <div className="teams-person__av">{(display || 'P')[0].toUpperCase()}</div>
                    <div className="teams-person__info"><span className="teams-person__name">{display || 'Participant'}</span></div>
                    <div className="teams-person__acts">
                      {raisedHands[display] && <span className="teams-person__hand"><IconHandRaise /></span>}
                      {isTrainer && (
                        <div className="teams-person__trainer-btns">
                          <button onClick={() => handleForceMute(pubId)} title="Mute"><IconMicOff /></button>
                          <button onClick={() => handleSpotlight(pubId)} title="Spotlight"><IconSpotlight /></button>
                          {raisedHands[display] && <button onClick={() => handleDismissHand(pubId)} title="Lower hand"><IconHandRaise /></button>}
                          <button className="teams-btn-danger" onClick={() => handleKick(pubId)} title="Remove"><IconKick /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="teams-controls">
        <div className="teams-controls__left">
          {isTrainer && (
            <>
              <button className="teams-ctrl teams-ctrl--warn" onClick={handleMuteAll} title="Mute all"><IconMuteAll /><span>Mute All</span></button>
              {spotlightUserId && <button className="teams-ctrl" onClick={handleClearSpotlight} title="Clear spotlight"><IconSpotlight /><span>Clear</span></button>}
            </>
          )}
        </div>
        <div className="teams-controls__center">
          <button className={`teams-ctrl ${!micOn ? 'teams-ctrl--off' : ''}`} onClick={handleToggleMic} title={micOn ? 'Mute' : 'Unmute'}>{micOn ? <IconMic /> : <IconMicOff />}</button>
          <button className={`teams-ctrl ${!camOn ? 'teams-ctrl--off' : ''}`} onClick={handleToggleCam} title={camOn ? 'Camera off' : 'Camera on'}>{camOn ? <IconCam /> : <IconCamOff />}</button>
          <button className={`teams-ctrl ${sharing ? 'teams-ctrl--active' : ''}`} onClick={handleScreenShare} title="Share screen"><IconScreenShare /></button>
          <button className={`teams-ctrl ${showWhiteboard ? 'teams-ctrl--active' : ''}`} onClick={toggleWhiteboard} title="Whiteboard"><IconWhiteboard /></button>
          <button className={`teams-ctrl ${handRaised ? 'teams-ctrl--active' : ''}`} onClick={handleToggleHand} title={handRaised ? 'Lower hand' : 'Raise hand'}><IconHandRaise /></button>
          {isTrainer
            ? <button className="teams-ctrl teams-ctrl--end" onClick={handleEndClass} title="End class"><IconLeave /><span>End</span></button>
            : <button className="teams-ctrl teams-ctrl--leave" onClick={handleLeave} title="Leave"><IconLeave /></button>
          }
        </div>
        <div className="teams-controls__right">
          <button className={`teams-ctrl teams-ctrl--side ${activeSidebar === 'people' ? 'teams-ctrl--active' : ''}`} onClick={() => toggleSidebar('people')} title="Participants">
            <IconPeople />{raisedHandCount > 0 && <span className="teams-badge-count">{raisedHandCount}</span>}
          </button>
          <button className={`teams-ctrl teams-ctrl--side ${activeSidebar === 'chat' ? 'teams-ctrl--active' : ''}`} onClick={() => toggleSidebar('chat')} title="Chat">
            <IconChat />{messages.length > 0 && activeSidebar !== 'chat' && <span className="teams-notif-dot" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function RemoteVideo({ pubId, display, stream, handRaised, onPin }) {
  const videoRef = useRef(null);
  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);
  return (
    <div className="teams-tile" id={`remote-${pubId}`}>
      <video ref={videoRef} autoPlay playsInline />
      <div className="teams-tile__label"><span className="teams-tile__name">{display || 'Participant'}</span></div>
      {handRaised && <div className="teams-hand-badge"><IconHandRaise /></div>}
      {onPin && <button className="teams-pin-btn" onClick={onPin} title="Pin"><IconPin /></button>}
    </div>
  );
}

function PinnedVideo({ feed }) {
  const videoRef = useRef(null);
  useEffect(() => { if (videoRef.current && feed.stream) videoRef.current.srcObject = feed.stream; }, [feed.stream]);
  return (
    <div className="teams-pinned-video">
      <video ref={videoRef} autoPlay playsInline muted={feed.type === 'local'} />
      <div className="teams-pinned-video__label"><span>{feed.display || 'Participant'}</span></div>
    </div>
  );
}
