import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface ZeroFindingsStateProps {
  repoUrl: string;
  prNumber: number;
}

export const ZeroFindingsState: React.FC<ZeroFindingsStateProps> = ({
  repoUrl,
  prNumber,
}) => {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center my-6">
      <div className="max-w-md mx-auto space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-100">
          No documentation drift detected by this analysis
        </h3>
        <p className="text-xs text-zinc-300 font-mono">
          {repoUrl} • PR #{prNumber}
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed pt-1">
          The modified code symbols and signatures in this pull request match all mapped documentation references.
        </p>
        <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-[11px] text-zinc-400 text-left flex items-start space-x-2">
          <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <span>
            <strong>Note:</strong> Zero detected findings indicates that no drift was flagged by the current static AST & markdown rules. This does not prove documentation is exhaustive or 100% bug-free.
          </span>
        </div>
      </div>
    </div>
  );
};
