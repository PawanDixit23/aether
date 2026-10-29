import React from 'react';
import { Shield } from 'lucide-react';

export const AuditModal = ({
  isOpen,
  onClose,
  auditLogs,
  handleUndo
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
            <Shield size={18} />
            <span>ACTIONS & AUDIT TRAIL</span>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {auditLogs.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '0.84rem', textAlign: 'center', padding: '20px 0' }}>No actions logged yet.</div>
        ) : (
          auditLogs.map(log => (
            <div key={log.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>{log.action_type}</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(log.executed_at).toLocaleTimeString()}</span>
              </div>
              <div style={{ color: '#ffffff', fontSize: '0.84rem', lineHeight: '1.4' }}>{log.details}</div>
              {log.undo_payload && !log.is_undone && (
                <button
                  type="button"
                  onClick={() => handleUndo(log.id)}
                  style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', marginTop: '6px', cursor: 'pointer' }}
                >
                  Undo Action
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AuditModal;
