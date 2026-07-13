"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useOnReachEnd(
  callback: () => void,
  options?: IntersectionObserverInit,
) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // Callback ref — fires every time the element mounts/unmounts,
  // not just once when the hook/component first renders.
  const ref = useCallback((el: HTMLElement | null) => {
    setNode(el);
  }, []);

  const { root, rootMargin, threshold } = options ?? {};

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) callbackRef.current();
      },
      { rootMargin: "400px", threshold: 0, root },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, root, rootMargin, threshold]);

  return ref;
}
