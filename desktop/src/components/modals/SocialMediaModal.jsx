import React, { useState, useEffect, useRef } from 'react';
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
  Layers,
  X,
  Zap,
  Image,
  Flame,
  Award,
  Video,
  ThumbsUp,
  MessageCircle,
  Eye,
  Download,
  Plus,
  Paperclip,
  CheckCheck,
  Smartphone,
  ChevronRight,
  Info,
  Trash2,
  File,
  CornerDownLeft
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

const CARD_THEMES = [
  { id: 'cyber', name: 'Cyber Dark', bg1: '#090d16', bg2: '#0f172a', accent: '#38bdf8', text: '#f8fafc' },
  { id: 'executive', name: 'Executive Navy', bg1: '#040b1a', bg2: '#1e293b', accent: '#60a5fa', text: '#ffffff' },
  { id: 'sunset', name: 'Sunset Glow', bg1: '#180a24', bg2: '#3b0764', accent: '#f43f5e', text: '#fff1f2' },
  { id: 'emerald', name: 'Emerald Minimal', bg1: '#021c16', bg2: '#064e3b', accent: '#34d399', text: '#ecfdf5' }
];

export const SocialMediaModal = ({
  isOpen,
  onClose,
  showToast,
  userEmail,
  API_BASE,
  onSendToChat
}) => {
  // Tabs: 'composer' | 'ghostwriter' | 'video_lab' | 'engagement' | 'whatsapp_hub'
  const [activeTab, setActiveTab] = useState('composer');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [content, setContent] = useState('');
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptedResults, setAdaptedResults] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  // 1. Viral Hooks & Score State
  const [isAnalyzingHooks, setIsAnalyzingHooks] = useState(false);
  const [viralAnalysis, setViralAnalysis] = useState(null);

  // 2. Visual Quote Card Maker State
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardTheme, setCardTheme] = useState('cyber');
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('aether_user_name') || 'Operator');
  const canvasRef = useRef(null);

  // 3. Ghostwriter State
  const [isLoadingGhostwriter, setIsLoadingGhostwriter] = useState(false);
  const [ghostwriterThought, setGhostwriterThought] = useState(null);

  // 4. Video Repurposer State
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isSummarizingVideo, setIsSummarizingVideo] = useState(false);
  const [videoSummary, setVideoSummary] = useState(null);
  const [isRepurposingVideo, setIsRepurposingVideo] = useState(false);
  const [repurposedResult, setRepurposedResult] = useState(null);

  // 5. Engagement Tracker State
  const [isLoadingEngagement, setIsLoadingEngagement] = useState(false);
  const [engagementPosts, setEngagementPosts] = useState([]);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [newTrackPost, setNewTrackPost] = useState({
    title: '',
    platform: 'linkedin',
    likes: '',
    comments: '',
    views: '',
    top_comment: '',
    url: ''
  });

  // 6. Direct WhatsApp In-App Messenger & Activity State
  const [whatsappMessages, setWhatsappMessages] = useState([]);
  const [whatsappStats, setWhatsappStats] = useState({ total_sent: 0, total_received: 0, delivery_rate: '100%', active_contacts: 1 });
  const [isLoadingWhatsApp, setIsLoadingWhatsApp] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappRecipient, setWhatsappRecipient] = useState('918741838653');
  const [whatsappText, setWhatsappText] = useState('');
  const [whatsappAttachment, setWhatsappAttachment] = useState(null); // { url, name, type }
  const [activeActivityMessage, setActiveActivityMessage] = useState(null);
  const fileInputRef = useRef(null);
  const chatMessagesEndRef = useRef(null);

  // Auto-fetch data on tab switch
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'ghostwriter' && !ghostwriterThought) {
        fetchGhostwriterThought();
      } else if (activeTab === 'engagement') {
        fetchEngagementPosts();
      } else if (activeTab === 'whatsapp_hub') {
        fetchWhatsAppMessages();
      }
    }
  }, [isOpen, activeTab]);

  // Redraw Canvas when card modal or theme changes
  useEffect(() => {
    if (showCardModal && canvasRef.current) {
      drawQuoteCard();
    }
  }, [showCardModal, cardTheme, content, authorName]);

  // Scroll to bottom of WhatsApp chat on new messages
  useEffect(() => {
    if (activeTab === 'whatsapp_hub' && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [whatsappMessages, activeTab]);

  if (!isOpen) return null;

  // --- API Handlers: Viral Hooks & Social Adapt ---
  const handleAdaptPost = async () => {
    if (!content.trim()) {
      showToast?.('Please write some content first!', 'warning');
      return;
    }
    setIsAdapting(true);
    try {
      const resp = await fetch(`${API_BASE}/social/adapt-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          platforms: selectedPlatform === 'all' 
            ? ['whatsapp', 'telegram', 'x', 'linkedin', 'instagram', 'facebook', 'reddit'] 
            : [selectedPlatform]
        })
      });
      const data = await resp.json();
      if (data.status === 'success' && data.adapted) {
        setAdaptedResults(data.adapted);
        showToast?.('Content adapted for target platform(s)!', 'success');
      } else {
        showToast?.('Could not adapt content. Using base text.', 'info');
      }
    } catch (e) {
      console.error(e);
      showToast?.('Error adapting content.', 'error');
    } finally {
      setIsAdapting(false);
    }
  };

  const handleAnalyzeViralHooks = async () => {
    if (!content.trim()) {
      showToast?.('Write your post draft first to score it!', 'warning');
      return;
    }
    setIsAnalyzingHooks(true);
    try {
      const resp = await fetch(`${API_BASE}/social/viral-hooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          platform: selectedPlatform === 'all' ? 'linkedin' : selectedPlatform
        })
      });
      const data = await resp.json();
      if (data.status === 'success') {
        setViralAnalysis(data);
        showToast?.(`Viral Score: ${data.viral_score}/10!`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast?.('Error analyzing viral hooks.', 'error');
    } finally {
      setIsAnalyzingHooks(false);
    }
  };

  const applyHookToContent = (hookText) => {
    if (!hookText) return;
    const lines = content.split('\n');
    const newContent = `${hookText}\n\n${lines.length > 1 ? lines.slice(1).join('\n') : content}`;
    setContent(newContent);
    showToast?.('Viral hook applied to top of your post!', 'success');
  };

  const fetchGhostwriterThought = async () => {
    setIsLoadingGhostwriter(true);
    try {
      const url = `${API_BASE}/social/ghostwriter-thought?user_email=${encodeURIComponent(userEmail || '')}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status === 'success' && data.thought) {
        setGhostwriterThought(data.thought);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGhostwriter(false);
    }
  };

  const loadGhostwriterIntoComposer = (thoughtText) => {
    setContent(thoughtText);
    setActiveTab('composer');
    showToast?.('Loaded executive thought into composer!', 'success');
  };

  const handleSummarizeVideo = async () => {
    if (!youtubeUrl.trim()) {
      showToast?.('Enter a valid YouTube link!', 'warning');
      return;
    }
    setIsSummarizingVideo(true);
    try {
      const resp = await fetch(`${API_BASE}/social/summarize-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      });
      const data = await resp.json();
      if (data.status === 'success' && data.summary) {
        setVideoSummary(data);
        showToast?.('Video intelligence summarized!', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast?.('Failed to summarize YouTube video.', 'error');
    } finally {
      setIsSummarizingVideo(false);
    }
  };

  const handleRepurposeVideo = async () => {
    if (!videoSummary?.summary && !youtubeUrl) {
      showToast?.('Please summarize the video first!', 'warning');
      return;
    }
    setIsRepurposingVideo(true);
    try {
      const resp = await fetch(`${API_BASE}/social/repurpose-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: videoSummary?.summary || '',
          video_title: videoSummary?.title || 'YouTube Video'
        })
      });
      const data = await resp.json();
      if (data.status === 'success' && data.repurposed) {
        setRepurposedResult(data.repurposed);
        showToast?.('Thread & Reel script generated!', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast?.('Failed to repurpose video.', 'error');
    } finally {
      setIsRepurposingVideo(false);
    }
  };

  const fetchEngagementPosts = async () => {
    setIsLoadingEngagement(true);
    try {
      const resp = await fetch(`${API_BASE}/social/engagement?user_email=${encodeURIComponent(userEmail || '')}`);
      const data = await resp.json();
      if (data.status === 'success') {
        setEngagementPosts(data.posts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingEngagement(false);
    }
  };

  const handleSaveTrackPost = async () => {
    if (!newTrackPost.title.trim()) {
      showToast?.('Please enter a post title or topic!', 'warning');
      return;
    }
    try {
      const resp = await fetch(`${API_BASE}/social/engagement/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTrackPost.title,
          content: content || newTrackPost.title,
          platform: newTrackPost.platform,
          likes: parseInt(newTrackPost.likes, 10) || 0,
          comments: parseInt(newTrackPost.comments, 10) || 0,
          views: parseInt(newTrackPost.views, 10) || 0,
          top_comment: newTrackPost.top_comment || 'Engaged audience discussion.',
          url: newTrackPost.url
        })
      });
      const data = await resp.json();
      if (data.status === 'success') {
        showToast?.('Post engagement tracked!', 'success');
        setShowTrackModal(false);
        setNewTrackPost({ title: '', platform: 'linkedin', likes: '', comments: '', views: '', top_comment: '', url: '' });
        fetchEngagementPosts();
      }
    } catch (e) {
      console.error(e);
      showToast?.('Error tracking post.', 'error');
    }
  };

  // --- WHATSAPP IN-APP MESSENGER & ACTIVITY API HANDLERS ---
  const fetchWhatsAppMessages = async () => {
    setIsLoadingWhatsApp(true);
    try {
      const resp = await fetch(`${API_BASE}/whatsapp/messages?user_email=${encodeURIComponent(userEmail || '')}`);
      const data = await resp.json();
      if (data.status === 'success') {
        setWhatsappMessages(data.messages || []);
        if (data.stats) setWhatsappStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingWhatsApp(false);
    }
  };

  const handleSendWhatsAppMessage = async () => {
    if (!whatsappText.trim() && !whatsappAttachment) {
      showToast?.('Please enter a message or select an attachment!', 'warning');
      return;
    }
    setIsSendingWhatsApp(true);
    try {
      const resp = await fetch(`${API_BASE}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_phone: whatsappRecipient,
          message: whatsappText.trim(),
          attachment_url: whatsappAttachment?.url || null,
          attachment_name: whatsappAttachment?.name || null,
          attachment_type: whatsappAttachment?.type || 'image',
          user_email: userEmail
        })
      });
      const data = await resp.json();
      if (data.status === 'success' && data.message) {
        setWhatsappMessages(prev => [...prev, data.message]);
        setWhatsappText('');
        setWhatsappAttachment(null);
        showToast?.('WhatsApp message & attachment dispatched!', 'success');
        fetchWhatsAppMessages();
      }
    } catch (e) {
      console.error(e);
      showToast?.('Error sending WhatsApp message.', 'error');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleSimulateIncomingWhatsApp = async () => {
    try {
      const sampleReplies = [
        "Received the attachment! Very clean layout and summary.",
        "Thanks Pawan, I reviewed the report. Let us schedule the review call.",
        "Looks good! Can you also share the budget breakdown?",
        "Awesome! The automation workflows are working perfectly."
      ];
      const randomMsg = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];
      const resp = await fetch(`${API_BASE}/whatsapp/simulate-incoming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_phone: whatsappRecipient || '918741838653',
          sender_name: 'Client / Contact',
          message: randomMsg,
          user_email: userEmail
        })
      });
      const data = await resp.json();
      if (data.status === 'success' && data.message) {
        setWhatsappMessages(prev => [...prev, data.message]);
        showToast?.('Incoming WhatsApp message received inside Aether!', 'info');
        fetchWhatsAppMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImg = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = () => {
      setWhatsappAttachment({
        url: reader.result,
        name: file.name,
        type: isImg ? 'image' : 'document'
      });
      showToast?.(`Attached: ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const attachCurrentQuoteCard = () => {
    if (!canvasRef.current) {
      // Draw temporary
      drawQuoteCard();
    }
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setWhatsappAttachment({
        url: dataUrl,
        name: `Aether_Quote_${Date.now()}.png`,
        type: 'image'
      });
      setActiveTab('whatsapp_hub');
      showToast?.('Visual Quote Card attached to WhatsApp message!', 'success');
    }
  };

  // --- HTML5 Canvas Visual Card Generator ---
  const drawQuoteCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    const theme = CARD_THEMES.find(t => t.id === cardTheme) || CARD_THEMES[0];

    // Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, theme.bg1);
    gradient.addColorStop(1, theme.bg2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative Geometric Corner Rings
    ctx.strokeStyle = `${theme.accent}33`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width - 80, 80, 240, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(100, height - 100, 320, 0, Math.PI * 2);
    ctx.stroke();

    // Top Brand Tag
    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.fillText('ÆTHER EXECUTIVE INTELLIGENCE', 100, 140);

    ctx.strokeStyle = `${theme.accent}55`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, 165);
    ctx.lineTo(280, 165);
    ctx.stroke();

    // Big Modern Quote Mark
    ctx.fillStyle = `${theme.accent}44`;
    ctx.font = 'bold 160px Georgia, serif';
    ctx.fillText('“', 90, 320);

    const rawQuote = content.trim() || 'Speed of execution compounds faster than perfect analysis. Build repeatable systems today.';
    const quote = rawQuote.length > 280 ? rawQuote.slice(0, 277) + '...' : rawQuote;

    ctx.fillStyle = theme.text;
    ctx.font = '600 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    const words = quote.split(' ');
    let line = '';
    let y = 380;
    const lineHeight = 66;
    const maxWidth = 880;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 100, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 100, y);

    // Bottom Author & Verification Badge
    const authorY = height - 140;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(120, authorY - 10, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Æ', 112, authorY - 3);

    ctx.fillStyle = theme.text;
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.fillText(authorName || 'Operator', 160, authorY);

    ctx.fillStyle = `${theme.text}99`;
    ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.fillText('Executive Insights & Autonomous Strategy', 160, authorY + 36);
  };

  const handleDownloadCard = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Aether_Quote_Card_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    showToast?.('Visual quote card downloaded (1080x1080 PNG)!', 'success');
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast?.('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openPlatformShare = (platform, text) => {
    if (platform === 'whatsapp') {
      // Direct in-app WhatsApp Hub trigger
      setWhatsappText(text);
      setActiveTab('whatsapp_hub');
      showToast?.('Loaded into WhatsApp In-App Messenger!', 'success');
      return;
    }
    const encoded = encodeURIComponent(text);
    let url = '';
    if (platform === 'telegram') url = `https://t.me/share/url?url=${encodeURIComponent('https://aether.ai')}&text=${encoded}`;
    else if (platform === 'x') url = `https://twitter.com/intent/tweet?text=${encoded}`;
    else if (platform === 'linkedin') url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://aether.ai')}`;
    else if (platform === 'facebook') url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://aether.ai')}&quote=${encoded}`;
    else if (platform === 'reddit') url = `https://www.reddit.com/submit?title=${encodeURIComponent('Executive Insight')}&text=${encoded}`;
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      copyToClipboard(text, platform);
      showToast?.(`Copied! Open ${platform} to paste.`, 'info');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '960px',
        maxHeight: '92vh',
        background: '#090d16',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
        overflow: 'hidden',
        color: '#f8fafc'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(34, 197, 94, 0.35)'
            }}>
              <MessageSquare size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                Social Command & WhatsApp Live Hub
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                Direct WhatsApp In-App Messenger • Attachments & Activity • Viral Hooks • Visual Cards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          background: 'rgba(15, 23, 42, 0.4)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          overflowX: 'auto'
        }}>
          {[
            { id: 'whatsapp_hub', label: '🟢 WhatsApp In-App Messenger & Activity', icon: MessageSquare, badge: 'Direct' },
            { id: 'composer', label: '✍️ Post Composer & Viral Engine', icon: Sparkles },
            { id: 'ghostwriter', label: '🧠 Executive Ghostwriter', icon: Zap },
            { id: 'video_lab', label: '🎬 YouTube Repurposer', icon: Video },
            { id: 'engagement', label: '📊 Engagement & Comments Hub', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '0.84rem',
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                background: activeTab === tab.id 
                  ? (tab.id === 'whatsapp_hub' ? 'rgba(34, 197, 94, 0.22)' : 'rgba(56, 189, 248, 0.22)')
                  : 'transparent',
                border: activeTab === tab.id 
                  ? (tab.id === 'whatsapp_hub' ? '1px solid rgba(34, 197, 94, 0.6)' : '1px solid rgba(56, 189, 248, 0.5)')
                  : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <tab.icon size={15} color={activeTab === tab.id ? (tab.id === 'whatsapp_hub' ? '#4ade80' : '#38bdf8') : '#64748b'} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Hidden File Input for Attachments */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        {/* Body Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          {/* TAB 0: WHATSAPP DIRECT IN-APP MESSENGER & ACTIVITY */}
          {activeTab === 'whatsapp_hub' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* WhatsApp KPIs Banner */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div style={{ background: '#040711', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '14px', padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase' }}>Dispatched via Aether</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                    {whatsappStats.total_sent} Outbound
                  </div>
                </div>

                <div style={{ background: '#040711', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '14px', padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>Inbound Received</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                    {whatsappStats.total_received} Inbound
                  </div>
                </div>

                <div style={{ background: '#040711', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '14px', padding: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase' }}>Delivery Rate</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                    {whatsappStats.delivery_rate || '100%'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={handleSimulateIncomingWhatsApp}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Simulate client WhatsApp message to test receiving in Aether"
                  >
                    + Test Inbound Message
                  </button>
                  <button
                    onClick={fetchWhatsAppMessages}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#cbd5e1',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={14} className={isLoadingWhatsApp ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Chat Thread Container */}
              <div style={{
                background: '#040711',
                border: '1.5px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '18px',
                height: '420px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {/* Chat Top Bar */}
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderBottom: '1px solid rgba(34, 197, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 700
                    }}>
                      WA
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                        +{whatsappRecipient} (Target Recipient)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                        <span>Connected via Meta Cloud API Gateway</span>
                      </div>
                    </div>
                  </div>

                  {/* Recipient Number Switcher */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Send To:</span>
                    <input
                      type="text"
                      value={whatsappRecipient}
                      onChange={(e) => setWhatsappRecipient(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 918741838653"
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: '#080c16',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        fontSize: '0.78rem',
                        width: '130px'
                      }}
                    />
                  </div>
                </div>

                {/* Messages Scroll Area */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {whatsappMessages.map((msg, index) => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                      <div
                        key={msg.id || index}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isOutbound ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          alignSelf: isOutbound ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          background: isOutbound ? 'linear-gradient(135deg, #064e3b 0%, #052e16 100%)' : '#0f172a',
                          border: isOutbound ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: isOutbound ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          padding: '12px 14px',
                          color: '#f8fafc',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                          position: 'relative'
                        }}>
                          {/* Sender name for inbound */}
                          {!isOutbound && (
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', marginBottom: '4px' }}>
                              {msg.sender_name || `+${msg.phone_number}`}
                            </div>
                          )}

                          {/* Attachment Display */}
                          {msg.attachment_url && (
                            <div style={{ marginBottom: '8px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                              {msg.attachment_type === 'image' || msg.attachment_url.startsWith('data:image') ? (
                                <img
                                  src={msg.attachment_url}
                                  alt={msg.attachment_name || 'Attachment'}
                                  style={{ maxWidth: '100%', maxHeight: '180px', display: 'block', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <File size={20} color="#38bdf8" />
                                  <span style={{ fontSize: '0.8rem', color: '#f8fafc' }}>{msg.attachment_name || 'Document'}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Body */}
                          <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {msg.message_text}
                          </p>

                          {/* Time & Delivery Checkmark */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '4px',
                            marginTop: '6px',
                            fontSize: '0.68rem',
                            color: '#94a3b8'
                          }}>
                            <span>
                              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                            {isOutbound && (
                              <span style={{ color: msg.status === 'read' ? '#38bdf8' : '#4ade80' }}>
                                {msg.status === 'read' ? <CheckCheck size={14} color="#38bdf8" /> : <CheckCheck size={14} color="#4ade80" />}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Activity Inspector Trigger Pill */}
                        <button
                          onClick={() => setActiveActivityMessage(msg)}
                          style={{
                            marginTop: '4px',
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '0.68rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Info size={11} />
                          <span>View Post Activity & Timeline</span>
                        </button>
                      </div>
                    );
                  })}
                  <div ref={chatMessagesEndRef} />
                </div>

                {/* Attachment Preview (if any selected) */}
                {whatsappAttachment && (
                  <div style={{
                    padding: '8px 16px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderTop: '1px solid rgba(34, 197, 94, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Paperclip size={14} color="#4ade80" />
                      <span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 600 }}>
                        Attached: {whatsappAttachment.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setWhatsappAttachment(null)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {/* Message Composer & Action Bar */}
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {/* Attach File Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach Image or Document"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Paperclip size={18} />
                  </button>

                  {/* Attach Generated Quote Card */}
                  <button
                    onClick={attachCurrentQuoteCard}
                    title="Attach 1080x1080 Visual Card"
                    style={{
                      padding: '0 10px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      color: '#c084fc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    <Image size={15} />
                    <span>Attach Card</span>
                  </button>

                  {/* Input field */}
                  <input
                    type="text"
                    value={whatsappText}
                    onChange={(e) => setWhatsappText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendWhatsAppMessage();
                      }
                    }}
                    placeholder="Type WhatsApp message or post to send directly..."
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#040711',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />

                  {/* Send Button */}
                  <button
                    onClick={handleSendWhatsAppMessage}
                    disabled={isSendingWhatsApp || (!whatsappText.trim() && !whatsappAttachment)}
                    style={{
                      padding: '0 18px',
                      height: '38px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: (isSendingWhatsApp || (!whatsappText.trim() && !whatsappAttachment)) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: (isSendingWhatsApp || (!whatsappText.trim() && !whatsappAttachment)) ? 0.6 : 1,
                      flexShrink: 0
                    }}
                  >
                    <Send size={15} />
                    <span>{isSendingWhatsApp ? 'Sending...' : 'Send'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: COMPOSER & VIRAL ENGINE */}
          {activeTab === 'composer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Platform Selector Chips */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                {SOCIAL_PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      fontWeight: selectedPlatform === p.id ? 700 : 500,
                      background: selectedPlatform === p.id ? `${p.color}22` : 'rgba(255, 255, 255, 0.04)',
                      border: selectedPlatform === p.id ? `1.5px solid ${p.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                      color: selectedPlatform === p.id ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{p.icon}</span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>

              {/* Textarea Input */}
              <div style={{ position: 'relative' }}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What executive thought, project update, or insight would you like to share today? Type here or use the Executive Ghostwriter..."
                  style={{
                    width: '100%',
                    minHeight: '130px',
                    borderRadius: '16px',
                    padding: '16px',
                    background: '#040711',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    fontSize: '0.94rem',
                    lineHeight: '1.6',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '6px',
                  fontSize: '0.75rem',
                  color: '#64748b'
                }}>
                  <span>{content.length} characters</span>
                  <span>Supports Markdown, Hashtags & Emojis</span>
                </div>
              </div>

              {/* Action Buttons Row: Hooks, Visual Card, WhatsApp Direct, Adapt */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  onClick={handleAnalyzeViralHooks}
                  disabled={isAnalyzingHooks || !content.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: (isAnalyzingHooks || !content.trim()) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
                    opacity: (isAnalyzingHooks || !content.trim()) ? 0.6 : 1
                  }}
                >
                  <Flame size={16} />
                  <span>{isAnalyzingHooks ? 'Analyzing Virality...' : '🔥 Viral Score & Hook Enhancer'}</span>
                </button>

                <button
                  onClick={() => setShowCardModal(true)}
                  disabled={!content.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '12px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1.5px solid rgba(168, 85, 247, 0.45)',
                    color: '#c084fc',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: !content.trim() ? 'not-allowed' : 'pointer',
                    opacity: !content.trim() ? 0.6 : 1
                  }}
                >
                  <Image size={16} />
                  <span>🎨 1-Click Visual Social Card (1080x1080)</span>
                </button>

                {/* Direct WhatsApp Send Trigger from Composer */}
                <button
                  onClick={() => {
                    setWhatsappText(content);
                    setActiveTab('whatsapp_hub');
                    showToast?.('Draft transferred to WhatsApp In-App Messenger!', 'info');
                  }}
                  disabled={!content.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '12px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1.5px solid rgba(34, 197, 94, 0.5)',
                    color: '#4ade80',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: !content.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  <MessageSquare size={16} />
                  <span>🟢 Send via WhatsApp (In-App)</span>
                </button>

                <button
                  onClick={handleAdaptPost}
                  disabled={isAdapting || !content.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: (isAdapting || !content.trim()) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)',
                    opacity: (isAdapting || !content.trim()) ? 0.6 : 1,
                    marginLeft: 'auto'
                  }}
                >
                  <Sparkles size={16} />
                  <span>{isAdapting ? 'Adapting...' : 'Adapt for All Platforms'}</span>
                </button>
              </div>

              {/* Viral Analysis Output Card */}
              {viralAnalysis && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1.5px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Award size={20} color="#fbbf24" />
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fde68a' }}>
                        Viral Potential Score: {viralAnalysis.viral_score}/10 — {viralAnalysis.score_label}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {viralAnalysis.rationale}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                    {viralAnalysis.hooks && Object.entries(viralAnalysis.hooks).map(([type, hook]) => (
                      <div
                        key={type}
                        style={{
                          background: '#040711',
                          borderRadius: '12px',
                          padding: '12px',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: '#fbbf24'
                          }}>
                            {type.replace('_', ' ')}
                          </span>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.84rem', color: '#f8fafc', lineHeight: '1.4' }}>
                            "{hook}"
                          </p>
                        </div>
                        <button
                          onClick={() => applyHookToContent(hook)}
                          style={{
                            alignSelf: 'flex-start',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(245, 158, 11, 0.2)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          + Apply Hook
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adapted Platforms Results Grid */}
              {Object.keys(adaptedResults).length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '0 0 12px 0', color: '#38bdf8' }}>
                    🚀 Tailored Platform Formats (Ready to Publish)
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                    {Object.entries(adaptedResults).map(([plat, text]) => {
                      const platInfo = SOCIAL_PLATFORMS.find(p => p.id === plat) || { name: plat, icon: '📱', color: '#38bdf8' };
                      return (
                        <div
                          key={plat}
                          style={{
                            background: '#040711',
                            border: `1.5px solid ${platInfo.color}44`,
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '1.1rem' }}>{platInfo.icon}</span>
                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: platInfo.color }}>
                                  {platInfo.name}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {text.length} chars
                              </span>
                            </div>
                            <p style={{
                              margin: 0,
                              fontSize: '0.85rem',
                              color: '#cbd5e1',
                              lineHeight: '1.5',
                              whiteSpace: 'pre-wrap',
                              maxHeight: '180px',
                              overflowY: 'auto'
                            }}>
                              {text}
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <button
                              onClick={() => copyToClipboard(text, plat)}
                              style={{
                                flex: 1,
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: copiedKey === plat ? '#34d399' : '#f8fafc',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              {copiedKey === plat ? <Check size={14} /> : <Copy size={14} />}
                              <span>{copiedKey === plat ? 'Copied!' : 'Copy'}</span>
                            </button>

                            <button
                              onClick={() => openPlatformShare(plat, text)}
                              style={{
                                flex: 1.2,
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: `${platInfo.color}22`,
                                border: `1px solid ${platInfo.color}66`,
                                color: '#ffffff',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>{plat === 'whatsapp' ? 'In-App Messenger' : 'Direct Launch'}</span>
                              <ExternalLink size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXECUTIVE GHOSTWRITER */}
          {activeTab === 'ghostwriter' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
                    Daily Executive Thought Engine
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                    Synthesizes your recent tasks, projects, and autonomous workflow into a thought-leadership angle.
                  </p>
                </div>
                <button
                  onClick={fetchGhostwriterThought}
                  disabled={isLoadingGhostwriter}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.2)',
                    border: '1px solid rgba(56, 189, 248, 0.5)',
                    color: '#38bdf8',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: isLoadingGhostwriter ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RefreshCw size={14} className={isLoadingGhostwriter ? 'animate-spin' : ''} />
                  <span>{isLoadingGhostwriter ? 'Thinking...' : 'Generate New Thought'}</span>
                </button>
              </div>

              {ghostwriterThought ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#040711', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '16px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                      Topic: {ghostwriterThought.topic}
                    </span>
                    <h4 style={{ margin: '8px 0', fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      Hook: "{ghostwriterThought.hook}"
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#94a3b8', lineHeight: '1.5' }}>
                      {ghostwriterThought.body}
                    </p>
                  </div>

                  {ghostwriterThought.linkedin_post && (
                    <div style={{ background: '#040711', border: '1.5px solid rgba(10, 102, 194, 0.4)', borderRadius: '16px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#60a5fa', fontSize: '0.88rem' }}>💼 LinkedIn Post</span>
                        <button
                          onClick={() => loadGhostwriterIntoComposer(ghostwriterThought.linkedin_post)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            background: 'rgba(56, 189, 248, 0.2)',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            color: '#38bdf8',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          🚀 Load into Composer
                        </button>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {ghostwriterThought.linkedin_post}
                      </p>
                    </div>
                  )}

                  {ghostwriterThought.tweet && (
                    <div style={{ background: '#040711', border: '1.5px solid rgba(248, 250, 252, 0.3)', borderRadius: '16px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.88rem' }}>🐦 X / Twitter Short Post</span>
                        <button
                          onClick={() => loadGhostwriterIntoComposer(ghostwriterThought.tweet)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          🚀 Load into Composer
                        </button>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {ghostwriterThought.tweet}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <Zap size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                  <p>Click "Generate New Thought" to let Aether ghostwrite today's executive thought.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: YOUTUBE REPURPOSER */}
          {activeTab === 'video_lab' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#040711',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleSummarizeVideo}
                  disabled={isSummarizingVideo || !youtubeUrl.trim()}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: (isSummarizingVideo || !youtubeUrl.trim()) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Video size={16} />
                  <span>{isSummarizingVideo ? 'Summarizing...' : 'Summarize Video'}</span>
                </button>
              </div>

              {videoSummary && (
                <div style={{
                  background: '#040711',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#f87171', fontSize: '0.92rem' }}>
                      🎬 {videoSummary.title || 'Video Intelligence'}
                    </span>
                    <button
                      onClick={handleRepurposeVideo}
                      disabled={isRepurposingVideo}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: isRepurposingVideo ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isRepurposingVideo ? 'Repurposing...' : '⚡ Convert to 5-Tweet Thread & 30s Reel'}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {videoSummary.summary}
                  </p>
                </div>
              )}

              {repurposedResult && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  <div style={{
                    background: '#040711',
                    border: '1.5px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: '16px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.9rem' }}>🧵 5-Tweet Viral Thread</span>
                      <button
                        onClick={() => copyToClipboard(repurposedResult.thread.join('\n\n'), 'thread')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(56, 189, 248, 0.2)',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Copy Full Thread
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {repurposedResult.thread.map((t, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', fontSize: '0.82rem', color: '#f8fafc', lineHeight: '1.4' }}>
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    background: '#040711',
                    border: '1.5px solid rgba(225, 48, 108, 0.4)',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 800, color: '#f43f5e', fontSize: '0.9rem' }}>🎥 30s Reel / Shorts Script</span>
                        <button
                          onClick={() => copyToClipboard(`HOOK: ${repurposedResult.reel_script.hook}\n\nBODY: ${repurposedResult.reel_script.body}\n\nCTA: ${repurposedResult.reel_script.cta}`, 'reel')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(225, 48, 108, 0.2)',
                            border: 'none',
                            color: '#f43f5e',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Copy Script
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ padding: '8px', background: 'rgba(225, 48, 108, 0.08)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f43f5e' }}>HOOK (0-3s):</span>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#f8fafc' }}>{repurposedResult.reel_script.hook}</p>
                        </div>
                        <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8' }}>BODY (3-25s):</span>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#cbd5e1' }}>{repurposedResult.reel_script.body}</p>
                        </div>
                        <div style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4ade80' }}>CALL TO ACTION (25-30s):</span>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#f8fafc' }}>{repurposedResult.reel_script.cta}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ENGAGEMENT & COMMENTS HUB */}
          {activeTab === 'engagement' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#040711', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
                    <Eye size={18} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Tracked Views</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginTop: '6px' }}>
                    {engagementPosts.reduce((acc, p) => acc + (p.views || 0), 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: '#040711', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80' }}>
                    <ThumbsUp size={18} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Likes / Reactions</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginTop: '6px' }}>
                    {engagementPosts.reduce((acc, p) => acc + (p.likes || 0), 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: '#040711', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc' }}>
                    <MessageCircle size={18} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Audience Comments</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginTop: '6px' }}>
                    {engagementPosts.reduce((acc, p) => acc + (p.comments || 0), 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc' }}>
                  Live Tracked Content & Audience Feedback
                </span>
                <button
                  onClick={() => setShowTrackModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={15} />
                  <span>+ Track Live Post</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {engagementPosts.map((post, idx) => {
                  const plat = SOCIAL_PLATFORMS.find(p => p.id === post.platform) || { name: post.platform, icon: '📱', color: '#38bdf8' };
                  return (
                    <div
                      key={post.id || idx}
                      style={{
                        background: '#040711',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: `${plat.color}22`,
                            color: plat.color,
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}>
                            {plat.icon} {plat.name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {post.views ? `${post.views.toLocaleString()} views` : ''}
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                          {post.title}
                        </h4>
                        {post.top_comment && (
                          <div style={{
                            marginTop: '8px',
                            padding: '8px 10px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderLeft: `2.5px solid ${plat.color}`,
                            borderRadius: '4px 8px 8px 4px',
                            fontSize: '0.8rem',
                            color: '#cbd5e1',
                            fontStyle: 'italic'
                          }}>
                            💬 "{post.top_comment}"
                          </div>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '0.8rem',
                        color: '#94a3b8'
                      }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80' }}>
                            <ThumbsUp size={14} /> {post.likes || 0}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                            <MessageCircle size={14} /> {post.comments || 0}
                          </span>
                        </div>
                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem' }}
                          >
                            <span>Open</span>
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL 1: VISUAL QUOTE CARD GENERATOR --- */}
      {showCardModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          background: 'rgba(0, 0, 0, 0.88)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#090d16',
            border: '1.5px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '640px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Image size={20} color="#c084fc" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  1-Click Visual Social Card (1080x1080)
                </h3>
              </div>
              <button
                onClick={() => setShowCardModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              width: '100%',
              maxWidth: '380px',
              margin: '0 auto',
              aspectRatio: '1/1',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {CARD_THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setCardTheme(t.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      background: cardTheme === t.id ? t.accent : 'rgba(255, 255, 255, 0.05)',
                      color: cardTheme === t.id ? '#0f172a' : '#f8fafc',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Author Name"
                style={{
                  width: '140px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: '#040711',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  fontSize: '0.8rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleDownloadCard}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.90rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px rgba(168, 85, 247, 0.4)'
                }}
              >
                <Download size={18} />
                <span>Download PNG</span>
              </button>

              <button
                onClick={() => {
                  attachCurrentQuoteCard();
                  setShowCardModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.90rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px rgba(34, 197, 94, 0.4)'
                }}
              >
                <MessageSquare size={18} />
                <span>Send via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: MESSAGE ACTIVITY & TIMELINE INSPECTOR --- */}
      {activeActivityMessage && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          background: 'rgba(0, 0, 0, 0.88)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#090d16',
            border: '1.5px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  Post Delivery & Activity Inspector
                </h3>
              </div>
              <button
                onClick={() => setActiveActivityMessage(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Post Summary Preview */}
            <div style={{
              background: '#040711',
              borderRadius: '12px',
              padding: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '6px' }}>
                <span>Recipient: +{activeActivityMessage.phone_number}</span>
                <span style={{ textTransform: 'uppercase', color: activeActivityMessage.status === 'read' ? '#38bdf8' : '#4ade80', fontWeight: 700 }}>
                  Status: {activeActivityMessage.status}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#f8fafc', lineHeight: '1.4' }}>
                "{activeActivityMessage.message_text || (activeActivityMessage.attachment_name ? `Attachment: ${activeActivityMessage.attachment_name}` : 'Post Content')}"
              </p>
            </div>

            {/* Event Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                Activity Lifecycle Timeline
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(activeActivityMessage.activity && activeActivityMessage.activity.length > 0 ? activeActivityMessage.activity : [
                  { event: 'created', time: activeActivityMessage.created_at, note: 'Composed & queued in Aether' },
                  { event: 'dispatched', time: activeActivityMessage.created_at, note: 'Dispatched to Meta WhatsApp Cloud Gateway' },
                  { event: 'delivered', time: activeActivityMessage.created_at, note: 'Delivered to recipient with double tick' },
                  { event: 'read', time: activeActivityMessage.created_at, note: 'Read by recipient with blue tick' }
                ]).map((act, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid #22c55e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Check size={12} color="#4ade80" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', textTransform: 'capitalize' }}>
                        {act.event || 'Activity Logged'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        {act.note || act.timestamp || act.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setActiveActivityMessage(null)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#f8fafc',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Close Activity
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL 3: TRACK NEW LIVE POST --- */}
      {showTrackModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          background: 'rgba(0, 0, 0, 0.88)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#090d16',
            border: '1.5px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '520px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                Track New Published Post
              </h3>
              <button
                onClick={() => setShowTrackModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <input
              type="text"
              value={newTrackPost.title}
              onChange={(e) => setNewTrackPost({ ...newTrackPost, title: e.target.value })}
              placeholder="Post Title or Subject (e.g. 5 Workflows for AI)"
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#040711',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                fontSize: '0.85rem'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <input
                type="number"
                value={newTrackPost.likes}
                onChange={(e) => setNewTrackPost({ ...newTrackPost, likes: e.target.value })}
                placeholder="Likes"
                style={{ padding: '8px 10px', borderRadius: '8px', background: '#040711', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#f8fafc', fontSize: '0.82rem' }}
              />
              <input
                type="number"
                value={newTrackPost.comments}
                onChange={(e) => setNewTrackPost({ ...newTrackPost, comments: e.target.value })}
                placeholder="Comments"
                style={{ padding: '8px 10px', borderRadius: '8px', background: '#040711', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#f8fafc', fontSize: '0.82rem' }}
              />
              <input
                type="number"
                value={newTrackPost.views}
                onChange={(e) => setNewTrackPost({ ...newTrackPost, views: e.target.value })}
                placeholder="Views"
                style={{ padding: '8px 10px', borderRadius: '8px', background: '#040711', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#f8fafc', fontSize: '0.82rem' }}
              />
            </div>

            <input
              type="text"
              value={newTrackPost.top_comment}
              onChange={(e) => setNewTrackPost({ ...newTrackPost, top_comment: e.target.value })}
              placeholder="Top Audience Comment / Feedback"
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#040711',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                fontSize: '0.85rem'
              }}
            />

            <input
              type="text"
              value={newTrackPost.url}
              onChange={(e) => setNewTrackPost({ ...newTrackPost, url: e.target.value })}
              placeholder="Live Post URL (Optional)"
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#040711',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                fontSize: '0.85rem'
              }}
            />

            <button
              onClick={handleSaveTrackPost}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Save & Track Insights
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
