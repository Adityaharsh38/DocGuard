import React from 'react';
import { AnalysisSummaryData } from '../types';
import { AlertTriangle, AlertCircle, Info, Layers, Search } from 'lucide-react';

interface AnalysisSummaryProps {
  summary: AnalysisSummaryData;
  status: string;
  activeFilter: 'all' | 'high' | 'medium' | 'low';
  onFilterChange: (filter: 'all' | 'high' | 'medium' | 'low') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  summary,
  status,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 backdrop-blur-md p-5 sm:p-6 mb-7 space-y-5 shadow-md shadow-black/10">
      {/* Top row: Status & Total count metric & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-xs font-medium text-zinc-400 block">Analysis Status</span>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 uppercase mt-1 shadow-sm shadow-emerald-950/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{status || 'completed'}</span>
            </span>
          </div>
          <div className="h-9 w-px bg-zinc-800" />
          <div>
            <span className="text-xs font-medium text-zinc-400 block">Total Drift Findings</span>
            <span className="text-2xl font-extrabold font-mono text-zinc-100 tracking-tight">
              {summary.total_findings}
            </span>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search findings or files..."
            aria-label="Filter findings by text"
            className="w-full rounded-xl bg-zinc-950/90 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 border border-zinc-800 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-600/20 focus:outline-none transition duration-150 shadow-inner"
          />
        </div>
      </div>

      {/* Filter Tabs by Severity */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer border ${
            activeFilter === 'all'
              ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-md shadow-white/5'
              : 'bg-zinc-950/70 text-zinc-300 hover:text-zinc-100 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Findings</span>
          <span
            className={`font-mono text-xs px-2 py-0.5 rounded-md ${
              activeFilter === 'all' ? 'bg-zinc-300 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {summary.total_findings}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('high')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer border ${
            activeFilter === 'high'
              ? 'bg-rose-950/90 text-rose-200 border-rose-600 shadow-md shadow-rose-950/40'
              : 'bg-zinc-950/70 text-zinc-300 hover:text-zinc-100 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>High Severity</span>
          <span
            className={`font-mono text-xs px-2 py-0.5 rounded-md ${
              activeFilter === 'high' ? 'bg-rose-900 text-rose-100 font-bold' : 'bg-zinc-800 text-rose-300'
            }`}
          >
            {summary.high}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('medium')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer border ${
            activeFilter === 'medium'
              ? 'bg-amber-950/90 text-amber-200 border-amber-600 shadow-md shadow-amber-950/40'
              : 'bg-zinc-950/70 text-zinc-300 hover:text-zinc-100 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>Medium Severity</span>
          <span
            className={`font-mono text-xs px-2 py-0.5 rounded-md ${
              activeFilter === 'medium'
                ? 'bg-amber-900 text-amber-100 font-bold'
                : 'bg-zinc-800 text-amber-300'
            }`}
          >
            {summary.medium}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('low')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer border ${
            activeFilter === 'low'
              ? 'bg-sky-950/90 text-sky-200 border-sky-600 shadow-md shadow-sky-950/40'
              : 'bg-zinc-950/70 text-zinc-300 hover:text-zinc-100 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <Info className="w-4 h-4 text-sky-400" />
          <span>Low Severity</span>
          <span
            className={`font-mono text-xs px-2 py-0.5 rounded-md ${
              activeFilter === 'low' ? 'bg-sky-900 text-sky-100 font-bold' : 'bg-zinc-800 text-sky-300'
            }`}
          >
            {summary.low}
          </span>
        </button>
      </div>
    </div>
  );
};
