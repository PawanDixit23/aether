import React from 'react';
import { Camera } from 'lucide-react';

export const CameraModal = ({
  isOpen,
  onClose,
  cameraVideoRef,
  cameraInputRef,
  handleCaptureCameraSnapshot
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
        padding: '22px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
            <Camera size={20} color="#38bdf8" />
            <span>CAMERA VIEWFINDER</span>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', height: '300px', background: '#020617', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video 
            ref={cameraVideoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0, 0, 0, 0.6)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem', color: '#38bdf8' }}>
            ● Live Feed
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '18px' }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              cameraInputRef.current?.click();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              padding: '10px 18px',
              borderRadius: '14px',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Choose Existing File
          </button>
          <button
            type="button"
            onClick={handleCaptureCameraSnapshot}
            style={{
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              border: 'none',
              color: '#ffffff',
              padding: '10px 22px',
              borderRadius: '14px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(56, 189, 248, 0.4)'
            }}
          >
            <Camera size={18} />
            Snap Photo
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraModal;
