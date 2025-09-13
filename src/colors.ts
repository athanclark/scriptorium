// Copyright (C) 2025  Athan Clark
import { lighten, darken } from "polished";

function isLightColor(color: string): boolean {
  // Create a dummy element to parse CSS color formats
  const ctx = document.createElement("canvas").getContext("2d");
  // @ts-ignore
  ctx.fillStyle = color;
  // @ts-ignore
  const computed = ctx.fillStyle;

  // Extract RGB values from the computed color
  const rgb = (computed.match(/\d+/g) || [0, 0, 0]).map(Number);
  const [r, g, b] = rgb;

  // Calculate luminance per WCAG formula
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Threshold: ~128 is midpoint (0 = black, 255 = white)
  return luminance > 128;
}

export function otherColor(color: string): string {
  const factor = 0.2
  return isLightColor(color)
    ? darken(factor, color)
    : lighten(factor, color);
}

export const iconBackgroundStyles = {
  padding: 4,
  textAlign: "center",
  width: 32,
  borderRadius: 10,
};

export const swatches = [
  "#cc6565",
  "#cca365",
  "#b7cc65",
  "#7acc65",
  "#65cc8e",
  "#65cccc",
  "#658ecc",
  "#7a65cc",
  "#b765cc",
  "#cc65a3",
  "#2F4F4F",
  "#8AA1A6",
  "#FFFFFF",
  "#A9745A",
];
