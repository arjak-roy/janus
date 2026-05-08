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

export default function Dashboard() {
  const [roomId, setRoomId] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState('');
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', weekday: 'short', month: 'short', day: 'numeric' }));
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinById = (e) => {
    e.preventDefault();
    const trimmed = roomId.trim();
    if (!trimmed) return;
    setActionError('');
    if (!/^\d+$/.test(trimmed)) {
      setInputError('Room ID must be a number');
      return;
    }
    setInputError('');
    navigate(`/room/${trimmed}`);
  };

  const handleCreateRoom = async () => {
    try {
      setLoading(true);
      setActionError('');
      setInputError('');
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
      if (data.success) {
        navigate(`/room/${data.room.janusId}`);
        return;
      }
      throw new Error('Meeting creation did not return a valid join link.');
    } catch (err) {
      console.error('Failed to create room:', err);
      setActionError(err instanceof Error ? err.message : 'Unable to create a meeting right now.');
    } finally {
      setLoading(false);
    }
  };

  const errorText = inputError || actionError;

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

          <div className="meet-action-row">
            <button className="meet-new-btn" onClick={handleCreateRoom} disabled={loading}>
              {loading ? <><span className="meet-spinner" /> Creating...</> : 'New meeting'}
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
              <button type="submit" className="meet-join-btn" disabled={!roomId.trim()}>
                Join
              </button>
            </form>
          </div>

          {errorText && <p className="meet-error">{errorText}</p>}
        </div>
      </main>
    </div>
  );
}
