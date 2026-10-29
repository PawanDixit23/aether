import React from 'react';

export const LANG_OPTIONS = [
  { id: 'auto', label: 'Auto', fullLabel: 'Auto (स्वचालित)', icon: '🌐' },
  { id: 'hi', label: 'हिन्दी', fullLabel: 'हिन्दी (Hindi)', icon: '🇮🇳' },
  { id: 'en', label: 'English', fullLabel: 'English (अंग्रेजी)', icon: '🇬🇧' },
  { id: 'hinglish', label: 'Hinglish', fullLabel: 'Hinglish (हिंग्लिश)', icon: '✨' }
];

export const UI_TRANSLATIONS = {
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

export const AETHER_VOICES = [
  { id: 'puck', name: 'Puck', desc: 'Crisp, focused, analytical • Male', pitch: 1.0, rate: 1.05, gender: 'male' },
  { id: 'charon', name: 'Charon', desc: 'Deep, calm, authoritative • Male', pitch: 0.75, rate: 0.95, gender: 'male' },
  { id: 'kore', name: 'Kore', desc: 'Warm, articulate, balanced • Female', pitch: 1.05, rate: 1.0, gender: 'female' },
  { id: 'fenrir', name: 'Fenrir', desc: 'Strong, commanding, direct • Male', pitch: 0.82, rate: 1.0, gender: 'male' },
  { id: 'aoede', name: 'Aoede', desc: 'Melodic, polished, empathetic • Female', pitch: 1.15, rate: 1.0, gender: 'female' },
  { id: 'zephyr', name: 'Zephyr', desc: 'Modern, energetic, concise • Neutral', pitch: 1.0, rate: 1.1, gender: 'neutral' }
];

export const resolveSpeechVoice = (voiceId, lang = 'en') => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const isHindi = lang && (lang.startsWith('hi') || lang === 'hi-IN');
  if (isHindi) {
    const hiVoice = voices.find(v => v.lang === 'hi-IN')
      || voices.find(v => v.lang && v.lang.toLowerCase().startsWith('hi'))
      || voices.find(v => /hindi/i.test(v.name));
    if (hiVoice) return hiVoice;
    return voices[0] || null;
  }

  const enINVoices = voices.filter(v => v.lang === 'en-IN');
  const enGBVoices = voices.filter(v => v.lang === 'en-GB');
  const enUSVoices = voices.filter(v => v.lang === 'en-US' || (v.lang && v.lang.toLowerCase().startsWith('en')));

  const voiceMeta = AETHER_VOICES.find(v => v.id === voiceId) || AETHER_VOICES[0];
  const isFemale = voiceMeta.gender === 'female' || voiceId === 'kore' || voiceId === 'aoede';

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

export const AETHER_MODELS = [
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tag: 'Fast & Low Latency', desc: 'Ultra-fast responses with generous free limits' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: 'Deep Reasoning', desc: 'Complex reasoning across lengthy context' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: 'Next-Gen Preview', desc: 'Experimental next-gen multimodal speed' }
];

export const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 8.9 5 12 5z"/>
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"/>
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.5-2.4-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"/>
  </svg>
);
