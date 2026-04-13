import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { BudgetNode } from "../data/types";
import budgetData from "../data/budget.json";
import { useBudgetNavigation } from "../hooks/useBudgetNavigation";
import { computeUserShare, computeUserShareOfTotal } from "../lib/tax";
import { DonutChart, type DonutChartHandle } from "./DonutChart";
import { ItemList } from "./ItemList";
import { BackNav } from "./BackNav";
import { IncomeInput } from "./IncomeInput";
import { LeafTicker, createLeafTickerSample } from "./LeafTicker";
import styles from "./BudgetExplorer.module.css";

const rootNode = budgetData as BudgetNode;

export function BudgetExplorer() {
  const [userTax, setUserTax] = useState(0);
  const [tickerItems] = useState(() => createLeafTickerSample(rootNode));
  const [selectedLeaf, setSelectedLeaf] = useState<BudgetNode | null>(null);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const donutRef = useRef<DonutChartHandle>(null);
  const { current, parent, drillDown, goBack, navigateToNode, depth, isRoot, direction } =
    useBudgetNavigation(rootNode);

  const hasContribution = userTax > 0;
  const representedSpending = useMemo(
    () => (hasContribution ? computeUserShareOfTotal(userTax) : 0),
    [userTax, hasContribution],
  );
  const additionalDebt = useMemo(
    () => Math.max(0, representedSpending - userTax),
    [representedSpending, userTax],
  );
  const centerBreakdownItems = useMemo(
    () =>
      isRoot && hasContribution
        ? [
            { label: "Taxes", value: userTax },
            {
              label: "Debt share",
              value: additionalDebt,
              tooltip:
                "The US government spends more money than it earns, so part of the budget is funded by debt.\n\nThis is your share of that debt.\n\n(A rough estimate based on your tax contribution)",
            },
          ]
        : undefined,
    [additionalDebt, hasContribution, isRoot, userTax],
  );

  const getAmount = useCallback(
    (total: number) => (hasContribution ? computeUserShare(userTax, total) : total),
    [userTax, hasContribution],
  );

  const centerAmount = isRoot && hasContribution ? representedSpending : getAmount(current.total);
  const selectedCenterItem = selectedLeaf
    ? {
        amount: getAmount(selectedLeaf.total),
        label: selectedLeaf.title,
      }
    : undefined;
  const displayNode = selectedLeaf ?? current;
  const aboutSummary = displayNode.desc;
  const aboutDetails = displayNode.details ?? displayNode.desc;
  const hasAdditionalDetails = aboutDetails !== aboutSummary;
  const sourceLabel = useMemo(() => {
    if (!displayNode.source) {
      return null;
    }

    try {
      return new URL(displayNode.source).hostname.replace(/^www\./, "");
    } catch {
      return displayNode.source;
    }
  }, [displayNode.source]);

  // Find the index of the current node in its parent's categories (for child coloring)
  const parentIndex = useMemo(() => {
    if (!parent?.categories) return 0;
    return parent.categories.findIndex((c) => c.id === current.id);
  }, [parent, current]);

  useEffect(() => {
    setSelectedLeaf(null);
  }, [current.id]);

  useEffect(() => {
    setIsAboutExpanded(false);
  }, [current.id]);

  const handleItemSelect = useCallback((child: BudgetNode) => {
    if (child.categories && child.categories.length > 0) {
      setSelectedLeaf(null);
      donutRef.current?.selectNode(child);
      return;
    }

    setSelectedLeaf((selected) => (selected?.id === child.id ? null : child));
  }, []);

  const handleDonutSelect = useCallback((child: BudgetNode) => {
    if (child.categories && child.categories.length > 0) {
      setSelectedLeaf(null);
      drillDown(child);
      return;
    }

    setSelectedLeaf((selected) => (selected?.id === child.id ? null : child));
  }, [drillDown]);

  const handleTickerSelect = useCallback((item: (typeof tickerItems)[number]) => {
    setSelectedLeaf(null);
    navigateToNode(item.parentId);
  }, [navigateToNode]);

  return (
    <div className={styles.explorer}>
      <IncomeInput onTaxChange={setUserTax} />

      <div className={styles.chartSlot}>
        <DonutChart
          ref={donutRef}
          node={current}
          parentIndex={parentIndex}
          depth={depth}
          onSelect={handleDonutSelect}
          centerAmount={centerAmount}
          centerLabel={isRoot ? (hasContribution ? "your contribution" : "total spending") : current.title}
          selectedCenterItem={selectedCenterItem}
          centerBreakdownItems={centerBreakdownItems}
        />
      </div>

      <div className={styles.backSlot}>
        <AnimatePresence mode="wait" initial={false}>
          {isRoot ? (
            <LeafTicker
              key="ticker"
              items={tickerItems}
              getAmount={getAmount}
              onSelect={handleTickerSelect}
            />
          ) : parent ? (
            <BackNav key="back" parentTitle={parent.title} onBack={goBack} />
          ) : (
            null
          )}
        </AnimatePresence>
      </div>

      <div className={styles.contextCard} aria-live="polite">
        <button
          type="button"
          className={styles.contextToggle}
          onClick={() => setIsAboutExpanded((expanded) => !expanded)}
          aria-expanded={isAboutExpanded}
        >
          <div className={styles.contextHeader}>
            <div className={styles.contextEyebrow}>
              {`About ${displayNode.title}`}
            </div>
            <span
              className={`${styles.contextHintIcon} ${isAboutExpanded ? styles.contextHintIconExpanded : ""}`}
              aria-hidden="true"
            />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={displayNode.id}
              className={styles.contextBody}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              title={aboutSummary}
            >
              {aboutSummary}
            </motion.div>
          </AnimatePresence>
        </button>
        <AnimatePresence initial={false}>
          {isAboutExpanded ? (
            <motion.div
              className={styles.contextExpanded}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {hasAdditionalDetails ? (
                <div className={styles.contextDetails} title={aboutDetails}>
                  {aboutDetails}
                </div>
              ) : null}
              {displayNode.source ? (
                <motion.a
                  className={styles.contextSource}
                  href={displayNode.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  {sourceLabel ? `Source: ${sourceLabel}` : "View source data"}
                </motion.a>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className={styles.divider} />

      <div className={styles.receiptNav}>
        <div className={styles.receiptHeader}>
          {current.title} Breakdown
        </div>
      </div>

      <ItemList
        node={current}
        overallTotal={rootNode.total}
        parentIndex={parentIndex}
        depth={depth}
        direction={direction}
        onSelect={handleItemSelect}
        getAmount={getAmount}
        selectedNodeId={selectedLeaf?.id}
      />
    </div>
  );
}
