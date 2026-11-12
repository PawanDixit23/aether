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
  PanelLeft,
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
import { ConfirmModal } from './components/modals/ConfirmModal';
import { ChatHistoryDrawer } from './components/chat/ChatHistoryDrawer';
import { AI_PROVIDERS } from './components/common/constants';

// Code-split heavy modals for instant mobile loading & 0-lag startup
const FinanceModal = React.lazy(() => import('./components/modals/FinanceModal').then(m => ({ default: m.FinanceModal })));
const CricketScorecardModal = React.lazy(() => import('./components/modals/CricketScorecardModal').then(m => ({ default: m.CricketScorecardModal })));
const HistoryModal = React.lazy(() => import('./components/modals/HistoryModal').then(m => ({ default: m.HistoryModal })));
const CameraModal = React.lazy(() => import('./components/modals/CameraModal').then(m => ({ default: m.CameraModal })));
const DriveModal = React.lazy(() => import('./components/modals/DriveModal').then(m => ({ default: m.DriveModal })));
const BriefingModal = React.lazy(() => import('./components/modals/BriefingModal').then(m => ({ default: m.BriefingModal })));
const AuditModal = React.lazy(() => import('./components/modals/AuditModal').then(m => ({ default: m.AuditModal })));
const ObservabilityModal = React.lazy(() => import('./components/modals/ObservabilityModal').then(m => ({ default: m.ObservabilityModal })));
const PermissionsModal = React.lazy(() => import('./components/modals/PermissionsModal').then(m => ({ default: m.PermissionsModal })));
const SettingsSubModals = React.lazy(() => import('./components/modals/SettingsSubModals').then(m => ({ default: m.SettingsSubModals })));

const API_BASE = typeof window !== 'undefined' && window.location.port === '5173'
  ? `http://${window.location.hostname}:8000/api`
  : '/api';

const LANG_OPTIONS = [
  { id: 'auto', label: 'Auto', fullLabel: 'Auto (Automatic)', icon: '🌐' },
  { id: 'hi', label: 'Hindi', fullLabel: 'Hindi (Conversational)', icon: '🇮🇳' },
  { id: 'en', label: 'English', fullLabel: 'English', icon: '🇬🇧' },
  { id: 'hinglish', label: 'Hinglish', fullLabel: 'Hinglish (Hindi + English)', icon: '✨' }
];

const EN_UI_DICTIONARY = {
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
};

const UI_TRANSLATIONS = {
  hi: EN_UI_DICTIONARY,
  en: EN_UI_DICTIONARY,
  hinglish: EN_UI_DICTIONARY
};

const AETHER_VOICES = [
  { id: 'mitra', name: 'Mitra (Friend)', desc: 'Warm, natural conversational buddy voice • Male', pitch: 1.05, rate: 1.12, gender: 'male' },
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

export const calculateTaskTrigger = (t) => {
  if (!t || !t.reminder_time) return null;
  const rawTime = String(t.reminder_time || '').trim();
  const m = rawTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;

  let hrs = parseInt(m[1], 10);
  const mins = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = (m[3] || '').toUpperCase();
  if (ampm === 'PM' && hrs < 12) hrs += 12;
  if (ampm === 'AM' && hrs === 12) hrs = 0;

  const rec = String(t.recurrence || '').toLowerCase();
  const isDaily = rec === 'daily' || rec.includes('daily') || /daily|roz|everyday/i.test(t.title || '');

  const now = new Date();
  const target = new Date();
  target.setHours(hrs, mins, 0, 0);

  if (target.getTime() <= now.getTime()) {
    if (isDaily) {
      target.setDate(target.getDate() + 1);
    } else if (t.due_date) {
      const d = new Date(t.due_date);
      if (!isNaN(d.getTime())) {
        d.setHours(hrs, mins, 0, 0);
        if (d.getTime() > now.getTime()) {
          target.setTime(d.getTime());
        }
      }
    }
  } else if (!isDaily && t.due_date) {
    const d = new Date(t.due_date);
    if (!isNaN(d.getTime())) {
      d.setHours(hrs, mins, 0, 0);
      if (d.getTime() > now.getTime()) {
        target.setTime(d.getTime());
      }
    }
  }

  // If target time is in the past and non-recurring, it is overdue — do NOT fire an alarm!
  if (target.getTime() <= now.getTime()) {
    return null;
  }

  const triggerSeconds = Math.round((target.getTime() - now.getTime()) / 1000);
  if (triggerSeconds <= 0) return null;

  return {
    triggerSeconds,
    isDaily,
    hour: hrs,
    minute: mins,
    targetDate: target
  };
};

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
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('aether_openai_key') || '');
  const [grokKey, setGrokKey] = useState(() => localStorage.getItem('aether_grok_key') || '');
  const [activeProvider, setActiveProvider] = useState(() => localStorage.getItem('aether_active_provider') || 'gemini');
  const [selectedProviderTab, setSelectedProviderTab] = useState(() => localStorage.getItem('aether_active_provider') || 'gemini');

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
    return localStorage.getItem('aether_wake_word_enabled') !== 'false';
  });
  const wakeWordRecognitionRef = useRef(null);
  const speechSilenceTimeoutRef = useRef(null);
  const [attachedMediaList, setAttachedMediaList] = useState([]); // Array of { id, type: 'image' | 'file' | 'drive' | 'map', name: string, url?: string, size?: string }

  // Modern Confirmation Dialog State (Zero ugly window.confirm popups)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
    onConfirm: () => {}
  });

  const showConfirm = ({ title, message, confirmText = "Delete", cancelText = "Cancel", isDestructive = true, onConfirm }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      isDestructive,
      onConfirm
    });
  };

  // Video Playback on-demand (Prevents historical songs from auto-playing on app reopen)
  const [activePlayingVideoId, setActivePlayingVideoId] = useState(null);

  // ESPNcricinfo Live Scorecards & International Fixtures
  const [isCricketModalOpen, setIsCricketModalOpen] = useState(false);
  const [cricketMatches, setCricketMatches] = useState([]);
  const [isCricketLoading, setIsCricketLoading] = useState(false);

  const fetchLiveCricketScores = async () => {
    setIsCricketLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/cricket/live`);
      if (resp.ok) {
        const data = await resp.json();
        setCricketMatches(data.matches || []);
      }
    } catch (e) {
      console.warn("Live cricket fetch notice:", e);
    } finally {
      setIsCricketLoading(false);
    }
  };

  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveInputUrl, setDriveInputUrl] = useState('');
  const [driveDocName, setDriveDocName] = useState('');
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [callInputNumber, setCallInputNumber] = useState({});

  // Mobile Pull-to-Refresh State
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

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
  const [dismissedCricketMatchId, setDismissedCricketMatchId] = useState(null);
  const [gcalIcalUrl, setGcalIcalUrl] = useState(() => localStorage.getItem('aether_gcal_ical_url') || '');
  const [showGCalConnectModal, setShowGCalConnectModal] = useState(false);
  const icsFileInputRef = useRef(null);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedLang, setSelectedLang] = useState(() => localStorage.getItem('aether_language') || 'auto');
  const [isFriendMode, setIsFriendMode] = useState(() => {
    return typeof localStorage !== 'undefined' 
      ? (localStorage.getItem('aether_friend_mode') === 'true' || localStorage.getItem('aether_selected_voice') === 'mitra') 
      : false;
  });

  const handleToggleFriendMode = (enabled) => {
    setIsFriendMode(enabled);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aether_friend_mode', enabled ? 'true' : 'false');
      if (enabled) {
        setSelectedVoice('mitra');
        localStorage.setItem('aether_selected_voice', 'mitra');
      } else if (selectedVoice === 'mitra') {
        setSelectedVoice('puck');
        localStorage.setItem('aether_selected_voice', 'puck');
      }
    }
    showToast(enabled ? '🤝 Friend Mode Active!' : 'Standard Mode Active', 'info');
  };

  const isFriendActive = Boolean(
    isFriendMode || 
    selectedVoice === 'mitra' || 
    (typeof localStorage !== 'undefined' && (
      localStorage.getItem('aether_friend_mode') === 'true' || 
      localStorage.getItem('aether_selected_voice') === 'mitra'
    ))
  );

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

  const effectiveLang = (isFriendActive || selectedLang === 'hi_friend')
    ? 'hi'
    : selectedLang === 'auto'
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
  const [cityGuide, setCityGuide] = useState(null);
  const [chatSessions, setChatSessions] = useState(() => {
    try {
      const email = localStorage.getItem('aether_user_email');
      const cached = email ? localStorage.getItem(`aether_chat_sessions_${email}`) : null;
      const list = cached ? JSON.parse(cached) : [];
      return Array.isArray(list) ? list.filter(s => !s.id?.startsWith('temp_') && s.id !== 'temporary') : [];
    } catch {
      return [];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    try {
      const email = localStorage.getItem('aether_user_email');
      const cached = email ? localStorage.getItem(`aether_active_session_id_${email}`) : null;
      return cached || 'default';
    } catch {
      return 'default';
    }
  });
  const activeSessionIdRef = useRef(activeSessionId);
  const deletedSessionIdsRef = useRef(new Set());
  const deletedTaskIdsRef = useRef(new Set());
  const pendingTaskStatusRef = useRef(new Map()); // taskId -> { status, is_completed, timestamp }
  const deletedFinanceIdsRef = useRef(new Set());
  const deletedMemoryIdsRef = useRef(new Set());

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const email = localStorage.getItem('aether_user_email');
      const sessId = email ? (localStorage.getItem(`aether_active_session_id_${email}`) || 'default') : 'default';
      const cached = email ? localStorage.getItem(`aether_chat_history_${email}_${sessId}`) : null;
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
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
  const activeUtteranceRef = useRef(null);
  const speechQueueRef = useRef([]);
  const speechCurrentIndexRef = useRef(0);
  const speechHeartbeatRef = useRef(null);
  const activeMediaPlayingRef = useRef(false);

  // Futuristic audio chime for instant wake-word / mic activation feedback (Gemini-grade)
  const playWakeChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.11); // A5
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {}
  };

  // Universal Audio Streaming Fallback (Works 100% on Mobile WebViews where SpeechSynthesis is unavailable)
  const playStreamAudio = (text, voiceId, lang) => {
    try {
      if (currentAudioRef.current) {
        try { currentAudioRef.current.pause(); } catch (e) {}
        currentAudioRef.current = null;
      }
      const ttsUrl = `${API_BASE}/tts?text=${encodeURIComponent(text.slice(0, 2500))}&voice=${voiceId}&lang=${lang || 'en'}`;

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

  // Handle native contact resolution bridge from Android/iOS React Native app
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__onContactResolved = ({ name, phone }) => {
        if (phone) {
          const currentEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';
          fetch(`${API_BASE}/memory`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(currentEmail ? { 'X-User-Email': currentEmail } : {})
            },
            body: JSON.stringify({
              fact: `${name || 'Contact'} phone number is ${phone}`,
              category: 'contact'
            })
          }).catch(() => {});
        }
      };
      return () => {
        try { delete window.__onContactResolved; } catch (e) {}
      };
    }
  }, [userEmail]);

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

  const handleDeleteFinanceRecord = (id) => {
    const target = financeRecords.find(r => r.id === id);
    const label = target ? `${target.note || target.category || 'Transaction'} (₹${Number(target.amount || 0).toLocaleString('en-IN')})` : 'this record';
    showConfirm({
      title: "Delete Financial Record?",
      message: `Are you sure you want to permanently delete "${label}"? This will be removed from your ledger.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      isDestructive: true,
      onConfirm: async () => {
        deletedFinanceIdsRef.current.add(String(id));
        const deleted = financeRecords.find(r => String(r.id) === String(id));
        setFinanceRecords(prev => prev.filter(r => String(r.id) !== String(id)));
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

        try {
          const resp = await fetch(`${API_BASE}/finance/records/${id}`, {
            method: 'DELETE',
            headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
          });
          if (resp.ok) {
            showToast("Record deleted", "success");
          } else {
            showToast("Failed to delete record", "error");
          }
        } catch (e) {
          showToast("Network error", "error");
        }
      }
    });
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
        showToast("Expense updated successfully!", "success");
        fetch(`${API_BASE}/finance/summary`, { headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) } })
          .then(r => r.json())
          .then(data => setFinanceSummary(data))
          .catch(() => {});
      } else {
        showToast("Failed to update expense", "error");
      }
    } catch (e) {
      showToast("Network error", "error");
    }
  };

  const stopBriefingAudio = () => {
    speechQueueRef.current = [];
    speechCurrentIndexRef.current = 0;
    if (speechHeartbeatRef.current) {
      clearInterval(speechHeartbeatRef.current);
      speechHeartbeatRef.current = null;
    }
    if (activeUtteranceRef.current) {
      try {
        activeUtteranceRef.current.onend = null;
        activeUtteranceRef.current.onerror = null;
      } catch (e) {}
      activeUtteranceRef.current = null;
    }
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
        activeUtteranceRef.current = utterance;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'hi-IN';
        utterance.onend = () => {
          activeUtteranceRef.current = null;
          setIsSpeaking(false);
          setIsBriefingPlaying(false);
        };
        utterance.onerror = () => {
          activeUtteranceRef.current = null;
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

  const handlePlayExecutiveBriefing = async (openModal = true) => {
    if (openModal) {
      setShowBriefingModal(true);
    }
    if (isBriefingPlaying || isSpeaking) {
      stopBriefingAudio();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
      }
      setIsSpeaking(false);
      setIsBriefingPlaying(false);
      return;
    }

    try {
      setIsBriefingLoading(true);
      showToast("🎙️ Aether is preparing your executive briefing...", "info");
      const resp = await fetch(`${API_BASE}/briefing/executive`, {
        headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
      });
      const data = await resp.json();
      setIsBriefingLoading(false);
      if (data?.text) {
        setExecutiveBriefingData(data);
        speakText(data.text);
        setIsBriefingPlaying(true);
      }
    } catch (e) {
      console.error(e);
      setIsBriefingLoading(false);
      showToast("Failed to load briefing", "error");
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

  const isTaskCompletedForToday = (t, targetDateStr = formatLocalDateStr(new Date())) => {
    if (!t) return false;
    const isRecurring = t.recurrence === 'daily' || t.repeat === 'daily' || String(t.recurrence || '').toLowerCase().includes('daily') || t.recurrence === 'weekdays' || t.recurrence === 'weekly_monday' || (t.recurrence && t.recurrence !== 'none');
    if (isRecurring) {
      try {
        const saved = localStorage.getItem('aether_task_date_completions');
        if (saved) {
          const map = JSON.parse(saved);
          if (map[t.id] && map[t.id][targetDateStr] !== undefined) {
            return Boolean(map[t.id][targetDateStr]);
          }
        }
      } catch (e) {}
      if (t.date_completions && t.date_completions[targetDateStr] !== undefined) {
        return Boolean(t.date_completions[targetDateStr]);
      }
      return false; // Recurring tasks are NEVER completed unless explicitly marked done on that specific date!
    }
    return Boolean(t.is_completed === true || t.completed === true || t.status === 'completed');
  };

  const isTaskPending = (t) => !isTaskCompletedForToday(t);

  // Today-only pending tasks count
  const getTodayPendingCount = () => {
    const today = new Date();
    const todayStr = formatLocalDateStr(today);
    const dayIdx = today.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const list = (combinedTasks && combinedTasks.length > 0) ? combinedTasks : (tasks || []);
    return list.filter(t => {
      // If task is completed (either globally or for today), exclude it immediately
      if (isTaskCompletedForToday(t, todayStr)) return false;

      // 1. Daily recurring tasks
      if (t.recurrence === 'daily' || t.repeat === 'daily' || String(t.recurrence || '').toLowerCase().includes('daily')) {
        return true;
      }
      // 2. Weekdays (Mon-Fri)
      if ((t.recurrence === 'weekdays' || t.recurrence === 'monday_to_friday') && dayIdx >= 1 && dayIdx <= 5) {
        return true;
      }
      // 3. Weekly Monday
      if (t.recurrence === 'weekly_monday' && dayIdx === 1) {
        return true;
      }
      // 4. Explicit due_date check (must strictly match today's date)
      if (t.due_date) {
        const taskDay = formatLocalDateStr(t.due_date);
        return taskDay === todayStr;
      }
      // 5. If no due_date, only tasks created today count as today's tasks
      if (t.created_at) {
        const createdDay = formatLocalDateStr(t.created_at);
        return createdDay === todayStr;
      }
      return false;
    }).length;
  };

  // Today-only tasks list (used for Agenda in Chat History drawer)
  const getTodayTasks = () => {
    const today = new Date();
    const todayStr = formatLocalDateStr(today);
    const dayIdx = today.getDay();
    const list = (combinedTasks && combinedTasks.length > 0) ? combinedTasks : (tasks || []);
    return list.filter(t => {
      // 1. Daily recurring tasks
      if (t.recurrence === 'daily' || t.repeat === 'daily' || String(t.recurrence || '').toLowerCase().includes('daily')) {
        return true;
      }
      // 2. Weekdays (Mon-Fri)
      if ((t.recurrence === 'weekdays' || t.recurrence === 'monday_to_friday') && dayIdx >= 1 && dayIdx <= 5) {
        return true;
      }
      // 3. Weekly Monday
      if (t.recurrence === 'weekly_monday' && dayIdx === 1) {
        return true;
      }
      // 4. Explicit due_date check (strictly matches today)
      if (t.due_date) {
        const taskDay = formatLocalDateStr(t.due_date);
        return taskDay === todayStr;
      }
      // 5. Created today
      if (t.created_at) {
        const createdDay = formatLocalDateStr(t.created_at);
        return createdDay === todayStr;
      }
      return false;
    });
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
  const handleValidateApiKey = async (customKey, customProvider) => {
    const prov = customProvider || selectedProviderTab || 'gemini';
    const keyToValidate = customKey !== undefined
      ? customKey
      : (prov === 'openai' ? openaiKey : prov === 'grok' ? grokKey : apiKey);

    const cleanKey = (keyToValidate || '').trim();
    if (!cleanKey) {
      const provLabel = prov === 'openai' ? 'OpenAI (ChatGPT)' : prov === 'grok' ? 'Grok (xAI)' : 'Gemini';
      setKeyError(`Please enter your ${provLabel} API key`);
      return;
    }

    if (prov === 'grok' && !cleanKey.startsWith('xai-') && !cleanKey.startsWith('grok_') && !cleanKey.startsWith('grok-')) {
      setKeyError('Grok (xAI) API Key should start with "grok_" or "xai-". Please copy the full key.');
      return;
    }

    if (prov === 'openai' && !cleanKey.startsWith('sk-')) {
      setKeyError('OpenAI (ChatGPT) Secret Key should start with "sk-". Please copy your secret key from platform.openai.com.');
      return;
    }
    setKeyValidating(true);
    setKeyError('');
    setKeySuccess(false);

    try {
      let isValid = false;
      // 1. Direct validation with Google AI Studio if Gemini
      if (prov === 'gemini') {
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
      }

      // 2. Validate via server proxy (for Gemini fallback, OpenAI, and Grok)
      if (!isValid) {
        const beResp = await fetch(`${API_BASE}/auth/validate-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: cleanKey, provider: prov })
        });
        const beData = await beResp.json();
        if (beData.valid) {
          isValid = true;
        } else {
          setKeyError(beData.error || `Invalid ${prov.toUpperCase()} API Key. Please check your key.`);
          setKeyValidating(false);
          return;
        }
      }

      if (isValid) {
        if (prov === 'openai') {
          localStorage.setItem('aether_openai_key', cleanKey);
          setOpenaiKey(cleanKey);
        } else if (prov === 'grok') {
          localStorage.setItem('aether_grok_key', cleanKey);
          setGrokKey(cleanKey);
        } else {
          localStorage.setItem('aether_gemini_key', cleanKey);
          setApiKey(cleanKey);
        }
        localStorage.setItem('aether_active_provider', prov);
        setActiveProvider(prov);
        setKeySuccess(true);
        setKeyError('');
        const provName = prov === 'openai' ? 'OpenAI (ChatGPT)' : prov === 'grok' ? 'Grok (xAI)' : 'Gemini';
        showToast(`${provName} API Key Verified!`, 'success');
        setTimeout(() => {
          if (onboardingStep === 5) {
            setOnboardingStep(6);
          }
          setKeySuccess(false);
        }, 500);
      }
    } catch (err) {
      setKeyError('Verification error. Please check your internet connection or API key.');
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
          showToast(`Linked with Google: ${gName}`, 'success');
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

        // Fresh OAuth redirect toast is handled above via access_token hash check
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
      setGoogleError('Failed to start Google Sign-In.');
      setShowGoogleModal(true);
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const handleConnectGoogleManual = (e) => {
    e?.preventDefault();
    const email = (googleCustomEmail || userEmail).trim();
    if (!email || !email.includes('@')) {
      setGoogleError('Please enter a valid Google email address (e.g. name@gmail.com)');
      return;
    }
    const name = (googleCustomName || userName).trim() || email.split('@')[0];
    localStorage.setItem('aether_user_name', name);
    localStorage.setItem('aether_user_email', email);
    setUserName(name);
    setUserEmail(email);
    setGoogleLoginSuccess(true);
    setGoogleError('');
    showToast(`Google Account connected: ${email}`, 'success');
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
      showToast('Aether Activated! Welcome.', 'success');
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
    localStorage.removeItem('aether_cached_tasks');
    setUserEmail('');
    setUserName('Operator');
    setUserAvatar('');
    setTasks([]);
    setChatHistory([]);
    setChatSessions([]);
    setActiveSessionId('default');
    setMemories([]);
    setFinanceRecords([]);
    setFinanceSummary({ total_income: 0, total_expense: 0, balance: 0 });
    if (typeof window !== 'undefined') {
      delete window.__nativeBackup;
      if (window.ReactNativeWebView) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CLEAR_NATIVE_BACKUP' }));
        } catch (e) {}
      }
    }
    setOnboardingDone(false);
    setOnboardingStep(1);
    setIsSettingsOpen(false);
    showToast(
      "Signed out successfully",
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
      "Account data reset successfully",
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
          showToast("✓ Mobile & Desktop push alerts enabled!", 'success');
          triggerPushNotification(
            "⚡ AETHER: Push Alerts Active!",
            "All your reminders and alerts will now ring directly on your screen."
          );
        } else {
          showToast("Notice: Push notification permission denied", 'error');
        }
      } catch (e) {
        console.error("Permission request error:", e);
      }
    } else {
      showToast("This browser does not support push notifications", 'error');
    }
  };

  const ensurePushSubscribed = async (targetEmail) => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
      const emailToUse = targetEmail || userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';
      if (!emailToUse || !emailToUse.includes('@')) return null;

      // 1. Notification permission check
      if ('Notification' in window) {
        setPushPermission(Notification.permission);
        if (Notification.permission === 'default') {
          const p = await Notification.requestPermission();
          setPushPermission(p);
          if (p !== 'granted') return null;
        } else if (Notification.permission !== 'granted') {
          return null;
        }
      }

      // 2. Server से VAPID public key fetch करें (65-byte NIST P-256 standard)
      const FALLBACK_VAPID_PUBLIC_KEY = "BD4PXJ0PRrZXvh6dgsnzr0qOjEl_TcZweG4uI57Mr-W1vQY7HjoPo_66fBeFWZHOmRmpzJhpwS_nMIFaGVn2E7g";
      let keyToUse = FALLBACK_VAPID_PUBLIC_KEY;
      try {
        const keyRes = await fetch(`${API_BASE}/push/vapid-public-key`);
        if (keyRes.ok) {
          const { publicKey } = await keyRes.json();
          if (publicKey && typeof publicKey === 'string' && publicKey.startsWith('B') && publicKey.length === 87) {
            keyToUse = publicKey;
          }
        }
      } catch (_) {}

      // Base64URL → Uint8Array convert करें (VAPID format)
      const urlB64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
      };

      const reg = await navigator.serviceWorker.ready;
      if (!reg || !reg.pushManager) {
        console.warn('[Aether Push] PushManager not available in this environment');
        return null;
      }

      let subscription = await reg.pushManager.getSubscription();

      try {
        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(keyToUse),
          });
          console.log('[Aether Push] ✅ New VAPID push subscription created');
        }
      } catch (subErr) {
        console.warn('[Aether Push] Renewing subscription with updated VAPID key...', subErr);
        if (subscription) {
          try { await subscription.unsubscribe(); } catch (_) {}
        }
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(keyToUse),
        });
      }

      // 3. Subscription server को भेजें (Strict isolation: user email)
      if (subscription) {
        const subRes = await fetch(`${API_BASE}/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_email: emailToUse,
            subscription: subscription.toJSON(),
          }),
        });
        if (subRes.ok) {
          console.log('[Aether Push] ✅ Subscription sent to server for', emailToUse);
          return subscription;
        }
      }
    } catch (err) {
      console.warn('[Aether Push] ensurePushSubscribed warning:', err?.message || err);
    }
    return null;
  };

  const handleSendTestPush = async () => {
    // 1. Foreground local browser alert & Native Mobile Alert
    triggerPushNotification(
      "⚡ AETHER TEST ALERT 🎉",
      "Local push notifications are working properly!",
      "aether-test"
    );

    // If on native React Native WebView, native notification was already delivered!
    const isReactNative = typeof window !== 'undefined' && !!window.ReactNativeWebView;
    if (isReactNative) {
      showToast("📲 Mobile app notifications active & connected! 🎉", 'success');
      return;
    }

    // 2. Real Cloud VAPID Web Push from Server to Device (Browser / Desktop / PWA)
    const emailToUse = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';
    if (!emailToUse || !emailToUse.includes('@')) {
      showToast("⚠️ Please enter your email in Settings first for cloud push!", 'info');
      return;
    }

    // Auto-register/sync device before testing so "No registered push devices" error never happens
    showToast("📡 Syncing device...", 'info');
    const registeredSub = await ensurePushSubscribed(emailToUse);
    if (!registeredSub) {
      showToast("⚠️ Could not sync device. Please check browser notification permission!", 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/push/test?user_email=${encodeURIComponent(emailToUse)}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success' && data.sent > 0) {
        showToast(`📲 Cloud push sent! (${data.sent} device connected)`, 'success');
      } else {
        showToast(data.message || "📲 Test push notification sent!", 'info');
      }
    } catch (e) {
      showToast("📲 Test push notification sent!", 'success');
    }
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
        showToast('✓ Microphone permission granted!', 'success');
      } else {
        setMicPermissionStatus('denied');
        showToast('Microphone permission denied. Please check your device settings.', 'error');
      }
    } catch (e) {
      console.log('Mic request catch:', e);
    } finally {
      setIsActivatingMic(false);
    }
  };

  const handleTestMic = async () => {
    setIsMicTesting(true);
    showToast('Mic Test: Speak now...', 'info');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setTimeout(() => {
          stream.getTracks().forEach(t => t.stop());
          setIsMicTesting(false);
          showToast('✓ Microphone is working clearly!', 'success');
        }, 2000);
      } else {
        setTimeout(() => {
          setIsMicTesting(false);
          showToast('✓ Microphone connection is active', 'success');
        }, 1500);
      }
    } catch (err) {
      setIsMicTesting(false);
      showToast('Mic test failed. Please check permissions.', 'error');
    }
  };

  const handleToggleMic = async () => {
    if (micEnabled) {
      setMicEnabled(false);
      localStorage.setItem('aether_mic_enabled', 'false');
      showToast('Microphone disabled', 'info');
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
        ? '🎙️ "Hey Aether" wake-word active! Say "Hey Aether"'
        : '🔇 "Hey Aether" wake-word paused', 
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
      showToast('Push notifications muted', 'info');
    } else {
      setPushEnabled(true);
      localStorage.setItem('aether_push_enabled', 'true');
      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_NOTIFICATION_PERMISSION' }));
        } catch (e) {}
      }
      await handleRequestPushPermission();
      await ensurePushSubscribed();
    }
  };

  const detectRealTimeLocation = async (manualToast = false) => {
    if (manualToast) showToast('📍 Detecting your location...', 'info');

    const saveAndApply = (coords, locName) => {
      if (!locName || locName.toLowerCase().includes('singapore')) return false;
      setLocationEnabled(true);
      localStorage.setItem('aether_location_enabled', 'true');
      if (coords && coords.latitude && coords.longitude) {
        setUserCoords(coords);
      }
      setUserLocationName(locName);
      localStorage.setItem('aether_user_city', locName);
      if (manualToast) showToast(`✓ Location enabled: ${locName} 📍`, 'success');
      return true;
    };

    // 1. Direct GPS Hardware Geolocation (Android native / Browser GPS)
    const tryGps = () => new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            const locName = await reverseGeocodeLocation(coords.latitude, coords.longitude);
            if (locName && !locName.includes('°')) {
              resolve({ coords, locName });
              return;
            }
          } catch (e) {}
          resolve(null);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    });

    // 2. Multi-Source Client-Side IP Geocoding (Bypasses Android WebView GPS permission block 100%)
    const tryClientIp = async () => {
      // BigDataCloud client reverse geocoding
      try {
        const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
        if (res.ok) {
          const d = await res.json();
          const city = d.city || d.locality || d.principalSubdivision;
          const state = d.principalSubdivision;
          const name = [city, state].filter(Boolean).join(', ');
          if (name && !name.toLowerCase().includes('singapore')) {
            return {
              coords: { latitude: d.latitude, longitude: d.longitude },
              locName: name
            };
          }
        }
      } catch (e) {}

      // ipwho.is client geocoding
      try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
          const d = await res.json();
          if (d.success && d.city) {
            const name = [d.city, d.region].filter(Boolean).join(', ');
            if (name && !name.toLowerCase().includes('singapore')) {
              return {
                coords: { latitude: d.latitude, longitude: d.longitude },
                locName: name
              };
            }
          }
        }
      } catch (e) {}

      // freeipapi.com
      try {
        const res = await fetch('https://freeipapi.com/api/json');
        if (res.ok) {
          const d = await res.json();
          if (d.cityName) {
            const name = [d.cityName, d.regionName].filter(Boolean).join(', ');
            if (name && !name.toLowerCase().includes('singapore')) {
              return {
                coords: { latitude: d.latitude, longitude: d.longitude },
                locName: name
              };
            }
          }
        }
      } catch (e) {}

      return null;
    };

    // A: Try GPS first
    const gpsRes = await tryGps();
    if (gpsRes && saveAndApply(gpsRes.coords, gpsRes.locName)) {
      return gpsRes.locName;
    }

    // B: Fall back to client phone network IP
    const ipRes = await tryClientIp();
    if (ipRes && saveAndApply(ipRes.coords, ipRes.locName)) {
      return ipRes.locName;
    }

    // C: Fall back to server detection
    try {
      const srv = await fetch(`${API_BASE}/location/detect`);
      if (srv.ok) {
        const d = await srv.json();
        if (d.display_name && !d.display_name.toLowerCase().includes('singapore')) {
          if (saveAndApply({ latitude: d.latitude, longitude: d.longitude }, d.display_name)) {
            return d.display_name;
          }
        }
      }
    } catch (e) {}

    if (manualToast) showToast('Location could not be detected automatically. Tap Edit in Permissions to enter your city 📍', 'warning');
    return null;
  };

  const handleSetCustomCity = (cityName) => {
    if (!cityName || !cityName.trim()) return;
    const cleanCity = cityName.trim();
    setUserLocationName(cleanCity);
    localStorage.setItem('aether_user_city', cleanCity);
    localStorage.setItem('aether_location_enabled', 'true');
    setLocationEnabled(true);
    showToast(`✓ City updated: ${cleanCity} 📍`, 'success');
  };

  const handleToggleLocation = async () => {
    if (locationEnabled) {
      setLocationEnabled(false);
      localStorage.setItem('aether_location_enabled', 'false');
      setUserCoords(null);
      setUserLocationName('');
      localStorage.removeItem('aether_user_city');
      showToast('Location permission disabled', 'info');
    } else {
      await detectRealTimeLocation(true);
      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_LOCATION_PERMISSION' }));
        } catch (e) {}
      }
    }
  };

  // Auto-refresh location if previously enabled or if stuck on old default
  useEffect(() => {
    const isLocEnabled = localStorage.getItem('aether_location_enabled') === 'true';
    const savedCity = localStorage.getItem('aether_user_city') || '';
    if (isLocEnabled || savedCity.includes('Jaipur, Rajasthan')) {
      detectRealTimeLocation(false);
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
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      showToast('📸 Processing photo...', 'info');
      const newItems = [];
      for (const file of files) {
        const compressedUrl = await compressImage(file);
        if (compressedUrl) {
          newItems.push({
            id: `cam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'image',
            name: file.name || `Camera_${Date.now()}.jpg`,
            url: compressedUrl,
            size: Math.round((compressedUrl.length * 3) / 4)
          });
        }
      }
      if (newItems.length > 0) {
        setAttachedMediaList(prev => [...prev, ...newItems].slice(0, 6));
        setShowDashboard(false);
        showToast('📸 Photo ready! Ask your question.', 'success');
      }
    }
    e.target.value = '';
  };

  const handlePhotosFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      showToast(files.length > 1 ? `🖼️ Processing ${files.length} photos...` : '🖼️ Processing photo...', 'info');
      const newItems = [];
      for (const file of files) {
        const compressedUrl = await compressImage(file);
        if (compressedUrl) {
          newItems.push({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'image',
            name: file.name || `Photo_${Date.now()}.jpg`,
            url: compressedUrl,
            size: Math.round((compressedUrl.length * 3) / 4)
          });
        }
      }
      if (newItems.length > 0) {
        setAttachedMediaList(prev => {
          const combined = [...prev, ...newItems];
          if (combined.length > 6) {
            showToast('Maximum 6 attachments supported per message.', 'info');
            return combined.slice(0, 6);
          }
          return combined;
        });
        setShowDashboard(false);
        showToast(newItems.length > 1 ? `🖼️ ${newItems.length} photos attached!` : '🖼️ Photo attached! Ask your question.', 'success');
      }
    }
    e.target.value = '';
  };

  const handleDocumentFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedMediaList(prev => [...prev, {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'file',
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB'
      }].slice(0, 6));
      setShowDashboard(false);
      showToast(`📁 File attached: ${file.name}`, 'success');
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
          showToast("Could not start camera. Opening file picker...", "info");
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

    setAttachedMediaList(prev => [...prev, {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'image',
      name: `Live_Photo_${new Date().toLocaleTimeString().replace(/:/g, '-')}.jpg`,
      url: dataUrl
    }].slice(0, 6));

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraModalOpen(false);
    setShowDashboard(false);
    showToast('📸 Photo captured! Ask your question.', 'success');
  };

  const handleAttachDriveFromModal = (e) => {
    e?.preventDefault?.();
    const url = driveInputUrl.trim() || 'https://drive.google.com';
    const name = driveDocName.trim() || 'Google Drive File';
    setAttachedMediaList(prev => [...prev, {
      id: `drive-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'drive',
      name: name,
      url: url
    }].slice(0, 6));
    setIsDriveModalOpen(false);
    setDriveInputUrl('');
    setDriveDocName('');
    showToast('📂 Google Drive file attached!', 'success');
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
      showToast('📍 Getting GPS location & opening map...', 'info');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setAttachedMediaList(prev => [...prev, {
            id: `map-${Date.now()}`,
            type: 'map',
            name: `📍 Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`,
            url: mapsLink,
            latitude,
            longitude
          }].slice(0, 6));
          setLocationEnabled(true);
          localStorage.setItem('aether_location_enabled', 'true');
          setUserCoords({ latitude, longitude });
          showToast('✓ Opening map!', 'success');
          // Open map: in mobile native Map app, in desktop browser tab
          openMapApp(latitude, longitude);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          showToast('GPS permission unavailable. Opening map...', 'info');
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

    const handleSwMessage = async (event) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED' && event.data?.subscription) {
        const emailToUse = userEmail || localStorage.getItem('aether_user_email');
        if (emailToUse) {
          try {
            await fetch(`${API_BASE}/push/subscribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_email: emailToUse,
                subscription: event.data.subscription,
              }),
            });
            console.log('[Aether Push] ✅ Subscription refreshed & synced for', emailToUse);
          } catch (e) {
            console.warn('[Aether Push] Refresh sync warning:', e);
          }
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);

    navigator.serviceWorker.register('/sw.js')
      .then(async (reg) => {
        console.log('Aether SW Active:', reg.scope);
        await ensurePushSubscribed();
      })
      .catch(err => console.log('Aether SW error:', err));

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, [userEmail]);
  // ─────────────────────────────────────────────────────────────────────────────

  // Calendar & Reminders Helpers
  const getTaskDateStr = (t) => {
    // Daily recurring tasks are ALWAYS scheduled for today
    if (t?.recurrence === 'daily' || t?.repeat === 'daily' || String(t?.recurrence || '').toLowerCase().includes('daily')) {
      return formatLocalDateStr(new Date());
    }
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
    setTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, due_date: `${finalDate}T10:00:00`, status: 'pending', is_completed: false } : t));
    try {
      const authHeaders = userEmail ? { 'X-User-Email': userEmail } : {};
      await fetch(`${API_BASE}/tasks/${taskId}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ due_date: `${finalDate}T10:00:00` })
      });
      showToast('Task rescheduled successfully!', 'success');
    } catch (e) {
      showToast('Failed to reschedule', 'error');
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
      showToast(`${data.rescheduled_count || 0} overdue tasks rescheduled to today!`, 'success');
    } catch (e) {
      showToast('Failed to reschedule', 'error');
    }
  };

  const handleCopyTodayTasksToSelectedDate = async () => {
    const todayStr = formatLocalDateStr(new Date());
    const targetStr = formatLocalDateStr(calSelectedDate);
    if (!targetStr || targetStr === todayStr) return;
    const todayTasks = tasks.filter(t => getTaskDateStr(t) === todayStr);
    if (todayTasks.length === 0) {
      showToast('No tasks found for today to copy', 'info');
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
      showToast(`${count} daily tasks added to ${targetStr}'s agenda!`, 'success');
    } catch (err) {
      showToast('Failed to copy tasks', 'error');
    }
  };

  const handleResetTodayCompletedTasks = async () => {
    const todayStr = formatLocalDateStr(new Date());
    const completedToday = tasks.filter(t => (t.is_completed || t.status === 'completed') && getTaskDateStr(t) === todayStr);
    if (completedToday.length === 0) {
      showToast('No completed tasks today to reset', 'info');
      return;
    }
    completedToday.forEach(t => {
      pendingTaskStatusRef.current.set(String(t.id), {
        status: 'pending',
        is_completed: false,
        timestamp: Date.now()
      });
    });
    setTasks(prev => prev.map(t => {
      if (completedToday.some(c => String(c.id) === String(t.id))) {
        return { ...t, is_completed: false, status: 'pending' };
      }
      return t;
    }));
    try {
      for (const t of completedToday) {
        await fetch(`${API_BASE}/tasks/${t.id}/toggle`, {
          method: 'PUT',
          headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
        });
        pendingTaskStatusRef.current.delete(String(t.id));
      }
      showToast(`${completedToday.length} tasks reactivated for today!`, 'success');
    } catch (err) {
      showToast('Failed to reset tasks', 'error');
    }
  };

  const downloadAllRemindersIcs = () => {
    const activeTasks = tasks.filter(t => !t.is_completed && t.status !== 'completed');
    if (activeTasks.length === 0) {
      showToast('No active reminders found', 'info');
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
    showToast('✓ Google Calendar (.ics) file downloaded!', 'success');
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
        showToast('✓ Reminder added to calendar!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to add reminder', 'error');
    }
  };

  const syncGCalViaIcalUrl = async (customUrl, isManual = false, _retryCount = 0) => {
    const url = (customUrl || gcalIcalUrl).trim();
    if (!url || !url.startsWith('http')) {
      if (isManual) showToast('Please enter a valid Google Calendar iCal link (https://...)', 'error');
      return;
    }
    if (url.includes('calendar.google.com/calendar/u/') || url.includes('/calendar/r')) {
      if (isManual) {
        showToast('This is a Google Calendar web link! Please paste your "Secret address in iCal format" (.ics) link below.', 'error');
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
          showToast(`⚡ Syncing in background (${cachedCount} events cached safely)`, 'info');
          setShowGCalConnectModal(false);
          setIsSyncingGCal(false);
          return;
        }

        if (_retryCount < 2) {
          const waitSec = (_retryCount + 1) * 8;
          if (isManual) {
            showToast(`Connecting to server... auto-syncing in ${waitSec}s 🔄`, 'info');
          }
          setIsSyncingGCal(false);
          setTimeout(() => syncGCalViaIcalUrl(customUrl, isManual, _retryCount + 1), waitSec * 1000);
          return;
        }
        if (isManual) {
          showToast('Cloud server not responding. Please try syncing in a moment.', 'error');
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
        showToast(`Synced ${events.length} events & reminders from Google Calendar! 📅`, 'success');
      }
    } catch (err) {
      console.error(err);
      // Network timeout पर भी auto-retry
      if ((err.name === 'TimeoutError' || err.name === 'AbortError') && _retryCount < 2) {
        const waitSec = (_retryCount + 1) * 12;
        if (isManual) {
          showToast(`Server not responding... retrying in ${waitSec}s 🔄`, 'info');
        }
        setIsSyncingGCal(false);
        setTimeout(() => syncGCalViaIcalUrl(customUrl, isManual, _retryCount + 1), waitSec * 1000);
        return;
      }
      if (isManual) {
        showToast('Google Calendar sync error: ' + err.message, 'error');
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
          showToast(`Imported ${events.length} events from Google Calendar (.ics)!`, 'success');
        } else {
          showToast('No events found. Please select a valid .ics file.', 'info');
        }
      } catch (err) {
        showToast('Failed to read file', 'error');
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

  // Real-time foreground reminder watcher (checks every 20 seconds)
  const alertedRemindersRef = useRef({});
  useEffect(() => {
    const reminderChecker = setInterval(() => {
      const allActiveTasks = [...(tasks || []), ...(googleTasks || [])];
      if (allActiveTasks.length === 0) return;

      const now = new Date();
      const currentHrs = now.getHours();
      const currentMins = now.getMinutes();
      const todayDateStr = now.toISOString().slice(0, 10);
      const minuteKey = `${todayDateStr}_${currentHrs}:${currentMins}`;

      allActiveTasks.forEach(t => {
        if (!t.reminder_time || t.is_completed || t.status === 'completed') return;
        const alertKey = `${t.id}_${minuteKey}`;
        if (alertedRemindersRef.current[alertKey]) return;

        // Parse reminder time
        const m = String(t.reminder_time).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (!m) return;
        let hrs = parseInt(m[1], 10);
        const mins = m[2] ? parseInt(m[2], 10) : 0;
        const ampm = (m[3] || '').toUpperCase();
        if (ampm === 'PM' && hrs < 12) hrs += 12;
        if (ampm === 'AM' && hrs === 12) hrs = 0;

        if (currentHrs === hrs && currentMins === mins) {
          alertedRemindersRef.current[alertKey] = true;
          playReminderChime();
          showToast(`⏰ Reminder: ${t.title}`, 'warning');
          if (typeof window !== 'undefined' && window.ReactNativeWebView) {
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TRIGGER_NOTIFICATION',
                title: `⏰ AETHER Reminder: ${t.title}`,
                body: `Time: ${t.reminder_time} • Your reminder is due now!`
              }));
            } catch (err) {}
          }
        }
      });
    }, 20000);

    return () => clearInterval(reminderChecker);
  }, [tasks, googleTasks]);

  // Initial real-time location sync
  useEffect(() => {
    if (!userLocationName || userLocationName.includes('Jaipur, Rajasthan') || userLocationName.toLowerCase().includes('singapore')) {
      detectRealTimeLocation(false);
    }
  }, []);

  // Fetch all backend data and check due reminders with Multi-Tenant Isolation
  const refreshAllData = async (opts = {}) => {
    // If prompt is actively generating, skip to prevent screen flicker or uncommitted history overwriting
    if (isProcessingRef.current && !opts.force) return;

    try {
      const currentEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';
      const authHeaders = currentEmail ? { 'X-User-Email': currentEmail } : {};
      const curSessionId = activeSessionIdRef.current || 'default';
      const briefLocParams = `&lat=${userCoords?.latitude || ''}&lon=${userCoords?.longitude || ''}&city=${encodeURIComponent(userLocationName || '')}`;
      const [resBrief, resChat, resSessions, resTasks, resFin, resFinSum, resMem, resAudit, resNews, resDue, resCricket] = await Promise.all([
        fetch(`${API_BASE}/briefing?user_name=${encodeURIComponent(userName || 'Operator')}${briefLocParams}`, { headers: authHeaders }),
        opts.skipChatHistory ? Promise.resolve({ ok: false }) : fetch(`${API_BASE}/chat/history?session_id=${encodeURIComponent(curSessionId)}&limit=60`, { headers: authHeaders }),
        fetch(`${API_BASE}/chat/sessions`, { headers: authHeaders }),
        fetch(`${API_BASE}/tasks`, { headers: authHeaders }),
        fetch(`${API_BASE}/finance/records`, { headers: authHeaders }),
        fetch(`${API_BASE}/finance/summary`, { headers: authHeaders }),
        fetch(`${API_BASE}/memory`, { headers: authHeaders }),
        fetch(`${API_BASE}/audit-logs`, { headers: authHeaders }),
        fetch(`${API_BASE}/news?limit=4`),
        fetch(`${API_BASE}/reminders/due`, { headers: authHeaders }),
        fetch(`${API_BASE}/cricket/live`).catch(() => ({ ok: false }))
      ]);

      if (resBrief.ok) {
        const bData = await resBrief.json();
        setBriefing(bData);
        if (bData.city_guide) setCityGuide(bData.city_guide);
      }
      if (resSessions && resSessions.ok) {
        try {
          const sessData = await resSessions.json();
          if (Array.isArray(sessData)) {
            // Drop any session that was intentionally deleted or temporary
            const validSessions = sessData.filter(s => !deletedSessionIdsRef.current.has(s.id) && !s.id.startsWith('temp_') && s.id !== 'temporary');
            setChatSessions(validSessions);
            if (currentEmail) {
              try {
                localStorage.setItem(`aether_chat_sessions_${currentEmail}`, JSON.stringify(validSessions));
              } catch (e) {}
            }
          }
        } catch (e) {}
      }
      if (resChat.ok && !opts.skipChatHistory) {
        const chats = await resChat.json();
        // Normalize role for rendering: 'aether' -> 'assistant'
        const normalizedChats = Array.isArray(chats) ? chats.map(c => ({
          ...c,
          role: c.role === 'aether' ? 'assistant' : c.role
        })) : [];

        // Guard against race conditions: only update if activeSessionId hasn't changed during fetch
        if (activeSessionIdRef.current === curSessionId) {
          if (currentEmail && curSessionId) {
            try {
              localStorage.setItem(`aether_chat_history_${currentEmail}_${curSessionId}`, JSON.stringify(normalizedChats));
            } catch (e) {}
          }

          setChatHistory(prev => {
            if (isClearingChatRef.current) {
              return [];
            }
            if (isProcessingRef.current) {
              return prev;
            }
            if (normalizedChats.length === 0) {
              return [];
            }
            if (prev.length === normalizedChats.length && prev[prev.length - 1]?.content === normalizedChats[normalizedChats.length - 1]?.content) {
              return prev;
            }
            // Avoid wiping out active media players (like YouTube embed iframe) if the latest message matches
            if (prev.length > 0 && normalizedChats.length > 0) {
              const lastPrev = prev[prev.length - 1];
              const lastNorm = normalizedChats[normalizedChats.length - 1];
              if (lastPrev.content === lastNorm.content && lastPrev.role === lastNorm.role) {
                return prev;
              }
            }
            return normalizedChats;
          });
        }
      }

      let loadedTasks = [];
      let loadedMemories = [];
      let loadedFinances = [];

      if (resTasks.ok) {
        loadedTasks = await resTasks.json();
        const now = Date.now();

        // 1. Drop any task that was intentionally deleted by the user
        let cleanTasks = Array.isArray(loadedTasks) 
          ? loadedTasks.filter(t => !deletedTaskIdsRef.current.has(String(t.id)))
          : [];

        // 2. Preserve recent optimistic status changes (completed/pending) so slow server sync never reverts them
        cleanTasks = cleanTasks.map(t => {
          let updatedTask = t;
          const pending = pendingTaskStatusRef.current.get(String(t.id));
          if (pending && (now - pending.timestamp < 15000)) {
            const serverDone = Boolean(t.is_completed || t.status === 'completed');
            if (serverDone === pending.is_completed) {
              pendingTaskStatusRef.current.delete(String(t.id));
            } else {
              updatedTask = { ...updatedTask, status: pending.status, is_completed: pending.is_completed };
            }
          }
          if (updatedTask.subtasks && Array.isArray(updatedTask.subtasks)) {
            updatedTask = {
              ...updatedTask,
              subtasks: updatedTask.subtasks.map(s => {
                const subPending = pendingTaskStatusRef.current.get(String(s.id));
                if (subPending && (now - subPending.timestamp < 15000)) {
                  const subServerDone = Boolean(s.is_completed || s.status === 'completed');
                  if (subServerDone === subPending.is_completed) {
                    pendingTaskStatusRef.current.delete(String(s.id));
                    return s;
                  }
                  return { ...s, status: subPending.status, is_completed: subPending.is_completed };
                }
                return s;
              })
            };
          }
          return updatedTask;
        });

        setTasks(prev => {
          // Never wipe out local tasks if server returned 0 but we already have local tasks!
          if (cleanTasks.length === 0 && prev.length > 0) {
            return prev;
          }
          return cleanTasks;
        });

        if (cleanTasks.length > 0) {
          localStorage.setItem('aether_cached_tasks', JSON.stringify(cleanTasks));
          setOnboardingDone(true);
          try {
            localStorage.setItem('aether_onboarding_done', 'true');
          } catch (e) {}
          if (currentEmail) {
            localStorage.setItem(`aether_backup_${currentEmail}`, JSON.stringify({
              tasks: cleanTasks,
              memories: loadedMemories,
              finances: loadedFinances
            }));
          }

          // Restore/seed today's recurring completions from server state if cache was wiped or empty
          try {
            const todayStr = formatLocalDateStr(new Date());
            const savedDateCompletions = localStorage.getItem('aether_task_date_completions');
            const dateMap = savedDateCompletions ? JSON.parse(savedDateCompletions) : {};
            let mapUpdated = false;

            cleanTasks.forEach(t => {
              const isDaily = t.recurrence === 'daily' || t.repeat === 'daily' || String(t.recurrence || '').toLowerCase().includes('daily');
              if (isDaily) {
                // 1. Merge all server-persisted date completions for all past dates
                if (t.date_completions && typeof t.date_completions === 'object') {
                  Object.entries(t.date_completions).forEach(([d, val]) => {
                    if (!dateMap[t.id] || dateMap[t.id][d] !== val) {
                      dateMap[t.id] = { ...(dateMap[t.id] || {}), [d]: Boolean(val) };
                      mapUpdated = true;
                    }
                  });
                }
                // 2. Ensure today is completed if task status is completed on server
                if (t.is_completed || t.status === 'completed') {
                  if (!dateMap[t.id] || dateMap[t.id][todayStr] === undefined) {
                    dateMap[t.id] = { ...(dateMap[t.id] || {}), [todayStr]: true };
                    mapUpdated = true;
                  }
                  // 3. If task has a due date or creation date in the past that was completed
                  if (t.due_date) {
                    const dueD = t.due_date.slice(0, 10);
                    if (!dateMap[t.id] || dateMap[t.id][dueD] === undefined) {
                      dateMap[t.id] = { ...(dateMap[t.id] || {}), [dueD]: true };
                      mapUpdated = true;
                    }
                  }
                  if (t.created_at) {
                    const createD = t.created_at.slice(0, 10);
                    if (!dateMap[t.id] || dateMap[t.id][createD] === undefined) {
                      dateMap[t.id] = { ...(dateMap[t.id] || {}), [createD]: true };
                      mapUpdated = true;
                    }
                  }
                }
              }
            });

            if (mapUpdated) {
              localStorage.setItem('aether_task_date_completions', JSON.stringify(dateMap));
            }
          } catch (e) {}
        }

        // Schedule upcoming reminders natively on mobile app
        if (typeof window !== 'undefined' && window.ReactNativeWebView && Array.isArray(cleanTasks)) {
          cleanTasks.forEach(t => {
            const isDone = t.is_completed || t.status === 'completed';
            if (isDone) {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'CANCEL_REMINDER',
                  id: t.id
                }));
              } catch (e) {}
            } else if (t.reminder_time) {
              const trigger = calculateTaskTrigger(t);
              if (trigger && trigger.triggerSeconds > 0) {
                try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SCHEDULE_REMINDER',
                    id: t.id,
                    title: t.title,
                    reminder_time: t.reminder_time,
                    triggerSeconds: trigger.triggerSeconds,
                    isDaily: trigger.isDaily,
                    hour: trigger.hour,
                    minute: trigger.minute
                  }));
                } catch (e) {}
              }
            }
          });
        }
      }

      if (resFin.ok) {
        loadedFinances = await resFin.json();
        const validFinances = Array.isArray(loadedFinances)
          ? loadedFinances.filter(f => !deletedFinanceIdsRef.current.has(String(f.id)))
          : [];
        setFinanceRecords(validFinances);
      }
      if (resFinSum.ok) setFinanceSummary(await resFinSum.json());
      if (resMem.ok) {
        loadedMemories = await resMem.json();
        const validMemories = Array.isArray(loadedMemories)
          ? loadedMemories.filter(m => !deletedMemoryIdsRef.current.has(String(m.id)))
          : [];
        setMemories(validMemories);
      }
      if (resAudit.ok) setAuditLogs(await resAudit.json());
      if (resNews.ok) setNewsItems(await resNews.json());
      if (resCricket && resCricket.ok) {
        const cData = await resCricket.json();
        setCricketMatches(cData.matches || []);
      }
      
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
          // If server returned 0 records, try restoring from local backup or native bridge backup ONLY for this exact user
          let backupData = null;
          const cachedBackupStr = currentEmail ? localStorage.getItem(`aether_backup_${currentEmail}`) : null;
          if (cachedBackupStr) {
            try { backupData = JSON.parse(cachedBackupStr); } catch (e) {}
          }
          if (!backupData && typeof window !== 'undefined' && window.__nativeBackup) {
            try {
              const parsed = JSON.parse(window.__nativeBackup);
              // Strict Multi-tenant check: never restore another account's backup
              if (parsed && parsed.email && currentEmail && parsed.email.trim().toLowerCase() === currentEmail.trim().toLowerCase()) {
                backupData = parsed;
              }
            } catch (e) {}
          }

          if (backupData && currentEmail) {
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
              `⏰ AETHER Reminder: ${dueItem.title}`,
              `Time: ${dueItem.reminder_time || 'Now'} • Your reminder is due now!`,
              `reminder-${dueItem.id}`
            );
          }
          
          fetch(`${API_BASE}/reminders/${dueItem.id}/ack`, { 
            method: 'POST',
            headers: authHeaders
          }).catch(() => {});
        }
      }
      
      setServerOnline(prev => {
        if (!prev) {
          showToast("✓ Aether Core connected!", "success");
        }
        return true;
      });
      setLastSyncTime(new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setServerOnline(false);
    }
  };

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(refreshAllData, serverOnline ? 15000 : 3500);
    return () => clearInterval(interval);
  }, [serverOnline]);

  // Mobile Touch-Driven Pull to Refresh
  useEffect(() => {
    let touchStartY = 0;
    let isTracking = false;

    const getScrollTop = () => {
      const activeScroller = document.querySelector('.dashboard-scroll-container') ||
                             document.querySelector('.gemini-chat-feed') ||
                             document.querySelector('.gemini-screen-container') ||
                             document.scrollingElement ||
                             document.documentElement;
      return activeScroller ? activeScroller.scrollTop : 0;
    };

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      // Never intercept touch if settings or any modal is open
      if (document.querySelector('.jarvis-settings-container') || 
          document.querySelector('.modal-overlay') || 
          document.querySelector('[role="dialog"]') ||
          document.querySelector('.cricket-scoreboard-container')) {
        isTracking = false;
        return;
      }
      if (getScrollTop() <= 5) {
        touchStartY = e.touches[0].clientY;
        isTracking = true;
      } else {
        isTracking = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!isTracking || e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY;

      if (deltaY > 0 && getScrollTop() <= 5) {
        const damped = Math.min(Math.pow(deltaY, 0.82) * 1.4, 80);
        setPullDistance(damped);
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isTracking) return;
      isTracking = false;

      setPullDistance(prev => {
        if (prev >= 48) {
          setIsPullRefreshing(true);
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate(25); } catch (e) {}
          }
          (async () => {
            try {
              await refreshAllData({ force: true });
            } finally {
              setTimeout(() => {
                setIsPullRefreshing(false);
                setPullDistance(0);
              }, 400);
            }
          })();
          return 55;
        }
        return 0;
      });
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
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
      greetingLabel: t.greetings[phase] || 'Hello',
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
  const toggleVoiceRecognition = async (initialQuery = '') => {
    if (isListening && !initialQuery) {
      clearTimeout(speechSilenceTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    if (!micEnabled) {
      showToast("Microphone is disabled in Settings. Please enable it there.", 'info');
      setActiveSubModal('permissions');
      return;
    }

    // Play subtle wake chime & trigger crisp haptic pulse (Gemini-grade feedback)
    playWakeChime();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(20); } catch (e) {}
    }

    // If starting with query from wake word, pre-populate input
    if (initialQuery) {
      setInputText(initialQuery);
    }

    // Trigger native Android microphone permission if wrapped in mobile app
    const isInReactNativeWebView = typeof window !== 'undefined' && !!window.ReactNativeWebView;
    if (isInReactNativeWebView) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_MIC_PERMISSION' }));
        await new Promise((resolve) => {
          window.__onMicPermissionResult = (granted) => {
            window.__onMicPermissionResult = null;
            resolve(granted);
          };
          setTimeout(() => resolve(true), 2000);
        });
      } catch (e) {}
    }

    // Non-fatal getUserMedia check
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (micErr) {
        console.warn('getUserMedia non-fatal:', micErr);
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Voice input is unavailable on this device/WebView. Please type your message.", 'info');
      setIsTypeInputOpen(true);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = (isFriendMode || selectedLang === 'hi' || selectedLang === 'hi_friend') ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        showToast("🎙️ Aether is listening... Speak now", 'info');
      };

      recognition.onresult = (event) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i] && event.results[i][0]) {
            currentTranscript += " " + event.results[i][0].transcript;
          }
        }
        currentTranscript = currentTranscript.trim();
        if (!currentTranscript && initialQuery) {
          currentTranscript = initialQuery;
        }

        if (currentTranscript) {
          setInputText(currentTranscript);
        }

        // Smart dynamic silence detection (User finished speaking)
        clearTimeout(speechSilenceTimeoutRef.current);
        const lastResult = event.results[event.results.length - 1];
        const isFinal = Boolean(lastResult && lastResult.isFinal);
        const debounceDelay = isFinal ? 700 : 1100;

        speechSilenceTimeoutRef.current = setTimeout(() => {
          try { recognition.stop(); } catch (e) {}
          setIsListening(false);
          clearTimeout(speechSilenceTimeoutRef.current);
          const cleanPrompt = currentTranscript.replace(/^(hey\s*aether|ok\s*aether|okay\s*aether|hey\s*ether|ok\s*ether|okay\s*ether|aether|ether|हे\s*ईथर|ईथर|सुनो\s*ईथर|नमस्ते\s*ईथर)[,\s]+/i, '').trim() || currentTranscript;
          if (cleanPrompt.length > 0) {
            handleSendPrompt(cleanPrompt);
          }
        }, debounceDelay);
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error === 'not-allowed') {
          showToast("Please grant microphone permission to Aether in Settings.", 'error');
          setIsListening(false);
          clearTimeout(speechSilenceTimeoutRef.current);
        } else if (event.error !== 'no-speech') {
          setIsListening(false);
          clearTimeout(speechSilenceTimeoutRef.current);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
      clearTimeout(speechSilenceTimeoutRef.current);
      showToast("Failed to start microphone. Please use the text prompt.", 'error');
      setIsTypeInputOpen(true);
    }
  };

  const toggleListening = toggleVoiceRecognition;

  // Background "Hey Aether" Wake Word Detection (Universal: Mobile App & Desktop)
  useEffect(() => {
    // Guards: don't listen if onboarding not done, mic disabled, wake word disabled, active voice session, processing, speaking, or media running
    if (!onboardingDone || !micEnabled || !wakeWordEnabled || isListening || isSpeaking || isProcessing || activeMediaPlayingRef.current) {
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
      wakeRec.lang = (isFriendMode || selectedLang === 'hi' || selectedLang === 'hi_friend') ? 'hi-IN' : 'en-IN';

      wakeRec.onresult = (event) => {
        if (isDestroyed || isSpeaking) return;
        
        let latestSegment = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i] && event.results[i][0]) {
            latestSegment += " " + event.results[i][0].transcript;
          }
        }
        const text = latestSegment.trim().toLowerCase();
        if (!text) return;

        // Supported wake words: "hey aether", "ok aether", "aether", "hey ether", "हे ईथर", "ईथर", "सुनो ईथर"
        const wakeWordRegex = /\b(hey\s*aether|ok\s*aether|okay\s*aether|hey\s*ether|ok\s*ether|okay\s*ether|aether|ether|हे\s*ईथर|ईथर|सुनो\s*ईथर|नमस्ते\s*ईथर)\b/i;
        const match = text.match(wakeWordRegex);

        if (match) {
          console.log("[Wake Word Detected]:", text);
          showToast("⚡ 'Hey Aether' detected!", "info");
          playWakeChime();
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([25, 20, 25]); } catch (e) {}
          }
          
          try { wakeRec.stop(); } catch (e) {}
          wakeWordRecognitionRef.current = null;

          // Extract any query spoken along with the wake word
          const queryPart = text.slice(match.index + match[0].length).replace(/^[,.\s]+/, '').trim();
          setTimeout(() => {
            toggleVoiceRecognition(queryPart);
          }, 60);
        }
      };

      wakeRec.onerror = (e) => {
        if (!isDestroyed && wakeWordEnabled && micEnabled && !isListening && !isSpeaking && !isProcessing && !activeMediaPlayingRef.current) {
          if (e.error !== 'not-allowed') {
            setTimeout(() => {
              try { if (!isDestroyed && !activeMediaPlayingRef.current && !isSpeaking) wakeRec.start(); } catch (err) {}
            }, 800);
          }
        }
      };

      wakeRec.onend = () => {
        if (!isDestroyed && wakeWordEnabled && micEnabled && !isListening && !isSpeaking && !isProcessing && !activeMediaPlayingRef.current) {
          setTimeout(() => {
            try { if (!isDestroyed && !activeMediaPlayingRef.current && !isSpeaking) wakeRec.start(); } catch (e) {}
          }, 350);
        }
      };

      if (!isDestroyed && !activeMediaPlayingRef.current && !isSpeaking) {
        wakeRec.start();
      }
    } catch (e) {
      console.warn("Wake word listener start notice:", e);
    }

    return () => {
      isDestroyed = true;
      if (wakeRec) {
        try { wakeRec.stop(); } catch (e) {}
      }
      wakeWordRecognitionRef.current = null;
    };
  }, [wakeWordEnabled, micEnabled, onboardingDone, isListening, isSpeaking, isProcessing, selectedLang]);

  // Helper to split long responses into natural spoken chunks to bypass Chrome's 15s freeze & play 100% complete text
  const splitTextIntoSpeechChunks = (text, maxChunkLen = 160) => {
    if (!text) return [];
    // Split by sentence punctuation: periods, Devanagari purna viram (।), questions, exclamations, newlines
    const rawParts = text.split(/([.?!।\n]+)/);
    const sentences = [];
    for (let i = 0; i < rawParts.length; i += 2) {
      const part = rawParts[i] || '';
      const delim = rawParts[i + 1] || '';
      const full = (part + delim).trim();
      if (full) sentences.push(full);
    }

    const chunks = [];
    let current = "";

    for (const s of sentences) {
      if (s.length > maxChunkLen) {
        if (current) {
          chunks.push(current.trim());
          current = "";
        }
        const words = s.split(/\s+/);
        let subChunk = "";
        for (const w of words) {
          if ((subChunk + " " + w).length > maxChunkLen) {
            if (subChunk) chunks.push(subChunk.trim());
            subChunk = w;
          } else {
            subChunk = subChunk ? (subChunk + " " + w) : w;
          }
        }
        if (subChunk) current = subChunk;
      } else {
        if (current && (current.length + s.length + 1) > maxChunkLen) {
          chunks.push(current.trim());
          current = s;
        } else {
          current = current ? (current + " " + s) : s;
        }
      }
    }
    if (current && current.trim()) {
      chunks.push(current.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  };

  // Text to Speech with Instant Native Speech & Fast Parallel Server Streaming Fallback
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
      .replace(/[*_#`🔗🏆📰•⚡✨🎯💡📌|]/g, '') // remove markdown formatting & symbols/emojis
      .replace(/```[\s\S]*?```/g, '')         // remove code blocks
      .replace(/₹\s*([0-9,.-]+)/g, (match, p1) => hasDevanagari ? `${p1} रुपये` : `${p1} Rupees`)
      .replace(/[!]/g, '')                    // remove exclamation points
      .replace(/\s*([.,?।])\s*/g, '$1 ')      // attach punctuation directly
      .replace(/[.?।]+\s*([.?।]+)/g, '$1')    // remove duplicate punctuation
      .replace(/\s+/g, ' ')                  // normalize whitespace
      .trim();

    if (!cleanText) return;

    // Cancel any ongoing speech and reset audio refs
    stopBriefingAudio();

    let spoken = false;

    // 1. Try native Web Speech API SpeechSynthesis first (0ms instantaneous speech + full response chunk playback)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const matchedVoice = resolveSpeechVoice(selectedVoice, bcp47);
        if (matchedVoice) {
          const activeVoice = AETHER_VOICES.find(v => v.id === selectedVoice) || AETHER_VOICES[0];
          const chunks = splitTextIntoSpeechChunks(cleanText, 160);

          if (chunks.length > 0) {
            speechQueueRef.current = chunks;
            speechCurrentIndexRef.current = 0;
            setIsSpeaking(true);

            const playChunkAt = (index) => {
              const queue = speechQueueRef.current;
              if (!queue || index >= queue.length) {
                stopBriefingAudio();
                return;
              }

              const utterance = new SpeechSynthesisUtterance(queue[index]);
              activeUtteranceRef.current = utterance;
              utterance.voice = matchedVoice;
              utterance.rate = (activeVoice ? activeVoice.rate : 1.0) * speechRate;
              utterance.pitch = (activeVoice ? activeVoice.pitch : 1.0);
              utterance.volume = 1.0;
              utterance.lang = bcp47;

              utterance.onend = () => {
                speechCurrentIndexRef.current = index + 1;
                if (speechCurrentIndexRef.current < queue.length) {
                  playChunkAt(speechCurrentIndexRef.current);
                } else {
                  stopBriefingAudio();
                }
              };

              utterance.onerror = (e) => {
                console.warn('[Aether TTS] Chunk error:', e);
                speechCurrentIndexRef.current = index + 1;
                if (speechCurrentIndexRef.current < queue.length) {
                  playChunkAt(speechCurrentIndexRef.current);
                } else {
                  stopBriefingAudio();
                }
              };

              window.speechSynthesis.speak(utterance);
            };

            playChunkAt(0);
            spoken = true;
            return;
          }
        }
      } catch (e) {
        console.warn('[Aether TTS] Native speech exception:', e);
      }
    }

    // 2. Guaranteed Parallelized Server-Side TTS Fallback (<300ms latency)
    if (!spoken) {
      playStreamAudio(cleanText, selectedVoice, lang);
    }
  };

  // Translate Message to Hindi
  const handleTranslateMessage = async (msgIdx, originalText) => {
    try {
      showToast("Translating to Hindi...", "info");
      const resp = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText, target_lang: 'hi' })
      });
      const data = await resp.json();
      if (data.translated) {
        setChatHistory(prev => prev.map((m, idx) => idx === msgIdx ? { ...m, content: data.translated, isTranslated: true } : m));
        showToast("Hindi translation ready!", "success");
      }
    } catch (err) {
      showToast("Translation error", "error");
    }
  };

  // Send Command / Prompt
  const handleSendPrompt = async (textToSend) => {
    const rawPrompt = (textToSend || inputText).trim();
    const hasAttachments = attachedMediaList.length > 0;
    if (!rawPrompt && !hasAttachments) return;
    if (isProcessing) return;

    let prompt = rawPrompt;
    // Direct voice trigger for Executive Briefing
    if (!hasAttachments && /\b(morning briefing|executive briefing|daily briefing|ब्रीफिंग सुनाओ|आज का ब्रीफिंग|दिन का हाल)\b/i.test(prompt)) {
      handlePlayExecutiveBriefing(false);
      setInputText('');
      return;
    }
    const sendingImages = [];
    const contextPrefixes = [];
    if (hasAttachments) {
      attachedMediaList.forEach((item) => {
        if (item.type === 'image' && item.url) {
          sendingImages.push(item.url);
        } else if (item.type === 'file') {
          contextPrefixes.push(`[Attached File: ${item.name} (${item.size || ''})]`);
        } else if (item.type === 'drive') {
          contextPrefixes.push(`[Google Drive: ${item.url}]`);
        } else if (item.type === 'map') {
          contextPrefixes.push(`[Current Location: ${item.url}]`);
        }
      });
      if (contextPrefixes.length > 0) {
        prompt = `${contextPrefixes.join(' ')} ${rawPrompt || 'Review and analyze these attachments.'}`;
      } else if (sendingImages.length > 0) {
        prompt = rawPrompt || (sendingImages.length > 1
          ? `Analyze all ${sendingImages.length} attached images in detail, extract any bills, schedules, or tasks if present, and summarize the key information.`
          : 'Analyze this image in detail, extract any bills, schedules, or tasks if present, and summarize the key information.');
      }
      setAttachedMediaList([]);
    }
    const sendingImageUrl = sendingImages[0] || null;

    const curSessionId = isTemporaryChat 
      ? (`temp_${activeSessionIdRef.current || Date.now()}`) 
      : (activeSessionIdRef.current || 'default');
    userScrolledUpRef.current = false;
    setShowDashboard(false);

    // Optimistically update active chat history
    setChatHistory(prev => {
      const next = [...prev, { 
        role: 'user', 
        content: prompt, 
        image_url: sendingImageUrl,
        images: sendingImages.length > 0 ? sendingImages : undefined,
        created_at: new Date().toISOString() 
      }];
      if (!isTemporaryChat && userEmail && curSessionId) {
        try {
          localStorage.setItem(`aether_chat_history_${userEmail}_${curSessionId}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    // Optimistically update sessions list so drawer immediately displays new conversation with 0ms delay!
    // (Only if not a temporary chat)
    if (!isTemporaryChat) {
      const smartTitle = prompt.length > 36 ? prompt.slice(0, 36) + '...' : prompt;
      setChatSessions(prev => {
        const exists = prev.some(s => s.id === curSessionId);
        const updated = exists
          ? prev.map(s => s.id === curSessionId ? { ...s, updated_at: new Date().toISOString() } : s)
          : [{ id: curSessionId, title: smartTitle, updated_at: new Date().toISOString(), user_email: userEmail }, ...prev];
        if (userEmail) {
          try {
            localStorage.setItem(`aether_chat_sessions_${userEmail}`, JSON.stringify(updated));
          } catch (e) {}
        }
        return updated;
      });
    }

    setInputText('');
    isProcessingRef.current = true;
    setIsProcessing(true);
    setShowConversation(true);

    try {
      const payload = {
        input_text: prompt,
        image_data: sendingImageUrl || null,
        images: sendingImages.length > 0 ? sendingImages : null,
        session_id: curSessionId,
        latitude: userCoords?.latitude || null,
        longitude: userCoords?.longitude || null,
        city: userLocationName || null,
        language: isFriendActive ? 'hi_friend' : selectedLang,
        client_time: new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        api_key: (() => {
          const k = localStorage.getItem('aether_gemini_key') || '';
          return k.includes('AIzaSyCR3ZKXaMEGRU02hCrhhn4O978zMnDk0vU') ? '' : k;
        })(),
        openai_key: (localStorage.getItem('aether_openai_key') || '').trim(),
        grok_key: (localStorage.getItem('aether_grok_key') || '').trim(),
        active_provider: localStorage.getItem('aether_active_provider') || 'gemini',
        user_name: localStorage.getItem('aether_user_name') || userName || 'Operator',
        user_email: userEmail || null,
        finance_records: (financeRecords || []).slice(0, 40),
        finance_summary: financeSummary
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
            assistantReply = `Reminder scheduled: "${parsedInner.data.title}" ⏰`;
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
      const newAssistantMsgId = `yt-${Date.now()}`;

      // If YouTube intent: mark media active to protect audio focus; let embedded player play directly
      if (actionType === 'youtube') {
        setActivePlayingVideoId(newAssistantMsgId);
        activeMediaPlayingRef.current = true;
        if (wakeWordRecognitionRef.current) {
          try { wakeWordRecognitionRef.current.stop(); } catch (e) {}
          wakeWordRecognitionRef.current = null;
        }
        // On desktop browser without embed URL, fallback to window.open
        if (typeof window !== 'undefined' && !window.ReactNativeWebView && !(actionData?.embed_url || actionData?.video_id)) {
          try {
            const directTarget = actionData.play_url || actionData.watch_url || actionData.url;
            if (directTarget) window.open(directTarget, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.warn('YouTube popup notice:', e);
          }
        }
      }

      // Call action is presented via the interactive call action card with dial buttons

      setChatHistory(prev => {
        const next = [...prev, {
          id: newAssistantMsgId,
          role: 'assistant',
          content: assistantReply,
          action: actionType,
          actionData: actionData,
          created_at: new Date().toISOString()
        }];
        if (!isTemporaryChat && userEmail && curSessionId) {
          try {
            localStorage.setItem(`aether_chat_history_${userEmail}_${curSessionId}`, JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });

      // Quietly refresh chat sessions to get updated titles/timestamps (skip if temporary chat)
      if (!isTemporaryChat && userEmail) {
        fetch(`${API_BASE}/chat/sessions`, { headers: { 'X-User-Email': userEmail } })
          .then(r => r.ok ? r.json() : null)
          .then(sessData => {
            if (Array.isArray(sessData)) {
              const validSessions = sessData.filter(s => !deletedSessionIdsRef.current.has(s.id) && !s.id.startsWith('temp_') && s.id !== 'temporary');
              setChatSessions(validSessions);
              try {
                localStorage.setItem(`aether_chat_sessions_${userEmail}`, JSON.stringify(validSessions));
              } catch (e) {}
            }
          })
          .catch(() => {});
      }

      // If playing YouTube music, skip TTS voiceover to prevent dual audio collision & pause
      if (voiceOutputEnabled && actionType !== 'youtube') {
        speakText(assistantReply);
      }

      // Refresh tasks and finances quietly in the background without rewriting chatHistory
      refreshAllData({ skipChatHistory: true });
    } catch (err) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: "Could not reach Aether Core. Please check your internet connection or server status.",
        created_at: new Date().toISOString()
      }]);
      showToast("Could not reach Aether Core", 'error');
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Start a New Chat (Switches to fresh session, preserves existing chats)
  const handleStartNewChat = (initialProject = null) => {
    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    activeSessionIdRef.current = newSessionId;
    setActiveSessionId(newSessionId);
    setChatHistory([]);
    setInputText('');
    setShowConversation(false);
    setShowDashboard(false);
    setIsTemporaryChat(false);
    const projLabel = initialProject && initialProject !== 'all' ? ` [${initialProject.toUpperCase()}]` : '';
    showToast(`New conversation${projLabel} ready! ⚡`, 'success');

    const currentEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';
    if (currentEmail) {
      try {
        localStorage.setItem(`aether_active_session_id_${currentEmail}`, newSessionId);
        localStorage.setItem(`aether_chat_history_${currentEmail}_${newSessionId}`, JSON.stringify([]));
        if (initialProject && initialProject !== 'all') {
          const savedProj = localStorage.getItem('aether_chat_projects');
          const projMap = savedProj ? JSON.parse(savedProj) : {};
          projMap[newSessionId] = initialProject;
          localStorage.setItem('aether_chat_projects', JSON.stringify(projMap));
        }
      } catch (e) {}
    }

    if (initialProject && initialProject !== 'all' && currentEmail) {
      const projTitle = `New ${initialProject.charAt(0).toUpperCase() + initialProject.slice(1)} Chat`;
      fetch(`${API_BASE}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Email': currentEmail },
        body: JSON.stringify({ id: newSessionId, title: projTitle, project: initialProject })
      }).then(r => r.json()).then(newSess => {
        if (newSess && newSess.id) {
          setChatSessions(prev => [newSess, ...prev.filter(s => s.id !== newSess.id)]);
        }
      }).catch(() => {});
    }
  };

  // Switch to an existing chat session from drawer
  const handleSelectSession = async (sessionId) => {
    if (!sessionId) return;
    activeSessionIdRef.current = sessionId;
    setActiveSessionId(sessionId);
    setInputText('');
    setShowDashboard(false);

    const currentEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';
    if (currentEmail) {
      try {
        localStorage.setItem(`aether_active_session_id_${currentEmail}`, sessionId);
        const cached = localStorage.getItem(`aether_chat_history_${currentEmail}_${sessionId}`);
        if (cached) {
          setChatHistory(JSON.parse(cached));
        } else {
          setChatHistory([]);
        }
      } catch (e) {}
    }

    try {
      const authHeaders = currentEmail ? { 'X-User-Email': currentEmail } : {};
      const res = await fetch(`${API_BASE}/chat/history?session_id=${encodeURIComponent(sessionId)}&limit=60`, { headers: authHeaders });
      if (res.ok) {
        const chats = await res.json();
        if (activeSessionIdRef.current === sessionId) {
          const normalizedChats = Array.isArray(chats) ? chats.map(c => ({
            ...c,
            role: c.role === 'aether' ? 'assistant' : c.role
          })) : [];
          setChatHistory(normalizedChats);
          if (currentEmail) {
            try {
              localStorage.setItem(`aether_chat_history_${currentEmail}_${sessionId}`, JSON.stringify(normalizedChats));
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.warn("Error fetching session chat history:", err);
    }
  };

  // Rename a chat session
  const handleRenameSession = async (sessionId, newTitle) => {
    if (!sessionId || !newTitle?.trim()) return;
    const cleanTitle = newTitle.trim();
    const currentEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';

    setChatSessions(prev => {
      const next = prev.map(s => s.id === sessionId ? { ...s, title: cleanTitle } : s);
      if (currentEmail) {
        try {
          localStorage.setItem(`aether_chat_sessions_${currentEmail}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    try {
      const authHeaders = currentEmail ? { 'X-User-Email': currentEmail, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
      const res = await fetch(`${API_BASE}/chat/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ title: cleanTitle })
      });
      if (res.ok) {
        showToast("Conversation renamed", 'success');
      }
    } catch (err) {
      console.warn("Error renaming chat session:", err);
    }
  };

  // Delete a chat session intentionally
  const handleDeleteSession = async (sessionId) => {
    if (!sessionId) return;
    deletedSessionIdsRef.current.add(sessionId);
    const currentEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';

    const remainingSessions = chatSessions.filter(s => s.id !== sessionId);
    setChatSessions(remainingSessions);
    if (currentEmail) {
      try {
        localStorage.setItem(`aether_chat_sessions_${currentEmail}`, JSON.stringify(remainingSessions));
        localStorage.removeItem(`aether_chat_history_${currentEmail}_${sessionId}`);
      } catch (e) {}
    }

    if (sessionId === activeSessionIdRef.current) {
      if (remainingSessions.length > 0) {
        handleSelectSession(remainingSessions[0].id);
      } else {
        handleStartNewChat();
      }
    }

    try {
      const authHeaders = currentEmail ? { 'X-User-Email': currentEmail } : {};
      await fetch(`${API_BASE}/chat/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      showToast("Conversation deleted", 'info');
    } catch (err) {
      console.warn("Error deleting chat session:", err);
    }
  };

  const handleToggleTask = async (taskId, explicitDone = null, explicitDateStr = null) => {
    // Support both ID primitive and task object
    const actualTaskId = typeof taskId === 'object' && taskId !== null ? (taskId.id || taskId) : taskId;
    if (!actualTaskId) return;

    // Record date-aware completion for recurring/daily tasks
    const todayDateKey = explicitDateStr || (formatLocalDateStr ? formatLocalDateStr(new Date()) : new Date().toISOString().slice(0, 10));
    const targetTask = tasks.find(t => String(t.id) === String(actualTaskId)) || (typeof combinedTasks !== 'undefined' ? combinedTasks.find(t => String(t.id) === String(actualTaskId)) : null);
    const isDaily = targetTask && (targetTask.recurrence === 'daily' || targetTask.repeat === 'daily' || String(targetTask.recurrence || '').toLowerCase().includes('daily'));
    
    let willBeDone;
    if (explicitDone !== null && explicitDone !== undefined) {
      willBeDone = Boolean(explicitDone);
    } else {
      willBeDone = !(targetTask?.is_completed || targetTask?.status === 'completed');
    }

    if (isDaily) {
      try {
        const saved = localStorage.getItem('aether_task_date_completions');
        const map = saved ? JSON.parse(saved) : {};
        map[actualTaskId] = { ...(map[actualTaskId] || {}), [todayDateKey]: willBeDone };
        localStorage.setItem('aether_task_date_completions', JSON.stringify(map));
      } catch (e) {}
    }

    // Register in pendingTaskStatusRef so concurrent background polling never reverts to stale status
    pendingTaskStatusRef.current.set(String(actualTaskId), {
      status: willBeDone ? 'completed' : 'pending',
      is_completed: willBeDone,
      timestamp: Date.now()
    });

    // Optimistically toggle task in local state immediately so UI updates with zero delay
    setTasks(prev => prev.map(t => {
      if (String(t.id) === String(actualTaskId)) {
        return {
          ...t,
          is_completed: willBeDone,
          status: willBeDone ? 'completed' : 'pending',
          ...(isDaily ? { date_completions: { ...(t.date_completions || {}), [todayDateKey]: willBeDone } } : {})
        };
      }
      if (t.subtasks && t.subtasks.some(s => String(s.id) === String(actualTaskId))) {
        return {
          ...t,
          subtasks: t.subtasks.map(s => {
            if (String(s.id) === String(actualTaskId)) {
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

    // Also update googleTasks if matched
    setGoogleTasks(prev => prev.map(t => String(t.id) === String(actualTaskId) ? { ...t, is_completed: willBeDone, status: willBeDone ? 'completed' : 'pending' } : t));

    // Cancel native reminder alarm if being marked done
    if (willBeDone && typeof window !== 'undefined' && window.ReactNativeWebView) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'CANCEL_REMINDER',
          id: actualTaskId
        }));
      } catch (e) {}
    }

    try {
      const resp = await fetch(`${API_BASE}/tasks/${actualTaskId}/toggle`, { 
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(userEmail ? { 'X-User-Email': userEmail } : {}) 
        },
        body: JSON.stringify({ 
          status: willBeDone ? 'completed' : 'pending',
          date: todayDateKey
        })
      });
      if (resp.ok) {
        const serverUpdated = await resp.json();
        // Protect status for 12 seconds so in-flight GET polls never revert it
        setTimeout(() => {
          pendingTaskStatusRef.current.delete(String(actualTaskId));
        }, 12000);
        setTasks(prev => prev.map(t => {
          if (String(t.id) === String(actualTaskId)) {
            return { ...t, ...serverUpdated, is_completed: willBeDone, status: willBeDone ? 'completed' : 'pending' };
          }
          if (t.subtasks && t.subtasks.some(s => String(s.id) === String(actualTaskId))) {
            return {
              ...t,
              subtasks: t.subtasks.map(s => String(s.id) === String(actualTaskId) ? { ...s, ...serverUpdated, is_completed: willBeDone, status: willBeDone ? 'completed' : 'pending' } : s)
            };
          }
          return t;
        }));
        showToast("Task status updated", 'info');
      } else {
        pendingTaskStatusRef.current.delete(String(actualTaskId));
        setTasks(prev => prev.map(t => {
          if (String(t.id) === String(actualTaskId)) {
            return { ...t, is_completed: !willBeDone, status: !willBeDone ? 'completed' : 'pending' };
          }
          return t;
        }));
        showToast("Failed to update task status", 'error');
      }
    } catch (err) {
      console.error(err);
      pendingTaskStatusRef.current.delete(String(actualTaskId));
      setTasks(prev => prev.map(t => {
        if (String(t.id) === String(actualTaskId)) {
          return { ...t, is_completed: !willBeDone, status: !willBeDone ? 'completed' : 'pending' };
        }
        return t;
      }));
      showToast("Failed to update task status", 'error');
    }
  };

  const handleDeleteTask = (taskId) => {
    const target = tasks.find(t => String(t.id) === String(taskId));
    const title = target?.title || 'this task';
    showConfirm({
      title: "Delete Task?",
      message: `Are you sure you want to delete "${title}"?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      isDestructive: true,
      onConfirm: async () => {
        deletedTaskIdsRef.current.add(String(taskId));
        // Optimistically remove from local state
        setTasks(prev => prev.filter(t => String(t.id) !== String(taskId)).map(t => {
          if (t.subtasks && t.subtasks.some(s => String(s.id) === String(taskId))) {
            return { ...t, subtasks: t.subtasks.filter(s => String(s.id) !== String(taskId)) };
          }
          return t;
        }));
        setGoogleTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));

        try {
          const resp = await fetch(`${API_BASE}/tasks/${taskId}`, { 
            method: 'DELETE',
            headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
          });
          if (resp.ok) {
            showToast("Task deleted", 'info');
          }
        } catch (err) {
          console.error(err);
          showToast("Failed to delete task", 'error');
        }
      }
    });
  };

  const handleCreateTask = async (e, customTitle, customDateStr, customPriority) => {
    if (e && e.preventDefault) e.preventDefault();
    const rawTitle = (customTitle !== undefined ? customTitle : newTaskInput || '').trim();
    if (!rawTitle) {
      showToast("Please enter a task title (e.g. Drink 2L water at 3 PM)", 'info');
      return;
    }
    const effEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || '';
    
    // Natural Language Time Extraction (e.g. "at 3 PM", "at 9:00 PM")
    let parsedTime = null;
    let cleanTitle = rawTitle;
    const timeMatch = rawTitle.match(/\b(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i) ||
                     rawTitle.match(/\b(?:at\s+)(\d{1,2}:\d{2})\b/i);
    if (timeMatch) {
      parsedTime = timeMatch[1].toUpperCase();
      cleanTitle = rawTitle.replace(timeMatch[0], '').replace(/\s{2,}/g, ' ').trim();
      if (!cleanTitle) cleanTitle = rawTitle;
    }

    // Check recurrence (daily / roz)
    let recurrence = null;
    if (/\b(?:daily|roz|har din|everyday)\b/i.test(rawTitle)) {
      recurrence = 'daily';
    }

    // Accurately combine date and parsedTime into dueDateIso with exact hour and minute
    let hrs = 12, mins = 0;
    if (parsedTime) {
      const tm = parsedTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (tm) {
        hrs = parseInt(tm[1], 10);
        mins = tm[2] ? parseInt(tm[2], 10) : 0;
        const ampm = (tm[3] || '').toUpperCase();
        if (ampm === 'PM' && hrs < 12) hrs += 12;
        if (ampm === 'AM' && hrs === 12) hrs = 0;
      }
    }
    let dueDateIso = new Date().toISOString();
    try {
      const baseDate = customDateStr ? new Date(customDateStr + 'T00:00:00') : new Date();
      baseDate.setHours(hrs, mins, 0, 0);
      dueDateIso = baseDate.toISOString();
    } catch (err) {}

    const optimisticTask = {
      id: 'local_' + Date.now(),
      title: cleanTitle,
      priority: customPriority || 'medium',
      reminder_time: parsedTime,
      recurrence: recurrence,
      due_date: dueDateIso,
      status: 'pending',
      is_completed: false,
      created_at: new Date().toISOString()
    };
    setTasks(prev => [optimisticTask, ...prev]);

    // Immediately schedule on native Android OS alarm manager via bridge
    if (typeof window !== 'undefined' && window.ReactNativeWebView && parsedTime) {
      const trigger = calculateTaskTrigger(optimisticTask);
      if (trigger && trigger.triggerSeconds > 0) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SCHEDULE_REMINDER',
            id: optimisticTask.id,
            title: cleanTitle,
            reminder_time: parsedTime,
            triggerSeconds: trigger.triggerSeconds,
            isDaily: trigger.isDaily,
            hour: trigger.hour,
            minute: trigger.minute
          }));
        } catch (e) {}
      }
    }

    try {
      await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(effEmail ? { 'X-User-Email': effEmail } : {})
        },
        body: JSON.stringify({ 
          title: cleanTitle, 
          priority: customPriority || 'medium',
          reminder_time: parsedTime,
          recurrence: recurrence,
          due_date: dueDateIso,
          user_email: effEmail || null 
        })
      });
      setNewTaskInput('');
      refreshAllData();
      showToast("New task added to your agenda!", 'success');
    } catch (err) {
      showToast("Failed to add task", 'error');
    }
  };

  const handleDeleteMemory = (memId) => {
    const mem = memories.find(m => String(m.id) === String(memId));
    const key = mem?.key || 'this memory';
    showConfirm({
      title: "Delete Memory?",
      message: `Are you sure you want to permanently delete "${key}"?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      isDestructive: true,
      onConfirm: async () => {
        deletedMemoryIdsRef.current.add(String(memId));
        setMemories(prev => prev.filter(m => String(m.id) !== String(memId)));
        try {
          const resp = await fetch(`${API_BASE}/memory/${memId}`, { 
            method: 'DELETE',
            headers: { ...(userEmail ? { 'X-User-Email': userEmail } : {}) }
          });
          if (resp.ok) {
            showToast("Memory removed from vault", 'info');
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
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
        title: 'AETHER — Your Personal AI Executive',
        text: 'AETHER Personal AI Executive Dashboard',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast("AETHER dashboard link copied!", "success");
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
    condition_hi: 'Mostly Sunny',
    condition_en: 'Mostly Sunny',
    city: userLocationName || 'Jaipur',
    city_en: userLocationName || 'Jaipur',
    city_hi: userLocationName || 'Jaipur',
    city_hinglish: userLocationName || 'Jaipur',
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

          {/* STEP 5: BYOK INTELLIGENCE KEY WITH MULTI-ENGINE (GEMINI / CHATGPT / GROK) */}
          {onboardingStep === 5 && (() => {
            const currentProv = AI_PROVIDERS.find(p => p.id === selectedProviderTab) || AI_PROVIDERS[0];
            const currentVal = selectedProviderTab === 'openai' ? openaiKey : selectedProviderTab === 'grok' ? grokKey : apiKey;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>
                <div className="step-badge">Direct Intelligence BYOK</div>
                <h1 className="serif-title">
                  Bring your own <span className="serif-italic">intelligence key.</span>
                </h1>
                <p className="step-desc">
                  Choose your preferred AI platform. Enter a Gemini, ChatGPT (OpenAI), or Grok API key for direct high-speed responses.
                </p>

                {/* Provider Selector Tabs */}
                <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '420px', marginBottom: '16px', background: 'rgba(255, 255, 255, 0.04)', padding: '5px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  {AI_PROVIDERS.map(p => {
                    const isSel = selectedProviderTab === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProviderTab(p.id);
                          setKeyError('');
                          setKeySuccess(false);
                          setShowKeyGuide(false);
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 6px',
                          borderRadius: '12px',
                          border: isSel ? `1px solid ${p.color}66` : '1px solid transparent',
                          background: isSel ? `${p.color}20` : 'transparent',
                          color: isSel ? p.color : '#94a3b8',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ fontSize: '1.05rem' }}>{p.icon}</span>
                        <span>{p.shortName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Model Choice Row for selected provider */}
                <div className="model-choice-row" style={{ display: 'grid', gridTemplateColumns: `repeat(${currentProv.models.length}, 1fr)`, gap: '8px', width: '100%', maxWidth: '420px', marginBottom: '14px' }}>
                  {currentProv.models.map(m => (
                    <div
                      key={m.id}
                      className={`model-card ${selectedModel === m.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedModel(m.id);
                        localStorage.setItem('aether_selected_model', m.id);
                      }}
                      style={{ padding: '10px 6px' }}
                    >
                      <div className="model-card-title" style={{ fontSize: '12px' }}>{m.name}</div>
                      <div style={{ fontSize: '10px', color: selectedModel === m.id ? currentProv.color : '#94a3b8', marginTop: '3px' }}>
                        {m.tag}
                      </div>
                    </div>
                  ))}
                </div>

                {/* API Key Input */}
                <div className="onboarding-input-card" style={{ width: '100%', maxWidth: '420px' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="onboarding-input-field"
                    placeholder={currentProv.placeholder}
                    value={currentVal}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (selectedProviderTab === 'openai') setOpenaiKey(val);
                      else if (selectedProviderTab === 'grok') setGrokKey(val);
                      else setApiKey(val);
                      setKeyError('');
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleValidateApiKey(currentVal, selectedProviderTab); }}
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
                    maxWidth: '420px'
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
                    maxWidth: '420px'
                  }}>
                    <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0 }} />
                    <span>Key Verified ✓ Continuing...</span>
                  </div>
                )}

                <button
                  type="button"
                  className="btn-onboarding-primary"
                  onClick={() => handleValidateApiKey(currentVal, selectedProviderTab)}
                  disabled={keyValidating}
                  style={{ width: '100%', maxWidth: '420px' }}
                >
                  {keyValidating ? (
                    <>
                      <span className="status-dot-pulse" style={{ background: '#ffffff' }}></span>
                      <span>Validating with {currentProv.name}...</span>
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
                  Skip for now (Basic Mode: Weather, News, Finance & Tasks) →
                </button>

                {/* Accordion Guide: How to get key */}
                <div style={{ width: '100%', maxWidth: '420px', marginTop: '16px' }}>
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
                    <span>{currentProv.guideTitle}</span>
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
                      <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: currentProv.color }}>
                        Quick Steps for {currentProv.name}:
                      </p>
                      <ol style={{ paddingLeft: '18px', margin: 0 }}>
                        {currentProv.guideSteps.map((s, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            {s.link ? (
                              <a href={s.link} target="_blank" rel="noreferrer" style={{ color: currentProv.color, textDecoration: 'underline' }}>
                                {s.text} ↗
                              </a>
                            ) : (
                              s.text
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
      {/* Background silent server reconnection without user-facing banners */}

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
                  Delete account
                </button>
              </div>
            </div>
            <button 
              type="button" 
              onClick={handleSignOut} 
              className="settings-signout-btn"
            >
              Sign out
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
                <span style={{ color: isFriendMode ? '#fbbf24' : '#94a3b8' }}>
                  {isFriendMode ? '🤝 Friend Mode · Active' : 'Aether · Executive'}
                </span>
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

            <div className="settings-row-item" onClick={() => {
              setIsCricketModalOpen(true);
              fetchLiveCricketScores();
            }}>
              <div className="settings-row-left">
                <div className="settings-row-icon-box" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                  <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>🏏</span>
                </div>
                <span>Live Cricket & Sports</span>
              </div>
              <div className="settings-row-right">
                <span style={{ color: cricketMatches.some(m => m.status === 'in') ? '#ef4444' : '#38bdf8', fontWeight: 600, fontSize: '0.84rem' }}>
                  {cricketMatches.some(m => m.status === 'in') ? '● Live Scores' : 'Scorecards'}
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
                <span>AI Platform & Keys</span>
              </div>
              <div className="settings-row-right">
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600 }}>
                  {activeProvider === 'openai' ? '🤖 ChatGPT' : activeProvider === 'grok' ? '⚡ Grok' : '♊ Gemini'}
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
            <div 
              className="gemini-screen-container"
              style={showDashboard ? { paddingLeft: 0, paddingRight: 0 } : {}}
            >
              
              {/* TOP BAR: [Back (Dashboard only)] [Aether ⌵ (Centered)] [Bell] [Edit3] [Profile Avatar] */}
              <header 
                className="gemini-top-bar"
                style={showDashboard ? { paddingLeft: '12px', paddingRight: '12px' } : {}}
              >
                <div className="gemini-top-left" style={{ width: '80px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {showDashboard ? (
                    <button
                      type="button"
                      className="gemini-icon-btn"
                      onClick={() => setShowDashboard(false)}
                      title="Back to Chat"
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
                  ) : (
                    <button
                      type="button"
                      className="gemini-icon-btn"
                      onClick={() => setIsChatDrawerOpen(true)}
                      title="Chat History"
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
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <PanelLeft size={19} />
                    </button>
                  )}
                </div>

                {/* Center space kept clean — Aether model/voice selection moved to Settings modal */}
                <div className="gemini-top-center" style={{ flex: 1 }} />

                <div className="gemini-top-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Temporary Chat Toggle */}
                  <button 
                    type="button" 
                    className="gemini-icon-btn"
                    onClick={() => {
                      if (!isTemporaryChat) {
                        // Switch to Temporary Chat: open a clean, fresh new chat immediately!
                        const tempId = `temp_${Date.now()}`;
                        activeSessionIdRef.current = tempId;
                        setActiveSessionId(tempId);
                        setChatHistory([]);
                        setInputText('');
                        setShowConversation(false);
                        setShowDashboard(false);
                        setIsTemporaryChat(true);
                        showToast("Temporary Chat On — messages will not be saved", "info");
                      } else {
                        // Switch back to normal chat mode
                        setIsTemporaryChat(false);
                        handleStartNewChat();
                        showToast("Temporary Chat Off — Normal Mode Active", "info");
                      }
                    }}
                    title={isTemporaryChat ? "Temporary Chat is Active (History paused)" : "Start Temporary Chat"}
                    style={{
                      background: isTemporaryChat ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                      border: isTemporaryChat ? '1px solid rgba(56, 189, 248, 0.55)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isTemporaryChat ? '#38bdf8' : '#94a3b8',
                      borderRadius: '12px',
                      width: '38px',
                      height: '38px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      position: 'relative'
                    }}
                  >
                    <Clock size={19} />
                    {isTemporaryChat && (
                      <span style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#38bdf8',
                        boxShadow: '0 0 6px #38bdf8'
                      }} />
                    )}
                  </button>

                  {/* Settings & Profile Avatar Button */}
                  <button 
                    type="button" 
                    className="gemini-icon-btn" 
                    onClick={() => {
                      stopBriefingAudio();
                      setIsSettingsOpen(true);
                    }}
                    title="Settings & Profile"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: userAvatar ? '1.5px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#e2e8f0',
                      borderRadius: '50%',
                      width: '38px',
                      height: '38px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      overflow: 'hidden',
                      padding: 0
                    }}
                  >
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt="Profile" 
                        referrerPolicy="no-referrer"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} 
                      />
                    ) : (
                      <Settings size={19} />
                    )}
                  </button>
                </div>
              </header>

              {/* CENTER STAGE OR CONVERSATION STREAM */}
              {showDashboard ? (
                <div 
                  className="dashboard-scroll-container" 
                  style={{ 
                    flex: 1, 
                    width: '100%',
                    maxWidth: '100%',
                    overflowY: 'auto', 
                    overflowX: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column',
                    minHeight: 0,
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <DashboardView
                    userName={userPreferredName || userName}
                    currentTime={currentTime}
                    weatherData={weather}
                    userLocationName={userLocationName}
                    cityGuide={cityGuide}
                    onAskAether={(q) => {
                      setShowDashboard(false);
                      handleSendPrompt(q);
                    }}
                    combinedTasks={combinedTasks}
                    tasks={tasks}
                    getTodayPendingCount={getTodayPendingCount}
                    financeSummary={financeSummary}
                    financeRecords={financeRecords}
                    isListening={isListening}
                    isSpeaking={isSpeaking}
                    toggleListening={toggleListening}
                    onSwitchToChat={() => setShowDashboard(false)}
                    setActiveSubModal={(modal) => {
                      if (modal) stopBriefingAudio();
                      if (modal === 'calendar') {
                        setRemindersViewMode('calendar');
                      } else if (modal === 'reminders') {
                        setRemindersViewMode('list');
                      }
                      setActiveSubModal(modal);
                    }}
                    setIsAddingExpense={setIsAddingExpense}
                    setIsCameraOpen={handleCameraClick}
                    setIsSettingsOpen={(open) => {
                      if (open) stopBriefingAudio();
                      setIsSettingsOpen(open);
                    }}
                    userAvatar={userAvatar || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_avatar') : '') || ''}
                    onClose={() => setShowDashboard(false)}
                    onToggleTask={handleToggleTask}
                    onPlayBriefing={() => handlePlayExecutiveBriefing(true)}
                    setAgendaFilter={setAgendaFilter}
                    setRemindersViewMode={setRemindersViewMode}
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
                      key={msg.id ? `msg-${msg.id}` : (msg.created_at ? `msg-${msg.created_at}-${idx}` : `msg-${idx}`)} 
                      className={msg.role === 'user' ? 'gemini-msg-user' : 'gemini-msg-assistant'}
                    >
                      {(() => {
                        const msgImages = Array.isArray(msg.images) && msg.images.length > 0
                          ? msg.images
                          : (msg.image_url ? [msg.image_url] : []);
                        if (msgImages.length === 0) return null;
                        return (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {msgImages.map((imgSrc, imgIdx) => (
                              <img
                                key={imgIdx}
                                src={imgSrc}
                                alt={`Attached ${imgIdx + 1}`}
                                style={{
                                  maxWidth: msgImages.length > 1 ? '140px' : '100%',
                                  maxHeight: msgImages.length > 1 ? '140px' : '220px',
                                  borderRadius: '12px',
                                  objectFit: 'cover',
                                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                                  border: '1px solid rgba(255,255,255,0.12)',
                                  display: 'block'
                                }}
                              />
                            ))}
                          </div>
                        );
                      })()}
                      <FormattedMessage text={msg.content} />
                      {(() => {
                        const actType = msg.action || msg.action_type;
                        let aData = msg.actionData;
                        if (!aData && typeof msg.action_data === 'string') {
                          try { aData = JSON.parse(msg.action_data); } catch (e) {}
                        }
                        if (actType === 'youtube' || aData?.url?.includes('youtube.com') || aData?.embed_url || aData?.watch_url) {
                          const directPlayUrl = aData?.play_url || aData?.watch_url || aData?.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(aData?.query || 'Trending')}`;
                          const rawEmbed = aData?.embed_url || (aData?.video_id ? `https://www.youtube.com/embed/${aData.video_id}` : (aData?.query ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(aData.query)}` : null));
                          const videoKey = msg.id || (msg.created_at ? `yt-${msg.created_at}` : `yt-idx-${idx}`);
                          const isCurrentlyPlaying = activePlayingVideoId === videoKey;
                          const activeEmbedUrl = rawEmbed ? (rawEmbed.includes('?') ? `${rawEmbed}&autoplay=1&enablejsapi=1` : `${rawEmbed}?autoplay=1&enablejsapi=1`) : null;

                          return (
                            <div style={{
                              marginTop: '10px',
                              padding: '12px 14px',
                              borderRadius: '14px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
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
                                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {aData?.query || "YouTube Playback"}
                                    </div>
                                    <div style={{ fontSize: '0.70rem', color: isCurrentlyPlaying ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      {isCurrentlyPlaying ? (
                                        <>
                                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                                          Now Playing
                                        </>
                                      ) : 'Click Play to start'}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                  {isCurrentlyPlaying ? (
                                    <button
                                      type="button"
                                      onClick={() => setActivePlayingVideoId(null)}
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        border: '1px solid rgba(239, 68, 68, 0.5)',
                                        color: '#f87171',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <span>⏹ Stop</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setActivePlayingVideoId(videoKey)}
                                      style={{
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        border: 'none',
                                        color: '#fff',
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
                                      }}
                                    >
                                      <Play size={13} fill="#fff" />
                                      <span>Play</span>
                                    </button>
                                  )}
                                  <a
                                    href={directPlayUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open on YouTube"
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.08)',
                                      color: '#94a3b8',
                                      padding: '6px 8px',
                                      borderRadius: '8px',
                                      fontSize: '0.75rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <ExternalLink size={13} />
                                  </a>
                                </div>
                              </div>

                              {/* Embedded In-Chat YouTube Player - ONLY rendered when actively requested/played */}
                              {isCurrentlyPlaying && activeEmbedUrl && (
                                <div style={{
                                  position: 'relative',
                                  width: '100%',
                                  paddingBottom: '56.25%',
                                  height: 0,
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  margin: '6px 0 2px',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.25)'
                                }}>
                                  <iframe
                                    src={activeEmbedUrl}
                                    title={aData?.query || "YouTube Video"}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                  />
                                </div>
                              )}
                            </div>
                          );
                        }
                        if (actType === 'cricket_scorecard' || aData?.matches?.length > 0) {
                          const matchesToShow = (aData?.matches && aData.matches.length > 0) ? aData.matches : cricketMatches;
                          const intlMatches = matchesToShow.filter(m => m.is_international);
                          const topMatches = intlMatches.length > 0 ? intlMatches.slice(0, 3) : matchesToShow.slice(0, 3);

                          return (
                            <div style={{
                              marginTop: '12px',
                              padding: '12px 14px',
                              borderRadius: '16px',
                              background: 'rgba(56, 189, 248, 0.05)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '1.2rem' }}>🏏</span>
                                  <div>
                                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
                                      Live Match Scorecards
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                      ESPNcricinfo Official Live Feed
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCricketModalOpen(true);
                                    fetchLiveCricketScores();
                                  }}
                                  style={{
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    color: '#38bdf8',
                                    padding: '5px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  All Scorecards ({matchesToShow.length}) ↗
                                </button>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {topMatches.map((m, mIdx) => (
                                  <div
                                    key={m.id || mIdx}
                                    onClick={() => {
                                      setIsCricketModalOpen(true);
                                      fetchLiveCricketScores();
                                    }}
                                    style={{
                                      background: 'rgba(0, 0, 0, 0.35)',
                                      border: '1px solid rgba(255, 255, 255, 0.06)',
                                      borderRadius: '10px',
                                      padding: '8px 12px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                                      <span style={{ fontWeight: 600, color: m.is_international ? '#38bdf8' : '#94a3b8' }}>
                                        {m.series}
                                      </span>
                                      {m.status === 'in' ? (
                                        <span style={{ color: '#f87171', fontWeight: 700 }}>● LIVE</span>
                                      ) : (
                                        <span>{m.status === 'post' ? 'Result' : 'Scheduled'}</span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                                      <span>{m.team1?.name}</span>
                                      <span style={{ color: '#38bdf8' }}>{m.team1?.score || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                                      <span>{m.team2?.name}</span>
                                      <span style={{ color: '#38bdf8' }}>{m.team2?.score || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                                      <span style={{ fontSize: '0.70rem', color: m.status === 'in' ? '#f87171' : '#94a3b8' }}>
                                        {m.status_text}
                                      </span>
                                      <span style={{ fontSize: '0.70rem', color: '#38bdf8', fontWeight: 600 }}>
                                        View In-App →
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        if (actType === 'call' || aData?.tel_url) {
                          const contactName = aData?.contact_name || "Contact";
                          const normKey = (contactName || 'contact').trim().toLowerCase();

                          // Look up local contact book from localStorage
                          let localBook = {};
                          try {
                            localBook = JSON.parse(localStorage.getItem('aether_contacts_book') || '{}');
                          } catch (e) {}
                          const localSaved = localBook[normKey] || localBook[contactName] || (normKey.includes('wife') ? '8949546909' : '');
                          const rawSaved = callInputNumber[`saved_${normKey}`];
                          const knownPhone = aData?.phone_number || rawSaved || localSaved || "";
                          const currentInputVal = (callInputNumber[normKey] || callInputNumber[contactName] || '').trim();
                          const effectiveNumber = knownPhone || currentInputVal;
                          const cleanDigits = effectiveNumber ? effectiveNumber.replace(/[^\d+*#]/g, '') : '';
                          const dialHref = cleanDigits ? `tel:${cleanDigits}` : 'tel:';

                          // Auto-save contact to Aether Memory Vault & localStorage
                          const saveToVault = (cName, cNum) => {
                            if (!cNum) return;
                            try {
                              const b = JSON.parse(localStorage.getItem('aether_contacts_book') || '{}');
                              b[normKey] = cNum;
                              b[cName.trim().toLowerCase()] = cNum;
                              localStorage.setItem('aether_contacts_book', JSON.stringify(b));
                            } catch (e) {}
                            setCallInputNumber(prev => ({
                              ...prev,
                              [normKey]: cNum,
                              [contactName]: cNum,
                              [`saved_${normKey}`]: cNum
                            }));
                            try {
                              const currentEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || 'e.pawandixit@gmail.com';
                              fetch(`${API_BASE}/memory`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'X-User-Email': currentEmail
                                },
                                body: JSON.stringify({
                                  fact: `${cName} phone number is ${cNum}`,
                                  category: 'contact',
                                  user_email: currentEmail
                                })
                              }).catch(() => {});
                            } catch (err) {}
                          };

                          return (
                            <div style={{
                              marginTop: '10px',
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: 'rgba(34, 197, 94, 0.08)',
                              border: '1px solid rgba(34, 197, 94, 0.25)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                  <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
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
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {contactName}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#86efac' }}>
                                      {knownPhone ? knownPhone : "Enter phone number or open dialer"}
                                    </div>
                                  </div>
                                </div>
                                {knownPhone ? (
                                  <a
                                    href={dialHref}
                                    onClick={(e) => {
                                      if (typeof window !== 'undefined') {
                                        if (window.ReactNativeWebView) {
                                          try {
                                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                              type: 'MAKE_CALL',
                                              phoneNumber: cleanDigits,
                                              telUrl: dialHref
                                            }));
                                          } catch (err) {}
                                        }
                                        window.location.href = dialHref;
                                      }
                                    }}
                                    style={{
                                      background: '#22c55e',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '8px 16px',
                                      borderRadius: '8px',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      textDecoration: 'none',
                                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.35)'
                                    }}
                                  >
                                    <Phone size={13} fill="#fff" />
                                    <span>Call Now</span>
                                  </a>
                                ) : null}
                              </div>

                              {!knownPhone && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                      type="tel"
                                      placeholder={`${contactName}'s mobile number (e.g. 8949546909)`}
                                      value={currentInputVal}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCallInputNumber(prev => ({
                                          ...prev,
                                          [normKey]: val,
                                          [contactName]: val
                                        }));
                                      }}
                                      style={{
                                        flex: 1,
                                        background: 'rgba(15, 23, 42, 0.85)',
                                        border: '1px solid rgba(34, 197, 94, 0.4)',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        color: '#f8fafc',
                                        fontSize: '0.82rem',
                                        outline: 'none'
                                      }}
                                    />
                                    <a
                                      href={dialHref}
                                      onClick={(e) => {
                                        if (cleanDigits) {
                                          saveToVault(contactName, cleanDigits);
                                        }
                                        if (typeof window !== 'undefined') {
                                          if (window.ReactNativeWebView) {
                                            try {
                                              window.ReactNativeWebView.postMessage(JSON.stringify({
                                                type: 'MAKE_CALL',
                                                phoneNumber: cleanDigits,
                                                telUrl: dialHref
                                              }));
                                            } catch (err) {}
                                          }
                                          window.location.href = dialHref;
                                        }
                                      }}
                                      style={{
                                        background: '#22c55e',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        textDecoration: 'none',
                                        boxShadow: '0 2px 6px rgba(34, 197, 94, 0.3)'
                                      }}
                                    >
                                      <Phone size={13} fill="#fff" />
                                      <span>Call & Save</span>
                                    </a>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                      💡 Enter once and Aether will remember this contact number
                                    </span>
                                    <a
                                      href="tel:"
                                      onClick={(e) => {
                                        if (typeof window !== 'undefined') {
                                          if (window.ReactNativeWebView) {
                                            try {
                                              window.ReactNativeWebView.postMessage(JSON.stringify({
                                                type: 'MAKE_CALL',
                                                phoneNumber: '',
                                                telUrl: 'tel:'
                                              }));
                                            } catch (err) {}
                                          }
                                          window.location.href = 'tel:';
                                        }
                                      }}
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: '#e2e8f0',
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      📱 Open Phone Dialer
                                    </a>
                                  </div>
                                </div>
                              )}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (isSpeaking) {
                                  stopBriefingAudio();
                                } else {
                                  speakText(msg.content);
                                }
                              }}
                              title={isSpeaking ? "Stop speaking" : "Listen aloud"}
                              style={{
                                background: isSpeaking ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                                border: `1px solid ${isSpeaking ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.12)'}`,
                                color: isSpeaking ? '#f87171' : '#38bdf8',
                                borderRadius: '8px',
                                padding: '3px 8px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {isSpeaking ? <Pause size={12} /> : <Volume2 size={12} />}
                              <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                            </button>
                          </div>
                          {idx === chatHistory.length - 1 && !isProcessing && (() => {
                            let aData = msg.actionData;
                            if (!aData && typeof msg.action_data === 'string') {
                              try { aData = JSON.parse(msg.action_data); } catch (e) {}
                            }
                            const actType = msg.action || msg.action_type;
                            const customChips = Array.isArray(aData?.follow_ups) ? aData.follow_ups.filter(Boolean).slice(0, 3) : [];
                            let chips = customChips;
                            if (chips.length === 0) {
                              if (actType === 'expense' || actType === 'income') {
                                chips = ['Audit my expenses', 'Monthly budget status', 'View today summary'];
                              } else if (actType === 'task') {
                                chips = ['Show my pending tasks', 'Optimize today agenda', 'Remind me 1 hour earlier'];
                              } else if (actType === 'draft_email') {
                                chips = ['Make tone shorter', 'Make tone formal', 'Create follow-up task'];
                              } else {
                                chips = ['Turn key points into tasks', 'Summarize in 3 bullets'];
                              }
                            }
                            return (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                                {chips.map((chipText, cIdx) => (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => handleSendPrompt(chipText)}
                                    style={{
                                      background: 'rgba(56, 189, 248, 0.08)',
                                      border: '1px solid rgba(56, 189, 248, 0.24)',
                                      color: '#cbd5e1',
                                      borderRadius: '999px',
                                      padding: '4px 10px',
                                      fontSize: '0.72rem',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    {chipText}
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
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

              {/* Hidden File Inputs for Camera, Photos & Files — Always mounted for Instant Access from Dashboard and Chat */}
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
                multiple
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

              {/* BOTTOM DOCK: CLEAN EXECUTIVE PROMPT BAR — Hidden when viewing Dashboard for full-screen immersive experience */}
              {!showDashboard && (
                <div className="gemini-bottom-dock">
                {attachedMediaList.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 12px 6px'
                  }}>
                    {attachedMediaList.map((item) => (
                      <div key={item.id} className="gemini-attached-chip" style={{ margin: 0 }}>
                        {item.type === 'image' && (
                          <img src={item.url} alt="Attached" className="gemini-attached-thumb" />
                        )}
                        {item.type === 'file' && <FileText size={15} color="#fbbf24" />}
                        {item.type === 'drive' && <HardDrive size={15} color="#34d399" />}
                        {item.type === 'map' && <MapPin size={15} color="#fb7185" />}
                        <span
                          className="gemini-attached-name"
                          onClick={() => {
                            if (item.type === 'map') {
                              openMapApp(item.latitude, item.longitude);
                            }
                          }}
                          style={{ cursor: item.type === 'map' ? 'pointer' : 'default' }}
                          title={item.type === 'map' ? 'Click to open Map' : item.name}
                        >
                          {item.name}
                        </span>
                        <button
                          type="button"
                          className="gemini-attached-remove"
                          onClick={() => setAttachedMediaList(prev => prev.filter(m => m.id !== item.id))}
                          title="Remove attachment"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {attachedMediaList.length < 6 && (
                      <button
                        type="button"
                        onClick={() => photosInputRef.current?.click()}
                        title="Add more photos"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px dashed rgba(255,255,255,0.22)',
                          color: '#94a3b8',
                          borderRadius: '16px',
                          padding: '5px 10px',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        + Add Photo
                      </button>
                    )}
                  </div>
                )}

                {isTemporaryChat && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#38bdf8',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    margin: '0 auto 8px',
                    width: 'fit-content'
                  }}>
                    <Clock size={13} />
                    <span>Temporary Chat Active — Messages will not be saved</span>
                  </div>
                )}

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (inputText.trim() || attachedMediaList.length > 0) {
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

                  <textarea 
                    rows={1}
                    className="gemini-input-field"
                    placeholder={attachedMediaList.some(m => m.type === 'image') ? "Ask a question about these photos..." : ROTATING_PROMPTS[promptPlaceholderIndex]}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputText.trim() || attachedMediaList.length > 0) {
                          handleSendPrompt();
                        }
                      }
                    }}
                    autoFocus
                  />

                  {(inputText.trim() || attachedMediaList.length > 0) && !isListening ? (
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
                      onClick={() => {
                        if (isListening) {
                          clearTimeout(speechSilenceTimeoutRef.current);
                          if (recognitionRef.current) {
                            try { recognitionRef.current.stop(); } catch (e) {}
                          }
                          setIsListening(false);
                          if (inputText.trim()) {
                            handleSendPrompt(inputText.trim());
                          }
                        } else {
                          toggleListening();
                        }
                      }}
                      title={
                        isListening 
                          ? "Listening... Tap to send" 
                          : wakeWordEnabled 
                            ? "Voice Input (Wake word 'Hey Aether' active)" 
                            : "Voice Input (Start Mic)"
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
              )}

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
                  const dStr = getTaskDateStr(t);
                  if (dStr && dStr < todayStr) return true;
                  if (dStr === todayStr && t.reminder_time) {
                    try {
                      const m = t.reminder_time.match(/(\d+):?(\d+)?\s*(AM|PM)/i);
                      if (m) {
                        let hrs = parseInt(m[1], 10);
                        const mins = m[2] ? parseInt(m[2], 10) : 0;
                        const ampm = m[3].toUpperCase();
                        if (ampm === 'PM' && hrs < 12) hrs += 12;
                        if (ampm === 'AM' && hrs === 12) hrs = 0;
                        const dueNow = new Date();
                        dueNow.setHours(hrs, mins, 0, 0);
                        if (dueNow < new Date()) return true;
                      }
                    } catch (e) {}
                  }
                  return false;
                };
                const overdueTasks = (combinedTasks || tasks || []).filter(isOverdue);
                const pendingReminders = (combinedTasks || tasks || []).filter(t => t.reminder_time && !isTaskDone(t));
                const pendingTasks = (combinedTasks || tasks || []).filter(t => !isTaskDone(t));
                const completedTasks = (combinedTasks || tasks || []).filter(t => isTaskDone(t));

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
                              <div style={{ color: 'var(--accent-cyan)', fontSize: '0.76rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {task.reminder_time && <span>⏰ {task.reminder_time}</span>}
                                {renderRecurrenceBadge(task.recurrence)}
                                <span style={{
                                  background: isOverdue(task) ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.18)',
                                  color: isOverdue(task) ? '#ef4444' : '#38bdf8',
                                  border: isOverdue(task) ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(56,189,248,0.3)',
                                  borderRadius: '6px',
                                  padding: '1px 6px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700
                                }}>
                                  {isOverdue(task) ? '⚠️ Overdue' : '⏳ Pending'}
                                </span>
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
                                <div style={{ color: 'var(--accent-cyan)', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                                  {task.reminder_time && <span>⏰ {task.reminder_time}</span>}
                                  {renderRecurrenceBadge(task.recurrence)}
                                  <span style={{
                                    background: isOverdue(task) ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.18)',
                                    color: isOverdue(task) ? '#ef4444' : '#38bdf8',
                                    border: isOverdue(task) ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(56,189,248,0.3)',
                                    borderRadius: '6px',
                                    padding: '1px 6px',
                                    fontSize: '0.66rem',
                                    fontWeight: 700
                                  }}>
                                    {isOverdue(task) ? '⚠️ Overdue' : '⏳ Pending'}
                                  </span>
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
                                <div style={{ color: '#10b981', fontSize: '0.72rem', opacity: 0.9, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  {task.reminder_time && <span>⏰ {task.reminder_time}</span>}
                                  {renderRecurrenceBadge(task.recurrence)}
                                  <span style={{
                                    background: 'rgba(16,185,129,0.18)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    borderRadius: '6px',
                                    padding: '1px 6px',
                                    fontSize: '0.66rem',
                                    fontWeight: 700
                                  }}>
                                    ✓ Completed
                                  </span>
                                </div>
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

              {/* Cricinfo Live Match Scorecards Widget */}
              {cricketMatches.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(14, 21, 38, 0.95) 0%, rgba(7, 10, 20, 0.95) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '18px',
                  padding: '16px 18px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.25rem' }}>🏏</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.4px' }}>
                            CRICINFO LIVE SCORECARD
                          </span>
                          {cricketMatches.some(m => m.status === 'in') && (
                            <span style={{
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#f87171',
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.2s infinite' }}></span>
                              LIVE
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
                          Real-time International & League Match Scores
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCricketModalOpen(true);
                        fetchLiveCricketScores();
                      }}
                      style={{
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      View All ({cricketMatches.length}) ↗
                    </button>
                  </div>

                  {/* Highlights of Top Live or International Matches */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(cricketMatches.filter(m => m.status === 'in').length > 0
                      ? cricketMatches.filter(m => m.status === 'in').slice(0, 2)
                      : (cricketMatches.filter(m => m.is_international).slice(0, 2).length > 0
                          ? cricketMatches.filter(m => m.is_international).slice(0, 2)
                          : cricketMatches.slice(0, 2))
                    ).map((m, mIdx) => (
                      <div
                        key={m.id || mIdx}
                        onClick={() => {
                          setIsCricketModalOpen(true);
                          fetchLiveCricketScores();
                        }}
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                          <span style={{ color: m.is_international ? '#38bdf8' : '#94a3b8', fontWeight: 600 }}>
                            {m.series}
                          </span>
                          <span style={{ color: m.status === 'in' ? '#f87171' : (m.status === 'post' ? '#34d399' : '#fbbf24'), fontWeight: 600 }}>
                            {m.status === 'in' ? '● LIVE' : (m.status === 'post' ? 'Result' : 'Scheduled')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.86rem', fontWeight: 600, color: '#f8fafc' }}>
                          <span>{m.team1?.name}</span>
                          <span style={{ color: '#38bdf8' }}>{m.team1?.score || (m.status === 'pre' ? 'Upcoming' : '-')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.86rem', fontWeight: 600, color: '#f8fafc' }}>
                          <span>{m.team2?.name}</span>
                          <span style={{ color: '#38bdf8' }}>{m.team2?.score || (m.status === 'pre' ? 'Upcoming' : '-')}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {m.status_text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

      {/* ChatGPT / Gemini Style Chat History Slide-over Drawer */}
      <ChatHistoryDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        sessions={chatSessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleStartNewChat}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        userEmail={userEmail}
        userName={userName}
        todayTasks={getTodayTasks()}
        todayPendingCount={getTodayPendingCount()}
        onToggleTask={handleToggleTask}
        onOpenTasksModal={() => {
          setIsChatDrawerOpen(false);
          setActiveSubModal('reminders');
          setRemindersViewMode('list');
        }}
      />

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

      {/* Lazy Loaded Heavy Modals wrapped in Suspense for instant 0-lag load */}
      <React.Suspense fallback={null}>
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

      {/* 4. Dedicated Executive Briefing & Agent Hub Modal */}
      <BriefingModal
        isOpen={showBriefingModal || activeSubModal === 'briefing'}
        onClose={() => {
          setShowBriefingModal(false);
          if (activeSubModal === 'briefing') setActiveSubModal(null);
        }}
        isBriefingLoading={isBriefingLoading}
        executiveBriefingData={executiveBriefingData}
        isBriefingPlaying={isBriefingPlaying}
        stopBriefingAudio={stopBriefingAudio}
        speakBriefingAudio={speakBriefingAudio}
        onRefreshBriefing={() => handlePlayExecutiveBriefing(true)}
        userLocationName={userLocationName}
        onExecuteGoal={(goalPrompt) => {
          stopBriefingAudio();
          setShowBriefingModal(false);
          if (activeSubModal === 'briefing') setActiveSubModal(null);
          setShowDashboard(false);
          handleSendPrompt(goalPrompt);
        }}
        overdueCount={(combinedTasks || tasks || []).filter(t => {
          if (t.is_completed || t.status === 'completed') return false;
          if (t.recurrence === 'daily' || t.repeat === 'daily') return false;
          const todayStr = new Date().toISOString().slice(0, 10);
          return t.due_date && t.due_date.slice(0, 10) < todayStr;
        }).length}
        onRescheduleOverdue={handleRescheduleAllOverdue}
        onOpenFinance={() => {
          stopBriefingAudio();
          setShowBriefingModal(false);
          if (activeSubModal === 'briefing') setActiveSubModal(null);
          setActiveSubModal('finance');
        }}
        onOpenTasks={() => {
          stopBriefingAudio();
          setShowBriefingModal(false);
          if (activeSubModal === 'briefing') setActiveSubModal(null);
          setActiveSubModal('reminders');
        }}
      />

      {/* 5. Actions & Audit Trail Modal */}
      <AuditModal
        isOpen={activeSubModal === 'audit'}
        onClose={() => setActiveSubModal(null)}
        auditLogs={auditLogs}
        handleUndo={handleUndo}
      />

      {/* 5.1 Observability & System Health Modal */}
      <ObservabilityModal
        isOpen={activeSubModal === 'observability'}
        onClose={() => setActiveSubModal(null)}
        apiBase={API_BASE}
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
        openaiKey={openaiKey}
        setOpenaiKey={setOpenaiKey}
        grokKey={grokKey}
        setGrokKey={setGrokKey}
        activeProvider={activeProvider}
        setActiveProvider={setActiveProvider}
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
        isFriendMode={isFriendMode}
        handleToggleFriendMode={handleToggleFriendMode}
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
        handleDetectLocation={detectRealTimeLocation}
        handleSetCustomCity={(city) => {
          handleSetCustomCity(city);
          refreshAllData({ force: true });
        }}
        voiceOutputEnabled={voiceOutputEnabled}
        setVoiceOutputEnabled={setVoiceOutputEnabled}
        wakeWordEnabled={wakeWordEnabled}
        handleToggleWakeWord={handleToggleWakeWord}
        userEmail={userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('aether_user_email') : '') || ''}
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

      {/* Universal Futuristic Dark Glass Confirm Dialog */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* ESPNcricinfo Live Cricket Scorecard & Fixtures Modal */}
      <CricketScorecardModal
        isOpen={isCricketModalOpen}
        onClose={() => setIsCricketModalOpen(false)}
        matches={cricketMatches}
        isLoading={isCricketLoading}
        onRefresh={fetchLiveCricketScores}
        apiBase={API_BASE}
      />
      </React.Suspense>

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
