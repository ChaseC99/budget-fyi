import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { BudgetNode } from "../data/types";
import budgetData from "../data/budget.json";
import { formatCurrency } from "../lib/format";
import { useBudgetNavigation } from "../hooks/useBudgetNavigation";
import { computeUserShare, computeUserShareOfTotal } from "../lib/tax";
import { DonutChart, type DonutChartHandle } from "./DonutChart";
import { ItemList } from "./ItemList";
import { BackNav } from "./BackNav";
import { IncomeInput } from "./IncomeInput";
import { LeafTicker, createCuratedTickerEntries } from "./LeafTicker";
import styles from "./BudgetExplorer.module.css";

const rootNode = budgetData as BudgetNode;

function getSourceLabel(source?: string) {
  if (!source) {
    return null;
  }

  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return source;
  }
}

interface NotableExpenseCardProps {
  node: BudgetNode;
  amount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function NotableExpenseCard({ node, amount, isExpanded, onToggle }: NotableExpenseCardProps) {
  const sourceLabel = getSourceLabel(node.source);
  const details = node.details ?? node.desc;
  const hasAdditionalDetails = details !== node.desc;

  return (
    <div className={styles.notableCard}>
      <button
        type="button"
        className={styles.notableToggle}
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className={styles.notableTitleRow}>
          <div className={styles.notableTitle}>{node.title}</div>
          <div className={styles.notableAmount}>{formatCurrency(amount)}</div>
        </div>
        <div className={styles.notableSummary} title={node.desc}>{node.desc}</div>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            className={styles.notableExpanded}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {hasAdditionalDetails ? (
              <div className={styles.notableDetails} title={details}>
                {details}
              </div>
            ) : null}
            {node.source ? (
              <motion.a
                className={styles.contextSource}
                href={node.source}
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
  );
}

export function BudgetExplorer() {
  const [userTax, setUserTax] = useState(0);
  const [tickerItems] = useState(() => createCuratedTickerEntries(rootNode));
  const [selectedLeaf, setSelectedLeaf] = useState<BudgetNode | null>(null);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [expandedNotableId, setExpandedNotableId] = useState<string | null>(null);
  const [isNotableInfoPinned, setIsNotableInfoPinned] = useState(false);
  const [isNotableInfoHovered, setIsNotableInfoHovered] = useState(false);
  const expandAboutOnTickerNav = useRef(false);
  const pendingTickerNotableId = useRef<string | null>(null);
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
  const sourceLabel = useMemo(() => getSourceLabel(displayNode.source), [displayNode.source]);
  const notableExpenses = current.notableExpenses ?? [];

  // Find the index of the current node in its parent's categories (for child coloring)
  const parentIndex = useMemo(() => {
    if (!parent?.categories) return 0;
    return parent.categories.findIndex((c) => c.id === current.id);
  }, [parent, current]);

  useEffect(() => {
    setSelectedLeaf(null);
  }, [current.id]);

  useEffect(() => {
    setExpandedNotableId(null);
    setIsNotableInfoPinned(false);
    setIsNotableInfoHovered(false);
  }, [current.id]);

  useEffect(() => {
    if (expandAboutOnTickerNav.current) {
      setIsAboutExpanded(true);
      expandAboutOnTickerNav.current = false;
      return;
    }

    setIsAboutExpanded(false);
  }, [current.id]);

  useEffect(() => {
    if (!pendingTickerNotableId.current) {
      return;
    }

    if (notableExpenses.some((expense) => expense.id === pendingTickerNotableId.current)) {
      setExpandedNotableId(pendingTickerNotableId.current);
    }

    pendingTickerNotableId.current = null;
  }, [current.id, notableExpenses]);

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
    expandAboutOnTickerNav.current = true;
    pendingTickerNotableId.current = item.focusNotableId ?? null;
    navigateToNode(item.targetId);
  }, [navigateToNode]);
  const isNotableInfoVisible = isNotableInfoPinned || isNotableInfoHovered;

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

      {notableExpenses.length > 0 ? (
        <>
          <div className={styles.divider} />
          <div className={styles.notableSection}>
            <div className={styles.notableHeaderRow}>
              <div className={styles.receiptHeader}>Notable Expenses</div>
              <div
                className={styles.notableInfoWrapper}
                onMouseEnter={() => setIsNotableInfoHovered(true)}
                onMouseLeave={() => setIsNotableInfoHovered(false)}
              >
                <button
                  type="button"
                  className={styles.notableInfoButton}
                  aria-label="About notable expenses"
                  aria-expanded={isNotableInfoVisible}
                  onFocus={() => setIsNotableInfoHovered(true)}
                  onBlur={() => setIsNotableInfoHovered(false)}
                  onClick={() => setIsNotableInfoPinned((pinned) => !pinned)}
                >
                  i
                </button>
                <AnimatePresence initial={false}>
                  {isNotableInfoVisible ? (
                    <motion.div
                      className={styles.notableTooltip}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      role="tooltip"
                    >
                      These callouts spotlight notable expenses that don&apos;t fit neatly into a
                      single category. The cost may be distributed across multiple parts of the
                      budget.
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
            <div className={styles.notableList}>
              {notableExpenses.map((expense) => (
                <NotableExpenseCard
                  key={expense.id}
                  node={expense}
                  amount={getAmount(expense.total)}
                  isExpanded={expandedNotableId === expense.id}
                  onToggle={() =>
                    setExpandedNotableId((currentExpanded) =>
                      currentExpanded === expense.id ? null : expense.id,
                    )
                  }
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
