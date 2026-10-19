'use client';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import FilterBar from '../FilterBar';
import {
  Users,
  UserCheck,
  UserX,
  Activity,
  Award,
  AlertTriangle,
  BellRing,
  Mail,
  MessageSquare,
  Smartphone,
  ArrowRight,
  TrendingUp,
  Building,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function DashboardView({ meta, setActiveTab, addToast, user }) {
  const [filters, setFilters] = useState({ department: '', year: '', section: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      ).toString();
      const res = await fetchApi(`/dashboard?${q}`);
      setData(res);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [filters]);

  const channels = data?.channels || meta?.channels || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>
            Academic <span className="gradient-text">Command Center</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Real-time student progress monitoring, automatic risk alerts, and parent notification matrix.
          </p>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('attendance')}
            className="btn-primary btn-sm"
          >
            <UserCheck size={16} /> Mark Attendance
          </button>
          <button
            onClick={() => setActiveTab('marks')}
            className="btn-secondary btn-sm"
          >
            <Award size={16} /> Record Marks
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar meta={meta} filters={filters} setFilters={setFilters} />

      {/* Channel Diagnostics Banner */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8'
          }}>
            <BellRing size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#ffffff' }}>
              Automated Alert Dispatch Engine
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Notifications are triggered automatically on student absence or poor exam scores
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '10px',
            background: channels.email ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${channels.email ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            fontSize: '12.5px'
          }}>
            <Mail size={15} color={channels.email ? '#34d399' : '#94a3b8'} />
            <span>Email (SMTP)</span>
            {channels.email ? <CheckCircle2 size={14} color="#34d399" /> : <AlertCircle size={14} color="#94a3b8" />}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '10px',
            background: channels.sms ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${channels.sms ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            fontSize: '12.5px'
          }}>
            <Smartphone size={15} color={channels.sms ? '#34d399' : '#94a3b8'} />
            <span>SMS (Twilio)</span>
            {channels.sms ? <CheckCircle2 size={14} color="#34d399" /> : <AlertCircle size={14} color="#94a3b8" />}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '10px',
            background: channels.whatsapp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${channels.whatsapp ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
            fontSize: '12.5px'
          }}>
            <MessageSquare size={15} color={channels.whatsapp ? '#34d399' : '#94a3b8'} />
            <span>WhatsApp (Twilio)</span>
            {channels.whatsapp ? <CheckCircle2 size={14} color="#34d399" /> : <AlertCircle size={14} color="#94a3b8" />}
          </div>

          {user?.role === 'admin' && (!channels.email || !channels.sms || !channels.whatsapp) && (
            <button
              onClick={() => setActiveTab('settings')}
              className="btn-secondary btn-sm"
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
            >
              Configure in Settings
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px'
      }}>
        {/* Total Students */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Students</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800 }}>
            {loading ? '...' : (data?.total ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Enrolled & active</div>
        </div>

        {/* Present Today */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Present Today</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#34d399' }}>
            {loading ? '...' : (data?.present ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Recorded attendance</div>
        </div>

        {/* Absent Today */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Absent Today</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
              <UserX size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f87171' }}>
            {loading ? '...' : (data?.absent ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Daily absence count</div>
        </div>

        {/* Avg Attendance */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Avg Attendance</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
              <Activity size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#38bdf8' }}>
            {loading ? '...' : (data?.avg_attendance != null ? `${data.avg_attendance}%` : '–')}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Overall attendance rate</div>
        </div>

        {/* Avg Performance */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Avg Score</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#c084fc' }}>
            {loading ? '...' : (data?.avg_performance != null ? `${data.avg_performance}%` : '–')}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Cumulative academic avg</div>
        </div>

        {/* Requiring Attention */}
        <div
          className="glass-card"
          onClick={() => setActiveTab('attention')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            cursor: 'pointer',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.08)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#fca5a5', fontWeight: 600 }}>Needs Attention</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.25)', color: '#ef4444' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444' }}>
            {loading ? '...' : (data?.attention ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View at-risk students <ArrowRight size={13} />
          </div>
        </div>

        {/* Parent Alerts Sent */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Alerts Sent</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <BellRing size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>
            {loading ? '...' : (data?.alerts ?? 0)}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Dispatched via gateway</div>
        </div>
      </div>

      {/* Department Distribution & Operational Flow */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Department Distribution */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Building size={20} color="#818cf8" />
            <h3 style={{ margin: 0 }}>Department Distribution</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data?.departments?.length ? (
              data.departments.map((dept) => {
                const totalCount = data.total || 1;
                const pct = Math.round((dept.c / totalCount) * 100);
                return (
                  <div key={dept.department}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{dept.department}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{dept.c} students ({pct}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%)',
                        borderRadius: '3px'
                      }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '13px', padding: '16px 0' }}>
                No students enrolled in this selection.
              </div>
            )}
          </div>
        </div>

        {/* Workflow Guide */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <TrendingUp size={20} color="#34d399" />
              <h3 style={{ margin: 0 }}>Automated Intervention Workflow</h3>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '16px' }}>
              EduPulse analyzes student attendance streaks and exam performance thresholds on every entry. When a student drops below safety parameters, intelligent parent alerts are automatically queued across configured communication gateways.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                <span className="pill pill-neutral">1</span> <b>Batch Enrollment</b> via CSV or manual addition
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                <span className="pill pill-neutral">2</span> <b>Daily Roll Call</b> with 1-click absent triggers
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                <span className="pill pill-neutral">3</span> <b>Academic Examination</b> performance analytics
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                <span className="pill pill-neutral">4</span> <b>Multi-Channel Notification</b> delivery to parents
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setActiveTab('students')}
              className="btn-secondary"
              style={{ width: '100%', fontSize: '13px' }}
            >
              Open Student Registry <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
