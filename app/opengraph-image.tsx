import { ImageResponse } from "next/og";
import { appConfig } from "@/config/app.config";

export const alt = `${appConfig.name} — ${appConfig.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background:
          "radial-gradient(circle at 80% 0%, rgba(103,232,33,0.18) 0%, rgba(10,10,10,0) 55%), #0a0a0a",
        color: "#fafafa",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header: logo + label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#67E821",
              color: "#0a0a0a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: -2,
            }}
          >
            T
          </div>
          <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>
            {appConfig.name}
          </span>
        </div>
        <span
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 18,
            color: "#a3a3a3",
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          / template · v1.0
        </span>
      </div>

      {/* Headline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1000 }}>
        <span
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 22,
            color: "#67E821",
            textTransform: "uppercase",
            letterSpacing: 3,
          }}
        >
          / construa seu SaaS
        </span>
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -3,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Auth, multi-tenant</span>
          <span>
            e dashboard <span style={{ color: "#67E821" }}>prontos.</span>
          </span>
        </div>
      </div>

      {/* Footer: stack */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          borderTop: "1px solid #262626",
          paddingTop: 28,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 20,
          color: "#a3a3a3",
        }}
      >
        <span>next.js 16 · supabase · tailwind 4 · shadcn/ui</span>
        <span style={{ color: "#67E821" }}>construído com claude code</span>
      </div>
    </div>,
    size,
  );
}
