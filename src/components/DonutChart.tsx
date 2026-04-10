import {
  useState,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useEffect,
} from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { arc as d3arc } from "d3-shape";
import type { BudgetNode } from "../data/types";
import { useDonutGeometry, type ArcDatum } from "../hooks/useDonutGeometry";
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
  centerBreakdownItems?: { label: string; value: number; tooltip?: string }[];
}

export interface DonutChartHandle {
  selectNode: (child: BudgetNode) => void;
}

type Phase = "idle" | "expanding" | "splitting";

interface ChartLayout {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  outerRadius: number;
  innerRadius: number;
  labelMaxWidth: number;
  labelFontSize: number;
  labelMinFontSize: number;
  labelLineHeightMultiplier: number;
}

interface DirectLabelDatum {
  id: string;
  title: string;
  x: number;
  y: number;
  lines: string[];
  color: string;
  fontSize: number;
  lineHeight: number;
}

const TWO_PI = Math.PI * 2;
const EXPAND_MS = 400;
const SPLIT_MS = 350;
const LABEL_FADE_MS = 180;
const LABEL_SHARE_THRESHOLD = 0.1;

function buildPath(
  start: number,
  end: number,
  innerRadius: number,
  outerRadius: number,
): string {
  const arcGen = d3arc<{ startAngle: number; endAngle: number }>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .cornerRadius(3);

  if (end - start >= TWO_PI - 0.01) {
    return arcGen({ startAngle: 0, endAngle: TWO_PI }) ?? "";
  }

  return arcGen({ startAngle: start, endAngle: end }) ?? "";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeLayout(containerWidth: number): ChartLayout {
  const width = clamp(containerWidth || 520, 320, 760);
  const outerRadius = clamp(width * 0.39, 118, 250);
  const innerRadius = Math.round(outerRadius * 0.58);
  const paddingY = clamp(width * 0.026, 6, 16);
  const height = Math.round(outerRadius * 2 + paddingY * 2);
  const labelMaxWidth = clamp(outerRadius * 0.7, 72, 132);
  const labelFontSize = clamp(width * 0.024, 10, 12.75);
  const labelMinFontSize = clamp(width * 0.017, 7.25, 9.5);
  const labelLineHeightMultiplier = 1.22;

  return {
    width,
    height,
    centerX: width / 2,
    centerY: height / 2,
    outerRadius,
    innerRadius,
    labelMaxWidth,
    labelFontSize,
    labelMinFontSize,
    labelLineHeightMultiplier,
  };
}

function splitLabelToLineCount(title: string, targetLineCount: number): string[] {
  const normalized = title.trim().replace(/\s+/g, " ");
  if (targetLineCount <= 1 || normalized.length <= 14) return [normalized];

  const words = normalized.split(" ");
  if (words.length === 1) return [normalized];
  if (targetLineCount >= words.length) return words;

  let best = [normalized];
  let bestScore = Number.POSITIVE_INFINITY;

  if (targetLineCount === 2) {
    for (let i = 1; i < words.length; i += 1) {
      const first = words.slice(0, i).join(" ");
      const second = words.slice(i).join(" ");
      const longest = Math.max(first.length, second.length);
      const shortest = Math.min(first.length, second.length);
      const score = longest * 2 + (longest - shortest);

      if (score < bestScore) {
        best = [first, second];
        bestScore = score;
      }
    }

    return best;
  }

  for (let i = 1; i < words.length - 1; i += 1) {
    for (let j = i + 1; j < words.length; j += 1) {
      const lines = [
        words.slice(0, i).join(" "),
        words.slice(i, j).join(" "),
        words.slice(j).join(" "),
      ];
      const lengths = lines.map((line) => line.length);
      const longest = Math.max(...lengths);
      const shortest = Math.min(...lengths);
      const score = longest * 2 + (longest - shortest);

      if (score < bestScore) {
        best = lines;
        bestScore = score;
      }
    }
  }

  return best;
}

function estimateTextWidth(line: string, fontSize: number): number {
  return line.length * fontSize * 0.58;
}

function fitDirectLabel(
  arcDatum: ArcDatum,
  title: string,
  layout: ChartLayout,
  depth: number,
): { lines: string[]; fontSize: number; lineHeight: number } | null {
  const radialThickness = layout.outerRadius - layout.innerRadius;
  const labelRadius = Math.hypot(arcDatum.labelX, arcDatum.labelY);
  const chordLength = 2 * labelRadius * Math.sin(arcDatum.span / 2);
  const edgePadding = Math.max(12, radialThickness * 0.18);
  const chordWidthBudget = Math.min(
    layout.labelMaxWidth,
    Math.max(28, chordLength - edgePadding * 2),
  );
  const sideBias = Math.abs(arcDatum.labelX) / Math.max(labelRadius, 1);
  const radialWidthBudget = Math.max(28, radialThickness - edgePadding * 1.35);
  const availableWidth =
    sideBias > 0.72
      ? Math.min(chordWidthBudget, radialWidthBudget)
      : chordWidthBudget;
  const availableHeight = radialThickness - 6;
  const normalized = title.trim().replace(/\s+/g, " ");
  const words = normalized.split(" ");
  const prefersThreeLines = normalized.length > 18 || words.length >= 3;
  const fontSizes: number[] = [];

  for (
    let fontSize = layout.labelFontSize;
    fontSize >= layout.labelMinFontSize;
    fontSize -= 0.6
  ) {
    fontSizes.push(Number(fontSize.toFixed(2)));
  }

  if (fontSizes[fontSizes.length - 1] !== layout.labelMinFontSize) {
    fontSizes.push(layout.labelMinFontSize);
  }

  for (const fontSize of fontSizes) {
    const lineCounts = prefersThreeLines ? [3, 2] : [2, 3];

    for (const lineCount of lineCounts) {
      const lines = splitLabelToLineCount(title, lineCount);
      const textWidth = Math.max(...lines.map((line) => estimateTextWidth(line, fontSize)));
      const lineHeight = fontSize * layout.labelLineHeightMultiplier;
      const textHeight = lines.length * lineHeight;

      if (textWidth <= availableWidth && textHeight <= availableHeight) {
        return { lines, fontSize, lineHeight };
      }
    }
  }

  if (depth === 0) {
    const fallbackFontSize = Math.max(layout.labelMinFontSize - 0.35, 7);
    const fallbackLines = splitLabelToLineCount(title, 2);
    return {
      lines: fallbackLines,
      fontSize: fallbackFontSize,
      lineHeight: fallbackFontSize * layout.labelLineHeightMultiplier,
    };
  }

  if (prefersThreeLines) {
    const fallbackFontSize = layout.labelMinFontSize;
    const fallbackLines = splitLabelToLineCount(title, 3);
    return {
      lines: fallbackLines,
      fontSize: fallbackFontSize,
      lineHeight: fallbackFontSize * layout.labelLineHeightMultiplier,
    };
  }

  return null;
}

function isDarkColor(color: string): boolean {
  const rgb = color.match(/\d+(\.\d+)?/g);
  if (!rgb || rgb.length < 3) return false;

  const [r, g, b] = rgb.slice(0, 3).map(Number);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.58;
}

export const DonutChart = forwardRef<DonutChartHandle, DonutChartProps>(
  function DonutChart(
    { node, parentIndex, depth, onSelect, centerAmount, centerLabel, centerBreakdownItems },
    ref,
  ) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(420);
    const layout = useMemo(() => computeLayout(containerWidth), [containerWidth]);
    const arcs = useDonutGeometry(node, layout.innerRadius, layout.outerRadius);
    const [phase, setPhase] = useState<Phase>("idle");
    const phaseRef = useRef<Phase>("idle");
    const overlayColor = useRef("#ccc");

    const mvStart = useMotionValue(0);
    const mvEnd = useMotionValue(TWO_PI);
    const overlayPath = useTransform(() =>
      buildPath(mvStart.get(), mvEnd.get(), layout.innerRadius, layout.outerRadius),
    );

    useEffect(() => {
      const element = wrapperRef.current;
      if (!element) return;

      const measure = () => {
        setContainerWidth(element.getBoundingClientRect().width || 420);
      };

      measure();

      const observer = new ResizeObserver(() => {
        measure();
      });

      observer.observe(element);
      return () => observer.disconnect();
    }, []);

    const getArcColor = useCallback(
      (arcDatum: ArcDatum) =>
        depth === 0
          ? getCategoryColor(arcDatum.index)
          : getChildColor(parentIndex ?? 0, arcDatum.index, arcs.length),
      [arcs.length, depth, parentIndex],
    );

    const directLabels = useMemo(() => {
      return arcs
        .filter(
          (arcDatum) =>
            arcDatum.node.total > 0 &&
            arcDatum.span > 0 &&
            arcDatum.share >= LABEL_SHARE_THRESHOLD,
        )
        .map((arcDatum) => {
          const color = getArcColor(arcDatum);
          const fit = fitDirectLabel(arcDatum, arcDatum.node.title, layout, depth);
          if (!fit) return null;

          return {
            id: arcDatum.node.id,
            title: arcDatum.node.title,
            x: arcDatum.labelX,
            y: arcDatum.labelY,
            lines: fit.lines,
            color: isDarkColor(color) ? styles.labelOnDark : styles.labelOnLight,
            fontSize: fit.fontSize,
            lineHeight: fit.lineHeight,
          } satisfies DirectLabelDatum;
        })
        .filter((label): label is DirectLabelDatum => Boolean(label));
    }, [arcs, getArcColor, layout]);

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

    useImperativeHandle(
      ref,
      () => ({
        selectNode: (child: BudgetNode) => {
          const match = arcs.find((arcDatum) => arcDatum.node.id === child.id);
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
    const showLabels = currentPhase === "idle";

    return (
      <div
        ref={wrapperRef}
        className={styles.wrapper}
        style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
      >
        <svg
          className={styles.svg}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-label={`Donut chart showing breakdown of ${node.title}`}
          role="img"
        >
          <g transform={`translate(${layout.centerX} ${layout.centerY})`}>
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
                  const color = getArcColor(arcDatum);
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
                        if (e.key === "Enter" || e.key === " ") {
                          startExpand(arcDatum.node, color, arcDatum.startAngle, arcDatum.endAngle);
                        }
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

            {showLabels && (
              <g className={styles.directLabelLayer} aria-hidden="true">
                {directLabels.map((label, labelIndex) => {
                  const lineOffsets =
                    label.lines.length > 1
                      ? label.lines.map(
                          (_line, index) =>
                            (index - (label.lines.length - 1) / 2) * label.lineHeight,
                        )
                      : [0];

                  return (
                    <motion.g
                      key={label.id}
                      className={`${styles.directLabel} ${label.color}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: LABEL_FADE_MS / 1000,
                        delay: labelIndex * 0.04,
                        ease: "easeOut",
                      }}
                    >
                      {label.lines.map((line, index) => (
                        <text
                          key={`${label.id}-${index}`}
                          x={label.x}
                          y={label.y + lineOffsets[index]}
                          textAnchor="middle"
                          className={styles.directLabelText}
                          style={{ fontSize: `${label.fontSize}px` }}
                        >
                          {line}
                        </text>
                      ))}
                    </motion.g>
                  );
                })}
              </g>
            )}
          </g>
        </svg>
        <CenterLabel
          amount={centerAmount}
          label={centerLabel}
          breakdownItems={centerBreakdownItems}
        />
      </div>
    );
  },
);
