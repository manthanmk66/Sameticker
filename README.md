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
- You bump `lastUpdated` at the top of the file.

Corrections are as welcome as additions. If an issuer's terms changed, say so in
the PR and cite the change.

### Schema

Defined and enforced in [`src/lib/tokens.ts`](src/lib/tokens.ts).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | kebab-case string | Unique. Used by `site.heroPair`. |
| `ticker` | string | The on-chain symbol, exactly as it appears on-chain. |
| `company` | string | The underlying company. Shared across issuers. |
| `referenceSymbol` | string | Traditional-market symbol for the chart, or `UNVERIFIED`. |
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
| Traditional-market previous close | [Nasdaq](https://api.nasdaq.com) | Keyless. Requires a browser `User-Agent`. |

Sections 1 and 2 are static and read only from `data/tokens.json`. Section 3
shows "Price data unavailable" with the specific reason when an upstream is
down or rate-limited; a failed fetch never breaks the page.

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
src/app/api/price/[ticker]/route.ts  GeckoTerminal + Nasdaq, cached 1h, never throws
src/components/                      hero, table, ownership card, chart, footer
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
