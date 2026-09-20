import { ImageResponse } from "next/og";

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
          borderRadius: 40,
          color: "white",
          fontSize: 108,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        W
      </div>
    ),
    { width: 192, height: 192 }
  );
}
