import { useState, useCallback, useRef, useEffect } from "react";
import type { BudgetNode } from "../data/types";

export type NavDirection = "deeper" | "back";
type HistorySyncMode = "push" | "replace" | "skip";

export function useBudgetNavigation(root: BudgetNode) {
  const [stack, setStack] = useState<BudgetNode[]>(() => getStackFromPath(root, getCurrentPath()));
  const directionRef = useRef<NavDirection>("deeper");
  const historySyncModeRef = useRef<HistorySyncMode>("replace");
  const stackRef = useRef(stack);

  const current = stack[stack.length - 1];
  const parent = stack.length > 1 ? stack[stack.length - 2] : null;

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  const updateStack = useCallback(
    (nextStack: BudgetNode[], historySyncMode: HistorySyncMode) => {
      setStack((currentStack) => {
        if (stacksMatch(currentStack, nextStack)) {
          return currentStack;
        }

        directionRef.current = getDirection(currentStack, nextStack);
        historySyncModeRef.current = historySyncMode;
        return nextStack;
      });
    },
    [],
  );

  const drillDown = useCallback((child: BudgetNode) => {
    if (child.categories && child.categories.length > 0) {
      updateStack([...stackRef.current, child], "push");
    }
  }, [updateStack]);

  const goBack = useCallback(() => {
    const nextStack =
      stackRef.current.length > 1 ? stackRef.current.slice(0, -1) : stackRef.current;

    updateStack(nextStack, "push");
  }, [updateStack]);

  const navigateToNode = useCallback((targetId: string) => {
    const path = findPathToNode(root, targetId);

    if (!path) {
      return;
    }

    const target = path[path.length - 1];
    const nextStack =
      target.categories && target.categories.length > 0 ? path : path.slice(0, -1);

    if (nextStack.length === 0) {
      return;
    }

    updateStack(nextStack, "push");
  }, [root, updateStack]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      const nextStack = getStackFromPath(root, window.location.pathname);
      updateStack(nextStack, "skip");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [root, updateStack]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextPath = getPathForStack(stack);
    const currentPath = window.location.pathname;
    const historySyncMode = historySyncModeRef.current;

    if (historySyncMode === "skip") {
      if (currentPath !== nextPath) {
        window.history.replaceState(null, "", nextPath);
      }

      historySyncModeRef.current = "push";
      return;
    }

    if (currentPath !== nextPath) {
      if (historySyncMode === "replace") {
        window.history.replaceState(null, "", nextPath);
      } else {
        window.history.pushState(null, "", nextPath);
      }
    }

    historySyncModeRef.current = "push";
  }, [stack]);

  return {
    current,
    parent,
    drillDown,
    goBack,
    navigateToNode,
    depth: stack.length - 1,
    isRoot: stack.length === 1,
    direction: directionRef.current,
  };
}

function getCurrentPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  return window.location.pathname;
}

function getPathForStack(stack: BudgetNode[]) {
  const segments = stack.slice(1).map((node) => encodeURIComponent(node.id));
  return segments.length > 0 ? `/${segments.join("/")}` : "/";
}

function getStackFromPath(root: BudgetNode, path: string): BudgetNode[] {
  const segments = path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  const stack = [root];
  let current = root;

  for (const segment of segments) {
    const child = current.categories?.find((node) => node.id === segment);

    if (!child?.categories?.length) {
      break;
    }

    stack.push(child);
    current = child;
  }

  return stack;
}

function getDirection(currentStack: BudgetNode[], nextStack: BudgetNode[]): NavDirection {
  return nextStack.length < currentStack.length ? "back" : "deeper";
}

function stacksMatch(a: BudgetNode[], b: BudgetNode[]) {
  return a.length === b.length && a.every((node, index) => node.id === b[index]?.id);
}

function findPathToNode(root: BudgetNode, targetId: string): BudgetNode[] | null {
  if (root.id === targetId) {
    return [root];
  }

  for (const child of root.categories ?? []) {
    const childPath = findPathToNode(child, targetId);

    if (childPath) {
      return [root, ...childPath];
    }
  }

  return null;
}
