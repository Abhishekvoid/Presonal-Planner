/**
 * Bridges the themed CSS color tokens (see app/globals.css) into WebGL.
 * Shaders can't read CSS vars, so we sample the computed triplet and hand
 * shaders a normalized [r,g,b]. Re-read whenever the theme flips.
 */

export type RGB = [number, number, number];

export function readRGB(varName: string, fallback: RGB = [0, 0, 0]): RGB {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return fallback;
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) return fallback;
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
