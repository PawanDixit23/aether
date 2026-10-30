import React from 'react';
import { HardDrive } from 'lucide-react';

export const DriveModal = ({
  isOpen,
  onClose,
  driveDocName,
  setDriveDocName,
  driveInputUrl,
  setDriveInputUrl,
  handleAttachDriveFromModal
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.88)',
      backdropFilter: 'blur(16px)',
      zIndex: 115,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#0d1527',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        borderRadius: '24px',
        padding: '24px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(52, 211, 153, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <HardDrive size={18} />
            </div>
            <span>GOOGLE DRIVE ATTACHMENT</span>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '16px', lineHeight: '1.4' }}>
          Attach a Google Drive file, sheet, or document link for Aether AI to inspect and analyze:
        </p>

        {/* Quick Presets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: 'Google Doc', icon: '📄', prefix: 'https://docs.google.com/document/d/' },
            { label: 'Google Sheet', icon: '📊', prefix: 'https://docs.google.com/spreadsheets/d/' },
            { label: 'Google Slides', icon: '📽️', prefix: 'https://docs.google.com/presentation/d/' },
            { label: 'Shared Folder', icon: '📁', prefix: 'https://drive.google.com/drive/folders/' },
          ].map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setDriveDocName(preset.label);
                if (!driveInputUrl) setDriveInputUrl(preset.prefix);
              }}
              style={{
                background: driveDocName === preset.label ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${driveDocName === preset.label ? '#34d399' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '12px',
                padding: '8px 10px',
                color: driveDocName === preset.label ? '#34d399' : '#cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleAttachDriveFromModal}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
              Document Title:
            </label>
            <input
              type="text"
              placeholder="e.g. Project_Quarterly_Report"
              value={driveDocName}
              onChange={(e) => setDriveDocName(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '10px 14px',
                color: '#ffffff',
                fontSize: '0.86rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
              Google Drive URL:
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/file/d/..."
              value={driveInputUrl}
              onChange={(e) => setDriveInputUrl(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '10px 14px',
                color: '#ffffff',
                fontSize: '0.86rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                padding: '10px 16px',
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #10b981, #34d399)',
                border: 'none',
                color: '#022c22',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
              }}
            >
              Attach to Chat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriveModal;
