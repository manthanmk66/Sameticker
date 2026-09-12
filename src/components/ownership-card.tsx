import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  INSTRUMENT_LABELS,
  INSTRUMENT_MEANING,
  isUnverified,
  NEEDS_INPUT,
  redeemableLabel,
  type Token,
} from "@/lib/tokens";
import { NoSourceBadge } from "./risk-badge";

/**
 * A single legal field. Unverified fields are never hidden and never guessed —
 * they render muted, in place, so the gap is visible.
 */
function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  const unverified = typeof value !== "object" && isUnverified(value);
  return (
    <div className={cn("min-w-0 border-t border-border/60 py-3", className)}>
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1.5 text-[13.5px] leading-relaxed",
          mono && "font-mono text-[12.5px]",
          unverified
            ? "text-muted-foreground italic"
            : "text-foreground/90",
        )}
      >
        {unverified ? "Not yet verified" : value}
      </dd>
    </div>
  );
}

function SourceList({ label, urls }: { label: string; urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="border-t border-border/60 py-3">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 flex flex-col gap-1.5">
        {urls.map((url) => (
          <Link
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-mono text-[11.5px] text-chain/85 underline decoration-chain/25 underline-offset-[3px] transition-colors hover:text-chain hover:decoration-chain/60"
          >
            {url.replace(/^https?:\/\//, "")}
          </Link>
        ))}
      </dd>
    </div>
  );
}

export function OwnershipCard({ token }: { token: Token }) {
  const mintMissing = token.mintAddress === NEEDS_INPUT;

  return (
    <div className="bg-card/40 px-4 pb-5 pt-1 sm:px-6">
      {token.sources.length === 0 && (
        <div className="pt-4">
          <NoSourceBadge />
        </div>
      )}

      <p className="max-w-2xl border-l-2 border-primary/45 py-1 pl-3 text-[13.5px] leading-relaxed text-foreground/80 sm:mt-4">
        <span className="font-medium text-foreground">
          {INSTRUMENT_LABELS[token.instrumentType]}.
        </span>{" "}
        {INSTRUMENT_MEANING[token.instrumentType]}
      </p>

      <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
        <Field label="Issuer" value={token.issuer} />
        <Field label="Liquidity router" value={token.liquidityRouter} />
        <Field
          label="Mint address"
          mono
          value={
            mintMissing ? (
              NEEDS_INPUT
            ) : (
              <Link
                href={`https://solscan.io/token/${token.mintAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-chain/85 underline decoration-chain/25 underline-offset-[3px] transition-colors hover:text-chain hover:decoration-chain/60"
              >
                {token.mintAddress}
              </Link>
            )
          }
          className="sm:col-span-2"
        />
        <Field
          label="Wrapper"
          value={token.wrapper}
          className="sm:col-span-2"
        />
        <Field
          label="Retail redeemable"
          value={
            isUnverified(token.retailRedeemable)
              ? token.retailRedeemable
              : redeemableLabel(token.retailRedeemable)
          }
        />
        <Field label="Lockup" value={token.lockup} />
        <Field
          label="Redemption path"
          value={token.redemptionPath}
          className="sm:col-span-2"
        />
        <Field label="Dividends" value={token.dividends} />
        <Field label="Withholding" value={token.withholding} />
        <Field
          label="Voting rights"
          value={
            isUnverified(token.votingRights)
              ? token.votingRights
              : token.votingRights
                ? "Yes"
                : "No"
          }
        />
        <Field label="Jurisdiction" value={token.jurisdiction} />
        <Field
          label="Attestation"
          value={token.attestation}
          className="sm:col-span-2"
        />
        <Field
          label="Why this risk level"
          value={token.riskNotes}
          className="sm:col-span-2"
        />
        <SourceList label="Sources read" urls={token.sources} />
        <SourceList label="Mint address read from" urls={token.mintSources} />
      </dl>
    </div>
  );
}
