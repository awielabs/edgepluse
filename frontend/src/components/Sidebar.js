'use client';
import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  GraduationCap,
  AlertTriangle,
  LineChart,
  Bell,
  FileText,
  Settings,
  LogOut,
  Shield,
  User as UserIcon,
  X
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'marks', label: 'Marks', icon: GraduationCap },
  { id: 'attention', label: 'Needs Attention', icon: AlertTriangle, hasBadge: true },
  { id: 'performance', label: 'Performance', icon: LineChart },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  attentionCount = 0,
  isOpen = false,
  setIsOpen
}) {
  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
            display: 'block'
          }}
        />
      )}

      <aside
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '260px',
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen ? 'translateX(0)' : undefined
        }}
        className={`sidebar-container ${isOpen ? 'open' : ''}`}
      >
        {/* Header / Logo */}
        <div style={{
          padding: '24px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
            }}>
              <GraduationCap size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em' }}>
                <span className="gradient-text">EduPulse</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>
                Enterprise Platform
              </div>
            </div>
          </div>

          {setIsOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="mobile-close-btn"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'none',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav style={{
          flex: 1,
          padding: '16px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (setIsOpen) setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s ease',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0.1) 100%)'
                    : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <Icon
                  size={19}
                  color={isActive ? '#818cf8' : '#94a3b8'}
                  style={{ flexShrink: 0 }}
                />
                <span style={{ flex: 1 }}>{item.label}</span>

                {item.hasBadge && attentionCount > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '20px',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                  }}>
                    {attentionCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Log Out */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: user?.role === 'admin' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(56, 189, 248, 0.2)',
              border: `1px solid ${user?.role === 'admin' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: user?.role === 'admin' ? '#a5b4fc' : '#7dd3fc'
            }}>
              {user?.role === 'admin' ? <Shield size={18} /> : <UserIcon size={18} />}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name || 'Staff User'}
              </div>
              <div style={{
                fontSize: '11px',
                color: user?.role === 'admin' ? '#a5b4fc' : '#7dd3fc',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {user?.role}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="btn-secondary"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '12.5px',
              color: '#f87171',
              borderColor: 'rgba(239, 68, 68, 0.25)'
            }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
