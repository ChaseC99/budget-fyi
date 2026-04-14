import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import type { BudgetNode } from "../data/types";
import { formatCurrency } from "../lib/format";
import { getCategoryColor } from "../lib/colors";
import styles from "./LeafTicker.module.css";

type CuratedTickerSpec =
  | { kind: "node"; id: string; title?: string }
  | { kind: "notable"; id: string };

const CURATED_TICKER_SPECS: CuratedTickerSpec[] = [
  { kind: "node", id: "interest-public-debt" },
  { kind: "node", id: "recreation-historic", title: "Historic Preservation Fund" },
  { kind: "node", id: "prisons-other" },
  { kind: "node", id: "education-libraries" },
  { kind: "node", id: "ag-other-science", title: "USDA Science" },
  { kind: "notable", id: "us-army" },
  { kind: "notable", id: "us-navy" },
  { kind: "notable", id: "us-air-force" },
  { kind: "notable", id: "us-space-force" },
  { kind: "notable", id: "b21-raider" },
  { kind: "notable", id: "columbia-class-submarine" },
  { kind: "notable", id: "air-force-f35a-42-aircraft" },
  { kind: "notable", id: "pact-act" },
  { kind: "notable", id: "post-911-gi-bill" },
  { kind: "notable", id: "brent-spence-bridge-corridor-project" },
  { kind: "notable", id: "hurricane-helene-recovery" },
  { kind: "notable", id: "artemis-campaign" },
  { kind: "notable", id: "iss" },
  { kind: "node", id: "k12-education", title: "K-12 Grants" },
  { kind: "node", id: "social-ccdf", title: "Child Care" },
  { kind: "node", id: "veterans-nca", title: "NCA" },
  { kind: "node", id: "farm-crop-insurance" },
  { kind: "node", id: "nsf", title: "National Science Foundation" },
];

export interface LeafTickerEntry {
  id: string;
  title: string;
  parentId: string;
  parentTitle: string;
  branchIndex: number;
  branchTitle: string;
  total: number;
  targetId: string;
  focusNotableId?: string;
}

interface LeafTickerProps {
  items: LeafTickerEntry[];
  getAmount: (total: number) => number;
  onSelect: (item: LeafTickerEntry) => void;
}

interface LocatedNode {
  node: BudgetNode;
  path: BudgetNode[];
}

interface LocatedNotable {
  notable: BudgetNode;
  host: BudgetNode;
  hostPath: BudgetNode[];
}

export function createCuratedTickerEntries(root: BudgetNode): LeafTickerEntry[] {
  const entries = CURATED_TICKER_SPECS.flatMap((spec) => {
    const entry = spec.kind === "node"
      ? buildNodeEntry(root, spec)
      : buildNotableEntry(root, spec);

    return entry ? [entry] : [];
  });

  return shuffle(entries);
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

function buildNodeEntry(
  root: BudgetNode,
  spec: Extract<CuratedTickerSpec, { kind: "node" }>,
): LeafTickerEntry | null {
  const located = findNodePath(root, spec.id);

  if (!located) {
    return null;
  }

  const { node, path } = located;
  const parent = path[path.length - 2];

  if (!parent) {
    return null;
  }

  return {
    id: node.id,
    title: spec.title ?? node.title,
    parentId: parent.id,
    parentTitle: parent.title,
    branchIndex: getBranchIndex(root, path),
    branchTitle: path[1]?.title ?? root.title,
    total: node.total,
    targetId: node.categories?.length ? node.id : parent.id,
  };
}

function buildNotableEntry(
  root: BudgetNode,
  spec: Extract<CuratedTickerSpec, { kind: "notable" }>,
): LeafTickerEntry | null {
  const located = findNotable(root, spec.id);

  if (!located) {
    return null;
  }

  const { notable, host, hostPath } = located;

  return {
    id: notable.id,
    title: notable.title,
    parentId: host.id,
    parentTitle: host.title,
    branchIndex: getBranchIndex(root, hostPath),
    branchTitle: hostPath[1]?.title ?? root.title,
    total: notable.total,
    targetId: host.id,
    focusNotableId: notable.id,
  };
}

function findNodePath(root: BudgetNode, targetId: string): LocatedNode | null {
  if (root.id === targetId) {
    return { node: root, path: [root] };
  }

  for (const child of root.categories ?? []) {
    const located = findNodePath(child, targetId);

    if (located) {
      return {
        node: located.node,
        path: [root, ...located.path],
      };
    }
  }

  return null;
}

function findNotable(
  root: BudgetNode,
  targetId: string,
  path: BudgetNode[] = [root],
): LocatedNotable | null {
  const notable = root.notableExpenses?.find((item) => item.id === targetId);

  if (notable) {
    return {
      notable,
      host: root,
      hostPath: path,
    };
  }

  for (const child of root.categories ?? []) {
    const located = findNotable(child, targetId, [...path, child]);

    if (located) {
      return located;
    }
  }

  return null;
}

function getBranchIndex(root: BudgetNode, path: BudgetNode[]) {
  const branchId = path[1]?.id;

  if (!branchId) {
    return 0;
  }

  const branchIndex = root.categories?.findIndex((node) => node.id === branchId) ?? -1;
  return branchIndex >= 0 ? branchIndex : 0;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}
