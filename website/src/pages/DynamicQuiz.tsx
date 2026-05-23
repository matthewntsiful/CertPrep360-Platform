import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import type { QuizMetadata } from '../store/useExamStore';
import { useTimer } from '../hooks/useTimer';
import { fetchDynamicQuiz, startAdaptiveQuiz, startMultiDomainQuiz } from '../services/api';
import { RESOURCES_DATA } from '../data/resourcesData';
import type { Question } from '../types/exam';
import type { DynamicQuizResponse } from '../types/analytics';

import ExamHeader from '../components/exam/ExamHeader';
import QuestionStrip from '../components/exam/QuestionStrip';
import QuestionView from '../components/exam/QuestionView';
import ExamResults from '../components/exam/ExamResults';
import ExamNavigation from '../components/exam/ExamNavigation';
import PauseOverlay from '../components/exam/PauseOverlay';

type QuizMode = 'setup' | 'loading' | 'running' | 'error';

const DynamicQuizPage: React.FC = () => {
  const { domain } = useParams<{ domain: string }>();
  const [searchParams] = useSearchParams();
  const { status, startDynamicQuiz, nextQuestion, prevQuestion, toggleFlag, toggleTimer, currentQuestionIndex } = useExamStore();
  const loadedRef = useRef<string>('');

  // Setup state
  const [pageMode, setPageMode] = useState<QuizMode>('loading');
  const [error, setError] = useState<string | null>(null);

  // Adaptive/multi-domain config
  const [selectedMode, setSelectedMode] = useState<'single' | 'adaptive' | 'multi'>('single');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [certId, setCertId] = useState(searchParams.get('certId') || 'SAA-C03');
  const [quizLimit, setQuizLimit] = useState(20);

  // Quiz metadata (from API response)
  const [quizMeta, setQuizMeta] = useState<{
    mode: string;
    domains: string[];
    weakPoolIncluded: number;
  } | null>(null);

  useTimer();

  // Map API response questions to the full Question type expected by the store
  function mapResponseQuestions(questions: DynamicQuizResponse['questions']): Question[] {
    return questions.map(q => ({
      ...q,
      correct: '',
      explanation: '',
      resources: [],
    }));
  }

  // Get available domains for the selected certification
  const certKey = certId.toLowerCase();
  const certData = RESOURCES_DATA[certKey];
  const availableDomains = certData?.domains?.map(d => d.name) || [];
  const availableCerts = Object.entries(RESOURCES_DATA).map(([, data]) => ({
    id: data.code,
    name: data.title,
  }));

  // Determine if we should show setup or auto-start
  useEffect(() => {
    if (!domain) {
      setPageMode('setup');
      return;
    }

    // If domain is "adaptive", auto-start adaptive mode
    if (domain === 'adaptive') {
      if (loadedRef.current === 'adaptive') return;
      loadedRef.current = 'adaptive';
      loadAdaptiveQuiz();
      return;
    }

    // If domain contains commas, it's multi-domain
    if (domain.includes(',')) {
      if (loadedRef.current === domain) return;
      loadedRef.current = domain;
      const domains = domain.split(',').map(d => decodeURIComponent(d.trim()));
      loadMultiDomainQuiz(domains);
      return;
    }

    // Single domain — existing behavior
    if (loadedRef.current === domain) return;
    loadedRef.current = domain;
    loadSingleDomainQuiz(domain);
  }, [domain]);

  async function loadAdaptiveQuiz() {
    setPageMode('loading');
    setError(null);
    try {
      const quiz: DynamicQuizResponse = await startAdaptiveQuiz(certId, quizLimit);
      if (quiz && quiz.questions && quiz.questions.length > 0) {
        const meta: QuizMetadata = {
          mode: quiz.mode,
          domains: quiz.domains,
          weakPoolIncluded: quiz.weakPoolIncluded,
        };
        setQuizMeta(meta);
        startDynamicQuiz('Adaptive', mapResponseQuestions(quiz.questions), meta);
        setPageMode('running');
      } else {
        setError('No questions available for adaptive mode. Try completing more exams first.');
        setPageMode('error');
      }
    } catch (err) {
      setError('Error fetching adaptive quiz.');
      setPageMode('error');
      console.error(err);
    }
  }

  async function loadMultiDomainQuiz(domains: string[]) {
    setPageMode('loading');
    setError(null);
    try {
      const quiz: DynamicQuizResponse = await startMultiDomainQuiz(domains, certId, quizLimit);
      if (quiz && quiz.questions && quiz.questions.length > 0) {
        const meta: QuizMetadata = {
          mode: quiz.mode,
          domains: quiz.domains,
          weakPoolIncluded: quiz.weakPoolIncluded,
        };
        setQuizMeta(meta);
        startDynamicQuiz(domains.join(', '), mapResponseQuestions(quiz.questions), meta);
        setPageMode('running');
      } else {
        setError('No questions available for the selected domains.');
        setPageMode('error');
      }
    } catch (err) {
      setError('Error fetching multi-domain quiz.');
      setPageMode('error');
      console.error(err);
    }
  }

  async function loadSingleDomainQuiz(domainName: string) {
    setPageMode('loading');
    setError(null);
    try {
      const quiz = await fetchDynamicQuiz(domainName);
      if (quiz && quiz.questions) {
        const meta: QuizMetadata | null = quiz.weakPoolIncluded != null ? {
          mode: quiz.mode || 'single-domain',
          domains: quiz.domains || [domainName],
          weakPoolIncluded: quiz.weakPoolIncluded || 0,
        } : null;
        setQuizMeta(meta);
        startDynamicQuiz(domainName, mapResponseQuestions(quiz.questions), meta ?? undefined);
        setPageMode('running');
      } else {
        setError('Failed to generate dynamic quiz or no questions available for this domain.');
        setPageMode('error');
      }
    } catch (err) {
      setError('Error fetching dynamic quiz.');
      setPageMode('error');
      console.error(err);
    }
  }

  function handleStartQuiz() {
    if (selectedMode === 'adaptive') {
      loadAdaptiveQuiz();
    } else if (selectedMode === 'multi' && selectedDomains.length > 0) {
      loadMultiDomainQuiz(selectedDomains);
    } else if (selectedMode === 'single' && selectedDomains.length === 1) {
      loadSingleDomainQuiz(selectedDomains[0]);
    }
  }

  function toggleDomain(domainName: string) {
    setSelectedDomains(prev =>
      prev.includes(domainName)
        ? prev.filter(d => d !== domainName)
        : [...prev, domainName]
    );
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes((e.target as HTMLElement).tagName)) return;
      // Allow space bar to toggle pause even when paused
      if (e.key === ' ') { e.preventDefault(); toggleTimer(); return; }
      if (status !== 'running') return;
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); nextQuestion(); break;
        case 'ArrowLeft':  e.preventDefault(); prevQuestion(); break;
        case 'f': case 'F': e.preventDefault(); toggleFlag(currentQuestionIndex); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [status, currentQuestionIndex, nextQuestion, prevQuestion, toggleFlag, toggleTimer]);

  // Completed state
  if (status === 'completed') return <ExamResults />;

  // Error state
  if (pageMode === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <p className="text-red-500 font-bold uppercase tracking-widest">{error}</p>
        <button
          onClick={() => { setPageMode('setup'); setError(null); }}
          className="px-6 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Loading state
  if (pageMode === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Generating Dynamic Quiz...</p>
      </div>
    );
  }

  // Setup mode — show mode selector and domain picker
  if (pageMode === 'setup' || (status === 'idle' && !domain)) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight">Dynamic Quiz</h1>
          <p className="text-slate-500 text-sm">Choose your quiz mode and domains</p>
        </div>

        {/* Certification Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Certification
          </label>
          <select
            value={certId}
            onChange={(e) => {
              setCertId(e.target.value);
              setSelectedDomains([]);
            }}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500/50 focus:outline-none transition-all"
          >
            {availableCerts.map(cert => (
              <option key={cert.id} value={cert.id}>{cert.id} — {cert.name}</option>
            ))}
          </select>
        </div>

        {/* Mode Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Quiz Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedMode('adaptive')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedMode === 'adaptive'
                  ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-sm font-black">Adaptive Mode</div>
              <p className="text-[10px] mt-1 opacity-70">Auto-selects your weakest domains</p>
            </button>
            <button
              onClick={() => setSelectedMode('multi')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedMode === 'multi'
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-sm font-black">Multi-Domain</div>
              <p className="text-[10px] mt-1 opacity-70">Pick specific domains to practice</p>
            </button>
            <button
              onClick={() => setSelectedMode('single')}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedMode === 'single'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-sm font-black">Single Domain</div>
              <p className="text-[10px] mt-1 opacity-70">Focus on one domain at a time</p>
            </button>
          </div>
        </div>

        {/* Domain Selector (for multi and single modes) */}
        {(selectedMode === 'multi' || selectedMode === 'single') && (
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {selectedMode === 'single' ? 'Select Domain' : 'Select Domains'}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {availableDomains.map(domainName => {
                const isSelected = selectedDomains.includes(domainName);
                return (
                  <button
                    key={domainName}
                    onClick={() => {
                      if (selectedMode === 'single') {
                        setSelectedDomains([domainName]);
                      } else {
                        toggleDomain(domainName);
                      }
                    }}
                    className={`px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-orange-500/10 border-orange-500/40 text-orange-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                        isSelected
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'border-slate-700'
                      }`}>
                        {isSelected && '✓'}
                      </span>
                      {domainName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Question Limit */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Number of Questions
          </label>
          <select
            value={quizLimit}
            onChange={(e) => setQuizLimit(Number(e.target.value))}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:border-orange-500/50 focus:outline-none transition-all"
          >
            <option value={10}>10 Questions</option>
            <option value={15}>15 Questions</option>
            <option value={20}>20 Questions</option>
            <option value={30}>30 Questions</option>
            <option value={50}>50 Questions</option>
          </select>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartQuiz}
          disabled={
            (selectedMode === 'single' && selectedDomains.length !== 1) ||
            (selectedMode === 'multi' && selectedDomains.length < 2)
          }
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all disabled:cursor-not-allowed"
        >
          {selectedMode === 'adaptive' ? 'Start Adaptive Quiz' :
           selectedMode === 'multi' ? `Start Quiz (${selectedDomains.length} domains)` :
           selectedDomains.length === 1 ? `Start Quiz — ${selectedDomains[0]}` :
           'Select a Domain'}
        </button>
      </div>
    );
  }

  // Running state — show quiz with metadata banner
  return (
    <div className="max-w-4xl mx-auto pb-32 space-y-6">
      {/* Quiz metadata banner */}
      {quizMeta && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-widest">
          <span className={`px-2 py-0.5 rounded border ${
            quizMeta.mode === 'adaptive'
              ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
              : quizMeta.mode === 'multi-domain'
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {quizMeta.mode === 'adaptive' ? 'Adaptive' :
             quizMeta.mode === 'multi-domain' ? 'Multi-Domain' : 'Single Domain'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Domains: {quizMeta.domains.join(', ')}
          </span>
          {quizMeta.weakPoolIncluded > 0 && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400">
                {quizMeta.weakPoolIncluded} Weak Pool Q&apos;s
              </span>
            </>
          )}
        </div>
      )}
      <ExamHeader />
      <QuestionStrip />
      <QuestionView />
      <ExamNavigation />
      <PauseOverlay />
    </div>
  );
};

export default DynamicQuizPage;
