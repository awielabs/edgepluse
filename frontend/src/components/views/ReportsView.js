'use client';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import FilterBar from '../FilterBar';
import {
  FileText,
  Download,
  Search,
  Table,
  CheckCircle2
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

  useEffect(() => {
    fetchApi('/students')
      .then((res) => {
        setStudents(res);
        if (res.length > 0) setSelectedStudentId(res[0].id);
      })
      .catch(() => {});
  }, []);

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

  const headers = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1>Analytics &amp; <span className="gradient-text">Reports</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Generate institutional compliance reports, academic grade sheets, and export raw data to CSV.
          </p>
        </div>

        {reportData.length > 0 && (
          <button onClick={handleDownloadCsv} className="btn-secondary">
            <Download size={16} /> Download CSV
          </button>
        )}
      </div>

      {/* Filter and Report Type bar */}
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
