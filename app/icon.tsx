import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#67E821",
        color: "#0a0a0a",
        fontSize: 22,
        fontWeight: 800,
        fontFamily: "system-ui, sans-serif",
        borderRadius: 7,
        letterSpacing: -1,
      }}
    >
      T
    </div>,
    size,
  );
}
