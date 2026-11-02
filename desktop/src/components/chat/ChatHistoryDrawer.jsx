import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Clock, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Search, 
  Sparkles,
  ChevronRight,
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

    const filtered = sessions.filter(s => 
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
      const sessionDate = session.updated_at ? new Date(session.updated_at).getTime() : (session.created_at ? new Date(session.created_at).getTime() : 0);
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
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title || 'Conversation');
    setConfirmDeleteId(null);
  };

  const handleSaveRename = async (e, sessionId) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      await onRenameSession(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const handleDeleteClick = (e, sessionId) => {
    e.stopPropagation();
    setConfirmDeleteId(sessionId);
    setEditingSessionId(null);
  };

  const handleConfirmDelete = async (e, sessionId) => {
    e.stopPropagation();
    await onDeleteSession(sessionId);
    setConfirmDeleteId(null);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
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
          background: 'rgba(3, 7, 18, 0.65)',
          backdropFilter: 'blur(8px)',
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
          width: 'min(360px, 86vw)',
          background: 'linear-gradient(180deg, #090e1a 0%, #060913 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '16px 0 40px rgba(0, 0, 0, 0.6)',
          zIndex: 130,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={15} color="#38bdf8" />
            </div>
            <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.98rem', letterSpacing: '0.2px' }}>
              Chat History
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="Close Drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action: New Chat Button */}
        <div style={{ padding: '14px 16px 10px' }}>
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 10px rgba(56, 189, 248, 0.1)'
            }}
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        {sessions.length > 3 && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px' }} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '7px 10px 7px 32px',
                  color: '#ffffff',
                  fontSize: '0.8rem',
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
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {sessions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 16px',
              color: '#64748b',
              fontSize: '0.85rem'
            }}>
              <MessageSquare size={32} color="#334155" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: '0 0 6px', color: '#94a3b8', fontWeight: 600 }}>No conversations yet</p>
              <p style={{ margin: 0, fontSize: '0.78rem' }}>Start chatting with Aether to create your first conversation!</p>
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

        {/* Footer: User Account & Multi-tenant status */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <ShieldCheck size={14} color="#10b981" style={{ flexShrink: 0 }} />
            <span style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              color: '#94a3b8',
              maxWidth: '220px'
            }}>
              {userEmail || 'Local Account'}
            </span>
          </div>
          <span style={{ flexShrink: 0, color: '#64748b', fontSize: '0.7rem' }}>
            {sessions.length} {sessions.length === 1 ? 'chat' : 'chats'}
          </span>
        </div>
      </div>
    </>
  );

  function renderGroup(groupTitle, groupItems) {
    if (!groupItems || groupItems.length === 0) return null;

    return (
      <div key={groupTitle} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          padding: '4px 8px'
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
              onClick={() => {
                if (!isEditing && !isConfirmingDelete) {
                  onSelectSession(session.id);
                  onClose();
                }
              }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '10px',
                background: isActive 
                  ? 'rgba(56, 189, 248, 0.12)' 
                  : 'rgba(255, 255, 255, 0.02)',
                border: isActive 
                  ? '1px solid rgba(56, 189, 248, 0.35)' 
                  : '1px solid rgba(255, 255, 255, 0.04)',
                borderLeft: isActive 
                  ? '3px solid #38bdf8' 
                  : '1px solid rgba(255, 255, 255, 0.04)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              }}
            >
              <MessageSquare 
                size={16} 
                color={isActive ? '#38bdf8' : '#64748b'} 
                style={{ flexShrink: 0 }} 
              />

              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }} onClick={e => e.stopPropagation()}>
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
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid #38bdf8',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => handleSaveRename(e, session.id)}
                    style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '2px' }}
                    title="Save"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelRename}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : isConfirmingDelete ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flex: 1 }} onClick={e => e.stopPropagation()}>
                  <span style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 600 }}>Delete chat?</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={(e) => handleConfirmDelete(e, session.id)}
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.2)', 
                        border: '1px solid rgba(239, 68, 68, 0.4)', 
                        color: '#ef4444', 
                        borderRadius: '6px', 
                        padding: '2px 8px', 
                        fontSize: '0.7rem', 
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.08)', 
                        border: 'none', 
                        color: '#94a3b8', 
                        borderRadius: '6px', 
                        padding: '2px 8px', 
                        fontSize: '0.7rem', 
                        cursor: 'pointer' 
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span style={{
                    flex: 1,
                    fontSize: '0.82rem',
                    color: isActive ? '#f8fafc' : '#cbd5e1',
                    fontWeight: isActive ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {session.title || 'Conversation'}
                  </span>

                  {/* Actions on hover/touch */}
                  <div 
                    className="chat-item-actions"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      opacity: isActive ? 1 : 0.8
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(e, session)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '3px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.15s'
                      }}
                      title="Rename Chat"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(e, session.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '3px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.15s'
                      }}
                      title="Delete Chat"
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

