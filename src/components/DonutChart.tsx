import { useState, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { arc as d3arc } from "d3-shape";
import type { BudgetNode } from "../data/types";
import { useDonutGeometry } from "../hooks/useDonutGeometry";
import { getCategoryColor, getChildColor } from "../lib/colors";
import { CenterLabel } from "./CenterLabel";
import styles from "./DonutChart.module.css";

interface DonutChartProps {
  node: BudgetNode;
  parentIndex?: number;
  depth: number;
  onSelect: (node: BudgetNode) => void;
  centerAmount: number;
  centerLabel: string;
}

export interface DonutChartHandle {
  selectNode: (child: BudgetNode) => void;
}

const SIZE = 200;
const OUTER = 90;
const INNER = 58;
const TWO_PI = Math.PI * 2;
const EXPAND_MS = 400;
const SPLIT_MS = 350;

const arcGen = d3arc<{ startAngle: number; endAngle: number }>()
  .innerRadius(INNER)
  .outerRadius(OUTER)
  .cornerRadius(3);

function buildPath(start: number, end: number): string {
  if (end - start >= TWO_PI - 0.01) {
    return arcGen({ startAngle: 0, endAngle: TWO_PI }) ?? "";
  }
  return arcGen({ startAngle: start, endAngle: end }) ?? "";
}

type Phase = "idle" | "expanding" | "splitting";

export const DonutChart = forwardRef<DonutChartHandle, DonutChartProps>(
  function DonutChart(
    { node, parentIndex, depth, onSelect, centerAmount, centerLabel },
    ref,
  ) {
    const arcs = useDonutGeometry(node, INNER, OUTER);
    const [phase, setPhase] = useState<Phase>("idle");
    const phaseRef = useRef<Phase>("idle");
    const overlayColor = useRef("#ccc");

    const mvStart = useMotionValue(0);
    const mvEnd = useMotionValue(TWO_PI);
    const overlayPath = useTransform(() => buildPath(mvStart.get(), mvEnd.get()));

    const startExpand = useCallback(
      (child: BudgetNode, color: string, startAngle: number, endAngle: number) => {
        if (!child.categories?.length) return;
        if (phaseRef.current !== "idle") return;

        phaseRef.current = "expanding";
        overlayColor.current = color;
        setPhase("expanding");

        mvStart.set(startAngle);
        mvEnd.set(endAngle);

        animate(mvStart, 0, { duration: EXPAND_MS / 1000, ease: "easeInOut" });
        animate(mvEnd, TWO_PI, {
          duration: EXPAND_MS / 1000,
          ease: "easeInOut",
          onComplete: () => {
            phaseRef.current = "splitting";
            setPhase("splitting");
          },
        });

        requestAnimationFrame(() => {
          onSelect(child);
        });
      },
      [mvStart, mvEnd, onSelect],
    );

    // Imperative handle so parent can trigger expand from receipt clicks
    useImperativeHandle(
      ref,
      () => ({
        selectNode: (child: BudgetNode) => {
          // Find the matching arc to get its color and angles
          const match = arcs.find((a) => a.node.id === child.id);
          if (!match) return;
          const color =
            depth === 0
              ? getCategoryColor(match.index)
              : getChildColor(parentIndex ?? 0, match.index, arcs.length);
          startExpand(child, color, match.startAngle, match.endAngle);
        },
      }),
      [arcs, depth, parentIndex, startExpand],
    );

    const onSplitDone = useCallback(() => {
      phaseRef.current = "idle";
      setPhase("idle");
    }, []);

    const currentPhase = phaseRef.current;
    const showOverlay = currentPhase === "expanding" || currentPhase === "splitting";
    const showArcs = currentPhase !== "expanding";

    return (
      <div className={styles.wrapper}>
        <svg
          className={styles.svg}
          viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`}
          aria-label={`Donut chart showing breakdown of ${node.title}`}
          role="img"
        >
          {showOverlay && (
            <motion.path
              d={overlayPath}
              fill={overlayColor.current}
              stroke="white"
              strokeWidth={2}
            />
          )}

          {showArcs && (
            <g key={node.id}>
              {arcs.map((arcDatum, i) => {
                const color =
                  depth === 0
                    ? getCategoryColor(arcDatum.index)
                    : getChildColor(parentIndex ?? 0, arcDatum.index, arcs.length);
                const hasChildren = (arcDatum.node.categories?.length ?? 0) > 0;
                const isSplitting = currentPhase === "splitting";

                return (
                  <motion.path
                    key={arcDatum.node.id}
                    d={arcDatum.path}
                    fill={color}
                    stroke="white"
                    strokeWidth={2}
                    initial={isSplitting ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: isSplitting ? SPLIT_MS / 1000 : 0,
                      delay: isSplitting ? 0.05 + i * 0.02 : 0,
                      ease: "easeOut",
                    }}
                    onAnimationComplete={
                      isSplitting && i === arcs.length - 1 ? onSplitDone : undefined
                    }
                    onClick={() =>
                      startExpand(arcDatum.node, color, arcDatum.startAngle, arcDatum.endAngle)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        startExpand(arcDatum.node, color, arcDatum.startAngle, arcDatum.endAngle);
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${arcDatum.node.title}: ${arcDatum.node.total}`}
                    style={{
                      cursor: hasChildren ? "pointer" : "default",
                      outline: "none",
                    }}
                    whileHover={
                      hasChildren ? { scale: 1.04, transition: { duration: 0.15 } } : undefined
                    }
                    whileTap={hasChildren ? { scale: 0.97 } : undefined}
                  />
                );
              })}
            </g>
          )}
        </svg>
        <CenterLabel amount={centerAmount} label={centerLabel} />
      </div>
    );
  },
);
