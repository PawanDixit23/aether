import React, { useState } from 'react';
import { 
  Share2, 
  Send, 
  Copy, 
  ExternalLink, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Play, 
  FileText, 
  MessageSquare,
  Hash,
  TrendingUp,
  Settings,
  HelpCircle,
  Radio,
  Clock,
  Layers
} from 'lucide-react';

const SOCIAL_PLATFORMS = [
  { id: 'all', name: 'Universal', icon: '🌐', color: '#38bdf8', tag: 'Post to All' },
  { id: 'whatsapp', name: 'WhatsApp', icon: '🟢', color: '#22c55e', tag: 'Chat & Alerts' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: '#0ea5e9', tag: 'Bot & Broadcast' },
  { id: 'x', name: 'X / Twitter', icon: '🐦', color: '#f8fafc', tag: 'Tweets & Threads' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0a66c2', tag: 'Professional' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: '#e1306c', tag: 'Captions & Reels' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877f2', tag: 'Updates & Pages' },
  { id: 'youtube', name: 'YouTube', icon: '🔴', color: '#ff0000', tag: 'Summarizer & SEO' },
  { id: 'reddit', name: 'Reddit', icon: '🟠', color: '#ff4500', tag: 'Subreddits & Trends' }
];

export const SocialMediaModal = ({
  isOpen,
  onClose,
  showToast,
  userEmail,
  API_BASE,
  onSendToChat
}) => {
  const [activePlatform, setActivePlatform] = useState('all');
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Platform-specific state
  const [ytUrl, setYtUrl] = useState('');
  const [ytSummary, setYtSummary] = useState(null);
  const [ytLoading, setYtLoading] = useState(false);

  const [tgBotToken, setTgBotToken] = useState(() => {
    try { return localStorage.getItem('aether_tg_bot_token') || ''; } catch { return ''; }
  });
  const [tgChatId, setTgChatId] = useState(() => {
    try { return localStorage.getItem('aether_tg_chat_id') || ''; } catch { return ''; }
  });
  const [tgSending, setTgSending] = useState(false);

  const [waPhoneNumber, setWaPhoneNumber] = useState('');
  const [waMsgText, setWaMsgText] = useState('');

  // Generated outputs map
  const [generatedPosts, setGeneratedPosts] = useState({
    x: '',
    linkedin: '',
    instagram: '',
    facebook: '',
    telegram: '',
    whatsapp: '',
    reddit: ''
  });

  const [isMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    }
    return false;
  });

  if (!isOpen) return null;

  const copyToClipboard = async (text, key) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      if (showToast) showToast("Copied to clipboard! 📋", "success");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      if (showToast) showToast("Failed to copy", "error");
    }
  };

  // Generate multi-platform adaptations
  const handleGenerateAdaptedPosts = async () => {
    if (!inputText.trim()) {
      if (showToast) showToast("Please write or paste your topic/announcement first", "info");
      return;
    }
    setIsGenerating(true);
    try {
      const resp = await fetch(`${API_BASE}/social/adapt-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'X-User-Email': userEmail } : {})
        },
        body: JSON.stringify({
          content: inputText.trim(),
          platforms: ['x', 'linkedin', 'instagram', 'facebook', 'telegram', 'whatsapp', 'reddit']
        })
      });
      const data = await resp.json();
      if (resp.ok && data.status === 'success' && data.adapted) {
        setGeneratedPosts(data.adapted);
        if (showToast) showToast("Generated posts for all 7 platforms! 🚀", "success");
      } else {
        // Fallback local template generation
        const base = inputText.trim();
        setGeneratedPosts({
          x: `${base.slice(0, 240)}\n\n#tech #update #innovation`,
          linkedin: `🚀 Important Update:\n\n${base}\n\nWhat are your thoughts on this? Let's connect in the comments below.\n\n#growth #innovation #leadership`,
          instagram: `✨ ${base}\n\n.\n.\n.\n#trending #explore #update #dailyupdate #mindset`,
          facebook: `📢 Exciting news to share with everyone!\n\n${base}\n\nFeel free to share your thoughts!`,
          telegram: `⚡ *Aether Announcement*\n\n${base}\n\n🔗 Stay tuned for more updates!`,
          whatsapp: `⚡ *Aether Update*\n\n${base}\n\n_Sent via Aether AI_`,
          reddit: `**Discussion**: ${base.slice(0, 80)}...\n\n${base}\n\nLooking forward to hearing the community's perspective!`
        });
        if (showToast) showToast("Generated platform templates! ⚡", "success");
      }
    } catch {
      const base = inputText.trim();
      setGeneratedPosts({
        x: `${base.slice(0, 240)}\n\n#update`,
        linkedin: `🚀 ${base}\n\n#leadership #innovation`,
        instagram: `✨ ${base}\n\n#trending`,
        facebook: `${base}`,
        telegram: `⚡ ${base}`,
        whatsapp: `⚡ ${base}`,
        reddit: `${base}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Summarize YouTube video
  const handleSummarizeYouTube = async () => {
    if (!ytUrl.trim()) {
      if (showToast) showToast("Please paste a valid YouTube video link", "info");
      return;
    }
    setYtLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/social/youtube-summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'X-User-Email': userEmail } : {})
        },
        body: JSON.stringify({ url: ytUrl.trim() })
      });
      const data = await resp.json();
      if (resp.ok && data.summary) {
        setYtSummary(data);
        if (showToast) showToast("YouTube video summarized! 🎥", "success");
      } else {
        if (showToast) showToast(data.detail || "Unable to summarize video", "error");
      }
    } catch {
      if (showToast) showToast("Error connecting to YouTube summarizer service", "error");
    } finally {
      setYtLoading(false);
    }
  };

  // Dispatch message to Telegram
  const handleSendTelegram = async () => {
    if (!tgBotToken.trim() || !tgChatId.trim()) {
      if (showToast) showToast("Please enter Bot Token and Chat ID in Telegram settings", "info");
      return;
    }
    const text = generatedPosts.telegram || inputText;
    if (!text.trim()) {
      if (showToast) showToast("Please enter a message to send", "info");
      return;
    }
    setTgSending(true);
    try {
      const resp = await fetch(`https://api.telegram.org/bot${tgBotToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgChatId.trim(),
          text: text.trim(),
          parse_mode: 'Markdown'
        })
      });
      const data = await resp.json();
      if (data.ok) {
        if (showToast) showToast("Sent directly to Telegram! ✈️", "success");
        try {
          localStorage.setItem('aether_tg_bot_token', tgBotToken.trim());
          localStorage.setItem('aether_tg_chat_id', tgChatId.trim());
        } catch {}
      } else {
        if (showToast) showToast(`Telegram error: ${data.description || 'Failed'}`, "error");
      }
    } catch {
      if (showToast) showToast("Error connecting to Telegram Bot API", "error");
    } finally {
      setTgSending(false);
    }
  };

  // Launch instant share intents
  const openShareIntent = (platform, text) => {
    const encoded = encodeURIComponent(text || inputText);
    let url = '';
    switch (platform) {
      case 'x':
        url = `https://twitter.com/intent/tweet?text=${encoded}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://aether.ai')}&summary=${encoded}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?quote=${encoded}&u=${encodeURIComponent('https://aether.ai')}`;
        break;
      case 'whatsapp': {
        const phone = waPhoneNumber.replace(/[^0-9]/g, '');
        url = phone 
          ? `https://wa.me/${phone}?text=${encoded}`
          : `https://api.whatsapp.com/send?text=${encoded}`;
        break;
      }
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent('https://aether.ai')}&text=${encoded}`;
        break;
      case 'reddit':
        url = `https://reddit.com/submit?title=${encodeURIComponent('Shared from Aether')}&text=${encoded}`;
        break;
      default:
        break;
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      if (showToast) showToast(`Opening ${platform.toUpperCase()} share dialog...`, "info");
    }
  };

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
          maxWidth: isMobile ? '100%' : '620px', 
          height: isMobile ? '100dvh' : 'auto',
          maxHeight: isMobile ? '100dvh' : '92vh', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          boxSizing: 'border-box', 
          boxShadow: isMobile ? 'none' : '0 24px 64px rgba(0,0,0,0.85)',
          gap: '12px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)', border: '1px solid rgba(56, 189, 248, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Share2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>Social Media Hub</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 8px', borderRadius: '999px', color: '#38bdf8' }}>
                  8 Platforms
                </span>
              </div>
              <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '1px' }}>Universal publisher, bots & video insights</div>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0 }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', flexShrink: 0 }}>
          {SOCIAL_PLATFORMS.map(p => {
            const isSelected = activePlatform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePlatform(p.id)}
                style={{
                  background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '7px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '0.95rem' }}>{p.icon}</span>
                <span style={{ fontSize: '0.76rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#ffffff' : '#94a3b8', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: UNIVERSAL PUBLISHER ("POST TO ALL") */}
        {activePlatform === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={15} color="#38bdf8" />
                  <span>Universal Content Composer</span>
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Adapts tone for each platform</span>
              </div>

              <textarea
                placeholder="Write your update, announcement, or thought here... (e.g. Launched new feature, milestone achieved, personal reflection)"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#040813',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  lineHeight: '1.4',
                  resize: 'none',
                  outline: 'none'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={isGenerating || !inputText.trim()}
                  onClick={handleGenerateAdaptedPosts}
                  style={{
                    background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '9px 18px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)'
                  }}
                >
                  <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
                  <span>{isGenerating ? 'AI Adapting...' : 'Adapt for All Platforms ⚡'}</span>
                </button>
              </div>
            </div>

            {/* Platform Results Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { id: 'x', name: 'X / Twitter', icon: '🐦', color: '#38bdf8', text: generatedPosts.x },
                { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0a66c2', text: generatedPosts.linkedin },
                { id: 'instagram', name: 'Instagram', icon: '📸', color: '#e1306c', text: generatedPosts.instagram },
                { id: 'whatsapp', name: 'WhatsApp', icon: '🟢', color: '#22c55e', text: generatedPosts.whatsapp },
                { id: 'telegram', name: 'Telegram', icon: '✈️', color: '#0ea5e9', text: generatedPosts.telegram },
                { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877f2', text: generatedPosts.facebook },
                { id: 'reddit', name: 'Reddit', icon: '🟠', color: '#ff4500', text: generatedPosts.reddit }
              ].map(card => {
                if (!card.text) return null;
                return (
                  <div 
                    key={card.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: '14px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{card.icon}</span>
                        <span>{card.name}</span>
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(card.text, card.id)}
                          style={{
                            background: copiedKey === card.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            color: copiedKey === card.id ? '#34d399' : '#cbd5e1',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {copiedKey === card.id ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedKey === card.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openShareIntent(card.id, card.text)}
                          style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            color: '#38bdf8',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ExternalLink size={12} />
                          <span>Publish</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ background: '#050a14', borderRadius: '10px', padding: '10px', fontSize: '0.80rem', color: '#cbd5e1', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                      {card.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: WHATSAPP */}
        {activePlatform === 'whatsapp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '16px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🟢</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>WhatsApp Executive Bridge</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.4', margin: 0 }}>
                Aether automatically delivers your Morning (08:00 AM) and Evening (08:30 PM) Executive Briefings and expense summaries directly to your WhatsApp.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff' }}>Quick WhatsApp Dispatch:</span>
              <input
                type="text"
                placeholder="Phone number with country code (e.g. +919876543210)"
                value={waPhoneNumber}
                onChange={e => setWaPhoneNumber(e.target.value)}
                style={{ background: '#050a14', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '9px 12px', color: '#fff', fontSize: '0.82rem' }}
              />
              <textarea
                placeholder="Message to send on WhatsApp..."
                value={waMsgText}
                onChange={e => setWaMsgText(e.target.value)}
                rows={3}
                style={{ background: '#050a14', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '9px 12px', color: '#fff', fontSize: '0.82rem', resize: 'none' }}
              />
              <button
                type="button"
                onClick={() => openShareIntent('whatsapp', waMsgText)}
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', color: '#ffffff', borderRadius: '12px', padding: '10px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Send size={15} />
                <span>Open in WhatsApp 🟢</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: TELEGRAM */}
        {activePlatform === 'telegram' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '16px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>✈️</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Telegram Bot Bridge</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.4', margin: 0 }}>
                Connect your Telegram Bot to receive Aether alerts, task reminders, or broadcast announcements directly into your channels and chats.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Telegram Bot Token (from @BotFather)</label>
                <input
                  type="password"
                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                  value={tgBotToken}
                  onChange={e => setTgBotToken(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#050a14', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '9px 12px', color: '#fff', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Chat ID / Channel Username (e.g. @mychannel or 987654321)</label>
                <input
                  type="text"
                  placeholder="@yourchannel or user chat_id"
                  value={tgChatId}
                  onChange={e => setTgChatId(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#050a14', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '9px 12px', color: '#fff', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.70rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Message to Broadcast</label>
                <textarea
                  placeholder="Type broadcast text..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#050a14', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '9px 12px', color: '#fff', fontSize: '0.82rem', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  disabled={tgSending}
                  onClick={handleSendTelegram}
                  style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none', color: '#ffffff', borderRadius: '12px', padding: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: tgSending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Send size={14} />
                  <span>{tgSending ? 'Sending...' : 'Send via Bot API'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openShareIntent('telegram', inputText)}
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#cbd5e1', borderRadius: '12px', padding: '10px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <ExternalLink size={14} />
                  <span>Open Telegram Web</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: YOUTUBE */}
        {activePlatform === 'youtube' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '16px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🔴</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>YouTube Video Summarizer & Assistant</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.4', margin: 0 }}>
                Paste any YouTube URL to instantly get an executive breakdown, key takeaways, and action points without watching hours of video.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={ytUrl}
                  onChange={e => setYtUrl(e.target.value)}
                  style={{ flex: 1, background: '#050a14', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '9px 12px', color: '#fff', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  disabled={ytLoading || !ytUrl.trim()}
                  onClick={handleSummarizeYouTube}
                  style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none', color: '#ffffff', borderRadius: '10px', padding: '9px 16px', fontWeight: 700, fontSize: '0.82rem', cursor: ytLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles size={14} className={ytLoading ? 'animate-spin' : ''} />
                  <span>{ytLoading ? 'Analyzing...' : 'Summarize'}</span>
                </button>
              </div>

              {ytSummary && (
                <div style={{ background: '#050a14', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '6px' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                    {ytSummary.title || 'YouTube Summary'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                    {ytSummary.summary}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(ytSummary.summary, 'yt')}
                      style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '5px 10px', color: '#cbd5e1', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Copy size={12} />
                      <span>Copy Summary</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: X / LINKEDIN / INSTA / FB / REDDIT DIRECT DISPATCH */}
        {['x', 'linkedin', 'instagram', 'facebook', 'reddit'].includes(activePlatform) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>
                  {activePlatform} Publisher
                </span>
                {activePlatform === 'x' && (
                  <span style={{ fontSize: '0.70rem', color: inputText.length > 280 ? '#f87171' : '#94a3b8' }}>
                    {inputText.length} / 280 chars
                  </span>
                )}
              </div>

              <textarea
                placeholder={`Compose post specifically for ${activePlatform.toUpperCase()}...`}
                value={generatedPosts[activePlatform] || inputText}
                onChange={e => {
                  const val = e.target.value;
                  setInputText(val);
                  setGeneratedPosts(prev => ({ ...prev, [activePlatform]: val }));
                }}
                rows={4}
                style={{ width: '100%', boxSizing: 'border-box', background: '#050a14', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '0.84rem', resize: 'none' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedPosts[activePlatform] || inputText, activePlatform)}
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '8px 14px', color: '#cbd5e1', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Copy size={13} />
                  <span>Copy</span>
                </button>

                <button
                  type="button"
                  onClick={() => openShareIntent(activePlatform, generatedPosts[activePlatform] || inputText)}
                  style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)', border: 'none', borderRadius: '10px', padding: '8px 18px', color: '#ffffff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={13} />
                  <span>Launch on {activePlatform.toUpperCase()} ↗</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

