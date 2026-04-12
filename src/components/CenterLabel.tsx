import { motion, AnimatePresence } from "motion/react";
import { formatCurrency, formatCurrencyFull } from "../lib/format";
import styles from "./CenterLabel.module.css";

interface CenterBreakdownItem {
  label: string;
  value: number;
  tooltip?: string;
}

interface CenterSelectionItem {
  amount: number;
  label: string;
}

interface CenterLabelProps {
  amount: number;
  label: string;
  selectedItem?: CenterSelectionItem;
  breakdownItems?: CenterBreakdownItem[];
}

export function CenterLabel({
  amount,
  label,
  selectedItem,
  breakdownItems = [],
}: CenterLabelProps) {
  const hasBreakdown = breakdownItems.length > 0;

  return (
    <div className={styles.container}>
      <motion.div
        className={`${styles.content} ${hasBreakdown ? styles.contentWithBreakdown : ""}`}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, layout: { duration: 0.24, ease: "easeInOut" } }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${label}-${amount}`}
            className={styles.primary}
            layout="position"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, layout: { duration: 0.24, ease: "easeInOut" } }}
          >
            <div className={styles.amount}>{formatCurrency(amount)}</div>
            <div className={styles.label}>{label}</div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {selectedItem ? (
            <motion.div
              key={`${selectedItem.label}-${selectedItem.amount}`}
              className={styles.selectedItem}
              layout="position"
              initial={{ height: 0, marginTop: 0 }}
              animate={{ height: "auto", marginTop: 10 }}
              exit={{ height: 0, marginTop: 0 }}
              transition={{ duration: 0.24, ease: "easeInOut", layout: { duration: 0.24, ease: "easeInOut" } }}
            >
              <motion.div
                className={styles.selectedInner}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <div className={styles.selectedAmount}>{formatCurrency(selectedItem.amount)}</div>
                <div className={styles.selectedLabel}>{selectedItem.label}</div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {hasBreakdown ? (
          <div className={styles.breakdown} aria-label="Tax and debt share breakdown">
            {breakdownItems.map((item) => (
              <div key={item.label} className={styles.breakdownItem}>
                <div className={styles.breakdownTopline}>
                  <span className={styles.breakdownLabel}>{item.label}</span>
                </div>
                <div className={styles.breakdownValue}>
                  {formatCurrencyFull(item.value)}
                  {item.tooltip ? (
                    <span className={styles.infoGroup}>
                      <button
                        type="button"
                        className={styles.infoButton}
                        aria-label={`Explain ${item.label.toLowerCase()}`}
                      >
                        i
                      </button>
                      <span role="tooltip" className={styles.tooltip}>
                        {item.tooltip.split("\n").map((line, i) => (
                          <span key={i}>{line}<br /></span>
                        ))}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
