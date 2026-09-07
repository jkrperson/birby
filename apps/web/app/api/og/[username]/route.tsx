import { ImageResponse } from "next/og";
import { formatTokens } from "@birby/core";
import { SPRITES, gridToSvgRects } from "@birby/sprites";
import { petForUsername } from "@/lib/pet-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const result = await petForUsername(username);
  if (!result) {
    return new Response("not found", { status: 404 });
  }
  const { pet } = result;
  const scale = 22;
  const size = 16 * scale;
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${gridToSvgRects(
    SPRITES[pet.stage].idle[0],
    scale,
  )}</svg>`;
  const spriteUri = `data:image/svg+xml,${encodeURIComponent(sprite)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          background: "#1c1917",
          color: "#fffbe8",
          fontFamily: "monospace",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={spriteUri} width={size} height={size} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 700, color: "#ffd23e" }}>
            {pet.name}
          </div>
          <div style={{ fontSize: 34, color: "#d6cdbf" }}>
            {`@${username} · ${pet.stage} · ${pet.mood}`}
          </div>
          <div style={{ fontSize: 34, color: "#d6cdbf" }}>
            {`🔥 ${pet.streak} day streak`}
          </div>
          <div style={{ fontSize: 34, color: "#d6cdbf" }}>
            {`${formatTokens(pet.lifetimeTokens)} tokens eaten`}
          </div>
          <div style={{ fontSize: 26, color: "#8a8175", marginTop: 12 }}>
            birby.me — feed a pet by vibe coding
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
