import { cn } from "@/lib/utils";
import {
  INSTRUMENT_LABELS,
  INSTRUMENT_MEANING,
  isUnverified,
  redeemableLabel,
  type Token,
} from "@/lib/tokens";
import { RiskBadge } from "./risk-badge";

function Row({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const unverified = isUnverified(value);
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border/60 py-2.5">
      <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-right text-[13px] leading-snug",
          unverified
            ? "italic text-muted-foreground"
            : tone === "good"
              ? "text-risk-low"
              : tone === "bad"
                ? "text-risk-high"
                : "text-foreground/90",
        )}
      >
        {unverified ? "Not yet verified" : value}
      </span>
    </div>
  );
}

function HeroCard({ token }: { token: Token }) {
  const redeemable = isUnverified(token.retailRedeemable)
    ? undefined
    : (token.retailRedeemable as boolean);

  return (
    <div className="flex flex-col rounded-md border border-border bg-card/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[15px] font-medium tracking-wide text-primary">
            {token.ticker}
          </div>
          <div className="mt-1 truncate text-[13px] text-muted-foreground">
            {token.issuer}
          </div>
        </div>
        <RiskBadge level={token.riskLevel} />
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-foreground/75">
        {INSTRUMENT_MEANING[token.instrumentType]}
      </p>

      <div className="mt-4">
        <Row label="Wrapper" value={INSTRUMENT_LABELS[token.instrumentType]} />
        <Row
          label="Can you redeem?"
          value={redeemableLabel(token.retailRedeemable)}
          tone={redeemable === undefined ? undefined : redeemable ? "good" : "bad"}
        />
        <Row label="Lockup" value={token.lockup} />
      </div>
    </div>
  );
}

/**
 * The consequence line is composed from the two records rather than written by
 * hand, so it can never drift from what tokens.json actually says.
 */
function consequence(a: Token, b: Token): string {
  const parts: string[] = [`Same company, ${a.company}.`];

  const aRedeem = isUnverified(a.retailRedeemable) ? null : (a.retailRedeemable as boolean);
  const bRedeem = isUnverified(b.retailRedeemable) ? null : (b.retailRedeemable as boolean);

  if (aRedeem !== bRedeem && aRedeem !== null && bRedeem !== null) {
    const yes = aRedeem ? a : b;
    const no = aRedeem ? b : a;
    parts.push(
      `${yes.ticker} is redeemable for a real share. ${no.ticker} is not — you sell it on-chain or you hold it.`,
    );
  }

  const locked = [a, b].find((t) => !isUnverified(t.lockup) && t.lockup !== "None");
  if (locked) {
    parts.push(`${locked.ticker} ${locked.lockup.charAt(0).toLowerCase()}${locked.lockup.slice(1)}`);
  }

  return parts.join(" ");
}

export function HeroComparison({
  pair,
  siblingCount,
}: {
  pair: [Token, Token];
  siblingCount: number;
}) {
  const [a, b] = pair;

  return (
    <section>
      <h1 className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.75rem]">
        Same ticker.{" "}
        <span className="text-primary">Different deal.</span>
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        On a price chart these look identical. Underneath they are different
        legal instruments. This is what you actually own.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 sm:gap-4">
        <HeroCard token={a} />
        <HeroCard token={b} />
      </div>

      <p className="mt-4 max-w-2xl text-balance border-l-2 border-primary/45 py-1 pl-3.5 text-[14px] leading-relaxed text-foreground/85">
        {consequence(a, b)}
      </p>

      {siblingCount > 2 && (
        <p className="mt-3 pl-3.5 text-[13px] text-muted-foreground">
          {siblingCount} different issuers put {a.company} on Solana. All{" "}
          {siblingCount} are in the table below.
        </p>
      )}
    </section>
  );
}
