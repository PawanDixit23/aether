import React from 'react';
import { ExternalLink } from 'lucide-react';

// Robust Markdown & Link message formatter with multiline headline & URL healing
export const FormattedMessage = ({ text }) => {
  if (!text) return null;

  // 1. First, heal any multiline markdown links where headlines or URLs got split across lines:
  // e.g.:
  // 1. [UP MLC Polls: BJP's Candidate
  // Selection Under Lens]
  // (https://news.google.com/rss/artic
  // les/CB...) - Source
  let healedText = text.replace(/\[([\s\S]*?)\]\s*\((https?:\/\/[\s\S]*?)\)/g, (match, title, rawUrl) => {
    const cleanTitle = title.replace(/\s*\n+\s*/g, ' ').trim();
    const cleanUrl = rawUrl.replace(/\s+/g, '').trim();
    return `[${cleanTitle}](${cleanUrl})`;
  });

  // 2. Extra healing passes for orphaned braces
  healedText = healedText
    .replace(/\]\s*\n+\s*\(/g, '](')
    .replace(/\[\s*\n+/g, '[')
    .replace(/\n+\s*\]/g, ']')
    .replace(/\(\s*\n+\s*(https?:\/\/)/g, '($1');

  const lines = healedText.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} style={{ height: '4px' }} />;

        // Match markdown links [title](url), bold **text**, or standalone (https://...) / https://...
        const regex = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*.*?\*\*|\(?https?:\/\/[^\s)]+\)?)/g;
        const parts = line.split(regex);

        return (
          <div key={idx} style={{ lineHeight: '1.58', wordBreak: 'break-word' }}>
            {parts.map((part, pIdx) => {
              if (!part) return null;

              // Check [title](url)
              const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
              if (linkMatch) {
                const linkTitle = linkMatch[1];
                const linkUrl = linkMatch[2];
                return (
                  <a
                    key={pIdx}
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#38bdf8',
                      fontWeight: 600,
                      textDecoration: 'none',
                      borderBottom: '1px solid rgba(56, 189, 248, 0.4)',
                      wordBreak: 'break-word',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '1px 2px',
                      borderRadius: '4px',
                      transition: 'background 0.15s ease'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
                        try {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'OPEN_EXTERNAL_URL',
                            url: linkUrl
                          }));
                        } catch (err) {}
                      }
                    }}
                  >
                    <span>{linkTitle}</span>
                    <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.8 }} />
                  </a>
                );
              }

              // Check standalone or wrapped URL: (https://...) or https://...
              const rawUrlMatch = part.match(/^\(?(https?:\/\/[^\s)]+)\)?$/);
              if (rawUrlMatch) {
                const url = rawUrlMatch[1];
                return (
                  <a
                    key={pIdx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--accent-cyan)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      margin: '2px 0',
                      fontSize: '0.8rem',
                      verticalAlign: 'middle'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
                        try {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'OPEN_EXTERNAL_URL',
                            url: url
                          }));
                        } catch (err) {}
                      }
                    }}
                  >
                    <span>🔗 स्रोत पढ़ें ↗</span>
                  </a>
                );
              }

              // Check **bold**
              const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
              if (boldMatch) {
                return <strong key={pIdx} style={{ color: '#ffffff', fontWeight: 700 }}>{boldMatch[1]}</strong>;
              }

              return <span key={pIdx}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
};

export default FormattedMessage;
