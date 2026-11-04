import React, { useState, useEffect, useRef } from 'react';
import { 
  X, RefreshCw, Globe, Trophy, Radio, Clock, CheckCircle2, 
  Search, ArrowLeft, Award, MapPin, Tv, Users, Info, ChevronRight,
  ChevronDown, ChevronUp, Shield
} from 'lucide-react';

function getISTDisplay(match) {
  if (match.ist_time) return match.ist_time;
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
  onRefresh,
  apiBase
}) {
  const [internalMatches, setInternalMatches] = useState([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [scopeFilter, setScopeFilter] = useState('international'); // 'international' | 'all' | 'leagues'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in' | 'pre' | 'post'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  // Detailed scorecard state
  const [detailData, setDetailData] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailTab, setDetailTab] = useState('scorecard'); // 'scorecard' | 'squads' | 'info' | 'live'
  const [expandedInnings, setExpandedInnings] = useState({});
  const detailCacheRef = useRef({});

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

  const triggerHaptic = (duration = 15) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(duration); } catch (_) {}
    }
  };

  const effectiveApiBase = apiBase || (typeof window !== 'undefined' && window.location.port === '5173'
    ? `http://${window.location.hostname}:8000/api`
    : '/api');

  // Trigger matches refresh and direct fetch whenever modal opens
  const refreshScores = async (isSilent = false, isForce = false) => {
    if (!isSilent && internalMatches.length === 0) setInternalLoading(true);
    setIsRefreshing(true);
    try {
      if (onRefresh) onRefresh();
      const res = await fetch(`${effectiveApiBase}/cricket/live${isForce ? '?force=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.matches && data.matches.length > 0) {
          setInternalMatches(data.matches);
        }
      }
    } catch (e) {
      console.warn("Direct cricket live fetch warning:", e);
    } finally {
      setInternalLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshScores(matches && matches.length > 0);
    }
  }, [isOpen, effectiveApiBase]);

  // Fetch detailed scorecard when match is selected with 0-lag optimistic cache
  useEffect(() => {
    if (!selectedMatch) {
      setDetailData(null);
      return;
    }
    const cached = detailCacheRef.current[selectedMatch.id];
    if (cached) {
      setDetailData(cached);
    } else {
      setDetailData(null);
    }
    fetchMatchDetail(selectedMatch, Boolean(cached));
  }, [selectedMatch?.id, effectiveApiBase]);

  const fetchMatchDetail = async (match, isSilent = false, isForce = false) => {
    if (!match?.id) return;
    // Only display full-panel loader on cold start if no match detail exists yet
    if (!isSilent && !detailData && !detailCacheRef.current[match.id]) setIsDetailLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch(`${effectiveApiBase}/cricket/match/${match.id}?league_id=${match.league_id || ''}${isForce ? '&force=true' : ''}`);
      if (res.ok) {
        const json = await res.json();
        detailCacheRef.current[match.id] = json;
        setDetailData(json);
      }
    } catch (e) {
      console.error("Failed to load match detail:", e);
    } finally {
      setIsDetailLoading(false);
      setIsRefreshing(false);
    }
  };

  // Real-time live auto-refresh without user interaction (ultra-low 3s latency for live games)
  useEffect(() => {
    if (!isOpen) return;

    let detailTimer = null;
    if (selectedMatch) {
      // 3 seconds for live matches; 6 seconds for breaks / post match
      const pollMs = selectedMatch.status === 'in' ? 3000 : 6000;
      detailTimer = setInterval(() => {
        fetchMatchDetail(selectedMatch, true);
      }, pollMs);
    }

    let feedTimer = null;
    if (!selectedMatch) {
      feedTimer = setInterval(() => {
        refreshScores(true);
      }, 5000);
    }

    return () => {
      if (detailTimer) clearInterval(detailTimer);
      if (feedTimer) clearInterval(feedTimer);
    };
  }, [isOpen, selectedMatch?.id, selectedMatch?.status, effectiveApiBase]);

  // Active matches source
  const displayMatches = (matches && matches.length > 0) ? matches : internalMatches;
  const isCurrentlyLoading = (isLoading || internalLoading) && displayMatches.length === 0;

  // Filter matches based on Scope
  const scopeFiltered = displayMatches.filter(m => {
    if (scopeFilter === 'international') {
      return Boolean(m.is_international);
    }
    if (scopeFilter === 'leagues') {
      return !m.is_international;
    }
    return true;
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

  const liveCount = displayMatches.filter(m => m.status === 'in').length;
  const intlCount = displayMatches.filter(m => m.is_international).length;
  const upcomingCount = displayMatches.filter(m => m.status === 'pre').length;
  const completedCount = displayMatches.filter(m => m.status === 'post').length;

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

  // Auto-expand the most recent active innings by default
  useEffect(() => {
    if (inningsList.length > 0) {
      const latest = inningsList[inningsList.length - 1];
      setExpandedInnings({ [latest.innNum]: true });
    }
  }, [detailData?.match_id, inningsList.length]);

  const toggleInnings = (innNum) => {
    setExpandedInnings(prev => ({
      ...prev,
      [innNum]: !prev[innNum]
    }));
  };

  // Playing XI / Squads fallback
  const displayRosters = (detailData?.rosters && detailData.rosters.length > 0)
    ? detailData.rosters
    : (inningsList.length > 0
        ? inningsList.map(inn => ({
            team: inn.teamName,
            logo: '',
            players: (inn.battingCard?.playerDetails || []).map(p => ({
              name: p.playerName,
              position: p.dismissal && p.dismissal.includes('†') ? 'Wicketkeeper' : 'Player'
            }))
          }))
        : []);

  // Compute Yet to Bat players for an innings
  const getYetToBat = (inn) => {
    if (!inn?.battingCard) return [];
    const battedNames = new Set((inn.battingCard.playerDetails || []).map(p => (p.playerName || '').toLowerCase()));
    const roster = displayRosters.find(r => 
      (r.team || '').toLowerCase().includes((inn.teamName || '').toLowerCase()) || 
      (inn.teamName || '').toLowerCase().includes((r.team || '').toLowerCase())
    );
    if (!roster) return [];
    return (roster.players || []).filter(p => !battedNames.has((p.name || '').toLowerCase()));
  };

  // Short match title for header (e.g. "NZA v INDA" or "BAN v IND")
  const getMatchShortTitle = (m) => {
    if (!m) return 'Match Center';
    const t1 = m.team1?.short_name || (m.team1?.name || '').split(' ')[0];
    const t2 = m.team2?.short_name || (m.team2?.name || '').split(' ')[0];
    if (t1 && t2) return `${t1} v ${t2}`;
    return m.name || 'Match Center';
  };

  if (!isOpen) return null;

  return (
    <div 
      className="aether-edge-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 8, 16, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 1100,
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
          width: '100%',
          maxWidth: isMobile ? '100%' : '820px',
          height: isMobile ? '100%' : 'auto',
          height: isMobile ? '100dvh' : 'auto',
          maxHeight: isMobile ? '100dvh' : '92vh',
          background: '#0a0f1d',
          border: isMobile ? 'none' : '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: isMobile ? 0 : '24px',
          boxShadow: isMobile ? 'none' : '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Top Header */}
        <div 
          className="aether-edge-header"
          style={{
            flexShrink: 0,
            boxSizing: 'border-box',
            padding: isMobile ? '12px 14px' : '16px 20px',
            paddingTop: isMobile ? 'max(52px, calc(env(safe-area-inset-top, 0px) + 16px))' : '16px',
            background: selectedMatch ? '#007953' : 'linear-gradient(180deg, #0e172a 0%, #0a0f1d 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: isMobile ? '8px' : '14px',
            color: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {selectedMatch ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  if (detailTab !== 'scorecard') {
                    setDetailTab('scorecard');
                  } else {
                    setSelectedMatch(null);
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '10px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title={detailTab !== 'scorecard' ? "Back to Scorecard" : "Back to matches list"}
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0
              }}>
                🏏
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedMatch ? getMatchShortTitle(selectedMatch) : "Live Cricket Scorecards"}
                </h3>
                {!selectedMatch && liveCount > 0 && (
                  <span style={{
                    background: 'rgba(239, 68, 68, 0.25)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    fontSize: '0.66rem',
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
              <div style={{ fontSize: '0.72rem', color: selectedMatch ? '#e0f2fe' : '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedMatch ? selectedMatch.series : "Real-time ball updates • 100% inside Aether"}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                selectedMatch ? fetchMatchDetail(selectedMatch, true, true) : refreshScores(true, true);
              }}
              disabled={isRefreshing}
              title="Refresh Scores (Instant Zero-Lag)"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isRefreshing ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
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

        {/* -------------------- VIEW 1: MATCH DETAIL CENTER (CRICBUZZ STYLE) -------------------- */}
        {selectedMatch ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Cricbuzz Sub-Tabs Bar (FIXED at top, never cut off or scrolled away) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#08111e',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '0 12px',
              overflowX: 'auto',
              flexShrink: 0
            }}>
              {[
                { id: 'scorecard', label: 'SCORECARD' },
                { id: 'squads', label: 'SQUADS' },
                { id: 'info', label: 'INFO' },
                { id: 'live', label: 'LIVE' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    setDetailTab(tab.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: detailTab === tab.id ? '3px solid #009270' : '3px solid transparent',
                    color: detailTab === tab.id ? '#34d399' : '#94a3b8',
                    padding: '11px 18px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Cricbuzz Red Status Banner (FIXED under tabs) */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '10px 18px',
              fontSize: '0.84rem',
              fontWeight: 600,
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexShrink: 0
            }}>
              <span>{selectedMatch.status_text || selectedMatch.description || 'Live Match Coverage'}</span>
              {selectedMatch.status === 'in' && (
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  letterSpacing: '0.5px'
                }}>
                  LIVE
                </span>
              )}
            </div>

            {/* Sub-tab Scrollable Content (Only the scorecard / squads list scrolls) */}
            <div style={{ padding: isMobile ? '12px 14px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {/* TAB 1: SCORECARD (Accordion Innings Cricbuzz Style) */}
              {detailTab === 'scorecard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {isDetailLoading && !detailData ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px', animation: 'spin 1.5s infinite linear' }}>⏳</div>
                      <div style={{ fontSize: '0.88rem' }}>Loading live scorecard tables inside Aether...</div>
                    </div>
                  ) : inningsList.length > 0 ? (
                    inningsList.map((inn) => {
                      const isExpanded = Boolean(expandedInnings[inn.innNum]);
                      const rosterYetToBat = getYetToBat(inn);

                      // Filter out non-batting squad players from inn.battingCard.playerDetails
                      const rawBatters = inn.battingCard?.playerDetails || [];
                      const dismissedBatters = [];
                      const activeBatters = [];
                      const unbattedFromCard = [];

                      rawBatters.forEach(p => {
                        const isDismissed = Boolean(p.dismissal && !p.dismissal.toLowerCase().includes('not out'));
                        const bFaced = Number(p.ballsFaced || 0);
                        const rScored = Number(p.runs || 0);
                        const hasBatSignal = Boolean(
                          p.onStrike || p.isStriker || p.facing ||
                          (p.playerName && p.playerName.includes('*')) ||
                          (p.dismissal && (p.dismissal.includes('*') || p.dismissal.toLowerCase().includes('batting')))
                        );

                        if (isDismissed) {
                          dismissedBatters.push(p);
                        } else if (bFaced > 0 || rScored > 0 || hasBatSignal) {
                          activeBatters.push(p);
                        } else {
                          unbattedFromCard.push(p);
                        }
                      });

                      // In case an active batter hasn't faced a ball yet (e.g. at crease on 0*(0))
                      while (activeBatters.length < 2 && unbattedFromCard.length > 0) {
                        activeBatters.push(unbattedFromCard.shift());
                      }

                      const displayBatters = [...dismissedBatters, ...activeBatters];

                      // Combine unbatted squad members into "Yet to bat"
                      const unbattedCardNames = unbattedFromCard.map(p => ({
                        name: (p.playerName || '').replace(/\*/g, '').trim(),
                        position: 'Player'
                      }));
                      const allYetToBat = [
                        ...unbattedCardNames,
                        ...rosterYetToBat.filter(rp =>
                          !unbattedCardNames.some(uc => uc.name.toLowerCase() === (rp.name || '').toLowerCase()) &&
                          !displayBatters.some(db => (db.playerName || '').replace(/\*/g, '').trim().toLowerCase() === (rp.name || '').toLowerCase())
                        )
                      ];

                      // Calculate dynamic strike among active batters AUTOMATICALLY (purely data-driven, NO manual clicking)
                      let currentStrikerName = null;

                      // Priority 1: Explicit onStrike / facing boolean from live backend or athlete data
                      const onStrikePlayer = activeBatters.find(ab =>
                        ab.onStrike === true || ab.isStriker === true || ab.facing === '1' || ab.facing === 1 || ab.facing === true ||
                        (ab.playerName && ab.playerName.includes('*')) ||
                        (ab.dismissal && ab.dismissal.includes('*'))
                      );
                      if (onStrikePlayer) {
                        currentStrikerName = (onStrikePlayer.playerName || '').replace(/\*/g, '').trim().toLowerCase();
                      }

                      // Priority 2: Situation striker name from live commentary/situation API
                      if (!currentStrikerName && detailData?.situation?.striker_name) {
                        const sName = detailData.situation.striker_name.toLowerCase();
                        const match = activeBatters.find(ab => {
                          const abName = (ab.playerName || '').toLowerCase();
                          return abName.includes(sName) || sName.includes(abName);
                        });
                        if (match) currentStrikerName = (match.playerName || '').replace(/\*/g, '').trim().toLowerCase();
                      }

                      // Priority 3: Automatic parity rotation based on live match deliveries and score updates
                      if (!currentStrikerName && activeBatters.length > 0) {
                        if (activeBatters.length === 1) {
                          currentStrikerName = (activeBatters[0].playerName || '').replace(/\*/g, '').trim().toLowerCase();
                        } else {
                          const totalStr = inn.battingCard?.total || inn.battingCard?.runs || selectedMatch?.current_score || '';
                          const m = totalStr.match(/\((\d+)(?:\.(\d+))?/);
                          let ballCount = 0;
                          if (m) {
                            const ov = parseInt(m[1], 10) || 0;
                            const bl = parseInt(m[2], 10) || 0;
                            ballCount = ov * 6 + bl;
                          } else {
                            const b0 = Number(activeBatters[0].ballsFaced) || 0;
                            const b1 = Number(activeBatters[1].ballsFaced) || 0;
                            ballCount = b0 + b1;
                          }
                          const r0 = Number(activeBatters[0].runs) || 0;
                          const r1 = Number(activeBatters[1].runs) || 0;
                          const ballParity = (ballCount + r0 + r1) % 2;
                          const selectedStriker = activeBatters[ballParity] || activeBatters[0];
                          currentStrikerName = (selectedStriker.playerName || '').replace(/\*/g, '').trim().toLowerCase();
                        }
                      }

                      return (
                        <div
                          key={inn.innNum}
                          style={{
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
                          }}
                        >
                          {/* Accordion Header Bar */}
                          <div
                            onClick={() => toggleInnings(inn.innNum)}
                            style={{
                              background: isExpanded ? '#009270' : '#1e293b',
                              color: '#ffffff',
                              padding: '12px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              userSelect: 'none',
                              transition: 'background 0.2s'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.90rem' }}>
                              {inn.teamName} {inn.innNum ? `${inn.innNum === '1' ? '1st' : (inn.innNum === '2' ? '2nd' : `${inn.innNum}th`)} inn` : ''}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', fontWeight: 700 }}>
                              <span>{inn.battingCard?.runs || ''} {inn.battingCard?.total || ''}</span>
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                          </div>

                          {/* Accordion Body */}
                          {isExpanded && (
                            <div style={{ background: '#0e1726' }}>
                              {/* Batting Table */}
                              {displayBatters.length > 0 && (
                                <div style={{ width: '100%', overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                                    <thead>
                                      <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600 }}>Batter</th>
                                        <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, width: '38px' }}>R</th>
                                        <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, width: '36px' }}>B</th>
                                        <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, width: '32px' }}>4s</th>
                                        <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, width: '32px' }}>6s</th>
                                        <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, width: '56px' }}>SR</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {displayBatters.map((p, pIdx) => {
                                        const cleanName = (p.playerName || '').replace(/\*/g, '').trim();
                                        const isDismissed = Boolean(p.dismissal && !p.dismissal.toLowerCase().includes('not out'));
                                        const isBatting = !isDismissed && activeBatters.some(ab => (ab.playerName || '').replace(/\*/g, '').trim().toLowerCase() === cleanName.toLowerCase());
                                        const isOnStrike = isBatting && currentStrikerName && cleanName.toLowerCase() === currentStrikerName;

                                        return (
                                          <tr key={pIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                            <td style={{ padding: '8px 14px', verticalAlign: 'top' }}>
                                              <div style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {isOnStrike && (
                                                  <span style={{ color: '#34d399', fontWeight: 900, fontSize: '1rem', lineHeight: 1 }} title="On strike">
                                                    *
                                                  </span>
                                                )}
                                                <span>{cleanName}</span>
                                              </div>
                                              <div style={{ color: isBatting ? '#34d399' : '#94a3b8', fontSize: '0.72rem', marginTop: '2px', fontWeight: isBatting ? 600 : 400 }}>
                                                {isBatting ? 'batting' : (p.dismissal || 'not out')}
                                              </div>
                                            </td>
                                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#f8fafc', fontSize: '0.86rem', verticalAlign: 'middle' }}>
                                              {p.runs}
                                            </td>
                                            <td style={{ padding: '8px 8px', textAlign: 'right', color: '#cbd5e1', fontSize: '0.80rem', verticalAlign: 'middle' }}>
                                              {p.ballsFaced || 0}
                                            </td>
                                            <td style={{ padding: '8px 8px', textAlign: 'right', color: '#94a3b8', fontSize: '0.80rem', verticalAlign: 'middle' }}>
                                              {p.fours || 0}
                                            </td>
                                            <td style={{ padding: '8px 8px', textAlign: 'right', color: '#94a3b8', fontSize: '0.80rem', verticalAlign: 'middle' }}>
                                              {p.sixes || 0}
                                            </td>
                                            <td style={{ padding: '8px 14px', textAlign: 'right', color: '#94a3b8', fontSize: '0.80rem', verticalAlign: 'middle' }}>
                                              {p.strikeRate || '-'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Extras & Total Summary */}
                              <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.80rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                                  <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Extras</span>
                                  <span>{inn.battingCard?.extras || '0 (b 0, lb 0, w 0, nb 0, p 0)'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 700, color: '#f8fafc' }}>Total</span>
                                  <span style={{ fontWeight: 800, color: '#34d399', fontSize: '0.90rem' }}>
                                    {inn.battingCard?.runs || ''} {inn.battingCard?.total || ''}
                                  </span>
                                </div>
                              </div>

                              {/* Yet to Bat Row */}
                              {allYetToBat.length > 0 && (
                                <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.78rem' }}>
                                  <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Yet to bat</div>
                                  <div style={{ color: '#cbd5e1', lineHeight: '1.4' }}>
                                    {allYetToBat.map(p => p.name).join(', ')}
                                  </div>
                                </div>
                              )}

                              {/* Bowling Table */}
                              {inn.bowlingCard?.playerDetails?.length > 0 && (
                                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '4px' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                                    <thead>
                                      <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600 }}>Bowler</th>
                                        <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, width: '38px' }}>O</th>
                                        <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, width: '32px' }}>M</th>
                                        <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, width: '36px' }}>R</th>
                                        <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, width: '32px' }}>W</th>
                                        <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, width: '56px' }}>ECO</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {inn.bowlingCard.playerDetails.map((b, bIdx) => (
                                        <tr key={bIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                          <td style={{ padding: '8px 14px', color: '#38bdf8', fontWeight: 600 }}>
                                            {b.playerName}
                                          </td>
                                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#cbd5e1' }}>{b.overs}</td>
                                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#94a3b8' }}>{b.maidens || 0}</td>
                                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#cbd5e1' }}>{b.conceded || 0}</td>
                                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#34d399' }}>{b.wickets || 0}</td>
                                          <td style={{ padding: '8px 14px', textAlign: 'right', color: '#94a3b8' }}>{b.economyRate || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '16px',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8'
                    }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🏏</div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#f8fafc' }}>
                        Scorecard is being updated
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        {selectedMatch.status_text || 'Ball-by-ball commentary and full scorecard will update live as the match progresses.'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SQUADS */}
              {detailTab === 'squads' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setDetailTab('scorecard');
                      }}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#38bdf8',
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ← Back to Scorecard
                    </button>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Squads & Playing XI</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {displayRosters.map((rost, rIdx) => (
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
                </div>
              )}

              {/* TAB 3: INFO */}
              {detailTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setDetailTab('scorecard');
                      }}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#38bdf8',
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ← Back to Scorecard
                    </button>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Match Information</span>
                  </div>

                  {/* Match Info Grid */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    fontSize: '0.80rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                      <span style={{ color: '#94a3b8' }}>Match</span>
                      <span style={{ color: '#f8fafc', fontWeight: 600 }}>{selectedMatch.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                      <span style={{ color: '#94a3b8' }}>Series</span>
                      <span style={{ color: '#f8fafc', fontWeight: 600 }}>{selectedMatch.series}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                      <span style={{ color: '#94a3b8' }}>Date & Time</span>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>{getISTDisplay(selectedMatch) || selectedMatch.date || 'TBD'}</span>
                    </div>
                    {selectedMatch.venue && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                        <span style={{ color: '#94a3b8' }}>Venue</span>
                        <span style={{ color: '#f8fafc' }}>{selectedMatch.venue}</span>
                      </div>
                    )}
                    {selectedMatch.toss && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                        <span style={{ color: '#94a3b8' }}>Toss</span>
                        <span style={{ color: '#cbd5e1' }}>{selectedMatch.toss}</span>
                      </div>
                    )}
                    {(() => {
                      const streaming = getStreamingDisplay(selectedMatch);
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>Broadcast / Live OTT</span>
                          <span style={{ color: '#f87171', fontWeight: 600 }}>{streaming.platform} ({streaming.ott})</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Highlights Notes */}
                  {((detailData?.notes && detailData.notes.length > 0) || (selectedMatch.highlights && selectedMatch.highlights.length > 0)) && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>
                        Key Highlights & Session Notes
                      </div>
                      {(detailData?.notes || selectedMatch.highlights || []).map((nt, idx) => (
                        <div key={idx} style={{ fontSize: '0.78rem', color: '#cbd5e1', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                          • {nt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: LIVE */}
              {detailTab === 'live' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setDetailTab('scorecard');
                      }}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#38bdf8',
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ← Back to Scorecard
                    </button>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Live Situation</span>
                  </div>

                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#38bdf8' }}>
                      Current Match Situation
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#f8fafc', lineHeight: '1.5' }}>
                      {selectedMatch.status_text || selectedMatch.description || 'Live cricket stream in progress'}
                    </div>
                    {selectedMatch.session && (
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Session: <strong style={{ color: '#cbd5e1' }}>{selectedMatch.session}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* -------------------- VIEW 2: MATCHES LIST FEED -------------------- */
          <>
            {/* Filter Tabs & Search Bar */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Category Scope Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                <button
                  type="button"
                  onClick={() => setScopeFilter('international')}
                  style={{
                    background: scopeFilter === 'international' ? '#009270' : 'rgba(255, 255, 255, 0.04)',
                    border: scopeFilter === 'international' ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: scopeFilter === 'international' ? '#ffffff' : '#94a3b8',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'flex',
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
                    background: scopeFilter === 'all' ? '#009270' : 'rgba(255, 255, 255, 0.04)',
                    border: scopeFilter === 'all' ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: scopeFilter === 'all' ? '#ffffff' : '#94a3b8',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>🔥 All Matches ({displayMatches.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScopeFilter('leagues')}
                  style={{
                    background: scopeFilter === 'leagues' ? '#009270' : 'rgba(255, 255, 255, 0.04)',
                    border: scopeFilter === 'leagues' ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: scopeFilter === 'leagues' ? '#ffffff' : '#94a3b8',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Trophy size={14} />
                  <span>T20 & Domestic ({displayMatches.length - intlCount})</span>
                </button>
              </div>

              {/* Status Filters & Search Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {[
                    { id: 'all', label: 'All Status' },
                    { id: 'in', label: `Live Now (${liveCount})`, isLive: true },
                    { id: 'pre', label: `Upcoming (${upcomingCount})` },
                    { id: 'post', label: `Completed (${completedCount})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      style={{
                        background: statusFilter === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                        border: statusFilter === tab.id ? '1px solid #38bdf8' : '1px solid transparent',
                        color: statusFilter === tab.id ? '#38bdf8' : (tab.isLive && liveCount > 0 ? '#f87171' : '#94a3b8'),
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: statusFilter === tab.id ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: '180px'
                }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Search teams / series..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '5px 10px 5px 30px',
                      fontSize: '0.74rem',
                      color: '#f8fafc',
                      outline: 'none'
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
              {isCurrentlyLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px', animation: 'spin 1.5s infinite linear' }}>⏳</div>
                  <div style={{ fontSize: '0.88rem' }}>Loading live scorecards inside Aether...</div>
                </div>
              ) : finalMatches.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🏏</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc' }}>
                    No matches found for this filter
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                    Switch to "International" or "All Matches" to see other active games.
                  </div>
                  <button
                    type="button"
                    onClick={() => refreshScores(false)}
                    style={{
                      marginTop: '12px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      padding: '6px 14px',
                      borderRadius: '10px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Refresh Matches
                  </button>
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
                      key={m.id}
                      onClick={() => setSelectedMatch(m)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: isLive ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isLive ? '0 4px 20px rgba(239, 68, 68, 0.12)' : 'none'
                      }}
                    >
                      {/* Match Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{
                            background: m.is_international ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                            border: m.is_international ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: m.is_international ? '#38bdf8' : '#94a3b8',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            {m.is_international ? 'International' : 'League'}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.series}
                          </span>
                        </div>

                        <span style={{
                          background: isLive ? '#ef4444' : (isFinished ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                          border: isLive ? 'none' : (isFinished ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'),
                          color: isLive ? '#ffffff' : (isFinished ? '#34d399' : '#fbbf24'),
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          letterSpacing: '0.3px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isLive && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }}></span>}
                          {isLive ? 'LIVE' : (isFinished ? 'COMPLETED' : 'UPCOMING')}
                        </span>
                      </div>

                      {/* Teams & Scores */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* Team 1 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {m.team1?.logo ? (
                              <img src={m.team1.logo} alt={m.team1.name} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: '1rem' }}>🏏</span>
                            )}
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: m.team1?.is_winner ? '#34d399' : '#f8fafc' }}>
                              {m.team1?.name} {m.team1?.is_winner && '🏆'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.94rem', fontWeight: 800, color: isLive ? '#38bdf8' : '#f8fafc' }}>
                            {m.team1?.score || (isUpcoming ? 'Yet to bat' : '-')}
                          </span>
                        </div>

                        {/* Team 2 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {m.team2?.logo ? (
                              <img src={m.team2.logo} alt={m.team2.name} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: '1rem' }}>🏏</span>
                            )}
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: m.team2?.is_winner ? '#34d399' : '#f8fafc' }}>
                              {m.team2?.name} {m.team2?.is_winner && '🏆'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.94rem', fontWeight: 800, color: isLive ? '#38bdf8' : '#f8fafc' }}>
                            {m.team2?.score || (isUpcoming ? 'Yet to bat' : '-')}
                          </span>
                        </div>
                      </div>

                      {/* IST Timing & OTT Pill */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '2px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          color: '#38bdf8',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 600
                        }}>
                          <Clock size={11} />
                          <span>{istTime || m.ist_time || 'IST Time'}</span>
                        </div>

                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
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

                      {/* Situation Note & View Scorecard Button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          color: isLive ? '#f87171' : (isFinished ? '#34d399' : '#fbbf24'),
                          fontWeight: 500,
                          flex: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {m.status_text || m.description || "Live cricket coverage"}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMatch(m);
                          }}
                          style={{
                            background: '#009270',
                            border: 'none',
                            color: '#ffffff',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
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
          padding: isMobile ? '10px 14px' : '12px 20px',
          paddingBottom: isMobile ? 'max(14px, env(safe-area-inset-bottom))' : '12px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span 
                  style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: 600 }} 
                  onClick={() => { triggerHaptic(15); setSelectedMatch(null); }}
                >
                  ← Back to matches list
                </span>
                {detailTab !== 'scorecard' && (
                  <span 
                    style={{ color: '#34d399', cursor: 'pointer', fontWeight: 600 }} 
                    onClick={() => { triggerHaptic(15); setDetailTab('scorecard'); }}
                  >
                    • Back to Scorecard
                  </span>
                )}
              </div>
            ) : (
              <span>Showing {finalMatches.length} of {displayMatches.length} matches</span>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
