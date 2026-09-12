/**
 * Single place to change deployment-specific values.
 */
export const site = {
  name: "SameTicker",
  tagline: "Same ticker. Different deal.",
  description:
    "A decoder for what you actually own when you buy a tokenized stock on Solana. Four issuers put the same company on-chain; underneath they are different legal instruments.",
  /** TODO: replace with the real repository before launch. */
  repoUrl: "https://github.com/REPLACE-ME/sameticker",
  /** The two tokens compared at the top of the page, by `id` in tokens.json. */
  heroPair: ["prestocks-spacex", "backpack-spcx"] as const,
};
