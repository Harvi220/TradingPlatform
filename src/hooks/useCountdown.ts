/**
 * Хук для обратного отсчета времени
 */

import { useEffect, useState } from 'react';

/**
 * Хук для отсчета времени до следующего обновления
 * @param lastUpdate - Временная метка последнего обновления
 * @param interval - Интервал обновления в секундах
 * @returns Оставшееся время в секундах
 */
export function useCountdown(lastUpdate: number, interval: number): number {
  const [remaining, setRemaining] = useState(interval);

  useEffect(() => {
    const timer = setInterval(() => {
      const timeSinceUpdate = Math.floor((Date.now() - lastUpdate) / 1000);
      const remainingTime = interval - timeSinceUpdate;
      setRemaining(remainingTime > 0 ? remainingTime : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUpdate, interval]);

  return remaining;
}
