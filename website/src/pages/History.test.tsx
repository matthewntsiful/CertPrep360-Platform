import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import React from 'react';

// ─── Global IntersectionObserver mock ────────────────────────────────────────
let intersectionCallback: IntersectionObserverCallback | null = null;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockUnobserve = vi.fn();

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }

  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = mockUnobserve;
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock the API service
vi.mock('../services/api', () => ({
  fetchHistory: vi.fn(),
  fetchAnalytics: vi.fn(),
}));

import { fetchHistory, fetchAnalytics } from '../services/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import History from './History';
import type { PaginatedHistoryResponse, AnalyticsResponse } from '../types/analytics';

// ─── Test helpers ────────────────────────────────────────────────────────────

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

function createMockAttempt(overrides: Partial<any> = {}) {
  return {
    id: `attempt-${Math.random().toString(36).slice(2)}`,
    examId: 'exam-1',
    certId: 'SAA-C03',
    score: 78,
    date: '2024-06-15T10:30:00Z',
    timeTaken: 45,
    passed: true,
    ...overrides,
  };
}

function createMockHistoryResponse(
  overrides: Partial<PaginatedHistoryResponse> = {}
): PaginatedHistoryResponse {
  return {
    attempts: [
      createMockAttempt({ id: 'attempt-1', score: 85, passed: true }),
      createMockAttempt({ id: 'attempt-2', score: 65, passed: false }),
      createMockAttempt({ id: 'attempt-3', score: 72, passed: true }),
    ],
    totalCount: 25,
    nextCursor: 'next-page-cursor',
    ...overrides,
  };
}

function createMockAnalyticsResponse(
  overrides: Partial<AnalyticsResponse> = {}
): AnalyticsResponse {
  return {
    examsCompleted: 25,
    averageScore: 74,
    totalStudyHours: 120,
    weakestDomain: 'Design Resilient Architectures',
    certificationsTracked: ['SAA-C03', 'CLF-C02', 'DVA-C02'],
    weakPoolCount: 12,
    trendData: [],
    recentAttempts: [],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('History Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    intersectionCallback = null;
    (fetchAnalytics as Mock).mockResolvedValue(createMockAnalyticsResponse());
    (fetchHistory as Mock).mockResolvedValue(createMockHistoryResponse());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading skeleton display', () => {
    it('shows loading skeletons while data is being fetched', () => {
      // Make fetchHistory never resolve to keep loading state
      (fetchHistory as Mock).mockReturnValue(new Promise(() => {}));

      renderWithProviders(<History />);

      // The loading skeletons use animate-pulse class
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('hides loading skeletons once data is loaded', async () => {
      renderWithProviders(<History />);

      await waitFor(() => {
        // Attempt items should be visible
        expect(screen.getAllByText('SAA-C03').length).toBeGreaterThan(0);
      });

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(0);
    });
  });

  describe('Total/filtered count display', () => {
    it('displays total attempt count from API response', async () => {
      renderWithProviders(<History />);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      expect(screen.getByText('Total Attempts')).toBeInTheDocument();
    });

    it('displays filtered count when filters are active', async () => {
      const user = userEvent.setup();

      renderWithProviders(<History />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getAllByText('SAA-C03').length).toBeGreaterThan(0);
      });

      // Apply a status filter to activate "hasActiveFilters"
      const passedBtn = screen.getByRole('button', { name: /filter by passed/i });
      await user.click(passedBtn);

      // Wait for the filtered count to appear
      await waitFor(() => {
        expect(screen.getByText('Filtered')).toBeInTheDocument();
      });
    });

    it('does not show filtered count when no filters are active', async () => {
      renderWithProviders(<History />);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      expect(screen.queryByText('Filtered')).not.toBeInTheDocument();
    });
  });

  describe('Filter/sort controls update query params', () => {
    it('renders certification filter dropdown with options from analytics', async () => {
      renderWithProviders(<History />);

      // Wait for both analytics and history data to load
      await waitFor(() => {
        const certSelect = screen.getByLabelText(
          'Filter by certification'
        ) as HTMLSelectElement;
        const options = Array.from(certSelect.options).map((o) => o.value);
        expect(options).toContain('SAA-C03');
      });

      const certSelect = screen.getByLabelText(
        'Filter by certification'
      ) as HTMLSelectElement;
      const options = Array.from(certSelect.options).map((o) => o.value);
      expect(options).toContain('CLF-C02');
      expect(options).toContain('DVA-C02');
    });

    it('calls fetchHistory with certId when certification filter changes', async () => {
      const user = userEvent.setup();

      renderWithProviders(<History />);

      // Wait for analytics to load (populates cert dropdown)
      await waitFor(() => {
        const certSelect = screen.getByLabelText(
          'Filter by certification'
        ) as HTMLSelectElement;
        expect(certSelect.options.length).toBeGreaterThan(1);
      });

      const certSelect = screen.getByLabelText('Filter by certification');
      await user.selectOptions(certSelect, 'CLF-C02');

      await waitFor(() => {
        expect(fetchHistory).toHaveBeenCalledWith(
          expect.objectContaining({ certId: 'CLF-C02' })
        );
      });
    });

    it('calls fetchHistory with status when pass/fail filter changes', async () => {
      const user = userEvent.setup();

      renderWithProviders(<History />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getAllByText('SAA-C03').length).toBeGreaterThan(0);
      });

      const failedBtn = screen.getByRole('button', { name: /filter by failed/i });
      await user.click(failedBtn);

      await waitFor(() => {
        expect(fetchHistory).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'failed' })
        );
      });
    });

    it('calls fetchHistory with sort option when sort changes', async () => {
      const user = userEvent.setup();

      renderWithProviders(<History />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getAllByText('SAA-C03').length).toBeGreaterThan(0);
      });

      const sortSelect = screen.getByLabelText('Sort attempts');
      await user.selectOptions(sortSelect, 'score_desc');

      await waitFor(() => {
        expect(fetchHistory).toHaveBeenCalledWith(
          expect.objectContaining({ sort: 'score_desc' })
        );
      });
    });

    it('resets pagination when filter changes (no cursor in new call)', async () => {
      const user = userEvent.setup();

      renderWithProviders(<History />);

      // Wait for analytics to load (populates cert dropdown)
      await waitFor(() => {
        const certSelect = screen.getByLabelText(
          'Filter by certification'
        ) as HTMLSelectElement;
        expect(certSelect.options.length).toBeGreaterThan(1);
      });

      // Change certification filter
      const certSelect = screen.getByLabelText('Filter by certification');
      await user.selectOptions(certSelect, 'DVA-C02');

      // The new query should NOT include a cursor (fresh first page)
      await waitFor(() => {
        const calls = (fetchHistory as Mock).mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.cursor).toBeUndefined();
        expect(lastCall.certId).toBe('DVA-C02');
      });
    });

    it('renders all three status filter buttons', async () => {
      renderWithProviders(<History />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /filter by all/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /filter by passed/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /filter by failed/i })
        ).toBeInTheDocument();
      });
    });

    it('renders sort options: newest, oldest, highest score, lowest score', async () => {
      renderWithProviders(<History />);

      await waitFor(() => {
        expect(screen.getByLabelText('Sort attempts')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(
        'Sort attempts'
      ) as HTMLSelectElement;
      const optionValues = Array.from(sortSelect.options).map((o) => o.value);
      expect(optionValues).toEqual([
        'newest',
        'oldest',
        'score_desc',
        'score_asc',
      ]);
    });
  });

  describe('Infinite scroll triggers fetch', () => {
    it('sets up IntersectionObserver on the sentinel element', async () => {
      renderWithProviders(<History />);

      await waitFor(() => {
        expect(screen.getAllByText('SAA-C03').length).toBeGreaterThan(0);
      });

      // Observer should have been set up
      expect(mockObserve).toHaveBeenCalled();
    });

    it('fetches next page when IntersectionObserver fires with isIntersecting', async () => {
      // First page with a next cursor
      (fetchHistory as Mock).mockResolvedValueOnce(
        createMockHistoryResponse({ nextCursor: 'cursor-page-2' })
      );

      renderWithProviders(<History />);

      // Wait for first page to load
      await waitFor(() => {
        expect(screen.getAllByText('SAA-C03').length).toBeGreaterThan(0);
      });

      // Set up the second page response
      (fetchHistory as Mock).mockResolvedValueOnce(
        createMockHistoryResponse({
          attempts: [
            createMockAttempt({ id: 'attempt-4', score: 90, passed: true }),
          ],
          nextCursor: null,
          totalCount: 25,
        })
      );

      // Simulate intersection (scroll to bottom)
      if (intersectionCallback) {
        intersectionCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          new MockIntersectionObserver(() => {})
        );
      }

      // Verify fetchHistory was called again with the cursor
      await waitFor(() => {
        expect(fetchHistory).toHaveBeenCalledWith(
          expect.objectContaining({ cursor: 'cursor-page-2' })
        );
      });
    });

    it('does not fetch next page when sentinel is not intersecting', async () => {
      (fetchHistory as Mock).mockResolvedValue(
        createMockHistoryResponse({ nextCursor: 'cursor-page-2' })
      );

      renderWithProviders(<History />);

      await waitFor(() => {
        expect(screen.getAllByText('SAA-C03').length).toBeGreaterThan(0);
      });

      const callCountAfterFirstLoad = (fetchHistory as Mock).mock.calls.length;

      // Simulate NOT intersecting
      if (intersectionCallback) {
        intersectionCallback(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          new MockIntersectionObserver(() => {})
        );
      }

      // fetchHistory should NOT have been called again
      expect((fetchHistory as Mock).mock.calls.length).toBe(
        callCountAfterFirstLoad
      );
    });

    it('shows end-of-list message when all pages are loaded', async () => {
      (fetchHistory as Mock).mockResolvedValue(
        createMockHistoryResponse({ nextCursor: null, totalCount: 3 })
      );

      renderWithProviders(<History />);

      await waitFor(() => {
        expect(screen.getByText('All 3 attempts loaded')).toBeInTheDocument();
      });
    });

    it('shows loading indicator when fetching next page', async () => {
      // First page loads with a next cursor
      (fetchHistory as Mock).mockResolvedValueOnce(
        createMockHistoryResponse({ nextCursor: 'cursor-page-2' })
      );

      renderWithProviders(<History />);

      await waitFor(() => {
        expect(screen.getAllByText('SAA-C03').length).toBeGreaterThan(0);
      });

      // Make the next page fetch hang to show loading state
      (fetchHistory as Mock).mockReturnValueOnce(new Promise(() => {}));

      // Trigger intersection
      if (intersectionCallback) {
        intersectionCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          new MockIntersectionObserver(() => {})
        );
      }

      await waitFor(() => {
        expect(
          screen.getByText('Loading more attempts...')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error and empty states', () => {
    it('shows error state with retry button when fetch fails', async () => {
      (fetchHistory as Mock).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<History />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load history')).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('shows empty state when no attempts exist', async () => {
      (fetchHistory as Mock).mockResolvedValue(
        createMockHistoryResponse({
          attempts: [],
          totalCount: 0,
          nextCursor: null,
        })
      );

      renderWithProviders(<History />);

      await waitFor(() => {
        expect(screen.getByText('No attempts found')).toBeInTheDocument();
      });
    });

    it('shows "No matching attempts" when filters return empty', async () => {
      const user = userEvent.setup();

      // First load with data
      (fetchHistory as Mock).mockResolvedValueOnce(createMockHistoryResponse());

      renderWithProviders(<History />);

      await waitFor(() => {
        expect(screen.getAllByText('SAA-C03').length).toBeGreaterThan(0);
      });

      // Apply a filter that returns empty
      (fetchHistory as Mock).mockResolvedValue(
        createMockHistoryResponse({
          attempts: [],
          totalCount: 25,
          nextCursor: null,
        })
      );

      const failedBtn = screen.getByRole('button', { name: /filter by failed/i });
      await user.click(failedBtn);

      await waitFor(() => {
        expect(screen.getByText('No matching attempts')).toBeInTheDocument();
      });
    });
  });
});
