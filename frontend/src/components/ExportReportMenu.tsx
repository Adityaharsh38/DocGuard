import React, { useState, useRef, useEffect } from 'react';
import { Download, FileJson, FileSpreadsheet, Check, ChevronDown } from 'lucide-react';
import { AnalysisResponse } from '../types';
import {
  formatReportAsJson,
  formatFindingsAsCsv,
  getExportFilename,
  downloadFile,
} from '../utils/exportReport';

interface ExportReportMenuProps {
  report: AnalysisResponse;
  repoUrl: string;
  prNumber: number;
}

export const ExportReportMenu: React.FC<ExportReportMenuProps> = ({
  report,
  repoUrl,
  prNumber,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastExported, setLastExported] = useState<'json' | 'csv' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExportJson = () => {
    const jsonContent = formatReportAsJson(report, repoUrl, prNumber);
    const filename = getExportFilename(repoUrl, prNumber, 'json');
    downloadFile(jsonContent, filename, 'application/json');
    setLastExported('json');
    setIsOpen(false);
    setTimeout(() => setLastExported(null), 2500);
  };

  const handleExportCsv = () => {
    const csvContent = formatFindingsAsCsv(report.findings || [], repoUrl, prNumber);
    const filename = getExportFilename(repoUrl, prNumber, 'csv');
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
    setLastExported('csv');
    setIsOpen(false);
    setTimeout(() => setLastExported(null), 2500);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div className="flex items-center space-x-1">
        {/* Main Export Button */}
        <button
          type="button"
          data-testid="export-menu-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-200 hover:text-white text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer shadow-md shadow-black/20"
          aria-haspopup="true"
          aria-expanded={isOpen}
          title="Export analysis findings report for documentation audit"
        >
          {lastExported ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Download className="w-4 h-4 text-zinc-300" />
          )}
          <span>
            {lastExported === 'json'
              ? 'Exported JSON'
              : lastExported === 'csv'
              ? 'Exported CSV'
              : 'Export Audit Report'}
          </span>
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-700/80 bg-zinc-900/95 backdrop-blur-xl p-2 shadow-2xl z-30 space-y-1.5 focus:outline-none ring-1 ring-white/10"
        >
          <div className="px-3 py-1.5 text-xs font-semibold text-zinc-400 border-b border-zinc-800 pb-2 mb-1 uppercase tracking-wider">
            Choose Audit Export Format
          </div>

          {/* Export JSON Option */}
          <button
            type="button"
            role="menuitem"
            data-testid="export-json-btn"
            onClick={handleExportJson}
            className="w-full flex items-start space-x-3 px-3 py-2.5 rounded-xl text-left text-sm text-zinc-200 hover:bg-zinc-800 transition cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 group-hover:text-zinc-100 group-hover:border-zinc-700 mt-0.5 shadow-sm">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-zinc-100 block">Export as JSON</span>
              <span className="text-xs text-zinc-400 block mt-0.5 leading-normal">
                Full structured response, summary metrics & API metadata
              </span>
            </div>
          </button>

          {/* Export CSV Option */}
          <button
            type="button"
            role="menuitem"
            data-testid="export-csv-btn"
            onClick={handleExportCsv}
            className="w-full flex items-start space-x-3 px-3 py-2.5 rounded-xl text-left text-sm text-zinc-200 hover:bg-zinc-800 transition cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 group-hover:text-zinc-100 group-hover:border-zinc-700 mt-0.5 shadow-sm">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-zinc-100 block">Export as CSV</span>
              <span className="text-xs text-zinc-400 block mt-0.5 leading-normal">
                Tabular format for Excel / Google Sheets audit review
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
