import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Check, 
  ExternalLink, 
  Trash2,
  CalendarCheck2,
  Search,
  AlertCircle,
  Repeat,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Sparkles,
  Layers,
  X,
  Edit3,
  Paperclip,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Upload
} from 'lucide-react';

export const TasksModal = ({
  isOpen,
  onClose,
  combinedTasks = [],
  remindersViewMode,
  setRemindersViewMode,
  agendaFilter = 'today',
  setAgendaFilter,
  calSelectedDate,
  setCalSelectedDate,
  formatLocalDateStr,
  getTaskDateStr,
  handleToggleTask,
  handleDeleteTask,
  handleCreateTask,
  handleUpdateTask,
  handleCreateSubtask,
  newTaskInput = '',
  setNewTaskInput,
  handleRescheduleAllOverdue,
  expandedTaskIds = {},
  toggleSubtasksExpand,
  setShowGCalConnectModal
}) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768 || !!window.ReactNativeWebView || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768 || !!window.ReactNativeWebView || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Local state for UI filters & inputs
  const [localTaskInput, setLocalTaskInput] = useState(newTaskInput || '');
  const [inputError, setInputError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'high' | 'medium' | 'low'
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [localExpanded, setLocalExpanded] = useState({});
  const dateInputRef = useRef(null);

  // Reminder / Task Editing State (Allows updating reminder description, title, time)
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editReminderTime, setEditReminderTime] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Completion Comment & Attachments State for Editing
  const [editCompletionComment, setEditCompletionComment] = useState('');
  const [editAttachments, setEditAttachments] = useState([]);
  const editFileInputRef = useRef(null);
  const subtaskEditFileInputRef = useRef(null);

  // Optional Completion Prompt Modal (triggered when marking a task complete)
  const [completionPromptTask, setCompletionPromptTask] = useState(null);
  const [promptComment, setPromptComment] = useState('');
  const [promptAttachments, setPromptAttachments] = useState([]);
  const [isSavingCompletionPrompt, setIsSavingCompletionPrompt] = useState(false);
  const promptFileInputRef = useRef(null);

  // Fullscreen Preview Image Modal
  const [previewImage, setPreviewImage] = useState(null);

  // Todoist-Style Subtask Adding State
  const [addingSubtaskParentId, setAddingSubtaskParentId] = useState(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskPriority, setSubtaskPriority] = useState('medium');
  const [subtaskTime, setSubtaskTime] = useState('');
  const [isSubmittingSubtask, setIsSubmittingSubtask] = useState(false);

  const handleAddSubtaskSubmit = async (parentId) => {
    if (!subtaskTitle.trim()) return;
    setIsSubmittingSubtask(true);
    try {
      if (handleCreateSubtask) {
        await handleCreateSubtask(parentId, {
          title: subtaskTitle.trim(),
          priority: subtaskPriority,
          reminder_time: subtaskTime.trim() || null
        });
      }
      setSubtaskTitle('');
      setSubtaskTime('');
      setSubtaskPriority('medium');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingSubtask(false);
    }
  };

  const priorityMeta = {
    low: { label: 'Low', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)', dot: '🟢', desc: 'Flexible / casual reminder' },
    medium: { label: 'Medium', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.35)', dot: '🟡', desc: 'Standard priority' },
    high: { label: 'High', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.35)', dot: '🟠', desc: 'Needs attention today' },
    urgent: { label: 'Urgent', color: '#f87171', bg: 'rgba(248, 113, 113, 0.18)', border: 'rgba(248, 113, 113, 0.45)', dot: '🔴', desc: 'Critical / Immediate action' }
  };

  const parseAttachments = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const handleFileUploadHelper = (e, setList) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 5MB limit.`);
        return;
      }
      const isImg = file.type.startsWith('image/');
      const reader = new FileReader();

      if (isImg) {
        reader.onload = (event) => {
          const img = new window.Image();
          img.onload = () => {
            const maxWidth = 1200;
            const maxHeight = 1200;
            let width = img.width;
            let height = img.height;
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.82);

            setList(prev => [
              ...prev,
              {
                id: Date.now() + Math.random().toString(36).slice(2, 7),
                name: file.name,
                type: file.type,
                size: Math.round(compressedDataUrl.length * 0.75),
                data: compressedDataUrl
              }
            ]);
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          setList(prev => [
            ...prev,
            {
              id: Date.now() + Math.random().toString(36).slice(2, 7),
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              data: event.target.result
            }
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = '';
  };

  const handleDownloadAttachment = (att) => {
    if (!att || !att.data) return;
    const a = document.createElement('a');
    a.href = att.data;
    a.download = att.name || 'attachment';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStartEditTask = (t) => {
    setEditingTaskId(t.id);
    setEditTitle(t.title || '');
    setEditDescription(t.description || '');
    setEditReminderTime(t.reminder_time || '');
    setEditPriority(t.priority || 'medium');
    setEditCompletionComment(t.completion_comment || '');
    setEditAttachments(parseAttachments(t.attachments));
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setEditTitle('');
    setEditDescription('');
    setEditReminderTime('');
    setEditCompletionComment('');
    setEditAttachments([]);
  };

  const handleSaveTaskEdit = async (taskId) => {
    if (!editTitle.trim()) return;
    setIsSavingEdit(true);
    try {
      if (handleUpdateTask) {
        await handleUpdateTask(taskId, {
          title: editTitle.trim(),
          description: editDescription.trim(),
          reminder_time: editReminderTime.trim() || null,
          priority: editPriority,
          completion_comment: editCompletionComment.trim() || null,
          attachments: editAttachments.length > 0 ? JSON.stringify(editAttachments) : null
        });
      }
      setEditingTaskId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveCompletionPrompt = async () => {
    if (!completionPromptTask) return;
    setIsSavingCompletionPrompt(true);
    try {
      if (handleUpdateTask) {
        await handleUpdateTask(completionPromptTask.id, {
          completion_comment: promptComment.trim() || null,
          attachments: promptAttachments.length > 0 ? JSON.stringify(promptAttachments) : null
        });
      }
      setCompletionPromptTask(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingCompletionPrompt(false);
    }
  };

  // Persistent date-specific completions for recurring tasks: { [taskId]: { [dateStr]: boolean } }
  const [taskDateCompletions, setTaskDateCompletions] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('aether_task_date_completions');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return {};
  });

  // Keep date completions in sync whenever modal opens or combinedTasks update from server
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('aether_task_date_completions');
        if (saved) setTaskDateCompletions(JSON.parse(saved));
      }
    } catch (e) {}

    if (combinedTasks && combinedTasks.length > 0) {
      setTaskDateCompletions(prev => {
        let updated = false;
        const next = { ...prev };
        combinedTasks.forEach(t => {
          if (t.date_completions && typeof t.date_completions === 'object') {
            const existing = next[t.id] || {};
            let taskUpdated = false;
            const merged = { ...existing };
            Object.entries(t.date_completions).forEach(([d, val]) => {
              if (merged[d] !== val) {
                merged[d] = val;
                taskUpdated = true;
              }
            });
            if (taskUpdated) {
              next[t.id] = merged;
              updated = true;
            }
          }
        });
        if (updated) {
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('aether_task_date_completions', JSON.stringify(next));
            }
          } catch (e) {}
          return next;
        }
        return prev;
      });
    }
  }, [isOpen, combinedTasks]);

  const todayStr = formatLocalDateStr ? formatLocalDateStr(new Date()) : new Date().toISOString().slice(0, 10);
  
  // Selected date resolution
  const selectedDateObj = calSelectedDate ? new Date(calSelectedDate) : new Date();
  const selectedDateStr = formatLocalDateStr ? formatLocalDateStr(selectedDateObj) : selectedDateObj.toISOString().slice(0, 10);
  const isSelectedDateToday = selectedDateStr === todayStr;

  const monthYearTitle = selectedDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isDaily = (t) => t?.recurrence === 'daily' || t?.repeat === 'daily' || String(t?.recurrence || '').toLowerCase().includes('daily') || t?.recurrence === 'weekdays' || t?.recurrence === 'weekly_monday' || (t?.recurrence && t?.recurrence !== 'none');

  // Date-aware completion: a daily/recurring task completed today or past is NEVER completed on tomorrow or any future date
  const isTaskDone = (t, targetDateStr = selectedDateStr) => {
    if (!t) return false;
    const daily = isDaily(t);

    // Non-recurring task: standard single completion lifecycle
    if (!daily) {
      return Boolean(t.is_completed || t.status === 'completed');
    }

    // Daily / recurring task:
    // 1. Strict per-date isolation if explicitly recorded in local cache
    if (taskDateCompletions[t.id] && taskDateCompletions[t.id][targetDateStr] !== undefined) {
      return Boolean(taskDateCompletions[t.id][targetDateStr]);
    }

    // 2. Persistent date completion from cloud server
    if (t.date_completions && t.date_completions[targetDateStr] !== undefined) {
      return Boolean(t.date_completions[targetDateStr]);
    }

    // 3. For any recurring task, if targetDateStr was not explicitly marked done, it is ALWAYS false!
    return false;
  };

  const isTaskOverdue = (t, targetDateStr = selectedDateStr) => {
    if (isTaskDone(t, targetDateStr)) return false;
    
    // Future dates are never overdue
    if (targetDateStr > todayStr) return false;

    if (isDaily(t)) {
      if (targetDateStr < todayStr) return true;
      if (targetDateStr === todayStr && t.reminder_time) {
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
    }

    const tDateStr = getTaskDateStr(t);
    if (tDateStr && tDateStr < todayStr) return true;
    if (tDateStr === todayStr && t.reminder_time) {
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

  // Generate 7-Day Date Ribbon centered around selected date
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(selectedDateObj);
      d.setDate(selectedDateObj.getDate() + i);
      const dStr = formatLocalDateStr ? formatLocalDateStr(d) : d.toISOString().slice(0, 10);
      
      // Calculate tasks count and completed strictly on this date
      const dTasks = combinedTasks.filter(t => {
        if (isDaily(t)) return true;
        const taskD = getTaskDateStr(t);
        return taskD === dStr;
      });
      const dTotal = dTasks.length;
      const dCompleted = dTasks.filter(t => isTaskDone(t, dStr)).length;

      days.push({
        dateObj: d,
        dateStr: dStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        totalTasks: dTotal,
        completedTasks: dCompleted
      });
    }
    return days;
  }, [selectedDateObj, combinedTasks, todayStr, selectedDateStr, formatLocalDateStr, getTaskDateStr, taskDateCompletions]);

  // Navigate date ribbon (prev/next 7 days or single day)
  const shiftDate = (daysCount) => {
    const nextD = new Date(selectedDateObj);
    nextD.setDate(selectedDateObj.getDate() + daysCount);
    if (setCalSelectedDate) setCalSelectedDate(nextD);
  };

  // Section Counts matching Todoli statusFilters
  const allCount = combinedTasks.length;
  const dateTasks = combinedTasks.filter(t => isDaily(t) || getTaskDateStr(t) === selectedDateStr || (!getTaskDateStr(t) && isSelectedDateToday && !t.is_google_calendar));
  const dateTotalCount = dateTasks.length;
  const dateCompletedCount = dateTasks.filter(t => isTaskDone(t, selectedDateStr)).length;
  const overdueCount = combinedTasks.filter(t => isTaskOverdue(t, todayStr)).length;
  const upcomingCount = combinedTasks.filter(t => !isTaskDone(t, todayStr) && !isDaily(t) && getTaskDateStr(t) && getTaskDateStr(t) > todayStr).length;
  const completedCount = combinedTasks.filter(t => isTaskDone(t, selectedDateStr)).length;

  const dateProgressPercent = dateTotalCount > 0 ? Math.round((dateCompletedCount / dateTotalCount) * 100) : 0;

  // Internal date-aware task toggling
  const onToggleTaskInternal = (task) => {
    if (task.is_google_calendar) return;
    const currentDone = isTaskDone(task, selectedDateStr);
    const willBeDone = !currentDone;

    if (isDaily(task)) {
      const updated = {
        ...taskDateCompletions,
        [task.id]: {
          ...(taskDateCompletions[task.id] || {}),
          [selectedDateStr]: willBeDone
        }
      };
      setTaskDateCompletions(updated);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('aether_task_date_completions', JSON.stringify(updated));
        }
      } catch (e) {}

      // Sync date completion to backend for ANY date (today OR older days!)
      if (handleToggleTask) {
        handleToggleTask(task.id, willBeDone, selectedDateStr);
      }
    } else {
      if (handleToggleTask) {
        handleToggleTask(task.id, willBeDone, selectedDateStr);
      }
    }

    // Prompt user optionally for completion note & attachments when marked complete
    if (willBeDone) {
      setCompletionPromptTask(task);
      setPromptComment(task.completion_comment || '');
      setPromptAttachments(parseAttachments(task.attachments));
    }
  };

  // Status Filter options
  const statusFilterTabs = [
    { key: 'today', label: isSelectedDateToday ? 'Today' : selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: dateTotalCount, icon: Calendar },
    { key: 'all', label: 'Inbox', count: allCount, icon: Inbox },
    { key: 'overdue', label: 'Overdue', count: overdueCount, icon: AlertCircle, isAlert: overdueCount > 0 },
    { key: 'upcoming', label: 'Upcoming', count: upcomingCount, icon: Clock },
    { key: 'completed', label: 'Completed', count: completedCount, icon: CheckCircle2 }
  ];

  // Priority Filter options
  const priorityFilterOptions = [
    { key: 'all', label: 'All Priorities', dot: null },
    { key: 'high', label: 'High', dot: '#EF4444' },
    { key: 'medium', label: 'Medium', dot: '#F59E0B' },
    { key: 'low', label: 'Low', dot: '#10B981' }
  ];

  // Chronological time parser for tasks (e.g. "7:00 AM" -> 420 mins, "8:00 AM" -> 480 mins)
  const parseReminderToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 9999;
    const str = timeStr.trim().toLowerCase();
    const m12 = str.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)$/i);
    if (m12) {
      let hours = parseInt(m12[1], 10);
      const minutes = m12[2] ? parseInt(m12[2], 10) : 0;
      const ampm = m12[3].toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
    const m24 = str.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) {
      return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
    }
    return 9999;
  };

  // Filter tasks based on selected tab, date, priority, and search query
  const filteredTasks = useMemo(() => {
    return combinedTasks.filter(t => {
      const isOverdueNow = isTaskOverdue(t, todayStr);
      const done = isTaskDone(t, agendaFilter === 'overdue' ? todayStr : selectedDateStr);
      const overdue = agendaFilter === 'overdue' ? isOverdueNow : isTaskOverdue(t, selectedDateStr);
      const tDateStr = getTaskDateStr(t);
      const daily = isDaily(t);
      const isForSelectedDate = daily || tDateStr === selectedDateStr || (!tDateStr && isSelectedDateToday && !t.is_google_calendar);

      // Status filter
      if (agendaFilter === 'completed' && !done) return false;
      if (agendaFilter === 'overdue' && !isOverdueNow) return false;
      if (agendaFilter === 'upcoming' && (done || daily || !tDateStr || tDateStr <= todayStr)) return false;
      if (agendaFilter === 'today' && !isForSelectedDate) return false;

      // Priority filter
      const p = (t.priority || 'medium').toLowerCase();
      if (priorityFilter === 'high' && p !== 'high' && p !== 'urgent') return false;
      if (priorityFilter === 'medium' && p !== 'medium' && p !== 'normal') return false;
      if (priorityFilter === 'low' && p !== 'low') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (t.title || '').toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const aDone = isTaskDone(a, agendaFilter === 'overdue' ? todayStr : selectedDateStr);
      const bDone = isTaskDone(b, agendaFilter === 'overdue' ? todayStr : selectedDateStr);
      if (aDone !== bDone) return aDone ? 1 : -1;

      const aOverdue = isTaskOverdue(a);
      const bOverdue = isTaskOverdue(b);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

      const aTime = parseReminderToMinutes(a.reminder_time);
      const bTime = parseReminderToMinutes(b.reminder_time);
      if (aTime !== bTime) return aTime - bTime;

      return (a.title || '').localeCompare(b.title || '');
    });
  }, [combinedTasks, agendaFilter, priorityFilter, searchQuery, selectedDateStr, todayStr, isSelectedDateToday, getTaskDateStr]);

  const toggleExpand = (id) => {
    setLocalExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    if (toggleSubtasksExpand) toggleSubtasksExpand(id);
  };

  const getPriorityAccent = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'urgent' || p === 'high') return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444' };
    if (p === 'low') return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981' };
    return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B' };
  };

  // Form submission with validation
  const onSubmitTask = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const titleVal = localTaskInput.trim();
    if (!titleVal) {
      setInputError('⚠️ Enter a task title (e.g. Drink 2L water at 3 PM)');
      return;
    }
    setInputError('');
    if (handleCreateTask) {
      handleCreateTask(e, titleVal, selectedDateStr, newTaskPriority);
    }
    setLocalTaskInput('');
    if (setNewTaskInput) setNewTaskInput('');
  };

  const quickSuggestions = [
    { text: 'Drink 2L water at 3 PM', label: '💧 2L Water' },
    { text: 'Walk 30 mins after dinner at 8 PM', label: '🏃 Walk' },
    { text: 'Call meeting follow-up at 5 PM', label: '📞 Call' },
    { text: 'Take daily vitamins at 9 PM', label: '💊 Vitamins' }
  ];

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(10, 15, 29, 0.94)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 120,
      display: 'flex',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'center',
      padding: isMobile ? 0 : '12px'
    }}>
      <div style={{
        background: '#0F172A',
        border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: isMobile ? 0 : '24px',
        width: '100%',
        maxWidth: isMobile ? '100%' : '560px',
        height: isMobile ? '100dvh' : 'auto',
        maxHeight: isMobile ? '100dvh' : '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        boxShadow: isMobile ? 'none' : '0 25px 70px rgba(0, 0, 0, 0.85)',
        overflow: 'hidden',
        paddingTop: isMobile ? 'max(40px, env(safe-area-inset-top, 0px))' : 0,
        paddingBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom, 0px))' : 0
      }}>
        
        {/* ── 1. HEADER & DATE TITLE ── */}
        <div style={{
          padding: isMobile ? '12px 14px 10px' : '16px 18px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)'
              }}>
                <Check size={20} strokeWidth={3} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.30rem', fontWeight: 800, color: '#F8FAFC', margin: 0, letterSpacing: '-0.02em' }}>
                  Tasks & Agenda
                </h2>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{dateCompletedCount} of {dateTotalCount} completed</span>
                  <span style={{ color: '#0D9488', fontWeight: 700 }}>({dateProgressPercent}%)</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowGCalConnectModal && setShowGCalConnectModal(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '11px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
                title="Sync Google Calendar"
              >
                <CalendarCheck2 size={17} />
              </button>
              <button 
                type="button" 
                onClick={onClose} 
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            marginTop: '12px',
            width: '100%',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, dateProgressPercent))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #0D9488 0%, #10B981 100%)',
              borderRadius: '999px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* ── 2. CALENDAR DATE RIBBON (Select previous/upcoming dates) ── */}
        <div style={{
          padding: isMobile ? '10px 14px 0' : '12px 18px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Month Header with Navigation & Date Picker */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => shiftDate(-7)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                title="Previous Week"
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#E2E8F0' }}>
                {monthYearTitle}
              </span>
              <button
                type="button"
                onClick={() => shiftDate(7)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                title="Next Week"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Today Button */}
              <button
                type="button"
                onClick={() => {
                  if (setCalSelectedDate) setCalSelectedDate(new Date());
                  setAgendaFilter('today');
                }}
                style={{
                  background: isSelectedDateToday ? '#0D9488' : 'rgba(255, 255, 255, 0.06)',
                  border: isSelectedDateToday ? '1px solid #0D9488' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: isSelectedDateToday ? '#FFFFFF' : '#94A3B8',
                  borderRadius: '8px',
                  padding: '3px 9px',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Today
              </button>

              {/* Native Date Picker Trigger */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => dateInputRef.current && dateInputRef.current.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.click()}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    width: '28px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94A3B8',
                    cursor: 'pointer'
                  }}
                  title="Jump to date"
                >
                  <Calendar size={13} />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => {
                    if (e.target.value) {
                      const picked = new Date(e.target.value + 'T12:00:00');
                      if (setCalSelectedDate) setCalSelectedDate(picked);
                      setAgendaFilter('today');
                    }
                  }}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: 0,
                    height: 0,
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* 7-Day Date Ribbon */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
            background: '#1E293B',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '8px 6px'
          }}>
            {weekDays.map(wd => {
              const hasTasks = wd.totalTasks > 0;
              const allDone = hasTasks && wd.completedTasks === wd.totalTasks;
              return (
                <button
                  key={wd.dateStr}
                  type="button"
                  onClick={() => {
                    if (setCalSelectedDate) setCalSelectedDate(wd.dateObj);
                    setAgendaFilter('today');
                  }}
                  style={{
                    background: wd.isSelected ? '#0D9488' : 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '6px 2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: wd.isSelected ? '#FFFFFF' : wd.isToday ? '#38BDF8' : '#94A3B8',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px', opacity: wd.isSelected ? 0.95 : 0.7 }}>
                    {wd.dayName}
                  </span>
                  <span style={{ fontSize: '0.94rem', fontWeight: wd.isSelected || wd.isToday ? 800 : 600 }}>
                    {wd.dayNum}
                  </span>

                  {/* Task Count Badge / Dot */}
                  {hasTasks ? (
                    <span style={{
                      marginTop: '3px',
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      color: wd.isSelected ? '#FFFFFF' : allDone ? '#10B981' : '#38BDF8',
                      background: wd.isSelected ? 'rgba(255, 255, 255, 0.2)' : allDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                      padding: '0 4px',
                      borderRadius: '4px'
                    }}>
                      {wd.completedTasks}/{wd.totalTasks}
                    </span>
                  ) : (
                    <span style={{ height: '11px', marginTop: '3px' }} />
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {/* ── 3. STATUS FILTERS & PRIORITY BAR ── */}
        <div style={{ padding: isMobile ? '8px 14px 0' : '10px 18px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Status Tabs */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px',
            scrollbarWidth: 'none'
          }}>
            {statusFilterTabs.map((tab) => {
              const isSelected = agendaFilter === tab.key;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setAgendaFilter(tab.key);
                    if (tab.key === 'overdue' && setCalSelectedDate) {
                      setCalSelectedDate(new Date());
                    }
                  }}
                  style={{
                    background: isSelected 
                      ? '#0D9488' 
                      : tab.isAlert && tab.count > 0 
                        ? 'rgba(239, 68, 68, 0.14)' 
                        : '#1E293B',
                    border: isSelected 
                      ? '1px solid #0D9488' 
                      : tab.isAlert && tab.count > 0 
                        ? '1px solid rgba(239, 68, 68, 0.35)' 
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    color: isSelected 
                      ? '#FFFFFF' 
                      : tab.isAlert && tab.count > 0 
                        ? '#F87171' 
                        : '#94A3B8',
                    borderRadius: '12px',
                    padding: '6px 12px',
                    fontSize: '0.76rem',
                    fontWeight: isSelected ? 800 : 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <TabIcon size={12} strokeWidth={isSelected ? 2.5 : 2} />
                  <span>{tab.label}</span>
                  <span style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '1px 5px',
                    fontSize: '0.66rem',
                    fontWeight: 700
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + Priority Filter row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <Search size={14} color="#64748B" style={{ position: 'absolute', left: '10px' }} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1E293B',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '7px 10px 7px 32px',
                  color: '#F8FAFC',
                  fontSize: '0.80rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {priorityFilterOptions.map((p) => {
                const isSelected = priorityFilter === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPriorityFilter(p.key)}
                    style={{
                      background: isSelected ? '#1E293B' : 'transparent',
                      border: isSelected ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#F8FAFC' : '#94A3B8',
                      borderRadius: '8px',
                      padding: '5px 8px',
                      fontSize: '0.70rem',
                      fontWeight: isSelected ? 700 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {p.dot && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: p.dot }} />}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── 4. QUICK ADD TASK BAR WITH BULLETPROOF SUBMISSION ── */}
        <div style={{ padding: isMobile ? '8px 14px 4px' : '10px 18px 4px' }}>
          <form 
            onSubmit={onSubmitTask}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#1E293B',
              border: inputError ? '1.5px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '14px',
              padding: '4px 6px 4px 12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            <input
              type="text"
              placeholder={`Add task for ${isSelectedDateToday ? 'today' : selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (e.g. Drink 2L water at 3 PM)...`}
              value={localTaskInput}
              onChange={(e) => {
                setLocalTaskInput(e.target.value);
                if (setNewTaskInput) setNewTaskInput(e.target.value);
                if (inputError) setInputError('');
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#F8FAFC',
                fontSize: '0.84rem',
                outline: 'none'
              }}
            />

            <button 
              type="submit" 
              style={{
                background: '#0D9488',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(13, 148, 136, 0.4)',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={14} strokeWidth={2.8} />
              <span>Add</span>
            </button>
          </form>

          {inputError && (
            <div style={{ color: '#F87171', fontSize: '0.72rem', marginTop: '4px', paddingLeft: '4px' }}>
              {inputError}
            </div>
          )}

          {/* Quick Suggestions */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '6px', scrollbarWidth: 'none' }}>
            {quickSuggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setLocalTaskInput(s.text);
                  if (setNewTaskInput) setNewTaskInput(s.text);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '3px 8px',
                  color: '#94A3B8',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 6. TASK LIST FOR CURRENT SELECTED DATE / FILTER ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '10px 12px 60px' : '10px 18px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* ── OVERDUE RECOVERY BANNER (Inside scrollable list so it never overlaps open edit forms) ── */}
          {overdueCount > 0 && agendaFilter !== 'completed' && (
            <div style={{
              margin: '0 0 2px 0',
              padding: '9px 12px',
              borderRadius: '14px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              boxSizing: 'border-box'
            }}>
              <div
                onClick={() => {
                  setAgendaFilter('overdue');
                  if (setCalSelectedDate) setCalSelectedDate(new Date());
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, cursor: 'pointer', flex: 1, overflow: 'hidden' }}
                title="Click to view all overdue tasks"
              >
                <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>⚠️</span>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#FCA5A5', whiteSpace: 'nowrap' }}>
                  {overdueCount} {overdueCount > 1 ? 'tasks are' : 'task is'} overdue
                </div>
                <span style={{ fontSize: '0.68rem', color: '#f87171', textDecoration: 'underline', marginLeft: '3px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  View All ↗
                </span>
              </div>
              <button
                type="button"
                onClick={handleRescheduleAllOverdue}
                style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                }}
              >
                Reschedule All ⚡
              </button>
            </div>
          )}
          {filteredTasks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '36px 16px',
              color: '#64748B',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B'
              }}>
                <CheckCircle2 size={22} />
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>
                {searchQuery ? `No tasks matching "${searchQuery}"` :
                 agendaFilter === 'today' ? `No pending tasks for ${isSelectedDateToday ? 'today' : selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}!` :
                 agendaFilter === 'overdue' ? '✨ No overdue tasks! All caught up.' :
                 agendaFilter === 'upcoming' ? 'No upcoming tasks scheduled.' :
                 agendaFilter === 'completed' ? 'No completed tasks yet.' :
                 'Your task stack is clear!'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Type in the box above or prompt Aether: "Remind me to drink water at 3 PM"
              </div>
            </div>
          ) : (
            filteredTasks.map(t => {
              const done = isTaskDone(t, agendaFilter === 'overdue' ? todayStr : selectedDateStr);
              const taskDateStr = getTaskDateStr(t);
              const overdue = agendaFilter === 'overdue' ? isTaskOverdue(t, todayStr) : isTaskOverdue(t, selectedDateStr);
              const daily = isDaily(t);
              const priorityAccent = getPriorityAccent(t.priority);
              const hasSubtasks = t.subtasks && t.subtasks.length > 0;
              const subtaskCount = hasSubtasks ? t.subtasks.length : 0;
              const completedSubCount = hasSubtasks 
                ? t.subtasks.filter(s => s.is_completed || s.status === 'completed' || s.completed).length 
                : 0;
              const subtaskPercent = subtaskCount > 0 ? Math.round((completedSubCount / subtaskCount) * 100) : 0;
              const isExpanded = localExpanded[t.id] !== undefined ? localExpanded[t.id] : expandedTaskIds[t.id];

              return (
                <div
                  key={t.id}
                  style={{
                    background: done 
                      ? 'rgba(30, 41, 59, 0.45)' 
                      : overdue 
                        ? 'rgba(30, 41, 59, 0.85)' 
                        : '#1E293B',
                    border: done 
                      ? '1px solid rgba(16, 185, 129, 0.15)' 
                      : overdue 
                        ? '1px solid rgba(239, 68, 68, 0.35)' 
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    borderBottom: `3px solid ${priorityAccent.border}`,
                    borderRadius: '16px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {editingTaskId === t.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '4px 0', width: '100%' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
                        ✏️ Edit Reminder
                      </div>
                      <div>
                        <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Reminder title..."
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            color: '#fff',
                            fontSize: '0.84rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Description / Notes</label>
                        <textarea
                          rows={2}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Add or update reminder description / details..."
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            color: '#cbd5e1',
                            fontSize: '0.80rem',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Reminder Time</label>
                          <input
                            type="text"
                            value={editReminderTime}
                            onChange={(e) => setEditReminderTime(e.target.value)}
                            placeholder="e.g. 5:00 PM"
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: '8px',
                              padding: '7px 9px',
                              color: '#fff',
                              fontSize: '0.80rem'
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '100px' }}>
                          <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Priority</label>
                          <button
                            type="button"
                            onClick={() => setShowPriorityPopup(true)}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              background: priorityMeta[editPriority]?.bg || 'rgba(251, 191, 36, 0.15)',
                              border: `1px solid ${priorityMeta[editPriority]?.border || 'rgba(251, 191, 36, 0.35)'}`,
                              borderRadius: '8px',
                              padding: '7px 9px',
                              color: priorityMeta[editPriority]?.color || '#fbbf24',
                              fontSize: '0.80rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Click to change priority"
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span>{priorityMeta[editPriority]?.dot || '🟡'}</span>
                              <span>{priorityMeta[editPriority]?.label || 'Medium'}</span>
                            </span>
                            <ChevronDown size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Completion Comment / Note in Edit View */}
                      <div>
                        <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                          <MessageSquare size={11} color="#38bdf8" />
                          <span>Completion Note / Comment</span>
                        </label>
                        <textarea
                          rows={2}
                          value={editCompletionComment}
                          onChange={(e) => setEditCompletionComment(e.target.value)}
                          placeholder="e.g. Completed today, sent report, payment ref #..."
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            color: '#e0f2fe',
                            fontSize: '0.80rem',
                            resize: 'vertical'
                          }}
                        />
                      </div>

                      {/* Attachments in Edit View */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Paperclip size={11} color="#38bdf8" />
                            <span>Attachments (Photos, Receipts, Docs)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current && editFileInputRef.current.click()}
                            style={{
                              background: 'rgba(56, 189, 248, 0.12)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '0.70rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Upload size={11} /> + Attach File
                          </button>
                        </div>
                        <input
                          type="file"
                          ref={editFileInputRef}
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileUploadHelper(e, setEditAttachments)}
                        />
                        {editAttachments.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {editAttachments.map(att => {
                              const isImg = att.type?.startsWith('image/') || (att.data && att.data.startsWith('data:image/'));
                              return (
                                <div
                                  key={att.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '8px',
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                    color: '#cbd5e1'
                                  }}
                                >
                                  {isImg ? (
                                    <img src={att.data} alt={att.name} style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }} />
                                  ) : (
                                    <FileText size={12} color="#38bdf8" />
                                  )}
                                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {att.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditAttachments(prev => prev.filter(x => x.id !== att.id))}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px', fontSize: '0.8rem', lineHeight: 1 }}
                                    title="Remove attachment"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* LATEST UI TASK PRIORITY POPUP MODAL */}
                      {showPriorityPopup && (
                        <div
                          style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.82)',
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                            zIndex: 260,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                          }}
                          onClick={() => setShowPriorityPopup(false)}
                        >
                          <div
                            style={{
                              background: '#0d1527',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              borderRadius: '24px',
                              padding: '22px',
                              width: '100%',
                              maxWidth: '360px',
                              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.15)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px',
                              animation: 'fadeIn 0.18s ease'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                                  Select Priority
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                                  Set urgency level for this reminder
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowPriorityPopup(false)}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  border: 'none',
                                  color: '#94a3b8',
                                  borderRadius: '50%',
                                  width: '30px',
                                  height: '30px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                ✕
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {Object.entries(priorityMeta).map(([pKey, pInfo]) => {
                                const isSelected = editPriority === pKey;
                                return (
                                  <div
                                    key={pKey}
                                    onClick={() => {
                                      setEditPriority(pKey);
                                      setShowPriorityPopup(false);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '12px 14px',
                                      borderRadius: '14px',
                                      background: isSelected ? pInfo.bg : 'rgba(255, 255, 255, 0.03)',
                                      border: `1px solid ${isSelected ? pInfo.border : 'rgba(255, 255, 255, 0.06)'}`,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ fontSize: '1.2rem' }}>{pInfo.dot}</span>
                                      <div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isSelected ? pInfo.color : '#f1f5f9' }}>
                                          {pInfo.label}
                                        </div>
                                        <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
                                          {pInfo.desc}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      border: `2px solid ${isSelected ? pInfo.color : 'rgba(255, 255, 255, 0.25)'}`,
                                      background: isSelected ? pInfo.color : 'transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      {isSelected && <Check size={12} color="#080c16" strokeWidth={3} />}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={handleCancelEditTask}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            color: '#94a3b8',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit || !editTitle.trim()}
                          onClick={() => handleSaveTaskEdit(t.id)}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            color: '#fff',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isSavingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : isMobile ? (
                    /* ── MOBILE OPTIMIZED PARENT TASK CARD ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      
                      {/* Top Row: Checkbox + Full-width Title + Delete / GCal */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                        <div
                          onClick={() => !t.is_google_calendar && onToggleTaskInternal(t)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '8px',
                            border: done 
                              ? '2px solid #10B981' 
                              : overdue 
                                ? '2px solid #EF4444' 
                                : '2px solid #475569',
                            background: done ? '#10B981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: t.is_google_calendar ? 'default' : 'pointer',
                            flexShrink: 0,
                            marginTop: '2px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {done && <Check size={15} color="#FFFFFF" strokeWidth={3.2} />}
                        </div>

                        <div style={{
                          flex: 1,
                          minWidth: 0,
                          color: done ? '#64748B' : '#F8FAFC',
                          fontSize: '0.94rem',
                          fontWeight: 600,
                          textDecoration: done ? 'line-through' : 'none',
                          wordBreak: 'break-word',
                          lineHeight: 1.35
                        }}>
                          {t.title}
                        </div>

                        {t.is_google_calendar ? (
                          t.htmlLink && (
                            <button
                              type="button"
                              onClick={() => window.open(t.htmlLink, '_blank', 'noopener,noreferrer')}
                              style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                              title="Open in GCal"
                            >
                              <ExternalLink size={15} />
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              opacity: 0.65,
                              cursor: 'pointer',
                              padding: '4px',
                              flexShrink: 0
                            }}
                            title="Delete task"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Optional Description */}
                      {t.description && (
                        <div style={{
                          color: done ? '#64748B' : '#94A3B8',
                          fontSize: '0.78rem',
                          marginLeft: '34px',
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          borderLeft: '2px solid rgba(13, 148, 136, 0.4)'
                        }}>
                          {t.description}
                        </div>
                      )}

                      {/* Completion Comment / Note Display */}
                      {t.completion_comment && (
                        <div style={{
                          color: '#e0f2fe',
                          fontSize: '0.78rem',
                          marginLeft: '34px',
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                          background: 'rgba(56, 189, 248, 0.08)',
                          padding: '5px 9px',
                          borderRadius: '8px',
                          borderLeft: '3px solid #38bdf8',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px'
                        }}>
                          <MessageSquare size={13} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ color: '#38bdf8', fontSize: '0.70rem', fontWeight: 700, display: 'block', marginBottom: '1px' }}>
                              Completion Note:
                            </span>
                            {t.completion_comment}
                          </div>
                        </div>
                      )}

                      {/* Attachments Display */}
                      {parseAttachments(t.attachments).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginLeft: '34px' }}>
                          {parseAttachments(t.attachments).map(att => {
                            const isImg = att.type?.startsWith('image/') || (att.data && att.data.startsWith('data:image/'));
                            return (
                              <div
                                key={att.id}
                                onClick={() => isImg ? setPreviewImage(att) : handleDownloadAttachment(att)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  borderRadius: '8px',
                                  padding: '3px 8px',
                                  fontSize: '0.72rem',
                                  color: '#cbd5e1',
                                  cursor: 'pointer',
                                  maxWidth: '200px'
                                }}
                                title={isImg ? "Click to view photo" : "Click to download file"}
                              >
                                {isImg ? (
                                  <img src={att.data} alt={att.name} style={{ width: '16px', height: '16px', borderRadius: '3px', objectFit: 'cover' }} />
                                ) : (
                                  <FileText size={12} color="#38bdf8" />
                                )}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Metadata row with Clean Wrapping */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '34px', flexWrap: 'wrap' }}>
                        
                        <span style={{
                          color: done ? '#64748B' : overdue ? '#F87171' : '#94A3B8',
                          fontSize: '0.70rem',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}>
                          <Clock size={11} color={done ? '#64748B' : overdue ? '#F87171' : '#0D9488'} />
                          <span>
                            {overdue && '⚠️ '}
                            {t.reminder_time 
                              ? (overdue ? `Overdue - ${t.reminder_time}` : t.reminder_time)
                              : (taskDateStr || 'Anytime')}
                          </span>
                        </span>

                        <span style={{
                          background: done ? 'rgba(16, 185, 129, 0.16)' : overdue ? 'rgba(239, 68, 68, 0.18)' : 'rgba(13, 148, 136, 0.16)',
                          color: done ? '#34D399' : overdue ? '#EF4444' : '#0D9488',
                          border: done ? '1px solid rgba(16, 185, 129, 0.3)' : overdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(13, 148, 136, 0.3)',
                          borderRadius: '6px',
                          padding: '1px 6px',
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}>
                          {done ? '✓ Completed' : overdue ? '⚠️ Overdue' : '⏳ Pending'}
                        </span>

                        {daily && (
                          <span style={{
                            background: 'rgba(168, 85, 247, 0.14)',
                            color: '#C084FC',
                            border: '1px solid rgba(168, 85, 247, 0.28)',
                            borderRadius: '6px',
                            padding: '1px 6px',
                            fontSize: '0.64rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            whiteSpace: 'nowrap'
                          }}>
                            <Repeat size={10} />
                            <span>Daily{t.reminder_time ? ` at ${t.reminder_time}` : ''}</span>
                          </span>
                        )}

                        {t.priority && (
                          <span style={{
                            background: priorityAccent.bg,
                            color: priorityAccent.color,
                            border: `1px solid ${priorityAccent.color}40`,
                            borderRadius: '6px',
                            padding: '1px 6px',
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            whiteSpace: 'nowrap'
                          }}>
                            {t.priority}
                          </span>
                        )}

                        {t.is_google_calendar && (
                          <span style={{
                            background: 'rgba(66, 133, 244, 0.16)',
                            color: '#60A5FA',
                            border: '1px solid rgba(66, 133, 244, 0.3)',
                            borderRadius: '6px',
                            padding: '1px 6px',
                            fontSize: '0.64rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            GCal
                          </span>
                        )}

                        {hasSubtasks && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(t.id);
                            }}
                            style={{
                              background: completedSubCount === subtaskCount ? 'rgba(16, 185, 129, 0.16)' : 'rgba(56, 189, 248, 0.14)',
                              border: completedSubCount === subtaskCount ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)',
                              color: completedSubCount === subtaskCount ? '#34d399' : '#38bdf8',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                            title="Click to view/hide subtasks"
                          >
                            <span>📁 {completedSubCount}/{subtaskCount} Subtasks ({subtaskPercent}%)</span>
                            {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </button>
                        )}
                      </div>

                      {/* Mobile Dedicated Clean Action Toolbar */}
                      {!t.is_google_calendar && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginLeft: '34px',
                          marginTop: '2px',
                          flexWrap: 'wrap'
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTaskId(null);
                              setAddingSubtaskParentId(t.id);
                              setLocalExpanded(prev => ({ ...prev, [t.id]: true }));
                              setSubtaskTitle('');
                              setSubtaskTime('');
                            }}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              color: '#38bdf8',
                              borderRadius: '7px',
                              cursor: 'pointer',
                              padding: '5px 9px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.70rem',
                              fontWeight: 600
                            }}
                            title="Add subtask to this task"
                          >
                            <Plus size={12} />
                            <span>Subtask</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCompletionPromptTask(t);
                              setPromptComment(t.completion_comment || '');
                              setPromptAttachments(parseAttachments(t.attachments));
                            }}
                            style={{
                              background: (t.completion_comment || (t.attachments && t.attachments !== '[]')) ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                              border: (t.completion_comment || (t.attachments && t.attachments !== '[]')) ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                              color: (t.completion_comment || (t.attachments && t.attachments !== '[]')) ? '#38bdf8' : '#94a3b8',
                              borderRadius: '7px',
                              cursor: 'pointer',
                              padding: '5px 9px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.70rem',
                              fontWeight: 600
                            }}
                            title="Add or view completion note & attachments"
                          >
                            <MessageSquare size={12} />
                            <span>{(t.completion_comment || (t.attachments && t.attachments !== '[]')) ? 'Note/📎' : '+ Note'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAddingSubtaskParentId(null);
                              handleStartEditTask(t);
                            }}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              color: '#38bdf8',
                              borderRadius: '7px',
                              cursor: 'pointer',
                              padding: '5px 9px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.70rem',
                              fontWeight: 600
                            }}
                            title="Edit reminder / description"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── DESKTOP PARENT TASK CARD ── */
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      
                      {/* Squircle Checkbox with Date-Aware Toggle */}
                      <div
                        onClick={() => !t.is_google_calendar && onToggleTaskInternal(t)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '8px',
                          border: done 
                            ? '2px solid #10B981' 
                            : overdue 
                              ? '2px solid #EF4444' 
                              : '2px solid #475569',
                          background: done ? '#10B981' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: t.is_google_calendar ? 'default' : 'pointer',
                          flexShrink: 0,
                          marginTop: '2px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {done && <Check size={15} color="#FFFFFF" strokeWidth={3.2} />}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: done ? '#64748B' : '#F8FAFC',
                          fontSize: '0.92rem',
                          fontWeight: 600,
                          textDecoration: done ? 'line-through' : 'none',
                          wordBreak: 'break-word',
                          lineHeight: 1.35
                        }}>
                          {t.title}
                        </div>

                        {t.description && (
                          <div style={{
                            color: done ? '#64748B' : '#94A3B8',
                            fontSize: '0.78rem',
                            marginTop: '4px',
                            lineHeight: 1.4,
                            wordBreak: 'break-word',
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            borderLeft: '2px solid rgba(13, 148, 136, 0.4)'
                          }}>
                            {t.description}
                          </div>
                        )}

                        {/* Completion Comment / Note Display */}
                        {t.completion_comment && (
                          <div style={{
                            color: '#e0f2fe',
                            fontSize: '0.78rem',
                            marginTop: '5px',
                            lineHeight: 1.4,
                            wordBreak: 'break-word',
                            background: 'rgba(56, 189, 248, 0.08)',
                            padding: '5px 9px',
                            borderRadius: '8px',
                            borderLeft: '3px solid #38bdf8',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '6px'
                          }}>
                            <MessageSquare size={13} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <span style={{ color: '#38bdf8', fontSize: '0.70rem', fontWeight: 700, display: 'block', marginBottom: '1px' }}>
                                Completion Note:
                              </span>
                              {t.completion_comment}
                            </div>
                          </div>
                        )}

                        {/* Attachments Display */}
                        {parseAttachments(t.attachments).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {parseAttachments(t.attachments).map(att => {
                              const isImg = att.type?.startsWith('image/') || (att.data && att.data.startsWith('data:image/'));
                              return (
                                <div
                                  key={att.id}
                                  onClick={() => isImg ? setPreviewImage(att) : handleDownloadAttachment(att)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '8px',
                                    padding: '3px 8px',
                                    fontSize: '0.72rem',
                                    color: '#cbd5e1',
                                    cursor: 'pointer',
                                    maxWidth: '220px',
                                    transition: 'background 0.15s ease'
                                  }}
                                  title={isImg ? "Click to view photo" : "Click to download file"}
                                >
                                  {isImg ? (
                                    <img src={att.data} alt={att.name} style={{ width: '16px', height: '16px', borderRadius: '3px', objectFit: 'cover' }} />
                                  ) : (
                                    <FileText size={12} color="#38bdf8" />
                                  )}
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                  {att.size && <span style={{ color: '#64748b', fontSize: '0.64rem' }}>({Math.round(att.size / 1024)}KB)</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Metadata row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
                          
                          <span style={{
                            color: done ? '#64748B' : overdue ? '#F87171' : '#94A3B8',
                            fontSize: '0.70rem',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap'
                          }}>
                            <Clock size={11} color={done ? '#64748B' : overdue ? '#F87171' : '#0D9488'} />
                            <span>
                              {overdue && '⚠️ '}
                              {t.reminder_time 
                                ? (overdue ? `Overdue - ${t.reminder_time}` : t.reminder_time)
                                : (taskDateStr || 'Anytime')}
                            </span>
                          </span>

                          <span style={{
                            background: done ? 'rgba(16, 185, 129, 0.16)' : overdue ? 'rgba(239, 68, 68, 0.18)' : 'rgba(13, 148, 136, 0.16)',
                            color: done ? '#34D399' : overdue ? '#EF4444' : '#0D9488',
                            border: done ? '1px solid rgba(16, 185, 129, 0.3)' : overdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(13, 148, 136, 0.3)',
                            borderRadius: '6px',
                            padding: '1px 6px',
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}>
                            {done ? '✓ Completed' : overdue ? '⚠️ Overdue' : '⏳ Pending'}
                          </span>

                          {daily && (
                            <span style={{
                              background: 'rgba(168, 85, 247, 0.14)',
                              color: '#C084FC',
                              border: '1px solid rgba(168, 85, 247, 0.28)',
                              borderRadius: '6px',
                              padding: '1px 6px',
                              fontSize: '0.64rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              whiteSpace: 'nowrap'
                            }}>
                              <Repeat size={10} />
                              <span>Daily{t.reminder_time ? ` at ${t.reminder_time}` : ''}</span>
                            </span>
                          )}

                          {t.priority && (
                            <span style={{
                              background: priorityAccent.bg,
                              color: priorityAccent.color,
                              border: `1px solid ${priorityAccent.color}40`,
                              borderRadius: '6px',
                              padding: '1px 6px',
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              whiteSpace: 'nowrap'
                            }}>
                              {t.priority}
                            </span>
                          )}

                          {t.is_google_calendar && (
                            <span style={{
                              background: 'rgba(66, 133, 244, 0.16)',
                              color: '#60A5FA',
                              border: '1px solid rgba(66, 133, 244, 0.3)',
                              borderRadius: '6px',
                              padding: '1px 6px',
                              fontSize: '0.64rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}>
                              GCal
                            </span>
                          )}

                          {hasSubtasks && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(t.id);
                              }}
                              style={{
                                background: completedSubCount === subtaskCount ? 'rgba(16, 185, 129, 0.16)' : 'rgba(56, 189, 248, 0.14)',
                                border: completedSubCount === subtaskCount ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)',
                                color: completedSubCount === subtaskCount ? '#34d399' : '#38bdf8',
                                borderRadius: '6px',
                                padding: '1px 7px',
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}
                              title="Click to view/hide subtasks"
                            >
                              <span>📁 {completedSubCount}/{subtaskCount} Subtasks ({subtaskPercent}%)</span>
                              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {!t.is_google_calendar && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTaskId(null);
                              setAddingSubtaskParentId(t.id);
                              setLocalExpanded(prev => ({ ...prev, [t.id]: true }));
                              setSubtaskTitle('');
                              setSubtaskTime('');
                            }}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              color: '#38bdf8',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              padding: '4px 7px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}
                            title="Add subtask to this task"
                          >
                            <Plus size={11} />
                            <span>Subtask</span>
                          </button>
                        )}

                        {!t.is_google_calendar && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setCompletionPromptTask(t);
                                setPromptComment(t.completion_comment || '');
                                setPromptAttachments(parseAttachments(t.attachments));
                              }}
                              style={{
                                background: (t.completion_comment || (t.attachments && t.attachments !== '[]')) ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                border: (t.completion_comment || (t.attachments && t.attachments !== '[]')) ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                                color: (t.completion_comment || (t.attachments && t.attachments !== '[]')) ? '#38bdf8' : '#94a3b8',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                padding: '4px 7px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                              }}
                              title="Add or view completion note & attachments"
                            >
                              <MessageSquare size={11} />
                              <span>{(t.completion_comment || (t.attachments && t.attachments !== '[]')) ? 'Note/📎' : '+ Note'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddingSubtaskParentId(null);
                                handleStartEditTask(t);
                              }}
                              style={{
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                color: '#38bdf8',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                padding: '4px 7px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                              }}
                              title="Edit reminder / description"
                            >
                              <Edit3 size={11} />
                              <span>Edit</span>
                            </button>
                          </>
                        )}

                        {t.is_google_calendar ? (
                          t.htmlLink && (
                            <button
                              type="button"
                              onClick={() => window.open(t.htmlLink, '_blank', 'noopener,noreferrer')}
                              style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: '4px' }}
                              title="Open in GCal"
                            >
                              <ExternalLink size={14} />
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              opacity: 0.6,
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Delete task"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                    </div>
                  )}

                  {/* Inline Expanded Subtasks (Todoist Hierarchy Style) */}
                  {isExpanded && (hasSubtasks || addingSubtaskParentId === t.id) && (
                    <div style={{
                      marginTop: '8px',
                      paddingLeft: isMobile ? '8px' : '22px',
                      borderLeft: '2px solid rgba(56, 189, 248, 0.25)',
                      marginLeft: isMobile ? '4px' : '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '7px',
                      paddingTop: '6px'
                    }}>
                      {/* Full-width Subtasks Progress Bar (Todoist Style) */}
                      {hasSubtasks && (
                        <div style={{ marginBottom: '4px', background: 'rgba(56, 189, 248, 0.04)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '8px', padding: '6px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.70rem' }}>
                            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Subtasks Progress</span>
                            <span style={{ color: completedSubCount === subtaskCount ? '#34d399' : '#38bdf8', fontWeight: 700 }}>
                              {completedSubCount} of {subtaskCount} completed ({subtaskPercent}%)
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${subtaskPercent}%`, 
                                height: '100%', 
                                background: subtaskPercent === 100 
                                  ? 'linear-gradient(90deg, #10b981, #34d399)' 
                                  : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                                borderRadius: '2px',
                                transition: 'width 0.25s ease'
                              }} 
                            />
                          </div>
                        </div>
                      )}

                      {/* Subtasks List */}
                      {hasSubtasks && t.subtasks.map((st, idx) => {
                        const stDone = st.is_completed || st.status === 'completed' || st.completed;
                        const stPriority = st.priority || 'medium';
                        const stPriorityInfo = priorityMeta[stPriority] || priorityMeta.medium;
                        const stAttachments = parseAttachments(st.attachments);

                        {/* Inline Edit Form for Subtask */}
                        if (editingTaskId === st.id) {
                          return (
                            <div
                              key={st.id || idx}
                              style={{
                                background: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid rgba(56, 189, 248, 0.4)',
                                borderRadius: '12px',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
                              }}
                            >
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Edit3 size={13} />
                                <span>Edit Subtask</span>
                              </div>

                              {/* Title input */}
                              <div>
                                <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Subtask Title</label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  placeholder="Subtask title..."
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(56, 189, 248, 0.4)',
                                    borderRadius: '8px',
                                    padding: '7px 10px',
                                    color: '#fff',
                                    fontSize: '0.82rem',
                                    outline: 'none'
                                  }}
                                  autoFocus
                                />
                              </div>

                              {/* Time & Priority Row */}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '120px' }}>
                                  <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Reminder Time</label>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '6px 8px' }}>
                                    <Clock size={12} color="#38bdf8" />
                                    <input
                                      type="text"
                                      value={editReminderTime}
                                      onChange={(e) => setEditReminderTime(e.target.value)}
                                      placeholder="e.g. 10:00 PM"
                                      style={{
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#fff',
                                        fontSize: '0.78rem',
                                        outline: 'none'
                                      }}
                                    />
                                  </div>
                                </div>

                                <div style={{ flex: 1, minWidth: '140px' }}>
                                  <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Priority</label>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {['low', 'medium', 'high', 'urgent'].map(pKey => (
                                      <button
                                        key={pKey}
                                        type="button"
                                        onClick={() => setEditPriority(pKey)}
                                        style={{
                                          background: editPriority === pKey ? priorityMeta[pKey].bg : 'rgba(255, 255, 255, 0.04)',
                                          border: `1px solid ${editPriority === pKey ? priorityMeta[pKey].border : 'rgba(255, 255, 255, 0.08)'}`,
                                          color: editPriority === pKey ? priorityMeta[pKey].color : '#94a3b8',
                                          borderRadius: '6px',
                                          padding: '4px 6px',
                                          fontSize: '0.66rem',
                                          cursor: 'pointer',
                                          fontWeight: 600,
                                          flex: 1,
                                          textAlign: 'center'
                                        }}
                                      >
                                        <span>{priorityMeta[pKey].dot}</span> {priorityMeta[pKey].label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Note / Comment */}
                              <div>
                                <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                                  <MessageSquare size={11} color="#38bdf8" />
                                  <span>Note / Comment</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={editCompletionComment}
                                  onChange={(e) => setEditCompletionComment(e.target.value)}
                                  placeholder="Add note for this subtask..."
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(56, 189, 248, 0.25)',
                                    borderRadius: '8px',
                                    padding: '6px 8px',
                                    color: '#e0f2fe',
                                    fontSize: '0.78rem',
                                    resize: 'vertical',
                                    outline: 'none'
                                  }}
                                />
                              </div>

                              {/* Attachments for Subtask in Edit mode */}
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                                  <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Paperclip size={11} color="#38bdf8" />
                                    <span>Attachments</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => subtaskEditFileInputRef.current && subtaskEditFileInputRef.current.click()}
                                    style={{
                                      background: 'rgba(56, 189, 248, 0.12)',
                                      border: '1px solid rgba(56, 189, 248, 0.3)',
                                      color: '#38bdf8',
                                      borderRadius: '6px',
                                      padding: '2px 7px',
                                      fontSize: '0.68rem',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                  >
                                    <Upload size={10} /> + Attach
                                  </button>
                                </div>
                                <input
                                  type="file"
                                  ref={subtaskEditFileInputRef}
                                  multiple
                                  accept="image/*,.pdf,.doc,.docx,.txt"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleFileUploadHelper(e, setEditAttachments)}
                                />
                                {editAttachments.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                    {editAttachments.map(att => (
                                      <div
                                        key={att.id}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          background: 'rgba(255, 255, 255, 0.08)',
                                          border: '1px solid rgba(255, 255, 255, 0.15)',
                                          borderRadius: '6px',
                                          padding: '2px 6px',
                                          fontSize: '0.68rem',
                                          color: '#cbd5e1'
                                        }}
                                      >
                                        <FileText size={10} color="#38bdf8" />
                                        <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => setEditAttachments(prev => prev.filter(x => x.id !== att.id))}
                                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px' }}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Buttons */}
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                                <button
                                  type="button"
                                  onClick={handleCancelEditTask}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: 'none',
                                    color: '#94a3b8',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingEdit || !editTitle.trim()}
                                  onClick={() => handleSaveTaskEdit(st.id)}
                                  style={{
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '5px 14px',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {isSavingEdit ? 'Saving...' : 'Save Subtask'}
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={st.id || idx}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '5px',
                              background: stDone ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)',
                              border: stDone ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255, 255, 255, 0.09)',
                              borderLeft: `3px solid ${stPriorityInfo.color}`,
                              padding: '8px 10px',
                              borderRadius: '10px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isMobile ? (
                              /* ── MOBILE SUBTASK LAYOUT: 2 Clean Rows ── */
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
                                {/* Row 1: Checkbox + Full-width Subtask Title + Edit & Delete Icons */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                  <div 
                                    onClick={() => onToggleTaskInternal(st)}
                                    style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                                  >
                                    <div style={{
                                      width: '18px',
                                      height: '18px',
                                      borderRadius: '5px',
                                      border: stDone ? '1.5px solid #10B981' : '1.5px solid #475569',
                                      background: stDone ? '#10B981' : 'transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      marginTop: '2px'
                                    }}>
                                      {stDone && <Check size={11} color="#FFF" strokeWidth={3} />}
                                    </div>
                                    <span style={{
                                      color: stDone ? '#64748B' : '#E2E8F0',
                                      fontSize: '0.84rem',
                                      fontWeight: 500,
                                      textDecoration: stDone ? 'line-through' : 'none',
                                      wordBreak: 'break-word',
                                      lineHeight: 1.35
                                    }}>
                                      {st.title}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddingSubtaskParentId(null);
                                        handleStartEditTask(st);
                                      }}
                                      style={{
                                        background: 'rgba(56, 189, 248, 0.1)',
                                        border: '1px solid rgba(56, 189, 248, 0.25)',
                                        color: '#38bdf8',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        padding: '3px 6px',
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                      }}
                                      title="Edit subtask"
                                    >
                                      <Edit3 size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTask(st.id);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#EF4444',
                                        opacity: 0.6,
                                        cursor: 'pointer',
                                        padding: '3px'
                                      }}
                                      title="Delete subtask"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                {/* Row 2: Metadata & Quick Note (indented under title) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '26px', flexWrap: 'wrap' }}>
                                  {st.reminder_time && (
                                    <span style={{
                                      color: '#38bdf8',
                                      fontSize: '0.66rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                      background: 'rgba(56, 189, 248, 0.12)',
                                      border: '1px solid rgba(56, 189, 248, 0.25)',
                                      borderRadius: '4px',
                                      padding: '1px 5px',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      <Clock size={10} />
                                      <span>{st.reminder_time}</span>
                                    </span>
                                  )}

                                  <span style={{
                                    color: stPriorityInfo.color,
                                    background: stPriorityInfo.bg,
                                    border: `1px solid ${stPriorityInfo.border}`,
                                    borderRadius: '4px',
                                    padding: '1px 5px',
                                    fontSize: '0.64rem',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {stPriorityInfo.dot} {stPriorityInfo.label}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCompletionPromptTask(st);
                                      setPromptComment(st.completion_comment || '');
                                      setPromptAttachments(parseAttachments(st.attachments));
                                    }}
                                    style={{
                                      background: (st.completion_comment || (st.attachments && st.attachments !== '[]')) ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                                      border: (st.completion_comment || (st.attachments && st.attachments !== '[]')) ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                                      color: (st.completion_comment || (st.attachments && st.attachments !== '[]')) ? '#38bdf8' : '#94a3b8',
                                      borderRadius: '5px',
                                      cursor: 'pointer',
                                      padding: '2px 6px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontSize: '0.66rem',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Note / Attachments"
                                  >
                                    <MessageSquare size={10} />
                                    <span>{(st.completion_comment || (st.attachments && st.attachments !== '[]')) ? 'Note/📎' : '+ Note'}</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* ── DESKTOP SUBTASK LAYOUT ── */
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div 
                                  onClick={() => onToggleTaskInternal(st)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                                >
                                  <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '5px',
                                    border: stDone ? '1.5px solid #10B981' : '1.5px solid #475569',
                                    background: stDone ? '#10B981' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {stDone && <Check size={11} color="#FFF" strokeWidth={3} />}
                                  </div>
                                  <span style={{
                                    color: stDone ? '#64748B' : '#E2E8F0',
                                    fontSize: '0.82rem',
                                    fontWeight: 500,
                                    textDecoration: stDone ? 'line-through' : 'none',
                                    wordBreak: 'break-word',
                                    lineHeight: 1.3
                                  }}>
                                    {st.title}
                                  </span>
                                </div>

                                {/* Subtask Meta Chips & Quick Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                  {st.reminder_time && (
                                    <span style={{
                                      color: '#38bdf8',
                                      fontSize: '0.66rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                      background: 'rgba(56, 189, 248, 0.12)',
                                      border: '1px solid rgba(56, 189, 248, 0.25)',
                                      borderRadius: '4px',
                                      padding: '1px 5px',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      <Clock size={10} />
                                      <span>{st.reminder_time}</span>
                                    </span>
                                  )}

                                  <span style={{
                                    color: stPriorityInfo.color,
                                    background: stPriorityInfo.bg,
                                    border: `1px solid ${stPriorityInfo.border}`,
                                    borderRadius: '4px',
                                    padding: '1px 5px',
                                    fontSize: '0.64rem',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {stPriorityInfo.dot} {stPriorityInfo.label}
                                  </span>

                                  {/* Subtask Note / Attach button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCompletionPromptTask(st);
                                      setPromptComment(st.completion_comment || '');
                                      setPromptAttachments(parseAttachments(st.attachments));
                                    }}
                                    style={{
                                      background: (st.completion_comment || (st.attachments && st.attachments !== '[]')) ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                      border: (st.completion_comment || (st.attachments && st.attachments !== '[]')) ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                                      color: (st.completion_comment || (st.attachments && st.attachments !== '[]')) ? '#38bdf8' : '#94a3b8',
                                      borderRadius: '5px',
                                      cursor: 'pointer',
                                      padding: '2px 5px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                      fontSize: '0.64rem',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Note / Attachments"
                                  >
                                    <MessageSquare size={10} />
                                    <span>{(st.completion_comment || (st.attachments && st.attachments !== '[]')) ? 'Note/📎' : '+ Note'}</span>
                                  </button>

                                  {/* Subtask Edit button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddingSubtaskParentId(null);
                                      handleStartEditTask(st);
                                    }}
                                    style={{
                                      background: 'rgba(56, 189, 248, 0.08)',
                                      border: '1px solid rgba(56, 189, 248, 0.2)',
                                      color: '#38bdf8',
                                      borderRadius: '5px',
                                      cursor: 'pointer',
                                      padding: '2px 5px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                      fontSize: '0.64rem',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Edit subtask"
                                  >
                                    <Edit3 size={10} />
                                  </button>

                                  {/* Subtask Delete button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(st.id);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#EF4444',
                                      opacity: 0.5,
                                      cursor: 'pointer',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title="Delete subtask"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Subtask Note Display */}
                            {st.completion_comment && (
                              <div style={{
                                fontSize: '0.72rem',
                                color: '#e0f2fe',
                                background: 'rgba(56, 189, 248, 0.06)',
                                borderRadius: '6px',
                                padding: '3px 7px',
                                marginLeft: '26px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '5px'
                              }}>
                                <MessageSquare size={11} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                                <span>{st.completion_comment}</span>
                              </div>
                            )}

                            {/* Subtask Attachments Display */}
                            {stAttachments.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginLeft: '26px', marginTop: '2px' }}>
                                {stAttachments.map(att => {
                                  const isImg = att.type?.startsWith('image/') || (att.data && att.data.startsWith('data:image/'));
                                  return (
                                    <div
                                      key={att.id}
                                      onClick={() => isImg ? setPreviewImage(att) : handleDownloadAttachment(att)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '6px',
                                        padding: '2px 6px',
                                        fontSize: '0.66rem',
                                        color: '#cbd5e1',
                                        cursor: 'pointer'
                                      }}
                                      title={isImg ? "View image" : "Download file"}
                                    >
                                      {isImg ? (
                                        <img src={att.data} alt={att.name} style={{ width: '14px', height: '14px', borderRadius: '3px', objectFit: 'cover' }} />
                                      ) : (
                                        <FileText size={10} color="#38bdf8" />
                                      )}
                                      <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Todoist-Style Inline Add Subtask Row / Form */}
                      {addingSubtaskParentId === t.id ? (
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          marginTop: '4px',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                        }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8' }}>
                            + New Subtask for "{t.title}"
                          </div>
                          <input
                            type="text"
                            value={subtaskTitle}
                            onChange={(e) => setSubtaskTitle(e.target.value)}
                            placeholder="Subtask name (e.g. D-Mart Grocery, Call client at 5 PM)..."
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: '8px',
                              padding: '7px 10px',
                              color: '#fff',
                              fontSize: '0.80rem',
                              outline: 'none'
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddSubtaskSubmit(t.id);
                              if (e.key === 'Escape') setAddingSubtaskParentId(null);
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* Time input */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', padding: '3px 8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                              <Clock size={12} color="#38bdf8" />
                              <input
                                type="text"
                                value={subtaskTime}
                                onChange={(e) => setSubtaskTime(e.target.value)}
                                placeholder="Time (e.g. 5:00 PM)"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#fff',
                                  fontSize: '0.74rem',
                                  width: '110px',
                                  outline: 'none'
                                }}
                              />
                            </div>
                            {/* Priority selector */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {['low', 'medium', 'high', 'urgent'].map(pKey => (
                                <button
                                  key={pKey}
                                  type="button"
                                  onClick={() => setSubtaskPriority(pKey)}
                                  style={{
                                    background: subtaskPriority === pKey ? priorityMeta[pKey].bg : 'rgba(255, 255, 255, 0.04)',
                                    border: `1px solid ${subtaskPriority === pKey ? priorityMeta[pKey].border : 'rgba(255, 255, 255, 0.08)'}`,
                                    color: subtaskPriority === pKey ? priorityMeta[pKey].color : '#94a3b8',
                                    borderRadius: '6px',
                                    padding: '2px 7px',
                                    fontSize: '0.68rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <span>{priorityMeta[pKey].dot}</span> {priorityMeta[pKey].label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setAddingSubtaskParentId(null);
                                setSubtaskTitle('');
                                setSubtaskTime('');
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                color: '#94a3b8',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSubmittingSubtask || !subtaskTitle.trim()}
                              onClick={() => handleAddSubtaskSubmit(t.id)}
                              style={{
                                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                border: 'none',
                                color: '#fff',
                                padding: '5px 14px',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {isSubmittingSubtask ? 'Adding...' : 'Add Subtask'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTaskId(null);
                            setAddingSubtaskParentId(t.id);
                            setSubtaskTitle('');
                            setSubtaskTime('');
                            setLocalExpanded(prev => ({ ...prev, [t.id]: true }));
                          }}
                          style={{
                            background: 'rgba(56, 189, 248, 0.08)',
                            border: '1px dashed rgba(56, 189, 248, 0.35)',
                            color: '#38bdf8',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            justifyContent: 'center',
                            marginTop: '2px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Plus size={13} />
                          <span>Add subtask</span>
                        </button>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      {/* Task Completion Note & Attachment Sheet / Dialog */}
      {completionPromptTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setCompletionPromptTask(null)}
        >
          <div
            style={{
              background: '#0d1527',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '24px',
              padding: '22px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              animation: 'fadeIn 0.18s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🎉</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                    Task Completed!
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px', fontWeight: 500 }}>
                  "{completionPromptTask.title}"
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletionPromptTask(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Note text area */}
            <div>
              <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', fontWeight: 600 }}>
                <MessageSquare size={13} color="#38bdf8" />
                <span>Add Note / Comment (Optional)</span>
              </label>
              <textarea
                rows={3}
                value={promptComment}
                onChange={(e) => setPromptComment(e.target.value)}
                placeholder="e.g. Completed today, sent invoice to client, payment done ref #..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  color: '#e0f2fe',
                  fontSize: '0.84rem',
                  resize: 'vertical',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>

            {/* Attachments section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                  <Paperclip size={13} color="#38bdf8" />
                  <span>Attachments (Photos, Receipts, Docs)</span>
                </label>
                <button
                  type="button"
                  onClick={() => promptFileInputRef.current && promptFileInputRef.current.click()}
                  style={{
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 600
                  }}
                >
                  <Upload size={12} /> + Attach File
                </button>
              </div>

              <input
                type="file"
                ref={promptFileInputRef}
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUploadHelper(e, setPromptAttachments)}
              />

              {promptAttachments.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto', padding: '2px 0' }}>
                  {promptAttachments.map(att => {
                    const isImg = att.type?.startsWith('image/') || (att.data && att.data.startsWith('data:image/'));
                    return (
                      <div
                        key={att.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          fontSize: '0.72rem',
                          color: '#cbd5e1'
                        }}
                      >
                        {isImg ? (
                          <img src={att.data} alt={att.name} style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }} />
                        ) : (
                          <FileText size={12} color="#38bdf8" />
                        )}
                        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPromptAttachments(prev => prev.filter(x => x.id !== att.id))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px', fontSize: '0.82rem', lineHeight: 1 }}
                          title="Remove attachment"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '0.70rem', color: '#64748b', fontStyle: 'italic', padding: '2px 0' }}>
                  No files attached yet. You can attach images, receipts, or PDF files.
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setCompletionPromptTask(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94a3b8',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Skip / Close
              </button>
              <button
                type="button"
                disabled={isSavingCompletionPrompt}
                onClick={handleSaveCompletionPrompt}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isSavingCompletionPrompt ? 'Saving...' : 'Save Note & Attachment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo / Image Preview Modal */}
      {previewImage && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.90)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            zIndex: 350,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div 
            style={{
              maxWidth: '92vw',
              maxHeight: '88vh',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '12px', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontSize: '0.92rem', fontWeight: 600 }}>{previewImage.name}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(previewImage)}
                  style={{
                    background: 'rgba(56, 189, 248, 0.2)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 600
                  }}
                >
                  <Download size={14} /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <img 
              src={previewImage.data} 
              alt={previewImage.name} 
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                borderRadius: '16px',
                objectFit: 'contain',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
              }} 
            />
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default TasksModal;
