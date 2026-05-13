import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DOMPurify from 'dompurify';

import WhiteboardSync from './WhiteboardSync.jsx';
import { janusService, resolveMediaAccessError } from '../janus/JanusService.js';
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
const IconSettings = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
const IconMore = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>);
const IconBack = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>);

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
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isValidParticipantToken(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (typeof payload.userId !== 'string' || !payload.userId.trim()) return false;
  if (typeof payload.displayName !== 'string' || !payload.displayName.trim()) return false;
  if (payload.role !== 'trainer' && payload.role !== 'candidate') return false;
  if (typeof payload.roomId !== 'string' || !payload.roomId.trim()) return false;
  return true;
}

function normalizeHandKey(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function buildInitials(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'GM';
}

function buildMediaConstraint(enabled, deviceId) {
  if (!enabled) return false;
  if (!deviceId) return true;
  return { deviceId: { exact: deviceId } };
}

function mapInputDevices(devices, kind) {
  const labelPrefix = kind === 'audioinput' ? 'Microphone' : 'Camera';
  return devices
    .filter((device) => device.kind === kind)
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `${labelPrefix} ${index + 1}`,
    }));
}

async function enumerateInputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { audio: [], video: [] };
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return {
    audio: mapInputDevices(devices, 'audioinput'),
    video: mapInputDevices(devices, 'videoinput'),
  };
}

export default function Classroom() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || null;
  const tokenPayload = parseTokenPayload(token);
  const hasValidToken = Boolean(token && isValidParticipantToken(tokenPayload));
  const displayName = useRef(hasValidToken ? tokenPayload.displayName.trim() : 'Guest');
  const userRole = hasValidToken ? tokenPayload.role : 'candidate';
  const isTrainer = userRole === 'trainer';

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [joining, setJoining] = useState(true);
  const [roomChecked, setRoomChecked] = useState(false);
  const [setupAttempt, setSetupAttempt] = useState(0);
  const [setupStatus, setSetupStatus] = useState('Checking room availability');
  const [localStreamReady, setLocalStreamReady] = useState(false);
  const [error, setError] = useState(null);

  const [previewStream, setPreviewStream] = useState(null);
  const previewStreamRef = useRef(null);
  const previewVideoRef = useRef(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('');
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState('');
  const [devicesLoading, setDevicesLoading] = useState(false);

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
  const localStreamRef = useRef(null);

  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState({});
  const [pinnedFeed, setPinnedFeed] = useState(null);
  const [spotlightUserId, setSpotlightUserId] = useState(null);

  const whiteboardSignalHandler = useRef(null);
  const [duration, setDuration] = useState(0);
  const startTimeRef = useRef(Date.now());
  const noticeTimerRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const uiTimerRef = useRef(null);

  const showNotice = useCallback((type, text, timeout = 3200) => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setUiNotice({ type, text });
    if (timeout > 0) {
      noticeTimerRef.current = window.setTimeout(() => {
        setUiNotice(null);
        noticeTimerRef.current = null;
      }, timeout);
    }
  }, []);

  const stopStream = useCallback((stream) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const stopPreview = useCallback(() => {
    if (previewStreamRef.current) {
      stopStream(previewStreamRef.current);
      previewStreamRef.current = null;
    }
    setPreviewStream(null);
  }, [stopStream]);

  const syncDeviceOptions = useCallback((nextAudioDevices, nextVideoDevices) => {
    setAudioDevices(nextAudioDevices);
    setVideoDevices(nextVideoDevices);
    setSelectedAudioDeviceId((previous) => (
      previous && nextAudioDevices.some((device) => device.deviceId === previous) ? previous : ''
    ));
    setSelectedVideoDeviceId((previous) => (
      previous && nextVideoDevices.some((device) => device.deviceId === previous) ? previous : ''
    ));
  }, []);

  const appendUniqueMessages = useCallback((incomingMessages) => {
    if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) return;
    setMessages((previous) => {
      const next = [...previous];
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
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // Auto-hide header & controls after 3s of no mouse movement
  useEffect(() => {
    if (!connected) return;
    const resetTimer = () => {
      setUiHidden(false);
      if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
      uiTimerRef.current = setTimeout(() => setUiHidden(true), 3000);
    };
    resetTimer();
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    return () => {
      if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [connected]);

  useEffect(() => {
    const update = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDuration(connected ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [connected]);

  useEffect(() => {
    if (previewVideoRef.current && previewStream) {
      previewVideoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Attach local stream to video element once in-room view mounts or after unpin
  const localVideoRefCallback = useCallback((el) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (connected && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      // Ensure playback resumes (e.g., after unpin or page visibility change)
      if (localVideoRef.current.paused) {
        localVideoRef.current.play().catch(() => {});
      }
    }
  }, [connected, localStreamReady, pinnedFeed]);

  // Resume video playback when page becomes visible again (iframe embed scenario)
  useEffect(() => {
    if (!connected) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (localVideoRef.current?.paused && localStreamRef.current) {
          localVideoRef.current.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connected]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    let cancelled = false;

    seenMessageKeysRef.current.clear();
    setMessages([]);
    setUiNotice(null);
    setError(null);
    setConnected(false);
    setJoining(true);
    setRoomChecked(false);
    setLocalStreamReady(false);
    setActiveSidebar(null);
    setShowWhiteboard(false);
    setPinnedFeed(null);
    setRemoteFeeds({});
    setScreenShareFeeds({});
    setRaisedHands({});
    setHandRaised(false);
    setSpotlightUserId(null);
    setSharing(false);
    setPreviewError('');
    setAudioDevices([]);
    setVideoDevices([]);
    setSelectedAudioDeviceId('');
    setSelectedVideoDeviceId('');
    setDevicesLoading(false);
    setSetupStatus('Checking meeting availability');
    stopPreview();
    janusService.destroy();

    async function prepareRoom() {
      try {
        if (!hasValidToken) {
          throw new Error('A valid meeting token is required. Return to the dashboard and join again.');
        }

        const roomResponse = await fetch(`${BACKEND_URL}/api/rooms/${roomId}`);
        if (!roomResponse.ok) {
          const data = await roomResponse.json().catch(() => ({}));
          throw new Error(data.error || 'Meeting not found.');
        }

        if (cancelled) return;
        setSetupStatus('Preparing GTS Meet session');
        await janusService.initLibrary();

        if (cancelled) return;
        setRoomChecked(true);
        setJoining(false);
        setSetupStatus('Ready to enter');
      } catch (err) {
        if (cancelled) return;
        setError(typeof err === 'string' ? err : err?.message || 'Unable to prepare this meeting.');
        setJoining(false);
        setSetupStatus('Setup blocked');
      }
    }

    prepareRoom();

    return () => {
      cancelled = true;
      stopPreview();
      janusService.destroy();
    };
  }, [hasValidToken, roomId, setupAttempt, stopPreview]);

  useEffect(() => {
    if (!roomChecked || connected || !navigator.mediaDevices?.enumerateDevices) return;

    let cancelled = false;
    const mediaDevices = navigator.mediaDevices;

    const loadDevices = async () => {
      setDevicesLoading(true);
      try {
        const { audio, video } = await enumerateInputDevices();
        if (cancelled) return;
        syncDeviceOptions(audio, video);
      } catch (err) {
        if (!cancelled) {
          console.warn('[Classroom] Unable to enumerate media devices:', err);
        }
      } finally {
        if (!cancelled) {
          setDevicesLoading(false);
        }
      }
    };

    loadDevices().catch(() => undefined);

    const handleDeviceChange = () => {
      loadDevices().catch(() => undefined);
    };

    if (typeof mediaDevices.addEventListener === 'function') {
      mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    return () => {
      cancelled = true;
      if (typeof mediaDevices.removeEventListener === 'function') {
        mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    };
  }, [roomChecked, connected, syncDeviceOptions]);

  useEffect(() => {
    if (!roomChecked || connected || joining) return;

    let cancelled = false;
    stopPreview();
    setPreviewError('');

    if (!micOn && !camOn) {
      setPreviewLoading(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setPreviewLoading(false);
      setPreviewError('This browser cannot open a camera or microphone preview.');
      return;
    }

    setPreviewLoading(true);
    navigator.mediaDevices.getUserMedia({
      audio: buildMediaConstraint(micOn, selectedAudioDeviceId),
      video: buildMediaConstraint(camOn, selectedVideoDeviceId),
    })
      .then((stream) => {
        if (cancelled) {
          stopStream(stream);
          return;
        }
        previewStreamRef.current = stream;
        setPreviewStream(stream);
        setPreviewLoading(false);

        if (navigator.mediaDevices?.enumerateDevices) {
          enumerateInputDevices()
            .then(({ audio, video }) => {
              if (cancelled) return;
              syncDeviceOptions(audio, video);
            })
            .catch(() => undefined);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setPreviewLoading(false);
        setPreviewError(resolveMediaAccessError(err, { audio: micOn, video: camOn }));
      });

    return () => {
      cancelled = true;
    };
  }, [roomChecked, connected, joining, micOn, camOn, selectedAudioDeviceId, selectedVideoDeviceId, stopPreview, stopStream, syncDeviceOptions]);

  const handleIncomingSignal = useCallback((signal) => {
    switch (signal.type) {
      case 'hand-raise':
        setRaisedHands((previous) => {
          const handKey = normalizeHandKey(signal.senderName || signal.display);
          if (!handKey) return previous;
          if (signal.raised) return { ...previous, [handKey]: true };
          const next = { ...previous };
          delete next[handKey];
          return next;
        });
        break;
      case 'mute-all':
        if (!isTrainer) {
          setMicOn(false);
          janusService.toggleAudio(true);
          showNotice('info', `${signal.trainerName || 'Host'} muted everyone.`, 4000);
        }
        break;
      case 'force-mute':
        setMicOn(false);
        janusService.toggleAudio(true);
        showNotice('info', `Muted by ${signal.trainerName || 'host'}.`, 4000);
        break;
      case 'kicked':
        janusService.destroy();
        setError('You were removed from this meeting.');
        setConnected(false);
        setRoomChecked(true);
        break;
      case 'spotlight':
        setSpotlightUserId(signal.targetUserId);
        break;
      case 'clear-spotlight':
        setSpotlightUserId(null);
        break;
      case 'dismiss-hand':
        setHandRaised(false);
        showNotice('info', 'Your hand was lowered by the host.');
        break;
      case 'end-class':
        showNotice('error', 'This meeting has ended.', 2600);
        setTimeout(() => {
          janusService.destroy();
          navigate('/');
        }, 2800);
        break;
      case 'participant-joined':
        showNotice('info', `${signal.displayName} joined the session.`);
        break;
      case 'participant-left':
        showNotice('info', `${signal.displayName} left the session.`);
        break;
      case 'wb-delta':
      case 'wb-snapshot':
      case 'wb-request-snapshot':
        whiteboardSignalHandler.current?.(signal);
        break;
      default:
        break;
    }
  }, [isTrainer, navigate, showNotice]);

  const handleEnterRoom = useCallback(async () => {
    if (!hasValidToken) {
      setError('A valid meeting token is required. Return to the dashboard and rejoin this room.');
      setSetupStatus('Token required');
      return;
    }
    if (!roomChecked || joining) return;

    setJoining(true);
    setError(null);
    setSetupStatus('Connecting to media gateway');
    setLocalStreamReady(false);
    stopPreview();

    try {
      await janusService.connect();
      janusService.initialPublishOptions = {
        audio: micOn,
        video: camOn,
        audioDeviceId: selectedAudioDeviceId || undefined,
        videoDeviceId: selectedVideoDeviceId || undefined,
      };

      janusService.onLocalStream = (stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalStreamReady(true);
      };
      janusService.onRemoteStream = (publisherId, display, stream) => {
        if (display?.endsWith('(screen)')) {
          setScreenShareFeeds((previous) => ({ ...previous, [publisherId]: { display, stream, _ts: Date.now() } }));
          return;
        }
        setRemoteFeeds((previous) => ({ ...previous, [publisherId]: { display, stream, _ts: Date.now() } }));
      };
      janusService.onRemoteGone = (publisherId) => {
        setRemoteFeeds((previous) => {
          const next = { ...previous };
          delete next[publisherId];
          return next;
        });
        setScreenShareFeeds((previous) => {
          const next = { ...previous };
          delete next[publisherId];
          return next;
        });
      };
      janusService.onChatMessage = (message) => appendUniqueMessages([message]);
      janusService.onError = (err) => setError(typeof err === 'string' ? err : err?.message || 'Error');
      janusService.onSignal = (signal) => handleIncomingSignal(signal);

      setSetupStatus('Joining GTS Meet session');
      await janusService.joinRoom(roomId, displayName.current);

      setSetupStatus('Connecting session signals');
      try {
        await janusService.connectSignaling(roomId, token);
      } catch (err) {
        showNotice('error', err?.message || 'Live signaling is unavailable. Core media will still load.', 4200);
      }

      setSetupStatus('Starting session conversation');
      try {
        await janusService.joinTextRoom(roomId, displayName.current);
      } catch {
        showNotice('info', 'Session chat is reconnecting. Messages may take a moment to appear.', 4000);
      }

      startTimeRef.current = Date.now();
      setConnected(true);
      setSetupStatus('Connected');
    } catch (err) {
      janusService.destroy();
      setConnected(false);
      setError(typeof err === 'string' ? err : err?.message || 'Failed to connect to the meeting.');
      setSetupStatus('Unable to connect');
    } finally {
      setJoining(false);
    }
  }, [appendUniqueMessages, camOn, handleIncomingSignal, hasValidToken, joining, micOn, roomChecked, roomId, selectedAudioDeviceId, selectedVideoDeviceId, showNotice, stopPreview, token]);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/messages?limit=200`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.success) return;
        appendUniqueMessages(data.messages.map((message) => ({
          id: message.id,
          sender: message.sender,
          content: message.content,
          timestamp: message.createdAt,
        })));
      } catch {
        return;
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [appendUniqueMessages, connected, roomId]);

  useEffect(() => {
    if (activeSidebar === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeSidebar]);

  const handleToggleMic = useCallback(() => {
    const next = !micOn;
    setMicOn(next);
    if (connected) janusService.toggleAudio(!next);
  }, [connected, micOn]);

  const handleToggleCam = useCallback(() => {
    const next = !camOn;
    setCamOn(next);
    if (connected) janusService.toggleVideo(!next);
  }, [camOn, connected]);

  const handleScreenShare = useCallback(async () => {
    if (sharing) {
      janusService.stopScreenShare();
      setSharing(false);
      return;
    }

    try {
      await janusService.startScreenShare(roomId, displayName.current);
      setSharing(true);
      setShowWhiteboard(false);
    } catch {
      showNotice('error', 'Screen share failed.', 4000);
    }
  }, [roomId, sharing, showNotice]);

  const toggleWhiteboard = useCallback(() => {
    setShowWhiteboard((previous) => !previous);
    if (!showWhiteboard && sharing) {
      janusService.stopScreenShare();
      setSharing(false);
    }
    if (!showWhiteboard) setPinnedFeed(null);
  }, [sharing, showWhiteboard]);

  const toggleSidebar = (section) => setActiveSidebar(activeSidebar === section ? null : section);

  const handleSendChat = useCallback((event) => {
    event.preventDefault();
    if (!chatInput.trim()) return;
    const message = chatInput.trim();
    janusService.sendChatMessage(roomId, message);
    fetch(`${BACKEND_URL}/api/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: displayName.current, content: message }),
    }).catch(() => {});
    setChatInput('');
  }, [chatInput, roomId]);

  const handleLeave = useCallback(() => {
    if (handRaised) janusService.sendSignal(roomId, { type: 'hand-raise', raised: false, display: displayName.current });
    janusService.destroy();
    navigate('/');
  }, [handRaised, navigate, roomId]);

  const handleToggleHand = useCallback(() => {
    const next = !handRaised;
    const signalResult = janusService.sendSignal(roomId, { type: 'hand-raise', raised: next, display: displayName.current });
    if (!signalResult?.sent) {
      showNotice('error', 'Hand raise is unavailable until session signaling reconnects.', 3600);
      return;
    }
    setHandRaised(next);
  }, [handRaised, roomId, showNotice]);

  const handlePin = useCallback((feed) => {
    setPinnedFeed((previous) => (previous && previous.pubId === feed.pubId && previous.type === feed.type ? null : feed));
    setShowWhiteboard(false);
  }, []);

  const handleUnpin = useCallback(() => setPinnedFeed(null), []);
  const handleSendSignal = useCallback((payload) => janusService.sendSignal(roomId, payload), [roomId]);
  const handleRetrySetup = useCallback(() => setSetupAttempt((value) => value + 1), []);

  const handleMuteAll = useCallback(() => {
    janusService.sendSignal(roomId, { type: 'mute-all' });
    showNotice('info', 'All participants muted.');
  }, [roomId, showNotice]);

  const handleForceMute = useCallback((userId) => janusService.sendSignal(roomId, { type: 'force-mute', targetUserId: userId }), [roomId]);
  const handleKick = useCallback((userId) => janusService.sendSignal(roomId, { type: 'kick', targetUserId: userId }), [roomId]);
  const handleSpotlight = useCallback((userId) => {
    janusService.sendSignal(roomId, { type: 'spotlight', targetUserId: userId });
    setSpotlightUserId(userId);
  }, [roomId]);
  const handleClearSpotlight = useCallback(() => {
    janusService.sendSignal(roomId, { type: 'clear-spotlight' });
    setSpotlightUserId(null);
  }, [roomId]);
  const handleDismissHand = useCallback((userId) => janusService.sendSignal(roomId, { type: 'dismiss-hand', targetUserId: userId }), [roomId]);
  const handleEndClass = useCallback(() => {
    janusService.sendSignal(roomId, { type: 'end-class' });
    setTimeout(() => {
      janusService.destroy();
      navigate('/');
    }, 1000);
  }, [navigate, roomId]);

  const remoteEntries = Object.entries(remoteFeeds);
  const screenShareEntries = Object.entries(screenShareFeeds);
  const totalFeeds = 1 + remoteEntries.length;
  const hasPresentation = showWhiteboard || sharing || screenShareEntries.length > 0 || pinnedFeed !== null;
  const raisedHandCount = Object.keys(raisedHands).length + (handRaised ? 1 : 0);
  const sessionStateLabel = joining ? 'Joining session' : connected ? 'Connected' : roomChecked ? 'Ready to join' : 'Preparing';
  const roomModeLabel = showWhiteboard
    ? 'Whiteboard live'
    : pinnedFeed
      ? 'Focused stage'
      : sharing || screenShareEntries.length > 0
        ? 'Presentation live'
        : 'Gallery view';

  const prejoinMediaStatus = !micOn && !camOn
    ? 'Joining with microphone and camera off.'
    : previewLoading
      ? 'Checking camera and microphone access...'
      : previewError
        ? previewError
        : camOn && micOn
          ? 'Camera and microphone are ready.'
          : camOn
            ? 'Camera is ready. Microphone is muted for entry.'
            : 'Microphone is ready. Camera is off for entry.';

  const canEnterRoom = hasValidToken && roomChecked && !joining && (!previewError || (!micOn && !camOn));
    const deviceSelectorSupported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.enumerateDevices);
    const audioDeviceHint = !deviceSelectorSupported
      ? 'This browser can only use the default microphone.'
      : devicesLoading
        ? 'Refreshing microphone list...'
        : micOn
          ? 'Choose which microphone to use when you join.'
          : 'Microphone is muted for entry, but you can choose it now.';
    const videoDeviceHint = !deviceSelectorSupported
      ? 'This browser can only use the default camera.'
      : devicesLoading
        ? 'Refreshing camera list...'
        : camOn
          ? 'Choose which camera to use when you join.'
          : 'Camera is off for entry, but you can choose it now.';

  useEffect(() => {
    if (pinnedFeed?.type === 'remote' && pinnedFeed.pubId && !remoteFeeds[pinnedFeed.pubId]) setPinnedFeed(null);
    if (pinnedFeed?.type === 'screen' && pinnedFeed.pubId && !screenShareFeeds[pinnedFeed.pubId]) setPinnedFeed(null);
  }, [remoteFeeds, screenShareFeeds, pinnedFeed]);

  const renderVideoGrid = () => {
    let gridClass = 'teams-video-grid';
    if (hasPresentation) gridClass += ' teams-video-grid--filmstrip';
    else if (totalFeeds <= 2) gridClass += ' teams-video-grid--few';
    else gridClass += ' teams-video-grid--gallery';

    const filteredRemote = remoteEntries.filter(([publisherId]) => !(pinnedFeed?.type === 'remote' && pinnedFeed.pubId === publisherId));

    return (
      <div className={gridClass}>
        {!(pinnedFeed?.type === 'local') && (
          <div className="teams-tile" id="local-video-tile">
            <video ref={localVideoRefCallback} autoPlay playsInline muted />
            <div className="teams-tile__label">
              <span className="teams-tile__name">{displayName.current}</span>
              {isTrainer && <span className="teams-badge-role teams-badge-role--trainer">Host</span>}
              {!micOn && <span className="teams-tile__muted"><IconMicOff /></span>}
            </div>
            {handRaised && <div className="teams-hand-badge"><IconHandRaise /></div>}
            <button className="teams-pin-btn" onClick={() => handlePin({ type: 'local', pubId: 'local', display: displayName.current, stream: localVideoRef.current?.srcObject })} title="Pin"><IconPin /></button>
            {!localStreamReady && !error && (
              <div className="teams-tile__overlay">
                <div className="spinner" />
                <p>Connecting your camera and microphone...</p>
              </div>
            )}
            {error && (
              <div className="teams-tile__overlay teams-tile__overlay--error">
                <IconWarning />
                <p>{error}</p>
              </div>
            )}
          </div>
        )}
        {filteredRemote.map(([publisherId, { display, stream }]) => (
          <RemoteVideo key={publisherId} pubId={publisherId} display={display} stream={stream} handRaised={!!raisedHands[normalizeHandKey(display)]} onPin={() => handlePin({ type: 'remote', pubId: publisherId, display, stream })} />
        ))}
      </div>
    );
  };

  if (!connected) {
    return (
      <div className="teams-classroom teams-classroom--prejoin">
        {uiNotice && (
          <div className={`teams-toast teams-toast--${uiNotice.type}`}>
            {uiNotice.text}
            <button className="teams-toast__close" onClick={() => setUiNotice(null)}><IconClose /></button>
          </div>
        )}

        <button className="gm-back-link" onClick={() => navigate('/')}>
          <IconBack /> Back
        </button>

        <div className="teams-prejoin-shell">
          <div className="gm-prejoin-card">
            <div className="gm-preview">
              {previewStream && camOn ? (
                <video ref={previewVideoRef} autoPlay playsInline muted />
              ) : (
                <div className="gm-preview-empty">
                  <div className="gm-avatar">{buildInitials(displayName.current)}</div>
                </div>
              )}

              {(previewLoading || joining) && (
                <div className="gm-preview-loading">
                  <div className="spinner" />
                </div>
              )}

              <div className="gm-preview-controls">
                <button className={`gm-toggle-btn ${!micOn ? 'gm-toggle-btn--off' : ''}`} onClick={handleToggleMic} title={micOn ? 'Turn off microphone' : 'Turn on microphone'}>
                  {micOn ? <IconMic /> : <IconMicOff />}
                </button>
                <button className={`gm-toggle-btn ${!camOn ? 'gm-toggle-btn--off' : ''}`} onClick={handleToggleCam} title={camOn ? 'Turn off camera' : 'Turn on camera'}>
                  {camOn ? <IconCam /> : <IconCamOff />}
                </button>
                <button className="gm-settings-btn" onClick={() => setShowSettings((v) => !v)} title="Settings">
                  <IconSettings />
                </button>
              </div>
            </div>

            {showSettings && (
              <div className="gm-settings-panel">
                <h3>Device settings</h3>
                <div className="gm-device-row">
                  <span className="gm-device-label">Microphone</span>
                  <select className="gm-device-select" value={selectedAudioDeviceId} onChange={(e) => setSelectedAudioDeviceId(e.target.value)} disabled={!deviceSelectorSupported}>
                    <option value="">Default</option>
                    {audioDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                  </select>
                </div>
                <div className="gm-device-row">
                  <span className="gm-device-label">Camera</span>
                  <select className="gm-device-select" value={selectedVideoDeviceId} onChange={(e) => setSelectedVideoDeviceId(e.target.value)} disabled={!deviceSelectorSupported}>
                    <option value="">Default</option>
                    {videoDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            {previewError && <p className="gm-preview-error">{previewError}</p>}
            {error && <p className="gm-preview-error">{error}</p>}

            <div className="gm-prejoin-info">
              <span className="gm-display-name">{displayName.current}</span>
              <span className="gm-room-label">Meeting {roomId}</span>
            </div>

            <div className="gm-join-actions">
              <button className="gm-join-btn" onClick={handleEnterRoom} disabled={!canEnterRoom}>
                {joining ? 'Joining...' : 'Join now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`teams-classroom ${uiHidden ? 'gm-ui-hidden' : ''}`}>
      {uiNotice && (
        <div className={`teams-toast teams-toast--${uiNotice.type}`}>
          {uiNotice.text}
          <button className="teams-toast__close" onClick={() => setUiNotice(null)}><IconClose /></button>
        </div>
      )}

      <div className="teams-header">
        <div className="teams-header__left">
          <span className="teams-header__title">Meeting {roomId}</span>
          <span className="teams-header__duration">{formatDuration(duration)}</span>
        </div>
        <div className="teams-header__right">
          <span className="teams-header__count"><IconPeople /> {totalFeeds}</span>
          <span className="teams-header__time">{currentTime}</span>
        </div>
      </div>

      <div className="teams-main">
        {hasPresentation && (
          <div className="teams-stage">
            {showWhiteboard && <WhiteboardSync roomId={roomId} sendSignal={handleSendSignal} signalBus={whiteboardSignalHandler} />}
            {pinnedFeed && !showWhiteboard && (
              <div className="teams-pinned">
                <PinnedVideo feed={pinnedFeed} />
                <button className="teams-unpin-btn" onClick={handleUnpin}><IconUnpin /> Unpin</button>
              </div>
            )}
            {!pinnedFeed && !showWhiteboard && screenShareEntries.map(([publisherId, { display, stream }]) => (
              <div key={`screen-${publisherId}`} className="teams-pinned">
                <RemoteVideo pubId={publisherId} display={display} stream={stream} handRaised={false} onPin={() => handlePin({ type: 'screen', pubId: publisherId, display, stream })} />
              </div>
            ))}
          </div>
        )}

        <div className={`teams-grid-area ${hasPresentation ? 'teams-grid-area--side' : ''}`}>
          {renderVideoGrid()}
        </div>

        {activeSidebar && (
          <div className="teams-sidebar">
            <div className="teams-sidebar__head"><h3>{activeSidebar === 'chat' ? 'Conversation' : 'Session roster'}</h3><button onClick={() => setActiveSidebar(null)}><IconClose /></button></div>
            {activeSidebar === 'chat' && (
              <div className="teams-chat">
                <div className="teams-chat__list">
                  {messages.length === 0 && <p className="teams-chat__empty">Session messages will appear here as people join.</p>}
                  {messages.map((message, index) => (
                    <div key={index} className={`teams-msg ${message.self ? 'teams-msg--self' : ''}`}>
                      {!message.self && <div className="teams-msg__avatar">{(message.sender || 'P')[0].toUpperCase()}</div>}
                      <div className="teams-msg__body">
                        {!message.self && <span className="teams-msg__sender">{message.sender}</span>}
                        <div className="teams-msg__bubble">{DOMPurify.sanitize(message.content)}</div>
                        <span className="teams-msg__time">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form className="teams-chat__form" onSubmit={handleSendChat}>
                  <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Send a note to the session" />
                  <button type="submit" disabled={!chatInput.trim()}><IconSend /></button>
                </form>
              </div>
            )}
            {activeSidebar === 'people' && (
              <div className="teams-people">
                <div className="teams-person">
                  <div className="teams-person__av">{displayName.current[0].toUpperCase()}</div>
                  <div className="teams-person__info">
                    <span className="teams-person__name">{displayName.current} (You)</span>
                    <span className={`teams-person__role teams-person__role--${userRole}`}>{isTrainer ? 'Host' : 'Participant'}</span>
                  </div>
                  <div className="teams-person__acts">{handRaised && <IconHandRaise />}{!micOn && <IconMicOff />}</div>
                </div>
                {remoteEntries.map(([publisherId, { display }]) => (
                  <div className="teams-person" key={publisherId}>
                    <div className="teams-person__av">{(display || 'P')[0].toUpperCase()}</div>
                    <div className="teams-person__info"><span className="teams-person__name">{display || 'Participant'}</span></div>
                    <div className="teams-person__acts">
                      {raisedHands[normalizeHandKey(display)] && <span className="teams-person__hand"><IconHandRaise /></span>}
                      {isTrainer && (
                        <div className="teams-person__trainer-btns">
                          <button onClick={() => handleForceMute(publisherId)} title="Mute"><IconMicOff /></button>
                          <button onClick={() => handleSpotlight(publisherId)} title="Spotlight"><IconSpotlight /></button>
                          {raisedHands[normalizeHandKey(display)] && <button onClick={() => handleDismissHand(publisherId)} title="Lower hand"><IconHandRaise /></button>}
                          <button className="teams-btn-danger" onClick={() => handleKick(publisherId)} title="Remove"><IconKick /></button>
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

      <div className="teams-controls">
        <div className="teams-controls__center">
          <button className={`teams-ctrl ${!micOn ? 'teams-ctrl--off' : ''}`} onClick={handleToggleMic} title={micOn ? 'Turn off microphone' : 'Turn on microphone'}>{micOn ? <IconMic /> : <IconMicOff />}</button>
          <button className={`teams-ctrl ${!camOn ? 'teams-ctrl--off' : ''}`} onClick={handleToggleCam} title={camOn ? 'Turn off camera' : 'Turn on camera'}>{camOn ? <IconCam /> : <IconCamOff />}</button>
          <button className={`teams-ctrl ${sharing ? 'teams-ctrl--active' : ''}`} onClick={handleScreenShare} title="Share screen"><IconScreenShare /></button>
          <button className={`teams-ctrl ${handRaised ? 'teams-ctrl--active' : ''}`} onClick={handleToggleHand} title={handRaised ? 'Lower hand' : 'Raise hand'}><IconHandRaise /></button>
          <div className="gm-more-anchor">
            <button className="teams-ctrl" onClick={() => setShowMore((v) => !v)} title="More options" aria-haspopup="menu" aria-expanded={showMore}><IconMore /></button>
            {showMore && (
              <div className="gm-more-menu" role="menu" onClick={() => setShowMore(false)}>
                <button className={`gm-more-item ${showWhiteboard ? 'gm-more-item--active' : ''}`} onClick={toggleWhiteboard}>
                  <IconWhiteboard /> {showWhiteboard ? 'Close whiteboard' : 'Open whiteboard'}
                </button>
                {isTrainer && (
                  <>
                    <button className="gm-more-item" onClick={handleMuteAll}><IconMuteAll /> Mute everyone</button>
                    {spotlightUserId && <button className="gm-more-item" onClick={handleClearSpotlight}><IconSpotlight /> Clear spotlight</button>}
                  </>
                )}
              </div>
            )}
          </div>
          <button className={`teams-ctrl teams-ctrl--side ${activeSidebar === 'people' ? 'teams-ctrl--active' : ''}`} onClick={() => toggleSidebar('people')} title="Participants">
            <IconPeople />{raisedHandCount > 0 && <span className="teams-badge-count">{raisedHandCount}</span>}
          </button>
          <button className={`teams-ctrl teams-ctrl--side ${activeSidebar === 'chat' ? 'teams-ctrl--active' : ''}`} onClick={() => toggleSidebar('chat')} title="Chat">
            <IconChat />{messages.length > 0 && activeSidebar !== 'chat' && <span className="teams-notif-dot" />}
          </button>
          {isTrainer
            ? <button className="teams-ctrl teams-ctrl--end" onClick={handleEndClass} title="End meeting"><IconLeave /><span>End</span></button>
            : <button className="teams-ctrl teams-ctrl--leave" onClick={handleLeave} title="Leave"><IconLeave /><span>Leave</span></button>
          }
        </div>
      </div>
    </div>
  );
}

function RemoteVideo({ pubId, display, stream, handRaised, onPin }) {
  const videoRef = useRef(null);

  // Callback ref: assigns srcObject immediately when the element mounts,
  // guaranteeing video plays even when the same stream object is reused
  // after pin/unpin (where the component unmounts and remounts).
  const setVideoRef = useCallback((el) => {
    videoRef.current = el;
    if (el && stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) return;

    // Re-assign if stream changed after initial mount
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {});
    }

    // When tracks are added to a live MediaStream after srcObject is already
    // assigned, some browsers won't auto-play the new tracks.
    const handleTrackAdded = () => {
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
      }
    };

    stream.addEventListener('addtrack', handleTrackAdded);

    // Also handle the case where tracks already exist but video isn't playing
    if (stream.getTracks().length > 0 && videoEl.paused) {
      videoEl.play().catch(() => {});
    }

    return () => {
      stream.removeEventListener('addtrack', handleTrackAdded);
    };
  }, [stream]);

  return (
    <div className="teams-tile" id={`remote-${pubId}`}>
      <video ref={setVideoRef} autoPlay playsInline />
      <div className="teams-tile__label"><span className="teams-tile__name">{display || 'Participant'}</span></div>
      {handRaised && <div className="teams-hand-badge"><IconHandRaise /></div>}
      {onPin && <button className="teams-pin-btn" onClick={onPin} title="Pin"><IconPin /></button>}
    </div>
  );
}

function PinnedVideo({ feed }) {
  const videoRef = useRef(null);

  const setVideoRef = useCallback((el) => {
    videoRef.current = el;
    if (el && feed.stream) {
      el.srcObject = feed.stream;
      el.play().catch(() => {});
    }
  }, [feed.stream]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !feed.stream) return;

    if (videoEl.srcObject !== feed.stream) {
      videoEl.srcObject = feed.stream;
      videoEl.play().catch(() => {});
    }

    const handleTrackAdded = () => {
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
      }
    };

    feed.stream.addEventListener('addtrack', handleTrackAdded);

    if (feed.stream.getTracks().length > 0 && videoEl.paused) {
      videoEl.play().catch(() => {});
    }

    return () => {
      feed.stream.removeEventListener('addtrack', handleTrackAdded);
    };
  }, [feed.stream]);

  return (
    <div className="teams-pinned-video">
      <video ref={setVideoRef} autoPlay playsInline muted={feed.type === 'local'} />
      <div className="teams-pinned-video__label"><span>{feed.display || 'Participant'}</span></div>
    </div>
  );
}