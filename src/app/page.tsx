import { HeroComparison } from "@/components/hero-comparison";
import { TokenTable } from "@/components/token-table";
import { GapChartLazy } from "@/components/gap-chart-lazy";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/site";
import { getToken, tokenFile, tokens } from "@/lib/tokens";

function SectionHeading({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] tracking-[0.12em] text-primary/70">
          {index}
        </span>
        <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2>
      </div>
      {children && (
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          {children}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const [aId, bId] = site.heroPair;
  const a = getToken(aId);
  const b = getToken(bId);

  // A misconfigured hero pair is a data error, not a runtime surprise.
  if (!a || !b) {
    throw new Error(
      `site.heroPair references unknown token id: ${!a ? aId : bId}`,
    );
  }

  const siblingCount = tokens.filter((t) => t.company === a.company).length;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20">
      <HeroComparison pair={[a, b]} siblingCount={siblingCount} />

      <section className="mt-20 sm:mt-24">
        <SectionHeading index="01" title="What you actually own">
          Every token we have read the documents for. Sort any column; select a
          row to open the full ownership record. Anything we could not confirm
          from source reads &ldquo;Not yet verified&rdquo; rather than being
          hidden or guessed.
        </SectionHeading>
        <TokenTable tokens={tokens} />
      </section>

      <section className="mt-20 sm:mt-24">
        <SectionHeading index="02" title="The weekend gap">
          The on-chain price against the last traditional-market close.
        </SectionHeading>
        <GapChartLazy tokens={tokens} />
      </section>

      <SiteFooter
        tokenCount={tokens.length}
        lastUpdated={tokenFile.lastUpdated}
      />
    </main>
  );
}
