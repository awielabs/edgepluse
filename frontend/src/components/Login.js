'use client';
import React, { useState } from 'react';
import { fetchApi } from '../lib/api';
import { GraduationCap, Lock, User, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchApi('/login', {
        method: 'POST',
        body: { username: username.trim(), password },
      });

      localStorage.setItem('ep_token', data.token);
      localStorage.setItem('ep_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Incorrect username or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '24px',
        padding: '40px 32px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        animation: 'scaleUp 0.35s ease-out'
      }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(99, 102, 241, 0.45)',
            marginBottom: '16px'
          }}>
            <GraduationCap size={34} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
            <span className="gradient-text">EduPulse</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Next-Gen Student Analytics & Parent Automated Alerts
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.18)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#fca5a5',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="glass-input"
                style={{ width: '100%', paddingLeft: '42px' }}
                placeholder="e.g. admin or faculty"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '8px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                className="glass-input"
                style={{ width: '100%', paddingLeft: '42px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '13px', fontSize: '15px', marginTop: '6px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (
              <>
                Sign In to EduPulse <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div style={{
          marginTop: '28px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Demo Sign In
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
              onClick={() => fillCredentials('admin', 'admin123')}
            >
              <ShieldCheck size={14} color="#818cf8" /> Admin Demo
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
              onClick={() => fillCredentials('faculty', 'faculty123')}
            >
              <UserCheck size={14} color="#38bdf8" /> Faculty Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
