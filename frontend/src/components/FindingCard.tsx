import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  Info,
  FileCode,
  FileText,
} from 'lucide-react';
import { Finding } from '../types';
import { formatConfidence, formatLineNumber, normalizeSeverity } from '../utils/validators';
import { EvidencePanel } from './EvidencePanel';

interface FindingCardProps {
  finding: Finding;
  defaultExpanded?: boolean;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const normSeverity = normalizeSeverity(finding.severity);
  const confidencePercent = formatConfidence(finding.confidence);

  // Severity styling: High (red/rose), Medium (amber), Low (sky/neutral), Unknown (zinc)
  const severityStyles = {
    high: {
      badge: 'bg-rose-950/70 text-rose-200 border-rose-700/80 shadow-rose-950/40',
      border: 'border-rose-900/50 hover:border-rose-800/80',
      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
      label: 'HIGH SEVERITY',
    },
    medium: {
      badge: 'bg-amber-950/70 text-amber-200 border-amber-700/80 shadow-amber-950/40',
      border: 'border-amber-900/50 hover:border-amber-800/80',
      icon: <AlertCircle className="w-4 h-4 text-amber-400" />,
      label: 'MEDIUM SEVERITY',
    },
    low: {
      badge: 'bg-sky-950/70 text-sky-200 border-sky-700/80 shadow-sky-950/40',
      border: 'border-sky-900/50 hover:border-sky-800/80',
      icon: <Info className="w-4 h-4 text-sky-400" />,
      label: 'LOW SEVERITY',
    },
    unknown: {
      badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
      border: 'border-zinc-800 hover:border-zinc-700',
      icon: <Info className="w-4 h-4 text-zinc-400" />,
      label: (finding.severity || 'UNKNOWN').toUpperCase(),
    },
  }[normSeverity];

  return (
    <article
      className={`rounded-2xl border bg-zinc-900/60 backdrop-blur-md p-5 sm:p-6 transition-all duration-200 shadow-md ${severityStyles.border}`}
      aria-labelledby={`finding-title-${finding.id}`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Severity Badge */}
          <span
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold tracking-wider uppercase border shadow-sm ${severityStyles.badge}`}
          >
            {severityStyles.icon}
            <span>{severityStyles.label}</span>
          </span>

          {/* Finding Type */}
          <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-zinc-800/90 border border-zinc-700/70 text-zinc-200 font-medium">
            {finding.type || 'drift_detected'}
          </span>

          {/* Finding ID */}
          <span className="font-mono text-xs text-zinc-400 font-medium">
            #{finding.id}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Confidence (only displayed when numeric 0-1) */}
          {confidencePercent !== null && (
            <span
              className="inline-flex items-center space-x-1.5 text-xs font-mono text-zinc-300 bg-zinc-950/70 px-3 py-1 rounded-lg border border-zinc-800"
              title="Model confidence score (0-1)"
            >
              <span className="text-zinc-400">confidence:</span>
              <span className="font-bold text-zinc-100">{confidencePercent}</span>
            </span>
          )}

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1.5 text-xs font-medium text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-zinc-800/80 transition cursor-pointer"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} evidence for finding ${finding.id}`}
          >
            <span className="hidden sm:inline">
              {isExpanded ? 'Hide Evidence' : 'View Evidence'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Explanation */}
      <p
        id={`finding-title-${finding.id}`}
        className="text-sm sm:text-base text-zinc-100 leading-relaxed font-normal mb-4"
      >
        {finding.explanation || 'Documentation drift detected between pull request changes and reference docs.'}
      </p>

      {/* File paths overview */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm font-mono text-zinc-400 bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-zinc-800/80 shadow-inner">
        <span className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-400 font-medium">Docs:</span>
          <span className="text-zinc-200 font-semibold">{finding.docs_file}</span>
          <span className="text-zinc-400">({formatLineNumber(finding.docs_line)})</span>
        </span>
        <span className="text-zinc-700 hidden sm:inline">|</span>
        <span className="flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-400 font-medium">Code:</span>
          <span className="text-zinc-200 font-semibold">{finding.code_file}</span>
          <span className="text-zinc-400">({formatLineNumber(finding.code_line)})</span>
        </span>
      </div>

      {/* Evidence details accordion */}
      {isExpanded && <EvidencePanel finding={finding} />}
    </article>
  );
};
