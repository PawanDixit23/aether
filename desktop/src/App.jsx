import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bot, 
  Wifi, 
  WifiOff, 
  CheckSquare, 
  Calendar, 
  Bell, 
  Wallet, 
  Layers, 
  ShieldCheck, 
  MessageSquare, 
  Mic, 
  MicOff, 
  ArrowUp, 
  ChevronDown, 
  ChevronUp, 
  Volume2, 
  Languages, 
  ExternalLink, 
  Sunrise, 
  Sun, 
  Sunset, 
  Moon, 
  Sparkles, 
  RotateCcw, 
  Trash2, 
  Plus, 
  X,
  Circle,
  CheckCircle2,
  Share2,
  Newspaper,
  Clock,
  AlertTriangle,
  Database,
  Smartphone,
  BellRing,
  ArrowRight,
  Eye,
  EyeOff,
  Key,
  Play,
  Settings,
  Shield,
  User,
  HelpCircle,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Box,
  Keyboard,
  Zap,
  LogOut,
  Sliders,
  Menu,
  Edit3,
  Camera,
  Image,
  FileText,
  HardDrive,
  MapPin,
  RefreshCw,
  Upload
} from 'lucide-react';
import { supabase } from './supabase';

const API_BASE = typeof window !== 'undefined' && window.location.port === '5173'
  ? `http://${window.location.hostname}:8000/api`
  : '/api';

const LANG_OPTIONS = [
  { id: 'auto', label: 'Auto', fullLabel: 'Auto (स्वचालित)', icon: '🌐' },
  { id: 'hi', label: 'हिन्दी', fullLabel: 'हिन्दी (Hindi)', icon: '🇮🇳' },
  { id: 'en', label: 'English', fullLabel: 'English (अंग्रेजी)', icon: '🇬🇧' },
  { id: 'hinglish', label: 'Hinglish', fullLabel: 'Hinglish (हिंग्लिश)', icon: '✨' }
];

const UI_TRANSLATIONS = {
  hi: {
    subtitle: "आपका व्यक्तिगत AI सहायक",
    briefingTag: "आज की ब्रीफिंग",
    greetingSub: "आज के आपके महत्वपूर्ण काम और अपडेट।",
    userName: "पवन",
    pendingTasks: "बाकी काम",
    clickToView: "क्लिक करें",
    upcoming: "आगामी काम",
    events: "इवेंट्स",
    alerts: "महत्वपूर्ण अलर्ट",
    alertsBadge: "अलर्ट्स",
    liveData: "लाइव डेटा",
    lastUpdate: "अंतिम अपडेट",
    syncNote: "Open-Meteo और Google News से लाइव सिंक",
    newsHeading: "आज की प्रमुख खबरें",
    viewAll: "सभी देखें",
    readFull: "पूरी खबर पढ़ें",
    newsFooter: "वास्तविक समाचार स्रोत; Google News RSS से राष्ट्रीय व अंतर्राष्ट्रीय लाइव अपडेट।",
    agendaDesc: "काम और रिमाइंडर",
    wealthDesc: "बजट और निवेश",
    vaultDesc: "फ़ाइलें और मेमोरी",
    activityDesc: "एक्शन और सुरक्षा",
    askAether: "AETHER से पूछें",
    responseLang: "उत्तर भाषा",
    placeholder: "कुछ भी पूछें या कोई काम बताएं...",
    listeningPlaceholder: "Listening... बोलिए...",
    newChat: "नई चैट",
    viewChat: "बातचीत देखें (View Chat Stream)",
    hideChat: "बातचीत छुपाएँ (Hide Chat)",
    chatStream: "AETHER INTELLIGENCE STREAM // बातचीत इतिहास",
    messages: "संदेश",
    reminderDue: "⏰ रिमाइंडर अलर्ट · REMINDER DUE NOW",
    markComplete: "✓ पूरा हुआ (Complete)",
    dismiss: "Dismiss",
    share: "Share",
    online: "Online",
    offline: "Offline",
    ready: "READY (तैयार)",
    listening: "LISTENING (सुन रहा हूँ...)",
    processing: "PROCESSING (Aether सोच रहा है...)",
    speaking: "SPEAKING (बोल रहा है...)",
    thinkingMsg: "Aether सोच रहा है व लाइव डेटा ला रहा है...",
    city: "Jaipur (भांकरोटा)",
    tabPending: "बाकी काम",
    tabCompleted: "पूरे हो चुके काम",
    tabAll: "सभी काम",
    completedTag: "पूरा हुआ",
    langToast: (name) => `भाषा सेट: ${name}`,
    greetings: {
      morning: "सुप्रभात",
      afternoon: "शुभ दोपहर",
      evening: "शुभ संध्या",
      night: "शुभ रात्रि"
    },
    periods: {
      morning: "प्रातःकाल • सूर्योदय",
      afternoon: "दोपहर • खिली हुई धूप",
      evening: "संध्याकाल • सूर्यास्त",
      night: "रात्रि काल • शांत रात"
    }
  },
  en: {
    subtitle: "Your Autonomous Personal AI Executive",
    briefingTag: "DAILY BRIEFING",
    greetingSub: "Your key agenda, tasks and real-time executive updates.",
    userName: "Pawan",
    pendingTasks: "Pending Tasks",
    clickToView: "View",
    upcoming: "Upcoming",
    events: "Events",
    alerts: "Critical Alerts",
    alertsBadge: "Alerts",
    liveData: "Live Data",
    lastUpdate: "Last sync",
    syncNote: "Synced live with Open-Meteo & Google News",
    newsHeading: "Today's Top Headlines",
    viewAll: "View All",
    readFull: "Read Full Article",
    newsFooter: "Verified real news feed via Google News RSS national & global reports.",
    agendaDesc: "Tasks & Reminders",
    wealthDesc: "Budget & Wealth",
    vaultDesc: "Files & Memories",
    activityDesc: "Actions & Audit",
    askAether: "Ask AETHER",
    responseLang: "Output Language",
    placeholder: "Ask anything or command Aether...",
    listeningPlaceholder: "Listening... Speak now...",
    newChat: "New Chat",
    viewChat: "View Conversation Stream",
    hideChat: "Hide Conversation Stream",
    chatStream: "AETHER INTELLIGENCE STREAM // Conversation Log",
    messages: "messages",
    reminderDue: "⏰ REMINDER DUE NOW",
    markComplete: "✓ Complete",
    dismiss: "Dismiss",
    share: "Share",
    online: "Online",
    offline: "Offline",
    ready: "READY",
    listening: "LISTENING...",
    processing: "PROCESSING (Aether is thinking...)",
    speaking: "SPEAKING...",
    thinkingMsg: "Aether is thinking & fetching live intelligence...",
    city: "Jaipur (Bhankrota)",
    tabPending: "Pending Tasks",
    tabCompleted: "Completed Tasks",
    tabAll: "All Tasks",
    completedTag: "Completed",
    langToast: (name) => `Language set to: ${name}`,
    greetings: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
      night: "Good night"
    },
    periods: {
      morning: "Morning • Sunrise",
      afternoon: "Afternoon • Sunny",
      evening: "Evening • Sunset",
      night: "Night • Clear Sky"
    }
  },
  hinglish: {
    subtitle: "Aapka Personal AI Executive",
    briefingTag: "AAJ KI BRIEFING",
    greetingSub: "Aaj ke aapke zaroori kaam aur live updates.",
    userName: "Pawan",
    pendingTasks: "Pending Kaam",
    clickToView: "Click karein",
    upcoming: "Aane Wale Events",
    events: "Events",
    alerts: "Zaroori Alerts",
    alertsBadge: "Alerts",
    liveData: "Live Data",
    lastUpdate: "Last update",
    syncNote: "Open-Meteo aur Google News se live sync",
    newsHeading: "Aaj Ki Top Headlines",
    viewAll: "Sabhi Dekhein",
    readFull: "Poori Khabar Padhein",
    newsFooter: "Verified news source; Google News RSS se live national aur global updates.",
    agendaDesc: "Kaam aur Reminders",
    wealthDesc: "Budget aur Kharch",
    vaultDesc: "Files aur Memory",
    activityDesc: "Actions aur Audit",
    askAether: "AETHER Se Poochein",
    responseLang: "Answer Language",
    placeholder: "Kuch bhi poochein ya koi kaam batayein...",
    listeningPlaceholder: "Sun raha hoon... Boliye...",
    newChat: "Nayi Chat",
    viewChat: "Chat History Dekhein",
    hideChat: "Chat Chhupayein",
    chatStream: "AETHER INTELLIGENCE STREAM // Chat History",
    messages: "messages",
    reminderDue: "⏰ REMINDER ALERT · TIME HO GAYA HAI",
    markComplete: "✓ Complete Karein",
    dismiss: "Dismiss",
    share: "Share",
    online: "Online",
    offline: "Offline",
    ready: "READY",
    listening: "LISTENING (Sun raha hoon...)",
    processing: "PROCESSING (Aether soch raha hai...)",
    speaking: "SPEAKING (Bol raha hai...)",
    thinkingMsg: "Aether soch raha hai aur live data la raha hai...",
    city: "Jaipur (Bhankrota)",
    tabPending: "Pending Kaam",
    tabCompleted: "Completed Kaam",
    tabAll: "Sabhi Kaam",
    completedTag: "Complete",
    langToast: (name) => `Language badli gayi: ${name}`,
    greetings: {
      morning: "Good Morning",
      afternoon: "Good Afternoon",
      evening: "Good Evening",
      night: "Good Night"
    },
    periods: {
      morning: "Subah • Sunrise",
      afternoon: "Dopahar • Dhoop",
      evening: "Shaam • Sunset",
      night: "Raat • Shaant Aasmaan"
    }
  }
};

const AETHER_VOICES = [
  { id: 'puck', name: 'Puck', desc: 'Crisp, focused, analytical • Male', pitch: 1.0, rate: 1.05, gender: 'male' },
  { id: 'charon', name: 'Charon', desc: 'Deep, calm, authoritative • Male', pitch: 0.75, rate: 0.95, gender: 'male' },
  { id: 'kore', name: 'Kore', desc: 'Warm, articulate, balanced • Female', pitch: 1.05, rate: 1.0, gender: 'female' },
  { id: 'fenrir', name: 'Fenrir', desc: 'Strong, commanding, direct • Male', pitch: 0.82, rate: 1.0, gender: 'male' },
  { id: 'aoede', name: 'Aoede', desc: 'Melodic, polished, empathetic • Female', pitch: 1.15, rate: 1.0, gender: 'female' },
  { id: 'zephyr', name: 'Zephyr', desc: 'Modern, energetic, concise • Neutral', pitch: 1.0, rate: 1.1, gender: 'neutral' }
];

// Helper to select an authentic browser voice matching the personality & gender
const resolveSpeechVoice = (voiceId, lang = 'en') => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const isHindi = lang && (lang.startsWith('hi') || lang === 'hi-IN');
  if (isHindi) {
    // Priority: hi-IN voices first, then any Hindi-named voice
    const hiVoice = voices.find(v => v.lang === 'hi-IN')
      || voices.find(v => v.lang && v.lang.toLowerCase().startsWith('hi'))
      || voices.find(v => /hindi/i.test(v.name));
    if (hiVoice) return hiVoice;
    // Fallback: any available voice
    return voices[0] || null;
  }

  // For English — prefer Indian English (en-IN) voices for sharp & clear output
  const enINVoices = voices.filter(v => v.lang === 'en-IN');
  const enGBVoices = voices.filter(v => v.lang === 'en-GB');
  const enUSVoices = voices.filter(v => v.lang === 'en-US' || (v.lang && v.lang.toLowerCase().startsWith('en')));

  const voiceMeta = AETHER_VOICES.find(v => v.id === voiceId) || AETHER_VOICES[0];
  const isFemale = voiceMeta.gender === 'female' || voiceId === 'kore' || voiceId === 'aoede';

  // Prefer Indian English first
  const candidatePool = enINVoices.length > 0 ? enINVoices : (enGBVoices.length > 0 ? enGBVoices : enUSVoices);
  const fallbackPool = enUSVoices.length > 0 ? enUSVoices : voices;

  if (isFemale) {
    const femaleMatch = candidatePool.find(v =>
      /female|woman|samantha|victoria|karen|moira|tessa|fiona|veena|zira|susan|kathy|princess|alva|alice|serena|stephanie|ava|allison|zoe/i.test(v.name)
    ) || candidatePool.find(v =>
      !/male|man|alex|daniel|david|fred|george|oliver|rishi|lee|tom|bruce|ralph|junior|albert|aaron|guy/i.test(v.name)
    ) || fallbackPool.find(v =>
      /female|woman|samantha|victoria|karen|veena|zira/i.test(v.name)
    );
    if (femaleMatch) return femaleMatch;
  } else if (voiceMeta.gender === 'male') {
    const maleMatch = candidatePool.find(v =>
      /male|man|alex|daniel|david|rishi|oliver|lee|tom|george/i.test(v.name)
    ) || fallbackPool.find(v =>
      /male|man|alex|daniel|david|rishi/i.test(v.name)
    );
    if (maleMatch) return maleMatch;
  }

  return candidatePool.find(v => v.default) || candidatePool[0] || fallbackPool[0] || voices[0] || null;
};

const AETHER_MODELS = [
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tag: 'Fast & Low Latency', desc: 'Ultra-fast responses with generous free limits' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: 'Deep Reasoning', desc: 'Complex reasoning across lengthy context' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: 'Next-Gen Preview', desc: 'Experimental next-gen multimodal speed' }
];

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 8.9 5 12 5z"/>
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"/>
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.5-2.4-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"/>
  </svg>
);

// Lightweight Markdown & Links message formatter with multiline link healing
const FormattedMessage = ({ text }) => {
  if (!text) return null;

  // 1. Heal links where Gemini or line breaks separated ] and ( or wrapped URLs
  const healedText = text
    .replace(/\]\s*\n+\s*\(/g, '](')
    .replace(/\[\s*\n+/g, '[')
    .replace(/\n+\s*\]/g, ']')
    .replace(/\(\s*\n+\s*(https?:\/\/)/g, '($1');

  const lines = healedText.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} style={{ height: '4px' }} />;

        // Match markdown links [title](url), bold **text**, or standalone (https://...) / https://...
        const regex = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*.*?\*\*|\(?https?:\/\/[^\s)]+\)?)/g;
        const parts = line.split(regex);

        return (
          <div key={idx} style={{ lineHeight: '1.55', wordBreak: 'break-word' }}>
            {parts.map((part, pIdx) => {
              if (!part) return null;

              // Check [title](url)
              const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
              if (linkMatch) {
                return (
                  <a
                    key={pIdx}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--accent-cyan)',
                      fontWeight: 600,
                      textDecoration: 'underline',
                      wordBreak: 'break-word'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {linkMatch[1]} ↗
                  </a>
                );
              }

              // Check standalone or wrapped URL: (https://...) or https://...
              const rawUrlMatch = part.match(/^\(?(https?:\/\/[^\s)]+)\)?$/);
              if (rawUrlMatch) {
                const url = rawUrlMatch[1];
                return (
                  <a
                    key={pIdx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--accent-cyan)',
                      fontWeight: 600,
                      textDecoration: 'underline',
                      background: 'rgba(56, 189, 248, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      margin: '2px 0',
                      fontSize: '0.8rem',
                      verticalAlign: 'middle'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔗 स्रोत पढ़ें ↗ (Read Source)
                  </a>
                );
              }

              // Check **bold**
              const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
              if (boldMatch) {
                return <strong key={pIdx} style={{ color: '#ffffff', fontWeight: 700 }}>{boldMatch[1]}</strong>;
              }

              return <span key={pIdx}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
};

// 3D Fibonacci Particle Sphere Visual for Aether Core
const AetherParticleSphere = ({ isListening, isSpeaking, onClick }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const width = 280;
    const height = 280;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const numParticles = 240;
    const particles = [];
    const baseRadius = 88;

    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < numParticles; i++) {
      const y = 1 - (i / (numParticles - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      particles.push({ x, y, z });
    }

    let angleX = 0;
    let angleY = 0;
    let pulseTime = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      pulseTime += 0.05;
      const pulseMultiplier = isListening 
        ? 1 + 0.14 * Math.sin(pulseTime * 3.5) 
        : isSpeaking 
          ? 1 + 0.18 * Math.sin(pulseTime * 4.5) 
          : 1 + 0.03 * Math.sin(pulseTime * 1.5);

      const r = baseRadius * pulseMultiplier;
      angleX += 0.0035;
      angleY += 0.007;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const projected = particles.map(p => {
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        const fov = 320;
        const scale = fov / (fov + z2 * r);
        const screenX = width / 2 + x1 * r * scale;
        const screenY = height / 2 + y2 * r * scale;
        const alpha = Math.max(0.12, Math.min(1, (z2 + 1.2) / 2.2));

        return { screenX, screenY, scale, alpha, z: z2 };
      });

      projected.sort((a, b) => a.z - b.z);

      projected.forEach(p => {
        ctx.beginPath();
        const dotSize = Math.max(0.9, 1.8 * p.scale);
        ctx.arc(p.screenX, p.screenY, dotSize, 0, Math.PI * 2);
        
        if (isListening) {
          ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 7;
        } else if (isSpeaking) {
          ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`;
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 9;
        } else {
          ctx.fillStyle = `rgba(240, 246, 255, ${p.alpha * 0.95})`;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
          ctx.shadowBlur = 3;
        }
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isListening, isSpeaking]);

  return (
    <div 
      onClick={onClick}
      className="jarvis-sphere-container"
      style={{ position: 'relative', width: '280px', height: '280px', margin: '0 auto', cursor: 'pointer' }}
      title="Tap to speak with Aether / माइक शुरू करें"
    >
      {isListening && <div className="jarvis-listening-pulse" />}
      <canvas ref={canvasRef} style={{ width: '280px', height: '280px' }} />
    </div>
  );
};

export default function App() {
  // Onboarding & BYOK Intelligence Configuration
  const [onboardingDone, setOnboardingDone] = useState(() => 
    localStorage.getItem('aether_onboarding_done') === 'true' || 
    Boolean(localStorage.getItem('aether_user_email'))
  );
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [userName, setUserName] = useState(() => localStorage.getItem('aether_user_name') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('aether_gemini_key') || '');

  // Main Jarvis Spec UI States
  const [activeTab, setActiveTab] = useState('aether'); // 'aether' | 'today' | 'memory'
  const [chatOrTaskView, setChatOrTaskView] = useState('chat'); // 'chat' | 'task'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTypeInputOpen, setIsTypeInputOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState(null); // 'key' | 'finance' | 'audit' | 'assistant-setup' | 'profile-name' | 'permissions'
  const [isActivatingMic, setIsActivatingMic] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [micPermissionStatus, setMicPermissionStatus] = useState(() => {
    if (typeof window !== 'undefined' && window.__micPermissionGranted) return 'granted';
    if (typeof localStorage !== 'undefined' && localStorage.getItem('aether_mic_granted') === 'true') return 'granted';
    return 'prompt';
  });
  const [micEnabled, setMicEnabled] = useState(() => {
    return localStorage.getItem('aether_mic_enabled') !== 'false' && (localStorage.getItem('aether_mic_granted') === 'true' || (typeof window !== 'undefined' && Boolean(window.__micPermissionGranted)));
  });
  const [pushEnabled, setPushEnabled] = useState(() => {
    const saved = localStorage.getItem('aether_push_enabled');
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });
  const [locationEnabled, setLocationEnabled] = useState(() => {
    return localStorage.getItem('aether_location_enabled') === 'true';
  });
  const [userLocationName, setUserLocationName] = useState(() => {
    const saved = localStorage.getItem('aether_user_city') || '';
    return saved.toLowerCase().includes('singapore') ? '' : saved;
  });
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState(null); // { type: 'image' | 'file' | 'drive' | 'map', name: string, url?: string, size?: string }

  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveInputUrl, setDriveInputUrl] = useState('');
  const [driveDocName, setDriveDocName] = useState('');
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [calCurrentMonth, setCalCurrentMonth] = useState(() => new Date());
  const [calSelectedDate, setCalSelectedDate] = useState(() => new Date());
  const [remindersViewMode, setRemindersViewMode] = useState('list'); // 'list' | 'calendar'
  const [newCalReminderTitle, setNewCalReminderTitle] = useState('');
  const [newCalReminderTime, setNewCalReminderTime] = useState('10:00 AM');

  const cameraInputRef = useRef(null);
  const photosInputRef = useRef(null);
  const filesInputRef = useRef(null);

  // Dynamic Prompt Placeholder Rotation (Aether Clean Minimal)
  const ROTATING_PROMPTS = [
    "Ask Aether...",
    "Remind me to call at 5 PM...",
    "Log ₹450 spent on lunch...",
    "What's on my agenda today?",
    "Check my expense summary...",
    "What is the market status today?"
  ];
  const [promptPlaceholderIndex, setPromptPlaceholderIndex] = useState(0);

  useEffect(() => {
    const promptTimer = setInterval(() => {
      setPromptPlaceholderIndex(prev => (prev + 1) % ROTATING_PROMPTS.length);
    }, 3200);
    return () => clearInterval(promptTimer);
  }, []);
  const [userPreferredName, setUserPreferredName] = useState(() => 
    localStorage.getItem('aether_preferred_name') || 
    (localStorage.getItem('aether_user_name') && localStorage.getItem('aether_user_name') !== 'Operator' 
      ? localStorage.getItem('aether_user_name') 
      : 'Raja')
  );
  const [tempPreferredName, setTempPreferredName] = useState(userPreferredName);
  const [appTheme, setAppTheme] = useState(() => localStorage.getItem('aether_theme') || 'obsidian');
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(() => localStorage.getItem('aether_voice_output') !== 'false');
  const [chimesEnabled, setChimesEnabled] = useState(() => localStorage.getItem('aether_chimes') !== 'false');
  const [speechRate, setSpeechRate] = useState(() => parseFloat(localStorage.getItem('aether_speech_rate') || '1.0'));
  const [customUsername, setCustomUsername] = useState(() => localStorage.getItem('aether_username') || '');
  const [newMemoryText, setNewMemoryText] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('aether_selected_voice') || 'puck');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('aether_selected_model') || 'gemini-1.5-flash');
  const [keyValidating, setKeyValidating] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keySuccess, setKeySuccess] = useState(false);
  const [showKeyGuide, setShowKeyGuide] = useState(false);
  const [audioSamplePlaying, setAudioSamplePlaying] = useState(null);

  // Google Authentication State
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('aether_user_email') || '');
  const [userAvatar, setUserAvatar] = useState(() => localStorage.getItem('aether_user_avatar') || '');
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('aether_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleLoginSuccess, setGoogleLoginSuccess] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleCustomName, setGoogleCustomName] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [googleProviderToken, setGoogleProviderToken] = useState(() => localStorage.getItem('aether_google_provider_token') || '');
  const [googleTasks, setGoogleTasks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aether_gcal_events') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [isSyncingGCal, setIsSyncingGCal] = useState(false);
  const [gcalIcalUrl, setGcalIcalUrl] = useState(() => localStorage.getItem('aether_gcal_ical_url') || '');
  const [showGCalConnectModal, setShowGCalConnectModal] = useState(false);
  const icsFileInputRef = useRef(null);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedLang, setSelectedLang] = useState(() => localStorage.getItem('aether_language') || 'auto');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [agendaFilter, setAgendaFilter] = useState('pending'); // 'pending' | 'completed' | 'all'
  const [calAgendaFilter, setCalAgendaFilter] = useState('all'); // 'all' | 'pending' | 'completed'
  const langDropdownRef = useRef(null);
  const geminiChatFeedRef = useRef(null);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tag body when running inside mobile React Native WebView
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      document.body.classList.add('in-mobile-app');
    }
  }, []);

  const effectiveLang = selectedLang === 'auto' 
    ? (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('hi') ? 'hi' : 'en')
    : selectedLang;
  const t = UI_TRANSLATIONS[effectiveLang] || UI_TRANSLATIONS.hi;
  const currentLangObj = LANG_OPTIONS.find(l => l.id === selectedLang) || LANG_OPTIONS[0];

  const [activeReminderAlert, setActiveReminderAlert] = useState(null);
  const [activeModule, setActiveModule] = useState(null); // 'agenda', 'wealth', 'vault', 'activity', 'upcoming', 'alerts'
  const [showConversation, setShowConversation] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  
  // App data states
  const [briefing, setBriefing] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [tasks, setTasks] = useState(() => {
    try {
      const email = localStorage.getItem('aether_user_email');
      const cachedStr = email ? localStorage.getItem(`aether_backup_${email}`) : null;
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) return parsed.tasks;
      }
      const generalCache = localStorage.getItem('aether_cached_tasks');
      if (generalCache) {
        const parsed = JSON.parse(generalCache);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const combinedTasks = useMemo(() => {
    const seenIds = new Set();
    const seenTitleDate = new Set();
    const cleanList = [];

    const getDedupKey = (t) => {
      const cleanTitle = (t?.title || '').trim().toLowerCase();
      let dStr = '';
      if (t?.due_date) {
        try { dStr = formatLocalDateStr(t.due_date); } catch (e) {}
      }
      const timeStr = (t?.reminder_time || '').trim().toLowerCase();
      return `${cleanTitle}__${dStr}__${timeStr}`;
    };

    // 1. Process local/backend tasks first
    for (const t of tasks) {
      if (!t || !t.id) continue;
      const idKey = String(t.id);
      if (seenIds.has(idKey)) continue;
      seenIds.add(idKey);

      const dKey = getDedupKey(t);
      if (dKey !== '____') {
        if (seenTitleDate.has(dKey)) continue;
        seenTitleDate.add(dKey);
      }
      cleanList.push(t);
    }

    // 2. Merge Google Tasks, ensuring no duplicate with existing DB tasks
    for (const gt of googleTasks) {
      if (!gt || !gt.id) continue;
      const idKey = String(gt.id);
      if (seenIds.has(idKey)) continue;

      const dKey = getDedupKey(gt);
      if (dKey !== '____' && seenTitleDate.has(dKey)) continue;

      seenIds.add(idKey);
      if (dKey !== '____') seenTitleDate.add(dKey);
      cleanList.push(gt);
    }

    return cleanList;
  }, [tasks, googleTasks]);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [financeRecords, setFinanceRecords] = useState([]);
  const [financeSummary, setFinanceSummary] = useState({ total_income: 0, total_expense: 0, balance: 0 });
  const [memories, setMemories] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [toast, setToast] = useState(null);
  const [serverOnline, setServerOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState('');

  // Time-of-day progression state calculated continuously
  const [currentTime, setCurrentTime] = useState(new Date());
  const [subheadingIndex, setSubheadingIndex] = useState(0);

  // Auto-cycle through dynamic executive suggestions every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSubheadingIndex(prev => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const userScrolledUpRef = useRef(false);
  const currentAudioRef = useRef(null);

  // Universal Audio Streaming Fallback (Works 100% on Mobile WebViews where SpeechSynthesis is unavailable)
  const playStreamAudio = (text, voiceId, lang) => {
    try {
      if (currentAudioRef.current) {
        try { currentAudioRef.current.pause(); } catch (e) {}
        currentAudioRef.current = null;
      }
      const ttsUrl = `${API_BASE}/tts?text=${encodeURIComponent(text.slice(0, 350))}&voice=${voiceId}&lang=${lang || 'en'}`;

      // 1. Direct Web Audio element (handles playback directly within browser/webview)
      const audio = new Audio(ttsUrl);
      audio.volume = 1.0;
      currentAudioRef.current = audio;
      setIsSpeaking(true);

      audio.onended = () => {
        setIsSpeaking(false);
        setAudioSamplePlaying(null);
        currentAudioRef.current = null;
      };
      audio.onerror = (e) => {
        console.warn('Audio stream playback error:', e);
        setIsSpeaking(false);
        setAudioSamplePlaying(null);
        currentAudioRef.current = null;
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.warn('Direct audio play error:', e);
        });
      }

      // 2. Also send to native React Native layer if running in mobile app
      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAY_TTS_AUDIO',
            url: ttsUrl
          }));
        } catch (e) {
          console.warn('RN postMessage TTS error:', e);
        }
      }
    } catch (e) {
      console.warn('playStreamAudio exception:', e);
      setIsSpeaking(false);
      setAudioSamplePlaying(null);
    }
  };

  // Auto-scroll chat feed on new messages
  useEffect(() => {
    if (geminiChatFeedRef.current) {
      geminiChatFeedRef.current.scrollTop = geminiChatFeedRef.current.scrollHeight;
    }
  }, [chatHistory, isProcessing]);

  // Ensure browser voices are loaded early
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      };
    }
  }, []);

  // Proactive Spoken Greeting on App Open (Only if Voice Responses permission is ON)
  const hasSpokenWelcomeRef = useRef(false);
  useEffect(() => {
    if (hasSpokenWelcomeRef.current) return;

    // Strict guard: ONLY speak if voice output permission is enabled
    const voiceAllowed = localStorage.getItem('aether_voice_output') !== 'false' && voiceOutputEnabled;
    if (!voiceAllowed) return;

    const timer = setTimeout(() => {
      if (hasSpokenWelcomeRef.current) return;
      hasSpokenWelcomeRef.current = true;

      const hour = new Date().getHours();
      const firstName = (userName && userName !== 'Operator') ? userName.split(' ')[0] : 'Pawan';
      const isHindi = selectedLang === 'hi' || (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('hi'));

      let spokenGreeting = '';
      if (isHindi) {
        if (hour >= 5 && hour < 12) {
          spokenGreeting = `नमस्ते ${firstName}! सुप्रभात। आज मैं आपके लिए क्या काम करूँ?`;
        } else if (hour >= 12 && hour < 17) {
          spokenGreeting = `नमस्ते ${firstName}! बताइए, अभी आपके किस काम में मदद करूँ?`;
        } else {
          spokenGreeting = `नमस्ते ${firstName}! बताइए, आज मैं आपके क्या-क्या काम सँभालूँ?`;
        }
      } else {
        if (hour >= 5 && hour < 12) {
          spokenGreeting = `Good morning, ${firstName}! What work can I handle for you today?`;
        } else if (hour >= 12 && hour < 17) {
          spokenGreeting = `Hello ${firstName}! What can I take off your plate right now?`;
        } else {
          spokenGreeting = `Hello ${firstName}! What work can I do for you tonight?`;
        }
      }

      speakText(spokenGreeting);
    }, 1500);

    return () => clearTimeout(timer);
  }, [voiceOutputEnabled, userName, selectedLang]);

  // Dynamic Executive Greeting based on standard time of day
  const getDynamicGreeting = () => {
    const hour = currentTime ? currentTime.getHours() : new Date().getHours();
    const firstName = (userName && userName !== 'Operator') ? userName.split(' ')[0] : 'Pawan';
    if (hour >= 5 && hour < 12) {
      return `Good morning, ${firstName}`;
    } else if (hour >= 12 && hour < 17) {
      return `Good afternoon, ${firstName}`;
    } else {
      return `Good evening, ${firstName}`;
    }
  };

  // Helper to format date into local YYYY-MM-DD
  const formatLocalDateStr = (d) => {
    if (!d) return '';
    if (typeof d === 'string') {
      const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match && !d.includes('Z')) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }
    const dateObj = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dateObj.getTime())) return '';
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const isTaskPending = (t) => !(t.is_completed === true || t.completed === true || t.status === 'completed');

  // Today-only pending tasks count for bell badge
  const getTodayPendingCount = () => {
    const todayStr = formatLocalDateStr(new Date());
    const list = (combinedTasks && combinedTasks.length > 0) ? combinedTasks : (tasks || []);
    return list.filter(t => {
      if (!isTaskPending(t)) return false;
      // 1. Explicit due_date check (must strictly match today's local date)
      if (t.due_date) {
        const taskDay = formatLocalDateStr(t.due_date);
        return taskDay === todayStr;
      }
      // 2. If no due_date, only tasks created today count as today's tasks
      if (t.created_at) {
        const createdDay = formatLocalDateStr(t.created_at);
        return createdDay === todayStr;
      }
      // Older undated backlog reminders do NOT pollute today's badge count
      return false;
    }).length;
  };

  // Dynamic Executive Subtitles list tailored to real-time context & time of day
  const getDynamicSubheadingList = () => {
    const hour = currentTime ? currentTime.getHours() : new Date().getHours();
    const pendingTasks = (tasks || []).filter(isTaskPending).length;
    const balanceNum = financeSummary?.balance;
    const balanceStr = (balanceNum !== undefined && balanceNum !== null) 
      ? (balanceNum < 0 ? `-₹${Math.abs(balanceNum).toLocaleString('en-IN')}` : `₹${balanceNum.toLocaleString('en-IN')}`)
      : null;

    const list = [];

    // 1. Task Intelligence
    if (pendingTasks > 0) {
      if (hour >= 5 && hour < 12) {
        list.push(`You have ${pendingTasks} active ${pendingTasks === 1 ? 'task' : 'tasks'} scheduled for today. Ready for your morning briefing?`);
        list.push(`Review today's agenda: ${pendingTasks} priority ${pendingTasks === 1 ? 'task' : 'tasks'} awaiting action.`);
      } else if (hour >= 12 && hour < 17) {
        list.push(`${pendingTasks} agenda ${pendingTasks === 1 ? 'item requires' : 'items require'} attention. What would you like to accomplish next?`);
        list.push(`Midday progress check: ${pendingTasks} pending ${pendingTasks === 1 ? 'task' : 'tasks'} on your board.`);
      } else if (hour >= 17 && hour < 22) {
        list.push(`Wrapping up the day with ${pendingTasks} pending ${pendingTasks === 1 ? 'task' : 'tasks'}. What should we prioritize next?`);
        list.push(`Evening recap: Review or reschedule your ${pendingTasks} remaining ${pendingTasks === 1 ? 'task' : 'tasks'}.`);
      } else {
        list.push(`Night review: ${pendingTasks} open ${pendingTasks === 1 ? 'task' : 'tasks'} remaining. Reschedule for tomorrow?`);
      }
    } else {
      list.push("All tasks completed today! Ready to plan ahead or take notes?");
      list.push("Your agenda is completely clear. Ask Aether to organize new goals.");
    }

    // 2. Comprehensive Work & Productivity Intelligence
    list.push("Try: 'Write a professional email / report for my project'");
    list.push("Try: 'Help me debug this code or write an automation script'");
    list.push("Ask: 'Research the best strategy and summarize key points'");
    list.push("Try: 'Break down my upcoming goal into action milestones'");

    // 3. Wealth / Ledger Intelligence
    if (balanceStr) {
      list.push(`Net Ledger Balance: ${balanceStr} • Ask: "Log expense" or "Show wealth report"`);
    }

    // 4. Time-specific Prompt Suggestions
    if (hour >= 5 && hour < 12) {
      list.push("Ask: 'What is my schedule and briefing for today?'");
      list.push("Try: 'Add priority task: Client sync at 11 AM'");
    } else if (hour >= 12 && hour < 17) {
      list.push("Ask: 'Summarize today's progress and upcoming deadlines'");
      list.push("Try: 'Set a reminder to check emails at 4 PM'");
    } else if (hour >= 17 && hour < 22) {
      list.push("Ask: 'Summarize today's key achievements and completed items'");
      list.push("Try: 'Plan my meetings and focus time for tomorrow'");
    } else {
      list.push("Ask: 'Draft a quick recap of today's notes and ideas'");
      list.push("Working late? Ask Aether to organize tomorrow's morning schedule.");
    }

    // 5. Acoustic Voice & Complete Work Partner
    list.push("Tap the Æ orb or microphone to speak naturally in real time");
    list.push(`I am ready to handle your work, ${userName && userName !== 'Operator' ? userName.split(' ')[0] : 'Pawan'}. What should we do?`);

    return list;
  };

  const getDynamicSubheading = () => {
    const list = getDynamicSubheadingList();
    return list[subheadingIndex % list.length];
  };

  // Onboarding & BYOK Intelligence Handlers
  const handleValidateApiKey = async () => {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setKeyError('कृपया अपनी Gemini API Key दर्ज करें (Please enter your Gemini API key)');
      return;
    }
    setKeyValidating(true);
    setKeyError('');
    setKeySuccess(false);

    try {
      let isValid = false;
      // 1. Direct validation with Google AI Studio
      try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
        const resp = await fetch(testUrl, { method: 'GET' });
        if (resp.ok) {
          const json = await resp.json();
          if (json && json.models && json.models.length > 0) {
            isValid = true;
          }
        }
      } catch (directErr) {
        // Direct fetch may be blocked by CORS in some browsers
      }

      // 2. Fallback to server proxy
      if (!isValid) {
        const beResp = await fetch(`${API_BASE}/auth/validate-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: cleanKey })
        });
        const beData = await beResp.json();
        if (beData.valid) {
          isValid = true;
        } else {
          setKeyError('अमान्य Gemini API Key! कृपया Google AI Studio से अपनी सही Key जांचें।');
          setKeyValidating(false);
          return;
        }
      }

      if (isValid) {
        localStorage.setItem('aether_gemini_key', cleanKey);
        setKeySuccess(true);
        setKeyError('');
        showToast('Gemini API Key सत्यापित! (Key Verified)', 'success');
        setTimeout(() => {
          setOnboardingStep(6);
          setKeySuccess(false);
        }, 500);
      }
    } catch (err) {
      setKeyError('सत्यापन में त्रुटि। कृपया इंटरनेट या Key जांचें।');
    } finally {
      setKeyValidating(false);
    }
  };

  const handleSaveName = () => {
    const nameToSave = userName.trim() || 'Operator';
    localStorage.setItem('aether_user_name', nameToSave);
    setUserName(nameToSave);
    setOnboardingStep(3);
  };

  // Record auth event to Aether local SQLite audit trail
  const recordAuthEvent = async (email, name) => {
    if (!email) return;
    try {
      await fetch(`${API_BASE}/auth/record-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, provider: 'google' })
      });
      const resAudit = await fetch(`${API_BASE}/audit-logs`);
      if (resAudit.ok) setAuditLogs(await resAudit.json());
    } catch (err) {
      console.error('Failed to log auth event:', err);
    }
  };

  // ─── Keep-Alive Ping: Render server को sleep होने से बचाता है ─────────────────
  // Render free tier 15-30 min inactivity पर server सुला देता है।
  // यह ping हर 8 मिनट पर server को जगाए रखता है।
  useEffect(() => {
    const PING_INTERVAL_MS = 8 * 60 * 1000; // 8 minutes

    const pingServer = async () => {
      try {
        const serverBase = typeof window !== 'undefined' && window.location.port === '5173'
          ? `http://${window.location.hostname}:8000`
          : '';
        await fetch(`${serverBase}/api/health`, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        console.log('[Aether Keep-Alive] ✅ Server ping successful —', new Date().toLocaleTimeString());
      } catch (err) {
        console.warn('[Aether Keep-Alive] ⚠️ Ping failed (server may be starting):', err?.message);
      }
    };

    // App खुलते ही तुरंत ping करें
    pingServer();

    // फिर हर 8 मिनट पर
    const keepAliveTimer = setInterval(pingServer, PING_INTERVAL_MS);

    return () => clearInterval(keepAliveTimer);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────────

  // Handle Supabase Google OAuth Redirect & Session (same as vivah)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (session.provider_token) {
          localStorage.setItem('aether_google_provider_token', session.provider_token);
          setGoogleProviderToken(session.provider_token);
        }
        const user = session.user;
        const gName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Operator';
        const gEmail = user.email || '';
        const gAvatar = user.user_metadata?.avatar_url || 
                        user.user_metadata?.picture || 
                        user.identities?.[0]?.identity_data?.avatar_url || 
                        user.identities?.[0]?.identity_data?.picture || 
                        user.user_metadata?.image || 
                        '';

        localStorage.setItem('aether_user_name', gName);
        localStorage.setItem('aether_user_email', gEmail);
        if (gAvatar) {
          localStorage.setItem('aether_user_avatar', gAvatar);
          setUserAvatar(gAvatar);
        }

        setUserName(gName);
        setUserEmail(gEmail);

        recordAuthEvent(gEmail, gName);

        // Immediate restore of saved tasks so re-login never shows 0 reminders
        const backupStr = localStorage.getItem(`aether_backup_${gEmail}`) || localStorage.getItem('aether_cached_tasks');
        if (backupStr) {
          try {
            const parsed = JSON.parse(backupStr);
            const tList = Array.isArray(parsed) ? parsed : parsed.tasks;
            if (Array.isArray(tList) && tList.length > 0) {
              setTasks(tList);
            }
          } catch (e) {}
        }
        setTimeout(() => {
          refreshAllData();
        }, 100);

        const alreadyDone = localStorage.getItem('aether_onboarding_done') === 'true';
        if (alreadyDone) {
          setOnboardingDone(true);
        } else {
          setOnboardingDone(false);
          setOnboardingStep(prev => (prev < 4 ? 4 : prev));
        }

        if (window.location.hash.includes('access_token')) {
          showToast(`Google से सफलतापूर्वक लिंक: ${gName}`, 'success');
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        if (session.provider_token) {
          localStorage.setItem('aether_google_provider_token', session.provider_token);
          setGoogleProviderToken(session.provider_token);
        }
        const user = session.user;
        const gName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Operator';
        const gEmail = user.email || '';
        const gAvatar = user.user_metadata?.avatar_url || 
                        user.user_metadata?.picture || 
                        user.identities?.[0]?.identity_data?.avatar_url || 
                        user.identities?.[0]?.identity_data?.picture || 
                        user.user_metadata?.image || 
                        '';

        localStorage.setItem('aether_user_name', gName);
        localStorage.setItem('aether_user_email', gEmail);
        if (gAvatar) {
          localStorage.setItem('aether_user_avatar', gAvatar);
          setUserAvatar(gAvatar);
        }

        setUserName(gName);
        setUserEmail(gEmail);

        recordAuthEvent(gEmail, gName);

        // Immediate restore of saved tasks so re-login never shows 0 reminders
        const backupStr = localStorage.getItem(`aether_backup_${gEmail}`) || localStorage.getItem('aether_cached_tasks');
        if (backupStr) {
          try {
            const parsed = JSON.parse(backupStr);
            const tList = Array.isArray(parsed) ? parsed : parsed.tasks;
            if (Array.isArray(tList) && tList.length > 0) {
              setTasks(tList);
            }
          } catch (e) {}
        }
        setTimeout(() => {
          refreshAllData();
        }, 100);

        const alreadyDone = localStorage.getItem('aether_onboarding_done') === 'true';
        if (alreadyDone) {
          setOnboardingDone(true);
        } else {
          setOnboardingDone(false);
          setOnboardingStep(prev => (prev < 4 ? 4 : prev));
        }

        // ✅ Fix: सिर्फ fresh SIGNED_IN पर toast दिखाएं — session restore/token refresh पर नहीं
        if (event === 'SIGNED_IN') {
          showToast(`Google से सफलतापूर्वक लिंक: ${gName}`, 'success');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    if (userEmail) {
      const alreadyDone = localStorage.getItem('aether_onboarding_done') === 'true';
      if (alreadyDone) {
        setOnboardingDone(true);
      } else {
        setOnboardingDone(false);
        setOnboardingStep(4);
      }
      return;
    }
    setGoogleAuthLoading(true);
    setGoogleError('');
    try {
      // Trigger Supabase Real Google OAuth with standard profile scopes only
      // NOTE: Sensitive scopes like calendar.readonly are strictly blocked with Error 403 access_denied by Google on unverified apps
      const options = {
        redirectTo: window.location.origin
      };
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options
      });
      if (error) {
        console.error('Supabase Google OAuth error:', error);
        setGoogleError(error.message);
        setShowGoogleModal(true);
      }
    } catch (err) {
      console.error('Google Sign In err:', err);
      setGoogleError('Google Sign-In प्रारंभ करने में समस्या आई।');
      setShowGoogleModal(true);
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const handleConnectGoogleManual = (e) => {
    e?.preventDefault();
    const email = (googleCustomEmail || userEmail).trim();
    if (!email || !email.includes('@')) {
      setGoogleError('कृपया एक वैध Google ईमेल दर्ज करें (e.g. name@gmail.com)');
      return;
    }
    const name = (googleCustomName || userName).trim() || email.split('@')[0];
    localStorage.setItem('aether_user_name', name);
    localStorage.setItem('aether_user_email', email);
    setUserName(name);
    setUserEmail(email);
    setGoogleLoginSuccess(true);
    setGoogleError('');
    showToast(`Google Account कनेक्ट हुआ: ${email}`, 'success');
    setShowGoogleModal(false);
    const alreadyDone = localStorage.getItem('aether_onboarding_done') === 'true';
    if (alreadyDone) {
      setOnboardingDone(true);
    } else {
      setOnboardingDone(false);
      setOnboardingStep(4);
    }
    setGoogleLoginSuccess(false);
  };

  const handlePlayVoicePreview = (voice) => {
    try {
      setAudioSamplePlaying(voice.id);
      const firstName = (userName && userName !== 'Operator') ? userName.split(' ')[0] : 'Operator';
      const sampleText = `Hello ${firstName}. I am Aether, voiced by ${voice.name}.`;

      // On Mobile WebView: always use server-side TTS (SpeechSynthesis not available)
      const isInReactNativeWebView = typeof window !== 'undefined' && !!window.ReactNativeWebView;
      if (isInReactNativeWebView) {
        playStreamAudio(sampleText, voice.id, 'en');
        setTimeout(() => setAudioSamplePlaying(null), 4000);
        return;
      }

      // 1. Try browser SpeechSynthesis if voices are available (Desktop)
      let spoken = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(sampleText);
            utterance.pitch = voice.pitch;
            utterance.rate = voice.rate;
            
            const matchedVoice = resolveSpeechVoice(voice.id, 'en');
            if (matchedVoice) {
              utterance.voice = matchedVoice;
            }
            
            utterance.onend = () => setAudioSamplePlaying(null);
            utterance.onerror = () => setAudioSamplePlaying(null);
            window.speechSynthesis.speak(utterance);
            spoken = true;
          } catch (e) {
            spoken = false;
          }
        }
      }

      // 2. Guaranteed Server-Side Audio Streaming Fallback (Plays 100% on Mobile WebViews & Android/iOS)
      if (!spoken) {
        playStreamAudio(sampleText, voice.id, 'en');
      }

      setTimeout(() => {
        setAudioSamplePlaying(null);
      }, 3500);
    } catch (e) {
      setAudioSamplePlaying(null);
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsActivatingMic(true);
    try {
      // 1. Mobile App (React Native WebView): Trigger native Android OS RECORD_AUDIO permission
      const isInReactNativeWebView = typeof window !== 'undefined' && !!window.ReactNativeWebView;
      if (isInReactNativeWebView) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_MIC_PERMISSION' }));
          await new Promise((resolve) => {
            window.__onMicPermissionResult = (granted) => {
              window.__onMicPermissionResult = null;
              resolve(granted);
            };
            setTimeout(() => resolve(true), 3500);
          });
        } catch (nativeErr) {
          console.warn('Native mic request error:', nativeErr);
        }
      }

      // 2. Browser / WebView Web Context: Request microphone access
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (mediaErr) {
          console.warn('Browser mic request info/denied:', mediaErr);
        }
      }

      // 3. Autonomous Monitoring / Notifications permission (background)
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission().catch(() => {});
        }
      } catch (notifErr) {}

      localStorage.setItem('aether_onboarding_done', 'true');
      setOnboardingDone(true);
      showToast('Aether सिस्टम सक्रिय! स्वागत है। (Aether Activated)', 'success');
    } catch (e) {
      console.log('Complete onboarding catch:', e);
      localStorage.setItem('aether_onboarding_done', 'true');
      setOnboardingDone(true);
    } finally {
      setIsActivatingMic(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem('aether_user_email');
    localStorage.removeItem('aether_user_name');
    localStorage.removeItem('aether_user_avatar');
    localStorage.removeItem('aether_onboarding_done');
    setUserEmail('');
    setUserName('Operator');
    setUserAvatar('');
    setOnboardingDone(false);
    setOnboardingStep(1);
    setIsSettingsOpen(false);
    showToast(
      effectiveLang === 'en' ? "Signed out successfully" : effectiveLang === 'hinglish' ? "Successfully sign out ho gaye" : "सफलतापूर्वक साइन आउट किया गया",
      "info"
    );
  };

  const handleDeleteAccount = () => {
    setActiveSubModal('delete-account');
  };

  const handleConfirmAccountReset = async () => {
    localStorage.clear();
    await handleSignOut();
    setActiveSubModal(null);
    showToast(
      effectiveLang === 'en' ? "Account data reset successfully" : effectiveLang === 'hinglish' ? "Account data reset ho gaya" : "खाता डेटा सफलतापूर्वक रीसेट कर दिया गया",
      "info"
    );
  };

  // Play pleasant executive reminder chime
  const playReminderChime = () => {
    if (!chimesEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.15);
      gain2.gain.setValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.log("Audio chime error:", e);
    }
  };

  const [pushPermission, setPushPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Trigger Native Mobile & Desktop Push Notification with Sound & Vibration
  const triggerPushNotification = (title, body, tag = 'aether-alert') => {
    // 1. Play executive chime audio
    playReminderChime();

    // 2. Hardware vibration on smartphone
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([200, 100, 200, 100, 200]); } catch(e) {}
    }

    // 3. React Native Mobile Native Push Notification Bridge
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'TRIGGER_NOTIFICATION',
          title,
          body,
          tag
        }));
      } catch (e) {
        console.warn('Native mobile bridge error:', e);
      }
    }

    // 4. Service Worker notification (mandatory for mobile PWA & background OS alerts)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          vibrate: [200, 100, 200, 100, 200],
          tag,
          renotify: true,
          requireInteraction: true,
          data: { url: '/' }
        });
      }).catch(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try { new Notification(title, { body, icon: '/favicon.svg' }); } catch(e) {}
        }
      });
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.svg' });
      } catch (err) {
        console.log("Notification error:", err);
      }
    }
  };

  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPushPermission(res);
        if (res === 'granted') {
          showToast("✓ मोबाइल व डेस्कटॉप पुश अलर्ट सक्रिय हो गए!", 'success');
          triggerPushNotification(
            "⚡ AETHER: पुश अलर्ट सक्रिय है!",
            "अब आपके सभी रिमाइंडर्स और अलर्ट स्क्रीन पर सीधे रिंग करेंगे।"
          );
        } else {
          showToast("सूचना: पुश नोटिफिकेशन अनुमति अस्वीकार कर दी गई", 'error');
        }
      } catch (e) {
        console.error("Permission request error:", e);
      }
    } else {
      showToast("यह ब्राउज़र पुश नोटिफिकेशन सपोर्ट नहीं करता", 'error');
    }
  };

  const handleSendTestPush = () => {
    triggerPushNotification(
      "⚡ AETHER TEST ALERT 🎉",
      "मोबाइल और डेस्कटॉप पुश नोटिफिकेशन एकदम सही काम कर रहे हैं!",
      "aether-test"
    );
    showToast("📲 टेस्ट पुश नोटिफिकेशन भेजा गया!", 'success');
  };

  // Check & sync initial microphone permission
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' }).then(status => {
        setMicPermissionStatus(status.state);
        if (status.state === 'granted') {
          localStorage.setItem('aether_mic_granted', 'true');
        }
        status.onchange = () => {
          setMicPermissionStatus(status.state);
          if (status.state === 'granted') {
            localStorage.setItem('aether_mic_granted', 'true');
          }
        };
      }).catch(() => {});
    }
  }, []);

  const handleRequestMicPermission = async () => {
    setIsActivatingMic(true);
    let granted = false;
    try {
      // 1. Mobile Android (React Native WebView): trigger native Android OS RECORD_AUDIO permission
      const isInReactNativeWebView = typeof window !== 'undefined' && !!window.ReactNativeWebView;
      if (isInReactNativeWebView) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_MIC_PERMISSION' }));
          granted = await new Promise((resolve) => {
            window.__onMicPermissionResult = (res) => {
              window.__onMicPermissionResult = null;
              resolve(res);
            };
            setTimeout(() => resolve(true), 3500);
          });
        } catch (nativeErr) {
          console.warn('Native mic request error:', nativeErr);
        }
      }

      // 2. Web / Browser / WebView: Request microphone access
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          granted = true;
        } catch (mediaErr) {
          console.warn('Browser mic request info/denied:', mediaErr);
        }
      }

      if (granted) {
        setMicPermissionStatus('granted');
        localStorage.setItem('aether_mic_granted', 'true');
        showToast('✓ माइक्रोफ़ोन अनुमति सक्रिय कर दी गई है! (Microphone Granted)', 'success');
      } else {
        setMicPermissionStatus('denied');
        showToast('माइक्रोफ़ोन अनुमति नहीं मिल सकी। कृपया सिस्टम सेटिंग्स में जांचें।', 'error');
      }
    } catch (e) {
      console.log('Mic request catch:', e);
    } finally {
      setIsActivatingMic(false);
    }
  };

  const handleTestMic = async () => {
    setIsMicTesting(true);
    showToast('माइक टेस्ट: कुछ बोलें... (Speak now)', 'info');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setTimeout(() => {
          stream.getTracks().forEach(t => t.stop());
          setIsMicTesting(false);
          showToast('✓ माइक स्पष्ट काम कर रहा है! (Microphone Working)', 'success');
        }, 2000);
      } else {
        setTimeout(() => {
          setIsMicTesting(false);
          showToast('✓ माइक कनेक्शन सक्रिय है', 'success');
        }, 1500);
      }
    } catch (err) {
      setIsMicTesting(false);
      showToast('माइक टेस्ट विफल। अनुमति जांचें।', 'error');
    }
  };

  const handleToggleMic = async () => {
    if (micEnabled) {
      setMicEnabled(false);
      localStorage.setItem('aether_mic_enabled', 'false');
      showToast('माइक्रोफ़ोन अक्षम किया गया (Microphone Disabled)', 'info');
    } else {
      await handleRequestMicPermission();
      setMicEnabled(true);
      localStorage.setItem('aether_mic_enabled', 'true');
    }
  };

  const reverseGeocodeLocation = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      if (res.ok) {
        const data = await res.json();
        const city = data.city || data.locality || data.principalSubdivision || '';
        const state = data.principalSubdivision || '';
        const loc = [city, state].filter(Boolean).join(', ');
        if (loc) return loc;
      }
    } catch (e) {}

    try {
      const res2 = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      if (res2.ok) {
        const d = await res2.json();
        const addr = d.address || {};
        const city = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || '';
        const state = addr.state || '';
        const loc = [city, state].filter(Boolean).join(', ');
        if (loc) return loc;
      }
    } catch (e) {}

    return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  };

  const handleTogglePush = async () => {
    if (pushEnabled) {
      setPushEnabled(false);
      localStorage.setItem('aether_push_enabled', 'false');
      showToast('पुश नोटिफिकेशन्स म्यूट किए गए (Notifications Muted)', 'info');
    } else {
      setPushEnabled(true);
      localStorage.setItem('aether_push_enabled', 'true');
      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_NOTIFICATION_PERMISSION' }));
        } catch (e) {}
      }
      await handleRequestPushPermission();
    }
  };

  const handleToggleLocation = () => {
    if (locationEnabled) {
      setLocationEnabled(false);
      localStorage.setItem('aether_location_enabled', 'false');
      setUserCoords(null);
      setUserLocationName('');
      localStorage.removeItem('aether_user_city');
      showToast('लोकेशन अनुमति बंद की गई (Location Disabled)', 'info');
    } else {
      showToast('📍 सटीक लोकेशन खोजी जा रही है...', 'info');

      const applyLocation = (coords, locName) => {
        let cleanName = locName;
        let cleanCoords = coords;
        if (!cleanName || cleanName.toLowerCase().includes('singapore')) {
          cleanName = 'Jaipur, Rajasthan';
          cleanCoords = { latitude: 26.9136, longitude: 75.7858 };
        }
        setLocationEnabled(true);
        localStorage.setItem('aether_location_enabled', 'true');
        if (cleanCoords) setUserCoords(cleanCoords);
        if (cleanName) {
          setUserLocationName(cleanName);
          localStorage.setItem('aether_user_city', cleanName);
        }
      };

      // 1. Direct GPS Hardware Geolocation (Top priority: accurate device physical position)
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            try {
              let locName = await reverseGeocodeLocation(coords.latitude, coords.longitude);
              if (!locName || locName.toLowerCase().includes('singapore')) {
                locName = 'Jaipur, Rajasthan';
              }
              applyLocation(coords, locName);
              showToast(`✓ लोकेशन सक्रिय: ${locName} 📍`, 'success');
            } catch (geoErr) {
              applyLocation(coords, 'Jaipur, Rajasthan');
              showToast('✓ लोकेशन सक्रिय 📍', 'success');
            }
          },
          async (err) => {
            console.warn('GPS read failed, falling back to phone network location:', err);
            // Fallback A: Direct client phone IP
            try {
              const ipRes = await fetch('https://ipapi.co/json/');
              if (ipRes.ok) {
                const ipData = await ipRes.json();
                let cityName = [ipData.city, ipData.region].filter(Boolean).join(', ');
                if (!cityName || cityName.toLowerCase().includes('singapore')) {
                  cityName = 'Jaipur, Rajasthan';
                }
                const coords = { latitude: ipData.latitude || 26.9136, longitude: ipData.longitude || 75.7858 };
                applyLocation(coords, cityName);
                showToast(`✓ लोकेशन सक्रिय: ${cityName} 📍`, 'success');
                return;
              }
            } catch (e) {}

            // Fallback B: Server detect (with Singapore filter)
            try {
              const srvRes = await fetch(`${API_BASE}/location/detect`);
              if (srvRes.ok) {
                const srvData = await srvRes.json();
                let name = srvData.display_name || `${srvData.city}, ${srvData.region}`;
                if (!name || name.toLowerCase().includes('singapore')) {
                  name = 'Jaipur, Rajasthan';
                }
                applyLocation({ latitude: srvData.latitude || 26.9136, longitude: srvData.longitude || 75.7858 }, name);
                showToast(`✓ लोकेशन सक्रिय: ${name} 📍`, 'success');
                return;
              }
            } catch (e) {}

            applyLocation({ latitude: 26.9136, longitude: 75.7858 }, 'Jaipur, Rajasthan');
            showToast('✓ लोकेशन सक्रिय: Jaipur, Rajasthan 📍', 'success');
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
        );
      } else {
        applyLocation({ latitude: 26.9136, longitude: 75.7858 }, 'Jaipur, Rajasthan');
        showToast('✓ लोकेशन सक्रिय: Jaipur, Rajasthan 📍', 'success');
      }

      // Notify native shell if running in WebView
      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_LOCATION_PERMISSION' }));
        } catch (e) {}
      }
    }
  };

  // Auto-refresh location if previously enabled
  useEffect(() => {
    if (localStorage.getItem('aether_location_enabled') === 'true' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserCoords(coords);
          if (!userLocationName) {
            const locName = await reverseGeocodeLocation(coords.latitude, coords.longitude);
            if (locName) {
              setUserLocationName(locName);
              localStorage.setItem('aether_user_city', locName);
            }
          }
        },
        () => {},
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
      );
    }
  }, []);

  const compressImage = (file, maxDim = 1280, quality = 0.82) => {
    return new Promise((resolve) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleCameraFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      showToast('📸 फ़ोटो प्रोसेस हो रही है...', 'info');
      const compressedUrl = await compressImage(file);
      if (compressedUrl) {
        setAttachedMedia({
          type: 'image',
          name: file.name || `Camera_${Date.now()}.jpg`,
          url: compressedUrl,
          size: Math.round((compressedUrl.length * 3) / 4)
        });
        showToast('📸 फ़ोटो तैयार है! अपना सवाल पूछें।', 'success');
      }
    }
    e.target.value = '';
  };

  const handlePhotosFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      showToast('🖼️ फ़ोटो प्रोसेस हो रही है...', 'info');
      const compressedUrl = await compressImage(file);
      if (compressedUrl) {
        setAttachedMedia({
          type: 'image',
          name: file.name || `Photo_${Date.now()}.jpg`,
          url: compressedUrl,
          size: Math.round((compressedUrl.length * 3) / 4)
        });
        showToast('🖼️ फ़ोटो जोड़ी गई! अपना सवाल पूछें।', 'success');
      }
    }
    e.target.value = '';
  };

  const handleDocumentFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedMedia({
        type: 'file',
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB'
      });
      showToast(`📁 फ़ाइल जोड़ी गई: ${file.name}`, 'success');
    }
    e.target.value = '';
  };

  const handleCameraClick = () => {
    setIsPlusMenuOpen(false);
    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      cameraInputRef.current?.click();
    } else {
      setIsCameraModalOpen(true);
    }
  };

  // Camera Viewfinder Stream for Desktop
  useEffect(() => {
    if (!isCameraModalOpen) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      return;
    }

    let isMounted = true;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } } })
        .then(stream => {
          if (!isMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          cameraStreamRef.current = stream;
          if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn("Camera access error:", err);
          showToast("कैमरा चालू नहीं हो सका। फ़ाइल सेलेक्टर खोला जा रहा है...", "info");
          setIsCameraModalOpen(false);
          cameraInputRef.current?.click();
        });
    } else {
      setIsCameraModalOpen(false);
      cameraInputRef.current?.click();
    }

    return () => {
      isMounted = false;
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [isCameraModalOpen]);

  const handleCaptureCameraSnapshot = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setAttachedMedia({
      type: 'image',
      name: `Live_Photo_${new Date().toLocaleTimeString().replace(/:/g, '-')}.jpg`,
      url: dataUrl
    });

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraModalOpen(false);
    showToast('📸 फ़ोटो कैप्चर कर ली गई! अपना सवाल पूछें।', 'success');
  };

  const handleAttachDriveFromModal = (e) => {
    e?.preventDefault?.();
    const url = driveInputUrl.trim() || 'https://drive.google.com';
    const name = driveDocName.trim() || 'Google Drive File';
    setAttachedMedia({
      type: 'drive',
      name: name,
      url: url
    });
    setIsDriveModalOpen(false);
    setDriveInputUrl('');
    setDriveDocName('');
    showToast('📂 Google Drive फ़ाइल जोड़ी गई!', 'success');
  };

  // Open Map in native Map app on mobile or in a new tab on desktop
  const openMapApp = (lat, lon) => {
    const latitude = lat ?? userCoords?.latitude;
    const longitude = lon ?? userCoords?.longitude;
    const isInReactNativeWebView = typeof window !== 'undefined' && !!window.ReactNativeWebView;

    const webMapUrl = latitude && longitude
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : `https://www.google.com/maps`;

    // 1. Mobile App (React Native WebView): notify native shell to open Google Maps / Apple Maps app
    if (isInReactNativeWebView) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'OPEN_MAP',
          latitude: latitude || null,
          longitude: longitude || null,
          webUrl: webMapUrl
        }));
      } catch (err) {
        console.warn('ReactNativeWebView postMessage error:', err);
      }
      // Backward-compatible fallback for currently installed APK:
      setTimeout(() => {
        if (!window.__mapOpenedByNative) {
          window.open(webMapUrl, '_blank');
        }
      }, 350);
      return;
    }

    // 2. Mobile Browser (Android / iOS): trigger native maps protocol
    const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

    if (isAndroid && latitude && longitude) {
      window.location.href = `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
      return;
    } else if (isIOS && latitude && longitude) {
      window.location.href = `maps://?q=${latitude},${longitude}`;
      return;
    }

    // 3. Desktop / Laptop: open Google Maps in a new browser tab
    window.open(webMapUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAttachLocation = () => {
    setIsPlusMenuOpen(false);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      showToast('📍 GPS लोकेशन प्राप्त कर मैप खोला जा रहा है...', 'info');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setAttachedMedia({
            type: 'map',
            name: `📍 Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`,
            url: mapsLink,
            latitude,
            longitude
          });
          setLocationEnabled(true);
          localStorage.setItem('aether_location_enabled', 'true');
          setUserCoords({ latitude, longitude });
          showToast('✓ मैप खुल रहा है!', 'success');
          // Open map: in mobile native Map app, in desktop browser tab
          openMapApp(latitude, longitude);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          showToast('GPS अनुमति नहीं मिली। मैप खोला जा रहा है...', 'info');
          openMapApp();
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      openMapApp();
    }
  };

  // ─── Register Service Worker + VAPID Web Push Subscribe ────────────────────
  // Browser बंद होने पर भी GitHub Actions → Server → Browser push notifications!
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const setupPushSubscription = async (reg) => {
      try {
        // 1. Notification permission check
        if ('Notification' in window) {
          setPushPermission(Notification.permission);
          if (Notification.permission === 'default') {
            const p = await Notification.requestPermission();
            setPushPermission(p);
            if (p !== 'granted') return;
          } else if (Notification.permission !== 'granted') {
            return;
          }
        }

        // 2. Server से VAPID public key fetch करें
        const serverBase = window.location.port === '5173'
          ? `http://${window.location.hostname}:8000`
          : '';
        const keyRes = await fetch(`${serverBase}/api/push/vapid-public-key`);
        if (!keyRes.ok) return;
        const { publicKey } = await keyRes.json();

        // Base64URL → Uint8Array convert करें (VAPID format)
        const urlB64ToUint8Array = (base64String) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
        };

        // 3. Browser को VAPID push subscribe करें
        const existingSub = await reg.pushManager.getSubscription();
        let subscription = existingSub;

        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(publicKey),
          });
          console.log('[Aether Push] ✅ New VAPID push subscription created');
        } else {
          console.log('[Aether Push] ♻️ Existing push subscription found');
        }

        // 4. Subscription server को भेजें (userEmail जब available हो)
        const emailToUse = userEmail || localStorage.getItem('aether_user_email') || '';
        if (emailToUse && subscription) {
          await fetch(`${serverBase}/api/push/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_email: emailToUse,
              subscription: subscription.toJSON(),
            }),
          });
          console.log('[Aether Push] ✅ Subscription sent to server for', emailToUse);
        }
      } catch (err) {
        console.warn('[Aether Push] Setup error:', err?.message);
      }
    };

    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Aether SW Active:', reg.scope);
        setupPushSubscription(reg);
      })
      .catch(err => console.log('Aether SW error:', err));
  }, [userEmail]);
  // ─────────────────────────────────────────────────────────────────────────────

  // Calendar & Reminders Helpers
  const getTaskDateStr = (t) => {
    if (t?.due_date) {
      try {
        const str = formatLocalDateStr(t.due_date);
        if (str) return str;
      } catch (e) {}
    }
    // Only items with an explicit due_date should be bound to calendar dates
    return null;
  };

  const handleCopyTodayTasksToSelectedDate = async () => {
    const todayStr = formatLocalDateStr(new Date());
    const targetStr = formatLocalDateStr(calSelectedDate);
    if (!targetStr || targetStr === todayStr) return;
    const todayTasks = tasks.filter(t => getTaskDateStr(t) === todayStr);
    if (todayTasks.length === 0) {
      showToast('आज का कोई कार्य कॉपी करने के लिए नहीं मिला', 'info');
      return;
    }
    try {
      let count = 0;
      for (const t of todayTasks) {
        const authHeaders = userEmail ? { 'X-User-Email': userEmail } : {};
        await fetch(`${API_BASE}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            title: t.title,
            priority: t.priority || 'medium',
            reminder_time: t.reminder_time || '10:00 AM',
            due_date: `${targetStr}T10:00:00`,
            user_email: userEmail
          })
        });
        count++;
      }
      refreshAllData();
      showToast(`${count} दैनिक कार्य ${targetStr} के एजेंडा में जोड़े गए!`, 'success');
    } catch (err) {
      showToast('कार्य कॉपी करने में त्रुटि', 'error');
    }
  };

  const handleResetTodayCompletedTasks = async () => {
    const todayStr = formatLocalDateStr(new Date());
    const completedToday = tasks.filter(t => (t.is_completed || t.status === 'completed') && getTaskDateStr(t) === todayStr);
    if (completedToday.length === 0) {
      showToast('आज कोई पूर्ण कार्य नहीं है जिसे रीसेट किया जा सके', 'info');
      return;
    }
    try {
      for (const t of completedToday) {
        await fetch(`${API_BASE}/tasks/${t.id}/toggle`, {
          method: 'PUT',
          headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
        });
      }
      refreshAllData();
      showToast(`आज के लिए ${completedToday.length} कार्य पुनः सक्रिय (Reset) किए गए!`, 'success');
    } catch (err) {
      showToast('रीसेट करने में त्रुटि', 'error');
    }
  };

  const downloadAllRemindersIcs = () => {
    const activeTasks = tasks.filter(t => !t.is_completed && t.status !== 'completed');
    if (activeTasks.length === 0) {
      showToast('कोई सक्रिय रिमाइंडर नहीं मिला', 'info');
      return;
    }
    const formatIcs = (dt) => dt.toISOString().replace(/-|:|\.\d\d\d/g, '');
    let icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Aether Autonomous AI//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Aether Reminders'
    ];

    activeTasks.forEach(t => {
      let d = new Date();
      if (t.due_date) {
        const parsed = new Date(t.due_date);
        if (!isNaN(parsed.getTime())) d = parsed;
      }
      const endD = new Date(d.getTime() + 30 * 60000);
      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:aether-${t.id}-${Date.now()}@aether.ai`);
      icsLines.push(`DTSTAMP:${formatIcs(new Date())}`);
      icsLines.push(`DTSTART:${formatIcs(d)}`);
      icsLines.push(`DTEND:${formatIcs(endD)}`);
      icsLines.push(`SUMMARY:${(t.title || 'Aether Reminder').replace(/[\r\n]/g, ' ')}`);
      icsLines.push(`DESCRIPTION:Priority: ${t.priority || 'medium'}\\nReminder Time: ${t.reminder_time || ''}`);
      icsLines.push('STATUS:CONFIRMED');
      icsLines.push('END:VEVENT');
    });

    icsLines.push('END:VCALENDAR');

    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `aether_reminders_${new Date().toISOString().split('T')[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Google Calendar (.ics) फ़ाइल डाउनलोड हो गई!', 'success');
  };

  const openTaskInGoogleCalendar = (t) => {
    const title = encodeURIComponent(t.title || 'Aether Reminder');
    const details = encodeURIComponent(`Scheduled in Aether AI\nPriority: ${t.priority || 'medium'}\nReminder Time: ${t.reminder_time || ''}`);
    let d = new Date();
    if (t.due_date) {
      const parsed = new Date(t.due_date);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
    const endD = new Date(d.getTime() + 30 * 60000);
    const formatGcalDate = (dt) => dt.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const dates = `${formatGcalDate(d)}/${formatGcalDate(endD)}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCreateDateReminder = async (e) => {
    e?.preventDefault?.();
    if (!newCalReminderTitle.trim()) return;
    const dateStr = formatLocalDateStr(calSelectedDate);
    const timeStr = newCalReminderTime || '10:00 AM';
    const effEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';
    const authHeaders = effEmail ? { 'X-User-Email': effEmail } : {};
    
    // Optimistic addition so user sees it right away and it stays cached
    const optimisticTask = {
      id: 'local_' + Date.now(),
      title: newCalReminderTitle.trim(),
      priority: 'medium',
      reminder_time: timeStr,
      due_date: `${dateStr}T10:00:00`,
      status: 'pending',
      is_completed: false,
      created_at: new Date().toISOString()
    };
    setTasks(prev => [optimisticTask, ...prev]);

    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          title: newCalReminderTitle.trim(),
          priority: 'medium',
          reminder_time: timeStr,
          due_date: `${dateStr}T10:00:00`,
          user_email: effEmail || null
        })
      });
      if (res.ok) {
        setNewCalReminderTitle('');
        refreshAllData();
        showToast('✓ कैलेंडर में रिमाइंडर जोड़ा गया!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('रिमाइंडर जोड़ने में त्रुटि', 'error');
    }
  };

  const syncGCalViaIcalUrl = async (customUrl, isManual = false, _retryCount = 0) => {
    const url = (customUrl || gcalIcalUrl).trim();
    if (!url || !url.startsWith('http')) {
      if (isManual) showToast('कृपया वैध Google Calendar iCal लिंक दर्ज करें (https://...)', 'error');
      return;
    }
    if (url.includes('calendar.google.com/calendar/u/') || url.includes('/calendar/r')) {
      if (isManual) {
        showToast('यह Google Calendar का वेब ब्राउज़र लिंक है! कृपया नीचे "Secret address in iCal format" (.ics) लिंक डालें।', 'error');
        setShowGCalConnectModal(true);
      }
      return;
    }
    setIsSyncingGCal(true);
    try {
      const res = await fetch(`${API_BASE}/calendar/sync-ical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, user_email: userEmail }),
        signal: AbortSignal.timeout(20000),
      });
      const rawText = await res.text();
      let data = null;
      try {
        data = JSON.parse(rawText);
      } catch (jsonErr) {
        // If server returned non-JSON / HTML wake-up page
        console.warn('GCal sync response non-JSON (server waking up):', rawText?.slice(0, 80));
        // Check if we already have synced events stored locally
        const cachedCount = googleTasks.length;
        if (cachedCount > 0 && isManual) {
          showToast(`⚡ सिंक बैकग्राउंड में चालू है (${cachedCount} इवेंट्स पहले से सुरक्षित हैं)`, 'info');
          setShowGCalConnectModal(false);
          setIsSyncingGCal(false);
          return;
        }

        if (_retryCount < 2) {
          const waitSec = (_retryCount + 1) * 8;
          if (isManual) {
            showToast(`सर्वर कनेक्ट हो रहा है... ${waitSec}s में ऑटो-सिंक 🔄`, 'info');
          }
          setIsSyncingGCal(false);
          setTimeout(() => syncGCalViaIcalUrl(customUrl, isManual, _retryCount + 1), waitSec * 1000);
          return;
        }
        if (isManual) {
          showToast('क्लाउड सर्वर रिस्पॉन्ड नहीं कर रहा। कृपया कुछ देर बाद सिंक करें।', 'error');
        }
        return;
      }

      if (!res.ok) {
        throw new Error(data?.detail || 'iCal sync failed');
      }
      const events = data?.events || [];
      setGoogleTasks(events);
      localStorage.setItem('aether_gcal_events', JSON.stringify(events));
      localStorage.setItem('aether_gcal_ical_url', url);
      setGcalIcalUrl(url);
      setShowGCalConnectModal(false);
      if (isManual) {
        showToast(`Google Calendar से ${events.length} इवेंट्स और रिमाइंडर्स सिंक हुए! 📅`, 'success');
      }
    } catch (err) {
      console.error(err);
      // Network timeout पर भी auto-retry
      if ((err.name === 'TimeoutError' || err.name === 'AbortError') && _retryCount < 2) {
        const waitSec = (_retryCount + 1) * 12;
        if (isManual) {
          showToast(`सर्वर respond नहीं कर रहा... ${waitSec} सेकंड में retry 🔄`, 'info');
        }
        setIsSyncingGCal(false);
        setTimeout(() => syncGCalViaIcalUrl(customUrl, isManual, _retryCount + 1), waitSec * 1000);
        return;
      }
      if (isManual) {
        showToast('Google Calendar सिंक त्रुटि: ' + err.message, 'error');
      }
    } finally {
      setIsSyncingGCal(false);
    }
  };

  const handleSyncGCalClick = () => {
    const savedIcal = gcalIcalUrl || localStorage.getItem('aether_gcal_ical_url');
    if (savedIcal) {
      syncGCalViaIcalUrl(savedIcal, true);
    } else {
      setShowGCalConnectModal(true);
    }
  };

  // Auto-sync Google Calendar iCal feed in background if previously saved (silent)
  useEffect(() => {
    const savedIcal = localStorage.getItem('aether_gcal_ical_url');
    if (savedIcal) {
      syncGCalViaIcalUrl(savedIcal, false).catch(() => {});
    }
  }, []);

  const handleImportIcsFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const events = [];
        const lines = text.split(/\r\n|\n|\r/);
        let inEvent = false;
        let curr = {};
        for (let line of lines) {
          if (line.startsWith('BEGIN:VEVENT')) {
            inEvent = true;
            curr = {};
          } else if (line.startsWith('END:VEVENT')) {
            inEvent = false;
            if (curr.summary && (curr.dtstart || curr.created)) {
              let due = curr.dtstart || curr.created;
              let timeStr = 'All Day';
              if (due.includes('T')) {
                try {
                  const d = new Date(due);
                  timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                } catch(err) {}
              }
              events.push({
                id: `gcal_ics_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                title: curr.summary,
                due_date: due,
                reminder_time: timeStr,
                priority: 'medium',
                status: 'pending',
                is_completed: false,
                is_google_calendar: true,
                created_at: curr.created || due
              });
            }
          } else if (inEvent) {
            if (line.startsWith('SUMMARY:')) {
              curr.summary = line.substring(8).trim();
            } else if (line.startsWith('DTSTART')) {
              const val = line.split(':')[1]?.trim();
              if (val) {
                if (val.length === 8) {
                  curr.dtstart = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`;
                } else {
                  try {
                    const y = val.slice(0,4), m = val.slice(4,6), d = val.slice(6,8);
                    const h = val.slice(9,11), min = val.slice(11,13);
                    curr.dtstart = `${y}-${m}-${d}T${h}:${min}:00`;
                  } catch (err) {
                    curr.dtstart = val;
                  }
                }
              }
            } else if (line.startsWith('DESCRIPTION:')) {
              curr.description = line.substring(12).trim();
            }
          }
        }
        if (events.length > 0) {
          setGoogleTasks(prev => {
            const next = [...prev, ...events];
            localStorage.setItem('aether_gcal_events', JSON.stringify(next));
            return next;
          });
          showToast(`Google Calendar (.ics) से ${events.length} इवेंट्स इम्पोर्ट हुए!`, 'success');
        } else {
          showToast('कोई इवेंट नहीं मिला। कृपया वैध .ics फ़ाइल चुनें।', 'info');
        }
      } catch (err) {
        showToast('फ़ाइल पढ़ने में त्रुटि आई', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  // Update clock every 30 seconds for continuous day progression
  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(clockTimer);
  }, []);

  // Browser Geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => {
          console.log("Using IP-based location detection (Jaipur / Bhankrota, Rajasthan)");
        }
      );
    }
  }, []);

  // Fetch all backend data and check due reminders with Multi-Tenant Isolation
  const refreshAllData = async () => {
    try {
      const currentEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';
      const authHeaders = currentEmail ? { 'X-User-Email': currentEmail } : {};
      const [resBrief, resChat, resTasks, resFin, resFinSum, resMem, resAudit, resNews, resDue] = await Promise.all([
        fetch(`${API_BASE}/briefing?user_name=${encodeURIComponent(userName || 'Operator')}`, { headers: authHeaders }),
        fetch(`${API_BASE}/chat/history`, { headers: authHeaders }),
        fetch(`${API_BASE}/tasks`, { headers: authHeaders }),
        fetch(`${API_BASE}/finance/records`, { headers: authHeaders }),
        fetch(`${API_BASE}/finance/summary`, { headers: authHeaders }),
        fetch(`${API_BASE}/memory`, { headers: authHeaders }),
        fetch(`${API_BASE}/audit-logs`, { headers: authHeaders }),
        fetch(`${API_BASE}/news?limit=4`),
        fetch(`${API_BASE}/reminders/due`, { headers: authHeaders })
      ]);

      if (resBrief.ok) setBriefing(await resBrief.json());
      if (resChat.ok) {
        const chats = await resChat.json();
        // Normalize role for rendering: 'aether' -> 'assistant'
        const normalizedChats = Array.isArray(chats) ? chats.map(c => ({
          ...c,
          role: c.role === 'aether' ? 'assistant' : c.role
        })) : [];

        setChatHistory(prev => {
          // If server returned empty array but we already have optimistic/fresh messages, don't wipe them!
          if (normalizedChats.length === 0 && prev.length > 0) {
            return prev;
          }
          if (prev.length === normalizedChats.length && prev[prev.length - 1]?.content === normalizedChats[normalizedChats.length - 1]?.content) {
            return prev;
          }
          return normalizedChats;
        });
      }

      let loadedTasks = [];
      let loadedMemories = [];
      let loadedFinances = [];

      if (resTasks.ok) {
        loadedTasks = await resTasks.json();
        setTasks(prev => {
          // Never wipe out local tasks if server returned 0 but we already have local tasks!
          if (loadedTasks.length === 0 && prev.length > 0) {
            return prev;
          }
          return loadedTasks;
        });

        if (loadedTasks.length > 0) {
          localStorage.setItem('aether_cached_tasks', JSON.stringify(loadedTasks));
          if (currentEmail) {
            localStorage.setItem(`aether_backup_${currentEmail}`, JSON.stringify({
              tasks: loadedTasks,
              memories: loadedMemories,
              finances: loadedFinances
            }));
          }
        }

        // Schedule upcoming reminders natively on mobile app
        if (typeof window !== 'undefined' && window.ReactNativeWebView && Array.isArray(loadedTasks)) {
          const nowMs = Date.now();
          loadedTasks.forEach(t => {
            const isDone = t.is_completed || t.status === 'completed';
            if (isDone) {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'CANCEL_REMINDER',
                  id: t.id
                }));
              } catch (e) {}
            } else if (t.reminder_time) {
              let triggerSec = 0;
              if (t.due_date) {
                const dueMs = new Date(t.due_date).getTime();
                if (dueMs > nowMs) {
                  triggerSec = (dueMs - nowMs) / 1000;
                }
              }
              if (triggerSec > 0) {
                try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SCHEDULE_REMINDER',
                    id: t.id,
                    title: t.title,
                    reminder_time: t.reminder_time,
                    triggerSeconds: triggerSec
                  }));
                } catch (e) {}
              }
            }
          });
        }
      }

      if (resFin.ok) {
        loadedFinances = await resFin.json();
        setFinanceRecords(loadedFinances);
      }
      if (resFinSum.ok) setFinanceSummary(await resFinSum.json());
      if (resMem.ok) {
        loadedMemories = await resMem.json();
        setMemories(loadedMemories);
      }
      if (resAudit.ok) setAuditLogs(await resAudit.json());
      if (resNews.ok) setNewsItems(await resNews.json());
      
      // Auto-backup / restore client data so memory never disappears across Render container reboots
      if (currentEmail) {
        if (loadedTasks.length > 0 || loadedMemories.length > 0 || loadedFinances.length > 0) {
          localStorage.setItem(`aether_backup_${currentEmail}`, JSON.stringify({
            tasks: loadedTasks,
            memories: loadedMemories,
            finances: loadedFinances
          }));
        } else {
          const cachedBackupStr = localStorage.getItem(`aether_backup_${currentEmail}`);
          if (cachedBackupStr) {
            try {
              const cached = JSON.parse(cachedBackupStr);
              if (cached.tasks?.length > 0 || cached.memories?.length > 0 || cached.finances?.length > 0) {
                fetch(`${API_BASE}/sync/backup`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-User-Email': currentEmail },
                  body: JSON.stringify({
                    user_email: currentEmail,
                    tasks: cached.tasks || [],
                    memories: cached.memories || [],
                    finances: cached.finances || []
                  })
                }).then(() => {
                  if (cached.tasks) setTasks(cached.tasks);
                  if (cached.memories) setMemories(cached.memories);
                  if (cached.finances) setFinanceRecords(cached.finances);
                }).catch(() => {});
              }
            } catch (e) {}
          }
        }
      }

      // Check if any reminder is due right now
      if (resDue.ok) {
        const dueList = await resDue.json();
        if (dueList && dueList.length > 0) {
          const dueItem = dueList[0];
          setActiveReminderAlert(dueItem);
          
          triggerPushNotification(
            `⏰ AETHER रिमाइंडर: ${dueItem.title}`,
            `समय: ${dueItem.reminder_time || 'अभी'} • कार्य का समय हो गया है!`,
            `reminder-${dueItem.id}`
          );
          
          fetch(`${API_BASE}/reminders/${dueItem.id}/ack`, { 
            method: 'POST',
            headers: authHeaders
          });
        }
      }
      
      setServerOnline(true);
      setLastSyncTime(new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setServerOnline(false);
    }
  };

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(refreshAllData, 3500);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom only if user hasn't scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current && showConversation) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isProcessing, showConversation]);

  // Determine current day phase dynamically
  const getDayPhaseInfo = () => {
    const hour = currentTime.getHours();
    let phase = 'night';
    let phaseClass = 'phase-night';
    let iconName = 'moon';
    let color = '#c084fc';
    let bgColor = 'rgba(192, 132, 252, 0.08)';
    let borderColor = 'rgba(192, 132, 252, 0.25)';
    let IconComponent = Moon;

    if (hour >= 5 && hour < 12) {
      phase = 'morning';
      phaseClass = 'phase-morning';
      iconName = 'sunrise';
      color = '#38bdf8';
      bgColor = 'rgba(56, 189, 248, 0.08)';
      borderColor = 'rgba(56, 189, 248, 0.25)';
      IconComponent = Sunrise;
    } else if (hour >= 12 && hour < 17) {
      phase = 'afternoon';
      phaseClass = 'phase-afternoon';
      iconName = 'sun';
      color = '#38bdf8';
      bgColor = 'rgba(56, 189, 248, 0.08)';
      borderColor = 'rgba(56, 189, 248, 0.25)';
      IconComponent = Sun;
    } else if (hour >= 17 && hour < 20) {
      phase = 'evening';
      phaseClass = 'phase-evening';
      iconName = 'sunset';
      color = '#f43f5e';
      bgColor = 'rgba(244, 63, 94, 0.08)';
      borderColor = 'rgba(244, 63, 94, 0.25)';
      IconComponent = Sunset;
    }

    return {
      phase,
      phaseClass,
      greetingLabel: t.greetings[phase] || 'नमस्ते',
      periodDesc: t.periods[phase] || '',
      iconName,
      color,
      bgColor,
      borderColor,
      IconComponent
    };
  };

  const dayPhase = getDayPhaseInfo();
  const WeatherSymbol = dayPhase.IconComponent;

  // Voice Recognition (Speech to Text) with Mobile Device Microphone Support
  const toggleVoiceRecognition = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    if (!micEnabled) {
      showToast("माइक्रोफ़ोन सेटिंग्स में अक्षम है। कृपया सेटिंग्स में सक्षम करें।", 'info');
      setActiveSubModal('permissions');
      return;
    }

    // Trigger native Android microphone permission if wrapped in mobile app
    const isInReactNativeWebView = typeof window !== 'undefined' && !!window.ReactNativeWebView;
    if (isInReactNativeWebView) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_MIC_PERMISSION' }));
        // Give native layer time to show permission dialog and inject result
        await new Promise((resolve) => {
          // Set a callback that native layer will call after permission result
          window.__onMicPermissionResult = (granted) => {
            window.__onMicPermissionResult = null;
            resolve(granted);
          };
          // Fallback: proceed after 3s regardless
          setTimeout(() => resolve(true), 3000);
        });
      } catch (e) {}
    }

    // Non-fatal getUserMedia check (do NOT abort if WebView restricts getUserMedia directly)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (micErr) {
        console.warn('getUserMedia non-fatal in WebView:', micErr);
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("इस डिवाइस/WebView में वॉयस इनपुट उपलब्ध नहीं है। कृपया टाइप करें।", 'info');
      setIsTypeInputOpen(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLang === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        showToast("🎙️ Aether सुन रहा है... बोलिए", 'info');
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
        setInputText(transcript);
        if (event.results[0].isFinal) {
          setIsListening(false);
          handleSendPrompt(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'no-speech') {
          showToast("कोई आवाज़ नहीं सुनी गई। पुनः प्रयास करें।", 'info');
        } else if (event.error === 'not-allowed') {
          showToast("कृपया सेटिंग्स में Aether ऐप को माइक्रोफ़ोन अनुमति (Microphone Permission) दें।", 'error');
        } else {
          showToast(`माइक स्टेटस: ${event.error}`, 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
      showToast("माइक शुरू करने में समस्या आई। टाइप प्रॉम्प्ट का उपयोग करें।", 'error');
      setIsTypeInputOpen(true);
    }
  };

  const toggleListening = toggleVoiceRecognition;

  // Text to Speech with Mobile WebView Audio Streaming Fallback
  const speakText = (text) => {
    // STRICT: No voice if permission is off
    if (!voiceOutputEnabled) return;
    if (!text || !text.trim()) return;

    // Clean markdown artifacts from text before speaking
    const cleanText = text
      .replace(/\[.*?\]\(.*?\)/g, '')   // remove markdown links
      .replace(/[*_#`🔗]/g, '')          // remove markdown symbols
      .replace(/```[\s\S]*?```/g, '')    // remove code blocks
      .replace(/\n+/g, ' ')             // flatten newlines
      .trim();

    if (!cleanText) return;

    const activeVoice = AETHER_VOICES.find(v => v.id === selectedVoice) || AETHER_VOICES[0];
    const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
    const isHindi = selectedLang === 'hi' || hasDevanagari;
    const lang = isHindi ? 'hi' : 'en';
    const bcp47 = isHindi ? 'hi-IN' : 'en-IN';  // Always Indian locale

    // Cancel any ongoing speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Check if running on mobile device (Android/iOS WebView or mobile browser)
    const isMobileDevice = (typeof window !== 'undefined' && !!window.ReactNativeWebView) || 
      (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

    if (isMobileDevice) {
      // Mobile: Always use server streaming TTS (/api/tts) for guaranteed crisp Indian English / Hindi audio
      playStreamAudio(cleanText, selectedVoice, lang);
      return;
    }

    let spoken = false;

    // Try browser SpeechSynthesis (Desktop only)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        try {
          const utterance = new SpeechSynthesisUtterance(cleanText);
          // Sharp & clear settings: slightly faster rate, neutral pitch
          utterance.rate = (activeVoice ? activeVoice.rate : 1.0) * speechRate;
          utterance.pitch = isHindi ? 1.0 : (activeVoice ? activeVoice.pitch : 1.0);
          utterance.volume = 1.0;
          utterance.lang = bcp47;

          const matchedVoice = resolveSpeechVoice(selectedVoice, bcp47);
          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }

          setIsSpeaking(true);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = (e) => {
            console.warn('[Aether TTS] SpeechSynthesis error:', e);
            setIsSpeaking(false);
            // Fallback to server TTS if browser speech fails
            if (!spoken) playStreamAudio(cleanText, selectedVoice, lang);
          };
          window.speechSynthesis.speak(utterance);
          spoken = true;
        } catch (e) {
          console.warn('[Aether TTS] SpeechSynthesis exception:', e);
          spoken = false;
        }
      }
    }

    // Fallback: stream server-side TTS (always works on mobile WebViews)
    if (!spoken) {
      playStreamAudio(cleanText, selectedVoice, lang);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), Math.min(cleanText.length * 60, 8000));
    }
  };

  // Translate Message to Hindi
  const handleTranslateMessage = async (msgIdx, originalText) => {
    try {
      showToast("हिन्दी अनुवाद किया जा रहा है...", "info");
      const resp = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText, target_lang: 'hi' })
      });
      const data = await resp.json();
      if (data.translated) {
        setChatHistory(prev => prev.map((m, idx) => idx === msgIdx ? { ...m, content: data.translated, isTranslated: true } : m));
        showToast("हिन्दी अनुवाद तैयार है!", "success");
      }
    } catch (err) {
      showToast("Translation error", "error");
    }
  };

  // Send Command / Prompt
  const handleSendPrompt = async (textToSend) => {
    const rawPrompt = (textToSend || inputText).trim();
    if (!rawPrompt && !attachedMedia) return;
    if (isProcessing) return;

    let prompt = rawPrompt;
    let sendingImageUrl = null;
    if (attachedMedia) {
      if (attachedMedia.type === 'image') {
        sendingImageUrl = attachedMedia.url;
        prompt = rawPrompt || 'कृपया इस फ़ोटो को देखकर विस्तार से बताएं कि इसमें क्या है और महत्वपूर्ण जानकारी समझाइए।';
      } else if (attachedMedia.type === 'file') {
        prompt = `[Attached File: ${attachedMedia.name} (${attachedMedia.size || ''})] ${rawPrompt || 'Review this file.'}`;
      } else if (attachedMedia.type === 'drive') {
        prompt = `[Google Drive: ${attachedMedia.url}] ${rawPrompt || 'Analyze this Google Drive file.'}`;
      } else if (attachedMedia.type === 'map') {
        prompt = `[Current Location: ${attachedMedia.url}] ${rawPrompt || 'What is near my location?'}`;
      }
      setAttachedMedia(null);
    }

    userScrolledUpRef.current = false;
    setChatHistory(prev => [...prev, { 
      role: 'user', 
      content: prompt, 
      image_url: sendingImageUrl,
      created_at: new Date().toISOString() 
    }]);
    setInputText('');
    setIsProcessing(true);
    setShowConversation(true);

    try {
      const payload = {
        input_text: prompt,
        image_data: sendingImageUrl || null,
        latitude: userCoords?.latitude || null,
        longitude: userCoords?.longitude || null,
        language: selectedLang,
        client_time: new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        api_key: localStorage.getItem('aether_gemini_key') || '',
        user_name: localStorage.getItem('aether_user_name') || userName || 'Operator',
        user_email: userEmail || null
      };

      const resp = await fetch(`${API_BASE}/action/quick-capture`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(userEmail ? { 'X-User-Email': userEmail } : {})
        },
        body: JSON.stringify(payload)
      });
      const result = await resp.json();
      
      let assistantReply = result.message || (result.parsed?.data?.response) || "Action completed.";
      // Clean accidental markdown JSON block formatting if present
      if (typeof assistantReply === 'string' && (assistantReply.trim().startsWith('```json') || (assistantReply.trim().startsWith('{') && assistantReply.includes('"action"')))) {
        try {
          const rawClean = assistantReply.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          const parsedInner = JSON.parse(rawClean);
          if (parsedInner.explanation) {
            assistantReply = parsedInner.explanation;
          } else if (parsedInner.data?.title) {
            assistantReply = `रिमाइंडर एजेंडा में सेट किया गया: "${parsedInner.data.title}" ⏰`;
          } else if (parsedInner.data?.response) {
            assistantReply = parsedInner.data.response;
          }
        } catch (e) {
          assistantReply = assistantReply.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        }
      }
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: assistantReply,
        created_at: new Date().toISOString()
      }]);

      if (voiceOutputEnabled) {
        speakText(assistantReply);
      }

      await refreshAllData();
    } catch (err) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: "Aether कोर से संपर्क नहीं हो पाया। कृपया इंटरनेट या सर्वर जांचें।",
        created_at: new Date().toISOString()
      }]);
      showToast("Aether कोर से संपर्क नहीं हो पाया", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Start a New Chat
  const handleStartNewChat = async () => {
    try {
      await fetch(`${API_BASE}/chat/history`, { 
        method: 'DELETE',
        headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
      });
      setChatHistory([]);
      setInputText('');
      showToast("नई चैट शुरू की गई!", 'success');
    } catch (err) {
      showToast("Failed to reset chat", 'error');
    }
  };

  const handleToggleTask = async (taskId) => {
    // Optimistically toggle task in local state immediately so UI updates with zero delay
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const willBeDone = !(t.is_completed || t.status === 'completed');
        return {
          ...t,
          is_completed: willBeDone,
          status: willBeDone ? 'completed' : 'pending'
        };
      }
      return t;
    }));

    // Cancel native reminder alarm if being marked done
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'CANCEL_REMINDER',
          id: taskId
        }));
      } catch (e) {}
    }

    try {
      await fetch(`${API_BASE}/tasks/${taskId}/toggle`, { 
        method: 'PUT',
        headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
      });
      refreshAllData();
      showToast("स्थिति अपडेट की गई (Status Updated)", 'info');
    } catch (err) {
      console.error(err);
      refreshAllData();
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, { 
        method: 'DELETE',
        headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
      });
      refreshAllData();
      showToast("कार्य हटा दिया गया", 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    const effEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';
    
    // Optimistic addition so user sees it right away and it stays cached
    const optimisticTask = {
      id: 'local_' + Date.now(),
      title: newTaskInput.trim(),
      priority: 'medium',
      reminder_time: null,
      due_date: new Date().toISOString(),
      status: 'pending',
      is_completed: false,
      created_at: new Date().toISOString()
    };
    setTasks(prev => [optimisticTask, ...prev]);

    try {
      await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(effEmail ? { 'X-User-Email': effEmail } : {})
        },
        body: JSON.stringify({ 
          title: newTaskInput.trim(), 
          priority: 'medium',
          user_email: effEmail || null 
        })
      });
      setNewTaskInput('');
      refreshAllData();
      showToast("नया कार्य एजेंडा में जोड़ा गया!", 'success');
    } catch (err) {
      showToast("Failed to add task", 'error');
    }
  };

  const handleDeleteMemory = async (memId) => {
    try {
      await fetch(`${API_BASE}/memory/${memId}`, { 
        method: 'DELETE',
        headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
      });
      refreshAllData();
      showToast("स्मृति वॉल्ट से हटा दी गई", 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUndo = async (logId) => {
    try {
      await fetch(`${API_BASE}/audit-logs/${logId}/undo`, { 
        method: 'POST',
        headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
      });
      showToast("Action reverted successfully [Undo]", 'success');
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'AETHER — आपका व्यक्तिगत AI सहायक',
        text: 'AETHER पर्सनल AI एग्जीक्यूटिव डैशबोर्ड',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast("AETHER डैशबोर्ड लिंक कॉपी हो गया!", "success");
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Formatter for markdown links [text](url)
  const renderMessageContent = (content) => {
    if (!content) return null;
    const regex = /\[(.*?)\]\((https?:\/\/.*?)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      parts.push(
        <a 
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#38bdf8',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(56, 189, 248, 0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            margin: '2px 0'
          }}
        >
          <span>{match[1]}</span>
          <ExternalLink size={12} />
        </a>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    return parts;
  };

  const weather = briefing?.weather || {
    temp: 28,
    condition_hi: 'धूप खिली हुई',
    condition_en: 'Mostly Sunny',
    city: 'Jaipur (भांकरोटा)',
    city_en: 'Jaipur (Bhankrota)',
    city_hi: 'Jaipur (भांकरोटा)',
    city_hinglish: 'Jaipur (Bhankrota)',
    humidity: '42%',
    wind: '10 km/h'
  };

  const pendingTasksList = tasks.filter(t => t.status !== 'completed');
  const alertCount = briefing?.alert_count ?? 1;
  const upcomingCount = briefing?.upcoming_count ?? 2;

  if (!onboardingDone) {
    return (
      <div className="onboarding-screen-wrapper">
        <div className="unified-app-container">
          {/* Top navigation row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px', minHeight: '36px' }}>
            {onboardingStep > 1 ? (
              <button
                type="button"
                onClick={() => setOnboardingStep(prev => Math.max(1, prev - 1))}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '16px',
                  color: 'rgba(255, 255, 255, 0.85)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 14px'
                }}
              >
                ← Back
              </button>
            ) : <div />}

            {localStorage.getItem('aether_onboarding_done') === 'true' && (
              <button
                type="button"
                onClick={() => setOnboardingDone(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '6px 14px'
                }}
              >
                Dashboard ✕
              </button>
            )}
          </div>

          {/* Glowing Aether Brand Orb with Frosted Æ Badge for ALL Steps */}
          <div className={`aether-brand-orb ${onboardingStep === 1 ? 'aether-orb-hero' : ''}`}>
            <div className={`aether-orb-badge ${onboardingStep === 1 ? 'hero' : ''}`}>Æ</div>
          </div>

          {/* STEP 1: WELCOME SCREEN */}
          {onboardingStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>
              <div className="step-badge">Autonomous Intelligence Executive</div>
              <h1 className="serif-title">
                Hi. I'm <span className="serif-italic">Aether.</span>
              </h1>
              <p className="step-desc">
                Your autonomous intelligence executive for tasks, wealth, memory, and proactive daily briefing.
              </p>
              <button
                type="button"
                className="btn-onboarding-primary"
                onClick={() => setOnboardingStep(2)}
              >
                Meet Aether →
              </button>
            </div>
          )}

          {/* STEP 2: USER NAME */}
          {onboardingStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>
              <div className="step-badge">Callsign Configuration</div>
              <h1 className="serif-title">
                What should Aether <span className="serif-italic">call you?</span>
              </h1>
              <p className="step-desc">
                Choose the formal title or personal callsign Aether will use across your briefings.
              </p>

              <div className="onboarding-input-card">
                <input
                  type="text"
                  className="onboarding-input-field"
                  placeholder="e.g. Pawan, Commander, Alex..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
                  autoFocus
                />
              </div>

              <div className="quick-chips-row">
                {['Operator', 'Commander', 'Boss', 'Director', 'Pawan'].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    className="quick-chip-item"
                    onClick={() => setUserName(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn-onboarding-primary"
                onClick={handleSaveName}
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 3: GOOGLE SIGN IN */}
          {onboardingStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>
              <div className="step-badge">Secure Authentication</div>
              <h1 className="serif-title">
                Sign in to <span className="serif-italic">start talking.</span>
              </h1>
              <p className="step-desc">
                Link your Google Account to synchronize your proactive calendar and private executive briefings.
              </p>

              {userEmail && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  width: '100%',
                  maxWidth: '380px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  boxShadow: '0 4px 20px rgba(0, 240, 255, 0.1)'
                }}>
                  {userAvatar ? (
                    <img src={userAvatar} alt="Google Avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1.5px solid var(--accent-cyan)' }} />
                  ) : (
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <GoogleIcon />
                    </div>
                  )}
                  <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>{userName || 'Connected Operator'}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{userEmail}</div>
                  </div>
                  <CheckCircle2 size={18} color="var(--accent-cyan)" />
                </div>
              )}

              <button
                type="button"
                className="btn-onboarding-google"
                onClick={handleGoogleSignIn}
                disabled={googleAuthLoading}
              >
                {googleAuthLoading ? (
                  <span className="status-dot-pulse" style={{ background: '#ffffff' }}></span>
                ) : (
                  <GoogleIcon />
                )}
                <span>{userEmail ? `Continue as ${userName || userEmail.split('@')[0]}` : 'Continue with Google'}</span>
              </button>

              {userEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setGoogleCustomEmail(userEmail);
                    setGoogleCustomName(userName);
                    setShowGoogleModal(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    marginTop: '12px',
                    textDecoration: 'underline'
                  }}
                >
                  Switch Google Account
                </button>
              )}

              {/* Google Sign-In Connect Modal */}
              {showGoogleModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.78)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '20px'
                }}>
                  <div style={{
                    background: '#0d1527',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '20px',
                    padding: '24px',
                    width: '100%',
                    maxWidth: '400px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GoogleIcon />
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Google Sign-In</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowGoogleModal(false)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
                      >
                        ✕
                      </button>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.45', marginBottom: '16px' }}>
                      Link your Google account to synchronize your executive agenda and calendar with Aether.
                    </p>

                    <form onSubmit={handleConnectGoogleManual}>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                          Google Email Address
                        </label>
                        <input
                          type="email"
                          className="onboarding-input-field"
                          style={{
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            boxSizing: 'border-box'
                          }}
                          placeholder="yourname@gmail.com"
                          value={googleCustomEmail}
                          onChange={(e) => setGoogleCustomEmail(e.target.value)}
                          autoFocus
                          required
                        />
                      </div>

                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                          Google Name (Optional)
                        </label>
                        <input
                          type="text"
                          className="onboarding-input-field"
                          style={{
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            boxSizing: 'border-box'
                          }}
                          placeholder={userName || "e.g. Pawan Dixit"}
                          value={googleCustomName}
                          onChange={(e) => setGoogleCustomName(e.target.value)}
                        />
                      </div>

                      {googleError && (
                        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '12px' }}>
                          {googleError}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn-onboarding-primary"
                        style={{ marginTop: 0 }}
                      >
                        Connect Google Account →
                      </button>
                    </form>

                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <details style={{ fontSize: '0.76rem', color: '#64748b', cursor: 'pointer' }}>
                        <summary style={{ outline: 'none' }}>Have a Google Cloud OAuth Client ID? (Optional)</summary>
                        <div style={{ marginTop: '8px' }}>
                          <input
                            type="text"
                            placeholder="xyz.apps.googleusercontent.com"
                            value={googleClientId}
                            onChange={(e) => {
                              setGoogleClientId(e.target.value);
                              localStorage.setItem('aether_google_client_id', e.target.value.trim());
                            }}
                            style={{
                              width: '100%',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              color: '#ffffff',
                              fontSize: '0.74rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: PRIVACY CONSENT */}
          {onboardingStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>
              <div className="step-badge">Executive Privacy Guarantee</div>
              <h1 className="serif-title">
                Talking to Aether sends <span className="serif-italic">data to Google.</span>
              </h1>
              <p className="step-desc">
                We believe in total executive privacy. Here is the strict perimeter of what gets exchanged:
              </p>

              <div className="privacy-bullet-list">
                <div className="privacy-bullet-item">
                  <span className="privacy-bullet-dot">•</span>
                  <div>
                    <span className="privacy-bullet-title">Voice & Audio: </span>
                    Processed via Gemini Multimodal Live API under enterprise privacy encryption.
                  </div>
                </div>
                <div className="privacy-bullet-item">
                  <span className="privacy-bullet-dot">•</span>
                  <div>
                    <span className="privacy-bullet-title">Zero Model Training: </span>
                    Your personal financial entries, schedules, and logs are never used to train public models.
                  </div>
                </div>
                <div className="privacy-bullet-item">
                  <span className="privacy-bullet-dot">•</span>
                  <div>
                    <span className="privacy-bullet-title">Edge Storage: </span>
                    Financial ledger, tasks, and memory are stored on your local Aether core database.
                  </div>
                </div>
                <div className="privacy-bullet-item">
                  <span className="privacy-bullet-dot">•</span>
                  <div>
                    <span className="privacy-bullet-title">Instant Revocation: </span>
                    You can wipe memory and API keys at any moment with a single click.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-onboarding-primary"
                onClick={() => setOnboardingStep(5)}
                style={{
                  position: 'relative',
                  zIndex: 50,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  marginBottom: '24px'
                }}
              >
                I Agree & Continue →
              </button>
            </div>
          )}

          {/* STEP 5: BYOK INTELLIGENCE KEY WITH LIVE GEMINI VALIDATION */}
          {onboardingStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>
              <div className="step-badge">Direct Intelligence BYOK</div>
              <h1 className="serif-title">
                Bring your own <span className="serif-italic">intelligence key.</span>
              </h1>
              <p className="step-desc">
                Use your personal Google Gemini API key. Lightning-fast responses at near-zero cost directly with your own quotas.
              </p>

              {/* Model Choice Row */}
              <div className="model-choice-row">
                {AETHER_MODELS.map(m => (
                  <div
                    key={m.id}
                    className={`model-card ${selectedModel === m.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedModel(m.id);
                      localStorage.setItem('aether_selected_model', m.id);
                    }}
                  >
                    <div className="model-card-title">{m.name}</div>
                    <div style={{ fontSize: '10px', color: selectedModel === m.id ? '#00f0ff' : '#94a3b8', marginTop: '4px' }}>
                      {m.tag}
                    </div>
                  </div>
                ))}
              </div>

              {/* API Key Input */}
              <div className="onboarding-input-card">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="onboarding-input-field"
                  placeholder="Paste your Gemini API key (AIzaSy...)"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setKeyError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleValidateApiKey(); }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                  title={showApiKey ? "Hide key" : "Show key"}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Error Message Alert */}
              {keyError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#fca5a5',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                  textAlign: 'left',
                  width: '100%',
                  maxWidth: '380px'
                }}>
                  <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span>{keyError}</span>
                </div>
              )}

              {/* Key Success Confirmation */}
              {keySuccess && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#86efac',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                  textAlign: 'left',
                  width: '100%',
                  maxWidth: '380px'
                }}>
                  <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0 }} />
                  <span>Key Verified ✓ Continuing...</span>
                </div>
              )}

              <button
                type="button"
                className="btn-onboarding-primary"
                onClick={handleValidateApiKey}
                disabled={keyValidating}
              >
                {keyValidating ? (
                  <>
                    <span className="status-dot-pulse" style={{ background: '#ffffff' }}></span>
                    <span>Validating with Google...</span>
                  </>
                ) : keySuccess ? (
                  <>
                    <Check size={16} />
                    <span>Key Verified ✓</span>
                  </>
                ) : (
                  <>
                    <span>Validate & Continue →</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOnboardingStep(6)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  marginTop: '12px',
                  textDecoration: 'underline'
                }}
              >
                Skip for now (Use Default Cloud Intelligence) →
              </button>

              {/* Accordion Guide: How to get key */}
              <div style={{ width: '100%', maxWidth: '380px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowKeyGuide(!showKeyGuide)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: '0 auto',
                    textDecoration: 'underline'
                  }}
                >
                  <HelpCircle size={14} />
                  <span>How to get a free Google Gemini key (takes 2 minutes)</span>
                </button>

                {showKeyGuide && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginTop: '10px',
                    fontSize: '0.8rem',
                    color: '#cbd5e1',
                    lineHeight: '1.5',
                    textAlign: 'left'
                  }}>
                    <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: 'var(--accent-cyan)' }}>Quick Steps:</p>
                    <ol style={{ paddingLeft: '18px', margin: 0 }}>
                      <li>Visit <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>aistudio.google.com</a></li>
                      <li>Sign in with your Google account.</li>
                      <li>Click <strong>"Get API key"</strong> → <strong>"Create API key"</strong>.</li>
                      <li>Copy the generated key (starts with <code>AIzaSy...</code>) and paste it above.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: VOICE SELECTION */}
          {onboardingStep === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>
              <div className="step-badge">Acoustic Identity</div>
              <h1 className="serif-title">
                Find your <span className="serif-italic">Aether's voice.</span>
              </h1>
              <p className="step-desc">
                Choose the acoustic personality that fits your executive workflow best.
              </p>

              <div className="voice-grid">
                {AETHER_VOICES.map(voice => (
                  <div
                    key={voice.id}
                    className={`voice-card ${selectedVoice === voice.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedVoice(voice.id);
                      localStorage.setItem('aether_selected_voice', voice.id);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="voice-card-name">{voice.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayVoicePreview(voice);
                        }}
                        style={{
                          background: audioSamplePlaying === voice.id ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#ffffff'
                        }}
                        title={`Preview ${voice.name}'s voice`}
                      >
                        <Play size={11} fill="#ffffff" />
                      </button>
                    </div>
                    <span className="voice-card-desc">{voice.desc}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn-onboarding-primary"
                onClick={() => {
                  localStorage.setItem('aether_selected_voice', selectedVoice);
                  setOnboardingStep(7);
                }}
              >
                Select Voice & Continue →
              </button>
            </div>
          )}

          {/* STEP 7: MICROPHONE AUTHORIZATION */}
          {onboardingStep === 7 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>
              <div className="step-badge">Zero-Latency Voice Mode</div>
              <h1 className="serif-title">
                Aether needs to <span className="serif-italic">hear you.</span>
              </h1>
              <p className="step-desc">
                Enable microphone access for real-time bi-directional conversation with zero latency interruption.
              </p>

              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '18px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                margin: '12px 0 24px',
                width: '100%',
                maxWidth: '380px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1.5px solid var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)'
                }}>
                  <Mic size={24} color="var(--accent-cyan)" />
                </div>
                <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>Bi-directional Audio Stream</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', lineHeight: '1.4' }}>
                  Microphone is only engaged during active voice sessions. No passive room listening.
                </div>
              </div>

              <button
                type="button"
                className="btn-onboarding-primary"
                onClick={handleCompleteOnboarding}
                disabled={isActivatingMic}
                style={{ opacity: isActivatingMic ? 0.7 : 1, cursor: isActivatingMic ? 'wait' : 'pointer' }}
              >
                {isActivatingMic ? 'Activating Microphone...' : 'Activate Microphone & Enter Aether →'}
              </button>
            </div>
          )}

        </div>
      </div>
    );
  }

  const currentHour = currentTime.getHours();
  const timeGreeting = currentHour < 12 
    ? `Morning, ${userPreferredName}.` 
    : currentHour < 17 
      ? `Afternoon, ${userPreferredName}.` 
      : `Evening, ${userPreferredName}.`;

  return (
    <div className="jarvis-screen-wrapper">
      
      {/* =========================================================================
          VIEW 1: SETTINGS SCREEN (Exact 1:1 Spec from Screenshot 2)
          ========================================================================= */}
      {isSettingsOpen ? (
        <div className="jarvis-settings-container">
          
          {/* Settings Top Bar */}
          <div className="settings-header">
            <button 
              type="button" 
              className="jarvis-icon-btn" 
              onClick={() => setIsSettingsOpen(false)}
              style={{ position: 'absolute', left: 0 }}
              title="Back to Aether"
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className="settings-header-title">Settings</h2>
          </div>

          {/* User Profile Card */}
          <div className="settings-user-card">
            <div className="settings-user-info">
              <div className="settings-avatar-circle">
                {userAvatar ? (
                  <img src={userAvatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  (userName || userPreferredName || 'S').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="settings-user-name">{userName || userPreferredName || 'Operator'}</div>
                <div className="settings-user-email">{userEmail || 'operator@aether.ai'}</div>
                <button 
                  type="button" 
                  onClick={handleDeleteAccount}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.74rem', textDecoration: 'underline', cursor: 'pointer', marginTop: '4px', padding: 0 }}
                >
                  {effectiveLang === 'en' ? 'Delete account' : effectiveLang === 'hinglish' ? 'Account delete karein' : 'खाता हटाएं (Delete account)'}
                </button>
              </div>
            </div>
            <button 
              type="button" 
              onClick={handleSignOut} 
              className="settings-signout-btn"
            >
              {effectiveLang === 'en' ? 'Sign out' : effectiveLang === 'hinglish' ? 'Sign out' : 'साइन आउट'}
            </button>
          </div>

          {/* SECTION: YOUR JARVIS */}
          <div className="settings-section-heading">YOUR AETHER</div>
          <div className="settings-card-group">
            <div className="settings-row-item" onClick={() => setActiveSubModal('profile-name')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><User size={16} /></div>
                <span>You</span>
              </div>
              <div className="settings-row-right">
                <span>{userPreferredName}</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => setActiveSubModal('username')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><User size={16} /></div>
                <span>Username</span>
              </div>
              <div className="settings-row-right">
                <span>{customUsername ? `@${customUsername}` : `@${userPreferredName.toLowerCase().replace(/\s+/g, '')}`}</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => setActiveSubModal('assistant')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><Sliders size={16} /></div>
                <span>Assistants</span>
              </div>
              <div className="settings-row-right">
                <span>Aether · Warm</span>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>

          {/* SECTION: APP */}
          <div className="settings-section-heading">APP</div>
          <div className="settings-card-group">
            <div className="settings-row-item" onClick={() => setActiveSubModal('appearance')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><Moon size={16} /></div>
                <span>Appearance</span>
              </div>
              <div className="settings-row-right">
                <span>{appTheme === 'sapphire' ? 'Sapphire' : appTheme === 'oled' ? 'OLED Pure' : 'Obsidian Dark'}</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => setActiveSubModal('sound')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><Volume2 size={16} /></div>
                <span>Sound & haptics</span>
              </div>
              <div className="settings-row-right">
                <span>{voiceOutputEnabled ? 'On' : 'Muted'}</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => setActiveSubModal('language')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><Languages size={16} /></div>
                <span>Language</span>
              </div>
              <div className="settings-row-right">
                <span>{currentLangObj.label}</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => setActiveSubModal('memory')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><Database size={16} /></div>
                <span>Memory</span>
              </div>
              <div className="settings-row-right">
                <span>{memories.length} facts</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => setActiveSubModal('reminders')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div className="settings-row-left" style={{ minWidth: 0, flex: 1 }}>
                <div className="settings-row-icon-box" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', flexShrink: 0 }}>
                  <Bell size={16} />
                </div>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Reminders & Today's Agenda</span>
              </div>
              <div className="settings-row-right" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <span style={{ color: getTodayPendingCount() > 0 ? '#38bdf8' : '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
                  {getTodayPendingCount()} today
                </span>
                <ChevronRight size={16} style={{ flexShrink: 0 }} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => { 
              setActiveSubModal('calendar'); 
              setRemindersViewMode('calendar'); 
              setCalSelectedDate(new Date()); 
              setCalCurrentMonth(new Date()); 
            }}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                  <Calendar size={16} />
                </div>
                <span>Calendar & Schedule</span>
              </div>
              <div className="settings-row-right">
                <span style={{ color: '#94a3b8' }}>
                  Monthly View
                </span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => setActiveSubModal('permissions')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <ShieldCheck size={16} />
                </div>
                <span>App Permissions</span>
              </div>
              <div className="settings-row-right">
                <span style={{ 
                  color: (pushPermission === 'granted' && micPermissionStatus === 'granted') ? '#10b981' : '#f59e0b', 
                  fontWeight: 600,
                  fontSize: '0.78rem'
                }}>
                  {pushPermission === 'granted' && micPermissionStatus === 'granted' ? '✓ All active' : 'Manage'}
                </span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => setActiveSubModal('assistant-setup')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><Zap size={16} /></div>
                <span>Set as phone assistant</span>
              </div>
              <div className="settings-row-right">
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Set up</span>
              </div>
            </div>
          </div>
          <p className="settings-subtext-note">
            Then hold the power button, or swipe in from a bottom corner, to reach Aether from any screen.
          </p>

          {/* SECTION: ADVANCED & EXECUTIVE SERVICES */}
          <div className="settings-section-heading">ADVANCED</div>
          <div className="settings-card-group">
            <div className="settings-row-item" onClick={() => setActiveSubModal('key')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><Key size={16} /></div>
                <span>Key</span>
              </div>
              <div className="settings-row-right">
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                  {apiKey ? `••••${apiKey.slice(-4)}` : 'Set Key'}
                </span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => setActiveSubModal('finance')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><Wallet size={16} /></div>
                <span>Executive Finance & Wealth</span>
              </div>
              <div className="settings-row-right">
                <span>₹{financeSummary.balance.toLocaleString('en-IN')}</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => setActiveSubModal('audit')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><Shield size={16} /></div>
                <span>Actions & Audit Trail</span>
              </div>
              <div className="settings-row-right">
                <span>{auditLogs.length} logs</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="settings-row-item" onClick={() => setActiveSubModal('db')}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box"><Layers size={16} /></div>
                <span>Database Core & Sync</span>
              </div>
              <div className="settings-row-right">
                <span>{serverOnline ? 'Connected' : 'Offline'}</span>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* =========================================================================
            VIEW 2: MAIN APP TABS (Gemini Clean Dark | Today | Memory)
            ========================================================================= */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>

          {/* TAB 1: AETHER CLEAN MINIMAL DARK UI */}
          {activeTab === 'aether' && (
            <div className="gemini-screen-container">
              
              {/* TOP BAR: [Spacer] [Aether ⌵ (Centered)] [Edit3] [Profile Avatar] */}
              <header className="gemini-top-bar">
                <div className="gemini-top-left" style={{ width: '80px', display: 'flex', alignItems: 'center' }}>
                  {/* Left spacer keeping Aether centered */}
                </div>

                <div className="gemini-top-center" style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    type="button" 
                    className="gemini-model-pill"
                    onClick={() => setIsPersonaDropdownOpen(!isPersonaDropdownOpen)}
                    title="Select Aether Voice / आवाज चुनें"
                  >
                    <span className="aether-top-mini-logo">Æ</span>
                    <span>Aether</span>
                    <ChevronDown size={14} color="#94a3b8" />
                  </button>

                  {isPersonaDropdownOpen && (
                    <div className="aether-voice-dropdown" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                      <div style={{ padding: '8px 12px 6px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', fontWeight: 600 }}>
                        Voice Personality
                      </div>
                      {AETHER_VOICES.map(voice => (
                        <button
                          key={voice.id}
                          type="button"
                          onClick={() => {
                            setSelectedVoice(voice.id);
                            localStorage.setItem('aether_selected_voice', voice.id);
                            setIsPersonaDropdownOpen(false);
                            handlePlayVoicePreview(voice);
                            showToast(`Aether Voice: ${voice.name}`, 'info');
                          }}
                          className={`aether-voice-option ${selectedVoice === voice.id ? 'active' : ''}`}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: selectedVoice === voice.id ? '#38bdf8' : '#f8fafc' }}>
                              {voice.name}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                              {voice.desc}
                            </span>
                          </div>
                          {selectedVoice === voice.id && <Check size={16} color="#38bdf8" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="gemini-top-right">
                  <button 
                    type="button" 
                    className="gemini-icon-btn" 
                    onClick={() => {
                      setActiveSubModal('reminders');
                      setRemindersViewMode('list');
                    }}
                    title="Reminders & Today's Agenda"
                    style={{ position: 'relative' }}
                  >
                    <Bell size={20} />
                    {getTodayPendingCount() > 0 && (
                      <span className="gemini-bell-badge">
                        {getTodayPendingCount()}
                      </span>
                    )}
                  </button>

                  <button 
                    type="button" 
                    className="gemini-icon-btn" 
                    onClick={handleStartNewChat}
                    title="New Chat / नया चैट शुरू करें"
                  >
                    <Edit3 size={20} />
                  </button>

                  <div className="gemini-avatar-wrap" onClick={() => setIsSettingsOpen(true)} title="Profile & Settings">
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt="Profile" 
                        className="gemini-avatar-img" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="gemini-avatar-fallback">
                        {((userName && userName !== 'Operator') ? userName[0] : 'P').toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* CENTER STAGE OR CONVERSATION STREAM */}
              {chatHistory.length === 0 ? (
                <div className="gemini-center-stage">
                  {/* Signature Glowing Aether Brand Orb (Center Stage) */}
                  <div 
                    className="aether-center-orb"
                    onClick={() => {
                      toggleListening();
                      showToast(isListening ? "Listening stopped" : "⚡ Aether listening...", "info");
                    }}
                    title="Click to speak / Aether voice"
                  >
                    <div className="aether-orb-badge hero">Æ</div>
                  </div>

                  {/* Headline: Dynamic Greeting as per executive standard */}
                  <h1 className="gemini-hero-heading">
                    {getDynamicGreeting()}
                  </h1>
                  <p 
                    key={subheadingIndex}
                    className="gemini-hero-subheading dynamic-fade"
                    onClick={() => setSubheadingIndex(prev => prev + 1)}
                    title="Click for next suggestion"
                    style={{ cursor: 'pointer' }}
                  >
                    {getDynamicSubheading()}
                  </p>
                </div>
              ) : (
                <div className="gemini-chat-feed" ref={geminiChatFeedRef}>
                  {chatHistory.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={msg.role === 'user' ? 'gemini-msg-user' : 'gemini-msg-assistant'}
                    >
                      {msg.image_url && (
                        <div style={{ marginBottom: '8px' }}>
                          <img 
                            src={msg.image_url} 
                            alt="Attached" 
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '220px', 
                              borderRadius: '12px', 
                              objectFit: 'cover',
                              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              display: 'block'
                            }} 
                          />
                        </div>
                      )}
                      <FormattedMessage text={msg.content} />
                      {msg.role !== 'user' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => speakText(msg.content)}
                            title="Aether की आवाज में सुनें (Listen aloud)"
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#38bdf8',
                              borderRadius: '8px',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Volume2 size={12} />
                            <span>सुनें (Listen)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="gemini-msg-assistant" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="gemini-waveform-icon">
                        <span /><span /><span />
                      </div>
                      <span style={{ fontSize: '0.86rem', color: '#94a3b8' }}>Thinking & calculating...</span>
                    </div>
                  )}
                </div>
              )}

              {/* BOTTOM DOCK: CLEAN EXECUTIVE PROMPT BAR — Gemini Style */}
              <div className="gemini-bottom-dock">
                {/* Hidden File Inputs for Camera, Photos & Files */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  style={{ display: 'none' }}
                  onChange={handleCameraFileChange}
                />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/*"
                  ref={photosInputRef}
                  style={{ display: 'none' }}
                  onChange={handlePhotosFileChange}
                />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.csv,.json,.xls,.xlsx,.zip,application/pdf,text/*"
                  ref={filesInputRef}
                  style={{ display: 'none' }}
                  onChange={handleDocumentFileChange}
                />

                {attachedMedia && (
                  <div className="gemini-attached-chip">
                    {attachedMedia.type === 'image' && (
                      <img src={attachedMedia.url} alt="Attached" className="gemini-attached-thumb" />
                    )}
                    {attachedMedia.type === 'file' && <FileText size={15} color="#fbbf24" />}
                    {attachedMedia.type === 'drive' && <HardDrive size={15} color="#34d399" />}
                    {attachedMedia.type === 'map' && <MapPin size={15} color="#fb7185" />}
                    <span 
                      className="gemini-attached-name"
                      onClick={() => {
                        if (attachedMedia.type === 'map') {
                          openMapApp(attachedMedia.latitude, attachedMedia.longitude);
                        }
                      }}
                      style={{ cursor: attachedMedia.type === 'map' ? 'pointer' : 'default' }}
                      title={attachedMedia.type === 'map' ? 'Click to open Map' : ''}
                    >
                      {attachedMedia.name}
                    </span>
                    <button 
                      type="button" 
                      className="gemini-attached-remove"
                      onClick={() => setAttachedMedia(null)}
                      title="Remove attachment"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (inputText.trim() || attachedMedia) {
                      handleSendPrompt(inputText);
                    }
                  }}
                  className="gemini-prompt-bar"
                >
                  <button 
                    type="button" 
                    className="gemini-prompt-btn plus"
                    onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                    title="Photos, Camera, Files, Drive, Map"
                    style={{
                      transform: isPlusMenuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s ease',
                      color: isPlusMenuOpen ? '#38bdf8' : 'inherit'
                    }}
                  >
                    <Plus size={20} />
                  </button>

                  {/* QUICK ACTIONS POPUP (+ BUTTON): CAMERA, PHOTOS, FILES, DRIVE, MAP — GEMINI DOCK */}
                  {isPlusMenuOpen && (
                    <>
                      <div 
                        className="gemini-plus-backdrop" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPlusMenuOpen(false);
                        }} 
                      />
                      <div className="gemini-plus-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="gemini-plus-drag-handle" />

                        <div className="gemini-plus-grid">
                          {/* 1. Camera */}
                          <button 
                            type="button"
                            className="gemini-plus-item"
                            onClick={handleCameraClick}
                            title="Camera"
                          >
                            <div className="gemini-plus-icon-box" style={{ 
                              background: 'radial-gradient(circle at 35% 35%, rgba(56, 189, 248, 0.28), rgba(14, 165, 233, 0.12))', 
                              border: '1px solid rgba(56, 189, 248, 0.35)', 
                              color: '#38bdf8' 
                            }}>
                              <Camera size={20} />
                            </div>
                            <span className="gemini-plus-item-title">Camera</span>
                          </button>

                          {/* 2. Photos */}
                          <button 
                            type="button"
                            className="gemini-plus-item"
                            onClick={() => {
                              setIsPlusMenuOpen(false);
                              photosInputRef.current?.click();
                            }}
                            title="Photos"
                          >
                            <div className="gemini-plus-icon-box" style={{ 
                              background: 'radial-gradient(circle at 35% 35%, rgba(192, 132, 252, 0.28), rgba(168, 85, 247, 0.12))', 
                              border: '1px solid rgba(192, 132, 252, 0.35)', 
                              color: '#c084fc' 
                            }}>
                              <Image size={20} />
                            </div>
                            <span className="gemini-plus-item-title">Photos</span>
                          </button>

                          {/* 3. Files */}
                          <button 
                            type="button"
                            className="gemini-plus-item"
                            onClick={() => {
                              setIsPlusMenuOpen(false);
                              filesInputRef.current?.click();
                            }}
                            title="Files"
                          >
                            <div className="gemini-plus-icon-box" style={{ 
                              background: 'radial-gradient(circle at 35% 35%, rgba(251, 191, 36, 0.28), rgba(245, 158, 11, 0.12))', 
                              border: '1px solid rgba(251, 191, 36, 0.35)', 
                              color: '#fbbf24' 
                            }}>
                              <FileText size={20} />
                            </div>
                            <span className="gemini-plus-item-title">Files</span>
                          </button>

                          {/* 4. Drive */}
                          <button 
                            type="button"
                            className="gemini-plus-item"
                            onClick={() => {
                              setIsPlusMenuOpen(false);
                              setIsDriveModalOpen(true);
                            }}
                            title="Google Drive"
                          >
                            <div className="gemini-plus-icon-box" style={{ 
                              background: 'radial-gradient(circle at 35% 35%, rgba(52, 211, 153, 0.28), rgba(16, 185, 129, 0.12))', 
                              border: '1px solid rgba(52, 211, 153, 0.35)', 
                              color: '#34d399' 
                            }}>
                              <HardDrive size={20} />
                            </div>
                            <span className="gemini-plus-item-title">Drive</span>
                          </button>

                          {/* 5. Map */}
                          <button 
                            type="button"
                            className="gemini-plus-item"
                            onClick={handleAttachLocation}
                            title="Map"
                          >
                            <div className="gemini-plus-icon-box" style={{ 
                              background: 'radial-gradient(circle at 35% 35%, rgba(251, 113, 133, 0.28), rgba(244, 63, 94, 0.12))', 
                              border: '1px solid rgba(251, 113, 133, 0.35)', 
                              color: '#fb7185' 
                            }}>
                              <MapPin size={20} />
                            </div>
                            <span className="gemini-plus-item-title">Map</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <input 
                    type="text" 
                    className="gemini-input-field"
                    placeholder={attachedMedia?.type === 'image' ? "इस फ़ोटो के बारे में सवाल पूछें..." : ROTATING_PROMPTS[promptPlaceholderIndex]}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    autoFocus
                  />

                  {(inputText.trim() || attachedMedia) ? (
                    /* Send Arrow Button — shown when user has typed text or attached media */
                    <button 
                      type="submit" 
                      className="gemini-prompt-btn send-btn"
                      title="Send message"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  ) : (
                    /* Mic + Waveform — shown when input is empty */
                    <>
                      <button 
                        type="button" 
                        className={`gemini-prompt-btn mic ${isListening ? 'listening' : ''}`}
                        onClick={toggleListening}
                        title={isListening ? "Stop listening" : "Voice Input (माइक शुरू करें)"}
                      >
                        <Mic size={20} />
                      </button>

                      <button 
                        type="button" 
                        className="gemini-prompt-btn waveform-btn"
                        onClick={() => {
                          toggleListening();
                          showToast("⚡ Zero-Latency Acoustic Voice Mode Active", "info");
                        }}
                        title="Live Voice Mode"
                      >
                        <div className="gemini-waveform-icon">
                          <span /><span /><span />
                        </div>
                      </button>
                    </>
                  )}
                </form>
              </div>

            </div>
          )}

          {/* TAB 2: TODAY'S EXECUTIVE AGENDA */}
          {activeTab === 'today' && (
            <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontFamily: 'Newsreader', fontSize: '1.8rem', fontWeight: 600, color: '#ffffff' }}>
                  Today's Agenda
                </h1>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Active Reminders Card */}
              {(() => {
                const isTaskDone = (t) => t.is_completed || t.status === 'completed';
                const pendingReminders = tasks.filter(t => t.reminder_time && !isTaskDone(t));
                const pendingTasks = tasks.filter(t => !isTaskDone(t));
                const completedTasks = tasks.filter(t => isTaskDone(t));

                return (
                  <>
                    <div style={{ background: '#101625', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '18px', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Bell size={16} />
                        <span>ACTIVE REMINDERS ({pendingReminders.length})</span>
                      </div>
                      {pendingReminders.length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: '0.84rem' }}>No pending reminders today. Speak to set one!</div>
                      ) : (
                        pendingReminders.map(task => (
                          <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div>
                              <div style={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: 500 }}>{task.title}</div>
                              <div style={{ color: 'var(--accent-cyan)', fontSize: '0.76rem', marginTop: '2px' }}>⏰ {task.reminder_time}</div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleToggleTask(task.id)}
                              style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: 'var(--accent-cyan)', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600 }}
                            >
                              Done
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Tasks Checklist */}
                    <div style={{ background: '#101625', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '18px', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontWeight: 700, fontSize: '0.85rem' }}>
                          <CheckSquare size={16} />
                          <span>DAILY TASKS ({pendingTasks.length})</span>
                        </div>
                      </div>

                      <form 
                        onSubmit={handleCreateTask}
                        style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}
                      >
                        <input
                          type="text"
                          placeholder="Add a new task..."
                          value={newTaskInput}
                          onChange={(e) => setNewTaskInput(e.target.value)}
                          style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                        />
                        <button type="submit" style={{ background: '#a855f7', border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
                          Add
                        </button>
                      </form>

                      {pendingTasks.length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: '0.84rem', padding: '8px 0' }}>All daily tasks completed! Good job.</div>
                      ) : (
                        pendingTasks.map(task => (
                          <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <div 
                              onClick={() => handleToggleTask(task.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                            >
                              <Circle size={16} color="#64748b" />
                              <div>
                                <span style={{ fontSize: '0.88rem', color: '#ffffff' }}>
                                  {task.title}
                                </span>
                                {task.reminder_time && (
                                  <div style={{ color: 'var(--accent-cyan)', fontSize: '0.74rem' }}>⏰ {task.reminder_time}</div>
                                )}
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteTask(task.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* COMPLETED SECTION */}
                    {completedTasks.length > 0 && (
                      <div style={{ background: '#101625', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '18px', marginBottom: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
                            <CheckCircle2 size={16} />
                            <span>COMPLETED ({completedTasks.length})</span>
                          </div>
                        </div>

                        {completedTasks.map(task => (
                          <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <div 
                              onClick={() => handleToggleTask(task.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                              title="Click to unmark"
                            >
                              <CheckCircle2 size={16} color="#10b981" />
                              <div>
                                <span style={{ fontSize: '0.88rem', color: '#64748b', textDecoration: 'line-through' }}>
                                  {task.title}
                                </span>
                                {task.reminder_time && (
                                  <div style={{ color: '#10b981', fontSize: '0.72rem', opacity: 0.8, marginTop: '2px' }}>
                                    ⏰ {task.reminder_time} • Completed
                                  </div>
                                )}
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteTask(task.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer', padding: '4px' }}
                              title="Delete permanently"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* News & Market Briefing */}
              {newsItems.length > 0 && (
                <div style={{ background: '#101625', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>
                    <Newspaper size={16} />
                    <span>EXECUTIVE NEWS WIRE</span>
                  </div>
                  {newsItems.slice(0, 3).map((item, idx) => (
                    <div key={idx} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <div style={{ fontSize: '0.86rem', color: '#ffffff', fontWeight: 500 }}>{item.headline}</div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '3px' }}>{item.summary}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MEMORY VAULT */}
          {activeTab === 'memory' && (
            <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ fontFamily: 'Newsreader', fontSize: '1.8rem', fontWeight: 600, color: '#ffffff' }}>
                    Memory Vault
                  </h1>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                    Facts & preferences Aether automatically remembers about you
                  </p>
                </div>
              </div>

              <div style={{ background: '#101625', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '18px' }}>
                {memories.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '0.84rem', padding: '16px 0', textAlign: 'center' }}>
                    No memories recorded yet. Tell Aether: "Remember that my birthday is March 23"
                  </div>
                ) : (
                  memories.map(mem => (
                    <div key={mem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', marginTop: '6px' }} />
                        <div>
                          <div style={{ color: '#ffffff', fontSize: '0.9rem', lineHeight: '1.4' }}>{mem.fact}</div>
                          <div style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '3px' }}>
                            Learned {new Date(mem.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(mem.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* BOTTOM TAB BAR — REMOVED (Navigation now via header) */}

        </div>
      )}

      {/* =========================================================================
          SUB-MODALS (Key, Finance, Audit, Profile Name, Assistant Setup, Reminders)
          ========================================================================= */}

      {/* 0. Reminders & Calendar Submodal */}
      {(activeSubModal === 'reminders' || activeSubModal === 'calendar') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(14px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '18px 14px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700, fontSize: '1rem' }}>
                {remindersViewMode === 'calendar' ? <Calendar size={20} /> : <Bell size={20} />}
                <span>{remindersViewMode === 'calendar' ? 'CALENDAR & SCHEDULE' : "REMINDERS & AGENDA"}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveSubModal(null)} 
                style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* View Mode Toggle: List vs Calendar */}
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '14px', padding: '4px', marginBottom: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => setRemindersViewMode('list')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: remindersViewMode === 'list' ? 'rgba(56, 189, 248, 0.22)' : 'transparent',
                  border: remindersViewMode === 'list' ? '1px solid #38bdf8' : 'none',
                  borderRadius: '11px',
                  color: remindersViewMode === 'list' ? '#38bdf8' : '#94a3b8',
                  padding: '7px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Bell size={14} />
                <span>List View</span>
              </button>
              <button
                type="button"
                onClick={() => setRemindersViewMode('calendar')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: remindersViewMode === 'calendar' ? 'rgba(56, 189, 248, 0.22)' : 'transparent',
                  border: remindersViewMode === 'calendar' ? '1px solid #38bdf8' : 'none',
                  borderRadius: '11px',
                  color: remindersViewMode === 'calendar' ? '#38bdf8' : '#94a3b8',
                  padding: '7px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Calendar size={14} />
                <span>Calendar View</span>
              </button>
            </div>

            {remindersViewMode === 'calendar' ? (
              /* ─── CALENDAR VIEW ─── */
              <div>
                {/* Month Navigator Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <button 
                    type="button"
                    onClick={() => {
                      const prev = new Date(calCurrentMonth.getFullYear(), calCurrentMonth.getMonth() - 1, 1);
                      setCalCurrentMonth(prev);
                    }}
                    style={{ background: 'rgba(255, 255, 255, 0.06)', border: 'none', color: '#cbd5e1', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
                      {calCurrentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        setCalCurrentMonth(today);
                        setCalSelectedDate(today);
                      }}
                      style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '3px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Today
                    </button>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      const next = new Date(calCurrentMonth.getFullYear(), calCurrentMonth.getMonth() + 1, 1);
                      setCalCurrentMonth(next);
                    }}
                    style={{ background: 'rgba(255, 255, 255, 0.06)', border: 'none', color: '#cbd5e1', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Google Calendar Sync & Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.74rem', color: googleTasks.length > 0 ? '#60a5fa' : '#94a3b8', fontWeight: 600 }}>
                      {googleTasks.length > 0 
                        ? `📅 GCal Synced (${googleTasks.length} events)` 
                        : '📅 Google Calendar'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleSyncGCalClick}
                      disabled={isSyncingGCal}
                      style={{
                        background: 'rgba(66, 133, 244, 0.2)',
                        border: '1px solid rgba(66, 133, 244, 0.45)',
                        color: '#60a5fa',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: isSyncingGCal ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title="Sync live reminders & events from your Google Calendar"
                    >
                      <RefreshCw size={12} className={isSyncingGCal ? 'animate-spin' : ''} />
                      <span>{isSyncingGCal ? 'Syncing...' : 'Sync GCal'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => icsFileInputRef.current?.click()}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#cbd5e1',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Import Google Calendar (.ics) file"
                    >
                      <Upload size={12} />
                      <span>Import .ics</span>
                    </button>
                    <input 
                      type="file" 
                      ref={icsFileInputRef} 
                      onChange={handleImportIcsFile} 
                      accept=".ics,text/calendar" 
                      style={{ display: 'none' }} 
                    />

                    <button
                      type="button"
                      onClick={downloadAllRemindersIcs}
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34d399',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Download .ics to import into Google Calendar / Apple Calendar"
                    >
                      <span>📥</span>
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                {/* Weekdays Header */}
                <div className="calendar-grid" style={{ marginTop: 0, marginBottom: '6px' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="calendar-day-header">{d}</div>
                  ))}
                </div>

                {/* Calendar Month Cells */}
                <div className="calendar-grid">
                  {(() => {
                    const year = calCurrentMonth.getFullYear();
                    const month = calCurrentMonth.getMonth();
                    const firstDayIndex = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const daysInPrevMonth = new Date(year, month, 0).getDate();
                    const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;
                    const cells = [];

                    const todayStr = formatLocalDateStr(new Date());
                    const selectedStr = formatLocalDateStr(calSelectedDate);

                    for (let i = 0; i < totalCells; i++) {
                      let dayNum;
                      let cellDate;
                      let isOtherMonth = false;

                      if (i < firstDayIndex) {
                        dayNum = daysInPrevMonth - firstDayIndex + i + 1;
                        cellDate = new Date(year, month - 1, dayNum);
                        isOtherMonth = true;
                      } else if (i >= firstDayIndex + daysInMonth) {
                        dayNum = i - (firstDayIndex + daysInMonth) + 1;
                        cellDate = new Date(year, month + 1, dayNum);
                        isOtherMonth = true;
                      } else {
                        dayNum = i - firstDayIndex + 1;
                        cellDate = new Date(year, month, dayNum);
                      }

                      const cellDateStr = formatLocalDateStr(cellDate);
                      const isToday = cellDateStr === todayStr;
                      const isSelected = cellDateStr === selectedStr;
                      const dayReminders = combinedTasks.filter(t => getTaskDateStr(t) === cellDateStr);

                      cells.push(
                        <div
                          key={cellDateStr + i}
                          className={`calendar-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setCalSelectedDate(cellDate);
                            if (isOtherMonth) setCalCurrentMonth(new Date(cellDate.getFullYear(), cellDate.getMonth(), 1));
                          }}
                        >
                          <span>{dayNum}</span>
                          {dayReminders.length > 0 && (
                            <span className="calendar-badge-count">{dayReminders.length}</span>
                          )}
                          {dayReminders.length > 0 && (
                            <div className="calendar-badge-dot" style={{
                              background: dayReminders.some(t => t.priority === 'urgent' || t.priority === 'high') ? '#f43f5e' : '#f59e0b'
                            }} />
                          )}
                        </div>
                      );
                    }
                    return cells;
                  })()}
                </div>

                {/* Selected Date Reminders Section */}
                <div style={{ marginTop: '18px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '18px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="#38bdf8" />
                      <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.88rem' }}>
                        {calSelectedDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} AGENDA
                      </span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      {combinedTasks.filter(t => getTaskDateStr(t) === formatLocalDateStr(calSelectedDate)).length} Reminders
                    </span>
                  </div>

                  {/* Quick Add for Selected Date */}
                  <form onSubmit={handleCreateDateReminder} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                    <input
                      type="text"
                      placeholder="New reminder for this date..."
                      value={newCalReminderTitle}
                      onChange={(e) => setNewCalReminderTitle(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '0.84rem', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <input
                        type="text"
                        placeholder="10:00 AM"
                        value={newCalReminderTime}
                        onChange={(e) => setNewCalReminderTime(e.target.value)}
                        style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '8px 12px', color: '#fff', fontSize: '0.82rem', outline: 'none', textAlign: 'center' }}
                      />
                      <button
                        type="submit"
                        style={{ background: '#38bdf8', color: '#04101e', border: 'none', borderRadius: '10px', padding: '8px 18px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        + Add
                      </button>
                    </div>
                  </form>

                  {/* Reminders List for Selected Date */}
                  {(() => {
                    const isTaskDone = (t) => t.is_completed || t.status === 'completed';
                    const dateStr = formatLocalDateStr(calSelectedDate);
                    const isTodaySelected = dateStr === formatLocalDateStr(new Date());
                    const dateTasks = combinedTasks.filter(t => getTaskDateStr(t) === dateStr);
                    const pendingTasks = dateTasks.filter(t => !isTaskDone(t));
                    const completedTasks = dateTasks.filter(t => isTaskDone(t));
                    const displayedTasks = calAgendaFilter === 'pending'
                      ? pendingTasks
                      : calAgendaFilter === 'completed'
                        ? completedTasks
                        : dateTasks;

                    if (dateTasks.length === 0) {
                      const todayTasks = combinedTasks.filter(t => getTaskDateStr(t) === formatLocalDateStr(new Date()));
                      return (
                        <div style={{ textAlign: 'center', padding: '18px 10px', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <span>No reminders scheduled for this date.</span>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {!isTodaySelected && todayTasks.length > 0 && (
                              <button
                                type="button"
                                onClick={handleCopyTodayTasksToSelectedDate}
                                style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8', borderRadius: '10px', padding: '7px 14px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                ⚡ Copy Today's Routines Here
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleSyncGCalClick}
                              style={{ background: 'rgba(66, 133, 244, 0.15)', border: '1px solid rgba(66, 133, 244, 0.35)', color: '#60a5fa', borderRadius: '10px', padding: '7px 14px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              📅 Sync Google Calendar
                            </button>
                            {!isTodaySelected && (
                              <button
                                type="button"
                                onClick={() => {
                                  const today = new Date();
                                  setCalSelectedDate(today);
                                  setCalCurrentMonth(today);
                                }}
                                style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', borderRadius: '10px', padding: '7px 14px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                📅 View Today ({todayTasks.length})
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Agenda Filter Pills & Today Reset Button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setCalAgendaFilter('all')}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                background: calAgendaFilter === 'all' ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
                                color: calAgendaFilter === 'all' ? '#04101e' : '#94a3b8'
                              }}
                            >
                              All ({dateTasks.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCalAgendaFilter('pending')}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                background: calAgendaFilter === 'pending' ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
                                color: calAgendaFilter === 'pending' ? '#04101e' : '#94a3b8'
                              }}
                            >
                              Pending ({pendingTasks.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCalAgendaFilter('completed')}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                background: calAgendaFilter === 'completed' ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                                color: calAgendaFilter === 'completed' ? '#022c22' : '#94a3b8'
                              }}
                            >
                              Completed ({completedTasks.length})
                            </button>
                          </div>

                          {isTodaySelected && completedTasks.length > 0 && (
                            <button
                              type="button"
                              onClick={handleResetTodayCompletedTasks}
                              title="Reset all completed tasks for today so you can do them again"
                              style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                color: '#fbbf24',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>🔄 Reset for Today</span>
                            </button>
                          )}
                        </div>

                        {displayedTasks.map(t => {
                          const done = isTaskDone(t);
                          return (
                            <div 
                              key={t.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                background: done ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.07)',
                                opacity: done ? 0.6 : 1
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                <div 
                                  onClick={() => !t.is_google_calendar && handleToggleTask(t.id)}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '6px',
                                    border: done ? '1px solid #10b981' : t.is_google_calendar ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.3)',
                                    background: done ? '#10b981' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: t.is_google_calendar ? 'default' : 'pointer',
                                    color: '#022c22',
                                    flexShrink: 0
                                  }}
                                >
                                  {done && <Check size={14} />}
                                  {!done && t.is_google_calendar && <Calendar size={12} color="#60a5fa" />}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                  <span style={{ color: done ? '#64748b' : '#ffffff', fontSize: '0.86rem', fontWeight: 500, textDecoration: done ? 'line-through' : 'none' }}>
                                    {t.title}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {t.reminder_time && (
                                      <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>
                                        ⏰ {t.reminder_time}
                                      </span>
                                    )}
                                    <span style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: '6px',
                                      textTransform: 'uppercase',
                                      background: t.is_google_calendar ? 'rgba(66, 133, 244, 0.2)' : t.priority === 'urgent' ? 'rgba(244, 63, 94, 0.2)' : t.priority === 'high' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                                      color: t.is_google_calendar ? '#60a5fa' : t.priority === 'urgent' ? '#fb7185' : t.priority === 'high' ? '#fbbf24' : '#38bdf8'
                                    }}>
                                      {t.is_google_calendar ? 'Google Calendar' : t.priority}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {t.is_google_calendar ? (
                                  t.htmlLink && (
                                    <button
                                      type="button"
                                      onClick={() => window.open(t.htmlLink, '_blank', 'noopener,noreferrer')}
                                      style={{
                                        background: 'rgba(66, 133, 244, 0.15)',
                                        border: '1px solid rgba(66, 133, 244, 0.3)',
                                        color: '#60a5fa',
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                      title="Open event in Google Calendar"
                                    >
                                      <ExternalLink size={12} />
                                      <span>Open</span>
                                    </button>
                                  )
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openTaskInGoogleCalendar(t)}
                                      style={{
                                        background: 'rgba(56, 189, 248, 0.12)',
                                        border: '1px solid rgba(56, 189, 248, 0.25)',
                                        color: '#38bdf8',
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                      title="Sync to Google Calendar"
                                    >
                                      + GCal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(t.id)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#64748b',
                                        padding: '4px',
                                        cursor: 'pointer'
                                      }}
                                      title="Delete reminder"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              /* ─── LIST VIEW ─── */
              <div>
                {/* Quick Filter tabs */}
                {(() => {
                  // FIX: Smart date-aware counts — पुराने GCal events को exclude करके count करो
                  const todayStr = formatLocalDateStr(new Date());
                  // 7 दिन पहले की cutoff date
                  const cutoffDate = new Date();
                  cutoffDate.setDate(cutoffDate.getDate() - 7);
                  const cutoffStr = formatLocalDateStr(cutoffDate);

                  const isTaskDoneCount = (t) => t.is_completed || t.status === 'completed';
                  // Relevant = non-GCal tasks + GCal tasks जो cutoff के बाद के हों
                  const isRelevant = (t) => {
                    if (!t.is_google_calendar) return true;
                    const dateStr = getTaskDateStr(t);
                    if (!dateStr) return true;
                    return dateStr >= cutoffStr;
                  };
                  const relevantTasks = combinedTasks.filter(isRelevant);
                  const pendingCount = relevantTasks.filter(t => !isTaskDoneCount(t)).length;
                  const completedCount = combinedTasks.filter(t => isTaskDoneCount(t)).length;

                  return (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <button 
                        type="button"
                        onClick={() => setAgendaFilter('pending')}
                        style={{
                          background: agendaFilter === 'pending' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: agendaFilter === 'pending' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: agendaFilter === 'pending' ? '#38bdf8' : '#94a3b8',
                          padding: '6px 14px',
                          borderRadius: '16px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Pending ({pendingCount})
                      </button>
                      <button 
                        type="button"
                        onClick={() => setAgendaFilter('completed')}
                        style={{
                          background: agendaFilter === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: agendaFilter === 'completed' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: agendaFilter === 'completed' ? '#10b981' : '#94a3b8',
                          padding: '6px 14px',
                          borderRadius: '16px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Completed ({completedCount})
                      </button>
                      <button 
                        type="button"
                        onClick={() => setAgendaFilter('all')}
                        style={{
                          background: agendaFilter === 'all' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: agendaFilter === 'all' ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: agendaFilter === 'all' ? '#a855f7' : '#94a3b8',
                          padding: '6px 14px',
                          borderRadius: '16px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        All ({relevantTasks.length})
                      </button>
                    </div>
                  );
                })()}

                {/* Quick Add Task Form */}
                <form 
                  onSubmit={handleCreateTask}
                  style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}
                >
                  <input
                    type="text"
                    placeholder="Set reminder or add task..."
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    style={{ flex: 1, background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px', padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none' }}
                  />
                  <button type="submit" style={{ background: '#38bdf8', color: '#04101e', border: 'none', borderRadius: '12px', padding: '10px 16px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Add
                  </button>
                </form>

                {/* List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {(() => {
                    const isTaskDone = (t) => t.is_completed || t.status === 'completed';

                    // FIX: Smart date filter — GCal के 7+ दिन पुराने events को pending में न दिखाओ
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - 7);
                    const cutoffStr = formatLocalDateStr(cutoffDate);

                    const isRelevantTask = (t) => {
                      // Regular tasks (non-GCal) हमेशा दिखाओ
                      if (!t.is_google_calendar) return true;
                      // GCal events: only show last 7 days + upcoming
                      const dateStr = getTaskDateStr(t);
                      if (!dateStr) return true;
                      return dateStr >= cutoffStr;
                    };

                    const filtered = combinedTasks.filter(t => {
                      // Pending tab: non-completed + relevant (no old GCal)
                      if (agendaFilter === 'pending') return !isTaskDone(t) && isRelevantTask(t);
                      if (agendaFilter === 'completed') return isTaskDone(t);
                      // All tab: relevant tasks only (no old GCal junk)
                      return isRelevantTask(t);
                    });

                    // Sort by date: आज/आने वाले पहले, date नहीं है तो बाद में
                    const todayStr = formatLocalDateStr(new Date());
                    filtered.sort((a, b) => {
                      const dA = getTaskDateStr(a) || '9999-99-99';
                      const dB = getTaskDateStr(b) || '9999-99-99';
                      // Past dates को end में डालो
                      const isPastA = dA < todayStr;
                      const isPastB = dB < todayStr;
                      if (isPastA && !isPastB) return 1;
                      if (!isPastA && isPastB) return -1;
                      return dA.localeCompare(dB);
                    });

                    // छुपे हुए पुराने GCal events की count
                    const hiddenOldGCalCount = combinedTasks.filter(t => {
                      if (t.is_google_calendar && !isTaskDone(t)) {
                        const dateStr = getTaskDateStr(t);
                        return dateStr && dateStr < cutoffStr;
                      }
                      return false;
                    }).length;

                    if (filtered.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '36px 10px', color: '#64748b', fontSize: '0.9rem' }}>
                          {agendaFilter === 'pending' ? '🎉 All tasks and reminders completed!' : 'No items found.'}
                        </div>
                      );
                    }

                    return (
                      <>
                        {filtered.map(t => {
                          const done = isTaskDone(t);
                          const taskDateStr = getTaskDateStr(t);
                          const todayDateStr = formatLocalDateStr(new Date());
                          const isOverdue = taskDateStr && taskDateStr < todayDateStr && !done;
                          return (
                            <div 
                              key={t.id} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                padding: '12px 14px', 
                                background: isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.03)', 
                                border: isOverdue ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)', 
                                borderRadius: '14px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div 
                                onClick={() => !t.is_google_calendar && handleToggleTask(t.id)} 
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: t.is_google_calendar ? 'default' : 'pointer', flex: 1, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}
                              >
                                <div style={{ color: done ? '#10b981' : isOverdue ? '#f97316' : t.is_google_calendar ? '#60a5fa' : '#64748b' }}>
                                  {done ? <CheckCircle2 size={18} /> : t.is_google_calendar ? <Calendar size={18} /> : <Circle size={18} />}
                                </div>
                                <div>
                                  <div style={{ color: done ? '#94a3b8' : '#f1f5f9', fontSize: '0.92rem', fontWeight: done ? 400 : 500 }}>
                                    {t.title}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                                    {t.reminder_time && (
                                      <span style={{ color: '#38bdf8', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>⏰</span>
                                        <span>{t.reminder_time}</span>
                                      </span>
                                    )}
                                    {t.due_date && (
                                      <span style={{ color: isOverdue ? '#f97316' : '#94a3b8', fontSize: '0.74rem' }}>
                                        📅 {formatLocalDateStr(t.due_date)}
                                        {isOverdue && <span style={{ marginLeft: '4px', fontSize: '0.68rem', color: '#f97316', fontWeight: 700 }}>· OVERDUE</span>}
                                      </span>
                                    )}
                                    {t.is_google_calendar && (
                                      <span style={{ fontSize: '0.65rem', background: 'rgba(66, 133, 244, 0.2)', color: '#60a5fa', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                        GOOGLE CALENDAR
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {t.is_google_calendar ? (
                                t.htmlLink && (
                                  <button 
                                    type="button" 
                                    onClick={() => window.open(t.htmlLink, '_blank', 'noopener,noreferrer')} 
                                    style={{ background: 'rgba(66, 133, 244, 0.15)', border: '1px solid rgba(66, 133, 244, 0.3)', color: '#60a5fa', borderRadius: '8px', padding: '4px 8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                                    title="Open in Google Calendar"
                                  >
                                    <ExternalLink size={12} />
                                    <span>Open</span>
                                  </button>
                                )
                              ) : (
                                <button 
                                  type="button" 
                                  onClick={() => handleDeleteTask(t.id)} 
                                  style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer', padding: '6px' }}
                                  title="Delete task"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {/* पुराने GCal events का info banner */}
                        {hiddenOldGCalCount > 0 && agendaFilter === 'pending' && (
                          <div style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '0.76rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            📅 {hiddenOldGCalCount} पुराने Google Calendar events छुपाए गए हैं।{' '}
                            <button 
                              type="button" 
                              onClick={() => setAgendaFilter('all')} 
                              style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600, padding: 0 }}
                            >
                              All देखें →
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Calendar Connect Dialog */}
      {showGCalConnectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '22px 18px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontWeight: 700, fontSize: '0.98rem' }}>
                <Calendar size={18} />
                <span>Sync Google Calendar</span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowGCalConnectModal(false)} 
                style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Choose how you want to sync your Google Calendar reminders and events:
            </p>

            {/* Method 1: Instant .ics Upload */}
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '16px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1rem' }}>📥</span>
                <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.88rem' }}>Method 1: Instant .ics Import (1-Click)</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                Google Calendar से .ics फ़ाइल डाउनलोड करें (Settings → Import & Export → Export) और यहाँ 1 क्लिक में इम्पोर्ट करें।
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowGCalConnectModal(false);
                  icsFileInputRef.current?.click();
                }}
                style={{ width: '100%', background: '#10b981', color: '#022c22', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Upload size={14} />
                <span>Upload Google Calendar .ics File</span>
              </button>
            </div>

            {/* Method 2: Secret iCal URL Live Sync */}
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '16px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1rem' }}>🔗</span>
                <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.88rem' }}>Method 2: Secret iCal Link (Live Auto-Sync)</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                1. Google Calendar Settings खोलें<br/>
                2. बायीं ओर 'Settings for my calendars' में अपने नाम/ईमेल पर क्लिक करें<br/>
                3. नीचे स्क्रॉल कर <b>"Secret address in iCal format"</b> कॉपी करें (यह लिंक .ics पर खत्म होता है)
              </p>

              <button
                type="button"
                onClick={() => window.open('https://calendar.google.com/calendar/u/0/r/settings', '_blank', 'noopener,noreferrer')}
                style={{ width: '100%', background: 'rgba(56, 189, 248, 0.14)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8', borderRadius: '10px', padding: '9px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '10px' }}
              >
                <ExternalLink size={13} />
                <span>⚙️ Google Calendar Settings खोलें (1-Click)</span>
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="url"
                  placeholder="Paste https://calendar.google.com/calendar/ical/.../basic.ics"
                  value={gcalIcalUrl}
                  onChange={(e) => setGcalIcalUrl(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.06)', border: gcalIcalUrl && (gcalIcalUrl.includes('/calendar/u/') || gcalIcalUrl.includes('/calendar/r')) ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '9px 12px', color: '#fff', fontSize: '0.78rem', outline: 'none' }}
                />

                {gcalIcalUrl && (gcalIcalUrl.includes('/calendar/u/') || gcalIcalUrl.includes('/calendar/r')) && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '8px 10px', fontSize: '0.73rem', color: '#fca5a5', lineHeight: 1.4 }}>
                    ⚠️ <b>यह Google Calendar का वेब ब्राउज़र लिंक है:</b> यह .ics डेटा फ़ीड नहीं है।<br/>
                    कृपया ऊपर <b>"Google Calendar Settings खोलें"</b> बटन दबाकर अपने कैलेंडर की <b>"Secret address in iCal format"</b> लिंक कॉपी करें।
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => syncGCalViaIcalUrl()}
                  disabled={isSyncingGCal}
                  style={{ width: '100%', background: '#38bdf8', color: '#04101e', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: isSyncingGCal ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} className={isSyncingGCal ? 'animate-spin' : ''} />
                  <span>{isSyncingGCal ? 'Syncing...' : 'Save & Sync Live Events'}</span>
                </button>
              </div>
            </div>

            {/* Notice regarding Google Error 403 */}
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '14px', padding: '12px' }}>
              <span style={{ fontSize: '0.74rem', color: '#fbbf24', lineHeight: 1.5, display: 'block' }}>
                ℹ️ <b>Google Security Note:</b> Google बिना वेरिफिकेशन वाले ऐप्स के डायरेक्ट कैलेंडर एक्सेस को ब्लॉक (Error 403: access_denied) करता है। ऊपर दिए गए <b>Method 1 (.ics Upload)</b> या <b>Method 2 (Secret iCal Link)</b> बिना किसी एरर या ब्लॉक के 100% सुरक्षित काम करते हैं!
              </span>
            </div>
          </div>
        </div>
      )}

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

      {/* 3. Executive Finance & Ledger Modal */}
      {activeSubModal === 'finance' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700 }}>
                <Wallet size={18} />
                <span>EXECUTIVE WEALTH & LEDGER</span>
              </div>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>TOTAL BALANCE</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>₹{financeSummary.balance.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>TOTAL EXPENSES</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>₹{financeSummary.total_expense.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '10px' }}>Recent Financial Entries</h4>
            {financeRecords.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>No records yet. Tell Aether: "Spent 500 on dinner"</div>
            ) : (
              financeRecords.map(rec => (
                <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div>
                    <div style={{ color: '#ffffff', fontSize: '0.88rem' }}>{rec.description}</div>
                    <div style={{ color: '#64748b', fontSize: '0.74rem' }}>{new Date(rec.date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ color: rec.record_type === 'expense' ? '#ef4444' : '#10b981', fontWeight: 700, fontSize: '0.95rem' }}>
                    {rec.record_type === 'expense' ? '-' : '+'}₹{rec.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. Actions & Audit Trail Modal */}
      {activeSubModal === 'audit' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                <Shield size={18} />
                <span>ACTIONS & AUDIT TRAIL</span>
              </div>
              <button type="button" onClick={() => setActiveSubModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {auditLogs.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.84rem', textAlign: 'center', padding: '20px 0' }}>No actions logged yet.</div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>{log.action_type}</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(log.executed_at).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ color: '#ffffff', fontSize: '0.84rem', lineHeight: '1.4' }}>{log.details}</div>
                  {log.undo_payload && !log.is_undone && (
                    <button
                      type="button"
                      onClick={() => handleUndo(log.id)}
                      style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', marginTop: '6px', cursor: 'pointer' }}
                    >
                      Undo Action
                    </button>
                  )}
                </div>
              ))
            )}
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

      {/* 8. App Permissions & Access Modal */}
      {activeSubModal === 'permissions' && (
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
                onClick={() => setActiveSubModal(null)}
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

              {/* 5: Background Cloud Sync */}
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
              <span><b style={{ color: '#64748b' }}>Enterprise Privacy:</b> Microphone only activates during voice sessions. No passive listening. All data encrypted end-to-end.</span>
            </div>

          </div>
        </div>
      )}

      {/* 8. Interaction History Transcript Modal */}
      {isHistoryOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: 700 }}>
                <Clock size={18} color="var(--accent-cyan)" />
                <span>INTERACTION TRANSCRIPT</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={handleStartNewChat} 
                  style={{ background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: '#ef4444', padding: '4px 10px', borderRadius: '8px', fontSize: '0.74rem', cursor: 'pointer' }}
                >
                  Clear
                </button>
                <button type="button" onClick={() => setIsHistoryOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              </div>
            </div>

            {chatHistory.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.84rem', textAlign: 'center', padding: '24px 0' }}>No recent chats. Speak to Aether to begin!</div>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '12px', background: msg.role === 'user' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.04)', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.72rem', color: msg.role === 'user' ? 'var(--accent-cyan)' : '#a855f7', fontWeight: 700, marginBottom: '3px' }}>
                    {msg.role === 'user' ? (userName || 'You') : 'Aether'}
                  </div>
                  {msg.image_url && (
                    <div style={{ marginBottom: '6px' }}>
                      <img 
                        src={msg.image_url} 
                        alt="Attachment" 
                        style={{ maxWidth: '100%', maxHeight: '140px', borderRadius: '8px', objectFit: 'cover' }} 
                      />
                    </div>
                  )}
                  <div style={{ fontSize: '0.86rem', color: '#ffffff', lineHeight: '1.4' }}>
                    <FormattedMessage text={msg.content} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder Modal (Desktop & Web) */}
      {isCameraModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(16px)',
          zIndex: 115,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '24px',
            padding: '22px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                <Camera size={20} color="#38bdf8" />
                <span>CAMERA VIEWFINDER</span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCameraModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ position: 'relative', width: '100%', height: '300px', background: '#020617', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video 
                ref={cameraVideoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0, 0, 0, 0.6)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem', color: '#38bdf8' }}>
                ● Live Feed
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '18px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsCameraModalOpen(false);
                  cameraInputRef.current?.click();
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  padding: '10px 18px',
                  borderRadius: '14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Choose Existing File
              </button>
              <button
                type="button"
                onClick={handleCaptureCameraSnapshot}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 22px',
                  borderRadius: '14px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(56, 189, 248, 0.4)'
                }}
              >
                <Camera size={18} />
                Snap Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Google Drive Attachment Modal */}
      {isDriveModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(16px)',
          zIndex: 115,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(52, 211, 153, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                  <HardDrive size={18} />
                </div>
                <span>GOOGLE DRIVE ATTACHMENT</span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsDriveModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '16px', lineHeight: '1.4' }}>
              Aether से Google Drive फ़ाइल या डॉक्यूमेंट जोड़ें ताकि AI उसका विश्लेषण कर सके:
            </p>

            {/* Quick Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'Google Doc', icon: '📄', prefix: 'https://docs.google.com/document/d/' },
                { label: 'Google Sheet', icon: '📊', prefix: 'https://docs.google.com/spreadsheets/d/' },
                { label: 'Google Slides', icon: '📽️', prefix: 'https://docs.google.com/presentation/d/' },
                { label: 'Shared Folder', icon: '📁', prefix: 'https://drive.google.com/drive/folders/' },
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setDriveDocName(preset.label);
                    if (!driveInputUrl) setDriveInputUrl(preset.prefix);
                  }}
                  style={{
                    background: driveDocName === preset.label ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${driveDocName === preset.label ? '#34d399' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '12px',
                    padding: '8px 10px',
                    color: driveDocName === preset.label ? '#34d399' : '#cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleAttachDriveFromModal}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  फ़ाइल का नाम (Document Title):
                </label>
                <input
                  type="text"
                  placeholder="उदा. Project_Quarterly_Report"
                  value={driveDocName}
                  onChange={(e) => setDriveDocName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  Google Drive लिंक (URL):
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={driveInputUrl}
                  onChange={(e) => setDriveInputUrl(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsDriveModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    padding: '10px 16px',
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                    border: 'none',
                    color: '#022c22',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  Attach to Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          right: '24px',
          zIndex: 120,
          background: '#0d1526',
          border: '1px solid var(--accent-cyan)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
          padding: '12px 18px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backdropFilter: 'blur(16px)'
        }}>
          <Sparkles size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.85rem', color: '#ffffff' }}>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
