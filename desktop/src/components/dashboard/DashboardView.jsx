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
  Plus
} from 'lucide-react';
import { AetherParticleSphere } from '../chat/AetherParticleSphere';

export const DashboardView = ({
  userName = 'Pawan',
  currentTime = new Date(),
  weatherData,
  userLocationName,
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
  onToggleTask
}) => {
  const [selectedMode, setSelectedMode] = useState('voice'); // 'voice' | 'ask' | 'agent'

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

  // 1. Dynamic Tasks Left Count (100% Real from combinedTasks / tasks)
  const allTasksList = combinedTasks && combinedTasks.length > 0 ? combinedTasks : (tasks || []);
  const tasksLeftCount = typeof getTodayPendingCount === 'function' 
    ? getTodayPendingCount() 
    : allTasksList.filter(t => !t.is_completed && t.status !== 'completed').length;

  // 2. Dynamic Events Today Count (Tasks / Google Calendar events scheduled for today)
  const eventsTodayCount = allTasksList.filter(t => {
    if (t.due_date && t.due_date.startsWith(todayDateStr)) return true;
    if (t.created_at && t.created_at.startsWith(todayDateStr) && t.is_google_calendar) return true;
    if (t.reminder_time && !t.is_completed) return true;
    return false;
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
  const weatherCity = weatherData?.city_en || weatherData?.city || userLocationName || 'Jaipur (Rajasthan)';
  const weatherTemp = weatherData?.temp !== undefined && weatherData?.temp !== null 
    ? `${Math.round(weatherData.temp)}°C` 
    : '25°C';
  const weatherDesc = weatherData?.condition_en || weatherData?.condition_hi || weatherData?.condition || 'Sunny & Clear';
  const weatherHumidity = weatherData?.humidity || '36%';
  const weatherWind = weatherData?.wind || '4.2 km/h';

  // 5. Dynamic Next Event from real tasks
  const pendingUpcoming = allTasksList.filter(t => !t.is_completed && t.status !== 'completed');
  const nextEvent = pendingUpcoming.length > 0 ? pendingUpcoming[0] : null;

  // Helper to determine status and display properties
  const getTaskStatusInfo = (t) => {
    const isDone = t.is_completed || t.status === 'completed';
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

  // 6. Dynamic Today's Tasks List (Includes all daily tasks and today's tasks)
  const todayTasks = allTasksList.filter(t => {
    // Daily recurring tasks ALWAYS belong to today!
    const isDaily = t.recurrence === 'daily' || t.repeat === 'daily' || String(t.recurrence || '').toLowerCase().includes('daily');
    if (isDaily) return true;

    if (t.due_date) {
      const taskDate = t.due_date.slice(0, 10);
      return taskDate <= todayDateStr;
    }
    return true;
  });

  // Sort: Overdue first, then Pending, then Completed
  todayTasks.sort((a, b) => {
    const order = { overdue: 1, pending: 2, completed: 3 };
    const statA = order[getTaskStatusInfo(a).key] || 2;
    const statB = order[getTaskStatusInfo(b).key] || 2;
    return statA - statB;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', paddingTop: '2px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', margin: '0 0 2px 0', letterSpacing: '-0.02em' }}>
            {getGreeting()}, {userName || 'Pawan Dixit'}
          </h1>
          <div style={{ fontSize: '0.84rem', color: '#60a5fa', fontWeight: 500, marginBottom: '2px' }}>
            Let's make today productive ✨
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
            {formattedDate}
          </div>
        </div>
      </div>

      {/* 2. CENTER ORB (Compact Holographic Sphere) */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 0 4px' }}>
        
        {/* Orbital Ring Background Visual */}
        <div 
          onClick={() => {
            toggleListening();
          }}
          style={{ 
            position: 'relative', 
            width: '130px', 
            height: '115px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Tap to speak with Aether"
        >
          {/* Outer glowing orbital rings */}
          <div style={{
            position: 'absolute',
            width: '130px',
            height: '52px',
            border: isListening ? '1.5px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '50%',
            transform: 'rotate(-25deg)',
            boxShadow: isListening ? '0 0 20px rgba(56, 189, 248, 0.4)' : 'none',
            pointerEvents: 'none',
            transition: 'all 0.3s ease'
          }} />

          <div style={{
            position: 'absolute',
            width: '135px',
            height: '56px',
            border: isSpeaking ? '1.5px solid rgba(168, 85, 247, 0.6)' : '1px solid rgba(56, 189, 248, 0.15)',
            borderRadius: '50%',
            transform: 'rotate(22deg)',
            pointerEvents: 'none',
            transition: 'all 0.3s ease'
          }} />

          {/* Central Holographic Blue Sphere with Canvas/Particles */}
          <div style={{
            width: '92px',
            height: '92px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #38bdf8 0%, #1d4ed8 50%, #030712 95%)',
            boxShadow: isListening 
              ? '0 0 40px rgba(56, 189, 248, 0.8), inset 0 0 22px rgba(255, 255, 255, 0.6)' 
              : '0 0 26px rgba(37, 99, 235, 0.5), inset 0 0 16px rgba(56, 189, 248, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            transition: 'box-shadow 0.3s ease'
          }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.75 }}>
              <AetherParticleSphere isListening={isListening} isSpeaking={isSpeaking} />
            </div>

            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(56,189,248,0.2) 60%, transparent 100%)',
              filter: 'blur(3px)',
              pointerEvents: 'none'
            }} />
          </div>
        </div>

        {/* Caption below Orb */}
        <div style={{ fontSize: '0.70rem', color: '#94a3b8', margin: '4px 0 6px 0', fontWeight: 500 }}>
          Tap to talk • Hold for continuous
        </div>

        {/* Mode Switcher Capsule: [Voice] [Ask] [Agent] */}
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
              padding: '5px 12px',
              borderRadius: '20px',
              border: selectedMode === 'voice' ? '1px solid #38bdf8' : '1px solid transparent',
              background: selectedMode === 'voice' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: selectedMode === 'voice' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: selectedMode === 'voice' ? '0 0 12px rgba(56, 189, 248, 0.3)' : 'none'
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
              padding: '5px 12px',
              borderRadius: '20px',
              border: selectedMode === 'ask' ? '1px solid #38bdf8' : '1px solid transparent',
              background: selectedMode === 'ask' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: selectedMode === 'ask' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer'
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
              padding: '5px 12px',
              borderRadius: '20px',
              border: selectedMode === 'agent' ? '1px solid #38bdf8' : '1px solid transparent',
              background: selectedMode === 'agent' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: selectedMode === 'agent' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer'
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
          style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '9px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'transform 0.15s' }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)' }}>
            <Check size={19} strokeWidth={2.8} />
          </div>
          <span style={{ fontSize: '0.71rem', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap' }}>
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
          style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '9px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'transform 0.15s' }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)' }}>
            <Wallet size={18} />
          </div>
          <span style={{ fontSize: '0.71rem', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Add Expense
          </span>
        </button>

        {/* Card 3: Scan Bill */}
        <button
          type="button"
          onClick={() => setIsCameraOpen(true)}
          style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '9px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'transform 0.15s' }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(168, 85, 247, 0.35)' }}>
            <Camera size={18} />
          </div>
          <span style={{ fontSize: '0.71rem', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Scan Bill
          </span>
        </button>

        {/* Card 4: Create Note */}
        <button
          type="button"
          onClick={() => setActiveSubModal('memory')}
          style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '9px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'transform 0.15s' }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)' }}>
            <FileText size={18} />
          </div>
          <span style={{ fontSize: '0.71rem', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Create Note
          </span>
        </button>
      </div>

      {/* 4. PROMINENT LIVE WEATHER CARD (Fully Visible & High Contrast) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.14) 0%, rgba(30, 58, 138, 0.28) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '18px',
        padding: '11px 14px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
      }}>
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
          <div style={{ minWidth: 0, boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '8px 6px' }}>
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
          <div style={{ minWidth: 0, boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '8px 6px' }}>
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
          <div style={{ minWidth: 0, boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '8px 6px' }}>
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
        <div style={{ minWidth: 0, overflow: 'hidden', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => {
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

    </div>
  );
};

export default DashboardView;
