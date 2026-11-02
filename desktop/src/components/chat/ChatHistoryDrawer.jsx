import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  X, 
  Search, 
  Sparkles,
  ShieldCheck,
  Check
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
  const [renamingSession, setRenamingSession] = useState(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  const [deletingSession, setDeletingSession] = useState(null);

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

  const handleOpenRename = (e, session) => {
    e.stopPropagation();
    setRenamingSession(session);
    setRenamingTitle(session.title || 'Conversation');
  };

  const handleConfirmRename = async (e) => {
    if (e) e.preventDefault();
    if (renamingSession && renamingTitle.trim()) {
      await onRenameSession(renamingSession.id, renamingTitle.trim());
    }
    setRenamingSession(null);
  };

  const handleOpenDelete = (e, session) => {
    e.stopPropagation();
    setDeletingSession(session);
  };

  const handleConfirmDelete = async () => {
    if (deletingSession) {
      await onDeleteSession(deletingSession.id);
    }
    setDeletingSession(null);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 120,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      />

      {/* Slide-over Drawer Panel - Edge-to-Edge on Mobile, Elegant Sheet on Desktop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 'min(380px, 100vw)',
          background: 'linear-gradient(180deg, #0c1424 0%, #060913 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '20px 0 60px rgba(0, 0, 0, 0.8)',
          zIndex: 130,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* Header - Generous Safe Area for Mobile Status Bar / Camera Notch */}
        <div style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 36px)',
          paddingBottom: '16px',
          paddingLeft: '20px',
          paddingRight: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0,
          background: 'rgba(12, 20, 36, 0.8)',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(168, 85, 247, 0.25))',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)'
            }}>
              <Sparkles size={18} color="#38bdf8" />
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.08rem', letterSpacing: '0.2px' }}>
                Chat History
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '1px' }}>
                Your saved conversations
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#e2e8f0',
              borderRadius: '12px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="Close Drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action: New Chat Button */}
        <div style={{ padding: '16px 20px 10px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              color: '#38bdf8',
              borderRadius: '14px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontWeight: 700,
              fontSize: '0.94rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 18px rgba(56, 189, 248, 0.18)'
            }}
          >
            <Plus size={20} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        {sessions.length > 2 && (
          <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search size={15} color="#64748b" style={{ position: 'absolute', left: '14px' }} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '9px 12px 9px 38px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
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
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          WebkitOverflowScrolling: 'touch'
        }}>
          {sessions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#64748b',
              fontSize: '0.88rem'
            }}>
              <MessageSquare size={40} color="#334155" style={{ margin: '0 auto 14px', display: 'block' }} />
              <p style={{ margin: '0 0 6px', color: '#94a3b8', fontWeight: 700 }}>No conversations yet</p>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>Ask Aether anything to create your first saved chat!</p>
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
          padding: '14px 20px max(env(safe-area-inset-bottom, 16px), 20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          color: '#64748b',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0 }} />
            <span style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              color: '#cbd5e1',
              maxWidth: '220px',
              fontWeight: 600
            }}>
              {userEmail || 'Local Account'}
            </span>
          </div>
          <span style={{ flexShrink: 0, color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700 }}>
            {sessions.length} {sessions.length === 1 ? 'chat' : 'chats'}
          </span>
        </div>
      </div>

      {/* =========================================================================
          RENAME CONVERSATION MODAL (100% Reliable on Mobile Virtual Keyboards)
          ========================================================================= */}
      {renamingSession && (
        <div 
          onClick={() => setRenamingSession(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 160,
            background: 'rgba(2, 6, 23, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d1527',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Edit3 size={18} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 700 }}>
                Rename Conversation
              </h3>
            </div>

            <form onSubmit={handleConfirmRename}>
              <input
                type="text"
                value={renamingTitle}
                onChange={(e) => setRenamingTitle(e.target.value)}
                autoFocus
                placeholder="Enter new conversation title"
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(56, 189, 248, 0.5)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '18px'
                }}
              />

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setRenamingSession(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#94a3b8',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px 22px',
                    borderRadius: '12px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)'
                  }}
                >
                  Save Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE CONFIRMATION MODAL (100% Reliable on Mobile Touch)
          ========================================================================= */}
      {deletingSession && (
        <div 
          onClick={() => setDeletingSession(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 160,
            background: 'rgba(2, 6, 23, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d1527',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Trash2 size={20} color="#f87171" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f87171', fontWeight: 700 }}>
                Delete Conversation?
              </h3>
            </div>

            <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong style={{ color: '#ffffff' }}>"{deletingSession.title}"</strong>? This chat and its messages cannot be recovered.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeletingSession(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94a3b8',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 22px',
                  borderRadius: '12px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  function renderGroup(groupTitle, groupItems) {
    if (!groupItems || groupItems.length === 0) return null;

    return (
      <div key={groupTitle} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 800,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          padding: '2px 8px'
        }}>
          {groupTitle}
        </div>

        {groupItems.map(session => {
          const isActive = session.id === activeSessionId;

          return (
            <div
              key={session.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '14px',
                background: isActive 
                  ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0.06) 100%)' 
                  : 'rgba(255, 255, 255, 0.03)',
                border: isActive 
                  ? '1px solid rgba(56, 189, 248, 0.45)' 
                  : '1px solid rgba(255, 255, 255, 0.06)',
                borderLeft: isActive 
                  ? '3px solid #38bdf8' 
                  : '1px solid rgba(255, 255, 255, 0.06)',
                boxSizing: 'border-box',
                transition: 'all 0.15s',
                gap: '10px'
              }}
            >
              {/* Clickable Area to Select Chat */}
              <div
                onClick={() => {
                  onSelectSession(session.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flex: 1,
                  minWidth: 0,
                  cursor: 'pointer',
                  padding: '2px 0'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <MessageSquare 
                    size={15} 
                    color={isActive ? '#38bdf8' : '#64748b'} 
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.88rem',
                    color: isActive ? '#ffffff' : '#e2e8f0',
                    fontWeight: isActive ? 700 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {session.title || 'Conversation'}
                  </div>
                  {isActive && (
                    <div style={{ color: '#38bdf8', fontSize: '0.68rem', fontWeight: 600, marginTop: '2px' }}>
                      Active
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Clean, Large Touch Targets */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  flexShrink: 0
                }}
              >
                <button
                  type="button"
                  onClick={(e) => handleOpenRename(e, session)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}
                  title="Rename Conversation"
                >
                  <Edit3 size={14} />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleOpenDelete(e, session)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}
                  title="Delete Conversation"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
};

export default ChatHistoryDrawer;
