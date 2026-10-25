'use client';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import FilterBar from '../FilterBar';
import {
  FileText,
  Download,
  Search,
  Table,
  CheckCircle2,
  Mail,
  Send,
  MessageSquare,
  ExternalLink,
  Copy,
  AlertTriangle,
  Award,
  Sparkles,
  PhoneCall
} from 'lucide-react';

const REPORT_TYPES = [
  { id: 'attendance', label: 'Attendance Summary' },
  { id: 'marks', label: 'Marks & Academic Results' },
  { id: 'performance', label: 'Student Performance & Attention' },
  { id: 'department', label: 'Department-wise Aggregation' },
  { id: 'student', label: 'Individual Student Report' },
  { id: 'notifications', label: 'Parent Notification Log' }
];

export default function ReportsView({ meta, addToast }) {
  const [filters, setFilters] = useState({ department: '', year: '', section: '' });
  const [reportType, setReportType] = useState('attendance');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Student Parent Dispatch Card State
  const [dispatchStudentId, setDispatchStudentId] = useState('');
  const [studentCard, setStudentCard] = useState(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  useEffect(() => {
    fetchApi('/students')
      .then((res) => {
        setStudents(res);
        if (res.length > 0) {
          setSelectedStudentId(res[0].id);
          setDispatchStudentId(res[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch student card data whenever dispatch student changes
  useEffect(() => {
    if (!dispatchStudentId) return;
    setLoadingCard(true);
    setEmailResult(null);
    fetchApi(`/reports/student-card/${dispatchStudentId}`)
      .then((card) => {
        setStudentCard(card);
        if (card.student && card.student.parent_email) {
          setTestEmailInput(card.student.parent_email);
        }
      })
      .catch((err) => {
        addToast(err.message || 'Failed to load student card', 'error');
      })
      .finally(() => setLoadingCard(false));
  }, [dispatchStudentId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      );
      if (reportType === 'student' && selectedStudentId) {
        q.append('student_id', selectedStudentId);
      }

      const res = await fetchApi(`/reports/${reportType}?${q.toString()}`);
      setReportData(res);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!reportData || reportData.length === 0) {
      addToast('No data available to download.', 'error');
      return;
    }

    const headers = Object.keys(reportData[0]);
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = reportData.map((row) =>
      headers.map((h) => escapeCsv(row[h])).join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EduPulse_${reportType}_report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV exported successfully.', 'success');
  };

  const handleSendEmail = async () => {
    if (!dispatchStudentId) return;
    setSendingEmail(true);
    try {
      const res = await fetchApi(`/notifications/send-report/${dispatchStudentId}`, {
        method: 'POST',
        body: JSON.stringify({
          channel: 'email',
          test_email: testEmailInput.trim() || undefined
        })
      });
      setEmailResult(res.email_result);
      if (res.email_result?.sent) {
        addToast(`Email report dispatched successfully!`, 'success');
      } else {
        addToast(res.email_result?.error || 'Failed to dispatch email', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error sending report email', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyWhatsApp = () => {
    if (!studentCard?.plainText) return;
    navigator.clipboard.writeText(studentCard.plainText);
    addToast('WhatsApp message copied to clipboard!', 'success');
  };

  const headers = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1>Parent Communication &amp; <span className="gradient-text">Progress Reports</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Direct CAT-1 Marks &amp; Attendance dispatch to parents via Email and WhatsApp with bilingual remarks.
          </p>
        </div>

        {reportData.length > 0 && (
          <button onClick={handleDownloadCsv} className="btn-secondary">
            <Download size={16} /> Download CSV
          </button>
        )}
      </div>

      {/* ================= PARENT DISPATCH HERO CARD ================= */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(16px)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
              <Send size={22} color="#818CF8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#fff', fontWeight: '700' }}>
                Instant Parent Dispatch (CAT-1 Marks &amp; Attendance)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Select a student to generate formatted WhatsApp messages and dispatch official HTML email reports.
              </p>
            </div>
          </div>

          {/* Student Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Student:</span>
            <select
              className="glass-select"
              value={dispatchStudentId}
              onChange={(e) => setDispatchStudentId(e.target.value)}
              style={{ minWidth: '240px', fontWeight: '600' }}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.student_name} ({s.register_no})
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingCard ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            Compiling student marks, cumulative attendance &amp; bilingual faculty remarks...
          </div>
        ) : studentCard ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Left: Interactive Preview & Report Details */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '17px', color: '#f8fafc', fontWeight: '800' }}>
                    {studentCard.student?.student_name}
                  </h4>
                  <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '3px' }}>
                    Reg No: <b>{studentCard.student?.register_no}</b> • {studentCard.student?.department}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <span
                    style={{
                      background: studentCard.attendance_pct >= 75 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: studentCard.attendance_pct >= 75 ? '#4ade80' : '#f87171',
                      border: `1px solid ${studentCard.attendance_pct >= 75 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}
                  >
                    {studentCard.attendance_pct}% Attendance
                  </span>

                  <span
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}
                  >
                    {studentCard.overall_pct}% Marks
                  </span>
                </div>
              </div>

              {/* Attendance Card */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Working Days</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f1f5f9' }}>{studentCard.total_days} Days</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Present / Absent</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f1f5f9' }}>
                    <span style={{ color: '#4ade80' }}>{studentCard.present_days}P</span> / <span style={{ color: '#f87171' }}>{studentCard.absent_days}A</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Status</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: studentCard.attendance_pct >= 75 ? '#4ade80' : '#f87171' }}>
                    {studentCard.attendance_pct >= 75 ? 'Satisfactory' : '⚠️ Below 75%'}
                  </div>
                </div>
              </div>

              {/* Marks Table */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '8px' }}>
                  CAT-1 Examination Results (Max: 50)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {studentCard.marks?.map((m) => (
                    <div
                      key={m.subject}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e2e8f0' }}>{m.subject}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{m.mark}/{m.max_mark} ({m.percentage}%)</div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: m.result === 'Pass' ? '#4ade80' : '#f87171' }}>
                        {m.result === 'Pass' ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bilingual Remarks */}
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#818cf8', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Faculty Remarks / ஆசிரியர் கருத்து:
                </div>
                <div style={{ fontSize: '12.5px', color: '#e2e8f0', marginBottom: '4px' }}>
                  🇬🇧 <b>EN:</b> {studentCard.remarks_en}
                </div>
                <div style={{ fontSize: '12px', color: '#c7d2fe' }}>
                  🇮🇳 <b>தமிழ்:</b> {studentCard.remarks_ta}
                </div>
              </div>

              {/* Action Dispatch Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <a
                  href={studentCard.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: '1 1 200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: '#25D366',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '13.5px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <MessageSquare size={17} /> Open in WhatsApp &amp; Send
                </a>

                <button
                  onClick={handleCopyWhatsApp}
                  className="btn-secondary"
                  style={{ padding: '10px 14px' }}
                  title="Copy formatted text to clipboard"
                >
                  <Copy size={16} />
                </button>
              </div>

              {/* Email Dispatch Control */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                  Recipient Email (defaults to parent email):
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    className="glass-input"
                    value={testEmailInput}
                    onChange={(e) => setTestEmailInput(e.target.value)}
                    placeholder="parent@example.com"
                    style={{ flex: 1, fontSize: '13px' }}
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <Mail size={15} /> {sendingEmail ? 'Sending...' : 'Send Official Email'}
                  </button>
                </div>

                {emailResult && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      background: emailResult.sent ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      border: `1px solid ${emailResult.sent ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}
                  >
                    <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: emailResult.sent ? '#4ade80' : '#f87171' }}>
                      {emailResult.sent ? '✅ Dispatched to: ' + emailResult.recipient : '❌ Delivery Failed: ' + emailResult.error}
                    </div>
                    {emailResult.preview_url && (
                      <div style={{ marginTop: '6px' }}>
                        <a
                          href={emailResult.preview_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#38bdf8', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                        >
                          <ExternalLink size={13} /> View Live Dispatched Email in Ethereal Test Inbox
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live WhatsApp Formatted Message View */}
            <div style={{ background: '#0b141a', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '16px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#25D366' }}></div>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#e2e8f0' }}>WhatsApp Preview</span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>To: +91 {studentCard.student?.parent_phone || 'Parent Phone'}</span>
              </div>

              <div
                style={{
                  background: '#111b21',
                  borderRadius: '10px',
                  padding: '14px',
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: '11.5px',
                  lineHeight: '1.5',
                  color: '#e9edef',
                  whiteSpace: 'pre-wrap',
                  overflowY: 'auto',
                  maxHeight: '420px',
                  border: '1px solid rgba(255, 255, 255, 0.04)'
                }}
              >
                {studentCard.plainText}
              </div>
            </div>

          </div>
        ) : null}
      </div>

      {/* ================= TABULAR REPORT EXPORTS ================= */}
      <FilterBar meta={meta} filters={filters} setFilters={setFilters}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} color="#94a3b8" />
          <select
            className="glass-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            {REPORT_TYPES.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>

        {reportType === 'student' && (
          <select
            className="glass-select"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.student_name} ({s.register_no})
              </option>
            ))}
          </select>
        )}

        <button onClick={loadReport} className="btn-primary" disabled={loading}>
          {loading ? 'Compiling...' : 'Generate Report'}
        </button>
      </FilterBar>

      {/* Report Table */}
      <div className="glass-table-wrap">
        <table className="glass-table">
          <thead>
            <tr>
              {headers.length > 0 ? (
                headers.map((h) => (
                  <th key={h} style={{ textTransform: 'capitalize' }}>
                    {h.replace(/_/g, ' ')}
                  </th>
                ))
              ) : (
                <th>Report Columns</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={headers.length || 1} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Compiling institutional records...
                </td>
              </tr>
            ) : reportData.length === 0 ? (
              <tr>
                <td colSpan={headers.length || 1} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Choose report parameters and click &quot;Generate Report&quot;.
                </td>
              </tr>
            ) : (
              reportData.map((row, idx) => (
                <tr key={idx}>
                  {headers.map((h) => (
                    <td key={h}>
                      {row[h] != null ? String(row[h]) : '–'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
