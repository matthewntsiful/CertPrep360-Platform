import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, isSameDay } from 'date-fns';

interface HeatmapProps {
  attempts: Array<{ date: string; score?: number }>;
}

export const StudyHeatmap: React.FC<HeatmapProps> = ({ attempts }) => {
  // Generate the last 90 days
  const days = useMemo(() => {
    const today = new Date();
    const last90Days = Array.from({ length: 90 }).map((_, i) => subDays(today, 89 - i));
    
    // Group attempts by date
    const attemptsByDay = last90Days.map(date => {
      const dayAttempts = attempts.filter(a => isSameDay(new Date(a.date), date));
      return {
        date,
        count: dayAttempts.length,
        isToday: isSameDay(date, today)
      };
    });

    return attemptsByDay;
  }, [attempts]);

  // Split into weeks for the grid
  const weeks = useMemo(() => {
    const result: Array<Array<{ date: Date; count: number; isToday: boolean }>> = [];
    let currentWeek: Array<{ date: Date; count: number; isToday: boolean }> = [];
    
    days.forEach((day, i) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || i === days.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return result;
  }, [days]);

  // Color intensity logic based on attempts count
  const getIntensityColor = (count: number, isToday: boolean) => {
    if (count === 0) return isToday ? 'bg-slate-800 border-orange-500/50 border' : 'bg-slate-800 border-slate-700/50 border';
    if (count === 1) return 'bg-orange-500/20 border-orange-500/30 border shadow-[0_0_10px_rgba(249,115,22,0.1)]';
    if (count === 2) return 'bg-orange-500/50 border-orange-500/60 border shadow-[0_0_10px_rgba(249,115,22,0.3)]';
    return 'bg-orange-500 border-orange-400 border shadow-[0_0_15px_rgba(249,115,22,0.6)]';
  };

  return (
    <div className="p-6 md:p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            Study Consistency
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Past 90 Days</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-orange-500">
            {attempts.length}
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Total Exams</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-2 min-w-max">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-2">
              {week.map((day, dayIdx) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (weekIdx * 0.02) + (dayIdx * 0.01) }}
                  key={day.date.toISOString()}
                  className={`w-4 h-4 rounded-sm transition-all duration-300 hover:scale-125 cursor-help ${getIntensityColor(day.count, day.isToday)}`}
                  title={`${format(day.date, 'MMM d, yyyy')}: ${day.count} exam${day.count === 1 ? '' : 's'}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-[10px] uppercase tracking-widest font-bold text-slate-500">
        <span>Less</span>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-700/50" />
          <div className="w-3 h-3 rounded-sm bg-orange-500/20 border border-orange-500/30" />
          <div className="w-3 h-3 rounded-sm bg-orange-500/50 border border-orange-500/60" />
          <div className="w-3 h-3 rounded-sm bg-orange-500 border border-orange-400" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
};
