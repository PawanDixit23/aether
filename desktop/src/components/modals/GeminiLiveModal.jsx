import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, Sparkles, RefreshCw, Send, PhoneOff } from 'lucide-react';

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
  const mediaStreamRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isSessionActiveRef = useRef(false);
  const latestSpokenRef = useRef('');
  const isDispatchingRef = useRef(false);

  // Stop any active audio playback
  const stopAudioPlayback = () => {
    isSpeakingRef.current = false;
    if (audioPlayerRef.current) {
      try { audioPlayerRef.current.pause(); } catch (e) {}
      audioPlayerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  };

  // Setup / Teardown Voice Engine on Modal Open/Close
  useEffect(() => {
    if (!isOpen) {
      cleanupLiveSession();
      return;
    }

    isSessionActiveRef.current = true;
    setSessionState('connecting');
    setTranscript('');
    setInterimTranscript('');
    setAiResponse('नमस्ते! Aether Live तैयार है। आप जो भी पूछना चाहते हैं, सीधे बोलें।');

    // Request native mic permission and initialize
    initMicAndListen();

    return () => {
      cleanupLiveSession();
    };
  }, [isOpen, activeLang]);

  const initMicAndListen = async () => {
    // 1. Request permission from mobile WebView bridge if available
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_MIC_PERMISSION' }));
      } catch (e) {}
    }

    // 2. Request browser getUserMedia to unlock audio stream on mobile Chrome/WebView
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }
    } catch (streamErr) {
      console.warn('[Gemini Live getUserMedia notice]:', streamErr);
    }

    if (isSessionActiveRef.current && !isMuted) {
      setTimeout(() => {
        startLiveListening();
      }, 300);
    }
  };

  const cleanupLiveSession = () => {
    isSessionActiveRef.current = false;
    isSpeakingRef.current = false;
    isListeningRef.current = false;
    isDispatchingRef.current = false;
    latestSpokenRef.current = '';
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

    stopAudioPlayback();

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      mediaStreamRef.current = null;
    }
  };

  // Start continuous listening
  const startLiveListening = () => {
    if (!isSessionActiveRef.current || isMuted) return;

    stopAudioPlayback();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg("Your browser does not support Speech Recognition. Please use Chrome or Android app.");
      setSessionState('connecting');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }

    try {
      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = (activeLang === 'hi' || activeLang === 'hi_friend') ? 'hi-IN' : (activeLang === 'hinglish' ? 'en-IN' : 'en-US');

      rec.onstart = () => {
        if (!isSessionActiveRef.current) return;
        isListeningRef.current = true;
        setSessionState('listening');
        setErrorMsg(null);
      };

      // Loop proven in App.jsx across all Android WebViews
      rec.onresult = (event) => {
        if (!isSessionActiveRef.current || isDispatchingRef.current) return;

        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i] && event.results[i][0]) {
            currentText += ' ' + event.results[i][0].transcript;
          }
        }
        currentText = currentText.trim();

        if (currentText) {
          setInterimTranscript(currentText);
          latestSpokenRef.current = currentText;

          // Barge-in check: If AI is talking and user speaks, stop AI immediately
          if (isSpeakingRef.current) {
            stopAudioPlayback();
            setSessionState('listening');
          }

          // Smart dynamic silence detection
          clearTimeout(silenceTimerRef.current);
          const lastRes = event.results[event.results.length - 1];
          const isFinal = Boolean(lastRes && lastRes.isFinal);
          const debounceDelay = isFinal ? 800 : 1300;

          silenceTimerRef.current = setTimeout(() => {
            if (isSessionActiveRef.current && latestSpokenRef.current.trim() && !isDispatchingRef.current) {
              const textToSend = latestSpokenRef.current.trim();
              latestSpokenRef.current = '';
              sendLivePrompt(textToSend);
            }
          }, debounceDelay);
        }
      };

      rec.onerror = (err) => {
        console.warn('[Gemini Live STT error notice]', err);
        if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
          setErrorMsg('Microphone permission required. Please allow microphone in settings.');
          setSessionState('connecting');
        } else if (err.error === 'no-speech') {
          // Normal silence, keep listening alive
        } else {
          // Transient error: auto restart after slight delay
          setTimeout(() => {
            if (isSessionActiveRef.current && !isSpeakingRef.current && !isMuted && !isDispatchingRef.current) {
              try { rec.start(); } catch (e) {}
            }
          }, 400);
        }
      };

      rec.onend = () => {
        isListeningRef.current = false;
        clearTimeout(silenceTimerRef.current);

        // If user finished speaking and speech was recognized before onend fired
        if (isSessionActiveRef.current && latestSpokenRef.current.trim() && !isDispatchingRef.current) {
          const textToSend = latestSpokenRef.current.trim();
          latestSpokenRef.current = '';
          sendLivePrompt(textToSend);
          return;
        }

        // Keep hands-free listening alive unless AI is currently speaking or user muted
        if (isSessionActiveRef.current && !isSpeakingRef.current && !isMuted && !isDispatchingRef.current) {
          setTimeout(() => {
            if (isSessionActiveRef.current && !isSpeakingRef.current && !isMuted && !isDispatchingRef.current) {
              try { rec.start(); } catch (e) {}
            }
          }, 250);
        }
      };

      rec.start();
    } catch (err) {
      console.warn('[Live Mic start exception]', err);
    }
  };

  // Dispatch prompt to Aether Core with low-latency Voice Mode
  const sendLivePrompt = async (text) => {
    if (!text || !text.trim() || !isSessionActiveRef.current || isDispatchingRef.current) return;

    isDispatchingRef.current = true;
    clearTimeout(silenceTimerRef.current);
    const cleanPrompt = text.trim();
    setTranscript(cleanPrompt);
    setInterimTranscript('');
    setSessionState('thinking');

    // Pause STT while awaiting response
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    try {
      let data = null;
      try {
        const resp = await fetch(`${apiBase || '/api'}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userEmail ? { 'X-User-Email': userEmail } : {})
          },
          body: JSON.stringify({
            prompt: cleanPrompt,
            user_email: userEmail,
            lang: activeLang,
            live_voice: true
          })
        });
        if (resp.ok) {
          data = await resp.json();
        }
      } catch (e) {
        console.warn('Live chat primary endpoint error, trying fallback', e);
      }

      if (!data) {
        const respFallback = await fetch(`${apiBase || '/api'}/action/quick-capture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userEmail ? { 'X-User-Email': userEmail } : {})
          },
          body: JSON.stringify({
            input_text: cleanPrompt,
            user_email: userEmail,
            language: activeLang
          })
        });
        if (respFallback.ok) {
          data = await respFallback.json();
        }
      }

      if (!isSessionActiveRef.current) {
        isDispatchingRef.current = false;
        return;
      }

      const aiText = data?.response || data?.message || data?.content || "समझ गया।";
      setAiResponse(aiText);

      if (onNewMessage) {
        onNewMessage({
          id: `live-${Date.now()}`,
          role: 'user',
          content: cleanPrompt,
          created_at: new Date().toISOString()
        });
        onNewMessage({
          id: `live-ai-${Date.now()}`,
          role: 'assistant',
          content: aiText,
          action: data?.action,
          actionData: data?.data,
          created_at: new Date().toISOString()
        });
      }

      // Speak AI Audio Response
      speakLiveResponse(aiText);
    } catch (err) {
      console.error('[Gemini Live Dispatch Error]', err);
      isDispatchingRef.current = false;
      latestSpokenRef.current = '';
      setAiResponse("नमस्ते! मैं सुन रहा हूँ, कृपया दोबारा बोलें।");
      speakLiveResponse("नमस्ते! मैं सुन रहा हूँ, कृपया दोबारा बोलें।");
    }
  };

  // Speak AI response via streaming TTS and auto-resume listening when done
  const speakLiveResponse = (text) => {
    if (!isSessionActiveRef.current) {
      isDispatchingRef.current = false;
      return;
    }

    setSessionState('speaking');
    isSpeakingRef.current = true;

    // Clean markdown characters for spoken audio
    const cleanSpeech = text
      .replace(/[*#_`~>]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(http.*?\)/g, '')
      .trim();

    const ttsUrl = `${apiBase || '/api'}/tts?text=${encodeURIComponent(cleanSpeech.slice(0, 1500))}&voice=${selectedVoice}&lang=${activeLang}`;
    const audio = new Audio(ttsUrl);
    audioPlayerRef.current = audio;

    const onAudioPlaybackDone = () => {
      isSpeakingRef.current = false;
      isDispatchingRef.current = false;
      latestSpokenRef.current = '';
      audioPlayerRef.current = null;
      if (isSessionActiveRef.current && !isMuted) {
        setSessionState('listening');
        startLiveListening();
      }
    };

    audio.onended = onAudioPlaybackDone;

    audio.onerror = () => {
      // Fallback to browser SpeechSynthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(cleanSpeech.slice(0, 500));
        u.lang = activeLang === 'hi' ? 'hi-IN' : 'en-IN';
        u.onend = onAudioPlaybackDone;
        u.onerror = onAudioPlaybackDone;
        try {
          window.speechSynthesis.speak(u);
        } catch (e) {
          onAudioPlaybackDone();
        }
      } else {
        onAudioPlaybackDone();
      }
    };

    const playProm = audio.play();
    if (playProm !== undefined) {
      playProm.catch(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(cleanSpeech.slice(0, 500));
          u.lang = activeLang === 'hi' ? 'hi-IN' : 'en-IN';
          u.onend = onAudioPlaybackDone;
          u.onerror = onAudioPlaybackDone;
          try {
            window.speechSynthesis.speak(u);
          } catch (e) {
            onAudioPlaybackDone();
          }
        } else {
          onAudioPlaybackDone();
        }
      });
    }
  };

  // Handle User Interrupt / Tap Orb to Barge-In or Send Now
  const handleOrbTap = () => {
    if (sessionState === 'speaking') {
      stopAudioPlayback();
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
      zIndex: 99999,
      background: 'radial-gradient(circle at 50% 35%, #0a192f 0%, #050b14 65%, #020408 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      color: '#ffffff',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '0 20px 24px 20px',
      paddingTop: 'max(env(safe-area-inset-top, 56px), 56px)',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* ── Top Header Bar (Safe Notch & Status Bar Clearance) ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '540px',
        margin: '0 auto',
        flexShrink: 0
      }}>
        {/* Row 1: Live Badge & Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: sessionState === 'listening' ? '#38bdf8' : (sessionState === 'speaking' ? '#10b981' : '#f59e0b'),
                boxShadow: `0 0 10px ${sessionState === 'listening' ? '#38bdf8' : (sessionState === 'speaking' ? '#10b981' : '#f59e0b')}`
              }} />
              <span style={{ fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.04em', color: '#f8fafc' }}>
                AETHER LIVE
              </span>
            </div>
            <span style={{
              fontSize: '0.64rem',
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              fontWeight: 600
            }}>
              DUPLEX
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cbd5e1',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Row 2: Centered Language Switcher */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.06)',
          padding: '4px',
          borderRadius: '14px',
          width: 'fit-content',
          margin: '0 auto'
        }}>
          {[
            { id: 'hi', label: '🇮🇳 हिन्दी' },
            { id: 'hinglish', label: '✨ Hinglish' },
            { id: 'en', label: '🇬🇧 English' }
          ].map(l => (
            <button
              key={l.id}
              type="button"
              onClick={() => setActiveLang(l.id)}
              style={{
                background: activeLang === l.id ? 'rgba(56, 189, 248, 0.28)' : 'transparent',
                border: activeLang === l.id ? '1px solid rgba(56, 189, 248, 0.55)' : 'none',
                color: activeLang === l.id ? '#38bdf8' : '#94a3b8',
                borderRadius: '10px',
                padding: '5px 12px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Center Stage: The Living Animated Orb ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        maxWidth: '480px',
        margin: '0 auto',
        width: '100%',
        textAlign: 'center',
        padding: '10px 0'
      }}>
        {/* Animated Orb Container */}
        <div
          onClick={handleOrbTap}
          title={sessionState === 'speaking' ? "Tap to interrupt" : "Tap to send immediately"}
          style={{
            position: 'relative',
            width: '190px',
            height: '190px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none'
          }}
        >
          {/* Outer Breathing Wave Ring 1 */}
          <div style={{
            position: 'absolute',
            inset: '-22px',
            borderRadius: '50%',
            background: sessionState === 'listening'
              ? 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(56, 189, 248, 0) 70%)'
              : (sessionState === 'speaking'
                ? 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(16, 185, 129, 0) 70%)'
                : 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(245, 158, 11, 0) 70%)'),
            animation: 'liveRipple 2.2s infinite ease-in-out'
          }} />

          {/* Outer Breathing Wave Ring 2 */}
          <div style={{
            position: 'absolute',
            inset: '-8px',
            borderRadius: '50%',
            background: sessionState === 'listening'
              ? 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0) 75%)'
              : (sessionState === 'speaking'
                ? 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0) 75%)'
                : 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0) 75%)'),
            animation: 'liveRipple 1.6s infinite ease-in-out 0.4s'
          }} />

          {/* Core Living Glowing Sphere */}
          <div style={{
            width: '146px',
            height: '146px',
            borderRadius: '50%',
            background: sessionState === 'listening'
              ? 'radial-gradient(circle at 35% 30%, #38bdf8 0%, #0284c7 50%, #0369a1 100%)'
              : (sessionState === 'speaking'
                ? 'radial-gradient(circle at 35% 30%, #34d399 0%, #10b981 50%, #047857 100%)'
                : 'radial-gradient(circle at 35% 30%, #fbbf24 0%, #f59e0b 50%, #d97706 100%)'),
            boxShadow: sessionState === 'listening'
              ? '0 0 50px rgba(56, 189, 248, 0.7), inset 0 0 30px rgba(255, 255, 255, 0.5)'
              : (sessionState === 'speaking'
                ? '0 0 50px rgba(16, 185, 129, 0.7), inset 0 0 30px rgba(255, 255, 255, 0.5)'
                : '0 0 50px rgba(245, 158, 11, 0.7), inset 0 0 30px rgba(255, 255, 255, 0.5)'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 3,
            animation: 'orbBreath 3s infinite ease-in-out'
          }}>
            {sessionState === 'listening' && (
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <span style={{ width: '4px', height: '18px', background: '#ffffff', borderRadius: '4px', animation: 'liveBar 0.8s infinite ease-in-out 0.1s' }} />
                <span style={{ width: '4px', height: '34px', background: '#ffffff', borderRadius: '4px', animation: 'liveBar 0.8s infinite ease-in-out 0.25s' }} />
                <span style={{ width: '4px', height: '46px', background: '#ffffff', borderRadius: '4px', animation: 'liveBar 0.8s infinite ease-in-out 0.4s' }} />
                <span style={{ width: '4px', height: '26px', background: '#ffffff', borderRadius: '4px', animation: 'liveBar 0.8s infinite ease-in-out 0.15s' }} />
              </div>
            )}
            {sessionState === 'speaking' && (
              <Volume2 size={46} color="#ffffff" style={{ animation: 'livePulse 1.2s infinite' }} />
            )}
            {sessionState === 'thinking' && (
              <RefreshCw size={40} color="#ffffff" style={{ animation: 'liveSpin 1s linear infinite' }} />
            )}
            {sessionState === 'connecting' && (
              <Mic size={40} color="#ffffff" />
            )}
          </div>
        </div>

        {/* State Label */}
        <div style={{
          marginTop: '22px',
          fontSize: '0.82rem',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: sessionState === 'listening' ? '#38bdf8' : (sessionState === 'speaking' ? '#34d399' : '#fbbf24')
        }}>
          {sessionState === 'listening' && "● LISTENING... SPEAK FREELY"}
          {sessionState === 'speaking' && "● SPEAKING • TAP ORB TO INTERRUPT"}
          {sessionState === 'thinking' && "● REASONING RESPONSE..."}
          {sessionState === 'connecting' && "● CONNECTING MIC..."}
        </div>

        {/* Real-time Subtitle / Dialogue Card */}
        <div style={{
          marginTop: '14px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '14px 18px',
          width: '100%',
          boxSizing: 'border-box',
          minHeight: '80px',
          maxHeight: '130px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            fontSize: '0.98rem',
            lineHeight: '1.5',
            color: '#f8fafc',
            fontWeight: 500
          }}>
            {interimTranscript
              ? `"${interimTranscript}"`
              : (sessionState === 'speaking'
                  ? aiResponse
                  : (transcript
                      ? `"${transcript}"`
                      : "उदाहरण: 'आज के एजेंडा में क्या है?' या 'रोहित को ₹500 भेजो'"))}
          </div>
        </div>

        {errorMsg && (
          <div style={{
            marginTop: '12px',
            padding: '8px 14px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.18)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            fontSize: '0.78rem'
          }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* ── Bottom Action Controls ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '28px',
        width: '100%',
        maxWidth: '360px',
        margin: '0 auto',
        paddingBottom: '8px',
        flexShrink: 0
      }}>
        {/* Mute Mic Toggle */}
        <button
          type="button"
          onClick={toggleMute}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
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

        {/* Big Red Disconnect / End Call Button */}
        <button
          type="button"
          onClick={onClose}
          title="End Live Voice Session"
          style={{
            width: '66px',
            height: '66px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(239, 68, 68, 0.5)',
            transition: 'all 0.15s ease'
          }}
        >
          <PhoneOff size={26} strokeWidth={2.4} />
        </button>
      </div>

      {/* Modern High-Performance Keyframe Animations */}
      <style>{`
        @keyframes liveRipple {
          0% { transform: scale(0.92); opacity: 0.6; }
          50% { transform: scale(1.18); opacity: 0.15; }
          100% { transform: scale(0.92); opacity: 0.6; }
        }
        @keyframes orbBreath {
          0%, 100% { transform: scale(1.0); }
          50% { transform: scale(1.06); }
        }
        @keyframes liveBar {
          0%, 100% { height: 16px; }
          50% { height: 42px; }
        }
        @keyframes liveSpin {
          100% { transform: rotate(360deg); }
        }
        @keyframes livePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.14); }
        }
      `}</style>
    </div>
  );
}
