"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  INSTRUMENT_LABELS,
  isUnverified,
  redeemableLabel,
  type Token,
} from "@/lib/tokens";
import type { MintAuthority } from "@/lib/mint-authority";
import { RiskBadge } from "./risk-badge";
import { OwnershipCard } from "./ownership-card";

type SortKey = "ticker" | "company" | "issuer" | "wrapper" | "redeemable" | "risk";

const RISK_ORDER = { low: 0, medium: 1, high: 2, unverified: 3 } as const;

/** Shared grid so header and rows line up on desktop. */
const GRID =
  "sm:grid sm:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)_9rem_7rem_8.5rem_1.25rem] sm:items-center sm:gap-x-4";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "ticker", label: "Ticker" },
  { key: "company", label: "Company" },
  { key: "issuer", label: "Issuer" },
  { key: "wrapper", label: "Wrapper" },
  { key: "redeemable", label: "Redeemable" },
  { key: "risk", label: "Risk" },
];

function sortValue(token: Token, key: SortKey): string | number {
  switch (key) {
    case "ticker":
      return token.ticker.toLowerCase();
    case "company":
      return token.company.toLowerCase();
    case "issuer":
      return token.issuer.toLowerCase();
    case "wrapper":
      return INSTRUMENT_LABELS[token.instrumentType].toLowerCase();
    case "redeemable":
      // Unverified sorts last regardless of direction intent.
      return isUnverified(token.retailRedeemable) ? 2 : token.retailRedeemable ? 0 : 1;
    case "risk":
      return RISK_ORDER[token.riskLevel];
  }
}

export function TokenTable({
  tokens,
  authorities,
}: {
  tokens: Token[];
  authorities: Record<string, MintAuthority>;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "company",
    dir: 1,
  });
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...tokens].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      // Stable tiebreak so equal rows never jitter between sorts.
      return a.ticker.localeCompare(b.ticker);
    });
  }, [tokens, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 },
    );
  }

  return (
    <div className="border-y border-rule">
      {/* Header — desktop only; the mobile layout labels inline instead. */}
      <div
        className={cn(
          "hidden border-b border-rule px-3 py-2.5 sm:px-4",
          GRID,
          "sm:grid",
        )}
      >
        {COLUMNS.map((col) => {
          const active = sort.key === col.key;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => toggleSort(col.key)}
              className={cn(
                "flex items-center gap-1 whitespace-nowrap text-left font-mono text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] transition-colors duration-[var(--dur-short)]",
                "active:text-ink disabled:cursor-not-allowed disabled:opacity-55",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-ink",
              )}
            >
              {col.label}
              {active && (
                <span className="sr-only">
                  , sorted {sort.dir === 1 ? "ascending" : "descending"}
                </span>
              )}
              <span aria-hidden className={cn("text-[9px]", !active && "opacity-0")}>
                {sort.dir === 1 ? "▲" : "▼"}
              </span>
            </button>
          );
        })}
        <span />
      </div>

      <ul className="divide-y divide-rule">
        {sorted.map((token) => {
          const open = openId === token.id;
          return (
            <li key={token.id} className={cn(open && "bg-paper-2")}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : token.id)}
                aria-expanded={open}
                aria-controls={`ownership-${token.id}`}
                className={cn(
                  "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3",
                  "px-3 py-3.5 text-left transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:bg-paper-2 active:bg-paper-3 disabled:cursor-not-allowed disabled:opacity-55 sm:px-4 sm:py-3",
                  GRID,
                )}
              >
                <span className="font-mono text-[length:var(--text-sm)] tracking-wide text-primary">
                  {token.ticker}
                </span>

                <span className="col-span-2 mt-1 truncate text-[length:var(--text-sm)] text-ink sm:col-span-1 sm:mt-0">
                  {token.company}
                </span>

                <span className="col-span-2 mt-0.5 truncate text-[length:var(--text-sm)] text-muted-foreground sm:col-span-1 sm:mt-0">
                  {token.issuer}
                </span>

                <span className="col-span-2 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:mt-0 sm:contents">
                  <span className="truncate font-mono text-[length:var(--text-xs)] uppercase tracking-[0.08em] text-muted-foreground">
                    {INSTRUMENT_LABELS[token.instrumentType]}
                  </span>

                  <span
                    className={cn(
                      "font-mono text-[length:var(--text-xs)] uppercase tracking-[0.08em]",
                      isUnverified(token.retailRedeemable)
                        ? "text-muted-foreground italic"
                        : token.retailRedeemable
                          ? "text-risk-low"
                          : "text-risk-high",
                    )}
                  >
                    <span className="sm:hidden">Redeem: </span>
                    {isUnverified(token.retailRedeemable)
                      ? "Not verified"
                      : redeemableLabel(token.retailRedeemable)}
                  </span>
                </span>

                {/* Placed explicitly on mobile so the badge exists once in the
                    DOM — a duplicated cell would be announced twice. */}
                <span className="col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto sm:justify-self-auto">
                  <RiskBadge level={token.riskLevel} />
                </span>

                <span
                  aria-hidden
                  className="hidden font-mono text-[length:var(--text-sm)] text-muted-foreground sm:block"
                >
                  {open ? "−" : "+"}
                </span>
              </button>

              {open && (
                <div id={`ownership-${token.id}`}>
                  <OwnershipCard
                    token={token}
                    authority={authorities[token.mintAddress]}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
