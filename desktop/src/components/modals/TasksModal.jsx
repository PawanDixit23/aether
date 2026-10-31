import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Check, 
  ExternalLink, 
  Trash2,
  CalendarCheck2,
  Search,
  AlertCircle,
  Repeat,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Inbox,
  Sparkles,
  Layers,
  X
} from 'lucide-react';

export const TasksModal = ({
  isOpen,
  onClose,
  combinedTasks = [],
  remindersViewMode,
  setRemindersViewMode,
  agendaFilter = 'today',
  setAgendaFilter,
  calSelectedDate,
  setCalSelectedDate,
  formatLocalDateStr,
  getTaskDateStr,
  handleToggleTask,
  handleDeleteTask,
  handleCreateTask,
  newTaskInput,
  setNewTaskInput,
  handleRescheduleAllOverdue,
  expandedTaskIds = {},
  toggleSubtasksExpand,
  setShowGCalConnectModal
}) => {
  if (!isOpen) return null;

  // Local UI filters matching Todoli TaskScreen
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'high' | 'medium' | 'low'
  const [localExpanded, setLocalExpanded] = useState({});

  const todayStr = formatLocalDateStr(new Date());
  const isTaskDone = (t) => t.is_completed || t.status === 'completed';
  const isDaily = (t) => t?.recurrence === 'daily' || t?.repeat === 'daily' || String(t?.recurrence || '').toLowerCase().includes('daily');

  const isTaskOverdue = (t) => {
    if (isTaskDone(t)) return false;
    const tDateStr = getTaskDateStr(t);
    if (tDateStr && tDateStr < todayStr) return true;
    if (tDateStr === todayStr && t.reminder_time) {
      try {
        const m = t.reminder_time.match(/(\d+):?(\d+)?\s*(AM|PM)/i);
        if (m) {
          let hrs = parseInt(m[1], 10);
          const mins = m[2] ? parseInt(m[2], 10) : 0;
          const ampm = m[3].toUpperCase();
          if (ampm === 'PM' && hrs < 12) hrs += 12;
          if (ampm === 'AM' && hrs === 12) hrs = 0;
          const dueNow = new Date();
          dueNow.setHours(hrs, mins, 0, 0);
          if (dueNow < new Date()) return true;
        }
      } catch (e) {}
    }
    return false;
  };

  // Section Counts matching Todoli statusFilters
  const allCount = combinedTasks.length;
  const todayTasks = combinedTasks.filter(t => isDaily(t) || getTaskDateStr(t) === todayStr || (!getTaskDateStr(t) && !t.is_google_calendar));
  const todayCount = todayTasks.length;
  const overdueCount = combinedTasks.filter(t => isTaskOverdue(t)).length;
  const upcomingCount = combinedTasks.filter(t => !isTaskDone(t) && !isDaily(t) && getTaskDateStr(t) && getTaskDateStr(t) > todayStr).length;
  const completedCount = combinedTasks.filter(t => isTaskDone(t)).length;

  // Progress stats for Today
  const todayCompleted = todayTasks.filter(t => isTaskDone(t)).length;
  const progressPercent = todayCount > 0 ? Math.round((todayCompleted / todayCount) * 100) : 0;

  // Status Filter options
  const statusFilterTabs = [
    { key: 'all', label: 'Inbox', count: allCount, icon: Inbox },
    { key: 'today', label: 'Today', count: todayCount, icon: Calendar },
    { key: 'overdue', label: 'Overdue', count: overdueCount, icon: AlertCircle, isAlert: overdueCount > 0 },
    { key: 'upcoming', label: 'Upcoming', count: upcomingCount, icon: Clock },
    { key: 'completed', label: 'Completed', count: completedCount, icon: CheckCircle2 }
  ];

  // Priority Filter options
  const priorityFilterOptions = [
    { key: 'all', label: 'All Priorities', dot: null },
    { key: 'high', label: 'High', dot: '#EF4444' },
    { key: 'medium', label: 'Medium', dot: '#F59E0B' },
    { key: 'low', label: 'Low', dot: '#10B981' }
  ];

  // Filter tasks based on status, priority, and search
  const filteredTasks = useMemo(() => {
    return combinedTasks.filter(t => {
      const done = isTaskDone(t);
      const overdue = isTaskOverdue(t);
      const tDateStr = getTaskDateStr(t);
      const daily = isDaily(t);
      const isToday = daily || tDateStr === todayStr || (!tDateStr && !t.is_google_calendar);

      // Status filter
      if (agendaFilter === 'completed' && !done) return false;
      if (agendaFilter === 'overdue' && !overdue) return false;
      if (agendaFilter === 'upcoming' && (done || daily || !tDateStr || tDateStr <= todayStr)) return false;
      if (agendaFilter === 'today' && !isToday) return false;

      // Priority filter
      const p = (t.priority || 'medium').toLowerCase();
      if (priorityFilter === 'high' && p !== 'high' && p !== 'urgent') return false;
      if (priorityFilter === 'medium' && p !== 'medium' && p !== 'normal') return false;
      if (priorityFilter === 'low' && p !== 'low') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (t.title || '').toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      // Uncompleted first, then overdue first, then by date/time
      const aDone = isTaskDone(a);
      const bDone = isTaskDone(b);
      if (aDone !== bDone) return aDone ? 1 : -1;

      const aOverdue = isTaskOverdue(a);
      const bOverdue = isTaskOverdue(b);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

      const dA = getTaskDateStr(a) || '9999-99-99';
      const dB = getTaskDateStr(b) || '9999-99-99';
      return dA.localeCompare(dB);
    });
  }, [combinedTasks, agendaFilter, priorityFilter, searchQuery, todayStr]);

  const toggleExpand = (id) => {
    setLocalExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    if (toggleSubtasksExpand) toggleSubtasksExpand(id);
  };

  const getPriorityAccent = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'urgent' || p === 'high') return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444' };
    if (p === 'low') return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981' };
    return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B' };
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(10, 15, 29, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 120,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px'
    }}>
      <div style={{
        background: '#0F172A',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85)',
        overflow: 'hidden'
      }}>
        
        {/* ── 1. TODOLI HEADER & BRANDING ── */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)'
              }}>
                <Check size={20} strokeWidth={3} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F8FAFC', margin: 0, letterSpacing: '-0.02em' }}>
                  Tasks
                </h2>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{todayCompleted} of {todayCount} completed today</span>
                  <span style={{ color: '#0D9488', fontWeight: 700 }}>({progressPercent}%)</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowGCalConnectModal && setShowGCalConnectModal(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '11px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Sync Google Calendar"
              >
                <CalendarCheck2 size={17} />
              </button>
              <button 
                type="button" 
                onClick={onClose} 
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Progress bar matching Todoli */}
          <div style={{
            marginTop: '12px',
            width: '100%',
            height: '5px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, progressPercent))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #0D9488 0%, #10B981 100%)',
              borderRadius: '999px',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
        </div>

        {/* ── 2. SEARCH BAR & QUICK FILTERS ── */}
        <div style={{ padding: '12px 18px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Search Input */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={15} color="#64748B" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              placeholder="Search tasks or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#1E293B',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '9px 12px 9px 36px',
                color: '#F8FAFC',
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
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* ── Status Filters Bar (Inbox, Today, Overdue, Upcoming, Completed) ── */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {statusFilterTabs.map((tab) => {
              const isSelected = agendaFilter === tab.key;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAgendaFilter(tab.key)}
                  style={{
                    background: isSelected 
                      ? '#0D9488' 
                      : tab.isAlert && tab.count > 0 
                        ? 'rgba(239, 68, 68, 0.14)' 
                        : '#1E293B',
                    border: isSelected 
                      ? '1px solid #0D9488' 
                      : tab.isAlert && tab.count > 0 
                        ? '1px solid rgba(239, 68, 68, 0.35)' 
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    color: isSelected 
                      ? '#FFFFFF' 
                      : tab.isAlert && tab.count > 0 
                        ? '#F87171' 
                        : '#94A3B8',
                    borderRadius: '12px',
                    padding: '7px 13px',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 800 : 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(13, 148, 136, 0.35)' : 'none'
                  }}
                >
                  <TabIcon size={13} strokeWidth={isSelected ? 2.5 : 2} />
                  <span>{tab.label}</span>
                  <span style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '1px 6px',
                    fontSize: '0.68rem',
                    fontWeight: 700
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Priority Sub-Filters Bar (All, High, Medium, Low) ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none'
          }}>
            <span style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginRight: '2px', letterSpacing: '0.04em' }}>
              Priority:
            </span>
            {priorityFilterOptions.map((p) => {
              const isSelected = priorityFilter === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPriorityFilter(p.key)}
                  style={{
                    background: isSelected ? '#1E293B' : 'transparent',
                    border: isSelected ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#F8FAFC' : '#94A3B8',
                    borderRadius: '10px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: isSelected ? 700 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {p.dot && (
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: p.dot
                    }} />
                  )}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* ── 3. OVERDUE RECOVERY BANNER (Todoli Recovery Mode) ── */}
        {overdueCount > 0 && agendaFilter !== 'completed' && (
          <div style={{
            margin: '8px 18px 0',
            padding: '10px 14px',
            borderRadius: '14px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '1.1rem' }}>🌿</span>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FCA5A5' }}>
                  {overdueCount} task{overdueCount > 1 ? 's are' : ' is'} overdue
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                  Reschedule overdue items to get back on track
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRescheduleAllOverdue}
              style={{
                background: '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
              }}
            >
              Reschedule All ⚡
            </button>
          </div>
        )}

        {/* ── 4. QUICK ADD TASK BAR ── */}
        <div style={{ padding: '12px 18px 8px' }}>
          <form 
            onSubmit={handleCreateTask}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#1E293B',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '4px 6px 4px 14px'
            }}
          >
            <input
              type="text"
              placeholder="+ Add task (e.g. Drink 2L water at 3 PM)..."
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#F8FAFC',
                fontSize: '0.86rem',
                outline: 'none'
              }}
            />
            <button 
              type="submit" 
              style={{
                background: '#0D9488',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(13, 148, 136, 0.4)'
              }}
            >
              <Plus size={14} strokeWidth={2.8} />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* ── 5. TODOLI TASK LIST CARDS ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {filteredTasks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 16px',
              color: '#64748B',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B'
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div style={{ fontSize: '0.90rem', fontWeight: 600, color: '#94A3B8' }}>
                {searchQuery ? `No tasks matching "${searchQuery}"` :
                 agendaFilter === 'today' ? '🎉 No pending tasks for today!' :
                 agendaFilter === 'overdue' ? '✨ No overdue tasks! All caught up.' :
                 agendaFilter === 'upcoming' ? 'No upcoming tasks scheduled.' :
                 agendaFilter === 'completed' ? 'No completed tasks yet.' :
                 'Your task stack is clear!'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', maxWidth: '280px' }}>
                {agendaFilter === 'today' ? 'Add a task or prompt Aether: "Remind me to drink water at 3 PM"' : 'Tasks you create or sync will show up here.'}
              </div>
            </div>
          ) : (
            filteredTasks.map(t => {
              const done = isTaskDone(t);
              const taskDateStr = getTaskDateStr(t);
              const overdue = isTaskOverdue(t);
              const daily = isDaily(t);
              const priorityAccent = getPriorityAccent(t.priority);
              const hasSubtasks = t.subtasks && t.subtasks.length > 0;
              const subtaskCount = hasSubtasks ? t.subtasks.length : 0;
              const completedSubCount = hasSubtasks 
                ? t.subtasks.filter(s => s.is_completed || s.status === 'completed' || s.completed).length 
                : 0;
              const isExpanded = localExpanded[t.id] || expandedTaskIds[t.id];

              return (
                <div
                  key={t.id}
                  style={{
                    background: done 
                      ? 'rgba(30, 41, 59, 0.45)' 
                      : overdue 
                        ? 'rgba(30, 41, 59, 0.85)' 
                        : '#1E293B',
                    border: done 
                      ? '1px solid rgba(16, 185, 129, 0.15)' 
                      : overdue 
                        ? '1px solid rgba(239, 68, 68, 0.35)' 
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    borderBottom: `3px solid ${priorityAccent.border}`,
                    borderRadius: '16px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    
                    {/* Todoli Squircle Checkbox */}
                    <div
                      onClick={() => !t.is_google_calendar && handleToggleTask(t.id)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '8px',
                        border: done 
                          ? '2px solid #10B981' 
                          : overdue 
                            ? '2px solid #EF4444' 
                            : '2px solid #475569',
                        background: done ? '#10B981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: t.is_google_calendar ? 'default' : 'pointer',
                        flexShrink: 0,
                        marginTop: '2px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {done && <Check size={15} color="#FFFFFF" strokeWidth={3.2} />}
                    </div>

                    {/* Title & Metadata */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: done ? '#64748B' : '#F8FAFC',
                        fontSize: '0.94rem',
                        fontWeight: 600,
                        textDecoration: done ? 'line-through' : 'none',
                        wordBreak: 'break-word',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.35
                      }}>
                        {t.title}
                      </div>

                      {/* Description if present */}
                      {t.description && (
                        <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: '3px', wordBreak: 'break-word' }}>
                          {t.description}
                        </div>
                      )}

                      {/* Metadata Row: Time, Recurrence, Status, Priority */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        
                        {/* Time Badge with Clock Icon */}
                        <span style={{
                          color: done ? '#64748B' : overdue ? '#F87171' : '#94A3B8',
                          fontSize: '0.72rem',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Clock size={12} color={done ? '#64748B' : overdue ? '#F87171' : '#0D9488'} />
                          <span>
                            {overdue && '⚠️ '}
                            {t.reminder_time 
                              ? (overdue ? `Overdue - ${t.reminder_time}` : t.reminder_time)
                              : (taskDateStr ? formatLocalDateStr(t.due_date) : 'Today')}
                          </span>
                        </span>

                        {/* Status Badge */}
                        <span style={{
                          background: done ? 'rgba(16, 185, 129, 0.16)' : overdue ? 'rgba(239, 68, 68, 0.18)' : 'rgba(13, 148, 136, 0.16)',
                          color: done ? '#34D399' : overdue ? '#EF4444' : '#0D9488',
                          border: done ? '1px solid rgba(16, 185, 129, 0.3)' : overdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(13, 148, 136, 0.3)',
                          borderRadius: '6px',
                          padding: '1px 6px',
                          fontSize: '0.64rem',
                          fontWeight: 700
                        }}>
                          {done ? '✓ Completed' : overdue ? '⚠️ Overdue' : '⏳ Pending'}
                        </span>

                        {/* Recurrence Badge (Todoli Style) */}
                        {daily && (
                          <span style={{
                            background: 'rgba(168, 85, 247, 0.14)',
                            color: '#C084FC',
                            border: '1px solid rgba(168, 85, 247, 0.28)',
                            borderRadius: '6px',
                            padding: '1px 6px',
                            fontSize: '0.64rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Repeat size={10} />
                            <span>Daily{t.reminder_time ? ` at ${t.reminder_time}` : ''}</span>
                          </span>
                        )}

                        {/* Priority Badge */}
                        {t.priority && (
                          <span style={{
                            background: priorityAccent.bg,
                            color: priorityAccent.color,
                            border: `1px solid ${priorityAccent.color}40`,
                            borderRadius: '6px',
                            padding: '1px 6px',
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            textTransform: 'capitalize'
                          }}>
                            {t.priority}
                          </span>
                        )}

                        {/* GCal Badge */}
                        {t.is_google_calendar && (
                          <span style={{
                            background: 'rgba(66, 133, 244, 0.16)',
                            color: '#60A5FA',
                            border: '1px solid rgba(66, 133, 244, 0.3)',
                            borderRadius: '6px',
                            padding: '1px 6px',
                            fontSize: '0.64rem',
                            fontWeight: 600
                          }}>
                            GCal
                          </span>
                        )}

                      </div>
                    </div>

                    {/* Right Action: Subtask counter chip & Delete icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {hasSubtasks && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(t.id)}
                          style={{
                            background: 'rgba(13, 148, 136, 0.15)',
                            border: '1px solid rgba(13, 148, 136, 0.3)',
                            borderRadius: '8px',
                            padding: '3px 8px',
                            color: '#0D9488',
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Toggle subtasks"
                        >
                          <span>{completedSubCount}/{subtaskCount}</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}

                      {t.is_google_calendar ? (
                        t.htmlLink && (
                          <button
                            type="button"
                            onClick={() => window.open(t.htmlLink, '_blank', 'noopener,noreferrer')}
                            style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: '4px' }}
                            title="Open in GCal"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            opacity: 0.6,
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            transition: 'opacity 0.15s ease'
                          }}
                          title="Delete task"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Inline Expanded Subtasks (Todoli Style) */}
                  {isExpanded && hasSubtasks && (
                    <div style={{
                      marginTop: '6px',
                      paddingLeft: '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '8px'
                    }}>
                      {t.subtasks.map((st, idx) => {
                        const stDone = st.is_completed || st.status === 'completed' || st.completed;
                        return (
                          <div
                            key={st.id || idx}
                            onClick={() => handleToggleTask(st.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'rgba(255, 255, 255, 0.02)',
                              padding: '5px 8px',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '5px',
                                border: stDone ? '1.5px solid #10B981' : '1.5px solid #475569',
                                background: stDone ? '#10B981' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {stDone && <Check size={11} color="#FFF" strokeWidth={3} />}
                              </div>
                              <span style={{
                                color: stDone ? '#64748B' : '#E2E8F0',
                                fontSize: '0.80rem',
                                textDecoration: stDone ? 'line-through' : 'none'
                              }}>
                                {st.title}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(st.id);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#EF4444',
                                opacity: 0.4,
                                cursor: 'pointer',
                                padding: '2px'
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

export default TasksModal;
