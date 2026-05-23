import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-router-dom
const mockUseParams = vi.fn(() => ({}));
const mockUseSearchParams = vi.fn(() => [new URLSearchParams()]);
vi.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
  useSearchParams: () => mockUseSearchParams(),
}));

// Mock the API service
vi.mock('../services/api', () => ({
  fetchDynamicQuiz: vi.fn(),
  startAdaptiveQuiz: vi.fn(),
  startMultiDomainQuiz: vi.fn(),
}));

// Mock the timer hook
vi.mock('../hooks/useTimer', () => ({
  useTimer: vi.fn(),
}));

// Mock exam sub-components to keep tests focused on DynamicQuiz page logic
vi.mock('../components/exam/ExamHeader', () => ({ default: () => <div data-testid="exam-header">ExamHeader</div> }));
vi.mock('../components/exam/QuestionStrip', () => ({ default: () => <div data-testid="question-strip">QuestionStrip</div> }));
vi.mock('../components/exam/QuestionView', () => ({ default: () => <div data-testid="question-view">QuestionView</div> }));
vi.mock('../components/exam/ExamResults', () => ({ default: () => <div data-testid="exam-results">ExamResults</div> }));
vi.mock('../components/exam/ExamNavigation', () => ({ default: () => <div data-testid="exam-navigation">ExamNavigation</div> }));
vi.mock('../components/exam/PauseOverlay', () => ({ default: () => <div data-testid="pause-overlay">PauseOverlay</div> }));

// Mock RESOURCES_DATA
vi.mock('../data/resourcesData', () => ({
  RESOURCES_DATA: {
    'saa-c03': {
      certId: 'saa-c03',
      title: 'Solutions Architect Associate',
      code: 'SAA-C03',
      level: 'Associate',
      domains: [
        { name: 'Design Resilient Architectures', percent: 30 },
        { name: 'Design High-Performing Architectures', percent: 28 },
        { name: 'Design Secure Architectures', percent: 26 },
        { name: 'Design Cost-Optimized Architectures', percent: 16 },
      ],
    },
    'clf-c02': {
      certId: 'clf-c02',
      title: 'Cloud Practitioner',
      code: 'CLF-C02',
      level: 'Foundational',
      domains: [
        { name: 'Cloud Concepts', percent: 24 },
        { name: 'Security and Compliance', percent: 30 },
      ],
    },
  },
}));

// Mock the store
const mockStartDynamicQuiz = vi.fn();
const mockNextQuestion = vi.fn();
const mockPrevQuestion = vi.fn();
const mockToggleFlag = vi.fn();
const mockToggleTimer = vi.fn();

let mockStoreState = {
  status: 'idle' as string,
  currentQuestionIndex: 0,
};

vi.mock('../store/useExamStore', () => ({
  useExamStore: () => ({
    status: mockStoreState.status,
    currentQuestionIndex: mockStoreState.currentQuestionIndex,
    startDynamicQuiz: mockStartDynamicQuiz,
    nextQuestion: mockNextQuestion,
    prevQuestion: mockPrevQuestion,
    toggleFlag: mockToggleFlag,
    toggleTimer: mockToggleTimer,
  }),
}));

import DynamicQuizPage from './DynamicQuiz';
import { startAdaptiveQuiz, startMultiDomainQuiz } from '../services/api';

describe('DynamicQuiz - Adaptive Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = { status: 'idle', currentQuestionIndex: 0 };
    mockUseParams.mockReturnValue({});
    mockUseSearchParams.mockReturnValue([new URLSearchParams()]);
  });

  describe('Adaptive mode toggle', () => {
    it('renders setup page with mode selector when no domain param', () => {
      render(<DynamicQuizPage />);

      expect(screen.getByText('Dynamic Quiz')).toBeInTheDocument();
      expect(screen.getByText('Adaptive Mode')).toBeInTheDocument();
      expect(screen.getByText('Multi-Domain')).toBeInTheDocument();
      expect(screen.getByText('Single Domain')).toBeInTheDocument();
    });

    it('selects adaptive mode when Adaptive Mode button is clicked', async () => {
      const user = userEvent.setup();
      render(<DynamicQuizPage />);

      const adaptiveBtn = screen.getByText('Adaptive Mode').closest('button')!;
      await user.click(adaptiveBtn);

      // Adaptive mode button should have the active styling (orange)
      expect(adaptiveBtn).toHaveClass('bg-orange-500/10');
    });

    it('hides domain selector when adaptive mode is selected', async () => {
      const user = userEvent.setup();
      render(<DynamicQuizPage />);

      // Click adaptive mode
      const adaptiveBtn = screen.getByText('Adaptive Mode').closest('button')!;
      await user.click(adaptiveBtn);

      // Domain selector should NOT be visible in adaptive mode
      expect(screen.queryByText('Select Domain')).not.toBeInTheDocument();
      expect(screen.queryByText('Select Domains')).not.toBeInTheDocument();
    });

    it('shows start button text as "Start Adaptive Quiz" when adaptive mode is selected', async () => {
      const user = userEvent.setup();
      render(<DynamicQuizPage />);

      const adaptiveBtn = screen.getByText('Adaptive Mode').closest('button')!;
      await user.click(adaptiveBtn);

      expect(screen.getByText('Start Adaptive Quiz')).toBeInTheDocument();
    });

    it('calls startAdaptiveQuiz API when starting adaptive quiz', async () => {
      const user = userEvent.setup();
      const mockQuizResponse = {
        mode: 'adaptive',
        domains: ['Design Resilient Architectures', 'Design Secure Architectures'],
        count: 20,
        totalAvailable: 100,
        weakPoolIncluded: 3,
        questions: [
          { q_id: 'q1', text: 'Question 1', options: { A: 'a', B: 'b' }, domain: 'Design Resilient Architectures', cert_id: 'SAA-C03', exam_id: 'exam-1' },
        ],
      };
      vi.mocked(startAdaptiveQuiz).mockResolvedValue(mockQuizResponse);

      render(<DynamicQuizPage />);

      // Select adaptive mode
      const adaptiveBtn = screen.getByText('Adaptive Mode').closest('button')!;
      await user.click(adaptiveBtn);

      // Click start
      const startBtn = screen.getByText('Start Adaptive Quiz');
      await user.click(startBtn);

      await waitFor(() => {
        expect(startAdaptiveQuiz).toHaveBeenCalledWith('SAA-C03', 20);
      });
    });
  });

  describe('Multi-domain selector', () => {
    it('shows domain selector when multi-domain mode is selected', async () => {
      const user = userEvent.setup();
      render(<DynamicQuizPage />);

      const multiBtn = screen.getByText('Multi-Domain').closest('button')!;
      await user.click(multiBtn);

      expect(screen.getByText('Select Domains')).toBeInTheDocument();
    });

    it('displays available domains for the selected certification', async () => {
      const user = userEvent.setup();
      render(<DynamicQuizPage />);

      const multiBtn = screen.getByText('Multi-Domain').closest('button')!;
      await user.click(multiBtn);

      expect(screen.getByText('Design Resilient Architectures')).toBeInTheDocument();
      expect(screen.getByText('Design High-Performing Architectures')).toBeInTheDocument();
      expect(screen.getByText('Design Secure Architectures')).toBeInTheDocument();
      expect(screen.getByText('Design Cost-Optimized Architectures')).toBeInTheDocument();
    });

    it('allows selecting multiple domains', async () => {
      const user = userEvent.setup();
      render(<DynamicQuizPage />);

      const multiBtn = screen.getByText('Multi-Domain').closest('button')!;
      await user.click(multiBtn);

      // Select two domains
      const domain1 = screen.getByText('Design Resilient Architectures').closest('button')!;
      const domain2 = screen.getByText('Design Secure Architectures').closest('button')!;
      await user.click(domain1);
      await user.click(domain2);

      // Both should have active styling
      expect(domain1).toHaveClass('bg-orange-500/10');
      expect(domain2).toHaveClass('bg-orange-500/10');
    });

    it('allows deselecting a domain by clicking again', async () => {
      const user = userEvent.setup();
      render(<DynamicQuizPage />);

      const multiBtn = screen.getByText('Multi-Domain').closest('button')!;
      await user.click(multiBtn);

      const domain1 = screen.getByText('Design Resilient Architectures').closest('button')!;
      await user.click(domain1); // select
      await user.click(domain1); // deselect

      expect(domain1).not.toHaveClass('bg-orange-500/10');
    });

    it('disables start button when fewer than 2 domains selected in multi mode', async () => {
      const user = userEvent.setup();
      render(<DynamicQuizPage />);

      const multiBtn = screen.getByText('Multi-Domain').closest('button')!;
      await user.click(multiBtn);

      // Select only one domain
      const domain1 = screen.getByText('Design Resilient Architectures').closest('button')!;
      await user.click(domain1);

      const startBtn = screen.getByRole('button', { name: /start quiz/i });
      expect(startBtn).toBeDisabled();
    });

    it('enables start button when 2+ domains selected in multi mode', async () => {
      const user = userEvent.setup();
      render(<DynamicQuizPage />);

      const multiBtn = screen.getByText('Multi-Domain').closest('button')!;
      await user.click(multiBtn);

      const domain1 = screen.getByText('Design Resilient Architectures').closest('button')!;
      const domain2 = screen.getByText('Design Secure Architectures').closest('button')!;
      await user.click(domain1);
      await user.click(domain2);

      const startBtn = screen.getByText(/start quiz.*2 domains/i);
      expect(startBtn).not.toBeDisabled();
    });

    it('calls startMultiDomainQuiz API with selected domains', async () => {
      const user = userEvent.setup();
      const mockQuizResponse = {
        mode: 'multi-domain',
        domains: ['Design Resilient Architectures', 'Design Secure Architectures'],
        count: 20,
        totalAvailable: 80,
        weakPoolIncluded: 2,
        questions: [
          { q_id: 'q1', text: 'Q1', options: { A: 'a' }, domain: 'Design Resilient Architectures', cert_id: 'SAA-C03', exam_id: 'exam-1' },
        ],
      };
      vi.mocked(startMultiDomainQuiz).mockResolvedValue(mockQuizResponse);

      render(<DynamicQuizPage />);

      const multiBtn = screen.getByText('Multi-Domain').closest('button')!;
      await user.click(multiBtn);

      const domain1 = screen.getByText('Design Resilient Architectures').closest('button')!;
      const domain2 = screen.getByText('Design Secure Architectures').closest('button')!;
      await user.click(domain1);
      await user.click(domain2);

      const startBtn = screen.getByText(/start quiz.*2 domains/i);
      await user.click(startBtn);

      await waitFor(() => {
        expect(startMultiDomainQuiz).toHaveBeenCalledWith(
          ['Design Resilient Architectures', 'Design Secure Architectures'],
          'SAA-C03',
          20
        );
      });
    });

    it('shows single domain selector label in single mode', async () => {
      const user = userEvent.setup();
      render(<DynamicQuizPage />);

      const singleBtn = screen.getByText('Single Domain').closest('button')!;
      await user.click(singleBtn);

      expect(screen.getByText('Select Domain')).toBeInTheDocument();
    });
  });

  describe('Weak pool count display', () => {
    it('displays weak pool count in quiz metadata banner when running', async () => {
      mockStoreState = { status: 'running', currentQuestionIndex: 0 };
      mockUseParams.mockReturnValue({ domain: 'adaptive' });

      vi.mocked(startAdaptiveQuiz).mockResolvedValue({
        mode: 'adaptive',
        domains: ['Design Resilient Architectures', 'Design Secure Architectures'],
        count: 20,
        totalAvailable: 100,
        weakPoolIncluded: 5,
        questions: [
          { q_id: 'q1', text: 'Q1', options: { A: 'a' }, domain: 'D1', cert_id: 'SAA-C03', exam_id: 'e1' },
        ],
      });

      render(<DynamicQuizPage />);

      // After the adaptive quiz loads, the metadata banner should show weak pool count
      await waitFor(() => {
        expect(screen.getByText(/5 Weak Pool/)).toBeInTheDocument();
      });
    });

    it('displays domains in quiz metadata banner', async () => {
      mockStoreState = { status: 'running', currentQuestionIndex: 0 };
      mockUseParams.mockReturnValue({ domain: 'adaptive' });

      vi.mocked(startAdaptiveQuiz).mockResolvedValue({
        mode: 'adaptive',
        domains: ['Design Resilient Architectures', 'Design Secure Architectures'],
        count: 20,
        totalAvailable: 100,
        weakPoolIncluded: 3,
        questions: [
          { q_id: 'q1', text: 'Q1', options: { A: 'a' }, domain: 'D1', cert_id: 'SAA-C03', exam_id: 'e1' },
        ],
      });

      render(<DynamicQuizPage />);

      await waitFor(() => {
        expect(screen.getByText(/Domains:/)).toBeInTheDocument();
      });
    });

    it('displays adaptive mode badge in metadata banner', async () => {
      mockStoreState = { status: 'running', currentQuestionIndex: 0 };
      mockUseParams.mockReturnValue({ domain: 'adaptive' });

      vi.mocked(startAdaptiveQuiz).mockResolvedValue({
        mode: 'adaptive',
        domains: ['Design Resilient Architectures'],
        count: 10,
        totalAvailable: 50,
        weakPoolIncluded: 2,
        questions: [
          { q_id: 'q1', text: 'Q1', options: { A: 'a' }, domain: 'D1', cert_id: 'SAA-C03', exam_id: 'e1' },
        ],
      });

      render(<DynamicQuizPage />);

      await waitFor(() => {
        expect(screen.getByText('Adaptive')).toBeInTheDocument();
      });
    });

    it('does not show weak pool section when weakPoolIncluded is 0', async () => {
      mockStoreState = { status: 'running', currentQuestionIndex: 0 };
      mockUseParams.mockReturnValue({ domain: 'adaptive' });

      vi.mocked(startAdaptiveQuiz).mockResolvedValue({
        mode: 'adaptive',
        domains: ['Design Resilient Architectures'],
        count: 10,
        totalAvailable: 50,
        weakPoolIncluded: 0,
        questions: [
          { q_id: 'q1', text: 'Q1', options: { A: 'a' }, domain: 'D1', cert_id: 'SAA-C03', exam_id: 'e1' },
        ],
      });

      render(<DynamicQuizPage />);

      await waitFor(() => {
        expect(screen.getByText('Adaptive')).toBeInTheDocument();
      });

      // Weak Pool text should not appear when count is 0
      expect(screen.queryByText(/Weak Pool/)).not.toBeInTheDocument();
    });

    it('shows error state when adaptive quiz API fails', async () => {
      mockUseParams.mockReturnValue({ domain: 'adaptive' });

      vi.mocked(startAdaptiveQuiz).mockRejectedValue(new Error('Network error'));

      render(<DynamicQuizPage />);

      await waitFor(() => {
        expect(screen.getByText(/error fetching adaptive quiz/i)).toBeInTheDocument();
      });
    });

    it('shows error when adaptive quiz returns no questions', async () => {
      mockUseParams.mockReturnValue({ domain: 'adaptive' });

      vi.mocked(startAdaptiveQuiz).mockResolvedValue({
        mode: 'adaptive',
        domains: [],
        count: 0,
        totalAvailable: 0,
        weakPoolIncluded: 0,
        questions: [],
      });

      render(<DynamicQuizPage />);

      await waitFor(() => {
        expect(screen.getByText(/no questions available for adaptive mode/i)).toBeInTheDocument();
      });
    });
  });

  describe('Certification selector', () => {
    it('allows changing certification and resets domain selection', async () => {
      const user = userEvent.setup();
      render(<DynamicQuizPage />);

      // Switch to multi-domain mode
      const multiBtn = screen.getByText('Multi-Domain').closest('button')!;
      await user.click(multiBtn);

      // Select a domain
      const domain1 = screen.getByText('Design Resilient Architectures').closest('button')!;
      await user.click(domain1);
      expect(domain1).toHaveClass('bg-orange-500/10');

      // Change certification
      const certSelect = screen.getByDisplayValue(/SAA-C03/);
      await user.selectOptions(certSelect, 'CLF-C02');

      // Domains should now show CLF-C02 domains
      await waitFor(() => {
        expect(screen.getByText('Cloud Concepts')).toBeInTheDocument();
        expect(screen.getByText('Security and Compliance')).toBeInTheDocument();
      });

      // Previous domain selection should be cleared
      expect(screen.queryByText('Design Resilient Architectures')).not.toBeInTheDocument();
    });
  });

  describe('Question limit selector', () => {
    it('passes selected question limit to API', async () => {
      const user = userEvent.setup();
      vi.mocked(startAdaptiveQuiz).mockResolvedValue({
        mode: 'adaptive',
        domains: ['D1'],
        count: 10,
        totalAvailable: 50,
        weakPoolIncluded: 0,
        questions: [{ q_id: 'q1', text: 'Q1', options: { A: 'a' }, domain: 'D1', cert_id: 'SAA-C03', exam_id: 'e1' }],
      });

      render(<DynamicQuizPage />);

      // Select adaptive mode
      const adaptiveBtn = screen.getByText('Adaptive Mode').closest('button')!;
      await user.click(adaptiveBtn);

      // Change question limit to 10
      const limitSelect = screen.getByDisplayValue('20 Questions');
      await user.selectOptions(limitSelect, '10');

      // Start quiz
      const startBtn = screen.getByText('Start Adaptive Quiz');
      await user.click(startBtn);

      await waitFor(() => {
        expect(startAdaptiveQuiz).toHaveBeenCalledWith('SAA-C03', 10);
      });
    });
  });
});
