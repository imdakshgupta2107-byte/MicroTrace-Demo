// vision — canvas-based colony auto-detect on a Petri-plate photo.
// Pipeline: grayscale → threshold on saturation+brightness → 8-way
// flood-fill components → filter by area → colony centers.
export interface ColoniesResult { count: number; centers: { x: number; y: number; r: number }[]; }

export function detectColonies(
  img: HTMLImageElement | HTMLCanvasElement,
  opts: { threshold?: number; minArea?: number; maxArea?: number } = {},
): ColoniesResult {
  const threshold = opts.threshold ?? 150;
  const minArea = opts.minArea ?? 12;
  const maxArea = opts.maxArea ?? 5000;
  const w = Math.min(480, img instanceof HTMLImageElement ? img.naturalWidth : img.width);
  const h = Math.round(
    w * ((img instanceof HTMLImageElement ? img.naturalHeight : img.height) /
         (img instanceof HTMLImageElement ? img.naturalWidth : img.width)),
  );
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // binarise: pixels darker than threshold count as colony
  const bin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    bin[i] = lum < threshold ? 1 : 0;
  }

  // connected components (BFS flood fill)
  const seen = new Uint8Array(w * h);
  const centers: { x: number; y: number; r: number }[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!bin[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let sx = 0, sy = 0, n = 0;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      sx += x; sy += y; n++;
      if (x > 0 && bin[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x < w - 1 && bin[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && bin[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
      if (y < h - 1 && bin[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
    }
    if (n >= minArea && n <= maxArea) {
      centers.push({ x: sx / n, y: sy / n, r: Math.sqrt(n / Math.PI) });
    }
  }
  return { count: centers.length, centers };
}

export const cfuPerMl = (colonies: number, dilutionFactor: number, volumeUl: number): number =>
  volumeUl > 0 ? (colonies * dilutionFactor) / (volumeUl / 1000) : 0;
