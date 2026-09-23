"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a percentage up to its value once, so the eye lands on the number
 * the section exists to show. Settles on the exact figure — it never rounds
 * the destination, only the frames on the way there.
 */
export function Counter({
  value,
  decimals = 2,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  // Read once, at mount, rather than subscribing: this only decides whether
  // to animate on the way to a value it always ends on.
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(value);
  const frame = useRef<number>(undefined);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    setShown(0);
    const start = performance.now();
    const duration = 650;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Same easing curve as the reveal, so the page has one motion voice.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(value * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else setShown(value);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, reduced]);

  return (
    <span className={className}>
      {shown > 0 ? "+" : ""}
      {shown.toFixed(decimals)}%
    </span>
  );
}
