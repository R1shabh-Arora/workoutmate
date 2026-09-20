import { ImageResponse } from "next/og";

// Maskable icon: keep the glyph inside the ~80% center "safe zone" so
// Android's adaptive-icon mask doesn't clip it.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4F46E5",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 220,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          W
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
