import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Upload, FileText, Clock } from 'lucide-react';

export const TaskCompletionModal = ({
  task,
  onClose,
  onSave
}) => {
  if (!task) return null;

  const [comment, setComment] = useState(task.completion_comment || '');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [attachments, setAttachments] = useState(() => {
    if (!task.attachments) return [];
    if (Array.isArray(task.attachments)) return task.attachments;
    try {
      const parsed = JSON.parse(task.attachments);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // Track exact mobile visual viewport height (handles virtual soft keyboard correctly)
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      return window.visualViewport.height;
    }
    return null;
  });

  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }
    return () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  }, []);

  const priorityMeta = {
    low: { label: 'Low', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', dot: '🟢' },
    medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', dot: '🟡' },
    high: { label: 'High', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)', dot: '🟠' },
    urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', dot: '🔴' }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 5MB limit.`);
        return;
      }
      const isImg = file.type.startsWith('image/');
      const reader = new FileReader();

      if (isImg) {
        reader.onload = (event) => {
          const img = new window.Image();
          img.onload = () => {
            const maxWidth = 1200;
            const maxHeight = 1200;
            let width = img.width;
            let height = img.height;
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.82);

            setAttachments(prev => [
              ...prev,
              {
                id: Date.now() + Math.random().toString(36).slice(2, 7),
                name: file.name,
                type: file.type,
                size: file.size,
                data: compressedDataUrl
              }
            ]);
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          setAttachments(prev => [
            ...prev,
            {
              id: Date.now() + Math.random().toString(36).slice(2, 7),
              name: file.name,
              type: file.type,
              size: file.size,
              data: event.target.result
            }
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(task.id, {
          completion_comment: comment.trim() || null,
          priority: priority || task.priority,
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : null
        });
      }
      onClose();
    } catch (e) {
      console.error(e);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        height: viewportHeight ? `${viewportHeight}px` : '100%',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d1527',
          borderTop: '2px solid #38bdf8',
          borderRadius: '24px 24px 0 0',
          padding: '16px 16px max(24px, env(safe-area-inset-bottom, 20px))',
          boxShadow: '0 -20px 50px rgba(0, 0, 0, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          animation: 'fadeIn 0.18s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Matching Screenshot 4 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span style={{ fontSize: '1rem' }}>📁</span>
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#38bdf8' }}>
              + Task Note
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.74rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
              for "{task.title}"
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Note / Comment Input - Matching Screenshot 4 Input */}
        <input
          ref={inputRef}
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Task note / comment (e.g. Done today, files uploaded)..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '12px',
            padding: '11px 14px',
            color: '#fff',
            fontSize: '0.92rem',
            outline: 'none'
          }}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') onClose();
          }}
        />

        {/* Priority Selector (Full Width Segmented Control: 4 equal buttons - Matching Screenshot 4) */}
        <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
          {['low', 'medium', 'high', 'urgent'].map(pKey => (
            <button
              key={pKey}
              type="button"
              onClick={() => setPriority(pKey)}
              style={{
                background: priority === pKey ? priorityMeta[pKey].bg : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${priority === pKey ? priorityMeta[pKey].border : 'rgba(255, 255, 255, 0.12)'}`,
                color: priority === pKey ? priorityMeta[pKey].color : '#94a3b8',
                borderRadius: '8px',
                padding: '8px 4px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flex: 1,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: priority === pKey ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{priorityMeta[pKey].dot}</span>
              <span>{priorityMeta[pKey].label}</span>
            </button>
          ))}
        </div>

        {/* Attachments Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '6px 12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#94a3b8' }}>
            <Paperclip size={14} color="#38bdf8" />
            <span>{attachments.length > 0 ? `${attachments.length} file(s) attached` : 'Attach proof/files (optional)'}</span>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600
            }}
          >
            <Upload size={12} /> + Attach
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '80px', overflowY: 'auto' }}>
            {attachments.map(att => {
              const isImg = att.type?.startsWith('image/') || (att.data && att.data.startsWith('data:image/'));
              return (
                <div
                  key={att.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '3px 8px',
                    fontSize: '0.70rem',
                    color: '#cbd5e1'
                  }}
                >
                  {isImg ? (
                    <img src={att.data} alt={att.name} style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'cover' }} />
                  ) : (
                    <FileText size={12} color="#38bdf8" />
                  )}
                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {att.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter(x => x.id !== att.id))}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px', fontSize: '0.80rem', lineHeight: 1 }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Action Buttons - Exactly matching Screenshot 4 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            style={{
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              border: 'none',
              color: '#fff',
              padding: '9px 20px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            {isSaving ? 'Saving...' : 'Save Note ⚡'}
          </button>
        </div>
      </div>
    </div>
  );
};
