import { motion } from 'framer-motion';

export const Skeleton = ({ className }: { className?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className={`bg-slate-800/50 relative overflow-hidden ${className}`}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
  </motion.div>
);

export const StatCardSkeleton = () => (
  <div className="p-6 md:p-8 bg-slate-900/40 border border-slate-800/80 rounded-[2rem] space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-2xl" />
      <Skeleton className="w-24 h-4 rounded-md" />
    </div>
    <div className="space-y-2">
      <Skeleton className="w-16 h-8 rounded-lg" />
      <Skeleton className="w-full h-3 rounded-md" />
      <Skeleton className="w-2/3 h-3 rounded-md" />
    </div>
  </div>
);

export const ExamCardSkeleton = () => (
  <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2.5rem] relative overflow-hidden flex flex-col min-h-[300px]">
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="w-16 h-6 rounded-full" />
      <Skeleton className="w-8 h-8 rounded-full" />
    </div>
    <Skeleton className="w-3/4 h-6 rounded-md mb-2" />
    <Skeleton className="w-1/2 h-6 rounded-md mb-8" />
    <div className="space-y-3 mt-auto">
      <Skeleton className="w-full h-3 rounded-md" />
      <Skeleton className="w-4/5 h-3 rounded-md" />
    </div>
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800/50">
      <Skeleton className="w-20 h-4 rounded-md" />
      <Skeleton className="w-10 h-10 rounded-2xl" />
    </div>
  </div>
);

export const HistoryItemSkeleton = () => (
  <div className="p-5 md:p-6 bg-slate-900 border border-slate-800 rounded-3xl flex items-center gap-4 md:gap-6">
    <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="w-32 h-5 rounded-md" />
        <Skeleton className="w-16 h-4 rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="w-20 h-3 rounded-md" />
        <Skeleton className="w-24 h-3 rounded-md" />
      </div>
    </div>
    <Skeleton className="w-16 h-6 rounded-md shrink-0" />
  </div>
);
