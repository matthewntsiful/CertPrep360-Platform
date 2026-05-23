import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, type CustomTooltipProps } from '@tremor/react';
import { motion } from 'framer-motion';
import { TrendingUp, LineChart as LineChartIcon } from 'lucide-react';
import { fetchAnalytics } from '../services/api';
import type { TrendDataPoint } from '../types/analytics';
import { EmptyState } from './EmptyState';

/** Color palette for certification trend lines. */
const CERT_COLORS: string[] = [
  'orange',
  'blue',
  'emerald',
  'purple',
  'rose',
  'cyan',
  'amber',
  'indigo',
];

/** Pass threshold constant series name. */
const PASS_THRESHOLD_LABEL = 'Pass Threshold (72%)';
const PASS_THRESHOLD = 72;

/**
 * Transforms raw trend data into chart-ready format.
 * Each row has a date label and one key per certification with the score value,
 * plus a constant "Pass Threshold" series at 72%.
 */
function buildCertSeriesData(trendData: TrendDataPoint[]) {
  const certIds = [...new Set(trendData.map((d) => d.certId))];

  const rows = trendData.map((point) => {
    const row: Record<string, string | number> = {
      date: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      [PASS_THRESHOLD_LABEL]: PASS_THRESHOLD,
      // Metadata fields for custom tooltip (prefixed with _ to avoid chart rendering)
      [`__rawDate_${point.certId}`]: point.date,
      [`__examId_${point.certId}`]: point.examId,
    };
    row[point.certId] = point.score;
    return row;
  });

  return { rows, certIds };
}

/**
 * Transforms trend data into per-domain series for a specific certification.
 */
function buildDomainSeriesData(trendData: TrendDataPoint[], certId: string) {
  const certAttempts = trendData.filter((d) => d.certId === certId);
  const allDomains = new Set<string>();
  certAttempts.forEach((a) => {
    Object.keys(a.domainScores).forEach((d) => allDomains.add(d));
  });
  const domains = [...allDomains];

  const rows = certAttempts.map((point) => {
    const row: Record<string, string | number> = {
      date: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      [PASS_THRESHOLD_LABEL]: PASS_THRESHOLD,
    };
    domains.forEach((domain) => {
      if (point.domainScores[domain] !== undefined) {
        row[domain] = point.domainScores[domain];
      }
    });
    return row;
  });

  return { rows, domains };
}

/**
 * Custom tooltip component for the certification-level chart.
 * Shows score, certification name, exam ID, and date on hover.
 */
const CertTooltip: React.FC<CustomTooltipProps> = ({ payload, active, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  // Filter out the pass threshold line from tooltip entries
  const dataEntries = payload.filter(
    (entry) => entry.dataKey !== PASS_THRESHOLD_LABEL
  );

  if (dataEntries.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-sm space-y-2">
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
        {label}
      </p>
      {dataEntries.map((entry, i) => {
        const certId = entry.dataKey as string;
        const score = entry.value as number;
        // Try to extract metadata from the payload data
        const dataRow = entry.payload || {};
        const rawDate = dataRow[`__rawDate_${certId}`] as string | undefined;
        const examId = dataRow[`__examId_${certId}`] as string | undefined;

        return (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-white font-bold">{certId}</span>
              <span className="text-white font-black">{score}%</span>
            </div>
            {examId && (
              <span className="text-slate-500 text-xs ml-[18px]">
                Exam: {examId}
              </span>
            )}
            {rawDate && (
              <span className="text-slate-500 text-xs ml-[18px]">
                {new Date(rawDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Custom tooltip for the domain drill-down view.
 */
const DomainTooltip: React.FC<CustomTooltipProps> = ({ payload, active, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const dataEntries = payload.filter(
    (entry) => entry.dataKey !== PASS_THRESHOLD_LABEL
  );

  if (dataEntries.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-sm space-y-1.5 max-w-xs">
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
        {label}
      </p>
      {dataEntries.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-300 text-xs truncate">{entry.dataKey}</span>
          <span className="text-white font-bold text-xs ml-auto">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
};

/**
 * ScoreTrendChart — Displays score progression over time on the Dashboard.
 *
 * Features:
 * - Line chart with score % on Y-axis, attempt date on X-axis
 * - Horizontal reference line at 72% pass threshold (rendered as a constant series)
 * - Separate trend line per certification with distinct colors
 * - Custom tooltip showing score, cert name, exam ID, date on hover
 * - Certification selector dropdown to drill into per-domain lines
 * - Domain line toggle checkboxes
 * - Empty state when < 2 attempts
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3
 */
export const ScoreTrendChart: React.FC = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
  });

  const trendData = analytics?.trendData ?? [];

  // State for certification drill-down
  const [selectedCert, setSelectedCert] = useState<string | null>(null);
  // State for domain line toggles (when viewing per-domain)
  const [hiddenDomains, setHiddenDomains] = useState<Set<string>>(new Set());

  // Build certification-level series
  const { rows: certRows, certIds } = useMemo(
    () => buildCertSeriesData(trendData),
    [trendData]
  );

  // Build domain-level series for selected cert
  const { rows: domainRows, domains } = useMemo(() => {
    if (!selectedCert) return { rows: [], domains: [] };
    return buildDomainSeriesData(trendData, selectedCert);
  }, [trendData, selectedCert]);

  // Visible domains (filtered by toggle)
  const visibleDomains = useMemo(
    () => domains.filter((d) => !hiddenDomains.has(d)),
    [domains, hiddenDomains]
  );

  // Domain colors
  const domainColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    domains.forEach((d, i) => {
      map[d] = CERT_COLORS[i % CERT_COLORS.length];
    });
    return map;
  }, [domains]);

  const toggleDomain = (domain: string) => {
    setHiddenDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
        <div className="h-64 bg-slate-800/50 rounded-xl" />
      </div>
    );
  }

  // Empty state: fewer than 2 attempts
  if (trendData.length < 2) {
    return (
      <EmptyState
        icon={LineChartIcon}
        title="Not enough data for trends"
        description="Complete at least two practice exams to see your score progression over time."
        ctaLabel="Browse Certifications"
        ctaHref="/"
      />
    );
  }

  // Determine if we're in domain drill-down mode
  const isDomainView = selectedCert !== null;

  // Categories for the chart (cert lines + pass threshold)
  const certCategories = [...certIds, PASS_THRESHOLD_LABEL];
  const certColorList = [
    ...certIds.map((_, i) => CERT_COLORS[i % CERT_COLORS.length]),
    'gray', // Pass threshold line color
  ];

  // Categories for domain view
  const domainCategories = [...visibleDomains, PASS_THRESHOLD_LABEL];
  const domainColorList = [
    ...visibleDomains.map((d) => domainColorMap[d]),
    'gray',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-white">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Score Trend
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
            {isDomainView
              ? `${selectedCert} · Per-Domain Accuracy`
              : 'Overall Score Progression'}
          </p>
        </div>

        {/* Certification selector dropdown */}
        <div className="flex items-center gap-3">
          <select
            value={selectedCert ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCert(val || null);
              setHiddenDomains(new Set());
            }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer"
            aria-label="Select certification for domain drill-down"
          >
            <option value="">All Certifications</option>
            {certIds.map((certId) => (
              <option key={certId} value={certId}>
                {certId}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Domain toggle checkboxes (visible only in domain view) */}
      {isDomainView && domains.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {domains.map((domain, i) => {
            const isVisible = !hiddenDomains.has(domain);
            const colorName = CERT_COLORS[i % CERT_COLORS.length];
            return (
              <label
                key={domain}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-xs font-medium ${
                  isVisible
                    ? 'border-slate-600 bg-slate-800/80 text-white'
                    : 'border-slate-800 bg-slate-900/40 text-slate-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => toggleDomain(domain)}
                  className="sr-only"
                  aria-label={`Toggle ${domain} trend line`}
                />
                <span
                  className={`w-2.5 h-2.5 rounded-full`}
                  style={{
                    backgroundColor: isVisible
                      ? `var(--tremor-content-${colorName}, currentColor)`
                      : undefined,
                  }}
                />
                <span className="truncate max-w-[180px]">{domain}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {isDomainView ? (
        <LineChart
          className="h-72"
          data={domainRows}
          index="date"
          categories={domainCategories}
          colors={domainColorList}
          yAxisWidth={40}
          showLegend={false}
          showGridLines={false}
          curveType="monotone"
          minValue={0}
          maxValue={100}
          valueFormatter={(value: number) => `${value}%`}
          customTooltip={DomainTooltip}
        />
      ) : (
        <LineChart
          className="h-72"
          data={certRows}
          index="date"
          categories={certCategories}
          colors={certColorList}
          yAxisWidth={40}
          showLegend={certIds.length > 1}
          showGridLines={false}
          curveType="monotone"
          minValue={0}
          maxValue={100}
          valueFormatter={(value: number) => `${value}%`}
          customTooltip={CertTooltip}
        />
      )}

      {/* Pass threshold legend */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="w-6 h-0 border-t-2 border-dashed border-slate-500/60" />
        <span className="font-bold uppercase tracking-widest">72% Pass Threshold</span>
      </div>
    </motion.div>
  );
};
