// 17 distinct hues for top-level budget categories
const PALETTE = [
  "hsl(210, 65%, 50%)", // Social Security - blue
  "hsl(340, 65%, 50%)", // Health - rose
  "hsl(145, 55%, 40%)", // Defense - green
  "hsl(35, 80%, 50%)",  // Net Interest - orange
  "hsl(270, 55%, 55%)", // Income Security - purple
  "hsl(175, 55%, 42%)", // Veterans - teal
  "hsl(50, 75%, 48%)",  // Education - gold
  "hsl(15, 70%, 50%)",  // Transportation - red-orange
  "hsl(195, 60%, 48%)", // International - sky
  "hsl(250, 50%, 58%)", // Science/Space - indigo
  "hsl(120, 45%, 45%)", // Natural Resources - forest
  "hsl(0, 60%, 50%)",   // Justice - red
  "hsl(85, 50%, 45%)",  // Agriculture - olive
  "hsl(310, 45%, 52%)", // Community Dev - magenta
  "hsl(220, 40%, 55%)", // General Gov - slate blue
  "hsl(60, 55%, 45%)",  // Energy - yellow-green
  "hsl(190, 45%, 50%)", // Other - cyan
];

export function getCategoryColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export function getChildColor(parentIndex: number, childIndex: number, childCount: number): string {
  const base = PALETTE[parentIndex % PALETTE.length];
  const match = base.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return base;

  const h = parseInt(match[1]);
  const s = parseInt(match[2]);
  const l = parseInt(match[3]);

  // Spread children from lighter to darker around the parent lightness
  const range = 30;
  const step = childCount > 1 ? range / (childCount - 1) : 0;
  const childL = Math.max(25, Math.min(70, l - range / 2 + step * childIndex));

  return `hsl(${h}, ${s}%, ${Math.round(childL)}%)`;
}
