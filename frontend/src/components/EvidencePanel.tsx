import React, { useState } from 'react';
import { Copy, Check, FileText, Code2, Sparkles, AlertCircle } from 'lucide-react';
import { Finding } from '../types';
import { formatLineNumber } from '../utils/validators';

interface EvidencePanelProps {
  finding: Finding;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ finding }) => {
  const [copied, setCopied] = useState(false);

  const handleCopySuggestion = async () => {
    if (!finding.suggestion) return;
    try {
      await navigator.clipboard.writeText(finding.suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="mt-5 pt-5 border-t border-zinc-800/80 space-y-5">
      {/* Code vs Documentation Evidence Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Documented in Docs */}
        <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/90 p-4 flex flex-col justify-between shadow-inner">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-900 text-xs sm:text-sm">
              <span className="flex items-center space-x-2 text-zinc-300 font-semibold">
                <FileText className="w-4 h-4 text-rose-400" />
                <span>Documented in Docs</span>
              </span>
              <span className="font-mono text-xs text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {formatLineNumber(finding.docs_line)}
              </span>
            </div>
            <div className="font-mono text-xs text-zinc-400 break-all mb-2.5">
              {finding.docs_file || 'Documentation file'}
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-900/90 border border-zinc-800/90 font-mono text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap break-all select-all leading-relaxed">
              {finding.documented_value || '(No documented value recorded)'}
            </div>
          </div>
          <div className="mt-2.5 text-xs text-zinc-400 font-medium">
            Current documentation excerpt
          </div>
        </div>

        {/* Actual Code Implementation */}
        <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/90 p-4 flex flex-col justify-between shadow-inner">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-900 text-xs sm:text-sm">
              <span className="flex items-center space-x-2 text-zinc-300 font-semibold">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>Actual Code Fact (AST)</span>
              </span>
              <span className="font-mono text-xs text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {formatLineNumber(finding.code_line)}
              </span>
            </div>
            <div className="font-mono text-xs text-zinc-400 break-all mb-2.5">
              {finding.code_file || 'Code file'}
            </div>
            <div className="p-3.5 rounded-lg bg-zinc-900/90 border border-zinc-800/90 font-mono text-xs sm:text-sm text-emerald-300/90 whitespace-pre-wrap break-all select-all leading-relaxed">
              {finding.actual_value || '(No actual value extracted)'}
            </div>
          </div>
          <div className="mt-2.5 text-xs text-zinc-400 font-medium">
            Source-of-truth code definition
          </div>
        </div>
      </div>

      {/* Suggested Documentation Correction */}
      {finding.suggestion && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm font-semibold text-zinc-100 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Suggested Documentation Correction</span>
            </span>
            <button
              type="button"
              onClick={handleCopySuggestion}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-medium transition cursor-pointer shadow-sm"
              title="Copy suggestion to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Suggestion</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs sm:text-sm text-zinc-100 whitespace-pre-wrap select-all leading-relaxed">
            {finding.suggestion}
          </div>

          <p className="text-xs text-zinc-400 mt-2.5 flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>
              Recommendation only — DocGuard highlights drift for audit and does not alter repository files automatically.
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
