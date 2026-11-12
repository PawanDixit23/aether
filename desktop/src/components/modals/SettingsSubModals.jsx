import React, { useState } from 'react';
import { Check, Database, Shield, Key, ExternalLink, HelpCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AETHER_VOICES, AI_PROVIDERS } from '../common/constants';

export const SettingsSubModals = ({
  activeSubModal,
  setActiveSubModal,
  tempPreferredName,
  setTempPreferredName,
  setUserPreferredName,
  userPreferredName,
  showToast,
  apiKey,
  setApiKey,
  openaiKey,
  setOpenaiKey,
  grokKey,
  setGrokKey,
  activeProvider,
  setActiveProvider,
  keyError,
  keyValidating,
  handleValidateApiKey,
  selectedVoice,
  setSelectedVoice,
  appTheme,
  setAppTheme,
  voiceOutputEnabled,
  setVoiceOutputEnabled,
  chimesEnabled,
  setChimesEnabled,
  playReminderChime,
  speechRate,
  setSpeechRate,
  effectiveLang,
  selectedLang,
  setSelectedLang,
  newMemoryText,
  setNewMemoryText,
  handleSendPrompt,
  memories,
  setMemories,
  handleDeleteMemory,
  apiBase,
  userEmail,
  customUsername,
  setCustomUsername,
  handleConfirmAccountReset,
  serverOnline,
  tasks,
  auditLogs,
  refreshAllData,
  isFriendMode,
  handleToggleFriendMode
}) => {
  const [modalProviderTab, setModalProviderTab] = useState(() => activeProvider || 'gemini');
  const [showSettingsKeyGuide, setShowSettingsKeyGuide] = useState(false);
  const [memSearch, setMemSearch] = useState('');
  const [memCategoryFilter, setMemCategoryFilter] = useState('all');
  const [newMemCategory, setNewMemCategory] = useState('personal');
  const [editingMemId, setEditingMemId] = useState(null);
  const [editingMemText, setEditingMemText] = useState('');
  const [memSaving, setMemSaving] = useState(false);
  const [pinnedMemoryIds, setPinnedMemoryIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aether_pinned_memories') || '[]'); } catch { return []; }
  });
  const [pauseMemoryLearning, setPauseMemoryLearning] = useState(() => localStorage.getItem('aether_pause_memory_learning') === 'true');

  const currentSettingsProv = AI_PROVIDERS.find(p => p.id === modalProviderTab) || AI_PROVIDERS[0];
  const currentKeyVal = modalProviderTab === 'openai' ? (openaiKey || '') : modalProviderTab === 'grok' ? (grokKey || '') : (apiKey || '');

  if (!activeSubModal) return null;

  return (
    <>
      {/* 1. Profile Name Editor Modal */}
      {activeSubModal === 'profile-name' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.78)', backdropFilter: 'blur(10px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Your Preferred Name</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>How Aether greets you on the main screen.</p>
            <input
              type="text"
              value={tempPreferredName}
              onChange={(e) => setTempPreferredName(e.target.value)}
              placeholder="e.g. Raja or Pawan"
              style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '10px 14px', color: '#fff', marginBottom: '18px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '8px 14px', cursor: 'pointer' }}>Cancel</button>
              <button 
                type="button" 
                onClick={() => {
                  const val = tempPreferredName.trim() || 'Raja';
                  setUserPreferredName(val);
                  localStorage.setItem('aether_preferred_name', val);
                  setActiveSubModal(null);
                  showToast(`Name saved: ${val}`, 'success');
                }}
                style={{ background: '#38bdf8', border: 'none', color: '#080c16', padding: '8px 18px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Multi-Provider (Gemini / ChatGPT / Grok) BYOK Key Modal */}
      {activeSubModal === 'key' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.82)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.16)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>AI Platform & API Keys</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', marginBottom: 0 }}>Configure Gemini, ChatGPT, or Grok keys with instant platform switching.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveSubModal(null)} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px' }}
              >
                ✕
              </button>
            </div>

            {/* Provider Tabs */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', margin: '16px 0 14px 0' }}>
              {AI_PROVIDERS.map(p => {
                const isActiveTab = modalProviderTab === p.id;
                const isEngineActive = (activeProvider || 'gemini') === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setModalProviderTab(p.id);
                      setShowSettingsKeyGuide(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: '10px',
                      border: isActiveTab ? `1px solid ${p.color}55` : '1px solid transparent',
                      background: isActiveTab ? `${p.color}18` : 'transparent',
                      color: isActiveTab ? p.color : '#94a3b8',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{p.icon} {p.shortName}</span>
                    {isEngineActive && (
                      <span style={{ fontSize: '9px', background: `${p.color}33`, color: p.color, padding: '1px 5px', borderRadius: '6px' }}>
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Engine Toggle Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                  {currentSettingsProv.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {currentSettingsProv.badge}
                </div>
              </div>

              {(activeProvider || 'gemini') === modalProviderTab ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399', fontSize: '0.76rem', fontWeight: 600, background: 'rgba(52, 211, 153, 0.12)', padding: '4px 8px', borderRadius: '8px' }}>
                  <Check size={12} />
                  <span>Active Engine</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('aether_active_provider', modalProviderTab);
                    if (setActiveProvider) setActiveProvider(modalProviderTab);
                    showToast(`Active Engine: ${currentSettingsProv.name}`, 'success');
                  }}
                  style={{
                    background: `${currentSettingsProv.color}22`,
                    border: `1px solid ${currentSettingsProv.color}44`,
                    color: currentSettingsProv.color,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Set as Active
                </button>
              )}
            </div>

            {/* API Key Input */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 500 }}>
                {currentSettingsProv.name} Secret / API Key
              </label>
              <input
                type="text"
                value={currentKeyVal}
                onChange={(e) => {
                  const val = e.target.value;
                  if (modalProviderTab === 'openai') {
                    if (setOpenaiKey) setOpenaiKey(val);
                  } else if (modalProviderTab === 'grok') {
                    if (setGrokKey) setGrokKey(val);
                  } else {
                    if (setApiKey) setApiKey(val);
                  }
                }}
                placeholder={currentSettingsProv.placeholder}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Key Error Alert */}
            {keyError && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '8px 12px', marginBottom: '12px' }}>
                {keyError}
              </div>
            )}

            {/* Buttons Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <button 
                type="button" 
                onClick={() => handleValidateApiKey(currentKeyVal, modalProviderTab)} 
                disabled={keyValidating}
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: 'var(--accent-cyan)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {keyValidating ? 'Testing...' : 'Test & Verify Key'}
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setActiveSubModal(null)} 
                  style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '8px 10px', cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const clean = (currentKeyVal || '').trim();
                    if (modalProviderTab === 'openai') {
                      localStorage.setItem('aether_openai_key', clean);
                    } else if (modalProviderTab === 'grok') {
                      localStorage.setItem('aether_grok_key', clean);
                    } else {
                      localStorage.setItem('aether_gemini_key', clean);
                    }
                    localStorage.setItem('aether_active_provider', modalProviderTab);
                    if (setActiveProvider) setActiveProvider(modalProviderTab);
                    showToast(`${currentSettingsProv.name} Key Saved & Activated!`, 'success');
                    setActiveSubModal(null);
                  }}
                  style={{
                    background: currentSettingsProv.color,
                    border: 'none',
                    color: '#080c16',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Save & Activate
                </button>
              </div>
            </div>

            {/* Generation Guide Accordion */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowSettingsKeyGuide(!showSettingsKeyGuide)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                <HelpCircle size={14} />
                <span>{currentSettingsProv.guideTitle}</span>
              </button>

              {showSettingsKeyGuide && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '12px',
                  marginTop: '10px',
                  fontSize: '0.78rem',
                  color: '#cbd5e1',
                  lineHeight: '1.5'
                }}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: currentSettingsProv.color }}>
                    Quick Steps for {currentSettingsProv.name}:
                  </p>
                  <ol style={{ paddingLeft: '16px', margin: 0 }}>
                    {currentSettingsProv.guideSteps.map((step, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        {step.link ? (
                          <a href={step.link} target="_blank" rel="noreferrer" style={{ color: currentSettingsProv.color, textDecoration: 'underline' }}>
                            {step.text} ↗
                          </a>
                        ) : (
                          step.text
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Phone Assistant Setup Guide Modal */}
      {activeSubModal === 'assistant-setup' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Phone Assistant Integration</h3>
            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '16px' }}>
              On Android, go to <b>Settings → Apps → Default Apps → Digital Assistant App</b> and select <b>Aether</b>.
            </p>
            <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '14px', fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4', marginBottom: '18px' }}>
              ⚡ You will be able to hold the power button or swipe from bottom corners to talk to Aether instantly from any application!
            </div>
            <button 
              type="button" 
              onClick={() => setActiveSubModal(null)} 
              style={{ width: '100%', background: '#38bdf8', border: 'none', color: '#080c16', padding: '10px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* 6. Assistant Voice & Personality Modal */}
      {activeSubModal === 'assistant' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Assistant & Personality</h3>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Friend Mode Master Switch Card */}
            <div style={{
              background: isFriendMode ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(239, 68, 68, 0.12) 100%)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${isFriendMode ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🤝</span>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Hindi Best Friend Mode</span>
                  {isFriendMode && (
                    <span style={{ background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24', fontSize: '0.68rem', padding: '2px 7px', borderRadius: '6px', fontWeight: 700 }}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: '1.4' }}>
                  Aether chats warmly with you in casual conversational Hindi like a true friend, with low-latency responses.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (handleToggleFriendMode) {
                    handleToggleFriendMode(!isFriendMode);
                  }
                }}
                style={{
                  background: isFriendMode ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'rgba(255, 255, 255, 0.12)',
                  border: 'none',
                  color: isFriendMode ? '#000' : '#94a3b8',
                  padding: '8px 18px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: isFriendMode ? '0 0 14px rgba(245, 158, 11, 0.4)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {isFriendMode ? 'ON' : 'OFF'}
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Voice Personality
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {AETHER_VOICES.map(voice => (
                <div
                  key={voice.id}
                  onClick={() => {
                    setSelectedVoice(voice.id);
                    localStorage.setItem('aether_selected_voice', voice.id);
                    if (voice.id === 'mitra') {
                      if (handleToggleFriendMode) handleToggleFriendMode(true);
                    }
                    setActiveSubModal(null);
                    showToast(`Voice set to ${voice.name}`, 'info');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: selectedVoice === voice.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${selectedVoice === voice.id ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.92rem' }}>{voice.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{voice.desc}</div>
                  </div>
                  {selectedVoice === voice.id && <Check size={18} color="var(--accent-cyan)" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. Appearance & Theme Modal */}
      {activeSubModal === 'appearance' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Appearance & Theme</h3>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { id: 'obsidian', name: 'Obsidian Dark (Default)', desc: 'Classic deep obsidian with electric cyan accents', color: '#00e5ff' },
                { id: 'sapphire', name: 'Midnight Sapphire', desc: 'Cosmic indigo with radiant purple aura', color: '#818cf8' },
                { id: 'oled', name: 'OLED Pure Black', desc: 'Pitch black background optimized for battery', color: '#38bdf8' }
              ].map(themeItem => (
                <div
                  key={themeItem.id}
                  onClick={() => {
                    setAppTheme(themeItem.id);
                    localStorage.setItem('aether_theme', themeItem.id);
                    document.body.className = `theme-${themeItem.id}`;
                    showToast(`Theme applied: ${themeItem.name}`, 'success');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: appTheme === themeItem.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${appTheme === themeItem.id ? themeItem.color : 'rgba(255, 255, 255, 0.08)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{themeItem.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.76rem' }}>{themeItem.desc}</div>
                  </div>
                  {appTheme === themeItem.id && <Check size={18} color={themeItem.color} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. Sound & Haptics Modal */}
      {activeSubModal === 'sound' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Sound & Haptics</h3>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>AI Voice Readout</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.76rem' }}>Speak assistant answers aloud automatically</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !voiceOutputEnabled;
                    setVoiceOutputEnabled(nextVal);
                    localStorage.setItem('aether_voice_output', String(nextVal));
                    showToast(nextVal ? 'Voice output enabled' : 'Voice output muted', 'info');
                  }}
                  style={{
                    background: voiceOutputEnabled ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    color: voiceOutputEnabled ? '#080c16' : '#94a3b8',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {voiceOutputEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Audio Chimes & Tones</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.76rem' }}>Executive reminder sound effects</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !chimesEnabled;
                    setChimesEnabled(nextVal);
                    localStorage.setItem('aether_chimes', String(nextVal));
                    if (nextVal) playReminderChime();
                    showToast(nextVal ? 'Chimes enabled' : 'Chimes muted', 'info');
                  }}
                  style={{
                    background: chimesEnabled ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    color: chimesEnabled ? '#080c16' : '#94a3b8',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {chimesEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Speech Speed</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.76rem' }}>Speaking pace for responses</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = speechRate >= 1.2 ? 1.0 : 1.2;
                    setSpeechRate(nextVal);
                    localStorage.setItem('aether_speech_rate', String(nextVal));
                    showToast(`Speech rate: ${nextVal}x`, 'info');
                  }}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: 'var(--accent-cyan)',
                    padding: '6px 14px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {speechRate}x Pace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. Language Selection Modal */}
      {activeSubModal === 'language' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Preferred AI Response Language
              </h3>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { code: 'auto', label: 'Follow Device (Auto)', icon: '🌐' },
                { code: 'hi', label: 'Hindi', icon: '🇮🇳' },
                { code: 'en', label: 'English', icon: '🇬🇧' },
                { code: 'hinglish', label: 'Hinglish', icon: '🇮🇳' }
              ].map(lang => (
                <div
                  key={lang.code}
                  onClick={() => {
                    setSelectedLang(lang.code);
                    localStorage.setItem('aether_language', lang.code);
                    setActiveSubModal(null);
                    showToast(`Language set to: ${lang.label}`, 'success');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: selectedLang === lang.code ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${selectedLang === lang.code ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>{lang.icon}</span>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.92rem' }}>{lang.label}</span>
                  </div>
                  {selectedLang === lang.code && <Check size={18} color="var(--accent-cyan)" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 11. Memory Vault Dashboard Modal */}
      {activeSubModal === 'memory' && (() => {
        const categories = ['all', 'personal', 'preference', 'routine', 'contact'];
        const q = memSearch.trim().toLowerCase();
        const filteredMemories = (memories || [])
          .filter((mem) => {
            const cat = (mem.category || 'personal').toLowerCase();
            if (memCategoryFilter !== 'all' && cat !== memCategoryFilter) return false;
            if (!q) return true;
            const text = (mem.fact || mem.content || mem.text || '').toLowerCase();
            return text.includes(q) || cat.includes(q);
          })
          .sort((a, b) => {
            const aPin = pinnedMemoryIds.includes(a.id) ? 1 : 0;
            const bPin = pinnedMemoryIds.includes(b.id) ? 1 : 0;
            return bPin - aPin;
          });

        const togglePin = (id) => {
          setPinnedMemoryIds((prev) => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            try { localStorage.setItem('aether_pinned_memories', JSON.stringify(next)); } catch {}
            return next;
          });
        };

        const handleDirectAddMemory = async (e) => {
          e.preventDefault();
          const fact = newMemoryText.trim();
          if (!fact || memSaving) return;
          if (!apiBase) {
            handleSendPrompt("Remember that: " + fact);
            setNewMemoryText('');
            return;
          }
          setMemSaving(true);
          try {
            const res = await fetch(`${apiBase}/memory`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(userEmail ? { 'X-User-Email': userEmail } : {})
              },
              body: JSON.stringify({ fact, category: newMemCategory, user_email: userEmail || null })
            });
            if (res.ok) {
              setNewMemoryText('');
              showToast("Fact saved to Memory Vault", 'success');
              if (refreshAllData) refreshAllData();
            } else {
              showToast("Failed to save memory", 'error');
            }
          } catch {
            showToast("Network error saving memory", 'error');
          } finally {
            setMemSaving(false);
          }
        };

        const handleSaveEditMemory = async (mem) => {
          const updatedFact = editingMemText.trim();
          if (!updatedFact || !apiBase) return;
          try {
            const res = await fetch(`${apiBase}/memory/${mem.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(userEmail ? { 'X-User-Email': userEmail } : {})
              },
              body: JSON.stringify({
                fact: updatedFact,
                category: mem.category || 'personal',
                user_email: userEmail || null
              })
            });
            if (res.ok) {
              if (setMemories) {
                setMemories(prev => prev.map(m => m.id === mem.id ? { ...m, fact: updatedFact } : m));
              }
              setEditingMemId(null);
              setEditingMemText('');
              showToast("Memory updated", 'success');
            } else {
              showToast("Failed to update memory", 'error');
            }
          } catch {
            showToast("Error updating memory", 'error');
          }
        };

        const handleExportMemories = () => {
          try {
            const blob = new Blob([JSON.stringify(memories || [], null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'aether-memories.json';
            a.click();
            URL.revokeObjectURL(url);
            showToast("Exported memories JSON", 'success');
          } catch {
            showToast("Export failed", 'error');
          }
        };

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: '#0d1527', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '24px', padding: '22px', width: '100%', maxWidth: '560px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700 }}>
                  <Database size={18} />
                  <span>MEMORY DASHBOARD</span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.14)', padding: '2px 8px', borderRadius: '999px', color: '#7dd3fc' }}>
                    {(memories || []).length} facts
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleExportMemories}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', fontSize: '0.72rem', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    Export JSON
                  </button>
                  <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  Auto-Learn from Chat {pauseMemoryLearning ? '(Paused)' : '(Active)'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !pauseMemoryLearning;
                    setPauseMemoryLearning(next);
                    try { localStorage.setItem('aether_pause_memory_learning', String(next)); } catch {}
                    showToast(next ? "Auto-learning paused" : "Auto-learning resumed", 'info');
                  }}
                  style={{
                    background: pauseMemoryLearning ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                    border: `1px solid ${pauseMemoryLearning ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
                    color: pauseMemoryLearning ? '#fca5a5' : '#6ee7b7',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    cursor: 'pointer'
                  }}
                >
                  {pauseMemoryLearning ? 'Paused' : 'Active'}
                </button>
              </div>

              <form onSubmit={handleDirectAddMemory} style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={newMemCategory}
                  onChange={(e) => setNewMemCategory(e.target.value)}
                  style={{ background: '#111b33', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '8px', color: '#cbd5e1', fontSize: '0.78rem' }}
                >
                  <option value="personal">Personal</option>
                  <option value="preference">Preference</option>
                  <option value="routine">Routine</option>
                  <option value="contact">Contact</option>
                </select>
                <input
                  type="text"
                  placeholder="Add a new fact directly..."
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '0.84rem' }}
                />
                <button type="submit" disabled={memSaving} style={{ background: '#38bdf8', border: 'none', color: '#080c16', padding: '8px 14px', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                  {memSaving ? '...' : '+ Add'}
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Search memories..."
                  value={memSearch}
                  onChange={(e) => setMemSearch(e.target.value)}
                  style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '7px 12px', color: '#fff', fontSize: '0.8rem' }}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMemCategoryFilter(cat)}
                      style={{
                        background: memCategoryFilter === cat ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${memCategoryFilter === cat ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255,255,255,0.08)'}`,
                        color: memCategoryFilter === cat ? '#7dd3fc' : '#94a3b8',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredMemories.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '0.84rem', textAlign: 'center', padding: '30px 0' }}>
                    No matching memories found.
                  </div>
                ) : (
                  filteredMemories.map((mem) => {
                    const isPinned = pinnedMemoryIds.includes(mem.id);
                    const isEditing = editingMemId === mem.id;
                    const catLabel = (mem.category || 'personal').toLowerCase();
                    return (
                      <div key={mem.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 14px', background: isPinned ? 'rgba(56, 189, 248, 0.06)' : 'rgba(255, 255, 255, 0.03)', border: `1px solid ${isPinned ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.07)'}`, borderRadius: '12px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              value={editingMemText}
                              onChange={(e) => setEditingMemText(e.target.value)}
                              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '8px', padding: '6px 10px', color: '#fff', fontSize: '0.84rem' }}
                            />
                            <button type="button" onClick={() => handleSaveEditMemory(mem)} style={{ background: '#10b981', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                            <button type="button" onClick={() => setEditingMemId(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#cbd5e1', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ color: '#e2e8f0', fontSize: '0.86rem', flex: 1, lineHeight: '1.4' }}>
                              {mem.fact || mem.content || mem.text}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              <button type="button" onClick={() => togglePin(mem.id)} title={isPinned ? 'Unpin' : 'Pin'} style={{ background: 'none', border: 'none', color: isPinned ? '#fbbf24' : '#64748b', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 4px' }}>📌</button>
                              <button type="button" onClick={() => { setEditingMemId(mem.id); setEditingMemText(mem.fact || mem.content || mem.text || ''); }} title="Edit fact" style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 4px' }}>Edit</button>
                              <button type="button" onClick={() => handleDeleteMemory(mem.id)} title="Delete fact" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.95rem', padding: '2px 4px' }}>✕</button>
                            </div>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#64748b' }}>
                          <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em', color: '#7dd3fc' }}>{catLabel}</span>
                          <span>{mem.created_at ? new Date(mem.created_at).toLocaleDateString() : 'Saved'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 12. Custom Username Editor Modal */}
      {activeSubModal === 'username' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              Executive Username
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>
              Your unique @handle across Aether networks.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '0 12px', marginBottom: '18px' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>@</span>
              <input
                type="text"
                value={customUsername || userPreferredName.toLowerCase().replace(/\s+/g, '')}
                onChange={(e) => setCustomUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="username"
                style={{ width: '100%', background: 'transparent', border: 'none', padding: '10px 8px', color: '#fff', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '8px 14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  const val = customUsername.trim() || userPreferredName.toLowerCase().replace(/\s+/g, '');
                  setCustomUsername(val);
                  localStorage.setItem('aether_username', val);
                  setActiveSubModal(null);
                  showToast(`Username updated: @${val}`, 'success');
                }}
                style={{ background: '#38bdf8', border: 'none', color: '#080c16', padding: '8px 18px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. Delete Account Custom Modal */}
      {activeSubModal === 'delete-account' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.88)', backdropFilter: 'blur(14px)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Shield size={24} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              Reset Account & Data?
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.45', marginBottom: '20px' }}>
              This will clear your local session, private keys, authentication data, and reset the app.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setActiveSubModal(null)} 
                style={{ flex: 1, background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmAccountReset} 
                style={{ flex: 1, background: '#ef4444', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Database Core & Sync Modal */}
      {activeSubModal === 'db' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Database Core & Sync</h3>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span>Server Status</span>
                <span style={{ color: serverOnline ? '#10b981' : '#ef4444', fontWeight: 700 }}>{serverOnline ? '● Online (Port 8000)' : '● Offline'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span>Tasks in SQLite</span>
                <span>{tasks.length} items</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span>Memories in Vault</span>
                <span>{memories.length} items</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span>Audit Log Records</span>
                <span>{auditLogs.length} entries</span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => { refreshAllData(); showToast('Data re-synchronized with core', 'success'); }}
              style={{ width: '100%', marginTop: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: 'var(--accent-cyan)', padding: '10px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              🔄 Refresh & Sync Core Now
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsSubModals;
