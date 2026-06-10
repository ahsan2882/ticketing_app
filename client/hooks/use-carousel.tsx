"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCarousel(count: number, interval = 5000) {
  const safeCount = Math.max(0, count);
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wrap = useCallback(
    (idx: number) =>
      safeCount === 0 ? 0 : ((idx % safeCount) + safeCount) % safeCount,
    [safeCount],
  );

  const go = useCallback(
    (idx: number) => {
      if (safeCount === 0) return;
      setActive(wrap(idx));
    },
    [safeCount, wrap],
  );

  const next = useCallback(() => {
    if (safeCount === 0) return;
    setActive((prev) => wrap(prev + 1));
  }, [safeCount, wrap]);
  const prev = useCallback(() => {
    if (safeCount === 0) return;
    setActive((prev) => wrap(prev - 1));
  }, [safeCount, wrap]);

  useEffect(() => {
    timerRef.current = setInterval(next, interval);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [next, interval]);

  const pause = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);
  const resume = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(next, interval);
  }, [next, interval]);

  return { active, go, next, prev, pause, resume };
}
