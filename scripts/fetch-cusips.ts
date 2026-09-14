/**
 * Fills the `cusip` field on Backpack-issued tokens from Backpack Securities'
 * own public securities endpoint.
 *
 * A CUSIP identifies a specific registered security, so it is the hardest
 * verification on the page — it ties a token to a thing a regulator can name.
 * Coverage is sparse (Backpack populates it for a minority of listings) and
 * this script never invents one: a security with no published CUSIP stays
 * UNVERIFIED, which is itself a finding about the issuer.
 *
 * Only Backpack is touched. No other issuer publishes an identifier we have
 * read from source, so theirs stay UNVERIFIED rather than being inferred.
 *
 * Run: npm run fetch-cusips
 */
import { readFileSync, writeFileSync } from "node:fs";

const SECURITIES = "https://api.backpack.exchange/api/v1/securities";
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

type Security = { asset: string; cusip: string | null; name: string };

const res = await fetch(SECURITIES, {
  headers: { "User-Agent": BROWSER_UA, accept: "application/json" },
});
if (!res.ok) {
  console.error(`FAIL: securities endpoint returned ${res.status}`);
  process.exit(1);
}
const securities = (await res.json()) as Security[];
const byAsset = new Map(securities.map((s) => [s.asset, s]));

const url = new URL("../data/tokens.json", import.meta.url);
const file = JSON.parse(readFileSync(url, "utf8")) as {
  tokens: Record<string, unknown>[];
};

let filled = 0;
let unverified = 0;

for (const token of file.tokens) {
  const issuer = String(token.issuer);
  const ticker = String(token.ticker);

  if (issuer !== "Backpack Securities") {
    token.cusip ??= "UNVERIFIED";
    unverified += 1;
    continue;
  }

  const match = byAsset.get(`${ticker}.US`);
  const cusip = match?.cusip;

  if (cusip) {
    token.cusip = cusip;
    const sources = token.sources as string[];
    if (!sources.includes(SECURITIES)) sources.push(SECURITIES);
    filled += 1;
    console.log(`  ${ticker.padEnd(6)} ${cusip}  ${match?.name ?? ""}`);
  } else {
    token.cusip = "UNVERIFIED";
    unverified += 1;
    console.log(`  ${ticker.padEnd(6)} (none published)`);
  }
}

// Keep `cusip` next to the other identity fields rather than appended last.
file.tokens = file.tokens.map((t) => {
  const ordered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(t)) {
    ordered[k] = v;
    if (k === "company") ordered.cusip = t.cusip;
  }
  delete ordered.cusip_dup;
  return ordered;
});

writeFileSync(url, `${JSON.stringify(file, null, 2)}\n`);
console.log(`\n${filled} CUSIPs written, ${unverified} left UNVERIFIED.`);
