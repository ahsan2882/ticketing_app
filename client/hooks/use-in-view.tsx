"use client";

import { useEffect, useRef, useState, type Ref, type RefObject } from "react";

export function useInView(
  options?: Partial<IntersectionObserverInit>,
): [RefObject<HTMLDivElement | null>, boolean] {
  const ref: Ref<HTMLDivElement> | undefined = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref?.current;
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px", threshold: 0.01, ...options },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, options]);

  return [ref, inView];
}
