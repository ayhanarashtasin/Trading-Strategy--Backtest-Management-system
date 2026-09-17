"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect whether the viewport width is below a given breakpoint.
 * Defaults to 768px (Tailwind 'md').
 * SSR-safe: defaults to false during server rendering.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const updateMatches = () => {
      setIsMobile(mql.matches);
    };

    updateMatches();
    mql.addEventListener("change", updateMatches);

    return () => {
      mql.removeEventListener("change", updateMatches);
    };
  }, [breakpoint]);

  return isMobile;
}
