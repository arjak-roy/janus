import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function resolveBackendUrl() {
  const configured = (import.meta.env.VITE_BACKEND_URL || '').trim();
  if (!configured) return '';
  const isLocalPage = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  if (!isLocalPage && /localhost|127\.0\.0\.1/.test(configured)) {
    console.warn('[Dashboard] Ignoring localhost backend URL for LAN client; falling back to same-origin /api.');
    return '';
  }
  return configured;
}

const BACKEND_URL = resolveBackendUrl();
const API_SHARED_SECRET = (import.meta.env.VITE_API_SHARED_SECRET || '').trim();
const PROFILE_STORAGE_KEY = 'gts-meet-profile';

function createParticipantId(role) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${role}-${Date.now().toString(36)}-${suffix}`;
}

function loadProfile() {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const displayName = typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '';
    const role = parsed.role === 'trainer' ? 'trainer' : 'candidate';
    const userId = typeof parsed.userId === 'string' ? parsed.userId.trim() : '';
    return { displayName, role, userId };
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    return;
  }
}

export default function Dashboard() {
  const savedProfile = loadProfile();
  const [roomId, setRoomId] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inputError, setInputError] = useState('');
  const [actionError, setActionError] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null); // { janusId, token }
  const [linkCopied, setLinkCopied] = useState(false);
  const [participant, setParticipant] = useState({
    displayName: savedProfile?.displayName || '',
    role: savedProfile?.role || 'candidate',
    userId: savedProfile?.userId || ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', weekday: 'short', month: 'short', day: 'numeric' }));
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const ensureParticipantProfile = () => {
    const displayName = participant.displayName.trim();
    if (!displayName) {
      throw new Error('Enter your name before joining a meeting.');
    }

    const role = participant.role === 'trainer' ? 'trainer' : 'candidate';
    const userId = participant.userId || createParticipantId(role);
    const normalized = { displayName, role, userId };
    setParticipant(normalized);
    saveProfile(normalized);
    return normalized;
  };

  const requestParticipantToken = async (targetRoomId, profile) => {
    const headers = { 'Content-Type': 'application/json' };
    if (API_SHARED_SECRET) {
      headers['x-api-secret'] = API_SHARED_SECRET;
    }

    const tokenResponse = await fetch(`${BACKEND_URL}/api/rooms/${targetRoomId}/token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: profile.userId,
        displayName: profile.displayName,
        role: profile.role
      })
    });

    if (!tokenResponse.ok) {
      const data = await tokenResponse.json().catch(() => ({}));
      throw new Error(data.error || 'Unable to create a secure join token.');
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData?.success || !tokenData?.token) {
      throw new Error('Token service returned an invalid response.');
    }

    return tokenData.token;
  };

  const handleJoinById = async (e) => {
    e.preventDefault();
    const trimmed = roomId.trim();
    if (!trimmed) return;
    setActionError('');
    if (!/^\d+$/.test(trimmed)) {
      setInputError('Room ID must be a number');
      return;
    }

    try {
      setJoining(true);
      setInputError('');

      const profile = ensureParticipantProfile();
      const roomResponse = await fetch(`${BACKEND_URL}/api/rooms/${trimmed}`);
      if (!roomResponse.ok) {
        const data = await roomResponse.json().catch(() => ({}));
        throw new Error(data.error || 'Meeting not found. Check the room code and try again.');
      }

      const roomData = await roomResponse.json();
      const targetRoomId = roomData?.room?.janusId || trimmed;
      const token = await requestParticipantToken(targetRoomId, profile);
      navigate(`/room/${targetRoomId}?token=${encodeURIComponent(token)}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to join this meeting right now.');
    } finally {
      setJoining(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      setCreating(true);
      setActionError('');
      setInputError('');

      const profile = ensureParticipantProfile();
      const headers = { 'Content-Type': 'application/json' };
      if (API_SHARED_SECRET) {
        headers['x-api-secret'] = API_SHARED_SECRET;
      }
      const res = await fetch(`${BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to create a meeting right now.');
      }
      const data = await res.json();
      if (data.success && data.room?.janusId) {
        const token = await requestParticipantToken(data.room.janusId, profile);
        setCreatedRoom({ janusId: data.room.janusId, token });
        setLinkCopied(false);
        return;
      }
      throw new Error('Meeting creation did not return a valid join link.');
    } catch (err) {
      console.error('Failed to create room:', err);
      setActionError(err instanceof Error ? err.message : 'Unable to create a meeting right now.');
    } finally {
      setCreating(false);
    }
  };

  const errorText = inputError || actionError;

  const createdRoomLink = createdRoom
    ? `${window.location.origin}/room/${createdRoom.janusId}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(createdRoomLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // Fallback for older browsers / insecure contexts
      const textarea = document.createElement('textarea');
      textarea.value = createdRoomLink;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  const handleJoinCreatedRoom = () => {
    if (!createdRoom) return;
    navigate(`/room/${createdRoom.janusId}?token=${encodeURIComponent(createdRoom.token)}`);
  };

  return (
    <div className="meet-dashboard">
      <header className="meet-header">
        <div className="meet-logo">
          <span className="meet-logo-mark" />
          <span className="meet-logo-brand">GTS Meet</span>
        </div>
        <span className="meet-time">{currentTime}</span>
      </header>

      <main className="meet-main-content">
        <div className="meet-center-card">
          <h1>Video calls and meetings for everyone</h1>
          <p>Connect, collaborate, and host sessions from anywhere with GTS Meet.</p>

          <div className="meet-profile-row">
            <label className="meet-field" htmlFor="participant-name">
              <span>Your name</span>
              <input
                id="participant-name"
                type="text"
                value={participant.displayName}
                onChange={(e) => {
                  setParticipant((previous) => ({ ...previous, displayName: e.target.value }));
                  setActionError('');
                }}
                placeholder="Enter display name"
                maxLength={64}
                autoComplete="name"
              />
            </label>

            <label className="meet-field meet-field--compact" htmlFor="participant-role">
              <span>Role</span>
              <select
                id="participant-role"
                value={participant.role}
                onChange={(e) => {
                  const nextRole = e.target.value === 'trainer' ? 'trainer' : 'candidate';
                  setParticipant((previous) => ({ ...previous, role: nextRole, userId: '' }));
                  setActionError('');
                }}
              >
                <option value="candidate">Participant</option>
                <option value="trainer">Host</option>
              </select>
            </label>
          </div>

          <div className="meet-action-row">
            <button className="meet-new-btn" onClick={handleCreateRoom} disabled={creating || joining}>
              {creating ? <><span className="meet-spinner" /> Creating...</> : 'New meeting'}
            </button>

            <span className="meet-divider" />

            <form className="meet-join-form" onSubmit={handleJoinById}>
              <input
                type="text"
                value={roomId}
                onChange={(e) => { setRoomId(e.target.value); setInputError(''); }}
                placeholder="Enter a code"
                className="meet-join-input"
              />
              <button type="submit" className="meet-join-btn" disabled={!roomId.trim() || creating || joining}>
                {joining ? 'Joining...' : 'Join'}
              </button>
            </form>
          </div>

          {errorText && <p className="meet-error">{errorText}</p>}

          {createdRoom && (
            <div className="meet-share-card">
              <h3>Your meeting is ready</h3>
              <p className="meet-share-desc">Share this link with others you want in the meeting. Save it for later use.</p>
              <div className="meet-share-link-row">
                <input className="meet-share-link" readOnly value={createdRoomLink} onClick={(e) => e.target.select()} />
                <button className="meet-copy-btn" onClick={handleCopyLink}>
                  {linkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="meet-share-actions">
                <button className="meet-join-now-btn" onClick={handleJoinCreatedRoom}>Join now</button>
                <button className="meet-dismiss-btn" onClick={() => setCreatedRoom(null)}>Dismiss</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
