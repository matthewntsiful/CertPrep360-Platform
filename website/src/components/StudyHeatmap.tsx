import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, subDays, isSameDay } from 'date-fns';
import { Flame } from 'lucide-react';

interface HeatmapProps {
  attempts: Array<{ date: string; score?: number }>;
}

export const StudyHeatmap: React.FC<HeatmapProps> = ({ attempts }) => {
  // Generate the last 90 days
  const days = useMemo(() => {
    const today = new Date();
    const last90Days = Array.from({ length: 90 }).map((_, i) => subDays(today, 89 - i));
    return last90Days.map(date => ({
      date,
      count: attempts.filter(a => isSameDay(new Date(a.date), date)).length,
      isToday: isSameDay(date, today)
    }));
  }, [attempts]);

  // Calculate current streak (consecutive days with at least 1 attempt, going back from today)
  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const day = subDays(today, i);
      const hasAttempt = attempts.some(a => isSameDay(new Date(a.date), day));
      if (hasAttempt) count++;
      else break;
    }
    return count;
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

  const getIntensityColor = (count: number, isToday: boolean) => {
    if (count === 0) return isToday ? 'bg-slate-800 border-orange-500/50 border' : 'bg-slate-800 border-slate-700/30 border';
    if (count === 1) return 'bg-orange-500/25 border-orange-500/40 border shadow-[0_0_8px_rgba(249,115,22,0.1)]';
    if (count === 2) return 'bg-orange-500/55 border-orange-500/70 border shadow-[0_0_12px_rgba(249,115,22,0.3)]';
    return 'bg-orange-500 border-orange-400 border shadow-[0_0_16px_rgba(249,115,22,0.6)]';
  };

  return (
    <div className="p-6 md:p-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-white">
            <Flame className="w-5 h-5 text-orange-500" />
            Your Study Streak
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Past 90 Days · Daily Exam Activity</p>
        </div>
        <div className="text-right">
          <div className="flex items-end gap-1.5 justify-end">
            <div className="text-2xl font-black text-orange-500">{streak}</div>
            <div className="text-xs font-bold text-slate-500 pb-0.5">day{streak !== 1 ? 's' : ''}</div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Current Streak</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1.5 min-w-max">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1.5">
              {week.map((day) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: weekIdx * 0.015, duration: 0.2 }}
                  key={day.date.toISOString()}
                  className={`w-4 h-4 rounded-sm transition-all duration-300 hover:scale-125 cursor-help ${getIntensityColor(day.count, day.isToday)}`}
                  title={`${format(day.date, 'EEE, MMM d')}: ${day.count === 0 ? 'No activity' : `${day.count} exam${day.count === 1 ? '' : 's'}`}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          {attempts.length} total exam{attempts.length !== 1 ? 's' : ''} in the last 90 days
        </p>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-slate-500">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-700/30" title="0 exams" />
            <div className="w-3 h-3 rounded-sm bg-orange-500/25 border border-orange-500/40" title="1 exam" />
            <div className="w-3 h-3 rounded-sm bg-orange-500/55 border border-orange-500/70" title="2 exams" />
            <div className="w-3 h-3 rounded-sm bg-orange-500 border border-orange-400" title="3+ exams" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
