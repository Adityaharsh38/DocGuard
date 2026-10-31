import React from 'react';
import { ShieldCheck, GitPullRequest, Settings, ExternalLink } from 'lucide-react';

interface AppHeaderProps {
  onOpenSettings: () => void;
  isBackendOnline: boolean;
  isModelReady: boolean;
  isDemoMode: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenSettings,
  isBackendOnline,
  isModelReady,
  isDemoMode,
}) => {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl sticky top-0 z-40 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-20 flex items-center justify-between">
        {/* Brand & Purpose */}
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-zinc-900/90 border border-zinc-700/60 flex items-center justify-center text-zinc-100 shadow-lg shadow-black/30 ring-1 ring-white/5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-bold text-lg tracking-tight text-zinc-100">
                DocGuard
              </span>
              <span className="text-xs font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-md border border-zinc-700/60 bg-zinc-900/90 text-zinc-300">
                OdeX • MVP
              </span>
              {isDemoMode && (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-md border border-amber-900/70 bg-amber-950/50 text-amber-300 font-medium">
                  Mock Fixture v1
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 hidden sm:block mt-0.5 font-normal">
              Automated Documentation Drift Detection for GitHub Pull Requests
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center space-x-3">
          {/* Quick status pill */}
          <div className="hidden md:flex items-center space-x-3 px-3.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/70 text-xs shadow-inner">
            <span className="flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isBackendOnline
                    ? 'bg-emerald-400 ring-4 ring-emerald-500/20'
                    : 'bg-rose-400 ring-4 ring-rose-500/20'
                }`}
              />
              <span className="text-zinc-400 font-medium">API:</span>
              <span className={isBackendOnline ? 'text-zinc-200 font-semibold' : 'text-zinc-400'}>
                {isBackendOnline ? 'Online' : 'Offline'}
              </span>
            </span>
            <span className="text-zinc-700 font-light">|</span>
            <span className="flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isModelReady
                    ? 'bg-emerald-400 ring-4 ring-emerald-500/20'
                    : 'bg-amber-400 ring-4 ring-amber-500/20'
                }`}
              />
              <span className="text-zinc-400 font-medium">Model:</span>
              <span className={isModelReady ? 'text-zinc-200 font-semibold' : 'text-zinc-400'}>
                {isModelReady ? 'Qwen Ready' : 'Unavailable'}
              </span>
            </span>
          </div>

          {/* Settings / Network button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs sm:text-sm font-medium transition cursor-pointer shadow-sm"
            title="Configure API Base URL and Network Integration"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* GitHub link / Guide */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs sm:text-sm transition shadow-sm"
          >
            <GitPullRequest className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
};
