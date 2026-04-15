import { useEffect } from 'react';
import { useExamStore } from '../store/useExamStore';

export const useTimer = () => {
  const status = useExamStore((state) => state.status);
  const tick = useExamStore((state) => state.tick);

  useEffect(() => {
    let interval: any;

    if (status === 'running') {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, tick]);
};
