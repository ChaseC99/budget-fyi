import { useState, useCallback, useRef } from "react";
import type { BudgetNode } from "../data/types";

export type NavDirection = "deeper" | "back";

export function useBudgetNavigation(root: BudgetNode) {
  const [stack, setStack] = useState<BudgetNode[]>([root]);
  const directionRef = useRef<NavDirection>("deeper");

  const current = stack[stack.length - 1];
  const parent = stack.length > 1 ? stack[stack.length - 2] : null;

  const drillDown = useCallback((child: BudgetNode) => {
    if (child.categories && child.categories.length > 0) {
      directionRef.current = "deeper";
      setStack((s) => [...s, child]);
    }
  }, []);

  const goBack = useCallback(() => {
    directionRef.current = "back";
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  return {
    current,
    parent,
    drillDown,
    goBack,
    depth: stack.length - 1,
    isRoot: stack.length === 1,
    direction: directionRef.current,
  };
}
