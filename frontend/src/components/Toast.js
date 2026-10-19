'use client';
import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 9999,
      maxWidth: '420px',
      width: 'calc(100% - 48px)',
      pointerEvents: 'none'
    }}>
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        return (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              background: isSuccess
                ? 'rgba(6, 78, 59, 0.85)'
                : isError
                ? 'rgba(127, 29, 29, 0.85)'
                : 'rgba(30, 41, 59, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${
                isSuccess
                  ? 'rgba(52, 211, 153, 0.4)'
                  : isError
                  ? 'rgba(248, 113, 113, 0.4)'
                  : 'rgba(255, 255, 255, 0.2)'
              }`,
              borderRadius: '12px',
              padding: '14px 18px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#ffffff',
              animation: 'scaleUp 0.25s ease-out'
            }}
          >
            {isSuccess && <CheckCircle2 size={20} color="#34d399" style={{ flexShrink: 0 }} />}
            {isError && <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0 }} />}
            {!isSuccess && !isError && <Info size={20} color="#60a5fa" style={{ flexShrink: 0 }} />}
            
            <div style={{ flex: 1, fontSize: '13.5px', fontWeight: 500, lineHeight: 1.4 }}>
              {t.message}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
