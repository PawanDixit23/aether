import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Record?",
  message = "Are you sure you want to permanently delete this item?",
  confirmText = "Delete",
  cancelText = "Cancel",
  isDestructive = true
}) => {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#080f1d',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '24px 20px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Badge Icon */}
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '16px',
          background: isDestructive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(56, 189, 248, 0.12)',
          border: isDestructive ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isDestructive ? '#ef4444' : '#38bdf8',
          marginBottom: '16px',
          boxShadow: isDestructive ? '0 8px 24px rgba(239, 68, 68, 0.25)' : '0 8px 24px rgba(56, 189, 248, 0.25)'
        }}>
          {isDestructive ? <Trash2 size={26} strokeWidth={2.2} /> : <AlertTriangle size={26} strokeWidth={2.2} />}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '1.15rem',
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 8px 0',
          letterSpacing: '-0.01em'
        }}>
          {title}
        </h3>

        {/* Message */}
        <p style={{
          fontSize: '0.84rem',
          color: '#94a3b8',
          margin: '0 0 22px 0',
          lineHeight: 1.5,
          padding: '0 8px'
        }}>
          {message}
        </p>

        {/* Action Buttons Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          width: '100%'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '12px',
              color: '#cbd5e1',
              fontWeight: 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              background: isDestructive 
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: 'none',
              borderRadius: '14px',
              padding: '12px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: isDestructive 
                ? '0 6px 20px rgba(239, 68, 68, 0.4)' 
                : '0 6px 20px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.15s'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
