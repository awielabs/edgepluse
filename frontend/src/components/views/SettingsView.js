'use client';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import {
  Settings,
  Mail,
  Smartphone,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  Sliders,
  Database,
  Cloud,
  RefreshCw
} from 'lucide-react';

export default function SettingsView({ addToast, refreshMeta }) {
  const [settings, setSettings] = useState(null);
  const [channels, setChannels] = useState({});
  const [dbMeta, setDbMeta] = useState(null);
  const [mongoUri, setMongoUri] = useState('');
  const [testingMongo, setTestingMongo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [res, metaRes] = await Promise.all([
        fetchApi('/settings'),
        fetchApi('/meta')
      ]);
      setSettings(res.settings);
      setChannels(res.channels);
      setDbMeta(metaRes);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestMongo = async (uriOverride) => {
    let target = (typeof uriOverride === 'string' ? uriOverride : mongoUri).trim();
    
    // Auto-extract mongodb+srv:// if surrounding text was copied
    const match = target.match(/(mongodb(?:\+srv)?:\/\/[^\s"'<>]+)/i);
    if (match) {
      target = match[1];
    }

    if (!target && !dbMeta?.has_mongo_uri) {
      addToast('Please enter your MongoDB Atlas connection string starting with mongodb+srv://', 'error');
      return;
    }

    setTestingMongo(true);
    try {
      const res = await fetchApi('/settings/mongodb', {
        method: 'POST',
        body: { uri: target || 'env' }
      });
      addToast(res.message, 'success');
      loadSettings();
      if (refreshMeta) refreshMeta();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setTestingMongo(false);
    }
  };


  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchApi('/settings', {
        method: 'PUT',
        body: settings
      });
      addToast(res.message, 'success');
      setChannels(res.channels);
      if (refreshMeta) refreshMeta();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        Loading institutional settings...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1>Institutional <span className="gradient-text">Configuration</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Fine-tune risk evaluation criteria, threshold parameters, and multi-channel notification gateways.
          </p>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {/* Institution & Alert Rules */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <Building size={20} color="#818cf8" />
          <h2 style={{ fontSize: '18px' }}>Institution &amp; Heuristic Alert Thresholds</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Institution Name
            </label>
            <input
              type="text"
              className="glass-input"
              style={{ width: '100%' }}
              value={settings.institution_name || ''}
              onChange={(e) => handleChange('institution_name', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Low Attendance Warning Threshold (%)
            </label>
            <input
              type="number"
              className="glass-input"
              style={{ width: '100%' }}
              value={settings.low_attendance || ''}
              onChange={(e) => handleChange('low_attendance', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Low Marks Warning Threshold (%)
            </label>
            <input
              type="number"
              className="glass-input"
              style={{ width: '100%' }}
              value={settings.low_marks || ''}
              onChange={(e) => handleChange('low_marks', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Minimum Passing Benchmark (%)
            </label>
            <input
              type="number"
              className="glass-input"
              style={{ width: '100%' }}
              value={settings.pass_mark || ''}
              onChange={(e) => handleChange('pass_mark', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Academic Performance Drop Alert (% Drop)
            </label>
            <input
              type="number"
              className="glass-input"
              style={{ width: '100%' }}
              value={settings.performance_drop || ''}
              onChange={(e) => handleChange('performance_drop', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Consecutive Absences Trigger (Days in a row)
            </label>
            <input
              type="number"
              className="glass-input"
              style={{ width: '100%' }}
              value={settings.repeated_absence || ''}
              onChange={(e) => handleChange('repeated_absence', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Automated Alert on Absence
            </label>
            <select
              className="glass-select"
              style={{ width: '100%' }}
              value={settings.auto_attendance_alert || '1'}
              onChange={(e) => handleChange('auto_attendance_alert', e.target.value)}
            >
              <option value="1">Enabled (Send alert automatically)</option>
              <option value="0">Disabled (Manual trigger only)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Automated Alert on Low Marks
            </label>
            <select
              className="glass-select"
              style={{ width: '100%' }}
              value={settings.auto_marks_alert || '1'}
              onChange={(e) => handleChange('auto_marks_alert', e.target.value)}
            >
              <option value="1">Enabled (Send alert automatically)</option>
              <option value="0">Disabled (Manual trigger only)</option>
            </select>
          </div>
        </div>
      </div>

      {/* MongoDB Atlas Database Engine */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={20} color="#34d399" />
            <h2 style={{ fontSize: '18px' }}>Database Engine: MongoDB Atlas</h2>
          </div>
          <span className={dbMeta?.mongo_connected ? 'pill pill-success' : 'pill pill-neutral'}>
            {dbMeta?.mongo_connected ? '🟢 Connected to MongoDB Atlas' : '⚪ Active: SQLite (Local Fallback)'}
          </span>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>
          Connect your Node.js and Express backend to a cloud-hosted <b>MongoDB Atlas</b> cluster. Paste your connection URI below or configure <code>MONGODB_URI</code> in <code>.env</code>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              MongoDB Atlas Connection String
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="glass-input"
                style={{ flex: 1, minWidth: '280px', fontFamily: 'monospace', fontSize: '13px' }}
                placeholder="mongodb+srv://edupulse_admin:xqAx9I1fxifYRjS3@cluster0.ey3rp.mongodb.net/edupulse?retryWrites=true&w=majority"
                value={mongoUri}
                onChange={(e) => setMongoUri(e.target.value)}
              />
              <button
                type="button"
                onClick={() => handleTestMongo()}
                className="btn-primary"
                disabled={testingMongo}
              >
                <Cloud size={16} />
                {testingMongo ? 'Verifying Cluster...' : 'Verify & Connect Atlas'}
              </button>
            </div>
            {dbMeta?.has_mongo_uri && !mongoUri && (
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#34d399' }}>✓ Connection string configured in .env:</span>
                <code style={{ fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>{dbMeta.mongo_uri_masked}</code>
                <button
                  type="button"
                  onClick={() => handleTestMongo('env')}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#818cf8',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  Test This Saved Connection
                </button>
              </div>
            )}
          </div>

          <div style={{
            fontSize: '12px',
            color: 'var(--text-dim)',
            background: 'rgba(0,0,0,0.25)',
            padding: '12px 14px',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cloud size={14} color="#38bdf8" />
              <span><b>Format Requirement:</b> Must start with <code>mongodb+srv://</code></span>
            </div>
            <div style={{ color: '#fbbf24', fontSize: '11.5px' }}>
              ⚠️ <b>Important:</b> If you see <i>"Could not connect / IP isn't whitelisted"</i>, log in to MongoDB Atlas &gt; <b>Network Access</b> &gt; Click <b>Add IP Address</b> &gt; Select <b>Allow Access from Anywhere (0.0.0.0/0)</b>.
            </div>
          </div>
        </div>
      </div>


      {/* Email (SMTP) Gateway */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail size={20} color="#818cf8" />
            <h2 style={{ fontSize: '18px' }}>Email Delivery Gateway (SMTP)</h2>
          </div>
          <span className={channels.email ? 'pill pill-success' : 'pill pill-neutral'}>
            {channels.email ? '🟢 Configured' : '⚪ Not Configured'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              SMTP Server Host
            </label>
            <input
              type="text"
              className="glass-input"
              style={{ width: '100%' }}
              placeholder="e.g. smtp.gmail.com"
              value={settings.smtp_host || ''}
              onChange={(e) => handleChange('smtp_host', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              SMTP Port
            </label>
            <input
              type="number"
              className="glass-input"
              style={{ width: '100%' }}
              placeholder="587 or 465"
              value={settings.smtp_port || ''}
              onChange={(e) => handleChange('smtp_port', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              SMTP Username
            </label>
            <input
              type="text"
              className="glass-input"
              style={{ width: '100%' }}
              placeholder="admin@institution.edu"
              value={settings.smtp_user || ''}
              onChange={(e) => handleChange('smtp_user', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              SMTP Password / App Secret
            </label>
            <input
              type="password"
              className="glass-input"
              style={{ width: '100%' }}
              placeholder="••••••••••••"
              value={settings.smtp_pass || ''}
              onChange={(e) => handleChange('smtp_pass', e.target.value)}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              From Address Header
            </label>
            <input
              type="text"
              className="glass-input"
              style={{ width: '100%' }}
              placeholder="EduPulse &lt;alerts@institution.edu&gt;"
              value={settings.smtp_from || ''}
              onChange={(e) => handleChange('smtp_from', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Twilio SMS & WhatsApp Gateway */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Smartphone size={20} color="#38bdf8" />
            <h2 style={{ fontSize: '18px' }}>SMS &amp; WhatsApp Gateways (Twilio)</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className={channels.sms ? 'pill pill-success' : 'pill pill-neutral'}>
              SMS: {channels.sms ? '🟢 Ready' : '⚪ Inactive'}
            </span>
            <span className={channels.whatsapp ? 'pill pill-success' : 'pill pill-neutral'}>
              WhatsApp: {channels.whatsapp ? '🟢 Ready' : '⚪ Inactive'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Twilio Account SID
            </label>
            <input
              type="text"
              className="glass-input"
              style={{ width: '100%' }}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={settings.twilio_sid || ''}
              onChange={(e) => handleChange('twilio_sid', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Twilio Auth Token
            </label>
            <input
              type="password"
              className="glass-input"
              style={{ width: '100%' }}
              placeholder="••••••••••••••••••••••••••••••••"
              value={settings.twilio_token || ''}
              onChange={(e) => handleChange('twilio_token', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              SMS Sender Number
            </label>
            <input
              type="text"
              className="glass-input"
              style={{ width: '100%' }}
              placeholder="+15550001111"
              value={settings.sms_from || ''}
              onChange={(e) => handleChange('sms_from', e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              WhatsApp Sender Number
            </label>
            <input
              type="text"
              className="glass-input"
              style={{ width: '100%' }}
              placeholder="+14155238886"
              value={settings.whatsapp_from || ''}
              onChange={(e) => handleChange('whatsapp_from', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button type="submit" className="btn-primary" disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </form>
  );
}
