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

const HERO_NOTES = [
  { title: 'Spotlight stage', body: 'Pin the active speaker or presentation feed without leaving the room.' },
  { title: 'Host controls', body: 'Mute-all, remove participants, and manage raised hands in real time.' },
  { title: 'Shared board', body: 'Switch from camera grid to collaborative whiteboard when the session calls for it.' },
];

const PRODUCT_PILLARS = [
  { label: 'Built for', value: 'Workshops, interviews, and coaching' },
  { label: 'Backed by', value: 'Janus media sessions with direct links' },
  { label: 'Experience', value: 'Standalone GTS Meet workspace' },
];

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

  return (
    <div className="meet-dashboard">
      <div className="meet-dashboard__ambient meet-dashboard__ambient--left" />
      <div className="meet-dashboard__ambient meet-dashboard__ambient--right" />

      <header className="meet-header">
        <div className="meet-logo">
          <span className="meet-logo-mark" />
          <div className="meet-logo-copy">
            <span className="meet-logo-brand">GTS Meet</span>
            <span className="meet-logo-text">Standalone meeting studio</span>
          </div>
        </div>
        <div className="meet-header-right">
          <span className="meet-header-chip">Standalone workspace</span>
          <span className="meet-time">{currentTime}</span>
        </div>
      </header>

      <main className="meet-main-content">
        <div className="meet-hero-text">
          <span className="meet-eyebrow">Standalone collaboration product</span>
          <h1>Run live sessions inside a dedicated GTS Meet meeting environment.</h1>
          <p>
            Launch meetings for workshops, interviews, and coaching with spotlight controls,
            whiteboard, chat, hand raise, and screen share in one focused product shell.
          </p>

          <div className="meet-pillars">
            {PRODUCT_PILLARS.map((pillar) => (
              <div className="meet-pillar" key={pillar.label}>
                <span>{pillar.label}</span>
                <strong>{pillar.value}</strong>
              </div>
            ))}
          </div>

          <section className="meet-action-surface">
            <div className="meet-action-surface__head">
              <div>
                <h2>Start or join a meeting</h2>
                <p>Meeting IDs are numeric and open directly into the standalone GTS Meet stage.</p>
              </div>
              <span className={`meet-status-chip ${loading ? 'meet-status-chip--busy' : ''}`}>
                {loading ? 'Provisioning meeting' : 'Ready'}
              </span>
            </div>

            <div className="meet-action-area">
              <button className="meet-new-btn" onClick={handleCreateRoom} disabled={loading}>
                {loading ? (
                  <><span className="meet-spinner"></span> Creating meeting</>
                ) : (
                  <><span className="meet-new-btn-icon">+</span> New meeting</>
                )}
              </button>

              <form className="meet-join-form" onSubmit={handleJoinById}>
                <label className="meet-input-wrapper">
                  <span className="meet-input-label">Meeting ID</span>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter numeric meeting code"
                    className="meet-join-input"
                  />
                </label>
                <button type="submit" className="meet-join-btn" disabled={!roomId.trim()}>
                  Join meeting
                </button>
              </form>
            </div>

            {inputError ? <p className="meet-inline-status meet-inline-status--error">{inputError}</p> : null}
            {actionError ? <p className="meet-inline-status meet-inline-status--error">{actionError}</p> : null}
          </section>
        </div>

        <div className="meet-hero-image">
          <div className="meet-stage-card">
            <div className="meet-stage-card__halo"></div>
            <div className="meet-stage-window">
              <div className="meet-stage-window__header">
                <div>
                  <span className="meet-stage-window__eyebrow">GTS Meet stage</span>
                  <strong className="meet-stage-window__title">Session control deck</strong>
                </div>
                <span className="meet-stage-window__room">meeting / {roomId.trim() || 'auto-generated'}</span>
              </div>

              <div className="meet-stage-canvas">
                <div className="meet-stage-primary">
                  <span className="meet-stage-primary__badge">Live workspace</span>
                  <div className="meet-stage-avatar">GM</div>
                  <h3>Designed as its own product, not an embedded portal page.</h3>
                  <p>
                    The standalone surface stays focused on media, moderation, and collaboration without academy chrome around it.
                  </p>
                </div>

                <div className="meet-stage-filmstrip">
                  {HERO_NOTES.map((note) => (
                    <article className="meet-film-tile" key={note.title}>
                      <span className="meet-film-tile__index">0{HERO_NOTES.indexOf(note) + 1}</span>
                      <strong>{note.title}</strong>
                      <p>{note.body}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="meet-stage-footer">
                <span>Meeting launch</span>
                <span>Spotlight and hand raise</span>
                <span>Screen share and whiteboard</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
