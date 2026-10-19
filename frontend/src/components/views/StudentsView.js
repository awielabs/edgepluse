'use client';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import FilterBar from '../FilterBar';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink
} from 'lucide-react';

export default function StudentsView({ meta, setActiveTab, setSelectedStudentId, addToast, user }) {
  const [filters, setFilters] = useState({ department: '', year: '', section: '' });
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    student_name: '',
    register_no: '',
    department: 'CSE',
    year: '1',
    section: 'A',
    parent_name: '',
    parent_email: '',
    parent_phone: ''
  });

  // Bulk CSV modal
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreviewData, setCsvPreviewData] = useState(null);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(
        Object.entries({ ...filters, search: search.trim() }).filter(([, v]) => v)
      ).toString();
      const res = await fetchApi(`/students?${q}`);
      setStudents(res);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [filters, search]);

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      student_name: '',
      register_no: '',
      department: meta?.departments?.[0] || 'CSE',
      year: meta?.years?.[0] || '1',
      section: meta?.sections?.[0] || 'A',
      parent_name: '',
      parent_email: '',
      parent_phone: ''
    });
    setShowFormModal(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      student_name: student.student_name || '',
      register_no: student.register_no || '',
      department: student.department || 'CSE',
      year: student.year || '1',
      section: student.section || 'A',
      parent_name: student.parent_name || '',
      parent_email: student.parent_email || '',
      parent_phone: student.parent_phone || ''
    });
    setShowFormModal(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        const res = await fetchApi(`/students/${editingStudent.id}`, {
          method: 'PUT',
          body: formData
        });
        addToast(res.message, 'success');
      } else {
        const res = await fetchApi('/students', {
          method: 'POST',
          body: formData
        });
        addToast(res.message, 'success');
      }
      setShowFormModal(false);
      loadStudents();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!confirm(`Are you sure you want to delete ${student.student_name} (${student.register_no}) and their records?`)) {
      return;
    }
    try {
      const res = await fetchApi(`/students/${student.id}`, {
        method: 'DELETE'
      });
      addToast(res.message, 'success');
      loadStudents();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // CSV handling
  const handleDownloadTemplate = async () => {
    try {
      const blob = await fetchApi('/students/template.csv', { asBlob: true });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student_template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      addToast('CSV Template downloaded.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCsvFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvLoading(true);
    try {
      const text = await file.text();
      setCsvRawText(text);
      const res = await fetchApi('/students/import/preview', {
        method: 'POST',
        csv: true,
        body: text
      });
      setCsvPreviewData(res);
    } catch (err) {
      addToast(err.message, 'error');
      setCsvPreviewData(null);
    } finally {
      setCsvLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!csvRawText) return;
    setCsvLoading(true);
    try {
      const res = await fetchApi('/students/import/confirm', {
        method: 'POST',
        csv: true,
        body: csvRawText
      });
      addToast(res.message, 'success');
      setShowCsvModal(false);
      setCsvPreviewData(null);
      setCsvFile(null);
      loadStudents();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1>Student <span className="gradient-text">Directory</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Manage registered students, emergency parent contact channels, and batch imports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={openAddModal} className="btn-primary">
            <UserPlus size={16} /> Add Student
          </button>
          {user?.role === 'admin' && (
            <button onClick={() => setShowCsvModal(true)} className="btn-secondary">
              <Upload size={16} /> Bulk Upload (CSV)
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <FilterBar meta={meta} filters={filters} setFilters={setFilters}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="glass-input"
            style={{ width: '100%', paddingLeft: '38px' }}
            placeholder="Search student name or register number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterBar>

      {/* Students Table */}
      <div className="glass-table-wrap">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Reg No</th>
              <th>Dept</th>
              <th>Year</th>
              <th>Sec</th>
              <th>Parent</th>
              <th>Contact Email</th>
              <th>Phone</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Loading student registry...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No students found matching your criteria.
                </td>
              </tr>
            ) : (
              students.map((st) => (
                <tr key={st.id}>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedStudentId(st.id);
                        setActiveTab('performance');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ffffff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textAlign: 'left'
                      }}
                    >
                      {st.student_name}
                      <ExternalLink size={12} color="#818cf8" />
                    </button>
                  </td>
                  <td><span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{st.register_no}</span></td>
                  <td><span className="pill pill-neutral">{st.department}</span></td>
                  <td>Year {st.year}</td>
                  <td>Sec {st.section}</td>
                  <td>{st.parent_name || '–'}</td>
                  <td><span style={{ color: '#cbd5e1', fontSize: '13px' }}>{st.parent_email || '–'}</span></td>
                  <td><span style={{ color: '#cbd5e1', fontSize: '13px' }}>{st.parent_phone || '–'}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => openEditModal(st)}
                      className="btn-secondary btn-sm"
                      style={{ marginRight: '6px', padding: '5px 9px' }}
                      title="Edit Student"
                    >
                      <Edit2 size={13} />
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteStudent(st)}
                        className="btn-danger btn-sm"
                        style={{ padding: '5px 9px' }}
                        title="Delete Student"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Student Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>{editingStudent ? 'Edit Student Details' : 'Enroll New Student'}</h2>
              <button
                onClick={() => setShowFormModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Full Student Name *
                </label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Alex Johnson"
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Register / Roll Number *
                </label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. 21CS042"
                  value={formData.register_no}
                  onChange={(e) => setFormData({ ...formData, register_no: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Department *
                </label>
                <select
                  className="glass-select"
                  style={{ width: '100%' }}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  {(meta?.departments || []).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Academic Year *
                </label>
                <select
                  className="glass-select"
                  style={{ width: '100%' }}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                >
                  {(meta?.years || []).map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Section *
                </label>
                <select
                  className="glass-select"
                  style={{ width: '100%' }}
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                >
                  {(meta?.sections || []).map((s) => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ color: '#38bdf8', marginBottom: '10px' }}>Parent / Guardian Contact Channels</h4>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Parent / Guardian Name
                </label>
                <input
                  type="text"
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. David Johnson"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Parent Email (for SMTP alerts)
                </label>
                <input
                  type="email"
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="parent@example.com"
                  value={formData.parent_email}
                  onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  Parent Phone (for SMS & WhatsApp)
                </label>
                <input
                  type="tel"
                  className="glass-input"
                  style={{ width: '100%' }}
                  placeholder="+15550001111"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingStudent ? 'Update Student' : 'Save & Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Upload Modal */}
      {showCsvModal && (
        <div className="modal-overlay" onClick={() => setShowCsvModal(false)}>
          <div className="modal-content" style={{ width: '840px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>Bulk Upload Students (CSV)</h2>
              <button
                onClick={() => setShowCsvModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '14px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Step 1: Download Standard CSV Template</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Contains columns: student_name, register_no, department, year, section, parent_name, parent_email, parent_phone</div>
                </div>
                <button onClick={handleDownloadTemplate} className="btn-secondary btn-sm">
                  <Download size={14} /> Download Template
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                  Step 2: Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px dashed var(--glass-border)',
                    borderRadius: '10px',
                    padding: '16px',
                    width: '100%',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {csvLoading && (
                <div style={{ textAlign: 'center', color: '#38bdf8', padding: '16px' }}>
                  Validating CSV rows...
                </div>
              )}

              {csvPreviewData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <span className="pill pill-success">
                      <CheckCircle2 size={13} /> {csvPreviewData.valid} Valid Rows
                    </span>
                    {csvPreviewData.invalid > 0 && (
                      <span className="pill pill-danger">
                        <AlertCircle size={13} /> {csvPreviewData.invalid} Rows With Errors
                      </span>
                    )}
                  </div>

                  <div className="glass-table-wrap" style={{ maxHeight: '250px' }}>
                    <table className="glass-table">
                      <thead>
                        <tr>
                          <th>Line</th>
                          <th>Name</th>
                          <th>Reg No</th>
                          <th>Dept</th>
                          <th>Year</th>
                          <th>Sec</th>
                          <th>Parent</th>
                          <th>Validation Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreviewData.rows.map((r) => (
                          <tr key={r.line}>
                            <td>{r.line}</td>
                            <td>{r.data.student_name}</td>
                            <td>{r.data.register_no}</td>
                            <td>{r.data.department}</td>
                            <td>{r.data.year}</td>
                            <td>{r.data.section}</td>
                            <td>{r.data.parent_name}</td>
                            <td>
                              {r.errors.length > 0 ? (
                                <span style={{ color: '#f87171', fontSize: '12px' }}>
                                  {r.errors.join(', ')}
                                </span>
                              ) : (
                                <span style={{ color: '#34d399', fontSize: '12px' }}>✓ Valid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                    <button type="button" onClick={() => setShowCsvModal(false)} className="btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="btn-primary"
                      disabled={csvPreviewData.invalid > 0 || csvPreviewData.valid === 0 || csvLoading}
                    >
                      Confirm & Import {csvPreviewData.valid} Students
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
