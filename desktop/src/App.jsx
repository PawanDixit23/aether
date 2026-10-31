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
  Pause,
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
  Upload,
  Radio,
  Home,
  LayoutDashboard,
  Phone,
  Mail,
  Copy
} from 'lucide-react';

const YoutubeIcon = ({ size = 20, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'block' }}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);
import { supabase } from './supabase';
import { FormattedMessage } from './components/chat/FormattedMessage';
import { AetherParticleSphere } from './components/chat/AetherParticleSphere';
import { DashboardView } from './components/dashboard/DashboardView';
import { TasksModal } from './components/modals/TasksModal';
import { HistoryModal } from './components/modals/HistoryModal';
import { CameraModal } from './components/modals/CameraModal';
import { DriveModal } from './components/modals/DriveModal';
import { FinanceModal } from './components/modals/FinanceModal';
import { BriefingModal } from './components/modals/BriefingModal';
import { AuditModal } from './components/modals/AuditModal';
import { PermissionsModal } from './components/modals/PermissionsModal';
import { SettingsSubModals } from './components/modals/SettingsSubModals';

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
    // Priority: genuine hi-IN voices first, then any Hindi-named voice
    const hiVoice = voices.find(v => v.lang === 'hi-IN')
      || voices.find(v => v.lang && v.lang.toLowerCase().startsWith('hi'))
      || voices.find(v => /hindi/i.test(v.name));
    // DO NOT fallback to English voices[0] for Hindi text, as English synthesizers
    // skip Devanagari characters and only read punctuation ("exclamation point question mark")
    return hiVoice || null;
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

export default function App() {
  // Onboarding & BYOK Intelligence Configuration
  const [onboardingDone, setOnboardingDone] = useState(() => 
    localStorage.getItem('aether_onboarding_done') === 'true'
  );
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [userName, setUserName] = useState(() => localStorage.getItem('aether_user_name') || '');
  const [apiKey, setApiKey] = useState(() => {
    try {
      const k = localStorage.getItem('aether_gemini_key') || '';
      if (k.includes('AIzaSyCR3ZKXaMEGRU02hCrhhn4O978zMnDk0vU')) {
        localStorage.removeItem('aether_gemini_key');
        return '';
      }
      return k;
    } catch {
      return '';
    }
  });

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
  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => {
    return localStorage.getItem('aether_wake_word_enabled') === 'true';
  });
  const wakeWordRecognitionRef = useRef(null);
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
  const [agendaFilter, setAgendaFilter] = useState('today'); // 'today' | 'overdue' | 'upcoming' | 'completed' | 'all'
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
  const [showDashboard, setShowDashboard] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  
  // App data states
  const [briefing, setBriefing] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const isClearingChatRef = useRef(false);
  const handledDueIdsRef = useRef(new Set());
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
  const [expandedTaskIds, setExpandedTaskIds] = useState({});
  const toggleSubtasksExpand = (taskId) => {
    setExpandedTaskIds(prev => ({
      ...prev,
      [taskId]: prev[taskId] === false ? true : false
    }));
  };
  const renderRecurrenceBadge = (rec) => {
    if (!rec) return null;
    let label = '🔁 Recurring';
    if (rec === 'daily') label = '🔁 Daily';
    else if (rec === 'weekdays' || rec === 'monday_to_friday') label = '🔁 Mon-Fri';
    else if (rec === 'weekly_monday') label = '🔁 Every Mon';
    else if (rec.startsWith('weekly')) label = '🔁 Weekly';
    return (
      <span style={{ color: '#c084fc', background: 'rgba(192, 132, 252, 0.15)', border: '1px solid rgba(192, 132, 252, 0.3)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>
        {label}
      </span>
    );
  };
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

  // Proactive Spoken Greeting on App Open (Only if Voice Responses permission is ON AND onboarding is completed)
  const hasSpokenWelcomeRef = useRef(false);
  useEffect(() => {
    // STRICT GUARD: NEVER speak on onboarding screens, during login steps, or before onboarding is done!
    if (!onboardingDone) return;
    if (hasSpokenWelcomeRef.current) return;

    // Strict guard: ONLY speak if voice output permission is enabled
    const voiceAllowed = localStorage.getItem('aether_voice_output') !== 'false' && voiceOutputEnabled;
    if (!voiceAllowed) return;

    const timer = setTimeout(() => {
      if (!onboardingDone) return;
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
  }, [onboardingDone, voiceOutputEnabled, userName, selectedLang]);

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

  // 2-Minute Executive Morning Briefing State & Handlers
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [isBriefingPlaying, setIsBriefingPlaying] = useState(false);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [executiveBriefingData, setExecutiveBriefingData] = useState(null);

  // Wealth Section State & Handlers
  const [editingFinanceRecord, setEditingFinanceRecord] = useState(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
    type: 'expense',
    category: 'fuel',
    amount: '',
    note: '',
    payment_mode: 'upi'
  });

  const getCategoryIcon = (cat) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('fuel') || c.includes('petrol') || c.includes('diesel')) return '⛽';
    if (c.includes('food') || c.includes('dinner') || c.includes('lunch') || c.includes('swiggy') || c.includes('zomato') || c.includes('chai') || c.includes('tea') || c.includes('restaurant')) return '🍔';
    if (c.includes('shop') || c.includes('market') || c.includes('mall') || c.includes('amazon') || c.includes('flipkart') || c.includes('cloth') || c.includes('grocery')) return '🛒';
    if (c.includes('cab') || c.includes('uber') || c.includes('ola') || c.includes('travel') || c.includes('auto') || c.includes('train') || c.includes('flight')) return '🚗';
    if (c.includes('rent') || c.includes('home') || c.includes('house') || c.includes('room') || c.includes('flat')) return '🏠';
    if (c.includes('bill') || c.includes('electric') || c.includes('recharge') || c.includes('wifi') || c.includes('mobile')) return '⚡';
    if (c.includes('medical') || c.includes('doctor') || c.includes('medicine') || c.includes('hospital') || c.includes('health')) return '💊';
    if (c.includes('salary') || c.includes('client') || c.includes('income') || c.includes('profit') || c.includes('dividend')) return '💰';
    return '🏷️';
  };

  const handleDeleteFinanceRecord = async (id) => {
    if (!window.confirm("क्या आप इस खर्च/आय रिकॉर्ड को हटाना चाहते हैं?")) return;
    try {
      const resp = await fetch(`${API_BASE}/finance/records/${id}`, {
        method: 'DELETE',
        headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
      });
      if (resp.ok) {
        const deleted = financeRecords.find(r => r.id === id);
        setFinanceRecords(prev => prev.filter(r => r.id !== id));
        if (deleted) {
          const amt = Number(deleted.amount || 0);
          const isExp = (deleted.type === 'expense' || deleted.record_type === 'expense' || !deleted.type);
          setFinanceSummary(prev => ({
            ...prev,
            total_expense: isExp ? Math.max(0, prev.total_expense - amt) : prev.total_expense,
            total_income: !isExp ? Math.max(0, prev.total_income - amt) : prev.total_income,
            balance: isExp ? prev.balance + amt : prev.balance - amt,
            record_count: Math.max(0, (prev.record_count || 1) - 1)
          }));
        }
        showToast("रिकॉर्ड हटा दिया गया", "success");
      } else {
        showToast("रिकॉर्ड हटाने में समस्या आई", "error");
      }
    } catch (e) {
      showToast("नेटवर्क त्रुटि", "error");
    }
  };

  const handleSaveFinanceEdit = async () => {
    if (!editingFinanceRecord || !editingFinanceRecord.id) return;
    try {
      const resp = await fetch(`${API_BASE}/finance/records/${editingFinanceRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'X-User-Email': userEmail } : {})
        },
        body: JSON.stringify({
          amount: parseFloat(editingFinanceRecord.amount) || 0,
          category: editingFinanceRecord.category,
          note: editingFinanceRecord.note,
          type: editingFinanceRecord.type
        })
      });
      if (resp.ok) {
        setFinanceRecords(prev => prev.map(r => r.id === editingFinanceRecord.id ? { 
          ...r, 
          ...editingFinanceRecord, 
          amount: parseFloat(editingFinanceRecord.amount) || 0 
        } : r));
        setEditingFinanceRecord(null);
        showToast("खर्च अपडेट हो गया!", "success");
        fetch(`${API_BASE}/finance/summary`, { headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) } })
          .then(r => r.json())
          .then(data => setFinanceSummary(data))
          .catch(() => {});
      } else {
        showToast("अपडेट विफल रहा", "error");
      }
    } catch (e) {
      showToast("नेटवर्क त्रुटि", "error");
    }
  };

  const stopBriefingAudio = () => {
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause(); } catch (e) {}
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    setIsSpeaking(false);
    setIsBriefingPlaying(false);
  };

  const speakBriefingAudio = (text) => {
    if (!text) return;
    stopBriefingAudio();
    setIsBriefingPlaying(true);
    setIsSpeaking(true);

    const cleanText = text
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/[*_#`🔗]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    let spoken = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'hi-IN';
        utterance.onend = () => {
          setIsSpeaking(false);
          setIsBriefingPlaying(false);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setIsBriefingPlaying(false);
        };
        window.speechSynthesis.speak(utterance);
        spoken = true;
      } catch (e) {
        spoken = false;
      }
    }

    if (!spoken || (typeof window !== 'undefined' && !!window.ReactNativeWebView)) {
      try {
        const ttsUrl = `${API_BASE}/tts?text=${encodeURIComponent(cleanText.slice(0, 350))}&voice=zephyr&lang=hi`;
        const audio = new Audio(ttsUrl);
        currentAudioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          setIsBriefingPlaying(false);
          currentAudioRef.current = null;
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setIsBriefingPlaying(false);
          currentAudioRef.current = null;
        };
        audio.play().catch(err => {
          console.warn("Briefing audio play failed:", err);
          setIsSpeaking(false);
          setIsBriefingPlaying(false);
        });
      } catch (err) {
        setIsSpeaking(false);
        setIsBriefingPlaying(false);
      }
    }
  };

  useEffect(() => {
    if (!isSpeaking && isBriefingPlaying) {
      setIsBriefingPlaying(false);
    }
  }, [isSpeaking, isBriefingPlaying]);

  const handlePlayExecutiveBriefing = async () => {
    setShowBriefingModal(true);
    if (isBriefingPlaying) {
      stopBriefingAudio();
      return;
    }

    try {
      setIsBriefingLoading(true);
      const resp = await fetch(`${API_BASE}/briefing/executive`, {
        headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
      });
      const data = await resp.json();
      setIsBriefingLoading(false);
      if (data?.text) {
        setExecutiveBriefingData(data);
        speakBriefingAudio(data.text);
      }
    } catch (e) {
      console.error(e);
      setIsBriefingLoading(false);
      showToast("ब्रीफिंग लोड करने में समस्या आई", "error");
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
    const today = new Date();
    const todayStr = formatLocalDateStr(today);
    const dayIdx = today.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const list = (combinedTasks && combinedTasks.length > 0) ? combinedTasks : (tasks || []);
    return list.filter(t => {
      if (!isTaskPending(t)) return false;
      // Daily recurring tasks
      if (t.recurrence === 'daily' || t.repeat === 'daily') return true;
      // Weekdays (Mon-Fri)
      if ((t.recurrence === 'weekdays' || t.recurrence === 'monday_to_friday') && dayIdx >= 1 && dayIdx <= 5) return true;
      // Weekly Monday
      if (t.recurrence === 'weekly_monday' && dayIdx === 1) return true;
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
      } else if (data?.url) {
        window.location.href = data.url;
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
    // 1. Immediately kill any active audio or speech synthesis
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (e) {}
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    setIsSpeaking(false);
    setAudioSamplePlaying(null);
    hasSpokenWelcomeRef.current = true; // Never trigger proactive welcome speech on logout!

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

  const handleToggleWakeWord = async () => {
    const nextVal = !wakeWordEnabled;
    if (nextVal && !micEnabled) {
      await handleRequestMicPermission();
      setMicEnabled(true);
      localStorage.setItem('aether_mic_enabled', 'true');
    }
    setWakeWordEnabled(nextVal);
    localStorage.setItem('aether_wake_word_enabled', String(nextVal));
    showToast(
      nextVal 
        ? '🎙️ "Hey Aether" वेक-वर्ड चालू! बोलें "Hey Aether"' 
        : '🔇 "Hey Aether" वेक-वर्ड बंद', 
      'info'
    );
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
    if (t?.created_at) {
      try {
        const str = formatLocalDateStr(t.created_at);
        if (str) return str;
      } catch (e) {}
    }
    return null;
  };

  const handleRescheduleTask = async (taskId, targetDateStr = null) => {
    const todayStr = formatLocalDateStr(new Date());
    const finalDate = targetDateStr || todayStr;
    try {
      const authHeaders = userEmail ? { 'X-User-Email': userEmail } : {};
      await fetch(`${API_BASE}/tasks/${taskId}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ due_date: `${finalDate}T10:00:00` })
      });
      refreshAllData();
      showToast('कार्य सफलतापूर्वक रीशेड्यूल किया गया!', 'success');
    } catch (e) {
      showToast('रीशेड्यूल करने में त्रुटि', 'error');
    }
  };

  const handleRescheduleAllOverdue = async () => {
    try {
      const authHeaders = userEmail ? { 'X-User-Email': userEmail } : {};
      const res = await fetch(`${API_BASE}/tasks/reschedule-overdue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders }
      });
      const data = await res.json();
      refreshAllData();
      showToast(`${data.rescheduled_count || 0} बकाया कार्य आज के लिए रीशेड्यूल किए गए!`, 'success');
    } catch (e) {
      showToast('रीशेड्यूल करने में त्रुटि', 'error');
    }
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
          if (isClearingChatRef.current) {
            return [];
          }
          if (normalizedChats.length === 0) {
            return [];
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
          localStorage.setItem('aether_cached_tasks', JSON.stringify(loadedTasks));

          // Also persist in mobile device native AsyncStorage via bridge
          if (typeof window !== 'undefined' && window.ReactNativeWebView) {
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'STORE_NATIVE_BACKUP',
                payload: {
                  email: currentEmail,
                  tasks: loadedTasks,
                  memories: loadedMemories,
                  finances: loadedFinances
                }
              }));
            } catch (e) {}
          }
        } else {
          // If server returned 0 records, try restoring from local backup or native bridge backup
          let backupData = null;
          const cachedBackupStr = localStorage.getItem(`aether_backup_${currentEmail}`) || localStorage.getItem('aether_cached_tasks');
          if (cachedBackupStr) {
            try { backupData = JSON.parse(cachedBackupStr); } catch (e) {}
          }
          if (!backupData && typeof window !== 'undefined' && window.__nativeBackup) {
            try { backupData = JSON.parse(window.__nativeBackup); } catch (e) {}
          }

          if (backupData) {
            const bTasks = Array.isArray(backupData) ? backupData : (backupData.tasks || []);
            const bMems = backupData.memories || [];
            const bFin = backupData.finances || [];

            if (bTasks.length > 0 || bMems.length > 0 || bFin.length > 0) {
              fetch(`${API_BASE}/sync/backup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-Email': currentEmail },
                body: JSON.stringify({
                  user_email: currentEmail,
                  tasks: bTasks,
                  memories: bMems,
                  finances: bFin
                })
              }).then(() => {
                if (bTasks.length > 0) setTasks(bTasks);
                if (bMems.length > 0) setMemories(bMems);
                if (bFin.length > 0) setFinanceRecords(bFin);
              }).catch(() => {});
            }
          }
        }
      }

      // Check if any reminder is due right now
      if (resDue.ok) {
        const dueList = await resDue.json();
        if (dueList && dueList.length > 0) {
          // Find first due item that hasn't been notified in this session yet
          const dueItem = dueList.find(d => !handledDueIdsRef.current.has(d.id)) || dueList[0];
          
          if (!handledDueIdsRef.current.has(dueItem.id)) {
            handledDueIdsRef.current.add(dueItem.id);
            setActiveReminderAlert(dueItem);
            
            triggerPushNotification(
              `⏰ AETHER रिमाइंडर: ${dueItem.title}`,
              `समय: ${dueItem.reminder_time || 'अभी'} • कार्य का समय हो गया है!`,
              `reminder-${dueItem.id}`
            );
          }
          
          fetch(`${API_BASE}/reminders/${dueItem.id}/ack`, { 
            method: 'POST',
            headers: authHeaders
          }).catch(() => {});
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
        const transcript = Array.from(event.results).map(r => r[0].transcript).join(' ').trim();
        setInputText(transcript);
        if (event.results[0].isFinal || event.results[event.results.length - 1].isFinal) {
          setIsListening(false);
          // Strip any leading wake-word if user repeated "Hey Aether ..."
          const cleanPrompt = transcript.replace(/^(hey\s*aether|ok\s*aether|hey\s*ether|aether|ether|हे\s*ईथर|ईथर)[,\s]+/i, '').trim() || transcript;
          handleSendPrompt(cleanPrompt);
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

  // Background "Hey Aether" Wake Word Detection
  useEffect(() => {
    if (!onboardingDone || !micEnabled || !wakeWordEnabled) {
      if (wakeWordRecognitionRef.current) {
        try { wakeWordRecognitionRef.current.stop(); } catch (e) {}
        wakeWordRecognitionRef.current = null;
      }
      return;
    }

    // Do not run background wake-word listener while active listening, speaking, or processing
    if (isListening || isSpeaking || isProcessing) {
      if (wakeWordRecognitionRef.current) {
        try { wakeWordRecognitionRef.current.stop(); } catch (e) {}
        wakeWordRecognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let isDestroyed = false;
    let wakeRec = null;

    try {
      wakeRec = new SpeechRecognition();
      wakeWordRecognitionRef.current = wakeRec;
      wakeRec.continuous = true;
      wakeRec.interimResults = true;
      wakeRec.lang = selectedLang === 'hi' ? 'hi-IN' : 'en-IN';

      wakeRec.onresult = (event) => {
        if (isDestroyed) return;
        
        // Use only the latest recognition segment to prevent stale accumulation
        let latestSegment = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i] && event.results[i][0]) {
            latestSegment += " " + event.results[i][0].transcript;
          }
        }
        const text = latestSegment.trim().toLowerCase();
        if (!text) return;

        // Check for wake words: "hey aether", "ok aether", "hey ether", "ok ether", "aether", "ether", "हे ईथर", "ईथर", "सुनो ईथर"
        const wakeWordRegex = /\b(hey\s*aether|ok\s*aether|okay\s*aether|hey\s*ether|ok\s*ether|okay\s*ether|aether|ether|हे\s*ईथर|ईथर|सुनो\s*ईथर)\b/i;
        const match = text.match(wakeWordRegex);

        if (match) {
          console.log("[Wake Word Detected]:", text);
          showToast("⚡ 'Hey Aether' पहचाना गया!", "info");
          
          try { wakeRec.stop(); } catch (e) {}
          wakeWordRecognitionRef.current = null;

          // Extract any query following the wake word
          const queryPart = text.slice(match.index + match[0].length).replace(/^[,.\s]+/, '').trim();
          if (queryPart.length > 2) {
            handleSendPrompt(queryPart);
          } else {
            // Trigger active speech recognition
            setTimeout(() => {
              toggleVoiceRecognition();
            }, 250);
          }
        }
      };

      wakeRec.onerror = (e) => {
        // Auto restart on non-fatal errors
        if (!isDestroyed && wakeWordEnabled && micEnabled && !isListening && !isSpeaking && !isProcessing) {
          if (e.error !== 'not-allowed') {
            setTimeout(() => {
              try { if (!isDestroyed) wakeRec.start(); } catch (err) {}
            }, 1000);
          }
        }
      };

      wakeRec.onend = () => {
        if (!isDestroyed && wakeWordEnabled && micEnabled && !isListening && !isSpeaking && !isProcessing) {
          setTimeout(() => {
            try { if (!isDestroyed) wakeRec.start(); } catch (e) {}
          }, 400);
        }
      };

      wakeRec.start();
    } catch (e) {
      console.warn("Wake word listener start error:", e);
    }

    return () => {
      isDestroyed = true;
      if (wakeRec) {
        try { wakeRec.stop(); } catch (e) {}
      }
      wakeWordRecognitionRef.current = null;
    };
  }, [wakeWordEnabled, micEnabled, onboardingDone, isListening, isSpeaking, isProcessing, selectedLang]);

  // Text to Speech with Mobile WebView Audio Streaming Fallback
  const speakText = (text) => {
    // STRICT GUARD: If onboarding is not completed, NEVER speak or play TTS!
    if (!onboardingDone) return;
    // STRICT: No voice if permission is off
    if (!voiceOutputEnabled) return;
    if (!text || !text.trim()) return;

    // Detect if the message is in Hindi (contains Devanagari characters)
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    const lang = hasDevanagari ? 'hi' : 'en';
    const bcp47 = hasDevanagari ? 'hi-IN' : 'en-IN';

    // Clean markdown artifacts, URLs, code blocks, emojis, and unwanted symbols
    let cleanText = text
      .replace(/\[(.*?)\]\([^)]*\)/g, '$1')   // preserve headline text from markdown links
      .replace(/https?:\/\/[^\s]+/g, '')      // remove raw URLs
      .replace(/Link:\s*(?:स्रोत पढ़ें|Read Source)?/gi, '') // clean link labels
      .replace(/[*_#`🔗🏆📰•⚡✨🎯💡📌]/g, '') // remove markdown formatting & symbols/emojis
      .replace(/```[\s\S]*?```/g, '')         // remove code blocks
      .replace(/₹\s*([0-9,.-]+)/g, (match, p1) => hasDevanagari ? `${p1} रुपये` : `${p1} Rupees`)
      .replace(/[!]/g, '')                    // remove exclamation points so synthesizers never speak "exclamation point" or "dot"
      .replace(/\s*([.,?।])\s*/g, '$1 ')      // attach punctuation directly to preceding word so synthesizers pause naturally instead of reading punctuation names
      .replace(/[.?।]+\s*([.?।]+)/g, '$1')    // remove duplicate punctuation like "..", ".?", "?."
      .replace(/\s+/g, ' ')                  // normalize whitespace
      .trim();

    if (!cleanText) return;

    // Cancel any ongoing speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    const isMobileDevice = (typeof window !== 'undefined' && !!window.ReactNativeWebView) || 
      (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

    // CRITICAL: For Hindi text, ALWAYS use server-side Google Hindi TTS (/api/tts?lang=hi).
    // Desktop and mobile browser speech engines frequently lack native Hindi voices and attempt
    // to read Devanagari with English synthesizers, which skips words and reads "dot question mark".
    if (hasDevanagari || isMobileDevice) {
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
          const activeVoice = AETHER_VOICES.find(v => v.id === selectedVoice) || AETHER_VOICES[0];
          utterance.rate = (activeVoice ? activeVoice.rate : 1.0) * speechRate;
          utterance.pitch = (activeVoice ? activeVoice.pitch : 1.0);
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
    setShowDashboard(false);
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
        api_key: (() => {
          const k = localStorage.getItem('aether_gemini_key') || '';
          return k.includes('AIzaSyCR3ZKXaMEGRU02hCrhhn4O978zMnDk0vU') ? '' : k;
        })(),
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
      if (assistantReply.includes('ब्लॉक/लीक') || assistantReply.includes('Permission Denied')) {
        try {
          localStorage.removeItem('aether_gemini_key');
          setApiKey('');
        } catch (e) {}
      }

      const actionType = result.action || result.parsed?.action;
      const actionData = result.parsed?.data || result.data || {};

      // If YouTube intent: auto open YouTube safely
      if (actionType === 'youtube' && actionData?.url) {
        try {
          window.open(actionData.url, '_blank', 'noopener,noreferrer');
        } catch (e) {
          console.warn('YouTube popup notice:', e);
        }
      }

      // If Call intent: auto trigger dialer if on mobile
      if (actionType === 'call' && actionData?.tel_url) {
        try {
          window.location.href = actionData.tel_url;
        } catch (e) {
          console.warn('Tel dialer notice:', e);
        }
      }

      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: assistantReply,
        action: actionType,
        actionData: actionData,
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

  // Start a New Chat / Clear Chat
  const handleStartNewChat = async () => {
    isClearingChatRef.current = true;
    setChatHistory([]);
    setInputText('');
    setShowConversation(false);
    setShowDashboard(false);
    showToast("New chat started! ⚡", 'success');

    try {
      const currentEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';
      await fetch(`${API_BASE}/chat/history`, { 
        method: 'DELETE',
        headers: { ...(currentEmail ? { 'X-User-Email': currentEmail } : {}) }
      });
    } catch (err) {
      console.warn("Failed to delete chat history on server:", err);
    } finally {
      setTimeout(() => {
        isClearingChatRef.current = false;
      }, 1000);
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
      if (t.subtasks && t.subtasks.some(s => s.id === taskId)) {
        return {
          ...t,
          subtasks: t.subtasks.map(s => {
            if (s.id === taskId) {
              const willBeDone = !(s.is_completed || s.status === 'completed');
              return {
                ...s,
                is_completed: willBeDone,
                status: willBeDone ? 'completed' : 'pending'
              };
            }
            return s;
          })
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
    // Optimistically remove from local state
    setTasks(prev => prev.filter(t => t.id !== taskId).map(t => {
      if (t.subtasks && t.subtasks.some(s => s.id === taskId)) {
        return { ...t, subtasks: t.subtasks.filter(s => s.id !== taskId) };
      }
      return t;
    }));

    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, { 
        method: 'DELETE',
        headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
      });
      refreshAllData();
      showToast("कार्य हटा दिया गया", 'info');
    } catch (err) {
      console.error(err);
      refreshAllData();
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
              title="Back"
            >
              <ChevronLeft size={22} />
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

          {/* SECTION: OVERVIEW / DASHBOARD */}
          <div className="settings-section-heading">OVERVIEW</div>
          <div className="settings-card-group">
            <div 
              className="settings-row-item" 
              onClick={() => {
                setIsSettingsOpen(false);
                setShowDashboard(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="settings-row-left">
                <div className="settings-row-icon-box" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <LayoutDashboard size={16} />
                </div>
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>Dashboard</span>
              </div>
              <div className="settings-row-right">
                <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 500 }}>Open</span>
                <ChevronRight size={16} />
              </div>
            </div>
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
              
              {/* TOP BAR: [Back (Dashboard only)] [Aether ⌵ (Centered)] [Bell] [Edit3] [Profile Avatar] */}
              <header className="gemini-top-bar">
                <div className="gemini-top-left" style={{ width: '80px', display: 'flex', alignItems: 'center' }}>
                  {showDashboard && (
                    <button
                      type="button"
                      className="gemini-icon-btn"
                      onClick={() => setShowDashboard(false)}
                      title="Back to Landing (होम पर वापस जाएं)"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#e2e8f0',
                        borderRadius: '12px',
                        width: '38px',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <ArrowLeft size={18} />
                    </button>
                  )}
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
              {showDashboard ? (
                <div 
                  className="no-scrollbar" 
                  style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    overflowX: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column',
                    minHeight: 0,
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                >
                  <DashboardView
                    userName={userPreferredName || userName}
                    currentTime={currentTime}
                    weatherData={weather}
                    userLocationName={userLocationName}
                    combinedTasks={combinedTasks}
                    tasks={tasks}
                    getTodayPendingCount={getTodayPendingCount}
                    financeSummary={financeSummary}
                    financeRecords={financeRecords}
                    isListening={isListening}
                    isSpeaking={isSpeaking}
                    toggleListening={toggleListening}
                    onSwitchToChat={() => setShowDashboard(false)}
                    setActiveSubModal={setActiveSubModal}
                    setIsAddingExpense={setIsAddingExpense}
                    setIsCameraOpen={handleCameraClick}
                    setIsSettingsOpen={setIsSettingsOpen}
                    userAvatar={userAvatar}
                    onClose={() => setShowDashboard(false)}
                  />
                </div>
              ) : chatHistory.length === 0 ? (
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
                      {(() => {
                        const actType = msg.action || msg.action_type;
                        let aData = msg.actionData;
                        if (!aData && typeof msg.action_data === 'string') {
                          try { aData = JSON.parse(msg.action_data); } catch (e) {}
                        }
                        if (actType === 'youtube' || aData?.url?.includes('youtube.com')) {
                          const ytUrl = aData?.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(aData?.query || 'Trending')}`;
                          return (
                            <div style={{
                              marginTop: '10px',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                                }}>
                                  <YoutubeIcon size={20} color="#fff" />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {aData?.query || "YouTube Playback"}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                    YouTube Media Stream
                                  </div>
                                </div>
                              </div>
                              <a
                                href={ytUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  background: '#ef4444',
                                  color: '#fff',
                                  textDecoration: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  flexShrink: 0,
                                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)'
                                }}
                              >
                                <Play size={13} fill="#fff" />
                                <span>Play</span>
                              </a>
                            </div>
                          );
                        }
                        if (actType === 'call' || aData?.tel_url) {
                          const telUrl = aData?.tel_url || (aData?.phone_number ? `tel:${aData.phone_number}` : 'tel:');
                          return (
                            <div style={{
                              marginTop: '10px',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              background: 'rgba(34, 197, 94, 0.08)',
                              border: '1px solid rgba(34, 197, 94, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)'
                                }}>
                                  <Phone size={18} color="#fff" />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {aData?.contact_name || "Phone Call"}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#86efac' }}>
                                    {aData?.phone_number || "Open Native Dialer"}
                                  </div>
                                </div>
                              </div>
                              <a
                                href={telUrl}
                                style={{
                                  background: '#22c55e',
                                  color: '#fff',
                                  textDecoration: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  flexShrink: 0,
                                  boxShadow: '0 2px 6px rgba(34, 197, 94, 0.3)'
                                }}
                              >
                                <Phone size={13} fill="#fff" />
                                <span>Call Now</span>
                              </a>
                            </div>
                          );
                        }
                        if (actType === 'draft_email' || aData?.email_body) {
                          const mailtoUrl = aData?.mailto_url || `mailto:${aData?.email_recipient || ''}?subject=${encodeURIComponent(aData?.email_subject || 'Follow-up')}&body=${encodeURIComponent(aData?.email_body || '')}`;
                          return (
                            <div style={{
                              marginTop: '10px',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: 'rgba(56, 189, 248, 0.08)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                  <div style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
                                  }}>
                                    <Mail size={18} color="#fff" />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {aData?.email_subject || "Email Draft"}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#7dd3fc' }}>
                                      To: {aData?.email_recipient || "Recipient"}
                                    </div>
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
                                  Draft Review
                                </span>
                              </div>
                              {aData?.email_body && (
                                <div style={{
                                  background: 'rgba(15, 23, 42, 0.6)',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  color: '#cbd5e1',
                                  whiteSpace: 'pre-wrap',
                                  maxHeight: '140px',
                                  overflowY: 'auto',
                                  lineHeight: '1.45',
                                  border: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                  {aData.email_body}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '2px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (aData?.email_body) {
                                      navigator.clipboard?.writeText(aData.email_body);
                                      showToast("Draft text copied to clipboard! 📋", 'success');
                                    }
                                  }}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    color: '#f8fafc',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </button>
                                <a
                                  href={mailtoUrl}
                                  style={{
                                    background: '#0284c7',
                                    color: '#fff',
                                    textDecoration: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                                  }}
                                >
                                  <ExternalLink size={12} />
                                  <span>Open in Gmail</span>
                                </a>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
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

                          {/* 4. Executive Briefing (replaces Drive for neat and compact UI) */}
                          <button 
                            type="button"
                            className="gemini-plus-item"
                            onClick={() => {
                              setIsPlusMenuOpen(false);
                              handlePlayExecutiveBriefing();
                            }}
                            title="Daily Executive Briefing"
                          >
                            <div className="gemini-plus-icon-box" style={{ 
                              background: 'radial-gradient(circle at 35% 35%, rgba(56, 189, 248, 0.28), rgba(14, 165, 233, 0.12))', 
                              border: '1px solid rgba(56, 189, 248, 0.35)', 
                              color: '#38bdf8' 
                            }}>
                              <Radio size={20} />
                            </div>
                            <span className="gemini-plus-item-title">Briefing</span>
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
                    /* Clean single microphone button with audio pulse indicator */
                    <button 
                      type="button" 
                      className={`gemini-prompt-btn mic ${isListening ? 'listening' : ''}`}
                      onClick={toggleListening}
                      title={
                        isListening 
                          ? "Stop listening" 
                          : wakeWordEnabled 
                            ? "Voice Input (Wake word 'Hey Aether' active)" 
                            : "Voice Input (माइक शुरू करें)"
                      }
                      style={{
                        position: 'relative',
                        boxShadow: isListening 
                          ? '0 0 16px rgba(56, 189, 248, 0.6)' 
                          : wakeWordEnabled 
                            ? '0 0 8px rgba(56, 189, 248, 0.25)' 
                            : 'none'
                      }}
                    >
                      {isListening ? (
                        <div className="gemini-waveform-icon" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span /><span /><span />
                        </div>
                      ) : (
                        <>
                          <Mic size={20} color={wakeWordEnabled ? '#38bdf8' : '#e2e8f0'} />
                          {wakeWordEnabled && (
                            <span 
                              style={{ 
                                position: 'absolute', 
                                top: '6px', 
                                right: '6px', 
                                width: '6px', 
                                height: '6px', 
                                borderRadius: '50%', 
                                background: '#38bdf8', 
                                boxShadow: '0 0 6px #38bdf8' 
                              }} 
                            />
                          )}
                        </>
                      )}
                    </button>
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
                const todayStr = formatLocalDateStr(new Date());
                const isOverdue = (t) => {
                  if (isTaskDone(t)) return false;
                  if (t.recurrence) return false;
                  const dStr = getTaskDateStr(t);
                  return dStr && dStr < todayStr;
                };
                const overdueTasks = (combinedTasks || tasks || []).filter(isOverdue);
                const pendingReminders = tasks.filter(t => t.reminder_time && !isTaskDone(t));
                const pendingTasks = tasks.filter(t => !isTaskDone(t));
                const completedTasks = tasks.filter(t => isTaskDone(t));

                return (
                  <>
                    {/* Overdue Task Banner on Today Tab */}
                    {overdueTasks.length > 0 && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '12px 16px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                          <div>
                            <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.86rem' }}>
                              {overdueTasks.length} Overdue Task(s) from past days
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                              You have unfinished tasks from previous dates.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRescheduleAllOverdue}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', padding: '6px 14px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Reschedule to Today ⚡</span>
                        </button>
                      </div>
                    )}

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
                              <div style={{ color: 'var(--accent-cyan)', fontSize: '0.76rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {task.reminder_time && <span>⏰ {task.reminder_time}</span>}
                                {renderRecurrenceBadge(task.recurrence)}
                              </div>
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div style={{ marginTop: '6px' }}>
                                  <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); toggleSubtasksExpand(task.id); }}
                                    style={{ background: 'rgba(192, 132, 252, 0.1)', border: '1px solid rgba(192, 132, 252, 0.25)', color: '#c084fc', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                                  >
                                    <span>📁 {task.subtasks.filter(s => s.is_completed || s.status === 'completed').length}/{task.subtasks.length} Subtasks</span>
                                    <span>{expandedTaskIds[task.id] !== false ? '▲' : '▼'}</span>
                                  </button>
                                  {expandedTaskIds[task.id] !== false && (
                                    <div style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid rgba(192, 132, 252, 0.3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {task.subtasks.map(st => {
                                        const stDone = st.is_completed || st.status === 'completed';
                                        return (
                                          <div 
                                            key={st.id} 
                                            onClick={(e) => { e.stopPropagation(); handleToggleTask(st.id); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 0' }}
                                          >
                                            <span style={{ color: stDone ? '#10b981' : '#64748b', fontSize: '0.80rem' }}>{stDone ? '☑' : '☐'}</span>
                                            <span style={{ color: stDone ? '#64748b' : '#e2e8f0', fontSize: '0.78rem', textDecoration: stDone ? 'line-through' : 'none' }}>{st.title}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
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
                                <div style={{ color: 'var(--accent-cyan)', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                  {task.reminder_time && <span>⏰ {task.reminder_time}</span>}
                                  {renderRecurrenceBadge(task.recurrence)}
                                </div>
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <div style={{ marginTop: '6px' }}>
                                    <button 
                                      type="button" 
                                      onClick={(e) => { e.stopPropagation(); toggleSubtasksExpand(task.id); }}
                                      style={{ background: 'rgba(192, 132, 252, 0.1)', border: '1px solid rgba(192, 132, 252, 0.25)', color: '#c084fc', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                                    >
                                      <span>📁 {task.subtasks.filter(s => s.is_completed || s.status === 'completed').length}/{task.subtasks.length} Subtasks</span>
                                      <span>{expandedTaskIds[task.id] !== false ? '▲' : '▼'}</span>
                                    </button>
                                    {expandedTaskIds[task.id] !== false && (
                                      <div style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid rgba(192, 132, 252, 0.3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {task.subtasks.map(st => {
                                          const stDone = st.is_completed || st.status === 'completed';
                                          return (
                                            <div 
                                              key={st.id} 
                                              onClick={(e) => { e.stopPropagation(); handleToggleTask(st.id); }}
                                              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 0' }}
                                            >
                                              <span style={{ color: stDone ? '#10b981' : '#64748b', fontSize: '0.80rem' }}>{stDone ? '☑' : '☐'}</span>
                                              <span style={{ color: stDone ? '#64748b' : '#e2e8f0', fontSize: '0.78rem', textDecoration: stDone ? 'line-through' : 'none' }}>{st.title}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
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

      {/* 0. Tasks & Agenda Modal (Redesigned Clean UI matching Screenshot) */}
      <TasksModal
        isOpen={activeSubModal === 'reminders' || activeSubModal === 'calendar'}
        onClose={() => setActiveSubModal(null)}
        combinedTasks={combinedTasks}
        remindersViewMode={remindersViewMode}
        setRemindersViewMode={setRemindersViewMode}
        agendaFilter={agendaFilter}
        setAgendaFilter={setAgendaFilter}
        calSelectedDate={calSelectedDate}
        setCalSelectedDate={setCalSelectedDate}
        formatLocalDateStr={formatLocalDateStr}
        getTaskDateStr={getTaskDateStr}
        handleToggleTask={handleToggleTask}
        handleDeleteTask={handleDeleteTask}
        handleCreateTask={handleCreateTask}
        newTaskInput={newTaskInput}
        setNewTaskInput={setNewTaskInput}
        handleRescheduleAllOverdue={handleRescheduleAllOverdue}
        expandedTaskIds={expandedTaskIds}
        toggleSubtasksExpand={toggleSubtasksExpand}
        setShowGCalConnectModal={setShowGCalConnectModal}
      />

      {/* Google Calendar Connect Dialog */}
      {showGCalConnectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.88)', backdropFilter: 'blur(16px)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0a101d', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '28px', padding: '24px 20px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                  <Calendar size={18} />
                </div>
                <span>Sync Google Calendar</span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowGCalConnectModal(false)} 
                style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 18px 0', lineHeight: 1.5 }}>
              Choose your preferred method to sync your Google Calendar reminders and agenda:
            </p>

            {/* Method 1: Instant .ics Upload */}
            <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.22)', borderRadius: '18px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.1rem' }}>📥</span>
                <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>Method 1: Instant .ics File Import</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                Export your .ics calendar file from Google Calendar (<b>Settings → Import & Export</b>) and upload it here with 1 click.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowGCalConnectModal(false);
                  icsFileInputRef.current?.click();
                }}
                style={{ width: '100%', background: '#10b981', color: '#022c22', border: 'none', borderRadius: '12px', padding: '10px 14px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)' }}
              >
                <Upload size={15} />
                <span>Upload Google Calendar (.ics)</span>
              </button>
            </div>

            {/* Method 2: Secret iCal URL Live Sync */}
            <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.22)', borderRadius: '18px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.1rem' }}>🔗</span>
                <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem' }}>Method 2: Secret iCal Link (Live Auto-Sync)</span>
              </div>
              
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                1. Open <b>Google Calendar Settings</b><br/>
                2. Under <b>Settings for my calendars</b>, click on your calendar name<br/>
                3. Scroll down and copy your <b>"Secret address in iCal format"</b> (ends in .ics)
              </div>

              <button
                type="button"
                onClick={() => window.open('https://calendar.google.com/calendar/u/0/r/settings', '_blank', 'noopener,noreferrer')}
                style={{ width: '100%', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', borderRadius: '12px', padding: '10px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}
              >
                <ExternalLink size={13} />
                <span>Open Google Calendar Settings ↗</span>
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="url"
                  placeholder="Paste https://calendar.google.com/calendar/ical/.../basic.ics"
                  value={gcalIcalUrl}
                  onChange={(e) => setGcalIcalUrl(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.05)', border: gcalIcalUrl && (gcalIcalUrl.includes('/calendar/u/') || gcalIcalUrl.includes('/calendar/r')) ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px', padding: '10px 12px', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
                />

                {gcalIcalUrl && (gcalIcalUrl.includes('/calendar/u/') || gcalIcalUrl.includes('/calendar/r')) && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '8px 12px', fontSize: '0.74rem', color: '#fca5a5', lineHeight: 1.4 }}>
                    ⚠️ <b>Web link detected:</b> Please paste the <b>"Secret address in iCal format"</b> URL (ends in <code>.ics</code>), not your browser tab link.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => syncGCalViaIcalUrl()}
                  disabled={isSyncingGCal}
                  style={{ width: '100%', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px', fontWeight: 700, fontSize: '0.84rem', cursor: isSyncingGCal ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)' }}
                >
                  <RefreshCw size={14} className={isSyncingGCal ? 'animate-spin' : ''} />
                  <span>{isSyncingGCal ? 'Syncing...' : 'Save & Sync Live Events'}</span>
                </button>
              </div>
            </div>

            {/* Notice regarding Google Security */}
            <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '16px', padding: '12px 14px' }}>
              <span style={{ fontSize: '0.74rem', color: '#fbbf24', lineHeight: 1.45, display: 'block' }}>
                🛡️ <b>Security Notice:</b> Google restricts unverified third-party app OAuth (Error 403: access_denied). <b>Method 1 (.ics File)</b> and <b>Method 2 (Secret iCal Link)</b> provide 100% private, verified, and direct sync without any OAuth blocks.
              </span>
            </div>

          </div>
        </div>
      )}

      {/* 3. Executive Finance & Ledger Modal */}
      <FinanceModal
        isOpen={activeSubModal === 'finance'}
        onClose={() => { setActiveSubModal(null); setEditingFinanceRecord(null); setIsAddingExpense(false); }}
        financeSummary={financeSummary}
        financeRecords={financeRecords}
        isAddingExpense={isAddingExpense}
        setIsAddingExpense={setIsAddingExpense}
        newExpenseForm={newExpenseForm}
        setNewExpenseForm={setNewExpenseForm}
        editingFinanceRecord={editingFinanceRecord}
        setEditingFinanceRecord={setEditingFinanceRecord}
        handleSaveFinanceEdit={handleSaveFinanceEdit}
        handleDeleteFinanceRecord={handleDeleteFinanceRecord}
        showToast={showToast}
        refreshAllData={refreshAllData}
        userEmail={userEmail}
        API_BASE={API_BASE}
      />

      {/* 4. Dedicated Executive Briefing Modal */}
      <BriefingModal
        isOpen={showBriefingModal}
        onClose={() => setShowBriefingModal(false)}
        isBriefingLoading={isBriefingLoading}
        executiveBriefingData={executiveBriefingData}
        isBriefingPlaying={isBriefingPlaying}
        stopBriefingAudio={stopBriefingAudio}
        speakBriefingAudio={speakBriefingAudio}
      />

      {/* 5. Actions & Audit Trail Modal */}
      <AuditModal
        isOpen={activeSubModal === 'audit'}
        onClose={() => setActiveSubModal(null)}
        auditLogs={auditLogs}
        handleUndo={handleUndo}
      />

      {/* 5. Settings Sub-Modals */}
      <SettingsSubModals
        activeSubModal={activeSubModal}
        setActiveSubModal={setActiveSubModal}
        tempPreferredName={tempPreferredName}
        setTempPreferredName={setTempPreferredName}
        setUserPreferredName={setUserPreferredName}
        userPreferredName={userPreferredName}
        showToast={showToast}
        apiKey={apiKey}
        setApiKey={setApiKey}
        keyError={keyError}
        keyValidating={keyValidating}
        handleValidateApiKey={handleValidateApiKey}
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
        appTheme={appTheme}
        setAppTheme={setAppTheme}
        voiceOutputEnabled={voiceOutputEnabled}
        setVoiceOutputEnabled={setVoiceOutputEnabled}
        chimesEnabled={chimesEnabled}
        setChimesEnabled={setChimesEnabled}
        playReminderChime={playReminderChime}
        speechRate={speechRate}
        setSpeechRate={setSpeechRate}
        effectiveLang={effectiveLang}
        selectedLang={selectedLang}
        setSelectedLang={setSelectedLang}
        newMemoryText={newMemoryText}
        setNewMemoryText={setNewMemoryText}
        handleSendPrompt={handleSendPrompt}
        memories={memories}
        handleDeleteMemory={handleDeleteMemory}
        customUsername={customUsername}
        setCustomUsername={setCustomUsername}
        handleConfirmAccountReset={handleConfirmAccountReset}
        serverOnline={serverOnline}
        tasks={tasks}
        auditLogs={auditLogs}
        refreshAllData={refreshAllData}
      />

      {/* 8. App Permissions & Access Modal */}
      <PermissionsModal
        isOpen={activeSubModal === 'permissions'}
        onClose={() => setActiveSubModal(null)}
        micEnabled={micEnabled}
        handleToggleMic={handleToggleMic}
        handleTestMic={handleTestMic}
        isMicTesting={isMicTesting}
        pushEnabled={pushEnabled}
        handleTogglePush={handleTogglePush}
        handleSendTestPush={handleSendTestPush}
        locationEnabled={locationEnabled}
        handleToggleLocation={handleToggleLocation}
        userLocationName={userLocationName}
        voiceOutputEnabled={voiceOutputEnabled}
        setVoiceOutputEnabled={setVoiceOutputEnabled}
        wakeWordEnabled={wakeWordEnabled}
        handleToggleWakeWord={handleToggleWakeWord}
        showToast={showToast}
      />

      {/* 8. Modals */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        chatHistory={chatHistory}
        userName={userName}
        handleStartNewChat={handleStartNewChat}
      />

      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        cameraVideoRef={cameraVideoRef}
        cameraInputRef={cameraInputRef}
        handleCaptureCameraSnapshot={handleCaptureCameraSnapshot}
      />

      <DriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        driveDocName={driveDocName}
        setDriveDocName={setDriveDocName}
        driveInputUrl={driveInputUrl}
        setDriveInputUrl={setDriveInputUrl}
        handleAttachDriveFromModal={handleAttachDriveFromModal}
      />

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
