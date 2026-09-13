"use client";

import dynamic from "next/dynamic";
import type { Token } from "@/lib/tokens";

/**
 * Recharts is ~100kB and only section 3 needs it. Loading it on demand keeps
 * it out of the initial bundle, which is what mobile performance turns on.
 */
const GapChart = dynamic(
  () => import("./gap-chart").then((m) => m.GapChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[356px] items-center justify-center border border-rule sm:h-[396px]">
        <span className="font-mono text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-muted-foreground">
          Loading chart…
        </span>
      </div>
    ),
  },
);

export function GapChartLazy({ tokens }: { tokens: Token[] }) {
  return <GapChart tokens={tokens} />;
}
