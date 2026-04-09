import { motion, AnimatePresence } from "motion/react";
import type { BudgetNode } from "../data/types";
import type { NavDirection } from "../hooks/useBudgetNavigation";
import { formatCurrency, formatPercent } from "../lib/format";
import { getCategoryColor, getChildColor } from "../lib/colors";
import styles from "./ItemList.module.css";

interface ItemListProps {
  node: BudgetNode;
  parentIndex?: number;
  depth: number;
  direction: NavDirection;
  onSelect: (node: BudgetNode) => void;
  getAmount: (total: number) => number;
}

const SLIDE = 80;

const variants = {
  enter: (dir: NavDirection) => ({
    x: dir === "deeper" ? SLIDE : -SLIDE,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: NavDirection) => ({
    x: dir === "deeper" ? -SLIDE : SLIDE,
    opacity: 0,
  }),
};

export function ItemList({ node, parentIndex, depth, direction, onSelect, getAmount }: ItemListProps) {
  const categories = node.categories ?? [];
  const sorted = [...categories].sort((a, b) => b.total - a.total);

  return (
    <AnimatePresence mode="popLayout" custom={direction} initial={false}>
      <motion.div
        key={node.id}
        className={styles.list}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {sorted.map((cat) => {
          const originalIndex = categories.indexOf(cat);
          const color =
            depth === 0
              ? getCategoryColor(originalIndex)
              : getChildColor(parentIndex ?? 0, originalIndex, categories.length);
          const hasChildren = cat.categories && cat.categories.length > 0;
          const amount = getAmount(cat.total);

          return (
            <div
              key={cat.id}
              className={`${styles.row} ${!hasChildren ? styles.noChildren : ""}`}
              onClick={() => onSelect(cat)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(cat);
              }}
              tabIndex={0}
              role="button"
              aria-label={`${cat.title}: ${formatCurrency(amount)}`}
            >
              <span className={styles.dot} style={{ backgroundColor: color }} />
              <span className={styles.title}>{cat.title}</span>
              <span className={styles.leader} />
              <span className={styles.amount}>{formatCurrency(amount)}</span>
              <span className={styles.percent}>
                {formatPercent(cat.total, node.total)}
              </span>
            </div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
