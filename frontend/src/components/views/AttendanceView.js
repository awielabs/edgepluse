'use client';
import React, { useState } from 'react';
import { fetchApi } from '../../lib/api';
import FilterBar from '../FilterBar';
import confetti from 'canvas-confetti';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Save,
  UserCheck,
  Clock,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export default function AttendanceView({ meta, addToast }) {
  const [filters, setFilters] = useState({ department: '', year: '', section: '' });
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAttendance = async (silent = false) => {
    if (!filters.department || !filters.year || !filters.section) {
      if (!silent) addToast('Please select department, year, and section first.', 'error');
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({ ...filters, date }).toString();
      const res = await fetchApi(`/attendance?${q}`);
      setStudents(res.students.map((s) => ({ ...s, status: s.status || 'Present' })));
      setIsSaved(res.saved);
    } catch (err) {
      if (!silent) addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (filters.department && filters.year && filters.section) {
      loadAttendance(true);
    }
  }, [filters.department, filters.year, filters.section, date]);

  const setStudentStatus = (index, status) => {
    const updated = [...students];
    updated[index].status = status;
    setStudents(updated);
  };

  const markAllPresent = () => {
    setStudents(students.map((s) => ({ ...s, status: 'Present' })));
    addToast('All students marked as Present.', 'info');
  };

  const handleSaveAttendance = async () => {
    if (!students.length) return;
    setSaving(true);
    try {
      const res = await fetchApi('/attendance', {
        method: 'POST',
        body: {
          date,
          records: students.map((s) => ({ student_id: s.id, status: s.status }))
        }
      });

      const alertMsg = res.alerts
        ? ` (${res.alerts} automated parent alert(s) queued)`
        : '';
      addToast(`${res.message}${alertMsg}`, 'success');
      setIsSaved(true);

      // Trigger fun confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch {}
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter((s) => s.status === 'Present').length;
  const absentCount = students.filter((s) => s.status === 'Absent').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1>Attendance <span className="gradient-text">Register</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Daily attendance logging. Unexcused absences automatically trigger parent notification dispatch.
          </p>
        </div>

        {students.length > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={markAllPresent} className="btn-secondary">
              <CheckCircle2 size={16} color="#34d399" /> Mark All Present
            </button>
            <button onClick={handleSaveAttendance} className="btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>

      {/* Filter & Date Bar */}
      <FilterBar meta={meta} filters={filters} setFilters={setFilters} required={true}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="#94a3b8" />
          <input
            type="date"
            className="glass-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <button onClick={loadAttendance} className="btn-primary" disabled={loading}>
          {loading ? 'Fetching...' : 'Show Class List'}
        </button>
      </FilterBar>

      {/* Already Saved Status Banner */}
      {isSaved && (
        <div style={{
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13.5px',
          color: '#7dd3fc'
        }}>
          <Sparkles size={18} />
          Attendance has already been recorded for this date. You may modify records and re-save if needed.
        </div>
      )}

      {/* Live Counter Badge */}
      {students.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '12px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Class Summary:</span>
          <span className="pill pill-neutral">Total: {students.length}</span>
          <span className="pill pill-success">🟢 Present: {presentCount}</span>
          <span className="pill pill-danger">🔴 Absent: {absentCount}</span>
        </div>
      )}

      {/* Roster Table */}
      <div className="glass-table-wrap">
        <table className="glass-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>#</th>
              <th>Student Name</th>
              <th>Register Number</th>
              <th style={{ textAlign: 'right', paddingRight: '28px' }}>Attendance Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Loading class roster...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Select department, year, section and click &quot;Show Class List&quot; to begin.
                </td>
              </tr>
            ) : (
              students.map((st, idx) => (
                <tr key={st.id}>
                  <td style={{ color: 'var(--text-dim)' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{st.student_name}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                      {st.register_no}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                    <div className="toggle-btn-group">
                      <button
                        type="button"
                        className={`toggle-btn ${st.status === 'Present' ? 'present-active' : ''}`}
                        onClick={() => setStudentStatus(idx, 'Present')}
                      >
                        <CheckCircle2 size={15} /> Present
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${st.status === 'Absent' ? 'absent-active' : ''}`}
                        onClick={() => setStudentStatus(idx, 'Absent')}
                      >
                        <XCircle size={15} /> Absent
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {students.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button onClick={handleSaveAttendance} className="btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      )}
    </div>
  );
}
