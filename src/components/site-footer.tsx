import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter({
  tokenCount,
  lastUpdated,
}: {
  tokenCount: number;
  lastUpdated: string;
}) {
  const formatted = new Date(`${lastUpdated}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <footer className="mt-20 border-t border-border pt-8 sm:mt-24">
      <div className="max-w-2xl space-y-3 text-[13px] leading-relaxed text-muted-foreground">
        <p>
          <span className="text-foreground/80">Curated, not comprehensive.</span>{" "}
          Every legal term here was read from the issuer&rsquo;s own documents.{" "}
          {tokenCount} tokens covered.
        </p>
        <p>
          Missing a token, or did an issuer&rsquo;s terms change?{" "}
          <Link
            href={site.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-chain/85 underline decoration-chain/25 underline-offset-[3px] transition-colors hover:text-chain hover:decoration-chain/60"
          >
            Open a PR.
          </Link>
        </p>
        <p>Informational only. Not legal, financial, or investment advice.</p>
      </div>

      <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        Last updated {formatted}
      </p>
    </footer>
  );
}
