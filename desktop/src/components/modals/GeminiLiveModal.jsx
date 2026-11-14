import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, Sparkles, RefreshCw, Radio } from 'lucide-react';

export default function GeminiLiveModal({
  isOpen,
  onClose,
  apiBase,
  userEmail,
  selectedVoice = 'Kavya',
  selectedLang = 'hi',
  onNewMessage,
  isFriendMode = false
}) {
  const [sessionState, setSessionState] = useState('connecting'); // 'connecting' | 'listening' | 'thinking' | 'speaking'
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [activeLang, setActiveLang] = useState(selectedLang || 'hi');
  const [errorMsg, setErrorMsg] = useState(null);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isSessionActiveRef = useRef(false);

  // Setup / Teardown Voice Engine on Modal Open/Close
  useEffect(() => {
    if (!isOpen) {
      cleanupLiveSession();
      return;
    }

    isSessionActiveRef.current = true;
    setSessionState('connecting');
    setTranscript('');
    setAiResponse('नमस्ते! मैं सुन रहा हूँ, आप बिना रुके स्वाभाविक रूप से बात कर सकते हैं।');

    // Play greeting welcome chime or start mic
    setTimeout(() => {
      if (isSessionActiveRef.current) {
        startLiveListening();
      }
    }, 600);

    return () => {
      cleanupLiveSession();
    };
  }, [isOpen, activeLang]);

  const cleanupLiveSession = () => {
    isSessionActiveRef.current = false;
    isSpeakingRef.current = false;
    isListeningRef.current = false;
    clearTimeout(silenceTimerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
      } catch (e) {}
      audioPlayerRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  };

  // Start continuous listening
  const startLiveListening = () => {
    if (!isSessionActiveRef.current || isMuted) return;

    // If currently playing TTS, stop it immediately (Barge-In)
    if (audioPlayerRef.current) {
      try { audioPlayerRef.current.pause(); } catch (e) {}
      audioPlayerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    isSpeakingRef.current = false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg("Your device browser does not support Speech Recognition. Please use Chrome or Android app.");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    try {
      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = (activeLang === 'hi' || activeLang === 'hi_friend') ? 'hi-IN' : (activeLang === 'hinglish' ? 'en-IN' : 'en-US');

      rec.onstart = () => {
        isListeningRef.current = true;
        setSessionState('listening');
        setErrorMsg(null);
      };

      rec.onresult = (event) => {
        if (!isSessionActiveRef.current || isSpeakingRef.current) return;

        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            final += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        const combined = (final + interim).trim();
        setInterimTranscript(combined);

        // Barge-in check: If user starts speaking while AI was speaking, cut off AI
        if (isSpeakingRef.current && combined.length > 2) {
          if (audioPlayerRef.current) {
            try { audioPlayerRef.current.pause(); } catch (e) {}
          }
          isSpeakingRef.current = false;
        }

        // Automatic End-of-Speech / Silence Detection (1.2 seconds of silence dispatches prompt)
        clearTimeout(silenceTimerRef.current);
        if (combined.length > 1) {
          silenceTimerRef.current = setTimeout(() => {
            if (isSessionActiveRef.current && combined.trim()) {
              sendLivePrompt(combined.trim());
            }
          }, 1250);
        }
      };

      rec.onerror = (err) => {
        console.warn('[Gemini Live STT error]', err);
        if (err.error === 'not-allowed') {
          setErrorMsg('Microphone permission denied. Please allow microphone access in browser.');
          setSessionState('connecting');
        } else if (err.error !== 'no-speech') {
          // Restart listening on transient error if session active
          setTimeout(() => {
            if (isSessionActiveRef.current && !isSpeakingRef.current) {
              startLiveListening();
            }
          }, 500);
        }
      };

      rec.onend = () => {
        isListeningRef.current = false;
        // Keep listening alive in hands-free mode unless AI is currently speaking or muted
        if (isSessionActiveRef.current && !isSpeakingRef.current && !isMuted) {
          setTimeout(() => {
            if (isSessionActiveRef.current && !isSpeakingRef.current) {
              try { rec.start(); } catch (e) {}
            }
          }, 200);
        }
      };

      rec.start();
    } catch (err) {
      console.warn('[Live Mic start exception]', err);
    }
  };

  // Dispatch prompt to Aether Core with low-latency Voice Mode
  const sendLivePrompt = async (text) => {
    if (!text || !text.trim() || !isSessionActiveRef.current) return;

    clearTimeout(silenceTimerRef.current);
    setTranscript(text);
    setInterimTranscript('');
    setSessionState('thinking');

    // Pause mic temporarily while sending
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    try {
      const resp = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'X-User-Email': userEmail } : {})
        },
        body: JSON.stringify({
          prompt: text,
          user_email: userEmail,
          lang: activeLang,
          live_voice: true
        })
      });

      const data = await resp.json();
      if (!isSessionActiveRef.current) return;

      const aiText = data.response || data.content || "समझ गया।";
      setAiResponse(aiText);

      if (onNewMessage) {
        onNewMessage({
          id: `live-${Date.now()}`,
          role: 'user',
          content: text,
          created_at: new Date().toISOString()
        });
        onNewMessage({
          id: `live-ai-${Date.now()}`,
          role: 'assistant',
          content: aiText,
          action: data.action,
          actionData: data.data,
          created_at: new Date().toISOString()
        });
      }

      // Play AI Audio Response
      speakLiveResponse(aiText);
    } catch (err) {
      console.error('[Gemini Live Dispatch Error]', err);
      setSessionState('listening');
      startLiveListening();
    }
  };

  // Speak AI response via streaming TTS and auto-resume listening when done
  const speakLiveResponse = (text) => {
    if (!isSessionActiveRef.current) return;

    setSessionState('speaking');
    isSpeakingRef.current = true;

    // Clean markdown stars, hashtags, brackets from text for fluid speech
    const cleanSpeech = text
      .replace(/[*#_`~>]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(http.*?\)/g, '')
      .trim();

    const ttsUrl = `${apiBase}/tts?text=${encodeURIComponent(cleanSpeech.slice(0, 1500))}&voice=${selectedVoice}&lang=${activeLang}`;
    const audio = new Audio(ttsUrl);
    audioPlayerRef.current = audio;

    audio.onended = () => {
      isSpeakingRef.current = false;
      audioPlayerRef.current = null;
      if (isSessionActiveRef.current && !isMuted) {
        setSessionState('listening');
        startLiveListening();
      }
    };

    audio.onerror = () => {
      // Fallback to browser SpeechSynthesis if backend audio fails
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(cleanSpeech.slice(0, 500));
        u.lang = activeLang === 'hi' ? 'hi-IN' : 'en-IN';
        u.onend = () => {
          isSpeakingRef.current = false;
          if (isSessionActiveRef.current && !isMuted) {
            setSessionState('listening');
            startLiveListening();
          }
        };
        try { window.speechSynthesis.speak(u); } catch (e) {
          isSpeakingRef.current = false;
          startLiveListening();
        }
      } else {
        isSpeakingRef.current = false;
        startLiveListening();
      }
    };

    const playProm = audio.play();
    if (playProm !== undefined) {
      playProm.catch(() => {
        isSpeakingRef.current = false;
        startLiveListening();
      });
    }
  };

  // Handle User Interrupt / Tap Orb to Barge-In
  const handleInterruptOrTap = () => {
    if (sessionState === 'speaking') {
      if (audioPlayerRef.current) {
        try { audioPlayerRef.current.pause(); } catch (e) {}
        audioPlayerRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      isSpeakingRef.current = false;
      setSessionState('listening');
      startLiveListening();
    } else if (sessionState === 'listening') {
      if (interimTranscript.trim()) {
        sendLivePrompt(interimTranscript.trim());
      }
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      cleanupLiveSession();
      setSessionState('connecting');
    } else {
      isSessionActiveRef.current = true;
      startLiveListening();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'radial-gradient(circle at 50% 40%, #0d1a30 0%, #060b14 70%, #020408 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '24px 20px',
      overflow: 'hidden',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Top Bar: Title, Lang Switcher & Close */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: sessionState === 'listening' ? '#38bdf8' : (sessionState === 'speaking' ? '#10b981' : '#f59e0b'),
            boxShadow: `0 0 12px ${sessionState === 'listening' ? '#38bdf8' : (sessionState === 'speaking' ? '#10b981' : '#f59e0b')}`
          }} />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.04em', color: '#f8fafc' }}>
            GEMINI LIVE
          </span>
          <span style={{
            fontSize: '0.65rem',
            padding: '2px 7px',
            borderRadius: '9999px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontWeight: 600
          }}>
            DUPLEX
          </span>
        </div>

        {/* Language Pill Selector */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.06)', padding: '3px', borderRadius: '12px' }}>
          {[
            { id: 'hi', label: 'हिन्दी' },
            { id: 'hinglish', label: 'Hinglish' },
            { id: 'en', label: 'English' }
          ].map(l => (
            <button
              key={l.id}
              type="button"
              onClick={() => setActiveLang(l.id)}
              style={{
                background: activeLang === l.id ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                border: activeLang === l.id ? '1px solid rgba(56, 189, 248, 0.5)' : 'none',
                color: activeLang === l.id ? '#38bdf8' : '#94a3b8',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#cbd5e1',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Center: The Interactive Living Pulsing Orb */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        maxWidth: '500px',
        margin: '0 auto',
        width: '100%',
        textAlign: 'center'
      }}>
        {/* Glow Halo */}
        <div
          onClick={handleInterruptOrTap}
          style={{
            position: 'relative',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.4s ease'
          }}
        >
          {/* Animated Background Ripple Ring */}
          <div style={{
            position: 'absolute',
            inset: '-20px',
            borderRadius: '50%',
            background: sessionState === 'listening'
              ? 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(56, 189, 248, 0) 70%)'
              : (sessionState === 'speaking'
                ? 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(16, 185, 129, 0) 70%)'
                : 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(245, 158, 11, 0) 70%)'),
            animation: 'pulseRing 2.4s infinite ease-in-out'
          }} />

          {/* Core Orb */}
          <div style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: sessionState === 'listening'
              ? 'radial-gradient(circle at 35% 35%, #38bdf8, #0284c7 60%, #0369a1 100%)'
              : (sessionState === 'speaking'
                ? 'radial-gradient(circle at 35% 35%, #34d399, #10b981 60%, #047857 100%)'
                : 'radial-gradient(circle at 35% 35%, #fbbf24, #f59e0b 60%, #d97706 100%)'),
            boxShadow: sessionState === 'listening'
              ? '0 0 45px rgba(56, 189, 248, 0.65), inset 0 0 25px rgba(255, 255, 255, 0.4)'
              : (sessionState === 'speaking'
                ? '0 0 50px rgba(16, 185, 129, 0.65), inset 0 0 25px rgba(255, 255, 255, 0.4)'
                : '0 0 45px rgba(245, 158, 11, 0.65), inset 0 0 25px rgba(255, 255, 255, 0.4)'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
            transform: sessionState === 'listening' ? 'scale(1.05)' : 'scale(1.0)',
            transition: 'transform 0.3s ease'
          }}>
            {sessionState === 'listening' && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ width: '4px', height: '24px', background: '#fff', borderRadius: '4px', animation: 'waveBar 0.9s infinite ease-in-out 0.1s' }} />
                <span style={{ width: '4px', height: '40px', background: '#fff', borderRadius: '4px', animation: 'waveBar 0.9s infinite ease-in-out 0.25s' }} />
                <span style={{ width: '4px', height: '20px', background: '#fff', borderRadius: '4px', animation: 'waveBar 0.9s infinite ease-in-out 0.4s' }} />
              </div>
            )}
            {sessionState === 'speaking' && (
              <Volume2 size={44} color="#ffffff" style={{ animation: 'bounceSlow 1.5s infinite' }} />
            )}
            {sessionState === 'thinking' && (
              <RefreshCw size={36} color="#ffffff" style={{ animation: 'spin 1.2s linear infinite' }} />
            )}
            {sessionState === 'connecting' && (
              <Radio size={36} color="#ffffff" />
            )}
          </div>
        </div>

        {/* State Label & Subtitle */}
        <div style={{ marginTop: '28px', minHeight: '80px', padding: '0 10px' }}>
          <div style={{
            fontSize: '0.86rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: sessionState === 'listening' ? '#38bdf8' : (sessionState === 'speaking' ? '#34d399' : '#fbbf24')
          }}>
            {sessionState === 'listening' && "Aether is Listening... Speak freely"}
            {sessionState === 'speaking' && "Aether is Speaking • Tap orb to interrupt"}
            {sessionState === 'thinking' && "Thinking & reasoning..."}
            {sessionState === 'connecting' && "Connecting Hands-Free Mode..."}
          </div>

          {/* Real-time Subtitle / Transcript */}
          <div style={{
            fontSize: '1.02rem',
            lineHeight: '1.5',
            color: '#f8fafc',
            marginTop: '10px',
            fontWeight: 500,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            {interimTranscript ? `"${interimTranscript}"` : (sessionState === 'speaking' ? aiResponse : (transcript ? `"${transcript}"` : "जैसे: 'आज के एजेंडा में क्या है?' या 'अंकित को ₹200 भेजो'"))}
          </div>
        </div>

        {errorMsg && (
          <div style={{
            marginTop: '12px',
            padding: '8px 14px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            fontSize: '0.8rem'
          }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
        paddingBottom: '10px'
      }}>
        {/* Mute Button */}
        <button
          type="button"
          onClick={toggleMute}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.09)',
            border: isMuted ? '1.5px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.15)',
            color: isMuted ? '#f87171' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {/* End Call / Close Live Session */}
        <button
          type="button"
          onClick={onClose}
          title="End Live Voice Session"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(239, 68, 68, 0.45)',
            transition: 'all 0.15s ease'
          }}
        >
          <X size={26} strokeWidth={2.6} />
        </button>
      </div>

      {/* Styles for animations */}
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.22); opacity: 0.2; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        @keyframes waveBar {
          0%, 100% { height: 16px; }
          50% { height: 38px; }
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        @keyframes bounceSlow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
}
