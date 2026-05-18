import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "text-lg leading-relaxed text-slate-300 font-normal mb-10" }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!text) return null;

  // Split text by markdown code block syntax: ```lang ... ```
  const parts = text.split(/(```[\s\S]*?```)/g);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language and code content
          const lines = part.slice(3, -3).trim().split('\n');
          let language = 'code';
          let codeLines = lines;

          if (lines[0] && !lines[0].includes(' ') && lines[0].length < 10) {
            language = lines[0].toLowerCase();
            codeLines = lines.slice(1);
          }

          const codeString = codeLines.join('\n');

          return (
            <div key={index} className="my-6 rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-2xl">
              {/* Window Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                  <span className="ml-3 text-xs font-mono text-slate-500 uppercase tracking-widest">{language}</span>
                </div>
                <button
                  onClick={() => handleCopy(codeString, index)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-bold"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              {/* Code Body */}
              <pre className="p-5 overflow-x-auto font-mono text-sm text-slate-300 leading-relaxed bg-slate-950/40">
                <code>{codeString}</code>
              </pre>
            </div>
          );
        }

        // Standard text segment: Handle inline code backticks `code`
        const subParts = part.split(/(`[^`]+`)/g);
        return (
          <span key={index}>
            {subParts.map((subPart, subIndex) => {
              if (subPart.startsWith('`') && subPart.endsWith('`')) {
                return (
                  <code key={subIndex} className="px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/50 text-orange-400 font-mono text-sm mx-1">
                    {subPart.slice(1, -1)}
                  </code>
                );
              }
              return subPart;
            })}
          </span>
        );
      })}
    </div>
  );
};
