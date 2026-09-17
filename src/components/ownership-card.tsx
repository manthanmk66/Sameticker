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
import type { MintAuthority } from "@/lib/mint-authority";
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
    <div className={cn("min-w-0 rule-top py-3", className)}>
      <dt className="font-mono text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1.5 text-[length:var(--text-sm)] leading-relaxed",
          mono && "font-mono",
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
    <div className="rule-top py-3">
      <dt className="font-mono text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 flex flex-col gap-1.5">
        {urls.map((url) => (
          <Link
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-mono text-[length:var(--text-xs)] text-primary underline decoration-primary/25 underline-offset-[3px] transition-colors duration-[var(--dur-short)] hover:decoration-primary active:text-ink"
          >
            {url.replace(/^https?:\/\//, "")}
          </Link>
        ))}
      </dd>
    </div>
  );
}

function Power({
  label,
  holder,
  consequence,
}: {
  label: string;
  holder: string | null;
  consequence: string;
}) {
  const held = Boolean(holder);
  return (
    <div className="rule-top py-3">
      <dt className="flex items-baseline justify-between gap-3 font-mono text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)]">
        <span className="text-muted-foreground">{label}</span>
        <span className={held ? "text-risk-high" : "text-risk-low"}>
          {held ? "Yes" : "No"}
        </span>
      </dt>
      <dd className="mt-1.5 text-[length:var(--text-sm)] leading-relaxed text-ink-2">
        {held ? consequence : "No key holds this power."}
      </dd>
      {holder && (
        <dd className="mt-1 break-all font-mono text-[length:var(--text-xs)] text-muted-foreground">
          {holder}
        </dd>
      )}
    </div>
  );
}

/**
 * Read live from the mint, not from tokens.json. Kept visually separate from
 * the fields above because the provenance is different in kind: everything
 * else is a human reading a document, this is the chain answering for itself.
 */
function OnChainControl({ authority }: { authority: MintAuthority }) {
  const { distinctControllers: keys, multiplier, pendingMultiplier } = authority;
  const dividend = multiplier != null && multiplier !== 1 ? (multiplier - 1) * 100 : null;

  return (
    <div className="mt-6">
      <h4 className="font-mono text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-primary">
        What the chain says
      </h4>
      <p className="mt-2 max-w-[62ch] text-[length:var(--text-sm)] leading-relaxed text-muted-foreground">
        Read from the mint account just now. Four control powers sit behind every
        Token-2022 stock;{" "}
        <span className="text-ink-2">
          {keys === 0
            ? "none are held here"
            : keys === 1
              ? "all of the ones in use here are held by a single key"
              : `the ones in use here are split across ${keys} keys`}
        </span>
        .
      </p>

      <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
        <Power
          label="Can freeze your account"
          holder={authority.freezeAuthority}
          consequence="This key can freeze your token account, making the position untransferable."
        />
        <Power
          label="Can take your tokens"
          holder={authority.permanentDelegate}
          consequence="Permanent delegate: this key can move tokens out of any wallet without the holder's signature."
        />
        <Power
          label="Can halt all transfers"
          holder={authority.pauseAuthority}
          consequence={
            authority.paused
              ? "This key can pause every transfer of this token. It is paused right now."
              : "This key can pause every transfer of this token globally."
          }
        />
        <Power
          label="Can gate transfers later"
          holder={authority.transferHookAuthority}
          consequence={
            authority.transferHookProgram
              ? `A transfer hook program is installed and runs on every transfer: ${authority.transferHookProgram}`
              : "No hook program is installed yet, but this key can install one that runs on — and can block — every transfer."
          }
        />
        {authority.defaultAccountState === "frozen" && (
          <Field
            label="New accounts"
            value="Start frozen — the issuer must act before a new holder can transfer."
            className="sm:col-span-2"
          />
        )}
        {dividend !== null && (
          <div className="rule-top py-3 sm:col-span-2">
            <dt className="font-mono text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-muted-foreground">
              Dividends paid by rebasing
            </dt>
            <dd className="mt-1.5 text-[length:var(--text-sm)] leading-relaxed text-ink-2">
              Balance multiplier is{" "}
              <span className="font-mono">{authority.multiplier}</span> — this token
              has credited{" "}
              <span className="text-primary">{dividend.toFixed(3)}%</span> in
              dividends by raising holders&rsquo; balances rather than sending
              anything. No transaction appears in your wallet history.
              {pendingMultiplier && (
                <>
                  {" "}A further change to{" "}
                  <span className="font-mono">{pendingMultiplier.value}</span> is
                  already scheduled on-chain for{" "}
                  {new Date(pendingMultiplier.effective * 1000).toLocaleString()}.
                </>
              )}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function OwnershipCard({
  token,
  authority,
}: {
  token: Token;
  authority?: MintAuthority;
}) {
  const mintMissing = token.mintAddress === NEEDS_INPUT;

  return (
    <div className="px-3 pb-6 pt-1 sm:px-4">
      {token.sources.length === 0 && (
        <div className="pt-4">
          <NoSourceBadge />
        </div>
      )}

      <p className="mt-4 max-w-[62ch] text-[length:var(--text-sm)] leading-relaxed text-ink-2">
        <span className="text-primary">
          {INSTRUMENT_LABELS[token.instrumentType]}.
        </span>{" "}
        {INSTRUMENT_MEANING[token.instrumentType]}
      </p>

      <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
        <Field label="CUSIP" value={token.cusip} mono />
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
                className="break-all text-primary underline decoration-primary/25 underline-offset-[3px] transition-colors duration-[var(--dur-short)] hover:decoration-primary active:text-ink"
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

      {authority && <OnChainControl authority={authority} />}
    </div>
  );
}
