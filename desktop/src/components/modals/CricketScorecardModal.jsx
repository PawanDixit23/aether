import React, { useState } from 'react';
import { X, RefreshCw, Globe, Trophy, Radio, Clock, CheckCircle2, Search, ArrowLeft, Award, MapPin } from 'lucide-react';

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
  const [selectedMatch, setSelectedMatch] = useState(null);

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
      background: 'rgba(5, 8, 16, 0.88)',
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
          padding: '18px 24px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedMatch ? (
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#38bdf8',
                  borderRadius: '12px',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Back to matches list (सूची पर वापस)"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem'
              }}>
                🏏
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.3px' }}>
                  {selectedMatch ? "In-App Match Center" : "Live Cricket Scorecards"}
                </h3>
                {!selectedMatch && liveCount > 0 && (
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
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                {selectedMatch ? selectedMatch.name : "Real-time ball updates • 100% inside Aether"}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                title="Refresh Live Scores"
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
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Close"
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

        {/* VIEW A: DETAILED MATCH CENTER (When a specific match is clicked) */}
        {selectedMatch ? (
          <div style={{
            padding: '20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Match Header Badge Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '18px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selectedMatch.is_international && (
                    <span style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      INTERNATIONAL
                    </span>
                  )}
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8' }}>
                    {selectedMatch.series}
                  </span>
                </div>

                <div>
                  {selectedMatch.status === 'in' && (
                    <span style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.2s infinite' }}></span>
                      LIVE MATCH
                    </span>
                  )}
                  {selectedMatch.status === 'pre' && (
                    <span style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#fbbf24',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '8px'
                    }}>
                      SCHEDULED
                    </span>
                  )}
                  {selectedMatch.status === 'post' && (
                    <span style={{
                      background: 'rgba(52, 211, 153, 0.15)',
                      border: '1px solid rgba(52, 211, 153, 0.35)',
                      color: '#34d399',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '8px'
                    }}>
                      COMPLETED
                    </span>
                  )}
                </div>
              </div>

              {/* Match Score Display */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.38)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {/* Team 1 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    {selectedMatch.team1?.logo ? (
                      <img
                        src={selectedMatch.team1.logo}
                        alt={selectedMatch.team1.name}
                        style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                        🏏
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: selectedMatch.team1?.is_winner ? '#34d399' : '#f8fafc' }}>
                        {selectedMatch.team1?.name} {selectedMatch.team1?.is_winner && '🏆'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {selectedMatch.team1?.short_name || 'Team 1'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: selectedMatch.status === 'in' ? '#38bdf8' : '#f8fafc' }}>
                    {selectedMatch.team1?.score || (selectedMatch.status === 'pre' ? 'Upcoming' : '-')}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />

                {/* Team 2 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    {selectedMatch.team2?.logo ? (
                      <img
                        src={selectedMatch.team2.logo}
                        alt={selectedMatch.team2.name}
                        style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                        🏏
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: selectedMatch.team2?.is_winner ? '#34d399' : '#f8fafc' }}>
                        {selectedMatch.team2?.name} {selectedMatch.team2?.is_winner && '🏆'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {selectedMatch.team2?.short_name || 'Team 2'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: selectedMatch.status === 'in' ? '#38bdf8' : '#f8fafc' }}>
                    {selectedMatch.team2?.score || (selectedMatch.status === 'pre' ? 'Upcoming' : '-')}
                  </div>
                </div>
              </div>

              {/* Status Note & Live Equation */}
              <div style={{
                background: selectedMatch.status === 'in' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.08)',
                border: selectedMatch.status === 'in' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: selectedMatch.status === 'in' ? '#f87171' : '#38bdf8'
              }}>
                📊 {selectedMatch.status_text || selectedMatch.description}
              </div>

              {/* Match Extra Info: Toss, Session, Venue */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '0.76rem', color: '#94a3b8' }}>
                {selectedMatch.toss && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    🪙 <strong style={{ color: '#cbd5e1' }}>Toss:</strong> {selectedMatch.toss}
                  </div>
                )}
                {selectedMatch.session && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    🕒 <strong style={{ color: '#cbd5e1' }}>Session:</strong> {selectedMatch.session}
                  </div>
                )}
                {selectedMatch.venue && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    <strong style={{ color: '#cbd5e1' }}>Venue:</strong> {selectedMatch.venue}
                  </div>
                )}
              </div>
            </div>

            {/* In-App Match Highlights & Milestones */}
            {selectedMatch.highlights && selectedMatch.highlights.length > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#f59e0b', fontWeight: 700, fontSize: '0.86rem' }}>
                  <Award size={16} />
                  <span>MATCH HIGHLIGHTS & KEY MILESTONES</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedMatch.highlights.map((note, nIdx) => (
                    <div
                      key={nIdx}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.25)',
                        borderLeft: '3px solid #38bdf8',
                        borderRadius: '0 8px 8px 0',
                        fontSize: '0.80rem',
                        color: '#e2e8f0'
                      }}
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* VIEW B: ALL MATCHES FEED (With standard separation) */
          <>
            {/* Scope Tabs */}
            <div style={{
              padding: '12px 20px 8px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
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
                    whiteSpace: 'nowrap'
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
                    whiteSpace: 'nowrap'
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
                    whiteSpace: 'nowrap'
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

                {/* Quick Search */}
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
                  <div style={{ fontSize: '0.88rem' }}>Loading live scorecards inside Aether...</div>
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
                      onClick={() => setSelectedMatch(m)}
                      style={{
                        background: isLive ? 'rgba(239, 68, 68, 0.04)' : 'rgba(255, 255, 255, 0.03)',
                        border: isLive ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        boxShadow: isLive ? '0 4px 20px rgba(239, 68, 68, 0.08)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s, border-color 0.15s'
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
                              LIVE
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

                      {/* Scoreboard Body */}
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.28)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            {m.team1?.logo ? (
                              <img
                                src={m.team1.logo}
                                alt={m.team1.name}
                                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
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

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            {m.team2?.logo ? (
                              <img
                                src={m.team2.logo}
                                alt={m.team2.name}
                                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
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

                      {/* Match Situation & In-App View Button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontSize: '0.76rem',
                            color: isLive ? '#f87171' : (isFinished ? '#34d399' : '#fbbf24'),
                            fontWeight: 500
                          }}>
                            {m.status_text || m.description || "Live cricket coverage"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMatch(m);
                          }}
                          style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          View Scorecard →
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

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
            {selectedMatch ? (
              <span style={{ color: '#38bdf8', cursor: 'pointer' }} onClick={() => setSelectedMatch(null)}>
                ← Back to matches list
              </span>
            ) : (
              <span>Showing {finalMatches.length} of {matches.length} matches</span>
            )}
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
