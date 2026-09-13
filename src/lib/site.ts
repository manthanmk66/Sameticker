/**
 * Single place to change deployment-specific values.
 */
export const site = {
  name: "SameTicker",
  tagline: "Same ticker. Different deal.",
  description:
    "A decoder for what you actually own when you buy a tokenized stock on Solana. Four issuers put the same company on-chain; underneath they are different legal instruments.",
  /** Must be public for the footer's "Open a PR" link to work for visitors. */
  repoUrl: "https://github.com/manthanmk66/Sameticker",
  /** The two tokens compared at the top of the page, by `id` in tokens.json. */
  heroPair: ["prestocks-spacex", "backpack-spcx"] as const,
};
