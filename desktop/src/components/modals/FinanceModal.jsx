import React, { useState } from 'react';
import { Wallet, Plus, X, Edit3, Trash2, Download, SlidersHorizontal, RotateCcw, Check } from 'lucide-react';

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
  { id: 'shopping', cat: 'shopping', name: '🛒 Shopping', limit: 10000 }
];

export const FinanceModal = ({
  isOpen,
  onClose,
  financeSummary,
  financeRecords,
  isAddingExpense,
  setIsAddingExpense,
  newExpenseForm,
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

  const handleSaveBudgetLimit = (id, newLimit) => {
    const updated = budgets.map(b => b.id === id ? { ...b, limit: Number(newLimit) || 0 } : b);
    setBudgets(updated);
    localStorage.setItem('aether_custom_budgets', JSON.stringify(updated));
  };

  const handleDeleteBudget = (id) => {
    const updated = budgets.filter(b => b.id !== id);
    setBudgets(updated);
    localStorage.setItem('aether_custom_budgets', JSON.stringify(updated));
    showToast("बजट कैटेगरी हटा दी गई", "info");
  };

  const handleAddBudgetCategory = (e) => {
    e.preventDefault();
    if (!newBudgetForm.name.trim() || !newBudgetForm.limit) {
      showToast("कृपया नाम और बजट लिमिट भरें", "info");
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
    showToast(`नई बजट कैटेगरी '${newEntry.name}' जोड़ी गई! ✅`, "success");
  };

  const handleResetBudgets = () => {
    setBudgets(DEFAULT_BUDGETS);
    localStorage.setItem('aether_custom_budgets', JSON.stringify(DEFAULT_BUDGETS));
    showToast("बजट डिफ़ॉल्ट पर रीसेट कर दिया गया", "info");
  };

  const handleExportCSV = () => {
    if (!financeRecords || financeRecords.length === 0) {
      showToast("एक्सपोर्ट करने के लिए कोई लेन-देन रिकॉर्ड नहीं है।", "info");
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
    showToast("वित्तीय रिपोर्ट CSV सफलतापूर्वक डाउनलोड हो गई! 📥", "success");
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700 }}>
            <Wallet size={18} />
            <span>EXECUTIVE WEALTH & LEDGER</span>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px', padding: '14px' }}>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>TOTAL BALANCE</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>₹{financeSummary.balance.toLocaleString('en-IN')}</div>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '14px', padding: '14px' }}>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>TOTAL EXPENSES</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>₹{financeSummary.total_expense.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Monthly Budget Tracking (Customizable & Dynamic) */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: 600 }}>मासिक बजट स्थिति (Monthly Budgets)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsEditingBudgets(!isEditingBudgets)}
                style={{
                  background: isEditingBudgets ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  borderRadius: '8px',
                  padding: '2px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <SlidersHorizontal size={11} />
                <span>{isEditingBudgets ? 'पूर्ण (Done)' : '⚙️ बजट बदलें'}</span>
              </button>
              <span style={{ fontSize: '0.68rem', color: '#10b981' }}>ऑटो-अलर्ट सक्रिय</span>
            </div>
          </div>

          {/* Budget Editor (Inline Drawer) */}
          {isEditingBudgets && (
            <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>कैटेगरी बजट लिमिट सेट करें:</span>
                <button
                  type="button"
                  onClick={handleResetBudgets}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.68rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <RotateCcw size={10} /> Reset
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                {budgets.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#e2e8f0', flex: 1 }}>{b.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>₹</span>
                      <input
                        type="number"
                        defaultValue={b.limit}
                        onBlur={(e) => handleSaveBudgetLimit(b.id, e.target.value)}
                        style={{ width: '80px', background: '#0a101d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', padding: '3px 6px', textAlign: 'right' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteBudget(b.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                        title="Delete category"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Category */}
              <form onSubmit={handleAddBudgetCategory} style={{ display: 'flex', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <input
                  type="text"
                  placeholder="नई कैटेगरी (उदा. 💊 Medical)"
                  value={newBudgetForm.name}
                  onChange={e => setNewBudgetForm({ ...newBudgetForm, name: e.target.value })}
                  style={{ flex: 1, background: '#0a101d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.72rem', padding: '4px 8px' }}
                />
                <input
                  type="number"
                  placeholder="लिमिट (₹)"
                  value={newBudgetForm.limit}
                  onChange={e => setNewBudgetForm({ ...newBudgetForm, limit: e.target.value })}
                  style={{ width: '80px', background: '#0a101d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.72rem', padding: '4px 6px' }}
                />
                <button
                  type="submit"
                  style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', borderRadius: '6px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  जोड़ें
                </button>
              </form>
            </div>
          )}

          {/* Budget Progress Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {budgets.map(b => {
              const spent = financeRecords
                .filter(r => (r.category || '').toLowerCase().includes(b.cat) && (r.type === 'expense' || r.record_type === 'expense' || !r.type))
                .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
              const limit = b.limit || 1;
              const pct = Math.min(100, Math.round((spent / limit) * 100));
              const isWarning = pct >= 80;
              const isExceeded = pct >= 100;
              return (
                <div key={b.id || b.cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '3px' }}>
                    <span style={{ color: '#e2e8f0' }}>{b.name}</span>
                    <span style={{ color: isExceeded ? '#ef4444' : isWarning ? '#f59e0b' : '#94a3b8', fontWeight: isWarning ? 700 : 400 }}>
                      ₹{spent.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')} ({pct}%)
                      {isExceeded && ' ⚠️ सीमा पार!'}
                    </span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${pct}%`, 
                      background: isExceeded 
                        ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
                        : isWarning 
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)' 
                        : 'linear-gradient(90deg, #10b981, #38bdf8)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Header + Actions (Export CSV + Add Expense Toggle) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0 }}>Recent Financial Entries ({financeRecords.length})</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleExportCSV}
              title="Download CSV Spreadsheet"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#10b981',
                borderRadius: '10px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
            <button 
              type="button"
              onClick={() => setIsAddingExpense(!isAddingExpense)}
              style={{
                background: isAddingExpense ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                border: isAddingExpense ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                color: isAddingExpense ? '#ef4444' : '#38bdf8',
                borderRadius: '10px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isAddingExpense ? <X size={13} /> : <Plus size={13} />}
              {isAddingExpense ? 'रद्द करें' : 'नया खर्च'}
            </button>
          </div>
        </div>

        {/* Quick Add Form */}
        {isAddingExpense && (
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Type</label>
                <select 
                  value={newExpenseForm.type}
                  onChange={e => setNewExpenseForm({ ...newExpenseForm, type: e.target.value })}
                  style={{ width: '100%', background: '#0a101d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '6px 8px', fontSize: '0.8rem' }}
                >
                  <option value="expense">Expense (खर्च)</option>
                  <option value="income">Income (आय)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Category</label>
                <select 
                  value={newExpenseForm.category}
                  onChange={e => setNewExpenseForm({ ...newExpenseForm, category: e.target.value })}
                  style={{ width: '100%', background: '#0a101d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '6px 8px', fontSize: '0.8rem' }}
                >
                  <option value="fuel">⛽ Petrol / Fuel</option>
                  <option value="food">🍔 Food / Dining</option>
                  <option value="shopping">🛒 Shopping</option>
                  <option value="travel">🚗 Travel / Cab</option>
                  <option value="rent">🏠 Rent / Home</option>
                  <option value="bills">⚡ Bills / Recharge</option>
                  <option value="medical">💊 Medical</option>
                  <option value="general">🏷️ Other / General</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Amount (₹)</label>
                <input 
                  type="number" 
                  placeholder="500"
                  value={newExpenseForm.amount}
                  onChange={e => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                  style={{ width: '100%', background: '#0a101d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '6px 8px', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Note / Detail</label>
                <input 
                  type="text" 
                  placeholder="e.g. पेट्रोल डलवाया, ग्रॉसरी..."
                  value={newExpenseForm.note}
                  onChange={e => setNewExpenseForm({ ...newExpenseForm, note: e.target.value })}
                  style={{ width: '100%', background: '#0a101d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '6px 8px', fontSize: '0.82rem' }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!newExpenseForm.amount) {
                  showToast("कृपया राशि दर्ज करें", "info");
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
                      text: `${newExpenseForm.amount} rupees ${newExpenseForm.type === 'expense' ? 'spent on' : 'received for'} ${newExpenseForm.note || newExpenseForm.category}`,
                      capture_type: 'text'
                    })
                  });
                  setIsAddingExpense(false);
                  setNewExpenseForm({ type: 'expense', category: 'fuel', amount: '', note: '', payment_mode: 'upi' });
                  showToast("नया रिकॉर्ड दर्ज किया गया!", "success");
                  refreshAllData();
                } catch (err) {
                  showToast("जोड़ने में समस्या आई", "error");
                }
              }}
              style={{ width: '100%', background: '#38bdf8', border: 'none', color: '#080c16', padding: '8px', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              सेव करें (Save Record)
            </button>
          </div>
        )}

        {/* List of Entries */}
        {financeRecords.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '30px 0' }}>कोई रिकॉर्ड नहीं है। WhatsApp पर या ऊपर '+ नया खर्च' से जोड़ें।</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {financeRecords.map(rec => {
              const isExp = (rec.type === 'expense' || rec.record_type === 'expense' || !rec.type);
              const isEditingThis = editingFinanceRecord && editingFinanceRecord.id === rec.id;

              if (isEditingThis) {
                return (
                  <div key={rec.id} style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <select
                        value={editingFinanceRecord.category}
                        onChange={e => setEditingFinanceRecord({ ...editingFinanceRecord, category: e.target.value })}
                        style={{ background: '#0a101d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px', padding: '5px', fontSize: '0.78rem' }}
                      >
                        <option value="fuel">⛽ Petrol</option>
                        <option value="food">🍔 Food</option>
                        <option value="shopping">🛒 Shopping</option>
                        <option value="travel">🚗 Travel</option>
                        <option value="rent">🏠 Rent</option>
                        <option value="bills">⚡ Bills</option>
                        <option value="medical">💊 Medical</option>
                        <option value="general">🏷️ General</option>
                      </select>
                      <input 
                        type="number"
                        value={editingFinanceRecord.amount}
                        onChange={e => setEditingFinanceRecord({ ...editingFinanceRecord, amount: e.target.value })}
                        style={{ background: '#0a101d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px', padding: '5px 8px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <input 
                      type="text"
                      value={editingFinanceRecord.note || ''}
                      onChange={e => setEditingFinanceRecord({ ...editingFinanceRecord, note: e.target.value })}
                      placeholder="विवरण (Note)"
                      style={{ width: '100%', background: '#0a101d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px', padding: '5px 8px', fontSize: '0.8rem', marginBottom: '8px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        type="button" 
                        onClick={() => setEditingFinanceRecord(null)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 8px' }}
                      >
                        रद्द करें
                      </button>
                      <button 
                        type="button" 
                        onClick={handleSaveFinanceEdit}
                        style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        अपडेट करें
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={rec.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '10px 12px', 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '0.95rem' }}>{getCategoryIcon(rec.category)}</span>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '1px 6px', 
                        borderRadius: '4px', 
                        background: 'rgba(56, 189, 248, 0.1)', 
                        color: '#38bdf8',
                        textTransform: 'capitalize',
                        fontWeight: 600
                      }}>
                        {rec.category || 'General'}
                      </span>
                      <span style={{ color: '#ffffff', fontSize: '0.84rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.note || rec.description || rec.category || 'खर्च'}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.72rem', display: 'flex', gap: '8px' }}>
                      <span>{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      {rec.payment_mode && (
                        <span style={{ textTransform: 'uppercase', color: '#94a3b8' }}>• {rec.payment_mode}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: isExp ? '#ef4444' : '#10b981', fontWeight: 700, fontSize: '0.95rem' }}>
                      {isExp ? '-' : '+'}₹{Number(rec.amount || 0).toLocaleString('en-IN')}
                    </div>
                    <button
                      type="button"
                      title="Edit expense"
                      onClick={() => setEditingFinanceRecord({
                        id: rec.id,
                        amount: rec.amount,
                        note: rec.note || rec.description || '',
                        category: rec.category || 'general',
                        type: rec.type || 'expense'
                      })}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#94a3b8',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      title="Delete expense"
                      onClick={() => handleDeleteFinanceRecord(rec.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        color: '#ef4444',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
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
    </div>
  );
};

export default FinanceModal;
