import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HealthResponse,
  ModelStatusResponse,
  AnalysisResponse,
  ConnectionState,
  ModelConnectionState,
} from './types';
import {
  getHealth,
  getModelStatus,
  analyzePullRequest,
  getApiBaseUrl,
  isDemoModeEnabled,
} from './services/api';
import { AppHeader } from './components/AppHeader';
import { BackendStatus } from './components/BackendStatus';
import { RepoPrForm } from './components/RepoPrForm';
import { AnalysisSummary } from './components/AnalysisSummary';
import { FindingCard } from './components/FindingCard';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { ZeroFindingsState } from './components/ZeroFindingsState';
import { SettingsModal } from './components/SettingsModal';
import { Footer } from './components/Footer';
import { ExportReportMenu } from './components/ExportReportMenu';
import { SAMPLE_ANALYSIS_RESPONSE } from './fixtures/sampleResponse';
import { normalizeSeverity } from './utils/validators';

export default function App() {
  // Connection states
  const [backendState, setBackendState] = useState<ConnectionState>('checking');
  const [backendService, setBackendService] = useState<string | null>(null);
  const [modelState, setModelState] = useState<ModelConnectionState>('checking');
  const [modelData, setModelData] = useState<ModelStatusResponse | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [demoModeActive, setDemoModeActive] = useState(isDemoModeEnabled());

  // Form & Analysis states
  const [repoUrl, setRepoUrl] = useState('https://github.com/fastapi/fastapi');
  const [prNumber, setPrNumber] = useState<number>(42);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(
    // Seed with sample response if in demo mode initially, or null
    isDemoModeEnabled() ? SAMPLE_ANALYSIS_RESPONSE : null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Check backend health and model status
  const checkConnections = useCallback(async () => {
    setIsCheckingConnection(true);
    setBackendState('checking');
    setModelState('checking');

    // 1. Check /health
    try {
      const health = await getHealth(6000);
      setBackendState('online');
      setBackendService(health.service);
    } catch {
      setBackendState('offline');
      setBackendService(null);
    }

    // 2. Check /api/model-status
    try {
      const model = await getModelStatus(6000);
      setModelData(model);
      setModelState(model.available ? 'available' : 'unavailable');
    } catch {
      setModelState('unavailable');
      setModelData(null);
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkConnections();
  }, [checkConnections]);

  // Handler for analyzing PR
  const handleAnalyze = async (submittedUrl: string, submittedPr: number) => {
    setRepoUrl(submittedUrl);
    setPrNumber(submittedPr);
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const result = await analyzePullRequest({
        repo_url: submittedUrl,
        pr_number: submittedPr,
      });
      setAnalysisResult(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred during PR analysis.';
      setErrorMessage(message);
      console.error('DocGuard analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Re-check after settings change
  const handleSettingsSaved = () => {
    setApiBaseUrlState(getApiBaseUrl());
    setDemoModeActive(isDemoModeEnabled());
    checkConnections();
  };

  // Filtered findings computation
  const filteredFindings = useMemo(() => {
    if (!analysisResult?.findings) return [];

    return analysisResult.findings.filter((finding) => {
      // Severity filter
      const norm = normalizeSeverity(finding.severity);
      if (severityFilter !== 'all' && norm !== severityFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDocs = finding.docs_file?.toLowerCase().includes(q);
        const matchesCode = finding.code_file?.toLowerCase().includes(q);
        const matchesExpl = finding.explanation?.toLowerCase().includes(q);
        const matchesType = finding.type?.toLowerCase().includes(q);
        const matchesDocVal = finding.documented_value?.toLowerCase().includes(q);
        const matchesActVal = finding.actual_value?.toLowerCase().includes(q);
        return Boolean(
          matchesDocs || matchesCode || matchesExpl || matchesType || matchesDocVal || matchesActVal
        );
      }

      return true;
    });
  }, [analysisResult, severityFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800">
      {/* App Header */}
      <AppHeader
        onOpenSettings={() => setIsSettingsOpen(true)}
        isBackendOnline={backendState === 'online'}
        isModelReady={modelState === 'available'}
        isDemoMode={demoModeActive}
      />

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
        {/* Connection status bar */}
        <BackendStatus
          backendState={backendState}
          backendService={backendService}
          modelState={modelState}
          modelData={modelData}
          apiBaseUrl={apiBaseUrl}
          isChecking={isCheckingConnection}
          isDemoMode={demoModeActive}
          onRefresh={checkConnections}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleDemoMode={() => {
            const nextMode = !demoModeActive;
            setDemoModeActive(nextMode);
            import('./services/api').then((mod) => {
              mod.setDemoModeEnabled(nextMode);
              checkConnections();
            });
          }}
        />

        {/* PR Submission Form */}
        <RepoPrForm
          onSubmit={handleAnalyze}
          isLoading={isAnalyzing}
          initialRepoUrl={repoUrl}
          initialPrNumber={prNumber}
        />

        {/* Loading State */}
        {isAnalyzing && (
          <LoadingState repoUrl={repoUrl} prNumber={prNumber} />
        )}

        {/* Error State */}
        {!isAnalyzing && errorMessage && (
          <ErrorState
            errorMessage={errorMessage}
            onRetry={() => handleAnalyze(repoUrl, prNumber)}
            apiBaseUrl={apiBaseUrl}
          />
        )}

        {/* Analysis Results Display */}
        {!isAnalyzing && !errorMessage && analysisResult && (
          <section className="mt-10" aria-labelledby="results-heading">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2
                  id="results-heading"
                  className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight"
                >
                  Analysis Report
                </h2>
                <span className="text-xs sm:text-sm font-mono text-zinc-400 mt-0.5 block">
                  {repoUrl.replace(/^https?:\/\/github\.com\//, '')} #PR {prNumber}
                </span>
              </div>

              {/* Audit Export Menu for JSON / CSV */}
              <ExportReportMenu
                report={analysisResult}
                repoUrl={repoUrl}
                prNumber={prNumber}
              />
            </div>

            {/* Summary card with counts & severity filter */}
            <AnalysisSummary
              summary={analysisResult.summary}
              status={analysisResult.status}
              activeFilter={severityFilter}
              onFilterChange={setSeverityFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* If zero findings */}
            {analysisResult.summary.total_findings === 0 || analysisResult.findings.length === 0 ? (
              <ZeroFindingsState repoUrl={repoUrl} prNumber={prNumber} />
            ) : filteredFindings.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-400 text-sm">
                No findings match the current severity filter or search query.
              </div>
            ) : (
              <div className="space-y-5">
                {filteredFindings.map((finding, idx) => (
                  <FindingCard
                    key={finding.id || `finding-${idx}`}
                    finding={finding}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Initial Idle state when no analysis performed and no errors */}
        {!isAnalyzing && !errorMessage && !analysisResult && (
          <div className="mt-12 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md p-12 text-center shadow-lg shadow-black/20">
            <div className="max-w-md mx-auto space-y-2.5">
              <h3 className="text-base sm:text-lg font-bold text-zinc-100">
                Ready to detect documentation drift
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                Enter a public GitHub repository URL and PR number above, or select one of the quick presets to analyze.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSettingsSaved}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
