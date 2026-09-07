import { PALETTE, type Grid } from "./palette";

interface DrawTarget {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
}

/** Draw a grid onto a canvas 2D context at integer pixel scale. */
export function drawGrid(
  ctx: DrawTarget,
  grid: Grid,
  x: number,
  y: number,
  scale: number,
  flipX = false,
): void {
  const w = grid[0].length;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < w; col++) {
      const key = grid[row][col];
      const color = PALETTE[key];
      if (!color) continue;
      const cx = flipX ? w - 1 - col : col;
      ctx.fillStyle = color;
      ctx.fillRect(x + cx * scale, y + row * scale, scale, scale);
    }
  }
}

/** Render a grid as SVG <rect> elements (for the badge and OG image). */
export function gridToSvgRects(grid: Grid, scale: number, offsetX = 0, offsetY = 0): string {
  const rects: string[] = [];
  for (let row = 0; row < grid.length; row++) {
    // Run-length encode horizontally to keep the SVG small.
    let col = 0;
    while (col < grid[row].length) {
      const key = grid[row][col];
      const color = PALETTE[key];
      if (!color) {
        col++;
        continue;
      }
      let run = 1;
      while (grid[row][col + run] === key) run++;
      rects.push(
        `<rect x="${offsetX + col * scale}" y="${offsetY + row * scale}" width="${run * scale}" height="${scale}" fill="${color}"/>`,
      );
      col += run;
    }
  }
  return rects.join("");
}
