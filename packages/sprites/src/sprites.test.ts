import { describe, expect, it } from "vitest";
import { GRID_SIZE, PALETTE, SPRITES, gridToSvgRects } from "./index";

describe("sprite grids", () => {
  it("every frame is a 16x16 grid of known palette keys", () => {
    for (const [stage, anims] of Object.entries(SPRITES)) {
      for (const [anim, frames] of Object.entries(anims)) {
        expect(frames.length, `${stage}/${anim}`).toBeGreaterThan(0);
        for (const grid of frames) {
          expect(grid.length, `${stage}/${anim} rows`).toBe(GRID_SIZE);
          for (const row of grid) {
            expect(row.length, `${stage}/${anim} row width: "${row}"`).toBe(GRID_SIZE);
            for (const ch of row) {
              expect(ch === "." || ch in PALETTE, `${stage}/${anim} char "${ch}"`).toBe(true);
            }
          }
        }
      }
    }
  });

  it("renders SVG rects with run-length encoding", () => {
    const svg = gridToSvgRects(SPRITES.chick.idle[0], 4);
    expect(svg).toContain("<rect");
    expect(svg).toContain(PALETTE.b);
    // The 6-wide outline on row 2 should be one rect, not six.
    expect(svg).toContain('width="24"');
  });
});
