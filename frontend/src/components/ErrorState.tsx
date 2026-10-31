import React from 'react';
import { AlertCircle, RefreshCw, Terminal, ExternalLink } from 'lucide-react';

interface ErrorStateProps {
  errorMessage: string;
  onRetry: () => void;
  apiBaseUrl: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  errorMessage,
  onRetry,
  apiBaseUrl,
}) => {
  const isNetworkOrConnectionError =
    errorMessage.toLowerCase().includes('failed to fetch') ||
    errorMessage.toLowerCase().includes('network') ||
    errorMessage.toLowerCase().includes('health check failed') ||
    errorMessage.toLowerCase().includes('unreachable');

  const isTimeout = errorMessage.toLowerCase().includes('timed out');
  const isRateLimit = errorMessage.toLowerCase().includes('rate limit');

  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-5 my-6 space-y-4"
    >
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-400 shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-rose-200">
            {isTimeout
              ? 'Request Timed Out'
              : isRateLimit
              ? 'GitHub Rate Limit / Access Restriction'
              : isNetworkOrConnectionError
              ? 'Backend API Connection Failure'
              : 'Analysis Request Failed'}
          </h3>
          <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
            {errorMessage}
          </p>

          {/* Developer troubleshooting hints if backend connection failed */}
          {isNetworkOrConnectionError && (
            <div className="mt-3 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs space-y-2">
              <span className="font-semibold text-zinc-300 block">
                Backend Troubleshooting Checklist:
              </span>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 font-mono text-[11px]">
                <li>
                  Verify FastAPI backend is running:{' '}
                  <span className="text-zinc-200">uvicorn app.main:app --reload --host 0.0.0.0 --port 8000</span>
                </li>
                <li>
                  Check reachable endpoint:{' '}
                  <span className="text-zinc-200">{apiBaseUrl}/health</span>
                </li>
                <li>
                  Verify CORS allows the frontend origin on port 3000 / 5173.
                </li>
                <li>
                  If on the same Wi-Fi, ensure <code className="text-zinc-200 font-sans">VITE_API_BASE_URL</code> uses the Mac's LAN IP instead of localhost.
                </li>
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Analysis</span>
            </button>
            <span className="text-[11px] text-zinc-400">
              Form input values have been preserved.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
