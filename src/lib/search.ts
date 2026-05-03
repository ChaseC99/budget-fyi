import type { BudgetNode } from "../data/types";

export interface SearchEntry {
  node: BudgetNode;
  path: BudgetNode[];
  isNotableExpense: boolean;
  topLevelIndex: number;
  parentId: string;
  hasChildren: boolean;
  titleLower: string;
}

export function buildSearchIndex(root: BudgetNode): SearchEntry[] {
  const entries: SearchEntry[] = [];

  function walk(node: BudgetNode, ancestors: BudgetNode[], topLevelIndex: number) {
    const categories = node.categories ?? [];
    categories.forEach((child, index) => {
      const childTopLevelIndex = ancestors.length === 0 ? index : topLevelIndex;
      const path = [...ancestors, node, child];
      entries.push({
        node: child,
        path,
        isNotableExpense: false,
        topLevelIndex: childTopLevelIndex,
        parentId: node.id,
        hasChildren: !!(child.categories && child.categories.length > 0),
        titleLower: child.title.toLowerCase(),
      });
      walk(child, [...ancestors, node], childTopLevelIndex);
    });

    for (const expense of node.notableExpenses ?? []) {
      entries.push({
        node: expense,
        path: [...ancestors, node, expense],
        isNotableExpense: true,
        topLevelIndex,
        parentId: node.id,
        hasChildren: false,
        titleLower: expense.title.toLowerCase(),
      });
    }
  }

  walk(root, [], 0);
  return entries;
}

export function searchBudget(index: SearchEntry[], query: string, limit = 50): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches = index.filter((entry) => entry.titleLower.includes(q));

  matches.sort((a, b) => {
    const aExact = a.titleLower === q ? 0 : 1;
    const bExact = b.titleLower === q ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;

    const aStarts = a.titleLower.startsWith(q) ? 0 : 1;
    const bStarts = b.titleLower.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;

    return b.node.total - a.node.total;
  });

  return matches.slice(0, limit);
}

export function buildResultPath(entry: SearchEntry): string {
  if (entry.hasChildren) {
    const segments = entry.path.slice(1).map((n) => encodeURIComponent(n.id));
    return segments.length > 0 ? `/${segments.join("/")}` : "/";
  }

  const parentSegments = entry.path.slice(1, -1).map((n) => encodeURIComponent(n.id));
  const basePath = parentSegments.length > 0 ? `/${parentSegments.join("/")}` : "/";
  const param = entry.isNotableExpense ? "notable" : "leaf";
  return `${basePath}?${param}=${encodeURIComponent(entry.node.id)}`;
}
