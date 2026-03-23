/**
 * Matches Tailwind `lg` (min-width: 1024px). SSR-safe: false until mounted.
 */
import { useEffect, useState } from "react";

const LG_MIN_PX = 1024;

export function useIsLgBreakpoint(): boolean {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${LG_MIN_PX}px)`);
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isLg;
}
