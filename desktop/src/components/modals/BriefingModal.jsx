import React from 'react';
import { Radio, Play, Pause } from 'lucide-react';

export const BriefingModal = ({
  isOpen,
  onClose,
  isBriefingLoading,
  executiveBriefingData,
  isBriefingPlaying,
  stopBriefingAudio,
  speakBriefingAudio
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#0d1527', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700, fontSize: '0.92rem' }}>
            <Radio size={18} className={isBriefingPlaying ? 'animate-pulse' : ''} />
            <span>EXECUTIVE BRIEFING</span>
          </div>
          <button 
            type="button" 
            onClick={() => {
              stopBriefingAudio();
              onClose();
            }} 
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {isBriefingLoading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>🎙️</div>
            <div style={{ fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 600 }}>दैनिक ब्रीफिंग तैयार की जा रही है...</div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>मौसम व आज के एजेंडा का लाइव विश्लेषण</div>
          </div>
        ) : executiveBriefingData ? (
          <div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '3px 8px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                📍 Jaipur
              </span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '3px 8px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                📋 {executiveBriefingData.task_count || 0} कार्य आज
              </span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px', color: '#f1f5f9', fontSize: '0.88rem', lineHeight: '1.6', marginBottom: '18px' }}>
              {executiveBriefingData.text}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  if (isBriefingPlaying) {
                    stopBriefingAudio();
                  } else {
                    speakBriefingAudio(executiveBriefingData.text);
                  }
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: isBriefingPlaying ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                  color: isBriefingPlaying ? '#ef4444' : '#080c16',
                  border: isBriefingPlaying ? '1px solid #ef4444' : 'none',
                  borderRadius: '12px',
                  padding: '11px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                {isBriefingPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isBriefingPlaying ? 'रोकें (Pause)' : 'सुनें (Listen)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopBriefingAudio();
                  onClose();
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  borderRadius: '12px',
                  padding: '11px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                बंद करें
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
            कोई ब्रीफिंग उपलब्ध नहीं है।
          </div>
        )}
      </div>
    </div>
  );
};

export default BriefingModal;
