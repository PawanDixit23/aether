import React, { useState } from 'react';
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
  TrendingUp,
  Clock,
  ArrowDownCircle
} from 'lucide-react';

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
  if (!isOpen) return null;

  // Active view tab: 'overview' | 'budgets' | 'transactions'
  const [activeTab, setActiveTab] = useState('overview');
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

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
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
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
    if (!financeRecords || financeRecords.length === 0) {
      if (showToast) showToast("No transactions to export.", "info");
      return;
    }
    const headers = ["Record ID", "Date", "Type", "Category", "Amount (INR)", "Payment Mode", "Notes"];
    const rows = financeRecords.map(r => [
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
    link.setAttribute("download", `aether_finance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (showToast) showToast("Finance CSV exported successfully! 📥", "success");
  };

  // =========================================================================
  // 100% REAL & DYNAMIC FINANCE CALCULATIONS
  // =========================================================================

  // Calculate real Income, Expenses, Balance and Savings from records & server summary
  const recordsIncome = (financeRecords || [])
    .filter(r => (r.type || '').toLowerCase() === 'income')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const recordsExpense = (financeRecords || [])
    .filter(r => (r.type || 'expense').toLowerCase() === 'expense')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const effectiveIncome = recordsIncome > 0 ? recordsIncome : Number(financeSummary?.total_income || 0);
  const effectiveExpense = recordsExpense > 0 ? recordsExpense : Number(financeSummary?.total_expense || 0);
  const effectiveBalance = effectiveIncome - effectiveExpense;
  const effectiveSavings = effectiveIncome > effectiveExpense ? effectiveIncome - effectiveExpense : 0;

  // Real Category Breakdown computed dynamically from financeRecords
  const categoryTotals = {};
  const expenseRecords = (financeRecords || []).filter(r => (r.type || 'expense').toLowerCase() === 'expense');
  expenseRecords.forEach(r => {
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

  // SVG Donut Slices calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  // Real Weekly Trend for Current Week (Monday through Sunday)
  const now = new Date();
  const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const mondayDate = new Date(now);
  mondayDate.setDate(now.getDate() - currentDayOfWeek);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyData = dayNames.map((dName, dayIdx) => {
    const targetDate = new Date(mondayDate);
    targetDate.setDate(mondayDate.getDate() + dayIdx);
    const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    const dayDateLabel = targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

    const dayExpenseSum = expenseRecords
      .filter(r => (r.date || r.created_at || '').slice(0, 10) === targetDateStr)
      .reduce((acc, r) => acc + Number(r.amount || 0), 0);

    const isToday = dayIdx === currentDayOfWeek;
    return {
      day: dName,
      date: dayDateLabel,
      amountNum: dayExpenseSum,
      amount: `₹${dayExpenseSum.toLocaleString('en-IN')}`,
      isHighlight: isToday
    };
  });

  const maxWeeklyExpense = Math.max(...weeklyData.map(d => d.amountNum), 1);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.88)', backdropFilter: 'blur(16px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#080f1d', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '28px', padding: '22px 20px', width: '100%', maxWidth: '440px', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', boxShadow: '0 24px 64px rgba(0,0,0,0.85)' }}>
        
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

        {/* 3 Tabs: Overview | Budgets | Transactions */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '16px' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'budgets', label: 'Budgets' },
            { id: 'transactions', label: 'Transactions' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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

            {/* Weekly Trend Card */}
            <div style={{ background: '#0e172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '22px', padding: '18px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Weekly Trend
                </h3>
              </div>

              {/* Chart container with Y-axis and bars */}
              <div style={{ display: 'flex', gap: '10px', height: '140px', alignItems: 'flex-end', paddingTop: '30px' }}>
                {/* Y-axis markers */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100px', fontSize: '0.66rem', color: '#64748b', paddingBottom: '20px' }}>
                  <span>₹{Math.round(maxWeeklyExpense).toLocaleString('en-IN')}</span>
                  <span>₹{Math.round(maxWeeklyExpense / 2).toLocaleString('en-IN')}</span>
                  <span>₹0</span>
                </div>

                {/* Bars */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '100px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px' }}>
                  {weeklyData.map((d, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                      {/* Active Tooltip over Today */}
                      {d.isHighlight && (
                        <div style={{ position: 'absolute', top: '-34px', background: 'rgba(15, 23, 42, 0.92)', border: '1px solid #38bdf8', borderRadius: '8px', padding: '3px 7px', fontSize: '0.66rem', color: '#fff', textAlign: 'center', whiteSpace: 'nowrap', zIndex: 5, boxShadow: '0 4px 12px rgba(56,189,248,0.3)' }}>
                          <div style={{ fontWeight: 700, color: '#38bdf8' }}>{d.amount}</div>
                          <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{d.date}</div>
                        </div>
                      )}

                      {/* Bar Pillar */}
                      <div
                        style={{
                          width: '14px',
                          height: d.amountNum > 0 ? `${Math.max(10, (d.amountNum / maxWeeklyExpense) * 100)}%` : '4px',
                          borderRadius: '6px',
                          background: d.isHighlight 
                            ? 'linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)' 
                            : d.amountNum > 0
                              ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.4) 0%, rgba(37, 99, 235, 0.25) 100%)'
                              : 'rgba(255, 255, 255, 0.08)',
                          border: d.isHighlight ? '1px solid #38bdf8' : 'none',
                          boxShadow: d.isHighlight ? '0 0 14px rgba(56, 189, 248, 0.5)' : 'none',
                          transition: 'all 0.3s'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Day Labels below bars */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '34px', marginTop: '6px', fontSize: '0.68rem', color: '#64748b' }}>
                {weeklyData.map((d, idx) => (
                  <span key={idx} style={{ flex: 1, textAlign: 'center', color: d.isHighlight ? '#38bdf8' : '#64748b', fontWeight: d.isHighlight ? 700 : 500 }}>
                    {d.day}
                  </span>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: BUDGETS */}
        {activeTab === 'budgets' && (
          <div style={{ background: '#0e172a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '22px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.86rem', color: '#e2e8f0', fontWeight: 700 }}>Monthly Budgets</span>
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
                const spent = (financeRecords || [])
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
                Recent Transactions ({financeRecords.length})
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

            {financeRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.82rem' }}>
                No transaction records found yet. Record an expense or income below to see history.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {financeRecords.map(rec => {
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
        {isAddingExpense && (
          <div style={{ background: '#0e172a', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '20px', padding: '16px', marginBottom: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
                {newExpenseForm.type === 'income' ? 'Record Income' : 'Record Expense'}
              </span>
              <button type="button" onClick={() => setIsAddingExpense(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={newExpenseForm.amount}
                  onChange={e => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#060a14', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Category</label>
                <select
                  value={newExpenseForm.category}
                  onChange={e => setNewExpenseForm({ ...newExpenseForm, category: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#060a14', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '0.82rem' }}
                >
                  <option value="food">🍔 Food & Dining</option>
                  <option value="shopping">🛒 Shopping</option>
                  <option value="petrol">⛽ Petrol / Fuel</option>
                  <option value="bills">⚡ Bills & Utilities</option>
                  <option value="entertainment">🎬 Entertainment</option>
                  <option value="medical">💊 Medical</option>
                  <option value="other">🏷️ Other</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Note / Description</label>
              <input
                type="text"
                placeholder="e.g. Swiggy lunch, petrol refill..."
                value={newExpenseForm.note}
                onChange={e => setNewExpenseForm({ ...newExpenseForm, note: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', background: '#060a14', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '0.82rem' }}
              />
            </div>

            <button
              type="button"
              onClick={async () => {
                if (!newExpenseForm.amount) {
                  if (showToast) showToast("Please enter an amount", "info");
                  return;
                }
                try {
                  const resp = await fetch(`${API_BASE}/action/quick-capture`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(userEmail ? { 'X-User-Email': userEmail } : {})
                    },
                    body: JSON.stringify({
                      text: `${newExpenseForm.amount} rupees ${newExpenseForm.type === 'income' ? 'received for' : 'spent on'} ${newExpenseForm.note || newExpenseForm.category}`,
                      capture_type: 'text'
                    })
                  });
                  setIsAddingExpense(false);
                  setNewExpenseForm({ type: 'expense', category: 'food', amount: '', note: '', payment_mode: 'upi' });
                  if (showToast) showToast("Transaction recorded successfully! ✅", "success");
                  if (refreshAllData) refreshAllData();
                } catch (err) {
                  if (showToast) showToast("Failed to record transaction", "error");
                }
              }}
              style={{ width: '100%', background: newExpenseForm.type === 'income' ? '#10b981' : '#f43f5e', border: 'none', color: '#ffffff', padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer' }}
            >
              Save Transaction
            </button>
          </div>
        )}

        {/* Fixed Bottom Action Buttons matching Screenshot 2: [Add Expense] [Add Income] */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto', paddingTop: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setNewExpenseForm({ ...newExpenseForm, type: 'expense' });
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
              setNewExpenseForm({ ...newExpenseForm, type: 'income' });
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
        </div>

      </div>
    </div>
  );
};

export default FinanceModal;