import React, { useState } from 'react';
import { 
  Radio, 
  Play, 
  Pause, 
  Bot, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw, 
  Send, 
  Calendar, 
  Wallet, 
  Zap, 
  Clock,
  ArrowRight,
  Target
} from 'lucide-react';

export const BriefingModal = ({
  isOpen,
  onClose,
  isBriefingLoading,
  executiveBriefingData,
  isBriefingPlaying,
  stopBriefingAudio,
  speakBriefingAudio,
  onRefreshBriefing,
  userLocationName,
  onExecuteGoal,
  overdueCount = 0,
  onRescheduleOverdue,
  onOpenFinance,
  onOpenTasks
}) => {
  const [activeTab, setActiveTab] = useState('briefing'); // 'briefing' | 'goals'
  const [customGoal, setCustomGoal] = useState('');

  if (!isOpen) return null;

  const handleGoalSubmit = (e) => {
    e?.preventDefault();
    if (customGoal.trim() && onExecuteGoal) {
      onExecuteGoal(customGoal.trim());
      setCustomGoal('');
    }
  };

  const handleQuickGoalClick = (goalText) => {
    if (onExecuteGoal) {
      onExecuteGoal(goalText);
    }
  };

  const cityName = executiveBriefingData?.city || userLocationName || 'Live Location';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.88)', backdropFilter: 'blur(16px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ 
        background: '#0a101d', 
        border: '1px solid rgba(56, 189, 248, 0.35)', 
        borderRadius: '26px', 
        padding: '22px 20px', 
        width: '100%', 
        maxWidth: '520px', 
        maxHeight: '90vh', 
        overflowY: 'auto', 
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(99, 102, 241, 0.3) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)'
            }}>
              <Bot size={20} className={isBriefingPlaying ? 'animate-bounce' : ''} />
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.02rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Executive AI Agent</span>
                <span style={{ fontSize: '0.62rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 6px', borderRadius: '6px', fontWeight: 700, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  AETHER HUB
                </span>
              </div>
              <div style={{ fontSize: '0.70rem', color: '#94a3b8', marginTop: '1px' }}>
                Autonomous briefing, proactive actions & goal orchestration
              </div>
            </div>
          </div>

          <button 
            type="button" 
            onClick={() => {
              stopBriefingAudio();
              onClose();
            }} 
            style={{ 
              background: 'rgba(255, 255, 255, 0.06)', 
              border: 'none', 
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8', 
              fontSize: '1.1rem', 
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs: [🎙️ Daily Briefing] [⚡ Autonomous Goals] */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '4px',
          gap: '4px',
          marginBottom: '16px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('briefing')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '12px',
              border: activeTab === 'briefing' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              background: activeTab === 'briefing' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
              color: activeTab === 'briefing' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.80rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Radio size={14} className={isBriefingPlaying ? 'animate-pulse' : ''} />
            <span>Daily Briefing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('goals')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '12px',
              border: activeTab === 'goals' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
              background: activeTab === 'goals' ? 'rgba(168, 85, 247, 0.18)' : 'transparent',
              color: activeTab === 'goals' ? '#c084fc' : '#94a3b8',
              fontSize: '0.80rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Zap size={14} />
            <span>Autonomous Actions</span>
          </button>
        </div>

        {/* TAB 1: EXECUTIVE DAILY BRIEFING */}
        {activeTab === 'briefing' && (
          <div>
            {isBriefingLoading ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎙️</div>
                <div style={{ fontSize: '0.92rem', color: '#e2e8f0', fontWeight: 700 }}>
                  Generating Executive Briefing...
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                  Analyzing real-time weather, schedule, meetings & finances
                </div>
              </div>
            ) : executiveBriefingData ? (
              <div>
                {/* Meta Chips */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '3px 9px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.25)', fontWeight: 600 }}>
                    📍 {cityName}
                  </span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '3px 9px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 600 }}>
                    📋 {executiveBriefingData.task_count || 0} tasks scheduled
                  </span>
                  {onRefreshBriefing && (
                    <button
                      type="button"
                      onClick={onRefreshBriefing}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', padding: '2px 6px' }}
                      title="Regenerate fresh briefing"
                    >
                      <RefreshCw size={12} />
                      <span>Refresh</span>
                    </button>
                  )}
                </div>

                {/* Briefing Text Card */}
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px solid rgba(255, 255, 255, 0.08)', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  color: '#f1f5f9', 
                  fontSize: '0.86rem', 
                  lineHeight: '1.65', 
                  marginBottom: '16px',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}>
                  {executiveBriefingData.text}
                </div>

                {/* Audio Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isBriefingPlaying) {
                        stopBriefingAudio();
                      } else {
                        speakBriefingAudio(executiveBriefingData.text);
                      }
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: isBriefingPlaying 
                        ? 'rgba(239, 68, 68, 0.2)' 
                        : 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                      color: isBriefingPlaying ? '#ef4444' : '#080c16',
                      border: isBriefingPlaying ? '1px solid #ef4444' : 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      boxShadow: isBriefingPlaying ? 'none' : '0 4px 16px rgba(56, 189, 248, 0.3)'
                    }}
                  >
                    {isBriefingPlaying ? <Pause size={17} /> : <Play size={17} />}
                    <span>{isBriefingPlaying ? 'Pause Audio Briefing' : 'Listen Executive Briefing'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('goals')}
                    style={{
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      color: '#c084fc',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Actions</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🎙️</div>
                <div style={{ fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 600 }}>No briefing loaded yet</div>
                {onRefreshBriefing && (
                  <button
                    type="button"
                    onClick={onRefreshBriefing}
                    style={{
                      marginTop: '12px',
                      background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                      border: 'none',
                      color: '#080c16',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Generate Briefing Now
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AUTONOMOUS ACTIONS & MULTI-STEP GOALS (Option 1 + Option 3) */}
        {activeTab === 'goals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* 1. Proactive Overdue Action Banner */}
            {overdueCount > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fca5a5' }}>
                      {overdueCount} Overdue Task{overdueCount > 1 ? 's' : ''} Pending
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>
                      Unfinished from previous dates
                    </div>
                  </div>
                </div>
                {onRescheduleOverdue && (
                  <button
                    type="button"
                    onClick={() => {
                      onRescheduleOverdue();
                      if (onOpenTasks) onOpenTasks();
                    }}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Reschedule All ⚡
                  </button>
                )}
              </div>
            )}

            {/* 2. Instant 1-Tap Proactive Actions */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                ⚡ 1-Tap Proactive Actions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickGoalClick('Aether, कृपया मेरे इस महीने के सभी खर्चों का विस्तृत ऑडिट करें, और बताएं कि कहाँ अनावश्यक खर्च हुआ है और बचत के क्या रास्ते हैं।')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '14px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', marginBottom: '2px' }}>
                    <Wallet size={15} />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>Audit Expenses</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.3 }}>Find leaks & savings tips</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickGoalClick('Aether, मेरे आज के सभी कार्यों और मीटिंग्स का विश्लेषण करें और दिन का सबसे कुशल समय-सारिणी (optimal prioritized schedule) तैयार करें।')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '14px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', marginBottom: '2px' }}>
                    <Calendar size={15} />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>Optimize Today</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.3 }}>Auto-prioritize agenda</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickGoalClick('Aether, अगले 7 दिनों का पूरा वर्क शेड्यूल, जरूरी डेडलाइन्स और टास्क प्रायोरिटीज प्लान करें।')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    borderRadius: '14px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', marginBottom: '2px' }}>
                    <Target size={15} />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>Plan My Week</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.3 }}>7-day milestone sprint</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickGoalClick(`Aether, मुझे ${cityName} में इस वीकेंड के लिए टॉप दर्शनीय स्थलों, प्रसिद्ध खान-पान और एक्टिविटीज का कम्पलीट इटिनेररी तैयार करके दें।`)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '14px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '2px' }}>
                    <Sparkles size={15} />
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>Weekend Guide</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.3 }}>Local food & places plan</div>
                </button>
              </div>
            </div>

            {/* 3. Assign Custom Multi-Step Autonomous Goal (Option 3) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Target size={15} color="#38bdf8" />
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffffff' }}>
                  Assign Autonomous Goal to Aether
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '10px', lineHeight: 1.4 }}>
                Aether will break down your goal, analyze dependencies, and autonomously execute multi-step tools.
              </div>

              <form onSubmit={handleGoalSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. Plan a 3-day work sprint with daily milestones..."
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!customGoal.trim()}
                  style={{
                    background: customGoal.trim() ? 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)' : 'rgba(255, 255, 255, 0.08)',
                    color: customGoal.trim() ? '#080c16' : '#64748b',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: customGoal.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    boxShadow: customGoal.trim() ? '0 4px 14px rgba(56, 189, 248, 0.3)' : 'none'
                  }}
                >
                  <Send size={13} />
                  <span>Execute</span>
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default BriefingModal;
