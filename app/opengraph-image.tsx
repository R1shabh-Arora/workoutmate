import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#0B0E1A",
          backgroundImage:
            "radial-gradient(circle at 78% 30%, rgba(79,70,229,0.55), transparent 55%)",
          padding: "80px 96px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            W
          </div>
          <span style={{ fontSize: 34, fontWeight: 600, color: "white" }}>WorkoutMate</span>
        </div>
        <div
          style={{
            marginTop: 56,
            display: "flex",
            flexDirection: "column",
            fontSize: 60,
            fontWeight: 700,
            color: "white",
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          <span>Your workout. Your goals.</span>
          <span style={{ color: "#A5B4FC" }}>Your AI coach.</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 26, color: "#9AA3B8", maxWidth: 780 }}>
          A personalised training programme and AI fitness coach built around you.
        </div>
      </div>
    ),
    { ...size }
  );
}
