import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Calendar, X, RefreshCw } from 'lucide-react';

function parseUtcDateTime(dtStr) {
  if (!dtStr) return null;
  const str = String(dtStr).trim();
  const hasTz = str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str);
  const normalized = hasTz ? str : `${str}Z`;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date(str) : d;
}

function formatAuditDateTime(dtStr) {
  if (!dtStr) return '';
  const d = parseUtcDateTime(dtStr);
  if (!d || isNaN(d.getTime())) return dtStr;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${timeStr}`;
}

const getLocalDateYMD = (d = new Date()) => {
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const AuditModal = ({
  isOpen,
  onClose,
  auditLogs = [],
  handleUndo,
  apiBase,
  userEmail
}) => {
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [dateSpecificLogs, setDateSpecificLogs] = useState(null);
  const [isLoadingDate, setIsLoadingDate] = useState(false);

  // Compute active target date string (YYYY-MM-DD)
  const activeDateYMD = useMemo(() => {
    if (dateFilter === 'today') {
      return getLocalDateYMD(new Date());
    }
    if (dateFilter === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return getLocalDateYMD(y);
    }
    if (dateFilter === 'custom' && customDate) {
      return customDate;
    }
    return null;
  }, [dateFilter, customDate]);

  // Fetch full logs for specific date from server
  useEffect(() => {
    if (!isOpen) return;
    if (!activeDateYMD) {
      setDateSpecificLogs(null);
      return;
    }

    let isMounted = true;
    const fetchByDate = async () => {
      setIsLoadingDate(true);
      try {
        const url = apiBase ? `${apiBase}/audit-logs?date=${activeDateYMD}` : `/api/audit-logs?date=${activeDateYMD}`;
        const headers = userEmail ? { 'X-User-Email': userEmail } : {};
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setDateSpecificLogs(data);
        }
      } catch (e) {
        console.warn('Failed to fetch audit logs for date:', e);
      } finally {
        if (isMounted) setIsLoadingDate(false);
      }
    };

    fetchByDate();
    return () => { isMounted = false; };
  }, [isOpen, activeDateYMD, apiBase, userEmail]);

  // Display logs: If dateSpecificLogs is available use it, otherwise filter auditLogs in-memory
  const displayLogs = useMemo(() => {
    if (dateFilter === 'all') return auditLogs;
    if (dateSpecificLogs !== null) {
      if (activeDateYMD) {
        return dateSpecificLogs.filter(log => {
          if (!log.executed_at) return false;
          const logDate = getLocalDateYMD(parseUtcDateTime(log.executed_at));
          return logDate === activeDateYMD;
        });
      }
      return dateSpecificLogs;
    }
    if (!activeDateYMD) return auditLogs;

    // Fallback: in-memory filter
    return auditLogs.filter(log => {
      if (!log.executed_at) return false;
      const logDate = getLocalDateYMD(parseUtcDateTime(log.executed_at));
      return logDate === activeDateYMD;
    });
  }, [dateFilter, activeDateYMD, dateSpecificLogs, auditLogs]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '20px 22px', width: '100%', maxWidth: '520px', maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
            <Shield size={18} />
            <span style={{ fontSize: '0.95rem', letterSpacing: '0.02em' }}>ACTIONS & AUDIT TRAIL</span>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#94a3b8', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Date Filter Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            
            {/* Preset Buttons */}
            <div style={{ display: 'flex', gap: '5px' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setDateFilter(tab.id);
                    if (tab.id !== 'custom') setCustomDate('');
                  }}
                  style={{
                    background: dateFilter === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${dateFilter === tab.id ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: dateFilter === tab.id ? '#38bdf8' : '#94a3b8',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Custom Date Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.06)', border: `1px solid ${dateFilter === 'custom' ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}`, borderRadius: '8px', padding: '3px 8px' }}>
              <Calendar size={13} color={dateFilter === 'custom' ? '#38bdf8' : '#94a3b8'} />
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) setDateFilter('custom');
                  else setDateFilter('all');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.74rem',
                  outline: 'none',
                  colorScheme: 'dark',
                  cursor: 'pointer'
                }}
              />
              {dateFilter === 'custom' && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomDate('');
                    setDateFilter('all');
                  }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', padding: '0 2px' }}
                  title="Clear custom date"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Status & Count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.70rem', color: '#64748b', marginTop: '2px' }}>
            <span>
              {isLoadingDate ? 'Fetching logs for date...' : (
                dateFilter === 'all'
                  ? 'Showing all recent audit logs'
                  : `Filtered by: ${dateFilter === 'today' ? 'Today' : dateFilter === 'yesterday' ? 'Yesterday' : customDate}`
              )}
            </span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>
              {displayLogs.length} {displayLogs.length === 1 ? 'event' : 'events'}
            </span>
          </div>
        </div>

        {/* Logs List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoadingDate ? (
            <div style={{ color: '#94a3b8', fontSize: '0.84rem', textAlign: 'center', padding: '30px 0' }}>
              Loading audit logs...
            </div>
          ) : displayLogs.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.84rem', textAlign: 'center', padding: '30px 0' }}>
              {dateFilter === 'all' ? 'No actions logged yet.' : 'No audit records found on this date.'}
            </div>
          ) : (
            displayLogs.map(log => (
              <div key={log.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {log.action_type}
                  </span>
                  <span style={{ fontSize: '0.70rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {formatAuditDateTime(log.executed_at)}
                  </span>
                </div>
                <div style={{ color: '#ffffff', fontSize: '0.84rem', lineHeight: '1.4' }}>
                  {log.details}
                </div>
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
    </div>
  );
};

export default AuditModal;
