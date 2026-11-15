import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, Sparkles, RefreshCw, PhoneOff, Radio, Square, ArrowDown } from 'lucide-react';
import { FormattedMessage } from '../chat/FormattedMessage';

// Strip all emojis and pictographs so TTS voice never pronounces emoji names
const stripEmojis = (str) => {
  if (!str) return '';
  return str
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const thinkingPhasesHi = [
  { emoji: '🧠', text: 'आपके सवाल पर विचार कर रहा हूँ...' },
  { emoji: '🔍', text: 'ज्ञान व मेमोरी में खोज रहा हूँ...' },
  { emoji: '⚡', text: 'मुख्य बिंदुओं का विश्लेषण जारी है...' },
  { emoji: '✍️', text: 'उत्तर तैयार कर रहा हूँ...' },
  { emoji: '✨', text: 'सटीक उत्तर अंतिम रूप में...' },
  { emoji: '💡', text: 'बस कुछ ही पलों में...' }
];

const thinkingPhasesEn = [
  { emoji: '🧠', text: 'Thinking through your request...' },
  { emoji: '🔍', text: 'Searching knowledge & memory...' },
  { emoji: '⚡', text: 'Synthesizing key insights...' },
  { emoji: '📊', text: 'Analyzing context & details...' },
  { emoji: '✍️', text: 'Composing response...' },
  { emoji: '✨', text: 'Polishing final answer...' },
  { emoji: '💡', text: 'Almost ready...' }
];

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
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [isStreamingText, setIsStreamingText] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeLang, setActiveLang] = useState(selectedLang || 'hi');
  const [errorMsg, setErrorMsg] = useState(null);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 640 : false));
  const [thinkingPhaseIndex, setThinkingPhaseIndex] = useState(0);
  const [thinkingElapsed, setThinkingElapsed] = useState(0);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isSessionActiveRef = useRef(false);
  const latestSpokenRef = useRef('');
  const isDispatchingRef = useRef(false);
  const isMutedRef = useRef(false);
  const typewriterTimerRef = useRef(null);
  const transcriptBoxRef = useRef(null);
  const userScrolledUpRef = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dynamic live thinking phase rotation (synced with Claude/Gemini dynamic status)
  useEffect(() => {
    if (sessionState !== 'thinking') {
      setThinkingPhaseIndex(0);
      setThinkingElapsed(0);
      return;
    }

    const startTime = Date.now();
    setThinkingPhaseIndex(0);
    setThinkingElapsed(0);

    const elapsedTimer = setInterval(() => {
      setThinkingElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const phaseTimer = setInterval(() => {
      setThinkingPhaseIndex((prev) => prev + 1);
    }, 1800);

    return () => {
      clearInterval(elapsedTimer);
      clearInterval(phaseTimer);
    };
  }, [sessionState]);

  const isHiLang = (activeLang === 'hi' || activeLang === 'hi_friend');
  const phases = isHiLang ? thinkingPhasesHi : thinkingPhasesEn;
  const currentThinking = phases[thinkingPhaseIndex % phases.length];

  // Stop any active audio playback and immediately release dispatch lock
  const stopAudioPlayback = () => {
    isSpeakingRef.current = false;
    isDispatchingRef.current = false;
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    setIsStreamingText(false);
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.onended = null;
        audioPlayerRef.current.onerror = null;
        audioPlayerRef.current.pause();
      } catch (e) {}
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
    isMutedRef.current = false;
    setIsMuted(false);
    setSessionState('connecting');
    setTranscript('');
    setInterimTranscript('');
    setAiResponse('नमस्ते! Aether Talk तैयार है। आप जो भी पूछना चाहते हैं, सीधे बोलें।');

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
        // CRITICAL for Android: Release audio tracks immediately so hardware mic is NOT held locked
        // when SpeechRecognition starts recording!
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (streamErr) {
      console.warn('[Gemini Live getUserMedia notice]:', streamErr);
    }

    if (isSessionActiveRef.current && !isMutedRef.current) {
      setTimeout(() => {
        startLiveListening();
      }, 150);
    }
  };

  // Dynamic Curated Streaming / Typewriter Effect for Live Talk
  const startCuratedStreamingText = (fullText) => {
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    userScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);

    if (!fullText) {
      setDisplayedResponse('');
      setIsStreamingText(false);
      return;
    }

    setIsStreamingText(true);
    const tokens = fullText.split(/(\s+)/);
    let currentIdx = 0;
    setDisplayedResponse('');

    const tokenInterval = Math.max(16, Math.min(42, Math.floor(2200 / Math.max(tokens.length, 1))));

    typewriterTimerRef.current = setInterval(() => {
      currentIdx += 2;
      if (currentIdx >= tokens.length) {
        clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
        setDisplayedResponse(fullText);
        setIsStreamingText(false);
      } else {
        const partial = tokens.slice(0, currentIdx).join('');
        setDisplayedResponse(partial);
      }

      if (transcriptBoxRef.current && !userScrolledUpRef.current) {
        transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
      }
    }, tokenInterval);
  };

  const handleTranscriptScroll = () => {
    if (!transcriptBoxRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = transcriptBoxRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 35;
    userScrolledUpRef.current = !isAtBottom;
    setShowScrollBottomBtn(!isAtBottom);
  };

  const scrollToTranscriptBottom = () => {
    if (!transcriptBoxRef.current) return;
    userScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    transcriptBoxRef.current.scrollTo({
      top: transcriptBoxRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  const cleanupLiveSession = () => {
    isSessionActiveRef.current = false;
    isSpeakingRef.current = false;
    isListeningRef.current = false;
    isDispatchingRef.current = false;
    isMutedRef.current = false;
    setIsMuted(false);
    latestSpokenRef.current = '';
    clearTimeout(silenceTimerRef.current);
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    setIsStreamingText(false);
    setDisplayedResponse('');
    userScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);

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
  };

  // Start continuous listening with mobile-safe SpeechRecognition loop
  const startLiveListening = () => {
    if (!isSessionActiveRef.current || isMutedRef.current) return;

    stopAudioPlayback();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg("Your browser does not support Speech Recognition. Please use Chrome or Android app.");
      setSessionState('connecting');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
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

          // Barge-in: If AI is currently speaking and user speaks, stop AI immediately
          if (isSpeakingRef.current) {
            stopAudioPlayback();
            setSessionState('listening');
          }

          // Smart dynamic silence detection
          clearTimeout(silenceTimerRef.current);
          const lastRes = event.results[event.results.length - 1];
          const isFinal = Boolean(lastRes && lastRes.isFinal);
          const debounceDelay = isFinal ? 750 : 1200;

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
            if (isSessionActiveRef.current && !isSpeakingRef.current && !isMutedRef.current && !isDispatchingRef.current) {
              try { rec.start(); } catch (e) {}
            }
          }, 350);
        }
      };

      rec.onend = () => {
        isListeningRef.current = false;
        clearTimeout(silenceTimerRef.current);

        // If user finished speaking and speech was recognized before onend fired
        if (isSessionActiveRef.current && latestSpokenRef.current.trim() && !isDispatchingRef.current && !isMutedRef.current) {
          const textToSend = latestSpokenRef.current.trim();
          latestSpokenRef.current = '';
          sendLivePrompt(textToSend);
          return;
        }

        // Keep hands-free listening alive unless AI is currently speaking, user muted, or dispatching
        if (isSessionActiveRef.current && !isSpeakingRef.current && !isMutedRef.current && !isDispatchingRef.current) {
          setTimeout(() => {
            if (isSessionActiveRef.current && !isSpeakingRef.current && !isMutedRef.current && !isDispatchingRef.current) {
              try { rec.start(); } catch (e) {}
            }
          }, 200);
        }
      };

      // Slight safety delay before starting recognition so browser audio pipelines detach cleanly
      setTimeout(() => {
        if (isSessionActiveRef.current && !isSpeakingRef.current && !isMutedRef.current) {
          try {
            rec.start();
          } catch (err) {
            console.warn('[rec.start exception]', err);
          }
        }
      }, 50);
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
      const cleanBase = (apiBase || '').replace(/\/+$/, '');
      const chatEndpoint = cleanBase.endsWith('/api') ? `${cleanBase}/chat` : (cleanBase ? `${cleanBase}/api/chat` : '/api/chat');
      const fallbackEndpoint = cleanBase.endsWith('/api') ? `${cleanBase}/action/quick-capture` : (cleanBase ? `${cleanBase}/api/action/quick-capture` : '/api/action/quick-capture');

      // Automatic Language Detection (Hindi, English, or Hinglish based on user's query)
      const isDevanagari = /[\u0900-\u097F]/.test(cleanPrompt);
      const isHinglish = /\b(kya|kyu|kyun|kaise|kaisa|kaisi|kab|kahan|kitna|kitne|kitni|kaun|konsa|mera|meri|mere|tum|tumhara|tumhari|aap|aapka|aapki|hum|hamara|mujhe|tujhe|batao|bata|bataiye|karo|kar|kariye|bhejo|bhej|sun|suno|sunao|pa|raha|rahe|rahi|hai|hain|hoon|hun|ho|tha|the|thi|nahi|nahin|mat|bahut|accha|achha|aaj|kal|idhar|udhar|yahan|wahan|paise|kharch|chahiye|madad|bhai|yaar|dhanyavad)\b/i.test(cleanPrompt);
      const autoLang = isDevanagari ? 'hi' : (isHinglish ? 'hinglish' : 'en');

      let data = null;
      try {
        const resp = await fetch(chatEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userEmail ? { 'X-User-Email': userEmail } : {})
          },
          body: JSON.stringify({
            prompt: cleanPrompt,
            user_email: userEmail,
            lang: autoLang,
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
        const respFallback = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userEmail ? { 'X-User-Email': userEmail } : {})
          },
          body: JSON.stringify({
            input_text: cleanPrompt,
            user_email: userEmail,
            language: autoLang
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
      startCuratedStreamingText(aiText);

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

      // Speak AI Audio Response with matching language voice
      speakLiveResponse(aiText);
    } catch (err) {
      console.error('[Gemini Live Dispatch Error]', err);
      isDispatchingRef.current = false;
      latestSpokenRef.current = '';
      const fallbackText = "नमस्ते! मैं सुन रहा हूँ, कृपया दोबारा बोलें।";
      setAiResponse(fallbackText);
      startCuratedStreamingText(fallbackText);
      speakLiveResponse(fallbackText);
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

    // Clean markdown characters and EMOJIS for spoken audio so no emoji names are spoken
    const cleanSpeech = stripEmojis(
      text
        .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/[*#_`~>|]/g, '')
    );

    // Natural Voice selection: Hindi for Devanagari text, English/natural otherwise
    const isDevanagari = /[\u0900-\u097F]/.test(cleanSpeech);
    const speechLang = isDevanagari ? 'hi' : 'en';

    const cleanBase = (apiBase || '').replace(/\/+$/, '');
    const ttsEndpoint = cleanBase.endsWith('/api') ? `${cleanBase}/tts` : (cleanBase ? `${cleanBase}/api/tts` : '/api/tts');
    const ttsUrl = `${ttsEndpoint}?text=${encodeURIComponent(cleanSpeech.slice(0, 1500))}&voice=${selectedVoice}&lang=${speechLang}`;

    const onAudioPlaybackDone = () => {
      isSpeakingRef.current = false;
      isDispatchingRef.current = false;
      latestSpokenRef.current = '';
      audioPlayerRef.current = null;
      if (isSessionActiveRef.current && !isMutedRef.current) {
        setSessionState('listening');
        startLiveListening();
      }
    };

    try {
      const audio = new Audio(ttsUrl);
      audio.volume = 1.0;
      audioPlayerRef.current = audio;
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
    } catch (e) {
      onAudioPlaybackDone();
    }
  };

  // Handle User Interrupt / Tap Orb to Barge-In or Send Now
  const handleOrbTap = () => {
    if (isMutedRef.current || isMuted || sessionState === 'muted') {
      toggleMute();
      return;
    }
    if (sessionState === 'speaking' || isSpeakingRef.current) {
      stopAudioPlayback();
      clearTimeout(silenceTimerRef.current);
      latestSpokenRef.current = '';
      setInterimTranscript('');
      setSessionState('listening');
      startLiveListening();
    } else if (sessionState === 'listening') {
      const textToSend = (interimTranscript || latestSpokenRef.current || '').trim();
      if (textToSend) {
        clearTimeout(silenceTimerRef.current);
        latestSpokenRef.current = '';
        setInterimTranscript('');
        sendLivePrompt(textToSend);
      }
    } else if (sessionState === 'thinking') {
      stopAudioPlayback();
      clearTimeout(silenceTimerRef.current);
      latestSpokenRef.current = '';
      setInterimTranscript('');
      setSessionState('listening');
      startLiveListening();
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMutedRef.current;
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);

    if (nextMuted) {
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
      setSessionState('muted');
    } else {
      isSessionActiveRef.current = true;
      setSessionState('listening');
      startLiveListening();
    }
  };

  if (!isOpen) return null;

  // Dynamic Theme Colors based on Live Session State (Stable & Non-flickering)
  const themeGradients = {
    listening: {
      primary: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.45)',
      ring: 'rgba(56, 189, 248, 0.28)',
      statusText: 'Listening... Speak freely',
      statusColor: '#38bdf8'
    },
    thinking: {
      primary: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.45)',
      ring: 'rgba(245, 158, 11, 0.28)',
      statusText: 'Thinking...',
      statusColor: '#fbbf24'
    },
    speaking: {
      primary: '#34d399',
      glow: 'rgba(52, 211, 153, 0.5)',
      ring: 'rgba(52, 211, 153, 0.28)',
      statusText: 'Speaking • Tap orb to interrupt',
      statusColor: '#34d399'
    },
    muted: {
      primary: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.45)',
      ring: 'rgba(239, 68, 68, 0.25)',
      statusText: 'Microphone Muted • Tap to unmute',
      statusColor: '#f87171'
    },
    connecting: {
      primary: '#94a3b8',
      glow: 'rgba(148, 163, 184, 0.25)',
      ring: 'rgba(148, 163, 184, 0.18)',
      statusText: 'Connecting microphone...',
      statusColor: '#94a3b8'
    }
  };

  const currentTheme = (isMuted || sessionState === 'muted')
    ? themeGradients.muted
    : (themeGradients[sessionState] || themeGradients.listening);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      backgroundColor: '#030712',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      padding: '0 20px 28px 20px',
      paddingTop: 'max(env(safe-area-inset-top, 48px), 48px)',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Smooth Ambient Aura behind Orb (Zero screen flickering) */}
      <div style={{
        position: 'absolute',
        top: '38%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '440px',
        height: '440px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${currentTheme.glow} 0%, rgba(3, 7, 18, 0) 70%)`,
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* ── Top Header Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        padding: '6px 0',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10
      }}>
        {/* Left: Spacer to center Title */}
        <div style={{ width: '40px', height: '40px' }} />

        {/* Center: AETHER LIVE Title Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '999px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: currentTheme.primary,
            boxShadow: `0 0 10px ${currentTheme.primary}`,
            transition: 'background 0.3s ease'
          }} />
          <span style={{ fontWeight: 800, fontSize: '0.84rem', letterSpacing: '0.04em', color: '#f8fafc' }}>
            AETHER LIVE
          </span>
        </div>

        {/* Right: Close (✕) Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#cbd5e1',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.15s ease'
          }}
          title="Close Live"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Center Stage: Bioluminescent Living Fluid Orb ── */}
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
        padding: '10px 0',
        position: 'relative'
      }}>
        {/* Living Multi-layered Orb */}
        <div
          onClick={handleOrbTap}
          title={isMuted ? "Tap to unmute" : (sessionState === 'speaking' ? "Tap to interrupt" : "Tap to send immediately")}
          style={{
            position: 'relative',
            width: '210px',
            height: '210px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            margin: '0 auto'
          }}
        >
          {/* Ripple Wave 1 */}
          <div style={{
            position: 'absolute',
            inset: '-28px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${currentTheme.ring} 0%, rgba(0,0,0,0) 70%)`,
            animation: 'liveRipple 2.6s infinite ease-in-out',
            transition: 'background 0.5s ease'
          }} />

          {/* Ripple Wave 2 */}
          <div style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${currentTheme.ring} 0%, rgba(0,0,0,0) 75%)`,
            animation: 'liveRipple 1.8s infinite ease-in-out 0.4s',
            transition: 'background 0.5s ease'
          }} />

          {/* Core Living Glass Orb */}
          <div style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: isMuted
              ? 'radial-gradient(circle at 35% 30%, #ef4444 0%, #b91c1c 45%, #7f1d1d 85%, #450a0a 100%)'
              : (sessionState === 'listening'
                ? 'radial-gradient(circle at 35% 30%, #38bdf8 0%, #0284c7 45%, #075985 85%, #032b44 100%)'
                : (sessionState === 'speaking'
                  ? 'radial-gradient(circle at 35% 30%, #34d399 0%, #10b981 45%, #047857 85%, #023828 100%)'
                  : (sessionState === 'thinking'
                    ? 'radial-gradient(circle at 35% 30%, #fbbf24 0%, #f59e0b 45%, #b45309 85%, #451a03 100%)'
                    : 'radial-gradient(circle at 35% 30%, #94a3b8 0%, #64748b 50%, #334155 100%)'))),
            boxShadow: `0 0 60px ${currentTheme.glow}, inset 0 0 35px rgba(255, 255, 255, 0.4)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 3,
            animation: 'orbBreath 3.2s infinite ease-in-out',
            transition: 'all 0.5s ease'
          }}>
            {/* Ambient Shimmer Specular Light */}
            <div style={{
              position: 'absolute',
              top: '12%',
              left: '20%',
              width: '50px',
              height: '30px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 80%)',
              transform: 'rotate(-25deg)',
              pointerEvents: 'none'
            }} />

            {/* Inner Graphic State */}
            {isMuted ? (
              <MicOff size={44} color="#ffffff" />
            ) : sessionState === 'listening' ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ width: '4px', height: '18px', background: '#ffffff', borderRadius: '4px', animation: 'liveBar 0.9s infinite ease-in-out 0.1s' }} />
                <span style={{ width: '4px', height: '36px', background: '#ffffff', borderRadius: '4px', animation: 'liveBar 0.9s infinite ease-in-out 0.25s' }} />
                <span style={{ width: '4px', height: '48px', background: '#ffffff', borderRadius: '4px', animation: 'liveBar 0.9s infinite ease-in-out 0.4s' }} />
                <span style={{ width: '4px', height: '28px', background: '#ffffff', borderRadius: '4px', animation: 'liveBar 0.9s infinite ease-in-out 0.15s' }} />
              </div>
            ) : sessionState === 'speaking' ? (
              <Volume2 size={46} color="#ffffff" style={{ animation: 'livePulse 1.2s infinite' }} />
            ) : sessionState === 'thinking' ? (
              <RefreshCw size={42} color="#ffffff" style={{ animation: 'liveSpin 1.1s linear infinite' }} />
            ) : (
              <Mic size={42} color="#ffffff" />
            )}
          </div>
        </div>

        {/* State Label */}
        <div style={{
          marginTop: '22px',
          fontSize: '0.84rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: currentTheme.statusColor,
          transition: 'color 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          {sessionState === 'thinking' ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 14px',
              borderRadius: '999px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              boxShadow: '0 2px 14px rgba(245, 158, 11, 0.22)',
              color: '#fbbf24'
            }}>
              <span style={{ fontSize: '1rem', animation: 'livePulse 1.5s infinite' }}>
                {currentThinking.emoji}
              </span>
              <span
                key={`think-label-${thinkingPhaseIndex}`}
                style={{
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  letterSpacing: '0.02em',
                  animation: 'fadeInThinking 0.25s ease'
                }}
              >
                {currentThinking.text}
              </span>
              {thinkingElapsed > 0 && (
                <span style={{ fontSize: '0.72rem', color: '#fde68a', opacity: 0.85 }}>
                  {thinkingElapsed}s
                </span>
              )}
            </div>
          ) : (
            <>
              <span>●</span>
              <span>{currentTheme.statusText}</span>
            </>
          )}
        </div>

        {/* Real-time Subtitle / Spoken Transcript Card */}
        <div style={{ position: 'relative', width: '100%', marginTop: '16px' }}>
          <div
            ref={transcriptBoxRef}
            onScroll={handleTranscriptScroll}
            style={{
              background: '#0a1224',
              border: sessionState === 'thinking' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(56, 189, 248, 0.28)',
              borderRadius: '20px',
              padding: '16px 20px',
              width: '100%',
              boxSizing: 'border-box',
              minHeight: '85px',
              maxHeight: isMobile ? '230px' : '280px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: (sessionState === 'speaking' || sessionState === 'thinking' || (transcript && transcript.length > 70)) ? 'flex-start' : 'center',
              boxShadow: sessionState === 'thinking' ? '0 12px 36px rgba(245, 158, 11, 0.15)' : '0 12px 36px rgba(0, 0, 0, 0.7)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(56, 189, 248, 0.35) transparent',
              WebkitOverflowScrolling: 'touch',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              fontSize: '0.98rem',
              lineHeight: '1.58',
              color: '#f8fafc',
              fontWeight: 500,
              width: '100%',
              textAlign: 'left'
            }}>
              {interimTranscript ? (
                <span style={{ color: '#38bdf8', fontStyle: 'italic' }}>"{interimTranscript}"</span>
              ) : sessionState === 'speaking' ? (
                <div style={{ position: 'relative' }}>
                  <FormattedMessage text={displayedResponse || aiResponse} />
                  {isStreamingText && (
                    <span style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '14px',
                      background: '#38bdf8',
                      marginLeft: '4px',
                      verticalAlign: 'middle',
                      borderRadius: '2px',
                      animation: 'livePulse 0.8s infinite'
                    }} />
                  )}
                </div>
              ) : sessionState === 'thinking' ? (
                <div style={{ width: '100%' }}>
                  {transcript && (
                    <div style={{ color: '#cbd5e1', marginBottom: '12px', fontSize: '0.96rem', fontStyle: 'italic' }}>
                      "{transcript}"
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    color: '#fbbf24',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                  }}>
                    <span style={{ fontSize: '1.15rem', animation: 'livePulse 1.5s infinite' }}>
                      {currentThinking.emoji}
                    </span>
                    <span
                      key={`card-think-${thinkingPhaseIndex}`}
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        animation: 'fadeInThinking 0.25s ease'
                      }}
                    >
                      {currentThinking.text}
                    </span>
                    {thinkingElapsed > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#fde68a', marginLeft: 'auto', fontWeight: 600 }}>
                        {thinkingElapsed}s
                      </span>
                    )}
                  </div>
                </div>
              ) : transcript ? (
                <span style={{ color: '#f1f5f9' }}>"{transcript}"</span>
              ) : (
                <span style={{ color: '#64748b' }}>
                  सुन रहा हूँ... आप सीधे बोलें जैसे "आज के टास्क बताओ" या "रोहित को कॉल करो"
                </span>
              )}
            </div>
          </div>

          {showScrollBottomBtn && (
            <button
              type="button"
              onClick={scrollToTranscriptBottom}
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '16px',
                background: 'rgba(15, 23, 42, 0.94)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                borderRadius: '999px',
                color: '#38bdf8',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                zIndex: 10
              }}
            >
              <ArrowDown size={12} />
              <span>Jump to latest</span>
            </button>
          )}
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

      {/* ── Bottom Control Panel ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        width: '100%',
        maxWidth: '360px',
        margin: '0 auto',
        paddingBottom: '8px',
        flexShrink: 0
      }}>
        {/* Mute Mic Toggle Button */}
        <button
          type="button"
          onClick={toggleMute}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            border: isMuted ? '1.5px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.16)',
            color: isMuted ? '#f87171' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.18s ease'
          }}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {/* Center Tap to Send / Interrupt Button */}
        <button
          type="button"
          onClick={handleOrbTap}
          title={
            sessionState === 'speaking'
              ? "Aether को रोकें और नया सवाल पूछें (Interrupt AI)"
              : sessionState === 'thinking'
              ? "रद्द करें और दोबारा बोलें"
              : "तुरंत भेजें (Tap to send immediately)"
          }
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: sessionState === 'speaking' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(56, 189, 248, 0.18)',
            border: sessionState === 'speaking' ? '1.5px solid rgba(239, 68, 68, 0.55)' : '1.5px solid rgba(56, 189, 248, 0.45)',
            color: sessionState === 'speaking' ? '#f87171' : '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: sessionState === 'speaking' ? '0 4px 20px rgba(239, 68, 68, 0.3)' : '0 4px 20px rgba(56, 189, 248, 0.25)',
            transition: 'all 0.18s ease'
          }}
        >
          {sessionState === 'speaking' ? (
            <Square size={20} fill="#f87171" />
          ) : sessionState === 'thinking' ? (
            <RefreshCw size={22} style={{ animation: 'liveSpin 1s linear infinite' }} />
          ) : (
            <Sparkles size={24} />
          )}
        </button>

        {/* End Call Button */}
        <button
          type="button"
          onClick={onClose}
          title="End Live Voice Session"
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(239, 68, 68, 0.45)',
            transition: 'all 0.18s ease'
          }}
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
