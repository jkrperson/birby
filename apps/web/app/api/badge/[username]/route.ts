import { NextRequest, NextResponse } from "next/server";
import { formatTokens } from "@birby/core";
import { SPRITES, gridToSvgRects } from "@birby/sprites";
import { petForUsername } from "@/lib/pet-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const result = await petForUsername(username.replace(/\.svg$/, ""));
  if (!result) {
    return new NextResponse("not found", { status: 404 });
  }
  const { pet } = result;
  const frames = SPRITES[pet.stage].idle;
  const scale = 3;
  const petSize = 16 * scale;

  const frameGroups = frames
    .map(
      (grid, i) =>
        `<g class="f f${i}">${gridToSvgRects(grid, scale, 10, 8)}</g>`,
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="230" height="64" role="img" aria-label="${pet.name}: ${pet.mood}">
<style>
  .f { animation: birby-blink ${frames.length}s steps(1) infinite; opacity: 0; }
  ${frames.map((_, i) => `.f${i} { animation-delay: ${i}s; }`).join("\n  ")}
  @keyframes birby-blink { 0% { opacity: 1; } ${Math.round(100 / frames.length)}% { opacity: 0; } }
  text { font-family: ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', Menlo, monospace; }
</style>
<rect width="230" height="64" rx="10" fill="#1c1917"/>
<rect x="1" y="1" width="228" height="62" rx="9" fill="none" stroke="#3b2d1f" stroke-width="2"/>
${frameGroups}
<text x="${petSize + 22}" y="24" font-size="13" font-weight="bold" fill="#ffd23e">${pet.name} · ${pet.mood}</text>
<text x="${petSize + 22}" y="44" font-size="12" fill="#d6cdbf">🔥 ${pet.streak}d · ${formatTokens(pet.lifetimeTokens)} eaten</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, s-maxage=300, max-age=300",
    },
  });
}
