import { NextResponse } from "next/server";
import { getTokenByTicker, isUnverified, NEEDS_INPUT } from "@/lib/tokens";

export const revalidate = 3600;

export type PricePoint = { t: number; price: number };

export type PriceResponse = {
  ticker: string;
  /** On-chain price history, oldest first. Empty when unavailable. */
  chain: PricePoint[];
  /** Last traditional-market close, or null when unavailable. */
  previousClose: number | null;
  referenceSymbol: string | null;
  /** Human-readable reasons a series is missing. Never throws. */
  notes: string[];
};

const DAYS = 7;

/** Birdeye OHLCV history for one mint. Returns [] on any failure. */
async function fetchChainHistory(mint: string, notes: string[]): Promise<PricePoint[]> {
  const key = process.env.BIRDEYE_API_KEY;
  if (!key) {
    notes.push("BIRDEYE_API_KEY is not set.");
    return [];
  }

  const timeTo = Math.floor(Date.now() / 1000);
  const timeFrom = timeTo - DAYS * 24 * 60 * 60;
  const url =
    `https://public-api.birdeye.so/defi/history_price?address=${mint}` +
    `&address_type=token&type=1H&time_from=${timeFrom}&time_to=${timeTo}`;

  try {
    const res = await fetch(url, {
      headers: { "X-API-KEY": key, "x-chain": "solana", accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) {
      notes.push(`Birdeye returned ${res.status}.`);
      return [];
    }
    const json = (await res.json()) as {
      success?: boolean;
      data?: { items?: { unixTime: number; value: number }[] };
    };
    const items = json?.data?.items;
    if (!Array.isArray(items) || items.length === 0) {
      notes.push("Birdeye returned no price points for this mint.");
      return [];
    }
    return items
      .filter((i) => typeof i?.value === "number" && Number.isFinite(i.value))
      .map((i) => ({ t: i.unixTime * 1000, price: i.value }))
      .sort((a, b) => a.t - b.t);
  } catch {
    notes.push("Could not reach Birdeye.");
    return [];
  }
}

/** Finnhub previous close for the underlying listing. Returns null on failure. */
async function fetchPreviousClose(symbol: string, notes: string[]): Promise<number | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    notes.push("FINNHUB_API_KEY is not set.");
    return null;
  }
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
      { next: { revalidate } },
    );
    if (!res.ok) {
      notes.push(`Finnhub returned ${res.status}.`);
      return null;
    }
    const json = (await res.json()) as { pc?: number };
    if (typeof json?.pc !== "number" || json.pc <= 0) {
      notes.push(`Finnhub has no previous close for ${symbol}.`);
      return null;
    }
    return json.pc;
  } catch {
    notes.push("Could not reach Finnhub.");
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

  const previousClose = referenceSymbol
    ? await fetchPreviousClose(referenceSymbol, notes)
    : (notes.push("No verified traditional-market listing for this token."), null);

  const body: PriceResponse = {
    ticker: token.ticker,
    chain,
    previousClose,
    referenceSymbol,
    notes,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
