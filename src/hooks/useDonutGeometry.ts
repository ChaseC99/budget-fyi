import { useMemo } from "react";
import { pie, arc } from "d3-shape";
import type { BudgetNode } from "../data/types";

export interface ArcDatum {
  node: BudgetNode;
  path: string;
  startAngle: number;
  endAngle: number;
  index: number;
  span: number;
  share: number;
  midAngle: number;
  labelX: number;
  labelY: number;
}

const MIN_ARC_ANGLE = 0.06; // ~3.4 degrees minimum for tap targets

export function useDonutGeometry(
  node: BudgetNode,
  innerRadius: number,
  outerRadius: number,
): ArcDatum[] {
  return useMemo(() => {
    const categories = node.categories ?? [];
    if (categories.length === 0) return [];

    const pieGen = pie<BudgetNode>()
      .value((d) => Math.max(0, d.total))
      .sort(null)
      .padAngle(0.02);

    const arcGen = arc<{ startAngle: number; endAngle: number }>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(3);

    const arcs = pieGen(categories);

    // Enforce minimum arc angle for small segments
    const adjusted = arcs.map((a) => {
      const span = a.endAngle - a.startAngle;
      if (span < MIN_ARC_ANGLE && span > 0) {
        return { ...a, endAngle: a.startAngle + MIN_ARC_ANGLE };
      }
      return a;
    });

    const labelRadius = innerRadius + (outerRadius - innerRadius) * 0.5;

    return adjusted.map((a, i) => {
      const startAngle = a.startAngle;
      const endAngle = a.endAngle;
      const span = endAngle - startAngle;
      const midAngle = (startAngle + endAngle) / 2;
      const labelX = Math.sin(midAngle) * labelRadius;
      const labelY = -Math.cos(midAngle) * labelRadius;

      return {
        node: categories[i],
        path: arcGen({ startAngle, endAngle }) ?? "",
        startAngle,
        endAngle,
        index: i,
        span,
        share: node.total === 0 ? 0 : categories[i].total / node.total,
        midAngle,
        labelX,
        labelY,
      };
    });
  }, [node, innerRadius, outerRadius]);
}
