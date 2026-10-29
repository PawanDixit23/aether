import React from 'react';
import { ShieldCheck, Mic, Bell, MapPin, Volume2, Sparkles, Radio } from 'lucide-react';

export const PermissionsModal = ({
  isOpen,
  onClose,
  micEnabled,
  handleToggleMic,
  handleTestMic,
  isMicTesting,
  pushEnabled,
  handleTogglePush,
  handleSendTestPush,
  locationEnabled,
  handleToggleLocation,
  userLocationName,
  voiceOutputEnabled,
  setVoiceOutputEnabled,
  wakeWordEnabled,
  handleToggleWakeWord,
  showToast
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(18px)', zIndex: 120, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'linear-gradient(180deg, #0f1b2d 0%, #0a1220 100%)', borderRadius: '28px 28px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: '480px', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.01em' }}>Permissions & Access</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '1px' }}>Control what Aether can access</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0 }}
          >✕</button>
        </div>

        {/* Drag handle visual */}
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)', margin: '12px auto 24px' }} />

        {/* Permission Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 1: Microphone */}
          <div style={{ background: 'rgba(56,189,248,0.06)', border: micEnabled ? '1.5px solid rgba(56,189,248,0.35)' : '1.5px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', transition: 'border 0.2s' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: micEnabled ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)', border: micEnabled ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: micEnabled ? '#38bdf8' : '#64748b', flexShrink: 0, transition: 'all 0.2s' }}>
                <Mic size={22} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>Microphone</div>
                <div style={{ color: '#64748b', fontSize: '0.76rem', lineHeight: '1.4' }}>Voice prompts & real-time listening</div>
                {micEnabled && (
                  <button type="button" onClick={handleTestMic} disabled={isMicTesting}
                    style={{ marginTop: '8px', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '4px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                    {isMicTesting ? '🎙️ Testing...' : '🎙️ Test Mic'}
                  </button>
                )}
              </div>
            </div>
            <div className={`permission-toggle-switch ${micEnabled ? 'active' : ''}`} onClick={handleToggleMic} role="button" tabIndex={0}>
              <div className="permission-toggle-thumb" />
            </div>
          </div>

          {/* 2: Push Notifications */}
          <div style={{ background: 'rgba(245,158,11,0.06)', border: pushEnabled ? '1.5px solid rgba(245,158,11,0.35)' : '1.5px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', transition: 'border 0.2s' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: pushEnabled ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)', border: pushEnabled ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: pushEnabled ? '#fbbf24' : '#64748b', flexShrink: 0, transition: 'all 0.2s' }}>
                <Bell size={22} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>Push Notifications</div>
                <div style={{ color: '#64748b', fontSize: '0.76rem', lineHeight: '1.4' }}>8 AM briefing & task reminders</div>
                {pushEnabled && (
                  <button type="button" onClick={handleSendTestPush}
                    style={{ marginTop: '8px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', padding: '4px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                    📲 Send Test
                  </button>
                )}
              </div>
            </div>
            <div className={`permission-toggle-switch ${pushEnabled ? 'active' : ''}`} onClick={handleTogglePush} role="button" tabIndex={0}>
              <div className="permission-toggle-thumb" />
            </div>
          </div>

          {/* 3: Location */}
          <div style={{ background: 'rgba(244,63,94,0.06)', border: locationEnabled ? '1.5px solid rgba(244,63,94,0.35)' : '1.5px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', transition: 'border 0.2s' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: locationEnabled ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.06)', border: locationEnabled ? '1px solid rgba(244,63,94,0.4)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: locationEnabled ? '#fb7185' : '#64748b', flexShrink: 0, transition: 'all 0.2s' }}>
                <MapPin size={22} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>Location & Maps</div>
                <div style={{ color: '#64748b', fontSize: '0.76rem', lineHeight: '1.4' }}>Local weather & city briefing</div>
                {locationEnabled && userLocationName && (
                  <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '3px 10px', color: '#34d399', fontSize: '0.72rem', fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📍 {userLocationName}
                  </div>
                )}
              </div>
            </div>
            <div className={`permission-toggle-switch ${locationEnabled ? 'active' : ''}`} onClick={handleToggleLocation} role="button" tabIndex={0}>
              <div className="permission-toggle-thumb" />
            </div>
          </div>

          {/* 4: Audio Playback */}
          <div style={{ background: 'rgba(168,85,247,0.06)', border: voiceOutputEnabled ? '1.5px solid rgba(168,85,247,0.35)' : '1.5px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', transition: 'border 0.2s' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: voiceOutputEnabled ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.06)', border: voiceOutputEnabled ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: voiceOutputEnabled ? '#c084fc' : '#64748b', flexShrink: 0, transition: 'all 0.2s' }}>
                <Volume2 size={22} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>Voice Responses</div>
                <div style={{ color: '#64748b', fontSize: '0.76rem', lineHeight: '1.4' }}>
                  {voiceOutputEnabled ? 'Spoken AI replies in Indian English / Hindi' : 'Text-only responses (voice muted)'}
                </div>
              </div>
            </div>
            <div
              className={`permission-toggle-switch ${voiceOutputEnabled ? 'active' : ''}`}
              onClick={() => {
                const nextVal = !voiceOutputEnabled;
                setVoiceOutputEnabled(nextVal);
                localStorage.setItem('aether_voice_output', String(nextVal));
                showToast(nextVal ? '🔊 आवाज़ चालू — Indian English/Hindi' : '🔇 आवाज़ बंद — सिर्फ़ टेक्स्ट', 'info');
              }}
              role="button"
              tabIndex={0}
            >
              <div className="permission-toggle-thumb" />
            </div>
          </div>

          {/* 5: "Hey Aether" Wake Word */}
          <div style={{ background: 'rgba(56,189,248,0.06)', border: wakeWordEnabled ? '1.5px solid rgba(56,189,248,0.4)' : '1.5px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', transition: 'border 0.2s' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: wakeWordEnabled ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)', border: wakeWordEnabled ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: wakeWordEnabled ? '#38bdf8' : '#64748b', flexShrink: 0, transition: 'all 0.2s' }}>
                <Radio size={22} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>"Hey Aether" Wake Word</div>
                <div style={{ color: '#64748b', fontSize: '0.76rem', lineHeight: '1.4' }}>
                  {wakeWordEnabled ? 'हैंड्स-फ्री वॉयस एक्टिवेशन चालू • बोलें "Hey Aether" या "हे ईथर"' : 'हैंड्स-फ्री वेक-वर्ड बंद (माइक बटन दबाना होगा)'}
                </div>
              </div>
            </div>
            <div
              className={`permission-toggle-switch ${wakeWordEnabled ? 'active' : ''}`}
              onClick={handleToggleWakeWord}
              role="button"
              tabIndex={0}
            >
              <div className="permission-toggle-thumb" />
            </div>
          </div>

          {/* 6: Background Cloud Sync */}
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1.5px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', flexShrink: 0 }}>
                <Sparkles size={22} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>Background Cloud Sync</div>
                <div style={{ color: '#64748b', fontSize: '0.76rem', lineHeight: '1.4' }}>Auto-sync every 8 min • Always on</div>
              </div>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '5px 12px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', whiteSpace: 'nowrap' }}>
              ● Active
            </span>
          </div>

        </div>

        {/* Privacy note */}
        <div style={{ marginTop: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '14px 16px', fontSize: '0.74rem', color: '#475569', lineHeight: '1.5', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔒</span>
          <span><b style={{ color: '#64748b' }}>Enterprise Privacy:</b> Microphone is processed locally in browser. No audio recordings stored. All data encrypted end-to-end.</span>
        </div>

      </div>
    </div>
  );
};

export default PermissionsModal;
