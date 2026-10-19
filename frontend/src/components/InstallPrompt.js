'use client';
import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, Apple } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if running on iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      const dismissed = localStorage.getItem('ep_ios_prompt_dismissed');
      if (!dismissed) setShowPrompt(true);
    }

    // Android / Desktop beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('ep_pwa_dismissed');
      if (!dismissed) setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('ep_ios_prompt_dismissed', 'true');
    } else {
      localStorage.setItem('ep_pwa_dismissed', 'true');
    }
  };

  if (!showPrompt) return null;

  return (
    <>
      <div
        className="glass-panel"
        style={{
          position: 'fixed',
          bottom: '76px',
          left: '16px',
          right: '16px',
          maxWidth: '480px',
          margin: '0 auto',
          padding: '12px 16px',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 12px 35px rgba(0,0,0,0.6)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          background: 'rgba(15, 23, 42, 0.92)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0
          }}>
            {isIOS ? <Apple size={20} /> : <Smartphone size={20} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>
              Install EduPulse Mobile App
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              {isIOS ? 'Install on iPhone / iPad Home Screen' : 'Fast, native-like Android & iOS install'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleInstallClick}
            className="btn-primary btn-sm"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <Download size={14} /> Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* iOS Modal Guide */}
      {showIosGuide && (
        <div className="modal-overlay" onClick={() => setShowIosGuide(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Apple size={20} color="#38bdf8" /> Install on iOS
            </h3>
            <ol style={{ paddingLeft: '20px', lineHeight: 1.8, fontSize: '13.5px', color: '#cbd5e1' }}>
              <li>Tap the <b>Share button</b> (square with arrow up) at the bottom of Safari.</li>
              <li>Scroll down and tap <b>&quot;Add to Home Screen&quot;</b>.</li>
              <li>Tap <b>Add</b> in the top right corner.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="btn-primary"
              style={{ width: '100%', marginTop: '16px' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
