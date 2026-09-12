import raw from "../../data/tokens.json";
import {
  NEEDS_INPUT,
  UNVERIFIED,
  parseTokenFile,
  type InstrumentType,
  type Token,
} from "./token-schema";

export * from "./token-schema";

/**
 * Loads and validates the curated token data.
 *
 * The page is statically rendered, so this runs during `next build` and a
 * schema violation fails the build. That is deliberate: bad legal data must
 * never reach production.
 */
export const tokenFile = parseTokenFile(raw);
export const tokens: Token[] = tokenFile.tokens;

export function getToken(id: string): Token | undefined {
  return tokens.find((t) => t.id === id);
}

export function getTokenByTicker(ticker: string): Token | undefined {
  const needle = ticker.toLowerCase();
  return tokens.find((t) => t.ticker.toLowerCase() === needle);
}

/** True when a field carries no verified value. */
export function isUnverified(value: unknown): boolean {
  return (
    value === UNVERIFIED ||
    value === "unverified" ||
    value === NEEDS_INPUT ||
    value == null
  );
}

export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  "real-share": "Real share",
  "custodial-spv": "Custodial SPV",
  "structured-note": "Structured note",
  synthetic: "Synthetic",
};

/** One line on what the wrapper means for the holder. */
export const INSTRUMENT_MEANING: Record<InstrumentType, string> = {
  "real-share": "A share is held for you and you can take delivery of it.",
  "custodial-spv":
    "Shares are custodied, but your claim runs against the SPV, not the share.",
  "structured-note": "A debt claim on the issuer. You do not own a share.",
  synthetic: "Exposure to a price. No share sits behind it.",
};

/** How a token's redeemability reads in the table. */
export function redeemableLabel(value: Token["retailRedeemable"]): string {
  if (isUnverified(value)) return "Not yet verified";
  return value ? "Yes" : "No";
}
