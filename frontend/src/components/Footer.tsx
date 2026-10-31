import React from 'react';
import { ShieldCheck, GitBranch, Cpu, Terminal } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-zinc-900 bg-zinc-950 py-8 text-zinc-400 text-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-zinc-300">DocGuard</span>
            <span className="text-zinc-600">•</span>
            <span>Automated Documentation Drift Detection</span>
            <span className="text-zinc-600">•</span>
            <span className="font-mono text-[11px] text-zinc-400">Team OdeX</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-zinc-400">
            <span className="flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5" />
              <span>Engine: Python AST + Qwen (Ollama)</span>
            </span>
            <span className="flex items-center space-x-1">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Contract: v1</span>
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-400">
          <p>
            <strong>MVP Scope Note:</strong> Supported file & language coverage is strictly determined by backend implementation. Frontend visualizes evidence and does not invent drift facts.
          </p>
          <span className="shrink-0 text-zinc-400">
            FastAPI + React + Vite + Tailwind CSS
          </span>
        </div>
      </div>
    </footer>
  );
};
