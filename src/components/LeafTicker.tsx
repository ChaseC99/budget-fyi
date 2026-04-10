import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import type { BudgetNode } from "../data/types";
import { formatCurrency } from "../lib/format";
import { getCategoryColor } from "../lib/colors";
import styles from "./LeafTicker.module.css";

const DEFAULT_SAMPLE_SIZE = 10;

export interface LeafTickerEntry {
  id: string;
  title: string;
  parentId: string;
  parentTitle: string;
  branchIndex: number;
  branchTitle: string;
  total: number;
}

interface LeafTickerProps {
  items: LeafTickerEntry[];
  getAmount: (total: number) => number;
  onSelect: (item: LeafTickerEntry) => void;
}

interface WalkMeta {
  branchIndex: number;
  branchTitle: string;
  parentId: string;
  parentTitle: string;
}

export function createLeafTickerSample(
  root: BudgetNode,
  sampleSize: number = DEFAULT_SAMPLE_SIZE,
): LeafTickerEntry[] {
  const entries = collectLeafTickerEntries(root);

  if (entries.length <= sampleSize) {
    return shuffle(entries);
  }

  const threshold = getPreferredThreshold(entries);
  const groups = shuffle(Array.from(groupByBranch(entries).values()))
    .map((branchEntries) => [...branchEntries].sort((a, b) => a.total - b.total));
  const picks: LeafTickerEntry[] = [];
  const usedIds = new Set<string>();
  const usedParents = new Set<string>();

  for (let round = 0; picks.length < sampleSize; round += 1) {
    let addedThisRound = false;

    for (const group of groups) {
      const candidate = pickBranchCandidate(group, usedIds, usedParents, threshold, round);

      if (!candidate) {
        continue;
      }

      picks.push(candidate);
      usedIds.add(candidate.id);
      usedParents.add(candidate.parentId);
      addedThisRound = true;

      if (picks.length === sampleSize) {
        break;
      }
    }

    if (!addedThisRound) {
      break;
    }
  }

  if (picks.length < sampleSize) {
    const fallback = entries
      .filter(({ id }) => !usedIds.has(id))
      .sort((a, b) => a.total - b.total);

    for (const entry of fallback) {
      picks.push(entry);

      if (picks.length === sampleSize) {
        break;
      }
    }
  }

  return shuffle(picks);
}

export function LeafTicker({ items, getAmount, onSelect }: LeafTickerProps) {
  const prefersReducedMotion = useReducedMotion();

  if (items.length === 0) {
    return null;
  }

  const renderItems = (copyId: string, interactive: boolean): ReactNode =>
    items.map((item) => {
      const style = {
        "--ticker-color": getCategoryColor(item.branchIndex),
      } as CSSProperties;

      if (!interactive) {
        return (
          <span
            key={`${copyId}-${item.id}`}
            className={styles.item}
            style={style}
            aria-hidden="true"
          >
            <span className={styles.value}>{formatCurrency(getAmount(item.total))}</span>
            <span className={styles.title}>{item.title}</span>
            <span className={styles.separator} aria-hidden="true">|</span>
            <span className={styles.parent}>{item.parentTitle}</span>
          </span>
        );
      }

      return (
        <button
          key={`${copyId}-${item.id}`}
          type="button"
          className={styles.item}
          style={style}
          onClick={() => onSelect(item)}
          aria-label={`${item.title} in ${item.parentTitle}`}
        >
          <span className={styles.value}>{formatCurrency(getAmount(item.total))}</span>
          <span className={styles.title}>{item.title}</span>
          <span className={styles.separator} aria-hidden="true">|</span>
          <span className={styles.parent}>{item.parentTitle}</span>
        </button>
      );
    });

  if (prefersReducedMotion) {
    return (
      <div className={styles.staticViewport} aria-label="Budget detail ticker">
        <div className={styles.staticRow}>{renderItems("static", true)}</div>
      </div>
    );
  }

  return (
    <div className={styles.viewport} aria-label="Budget detail ticker">
      <div className={styles.track}>
        <div className={styles.segment}>{renderItems("primary", true)}</div>
        <div className={styles.segment} aria-hidden="true">
          {renderItems("duplicate", false)}
        </div>
      </div>
    </div>
  );
}

function collectLeafTickerEntries(root: BudgetNode): LeafTickerEntry[] {
  const branches = root.categories ?? [];

  return branches.flatMap((branch, branchIndex) =>
    walkLeaves(branch, {
      branchIndex,
      branchTitle: branch.title,
      parentId: root.id,
      parentTitle: root.title,
    }),
  );
}

function walkLeaves(node: BudgetNode, meta: WalkMeta): LeafTickerEntry[] {
  const categories = node.categories ?? [];

  if (categories.length === 0) {
    if (node.total <= 0) {
      return [];
    }

    return [
      {
        id: node.id,
        title: node.title,
        parentId: meta.parentId,
        parentTitle: meta.parentTitle,
        branchIndex: meta.branchIndex,
        branchTitle: meta.branchTitle,
        total: node.total,
      },
    ];
  }

  return categories.flatMap((child) =>
    walkLeaves(child, {
      branchIndex: meta.branchIndex,
      branchTitle: meta.branchTitle,
      parentId: node.id,
      parentTitle: node.title,
    }),
  );
}

function groupByBranch(entries: LeafTickerEntry[]) {
  const groups = new Map<number, LeafTickerEntry[]>();

  for (const entry of entries) {
    const branchEntries = groups.get(entry.branchIndex) ?? [];
    branchEntries.push(entry);
    groups.set(entry.branchIndex, branchEntries);
  }

  return groups;
}

function getPreferredThreshold(entries: LeafTickerEntry[]) {
  const totals = entries.map(({ total }) => total).sort((a, b) => a - b);
  return totals[Math.floor(totals.length * 0.75)] ?? totals[totals.length - 1] ?? Infinity;
}

function pickBranchCandidate(
  group: LeafTickerEntry[],
  usedIds: Set<string>,
  usedParents: Set<string>,
  threshold: number,
  round: number,
) {
  const available = group.filter(({ id }) => !usedIds.has(id));

  if (available.length === 0) {
    return null;
  }

  const withFreshParent = available.filter(({ parentId }) => !usedParents.has(parentId));
  const basePool = withFreshParent.length > 0 ? withFreshParent : available;
  const preferredPool = basePool.filter(({ total }) => total <= threshold);
  const sortedBase = [...basePool].sort((a, b) => a.total - b.total);
  const limitedPool =
    preferredPool.length >= Math.min(3, basePool.length)
      ? [...preferredPool].sort((a, b) => a.total - b.total)
      : sortedBase.slice(0, Math.max(1, Math.ceil(sortedBase.length * 0.7)));
  const bias = round === 0 ? 1.8 : 1.2;
  const index = Math.min(
    limitedPool.length - 1,
    Math.floor(Math.pow(Math.random(), bias) * limitedPool.length),
  );

  return limitedPool[index] ?? limitedPool[0] ?? null;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}
