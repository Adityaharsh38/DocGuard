import React, { useState } from 'react';
import { GitPullRequest, Sparkles, ArrowRight } from 'lucide-react';
import { validateRepoUrl, validatePrNumber } from '../utils/validators';

interface RepoPrFormProps {
  onSubmit: (repoUrl: string, prNumber: number) => void;
  isLoading: boolean;
  initialRepoUrl?: string;
  initialPrNumber?: number | string;
}

export const RepoPrForm: React.FC<RepoPrFormProps> = ({
  onSubmit,
  isLoading,
  initialRepoUrl = '',
  initialPrNumber = '',
}) => {
  const [repoUrl, setRepoUrl] = useState(initialRepoUrl || 'https://github.com/fastapi/fastapi');
  const [prNumber, setPrNumber] = useState<string>(
    initialPrNumber !== '' ? String(initialPrNumber) : '42'
  );
  const [urlError, setUrlError] = useState<string | null>(null);
  const [prError, setPrError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Validate repo URL
    const urlValidation = validateRepoUrl(repoUrl);
    if (!urlValidation.isValid) {
      setUrlError(urlValidation.error || 'Invalid repository URL');
    } else {
      setUrlError(null);
    }

    // Validate PR number
    const prValidation = validatePrNumber(prNumber);
    if (!prValidation.isValid) {
      setPrError(prValidation.error || 'Invalid PR number');
    } else {
      setPrError(null);
    }

    if (!urlValidation.isValid || !prValidation.isValid) {
      return;
    }

    onSubmit(repoUrl.trim(), parseInt(prNumber, 10));
  };

  const handleApplyPreset = (presetUrl: string, presetPr: string) => {
    setRepoUrl(presetUrl);
    setPrNumber(presetPr);
    setUrlError(null);
    setPrError(null);
  };

  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 backdrop-blur-md p-6 sm:p-7 shadow-lg shadow-black/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center space-x-2.5">
            <GitPullRequest className="w-5 h-5 text-zinc-400" />
            <span>Target Pull Request</span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Enter a public GitHub repository and pull request number to analyze documentation drift.
          </p>
        </div>

        {/* Quick Demo Presets */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          <span className="text-xs text-zinc-400 mr-1 flex items-center font-medium">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-zinc-400" /> Presets:
          </span>
          <button
            type="button"
            onClick={() => handleApplyPreset('https://github.com/fastapi/fastapi', '42')}
            className="text-xs font-mono px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 transition cursor-pointer shadow-sm"
          >
            fastapi #42
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('https://github.com/psf/requests', '18')}
            className="text-xs font-mono px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 transition cursor-pointer shadow-sm"
          >
            requests #18
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('https://github.com/pallets/clean-docs', '1')}
            className="text-xs font-mono px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 transition cursor-pointer shadow-sm"
            title="Load zero drift test case"
          >
            zero-drift #1
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Repository URL Input */}
          <div className="md:col-span-8">
            <label
              htmlFor="repo-url-input"
              className="block text-sm font-medium text-zinc-200 mb-2"
            >
              Public Repository URL <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="repo-url-input"
                type="url"
                required
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                disabled={isLoading}
                placeholder="https://github.com/owner/repository"
                className={`w-full rounded-xl bg-zinc-950/90 px-4 py-3 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 border ${
                  urlError
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-zinc-800 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-600/20'
                } transition duration-150 focus:outline-none disabled:opacity-50 shadow-inner`}
              />
            </div>
            {urlError && (
              <p className="text-xs text-rose-400 mt-1.5 font-medium">{urlError}</p>
            )}
          </div>

          {/* PR Number Input */}
          <div className="md:col-span-4">
            <label
              htmlFor="pr-number-input"
              className="block text-sm font-medium text-zinc-200 mb-2"
            >
              Pull Request # <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="pr-number-input"
                type="number"
                min="1"
                step="1"
                required
                value={prNumber}
                onChange={(e) => {
                  setPrNumber(e.target.value);
                  if (prError) setPrError(null);
                }}
                disabled={isLoading}
                placeholder="42"
                className={`w-full rounded-xl bg-zinc-950/90 px-4 py-3 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 border ${
                  prError
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-zinc-800 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-600/20'
                } transition duration-150 focus:outline-none disabled:opacity-50 shadow-inner`}
              />
            </div>
            {prError && (
              <p className="text-xs text-rose-400 mt-1.5 font-medium">{prError}</p>
            )}
          </div>
        </div>

        {/* Action Button & API contract note */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <span className="text-xs text-zinc-400 font-normal">
            Sends <code className="text-zinc-300 font-mono px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">POST /api/analyze</code> with{' '}
            <code className="text-zinc-300 font-mono px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">{`{"repo_url", "pr_number"}`}</code>
          </span>

          <button
            type="submit"
            data-testid="analyze-btn"
            disabled={isLoading}
            className="inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all duration-150 shadow-md shadow-white/5 hover:shadow-white/10 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-zinc-950"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Analyzing PR...</span>
              </>
            ) : (
              <>
                <span>Analyze PR Drift</span>
                <ArrowRight className="w-4 h-4 text-zinc-900" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
