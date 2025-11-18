/**
 * Хук для работы с интервалами
 */

import { useEffect, useRef } from 'react';

/**
 * Хук для выполнения функции с заданным интервалом
 * @param callback - Функция для выполнения
 * @param delay - Интервал в миллисекундах (null для остановки)
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Сохраняем последний callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Устанавливаем интервал
  useEffect(() => {
    if (delay === null) {
      return;
    }

    const tick = () => {
      savedCallback.current();
    };

    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}
