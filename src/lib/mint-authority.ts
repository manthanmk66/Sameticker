/**
 * Token-2022 mint state, read from Solana directly.
 *
 * Everything else on this page is a legal term a human read from a document.
 * This is the part the chain proves on its own: who can freeze your account,
 * who can move your tokens without your signature, who can halt all transfers,
 * and who can install code that blocks them later.
 *
 * The issuers differ here in a way none of them advertise, so it is read live
 * rather than curated — a value typed into tokens.json could go stale; this
 * cannot.
 */

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

export type MintAuthority = {
  mint: string;
  /** Can freeze individual token accounts. */
  freezeAuthority: string | null;
  /** Can transfer tokens out of any wallet without the holder's signature. */
  permanentDelegate: string | null;
  /** Can halt every transfer of this token globally. */
  pauseAuthority: string | null;
  paused: boolean | null;
  /** Can install a program that runs on — and can block — every transfer. */
  transferHookAuthority: string | null;
  transferHookProgram: string | null;
  /** "frozen" means new accounts start unusable until the issuer acts. */
  defaultAccountState: string | null;
  /**
   * Balance multiplier. xStocks and Ondo pay dividends by raising it rather
   * than sending anything, so a holder's balance grows with no transaction.
   */
  multiplier: number | null;
  /** A multiplier change already scheduled on-chain, if it has not yet taken effect. */
  pendingMultiplier: { value: number; effective: number } | null;
  /** Distinct keys holding the four control powers above. 1 = total concentration. */
  distinctControllers: number;
};

type ParsedExtension = { extension?: string; state?: Record<string, unknown> };

function parseMint(mint: string, info: Record<string, unknown>): MintAuthority {
  const extensions = (info.extensions as ParsedExtension[] | undefined) ?? [];
  const ext = (name: string) =>
    extensions.find((e) => e.extension === name)?.state ?? null;

  const permanent = ext("permanentDelegate");
  const pausable = ext("pausableConfig");
  const hook = ext("transferHook");
  const defaults = ext("defaultAccountState");
  const scaled = ext("scaledUiAmountConfig");

  const freezeAuthority = (info.freezeAuthority as string | null) ?? null;
  const permanentDelegate = (permanent?.delegate as string | null) ?? null;
  const pauseAuthority = (pausable?.authority as string | null) ?? null;
  const transferHookAuthority = (hook?.authority as string | null) ?? null;

  let multiplier: number | null = null;
  let pendingMultiplier: MintAuthority["pendingMultiplier"] = null;
  if (scaled) {
    // Two fields, and the obvious one is a trap: `multiplier` is not rotated
    // once `newMultiplier` activates. Reading it alone is wrong on live mints
    // by as much as 10x.
    const effective = Number(scaled.newMultiplierEffectiveTimestamp ?? 0);
    const current = Number(scaled.multiplier ?? 1);
    const next = Number(scaled.newMultiplier ?? current);
    const nowSeconds = Date.now() / 1000;
    multiplier = nowSeconds >= effective ? next : current;
    if (effective > nowSeconds) pendingMultiplier = { value: next, effective };
  }

  const controllers = new Set(
    [freezeAuthority, permanentDelegate, pauseAuthority, transferHookAuthority].filter(
      (k): k is string => Boolean(k),
    ),
  );

  return {
    mint,
    freezeAuthority,
    permanentDelegate,
    pauseAuthority,
    paused: pausable ? Boolean(pausable.paused) : null,
    transferHookAuthority,
    transferHookProgram: (hook?.programId as string | null) ?? null,
    defaultAccountState: (defaults?.accountState as string | null) ?? null,
    multiplier,
    pendingMultiplier,
    distinctControllers: controllers.size,
  };
}

/**
 * Reads every mint in one `getMultipleAccounts` call. Returns {} on any
 * failure — the page must render without this, like every other source here.
 */
export async function fetchMintAuthorities(
  mints: string[],
  revalidate: number,
): Promise<Record<string, MintAuthority>> {
  const addresses = mints.filter((m) => m && m !== "NEEDS_INPUT");
  if (addresses.length === 0) return {};

  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getMultipleAccounts",
        params: [addresses, { encoding: "jsonParsed" }],
      }),
      next: { revalidate },
    });
    if (!res.ok) return {};

    const json = (await res.json()) as {
      result?: { value?: ({ data?: { parsed?: { info?: Record<string, unknown> } } } | null)[] };
    };
    const values = json?.result?.value;
    if (!Array.isArray(values)) return {};

    const out: Record<string, MintAuthority> = {};
    values.forEach((account, i) => {
      const info = account?.data?.parsed?.info;
      if (info) out[addresses[i]] = parseMint(addresses[i], info);
    });
    return out;
  } catch {
    return {};
  }
}
