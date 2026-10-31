import React from 'react';
import { Server, Cpu, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { ConnectionState, ModelConnectionState, ModelStatusResponse } from '../types';

interface BackendStatusProps {
  backendState: ConnectionState;
  backendService: string | null;
  modelState: ModelConnectionState;
  modelData: ModelStatusResponse | null;
  apiBaseUrl: string;
  isChecking: boolean;
  isDemoMode: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onToggleDemoMode: () => void;
}

export const BackendStatus: React.FC<BackendStatusProps> = ({
  backendState,
  backendService,
  modelState,
  modelData,
  apiBaseUrl,
  isChecking,
  isDemoMode,
  onRefresh,
  onOpenSettings,
  onToggleDemoMode,
}) => {
  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-5 mb-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Backend Endpoint Health */}
        <div className="flex items-center space-x-3.5">
          <div className="p-2 rounded-lg bg-zinc-800/90 text-zinc-300 shadow-sm border border-zinc-700/50">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-sm font-semibold text-zinc-200">Backend API</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                  backendState === 'online'
                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 shadow-sm shadow-emerald-950/50'
                    : backendState === 'checking'
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-rose-950/70 text-rose-300 border border-rose-800/60 shadow-sm shadow-rose-950/50'
                }`}
              >
                {backendState === 'online' && <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />}
                {backendState === 'offline' && <XCircle className="w-3.5 h-3.5 mr-1 text-rose-400" />}
                {backendState === 'checking' ? 'Checking /health...' : backendState === 'online' ? 'Online' : 'Unreachable'}
              </span>
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-1">
              {backendState === 'online' ? (
                <span>service: {backendService || 'docguard-api'}</span>
              ) : (
                <span className="text-zinc-500">{apiBaseUrl}</span>
              )}
            </div>
          </div>
        </div>

        {/* Ollama / Qwen Model Status */}
        <div className="flex items-center space-x-3.5">
          <div className="p-2 rounded-lg bg-zinc-800/90 text-zinc-300 shadow-sm border border-zinc-700/50">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-sm font-semibold text-zinc-200">AI Model (Ollama)</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                  modelState === 'available'
                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 shadow-sm shadow-emerald-950/50'
                    : modelState === 'checking'
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-amber-950/70 text-amber-300 border border-amber-800/60 shadow-sm shadow-amber-950/50'
                }`}
              >
                {modelState === 'available' && <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />}
                {modelState === 'unavailable' && <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-400" />}
                {modelState === 'checking'
                  ? 'Checking model...'
                  : modelState === 'available'
                  ? 'Ready'
                  : 'Unavailable'}
              </span>
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-1">
              {modelData?.model ? (
                <span>
                  {modelData.provider || 'ollama'} • {modelData.model}
                </span>
              ) : (
                <span className="text-zinc-500">qwen3:4b</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2.5 ml-auto">
          <button
            type="button"
            data-testid="toggle-fixture-btn"
            onClick={onToggleDemoMode}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-150 cursor-pointer border shadow-sm ${
              isDemoMode
                ? 'bg-amber-950/60 text-amber-200 border-amber-700 shadow-amber-950/30'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:border-zinc-700'
            }`}
            title="Toggle between Live API and Sample Mock Fixture (Section 16)"
          >
            <span>Fixture:</span>
            <span className={isDemoMode ? 'font-bold text-amber-300' : 'text-zinc-400'}>
              {isDemoMode ? 'Active' : 'Off'}
            </span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isChecking}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition cursor-pointer disabled:opacity-50 shadow-sm"
            title="Refresh connection health and model status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Check</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition cursor-pointer"
          >
            Config
          </button>
        </div>
      </div>

      {/* Model unavailable notice if backend is up but model is not */}
      {backendState === 'online' && modelState === 'unavailable' && (
        <div className="mt-4 pt-4 border-t border-zinc-800/70 flex items-start space-x-2.5 text-xs text-amber-300/90 leading-relaxed">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">Model service is currently unavailable. </span>
            <span className="text-zinc-400">
              Ensure Ollama is running on the backend Mac (<code className="text-zinc-300 font-mono px-1 py-0.5 rounded bg-zinc-950 border border-zinc-800">ollama serve</code>) with model <code className="text-zinc-300 font-mono px-1 py-0.5 rounded bg-zinc-950 border border-zinc-800">qwen3:4b</code>.
            </span>
          </div>
        </div>
      )}

      {/* Backend offline warning banner */}
      {backendState === 'offline' && (
        <div className="mt-4 pt-4 border-t border-zinc-800/70 flex items-start justify-between gap-4 text-xs text-zinc-400 leading-relaxed">
          <div className="flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-zinc-300 font-medium">Backend is unreachable at {apiBaseUrl}. </span>
              <span>Start FastAPI with <code className="text-zinc-200 font-mono px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">uvicorn app.main:app --reload --host 0.0.0.0 --port 8000</code> or switch to the sample preview fixture for testing.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleDemoMode}
            className="shrink-0 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium transition cursor-pointer shadow-sm"
          >
            Switch to Mock Fixture
          </button>
        </div>
      )}
    </div>
  );
};
