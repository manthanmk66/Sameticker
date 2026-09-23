"use client";

import { useEffect, useRef } from "react";

/**
 * One entrance, used sparingly: content lifts a few pixels as it comes into
 * view, once.
 *
 * Deliberately not a motion library. The obvious implementation — Framer's
 * `whileInView` — server-renders the hidden state, so with JavaScript blocked
 * or broken the table never appears. That is an unacceptable trade on a page
 * whose content is the product. Here the markup ships visible, and JS opts
 * into the animation on mount; the worst failure is no animation.
 *
 * Reduced motion is honoured by the global rule in globals.css, which drops
 * every transition to ~0s.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Older engines without IntersectionObserver keep the visible default.
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    el.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.dataset.reveal = "shown";
          observer.unobserve(el);
        }
      },
      { rootMargin: "-40px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ transitionDelay: delay ? `${delay}s` : undefined }}
    >
      {children}
    </div>
  );
}
