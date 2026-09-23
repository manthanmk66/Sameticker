import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "@/components/logo";

/**
 * Ft5 · Statement — one display sentence closes the page, not a sitemap.
 * The sentence is assembled from the dataset so it cannot overstate it.
 */
export function SiteFooter({
  tokenCount,
  issuerCount,
  company,
  siblingCount,
  lastUpdated,
}: {
  tokenCount: number;
  issuerCount: number;
  company: string;
  siblingCount: number;
  lastUpdated: string;
}) {
  const formatted = new Date(`${lastUpdated}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <footer className="mt-[var(--space-2xl)] border-t border-rule px-[var(--page-gutter)] py-[var(--space-xl)] sm:mt-[var(--space-3xl)]">
      <div className="mx-auto w-full max-w-[76rem]">
        <p className="max-w-[24ch] text-[length:var(--text-display-s)] font-[560] leading-[1.05] tracking-[-0.03em] text-ink">
          {siblingCount} issuers. One {company}.
          <br />
          <span className="text-muted-foreground">
            {siblingCount} different things to own.
          </span>
        </p>

        <div className="mt-[var(--space-xl)] grid gap-x-[var(--space-2xl)] gap-y-[var(--space-md)] sm:grid-cols-2">
          <p className="max-w-[46ch] text-[length:var(--text-sm)] leading-relaxed text-muted-foreground">
            <span className="text-ink-2">Curated, not comprehensive.</span> Every
            legal term here was read from the issuer&rsquo;s own documents.{" "}
            {tokenCount} tokens, {issuerCount} issuers covered.
          </p>
          <p className="max-w-[46ch] text-[length:var(--text-sm)] leading-relaxed text-muted-foreground">
            Missing a token, or did an issuer&rsquo;s terms change?{" "}
            <Link
              href={site.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap text-primary underline decoration-primary/30 underline-offset-[3px] transition-colors duration-[var(--dur-short)] hover:decoration-primary active:text-ink"
            >
              Open a PR
            </Link>
            . Informational only. Not legal, financial, or investment advice.
          </p>
        </div>

        <div className="mt-[var(--space-xl)] flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-rule pt-[var(--space-sm)]">
          <span className="flex items-center gap-2">
            <Logo className="h-3.5 w-auto text-primary" />
            <span className="font-mono text-[length:var(--text-xs)] uppercase tracking-[0.18em] text-ink-2">
              Same<span className="text-primary">Ticker</span>
            </span>
          </span>
          <span className="font-mono text-[length:var(--text-xs)] uppercase tracking-[var(--tracking-label)] text-muted-foreground">
            Updated {formatted}
          </span>
        </div>
      </div>
    </footer>
  );
}
