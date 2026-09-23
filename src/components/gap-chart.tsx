"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  ComposedChart,
  ReferenceArea,
  Line,
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
import { Counter } from "./counter";

const CAPTION =
  "Traditional markets are closed nights and weekends. Tokenized stocks trade around the clock. During those hours the on-chain price is set by on-chain liquidity alone. This is context, not a trade signal: on most issuers only qualified, KYC-verified investors can mint or redeem, so retail cannot close this gap.";

type Row = {
  t: number;
  price: number;
  /** The underlying at the same instant, where the market had set a price. */
  ref?: number;
  /** [ref, price] — Recharts renders a tuple as a band between the two. */
  band?: [number, number];
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
    <div className="flex h-[300px] items-center justify-center border border-rule px-6 text-center sm:h-[340px]">
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

  const { rows, maxGap, close, yDomain, dayTicks } = useMemo(() => {
    const chain = data?.chain ?? [];
    const pc = data?.previousClose ?? null;
    if (chain.length === 0) {
      return {
        rows: [] as Row[],
        maxGap: null,
        close: pc,
        yDomain: [0, 1] as [number, number],
        dayTicks: [] as number[],
      };
    }

    const refAt = new Map((data?.reference ?? []).map((r) => [r.t, r.price]));
    const rows: Row[] = chain.map((p) => {
      const ref = refAt.get(p.t);
      return ref === undefined
        ? { t: p.t, price: p.price }
        : { t: p.t, price: p.price, ref, band: [ref, p.price] as [number, number] };
    });

    // Measured point against contemporaneous point. Comparing every print to
    // one closing price would report the underlying's own weekly move as if it
    // were a wrapper dislocation.
    let maxGap: { pct: number; abs: number; t: number } | null = null;
    for (const r of rows) {
      if (r.ref === undefined) continue;
      const abs = r.price - r.ref;
      if (!maxGap || Math.abs(abs) > Math.abs(maxGap.abs)) {
        maxGap = { abs, pct: (abs / r.ref) * 100, t: r.t };
      }
    }
    // The axis is zoomed to the data: anchoring it at zero would flatten a
    // few percent of divergence into a flat line.
    const values = chain.map((p) => p.price);
    for (const r of rows) if (r.ref !== undefined) values.push(r.ref);
    if (pc) values.push(pc);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = (hi - lo || hi * 0.01) * 0.18;
    const yDomain: [number, number] = [lo - pad, hi + pad];

    // One tick per calendar day: the point of this chart is which side of a
    // market close you are on, so day boundaries are the meaningful gridlines.
    const dayTicks: number[] = [];
    const cursor = new Date(chain[0].t);
    cursor.setHours(0, 0, 0, 0);
    for (
      let d = cursor.getTime();
      d <= chain[chain.length - 1].t;
      d += 24 * 60 * 60 * 1000
    ) {
      if (d >= chain[0].t) dayTicks.push(d);
    }

    return { rows, maxGap, close: pc, yDomain, dayTicks };
  }, [data]);

  const picker = (
    <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
      <SelectTrigger
        aria-label="Select a token to chart"
        className="w-full font-mono text-[length:var(--text-sm)] sm:w-[300px]"
      >
        <SelectValue placeholder="Select a token" />
      </SelectTrigger>
      <SelectContent>
        {tokens.map((t) => (
          <SelectItem key={t.id} value={t.ticker} className="font-mono text-[length:var(--text-sm)]">
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
      <div className="border border-rule p-3 pt-4 sm:p-4">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 px-1 pb-3 font-mono text-[11px] uppercase tracking-[0.08em]">
          <span className="flex items-center gap-1.5 text-primary">
            <span aria-hidden className="h-px w-4 bg-primary" />
            On-chain {data?.ticker}
          </span>
          {(data?.reference?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                aria-hidden
                className="h-px w-4 border-t border-dashed border-muted-foreground"
              />
              {data?.referenceSymbol} underlying
              {close != null && <> · last close {usd(close)}</>}
            </span>
          )}
          {(data?.openWindows?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span aria-hidden className="h-2.5 w-4 bg-paper-3" />
              US market open
            </span>
          )}
          {close == null && (data?.notes?.length ?? 0) > 0 && (
            <span className="normal-case tracking-normal text-muted-foreground">
              {data?.notes[0]}
            </span>
          )}
          {maxGap && (
            <span className={maxGap.abs >= 0 ? "text-risk-low" : "text-risk-high"}>
              Max divergence <Counter value={maxGap.pct} />
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
                ticks={dayTicks}
                tickFormatter={(t: number) =>
                  new Date(t).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                stroke="var(--color-muted)"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                domain={yDomain}
                allowDataOverflow={false}
                width={58}
                stroke="var(--color-muted)"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  `$${v.toLocaleString("en-US", { maximumFractionDigits: v < 100 ? 1 : 0 })}`
                }
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-paper-2)",
                  border: "1px solid var(--color-rule)",
                  borderRadius: 0,
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
                labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
                formatter={(value, name) => {
                  if (name === "price") return [usd(Number(value)), "On-chain"];
                  if (name === "ref") return [usd(Number(value)), "Underlying"];
                  return null;
                }}
              />
              {/* Real regular-session windows from the issuer's own calendar —
                  holidays and DST included. Everything unshaded is time when
                  the reference price was not being set by anyone. */}
              {(data?.openWindows ?? []).map((w) => (
                <ReferenceArea
                  key={w.from}
                  x1={w.from}
                  x2={w.to}
                  fill="var(--color-paper-3)"
                  fillOpacity={1}
                  stroke="none"
                  ifOverflow="hidden"
                />
              ))}

              {/* Shades the region between the on-chain line and the close.
                  baseValue anchors the fill to the reference price, so the
                  band reads on both sides when the price crosses it. */}
              <Area
                dataKey="band"
                stroke="none"
                fill="var(--color-accent)"
                fillOpacity={0.16}
                isAnimationActive={false}
                activeDot={false}
                legendType="none"
                connectNulls={false}
              />
              <Line
                dataKey="ref"
                stroke="var(--color-muted)"
                strokeWidth={1.25}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                dataKey="price"
                stroke="var(--color-accent)"
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
      <p className="mt-5 max-w-[62ch] text-[length:var(--text-sm)] leading-relaxed text-muted-foreground">
        {CAPTION}
      </p>
      <p className="mt-3 font-mono text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-muted-foreground">
        On-chain via GeckoTerminal · close and session calendar via Backpack Securities
      </p>
    </div>
  );
}
