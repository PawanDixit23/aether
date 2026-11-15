import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, MessageSquare, Paperclip, Upload, FileText, X } from 'lucide-react';

export const TaskCompletionModal = ({
  task,
  onClose,
  onSave
}) => {
  if (!task) return null;

  const [comment, setComment] = useState(task.completion_comment || '');
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
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        paddingTop: 'max(env(safe-area-inset-top, 40px), 40px)',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d1527',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '24px',
          padding: '22px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          animation: 'fadeIn 0.18s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} color="#10b981" />
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                Task Completed!
              </span>
            </div>
            <div style={{ fontSize: '0.80rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500, lineHeight: 1.35 }}>
              "{task.title}"
            </div>
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Note / Comment Text Area */}
        <div>
          <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', fontWeight: 600 }}>
            <MessageSquare size={13} color="#38bdf8" />
            <span>Add Completion Note / Comment (Optional)</span>
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Done today, files uploaded, followed up with team..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '12px',
              padding: '10px 12px',
              color: '#e0f2fe',
              fontSize: '0.84rem',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            autoFocus
          />
        </div>

        {/* Attachments Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              <Paperclip size={13} color="#38bdf8" />
              <span>Attachments (Photos, Receipts, Docs)</span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 600
              }}
            >
              <Upload size={12} /> + Attach File
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

          {attachments.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto', padding: '2px 0' }}>
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
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      color: '#cbd5e1'
                    }}
                  >
                    {isImg ? (
                      <img src={att.data} alt={att.name} style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                      <FileText size={12} color="#38bdf8" />
                    )}
                    <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter(x => x.id !== att.id))}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px', fontSize: '0.82rem', lineHeight: 1 }}
                      title="Remove attachment"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '0.70rem', color: '#64748b', fontStyle: 'italic', padding: '2px 0' }}>
              Optional: attach photos, receipts, or PDF files.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.80rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Skip / Done
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            style={{
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              border: 'none',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.80rem',
              cursor: 'pointer',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            {isSaving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
};
