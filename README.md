# SameTicker

**Same ticker, different deal.** A decoder for what you actually own when you
buy a tokenized stock on Solana.

Four issuers put the same company on-chain. On a price chart they look
identical. Underneath they are different legal instruments: one is a real share
you can take delivery of, one is a claim against an SPV you cannot redeem from,
one is a debt note, one is synthetic exposure with a hard expiry date.

PreStocks buyers discovered a 180-day lockup after purchase and the token traded
roughly 40% below the underlying. Every existing tool shows price. None shows
structure.

This is not a price screener, not a trading signal tool, and not financial or
legal advice.

---

## The curation standard

**Curated, not comprehensive.** 15 tokens where every legal term was read from
source. That is the entire product. The standard is deliberately strict:

1. **No invented mint addresses.** Every `mintAddress` in `data/tokens.json` is
   accompanied by a `mintSources` array pointing at where it was read from —
   the issuer's own announcement, Solscan, or Jupiter's verified token list.
   The schema rejects a mint address with no source. Tokens without a confirmed
   address carry the literal string `NEEDS_INPUT` and are never charted.
2. **No invented legal terms.** Lockups, redemption rights, SPV jurisdictions,
   withholding rates, custodians, attestation schedules. If it was not read from
   a source document, the field is the literal string `UNVERIFIED` and renders
   in the UI as "Not yet verified".
3. **Never inferred from a similar token.** Issuer-level structure is applied
   across that issuer's tokens only where the issuer documents it at that level.
   A fact about `TSLAx` is not a fact about `NVDAx` unless the source says so.
4. **Unverified is visible, not hidden.** A missing field is a finding about the
   issuer. It stays on the page.
5. **Nothing is scraped at build time to fill in legal data.** A human reads the
   source documents. The JSON is static and lives in this repo.

Every token record carries at least one `sources` URL. A token with an empty
`sources` array renders with a visible warning badge.

---

## Adding or correcting a token

Open a PR against `data/tokens.json`.

A PR is mergeable when:

- Every field you set is traceable to a URL in that token's `sources` array.
- Anything you could not confirm is the string `UNVERIFIED`. Do not guess, and
  do not copy a value from another token by the same issuer unless the source
  states it at the issuer level.
- `mintAddress` is accompanied by at least one `mintSources` URL, and you have
  checked the address resolves to the symbol you claim. Verifying against two
  independent sources is the standard here.
- `sharesPerToken` is set only if the issuer states it. If a token represents
  something other than one share and you cannot source the ratio, leave it
  `UNVERIFIED`: the chart will drop its reference line rather than print a
  confident wrong number. PreStocks' SPACEX trades near 5x the post-split share
  price, which is exactly why this field exists.
- You bump `lastUpdated` at the top of the file.

Corrections are as welcome as additions. If an issuer's terms changed, say so in
the PR and cite the change.

### Schema

Defined and enforced in [`src/lib/token-schema.ts`](src/lib/token-schema.ts), loaded by
[`src/lib/tokens.ts`](src/lib/tokens.ts).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | kebab-case string | Unique. Used by `site.heroPair`. |
| `ticker` | string | The on-chain symbol, exactly as it appears on-chain. |
| `company` | string | The underlying company. Shared across issuers. |
| `cusip` | string | CUSIP of the underlying registered security where the issuer publishes one, else `UNVERIFIED`. Refresh with `npm run fetch-cusips`. |
| `referenceSymbol` | string | Traditional-market symbol for the chart, or `UNVERIFIED`. |
| `sharesPerToken` | number or `UNVERIFIED` | Underlying shares one token represents. **Consequential:** unverified suppresses the chart's reference line and divergence entirely. Never infer it from price — that is circular. |
| `issuer` | string | |
| `liquidityRouter` | string | |
| `mintAddress` | base58 or `NEEDS_INPUT` | |
| `mintSources` | URL[] | Required when a real address is set. |
| `wrapper` | string | The legal wrapper in the issuer's own terms. |
| `instrumentType` | `real-share` \| `custodial-spv` \| `structured-note` \| `synthetic` | |
| `retailRedeemable` | `true` \| `false` \| `"unverified"` | |
| `redemptionPath` | string | |
| `lockup` | string | |
| `dividends` | string | |
| `withholding` | string | |
| `votingRights` | `true` \| `false` \| `"UNVERIFIED"` | |
| `attestation` | string | |
| `jurisdiction` | string | |
| `riskLevel` | `low` \| `medium` \| `high` \| `unverified` | |
| `riskNotes` | string | Why that risk level, in one or two sentences. |
| `sources` | URL[] | At least one. |

Any string field may be `UNVERIFIED`.

**Validation runs at build time.** `src/lib/tokens.ts` parses the JSON with Zod
at module load, and the page is statically rendered, so a schema violation
fails `next build`. Run it directly with `npm run validate`.

---

## Running locally

```bash
npm install
npm run dev
```

**No API keys, no `.env`, no signup.** Both price sources are public and
keyless:

| Data | Source | Notes |
| --- | --- | --- |
| On-chain hourly price | [GeckoTerminal](https://api.geckoterminal.com) | Keyless. Burst-sensitive rate limit; see below. |
| Underlying price series | [Backpack Securities](https://docs.backpack.exchange/) | Keyless. `klines?source=External` — the external market's own hourly series, not Backpack's tape. Divergence is measured against this, point for point. |
| Issuer's own figures (PreStocks) | [prestocks.com/api/prestocks](https://prestocks.com/api/prestocks) | Keyless. SPV mark price vs actual token price — the discount stated by the issuer rather than inferred. |
| Token-2022 mint state | [Solana RPC](https://api.mainnet-beta.solana.com) | Keyless. One `getMultipleAccounts` per hour covers every mint. Who can freeze, seize, pause or gate your tokens — read from the chain, not curated. |
| US session calendar + holidays | [Backpack Securities](https://docs.backpack.exchange/) | Keyless. Real session hours, so the chart shades when the reference price was actually live. |

Sections 1 and 2 are static and read only from `data/tokens.json`. Section 3
shows "Price data unavailable" with the specific reason when an upstream is
down or rate-limited; a failed fetch never breaks the page.

### How divergence is measured

Point against contemporaneous point, never against a single closing price.

The chart draws the underlying's own hourly series alongside the on-chain
price, carried forward through the hours the market was shut. Comparing a week
of on-chain prints to *today's* close measures the underlying's own move and
reports it as a wrapper defect: during one week where INTC rose 22.5% and MSTR
34.6%, that method claimed -45% and -25% divergence on tokens tracking within
3%.

The flat "last close" still appears in the legend, because it is the last price
the traditional market actually set. It is not what divergence is measured
against.

### Theming

Dark is the designed default. `:root` carries the light palette and `.dark`
overrides it; the toggle writes `localStorage.theme` and a script in
`layout.tsx` applies the class before first paint. An unset preference is
seeded to `dark` rather than left empty, because the theme hook reads the same
key and would otherwise no-op on the first click.

Risk colours are re-cut per theme rather than shared. The dark values sit at
70-82% lightness and fail 4.5:1 on light paper, which would make the one signal
this page exists to convey unreadable in half its states.

### Rate limiting

GeckoTerminal's keyless tier is burst-sensitive but recovers in about a second.
Three things keep the chart inside it:

- Responses are cached for an hour (`revalidate = 3600`).
- `data/pools.json` pre-resolves each mint's pool, halving calls per chart load.
- A single 1.8s retry on HTTP 429 absorbs cold-cache bursts.

A visitor flicking through every token at once may still see a rate-limit
message on the last few; it resolves on the next view and is cached from then
on.

| Command | |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build, fails on schema violation |
| `npm run validate` | Validate `data/tokens.json` on its own |
| `npm run resolve-pools` | Regenerate `data/pools.json` |
| `npm run fetch-cusips` | Refresh CUSIPs from Backpack's securities endpoint |
| `npm run lint` | ESLint |

---

## Architecture

Deliberately small. No database, no wallet connect, no cron jobs, no backend, no
auth.

```
data/tokens.json                     the product — static, human-curated
data/pools.json                      operational cache, regenerable, not curated data
src/lib/token-schema.ts              Zod schema, shared by build and validator
src/lib/tokens.ts                    loads + validates tokens.json
src/lib/site.ts                      repo URL, hero pair
src/app/page.tsx                     three sections, top to bottom
src/app/api/price/[ticker]/route.ts  GeckoTerminal + Backpack, cached 1h, never throws
src/lib/market-sessions.ts           real US session windows (DST + holidays)
src/lib/mint-authority.ts            Token-2022 control powers, read live from the chain
src/lib/prestocks.ts                 the issuer's own mark vs traded price
src/lib/prestocks.ts                 the issuer's own mark vs traded price
src/components/                      hero, table, ownership card, chart, footer
src/components/logo.tsx              the mark, inline SVG, inherits the theme accent
src/components/reveal.tsx            scroll entrance — visible by default, JS opts in
src/app/tokens.css                   design tokens: light on :root, dark on .dark
```

`data/pools.json` is deliberately separate from `data/tokens.json`. It is a
performance cache that can be regenerated at any time; mixing it into the
curated file would dilute the claim that every value there was read from a
source document. A stale or missing entry costs one extra API call, never
correctness — the route falls back to resolving the pool live.

Recharts is loaded on demand so it stays out of the initial bundle.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Recharts · Vercel.

No database, no wallet connect, no cron jobs, no auth, and no API keys.
