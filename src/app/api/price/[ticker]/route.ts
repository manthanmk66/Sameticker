import { NextResponse } from "next/server";
import poolCache from "../../../../../data/pools.json";
import { fetchOpenWindows, type Window } from "@/lib/market-sessions";
import { getTokenByTicker, isUnverified, NEEDS_INPUT } from "@/lib/tokens";

export const revalidate = 3600;

/** Pools rarely change; no need to re-resolve one every hour. */
const POOL_REVALIDATE = 86_400;

const HOURS = 168; // 7 days

/**
 * Both upstreams are public and keyless by design — the site should build and
 * run with no secrets at all. Neither is contractually guaranteed, so every
 * call degrades to a note rather than an error.
 */
const GECKOTERMINAL = "https://api.geckoterminal.com/api/v2";
const BACKPACK = "https://api.backpack.exchange/api/v1";

/** Quote tokens whose pools price the asset in something meaningful. */
const STABLE_QUOTES = new Set(["USDC", "USDT", "USD", "SOL", "WSOL"]);

export type PricePoint = { t: number; price: number };

export type PriceResponse = {
  ticker: string;
  /** On-chain price history, oldest first. Empty when unavailable. */
  chain: PricePoint[];
  /** Last traditional-market close, or null when unavailable. */
  previousClose: number | null;
  referenceSymbol: string | null;
  /** Regular-session windows inside the chart range — when the reference
   *  price was actually live. Empty when the calendar is unavailable. */
  openWindows: Window[];
  /** Human-readable reasons a series is missing. Never throws. */
  notes: string[];
};

type Pool = {
  attributes?: { address?: string; name?: string; reserve_in_usd?: string };
};

/**
 * Picks the pool to chart. Highest liquidity alone is not good enough: the
 * deepest pool for a long-tail token is sometimes quoted in another memecoin,
 * so prefer pools quoted in a stablecoin or SOL.
 */
function pickPool(pools: Pool[]): string | null {
  const named = pools.filter((p) => p.attributes?.address);
  if (named.length === 0) return null;

  const quoteOf = (p: Pool) =>
    (p.attributes?.name ?? "").split("/").pop()?.trim().toUpperCase() ?? "";
  const liquidityOf = (p: Pool) =>
    Number.parseFloat(p.attributes?.reserve_in_usd ?? "0") || 0;

  const preferred = named.filter((p) => STABLE_QUOTES.has(quoteOf(p)));
  const candidates = preferred.length > 0 ? preferred : named;

  return candidates.reduce((best, p) =>
    liquidityOf(p) > liquidityOf(best) ? p : best,
  ).attributes!.address!;
}

function rateLimited(status: number, notes: string[], who: string): boolean {
  if (status !== 429) return false;
  notes.push(`${who} rate limit reached. Try again shortly.`);
  return true;
}

/**
 * GeckoTerminal's keyless tier is burst-sensitive but recovers in about a
 * second, so one short retry absorbs the case where a visitor flicks through
 * several tokens before the hourly cache is warm. Bounded to a single attempt
 * to keep worst-case response time predictable.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status !== 429) return res;
  await new Promise((resolve) => setTimeout(resolve, 1800));
  return fetch(url, init);
}

const KNOWN_POOLS = (poolCache as { pools: Record<string, { pool: string }> }).pools;

/**
 * Resolves a pool live. Only needed when data/pools.json has no entry, which
 * keeps us well inside GeckoTerminal's keyless rate limit in the common case.
 */
async function resolvePool(mint: string, notes: string[]): Promise<string | null> {
  try {
    const res = await fetchWithRetry(
      `${GECKOTERMINAL}/networks/solana/tokens/${mint}/pools`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: POOL_REVALIDATE },
      },
    );
    if (!res.ok) {
      if (!rateLimited(res.status, notes, "GeckoTerminal")) {
        notes.push(`GeckoTerminal returned ${res.status} looking up pools.`);
      }
      return null;
    }
    const json = (await res.json()) as { data?: Pool[] };
    const pool = pickPool(json?.data ?? []);
    if (!pool) notes.push("No on-chain liquidity pool found for this mint.");
    return pool;
  } catch {
    notes.push("Could not reach GeckoTerminal.");
    return null;
  }
}

/** GeckoTerminal hourly OHLCV for the deepest sensible pool. Returns [] on failure. */
async function fetchChainHistory(mint: string, notes: string[]): Promise<PricePoint[]> {
  const poolAddress =
    KNOWN_POOLS[mint]?.pool ?? (await resolvePool(mint, notes));
  if (!poolAddress) return [];

  try {
    const res = await fetchWithRetry(
      `${GECKOTERMINAL}/networks/solana/pools/${poolAddress}/ohlcv/hour` +
        `?aggregate=1&limit=${HOURS}&currency=usd`,
      { headers: { accept: "application/json" }, next: { revalidate } },
    );
    if (!res.ok) {
      if (!rateLimited(res.status, notes, "GeckoTerminal")) {
        notes.push(`GeckoTerminal returned ${res.status} fetching price history.`);
      }
      return [];
    }
    const json = (await res.json()) as {
      data?: { attributes?: { ohlcv_list?: number[][] } };
    };
    const list = json?.data?.attributes?.ohlcv_list;
    if (!Array.isArray(list) || list.length === 0) {
      notes.push("No price history available for this pool.");
      return [];
    }

    // Rows are [timestamp, open, high, low, close, volume], newest first.
    return list
      .filter((r) => Array.isArray(r) && Number.isFinite(r[4]) && r[4] > 0)
      .map((r) => ({ t: r[0] * 1000, price: r[4] }))
      .sort((a, b) => a.t - b.t);
  } catch {
    notes.push("Could not reach GeckoTerminal.");
    return [];
  }
}

/**
 * The last traditional-market close, from Backpack Securities' public klines
 * with `source=External` — the external-market series, not Backpack's own tape.
 *
 * Taken as the last print at or before the most recent *completed* regular
 * session, so the reference line is genuinely "the last close" rather than
 * whatever the feed happened to carry overnight.
 *
 * Returns null on failure.
 */
async function fetchPreviousClose(
  symbol: string,
  openWindows: Window[],
  notes: string[],
): Promise<number | null> {
  const startTime = Math.floor(Date.now() / 1000) - (HOURS + 48) * 60 * 60;
  const url =
    `${BACKPACK}/klines?symbol=${encodeURIComponent(`${symbol}.US_USDC`)}` +
    `&interval=1h&startTime=${startTime}&source=External`;

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) {
      notes.push(`Reference price unavailable for ${symbol} (${res.status}).`);
      return null;
    }

    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw) || raw.length === 0) {
      notes.push(`No external market data published for ${symbol}.`);
      return null;
    }

    // `start` is a UTC wall-clock string, e.g. "2026-09-14 05:00:00".
    const candles = (raw as { start: string; close: string }[])
      .map((c) => ({
        t: Date.parse(`${c.start.replace(" ", "T")}Z`),
        close: Number.parseFloat(c.close),
      }))
      .filter((c) => Number.isFinite(c.t) && Number.isFinite(c.close) && c.close > 0)
      .sort((a, b) => a.t - b.t);

    if (candles.length === 0) {
      notes.push(`No usable external prices for ${symbol}.`);
      return null;
    }

    // The most recent session that has actually finished.
    const now = Date.now();
    const lastClosed = [...openWindows].reverse().find((w) => w.to <= now);

    if (lastClosed) {
      const atClose = [...candles].reverse().find((c) => c.t <= lastClosed.to);
      if (atClose) return atClose.close;
    }

    // No completed session in range (long weekend, holiday run): the latest
    // print is still the last thing the traditional market said.
    return candles[candles.length - 1].close;
  } catch {
    notes.push("Could not reach the reference-price source.");
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const token = getTokenByTicker(ticker);

  if (!token) {
    return NextResponse.json({ error: "Unknown ticker" }, { status: 404 });
  }

  const notes: string[] = [];

  // A token with no supplied mint address is never guessed at, and never charted.
  const chain =
    token.mintAddress === NEEDS_INPUT
      ? (notes.push("No mint address on file for this token."), [] as PricePoint[])
      : await fetchChainHistory(token.mintAddress, notes);

  const referenceSymbol = isUnverified(token.referenceSymbol)
    ? null
    : token.referenceSymbol;

  // Windows are derived first: the reference close is defined as the last
  // print at or before the most recent completed session.
  const openWindows =
    chain.length > 0 && referenceSymbol
      ? await fetchOpenWindows(chain[0].t, chain[chain.length - 1].t, revalidate, notes)
      : [];

  const previousClose = referenceSymbol
    ? await fetchPreviousClose(referenceSymbol, openWindows, notes)
    : (notes.push("No verified traditional-market listing for this token."), null);

  const body: PriceResponse = {
    ticker: token.ticker,
    chain,
    previousClose,
    referenceSymbol,
    openWindows,
    notes,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
