import React from 'react';
import { Check, Database, Shield } from 'lucide-react';
import { AETHER_VOICES } from '../common/constants';

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
  handleDeleteMemory,
  customUsername,
  setCustomUsername,
  handleConfirmAccountReset,
  serverOnline,
  tasks,
  auditLogs,
  refreshAllData
}) => {
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

      {/* 2. Gemini API Key BYOK Modal */}
      {activeSubModal === 'key' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.78)', backdropFilter: 'blur(10px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Google Gemini API Key</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>BYOK direct validation with Google AI Studio models.</p>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '10px 14px', color: '#fff', marginBottom: '12px', boxSizing: 'border-box' }}
            />
            {keyError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '12px' }}>{keyError}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={handleValidateApiKey} 
                disabled={keyValidating}
                style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: 'var(--accent-cyan)', padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {keyValidating ? 'Testing...' : 'Test & Verify Key'}
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '8px 12px', cursor: 'pointer' }}>Close</button>
                <button 
                  type="button" 
                  onClick={() => {
                    localStorage.setItem('aether_gemini_key', apiKey.trim());
                    setActiveSubModal(null);
                    showToast('Key saved to local storage', 'success');
                  }}
                  style={{ background: '#38bdf8', border: 'none', color: '#080c16', padding: '8px 16px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save
                </button>
              </div>
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

      {/* 6. Assistant Voice Selector Modal */}
      {activeSubModal === 'assistant' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Choose Assistant Personality</h3>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {AETHER_VOICES.map(voice => (
                <div
                  key={voice.id}
                  onClick={() => {
                    setSelectedVoice(voice.id);
                    localStorage.setItem('aether_selected_voice', voice.id);
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
                {effectiveLang === 'en' ? 'Preferred Language' : effectiveLang === 'hinglish' ? 'Preferred Language' : 'पसंदीदा भाषा'}
              </h3>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { code: 'auto', label: effectiveLang === 'en' ? 'Follow Phone (Auto)' : effectiveLang === 'hinglish' ? 'Follow Phone (Auto)' : 'फ़ोन के अनुसार (स्वचालित)', icon: '🌐' },
                { code: 'hi', label: 'हिन्दी (Hindi)', icon: '🇮🇳' },
                { code: 'en', label: 'English', icon: '🇬🇧' },
                { code: 'hinglish', label: 'Hinglish (हिंग्लिश)', icon: '🇮🇳' }
              ].map(lang => (
                <div
                  key={lang.code}
                  onClick={() => {
                    setSelectedLang(lang.code);
                    localStorage.setItem('aether_language', lang.code);
                    setActiveSubModal(null);
                    showToast(
                      lang.code === 'en' ? `Language set to: ${lang.label}` : lang.code === 'hinglish' ? `Language set ho gayi: ${lang.label}` : `भाषा सेट की गई: ${lang.label}`,
                      'success'
                    );
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

      {/* 11. Memory Vault Manager Modal */}
      {activeSubModal === 'memory' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700 }}>
                <Database size={18} />
                <span>EXECUTIVE MEMORY VAULT</span>
              </div>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (newMemoryText.trim()) {
                handleSendPrompt("Remember that: " + newMemoryText.trim());
                setNewMemoryText('');
                showToast(
                  effectiveLang === 'en' ? "Fact added to memory" : effectiveLang === 'hinglish' ? "Memory me add ho gaya" : "नया तथ्य स्मृति में जोड़ा गया",
                  'success'
                );
              }
            }} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder={effectiveLang === 'en' ? "Add a new fact to remember..." : effectiveLang === 'hinglish' ? "Nayi memory ya fact likhein..." : "नई मेमोरी या तथ्य जोड़ें..."}
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '0.84rem' }}
              />
              <button type="submit" style={{ background: '#38bdf8', border: 'none', color: '#080c16', padding: '8px 14px', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                {effectiveLang === 'en' ? '+ Add' : effectiveLang === 'hinglish' ? '+ Add' : '+ जोड़ें'}
              </button>
            </form>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {memories.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.84rem', textAlign: 'center', padding: '30px 0' }}>
                  {effectiveLang === 'en' ? 'No facts recorded yet.' : effectiveLang === 'hinglish' ? 'Abhi koi memory saved nahi hai.' : 'अभी कोई मेमोरी दर्ज नहीं है।'}
                </div>
              ) : (
                memories.map(mem => (
                  <div key={mem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px' }}>
                    <div style={{ color: '#e2e8f0', fontSize: '0.86rem', flex: 1, paddingRight: '10px', lineHeight: '1.4' }}>
                      {mem.fact || mem.content || mem.text}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(mem.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px' }}
                      title="Delete this fact"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 12. Custom Username Editor Modal */}
      {activeSubModal === 'username' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              {effectiveLang === 'en' ? 'Executive Username' : effectiveLang === 'hinglish' ? 'Executive Username' : 'एग्जीक्यूटिव यूज़रनेम'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>
              {effectiveLang === 'en' ? 'Your unique @handle across Aether networks.' : effectiveLang === 'hinglish' ? 'Aapka unique @handle Aether ke liye.' : 'Aether पर आपकी पहचान के लिए विशिष्ट @हैंडल।'}
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
                {effectiveLang === 'en' ? 'Cancel' : effectiveLang === 'hinglish' ? 'Cancel' : 'रद्द करें'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  const val = customUsername.trim() || userPreferredName.toLowerCase().replace(/\s+/g, '');
                  setCustomUsername(val);
                  localStorage.setItem('aether_username', val);
                  setActiveSubModal(null);
                  showToast(
                    effectiveLang === 'en' ? `Username updated: @${val}` : effectiveLang === 'hinglish' ? `Username update ho gaya: @${val}` : `यूज़रनेम अपडेट हुआ: @${val}`,
                    'success'
                  );
                }}
                style={{ background: '#38bdf8', border: 'none', color: '#080c16', padding: '8px 18px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
              >
                {effectiveLang === 'en' ? 'Save' : effectiveLang === 'hinglish' ? 'Save' : 'सेव करें'}
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
              {effectiveLang === 'en' 
                ? 'Reset Account & Data?' 
                : effectiveLang === 'hinglish' 
                ? 'Account aur Data Reset Karein?' 
                : 'खाता और डेटा रीसेट करें?'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.45', marginBottom: '20px' }}>
              {effectiveLang === 'en' 
                ? 'This will clear your local session, private keys, authentication data, and reset the app.' 
                : effectiveLang === 'hinglish' 
                ? 'Yeh aapka local session, private keys aur login data delete kar dega.' 
                : 'यह आपके स्थानीय सत्र, निजी चाबियाँ और प्रमाणीकरण डेटा को हटा देगा।'}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setActiveSubModal(null)} 
                style={{ flex: 1, background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {effectiveLang === 'en' ? 'Cancel' : effectiveLang === 'hinglish' ? 'Cancel' : 'रद्द करें'}
              </button>
              <button 
                type="button" 
                onClick={handleConfirmAccountReset} 
                style={{ flex: 1, background: '#ef4444', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                {effectiveLang === 'en' ? 'Yes, Reset' : effectiveLang === 'hinglish' ? 'Haan, Reset Karein' : 'हां, रीसेट करें'}
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
