import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Search, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const ChatHistoryDrawer = ({
  isOpen,
  onClose,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  userEmail,
  userName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const sevenDaysAgo = today - (7 * 86400000);

    const filtered = (sessions || []).filter(s => 
      !searchQuery.trim() || 
      (s.title || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    const groups = {
      today: [],
      yesterday: [],
      last7Days: [],
      older: []
    };

    filtered.forEach(session => {
      const sessionDate = session.updated_at 
        ? new Date(session.updated_at).getTime() 
        : (session.created_at ? new Date(session.created_at).getTime() : 0);
      if (sessionDate >= today) {
        groups.today.push(session);
      } else if (sessionDate >= yesterday) {
        groups.yesterday.push(session);
      } else if (sessionDate >= sevenDaysAgo) {
        groups.last7Days.push(session);
      } else {
        groups.older.push(session);
      }
    });

    return groups;
  }, [sessions, searchQuery]);

  const handleStartRename = (e, session) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingSessionId(session.id);
    setEditingTitle(session.title || 'Conversation');
    setConfirmDeleteId(null);
  };

  const handleSaveRename = async (e, sessionId) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (editingTitle.trim()) {
      await onRenameSession(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleCancelRename = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingSessionId(null);
  };

  const handleDeleteClick = (e, sessionId) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setConfirmDeleteId(sessionId);
    setEditingSessionId(null);
  };

  const handleConfirmDelete = async (e, sessionId) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await onDeleteSession(sessionId);
    setConfirmDeleteId(null);
  };

  const handleCancelDelete = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setConfirmDeleteId(null);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 120,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      />

      {/* Slide-over Drawer Panel */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'min(340px, 85vw)',
          background: 'linear-gradient(180deg, #0c1322 0%, #070a14 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          borderTopRightRadius: '24px',
          borderBottomRightRadius: '24px',
          boxShadow: '16px 0 48px rgba(0, 0, 0, 0.7)',
          zIndex: 130,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* Header - Safe Area Padding for Mobile Status Bar & Notch */}
        <div style={{
          padding: 'max(env(safe-area-inset-top, 20px), 24px) 18px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(168, 85, 247, 0.25))',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(56, 189, 248, 0.2)'
            }}>
              <Sparkles size={16} color="#38bdf8" />
            </div>
            <div>
              <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1.02rem', letterSpacing: '0.2px' }}>
                Chat History
              </div>
              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                Your saved conversations
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              borderRadius: '10px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="Close Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action: New Chat Button */}
        <div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(59, 130, 246, 0.18) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              borderRadius: '14px',
              padding: '11px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 16px rgba(56, 189, 248, 0.15)'
            }}
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        {sessions.length > 2 && (
          <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '8px 12px 8px 34px',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          WebkitOverflowScrolling: 'touch'
        }}>
          {sessions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 16px',
              color: '#64748b',
              fontSize: '0.85rem'
            }}>
              <MessageSquare size={36} color="#334155" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: '0 0 6px', color: '#94a3b8', fontWeight: 600 }}>No conversations yet</p>
              <p style={{ margin: 0, fontSize: '0.78rem' }}>Ask Aether anything to create your first saved chat!</p>
            </div>
          ) : (
            <>
              {renderGroup("Today", groupedSessions.today)}
              {renderGroup("Yesterday", groupedSessions.yesterday)}
              {renderGroup("Previous 7 Days", groupedSessions.last7Days)}
              {renderGroup("Older", groupedSessions.older)}
            </>
          )}
        </div>

        {/* Footer: User Account & Safe Area Padding */}
        <div style={{
          padding: '12px 18px max(env(safe-area-inset-bottom, 16px), 18px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#64748b',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <ShieldCheck size={15} color="#10b981" style={{ flexShrink: 0 }} />
            <span style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              color: '#94a3b8',
              maxWidth: '190px',
              fontWeight: 500
            }}>
              {userEmail || 'Local Account'}
            </span>
          </div>
          <span style={{ flexShrink: 0, color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>
            {sessions.length} {sessions.length === 1 ? 'chat' : 'chats'}
          </span>
        </div>
      </div>
    </>
  );

  function renderGroup(groupTitle, groupItems) {
    if (!groupItems || groupItems.length === 0) return null;

    return (
      <div key={groupTitle} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          padding: '2px 8px'
        }}>
          {groupTitle}
        </div>

        {groupItems.map(session => {
          const isActive = session.id === activeSessionId;
          const isEditing = editingSessionId === session.id;
          const isConfirmingDelete = confirmDeleteId === session.id;

          return (
            <div
              key={session.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '12px',
                background: isActive 
                  ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.16) 0%, rgba(56, 189, 248, 0.05) 100%)' 
                  : 'rgba(255, 255, 255, 0.03)',
                border: isActive 
                  ? '1px solid rgba(56, 189, 248, 0.4)' 
                  : '1px solid rgba(255, 255, 255, 0.05)',
                borderLeft: isActive 
                  ? '3px solid #38bdf8' 
                  : '1px solid rgba(255, 255, 255, 0.05)',
                boxSizing: 'border-box',
                transition: 'all 0.15s'
              }}
            >
              {isEditing ? (
                /* Inline Rename Editor with large touch targets */
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}
                  onClick={e => e.stopPropagation()}
                  onTouchEnd={e => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(e, session.id);
                      if (e.key === 'Escape') handleCancelRename(e);
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid #38bdf8',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      outline: 'none',
                      minWidth: 0
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => handleSaveRename(e, session.id)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.25)',
                      border: '1px solid rgba(16, 185, 129, 0.5)',
                      color: '#10b981',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.74rem',
                      fontWeight: 600
                    }}
                    title="Save title"
                  >
                    <Check size={14} />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleCancelRename(e)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#94a3b8',
                      borderRadius: '8px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : isConfirmingDelete ? (
                /* Delete Confirmation Row */
                <div 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}
                  onClick={e => e.stopPropagation()}
                  onTouchEnd={e => e.stopPropagation()}
                >
                  <span style={{ fontSize: '0.76rem', color: '#f87171', fontWeight: 600 }}>
                    Delete conversation?
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={(e) => handleConfirmDelete(e, session.id)}
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.25)', 
                        border: '1px solid rgba(239, 68, 68, 0.5)', 
                        color: '#f87171', 
                        borderRadius: '8px', 
                        padding: '4px 10px', 
                        fontSize: '0.72rem', 
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCancelDelete(e)}
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.08)', 
                        border: '1px solid rgba(255, 255, 255, 0.12)', 
                        color: '#94a3b8', 
                        borderRadius: '8px', 
                        padding: '4px 10px', 
                        fontSize: '0.72rem', 
                        cursor: 'pointer' 
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal Session Row: Left side for selecting, Right side for actions */
                <>
                  <div
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flex: 1,
                      minWidth: 0,
                      cursor: 'pointer',
                      padding: '2px 0'
                    }}
                  >
                    <MessageSquare 
                      size={16} 
                      color={isActive ? '#38bdf8' : '#64748b'} 
                      style={{ flexShrink: 0 }} 
                    />
                    <span style={{
                      fontSize: '0.84rem',
                      color: isActive ? '#f8fafc' : '#cbd5e1',
                      fontWeight: isActive ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {session.title || 'Conversation'}
                    </span>
                  </div>

                  {/* Actions: Distinct touch targets that never bubble to session click */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      flexShrink: 0
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(e, session)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s'
                      }}
                      title="Rename"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(e, session.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s'
                      }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }
};

export default ChatHistoryDrawer;
