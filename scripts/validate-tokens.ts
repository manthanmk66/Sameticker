/**
 * Standalone validation of data/tokens.json.
 *
 * The same schema also runs during `next build` (src/lib/tokens.ts parses at
 * module load and the page is statically rendered), so a bad record fails the
 * build too. This script exists to get a clear, fast answer in CI or a PR.
 */
import { readFileSync } from "node:fs";
import { parseTokenFile } from "../src/lib/token-schema.ts";

const raw = JSON.parse(readFileSync(new URL("../data/tokens.json", import.meta.url), "utf8"));
const { tokens } = parseTokenFile(raw);

const missingSources = tokens.filter((t) => t.sources.length === 0);
if (missingSources.length > 0) {
  console.error(
    `FAIL: ${missingSources.length} token(s) have no source URL:\n` +
      missingSources.map((t) => `  • ${t.id}`).join("\n"),
  );
  process.exit(1);
}

const placeholders = tokens.filter((t) => t.mintAddress === "NEEDS_INPUT");

console.log(`OK: ${tokens.length} tokens passed schema validation.`);
console.log(`    ${tokens.length - placeholders.length} with a sourced mint address.`);
if (placeholders.length > 0) {
  console.log(
    `    ${placeholders.length} awaiting a mint address: ${placeholders
      .map((t) => t.id)
      .join(", ")}`,
  );
}
