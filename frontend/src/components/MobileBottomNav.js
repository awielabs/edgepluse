'use client';
import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  GraduationCap,
  AlertTriangle,
  Users,
  Menu
} from 'lucide-react';

export default function MobileBottomNav({
  activeTab,
  setActiveTab,
  attentionCount = 0,
  setMobileMenuOpen
}) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Roll Call', icon: CalendarCheck },
    { id: 'marks', label: 'Marks', icon: GraduationCap },
    { id: 'attention', label: 'Attention', icon: AlertTriangle, hasBadge: true },
    { id: 'students', label: 'Students', icon: Users },
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.12)',
        display: 'none',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 10px calc(8px + env(safe-area-inset-bottom, 0px)) 10px',
        zIndex: 50,
        boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.4)'
      }}
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '10px',
              color: isActive ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
              minWidth: '56px'
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={20} color={isActive ? '#38bdf8' : '#94a3b8'} />
              {t.hasBadge && attentionCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-8px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '10px',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                }}>
                  {attentionCount}
                </span>
              )}
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '-0.01em'
            }}>
              {t.label}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        style={{
          background: 'none',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 10px',
          borderRadius: '10px',
          color: '#94a3b8',
          cursor: 'pointer',
          minWidth: '52px'
        }}
      >
        <Menu size={20} color="#94a3b8" />
        <span style={{ fontSize: '11px', fontWeight: 500 }}>More</span>
      </button>
    </nav>
  );
}
