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
  ChevronRight
} from 'lucide-react';

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

export default function App() {
  // Onboarding & BYOK Intelligence Configuration
  const [onboardingDone, setOnboardingDone] = useState(() => localStorage.getItem('aether_onboarding_done') === 'true');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [userName, setUserName] = useState(() => localStorage.getItem('aether_user_name') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('aether_gemini_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('aether_selected_voice') || 'puck');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('aether_selected_model') || 'gemini-1.5-flash');
  const [keyValidating, setKeyValidating] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keySuccess, setKeySuccess] = useState(false);
  const [showKeyGuide, setShowKeyGuide] = useState(false);
  const [audioSamplePlaying, setAudioSamplePlaying] = useState(null);

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

  const effectiveLang = selectedLang === 'auto' ? 'hi' : selectedLang;
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

  // Play pleasant executive reminder chime
  const playReminderChime = () => {
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

  // Voice Recognition (Speech to Text)
  const toggleVoiceRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Voice recognition not supported in this browser. Please use Chrome or Edge.", 'error');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        showToast("🎙️ सुन रहा हूँ... बोलिए (उदा: 'weather today' या 'ताज़ा समाचार')", 'info');
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
        setIsListening(false);
        showToast(`माइक त्रुटि: ${event.error}`, 'error');
      };

      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      setIsListening(false);
      showToast("माइक्रोफोन की अनुमति दें।", 'error');
    }
  };

  // Text to Speech
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\[.*?\]\(.*?\)/g, '').replace(/[*_#`🔗]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const activeVoice = AETHER_VOICES.find(v => v.id === selectedVoice);
    utterance.rate = activeVoice ? activeVoice.rate : 1.05;
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

              <button
                type="button"
                className="btn-onboarding-google"
                onClick={() => setOnboardingStep(4)}
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                className="btn-onboarding-primary"
                style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', marginTop: '12px' }}
                onClick={() => setOnboardingStep(4)}
              >
                Continue as Local Operator
              </button>
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

  return (
    <div className={dayPhase.phaseClass} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Header with Robot Icon, Share button, and Online Status */}
      <header className="aether-header">
        <div className="header-brand">
          <div className="bot-squircle">
            <Bot size={20} color="var(--accent-cyan)" />
          </div>
          <div>
            <h1 className="header-brand-title">
              AETHER
            </h1>
            <p className="header-subtitle">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls in a unified non-wrapping flex row */}
        <div className="header-actions">
          
          {/* Single Language Dropdown Button */}
          <div ref={langDropdownRef} style={{ position: 'relative' }}>
            <button 
              type="button"
              className="header-btn-lang"
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              title="Select Language / भाषा चुनें"
            >
              <Languages size={15} color="var(--accent-cyan)" />
              <span className="lang-label">{currentLangObj.icon} {currentLangObj.label}</span>
              <ChevronDown size={13} style={{ transform: isLangDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.7 }} />
            </button>

            {isLangDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '185px',
                background: '#0d1527',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '12px',
                padding: '6px',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}>
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedLang(opt.id);
                      localStorage.setItem('aether_language', opt.id);
                      setIsLangDropdownOpen(false);
                      showToast(t.langToast(opt.label), 'info');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: selectedLang === opt.id ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                      color: selectedLang === opt.id ? 'var(--accent-cyan)' : '#e2e8f0',
                      fontSize: '0.82rem',
                      fontWeight: selectedLang === opt.id ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{opt.icon}</span>
                      <span>{opt.fullLabel}</span>
                    </div>
                    {selectedLang === opt.id && <CheckCircle2 size={14} color="var(--accent-cyan)" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile & Desktop Push Notification Quick Toggle */}
          <button
            type="button"
            className={`header-btn-push ${pushPermission === 'granted' ? 'active' : 'inactive'}`}
            onClick={pushPermission === 'granted' ? handleSendTestPush : handleRequestPushPermission}
            title={pushPermission === 'granted' ? "Mobile Push: Active (Click to send test alert)" : "Click to Enable Mobile Push Notifications"}
          >
            <BellRing size={15} />
            <span className="push-text">{pushPermission === 'granted' ? (effectiveLang === 'en' ? 'Push Active' : 'पुश सक्रिय') : (effectiveLang === 'en' ? 'Enable Push' : 'पुश ऑन करें')}</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              setOnboardingStep(1);
              setOnboardingDone(false);
            }}
            className="btn-share"
            title="Aether Setup / Key & Voice Preferences"
            style={{ gap: '6px' }}
          >
            <Settings size={15} />
            <span className="share-text">Setup</span>
          </button>

          <button 
            type="button"
            onClick={handleShare}
            className="btn-share"
            title="Share Dashboard / शेयर करें"
          >
            <Share2 size={15} />
            <span className="share-text">{t.share}</span>
          </button>

          <div className="header-online-status">
            {serverOnline ? (
              <div className="status-indicator online">
                <span className="status-dot-pulse"></span>
                <span className="status-label">{t.online}</span>
              </div>
            ) : (
              <div className="status-indicator offline">
                <span className="status-dot-offline"></span>
                <span className="status-label">{t.offline}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Executive Screen Container */}
      <main className="aether-main-content">

        {/* ACTIVE REMINDER ALERT BANNER */}
        {activeReminderAlert && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.18))',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.28)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            animation: 'pulse 2s infinite ease-in-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0
              }}>
                <Bell size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {t.reminderDue}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    • {activeReminderAlert.reminder_time || (effectiveLang === 'hi' ? 'समय हो गया है' : effectiveLang === 'en' ? 'Due now' : 'Time ho gaya hai')}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '3px 0 0' }}>
                  {activeReminderAlert.title}
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  handleToggleTask(activeReminderAlert.id);
                  setActiveReminderAlert(null);
                  showToast(effectiveLang === 'en' ? "Task marked complete!" : effectiveLang === 'hinglish' ? "Task complete ho gaya!" : "कार्य पूरा चिह्नित किया गया!", "success");
                }}
                style={{
                  background: 'var(--accent-cyan)',
                  color: '#0a0d14',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>{t.markComplete}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReminderAlert(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                {t.dismiss}
              </button>
            </div>
          </div>
        )}

        {/* 3. YOUR DAILY BRIEFING CARD */}
        <section className="card-briefing">
          
          {/* Category Tag */}
          <div style={{ 
            color: 'var(--accent-cyan)', 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            letterSpacing: '0.8px', 
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            {t.briefingTag} · {briefing?.date_str || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
          </div>

          {/* Heading with dynamic greeting */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: '1.9rem', 
                fontWeight: 800, 
                color: '#ffffff', 
                letterSpacing: '-0.3px',
                lineHeight: 1.2
              }}>
                {dayPhase.greetingLabel}, {userName || t.userName}!
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '6px' }}>
                {t.greetingSub}
              </p>
            </div>

            {/* DYNAMIC WEATHER INFORMATION WIDGET (Serene Cyan Theme) */}
            <div 
              className="weather-widget"
              title={`Live Weather & Day Progression: ${dayPhase.periodDesc}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 16px',
                background: dayPhase.bgColor,
                border: `1px solid ${dayPhase.borderColor}`,
                borderRadius: '14px',
                boxShadow: `0 4px 20px ${dayPhase.bgColor}`,
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WeatherSymbol 
                  size={28} 
                  color={dayPhase.color} 
                  className={
                    dayPhase.phase === 'morning' ? 'weather-sun' : 
                    dayPhase.phase === 'afternoon' ? 'weather-sun' : 
                    dayPhase.phase === 'evening' ? 'weather-sunset' : 'weather-moon'
                  } 
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ 
                    fontFamily: 'var(--font-heading)', 
                    fontSize: '1.45rem', 
                    fontWeight: 800, 
                    color: '#ffffff' 
                  }}>
                    {weather.temp}°C
                  </span>
                  <span style={{ 
                    fontSize: '0.74rem', 
                    color: dayPhase.color, 
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    {dayPhase.periodDesc}
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{effectiveLang === 'en' ? (weather.condition_en || 'Mostly Sunny') : effectiveLang === 'hinglish' ? (weather.condition_en || 'Mostly Sunny') : (weather.condition_hi || 'धूप खिली हुई')}</span>
                  <span>•</span>
                  <span style={{ color: '#cbd5e1' }}>
                    {t.city}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* 3 Clickable Stat Cards (Responsive: 3 cols on desktop, tablet, and mobile) */}
          <div className="stat-card-row">
            
            {/* 1. Pending tasks (Emerald) - Click to view/manage tasks */}
            <div 
              onClick={() => setActiveModule(activeModule === 'agenda' ? null : 'agenda')}
              className="stat-card stat-card-emerald" 
              title="Click to view/manage tasks"
            >
              <div className="stat-card-top">
                <div style={{ color: 'var(--accent-emerald)' }}>
                  <CheckSquare size={17} />
                </div>
                <span className="stat-card-badge badge-emerald">
                  {t.clickToView}
                </span>
              </div>
              <div className="stat-card-number">
                {pendingTasksList.length || 1}
              </div>
              <div className="stat-card-title">
                {t.pendingTasks}
              </div>
            </div>

            {/* 2. Upcoming (Blue) - Click to view upcoming reminders */}
            <div 
              onClick={() => setActiveModule(activeModule === 'upcoming' ? null : 'upcoming')}
              className="stat-card stat-card-blue" 
              title="Click to view upcoming events"
            >
              <div className="stat-card-top">
                <div style={{ color: 'var(--accent-blue)' }}>
                  <Calendar size={17} />
                </div>
                <span className="stat-card-badge badge-blue">
                  {t.events}
                </span>
              </div>
              <div className="stat-card-number">
                {upcomingCount}
              </div>
              <div className="stat-card-title">
                {t.upcoming}
              </div>
            </div>

            {/* 3. Important alert (Purple) - Click to review alert details */}
            <div 
              onClick={() => setActiveModule(activeModule === 'alerts' ? null : 'alerts')}
              className="stat-card stat-card-purple" 
              title="Click to review alerts"
            >
              <div className="stat-card-top">
                <div style={{ color: 'var(--accent-purple)' }}>
                  <Bell size={17} />
                </div>
                <span className="stat-card-badge badge-purple">
                  {t.alertsBadge}
                </span>
              </div>
              <div className="stat-card-number">
                {alertCount}
              </div>
              <div className="stat-card-title">
                {t.alerts}
              </div>
            </div>

          </div>

          {/* Live Trust and Sync Time note */}
          <div style={{ 
            fontSize: '0.78rem', 
            color: 'var(--text-dim)', 
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }}></span>
            <span>{t.liveData} • {t.lastUpdate}: <strong>{lastSyncTime || (effectiveLang === 'hi' ? 'अभी' : effectiveLang === 'en' ? 'Just now' : 'Abhi')}</strong> • {t.syncNote}</span>
          </div>

        </section>

        {/* 4. Top Headlines Section */}
        <section className="news-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Newspaper size={20} color="var(--accent-cyan)" />
              <h3 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: '1.15rem', 
                fontWeight: 700, 
                color: '#ffffff' 
              }}>
                {t.newsHeading}
              </h3>
            </div>
            
            <a 
              href="https://news.google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: 'var(--accent-cyan)',
                fontSize: '0.82rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600
              }}
            >
              <span>{t.viewAll}</span>
              <ExternalLink size={13} />
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {newsItems.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
                {effectiveLang === 'hi' ? 'ताज़ा खबरें लोड हो रही हैं...' : effectiveLang === 'en' ? 'Loading top headlines...' : 'Taaza khabarein load ho rahi hain...'}
              </div>
            ) : (
              newsItems.slice(0, 3).map((item, idx) => (
                <a 
                  key={idx}
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="news-item-row"
                  title={t.readFull}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                    <span style={{ color: 'var(--accent-cyan)', fontSize: '1rem', lineHeight: 1.4 }}>•</span>
                    <div>
                      <div style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 500, lineHeight: 1.4 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--accent-cyan)' }}>{item.source}</span>
                        {item.pubDate && <span>• {item.pubDate.split(' ').slice(0, 4).join(' ')}</span>}
                      </div>
                    </div>
                  </div>
                  <ExternalLink size={14} color="var(--accent-cyan)" style={{ opacity: 0.7, flexShrink: 0 }} />
                </a>
              ))
            )}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '12px' }}>
            {t.newsFooter}
          </div>
        </section>

        {/* 5. FOUR MODULAR ACTION CARDS */}
        <section className="grid-modules">
          
          {/* Card 1: Agenda */}
          <div 
            onClick={() => setActiveModule(activeModule === 'agenda' ? null : 'agenda')}
            className={`action-module-card ${activeModule === 'agenda' ? 'active' : ''}`}
          >
            <div className="module-icon-wrap" style={{ color: 'var(--accent-cyan)' }}>
              <Calendar size={18} />
            </div>
            <h3 className="module-title">
              Agenda
            </h3>
            <p className="module-desc">
              {t.agendaDesc}
            </p>
          </div>

          {/* Card 2: Wealth */}
          <div 
            onClick={() => setActiveModule(activeModule === 'wealth' ? null : 'wealth')}
            className={`action-module-card ${activeModule === 'wealth' ? 'active' : ''}`}
          >
            <div className="module-icon-wrap" style={{ color: 'var(--accent-cyan)' }}>
              <Wallet size={18} />
            </div>
            <h3 className="module-title">
              Wealth
            </h3>
            <p className="module-desc">
              {t.wealthDesc}
            </p>
          </div>

          {/* Card 3: Vault */}
          <div 
            onClick={() => setActiveModule(activeModule === 'vault' ? null : 'vault')}
            className={`action-module-card ${activeModule === 'vault' ? 'active' : ''}`}
          >
            <div className="module-icon-wrap" style={{ color: 'var(--accent-cyan)' }}>
              <Layers size={18} />
            </div>
            <h3 className="module-title">
              Vault
            </h3>
            <p className="module-desc">
              {t.vaultDesc}
            </p>
          </div>

          {/* Card 4: Activity */}
          <div 
            onClick={() => setActiveModule(activeModule === 'activity' ? null : 'activity')}
            className={`action-module-card ${activeModule === 'activity' ? 'active' : ''}`}
          >
            <div className="module-icon-wrap" style={{ color: 'var(--accent-cyan)' }}>
              <ShieldCheck size={18} />
            </div>
            <h3 className="module-title">
              Activity
            </h3>
            <p className="module-desc">
              {t.activityDesc}
            </p>
          </div>

        </section>

        {/* 6. EXPANDABLE ACTION PANEL (When any stat card or module is clicked) */}
        {activeModule && (
          <div className="card-briefing" style={{ border: '1px solid var(--accent-cyan)', animation: 'floatGentle 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  color: 'var(--accent-cyan)', 
                  fontWeight: 800, 
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.1rem',
                  textTransform: 'uppercase'
                }}>
                  {activeModule === 'agenda' && 'AGENDA // बाकी काम और टास्क सूची'}
                  {activeModule === 'wealth' && 'WEALTH // बजट, आय और निवेश'}
                  {activeModule === 'vault' && 'VAULT // मेमोरी और प्राथमिकताएँ'}
                  {activeModule === 'activity' && 'ACTIVITY // सुरक्षा और स्वायत्त ऑडिट'}
                  {activeModule === 'upcoming' && 'UPCOMING // आगामी इवेंट्स और कैलेंडर'}
                  {activeModule === 'alerts' && 'ALERTS // महत्वपूर्ण सुरक्षा व सिस्टम अलर्ट्स'}
                </span>
              </div>
              <button 
                onClick={() => setActiveModule(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* AGENDA CONTENT */}
            {activeModule === 'agenda' && (
              <div>
                {/* 3 Filter Tabs: Pending, Completed, All */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                  {[
                    { id: 'pending', label: t.tabPending, count: tasks.filter(tk => tk.status !== 'completed').length, icon: '⏳' },
                    { id: 'completed', label: t.tabCompleted, count: tasks.filter(tk => tk.status === 'completed').length, icon: '✓' },
                    { id: 'all', label: t.tabAll, count: tasks.length, icon: '📋' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAgendaFilter(tab.id)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: agendaFilter === tab.id 
                          ? (tab.id === 'completed' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)') 
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        background: agendaFilter === tab.id 
                          ? (tab.id === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)') 
                          : 'rgba(255, 255, 255, 0.03)',
                        color: agendaFilter === tab.id 
                          ? (tab.id === 'completed' ? '#10b981' : 'var(--accent-cyan)') 
                          : 'var(--text-muted)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      <span style={{ 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        padding: '1px 5px', 
                        borderRadius: '10px', 
                        fontSize: '0.7rem' 
                      }}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input 
                    type="text" 
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    placeholder={effectiveLang === 'en' ? "Add new task or reminder (e.g. Call Amit at 2 PM)..." : effectiveLang === 'hinglish' ? "Naya task ya reminder jodein (eg. Team review at 11 AM)..." : "नया कार्य या रिमाइंडर जोड़ें (उदा. कल 11 बजे रिव्यू)..."}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'white',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                  <button 
                    type="submit" 
                    style={{
                      background: 'var(--accent-cyan)',
                      color: '#080c16',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={16} /> {effectiveLang === 'en' ? 'Add' : effectiveLang === 'hinglish' ? 'Add Karein' : 'जोड़ें'}
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {tasks.filter(tk => {
                    if (agendaFilter === 'pending') return tk.status !== 'completed';
                    if (agendaFilter === 'completed') return tk.status === 'completed';
                    return true;
                  }).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {agendaFilter === 'completed' 
                        ? (effectiveLang === 'en' ? 'No completed tasks yet. Marked complete tasks appear here.' : effectiveLang === 'hinglish' ? 'Abhi koi task complete nahi hua hai.' : 'कोई कार्य अभी पूरा नहीं हुआ है। पूरे किए गए काम यहाँ दिखेंगे।')
                        : (effectiveLang === 'en' ? 'No pending tasks! All clear.' : effectiveLang === 'hinglish' ? 'Koi pending task nahi hai!' : 'कोई कार्य लंबित नहीं है।')}
                    </div>
                  ) : (
                    tasks
                      .filter(tk => {
                        if (agendaFilter === 'pending') return tk.status !== 'completed';
                        if (agendaFilter === 'completed') return tk.status === 'completed';
                        return true;
                      })
                      .map(tk => (
                        <div 
                          key={tk.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            padding: '10px 14px', 
                            background: tk.status === 'completed' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.03)', 
                            border: tk.status === 'completed' ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                            <button 
                              type="button"
                              onClick={() => handleToggleTask(tk.id)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: tk.status === 'completed' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                                padding: 0,
                                display: 'flex'
                              }}
                              title={tk.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                            >
                              {tk.status === 'completed' ? <CheckCircle2 size={18} color="#10b981" /> : <Circle size={18} />}
                            </button>
                            <span style={{ 
                              fontSize: '0.88rem', 
                              color: tk.status === 'completed' ? 'var(--text-muted)' : '#ffffff', 
                              textDecoration: tk.status === 'completed' ? 'line-through' : 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {tk.title}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {tk.reminder_time && (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '3px', 
                                background: 'rgba(56, 189, 248, 0.12)', 
                                color: 'var(--accent-cyan)', 
                                border: '1px solid rgba(56, 189, 248, 0.25)', 
                                borderRadius: '4px', 
                                padding: '2px 6px', 
                                fontSize: '0.68rem', 
                                fontWeight: 600 
                              }}>
                                <Clock size={11} /> {tk.reminder_time}
                              </span>
                            )}
                            {tk.status === 'completed' && (
                              <span style={{ 
                                background: 'rgba(16, 185, 129, 0.15)', 
                                color: '#10b981', 
                                border: '1px solid rgba(16, 185, 129, 0.3)', 
                                borderRadius: '4px', 
                                padding: '2px 6px', 
                                fontSize: '0.68rem', 
                                fontWeight: 600 
                              }}>
                                ✓ {t.completedTag}
                              </span>
                            )}
                            <span style={{ fontSize: '0.68rem', color: tk.priority === 'urgent' ? '#f43f5e' : 'var(--accent-cyan)' }}>
                              [{tk.priority.toUpperCase()}]
                            </span>
                            <button 
                              type="button"
                              onClick={() => handleDeleteTask(tk.id)} 
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                              title="Delete Task"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* UPCOMING CONTENT */}
            {activeModule === 'upcoming' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  आने वाले कैलेंडर इवेंट्स और तय रिमाइंडर:
                </div>
                <div style={{ padding: '12px 14px', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={16} color="var(--accent-blue)" />
                    <div>
                      <div style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: 600 }}>मासिक बजट समीक्षा व बिल भुगतान</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>कल दोपहर 2:00 PM • पर्सनल रिमाइंडर</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>निर्धारित</span>
                </div>

                <div style={{ padding: '12px 14px', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={16} color="var(--accent-blue)" />
                    <div>
                      <div style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: 600 }}>प्रोजेक्ट रिव्यू व टास्क अपडेट</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>सोमवार 11:00 AM • AETHER सिंक</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>कैलेंडर</span>
                </div>
              </div>
            )}

            {/* ALERTS CONTENT */}
            {activeModule === 'alerts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '14px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <AlertTriangle size={16} color="var(--accent-purple)" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>सिस्टम सुरक्षा व डेटा सिंक एक्टिव</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    स्थानीय डेटाबेस एन्क्लेव सक्रिय है। सभी फ़ाइनेंशियल और मेमोरी रिकॉर्ड्स सुरक्षित हैं। कोई पेंडिंग क्रिटिकल चेतावनी नहीं है।
                  </p>
                </div>
              </div>
            )}

            {/* WEALTH CONTENT */}
            {activeModule === 'wealth' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>NET BALANCE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                      ₹{(financeSummary.balance || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>INCOME</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                      ₹{(financeSummary.total_income || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>EXPENSES</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e', marginTop: '2px' }}>
                      ₹{(financeSummary.total_expense || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>हालिया लेनदेन:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {financeRecords.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      कोई खर्च दर्ज नहीं हुआ है। (उदा: "₹500 का पेट्रोल UPI से किया")
                    </div>
                  ) : (
                    financeRecords.map(r => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', color: '#ffffff' }}>{r.note || r.category}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{r.category.toUpperCase()} • {r.payment_mode.toUpperCase()}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: r.type === 'income' ? 'var(--accent-emerald)' : '#f43f5e', fontSize: '0.92rem' }}>
                          {r.type === 'income' ? '+' : '-'} ₹{r.amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VAULT CONTENT */}
            {activeModule === 'vault' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto' }}>
                
                {/* 1. Database & Storage Inspector Card */}
                <div style={{ 
                  background: 'rgba(56, 189, 248, 0.05)', 
                  border: '1px solid rgba(56, 189, 248, 0.25)', 
                  borderRadius: '10px', 
                  padding: '14px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Database size={18} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                        {effectiveLang === 'en' ? "SQLite Database & Storage Inspector" : effectiveLang === 'hinglish' ? "Local SQLite Database & Storage Info" : "स्थानीय SQLite डेटाबेस व स्टोरेज जानकारी"}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: '0.68rem', 
                      background: 'rgba(16, 185, 129, 0.15)', 
                      color: '#10b981', 
                      border: '1px solid rgba(16, 185, 129, 0.3)', 
                      padding: '2px 8px', 
                      borderRadius: '12px',
                      fontWeight: 600
                    }}>
                      ACTIVE ENCLAVE
                    </span>
                  </div>

                  <div style={{ 
                    background: 'rgba(0, 0, 0, 0.35)', 
                    padding: '8px 10px', 
                    borderRadius: '6px', 
                    fontSize: '0.78rem',
                    fontFamily: 'monospace',
                    color: 'var(--accent-cyan)',
                    marginBottom: '10px',
                    wordBreak: 'break-all'
                  }}>
                    📁 /Users/pawandixit/Desktop/Projects/aether/server/aether.db
                  </div>

                  {/* 4 Database Tables Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📋 TABLE: tasks (रिमाइंडर)</div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                        {tasks.length} total ({tasks.filter(tk => tk.status !== 'completed').length} pending, {tasks.filter(tk => tk.status === 'completed').length} completed)
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>💰 TABLE: financial_records</div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                        {financeRecords.length} records
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🧠 TABLE: memory_vault</div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--accent-purple)', marginTop: '2px' }}>
                        {memories.length} facts learned
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>🛡️ TABLE: audit_logs</div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>
                        {auditLogs.length} actions
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    💡 <strong>Terminal Query:</strong> <code style={{ color: '#e2e8f0', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>sqlite3 server/aether.db "SELECT * FROM tasks;"</code>
                  </div>
                </div>

                {/* 2. Mobile & Desktop Push Notifications Hub */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '10px',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Smartphone size={18} color="var(--accent-emerald)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                        {effectiveLang === 'en' ? "Mobile Push Notifications (Zero Phone Number Required)" : effectiveLang === 'hinglish' ? "Mobile Push Notifications (No Phone Number Needed)" : "मोबाइल पुश नोटिफिकेशन (बिना किसी मोबाइल नंबर के)"}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      background: pushPermission === 'granted' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: pushPermission === 'granted' ? '#10b981' : '#f59e0b',
                      border: `1px solid ${pushPermission === 'granted' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600
                    }}>
                      {pushPermission === 'granted' ? 'ACTIVE & PERMITTED' : 'PERMISSION NEEDED'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                    {effectiveLang === 'en' 
                      ? "Direct native OS push alerts with audio chime and vibration. 100% private, zero cost, and never requires sharing your phone number." 
                      : effectiveLang === 'hinglish'
                        ? "Audio chime aur vibration ke saath direct screen alerts. 100% private, zero cost aur koi phone number nahi chahiye."
                        : "सीधे आपके फोन/लैपटॉप स्क्रीन पर ऑडियो घंटी और वाइब्रेशन के साथ अलर्ट। 100% सुरक्षित और निजी, बिना किसी मोबाइल नंबर के।"}
                  </p>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {pushPermission !== 'granted' && (
                      <button
                        type="button"
                        onClick={handleRequestPushPermission}
                        style={{
                          background: 'var(--accent-emerald)',
                          color: '#080c16',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '7px 14px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <BellRing size={15} /> {effectiveLang === 'en' ? 'Allow Push Notifications' : 'पुश अनुमति दें'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSendTestPush}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: 'var(--accent-cyan)',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <BellRing size={15} /> {effectiveLang === 'en' ? '📲 Send Test Mobile Alert' : '📲 टेस्ट नोटिफिकेशन भेजें'}
                    </button>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.73rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    📱 <strong>Install as Mobile App (PWA):</strong><br />
                    • <strong>Android:</strong> Open in Chrome → Tap (⋮) → Tap <em>"Install App"</em> or <em>"Add to Home screen"</em>.<br />
                    • <strong>iPhone (iOS):</strong> Open in Safari → Tap Share icon (⎋) → Tap <em>"Add to Home Screen"</em>.
                  </div>
                </div>

                {/* 3. Learned Memories list */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {effectiveLang === 'en' ? "Learned Memory Items" : effectiveLang === 'hinglish' ? "Memory Vault Items" : "मेमोरी वॉल्ट (Aether द्वारा याद रखी गई बातें)"}
                  </div>
                  
                  {memories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {effectiveLang === 'en' ? "Memory vault is empty. Speak: 'Remember my gym is at 6 PM'" : effectiveLang === 'hinglish' ? "Memory vault khali hai. Boliye: 'Yaad rakhna meri medicine raat 9 baje hai'" : 'मेमोरी वॉल्ट खाली है। बोलें: "याद रखना कि मेरी दवा रात 9 बजे है"'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {memories.map(m => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                          <div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', display: 'block', marginBottom: '2px' }}>
                              [{m.category.toUpperCase()}]
                            </span>
                            <span style={{ fontSize: '0.85rem', color: '#ffffff' }}>"{m.fact}"</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleDeleteMemory(m.id)} 
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                            title="Delete Memory"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ACTIVITY CONTENT */}
            {activeModule === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                {auditLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    कोई स्वायत्त एक्शन लॉग नहीं है।
                  </div>
                ) : (
                  auditLogs.map(a => (
                    <div key={a.id} style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.82rem', color: '#ffffff' }}>{a.details}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          CONFIDENCE: {Math.round(a.confidence_score * 100)}%
                        </span>
                        {a.undo_payload && !a.is_undone && (
                          <button 
                            onClick={() => handleUndo(a.id)} 
                            style={{ 
                              background: 'rgba(56, 189, 248, 0.1)', 
                              border: '1px solid rgba(56, 189, 248, 0.3)', 
                              color: 'var(--accent-cyan)', 
                              borderRadius: '4px', 
                              padding: '2px 8px', 
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <RotateCcw size={11} /> Undo
                          </button>
                        )}
                        {a.is_undone && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Reversed</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}

        {/* 7. "AETHER से पूछें" REAL CHAT INPUT CARD */}
        <section className="ask-aether-card">
          
          {/* Header Row: Title + AI Status (Listening/Thinking/Speaking) + New Chat Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={20} color="var(--accent-cyan)" />
              <span style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: '1.15rem', 
                fontWeight: 700, 
                color: '#ffffff' 
              }}>
                {t.askAether}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              
              {/* Active Language Badge */}
              <div 
                title="Aether Response Language / उत्तर की भाषा (ऊपर हेडर से बदल सकते हैं)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(56, 189, 248, 0.1)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(56, 189, 248, 0.25)'
                }}
              >
                <Languages size={12} />
                <span>
                  {t.responseLang}: {currentLangObj.icon} {currentLangObj.label}
                </span>
              </div>

              {/* Dynamic Live AI Status Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                background: isListening ? 'rgba(244, 63, 94, 0.15)' : (isProcessing ? 'rgba(56, 189, 248, 0.15)' : (isSpeaking ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)')),
                color: isListening ? '#f43f5e' : (isProcessing ? 'var(--accent-cyan)' : (isSpeaking ? 'var(--accent-purple)' : 'var(--text-muted)')),
                border: `1px solid ${isListening ? '#f43f5e' : (isProcessing ? 'var(--accent-cyan)' : (isSpeaking ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.1)'))}`
              }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: isListening ? '#f43f5e' : (isProcessing ? 'var(--accent-cyan)' : (isSpeaking ? 'var(--accent-purple)' : '#10b981')) 
                }} />
                <span>
                  {isListening ? t.listening : 
                   isProcessing ? t.processing : 
                   isSpeaking ? t.speaking : t.ready}
                </span>
              </div>

              {/* New Chat Button */}
              <button
                type="button"
                onClick={handleStartNewChat}
                title="Start New Chat / नई बातचीत शुरू करें"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={13} />
                <span>{t.newChat}</span>
              </button>

              {/* Voice Mic Button */}
              <button 
                type="button"
                onClick={toggleVoiceRecognition}
                title={isListening ? "Stop listening" : "Click to speak with Aether (बोलिए)"}
                style={{
                  background: isListening ? '#f43f5e' : 'rgba(56, 189, 248, 0.12)',
                  border: isListening ? '1px solid #f43f5e' : '1px solid rgba(56, 189, 248, 0.3)',
                  color: isListening ? '#ffffff' : 'var(--accent-cyan)',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isListening ? '0 0 15px #f43f5e' : 'none'
                }}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>
          </div>

          {/* Genuine Real Chat Input Bar */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendPrompt(); }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '6px 8px 6px 16px',
              marginTop: '4px'
            }}
          >
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? t.listeningPlaceholder : t.placeholder}
              disabled={isProcessing}
              style={{ 
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: '0.96rem',
                fontFamily: 'var(--font-body)',
                padding: '6px 0'
              }}
            />

            <button 
              type="submit"
              disabled={isProcessing || !inputText.trim()}
              className="btn-send-circle"
              title="Send to AETHER"
            >
              <ArrowUp size={18} />
            </button>
          </form>

        </section>

        {/* 8. Centered Downward Arrow Button (Toggle Conversation History) */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button 
            type="button"
            onClick={() => setShowConversation(!showConversation)}
            className="btn-stream-toggle"
            title={showConversation ? t.hideChat : t.viewChat}
          >
            {showConversation ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {/* 9. CONVERSATION STREAM (When active or toggled open) */}
        {showConversation && (
          <section className="card-briefing" style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'floatGentle 0.3s ease' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={18} color="var(--accent-cyan)" />
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                  {t.chatStream}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {chatHistory.length} {t.messages}
              </span>
            </div>

            {/* Chat Scroll Container */}
            <div 
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;
                userScrolledUpRef.current = !isNearBottom;
              }}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px', 
                maxHeight: '440px', 
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              {chatHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '0.92rem', color: '#cbd5e1' }}>
                    नमस्ते पवन! मौसम, ताज़ा समाचार, टास्क या खर्च पूछने के लिए प्रॉम्ट टाइप करें।
                  </p>
                </div>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div key={idx} className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-aether'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.72rem' }}>
                      <span style={{ fontWeight: 700, color: msg.role === 'user' ? '#93c5fd' : 'var(--accent-cyan)' }}>
                        {msg.role === 'user' ? 'YOU (PAWAN)' : 'AETHER EXECUTIVE'}
                      </span>

                      {/* Action buttons on AI messages: Translate to Hindi & Speak aloud */}
                      {msg.role !== 'user' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleTranslateMessage(idx, msg.content)}
                            title="Translate to Hindi / हिन्दी अनुवाद"
                            style={{
                              background: 'rgba(56, 189, 248, 0.12)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              color: 'var(--accent-cyan)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.68rem'
                            }}
                          >
                            <Languages size={12} />
                            <span>{msg.isTranslated ? 'अनुवादित' : 'हिन्दी अनुवाद'}</span>
                          </button>

                          <button
                            onClick={() => speakText(msg.content)}
                            title="Listen response aloud"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--accent-cyan)',
                              cursor: 'pointer',
                              padding: '2px'
                            }}
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>
                ))
              )}

              {isProcessing && (
                <div className="chat-bubble-aether" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={16} color="var(--accent-cyan)" />
                  <span style={{ fontSize: '0.84rem', color: 'var(--accent-cyan)' }}>
                    {t.thinkingMsg}
                  </span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {[
                "what is the weather today?",
                "give the latest news of today?",
                "₹500 का पेट्रोल खर्च UPI से किया",
                "कल दोपहर 2 बजे टीम मीटिंग"
              ].map((chip, cIdx) => (
                <button
                  key={cIdx}
                  onClick={() => handleSendPrompt(chip)}
                  style={{
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: 'var(--radius-pill)',
                    padding: '4px 12px',
                    fontSize: '0.74rem',
                    color: 'var(--accent-cyan)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ⚡ {chip}
                </button>
              ))}
            </div>

          </section>
        )}

      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
          background: '#0d1526',
          border: '1px solid var(--accent-cyan)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
          padding: '12px 18px',
          borderRadius: '12px',
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
