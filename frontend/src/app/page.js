'use client';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import Toast from '../components/Toast';
import Login from '../components/Login';
import Sidebar from '../components/Sidebar';
import DashboardView from '../components/views/DashboardView';
import StudentsView from '../components/views/StudentsView';
import AttendanceView from '../components/views/AttendanceView';
import MarksView from '../components/views/MarksView';
import AttentionView from '../components/views/AttentionView';
import PerformanceView from '../components/views/PerformanceView';
import NotificationsView from '../components/views/NotificationsView';
import ReportsView from '../components/views/ReportsView';
import SettingsView from '../components/views/SettingsView';
import MobileBottomNav from '../components/MobileBottomNav';
import InstallPrompt from '../components/InstallPrompt';
import { Menu, GraduationCap } from 'lucide-react';

export default function Home() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [meta, setMeta] = useState(null);
  const [attentionCount, setAttentionCount] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Add toast helper
  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check auth on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('ep_token');
      const savedUser = localStorage.getItem('ep_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          setUser(null);
        }
      }
      setInitialLoading(false);
    }
  }, []);

  const loadMeta = async () => {
    try {
      const data = await fetchApi('/meta');
      setMeta(data);
    } catch (err) {
      console.warn('Failed to fetch metadata:', err.message);
    }
  };

  const loadAttentionCount = async () => {
    try {
      const res = await fetchApi('/attention');
      setAttentionCount(Array.isArray(res) ? res.length : 0);
    } catch {}
  };

  useEffect(() => {
    if (token) {
      loadMeta();
      loadAttentionCount();
    }
  }, [token]);

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    setActiveTab('dashboard');
    addToast(`Welcome back, ${userData.name}!`, 'success');
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ep_token');
      localStorage.removeItem('ep_user');
    }
    setToken(null);
    setUser(null);
    addToast('You have been signed out.', 'info');
  };

  // Render view router
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            meta={meta}
            setActiveTab={setActiveTab}
            addToast={addToast}
            user={user}
          />
        );
      case 'students':
        return (
          <StudentsView
            meta={meta}
            setActiveTab={setActiveTab}
            setSelectedStudentId={setSelectedStudentId}
            addToast={addToast}
            user={user}
          />
        );
      case 'attendance':
        return <AttendanceView meta={meta} addToast={addToast} />;
      case 'marks':
        return <MarksView meta={meta} addToast={addToast} />;
      case 'attention':
        return (
          <AttentionView
            meta={meta}
            setActiveTab={setActiveTab}
            setSelectedStudentId={setSelectedStudentId}
            addToast={addToast}
          />
        );
      case 'performance':
        return (
          <PerformanceView
            studentId={selectedStudentId}
            setSelectedStudentId={setSelectedStudentId}
            addToast={addToast}
          />
        );
      case 'notifications':
        return <NotificationsView addToast={addToast} />;
      case 'reports':
        return <ReportsView meta={meta} addToast={addToast} />;
      case 'settings':
        return <SettingsView addToast={addToast} refreshMeta={loadMeta} />;
      default:
        return (
          <DashboardView
            meta={meta}
            setActiveTab={setActiveTab}
            addToast={addToast}
            user={user}
          />
        );
    }
  };

  if (initialLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-gradient)'
      }}>
        <div style={{ textAlign: 'center', color: '#818cf8', fontWeight: 600 }}>
          Initializing EduPulse Environment...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Background Animated Ambient Orbs */}
      <div className="ambient-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Global Toasts */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {!token ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            user={user}
            onLogout={handleLogout}
            attentionCount={attentionCount}
            isOpen={mobileMenuOpen}
            setIsOpen={setMobileMenuOpen}
          />

          {/* Main Content Area */}
          <div style={{
            flex: 1,
            marginLeft: '260px',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column'
          }} className="main-content-layout">
            {/* Top Bar on Mobile */}
            <header className="mobile-header" style={{
              display: 'none',
              padding: '14px 20px',
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 30
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <GraduationCap size={18} color="#ffffff" />
                </div>
                <span className="gradient-text" style={{ fontWeight: 800, fontSize: '16px' }}>EduPulse</span>
              </div>

              <button
                onClick={() => setMobileMenuOpen(true)}
                className="btn-secondary btn-sm"
                style={{ padding: '6px 10px' }}
              >
                <Menu size={18} />
              </button>
            </header>

            {/* View Container */}
            <main style={{
              flex: 1,
              padding: '32px 36px',
              maxWidth: '1400px',
              width: '100%',
              margin: '0 auto'
            }} className="view-content-padding">
              {renderActiveView()}
            </main>

            {/* Android & iOS Mobile Bottom Navigation */}
            <MobileBottomNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              attentionCount={attentionCount}
              setMobileMenuOpen={setMobileMenuOpen}
            />

            {/* PWA Mobile Install Prompt */}
            <InstallPrompt />
          </div>
        </div>
      )}
    </>
  );
}
