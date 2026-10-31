import React from 'react';
import { 
  Calendar, 
  Bell, 
  Clock, 
  Plus, 
  Check, 
  ExternalLink, 
  Trash2,
  CalendarCheck2
} from 'lucide-react';

export const TasksModal = ({
  isOpen,
  onClose,
  combinedTasks = [],
  remindersViewMode,
  setRemindersViewMode,
  agendaFilter,
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
  expandedTaskIds,
  toggleSubtasksExpand,
  setShowGCalConnectModal
}) => {
  if (!isOpen) return null;

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

  // Calculate section counts
  const todayCount = combinedTasks.filter(t => isDaily(t) || getTaskDateStr(t) === todayStr || (!getTaskDateStr(t) && !t.is_google_calendar)).length;
  const overdueCount = combinedTasks.filter(t => isTaskOverdue(t)).length;
  const upcomingCount = combinedTasks.filter(t => !isTaskDone(t) && !isDaily(t) && getTaskDateStr(t) && getTaskDateStr(t) > todayStr).length;
  const completedCount = combinedTasks.filter(t => isTaskDone(t)).length;

  const selectedDateObj = calSelectedDate ? new Date(calSelectedDate) : new Date();
  const monthYearTitle = selectedDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedDateStr = formatLocalDateStr(selectedDateObj);

  // Generate 7-day strip around selected date
  const weekDays = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(selectedDateObj);
    d.setDate(selectedDateObj.getDate() + i);
    const dStr = formatLocalDateStr(d);
    weekDays.push({
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      dateStr: dStr,
      isToday: dStr === todayStr,
      isSelected: dStr === selectedDateStr
    });
  }

  // Filter tasks based on selected pill
  const filteredTasks = combinedTasks.filter(t => {
    const done = isTaskDone(t);
    const overdue = isTaskOverdue(t);
    const tDateStr = getTaskDateStr(t);
    const daily = isDaily(t);
    const isToday = daily || tDateStr === todayStr || (!tDateStr && !t.is_google_calendar);

    if (agendaFilter === 'completed') return done;
    if (agendaFilter === 'overdue') return overdue;
    if (agendaFilter === 'upcoming') return !done && !daily && tDateStr && tDateStr > todayStr;
    if (agendaFilter === 'today') return isToday;
    return true; // 'all'
  });

  // Sort: Overdue first, then by date
  filteredTasks.sort((a, b) => {
    const dA = getTaskDateStr(a) || '9999-99-99';
    const dB = getTaskDateStr(b) || '9999-99-99';
    return dA.localeCompare(dB);
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.88)', backdropFilter: 'blur(16px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#0a101d', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '28px', padding: '22px 18px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        
        {/* Top Header matching Screenshot */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Tasks
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowGCalConnectModal && setShowGCalConnectModal(true)}
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer' }}
              title="Sync Google Calendar"
            >
              <CalendarCheck2 size={18} />
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Month Header and Quick Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.98rem', fontWeight: 600, color: '#e2e8f0' }}>
            {monthYearTitle}
          </span>
          <button
            type="button"
            onClick={() => {
              setCalSelectedDate(new Date());
              setAgendaFilter('today');
            }}
            style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', color: '#38bdf8', padding: '4px 10px', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Today
          </button>
        </div>

        {/* 7-Day Date Ribbon / Strip (from Screenshot) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '18px', padding: '10px 8px', marginBottom: '16px' }}>
          {weekDays.map(wd => {
            const hasDue = combinedTasks.some(t => !isTaskDone(t) && getTaskDateStr(t) === wd.dateStr);
            return (
              <button
                key={wd.dateStr}
                type="button"
                onClick={() => {
                  setCalSelectedDate(new Date(wd.dateStr + 'T12:00:00'));
                  setAgendaFilter('today');
                }}
                style={{
                  background: wd.isSelected ? '#2563eb' : 'transparent',
                  border: 'none',
                  borderRadius: wd.isSelected ? '50%' : '12px',
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: wd.isSelected ? '#ffffff' : wd.isToday ? '#38bdf8' : '#94a3b8',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '0.64rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px', opacity: wd.isSelected ? 0.95 : 0.7 }}>
                  {wd.dayName}
                </span>
                <span style={{ fontSize: '0.96rem', fontWeight: wd.isSelected || wd.isToday ? 700 : 500 }}>
                  {wd.dayNum}
                </span>
                {hasDue && !wd.isSelected && (
                  <span style={{ position: 'absolute', bottom: '3px', width: '4px', height: '4px', borderRadius: '50%', background: '#38bdf8' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Pills: Today / Overdue / Upcoming / Completed (Screenshot UI) */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '14px' }}>
          <button
            type="button"
            onClick={() => setAgendaFilter('today')}
            style={{
              background: agendaFilter === 'today' ? 'rgba(37, 99, 235, 0.28)' : 'rgba(255, 255, 255, 0.04)',
              border: agendaFilter === 'today' ? '1.5px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
              color: agendaFilter === 'today' ? '#60a5fa' : '#94a3b8',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Today ({todayCount})
          </button>
          <button
            type="button"
            onClick={() => setAgendaFilter('overdue')}
            style={{
              background: agendaFilter === 'overdue' ? 'rgba(239, 68, 68, 0.24)' : 'rgba(255, 255, 255, 0.04)',
              border: agendaFilter === 'overdue' ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
              color: agendaFilter === 'overdue' ? '#f87171' : overdueCount > 0 ? '#fb7185' : '#94a3b8',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {overdueCount > 0 ? '⚠️ ' : ''}Overdue ({overdueCount})
          </button>
          <button
            type="button"
            onClick={() => setAgendaFilter('upcoming')}
            style={{
              background: agendaFilter === 'upcoming' ? 'rgba(168, 85, 247, 0.24)' : 'rgba(255, 255, 255, 0.04)',
              border: agendaFilter === 'upcoming' ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
              color: agendaFilter === 'upcoming' ? '#c084fc' : '#94a3b8',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Upcoming ({upcomingCount})
          </button>
          <button
            type="button"
            onClick={() => setAgendaFilter('completed')}
            style={{
              background: agendaFilter === 'completed' ? 'rgba(16, 185, 129, 0.24)' : 'rgba(255, 255, 255, 0.04)',
              border: agendaFilter === 'completed' ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
              color: agendaFilter === 'completed' ? '#34d399' : '#94a3b8',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Overdue Banner */}
        {agendaFilter === 'overdue' && overdueCount > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '14px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#fca5a5' }}>
              ⚠️ {overdueCount} task{overdueCount > 1 ? 's are' : ' is'} overdue from previous days
            </span>
            <button
              type="button"
              onClick={handleRescheduleAllOverdue}
              style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Reschedule All ⚡
            </button>
          </div>
        )}

        {/* Quick Add Form */}
        <form 
          onSubmit={handleCreateTask}
          style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
        >
          <input
            type="text"
            placeholder="Set reminder or add task..."
            value={newTaskInput}
            onChange={(e) => setNewTaskInput(e.target.value)}
            style={{ flex: 1, background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px', padding: '10px 14px', color: '#fff', fontSize: '0.86rem', outline: 'none' }}
          />
          <button type="submit" style={{ background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
            Add
          </button>
        </form>

        {/* Clean Task List matching Screenshot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {filteredTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 10px', color: '#64748b', fontSize: '0.88rem' }}>
              {agendaFilter === 'today' ? '🎉 No pending tasks for today!' :
               agendaFilter === 'overdue' ? '✨ No overdue tasks! All caught up.' :
               agendaFilter === 'upcoming' ? 'No upcoming tasks scheduled.' :
               'No items found.'}
            </div>
          ) : (
            filteredTasks.map(t => {
              const done = isTaskDone(t);
              const taskDateStr = getTaskDateStr(t);
              const overdue = isTaskOverdue(t);
              const daily = isDaily(t);
              const priority = (t.priority || 'normal').toLowerCase();
              const priorityColor = priority === 'urgent' ? '#fb7185' : priority === 'high' ? '#f87171' : priority === 'low' ? '#34d399' : '#38bdf8';
              const priorityBg = priority === 'urgent' ? 'rgba(244,63,94,0.18)' : priority === 'high' ? 'rgba(239,68,68,0.18)' : priority === 'low' ? 'rgba(16,185,129,0.16)' : 'rgba(56,189,248,0.14)';

              return (
                <div
                  key={t.id}
                  style={{
                    background: done 
                      ? 'rgba(16, 185, 129, 0.04)' 
                      : overdue 
                        ? 'rgba(239, 68, 68, 0.08)' 
                        : 'rgba(15, 23, 42, 0.65)',
                    border: done 
                      ? '1px solid rgba(16, 185, 129, 0.2)' 
                      : overdue 
                        ? '1px solid rgba(239, 68, 68, 0.35)' 
                        : '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    {/* Checkbox (Rounded Box from Screenshot) */}
                    <div
                      onClick={() => !t.is_google_calendar && handleToggleTask(t.id)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '7px',
                        border: done ? '1.5px solid #10b981' : overdue ? '1.5px solid #ef4444' : '1.5px solid rgba(255,255,255,0.25)',
                        background: done ? '#10b981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: t.is_google_calendar ? 'default' : 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {done && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </div>

                    {/* Title & Metadata */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: done ? '#64748b' : '#f1f5f9', fontSize: '0.92rem', fontWeight: 500, textDecoration: done ? 'line-through' : 'none', wordBreak: 'break-word' }}>
                        {t.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {/* Time with Clock Icon */}
                        <span style={{ color: done ? '#64748b' : overdue ? '#f87171' : '#94a3b8', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color={done ? '#64748b' : overdue ? '#f87171' : '#38bdf8'} />
                          <span>{t.reminder_time || (taskDateStr ? formatLocalDateStr(t.due_date) : 'Today')}</span>
                        </span>

                        {/* Status Badge: Pending, Overdue, or Completed */}
                        <span style={{
                          background: done ? 'rgba(16,185,129,0.18)' : overdue ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.18)',
                          color: done ? '#34d399' : overdue ? '#ef4444' : '#38bdf8',
                          border: done ? '1px solid rgba(16,185,129,0.3)' : overdue ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(56,189,248,0.3)',
                          borderRadius: '6px',
                          padding: '1px 7px',
                          fontSize: '0.66rem',
                          fontWeight: 700
                        }}>
                          {done ? '✓ Completed' : overdue ? '⚠️ Overdue' : '⏳ Pending'}
                        </span>

                        {daily && (
                          <span style={{ background: 'rgba(192,132,252,0.15)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.3)', borderRadius: '6px', padding: '1px 6px', fontSize: '0.66rem', fontWeight: 600 }}>
                            🔁 Daily
                          </span>
                        )}

                        {/* Priority Pill */}
                        {t.priority && (
                          <span style={{ background: priorityBg, color: priorityColor, border: `1px solid ${priorityColor}40`, borderRadius: '6px', padding: '1px 8px', fontSize: '0.68rem', fontWeight: 600, textTransform: 'capitalize' }}>
                            {priority}
                          </span>
                        )}

                        {t.is_google_calendar && (
                          <span style={{ background: 'rgba(66, 133, 244, 0.2)', color: '#60a5fa', borderRadius: '6px', padding: '1px 6px', fontSize: '0.66rem', fontWeight: 600 }}>
                            GCal
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {t.is_google_calendar ? (
                        t.htmlLink && (
                          <button
                            type="button"
                            onClick={() => window.open(t.htmlLink, '_blank', 'noopener,noreferrer')}
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '4px' }}
                            title="Open in GCal"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer', padding: '4px' }}
                          title="Delete task"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subtasks Block */}
                  {t.subtasks && t.subtasks.length > 0 && (
                    <div style={{ marginTop: '4px', paddingLeft: '34px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {t.subtasks.map(st => {
                        const stDone = st.is_completed || st.status === 'completed';
                        return (
                          <div
                            key={st.id}
                            onClick={() => handleToggleTask(st.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '2px 0' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: stDone ? '#10b981' : '#64748b', fontSize: '0.78rem' }}>{stDone ? '☑' : '☐'}</span>
                              <span style={{ color: stDone ? '#64748b' : '#cbd5e1', fontSize: '0.76rem', textDecoration: stDone ? 'line-through' : 'none' }}>{st.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteTask(st.id); }}
                              style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.4, cursor: 'pointer', padding: '2px' }}
                            >
                              <Trash2 size={11} />
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

