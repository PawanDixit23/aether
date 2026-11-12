import React, { useState } from 'react';
import { 
  Check, 
  Wallet, 
  Camera, 
  FileText, 
  Calendar, 
  ChevronRight, 
  Clock, 
  Bot, 
  Bell, 
  CheckSquare,
  MapPin,
  Sparkles,
  Plus,
  Activity,
  Compass,
  ExternalLink,
  Share2
} from 'lucide-react';
import { AetherParticleSphere } from '../chat/AetherParticleSphere';

export const DashboardView = ({
  userName = 'Pawan',
  currentTime = new Date(),
  weatherData,
  userLocationName,
  cityGuide,
  onAskAether,
  combinedTasks = [],
  tasks = [],
  getTodayPendingCount,
  financeSummary,
  financeRecords = [],
  isListening,
  isSpeaking,
  toggleListening,
  onSwitchToChat,
  setActiveSubModal,
  setIsAddingExpense,
  setIsCameraOpen,
  setIsSettingsOpen,
  userAvatar,
  onClose,
  onToggleTask,
  onPlayBriefing,
  setAgendaFilter,
  setRemindersViewMode
}) => {
  const [selectedMode, setSelectedMode] = useState('voice'); // 'voice' | 'ask' | 'agent'
  const [guideTab, setGuideTab] = useState('places'); // 'places' | 'foods' | 'things'
  const [avatarError, setAvatarError] = useState(false);

  // Dynamic greeting based on current hour
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 4 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  };

  // Dynamic formatted date e.g. "Fri, 30 Oct 2026"
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Today's local date string YYYY-MM-DD
  const todayDateStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;

  const allTasksList = combinedTasks && combinedTasks.length > 0 ? combinedTasks : (tasks || []);

  // Strict Today's Tasks (Only tasks scheduled for today or daily recurring)
  const todayTasks = allTasksList.filter(t => {
    const isDaily = t.recurrence === 'daily' || t.repeat === 'daily' || String(t.recurrence || '').toLowerCase().includes('daily');
    if (isDaily) return true;

    if (t.due_date) {
      const taskDate = t.due_date.slice(0, 10);
      return taskDate === todayDateStr;
    }
    // If no due date, check if created today and not google calendar
    if (t.created_at && t.created_at.slice(0, 10) === todayDateStr && !t.is_google_calendar) {
      return true;
    }
    return false;
  });

  // Date-aware task completion check (Daily recurring tasks completed yesterday start fresh/pending today!)
  const getIsTaskDoneForDate = (t, dateStr = todayDateStr) => {
    if (!t) return false;
    const isRecurring = t.recurrence === 'daily' || t.repeat === 'daily' || String(t.recurrence || '').toLowerCase().includes('daily') || t.recurrence === 'weekdays' || t.recurrence === 'weekly_monday' || (t.recurrence && t.recurrence !== 'none');
    if (isRecurring) {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('aether_task_date_completions') : null;
        if (saved) {
          const map = JSON.parse(saved);
          if (map[t.id] && map[t.id][dateStr] !== undefined) {
            return Boolean(map[t.id][dateStr]);
          }
        }
      } catch (e) {}
      // Check persistent cloud date completions
      if (t.date_completions && t.date_completions[dateStr] !== undefined) {
        return Boolean(t.date_completions[dateStr]);
      }
      // Recurring tasks are strictly isolated per-date: if not explicitly marked completed on dateStr, it is false!
      return false;
    }
    return Boolean(t.is_completed || t.status === 'completed');
  };

  // Strict Overdue Tasks (Uncompleted past tasks from previous days)
  const overdueTasksList = allTasksList.filter(t => {
    const isDone = getIsTaskDoneForDate(t, todayDateStr);
    if (isDone) return false;
    const isDaily = t.recurrence === 'daily' || t.repeat === 'daily' || String(t.recurrence || '').toLowerCase().includes('daily');
    if (isDaily) return false;
    if (t.due_date) {
      const taskDate = t.due_date.slice(0, 10);
      return taskDate < todayDateStr;
    }
    return false;
  });

  // 1. Dynamic Tasks Left Count (Only today's pending tasks)
  const tasksLeftCount = todayTasks.filter(t => !getIsTaskDoneForDate(t, todayDateStr)).length;

  // 2. Dynamic Events Today Count (Only calendar events or meetings strictly for today)
  const eventsTodayCount = allTasksList.filter(t => {
    const isToday = (t.due_date && t.due_date.slice(0, 10) === todayDateStr) ||
                    (t.start_time && t.start_time.slice(0, 10) === todayDateStr);
    if (!isToday) return false;
    return t.is_google_calendar || t.is_event || (t.title && /meeting|appointment|webinar|flight|train|function|annual day/i.test(t.title));
  }).length;

  // 3. Dynamic Spent Today (Sum of expenses today from real financeRecords)
  const todayExpenseRecords = (financeRecords || []).filter(r => {
    const isExp = (r.type || 'expense').toLowerCase() === 'expense';
    const rDate = (r.date || r.created_at || '').slice(0, 10);
    return isExp && rDate === todayDateStr;
  });
  const calculatedSpentToday = todayExpenseRecords.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const spentTodayStr = `₹${calculatedSpentToday.toLocaleString('en-IN')}`;

  // 4. Dynamic Live Weather from real briefing API
  const weatherCity = userLocationName || weatherData?.city_en || weatherData?.city || 'Your Location';
  const weatherTemp = weatherData?.temp !== undefined && weatherData?.temp !== null 
    ? `${Math.round(weatherData.temp)}°C` 
    : '25°C';
  const weatherDesc = weatherData?.condition_en || weatherData?.condition_hi || weatherData?.condition || 'Sunny & Clear';
  const weatherHumidity = weatherData?.humidity || '36%';
  const weatherWind = weatherData?.wind || '4.2 km/h';

  // 5. Dynamic Next Event from real tasks
  const pendingUpcoming = allTasksList.filter(t => !getIsTaskDoneForDate(t, todayDateStr));
  const nextEvent = pendingUpcoming.length > 0 ? pendingUpcoming[0] : null;

  // Helper to determine status and display properties
  const getTaskStatusInfo = (t) => {
    const isDone = getIsTaskDoneForDate(t, todayDateStr);
    if (isDone) {
      return {
        key: 'completed',
        label: 'Completed',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.3)'
      };
    }
    // Check if overdue
    let isOverdue = false;
    if (t.due_date) {
      try {
        const d = new Date(t.due_date);
        if (!isNaN(d.getTime()) && d < currentTime) {
          isOverdue = true;
        }
      } catch (e) {}
    } else if (t.reminder_time) {
      try {
        const m = t.reminder_time.match(/(\d+):?(\d+)?\s*(AM|PM)/i);
        if (m) {
          let hrs = parseInt(m[1], 10);
          const mins = m[2] ? parseInt(m[2], 10) : 0;
          const ampm = m[3].toUpperCase();
          if (ampm === 'PM' && hrs < 12) hrs += 12;
          if (ampm === 'AM' && hrs === 12) hrs = 0;
          const dueToday = new Date(currentTime);
          dueToday.setHours(hrs, mins, 0, 0);
          if (dueToday < currentTime) {
            isOverdue = true;
          }
        }
      } catch (e) {}
    }

    if (isOverdue) {
      return {
        key: 'overdue',
        label: 'Overdue',
        color: '#f87171',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.3)'
      };
    }

    return {
      key: 'pending',
      label: 'Pending',
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.3)'
    };
  };

  // Chronological time parser for tasks (e.g. "7:00 AM" -> 420 mins, "8:00 AM" -> 480 mins)
  const parseReminderToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 9999;
    const str = timeStr.trim().toLowerCase();
    const m12 = str.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)$/i);
    if (m12) {
      let hours = parseInt(m12[1], 10);
      const minutes = m12[2] ? parseInt(m12[2], 10) : 0;
      const ampm = m12[3].toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
    const m24 = str.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) {
      return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
    }
    return 9999;
  };

  // Sort today's tasks: Pending first (chronologically by time e.g. 7 AM before 8 AM), then Completed
  todayTasks.sort((a, b) => {
    const aDone = getIsTaskDoneForDate(a, todayDateStr);
    const bDone = getIsTaskDoneForDate(b, todayDateStr);
    if (aDone !== bDone) return aDone ? 1 : -1;
    const aTime = parseReminderToMinutes(a.reminder_time);
    const bTime = parseReminderToMinutes(b.reminder_time);
    if (aTime !== bTime) return aTime - bTime;
    return (a.title || '').localeCompare(b.title || '');
  });

  return (
    <div 
      className="dashboard-main-view"
      style={{ 
        width: '100%', 
        maxWidth: '100%', 
        margin: '0', 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100%', 
        boxSizing: 'border-box', 
        padding: '4px 10px 40px',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      
      {/* 1. GREETING & DATE HEADLINE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', paddingTop: '4px', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.32rem', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{getGreeting()}, {userName || 'Pawan Dixit'}</span>
          </h1>
          <div style={{ fontSize: '0.80rem', color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>{formattedDate}</span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#475569' }} />
            <span style={{ color: '#38bdf8' }}>Let's make today productive</span>
          </div>
        </div>

        {/* Executive Voice Briefing Button */}
        {onPlayBriefing && (
          <button
            type="button"
            onClick={onPlayBriefing}
            style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.16) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '20px',
              padding: '7px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#38bdf8',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 10px rgba(56, 189, 248, 0.15)',
              transition: 'all 0.2s ease'
            }}
            title="Listen to Executive Daily Briefing"
          >
            <span>🎙️</span>
            <span>Daily Briefing</span>
          </button>
        )}
      </div>

      {/* 2. CENTER ORB (Refined Human-Crafted Pulse Sphere) */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '6px 0 14px' }}>
        
        <div 
          onClick={() => {
            toggleListening();
          }}
          style={{ 
            position: 'relative', 
            width: '110px', 
            height: '110px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Tap to speak with Aether"
        >
          {/* Smooth Concentric Breathing Halo (Replaces rotated wireframe rings) */}
          <div style={{
            position: 'absolute',
            inset: isListening ? '-14px' : '-8px',
            borderRadius: '50%',
            background: isListening 
              ? 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.05) 60%, transparent 80%)'
              : isSpeaking
                ? 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.05) 60%, transparent 80%)'
                : 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)',
            transition: 'all 0.4s ease',
            pointerEvents: 'none'
          }} />

          {/* Central Sphere */}
          <div style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #38bdf8 0%, #1e40af 60%, #030712 100%)',
            boxShadow: isListening 
              ? '0 0 32px rgba(56, 189, 248, 0.75), inset 0 0 18px rgba(255, 255, 255, 0.5)' 
              : isSpeaking
                ? '0 0 32px rgba(168, 85, 247, 0.75), inset 0 0 18px rgba(255, 255, 255, 0.5)'
                : '0 0 20px rgba(37, 99, 235, 0.4), inset 0 0 12px rgba(56, 189, 248, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.75 }}>
              <AetherParticleSphere isListening={isListening} isSpeaking={isSpeaking} />
            </div>

            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(56,189,248,0.2) 60%, transparent 100%)',
              filter: 'blur(3px)',
              pointerEvents: 'none'
            }} />
          </div>
        </div>

        {/* Caption below Orb */}
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '6px 0 10px 0', fontWeight: 500, letterSpacing: '0.01em' }}>
          {isListening ? 'Listening... Speak now' : isSpeaking ? 'Aether is speaking...' : 'Tap to talk • Hold for continuous'}
        </div>

        {/* Mode Switcher Segmented Control: [Voice] [Ask] [Agent] */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '3px', gap: '4px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setSelectedMode('voice');
              toggleListening();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedMode === 'voice' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
              background: selectedMode === 'voice' ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
              color: selectedMode === 'voice' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
            <span>Voice</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMode('ask');
              if (onSwitchToChat) onSwitchToChat();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedMode === 'ask' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
              background: selectedMode === 'ask' ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
              color: selectedMode === 'ask' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Clock size={12} />
            <span>Ask</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMode('agent');
              setActiveSubModal('briefing');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedMode === 'agent' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
              background: selectedMode === 'agent' ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
              color: selectedMode === 'agent' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Bot size={12} />
            <span>Agent</span>
          </button>
        </div>

      </div>

      {/* 3. QUICK ACTION CARDS (4 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
        
        {/* Card 1: Add Task */}
        <button
          type="button"
          onClick={() => setActiveSubModal('reminders')}
          style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '9px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'transform 0.15s', minWidth: 0 }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)' }}>
            <Check size={19} strokeWidth={2.8} />
          </div>
          <span style={{ fontSize: '0.71rem', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Add Task
          </span>
        </button>

        {/* Card 2: Add Expense */}
        <button
          type="button"
          onClick={() => {
            setActiveSubModal('finance');
            setIsAddingExpense(true);
          }}
          style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '9px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'transform 0.15s', minWidth: 0 }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)' }}>
            <Wallet size={18} />
          </div>
          <span style={{ fontSize: '0.71rem', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Add Expense
          </span>
        </button>

        {/* Card 3: Scan Bill */}
        <button
          type="button"
          onClick={() => setIsCameraOpen(true)}
          style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '9px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'transform 0.15s', minWidth: 0 }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(168, 85, 247, 0.35)' }}>
            <Camera size={18} />
          </div>
          <span style={{ fontSize: '0.71rem', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Scan Bill
          </span>
        </button>

        {/* Card 4: Create Note */}
        <button
          type="button"
          onClick={() => setActiveSubModal('memory')}
          style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '9px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'transform 0.15s', minWidth: 0 }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)' }}>
            <FileText size={18} />
          </div>
          <span style={{ fontSize: '0.71rem', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Create Note
          </span>
        </button>
      </div>

      {/* 3.1 ALL-IN-ONE SOCIAL MEDIA COMMAND CENTER */}
      <div 
        onClick={() => {
          if (setActiveSubModal) setActiveSubModal('social');
        }}
        title="Open All-in-One Social Media Command Center"
        style={{
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          padding: '11px 14px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '11px',
            background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.35)'
          }}>
            <Share2 size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>Social Media Hub</span>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.35)', padding: '1px 6px', borderRadius: '999px', color: '#7dd3fc' }}>
                8 Platforms
              </span>
            </div>
            <div style={{ fontSize: '0.69rem', color: '#94a3b8', marginTop: '1px' }}>
              WhatsApp • X • Insta • Telegram • YT • LinkedIn • Reddit • FB
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
          <span>Open →</span>
        </div>
      </div>

      {/* 4. PROMINENT LIVE WEATHER CARD (Fully Visible & High Contrast) */}
      <div 
        onClick={() => {
          if (setActiveSubModal) setActiveSubModal('permissions');
        }}
        title="Tap to manage Location & Weather settings"
        style={{
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.14) 0%, rgba(30, 58, 138, 0.28) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '18px',
          padding: '11px 14px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.2)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
            flexShrink: 0
          }}>
            {weatherTemp.includes('-') || parseInt(weatherTemp) < 15 ? '❄️' : (parseInt(weatherTemp) > 28 ? '☀️' : '⛅')}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#94a3b8' }}>
              <MapPin size={12} color="#38bdf8" />
              <span style={{ fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {weatherCity}
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#7dd3fc', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {weatherDesc}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
            {weatherTemp}
          </div>
          <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '3px' }}>
            💧 {weatherHumidity} • 💨 {weatherWind}
          </div>
        </div>
      </div>

      {/* 4.5 LOCAL CITY EXPLORER & DISCOVERY GUIDE */}
      {cityGuide && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '20px',
          padding: '12px 14px',
          marginBottom: '10px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}>
                <Compass size={15} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>{cityGuide.city}</span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                    {cityGuide.hindi_name ? `• ${cityGuide.hindi_name}` : ''}
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 500 }}>
                  {cityGuide.tagline || 'Local City Discovery & Flavors'}
                </div>
              </div>
            </div>

            {onAskAether && (
              <button
                type="button"
                onClick={() => onAskAether(`Tell me in detail about top sights, landmarks, and famous local food in ${cityGuide.city}.`)}
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '12px',
                  color: '#38bdf8',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Sparkles size={11} />
                <span>Ask Aether</span>
              </button>
            )}
          </div>

          {/* 3 Pills / Tabs: 🏛️ Places | 🍲 Food | 🛍️ Things To Do */}
          <div style={{
            display: 'flex',
            gap: '6px',
            background: 'rgba(2, 6, 23, 0.5)',
            padding: '3px',
            borderRadius: '12px',
            marginBottom: '10px'
          }}>
            {[
              { id: 'places', label: '🏛️ Places', count: (cityGuide.places_to_visit || []).length },
              { id: 'foods', label: '🍲 Food', count: (cityGuide.foods_to_try || []).length },
              { id: 'things', label: '🛍️ Activities', count: (cityGuide.popular_things || []).length }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGuideTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: '9px',
                  border: guideTab === tab.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  background: guideTab === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: guideTab === tab.id ? '#ffffff' : '#94a3b8',
                  fontSize: '0.72rem',
                  fontWeight: guideTab === tab.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content 1: Places to Visit */}
          {guideTab === 'places' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(cityGuide.places_to_visit || []).slice(0, 4).map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (onAskAether) {
                      onAskAether(`Tell me more about "${p.name}" (${p.desc}) in ${cityGuide.city}.`);
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                  title={`Ask Aether about ${p.name}`}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                        {p.name}
                      </span>
                      {p.category && (
                        <span style={{
                          fontSize: '0.62rem',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          padding: '1px 5px',
                          borderRadius: '6px',
                          fontWeight: 600
                        }}>
                          {p.category}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.3 }}>
                      {p.desc}
                    </div>
                    {p.best_time && (
                      <div style={{ fontSize: '0.64rem', color: '#cbd5e1', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} color="#38bdf8" />
                        <span>Best time: {p.best_time}</span>
                      </div>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(p.name + ' ' + (cityGuide.city || ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on Google Maps"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8',
                      flexShrink: 0,
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Tab Content 2: Famous Food to Try */}
          {guideTab === 'foods' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(cityGuide.foods_to_try || []).slice(0, 4).map((f, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (onAskAether) {
                      onAskAether(`Tell me about "${f.name}" (${f.desc}) in ${cityGuide.city}.`);
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                  title={`Ask Aether about ${f.name}`}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.3 }}>
                      {f.desc}
                    </div>
                    {f.famous_at && (
                      <div style={{ fontSize: '0.64rem', color: '#fbbf24', marginTop: '2px', fontWeight: 500 }}>
                        ⭐ Famous at: {f.famous_at}
                      </div>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(f.name + ' ' + (cityGuide.city || ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Search restaurant on Google Maps"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      background: 'rgba(251, 191, 36, 0.12)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fbbf24',
                      flexShrink: 0,
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Tab Content 3: Popular Things to Do & Markets */}
          {guideTab === 'things' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(cityGuide.popular_things || []).slice(0, 3).map((t, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (onAskAether) {
                      onAskAether(`Tell me about "${t.name}" (${t.desc}) in ${cityGuide.city}.`);
                    }
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                  title={`Ask Aether about ${t.name}`}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                        {t.name}
                      </span>
                      {t.type && (
                        <span style={{
                          fontSize: '0.62rem',
                          background: 'rgba(168, 85, 247, 0.15)',
                          color: '#c084fc',
                          padding: '1px 5px',
                          borderRadius: '6px',
                          fontWeight: 600
                        }}>
                          {t.type}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.3 }}>
                      {t.desc}
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(t.name + ' ' + (cityGuide.city || ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on Google Maps"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      background: 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#c084fc',
                      flexShrink: 0,
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Local Tip Footer */}
          {cityGuide.local_tips && cityGuide.local_tips.length > 0 && (
            <div style={{
              marginTop: '8px',
              padding: '6px 8px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderLeft: '2px solid #38bdf8',
              borderRadius: '0 8px 8px 0',
              fontSize: '0.66rem',
              color: '#94a3b8',
              lineHeight: 1.35
            }}>
              <strong style={{ color: '#38bdf8' }}>💡 Local Tip: </strong>
              {cityGuide.local_tips[0]}
            </div>
          )}
        </div>
      )}

      {/* 5. TODAY'S OVERVIEW METRICS */}
      <div style={{ background: '#0e172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '12px 10px', marginBottom: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
            Today's Overview
          </span>
          <button
            type="button"
            onClick={() => setActiveSubModal('reminders')}
            style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', padding: 0 }}
          >
            <span>See all</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 3 Metric Cards in a Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px', marginBottom: '8px', width: '100%', boxSizing: 'border-box' }}>
          
          {/* Card 1: Tasks left */}
          <div 
            onClick={() => setActiveSubModal('reminders')}
            style={{ minWidth: 0, boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '8px 6px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: '22px', height: '22px', borderRadius: '7px', background: 'rgba(16, 185, 129, 0.18)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '4px' }}>
              <CheckSquare size={12} />
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
              {tasksLeftCount}
            </div>
            <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Tasks left
            </div>
          </div>

          {/* Card 2: Events today */}
          <div 
            onClick={() => {
              if (setRemindersViewMode) setRemindersViewMode('calendar');
              setActiveSubModal('calendar');
            }}
            style={{ minWidth: 0, boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '8px 6px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: '22px', height: '22px', borderRadius: '7px', background: 'rgba(56, 189, 248, 0.18)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', marginBottom: '4px' }}>
              <Calendar size={12} />
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
              {eventsTodayCount}
            </div>
            <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Events today
            </div>
          </div>

          {/* Card 3: Spent today */}
          <div 
            onClick={() => setActiveSubModal('finance')}
            style={{ minWidth: 0, boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '8px 6px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: '22px', height: '22px', borderRadius: '7px', background: 'rgba(244, 63, 94, 0.18)', border: '1px solid rgba(244, 63, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', marginBottom: '4px' }}>
              <Wallet size={12} />
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {spentTodayStr}
            </div>
            <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Spent today
            </div>
          </div>

        </div>

        {/* Next Event Widget */}
        <div 
          onClick={() => {
            if (nextEvent?.is_google_calendar && setRemindersViewMode) {
              setRemindersViewMode('calendar');
              setActiveSubModal('calendar');
            } else {
              setActiveSubModal('reminders');
            }
          }}
          style={{ minWidth: 0, overflow: 'hidden', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.15s ease' }}
        >
          <div style={{ width: '4px', height: '28px', borderRadius: '4px', background: 'linear-gradient(180deg, #a855f7, #6366f1)', flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nextEvent ? (nextEvent.reminder_time || (nextEvent.due_date ? new Date(nextEvent.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today')) : 'No upcoming events'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#cbd5e1', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nextEvent ? (nextEvent.title || nextEvent.text || 'Upcoming Task') : 'Agenda clear'}
            </div>
          </div>
        </div>

      </div>

      {/* Overdue Tasks Banner (Separated from Today's Tasks) */}
      {overdueTasksList.length > 0 && (
        <div 
          onClick={() => {
            if (setAgendaFilter) setAgendaFilter('overdue');
            setActiveSubModal('reminders');
          }}
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '10px 14px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#fca5a5' }}>
                {overdueTasksList.length} Overdue Task{overdueTasksList.length > 1 ? 's' : ''} from previous days
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                Tap to review or reschedule all to today
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#f87171', fontWeight: 700, whiteSpace: 'nowrap' }}>
            Review ⚡
          </span>
        </div>
      )}

      {/* 6. TODAY'S TASKS LIST SECTION (The requested Agenda feature) */}
      <div style={{
        background: '#0e172a',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '12px 14px',
        marginBottom: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '7px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <CheckSquare size={13} />
            </div>
            <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#ffffff' }}>
              Today's Tasks
            </span>
            <span style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontSize: '0.66rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '10px'
            }}>
              {todayTasks.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubModal('reminders')}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: 0
            }}
          >
            <span>View all</span>
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Tasks List Content */}
        {todayTasks.length === 0 ? (
          <div style={{
            padding: '16px 10px',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '3px' }}>🎉</div>
            <div style={{ fontSize: '0.80rem', fontWeight: 600, color: '#cbd5e1' }}>
              All caught up for today!
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
              No pending tasks scheduled right now
            </div>
            <button
              type="button"
              onClick={() => setActiveSubModal('reminders')}
              style={{
                marginTop: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.70rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={11} />
              <span>Add Task</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {todayTasks.slice(0, 8).map((task) => {
              const statusInfo = getTaskStatusInfo(task);
              const isDone = statusInfo.key === 'completed';
              const isDaily = task.recurrence === 'daily' || task.repeat === 'daily' || String(task.recurrence || '').toLowerCase().includes('daily');

              return (
                <div
                  key={task.id}
                  onClick={() => setActiveSubModal('reminders')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 11px',
                    borderRadius: '12px',
                    background: isDone 
                      ? 'rgba(16, 185, 129, 0.04)' 
                      : statusInfo.key === 'overdue' 
                        ? 'rgba(239, 68, 68, 0.05)' 
                        : 'rgba(255, 255, 255, 0.03)',
                    border: isDone 
                      ? '1px solid rgba(16, 185, 129, 0.15)' 
                      : statusInfo.key === 'overdue' 
                        ? '1px solid rgba(239, 68, 68, 0.2)' 
                        : '1px solid rgba(255, 255, 255, 0.06)',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Click to view in agenda"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleTask) onToggleTask(task.id);
                      }}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '7px',
                        border: isDone 
                          ? '1.5px solid #10b981' 
                          : statusInfo.key === 'overdue'
                            ? '1.5px solid #ef4444'
                            : '1.5px solid rgba(56, 189, 248, 0.6)',
                        background: isDone ? '#10b981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        padding: 0
                      }}
                      title={isDone ? "Mark pending" : "Mark complete"}
                    >
                      {isDone ? (
                        <Check size={13} color="#ffffff" strokeWidth={3} />
                      ) : (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'transparent' }} />
                      )}
                    </button>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: isDone ? '#64748b' : '#f8fafc',
                        textDecoration: isDone ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        {task.reminder_time && (
                          <span style={{ fontSize: '0.68rem', color: isDone ? '#64748b' : '#38bdf8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} />
                            {task.reminder_time}
                          </span>
                        )}
                        {isDaily && (
                          <span style={{ fontSize: '0.64rem', color: '#c084fc', background: 'rgba(192, 132, 252, 0.12)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                            🔁 Daily
                          </span>
                        )}
                        {task.priority && (
                          <span style={{
                            fontSize: '0.60rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '1px 4px',
                            borderRadius: '4px',
                            background: task.priority === 'urgent' ? 'rgba(239, 68, 68, 0.2)' : (task.priority === 'high' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.15)'),
                            color: task.priority === 'urgent' ? '#f87171' : (task.priority === 'high' ? '#fbbf24' : '#38bdf8')
                          }}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div style={{ flexShrink: 0 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: statusInfo.bg,
                      color: statusInfo.color,
                      border: `1px solid ${statusInfo.border}`
                    }}>
                      {statusInfo.key === 'completed' ? '✓ Completed' : statusInfo.key === 'overdue' ? '⚠️ Overdue' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
            {todayTasks.length > 6 && (
              <button
                type="button"
                onClick={() => setActiveSubModal('reminders')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#60a5fa',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 0',
                  textAlign: 'center'
                }}
              >
                + {todayTasks.length - 6} more tasks in agenda
              </button>
            )}
          </div>
        )}
      </div>

      {/* 7. SYSTEM OBSERVABILITY & HEALTH METRICS */}
      <div 
        onClick={() => setActiveSubModal('observability')}
        style={{
          background: '#0e172a',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '20px',
          padding: '12px 14px',
          marginBottom: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '11px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            flexShrink: 0
          }}>
            <Activity size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
                System Observability & Health
              </span>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981'
              }} />
            </div>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8', marginTop: '2px' }}>
              Gemini Core • Latency & Subsystems Monitor
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontSize: '0.74rem', fontWeight: 600, flexShrink: 0 }}>
          <span>Live Metrics</span>
          <ChevronRight size={14} />
        </div>
      </div>

    </div>
  );
};

export default DashboardView;
