import { useState, useCallback, useMemo, useRef } from "react";
import { AnimatePresence } from "motion/react";
import type { BudgetNode } from "../data/types";
import budgetData from "../data/budget.json";
import { useBudgetNavigation } from "../hooks/useBudgetNavigation";
import { computeFederalTax, computeUserShare, computeUserShareOfTotal } from "../lib/tax";
import { DonutChart, type DonutChartHandle } from "./DonutChart";
import { ItemList } from "./ItemList";
import { BackNav } from "./BackNav";
import { IncomeInput } from "./IncomeInput";
import { LeafTicker, createLeafTickerSample } from "./LeafTicker";
import styles from "./BudgetExplorer.module.css";

const rootNode = budgetData as BudgetNode;

export function BudgetExplorer() {
  const [income, setIncome] = useState(0);
  const [tickerItems] = useState(() => createLeafTickerSample(rootNode));
  const donutRef = useRef<DonutChartHandle>(null);
  const { current, parent, drillDown, goBack, navigateToNode, depth, isRoot, direction } =
    useBudgetNavigation(rootNode);

  const hasIncome = income > 0;
  const userTax = useMemo(() => (hasIncome ? computeFederalTax(income) : 0), [income, hasIncome]);
  const representedSpending = useMemo(
    () => (hasIncome ? computeUserShareOfTotal(userTax) : 0),
    [userTax, hasIncome],
  );
  const additionalDebt = useMemo(
    () => Math.max(0, representedSpending - userTax),
    [representedSpending, userTax],
  );
  const centerBreakdownItems = useMemo(
    () =>
      isRoot && hasIncome
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
    [additionalDebt, hasIncome, isRoot, userTax],
  );

  const getAmount = useCallback(
    (total: number) => (hasIncome ? computeUserShare(userTax, total) : total),
    [userTax, hasIncome],
  );

  const centerAmount = isRoot && hasIncome ? representedSpending : getAmount(current.total);

  // Find the index of the current node in its parent's categories (for child coloring)
  const parentIndex = useMemo(() => {
    if (!parent?.categories) return 0;
    return parent.categories.findIndex((c) => c.id === current.id);
  }, [parent, current]);

  const handleItemSelect = useCallback((child: BudgetNode) => {
    donutRef.current?.selectNode(child);
  }, []);

  const handleTickerSelect = useCallback((item: (typeof tickerItems)[number]) => {
    navigateToNode(item.parentId);
  }, [navigateToNode]);

  return (
    <div className={styles.explorer}>
      <IncomeInput
        onIncomeChange={setIncome}
      />

      <div className={styles.chartSlot}>
        <DonutChart
          ref={donutRef}
          node={current}
          parentIndex={parentIndex}
          depth={depth}
          onSelect={drillDown}
          centerAmount={centerAmount}
          centerLabel={isRoot ? (hasIncome ? "your contribution" : "total spending") : current.title}
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

      <div className={styles.divider} />

      <div className={styles.receiptNav}>
        <div className={styles.receiptHeader}>
          {current.title} Breakdown
        </div>
      </div>

      <ItemList
        node={current}
        parentIndex={parentIndex}
        depth={depth}
        direction={direction}
        onSelect={handleItemSelect}
        getAmount={getAmount}
      />
    </div>
  );
}
