import React, { useMemo } from 'react';

interface JsonCodeViewProps {
  data: unknown;
  raw: string;
}

/** A plain editor canvas shared by request configuration and response payloads. */
export function JsonCodeView({ data, raw }: JsonCodeViewProps) {
  const formatted = useMemo(() => {
    try {
      return typeof data === 'object' && data !== null ? JSON.stringify(data, null, 2) : raw;
    } catch {
      return raw;
    }
  }, [data, raw]);
  const lines = useMemo(() => formatted.split('\n'), [formatted]);

  const highlight = (line: string) => {
    const tokens = line.split(/("(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g);
    return tokens.map((token, index) => {
      let color = 'text-pm-light-text dark:text-pm-dark-text';
      if (/^"/.test(token) && /^\s*:/.test(tokens[index + 1] || '')) color = 'text-[#9257b5] dark:text-[#bf9de5]';
      else if (/^"/.test(token)) color = 'text-[#22863a] dark:text-[#9dc28c]';
      else if (/^(true|false|null)$/.test(token)) color = 'text-[#b15e24] dark:text-[#d7a879]';
      else if (/^-?\d/.test(token)) color = 'text-[#166b9f] dark:text-[#8db7d1]';
      return <span key={index} className={color}>{token}</span>;
    });
  };

  return (
    <div className="min-w-max py-3 font-mono text-[12px] leading-[22px] select-text" aria-label="JSON">
      {lines.map((line, index) => (
        <div key={index} className="flex min-h-[22px] hover:bg-black/[0.025] dark:hover:bg-white/[0.025]">
          <span aria-hidden="true" className="w-12 shrink-0 pr-4 text-right text-[11px] text-pm-light-textMuted/60 dark:text-pm-dark-textMuted/50 select-none">{index + 1}</span>
          <span className="whitespace-pre pr-6">{highlight(line)}</span>
        </div>
      ))}
    </div>
  );
}
