import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/tokens";

const STYLES: Record<RiskLevel, string> = {
  low: "border-risk-low/40 text-risk-low bg-risk-low/10",
  medium: "border-risk-medium/40 text-risk-medium bg-risk-medium/10",
  high: "border-risk-high/45 text-risk-high bg-risk-high/10",
  unverified: "border-risk-unknown/45 text-risk-unknown bg-transparent",
};

const LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  unverified: "Not yet verified",
};

export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 py-0.5",
        "font-mono text-[11px] uppercase tracking-[0.08em]",
        STYLES[level],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          level === "low" && "bg-risk-low",
          level === "medium" && "bg-risk-medium",
          level === "high" && "bg-risk-high",
          level === "unverified" && "bg-risk-unknown",
        )}
      />
      {LABELS[level]}
    </span>
  );
}

/** Shown on any token with no source URL. Should never appear in practice. */
export function NoSourceBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-risk-high/45 bg-risk-high/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-risk-high">
      No source on file
    </span>
  );
}
