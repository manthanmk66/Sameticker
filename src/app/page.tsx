import Link from "next/link";
import { HeroComparison } from "@/components/hero-comparison";
import { TokenTable } from "@/components/token-table";
import { GapChartLazy } from "@/components/gap-chart-lazy";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { site } from "@/lib/site";
import { fetchMintAuthorities } from "@/lib/mint-authority";
import { fetchPreStocks } from "@/lib/prestocks";
import { getToken, tokenFile, tokens } from "@/lib/tokens";

/** One RPC call an hour covers every mint on the page. */
export const revalidate = 3600;

/**
 * S2 · Hanging — the heading floats in negative space above its section.
 * No numeral, no rule, no left-margin label: the space is the separator.
 */
function SectionHead({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 sm:mb-10">
      <h2 className="text-[length:var(--text-display-s)] font-[560] leading-[1.05] tracking-[-0.03em] text-ink">
        {title}
      </h2>
      {children && (
        <p className="mt-3 max-w-[52ch] text-[length:var(--text-md)] leading-relaxed text-muted-foreground">
          {children}
        </p>
      )}
    </header>
  );
}

export default async function Home() {
  const [aId, bId] = site.heroPair;
  const a = getToken(aId);
  const b = getToken(bId);

  // A misconfigured hero pair is a data error, not a runtime surprise.
  if (!a || !b) {
    throw new Error(`site.heroPair references unknown token id: ${!a ? aId : bId}`);
  }

  // One getMultipleAccounts call for all 15 mints. Returns {} if the RPC is
  // unreachable, and the cards simply omit the section.
  const [authorities, issuerFigures] = await Promise.all([
    fetchMintAuthorities(
      tokens.map((t) => t.mintAddress),
      revalidate,
    ),
    fetchPreStocks(revalidate),
  ]);

  const siblings = tokens.filter((t) => t.company === a.company);
  const issuerCount = new Set(tokens.map((t) => t.issuer)).size;

  return (
    <div className="min-h-dvh">
      {/* N9 · Edge-aligned minimal. The empty middle is the design; filling it
          with a link row would make the standard AI nav with extra steps. */}
      <header className="flex items-center justify-between gap-4 px-[var(--page-gutter)] py-5">
        <span className="flex items-center gap-2.5">
          <Logo className="h-4 w-auto text-primary" />
          <span className="font-mono text-[length:var(--text-sm)] tracking-[0.18em] text-ink">
            SAME<span className="text-primary">TICKER</span>
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <Link
          href={site.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 whitespace-nowrap border border-rule px-3 py-1.5 font-mono text-[length:var(--text-xs)] uppercase tracking-[0.14em] text-ink-2 transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-rule-2 hover:text-ink active:bg-paper-2"
        >
          Source
        </Link>
        </div>
      </header>

      <main className="px-[var(--page-gutter)] pb-[var(--space-2xl)]">
        <div className="mx-auto w-full max-w-[76rem]">
          <HeroComparison pair={[a, b]} siblings={siblings} />

          <section>
            <Reveal>
            <SectionHead title="What you actually own">
              Every token whose documents we have read. Sort any column, open any
              row. Anything we could not confirm from source reads &ldquo;Not yet
              verified&rdquo; rather than being hidden or guessed.
            </SectionHead>
            </Reveal>
            <Reveal delay={0.06}>
            <TokenTable
              tokens={tokens}
              authorities={authorities}
              issuerFigures={issuerFigures}
            />
            </Reveal>
          </section>

          <section className="pt-[var(--space-2xl)] sm:pt-[var(--space-3xl)]">
            <Reveal>
              <SectionHead title="The weekend gap">
                On-chain price against the last traditional-market close.
              </SectionHead>
            </Reveal>
            <Reveal delay={0.06}>
              <GapChartLazy tokens={tokens} />
            </Reveal>
          </section>
        </div>
      </main>

      <SiteFooter
        tokenCount={tokens.length}
        issuerCount={issuerCount}
        company={a.company}
        siblingCount={siblings.length}
        lastUpdated={tokenFile.lastUpdated}
      />
    </div>
  );
}
