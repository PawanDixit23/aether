import React from 'react';
import { Clock } from 'lucide-react';
import { FormattedMessage } from '../chat/FormattedMessage';

export const HistoryModal = ({
  isOpen,
  onClose,
  chatHistory,
  userName,
  handleStartNewChat
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: 700 }}>
            <Clock size={18} color="var(--accent-cyan)" />
            <span>INTERACTION TRANSCRIPT</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              onClick={handleStartNewChat} 
              style={{ background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: '#ef4444', padding: '4px 10px', borderRadius: '8px', fontSize: '0.74rem', cursor: 'pointer' }}
            >
              Clear
            </button>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {chatHistory.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '0.84rem', textAlign: 'center', padding: '24px 0' }}>No recent chats. Speak to Aether to begin!</div>
        ) : (
          chatHistory.map((msg, i) => (
            <div key={i} style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '12px', background: msg.role === 'user' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.04)', textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: msg.role === 'user' ? 'var(--accent-cyan)' : '#a855f7', fontWeight: 700, marginBottom: '3px' }}>
                {msg.role === 'user' ? (userName || 'You') : 'Aether'}
              </div>
              {msg.image_url && (
                <div style={{ marginBottom: '6px' }}>
                  <img 
                    src={msg.image_url} 
                    alt="Attachment" 
                    style={{ maxWidth: '100%', maxHeight: '140px', borderRadius: '8px', objectFit: 'cover' }} 
                  />
                </div>
              )}
              <div style={{ fontSize: '0.86rem', color: '#ffffff', lineHeight: '1.4' }}>
                <FormattedMessage text={msg.content} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryModal;
