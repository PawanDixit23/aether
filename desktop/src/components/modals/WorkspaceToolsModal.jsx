import React, { useState, useEffect } from 'react';
import { FileText, Upload, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export const WorkspaceToolsModal = ({
  isOpen,
  onClose,
  apiBase,
  userEmail,
  apiKey,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState('routines');
  const [routines, setRoutines] = useState([]);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineTime, setRoutineTime] = useState('21:30');
  const [routinePrompt, setRoutinePrompt] = useState('');
  const [routineRecurrence, setRoutineRecurrence] = useState('daily');

  const [docText, setDocText] = useState('');
  const [docQuestion, setDocQuestion] = useState('');
  const [docAnswer, setDocAnswer] = useState('');
  const [docLoading, setDocLoading] = useState(false);

  const [digest, setDigest] = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);

  const fetchRoutines = async () => {
    if (!apiBase || !userEmail) return;
    try {
      const res = await fetch(`${apiBase}/routines`, {
        headers: { 'X-User-Email': userEmail }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setRoutines(data);
      }
    } catch {}
  };

  const fetchWeeklyDigest = async () => {
    if (!apiBase || !userEmail) return;
    setDigestLoading(true);
    try {
      const res = await fetch(`${apiBase}/digest/weekly`, {
        headers: { 'X-User-Email': userEmail }
      });
      if (res.ok) {
        const data = await res.json();
        setDigest(data);
      }
    } catch {} finally {
      setDigestLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'routines') fetchRoutines();
    if (activeTab === 'digest') fetchWeeklyDigest();
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleCreateRoutine = async (e) => {
    e.preventDefault();
    if (!routineTitle.trim() || !routinePrompt.trim() || !apiBase) return;
    try {
      const res = await fetch(`${apiBase}/routines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'X-User-Email': userEmail } : {})
        },
        body: JSON.stringify({
          title: routineTitle.trim(),
          schedule_time: routineTime,
          prompt: routinePrompt.trim(),
          recurrence: routineRecurrence
        })
      });
      if (res.ok) {
        setRoutineTitle('');
        setRoutinePrompt('');
        showToast?.('Routine scheduled!', 'success');
        fetchRoutines();
      } else {
        showToast?.('Failed to create routine', 'error');
      }
    } catch {
      showToast?.('Network error creating routine', 'error');
    }
  };

  const handleDeleteRoutine = async (id) => {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/routines/${id}`, {
        method: 'DELETE',
        headers: userEmail ? { 'X-User-Email': userEmail } : {}
      });
      if (res.ok) {
        setRoutines(prev => prev.filter(r => r.id !== id));
        showToast?.('Routine removed', 'info');
      }
    } catch {}
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.slice(file.name.lastIndexOf('.')) || '').toLowerCase();
    const isPlainText = ['.txt', '.md', '.csv', '.json', '.tsv', '.log'].includes(ext);

    setDocLoading(true);
    showToast?.(`Extracting text from ${file.name}...`, 'info');

    try {
      if (apiBase) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${apiBase}/documents/parse`, {
          method: 'POST',
          headers: userEmail ? { 'X-User-Email': userEmail } : {},
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          if (data.text) {
            setDocText(data.text);
            const pageInfo = data.pages > 1 ? ` (${data.pages} pages, ${data.word_count || data.text.split(/\s+/).length} words)` : ` (${data.word_count || data.text.split(/\s+/).length} words)`;
            showToast?.(`✅ Loaded ${file.name}${pageInfo}`, 'success');
            setDocLoading(false);
            e.target.value = '';
            return;
          }
        }
      }
      throw new Error('Server parse unavailable');
    } catch (err) {
      if (isPlainText) {
        const reader = new FileReader();
        reader.onload = () => {
          const text = String(reader.result || '');
          setDocText(text);
          showToast?.(`✅ Loaded ${file.name} (${text.split(/\s+/).length} words)`, 'success');
          setDocLoading(false);
        };
        reader.readAsText(file);
      } else {
        showToast?.(`Could not parse ${file.name}. Ensure backend is connected.`, 'error');
        setDocLoading(false);
      }
    }
    e.target.value = '';
  };

  const handleAskDocs = async (e) => {
    e.preventDefault();
    if (!docText.trim() || !docQuestion.trim() || !apiBase) return;
    setDocLoading(true);
    setDocAnswer('');
    try {
      const res = await fetch(`${apiBase}/docs/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'X-User-Email': userEmail } : {})
        },
        body: JSON.stringify({
          question: docQuestion.trim(),
          document_text: docText.trim(),
          api_key: apiKey || null
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDocAnswer(data.answer || 'No answer found.');
      } else {
        setDocAnswer('Failed to query document.');
      }
    } catch {
      setDocAnswer('Network error querying document.');
    } finally {
      setDocLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#0d1527', border: '1px solid rgba(56, 189, 248, 0.28)', borderRadius: '24px', padding: '22px', width: '100%', maxWidth: '580px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8' }}>
            AETHER WORKSPACE TOOLS
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'routines', label: 'Routines' },
            { id: 'docs', label: 'Ask Docs' },
            { id: 'digest', label: 'Weekly Digest' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: `1px solid ${activeTab === tab.id ? 'rgba(56,189,248,0.55)' : 'rgba(255,255,255,0.08)'}`,
                background: activeTab === tab.id ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.03)',
                color: activeTab === tab.id ? '#7dd3fc' : '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeTab === 'routines' && (
            <>
              <form onSubmit={handleCreateRoutine} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Routine name (e.g. Nightly Spend Summary)"
                    value={routineTitle}
                    onChange={(e) => setRoutineTitle(e.target.value)}
                    style={{ flex: '1 1 180px', minWidth: '160px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                  <input
                    type="time"
                    value={routineTime}
                    onChange={(e) => setRoutineTime(e.target.value)}
                    style={{ background: '#111b33', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                  <select
                    value={routineRecurrence}
                    onChange={(e) => setRoutineRecurrence(e.target.value)}
                    style={{ background: '#111b33', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px', color: '#cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Instruction (e.g. Summarize today's expenses and tomorrow's tasks)"
                    value={routinePrompt}
                    onChange={(e) => setRoutinePrompt(e.target.value)}
                    style={{ flex: '1 1 200px', minWidth: '180px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                  <button type="submit" style={{ background: '#38bdf8', border: 'none', color: '#080c16', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    + Schedule
                  </button>
                </div>
              </form>

              {routines.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '24px 0', fontSize: '0.84rem' }}>
                  No routines scheduled yet.
                </div>
              ) : (
                routines.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' }}>
                    <div>
                      <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.86rem' }}>{r.title}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.76rem' }}>{r.recurrence} at {r.schedule_time} — {r.prompt}</div>
                    </div>
                    <button type="button" onClick={() => handleDeleteRoutine(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'docs' && (
            <form onSubmit={handleAskDocs} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Paste notes/bill text or upload any file (`.pdf`, `.docx`, `.doc`, `.txt`, `.md`, `.csv`):</span>
                <label style={{
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(14, 165, 233, 0.14))',
                  border: '1px solid rgba(56, 189, 248, 0.45)',
                  color: '#7dd3fc',
                  padding: '5px 12px',
                  borderRadius: '10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}>
                  {docLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={13} />}
                  <span>{docLoading ? 'Extracting...' : 'Upload Document'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.csv,.json,.md,.rtf,.tsv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <textarea
                rows={6}
                placeholder="Paste document, receipt, or notes here, or upload any PDF/DOCX/TXT file above..."
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Ask a question about this document..."
                  value={docQuestion}
                  onChange={(e) => setDocQuestion(e.target.value)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '0.82rem' }}
                />
                <button type="submit" disabled={docLoading} style={{ background: '#38bdf8', border: 'none', color: '#080c16', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {docLoading && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                  <span>{docLoading ? 'Thinking...' : 'Ask'}</span>
                </button>
              </div>
              {docAnswer && (
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#e2e8f0', fontSize: '0.84rem', lineHeight: '1.5' }}>
                  {docAnswer}
                </div>
              )}
            </form>
          )}

          {activeTab === 'digest' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {digestLoading ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>Loading weekly digest...</div>
              ) : digest ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>7-Day Spend</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171' }}>₹{Number(digest.weekly_expense || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Tasks Completed</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399' }}>{digest.tasks_completed}</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Tasks Pending</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8' }}>{digest.tasks_pending}</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: '0.84rem', lineHeight: '1.5' }}>
                    {digest.summary}
                  </div>
                </>
              ) : (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '24px 0', fontSize: '0.84rem' }}>
                  Sign in to view your personalized weekly digest.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceToolsModal;

