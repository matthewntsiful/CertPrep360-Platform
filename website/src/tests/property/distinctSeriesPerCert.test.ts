/**
 * Property 3: Distinct trend series per certification
 *
 * For any set of trend data points containing N distinct certId values,
 * the chart data transformation SHALL produce exactly N distinct series,
 * one per certification.
 *
 * Feature: study-mode-enhancements, Property 3: Distinct trend series per certification
 *
 * **Validates: Requirements 1.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Inline the transformation logic from ScoreTrendChart component ───────────

/** Pass threshold constant series name (matches the component). */
const PASS_THRESHOLD_LABEL = 'Pass Threshold (72%)';
const PASS_THRESHOLD = 72;

interface TrendDataPoint {
  date: string;
  score: number;
  certId: string;
  examId: string;
  domainScores: Record<string, number>;
}

/**
 * Transforms raw trend data into chart-ready format.
 * Each row has a date label and one key per certification with the score value,
 * plus a constant "Pass Threshold" series at 72%.
 *
 * This is the exact logic from ScoreTrendChart.tsx's buildCertSeriesData function.
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
      [`__rawDate_${point.certId}`]: point.date,
      [`__examId_${point.certId}`]: point.examId,
    };
    row[point.certId] = point.score;
    return row;
  });

  return { rows, certIds };
}

// ── Generators ────────────────────────────────────────────────────────────────

/**
 * Generate a valid ISO timestamp within a reasonable range.
 */
const isoTimestampArb = fc.integer({
  min: new Date('2023-01-01').getTime(),
  max: new Date('2025-12-31').getTime(),
}).map((ts) => new Date(ts).toISOString());

/**
 * Generate a valid certification ID (e.g., SAA-C03, DVA-C02).
 */
const certIdArb = fc.constantFrom(
  'SAA-C03',
  'DVA-C02',
  'SOA-C02',
  'SAP-C02',
  'DOP-C02',
  'ANS-C01',
  'SCS-C02',
  'MLS-C01',
  'DEA-C01',
  'AIF-C01',
);

/**
 * Generate a valid exam ID.
 */
const examIdArb = fc.stringMatching(/^exam-[0-9]{1,4}$/);

/**
 * Generate a valid score (0-100).
 */
const scoreArb = fc.integer({ min: 0, max: 100 });

/**
 * Generate a domain scores map.
 */
const domainScoresArb = fc.dictionary(
  fc.constantFrom(
    'Design Resilient Architectures',
    'Design High-Performing Architectures',
    'Design Secure Architectures',
    'Design Cost-Optimized Architectures',
  ),
  fc.integer({ min: 0, max: 100 }),
  { minKeys: 1, maxKeys: 4 },
);

/**
 * Generate a single TrendDataPoint.
 */
const trendDataPointArb = fc.record({
  date: isoTimestampArb,
  score: scoreArb,
  certId: certIdArb,
  examId: examIdArb,
  domainScores: domainScoresArb,
});

/**
 * Generate a list of trend data points with at least 1 point.
 */
const trendDataListArb = fc.array(trendDataPointArb, { minLength: 1, maxLength: 50 });

/**
 * Generate a list of trend data points with a guaranteed number of distinct certIds.
 * This ensures we can test the exact N distinct certIds → N series property.
 */
function trendDataWithNDistinctCerts(n: number) {
  const certs = [
    'SAA-C03', 'DVA-C02', 'SOA-C02', 'SAP-C02', 'DOP-C02',
    'ANS-C01', 'SCS-C02', 'MLS-C01', 'DEA-C01', 'AIF-C01',
  ];
  const selectedCerts = certs.slice(0, n);

  return fc.array(
    fc.record({
      date: isoTimestampArb,
      score: scoreArb,
      certId: fc.constantFrom(...selectedCerts),
      examId: examIdArb,
      domainScores: domainScoresArb,
    }),
    { minLength: n, maxLength: Math.max(n * 5, 30) },
  ).filter((points) => {
    // Ensure all N certs are represented
    const uniqueCerts = new Set(points.map((p) => p.certId));
    return uniqueCerts.size === n;
  });
}

// ── Property Tests ────────────────────────────────────────────────────────────

describe('Feature: study-mode-enhancements, Property 3: Distinct trend series per certification', () => {
  it('N distinct certIds in trend data produce exactly N series in chart transformation', () => {
    fc.assert(
      fc.property(trendDataListArb, (trendData) => {
        const { certIds } = buildCertSeriesData(trendData);

        // Count distinct certIds in the input
        const inputDistinctCerts = new Set(trendData.map((d) => d.certId));

        // The transformation must produce exactly N distinct series
        expect(certIds.length).toBe(inputDistinctCerts.size);
      }),
      { numRuns: 20 },
    );
  });

  it('each distinct certId from input appears exactly once in the output series', () => {
    fc.assert(
      fc.property(trendDataListArb, (trendData) => {
        const { certIds } = buildCertSeriesData(trendData);

        const inputDistinctCerts = new Set(trendData.map((d) => d.certId));

        // Every input certId must appear in the output series
        for (const cert of inputDistinctCerts) {
          expect(certIds).toContain(cert);
        }

        // No duplicates in the output series
        const outputSet = new Set(certIds);
        expect(outputSet.size).toBe(certIds.length);
      }),
      { numRuns: 20 },
    );
  });

  it('output series contains no extra certIds beyond what is in the input', () => {
    fc.assert(
      fc.property(trendDataListArb, (trendData) => {
        const { certIds } = buildCertSeriesData(trendData);

        const inputDistinctCerts = new Set(trendData.map((d) => d.certId));

        // Every output certId must exist in the input
        for (const cert of certIds) {
          expect(inputDistinctCerts.has(cert)).toBe(true);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('with exactly 1 distinct certId, produces exactly 1 series', () => {
    fc.assert(
      fc.property(trendDataWithNDistinctCerts(1), (trendData) => {
        const { certIds } = buildCertSeriesData(trendData);
        expect(certIds.length).toBe(1);
      }),
      { numRuns: 20 },
    );
  });

  it('with exactly 3 distinct certIds, produces exactly 3 series', () => {
    fc.assert(
      fc.property(trendDataWithNDistinctCerts(3), (trendData) => {
        const { certIds } = buildCertSeriesData(trendData);
        expect(certIds.length).toBe(3);
      }),
      { numRuns: 20 },
    );
  });

  it('with exactly 5 distinct certIds, produces exactly 5 series', () => {
    fc.assert(
      fc.property(trendDataWithNDistinctCerts(5), (trendData) => {
        const { certIds } = buildCertSeriesData(trendData);
        expect(certIds.length).toBe(5);
      }),
      { numRuns: 20 },
    );
  });

  it('each row in the output contains the score for its corresponding certId', () => {
    fc.assert(
      fc.property(trendDataListArb, (trendData) => {
        const { rows } = buildCertSeriesData(trendData);

        // Each row corresponds to one input data point
        expect(rows.length).toBe(trendData.length);

        for (let i = 0; i < trendData.length; i++) {
          const point = trendData[i];
          const row = rows[i];

          // The row should have the certId key with the score value
          expect(row[point.certId]).toBe(point.score);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('pass threshold series is present in every row', () => {
    fc.assert(
      fc.property(trendDataListArb, (trendData) => {
        const { rows } = buildCertSeriesData(trendData);

        for (const row of rows) {
          expect(row[PASS_THRESHOLD_LABEL]).toBe(PASS_THRESHOLD);
        }
      }),
      { numRuns: 20 },
    );
  });
});
