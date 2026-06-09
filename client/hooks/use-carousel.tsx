"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCarousel(count: number, interval = 5000) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>(setInterval(() => {}, 0));

  const go = useCallback(
    (idx: number) => {
      setActive((idx + count) % count);
    },
    [count],
  );

  const next = useCallback(() => go(active + 1), [active, go]);
  const prev = useCallback(() => go(active - 1), [active, go]);

  useEffect(() => {
    timerRef.current = setInterval(next, interval);
    return () => clearInterval(timerRef.current);
  }, [next, interval]);

  const pause = () => clearInterval(timerRef.current);
  const resume = () => {
    timerRef.current = setInterval(next, interval);
  };

  return { active, go, next, prev, pause, resume };
}
