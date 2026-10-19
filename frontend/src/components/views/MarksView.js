'use client';
import React, { useState } from 'react';
import { fetchApi } from '../../lib/api';
import FilterBar from '../FilterBar';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  BookOpen,
  Award,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function MarksView({ meta, addToast }) {
  const [filters, setFilters] = useState({ department: '', year: '', section: '' });
  const [subject, setSubject] = useState('');
  const [exam, setExam] = useState('');
  const [maxMark, setMaxMark] = useState('100');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadMarks = async () => {
    if (!filters.department || !filters.year || !filters.section || !subject.trim() || !exam.trim()) {
      addToast('Please select department, year, section, subject and exam.', 'error');
      return;
    }

    setLoading(true);
    try {
      const q = new URLSearchParams({
        ...filters,
        subject: subject.trim(),
        exam: exam.trim()
      }).toString();

      const res = await fetchApi(`/marks/sheet?${q}`);
      const savedMax = res.find((r) => r.max_mark)?.max_mark;
      if (savedMax) setMaxMark(String(savedMax));

      setStudents(res.map((r) => ({
        ...r,
        mark: r.mark != null ? String(r.mark) : ''
      })));
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (filters.department && filters.year && filters.section && subject.trim() && exam.trim()) {
      loadMarks();
    }
  }, [filters.department, filters.year, filters.section, subject, exam]);

  const handleMarkChange = (index, val) => {
    const updated = [...students];
    updated[index].mark = val;

    // Live calculate percentage & status preview
    const num = parseFloat(val);
    const max = parseFloat(maxMark) || 100;
    if (!isNaN(num) && max > 0) {
      const pct = Math.round((num / max) * 1000) / 10;
      updated[index].percentage = pct;
      updated[index].result = pct >= 40 ? 'Pass' : 'Fail';
      if (pct >= 75) updated[index].performance = 'Excellent';
      else if (pct >= 60) updated[index].performance = 'Good';
      else if (pct >= 40) updated[index].performance = 'Average';
      else updated[index].performance = 'Needs Attention';
    } else {
      updated[index].percentage = null;
      updated[index].result = null;
      updated[index].performance = null;
    }

    setStudents(updated);
  };

  const handleSaveMarks = async () => {
    if (!students.length) return;
    const max = parseFloat(maxMark);
    if (!max || max <= 0) {
      addToast('Please specify a valid maximum mark greater than 0.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetchApi('/marks', {
        method: 'POST',
        body: {
          subject: subject.trim(),
          exam: exam.trim(),
          max_mark: max,
          records: students.map((s) => ({
            student_id: s.id,
            mark: s.mark !== '' ? parseFloat(s.mark) : null
          }))
        }
      });

      const alertNotice = res.alerts
        ? ` (${res.alerts} automated parent low-score alert(s) queued)`
        : '';
      addToast(`${res.message}${alertNotice}`, 'success');

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch {}

      loadMarks();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1>Academic Marks &amp; <span className="gradient-text">Evaluations</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Record test scores and assessment grades. Automatic alerts are generated for marks below the passing benchmark.
          </p>
        </div>

        {students.length > 0 && (
          <button onClick={handleSaveMarks} className="btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Gradebook'}
          </button>
        )}
      </div>

      {/* Filter and Exam Details */}
      <FilterBar meta={meta} filters={filters} setFilters={setFilters} required={true}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={16} color="#94a3b8" />
          <input
            type="text"
            list="subject_list"
            className="glass-input"
            placeholder="Subject (e.g. Mathematics)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <datalist id="subject_list">
            {(meta?.subjects || []).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={16} color="#94a3b8" />
          <input
            type="text"
            list="exam_list"
            className="glass-input"
            placeholder="Exam (e.g. Midterm 1)"
            value={exam}
            onChange={(e) => setExam(e.target.value)}
          />
          <datalist id="exam_list">
            {(meta?.exams || []).map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Max:</span>
          <input
            type="number"
            className="glass-input"
            style={{ width: '80px' }}
            value={maxMark}
            onChange={(e) => setMaxMark(e.target.value)}
            min="1"
          />
        </div>

        <button onClick={loadMarks} className="btn-primary" disabled={loading}>
          {loading ? 'Loading...' : 'Show Gradebook'}
        </button>

        {filters.department === 'MCA' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>Quick MCA Subjects:</span>
            {[
              { code: 'DS', name: 'DS (Data Structures)' },
              { code: '.NET', name: '.NET Programming' },
              { code: 'FD', name: 'FD (Frontend Dev)' },
              { code: 'CC', name: 'CC (Cloud Computing)' },
              { code: 'MA', name: 'MA (Mobile Apps)' }
            ].map((sub) => (
              <button
                key={sub.code}
                type="button"
                onClick={() => {
                  setSubject(sub.code);
                  setExam('Unit Test 1');
                  setMaxMark('50');
                }}
                className="btn-secondary btn-sm"
                style={{
                  padding: '3px 10px',
                  fontSize: '11.5px',
                  borderColor: subject === sub.code ? '#6366f1' : undefined,
                  background: subject === sub.code ? 'rgba(99, 102, 241, 0.3)' : undefined
                }}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </FilterBar>

      {/* Marks Table */}
      <div className="glass-table-wrap">
        <table className="glass-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Student Name</th>
              <th>Register No</th>
              <th style={{ width: '130px' }}>Score</th>
              <th style={{ width: '90px' }}>Out Of</th>
              <th>Percentage</th>
              <th>Result</th>
              <th>Evaluation Tier</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Loading gradebook matrix...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Select department, year, section, subject and exam, then click &quot;Show Gradebook&quot;.
                </td>
              </tr>
            ) : (
              students.map((st, idx) => {
                const isPass = st.result === 'Pass';
                const isFail = st.result === 'Fail';
                return (
                  <tr key={st.id}>
                    <td style={{ color: 'var(--text-dim)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{st.student_name}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                        {st.register_no}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="glass-input"
                        style={{ width: '95px', padding: '6px 10px', fontSize: '13.5px' }}
                        value={st.mark}
                        min="0"
                        max={maxMark}
                        placeholder="–"
                        onChange={(e) => handleMarkChange(idx, e.target.value)}
                      />
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{maxMark}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {st.percentage != null ? `${st.percentage}%` : '–'}
                      </span>
                    </td>
                    <td>
                      {isPass && <span className="pill pill-success">Pass</span>}
                      {isFail && <span className="pill pill-danger">Fail</span>}
                      {!isPass && !isFail && <span style={{ color: 'var(--text-dim)' }}>–</span>}
                    </td>
                    <td>
                      {st.performance === 'Excellent' && <span className="pill pill-success">🌟 Excellent</span>}
                      {st.performance === 'Good' && <span className="pill pill-success">👍 Good</span>}
                      {st.performance === 'Average' && <span className="pill pill-warning">Average</span>}
                      {st.performance === 'Needs Attention' && <span className="pill pill-danger">⚠️ Needs Attention</span>}
                      {!st.performance && <span style={{ color: 'var(--text-dim)' }}>–</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {students.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button onClick={handleSaveMarks} className="btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Gradebook'}
          </button>
        </div>
      )}
    </div>
  );
}
