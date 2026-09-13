/**
 * Regenerates data/pools.json — the deepest sensibly-quoted GeckoTerminal pool
 * for each mint.
 *
 * This is an operational cache, not curated data: it saves one API call per
 * chart load and keeps us inside GeckoTerminal's keyless rate limit. The route
 * falls back to resolving a pool live if an entry is missing or stale, so a
 * wrong value here degrades performance, never correctness. Deliberately kept
 * out of data/tokens.json, which holds only facts read from source.
 *
 * Run: npm run resolve-pools
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseTokenFile } from "../src/lib/token-schema.ts";

const STABLE = new Set(["USDC", "USDT", "USD", "SOL", "WSOL"]);
const API = "https://api.geckoterminal.com/api/v2";

const raw = JSON.parse(
  readFileSync(new URL("../data/tokens.json", import.meta.url), "utf8"),
);
const { tokens } = parseTokenFile(raw);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Pool = {
  attributes?: { address?: string; name?: string; reserve_in_usd?: string };
};

const pools: Record<string, { pool: string; name: string; liquidityUsd: number }> = {};

for (const token of tokens) {
  if (token.mintAddress === "NEEDS_INPUT") continue;

  let attempt = 0;
  for (;;) {
    const res = await fetch(
      `${API}/networks/solana/tokens/${token.mintAddress}/pools`,
      { headers: { accept: "application/json" } },
    );

    if (res.status === 429 && attempt < 5) {
      attempt += 1;
      const wait = 10_000 * attempt;
      console.log(`  ${token.ticker}: rate limited, waiting ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      console.log(`  ${token.ticker}: HTTP ${res.status} — skipped`);
      break;
    }

    const json = (await res.json()) as { data?: Pool[] };
    const candidates = (json.data ?? []).filter((p) => p.attributes?.address);
    const quote = (p: Pool) =>
      (p.attributes?.name ?? "").split("/").pop()?.trim().toUpperCase() ?? "";
    const liquidity = (p: Pool) =>
      Number.parseFloat(p.attributes?.reserve_in_usd ?? "0") || 0;

    const preferred = candidates.filter((p) => STABLE.has(quote(p)));
    const list = preferred.length > 0 ? preferred : candidates;
    if (list.length === 0) {
      console.log(`  ${token.ticker}: no pools`);
      break;
    }

    const best = list.reduce((a, b) => (liquidity(b) > liquidity(a) ? b : a));
    pools[token.mintAddress] = {
      pool: best.attributes!.address!,
      name: best.attributes!.name ?? "",
      liquidityUsd: Math.round(liquidity(best)),
    };
    console.log(
      `  ${token.ticker.padEnd(10)} ${best.attributes!.name?.padEnd(20)} $${liquidity(best).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    );
    break;
  }

  await sleep(2500);
}

writeFileSync(
  new URL("../data/pools.json", import.meta.url),
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), pools }, null, 2) + "\n",
);
console.log(`\nWrote data/pools.json with ${Object.keys(pools).length} pools.`);
