import { ImageResponse } from "next/server";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#f8fafc",
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        TM
      </div>
    ),
    {
      ...size,
    },
  );
}
