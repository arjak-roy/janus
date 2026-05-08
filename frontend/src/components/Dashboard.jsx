import React, { useState, useEffect } from 'react';
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
      const headers = { 'Content-Type': 'application/json' };
      if (API_SHARED_SECRET) {
        headers['x-api-secret'] = API_SHARED_SECRET;
      }
      const res = await fetch(`${BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}) // Let backend generate a room
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Failed to create room:', res.status, data);
        return;
      }
      const data = await res.json();
      if (data.success) {
        navigate(`/room/${data.room.janusId}`);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="meet-dashboard">
      <header className="meet-header">
        <div className="meet-logo">
          <span className="meet-logo-brand">GTS</span>
          <span className="meet-logo-text">Meet</span>
        </div>
        <div className="meet-header-right">
          <span className="meet-time">{currentTime}</span>
        </div>
      </header>

      <main className="meet-main-content">
        <div className="meet-hero-text">
          <h1>Premium video meetings.<br/>Now available for your team.</h1>
          <p>Secure, high-quality video conferencing built for teams. Start or join a meeting instantly with GTS Meet.</p>
          
          <div className="meet-action-area">
            <button className="meet-new-btn" onClick={handleCreateRoom} disabled={loading}>
              {loading ? (
                <><span className="meet-spinner"></span> Creating...</>
              ) : (
                <><span className="meet-new-btn-icon">＋</span> New meeting</>
              )}
            </button>
            
            <form className="meet-join-form" onSubmit={handleJoinById}>
              <div className="meet-input-wrapper">
                <span className="meet-input-icon">⌨️</span>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter a code or link"
                  className="meet-join-input"
                />
              </div>
              <button type="submit" className="meet-join-btn" disabled={!roomId.trim()}>Join</button>
            </form>
            {inputError && <p style={{ color: '#ea4335', fontSize: '0.85rem', marginTop: '0.5rem' }}>{inputError}</p>}
          </div>
          
          <div className="meet-divider"></div>
          <p className="meet-learn-more"><a href="#">Learn more</a> about GTS Meet</p>
        </div>

        <div className="meet-hero-image">
          {/* Placeholder for the carousel or illustration typical of Google Meet */}
          <div className="meet-illustration">
            <div className="meet-illustration-circles">
              <div className="circle circle-1"></div>
              <div className="circle circle-2"></div>
              <div className="circle circle-3"></div>
            </div>
            <p>Get a link you can share</p>
            <span>Click <strong>New meeting</strong> to get a link you can send to people you want to meet with</span>
          </div>
        </div>
      </main>
    </div>
  );
}
