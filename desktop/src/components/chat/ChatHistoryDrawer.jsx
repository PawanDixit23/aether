import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  X, 
  Search, 
  Sparkles,
  ShieldCheck,
  Check,
  CheckCircle2,
  Circle,
  Pin,
  PinOff,
  Folder,
  FolderOpen,
  Calendar,
  Clock,
  ChevronRight,
  Briefcase
} from 'lucide-react';

const PROJECT_LIST = [
  { id: 'all', name: 'All', icon: FolderOpen },
  { id: 'work', name: 'Work', icon: Briefcase, color: '#38bdf8' },
  { id: 'personal', name: 'Personal', icon: Folder, color: '#a855f7' },
  { id: 'ideas', name: 'Ideas', icon: Sparkles, color: '#f59e0b' }
];

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
  userName,
  todayTasks = [],
  todayPendingCount = 0,
  onToggleTask,
  onOpenTasksModal,
  isTemporaryChat = false,
  onStartTemporaryChat
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingSession, setRenamingSession] = useState(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  const [deletingSession, setDeletingSession] = useState(null);
  const [activeProject, setActiveProject] = useState('all');
  const [projectMenuSessionId, setProjectMenuSessionId] = useState(null);

  // Pinned session IDs stored in localStorage with cloud server sync
  const [pinnedSessionIds, setPinnedSessionIds] = useState(() => {
    try {
      const saved = localStorage.getItem('aether_pinned_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Project assignments map { [sessionId]: projectId } stored in localStorage with cloud server sync
  const [sessionProjects, setSessionProjects] = useState(() => {
    try {
      const saved = localStorage.getItem('aether_chat_projects');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Auto-sync pinned sessions and projects whenever sessions arrive from server
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      const serverPinned = sessions.filter(s => s.is_pinned).map(s => s.id);
      if (serverPinned.length > 0) {
        setPinnedSessionIds(prev => {
          const merged = Array.from(new Set([...prev, ...serverPinned]));
          try {
            localStorage.setItem('aether_pinned_sessions', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }

      const projMap = {};
      sessions.forEach(s => {
        if (s.project) projMap[s.id] = s.project;
      });
      if (Object.keys(projMap).length > 0) {
        setSessionProjects(prev => {
          const merged = { ...prev, ...projMap };
          try {
            localStorage.setItem('aether_chat_projects', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    }
  }, [sessions]);

  const handleTogglePin = async (e, sessionId) => {
    e.stopPropagation();
    const willBePinned = !pinnedSessionIds.includes(sessionId);
    setPinnedSessionIds(prev => {
      const next = willBePinned
        ? [...prev, sessionId]
        : prev.filter(id => id !== sessionId);
      try {
        localStorage.setItem('aether_pinned_sessions', JSON.stringify(next));
      } catch (err) {}
      return next;
    });

    try {
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(userEmail ? { 'X-User-Email': userEmail } : {})
      };
      const apiEndpoint = typeof window !== 'undefined' && window.location.port === '5173'
        ? `http://${window.location.hostname}:8000/api`
        : '/api';
      fetch(`${apiEndpoint}/chat/sessions/${encodeURIComponent(sessionId)}/pin`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ is_pinned: willBePinned })
      }).catch(() => {});
    } catch (err) {}
  };

  const handleSetProject = async (e, sessionId, projectId) => {
    if (e) e.stopPropagation();
    setSessionProjects(prev => {
      const next = { ...prev, [sessionId]: projectId || null };
      try {
        localStorage.setItem('aether_chat_projects', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
    setProjectMenuSessionId(null);

    try {
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(userEmail ? { 'X-User-Email': userEmail } : {})
      };
      const apiEndpoint = typeof window !== 'undefined' && window.location.port === '5173'
        ? `http://${window.location.hostname}:8000/api`
        : '/api';
      fetch(`${apiEndpoint}/chat/sessions/${encodeURIComponent(sessionId)}/project`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ project: projectId || null })
      }).catch(() => {});
    } catch (err) {}
  };

  // Filter sessions by search query and project (exclude temporary chats)
  const filteredSessions = useMemo(() => {
    return (sessions || []).filter(s => {
      if (s.id?.startsWith('temp_') || s.id === 'temporary') return false;
      const matchesSearch = !searchQuery.trim() || 
        (s.title || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;

      if (activeProject === 'all') return true;
      const assignedProj = sessionProjects[s.id];
      if (assignedProj) return assignedProj === activeProject;

      // Fallback keyword heuristic if not explicitly assigned
      const titleLower = (s.title || '').toLowerCase();
      if (activeProject === 'work') {
        return /work|project|code|bug|dev|meeting|task|deploy|test|git|api/i.test(titleLower);
      }
      if (activeProject === 'personal') {
        return /weather|food|health|remind|home|family|movie|music|finance/i.test(titleLower);
      }
      if (activeProject === 'ideas') {
        return /idea|plan|draft|concept|note|research|learn/i.test(titleLower);
      }
      return false;
    });
  }, [sessions, searchQuery, activeProject, sessionProjects]);

  // Separate pinned vs unpinned
  const { pinnedSessions, unpinnedSessions } = useMemo(() => {
    const pinned = [];
    const unpinned = [];
    filteredSessions.forEach(s => {
      if (pinnedSessionIds.includes(s.id)) {
        pinned.push(s);
      } else {
        unpinned.push(s);
      }
    });
    return { pinnedSessions: pinned, unpinnedSessions: unpinned };
  }, [filteredSessions, pinnedSessionIds]);

  // Group unpinned sessions by date
  const groupedSessions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const sevenDaysAgo = today - (7 * 86400000);

    const groups = {
      today: [],
      yesterday: [],
      last7Days: [],
      older: []
    };

    unpinnedSessions.forEach(session => {
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
  }, [unpinnedSessions]);

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
      // Clean up pinned status if present
      if (pinnedSessionIds.includes(deletingSession.id)) {
        const next = pinnedSessionIds.filter(id => id !== deletingSession.id);
        setPinnedSessionIds(next);
        try {
          localStorage.setItem('aether_pinned_sessions', JSON.stringify(next));
        } catch (err) {}
      }
    }
    setDeletingSession(null);
  };

  const isTaskCompleted = (t) => {
    return Boolean(t.is_completed === true || t.completed === true || t.status === 'completed');
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

      {/* Slide-over Drawer Panel */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 'min(390px, 100vw)',
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
        {/* Header - Generous Safe Area for Mobile Notch */}
        <div style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 28px)',
          paddingBottom: '14px',
          paddingLeft: '18px',
          paddingRight: '18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0,
          background: 'rgba(12, 20, 36, 0.85)',
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
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.2px' }}>
                Chat History
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '1px' }}>
                Saved conversations & agenda
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
              width: '36px',
              height: '36px',
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

        {/* Action: 2-Part New Chat & Temporary Chat */}
        <div style={{ padding: '14px 18px 8px', flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              onNewChat(activeProject !== 'all' ? activeProject : null);
              onClose();
            }}
            style={{
              background: !isTemporaryChat 
                ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.22) 0%, rgba(59, 130, 246, 0.22) 100%)'
                : 'rgba(255, 255, 255, 0.04)',
              border: !isTemporaryChat ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: !isTemporaryChat ? '#38bdf8' : '#94a3b8',
              borderRadius: '12px',
              padding: '10px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: !isTemporaryChat ? '0 4px 14px rgba(56, 189, 248, 0.16)' : 'none'
            }}
            title="Start a new persistent conversation"
          >
            <Plus size={16} />
            <span style={{ whiteSpace: 'nowrap' }}>New Chat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onStartTemporaryChat) onStartTemporaryChat();
              onClose();
            }}
            style={{
              background: isTemporaryChat 
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.25) 100%)'
                : 'rgba(255, 255, 255, 0.04)',
              border: isTemporaryChat ? '1px solid rgba(245, 158, 11, 0.55)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: isTemporaryChat ? '#fbbf24' : '#94a3b8',
              borderRadius: '12px',
              padding: '10px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isTemporaryChat ? '0 4px 14px rgba(245, 158, 11, 0.2)' : 'none'
            }}
            title="Start temporary chat (history will not be saved)"
          >
            <Clock size={16} />
            <span style={{ whiteSpace: 'nowrap' }}>Temp Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        {sessions.length > 2 && (
          <div style={{ padding: '0 18px 10px', flexShrink: 0 }}>
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
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '8px 12px 8px 34px',
                  color: '#ffffff',
                  fontSize: '0.84rem',
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

        {/* Scrollable Content: Tasks Notification Card + Projects + Pinned + Chats */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          WebkitOverflowScrolling: 'touch'
        }}>

          {/* =========================================================================
              ISSUE 7: TASK NOTIFICATION SECTION (Moved cleanly inside chat history)
              ========================================================================= */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={15} color="#38bdf8" />
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  Today's Tasks & Agenda
                </span>
              </div>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px',
                background: todayPendingCount > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: todayPendingCount > 0 ? '#38bdf8' : '#34d399',
                border: todayPendingCount > 0 ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                {todayPendingCount > 0 ? `${todayPendingCount} pending` : 'All done 🎉'}
              </span>
            </div>

            {/* Top 3 Today Tasks with quick checkbox */}
            {todayTasks && todayTasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {todayTasks.slice(0, 3).map(task => {
                  const completed = isTaskCompleted(task);
                  return (
                    <div 
                      key={task.id || task.title}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <div 
                        onClick={() => onToggleTask && onToggleTask(task.id, !completed)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flex: 1,
                          minWidth: 0,
                          cursor: 'pointer'
                        }}
                      >
                        {completed ? (
                          <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                        ) : (
                          <Circle size={16} color="#64748b" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{
                          fontSize: '0.82rem',
                          color: completed ? '#64748b' : '#f1f5f9',
                          textDecoration: completed ? 'line-through' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {task.title}
                        </span>
                      </div>

                      {task.reminder_time && (
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          ⏰ {task.reminder_time}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#64748b', padding: '2px 0' }}>
                No tasks scheduled for today.
              </div>
            )}

            {/* View Full Tasks modal trigger button */}
            {onOpenTasksModal && (
              <button
                type="button"
                onClick={onOpenTasksModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#38bdf8',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '2px'
                }}
              >
                <span>View Full Agenda & Tasks</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* =========================================================================
              ISSUE 6: PROJECTS SECTION (Organize chats by Projects/Workspaces)
              ========================================================================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Folder size={13} color="#94a3b8" />
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px'
                }}>
                  Projects
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px'
            }}>
              {PROJECT_LIST.map(proj => {
                const IconComponent = proj.icon;
                const isSelected = activeProject === proj.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => setActiveProject(proj.id)}
                    style={{
                      background: isSelected 
                        ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.06)',
                      color: isSelected ? '#38bdf8' : '#94a3b8',
                      borderRadius: '10px',
                      padding: '8px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <IconComponent size={14} color={isSelected ? '#38bdf8' : '#94a3b8'} />
                    <span style={{ fontSize: '0.72rem', fontWeight: isSelected ? 700 : 500 }}>
                      {proj.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =========================================================================
              ISSUE 6: PINNED CHATS SECTION (Pin chat to top)
              ========================================================================= */}
          {pinnedSessions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Pin size={13} color="#f59e0b" fill="#f59e0b" />
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#f59e0b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px'
                  }}>
                    Pinned Chats
                  </span>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  color: '#f59e0b',
                  fontWeight: 700,
                  background: 'rgba(245, 158, 11, 0.15)',
                  padding: '1px 6px',
                  borderRadius: '8px'
                }}>
                  {pinnedSessions.length}
                </span>
              </div>

              {pinnedSessions.map(session => renderSessionItem(session, true))}
            </div>
          )}

          {/* =========================================================================
              ISSUE 6: CHAT SECTION (Recent Conversations Grouped by Time)
              ========================================================================= */}
          {filteredSessions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#64748b',
              fontSize: '0.88rem'
            }}>
              <MessageSquare size={36} color="#334155" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: '0 0 4px', color: '#94a3b8', fontWeight: 700 }}>
                {searchQuery ? 'No matching conversations' : (activeProject !== 'all' ? `No ${activeProject.charAt(0).toUpperCase() + activeProject.slice(1)} chats yet` : 'No conversations in this section')}
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem' }}>
                {searchQuery ? 'Try adjusting your search terms' : (activeProject !== 'all' ? `Click below to start a dedicated chat in this category!` : 'Start a new chat to build your history!')}
              </p>
              {activeProject !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    onNewChat(activeProject);
                    onClose();
                  }}
                  style={{
                    marginTop: '14px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Start {activeProject.charAt(0).toUpperCase() + activeProject.slice(1)} Chat
                </button>
              )}
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

        {/* Footer: User Account & Total Chats */}
        <div style={{
          padding: '12px 18px max(env(safe-area-inset-bottom, 14px), 16px)',
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
          <span style={{ flexShrink: 0, color: '#38bdf8', fontSize: '0.74rem', fontWeight: 700 }}>
            {sessions.length} {sessions.length === 1 ? 'chat' : 'chats'}
          </span>
        </div>
      </div>

      {/* =========================================================================
          RENAME CONVERSATION MODAL
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
          DELETE CONFIRMATION MODAL
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

  function renderSessionItem(session, isPinned) {
    const isActive = session.id === activeSessionId;
    const currentProj = sessionProjects[session.id] || session.project;

    return (
      <div
        key={session.id}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          borderRadius: '14px',
          background: isActive 
            ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0.06) 100%)' 
            : (isPinned ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255, 255, 255, 0.03)'),
          border: isActive 
            ? '1px solid rgba(56, 189, 248, 0.45)' 
            : (isPinned ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)'),
          borderLeft: isActive 
            ? '3px solid #38bdf8' 
            : (isPinned ? '3px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.06)'),
          boxSizing: 'border-box',
          transition: 'all 0.15s',
          gap: '8px'
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
            gap: '10px',
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
            background: isActive 
              ? 'rgba(56, 189, 248, 0.2)' 
              : (isPinned ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isPinned ? (
              <Pin size={14} color="#f59e0b" fill="#f59e0b" />
            ) : (
              <MessageSquare 
                size={14} 
                color={isActive ? '#38bdf8' : '#64748b'} 
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.86rem',
              color: isActive ? '#ffffff' : '#e2e8f0',
              fontWeight: isActive ? 700 : 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {session.title || 'Conversation'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              {isActive && (
                <span style={{ color: '#38bdf8', fontSize: '0.66rem', fontWeight: 600 }}>
                  Active
                </span>
              )}
              {currentProj === 'work' && (
                <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px', fontSize: '0.64rem', fontWeight: 700 }}>
                  💼 Work
                </span>
              )}
              {currentProj === 'personal' && (
                <span style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '1px 5px', borderRadius: '4px', fontSize: '0.64rem', fontWeight: 700 }}>
                  📁 Personal
                </span>
              )}
              {currentProj === 'ideas' && (
                <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '1px 5px', borderRadius: '4px', fontSize: '0.64rem', fontWeight: 700 }}>
                  ✨ Ideas
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Pin, Category/Folder, Rename, Delete */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            flexShrink: 0
          }}
        >
          {/* Category / Project Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setProjectMenuSessionId(projectMenuSessionId === session.id ? null : session.id);
              }}
              style={{
                background: currentProj ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: currentProj ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: currentProj ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s'
              }}
              title="Assign to Category (Work, Personal, Ideas)"
            >
              <Folder size={13} />
            </button>

            {projectMenuSessionId === session.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '36px',
                  zIndex: 60,
                  background: '#0e172a',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '12px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.85)',
                  minWidth: '135px'
                }}
              >
                <div style={{ fontSize: '0.64rem', color: '#64748b', padding: '2px 8px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Assign Folder:
                </div>
                {[
                  { id: null, label: 'None (All)', icon: '💬' },
                  { id: 'work', label: 'Work', icon: '💼', color: '#38bdf8' },
                  { id: 'personal', label: 'Personal', icon: '📁', color: '#a855f7' },
                  { id: 'ideas', label: 'Ideas', icon: '✨', color: '#f59e0b' }
                ].map(opt => (
                  <button
                    key={String(opt.id)}
                    type="button"
                    onClick={(e) => handleSetProject(e, session.id, opt.id)}
                    style={{
                      background: currentProj === opt.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                      border: 'none',
                      color: opt.color || '#cbd5e1',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: currentProj === opt.id ? 700 : 500
                    }}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                    {currentProj === opt.id && <Check size={12} style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pin / Unpin Button */}
          <button
            type="button"
            onClick={(e) => handleTogglePin(e, session.id)}
            style={{
              background: isPinned ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: isPinned ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              color: isPinned ? '#f59e0b' : '#94a3b8',
              cursor: 'pointer',
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            title={isPinned ? "Unpin chat" : "Pin chat to top"}
          >
            {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>

          {/* Rename Button */}
          <button
            type="button"
            onClick={(e) => handleOpenRename(e, session)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              cursor: 'pointer',
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            title="Rename Conversation"
          >
            <Edit3 size={13} />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={(e) => handleOpenDelete(e, session)}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              cursor: 'pointer',
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            title="Delete Conversation"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

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
          padding: '2px 6px'
        }}>
          {groupTitle}
        </div>

        {groupItems.map(session => renderSessionItem(session, false))}
      </div>
    );
  }
};

export default ChatHistoryDrawer;