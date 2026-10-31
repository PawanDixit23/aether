import React, { useState, useMemo, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
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
  newTaskInput = '',
  setNewTaskInput,
  handleRescheduleAllOverdue,
  expandedTaskIds = {},
  toggleSubtasksExpand,
  setShowGCalConnectModal
}) => {
  if (!isOpen) return null;

  // Local state for UI filters & inputs
  const [localTaskInput, setLocalTaskInput] = useState(newTaskInput || '');
  const [inputError, setInputError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'high' | 'medium' | 'low'
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [localExpanded, setLocalExpanded] = useState({});
  const dateInputRef = useRef(null);

  const todayStr = formatLocalDateStr ? formatLocalDateStr(new Date()) : new Date().toISOString().slice(0, 10);
  
  // Selected date resolution
  const selectedDateObj = calSelectedDate ? new Date(calSelectedDate) : new Date();
  const selectedDateStr = formatLocalDateStr ? formatLocalDateStr(selectedDateObj) : selectedDateObj.toISOString().slice(0, 10);
  const isSelectedDateToday = selectedDateStr === todayStr;

  const monthYearTitle = selectedDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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

  // Generate 7-Day Date Ribbon centered around selected date
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(selectedDateObj);
      d.setDate(selectedDateObj.getDate() + i);
      const dStr = formatLocalDateStr ? formatLocalDateStr(d) : d.toISOString().slice(0, 10);
      
      // Calculate tasks count and completed on this date
      const dTasks = combinedTasks.filter(t => {
        if (isDaily(t)) return true;
        const taskD = getTaskDateStr(t);
        return taskD === dStr;
      });
      const dTotal = dTasks.length;
      const dCompleted = dTasks.filter(t => isTaskDone(t)).length;

      days.push({
        dateObj: d,
        dateStr: dStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        totalTasks: dTotal,
        completedTasks: dCompleted
      });
    }
    return days;
  }, [selectedDateObj, combinedTasks, todayStr, selectedDateStr, formatLocalDateStr, getTaskDateStr]);

  // Navigate date ribbon (prev/next 7 days or single day)
  const shiftDate = (daysCount) => {
    const nextD = new Date(selectedDateObj);
    nextD.setDate(selectedDateObj.getDate() + daysCount);
    if (setCalSelectedDate) setCalSelectedDate(nextD);
  };

  // Section Counts matching Todoli statusFilters
  const allCount = combinedTasks.length;
  const dateTasks = combinedTasks.filter(t => isDaily(t) || getTaskDateStr(t) === selectedDateStr || (!getTaskDateStr(t) && isSelectedDateToday && !t.is_google_calendar));
  const dateTotalCount = dateTasks.length;
  const dateCompletedCount = dateTasks.filter(t => isTaskDone(t)).length;
  const overdueCount = combinedTasks.filter(t => isTaskOverdue(t)).length;
  const upcomingCount = combinedTasks.filter(t => !isTaskDone(t) && !isDaily(t) && getTaskDateStr(t) && getTaskDateStr(t) > todayStr).length;
  const completedCount = combinedTasks.filter(t => isTaskDone(t)).length;

  const dateProgressPercent = dateTotalCount > 0 ? Math.round((dateCompletedCount / dateTotalCount) * 100) : 0;

  // Status Filter options
  const statusFilterTabs = [
    { key: 'today', label: isSelectedDateToday ? 'Today' : selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: dateTotalCount, icon: Calendar },
    { key: 'all', label: 'Inbox', count: allCount, icon: Inbox },
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

  // Filter tasks based on selected tab, date, priority, and search query
  const filteredTasks = useMemo(() => {
    return combinedTasks.filter(t => {
      const done = isTaskDone(t);
      const overdue = isTaskOverdue(t);
      const tDateStr = getTaskDateStr(t);
      const daily = isDaily(t);
      const isForSelectedDate = daily || tDateStr === selectedDateStr || (!tDateStr && isSelectedDateToday && !t.is_google_calendar);

      // Status filter
      if (agendaFilter === 'completed' && !done) return false;
      if (agendaFilter === 'overdue' && !overdue) return false;
      if (agendaFilter === 'upcoming' && (done || daily || !tDateStr || tDateStr <= todayStr)) return false;
      if (agendaFilter === 'today' && !isForSelectedDate) return false;

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
      const aDone = isTaskDone(a);
      const bDone = isTaskDone(b);
      if (aDone !== bDone) return aDone ? 1 : -1;

      const aOverdue = isTaskOverdue(a);
      const bOverdue = isTaskOverdue(b);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

      return (a.reminder_time || '').localeCompare(b.reminder_time || '');
    });
  }, [combinedTasks, agendaFilter, priorityFilter, searchQuery, selectedDateStr, todayStr, isSelectedDateToday, getTaskDateStr]);

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

  // Form submission with validation
  const onSubmitTask = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const titleVal = localTaskInput.trim();
    if (!titleVal) {
      setInputError('⚠️ कार्य का नाम दर्ज करें (e.g. Drink 2L water at 3 PM)');
      return;
    }
    setInputError('');
    if (handleCreateTask) {
      handleCreateTask(e, titleVal, selectedDateStr, newTaskPriority);
    }
    setLocalTaskInput('');
    if (setNewTaskInput) setNewTaskInput('');
  };

  const quickSuggestions = [
    { text: 'Drink 2L water at 3 PM', label: '💧 2L Water' },
    { text: 'Walk 30 mins after dinner at 8 PM', label: '🏃 Walk' },
    { text: 'Call meeting follow-up at 5 PM', label: '📞 Call' },
    { text: 'Take daily vitamins at 9 PM', label: '💊 Vitamins' }
  ];

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
        
        {/* ── 1. HEADER & DATE TITLE ── */}
        <div style={{
          padding: '16px 18px 12px',
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
                <h2 style={{ fontSize: '1.30rem', fontWeight: 800, color: '#F8FAFC', margin: 0, letterSpacing: '-0.02em' }}>
                  Tasks & Agenda
                </h2>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{dateCompletedCount} of {dateTotalCount} completed</span>
                  <span style={{ color: '#0D9488', fontWeight: 700 }}>({dateProgressPercent}%)</span>
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
                  cursor: 'pointer'
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

          {/* Progress bar */}
          <div style={{
            marginTop: '12px',
            width: '100%',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, dateProgressPercent))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #0D9488 0%, #10B981 100%)',
              borderRadius: '999px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* ── 2. CALENDAR DATE RIBBON (Select previous/upcoming dates) ── */}
        <div style={{
          padding: '12px 18px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Month Header with Navigation & Date Picker */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => shiftDate(-7)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                title="Previous Week"
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#E2E8F0' }}>
                {monthYearTitle}
              </span>
              <button
                type="button"
                onClick={() => shiftDate(7)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                title="Next Week"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Today Button */}
              <button
                type="button"
                onClick={() => {
                  if (setCalSelectedDate) setCalSelectedDate(new Date());
                  setAgendaFilter('today');
                }}
                style={{
                  background: isSelectedDateToday ? '#0D9488' : 'rgba(255, 255, 255, 0.06)',
                  border: isSelectedDateToday ? '1px solid #0D9488' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isSelectedDateToday ? '#FFFFFF' : '#94A3B8',
                  borderRadius: '8px',
                  padding: '3px 9px',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Today
              </button>

              {/* Native Date Picker Trigger */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => dateInputRef.current && dateInputRef.current.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.click()}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    width: '28px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94A3B8',
                    cursor: 'pointer'
                  }}
                  title="Jump to date"
                >
                  <Calendar size={13} />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => {
                    if (e.target.value) {
                      const picked = new Date(e.target.value + 'T12:00:00');
                      if (setCalSelectedDate) setCalSelectedDate(picked);
                      setAgendaFilter('today');
                    }
                  }}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: 0,
                    height: 0,
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* 7-Day Date Ribbon */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
            background: '#1E293B',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '8px 6px'
          }}>
            {weekDays.map(wd => {
              const hasTasks = wd.totalTasks > 0;
              const allDone = hasTasks && wd.completedTasks === wd.totalTasks;
              return (
                <button
                  key={wd.dateStr}
                  type="button"
                  onClick={() => {
                    if (setCalSelectedDate) setCalSelectedDate(wd.dateObj);
                    setAgendaFilter('today');
                  }}
                  style={{
                    background: wd.isSelected ? '#0D9488' : 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '6px 2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: wd.isSelected ? '#FFFFFF' : wd.isToday ? '#38BDF8' : '#94A3B8',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px', opacity: wd.isSelected ? 0.95 : 0.7 }}>
                    {wd.dayName}
                  </span>
                  <span style={{ fontSize: '0.94rem', fontWeight: wd.isSelected || wd.isToday ? 800 : 600 }}>
                    {wd.dayNum}
                  </span>

                  {/* Task Count Badge / Dot */}
                  {hasTasks ? (
                    <span style={{
                      marginTop: '3px',
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      color: wd.isSelected ? '#FFFFFF' : allDone ? '#10B981' : '#38BDF8',
                      background: wd.isSelected ? 'rgba(255, 255, 255, 0.2)' : allDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                      padding: '0 4px',
                      borderRadius: '4px'
                    }}>
                      {wd.completedTasks}/{wd.totalTasks}
                    </span>
                  ) : (
                    <span style={{ height: '11px', marginTop: '3px' }} />
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {/* ── 3. STATUS FILTERS & PRIORITY BAR ── */}
        <div style={{ padding: '10px 18px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Status Tabs */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px',
            scrollbarWidth: 'none'
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
                    padding: '6px 12px',
                    fontSize: '0.76rem',
                    fontWeight: isSelected ? 800 : 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <TabIcon size={12} strokeWidth={isSelected ? 2.5 : 2} />
                  <span>{tab.label}</span>
                  <span style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '1px 5px',
                    fontSize: '0.66rem',
                    fontWeight: 700
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + Priority Filter row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <Search size={14} color="#64748B" style={{ position: 'absolute', left: '10px' }} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1E293B',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '7px 10px 7px 32px',
                  color: '#F8FAFC',
                  fontSize: '0.80rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                      borderRadius: '8px',
                      padding: '5px 8px',
                      fontSize: '0.70rem',
                      fontWeight: isSelected ? 700 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {p.dot && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: p.dot }} />}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── 4. QUICK ADD TASK BAR WITH BULLETPROOF SUBMISSION ── */}
        <div style={{ padding: '10px 18px 4px' }}>
          <form 
            onSubmit={onSubmitTask}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#1E293B',
              border: inputError ? '1.5px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '14px',
              padding: '4px 6px 4px 12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            <input
              type="text"
              placeholder={`Add task for ${isSelectedDateToday ? 'today' : selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (e.g. Drink 2L water at 3 PM)...`}
              value={localTaskInput}
              onChange={(e) => {
                setLocalTaskInput(e.target.value);
                if (setNewTaskInput) setNewTaskInput(e.target.value);
                if (inputError) setInputError('');
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#F8FAFC',
                fontSize: '0.84rem',
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
                boxShadow: '0 2px 8px rgba(13, 148, 136, 0.4)',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={14} strokeWidth={2.8} />
              <span>Add</span>
            </button>
          </form>

          {inputError && (
            <div style={{ color: '#F87171', fontSize: '0.72rem', marginTop: '4px', paddingLeft: '4px' }}>
              {inputError}
            </div>
          )}

          {/* Quick Suggestions */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '6px', scrollbarWidth: 'none' }}>
            {quickSuggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setLocalTaskInput(s.text);
                  if (setNewTaskInput) setNewTaskInput(s.text);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '3px 8px',
                  color: '#94A3B8',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 5. OVERDUE RECOVERY BANNER (When Overdue exists) ── */}
        {overdueCount > 0 && agendaFilter !== 'completed' && (
          <div style={{
            margin: '6px 18px 0',
            padding: '8px 12px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <span style={{ fontSize: '1rem' }}>⚠️</span>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#FCA5A5' }}>
                {overdueCount} task{overdueCount > 1 ? 's are' : ' is'} overdue
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
                padding: '4px 10px',
                fontSize: '0.70rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Reschedule All ⚡
            </button>
          </div>
        )}

        {/* ── 6. TASK LIST FOR CURRENT SELECTED DATE / FILTER ── */}
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
              padding: '36px 16px',
              color: '#64748B',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B'
              }}>
                <CheckCircle2 size={22} />
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>
                {searchQuery ? `No tasks matching "${searchQuery}"` :
                 agendaFilter === 'today' ? `No pending tasks for ${isSelectedDateToday ? 'today' : selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}!` :
                 agendaFilter === 'overdue' ? '✨ No overdue tasks! All caught up.' :
                 agendaFilter === 'upcoming' ? 'No upcoming tasks scheduled.' :
                 agendaFilter === 'completed' ? 'No completed tasks yet.' :
                 'Your task stack is clear!'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Type in the box above or prompt Aether: "Remind me to drink water at 3 PM"
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
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    
                    {/* Squircle Checkbox */}
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

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: done ? '#64748B' : '#F8FAFC',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        textDecoration: done ? 'line-through' : 'none',
                        wordBreak: 'break-word',
                        lineHeight: 1.35
                      }}>
                        {t.title}
                      </div>

                      {/* Metadata row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
                        
                        <span style={{
                          color: done ? '#64748B' : overdue ? '#F87171' : '#94A3B8',
                          fontSize: '0.70rem',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Clock size={11} color={done ? '#64748B' : overdue ? '#F87171' : '#0D9488'} />
                          <span>
                            {overdue && '⚠️ '}
                            {t.reminder_time 
                              ? (overdue ? `Overdue - ${t.reminder_time}` : t.reminder_time)
                              : (taskDateStr || 'Anytime')}
                          </span>
                        </span>

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

                    {/* Actions */}
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
                            padding: '4px'
                          }}
                          title="Delete task"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Inline Expanded Subtasks */}
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
