/**
 * PreStocks' own published figures, from their public asset API.
 *
 * They publish two prices per token: `markPrice`, the SPV's marked value of
 * the underlying exposure, and `tokenPrice`, what the token actually trades
 * at. The gap between them is the discount, stated by the issuer rather than
 * inferred by us.
 *
 * This is why it is worth having. Their SPACEX token trades near five times
 * the post-split share price, and we have not been able to source the share
 * ratio, so the chart suppresses its comparison to the underlying entirely.
 * Both of these figures come from the same issuer on the same basis, so the
 * discount holds without needing that ratio at all.
 */

const API = "https://prestocks.com/api/prestocks";

export type PreStocksAsset = {
  symbol: string;
  mint: string;
  /** The SPV's marked value of the underlying exposure. */
  markPrice: number;
  /** What the token actually trades at. */
  tokenPrice: number;
  /** tokenPrice against markPrice, in percent. Negative is a discount. */
  discountPct: number;
  markValuation: number | null;
  impliedValuation: number | null;
  supply: number | null;
};

type RawAsset = {
  symbol?: string;
  contract_address?: string;
  markPrice?: number;
  tokenPrice?: number;
  markValuation?: number;
  impliedValuation?: number;
  supply?: number;
};

const finite = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Keyed by mint. Returns {} on any failure — the section is simply omitted. */
export async function fetchPreStocks(
  revalidate: number,
): Promise<Record<string, PreStocksAsset>> {
  try {
    const res = await fetch(API, {
      headers: { accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) return {};

    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) return {};

    const out: Record<string, PreStocksAsset> = {};
    for (const asset of raw as RawAsset[]) {
      const mint = asset.contract_address;
      const mark = finite(asset.markPrice);
      const token = finite(asset.tokenPrice);
      if (!mint || !asset.symbol || mark === null || token === null || mark <= 0) {
        continue;
      }
      out[mint] = {
        symbol: asset.symbol,
        mint,
        markPrice: mark,
        tokenPrice: token,
        discountPct: ((token - mark) / mark) * 100,
        markValuation: finite(asset.markValuation),
        impliedValuation: finite(asset.impliedValuation),
        supply: finite(asset.supply),
      };
    }
    return out;
  } catch {
    return {};
  }
}
