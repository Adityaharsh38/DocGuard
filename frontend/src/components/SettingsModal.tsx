import React, { useState } from 'react';
import { X, Server, Network, Sliders, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  getApiBaseUrl,
  setApiBaseUrl,
  isDemoModeEnabled,
  setDemoModeEnabled,
} from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [urlInput, setUrlInput] = useState(getApiBaseUrl());
  const [demoMode, setDemoMode] = useState(isDemoModeEnabled());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiBaseUrl(urlInput.trim());
    setDemoModeEnabled(demoMode);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSave();
      onClose();
    }, 600);
  };

  const handleResetDefault = () => {
    const defaultUrl =
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    setUrlInput(defaultUrl);
    setDemoMode(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl p-6 text-zinc-100">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <h3 id="settings-title" className="text-sm font-semibold">
              Integration & Network Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* API Base URL Setting */}
          <div>
            <label
              htmlFor="api-url-input"
              className="block text-xs font-medium text-zinc-300 mb-1"
            >
              Backend API Base URL (FastAPI)
            </label>
            <p className="text-[11px] text-zinc-400 mb-2">
              Default is <code className="text-zinc-300 font-mono">http://localhost:8000</code>.
              For team testing across the same Wi-Fi, change this to the backend Mac&apos;s LAN IP (e.g.{' '}
              <code className="text-zinc-300 font-mono">http://192.168.1.25:8000</code>).
            </p>
            <input
              id="api-url-input"
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://localhost:8000"
              className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-100 border border-zinc-800 focus:border-zinc-500 focus:outline-none"
            />
          </div>

          {/* Demo Mock Fixture Toggle (Section 10 & 16 of Guide) */}
          <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-zinc-200 block">
                  Enable Mock Response Fixture (Section 16)
                </span>
                <span className="text-[11px] text-zinc-400 block mt-1 leading-relaxed">
                  Use the official test fixture for UI verification without a running backend.
                  When disabled, requests call the live FastAPI backend via HTTP.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={demoMode}
                onClick={() => setDemoMode(!demoMode)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  demoMode ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    demoMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Quick LAN Helper */}
          <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
            <span className="text-zinc-300 font-medium flex items-center space-x-1">
              <Network className="w-3.5 h-3.5" />
              <span>Multi-device Demo Reference:</span>
            </span>
            <p>
              Backend must run with <code className="text-zinc-300 font-mono">--host 0.0.0.0 --port 8000</code>.
              Ollama stays bound to Mac localhost (<code className="text-zinc-300 font-mono">11434</code>).
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition cursor-pointer"
            >
              {savedSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{savedSuccess ? 'Saved' : 'Save & Reconnect'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
