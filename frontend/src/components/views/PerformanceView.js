'use client';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import {
  LineChart,
  User,
  BookOpen,
  Calendar,
  AlertTriangle,
  Award,
  Activity,
  CheckCircle2,
  XCircle,
  Mail,
  Phone
} from 'lucide-react';

export default function PerformanceView({ studentId, setSelectedStudentId, addToast }) {
  const [students, setStudents] = useState([]);
  const [currentId, setCurrentId] = useState(studentId || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load student list for selector
    fetchApi('/students')
      .then((res) => {
        setStudents(res);
        if (!currentId && res.length > 0) {
          setCurrentId(res[0].id);
        }
      })
      .catch((err) => addToast(err.message, 'error'));
  }, []);

  useEffect(() => {
    if (studentId) setCurrentId(studentId);
  }, [studentId]);

  useEffect(() => {
    if (!currentId) return;
    setLoading(true);
    fetchApi(`/performance/${currentId}`)
      .then((res) => setData(res))
      .catch((err) => addToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [currentId]);

  const st = data?.student;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1>Student Performance <span className="gradient-text">Dossier</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Comprehensive longitudinal academic metrics, attendance heatmaps, and subject mastery.
          </p>
        </div>

        <div style={{ minWidth: '260px' }}>
          <select
            className="glass-select"
            style={{ width: '100%' }}
            value={currentId}
            onChange={(e) => {
              setCurrentId(e.target.value);
              if (setSelectedStudentId) setSelectedStudentId(e.target.value);
            }}
          >
            <option value="">Select a student...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.student_name} ({s.register_no})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Retrieving academic transcript...
        </div>
      ) : !data || !st ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Please select a student from the dropdown above to view their dossier.
        </div>
      ) : (
        <>
          {/* Profile Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#ffffff'
                }}>
                  {st.student_name.slice(0, 1)}
                </div>

                <div>
                  <h2 style={{ fontSize: '22px', marginBottom: '4px' }}>{st.student_name}</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 600 }}>{st.register_no}</span>
                    <span>•</span>
                    <span>{st.department}</span>
                    <span>•</span>
                    <span>Year {st.year} - Section {st.section}</span>
                  </div>
                </div>
              </div>

              {/* Parent Info */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '12.5px'
              }}>
                <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>Parent / Guardian: <b>{st.parent_name || 'N/A'}</b></div>
                <div style={{ display: 'flex', gap: '14px', color: '#cbd5e1' }}>
                  {st.parent_email && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={13} color="#818cf8" /> {st.parent_email}
                    </span>
                  )}
                  {st.parent_phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} color="#34d399" /> {st.parent_phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="glass-card">
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Overall Average</span>
              <div style={{
                fontSize: '26px',
                fontWeight: 800,
                marginTop: '4px',
                color: (data.overall ?? 100) < 50 ? '#f87171' : '#34d399'
              }}>
                {data.overall != null ? `${data.overall}%` : '–'}
              </div>
            </div>

            <div className="glass-card">
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Attendance Ratio</span>
              <div style={{
                fontSize: '26px',
                fontWeight: 800,
                marginTop: '4px',
                color: (data.attendance ?? 100) < 75 ? '#f87171' : '#38bdf8'
              }}>
                {data.attendance != null ? `${data.attendance}%` : '–'}
              </div>
            </div>

            <div className="glass-card">
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Subjects Passed</span>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#c084fc' }}>
                {data.subjects.length ? `${data.passed} / ${data.subjects.length}` : '–'}
              </div>
            </div>

            <div className="glass-card">
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Deficit Subjects</span>
              <div style={{
                fontSize: '15px',
                fontWeight: 700,
                marginTop: '8px',
                color: data.attention.length > 0 ? '#ef4444' : '#34d399'
              }}>
                {data.attention.length > 0 ? data.attention.join(', ') : 'None (All Clear)'}
              </div>
            </div>
          </div>

          {/* Attention Reasons if any */}
          {data.reasons?.length > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertTriangle size={24} color="#f87171" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#fca5a5', marginBottom: '2px' }}>
                  Student Requires Academic &amp; Attendance Intervention
                </div>
                <div style={{ fontSize: '13px', color: '#fecaca' }}>
                  {data.reasons.join(' • ')}
                </div>
              </div>
            </div>
          )}

          {/* Subject Mastery Meters */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '16px' }}>Subject-wise Mastery</h3>
            {data.subjects.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '13.5px' }}>No exam marks recorded yet for this student.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {data.subjects.map((subj) => (
                  <div key={subj.subject}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600 }}>{subj.subject}</span>
                      <span style={{
                        fontWeight: 700,
                        color: subj.passed ? '#34d399' : '#f87171'
                      }}>
                        {subj.percentage}% {subj.passed ? '(Pass)' : '(Fail)'}
                      </span>
                    </div>

                    <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, subj.percentage)}%`,
                        background: subj.passed
                          ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                          : 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 14-Day Attendance Heatmap */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '12px' }}>14-Day Attendance Heatmap</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Chronological roll record leading up to the most recent school day.
            </p>

            {data.trend.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '13.5px' }}>No attendance sessions logged yet.</p>
            ) : (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {data.trend.map((t, idx) => {
                    const isPresent = t.status === 'Present';
                    return (
                      <div
                        key={idx}
                        title={`${t.date}: ${t.status}`}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isPresent ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                          border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isPresent ? '#34d399' : '#f87171',
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        {isPresent ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }} /> Present
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ef4444' }} /> Absent
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
