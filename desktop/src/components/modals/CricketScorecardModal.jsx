import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, Globe, Trophy, Radio, Clock, CheckCircle2, 
  Search, ArrowLeft, Award, MapPin, Tv, Users, Info, ChevronRight, Shield
} from 'lucide-react';

function getISTDisplay(match) {
  if (match.ist_time) return match.ist_time;
  // Fallback regex for "(07:00 GMT)"
  const gmtMatch = (match.status_text || '').match(/(\d{1,2}):(\d{2})\s*GMT/i);
  if (gmtMatch) {
    const h = parseInt(gmtMatch[1], 10);
    const m = parseInt(gmtMatch[2], 10);
    const totalMinutes = h * 60 + m + (5 * 60 + 30);
    const istH = Math.floor(totalMinutes / 60) % 24;
    const istM = totalMinutes % 60;
    const ampm = istH >= 12 ? 'PM' : 'AM';
    const displayH = istH % 12 || 12;
    return `${displayH}:${istM.toString().padStart(2, '0')} ${ampm} IST`;
  }
  return '';
}

function getStreamingDisplay(match) {
  if (match.streaming && match.streaming.platform) return match.streaming;
  const text = `${match.series || ''} ${match.name || ''}`.toLowerCase();
  if (text.includes('new zealand') || text.includes('nz')) {
    return { platform: 'Sony LIV / Sony Sports Ten', channel: 'Sony Sports Ten 1 / 5', ott: 'Sony LIV App', badge: 'Sony LIV' };
  }
  if (text.includes('hong kong') || text.includes('sixes')) {
    return { platform: 'FanCode / Star Sports', channel: 'Star Sports Network', ott: 'FanCode App & Web', badge: 'FanCode' };
  }
  if (text.includes('australia') || text.includes('sheffield') || text.includes('bbl')) {
    return { platform: 'Disney+ Hotstar / Star Sports', channel: 'Star Sports Select', ott: 'Disney+ Hotstar', badge: 'Hotstar' };
  }
  if (text.includes('bangladesh') || text.includes('ncl')) {
    return { platform: 'T Sports / YouTube (BCB Live)', channel: 'T Sports', ott: 'YouTube (BCB Live)', badge: 'YouTube' };
  }
  if (text.includes('india')) {
    return { platform: 'JioCinema / Sports18', channel: 'Sports18 Network', ott: 'JioCinema App', badge: 'JioCinema' };
  }
  return { platform: 'FanCode / Live Stream', channel: 'Sports Feed', ott: 'FanCode App & Web', badge: 'Live Stream' };
}

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
  
  // Detailed scorecard state
  const [detailData, setDetailData] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [activeInningsTab, setActiveInningsTab] = useState(0);
  const [detailTab, setDetailTab] = useState('scorecard'); // 'scorecard' | 'squads' | 'info'

  // Fetch detailed scorecard when match is selected
  useEffect(() => {
    if (!selectedMatch) {
      setDetailData(null);
      return;
    }
    fetchMatchDetail(selectedMatch);
  }, [selectedMatch?.id]);

  const fetchMatchDetail = async (match) => {
    if (!match?.id) return;
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/cricket/match/${match.id}?league_id=${match.league_id || ''}`);
      if (res.ok) {
        const json = await res.json();
        setDetailData(json);
        setActiveInningsTab(0);
      }
    } catch (e) {
      console.error("Failed to load match detail:", e);
    } finally {
      setIsDetailLoading(false);
    }
  };

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

  // Group matchcards into innings
  const inningsGroups = {};
  (detailData?.matchcards || []).forEach(mc => {
    const innNum = mc.inningsNumber || '1';
    if (!inningsGroups[innNum]) {
      inningsGroups[innNum] = {
        innNum,
        teamName: mc.teamName || `Innings ${innNum}`,
        battingCard: null,
        bowlingCard: null,
        partnershipsCard: null
      };
    }
    if (mc.typeID === '11' || mc.headline === 'Batting') {
      inningsGroups[innNum].battingCard = mc;
      if (mc.teamName) inningsGroups[innNum].teamName = mc.teamName;
    } else if (mc.typeID === '12' || mc.headline === 'Bowling') {
      inningsGroups[innNum].bowlingCard = mc;
    } else if (mc.typeID === '13' || mc.headline === 'Partnerships') {
      inningsGroups[innNum].partnershipsCard = mc;
    }
  });
  const inningsList = Object.values(inningsGroups).sort((a, b) => Number(a.innNum) - Number(b.innNum));
  const currentInnings = inningsList[activeInningsTab] || inningsList[0];

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
        maxWidth: '820px',
        maxHeight: '92vh',
        background: 'linear-gradient(180deg, #0e1526 0%, #070a14 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '24px',
        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 35px rgba(56, 189, 248, 0.15)',
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
          gap: '16px',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedMatch ? (
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#38bdf8',
                  borderRadius: '12px',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
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
            {selectedMatch ? (
              <button
                type="button"
                onClick={() => fetchMatchDetail(selectedMatch)}
                disabled={isDetailLoading}
                title="Refresh Scorecard (स्कोरकार्ड रीफ्रेश करें)"
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#38bdf8',
                  borderRadius: '10px',
                  padding: '0 12px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: isDetailLoading ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={14} className={isDetailLoading ? 'animate-spin' : ''} />
                <span>Refresh Score</span>
              </button>
            ) : (
              onRefresh && (
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
              )
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
            {/* Match Header Hero Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Tournament & Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>
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
                      UPCOMING SCHEDULE
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
                      COMPLETED RESULT
                    </span>
                  )}
                </div>
              </div>

              {/* Match Score Display */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.42)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '16px 20px',
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
                        style={{ width: '34px', height: '34px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>
                        🏏
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: selectedMatch.team1?.is_winner ? '#34d399' : '#f8fafc' }}>
                        {selectedMatch.team1?.name} {selectedMatch.team1?.is_winner && '🏆'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {selectedMatch.team1?.short_name || 'Team 1'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: selectedMatch.status === 'in' ? '#38bdf8' : '#f8fafc', letterSpacing: '0.5px' }}>
                    {selectedMatch.team1?.score || (selectedMatch.status === 'pre' ? 'Yet to bat' : '-')}
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
                        style={{ width: '34px', height: '34px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>
                        🏏
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: selectedMatch.team2?.is_winner ? '#34d399' : '#f8fafc' }}>
                        {selectedMatch.team2?.name} {selectedMatch.team2?.is_winner && '🏆'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {selectedMatch.team2?.short_name || 'Team 2'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: selectedMatch.status === 'in' ? '#38bdf8' : '#f8fafc', letterSpacing: '0.5px' }}>
                    {selectedMatch.team2?.score || (selectedMatch.status === 'pre' ? 'Yet to bat' : '-')}
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div style={{
                background: selectedMatch.status === 'in' ? 'rgba(239, 68, 68, 0.12)' : (selectedMatch.status === 'post' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                border: selectedMatch.status === 'in' ? '1px solid rgba(239, 68, 68, 0.3)' : (selectedMatch.status === 'post' ? '1px solid rgba(52, 211, 153, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)'),
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: selectedMatch.status === 'in' ? '#f87171' : (selectedMatch.status === 'post' ? '#34d399' : '#fbbf24')
              }}>
                📊 {selectedMatch.status_text || selectedMatch.description}
              </div>

              {/* IST TIME & LIVE STREAMING BADGES */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '10px'
              }}>
                {/* IST Time Box */}
                <div style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.22)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                    flexShrink: 0
                  }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🇮🇳 Match Timing (IST)
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#38bdf8', marginTop: '1px' }}>
                      {getISTDisplay(selectedMatch) || "Scheduled Time"}
                    </div>
                    {selectedMatch.venue && (
                      <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '1px' }}>
                        Venue: {selectedMatch.venue}
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Streaming Box */}
                {(() => {
                  const streaming = getStreamingDisplay(selectedMatch);
                  return (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.22)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f87171',
                        flexShrink: 0
                      }}>
                        <Tv size={18} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          📺 Live Broadcast & Streaming
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f87171', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {streaming.platform}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: '#94a3b8', marginTop: '1px' }}>
                          OTT: {streaming.ott}
                        </div>
                      </div>
                    </div>
                  );
                })()}
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

            {/* In-App Match Center Section Tabs */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '8px'
            }}>
              <button
                type="button"
                onClick={() => setDetailTab('scorecard')}
                style={{
                  background: detailTab === 'scorecard' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: detailTab === 'scorecard' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.06)',
                  color: detailTab === 'scorecard' ? '#38bdf8' : '#94a3b8',
                  padding: '7px 16px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <span>📊 Full Scorecard</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('squads')}
                style={{
                  background: detailTab === 'squads' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: detailTab === 'squads' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.06)',
                  color: detailTab === 'squads' ? '#38bdf8' : '#94a3b8',
                  padding: '7px 16px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Users size={14} />
                <span>Playing XI / Squads</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('info')}
                style={{
                  background: detailTab === 'info' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: detailTab === 'info' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.06)',
                  color: detailTab === 'info' ? '#38bdf8' : '#94a3b8',
                  padding: '7px 16px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Info size={14} />
                <span>Highlights & Info</span>
              </button>
            </div>

            {/* TAB 1: FULL DETAILED SCORECARD (Batting & Bowling Tables) */}
            {detailTab === 'scorecard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {isDetailLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px', animation: 'spin 1.5s infinite linear' }}>⏳</div>
                    <div style={{ fontSize: '0.88rem' }}>Loading live scorecard tables inside Aether...</div>
                  </div>
                ) : inningsList.length > 0 ? (
                  <>
                    {/* Innings Switcher Tabs */}
                    {inningsList.length > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {inningsList.map((inn, idx) => (
                          <button
                            key={inn.innNum}
                            type="button"
                            onClick={() => setActiveInningsTab(idx)}
                            style={{
                              background: activeInningsTab === idx ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(255, 255, 255, 0.04)',
                              border: activeInningsTab === idx ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                              color: activeInningsTab === idx ? '#fff' : '#94a3b8',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {inn.teamName} ({inn.battingCard?.runs ? `${inn.battingCard.runs} r` : `Innings ${inn.innNum}`})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Batting Scorecard Table */}
                    {currentInnings?.battingCard && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          padding: '12px 16px',
                          background: 'rgba(56, 189, 248, 0.06)',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🏏 Batting: {currentInnings.battingCard.teamName || currentInnings.teamName}</span>
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
                            {currentInnings.battingCard.runs} {currentInnings.battingCard.total}
                          </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ background: 'rgba(0, 0, 0, 0.3)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                <th style={{ padding: '8px 14px' }}>BATTER</th>
                                <th style={{ padding: '8px 12px' }}>DISMISSAL</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>R</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>B</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>4s</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>6s</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>SR</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(currentInnings.battingCard.playerDetails || []).map((p, pIdx) => {
                                const runs = Number(p.runs || 0);
                                const balls = Number(p.ballsFaced || 0);
                                const sr = p.strikeRate || (balls > 0 ? ((runs / balls) * 100).toFixed(1) : '-');
                                return (
                                  <tr
                                    key={pIdx}
                                    style={{
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                      background: pIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                                    }}
                                  >
                                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                                      {p.playerName}
                                    </td>
                                    <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.74rem' }}>
                                      {p.dismissal || 'not out'}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#38bdf8', fontSize: '0.84rem' }}>
                                      {p.runs}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#cbd5e1' }}>
                                      {p.ballsFaced || 0}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#cbd5e1' }}>
                                      {p.fours || 0}
                                    </td>
                                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#cbd5e1' }}>
                                      {p.sixes || 0}
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#94a3b8', fontSize: '0.74rem' }}>
                                      {sr}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Extras & Total Summary */}
                        <div style={{
                          padding: '10px 16px',
                          background: 'rgba(0, 0, 0, 0.25)',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          fontSize: '0.76rem',
                          color: '#94a3b8',
                          flexWrap: 'wrap'
                        }}>
                          <div>
                            <strong>Extras:</strong> {currentInnings.battingCard.extras || 'None'}
                          </div>
                          <div>
                            <strong>Total:</strong> <span style={{ color: '#34d399', fontWeight: 700 }}>{currentInnings.battingCard.runs}</span> {currentInnings.battingCard.total}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bowling Scorecard Table */}
                    {currentInnings?.bowlingCard && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          padding: '12px 16px',
                          background: 'rgba(239, 68, 68, 0.06)',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          color: '#f8fafc'
                        }}>
                          🎯 Bowling: {currentInnings.bowlingCard.teamName || 'Opposition'}
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ background: 'rgba(0, 0, 0, 0.3)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                <th style={{ padding: '8px 14px' }}>BOWLER</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>O</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>M</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>R</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>W</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>ECON</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(currentInnings.bowlingCard.playerDetails || []).map((b, bIdx) => (
                                <tr
                                  key={bIdx}
                                  style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                    background: bIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                                  }}
                                >
                                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                                    {b.playerName}
                                  </td>
                                  <td style={{ padding: '10px 10px', textAlign: 'right', color: '#cbd5e1' }}>
                                    {b.overs}
                                  </td>
                                  <td style={{ padding: '10px 10px', textAlign: 'right', color: '#cbd5e1' }}>
                                    {b.maidens || 0}
                                  </td>
                                  <td style={{ padding: '10px 10px', textAlign: 'right', color: '#cbd5e1' }}>
                                    {b.conceded || 0}
                                  </td>
                                  <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#34d399', fontSize: '0.84rem' }}>
                                    {b.wickets || 0}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#94a3b8', fontSize: '0.74rem' }}>
                                    {b.economyRate || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Fallback when match is upcoming or no matchcards yet */
                  <div style={{
                    textAlign: 'center',
                    padding: '36px 20px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '16px',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{ fontSize: '2.5rem' }}>🏏</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      {selectedMatch.status === 'pre' ? 'यह मैच अभी शुरू होने वाला है' : 'लाइव स्कोरकार्ड अपडेट हो रहा है'}
                    </div>
                    <div style={{ fontSize: '0.80rem', color: '#94a3b8', maxWidth: '420px', lineHeight: '1.4' }}>
                      {selectedMatch.status === 'pre'
                        ? `मैच का भारतीय समय: ${getISTDisplay(selectedMatch) || selectedMatch.status_text}। मैच शुरू होते ही लाइव गेंद-दर-गेंद स्कोरकार्ड यहाँ दिखेगा।`
                        : `मैच की ताज़ा स्थिति: ${selectedMatch.status_text || 'In Progress'}। आप ऊपर 'Playing XI / Squads' टैब में दोनों टीमों की प्लेइंग 11 देख सकते हैं।`}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailTab('squads')}
                      style={{
                        marginTop: '8px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      View Playing XI / Squads →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PLAYING XI / SQUADS */}
            {detailTab === 'squads' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {detailData?.rosters && detailData.rosters.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {detailData.rosters.map((rost, rIdx) => (
                      <div
                        key={rIdx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '16px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                          {rost.logo && <img src={rost.logo} alt={rost.team} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />}
                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                            {rost.team}
                          </div>
                          <span style={{ fontSize: '0.70rem', color: '#94a3b8', marginLeft: 'auto' }}>
                            {rost.players?.length || 0} Players
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(rost.players || []).map((pl, pIdx) => (
                            <div
                              key={pIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                background: pIdx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                fontSize: '0.78rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#64748b', fontSize: '0.70rem', width: '16px' }}>{pIdx + 1}.</span>
                                <span style={{ color: '#f8fafc', fontWeight: 600 }}>{pl.name}</span>
                              </div>
                              {pl.position && (
                                <span style={{ color: '#94a3b8', fontSize: '0.70rem' }}>{pl.position}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8' }}>
                    <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <div style={{ fontSize: '0.88rem' }}>Squad details are being updated by Cricinfo.</div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: HIGHLIGHTS & MATCH INFO */}
            {detailTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Match Notes & Highlights */}
                {((detailData?.notes && detailData.notes.length > 0) || (selectedMatch.highlights && selectedMatch.highlights.length > 0)) && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#f59e0b', fontWeight: 700, fontSize: '0.86rem' }}>
                      <Award size={16} />
                      <span>MATCH HIGHLIGHTS & SESSIONS</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(detailData?.notes || selectedMatch.highlights || []).map((note, nIdx) => (
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

                {/* Additional Match Details */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                    Match Details & Officials
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.78rem' }}>
                    <div style={{ color: '#94a3b8' }}>
                      <strong style={{ color: '#f8fafc' }}>Match:</strong> {selectedMatch.name}
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      <strong style={{ color: '#f8fafc' }}>Series:</strong> {selectedMatch.series}
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      <strong style={{ color: '#f8fafc' }}>Venue:</strong> {selectedMatch.venue || 'International Ground'}
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      <strong style={{ color: '#f8fafc' }}>Toss:</strong> {selectedMatch.toss || 'Not conducted yet'}
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      <strong style={{ color: '#f8fafc' }}>IST Time:</strong> {getISTDisplay(selectedMatch) || '-'}
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      <strong style={{ color: '#f8fafc' }}>Broadcast:</strong> {getStreamingDisplay(selectedMatch).platform}
                    </div>
                  </div>
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
                  const istTime = getISTDisplay(m);
                  const streaming = getStreamingDisplay(m);

                  return (
                    <div
                      key={m.id || m.name}
                      onClick={() => setSelectedMatch(m)}
                      style={{
                        background: isLive ? 'rgba(239, 68, 68, 0.04)' : 'rgba(255, 255, 255, 0.03)',
                        border: isLive ? '1px solid rgba(239, 68, 68, 0.28)' : '1px solid rgba(255, 255, 255, 0.07)',
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
                        background: 'rgba(0, 0, 0, 0.32)',
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

                      {/* IST TIME & LIVE STREAMING BADGES ON LIST CARD */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                        background: 'rgba(0, 0, 0, 0.2)',
                        padding: '6px 10px',
                        borderRadius: '8px'
                      }}>
                        {/* IST Time */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem' }}>
                          <span style={{ color: '#38bdf8', fontWeight: 700 }}>🇮🇳 {istTime || 'IST Time'}</span>
                          {m.status_text && m.status_text.includes('local time') && (
                            <span style={{ color: '#64748b', fontSize: '0.70rem' }}>
                              ({m.status_text.replace('Match scheduled to begin at ', '')})
                            </span>
                          )}
                        </div>

                        {/* Streaming Platform */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#f87171',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 600
                        }}>
                          <Tv size={11} />
                          <span>{streaming.badge || streaming.platform}</span>
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
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>View Scorecard</span>
                          <ChevronRight size={13} />
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
