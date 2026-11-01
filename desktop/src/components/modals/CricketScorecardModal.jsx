import React, { useState } from 'react';
import { X, RefreshCw, ExternalLink, Globe, Trophy, Radio, Clock, CheckCircle2, Search } from 'lucide-react';

export function CricketScorecardModal({
  isOpen,
  onClose,
  matches = [],
  isLoading = false,
  onRefresh
}) {
  const [scopeFilter, setScopeFilter] = useState('international'); // 'international' | 'all' | 'leagues'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in' | 'pre' | 'post'
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Filter matches based on Scope
  const scopeFiltered = matches.filter(m => {
    if (scopeFilter === 'international') {
      return Boolean(m.is_international);
    }
    if (scopeFilter === 'leagues') {
      return !m.is_international;
    }
    return true; // 'all'
  });

  // Filter based on Status ('in'=live, 'pre'=upcoming, 'post'=finished)
  const statusFiltered = scopeFiltered.filter(m => {
    if (statusFilter === 'all') return true;
    return m.status === statusFilter;
  });

  // Filter based on Search
  const finalMatches = statusFiltered.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.series || '').toLowerCase().includes(q) ||
      (m.team1?.name || '').toLowerCase().includes(q) ||
      (m.team2?.name || '').toLowerCase().includes(q) ||
      (m.venue || '').toLowerCase().includes(q)
    );
  });

  const liveCount = matches.filter(m => m.status === 'in').length;
  const intlCount = matches.filter(m => m.is_international).length;
  const upcomingCount = matches.filter(m => m.status === 'pre').length;
  const completedCount = matches.filter(m => m.status === 'post').length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '740px',
        maxHeight: '90vh',
        background: 'linear-gradient(180deg, #0e1526 0%, #070a14 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '24px',
        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem'
            }}>
              🏏
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.3px' }}>
                  Live Cricket Scorecards
                </h3>
                {liveCount > 0 && (
                  <span style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }}></span>
                    {liveCount} LIVE
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Official Live Feed from ESPNcricinfo</span>
                <span>•</span>
                <span>Real-time ball updates</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                title="Refresh Live Scores (स्कोर रीफ्रेश करें)"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94a3b8',
                  borderRadius: '10px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Close (बंद करें)"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94a3b8',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Multi-Match Separation Standard: Scope Tabs */}
        <div style={{
          padding: '12px 20px 8px',
          background: 'rgba(0, 0, 0, 0.25)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Main Scope Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => setScopeFilter('international')}
              style={{
                background: scopeFilter === 'international' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(255, 255, 255, 0.04)',
                border: scopeFilter === 'international' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                color: scopeFilter === 'international' ? '#fff' : '#94a3b8',
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '0.80rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              <Globe size={14} />
              <span>International ({intlCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              style={{
                background: scopeFilter === 'all' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(255, 255, 255, 0.04)',
                border: scopeFilter === 'all' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                color: scopeFilter === 'all' ? '#fff' : '#94a3b8',
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '0.80rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              <span>🏏 All Matches ({matches.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setScopeFilter('leagues')}
              style={{
                background: scopeFilter === 'leagues' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(255, 255, 255, 0.04)',
                border: scopeFilter === 'leagues' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                color: scopeFilter === 'leagues' ? '#fff' : '#94a3b8',
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '0.80rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              <Trophy size={14} />
              <span>T20 & Domestic Leagues ({Math.max(0, matches.length - intlCount)})</span>
            </button>
          </div>

          {/* Status Sub-Filters & Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                style={{
                  background: statusFilter === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: statusFilter === 'all' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  color: statusFilter === 'all' ? '#38bdf8' : '#64748b',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in')}
                style={{
                  background: statusFilter === 'in' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                  border: statusFilter === 'in' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                  color: statusFilter === 'in' ? '#f87171' : '#64748b',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Radio size={12} />
                Live Now ({liveCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pre')}
                style={{
                  background: statusFilter === 'pre' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  border: statusFilter === 'pre' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                  color: statusFilter === 'pre' ? '#fbbf24' : '#64748b',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Clock size={12} />
                Upcoming ({upcomingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('post')}
                style={{
                  background: statusFilter === 'post' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                  border: statusFilter === 'post' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid transparent',
                  color: statusFilter === 'post' ? '#34d399' : '#64748b',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <CheckCircle2 size={12} />
                Completed ({completedCount})
              </button>
            </div>

            {/* Quick Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '3px 8px',
              maxWidth: '180px'
            }}>
              <Search size={13} color="#64748b" />
              <input
                type="text"
                placeholder="Team / Series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '0.74rem',
                  width: '100%'
                }}
              />
            </div>
          </div>
        </div>

        {/* Match Feed Content List */}
        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {isLoading && matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px', animation: 'spin 1.5s infinite linear' }}>⏳</div>
              <div style={{ fontSize: '0.88rem' }}>Fetching live scorecards from ESPNcricinfo...</div>
            </div>
          ) : finalMatches.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🏏</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc' }}>
                इस फ़िल्टर में कोई मैच उपलब्ध नहीं है
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                ऊपर दिए गए "International" या "All Matches" टैब पर स्विच करके अन्य लाइव मैच देखें।
              </div>
            </div>
          ) : (
            finalMatches.map((m) => {
              const isLive = m.status === 'in';
              const isUpcoming = m.status === 'pre';
              const isFinished = m.status === 'post';

              return (
                <div
                  key={m.id || m.name}
                  style={{
                    background: isLive ? 'rgba(239, 68, 68, 0.04)' : 'rgba(255, 255, 255, 0.03)',
                    border: isLive ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    boxShadow: isLive ? '0 4px 20px rgba(239, 68, 68, 0.08)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Card Header: Tournament & Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {m.is_international && (
                        <span style={{
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          INTL
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {m.series || "Cricket Match"}
                      </span>
                    </div>

                    <div>
                      {isLive && (
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#f87171',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.2s infinite' }}></span>
                          LIVE NOW
                        </span>
                      )}
                      {isUpcoming && (
                        <span style={{
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          color: '#fbbf24',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          UPCOMING
                        </span>
                      )}
                      {isFinished && (
                        <span style={{
                          background: 'rgba(52, 211, 153, 0.12)',
                          border: '1px solid rgba(52, 211, 153, 0.3)',
                          color: '#34d399',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          RESULT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scoreboard Body: Team 1 vs Team 2 */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.28)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {/* Team 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {m.team1?.logo ? (
                          <img
                            src={m.team1.logo}
                            alt={m.team1.name}
                            style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.70rem' }}>
                            🏏
                          </div>
                        )}
                        <span style={{
                          fontSize: '0.88rem',
                          fontWeight: m.team1?.is_winner ? 700 : 600,
                          color: m.team1?.is_winner ? '#34d399' : '#f8fafc',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {m.team1?.name} {m.team1?.is_winner && '🏆'}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '0.94rem',
                        fontWeight: 700,
                        color: isLive ? '#38bdf8' : '#e2e8f0',
                        letterSpacing: '0.4px',
                        whiteSpace: 'nowrap'
                      }}>
                        {m.team1?.score || (isUpcoming ? 'Yet to bat' : '-')}
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {m.team2?.logo ? (
                          <img
                            src={m.team2.logo}
                            alt={m.team2.name}
                            style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.70rem' }}>
                            🏏
                          </div>
                        )}
                        <span style={{
                          fontSize: '0.88rem',
                          fontWeight: m.team2?.is_winner ? 700 : 600,
                          color: m.team2?.is_winner ? '#34d399' : '#f8fafc',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {m.team2?.name} {m.team2?.is_winner && '🏆'}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '0.94rem',
                        fontWeight: 700,
                        color: isLive ? '#38bdf8' : '#e2e8f0',
                        letterSpacing: '0.4px',
                        whiteSpace: 'nowrap'
                      }}>
                        {m.team2?.score || (isUpcoming ? 'Yet to bat' : '-')}
                      </div>
                    </div>
                  </div>

                  {/* Match Situation / Summary Note */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '0.76rem',
                        color: isLive ? '#f87171' : (isFinished ? '#34d399' : '#fbbf24'),
                        fontWeight: 500
                      }}>
                        {m.status_text || m.description || "Live cricket coverage"}
                      </div>
                      {m.venue && (
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                          📍 {m.venue}
                        </div>
                      )}
                    </div>

                    {/* Cricinfo Direct Link */}
                    {m.cricinfo_url && (
                      <a
                        href={m.cricinfo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          textDecoration: 'none',
                          flexShrink: 0,
                          transition: 'all 0.15s'
                        }}
                      >
                        <span>Cricinfo Scorecard</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: '#64748b'
        }}>
          <div>
            <span>Showing {finalMatches.length} of {matches.length} matches</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#e2e8f0',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close (बंद करें)
          </button>
        </div>
      </div>
    </div>
  );
}
