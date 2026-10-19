'use client';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter
} from 'lucide-react';

export default function NotificationsView({ addToast }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(
        Object.entries({ status: statusFilter, channel: channelFilter }).filter(([, v]) => v)
      ).toString();
      const res = await fetchApi(`/notifications?${q}`);
      setNotifications(res);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [statusFilter, channelFilter]);

  const handleRetry = async (id) => {
    setRetryingId(id);
    try {
      const res = await fetchApi(`/notifications/${id}/retry`, { method: 'POST' });
      addToast(`Delivery status: ${res.status.replace('_', ' ')}`, res.status === 'sent' ? 'success' : 'info');
      loadNotifications();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1>Parent Notification <span className="gradient-text">Matrix</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Live communication trail for dispatched emails, SMS, and WhatsApp alerts with failure tracking &amp; 1-click retry.
          </p>
        </div>

        <button onClick={loadNotifications} className="btn-secondary btn-sm">
          <RefreshCw size={14} /> Refresh Feed
        </button>
      </div>

      {/* Filter Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '14px 18px',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '13px' }}>
          <Filter size={15} /> Filter By:
        </div>

        <select
          className="glass-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Delivery Statuses</option>
          <option value="sent">Sent</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="not_configured">Not Configured</option>
        </select>

        <select
          className="glass-select"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
        >
          <option value="">All Channels</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>

      {/* Notifications Table */}
      <div className="glass-table-wrap">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Parent</th>
              <th>Alert Type</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Date / Time</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Loading notification telemetry...
                </td>
              </tr>
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No notifications recorded yet matching these filters.
                </td>
              </tr>
            ) : (
              notifications.map((n) => {
                const isSent = n.status === 'sent';
                const isFailed = n.status === 'failed';
                const isNotConfigured = n.status === 'not_configured';
                const isPending = n.status === 'pending';

                return (
                  <tr key={n.id}>
                    <td style={{ fontWeight: 600 }}>{n.student_name || '–'}</td>
                    <td>{n.parent_name || 'Parent'}</td>
                    <td>
                      <span className="pill pill-neutral">{n.type}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        {n.channel === 'email' && <Mail size={14} color="#818cf8" />}
                        {n.channel === 'sms' && <Smartphone size={14} color="#38bdf8" />}
                        {n.channel === 'whatsapp' && <MessageSquare size={14} color="#34d399" />}
                        <span style={{ textTransform: 'capitalize' }}>{n.channel}</span>
                      </div>
                    </td>
                    <td>
                      {isSent && <span className="pill pill-success">✅ Sent</span>}
                      {isPending && <span className="pill pill-warning">⏳ Pending</span>}
                      {isFailed && <span className="pill pill-danger">❌ Failed</span>}
                      {isNotConfigured && <span className="pill pill-neutral">⚙️ Not Configured</span>}

                      {n.error && !isSent && (
                        <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px', maxWidth: '240px' }}>
                          {n.error}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      {n.created_at ? new Date(n.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '–'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {(isFailed || isNotConfigured || isPending) && (
                        <button
                          onClick={() => handleRetry(n.id)}
                          className="btn-secondary btn-sm"
                          disabled={retryingId === n.id}
                          style={{ padding: '4px 10px', fontSize: '11.5px' }}
                        >
                          <RefreshCw size={12} className={retryingId === n.id ? 'spin' : ''} />
                          {retryingId === n.id ? 'Retrying...' : 'Retry'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
