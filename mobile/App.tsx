import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Bot,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Settings,
  Wifi,
  WifiOff,
  BellRing,
  Globe,
  X,
  RefreshCw
} from 'lucide-react-native';

import {
  getServerUrl,
  setServerUrl,
  checkServerHealth,
  fetchBriefing,
  fetchTasks,
  createTask,
  toggleTask,
  deleteTask,
  sendPromptToAether,
  fetchChatHistory
} from './src/api';

const LANG_OPTIONS = [
  { id: 'en', label: 'English', icon: '🇬🇧' },
  { id: 'hi', label: 'हिन्दी', icon: '🇮🇳' },
  { id: 'hinglish', label: 'Hinglish', icon: '✨' }
];

export default function App() {
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'hinglish'>('en');
  const [serverUrl, setServerUrlState] = useState('');
  const [serverHealthy, setServerHealthy] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tempUrlInput, setTempUrlInput] = useState('');

  // Data states
  const [briefing, setBriefing] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [agendaFilter, setAgendaFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Load initial server URL and data
  useEffect(() => {
    (async () => {
      const url = await getServerUrl();
      setServerUrlState(url);
      setTempUrlInput(url);
      await loadAllData(url);
    })();
  }, []);

  const loadAllData = async (urlOverride?: string) => {
    const isOk = await checkServerHealth(urlOverride || serverUrl);
    setServerHealthy(isOk);

    if (isOk) {
      try {
        const [brief, tList, chats] = await Promise.all([
          fetchBriefing().catch(() => null),
          fetchTasks().catch(() => []),
          fetchChatHistory().catch(() => [])
        ]);
        if (brief) setBriefing(brief);
        if (tList) setTasks(tList);
        if (chats) setChatHistory(chats);
      } catch (e) {
        console.log('Error loading data:', e);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  // Task Actions
  const handleToggle = async (id: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await toggleTask(id);
      const updated = await fetchTasks();
      setTasks(updated);
    } catch {
      Alert.alert('Error', 'Could not update task');
    }
  };

  const handleCreate = async () => {
    if (!newTaskInput.trim()) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await createTask(newTaskInput.trim());
      setNewTaskInput('');
      const updated = await fetchTasks();
      setTasks(updated);
    } catch {
      Alert.alert('Error', 'Could not create task');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await deleteTask(id);
      const updated = await fetchTasks();
      setTasks(updated);
    } catch {
      Alert.alert('Error', 'Could not delete task');
    }
  };

  // Chat Actions
  const handleSendPrompt = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || isProcessing) return;

    setChatInput('');
    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic user bubble
    const userMsg = { id: Date.now(), role: 'user', content: text.trim() };
    setChatHistory(prev => [...prev, userMsg]);

    try {
      const res = await sendPromptToAether(text.trim());
      const botMsg = { id: Date.now() + 1, role: 'aether', content: res.response || res.message || 'Done.' };
      setChatHistory(prev => [...prev, botMsg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Refresh tasks in case user created a task/reminder via AI
      const updated = await fetchTasks();
      setTasks(updated);
    } catch (e) {
      const errMsg = { id: Date.now() + 1, role: 'aether', content: 'Connection error. Please check server URL in Settings.' };
      setChatHistory(prev => [...prev, errMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Server Settings
  const handleSaveSettings = async () => {
    if (!tempUrlInput.trim()) return;
    await setServerUrl(tempUrlInput.trim());
    setServerUrlState(tempUrlInput.trim());
    setSettingsVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await loadAllData(tempUrlInput.trim());
  };

  const filteredTasks = tasks.filter(t => {
    if (agendaFilter === 'pending') return t.status !== 'completed';
    if (agendaFilter === 'completed') return t.status === 'completed';
    return true;
  });

  const weather = briefing?.weather || {
    temp: 28,
    condition_en: 'Mostly Sunny',
    condition_hi: 'धूप खिली हुई',
    city_en: 'Jaipur (Bhankrota)'
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080c16" />

      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.botIcon}>
            <Bot size={20} color="#38bdf8" />
          </View>
          <View>
            <Text style={styles.brandTitle}>AETHER ⚡</Text>
            <Text style={styles.brandSub}>
              {selectedLang === 'en' ? 'AI Executive' : selectedLang === 'hinglish' ? 'Personal Executive' : 'एआई सहायक'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Language Selector */}
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedLang(prev => (prev === 'en' ? 'hi' : prev === 'hi' ? 'hinglish' : 'en'));
            }}
          >
            <Globe size={14} color="#38bdf8" />
            <Text style={styles.langText}>
              {LANG_OPTIONS.find(l => l.id === selectedLang)?.icon} {selectedLang.toUpperCase()}
            </Text>
          </TouchableOpacity>

          {/* Settings / Server Config Button */}
          <TouchableOpacity
            style={[styles.settingsButton, { borderColor: serverHealthy ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)' }]}
            onPress={() => setSettingsVisible(true)}
          >
            {serverHealthy ? <Wifi size={16} color="#10b981" /> : <WifiOff size={16} color="#f43f5e" />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
        {/* 2. Hero Weather & Day Progression Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroGreeting}>
                {selectedLang === 'en' ? 'Good morning, Pawan!' : selectedLang === 'hinglish' ? 'Good Morning, Pawan!' : 'सुप्रभात, पवन!'}
              </Text>
              <Text style={styles.heroSub}>
                {selectedLang === 'en' ? 'Your autonomous executive agenda' : 'आज की महत्वपूर्ण ब्रीफिंग व अपडेट्स'}
              </Text>
            </View>

            <View style={styles.weatherBadge}>
              <Sun size={26} color="#38bdf8" />
              <View style={{ marginLeft: 6 }}>
                <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
                <Text style={styles.weatherCondition}>
                  {selectedLang === 'en' ? weather.condition_en : weather.condition_hi}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.heroBottom}>
            <Text style={styles.weatherLocation}>📍 {weather.city_en || 'Jaipur (Bhankrota)'}</Text>
            <Text style={styles.serverStatusText}>
              {serverHealthy ? '🟢 24/7 Cloud Synced' : '🔴 Server Offline'}
            </Text>
          </View>
        </View>

        {/* 3. Stat Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
            <Text style={[styles.statNum, { color: '#10b981' }]}>
              {tasks.filter(t => t.status !== 'completed').length}
            </Text>
            <Text style={styles.statLabel}>{selectedLang === 'en' ? 'Pending Tasks' : 'बाकी काम'}</Text>
          </View>

          <View style={[styles.statBox, { borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
            <Text style={[styles.statNum, { color: '#38bdf8' }]}>{tasks.filter(t => t.status === 'completed').length}</Text>
            <Text style={styles.statLabel}>{selectedLang === 'en' ? 'Completed' : 'पूरे हुए काम'}</Text>
          </View>

          <View style={[styles.statBox, { borderColor: 'rgba(168, 85, 247, 0.3)' }]}>
            <Text style={[styles.statNum, { color: '#a855f7' }]}>{briefing?.upcoming_count ?? 2}</Text>
            <Text style={styles.statLabel}>{selectedLang === 'en' ? 'Upcoming' : 'आगामी'}</Text>
          </View>
        </View>

        {/* 4. Agenda & Tasks Manager */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedLang === 'en' ? 'AGENDA & REMINDERS' : 'बाकी काम व रिमाइंडर'}
            </Text>
          </View>

          {/* 3 Tabs */}
          <View style={styles.tabsRow}>
            {[
              { id: 'pending', label: selectedLang === 'en' ? 'Pending' : 'बाकी', count: tasks.filter(t => t.status !== 'completed').length },
              { id: 'completed', label: selectedLang === 'en' ? 'Completed' : 'पूरे हुए', count: tasks.filter(t => t.status === 'completed').length },
              { id: 'all', label: selectedLang === 'en' ? 'All' : 'सभी', count: tasks.length }
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, agendaFilter === tab.id && styles.tabButtonActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setAgendaFilter(tab.id as any);
                }}
              >
                <Text style={[styles.tabButtonText, agendaFilter === tab.id && styles.tabButtonTextActive]}>
                  {tab.label} ({tab.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add Task Input */}
          <View style={styles.addTaskRow}>
            <TextInput
              style={styles.addTaskInput}
              placeholder={selectedLang === 'en' ? 'Add new reminder or task...' : 'नया काम या रिमाइंडर जोड़ें...'}
              placeholderTextColor="#64748b"
              value={newTaskInput}
              onChangeText={setNewTaskInput}
            />
            <TouchableOpacity style={styles.addTaskBtn} onPress={handleCreate}>
              <Plus size={18} color="#080c16" />
            </TouchableOpacity>
          </View>

          {/* Task List */}
          {filteredTasks.length === 0 ? (
            <Text style={styles.emptyText}>
              {agendaFilter === 'completed'
                ? (selectedLang === 'en' ? 'No completed tasks yet.' : 'कोई कार्य अभी पूरा नहीं हुआ है।')
                : (selectedLang === 'en' ? 'No pending tasks! All clear.' : 'कोई काम लंबित नहीं है!')}
            </Text>
          ) : (
            filteredTasks.map(item => (
              <View key={item.id} style={[styles.taskItem, item.status === 'completed' && styles.taskItemCompleted]}>
                <TouchableOpacity onPress={() => handleToggle(item.id)} style={styles.checkTouch}>
                  {item.status === 'completed' ? (
                    <CheckCircle2 size={20} color="#10b981" />
                  ) : (
                    <Circle size={20} color="#64748b" />
                  )}
                </TouchableOpacity>

                <View style={styles.taskTextWrap}>
                  <Text style={[styles.taskTitle, item.status === 'completed' && styles.taskTitleCompleted]}>
                    {item.title}
                  </Text>
                  {item.reminder_time && (
                    <View style={styles.reminderBadge}>
                      <Clock size={11} color="#38bdf8" />
                      <Text style={styles.reminderBadgeText}>{item.reminder_time}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteTouch}>
                  <Trash2 size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* 5. Intelligence Chat Stream */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {selectedLang === 'en' ? 'ASK AETHER INTELLIGENCE' : 'AETHER से पूछें'}
          </Text>

          {/* Quick prompt chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {[
              "What's the weather today?",
              "₹500 petrol UPI",
              "Team meeting at 2 PM",
              "Top news headlines"
            ].map((chip, idx) => (
              <TouchableOpacity key={idx} style={styles.chip} onPress={() => handleSendPrompt(chip)}>
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Chat Messages */}
          <View style={styles.chatList}>
            {chatHistory.slice(-4).map((msg, idx) => (
              <View
                key={idx}
                style={[styles.chatBubble, msg.role === 'user' ? styles.userBubble : styles.botBubble]}
              >
                <Text style={styles.chatRole}>
                  {msg.role === 'user' ? 'YOU (PAWAN)' : 'AETHER EXECUTIVE'}
                </Text>
                <Text style={styles.chatContent}>{msg.content}</Text>
              </View>
            ))}

            {isProcessing && (
              <View style={[styles.chatBubble, styles.botBubble, { flexDirection: 'row', alignItems: 'center' }]}>
                <ActivityIndicator size="small" color="#38bdf8" />
                <Text style={[styles.chatContent, { marginLeft: 8, color: '#38bdf8' }]}>
                  {selectedLang === 'en' ? 'Aether is thinking...' : 'Aether सोच रहा है...'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Chat Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder={selectedLang === 'en' ? 'Message Aether executive...' : 'कुछ भी पूछें या काम बताएं...'}
            placeholderTextColor="#64748b"
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={() => handleSendPrompt()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!chatInput.trim() || isProcessing) && styles.sendBtnDisabled]}
            disabled={!chatInput.trim() || isProcessing}
            onPress={() => handleSendPrompt()}
          >
            <Send size={18} color={chatInput.trim() ? '#080c16' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Server Settings Modal */}
      <Modal visible={settingsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Server Connection Settings</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Connect mobile app to your Local Wi-Fi server or 24/7 Cloud Hosted URL:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={tempUrlInput}
              onChangeText={setTempUrlInput}
              placeholder="e.g. http://192.168.1.2:8000 or https://aether.onrender.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalStatusRow}>
              <Text style={styles.modalStatusLabel}>Current Status:</Text>
              <Text style={{ color: serverHealthy ? '#10b981' : '#f43f5e', fontWeight: 'bold' }}>
                {serverHealthy ? 'CONNECTED 🟢' : 'DISCONNECTED 🔴'}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.testBtn}
                onPress={async () => {
                  const ok = await checkServerHealth(tempUrlInput);
                  Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
                  Alert.alert('Connection Test', ok ? '✓ Successfully connected to Aether Core!' : '✗ Could not reach server. Check IP/URL.');
                }}
              >
                <RefreshCw size={16} color="#38bdf8" />
                <Text style={styles.testBtnText}>Test Connection</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
                <Text style={styles.saveBtnText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080c16'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  botIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  brandSub: {
    color: '#94a3b8',
    fontSize: 11
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8
  },
  langText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600'
  },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    gap: 16
  },
  heroCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 16,
    padding: 16
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  heroGreeting: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800'
  },
  heroSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12
  },
  weatherTemp: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  weatherCondition: {
    color: '#94a3b8',
    fontSize: 10
  },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)'
  },
  weatherLocation: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600'
  },
  serverStatusText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600'
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center'
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800'
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center'
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14
  },
  sectionHeader: {
    marginBottom: 10
  },
  sectionTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  tabButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.35)'
  },
  tabButtonText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600'
  },
  tabButtonTextActive: {
    color: '#38bdf8'
  },
  addTaskRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  addTaskInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13
  },
  addTaskBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 14
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6
  },
  taskItemCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    borderColor: 'rgba(16, 185, 129, 0.15)'
  },
  checkTouch: {
    paddingRight: 8
  },
  taskTextWrap: {
    flex: 1
  },
  taskTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500'
  },
  taskTitleCompleted: {
    color: '#64748b',
    textDecorationLine: 'line-through'
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2
  },
  reminderBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600'
  },
  deleteTouch: {
    padding: 4
  },
  chipsScroll: {
    marginVertical: 10
  },
  chip: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6
  },
  chipText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600'
  },
  chatList: {
    gap: 8,
    marginTop: 4
  },
  chatBubble: {
    padding: 10,
    borderRadius: 10
  },
  userBubble: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignSelf: 'flex-end',
    maxWidth: '85%'
  },
  botBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'flex-start',
    maxWidth: '92%'
  },
  chatRole: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2
  },
  chatContent: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0d1527'
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#0d1527',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 16,
    padding: 18
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  modalSub: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    padding: 10,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 12
  },
  modalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  modalStatusLabel: {
    color: '#94a3b8',
    fontSize: 12
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingVertical: 10,
    borderRadius: 8
  },
  testBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600'
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#38bdf8',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnText: {
    color: '#080c16',
    fontSize: 12,
    fontWeight: '700'
  }
});
