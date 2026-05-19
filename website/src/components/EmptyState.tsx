import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center p-12 rounded-[2.5rem] border border-dashed border-slate-800 bg-slate-900/20 ${className}`}
    >
      <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-slate-500" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed max-w-sm">{description}</p>
      {ctaLabel && ctaHref && (
        <button
          onClick={() => navigate(ctaHref)}
          className="mt-6 px-6 py-3 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
        >
          {ctaLabel}
        </button>
      )}
    </motion.div>
  );
};
