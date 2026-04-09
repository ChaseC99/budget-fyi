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
import styles from "./BudgetExplorer.module.css";

export function BudgetExplorer() {
  const [income, setIncome] = useState(0);
  const donutRef = useRef<DonutChartHandle>(null);
  const { current, parent, drillDown, goBack, depth, isRoot, direction } =
    useBudgetNavigation(budgetData as BudgetNode);

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

  return (
    <div className={styles.explorer}>
      <IncomeInput
        income={income}
        onIncomeChange={setIncome}
        userTax={userTax}
        additionalDebt={additionalDebt}
        representedSpending={representedSpending}
      />

      <DonutChart
        ref={donutRef}
        node={current}
        parentIndex={parentIndex}
        depth={depth}
        onSelect={drillDown}
        centerAmount={centerAmount}
        centerLabel={isRoot ? (hasIncome ? "represented spending" : "total spending") : current.title}
      />

      <div className={styles.backSlot}>
        <AnimatePresence>
          {!isRoot && parent && (
            <BackNav parentTitle={parent.title} onBack={goBack} />
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
