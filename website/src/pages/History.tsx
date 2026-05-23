import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  History as HistoryIcon,
  ChevronLeft,
  Calendar,
  Clock,
  Target,
  Award,
  Filter,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchHistory, fetchAnalytics } from '../services/api';
import type { HistoryParams, AttemptSummary } from '../types/analytics';

const formatFullDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type StatusFilter = 'all' | 'passed' | 'failed';
type SortOption = 'newest' | 'oldest' | 'score_desc' | 'score_asc';

const sortLabels: Record<SortOption, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  score_desc: 'Highest Score',
  score_asc: 'Lowest Score',
};

const HistoryItemSkeleton = () => (
  <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] animate-pulse flex items-center gap-6">
    <div className="w-20 h-20 rounded-3xl bg-slate-800" />
    <div className="flex-1 space-y-3">
      <div className="h-5 w-40 bg-slate-800 rounded" />
      <div className="h-4 w-64 bg-slate-800/60 rounded" />
    </div>
    <div className="h-10 w-28 bg-slate-800 rounded-xl" />
  </div>
);

const History: React.FC = () => {
  const navigate = useNavigate();

  // Filter and sort state
  const [certFilter, setCertFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Fetch analytics to get the list of certifications the user has attempted
  const { data: analyticsData } = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
  });

  const certifications = analyticsData?.certificationsTracked ?? [];

  // Build query params from filter/sort state
  const historyParams: Omit<HistoryParams, 'cursor'> = {
    pageSize: 20,
    ...(certFilter && { certId: certFilter }),
    ...(statusFilter !== 'all' && { status: statusFilter }),
    sort: sortOption,
  };

  // Infinite query for paginated history
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['history', historyParams],
    queryFn: ({ pageParam }) =>
      fetchHistory({ ...historyParams, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Flatten all pages into a single attempts array
  const attempts: AttemptSummary[] =
    data?.pages.flatMap((page) => page.attempts) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;
  const filteredCount = attempts.length;
  const hasActiveFilters = certFilter !== '' || statusFilter !== 'all';

  // Infinite scroll: observe a sentinel element at the bottom
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (node) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          },
          { threshold: 0.1 }
        );
        observerRef.current.observe(node);
      }
      sentinelRef.current = node;
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center">
              <HistoryIcon className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">
                Attempt History
              </h1>
              <p className="text-slate-500">
                Review your past performances and track progress.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-5 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-center">
            <div className="text-lg font-black text-white">{totalCount}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Total Attempts
            </div>
          </div>
          {hasActiveFilters && (
            <div className="px-5 py-3 bg-slate-900 border border-orange-500/20 rounded-2xl text-center">
              <div className="text-lg font-black text-orange-500">
                {filteredCount}
                {hasNextPage && '+'}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Filtered
              </div>
            </div>
          )}
          <div className="px-5 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-center">
            <div className="text-lg font-black text-emerald-500">
              {attempts.length > 0
                ? `${Math.round(
                    (attempts.filter((a) => a.passed).length / attempts.length) *
                      100
                  )}%`
                : '—'}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Pass Rate
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
        {/* Certification Filter */}
        <div className="flex items-center gap-2 flex-1">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={certFilter}
            onChange={(e) => setCertFilter(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer"
            aria-label="Filter by certification"
          >
            <option value="">All Certifications</option>
            {certifications.map((cert) => (
              <option key={cert} value={cert}>
                {cert}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
          {(['all', 'passed', 'failed'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                statusFilter === status
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              aria-label={`Filter by ${status}`}
            >
              {status === 'all' ? 'All' : status === 'passed' ? 'Passed' : 'Failed'}
            </button>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer"
            aria-label="Sort attempts"
          >
            {(Object.entries(sortLabels) as [SortOption, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <HistoryItemSkeleton key={i} />
          ))
        ) : isError ? (
          <div className="p-20 bg-slate-900/20 border border-red-500/20 border-dashed rounded-[3rem] text-center space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">
                Failed to load history
              </h3>
              <p className="text-slate-500">
                Something went wrong while fetching your attempt history.
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-block px-8 py-4 bg-white text-slate-950 font-black rounded-2xl hover:scale-105 transition-transform"
            >
              Retry
            </button>
          </div>
        ) : attempts.length === 0 ? (
          <div className="p-20 bg-slate-900/20 border border-slate-800 border-dashed rounded-[3rem] text-center space-y-4">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
              <Award className="w-8 h-8 text-slate-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">
                {hasActiveFilters
                  ? 'No matching attempts'
                  : 'No attempts found'}
              </h3>
              <p className="text-slate-500">
                {hasActiveFilters
                  ? 'Try adjusting your filters to see more results.'
                  : 'Your exam history will appear here once you complete a test.'}
              </p>
            </div>
            {!hasActiveFilters && (
              <Link
                to="/#certifications"
                className="inline-block px-8 py-4 bg-white text-slate-950 font-black rounded-2xl hover:scale-105 transition-transform"
              >
                Start Your First Exam
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt, i) => {
              const passed = attempt.passed;
              return (
                <motion.div
                  key={attempt.id || i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]" />
                  <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 transition-all group-hover:border-slate-700">
                    <div className="flex items-center gap-6">
                      <div
                        className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center border-2 font-black transition-all ${
                          passed
                            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500 group-hover:border-emerald-500/40'
                            : 'border-red-500/20 bg-red-500/5 text-red-500 group-hover:border-red-500/40'
                        }`}
                      >
                        <span className="text-2xl">{attempt.score}%</span>
                        <span className="text-[8px] uppercase tracking-widest mt-1 opacity-60">
                          Score
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xl font-black text-white">
                            {attempt.certId.toUpperCase()}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                              passed
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatFullDate(attempt.date)}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <Clock className="w-4 h-4" />
                            <span>Exam ID: {attempt.examId}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                      <Link
                        to={`/certification/${attempt.certId.toLowerCase()}`}
                        className="flex-1 sm:flex-none text-center px-6 py-3 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors uppercase tracking-widest"
                      >
                        Retake Exam
                      </Link>
                      <Link
                        to={`/results/${attempt.id}`}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-950 text-xs font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform uppercase tracking-widest shadow-xl shadow-white/5"
                      >
                        <Target className="w-4 h-4" /> Review Results
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelCallback} className="h-4" />

            {/* Loading indicator for next page */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                <span className="text-sm text-slate-500 font-medium">
                  Loading more attempts...
                </span>
              </div>
            )}

            {/* End of list indicator */}
            {!hasNextPage && attempts.length > 0 && (
              <div className="text-center py-6">
                <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">
                  All {totalCount} attempts loaded
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
