"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PriceResponse } from "@/app/api/price/[ticker]/route";
import type { Token } from "@/lib/tokens";

const CAPTION =
  "Traditional markets are closed nights and weekends. Tokenized stocks trade around the clock. During those hours the on-chain price is set by on-chain liquidity alone. This is context, not a trade signal: on most issuers only qualified, KYC-verified investors can mint or redeem, so retail cannot close this gap.";

type Row = {
  t: number;
  price: number;
  /** Lower edge of the shaded band. */
  base: number;
  /** Height of the band, stacked on `base`, so the two form the gap region. */
  band: number;
};

function usd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-md border border-border bg-card/30 px-6 text-center sm:h-[340px]">
      {children}
    </div>
  );
}

export function GapChart({ tokens }: { tokens: Token[] }) {
  const [selected, setSelected] = useState(tokens[0]?.ticker ?? "");
  const [data, setData] = useState<PriceResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setState("loading");
    setData(null);

    fetch(`/api/price/${encodeURIComponent(selected)}`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<PriceResponse>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setState("ready");
      })
      .catch(() => {
        // A failed fetch degrades this section only; the page stays intact.
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const { rows, maxGap, close } = useMemo(() => {
    const chain = data?.chain ?? [];
    const pc = data?.previousClose ?? null;
    if (chain.length === 0) return { rows: [] as Row[], maxGap: null, close: pc };

    const rows: Row[] = chain.map((p) => {
      const ref = pc ?? p.price;
      return {
        t: p.t,
        price: p.price,
        base: Math.min(p.price, ref),
        band: Math.abs(p.price - ref),
      };
    });

    let maxGap: { pct: number; abs: number; t: number } | null = null;
    if (pc) {
      for (const p of chain) {
        const abs = p.price - pc;
        if (!maxGap || Math.abs(abs) > Math.abs(maxGap.abs)) {
          maxGap = { abs, pct: (abs / pc) * 100, t: p.t };
        }
      }
    }
    return { rows, maxGap, close: pc };
  }, [data]);

  const picker = (
    <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
      <SelectTrigger
        aria-label="Select a token to chart"
        className="w-full font-mono text-[13px] sm:w-[280px]"
      >
        <SelectValue placeholder="Select a token" />
      </SelectTrigger>
      <SelectContent>
        {tokens.map((t) => (
          <SelectItem key={t.id} value={t.ticker} className="font-mono text-[13px]">
            {t.ticker} · {t.issuer}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  let body: React.ReactNode;

  if (state === "loading") {
    body = (
      <Frame>
        <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground">
          Loading price data…
        </span>
      </Frame>
    );
  } else if (state === "error" || rows.length === 0) {
    body = (
      <Frame>
        <div className="max-w-md">
          <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground">
            Price data unavailable
          </p>
          {data?.notes?.length ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              {data.notes.join(" ")}
            </p>
          ) : null}
        </div>
      </Frame>
    );
  } else {
    body = (
      <div className="rounded-md border border-border bg-card/30 p-3 pt-4 sm:p-4">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 px-1 pb-3 font-mono text-[11px] uppercase tracking-[0.08em]">
          <span className="flex items-center gap-1.5 text-chain">
            <span aria-hidden className="h-px w-4 bg-chain" />
            On-chain {data?.ticker}
          </span>
          {close != null && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                aria-hidden
                className="h-px w-4 border-t border-dashed border-muted-foreground"
              />
              {data?.referenceSymbol} close {usd(close)}
            </span>
          )}
          {maxGap && (
            <span className={maxGap.abs >= 0 ? "text-risk-low" : "text-risk-high"}>
              Max divergence {maxGap.pct >= 0 ? "+" : ""}
              {maxGap.pct.toFixed(2)}%
            </span>
          )}
        </div>

        <div className="h-[260px] w-full sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t: number) =>
                  new Date(t).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                width={58}
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: "var(--font-geist-mono)",
                }}
                labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
                formatter={(value, name) =>
                  name === "price" ? [usd(Number(value)), "On-chain"] : null
                }
              />
              {/* base + band stack to shade the region between the two lines. */}
              <Area
                dataKey="base"
                stackId="gap"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
                activeDot={false}
              />
              <Area
                dataKey="band"
                stackId="gap"
                stroke="none"
                fill="var(--primary)"
                fillOpacity={0.16}
                isAnimationActive={false}
                activeDot={false}
              />
              {close != null && (
                <ReferenceLine
                  y={close}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                />
              )}
              <Line
                dataKey="price"
                stroke="var(--chain)"
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">{picker}</div>
      {body}
      <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
        {CAPTION}
      </p>
    </div>
  );
}
