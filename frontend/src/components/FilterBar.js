'use client';
import React from 'react';
import { Filter } from 'lucide-react';

export default function FilterBar({
  meta,
  filters,
  setFilters,
  children,
  hideFilters = false,
  required = false
}) {
  const depts = meta?.departments || [];
  const years = meta?.years || [];
  const sections = meta?.sections || [];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      alignItems: 'center',
      marginBottom: '20px',
      background: 'rgba(255, 255, 255, 0.03)',
      padding: '14px 18px',
      borderRadius: '14px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(10px)'
    }}>
      {!hideFilters && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '13px' }}>
            <Filter size={15} />
            <span>Class:</span>
          </div>

          <select
            className="glass-select"
            value={filters.department || ''}
            onChange={(e) => {
              const dept = e.target.value;
              setFilters({
                ...filters,
                department: dept,
                year: filters.year || (dept ? '1' : ''),
                section: filters.section || (dept ? 'A' : '')
              });
            }}
          >
            <option value="">{required ? 'Select Department' : 'All Departments'}</option>
            {depts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className="glass-select"
            value={filters.year || ''}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
          >
            <option value="">{required ? 'Select Year' : 'All Years'}</option>
            {years.map((y) => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </select>

          <select
            className="glass-select"
            value={filters.section || ''}
            onChange={(e) => setFilters({ ...filters, section: e.target.value })}
          >
            <option value="">{required ? 'Select Section' : 'All Sections'}</option>
            {sections.map((s) => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>
        </>
      )}

      {children}
    </div>
  );
}
