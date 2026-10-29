import React from 'react';

// Lightweight Markdown & Links message formatter with multiline link healing
export const FormattedMessage = ({ text }) => {
  if (!text) return null;

  // 1. Heal links where Gemini or line breaks separated ] and ( or wrapped URLs
  const healedText = text
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
          <div key={idx} style={{ lineHeight: '1.55', wordBreak: 'break-word' }}>
            {parts.map((part, pIdx) => {
              if (!part) return null;

              // Check [title](url)
              const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
              if (linkMatch) {
                return (
                  <a
                    key={pIdx}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--accent-cyan)',
                      fontWeight: 600,
                      textDecoration: 'underline',
                      wordBreak: 'break-word'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {linkMatch[1]} ↗
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
                      textDecoration: 'underline',
                      background: 'rgba(56, 189, 248, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      margin: '2px 0',
                      fontSize: '0.8rem',
                      verticalAlign: 'middle'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔗 स्रोत पढ़ें ↗ (Read Source)
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
