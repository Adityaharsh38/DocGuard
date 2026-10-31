import React, { useEffect, useState } from 'react';
import { GitPullRequest, Search, FileCode2, Cpu } from 'lucide-react';

interface LoadingStateProps {
  repoUrl: string;
  prNumber: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  repoUrl,
  prNumber,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center my-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* Honest spinner */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-zinc-200 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <GitPullRequest className="w-5 h-5 text-zinc-400" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-100">
            Analyzing Pull Request #{prNumber}
          </h3>
          <p className="text-xs font-mono text-zinc-400 mt-1 truncate">
            {repoUrl}
          </p>
        </div>

        {/* Informative stage description */}
        <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-left space-y-2">
          <div className="flex items-center space-x-2 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Fetching PR diff, mapping markdown docs & extracting Python AST facts</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-zinc-400">
            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
            <span>Evaluating documentation alignment via backend Qwen/Ollama engine</span>
          </div>
          <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-900 font-mono">
            <span>Elapsed time: {elapsedSeconds}s</span>
            <span>API Timeout: 120s</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500">
          Backend static analysis and reasoning are running. Please keep this tab active.
        </p>
      </div>
    </div>
  );
};
