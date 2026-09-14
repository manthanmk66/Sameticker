import { z } from "zod";

/**
 * Schema for data/tokens.json.
 *
 * Kept free of any JSON import so it can be shared by the Next build
 * (src/lib/tokens.ts) and the standalone validator (scripts/validate-tokens.ts),
 * which load the data by different mechanisms.
 */

export const UNVERIFIED = "UNVERIFIED";
export const NEEDS_INPUT = "NEEDS_INPUT";

/** Base58, no 0/O/I/l. Solana mints are 32-44 chars. */
const BASE58_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const triState = z.union([
  z.boolean(),
  z.literal("unverified"),
  z.literal("UNVERIFIED"),
]);

const filled = z.string().min(1);

const tokenSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, "id must be kebab-case"),
    ticker: filled,
    company: filled,
    /** CUSIP of the underlying registered security, where the issuer publishes one. */
    cusip: filled,
    referenceSymbol: filled,
    /**
     * Underlying shares represented by one token. Only set where the issuer
     * states it. Without it a price comparison is meaningless — a token worth
     * five post-split shares is not "up 300%" against a one-share reference.
     */
    sharesPerToken: z.union([z.number().positive(), z.literal("UNVERIFIED")]),
    issuer: filled,
    liquidityRouter: filled,
    mintAddress: filled,
    mintSources: z.array(z.string().url()),
    wrapper: filled,
    instrumentType: z.enum([
      "real-share",
      "custodial-spv",
      "structured-note",
      "synthetic",
    ]),
    retailRedeemable: triState,
    redemptionPath: filled,
    lockup: filled,
    dividends: filled,
    withholding: filled,
    votingRights: triState,
    attestation: filled,
    jurisdiction: filled,
    riskLevel: z.enum(["low", "medium", "high", "unverified"]),
    riskNotes: filled,
    sources: z.array(z.string().url()),
  })
  .superRefine((token, ctx) => {
    if (token.mintAddress === NEEDS_INPUT) return;

    // A mint address is either the explicit placeholder or a real, sourced one.
    // Nothing in between — an unsourced address is how a wrong address ships.
    if (!BASE58_MINT.test(token.mintAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mintAddress"],
        message: `${token.id}: mintAddress must be valid base58 or the literal "${NEEDS_INPUT}"`,
      });
    }
    if (token.mintSources.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mintSources"],
        message: `${token.id}: a mint address requires at least one mintSources URL`,
      });
    }
  });

const fileSchema = z.object({
  lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  curationNote: filled,
  tokens: z.array(tokenSchema).min(1),
});

export type Token = z.infer<typeof tokenSchema>;
export type TokenFile = z.infer<typeof fileSchema>;
export type InstrumentType = Token["instrumentType"];
export type RiskLevel = Token["riskLevel"];

export function parseTokenFile(raw: unknown): TokenFile {
  const result = fileSchema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `  \u2022 ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`data/tokens.json failed validation:\n${detail}`);
  }
  const ids = result.data.tokens.map((t) => t.id);
  const dupeId = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dupeId) throw new Error(`data/tokens.json: duplicate token id "${dupeId}"`);

  const mints = result.data.tokens
    .map((t) => t.mintAddress)
    .filter((m) => m !== NEEDS_INPUT);
  const dupeMint = mints.find((m, i) => mints.indexOf(m) !== i);
  if (dupeMint) {
    throw new Error(`data/tokens.json: duplicate mint address "${dupeMint}"`);
  }
  return result.data;
}
