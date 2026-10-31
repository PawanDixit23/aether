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
  CheckSquare
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
  onClose
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
  const weatherCity = weatherData?.city_en || weatherData?.city || userLocationName || 'Jaipur';
  const weatherTemp = weatherData?.temp !== undefined && weatherData?.temp !== null 
    ? `${Math.round(weatherData.temp)}°C` 
    : '--°C';
  const weatherDesc = weatherData?.condition_en || weatherData?.condition_hi || weatherData?.condition || 'Live Sync';

  // 5. Dynamic Next Event from real tasks
  const pendingUpcoming = allTasksList.filter(t => !t.is_completed && t.status !== 'completed');
  const nextEvent = pendingUpcoming.length > 0 ? pendingUpcoming[0] : null;

  return (
    <div 
      className="no-scrollbar"
      style={{ 
        width: '100%', 
        maxWidth: '440px', 
        margin: '0 auto', 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100%', 
        boxSizing: 'border-box', 
        padding: '2px 12px 88px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      
      {/* 1. GREETING & DATE HEADLINE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', paddingTop: '2px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#ffffff', margin: '0 0 2px 0', letterSpacing: '-0.02em' }}>
            {getGreeting()}, {userName || 'Pawan'}
          </h1>
          <div style={{ fontSize: '0.86rem', color: '#60a5fa', fontWeight: 500, marginBottom: '2px' }}>
            Let's make today productive ✨
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
            {formattedDate}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
            title="Close Dashboard"
          >
            ✕
          </button>
        )}
      </div>

      {/* 3. CENTER ORB (Holographic Blue Earth with Concentric Orbital Rings) */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '2px 0 6px' }}>
        
        {/* Orbital Ring Background Visual */}
        <div 
          onClick={() => {
            toggleListening();
          }}
          style={{ 
            position: 'relative', 
            width: '160px', 
            height: '150px', 
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
            width: '155px',
            height: '62px',
            border: isListening ? '1.5px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '50%',
            transform: 'rotate(-25deg)',
            boxShadow: isListening ? '0 0 20px rgba(56, 189, 248, 0.4)' : 'none',
            pointerEvents: 'none',
            transition: 'all 0.3s ease'
          }} />

          <div style={{
            position: 'absolute',
            width: '160px',
            height: '68px',
            border: isSpeaking ? '1.5px solid rgba(168, 85, 247, 0.6)' : '1px solid rgba(56, 189, 248, 0.15)',
            borderRadius: '50%',
            transform: 'rotate(22deg)',
            pointerEvents: 'none',
            transition: 'all 0.3s ease'
          }} />

          {/* Central Holographic Blue Sphere with Canvas/Particles */}
          <div style={{
            width: '116px',
            height: '116px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #38bdf8 0%, #1d4ed8 50%, #030712 95%)',
            boxShadow: isListening 
              ? '0 0 40px rgba(56, 189, 248, 0.8), inset 0 0 22px rgba(255, 255, 255, 0.6)' 
              : '0 0 30px rgba(37, 99, 235, 0.5), inset 0 0 18px rgba(56, 189, 248, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            transition: 'box-shadow 0.3s ease'
          }}>
            {/* Embedded Interactive Particle Canvas */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.75 }}>
              <AetherParticleSphere isListening={isListening} isSpeaking={isSpeaking} />
            </div>

            {/* Glowing Digital Core Atmosphere */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(56,189,248,0.2) 60%, transparent 100%)',
              filter: 'blur(4px)',
              pointerEvents: 'none'
            }} />
          </div>
        </div>

        {/* Caption below Orb */}
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '6px 0 8px 0', fontWeight: 500 }}>
          Tap to talk • Hold for continuous
        </div>

        {/* Mode Switcher Capsule: [Voice] [Ask] [Agent] */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '3px', gap: '4px', marginBottom: '10px' }}>
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
              border: selectedMode === 'voice' ? '1px solid #38bdf8' : '1px solid transparent',
              background: selectedMode === 'voice' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: selectedMode === 'voice' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.78rem',
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
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedMode === 'ask' ? '1px solid #38bdf8' : '1px solid transparent',
              background: selectedMode === 'ask' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: selectedMode === 'ask' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.78rem',
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
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedMode === 'agent' ? '1px solid #38bdf8' : '1px solid transparent',
              background: selectedMode === 'agent' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: selectedMode === 'agent' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Bot size={12} />
            <span>Agent</span>
          </button>
        </div>

      </div>

      {/* 4. QUICK ACTION CARDS (4 Columns) matching Screenshot 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
        
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

      {/* 5. TODAY'S OVERVIEW SECTION matching Screenshot 1 */}
      <div style={{ background: '#0e172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '22px', padding: '12px 10px', marginBottom: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff' }}>
            Today's Overview
          </span>
          <button
            type="button"
            onClick={() => setActiveSubModal('reminders')}
            style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', padding: 0 }}
          >
            <span>See all</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 3 Metric Cards in a Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}>
          
          {/* Card 1: Tasks left */}
          <div style={{ minWidth: 0, boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '10px 8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.18)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '6px' }}>
              <CheckSquare size={13} />
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
              {tasksLeftCount}
            </div>
            <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Tasks left
            </div>
          </div>

          {/* Card 2: Events today */}
          <div style={{ minWidth: 0, boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '10px 8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.18)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', marginBottom: '6px' }}>
              <Calendar size={13} />
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
              {eventsTodayCount}
            </div>
            <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Events today
            </div>
          </div>

          {/* Card 3: Spent today */}
          <div style={{ minWidth: 0, boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '10px 8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.18)', border: '1px solid rgba(244, 63, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e', marginBottom: '6px' }}>
              <Wallet size={13} />
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {spentTodayStr}
            </div>
            <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Spent today
            </div>
          </div>

        </div>

        {/* 2 Bottom Widgets: Weather & Next Event */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
          
          {/* Weather Widget */}
          <div style={{ minWidth: 0, overflow: 'hidden', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '1.25rem', flexShrink: 0 }}>⛅</div>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.66rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {weatherCity}
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                {weatherTemp}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {weatherDesc}
              </div>
            </div>
          </div>

          {/* Next Event Widget */}
          <div style={{ minWidth: 0, overflow: 'hidden', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Purple Accent Bar */}
            <div style={{ width: '4px', height: '32px', borderRadius: '4px', background: 'linear-gradient(180deg, #a855f7, #6366f1)', flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nextEvent ? (nextEvent.reminder_time || (nextEvent.due_date ? new Date(nextEvent.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today')) : 'No events'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nextEvent ? (nextEvent.title || nextEvent.text || 'Upcoming Task') : 'Agenda clean'}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nextEvent ? (nextEvent.is_google_calendar ? 'Google Calendar' : 'Aether Tasks') : 'All caught up'}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default DashboardView;