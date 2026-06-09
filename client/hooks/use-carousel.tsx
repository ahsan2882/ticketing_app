"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCarousel(count: number, interval = 5000) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback(
    (idx: number) => {
      setActive((idx + count) % count);
    },
    [count],
  );

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % count);
  }, [count]);
  const prev = useCallback(() => go(active - 1), [active, go]);

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
