import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import budgetData from "../data/budget.json";
import type { BudgetNode } from "../data/types";
import { formatCurrency, formatPercent } from "../lib/format";
import { getCategoryColor } from "../lib/colors";
import {
  buildResultPath,
  buildSearchIndex,
  searchBudget,
  type SearchEntry,
} from "../lib/search";
import styles from "./SearchOverlay.module.css";

const rootNode = budgetData as BudgetNode;
const searchIndex = buildSearchIndex(rootNode);

interface SearchOverlayProps {
  open: boolean;
  currentPath: string;
  onClose: () => void;
}

export function SearchOverlay({ open, currentPath, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchBudget(searchIndex, query), [query]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setHighlightedIndex(0);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-search-trigger]")) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open, onClose]);

  function activate(entry: SearchEntry, e?: React.MouseEvent) {
    const href = buildResultPath(entry);

    if (currentPath === "/about") {
      window.location.href = href;
      return;
    }

    e?.preventDefault();

    const detail: {
      targetId: string;
      focusNotableId?: string;
      selectLeafId?: string;
    } = {
      targetId:
        entry.isNotableExpense || !entry.hasChildren
          ? entry.parentId
          : entry.node.id,
    };

    if (entry.isNotableExpense) {
      detail.focusNotableId = entry.node.id;
    } else if (!entry.hasChildren) {
      detail.selectLeafId = entry.node.id;
    }

    window.dispatchEvent(new CustomEvent("budget:navigate", { detail }));
    onClose();
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const target = results[highlightedIndex];
      if (target) {
        e.preventDefault();
        activate(target);
      }
    }
  }

  const trimmed = query.trim();

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-label="Search budget items"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <div className={styles.inputRow}>
            <svg className={styles.inputIcon} viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5L21 21" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              className={styles.input}
              placeholder="Search the budget…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              aria-label="Search query"
              aria-controls="search-results"
              autoComplete="off"
            />
          </div>
          {trimmed ? (
            results.length > 0 ? (
              <ul
                id="search-results"
                className={styles.results}
                role="listbox"
              >
                {results.map((entry, i) => (
                  <li
                    key={`${entry.parentId}::${entry.node.id}::${entry.isNotableExpense ? "n" : "c"}`}
                    role="option"
                    aria-selected={i === highlightedIndex}
                  >
                    <a
                      href={buildResultPath(entry)}
                      className={`${styles.row} ${i === highlightedIndex ? styles.highlighted : ""}`}
                      onClick={(e) => activate(entry, e)}
                      onMouseEnter={() => setHighlightedIndex(i)}
                    >
                      <span
                        className={styles.dot}
                        style={{ backgroundColor: getCategoryColor(entry.topLevelIndex) }}
                      />
                      <span className={styles.labelGroup}>
                        <span className={styles.title}>{entry.node.title}</span>
                        <span className={styles.leader} />
                      </span>
                      <span className={styles.amount}>
                        {formatCurrency(entry.node.total)}
                      </span>
                      <span className={styles.percent}>
                        {formatPercent(entry.node.total, rootNode.total)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.empty}>No matches for &ldquo;{query}&rdquo;</div>
            )
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
