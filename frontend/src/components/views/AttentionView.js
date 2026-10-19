'use client';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import FilterBar from '../FilterBar';
import {
  AlertTriangle,
  Send,
  ExternalLink,
  CheckCircle,
  Activity,
  Award,
  BellRing,
  Sparkles
} from 'lucide-react';

export default function AttentionView({ meta, setActiveTab, setSelectedStudentId, addToast }) {
  const [filters, setFilters] = useState({ department: '', year: '', section: '' });
  const [attentionList, setAttentionList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifyingId, setNotifyingId] = useState(null);

  const loadAttention = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      ).toString();
      const res = await fetchApi(`/attention?${q}`);
      setAttentionList(res);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttention();
  }, [filters]);

  const handleNotifyParent = async (studentId, e) => {
    e.stopPropagation();
    setNotifyingId(studentId);
    try {
      const res = await fetchApi(`/notifications/send-attention/${studentId}`, {
        method: 'POST'
      });
      addToast(res.message || 'Parent intervention alert queued successfully.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setNotifyingId(null);
    }
  };

  const highRiskCount = attentionList.filter((a) => a.level === 'high').length;
  const mediumRiskCount = attentionList.filter((a) => a.level === 'medium').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1>Intervention <span className="gradient-text">Priority Radar</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Automated heuristic detection identifying students struggling with attendance deficit or failing grade marks.
          </p>
        </div>

        {attentionList.length > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="pill pill-danger" style={{ fontSize: '12.5px', padding: '6px 12px' }}>
              🔴 High Risk: {highRiskCount}
            </span>
            <span className="pill pill-warning" style={{ fontSize: '12.5px', padding: '6px 12px' }}>
              🟠 Medium Risk: {mediumRiskCount}
            </span>
          </div>
        )}
      </div>

      <FilterBar meta={meta} filters={filters} setFilters={setFilters} />

      {/* List */}
      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Evaluating student performance matrices...
        </div>
      ) : attentionList.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#34d399'
          }}>
            <Sparkles size={30} />
          </div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>All Students Are On Track!</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto', fontSize: '14px' }}>
            No students currently violate low attendance or low mark safety thresholds for this selected filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {attentionList.map((item) => {
            const isHigh = item.level === 'high';
            return (
              <div
                key={item.id}
                className="glass-card"
                onClick={() => {
                  setSelectedStudentId(item.id);
                  setActiveTab('performance');
                }}
                style={{
                  cursor: 'pointer',
                  borderLeft: `4px solid ${isHigh ? '#ef4444' : '#f59e0b'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  background: isHigh
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: '#ffffff' }}>
                        {item.student_name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{item.register_no}</span>
                        {' • '}{item.department} {item.year}-{item.section}
                      </div>
                    </div>

                    <span className={isHigh ? 'pill pill-danger' : 'pill pill-warning'}>
                      {isHigh ? '🔴 High Risk' : '🟠 Medium Risk'}
                    </span>
                  </div>

                  {/* Attendance & Marks stats */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    margin: '12px 0',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '8px 12px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Attendance</div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: (item.attendance ?? 100) < 75 ? '#f87171' : '#34d399'
                      }}>
                        {item.attendance != null ? `${item.attendance}%` : '–'}
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Average Mark</div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: (item.average_mark ?? 100) < 50 ? '#f87171' : '#34d399'
                      }}>
                        {item.average_mark != null ? `${item.average_mark}%` : '–'}
                      </div>
                    </div>
                  </div>

                  {/* Reasons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Triggered Reasons:</div>
                    {item.reasons.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#fca5a5' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444' }} />
                        {r}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <button
                    type="button"
                    onClick={(e) => handleNotifyParent(item.id, e)}
                    className="btn-secondary btn-sm"
                    disabled={notifyingId === item.id}
                    style={{ color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                  >
                    <Send size={13} /> {notifyingId === item.id ? 'Sending...' : 'Notify Parent'}
                  </button>

                  <span style={{ fontSize: '12px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Dossier <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
