import { cn } from "@/lib/utils";
import {
  INSTRUMENT_LABELS,
  isUnverified,
  redeemableLabel,
  type Token,
} from "@/lib/tokens";
import { RiskBadge } from "./risk-badge";

/**
 * The leading clause of a verified string — a prefix, never a paraphrase.
 * The hero needs a value that fits a narrow column; the full sentence is one
 * row-open away in the table. Shortening by rewriting would put words in an
 * issuer's mouth, so this only ever cuts.
 */
const CLAUSE_MAX = 60;

function firstClause(text: string): { short: string; truncated: boolean } {
  if (text.length <= CLAUSE_MAX) {
    const stop = text.search(/[,.;]/);
    if (stop === -1) return { short: text, truncated: false };
    return { short: text.slice(0, stop), truncated: true };
  }
  const stop = text.search(/[,.;]/);
  if (stop > 0 && stop <= CLAUSE_MAX) {
    return { short: text.slice(0, stop), truncated: true };
  }
  // Cut on a word boundary — a clause severed mid-word reads as a rendering bug.
  const slice = text.slice(0, CLAUSE_MAX);
  const cut = slice.lastIndexOf(" ");
  return {
    short: `${(cut > 20 ? slice.slice(0, cut) : slice).trimEnd()}…`,
    truncated: true,
  };
}

type RowSpec = {
  label: string;
  render: (token: Token) => React.ReactNode;
  title?: (token: Token) => string | undefined;
};

const ROWS: RowSpec[] = [
  {
    label: "Wrapper",
    render: (t) => INSTRUMENT_LABELS[t.instrumentType],
  },
  {
    label: "Redeem",
    render: (t) =>
      isUnverified(t.retailRedeemable) ? (
        <span className="italic text-muted-foreground">Not verified</span>
      ) : (
        <span
          className={t.retailRedeemable ? "text-risk-low" : "text-risk-high"}
        >
          {redeemableLabel(t.retailRedeemable)}
        </span>
      ),
  },
  {
    label: "Lockup",
    render: (t) => {
      if (isUnverified(t.lockup)) {
        return <span className="italic text-muted-foreground">Not verified</span>;
      }
      const { short, truncated } = firstClause(t.lockup);
      return (
        <span className={truncated ? "border-b border-dotted border-rule-2" : ""}>
          {short}
        </span>
      );
    },
    title: (t) => (isUnverified(t.lockup) ? undefined : t.lockup),
  },
  {
    label: "Risk",
    render: (t) => <RiskBadge level={t.riskLevel} />,
  },
];

/**
 * Composed from the two records rather than written by hand, so the sentence
 * can never drift from what tokens.json actually says.
 */
function consequence(a: Token, b: Token): string | null {
  const aRedeem = isUnverified(a.retailRedeemable) ? null : (a.retailRedeemable as boolean);
  const bRedeem = isUnverified(b.retailRedeemable) ? null : (b.retailRedeemable as boolean);
  if (aRedeem === null || bRedeem === null || aRedeem === bRedeem) return null;

  const yes = aRedeem ? a : b;
  const no = aRedeem ? b : a;
  return `${yes.ticker} is redeemable for a real share. ${no.ticker} is not — you sell it on-chain, or you hold it.`;
}

export function HeroComparison({
  pair,
  siblings,
}: {
  pair: [Token, Token];
  siblings: Token[];
}) {
  const [a, b] = pair;
  const line = consequence(a, b);

  return (
    <section className="grid items-start gap-x-[var(--space-2xl)] gap-y-[var(--space-xl)] pt-[var(--space-md)] pb-[var(--space-2xl)] lg:grid-cols-[7fr_5fr] lg:pt-[var(--space-lg)] lg:pb-[var(--space-3xl)]">
      {/* Argument half */}
      <div className="min-w-0">
        <h1 className="text-[length:var(--text-display)] font-[560] leading-[0.98] tracking-[var(--tracking-display)] text-ink">
          Same ticker.
          <br />
          <span className="text-primary">Different deal.</span>
        </h1>

        <p className="mt-6 max-w-[46ch] text-[length:var(--text-lg)] leading-relaxed text-ink-2">
          Four issuers put the same company on Solana. On a price chart they look
          identical. Underneath they are different legal instruments.
        </p>

        {line && (
          <p className="mt-6 max-w-[52ch] text-[length:var(--text-md)] leading-relaxed text-muted-foreground">
            {line}
          </p>
        )}

        {siblings.length > 2 && (
          <p className="mt-6 font-mono text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-muted-foreground">
            {siblings.length} issuers · {a.company} · all {siblings.length} below
          </p>
        )}
      </div>

      {/* Proof half — read across, not down. That is the whole argument. */}
      <div className="min-w-0">
        <div className="grid grid-cols-[minmax(3.75rem,auto)_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 sm:gap-x-5">
          <span aria-hidden />
          {[a, b].map((token) => (
            <div key={token.id} className="min-w-0 pb-3">
              <div className="truncate font-mono text-[length:var(--text-sm)] tracking-wide text-primary">
                {token.ticker}
              </div>
              <div className="mt-1 text-[length:var(--text-xs)] leading-snug text-muted-foreground">
                {token.issuer}
              </div>
            </div>
          ))}

          {ROWS.map((row) => (
            <div key={row.label} className="contents">
              <div className="rule-top py-3 font-mono text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-muted-foreground">
                {row.label}
              </div>
              {[a, b].map((token) => (
                <div
                  key={token.id}
                  title={row.title?.(token)}
                  className={cn(
                    "rule-top min-w-0 py-3 text-[length:var(--text-sm)] leading-snug text-ink-2",
                  )}
                >
                  {row.render(token)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
