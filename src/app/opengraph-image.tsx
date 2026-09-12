import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { tokens } from "@/lib/tokens";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const issuers = new Set(tokens.map((t) => t.issuer)).size;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#191a1f",
          color: "#ebebee",
          padding: "72px 80px",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: "#e8b84b" }}>
          SAMETICKER
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 600, letterSpacing: -2 }}>
            Same ticker.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 600,
              letterSpacing: -2,
              color: "#e8b84b",
            }}
          >
            Different deal.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: "#a6a6ae" }}>
            What you actually own when you buy a tokenized stock on Solana.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            fontSize: 22,
            color: "#8e8e98",
            borderTop: "1px solid #3a3b42",
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex" }}>{tokens.length} tokens</div>
          <div style={{ display: "flex" }}>{issuers} issuers</div>
          <div style={{ display: "flex" }}>Every legal term read from source</div>
        </div>
      </div>
    ),
    size,
  );
}
