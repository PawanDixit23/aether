import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
  Box,
  Keyboard,
  Zap,
  LogOut,
  Sliders
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
  { id: 'puck', name: 'Puck', desc: 'Crisp, focused, analytical • Male', pitch: 1.0, rate: 1.05 },
  { id: 'charon', name: 'Charon', desc: 'Deep, calm, authoritative • Male', pitch: 0.75, rate: 0.95 },
  { id: 'kore', name: 'Kore', desc: 'Warm, articulate, balanced • Female', pitch: 1.08, rate: 1.0 },
  { id: 'fenrir', name: 'Fenrir', desc: 'Strong, commanding, direct • Male', pitch: 0.82, rate: 1.0 },
  { id: 'aoede', name: 'Aoede', desc: 'Melodic, polished, empathetic • Female', pitch: 1.2, rate: 1.0 },
  { id: 'zephyr', name: 'Zephyr', desc: 'Modern, energetic, concise • Neutral', pitch: 1.0, rate: 1.1 }
];

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

// Lightweight Markdown & Links message formatter
const FormattedMessage = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} style={{ height: '4px' }} />;

        // Match markdown links [title](url) or bold **text** or raw https URLs
        const regex = /(\[.*?\]\(https?:\/\/[^\s)]+\)|\*\*.*?\*\*|https?:\/\/[^\s)]+)/g;
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
                    style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'underline' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {linkMatch[1]}
                  </a>
                );
              }

              // Check raw url
              if (part.startsWith('http://') || part.startsWith('https://')) {
                return (
                  <a
                    key={pIdx}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {part.length > 40 ? part.slice(0, 37) + '...' : part}
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
  const [onboardingStep, setOnboardingStep] = useState(3);
  const [userName, setUserName] = useState(() => localStorage.getItem('aether_user_name') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('aether_gemini_key') || '');

  // Main Jarvis Spec UI States
  const [activeTab, setActiveTab] = useState('aether'); // 'jarvis' | 'today' | 'memory'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTypeInputOpen, setIsTypeInputOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState(null); // 'key' | 'finance' | 'audit' | 'assistant-setup' | 'profile-name'
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

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedLang, setSelectedLang] = useState(() => localStorage.getItem('aether_language') || 'auto');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [agendaFilter, setAgendaFilter] = useState('pending'); // 'pending' | 'completed' | 'all'
  const langDropdownRef = useRef(null);

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
  const [tasks, setTasks] = useState([]);
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

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const userScrolledUpRef = useRef(false);

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

  // Handle Supabase Google OAuth Redirect & Session (same as vivah)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user;
        const gName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Operator';
        const gEmail = user.email || '';
        const gAvatar = user.user_metadata?.avatar_url || '';

        localStorage.setItem('aether_user_name', gName);
        localStorage.setItem('aether_user_email', gEmail);
        if (gAvatar) localStorage.setItem('aether_user_avatar', gAvatar);

        setUserName(gName);
        setUserEmail(gEmail);
        setUserAvatar(gAvatar);

        recordAuthEvent(gEmail, gName);

        localStorage.setItem('aether_onboarding_done', 'true');
        setOnboardingDone(true);
        if (window.location.hash.includes('access_token')) {
          showToast(`Google से सफलतापूर्वक लिंक: ${gName}`, 'success');
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const user = session.user;
        const gName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Operator';
        const gEmail = user.email || '';
        const gAvatar = user.user_metadata?.avatar_url || '';

        localStorage.setItem('aether_user_name', gName);
        localStorage.setItem('aether_user_email', gEmail);
        if (gAvatar) localStorage.setItem('aether_user_avatar', gAvatar);

        setUserName(gName);
        setUserEmail(gEmail);
        setUserAvatar(gAvatar);

        recordAuthEvent(gEmail, gName);

        localStorage.setItem('aether_onboarding_done', 'true');
        setOnboardingDone(true);
        showToast(`Google से सफलतापूर्वक लिंक: ${gName}`, 'success');
      }
    });

    return () => subscription.unsubscribe();
  }, [onboardingStep]);

  const handleGoogleSignIn = async () => {
    if (userEmail) {
      localStorage.setItem('aether_onboarding_done', 'true');
      setOnboardingDone(true);
      return;
    }
    setGoogleAuthLoading(true);
    setGoogleError('');
    try {
      // 1. Trigger Supabase Real Google OAuth (as configured in vivah)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
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
    localStorage.setItem('aether_onboarding_done', 'true');
    setOnboardingDone(true);
    setGoogleLoginSuccess(false);
  };

  const handlePlayVoicePreview = (voice) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setAudioSamplePlaying(voice.id);
        const sampleText = `Hello ${userName || 'Operator'}. I am Aether, voiced by ${voice.name}. All systems operational.`;
        const utterance = new SpeechSynthesisUtterance(sampleText);
        utterance.pitch = voice.pitch;
        utterance.rate = voice.rate;
        utterance.onend = () => setAudioSamplePlaying(null);
        utterance.onerror = () => setAudioSamplePlaying(null);
        window.speechSynthesis.speak(utterance);
      } else {
        showToast(`Voice preview: ${voice.name}`, 'info');
      }
    } catch (e) {
      setAudioSamplePlaying(null);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (e) {
      console.log('Mic request:', e);
    }
    localStorage.setItem('aether_onboarding_done', 'true');
    setOnboardingDone(true);
    showToast('Aether सिस्टम सक्रिय! स्वागत है। (Aether Activated)', 'success');
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

    // 3. Service Worker notification (mandatory for mobile PWA & background OS alerts)
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

  // Register Service Worker for Mobile PWA and Native Push
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Aether SW Active:', reg.scope))
        .catch(err => console.log('Aether SW error:', err));
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => setPushPermission(p));
      }
    }
  }, []);

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

  // Fetch all backend data and check due reminders
  const refreshAllData = async () => {
    try {
      const [resBrief, resChat, resTasks, resFin, resFinSum, resMem, resAudit, resNews, resDue] = await Promise.all([
        fetch(`${API_BASE}/briefing`),
        fetch(`${API_BASE}/chat/history`),
        fetch(`${API_BASE}/tasks`),
        fetch(`${API_BASE}/finance/records`),
        fetch(`${API_BASE}/finance/summary`),
        fetch(`${API_BASE}/memory`),
        fetch(`${API_BASE}/audit-logs`),
        fetch(`${API_BASE}/news?limit=4`),
        fetch(`${API_BASE}/reminders/due`)
      ]);

      if (resBrief.ok) setBriefing(await resBrief.json());
      if (resChat.ok) {
        const chats = await resChat.json();
        setChatHistory(prev => {
          if (prev.length === chats.length && prev[prev.length - 1]?.content === chats[chats.length - 1]?.content) {
            return prev;
          }
          return chats;
        });
      }
      if (resTasks.ok) setTasks(await resTasks.json());
      if (resFin.ok) setFinanceRecords(await resFin.json());
      if (resFinSum.ok) setFinanceSummary(await resFinSum.json());
      if (resMem.ok) setMemories(await resMem.json());
      if (resAudit.ok) setAuditLogs(await resAudit.json());
      if (resNews.ok) setNewsItems(await resNews.json());
      
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
          
          fetch(`${API_BASE}/reminders/${dueItem.id}/ack`, { method: 'POST' });
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

    // Explicitly prompt / unlock microphone via getUserMedia (Essential for Android WebView & Mobile Browsers)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (micErr) {
      console.warn('Microphone permission check failed:', micErr);
      showToast("कृपया माइक्रोफ़ोन अनुमति (Microphone Permission) दें।", 'error');
      return;
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
          showToast("माइक्रोफ़ोन अनुमति अस्वीकृत। सेटिंग्स में माइक ऑन करें।", 'error');
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

  // Text to Speech
  const speakText = (text) => {
    if (!('speechSynthesis' in window) || !voiceOutputEnabled) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\[.*?\]\(.*?\)/g, '').replace(/[*_#`🔗]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const activeVoice = AETHER_VOICES.find(v => v.id === selectedVoice);
    utterance.rate = (activeVoice ? activeVoice.rate : 1.05) * speechRate;
    utterance.pitch = activeVoice ? activeVoice.pitch : 1.0;
    const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
    utterance.lang = (selectedLang === 'hi' || hasDevanagari) ? 'hi-IN' : 'en-IN';
    
    setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
    showToast("🔊 Aether बोल रहा है...", "info");
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
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isProcessing) return;

    userScrolledUpRef.current = false;
    setChatHistory(prev => [...prev, { role: 'user', content: prompt, created_at: new Date().toISOString() }]);
    setInputText('');
    setIsProcessing(true);
    setShowConversation(true);

    try {
      const payload = {
        input_text: prompt,
        latitude: userCoords?.latitude || null,
        longitude: userCoords?.longitude || null,
        language: selectedLang,
        client_time: new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        api_key: localStorage.getItem('aether_gemini_key') || '',
        user_name: localStorage.getItem('aether_user_name') || userName || 'Operator'
      };

      const resp = await fetch(`${API_BASE}/action/quick-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await resp.json();
      
      showToast(result.message, result.status === 'executed' ? 'success' : 'info');
      await refreshAllData();
    } catch (err) {
      showToast("Aether कोर से संपर्क नहीं हो पाया", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Start a New Chat
  const handleStartNewChat = async () => {
    try {
      await fetch(`${API_BASE}/chat/history`, { method: 'DELETE' });
      setChatHistory([]);
      setInputText('');
      showToast("नई चैट शुरू की गई!", 'success');
    } catch (err) {
      showToast("Failed to reset chat", 'error');
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      await fetch(`${API_BASE}/tasks/${taskId}/toggle`, { method: 'PUT' });
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' });
      refreshAllData();
      showToast("कार्य हटा दिया गया", 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    try {
      await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskInput.trim(), priority: 'medium' })
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
      await fetch(`${API_BASE}/memory/${memId}`, { method: 'DELETE' });
      refreshAllData();
      showToast("स्मृति वॉल्ट से हटा दी गई", 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUndo = async (logId) => {
    try {
      await fetch(`${API_BASE}/audit-logs/${logId}/undo`, { method: 'POST' });
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
            {onboardingStep > 1 ? (
              <button
                type="button"
                onClick={() => setOnboardingStep(prev => Math.max(1, prev - 1))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px'
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
                  borderRadius: '20px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  padding: '4px 12px'
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

          {/* STEP 7: AWAY WORK */}
          {onboardingStep === 7 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>
              <div className="step-badge">Proactive Autonomous Agent</div>
              <h1 className="serif-title">
                Aether works while you're <span className="serif-italic">away.</span>
              </h1>
              <p className="step-desc">
                Even when the app is closed, your autonomous core monitors markets, pending deadlines, and compiles your 8:00 AM briefing.
              </p>

              {/* Notification Mock Card */}
              <div className="notification-mock-card">
                <div className="notif-header">
                  <div className="notif-brand">
                    <Sparkles size={14} color="#a855f7" />
                    <span>AETHER CORE</span>
                  </div>
                  <span className="notif-time">8:00 AM</span>
                </div>
                <div className="notif-title">Good morning, {userName || 'Operator'}.</div>
                <div className="notif-body">
                  "2 critical reminders today, ₹1,200 pending invoice, Jaipur weather is 28°C sunny. Ready when you are."
                </div>
              </div>

              <button
                type="button"
                className="btn-onboarding-primary"
                onClick={() => setOnboardingStep(8)}
              >
                Enable Autonomous Monitoring →
              </button>
            </div>
          )}

          {/* STEP 8: MICROPHONE AUTHORIZATION */}
          {onboardingStep === 8 && (
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
              >
                Activate Microphone & Enter Aether →
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
            VIEW 2: MAIN APP TABS (Jarvis | Today | Memory)
            ========================================================================= */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '76px' }}>

          {/* TAB 1: JARVIS MAIN SCREEN (Exact 1:1 Spec from Screenshot 1) */}
          {activeTab === 'aether' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              
              {/* TOP BAR */}
              <div className="jarvis-top-bar">
                <button 
                  type="button" 
                  className="jarvis-icon-btn" 
                  onClick={() => setIsHistoryOpen(true)}
                  title="Interaction History"
                >
                  <Clock size={22} />
                </button>

                <div style={{ position: 'relative' }}>
                  <button 
                    type="button" 
                    className="jarvis-title-dropdown"
                    onClick={() => setIsPersonaDropdownOpen(!isPersonaDropdownOpen)}
                  >
                    <span className="aether-top-mini-logo">Æ</span>
                    <span className="jarvis-title-text">
                      Aether
                    </span>
                    <ChevronDown size={14} color="#94a3b8" />
                  </button>

                  {isPersonaDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#0d1527',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '14px',
                      padding: '6px',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
                      zIndex: 100,
                      minWidth: '160px'
                    }}>
                      {AETHER_VOICES.map(voice => (
                        <button
                          key={voice.id}
                          type="button"
                          onClick={() => {
                            setSelectedVoice(voice.id);
                            localStorage.setItem('aether_selected_voice', voice.id);
                            setIsPersonaDropdownOpen(false);
                            showToast(`Voice set to ${voice.name}`, 'info');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '8px 12px',
                            border: 'none',
                            background: selectedVoice === voice.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                            color: selectedVoice === voice.id ? 'var(--accent-cyan)' : '#e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.84rem',
                            fontWeight: selectedVoice === voice.id ? 700 : 500
                          }}
                        >
                          <span>{voice.name}</span>
                          {selectedVoice === voice.id && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  type="button" 
                  className="jarvis-icon-btn" 
                  onClick={() => setIsSettingsOpen(true)}
                  title="Settings"
                >
                  <Settings size={22} />
                </button>
              </div>

              {/* CENTER STAGE */}
              <div className="jarvis-center-stage">
                
                {/* Signature Aether Brand Logo Orb (Interactive, Acoustic Halo Rings, Audio Reactive) */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '18px 0 26px' }}>
                  <div className="aether-logo-ring-outer" />
                  <div className="aether-logo-ring-inner" />
                  <div 
                    className={`aether-brand-orb aether-postlogin-logo ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
                    onClick={toggleListening}
                    title="Tap to speak with Aether / माइक शुरू करें"
                  >
                    <div className="aether-orb-badge hero">Æ</div>
                    {isListening && <div className="jarvis-listening-pulse" />}
                  </div>
                </div>

                {/* Big Dynamic Greeting */}
                <h1 className="jarvis-greeting-title">
                  {timeGreeting}
                </h1>

                {/* Dynamic Subtitle */}
                <p className="jarvis-greeting-sub">
                  {isListening 
                    ? 'Listening... Speak naturally in English, Hindi, or Hinglish' 
                    : isSpeaking 
                      ? 'Aether is speaking...' 
                      : 'Say "open Spotify" — Aether launches apps'
                  }
                </p>

                {/* Latest AI Response (Full Content with Clickable Links) */}
                {chatHistory.length > 0 && (
                  <div className="jarvis-response-bubble">
                    <div className="jarvis-bubble-header">
                      <span className="jarvis-bubble-tag">Assistant</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setIsHistoryOpen(true)}
                          style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', borderRadius: '8px', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}
                          title="View Full Interaction Transcript"
                        >
                          <Clock size={12} /> Full Log
                        </button>
                        <button
                          type="button"
                          onClick={() => speakText(chatHistory[chatHistory.length - 1].content)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem' }}
                        >
                          <Volume2 size={13} /> Speak
                        </button>
                      </div>
                    </div>
                    <div className="jarvis-bubble-text">
                      <FormattedMessage text={chatHistory[chatHistory.length - 1].content} />
                    </div>
                  </div>
                )}

                {/* Type Toggle Pill */}
                <button
                  type="button"
                  className={`jarvis-type-pill ${isTypeInputOpen ? 'active' : ''}`}
                  onClick={() => setIsTypeInputOpen(!isTypeInputOpen)}
                >
                  <Keyboard size={15} />
                  <span>Type</span>
                </button>

                {/* Expandable Prompt Input Field */}
                {isTypeInputOpen && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (inputText.trim()) {
                        handleSendPrompt(inputText);
                      }
                    }} 
                    className="jarvis-input-bar-wrap"
                  >
                    <input
                      type="text"
                      className="jarvis-input-field"
                      placeholder="Ask Aether anything..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`jarvis-action-circle-btn mic ${isListening ? 'active' : ''}`}
                      title={isListening ? "Stop listening" : "Start voice input"}
                    >
                      <Mic size={16} />
                    </button>
                    <button
                      type="submit"
                      disabled={!inputText.trim() || isProcessing}
                      className="jarvis-action-circle-btn send"
                      title="Send prompt"
                    >
                      <ArrowUp size={16} />
                    </button>
                  </form>
                )}
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
              <div style={{ background: '#101625', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', padding: '18px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.85rem' }}>
                  <Bell size={16} />
                  <span>ACTIVE REMINDERS</span>
                </div>
                {tasks.filter(t => t.reminder_time && !t.is_completed).length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '0.84rem' }}>No pending reminders today. Speak to set one!</div>
                ) : (
                  tasks.filter(t => t.reminder_time && !t.is_completed).map(task => (
                    <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div>
                        <div style={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: 500 }}>{task.title}</div>
                        <div style={{ color: 'var(--accent-cyan)', fontSize: '0.76rem', marginTop: '2px' }}>⏰ {task.reminder_time}</div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleToggleTask(task.id)}
                        style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: 'var(--accent-cyan)', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.76rem' }}
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
                    <span>DAILY TASKS ({tasks.filter(t => !t.is_completed).length})</span>
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

                {tasks.map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <div 
                      onClick={() => handleToggleTask(task.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                    >
                      {task.is_completed ? <CheckCircle2 size={16} color="#10b981" /> : <Circle size={16} color="#64748b" />}
                      <span style={{ fontSize: '0.88rem', color: task.is_completed ? '#64748b' : '#ffffff', textDecoration: task.is_completed ? 'line-through' : 'none' }}>
                        {task.title}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteTask(task.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

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

          {/* FIXED BOTTOM TAB BAR (Screenshot 1) */}
          <nav className="jarvis-bottom-tabbar">
            <button 
              type="button" 
              className={`jarvis-tab-item ${activeTab === 'aether' ? 'active' : ''}`}
              onClick={() => setActiveTab('aether')}
            >
              <div className="aether-tab-logo-icon">Æ</div>
              <span className="jarvis-tab-label">Aether</span>
            </button>

            <button 
              type="button" 
              className={`jarvis-tab-item ${activeTab === 'today' ? 'active' : ''}`}
              onClick={() => setActiveTab('today')}
            >
              <CheckSquare size={22} />
              <span className="jarvis-tab-label">Today</span>
            </button>

            <button 
              type="button" 
              className={`jarvis-tab-item ${activeTab === 'memory' ? 'active' : ''}`}
              onClick={() => setActiveTab('memory')}
            >
              <Layers size={22} />
              <span className="jarvis-tab-label">Memory</span>
            </button>
          </nav>

        </div>
      )}

      {/* =========================================================================
          SUB-MODALS (Key, Finance, Audit, Profile Name, Assistant Setup)
          ========================================================================= */}

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
                    <div style={{ color: '#e2e8f0', fontSize: '0.84rem', flex: 1, paddingRight: '10px' }}>{mem.content}</div>
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
                  <div style={{ fontSize: '0.86rem', color: '#ffffff', lineHeight: '1.4' }}>
                    <FormattedMessage text={msg.content} />
                  </div>
                </div>
              ))
            )}
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
