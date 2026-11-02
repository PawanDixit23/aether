import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  X, 
  Edit3, 
  Trash2, 
  Download, 
  SlidersHorizontal, 
  RotateCcw, 
  Check, 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Clock,
  ArrowDownCircle,
  MessageSquare,
  Sparkles,
  Clipboard,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export const FINANCE_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: '🍔', color: '#06b6d4' },
  { id: 'shopping', label: 'Shopping', icon: '🛒', color: '#eab308' },
  { id: 'petrol', label: 'Petrol / Fuel', icon: '⛽', color: '#f97316' },
  { id: 'bills', label: 'Bills & Utilities', icon: '⚡', color: '#3b82f6' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#a855f7' },
  { id: 'medical', label: 'Medical', icon: '💊', color: '#ec4899' },
  { id: 'other', label: 'Other', icon: '🏷️', color: '#94a3b8' }
];

export const getCategoryIcon = (cat) => {
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

const DEFAULT_BUDGETS = [
  { id: 'fuel', cat: 'fuel', name: '⛽ Petrol / Fuel', limit: 4000 },
  { id: 'food', cat: 'food', name: '🍔 Food & Dining', limit: 5000 },
  { id: 'shopping', cat: 'shopping', name: '🛒 Shopping', limit: 10000 },
  { id: 'bills', cat: 'bills', name: '⚡ Utility Bills', limit: 3000 }
];

export const QUICK_EXPENSE_CHIPS = [
  { id: 'food', label: '🍔 Lunch/Dinner', text: 'Lunch/Dinner', cat: 'food' },
  { id: 'fuel', label: '⛽ Petrol', text: 'Petrol / Fuel', cat: 'petrol' },
  { id: 'grocery', label: '🛒 Grocery', text: 'Grocery', cat: 'shopping' },
  { id: 'cab', label: '🚕 Uber/Cab', text: 'Uber / Cab', cat: 'other' },
  { id: 'medicine', label: '💊 Medicine', text: 'Medicine', cat: 'medical' },
  { id: 'coffee', label: '☕ Chai/Snacks', text: 'Chai & Snacks', cat: 'food' },
  { id: 'bills', label: '⚡ Bills', text: 'Utility Bill', cat: 'bills' },
  { id: 'shopping', label: '🛍️ Shopping', text: 'Shopping', cat: 'shopping' },
];

export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary / वेतन', icon: '💼', color: '#10b981' },
  { id: 'investment', label: 'Investments / रिटर्न', icon: '📈', color: '#38bdf8' },
  { id: 'freelance', label: 'Freelance / परामर्श', icon: '🤝', color: '#a855f7' },
  { id: 'cashback', label: 'Cashback & Rewards', icon: '🎁', color: '#f59e0b' },
  { id: 'business', label: 'Business / Rental', icon: '🏢', color: '#06b6d4' },
  { id: 'other_income', label: 'Other Income / अन्य', icon: '💰', color: '#34d399' }
];

export const QUICK_INCOME_CHIPS = [
  { id: 'salary', label: '💼 Salary', text: 'Monthly Salary', cat: 'salary' },
  { id: 'mf_dividend', label: '📈 Dividend / Return', text: 'Investment Return', cat: 'investment' },
  { id: 'client_pay', label: '🤝 Client Payment', text: 'Client Payment', cat: 'freelance' },
  { id: 'cashback', label: '🎁 Cashback / Reward', text: 'UPI Cashback', cat: 'cashback' },
  { id: 'bonus', label: '💰 Bonus', text: 'Quarterly Bonus', cat: 'salary' }
];

export const FinanceModal = ({
  isOpen,
  onClose,
  financeSummary = {},
  financeRecords = [],
  isAddingExpense,
  setIsAddingExpense,
  newExpenseForm = { type: 'expense', category: 'food', amount: '', note: '', payment_mode: 'upi' },
  setNewExpenseForm,
  editingFinanceRecord,
  setEditingFinanceRecord,
  handleSaveFinanceEdit,
  handleDeleteFinanceRecord,
  showToast,
  refreshAllData,
  userEmail,
  API_BASE
}) => {
  // Active view tab: 'overview' | 'budgets' | 'transactions'
  const [activeTab, setActiveTab] = useState('overview');
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [userSelectedWeekIdx, setUserSelectedWeekIdx] = useState(null);
  const [hoveredDayIdx, setHoveredDayIdx] = useState(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  const triggerHaptic = (duration = 15) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(duration); } catch (_) {}
    }
  };

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bank SMS Auto-Log State
  const [isSmsParserOpen, setIsSmsParserOpen] = useState(false);
  const [smsInputText, setSmsInputText] = useState('');
  const [smsAmount, setSmsAmount] = useState('');
  const [smsExpensePurpose, setSmsExpensePurpose] = useState('');
  const [isParsingSms, setIsParsingSms] = useState(false);
  const [parsedSmsResult, setParsedSmsResult] = useState(null);

  const handleSmsInputChange = (text) => {
    setSmsInputText(text);
    // Instant regex extraction for Amount & Merchant
    const amtMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) || 
                     text.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:debited|spent|paid|credited)/i);
    if (amtMatch) {
      const cleanAmt = amtMatch[1].replace(/,/g, '');
      setSmsAmount(cleanAmt);
    }
    const merchMatch = text.match(/(?:at|to|vpa|info|trf to)\s+([A-Za-z0-9\s._-]+?)(?:\s+(?:on|ref|upi|avl|bal|val)|\.|\,|$)/i);
    if (merchMatch && !smsExpensePurpose) {
      setSmsExpensePurpose(merchMatch[1].trim());
    }
  };

  const handleSaveSmsExpense = async () => {
    const amtVal = parseFloat(smsAmount);
    if (!isNaN(amtVal) && amtVal > 0) {
      setIsParsingSms(true);
      try {
        const resp = await fetch(`${API_BASE}/finance/records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userEmail ? { 'X-User-Email': userEmail } : {})
          },
          body: JSON.stringify({
            type: 'expense',
            amount: amtVal,
            category: 'food',
            note: smsExpensePurpose.trim() || smsInputText.trim() || 'Expense',
            payment_mode: 'upi',
            user_email: userEmail || null
          })
        });
        const data = await resp.json();
        if (data.status === 'success') {
          setSmsAmount('');
          setSmsInputText('');
          setSmsExpensePurpose('');
          setIsSmsParserOpen(false);
          if (showToast) showToast(`✅ ₹${amtVal} खर्च दर्ज किया गया!`, "success");
          if (refreshAllData) refreshAllData();
        } else {
          if (showToast) showToast("खर्च सहेजने में त्रुटि आई", "error");
        }
      } catch (e) {
        if (showToast) showToast("खर्च सहेजने में त्रुटि आई", "error");
      } finally {
        setIsParsingSms(false);
      }
      return;
    }

    if (smsInputText.trim()) {
      await handleParseSms();
    } else {
      if (showToast) showToast("कृपया राशि या SMS दर्ज करें", "info");
    }
  };

  const handleParseSms = async (textToParse = smsInputText) => {
    const raw = (textToParse || '').trim();
    if (!raw && !smsAmount) {
      if (showToast) showToast("कृपया राशि या बैंक SMS दर्ज करें", "info");
      return;
    }
    setIsParsingSms(true);
    setParsedSmsResult(null);
    try {
      const resp = await fetch(`${API_BASE}/finance/parse-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'X-User-Email': userEmail } : {})
        },
        body: JSON.stringify({
          sms_text: raw,
          user_email: userEmail || null,
          custom_note: smsExpensePurpose.trim() || undefined,
          auto_commit: true
        })
      });
      const data = await resp.json();
      if (data.status === 'success' && data.records && data.records.length > 0) {
        const rec = data.records[0];
        setParsedSmsResult(rec);
        setSmsInputText('');
        setSmsAmount('');
        setSmsExpensePurpose('');
        if (showToast) showToast(`✅ ₹${rec.amount} ${rec.category || 'expense'} दर्ज किया गया! (${rec.merchant || ''})`, "success");
        if (refreshAllData) refreshAllData();
      } else {
        if (showToast) showToast("SMS से राशि स्वतः नहीं मिली, कृपया ऊपर राशि दर्ज करके सहेजें।", "info");
      }
    } catch (err) {
      if (showToast) showToast("त्रुटि: कृपया राशि दर्ज करके सेव करें", "error");
    } finally {
      setIsParsingSms(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setSmsInputText(text.trim());
          if (showToast) showToast("SMS pasted from clipboard! 📋", "info");
        } else {
          if (showToast) showToast("Clipboard is empty", "info");
        }
      } else {
        if (showToast) showToast("Clipboard access unavailable, please paste manually", "info");
      }
    } catch (e) {
      if (showToast) showToast("Please paste SMS text into the box manually", "info");
    }
  };

  const [budgets, setBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem('aether_custom_budgets');
      return saved ? JSON.parse(saved) : DEFAULT_BUDGETS;
    } catch (e) {
      return DEFAULT_BUDGETS;
    }
  });
  const [isEditingBudgets, setIsEditingBudgets] = useState(false);
  const [newBudgetForm, setNewBudgetForm] = useState({ name: '', cat: '', limit: '' });

  // Format month title dynamically like "April 2025" or current month
  const monthTitle = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
    setUserSelectedWeekIdx(null);
    setHoveredDayIdx(null);
    setSelectedDayDetail(null);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
    setUserSelectedWeekIdx(null);
    setHoveredDayIdx(null);
    setSelectedDayDetail(null);
  };

  const handleSaveBudgetLimit = (id, newLimit) => {
    const updated = budgets.map(b => b.id === id ? { ...b, limit: Number(newLimit) || 0 } : b);
    setBudgets(updated);
    localStorage.setItem('aether_custom_budgets', JSON.stringify(updated));
  };

  const handleDeleteBudget = (id) => {
    const updated = budgets.filter(b => b.id !== id);
    setBudgets(updated);
    localStorage.setItem('aether_custom_budgets', JSON.stringify(updated));
    if (showToast) showToast("Budget category removed", "info");
  };

  const handleAddBudgetCategory = (e) => {
    e.preventDefault();
    if (!newBudgetForm.name.trim() || !newBudgetForm.limit) {
      if (showToast) showToast("Please provide category name and budget limit", "info");
      return;
    }
    const catKey = (newBudgetForm.cat || newBudgetForm.name).toLowerCase().trim().replace(/\s+/g, '_');
    const newEntry = {
      id: `budget_${Date.now()}`,
      cat: catKey,
      name: newBudgetForm.name.trim(),
      limit: Number(newBudgetForm.limit) || 1000
    };
    const updated = [...budgets, newEntry];
    setBudgets(updated);
    localStorage.setItem('aether_custom_budgets', JSON.stringify(updated));
    setNewBudgetForm({ name: '', cat: '', limit: '' });
    if (showToast) showToast(`Added budget category '${newEntry.name}'!`, "success");
  };

  const handleResetBudgets = () => {
    setBudgets(DEFAULT_BUDGETS);
    localStorage.setItem('aether_custom_budgets', JSON.stringify(DEFAULT_BUDGETS));
    if (showToast) showToast("Budgets reset to defaults", "info");
  };

  const handleExportCSV = () => {
    if (!monthRecords || monthRecords.length === 0) {
      if (showToast) showToast(`No transactions found for ${monthTitle} to export.`, "info");
      return;
    }
    const filename = `aether_finance_${monthTitle.replace(/\s+/g, '_')}.csv`;
    
    // Resolve origin and absolute API URL so Android WebView Linking.openURL never receives a relative URL
    const origin = (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:'))
      ? window.location.origin
      : 'https://aether-kjrj.onrender.com';

    let effApi = API_BASE || '';
    if (!effApi) {
      if (typeof window !== 'undefined' && window.location.port === '5173') {
        effApi = `http://${window.location.hostname}:8000/api`;
      } else {
        effApi = `${origin}/api`;
      }
    } else if (!effApi.startsWith('http://') && !effApi.startsWith('https://')) {
      effApi = `${origin}${effApi.startsWith('/') ? '' : '/'}${effApi}`;
    }

    const absoluteDownloadUrl = `${effApi}/finance/export-csv?user_email=${encodeURIComponent(userEmail || '')}&year=${selectedYear}&month=${selectedMonth}`;

    // 1. Mobile App (React Native WebView): delegates download to Android system browser/download manager
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'OPEN_EXTERNAL_URL',
          url: absoluteDownloadUrl
        }));
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'DOWNLOAD_FILE',
          url: absoluteDownloadUrl,
          filename: filename
        }));
        if (showToast) showToast(`Finance CSV डाउनलोड शुरू हो गया! 📥`, "success");
        return;
      } catch (err) {}
    }

    // 2. Web browser: direct download via link to backend
    try {
      const link = document.createElement("a");
      link.href = absoluteDownloadUrl;
      link.setAttribute("download", filename);
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (showToast) showToast(`Finance CSV for ${monthTitle} exported successfully! 📥`, "success");
    } catch (e) {
      // 3. In-memory Blob fallback
      const headers = ["Record ID", "Date", "Type", "Category", "Amount (INR)", "Payment Mode", "Notes"];
      const rows = monthRecords.map(r => [
        r.id,
        r.date ? new Date(r.date).toLocaleDateString('en-IN') : '',
        r.type || 'expense',
        r.category || 'general',
        r.amount || 0,
        r.payment_mode || 'upi',
        `"${(r.note || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      if (showToast) showToast(`Finance CSV for ${monthTitle} exported successfully! 📥`, "success");
    }
  };

  // =========================================================================
  // 100% REAL & DYNAMIC MONTH-BY-MONTH FINANCE CALCULATIONS
  // =========================================================================
  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth(); // 0-indexed: 0=Jan, 9=Oct, 10=Nov, 11=Dec

  // Filter records strictly by the selected month
  const monthRecords = (financeRecords || []).filter(r => {
    const rawDate = r.date || r.created_at;
    if (!rawDate) return false;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  const monthIncome = monthRecords
    .filter(r => (r.type || '').toLowerCase() === 'income')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const monthExpense = monthRecords
    .filter(r => (r.type || 'expense').toLowerCase() === 'expense')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const effectiveIncome = monthIncome;
  const effectiveExpense = monthExpense;
  const effectiveBalance = effectiveIncome - effectiveExpense;
  const effectiveSavings = effectiveIncome > effectiveExpense ? effectiveIncome - effectiveExpense : 0;

  // Month date metrics
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === selectedYear && today.getMonth() === selectedMonth;
  const isPastMonth = selectedYear < today.getFullYear() || (selectedYear === today.getFullYear() && selectedMonth < today.getMonth());
  const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const daysElapsedInMonth = isCurrentMonth ? Math.max(1, today.getDate()) : lastDayOfMonth;
  const dailyAvg = monthExpense > 0 ? Math.round(monthExpense / daysElapsedInMonth) : 0;

  // Real Category Breakdown computed dynamically from monthRecords strictly
  const categoryTotals = {};
  const monthExpenseRecords = monthRecords.filter(r => (r.type || 'expense').toLowerCase() === 'expense');
  monthExpenseRecords.forEach(r => {
    const rawCat = (r.category || 'other').toLowerCase();
    categoryTotals[rawCat] = (categoryTotals[rawCat] || 0) + Number(r.amount || 0);
  });

  const categoryColorPalette = {
    food: '#06b6d4',
    dining: '#06b6d4',
    swiggy: '#06b6d4',
    zomato: '#06b6d4',
    shopping: '#eab308',
    amazon: '#eab308',
    grocery: '#eab308',
    petrol: '#f97316',
    fuel: '#f97316',
    diesel: '#f97316',
    bills: '#3b82f6',
    utilities: '#3b82f6',
    recharge: '#3b82f6',
    electricity: '#3b82f6',
    entertainment: '#a855f7',
    netflix: '#a855f7',
    medical: '#ec4899',
    medicine: '#ec4899',
    health: '#ec4899',
    travel: '#10b981',
    cab: '#10b981',
    uber: '#10b981',
    rent: '#6366f1',
    other: '#94a3b8',
    general: '#cbd5e1'
  };

  const dynamicCategories = Object.entries(categoryTotals).map(([catKey, catAmt]) => {
    const pct = effectiveExpense > 0 ? Math.round((catAmt / effectiveExpense) * 100) : 0;
    const displayName = catKey.charAt(0).toUpperCase() + catKey.slice(1);
    const color = categoryColorPalette[catKey] || '#38bdf8';
    return { name: displayName, percent: pct, amount: catAmt, color };
  }).sort((a, b) => b.amount - a.amount);

  // Dynamic budget alerts for categories exceeding 80% or 100% of limit
  const budgetAlerts = (budgets || []).map(b => {
    const spent = (monthExpenseRecords || [])
      .filter(r => (r.category || '').toLowerCase() === b.cat.toLowerCase())
      .reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
    const percent = Math.round((spent / (b.limit || 1)) * 100);
    return { ...b, spent, percent, isOver: spent > b.limit, isWarning: percent >= 80 && spent <= b.limit };
  }).filter(b => b.isOver || b.isWarning);

  // SVG Donut Slices calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  // =========================================================================
  // DYNAMIC WEEKLY CALCULATION ACROSS ALL MONTHS (Hover & Click Breakdown)
  // =========================================================================
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
  const startDayOffset = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const firstMonday = new Date(selectedYear, selectedMonth, 1 - startDayOffset);

  const monthWeeks = [];
  let currMonday = new Date(firstMonday);
  let wIndex = 0;

  while (true) {
    const weekDays = [];
    let hasDayInMonth = false;
    let weekTotalExpense = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(currMonday);
      d.setDate(currMonday.getDate() + i);
      const isDayInThisMonth = d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      if (isDayInThisMonth) hasDayInMonth = true;

      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayDateLabel = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const fullDateLabel = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

      // Find all transactions on this exact date from monthRecords
      const dayTransactions = monthRecords.filter(r => (r.date || r.created_at || '').slice(0, 10) === dateStr);
      const dayExpenseSum = dayTransactions
        .filter(r => (r.type || 'expense').toLowerCase() === 'expense')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);

      weekTotalExpense += dayExpenseSum;

      const isToday = isCurrentMonth && d.getDate() === today.getDate() && d.getMonth() === today.getMonth();

      weekDays.push({
        dayIndex: i,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: dayDateLabel,
        fullDateLabel,
        dateStr,
        inMonth: isDayInThisMonth,
        amountNum: dayExpenseSum,
        amount: `₹${dayExpenseSum.toLocaleString('en-IN')}`,
        isHighlight: isToday,
        transactions: dayTransactions
      });
    }

    if (!hasDayInMonth && currMonday.getMonth() > selectedMonth && currMonday.getFullYear() >= selectedYear) {
      break;
    }

    const startLabel = weekDays[0].date;
    const endLabel = weekDays[6].date;

    monthWeeks.push({
      weekNum: wIndex + 1,
      label: `Week ${wIndex + 1} (${startLabel} - ${endLabel})`,
      shortLabel: `W${wIndex + 1}`,
      days: weekDays,
      totalExpense: weekTotalExpense
    });

    wIndex++;
    currMonday.setDate(currMonday.getDate() + 7);
    if (currMonday > new Date(selectedYear, selectedMonth + 1, 7)) {
      break;
    }
  }

  // Determine active week index for this month
  let defaultWeekIdx = 0;
  if (monthWeeks.length > 0) {
    if (isCurrentMonth) {
      const todayIdx = monthWeeks.findIndex(w => w.days.some(d => d.isHighlight));
      defaultWeekIdx = todayIdx !== -1 ? todayIdx : 0;
    } else {
      // For past/future months, default to the week with highest expenses (or last week)
      let bestIdx = monthWeeks.length - 1;
      let maxExp = -1;
      monthWeeks.forEach((w, idx) => {
        if (w.totalExpense > maxExp) {
          maxExp = w.totalExpense;
          bestIdx = idx;
        }
      });
      defaultWeekIdx = bestIdx;
    }
  }

  const activeWeekIdx = userSelectedWeekIdx !== null && userSelectedWeekIdx < monthWeeks.length
    ? userSelectedWeekIdx
    : defaultWeekIdx;

  const currentWeek = monthWeeks[activeWeekIdx] || monthWeeks[0] || { days: [] };
  const weeklyData = currentWeek.days || [];
  const maxWeeklyExpense = Math.max(...weeklyData.map(d => d.amountNum), 1);

  if (!isOpen) return null;

  return (
    <div 
      className="aether-edge-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : '16px'
      }}
    >
      <div 
        className="aether-edge-content-container aether-edge-modal-container"
        style={{
          background: '#080f1d',
          border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: isMobile ? 0 : '28px',
          padding: isMobile ? '16px 14px 24px 14px' : '22px 20px',
          paddingTop: isMobile ? 'max(52px, calc(env(safe-area-inset-top, 0px) + 16px))' : '22px',
          paddingBottom: isMobile ? 'max(24px, env(safe-area-inset-bottom))' : '20px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '440px',
          height: isMobile ? '100%' : 'auto',
          height: isMobile ? '100dvh' : 'auto',
          maxHeight: isMobile ? '100dvh' : '92vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          boxShadow: isMobile ? 'none' : '0 24px 64px rgba(0,0,0,0.85)'
        }}
      >
        
        {/* Top Header matching Screenshot 2: Finance [Eye] < Month > [X] */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
              Finance
            </h2>
            <button
              type="button"
              onClick={() => setIsBalanceHidden(!isBalanceHidden)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
              title={isBalanceHidden ? "Show Balance" : "Hide Balance"}
            >
              {isBalanceHidden ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Month Navigator Pill */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '4px 10px', gap: '6px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', minWidth: '76px', textAlign: 'center' }}>
                {monthTitle}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Quick CSV Export Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              title={`Export ${monthTitle} to CSV`}
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '20px',
                padding: '4px 10px',
                color: '#38bdf8',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s'
              }}
            >
              <Download size={13} />
              {!isMobile && <span>Export CSV</span>}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Total Balance Card matching Screenshot 2 */}
        <div style={{ background: '#0e172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '22px', padding: '18px 20px', marginBottom: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>Total Balance</span>
            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.74rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '2px' }}>
              Live Record
            </span>
          </div>

          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '16px' }}>
            {isBalanceHidden ? '••••••••' : `₹${effectiveBalance.toLocaleString('en-IN')}`}
          </div>

          {/* 3 Metric Pills: Income, Expenses, Savings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '8px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                <span>Income</span>
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#34d399' }}>
                {isBalanceHidden ? '••••' : `₹${effectiveIncome.toLocaleString('en-IN')}`}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '8px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                <span>Expenses</span>
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f87171' }}>
                {isBalanceHidden ? '••••' : `₹${effectiveExpense.toLocaleString('en-IN')}`}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '8px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
                <span>Savings</span>
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#38bdf8' }}>
                {isBalanceHidden ? '••••' : `₹${effectiveSavings.toLocaleString('en-IN')}`}
              </div>
            </div>
          </div>
        </div>

        {/* Unified Bank SMS Auto-Logger Section */}
        {!isSmsParserOpen ? (
          <div 
            onClick={() => setIsSmsParserOpen(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '18px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', flexShrink: 0 }}>
                <Sparkles size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Auto-Log Expense from SMS</span>
                  <span style={{ fontSize: '0.62rem', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: '6px', fontWeight: 700, flexShrink: 0 }}>AI</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Paste bank SMS to auto-extract amount & merchant
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '5px 10px', borderRadius: '12px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '8px' }}>
              Paste SMS ⚡
            </span>
          </div>
        ) : (
          <div style={{
            background: '#091122',
            border: '1.5px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '20px',
            padding: '16px',
            marginBottom: '16px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)'
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                  <Sparkles size={15} />
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                  Auto-Log Expense from SMS
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: '8px',
                    color: '#38bdf8',
                    padding: '4px 8px',
                    fontSize: '0.70rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Paste from clipboard"
                >
                  <Clipboard size={12} />
                  <span>Paste 📋</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSmsParserOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  title="Close SMS Drawer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Privacy & Zero-Data-Leak Guarantee Banner */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '12px',
              padding: '8px 12px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <ShieldCheck size={16} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.71rem', color: '#94a3b8', lineHeight: 1.4 }}>
                <span style={{ color: '#34d399', fontWeight: 700 }}>100% Private & Secure:</span> We <strong style={{ color: '#f1f5f9' }}>do not read sensitive OTPs or personal chats</strong>. Simply paste your expense/bank SMS alert here, and Aether safely extracts and calculates your expense.
              </div>
            </div>

            {/* Textarea */}
            <textarea
              rows={3}
              placeholder="Paste Indian Bank SMS alert here...&#10;(e.g. A/C XX1234 debited for Rs 1499.00 on 31-Oct-26 at ZARA JAIPUR. UPI Ref: 987654...)"
              value={smsInputText}
              onChange={e => handleSmsInputChange(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#060d1c',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '12px',
                padding: '10px 12px',
                color: '#f8fafc',
                fontSize: '0.80rem',
                lineHeight: 1.4,
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                marginBottom: '10px'
              }}
            />

            {/* Quick Purpose Chips (त्वरित टैग्स) */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>⚡ 1-Tap Quick Tags (त्वरित टैग्स):</span>
                {smsExpensePurpose && (
                  <button
                    type="button"
                    onClick={() => setSmsExpensePurpose('')}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.68rem', cursor: 'pointer', padding: 0 }}
                  >
                    Clear ✕
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {QUICK_EXPENSE_CHIPS.map(chip => {
                  const isSelected = smsExpensePurpose === chip.text;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(10);
                        setSmsExpensePurpose(chip.text);
                      }}
                      style={{
                        background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isSelected ? '#38bdf8' : '#e2e8f0',
                        borderRadius: '8px',
                        padding: '5px 9px',
                        fontSize: '0.73rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount & Custom Reason in a clean responsive grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 700, marginBottom: '5px' }}>
                  <span>₹ Amount:</span>
                </div>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={smsAmount}
                  onChange={e => setSmsAmount(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#060d1c',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    color: '#f8fafc',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, marginBottom: '5px' }}>
                  <span>📝 Reason / खर्च का कारण:</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Petrol, Dinner, Groceries..."
                  value={smsExpensePurpose}
                  onChange={e => setSmsExpensePurpose(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#060d1c',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    color: '#f8fafc',
                    fontSize: '0.80rem',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                />
              </div>
            </div>

            {/* Action Submit Button */}
            <button
              type="button"
              disabled={isParsingSms || (!smsAmount && !smsInputText.trim())}
              onClick={handleSaveSmsExpense}
              style={{
                width: '100%',
                background: (!smsAmount && !smsInputText.trim()) ? 'rgba(56, 189, 248, 0.2)' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '11px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: (!smsAmount && !smsInputText.trim()) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: (smsAmount || smsInputText.trim()) ? '0 4px 14px rgba(2, 132, 199, 0.4)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <Sparkles size={15} />
              <span>{isParsingSms ? 'Saving Transaction...' : '💾 Save Transaction (खर्च सहेजें)'}</span>
            </button>

            {/* Parsed Result Success Card */}
            {parsedSmsResult && (
              <div style={{
                marginTop: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '0.78rem', fontWeight: 700 }}>
                    <CheckCircle2 size={15} />
                    <span>Transaction Logged into Ledger!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setParsedSmsResult(null)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.70rem', cursor: 'pointer', padding: '2px 4px' }}
                  >
                    Clear ✕
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '0.74rem' }}>
                  <div style={{ color: '#cbd5e1' }}><strong>Store/Merchant:</strong> {parsedSmsResult.merchant || 'Shopping / Store'}</div>
                  <div style={{ color: '#34d399', fontWeight: 700 }}><strong>Amount:</strong> ₹{Number(parsedSmsResult.amount || 0).toLocaleString('en-IN')}</div>
                  <div style={{ color: '#cbd5e1' }}><strong>Category:</strong> {(parsedSmsResult.category || 'shopping').toUpperCase()}</div>
                  <div style={{ color: '#94a3b8' }}><strong>Mode:</strong> {(parsedSmsResult.payment_mode || 'upi').toUpperCase()}</div>
                  {parsedSmsResult.note && (
                    <div style={{ color: '#38bdf8', gridColumn: 'span 2' }}><strong>Note/Purpose:</strong> {parsedSmsResult.note}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '16px' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'budgets', label: 'Budgets' },
            { id: 'transactions', label: 'Transactions' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setActiveTab(tab.id);
              }}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                borderRadius: '12px',
                background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.9), rgba(56, 189, 248, 0.9))' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === tab.id ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>

            {/* Smart Budget Warning Alerts */}
            {budgetAlerts.length > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '16px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontSize: '0.80rem', fontWeight: 700 }}>
                    <AlertTriangle size={15} />
                    <span>Budget Limit Alerts ({budgetAlerts.length})</span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Monthly Limit</span>
                </div>
                {budgetAlerts.map(a => (
                  <div key={a.id} style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px' }}>
                    <span>{a.name}: <strong style={{ color: a.isOver ? '#ef4444' : '#f59e0b' }}>{a.percent}% used</strong> {a.isOver ? '(Exceeded!)' : ''}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>₹{a.spent.toLocaleString('en-IN')} / ₹{a.limit.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Spending Breakdown Card */}
            <div style={{ background: '#0e172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '22px', padding: '18px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff', margin: '0 0 14px 0' }}>
                Spending Breakdown
              </h3>

              {dynamicCategories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.8rem' }}>
                  No expenses recorded this month yet. Use "Add Expense" below to start tracking.
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  {/* SVG Donut Chart */}
                  <div style={{ position: 'relative', width: '136px', height: '136px', flexShrink: 0 }}>
                    <svg width="136" height="136" viewBox="0 0 136 136" style={{ transform: 'rotate(-90deg)' }}>
                      {dynamicCategories.map((cat, idx) => {
                        const strokeDasharray = `${(cat.percent / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                        accumulatedPercent += cat.percent;
                        return (
                          <circle
                            key={idx}
                            cx="68"
                            cy="68"
                            r={radius}
                            fill="transparent"
                            stroke={cat.color}
                            strokeWidth="16"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                        );
                      })}
                    </svg>
                    {/* Center Text inside Donut Hole */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff' }}>
                        ₹{effectiveExpense.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '1px' }}>
                        Total Spent
                      </div>
                    </div>
                  </div>

                  {/* Breakdown Legend List */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {dynamicCategories.slice(0, 6).map((cat, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cat.color }} />
                          <span style={{ color: '#cbd5e1' }}>{cat.name}</span>
                        </div>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{cat.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Weekly Trend Card with Interactive Day Hover & Click */}
            <div style={{ background: '#0e172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '22px', padding: '18px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    Weekly Trend
                  </h3>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>
                    Hover for day total • Click for full breakdown
                  </div>
                </div>

                {/* Week switcher for any month */}
                {monthWeeks.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '3px 6px', gap: '4px' }}>
                    <button
                      type="button"
                      disabled={activeWeekIdx === 0}
                      onClick={() => {
                        setUserSelectedWeekIdx(Math.max(0, activeWeekIdx - 1));
                        setHoveredDayIdx(null);
                      }}
                      style={{ background: 'none', border: 'none', color: activeWeekIdx === 0 ? '#475569' : '#38bdf8', cursor: activeWeekIdx === 0 ? 'default' : 'pointer', padding: '2px', display: 'flex' }}
                      title="Previous Week"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span style={{ fontSize: '0.66rem', fontWeight: 600, color: '#e2e8f0', minWidth: '42px', textAlign: 'center' }}>
                      {currentWeek.shortLabel || `W${activeWeekIdx + 1}`}
                    </span>
                    <button
                      type="button"
                      disabled={activeWeekIdx >= monthWeeks.length - 1}
                      onClick={() => {
                        setUserSelectedWeekIdx(Math.min(monthWeeks.length - 1, activeWeekIdx + 1));
                        setHoveredDayIdx(null);
                      }}
                      style={{ background: 'none', border: 'none', color: activeWeekIdx >= monthWeeks.length - 1 ? '#475569' : '#38bdf8', cursor: activeWeekIdx >= monthWeeks.length - 1 ? 'default' : 'pointer', padding: '2px', display: 'flex' }}
                      title="Next Week"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Chart container with Y-axis and bars */}
              <div style={{ display: 'flex', gap: '10px', height: '146px', alignItems: 'flex-end', paddingTop: '36px' }}>
                {/* Y-axis markers */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100px', fontSize: '0.66rem', color: '#64748b', paddingBottom: '20px' }}>
                  <span>₹{Math.round(maxWeeklyExpense).toLocaleString('en-IN')}</span>
                  <span>₹{Math.round(maxWeeklyExpense / 2).toLocaleString('en-IN')}</span>
                  <span>₹0</span>
                </div>

                {/* Bars */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '100px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px' }}>
                  {weeklyData.map((d, idx) => {
                    const isHovered = hoveredDayIdx === idx;
                    const showTooltip = isHovered || (hoveredDayIdx === null && d.isHighlight);
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredDayIdx(idx)}
                        onMouseLeave={() => setHoveredDayIdx(null)}
                        onClick={() => setSelectedDayDetail(d)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          flex: 1,
                          height: '100%',
                          justifyContent: 'flex-end',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                      >
                        {/* Interactive Hover Tooltip */}
                        {showTooltip && (
                          <div style={{
                            position: 'absolute',
                            top: '-44px',
                            background: isHovered ? '#0284c7' : 'rgba(15, 23, 42, 0.95)',
                            border: `1px solid ${isHovered ? '#38bdf8' : 'rgba(56, 189, 248, 0.5)'}`,
                            borderRadius: '8px',
                            padding: '3px 8px',
                            fontSize: '0.66rem',
                            color: '#fff',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            zIndex: 25,
                            boxShadow: isHovered ? '0 8px 24px rgba(56, 189, 248, 0.5)' : '0 4px 12px rgba(56,189,248,0.25)',
                            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                            pointerEvents: 'none'
                          }}>
                            <div style={{ fontWeight: 800, color: isHovered ? '#ffffff' : '#38bdf8' }}>
                              {d.amount}
                            </div>
                            <div style={{ fontSize: '0.58rem', color: isHovered ? '#f0f9ff' : '#94a3b8' }}>
                              {d.date}
                            </div>
                          </div>
                        )}

                        {/* Bar Pillar */}
                        <div
                          style={{
                            width: isHovered ? '16px' : '14px',
                            height: d.amountNum > 0 ? `${Math.max(12, (d.amountNum / maxWeeklyExpense) * 100)}%` : '5px',
                            borderRadius: '6px',
                            background: isHovered
                              ? 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)'
                              : d.isHighlight 
                                ? 'linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)' 
                                : d.amountNum > 0
                                  ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.5) 0%, rgba(37, 99, 235, 0.3) 100%)'
                                  : 'rgba(255, 255, 255, 0.08)',
                            border: (isHovered || d.isHighlight) ? '1px solid #38bdf8' : (d.amountNum > 0 ? '1px solid rgba(56, 189, 248, 0.3)' : 'none'),
                            boxShadow: isHovered 
                              ? '0 0 16px rgba(56, 189, 248, 0.8)' 
                              : d.isHighlight 
                                ? '0 0 14px rgba(56, 189, 248, 0.5)' 
                                : 'none',
                            transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day Labels below bars */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '34px', marginTop: '6px', fontSize: '0.68rem', color: '#64748b' }}>
                {weeklyData.map((d, idx) => {
                  const isHovered = hoveredDayIdx === idx;
                  return (
                    <span
                      key={idx}
                      onMouseEnter={() => setHoveredDayIdx(idx)}
                      onMouseLeave={() => setHoveredDayIdx(null)}
                      onClick={() => setSelectedDayDetail(d)}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        color: isHovered ? '#38bdf8' : (d.isHighlight ? '#38bdf8' : (d.amountNum > 0 ? '#cbd5e1' : '#64748b')),
                        fontWeight: (isHovered || d.isHighlight || d.amountNum > 0) ? 700 : 500,
                        cursor: 'pointer',
                        padding: '2px 0',
                        borderRadius: '6px',
                        background: isHovered ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                        transition: 'all 0.15s'
                      }}
                      title={`Click for ${d.fullDateLabel} expenses`}
                    >
                      {d.day}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Monthly Comprehensive Report Card */}
            <div style={{
              background: '#0e172a',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '22px',
              padding: '18px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>📊</span>
                  <span style={{ fontSize: '0.90rem', fontWeight: 700, color: '#f8fafc' }}>
                    {monthTitle} Statement Report
                  </span>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '8px',
                  background: isPastMonth ? 'rgba(148, 163, 184, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  color: isPastMonth ? '#94a3b8' : '#38bdf8',
                  border: isPastMonth ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid rgba(56, 189, 248, 0.35)'
                }}>
                  {isPastMonth ? '🔒 Month Closed' : `📅 Day ${today.getDate()} of ${lastDayOfMonth}`}
                </span>
              </div>

              {/* Metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginBottom: '2px' }}>Total Spent</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f87171' }}>₹{effectiveExpense.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginBottom: '2px' }}>Total Income</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399' }}>₹{effectiveIncome.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginBottom: '2px' }}>Daily Average</div>
                  <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#e2e8f0' }}>₹{dailyAvg.toLocaleString('en-IN')}/day</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginBottom: '2px' }}>Transactions</div>
                  <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#38bdf8' }}>{monthRecords.length} recorded</div>
                </div>
              </div>

              {/* Month Status Explanation */}
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(56, 189, 248, 0.05)', padding: '9px 12px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.15)', lineHeight: 1.45 }}>
                {isCurrentMonth ? (
                  <span>💡 <strong>Current Month ({monthTitle}):</strong> Monthly tracking starts on the 1st of each month. Your full spending report compiles through the last day of the month. Next month automatically begins fresh at ₹0.</span>
                ) : (
                  <span>📁 <strong>Archived Month ({monthTitle}):</strong> Full transaction ledger and statement are securely preserved. Use the arrows (&lt; and &gt;) above to navigate between months.</span>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: BUDGETS */}
        {activeTab === 'budgets' && (
          <div style={{ background: '#0e172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '22px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.86rem', color: '#e2e8f0', fontWeight: 700 }}>Monthly Budgets ({monthTitle})</span>
              <button
                type="button"
                onClick={() => setIsEditingBudgets(!isEditingBudgets)}
                style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', borderRadius: '8px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <SlidersHorizontal size={12} />
                <span>{isEditingBudgets ? 'Done' : 'Edit Budgets'}</span>
              </button>
            </div>

            {/* Budget Editor Drawer */}
            {isEditingBudgets && (
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '14px', padding: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>Adjust Category Limits:</span>
                  <button type="button" onClick={handleResetBudgets} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                  {budgets.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '0.76rem', color: '#e2e8f0', flex: 1 }}>{b.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>₹</span>
                        <input
                          type="number"
                          defaultValue={b.limit}
                          onBlur={(e) => handleSaveBudgetLimit(b.id, e.target.value)}
                          style={{ width: '84px', background: '#0a101d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.76rem', padding: '3px 6px', textAlign: 'right' }}
                        />
                        <button type="button" onClick={() => handleDeleteBudget(b.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddBudgetCategory} style={{ display: 'flex', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <input
                    type="text"
                    placeholder="New category (e.g. 💊 Medical)"
                    value={newBudgetForm.name}
                    onChange={e => setNewBudgetForm({ ...newBudgetForm, name: e.target.value })}
                    style={{ flex: 1, background: '#0a101d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.74rem', padding: '4px 8px' }}
                  />
                  <input
                    type="number"
                    placeholder="Limit (₹)"
                    value={newBudgetForm.limit}
                    onChange={e => setNewBudgetForm({ ...newBudgetForm, limit: e.target.value })}
                    style={{ width: '80px', background: '#0a101d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.74rem', padding: '4px 8px' }}
                  />
                  <button type="submit" style={{ background: '#10b981', color: '#022c22', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
                    Add
                  </button>
                </form>
              </div>
            )}

            {/* Budgets List with Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {budgets.map(b => {
                const spent = (monthRecords || [])
                  .filter(r => (r.type || 'expense') === 'expense' && (r.category || '').toLowerCase() === b.cat.toLowerCase())
                  .reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
                const percent = Math.min(100, Math.round((spent / (b.limit || 1)) * 100));
                const isExceeded = spent > b.limit;

                return (
                  <div key={b.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>{b.name}</span>
                      <span style={{ fontSize: '0.76rem', color: isExceeded ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
                        ₹{spent.toLocaleString('en-IN')} / ₹{b.limit.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: isExceeded ? '#ef4444' : 'linear-gradient(90deg, #38bdf8, #10b981)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div style={{ background: '#0e172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '22px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.86rem', color: '#e2e8f0', fontWeight: 700 }}>
                Transactions in {monthTitle} ({monthRecords.length})
              </span>
              <button
                type="button"
                onClick={handleExportCSV}
                style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', borderRadius: '8px', padding: '4px 8px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Download size={12} />
                <span>Export CSV</span>
              </button>
            </div>

            {monthRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 10px', color: '#64748b', fontSize: '0.82rem' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>💰</div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '4px' }}>
                  No transactions recorded for {monthTitle} (Spent: ₹0)
                </div>
                <div style={{ fontSize: '0.74rem', maxWidth: '300px', margin: '0 auto', lineHeight: 1.4 }}>
                  New expenses added will be recorded here. Next month will automatically start fresh at ₹0.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {monthRecords.map(rec => {
                  const isExp = (rec.type || 'expense') === 'expense';
                  return (
                    <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: isExp ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                          {getCategoryIcon(rec.category)}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>
                            {rec.note || rec.description || rec.category || 'Expense'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            {new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isExp ? '#ef4444' : '#10b981' }}>
                          {isExp ? '-' : '+'}₹{Number(rec.amount || 0).toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFinanceRecord(rec.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Quick Add Form Drawer when Add Expense or Add Income is clicked */}
        {isAddingExpense && (() => {
          const isIncome = newExpenseForm.type === 'income';
          const currentCategories = isIncome ? INCOME_CATEGORIES : FINANCE_CATEGORIES;
          const currentChips = isIncome ? QUICK_INCOME_CHIPS : QUICK_EXPENSE_CHIPS;
          const themeColor = isIncome ? '#10b981' : '#f43f5e';
          const themeBorder = isIncome ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)';

          const handleSaveTransactionForm = async () => {
            const amtVal = parseFloat(newExpenseForm.amount);
            if (isNaN(amtVal) || amtVal <= 0) {
              if (showToast) showToast("कृपया एक वैध राशि दर्ज करें (e.g. 500)", "info");
              return;
            }
            try {
              const resp = await fetch(`${API_BASE}/finance/records`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(userEmail ? { 'X-User-Email': userEmail } : {})
                },
                body: JSON.stringify({
                  type: isIncome ? 'income' : 'expense',
                  amount: amtVal,
                  category: newExpenseForm.category || (isIncome ? 'salary' : 'food'),
                  note: (newExpenseForm.note || '').trim() || (isIncome ? 'Income' : 'Expense'),
                  payment_mode: newExpenseForm.payment_mode || (isIncome ? 'bank' : 'upi'),
                  user_email: userEmail || null
                })
              });
              const data = await resp.json();
              if (data.status === 'success') {
                setIsAddingExpense(false);
                setNewExpenseForm({ type: 'expense', category: 'food', amount: '', note: '', payment_mode: 'upi' });
                if (showToast) showToast(isIncome ? `✅ ₹${amtVal.toLocaleString('en-IN')} आय सफलतापूर्वक सहेजी गई!` : `✅ ₹${amtVal.toLocaleString('en-IN')} खर्च दर्ज किया गया!`, "success");
                if (refreshAllData) refreshAllData();
              } else {
                if (showToast) showToast("सहेजने में त्रुटि आई", "error");
              }
            } catch (err) {
              if (showToast) showToast("सहेजने में त्रुटि आई", "error");
            }
          };

          return (
            <div style={{
              background: isIncome ? 'linear-gradient(180deg, #06241a 0%, #081622 100%)' : '#0e172a',
              border: `1px solid ${themeBorder}`,
              borderRadius: '20px',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: isIncome ? '0 8px 30px rgba(16, 185, 129, 0.25)' : '0 8px 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{isIncome ? '💰' : '💸'}</span>
                  <span>{isIncome ? 'आय दर्ज करें (Record Income)' : 'खर्च दर्ज करें (Record Expense)'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: isIncome ? '#34d399' : '#f87171', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    {isIncome ? '₹ Income Amount (आय राशि)' : '₹ Amount (खर्च राशि)'}
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={newExpenseForm.amount}
                    onChange={e => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: '#060a14',
                      border: `1px solid ${themeBorder}`,
                      borderRadius: '10px',
                      padding: '9px 10px',
                      color: '#fff',
                      fontSize: '0.90rem',
                      fontWeight: 700
                    }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Category (श्रेणी)</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: '#060a14',
                      border: isCategoryPickerOpen ? `1.5px solid ${themeColor}` : '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span>{currentCategories.find(c => c.id === newExpenseForm.category)?.icon || (isIncome ? '💼' : '🍔')}</span>
                      <span style={{ fontWeight: 600 }}>{currentCategories.find(c => c.id === newExpenseForm.category)?.label || (isIncome ? 'Salary / वेतन' : 'Food & Dining')}</span>
                    </span>
                    <ChevronDown size={14} color="#94a3b8" />
                  </button>
                </div>
              </div>

              {/* Category Picker Drawer */}
              {isCategoryPickerOpen && (
                <div style={{
                  background: '#070d1d',
                  border: `1px solid ${themeBorder}`,
                  borderRadius: '14px',
                  padding: '8px',
                  marginBottom: '12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '4px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.85)'
                }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', padding: '2px 8px 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Select {isIncome ? 'Income Source' : 'Expense Category'}
                  </div>
                  {currentCategories.map(cat => {
                    const isSelected = newExpenseForm.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setNewExpenseForm({ ...newExpenseForm, category: cat.id });
                          setIsCategoryPickerOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#38bdf8' : '#e2e8f0' }}>
                            {cat.label}
                          </span>
                        </div>
                        {isSelected ? (
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={12} color="#080e1e" strokeWidth={3} />
                          </div>
                        ) : (
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1.5px solid rgba(255, 255, 255, 0.2)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 1-Tap Quick Tags */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                  ⚡ 1-Tap Quick Tags:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {currentChips.map(chip => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(10);
                        setNewExpenseForm({
                          ...newExpenseForm,
                          note: chip.text,
                          category: chip.cat || newExpenseForm.category
                        });
                      }}
                      style={{
                        background: newExpenseForm.note === chip.text ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: newExpenseForm.note === chip.text ? `1px solid ${themeColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                        color: newExpenseForm.note === chip.text ? themeColor : '#e2e8f0',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '0.70rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  {isIncome ? 'Source / Note (कहाँ से प्राप्त हुआ)' : 'Note / Description (खर्च का कारण)'}
                </label>
                <input
                  type="text"
                  placeholder={isIncome ? "e.g. Monthly salary, Google AdSense, consulting..." : "e.g. Swiggy lunch, petrol refill, dinner with friends..."}
                  value={newExpenseForm.note}
                  onChange={e => setNewExpenseForm({ ...newExpenseForm, note: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#060a14', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '0.82rem' }}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveTransactionForm}
                style={{
                  width: '100%',
                  background: isIncome ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '11px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  boxShadow: isIncome ? '0 4px 14px rgba(16, 185, 129, 0.4)' : '0 4px 14px rgba(244, 63, 94, 0.4)'
                }}
              >
                {isIncome ? '💾 Save Income (आय सहेजें)' : '💾 Save Expense (खर्च सहेजें)'}
              </button>
            </div>
          );
        })()}

        {/* Fixed Bottom Action Buttons matching Screenshot 2: [Add Expense] [Add Income] [Paste SMS] */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginTop: 'auto', paddingTop: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setNewExpenseForm({ type: 'expense', category: 'food', amount: '', note: '', payment_mode: 'upi' });
              setIsAddingExpense(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
              border: 'none',
              borderRadius: '16px',
              padding: '12px 14px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(244, 63, 94, 0.35)'
            }}
          >
            <Clock size={16} />
            <span>Add Expense</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewExpenseForm({ type: 'income', category: 'salary', amount: '', note: '', payment_mode: 'bank' });
              setIsAddingExpense(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '16px',
              padding: '12px 14px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)'
            }}
          >
            <ArrowDownCircle size={16} />
            <span>Add Income</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSmsParserOpen(prev => !prev)}
            style={{
              background: isSmsParserOpen ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '16px',
              padding: '12px 14px',
              color: '#38bdf8',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(56, 189, 248, 0.2)'
            }}
            title="Auto-Log Indian Bank SMS (Shopping, UPI, Card)"
          >
            <MessageSquare size={16} />
            <span>SMS ⚡</span>
          </button>
        </div>

        {/* Day Breakdown Drawer / Popup on Day Click */}
        {selectedDayDetail && (
          <div 
            className="aether-edge-modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.88)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isMobile ? 0 : '16px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div 
              className="aether-edge-modal-container"
              style={{
                background: 'linear-gradient(180deg, #0e172a 0%, #070d19 100%)',
                border: isMobile ? 'none' : '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: isMobile ? 0 : '24px',
                width: '100%',
                maxWidth: isMobile ? '100%' : '420px',
                height: isMobile ? '100%' : 'auto',
                height: isMobile ? '100dvh' : 'auto',
                maxHeight: isMobile ? '100dvh' : '84vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isMobile ? 'none' : '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.2)',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div 
                className="aether-edge-header"
                style={{
                  padding: isMobile ? '12px 14px' : '16px 20px',
                  paddingTop: isMobile ? 'max(52px, calc(env(safe-area-inset-top, 0px) + 16px))' : '16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 0, 0, 0.25)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📅</span>
                    <span>{selectedDayDetail.fullDateLabel}</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#38bdf8', marginTop: '3px', fontWeight: 600 }}>
                    Total Spent: {selectedDayDetail.amount} ({selectedDayDetail.transactions.length} records)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayDetail(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1.1rem'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Transactions List */}
              <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedDayDetail.transactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🎉</div>
                    <div style={{ fontSize: '0.90rem', fontWeight: 600, color: '#f8fafc' }}>
                      No expenses recorded on this day
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                      All daily transactions will appear here.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewExpenseForm(prev => ({ ...prev, date: selectedDayDetail.dateStr }));
                        setIsAddingExpense(true);
                        setSelectedDayDetail(null);
                      }}
                      style={{
                        marginTop: '16px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#38bdf8',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + Add Expense for this day
                    </button>
                  </div>
                ) : (
                  selectedDayDetail.transactions.map((rec, rIdx) => {
                    const isExp = (rec.type || 'expense').toLowerCase() === 'expense';
                    const icon = getCategoryIcon(rec.category);
                    return (
                      <div
                        key={rec.id || rIdx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '14px',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: isExp ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            flexShrink: 0
                          }}>
                            {icon}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {rec.note || rec.category || (isExp ? 'Expense' : 'Income')}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ textTransform: 'capitalize' }}>{rec.category || 'General'}</span>
                              <span>•</span>
                              <span style={{ textTransform: 'uppercase', color: '#38bdf8' }}>{rec.payment_mode || 'UPI'}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.94rem', fontWeight: 700, color: isExp ? '#ef4444' : '#10b981' }}>
                            {isExp ? '-' : '+'}₹{Number(rec.amount || 0).toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteFinanceRecord(rec.id);
                              setSelectedDayDetail(prev => prev ? ({
                                ...prev,
                                transactions: prev.transactions.filter(t => t.id !== rec.id),
                                amountNum: Math.max(0, prev.amountNum - Number(rec.amount || 0)),
                                amount: `₹${Math.max(0, prev.amountNum - Number(rec.amount || 0)).toLocaleString('en-IN')}`
                              }) : null);
                            }}
                            title="Delete this record"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#ef4444',
                              borderRadius: '8px',
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0, 0, 0, 0.2)' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDayDetail(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#e2e8f0',
                    padding: '8px 18px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FinanceModal;