import { motion } from "motion/react";
import type { BudgetNode } from "../data/types";

interface ArcSegmentProps {
  path: string;
  color: string;
  node: BudgetNode;
  onSelect: (node: BudgetNode) => void;
}

export function ArcSegment({ path, color, node, onSelect }: ArcSegmentProps) {
  return (
    <motion.path
      d={path}
      fill={color}
      stroke="white"
      strokeWidth={2}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onClick={() => onSelect(node)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(node);
      }}
      tabIndex={0}
      role="button"
      aria-label={`${node.title}: ${node.total}`}
      style={{ cursor: node.categories?.length ? "pointer" : "default", outline: "none" }}
      whileHover={{ scale: 1.04, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.97 }}
    />
  );
}
