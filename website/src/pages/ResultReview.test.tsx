import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResultReview from './ResultReview';
import type { AttemptDetailResponse } from '../types/analytics';

// Mock the API module
vi.mock('../services/api', () => ({
  fetchAttemptDetail: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileHover, whileTap, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    circle: (props: any) => <circle {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { fetchAttemptDetail } from '../services/api';

const mockedFetchAttemptDetail = vi.mocked(fetchAttemptDetail);

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function renderWithProviders(attemptId = 'test-attempt-123') {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/review/${attemptId}`]}>
        <Routes>
          <Route path="/review/:attemptId" element={<ResultReview />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const mockAttemptWithSnapshots: AttemptDetailResponse = {
  id: 'test-attempt-123',
  examId: 'exam-1',
  certId: 'SAA-C03',
  score: 78,
  date: '2024-06-15T10:30:00Z',
  timeTaken: 45,
  passed: true,
  domainScores: {
    'Design Resilient Architectures': 85,
    'Security': 70,
    'Cost Optimization': 80,
  },
  answers: {
    '0': { q_id: 'q1', domain: 'Design Resilient Architectures', selected: 'A', isCorrect: true },
    '1': { q_id: 'q2', domain: 'Security', selected: 'B', isCorrect: false },
    '2': { q_id: 'q3', domain: 'Cost Optimization', selected: null, isCorrect: false },
    '3': { q_id: 'q4', domain: 'Security', selected: 'C', isCorrect: true },
  },
  questionSnapshots: [
    {
      q_id: 'q1',
      text: 'Which AWS service provides a managed relational database?',
      options: { A: 'Amazon RDS', B: 'Amazon S3', C: 'Amazon EC2', D: 'AWS Lambda' },
      correct: 'A',
      explanation: 'Amazon RDS is a managed relational database service.',
      domain: 'Design Resilient Architectures',
    },
    {
      q_id: 'q2',
      text: 'Which service is used for identity management?',
      options: { A: 'Amazon S3', B: 'Amazon EC2', C: 'AWS IAM', D: 'Amazon VPC' },
      correct: 'C',
      explanation: 'AWS IAM provides identity and access management.',
      domain: 'Security',
    },
    {
      q_id: 'q3',
      text: 'Which pricing model offers the highest discount?',
      options: { A: 'On-Demand', B: 'Reserved', C: 'Spot', D: 'Savings Plans' },
      correct: 'C',
      explanation: 'Spot instances offer up to 90% discount.',
      domain: 'Cost Optimization',
    },
    {
      q_id: 'q4',
      text: 'Which service encrypts data at rest by default?',
      options: { A: 'Amazon EC2', B: 'Amazon S3', C: 'AWS KMS', D: 'Amazon RDS' },
      correct: 'C',
      explanation: 'AWS KMS manages encryption keys for data at rest.',
      domain: 'Security',
    },
  ],
};

const mockLegacyAttempt: AttemptDetailResponse = {
  id: 'legacy-attempt-456',
  examId: 'exam-2',
  certId: 'SAA-C03',
  score: 65,
  date: '2024-01-10T08:00:00Z',
  timeTaken: 50,
  passed: false,
  domainScores: {},
  answers: {
    '0': { q_id: 'q10', domain: 'Design Resilient Architectures', selected: 'B', isCorrect: true },
    '1': { q_id: 'q11', domain: 'Security', selected: 'A', isCorrect: false },
    '2': { q_id: 'q12', domain: 'Cost Optimization', selected: null, isCorrect: false },
  },
  // No questionSnapshots — legacy attempt
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ResultReview Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Snapshot rendering with mock data (Requirement 3.4)', () => {
    it('renders question text from snapshots', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Which AWS service provides a managed relational database?')).toBeInTheDocument();
      });
      expect(screen.getByText('Which service is used for identity management?')).toBeInTheDocument();
      expect(screen.getByText('Which pricing model offers the highest discount?')).toBeInTheDocument();
      expect(screen.getByText('Which service encrypts data at rest by default?')).toBeInTheDocument();
    });

    it('displays score and pass/fail status', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('78%')).toBeInTheDocument();
      });
      expect(screen.getByText('Passed')).toBeInTheDocument();
    });

    it('shows correct/incorrect/skipped indicators per question', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        // Q1 correct, Q2 incorrect, Q3 skipped, Q4 correct
        const correctLabels = screen.getAllByText('Correct');
        const incorrectLabels = screen.getAllByText('Incorrect');
        const skippedLabels = screen.getAllByText('Skipped');
        expect(correctLabels.length).toBe(2);
        expect(incorrectLabels.length).toBe(1);
        expect(skippedLabels.length).toBe(1);
      });
    });

    it('reveals answer options and explanation when toggle is clicked', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Which AWS service provides a managed relational database?')).toBeInTheDocument();
      });

      // Find the first "Reveal Answer" button and click it
      const revealButtons = screen.getAllByText('Reveal Answer');
      fireEvent.click(revealButtons[0]);

      // After reveal, options should be visible
      await waitFor(() => {
        expect(screen.getByText('Amazon RDS')).toBeInTheDocument();
        expect(screen.getByText('Amazon S3')).toBeInTheDocument();
        expect(screen.getByText('Amazon EC2')).toBeInTheDocument();
        expect(screen.getByText('AWS Lambda')).toBeInTheDocument();
      });

      // Explanation should be visible
      expect(screen.getByText('Amazon RDS is a managed relational database service.')).toBeInTheDocument();
    });

    it('highlights correct option in green and incorrect selection in red', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Which service is used for identity management?')).toBeInTheDocument();
      });

      // Reveal Q2 (incorrect answer: user selected B, correct is C)
      const revealButtons = screen.getAllByText('Reveal Answer');
      fireEvent.click(revealButtons[1]);

      await waitFor(() => {
        // The correct option C should have emerald/green styling
        const optionC = screen.getByText('AWS IAM').closest('div[class*="rounded-xl"]');
        expect(optionC).toHaveClass('border-emerald-500/50');

        // The user's incorrect selection B should have red styling
        const optionB = screen.getByText('Amazon EC2').closest('div[class*="rounded-xl"]');
        expect(optionB).toHaveClass('border-red-500/50');
      });
    });
  });

  describe('Graceful fallback for legacy attempts (Requirement 3.5)', () => {
    it('renders legacy attempt without errors when no snapshots exist', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockLegacyAttempt);
      renderWithProviders('legacy-attempt-456');

      await waitFor(() => {
        expect(screen.getByText('65%')).toBeInTheDocument();
      });
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('shows minimal answer data for legacy attempts', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockLegacyAttempt);
      renderWithProviders('legacy-attempt-456');

      await waitFor(() => {
        // Legacy fallback shows "Option B" for the user's selection
        expect(screen.getByText('Option B')).toBeInTheDocument();
      });
      // Skipped question shows "No Answer"
      expect(screen.getByText('Option No Answer')).toBeInTheDocument();
    });

    it('does not show reveal buttons for legacy attempts without snapshots', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockLegacyAttempt);
      renderWithProviders('legacy-attempt-456');

      await waitFor(() => {
        expect(screen.getByText('65%')).toBeInTheDocument();
      });

      expect(screen.queryByText('Reveal Answer')).not.toBeInTheDocument();
    });

    it('shows "snapshot data unavailable" message for incorrect legacy answers', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockLegacyAttempt);
      renderWithProviders('legacy-attempt-456');

      await waitFor(() => {
        expect(screen.getByText(/snapshot data unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard navigation between questions (Requirement 4.4)', () => {
    it('moves focus to next question on ArrowRight key', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Which AWS service provides a managed relational database?')).toBeInTheDocument();
      });

      // Initially Q1 should be focused (has orange border ring)
      const q1Card = screen.getByText('Which AWS service provides a managed relational database?')
        .closest('div[class*="rounded-"]');
      expect(q1Card?.className).toContain('border-orange-500/50');

      // Press ArrowRight to move to Q2
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        const q2Card = screen.getByText('Which service is used for identity management?')
          .closest('div[class*="bg-slate-900"]');
        expect(q2Card?.className).toContain('border-orange-500/50');
      });
    });

    it('moves focus to previous question on ArrowLeft key', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Which AWS service provides a managed relational database?')).toBeInTheDocument();
      });

      // Move forward then back
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        const q1Card = screen.getByText('Which AWS service provides a managed relational database?')
          .closest('div[class*="bg-slate-900"]');
        expect(q1Card?.className).toContain('border-orange-500/50');
      });
    });

    it('does not go below index 0 on ArrowLeft at first question', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Which AWS service provides a managed relational database?')).toBeInTheDocument();
      });

      // Press ArrowLeft at the beginning — should stay at index 0
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      // Q1 should still be focused
      const q1Card = screen.getByText('Which AWS service provides a managed relational database?')
        .closest('div[class*="bg-slate-900"]');
      expect(q1Card?.className).toContain('border-orange-500/50');
    });

    it('does not exceed last question index on ArrowRight', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Which AWS service provides a managed relational database?')).toBeInTheDocument();
      });

      // Press ArrowRight 10 times (more than 4 questions)
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(window, { key: 'ArrowRight' });
      }

      // Should show "4 / 4" in the navigation counter
      await waitFor(() => {
        expect(screen.getByText('4 / 4')).toBeInTheDocument();
      });
    });

    it('displays navigation counter showing current position', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('1 / 4')).toBeInTheDocument();
      });

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByText('2 / 4')).toBeInTheDocument();
      });
    });
  });

  describe('Filter tab switching (Requirement 4.1)', () => {
    it('shows all questions by default', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('All (4)')).toBeInTheDocument();
      });
      expect(screen.getByText('Correct (2)')).toBeInTheDocument();
      expect(screen.getByText('Incorrect (1)')).toBeInTheDocument();
      expect(screen.getByText('Skipped (1)')).toBeInTheDocument();
    });

    it('filters to only correct questions when Correct tab is clicked', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Correct (2)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Correct (2)'));

      await waitFor(() => {
        // Should show only the 2 correct questions
        expect(screen.getByText('Which AWS service provides a managed relational database?')).toBeInTheDocument();
        expect(screen.getByText('Which service encrypts data at rest by default?')).toBeInTheDocument();
        // Incorrect and skipped questions should not be visible
        expect(screen.queryByText('Which service is used for identity management?')).not.toBeInTheDocument();
        expect(screen.queryByText('Which pricing model offers the highest discount?')).not.toBeInTheDocument();
      });
    });

    it('filters to only incorrect questions when Incorrect tab is clicked', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Incorrect (1)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Incorrect (1)'));

      await waitFor(() => {
        // Only Q2 (incorrect, not skipped)
        expect(screen.getByText('Which service is used for identity management?')).toBeInTheDocument();
        expect(screen.queryByText('Which AWS service provides a managed relational database?')).not.toBeInTheDocument();
        expect(screen.queryByText('Which pricing model offers the highest discount?')).not.toBeInTheDocument();
      });
    });

    it('filters to only skipped questions when Skipped tab is clicked', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Skipped (1)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Skipped (1)'));

      await waitFor(() => {
        // Only Q3 (skipped — selected is null)
        expect(screen.getByText('Which pricing model offers the highest discount?')).toBeInTheDocument();
        expect(screen.queryByText('Which AWS service provides a managed relational database?')).not.toBeInTheDocument();
        expect(screen.queryByText('Which service is used for identity management?')).not.toBeInTheDocument();
      });
    });

    it('resets focused index when switching filters', async () => {
      mockedFetchAttemptDetail.mockResolvedValue(mockAttemptWithSnapshots);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('1 / 4')).toBeInTheDocument();
      });

      // Move to question 3
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByText('3 / 4')).toBeInTheDocument();
      });

      // Switch to Correct filter — should reset to 1/2
      fireEvent.click(screen.getByText('Correct (2)'));

      await waitFor(() => {
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
      });
    });

    it('shows empty state when filter has no matching questions', async () => {
      // Create an attempt with all correct answers (no incorrect or skipped)
      const allCorrectAttempt: AttemptDetailResponse = {
        ...mockAttemptWithSnapshots,
        answers: {
          '0': { q_id: 'q1', domain: 'Design Resilient Architectures', selected: 'A', isCorrect: true },
          '1': { q_id: 'q2', domain: 'Security', selected: 'C', isCorrect: true },
        },
        questionSnapshots: mockAttemptWithSnapshots.questionSnapshots!.slice(0, 2),
      };
      mockedFetchAttemptDetail.mockResolvedValue(allCorrectAttempt);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Incorrect (0)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Incorrect (0)'));

      await waitFor(() => {
        expect(screen.getByText('No questions match this filter.')).toBeInTheDocument();
      });
    });
  });
});
