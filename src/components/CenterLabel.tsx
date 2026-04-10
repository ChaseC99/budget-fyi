import { motion, AnimatePresence } from "motion/react";
import { formatCurrency, formatCurrencyFull } from "../lib/format";
import styles from "./CenterLabel.module.css";

interface CenterBreakdownItem {
  label: string;
  value: number;
  tooltip?: string;
}

interface CenterLabelProps {
  amount: number;
  label: string;
  breakdownItems?: CenterBreakdownItem[];
}

export function CenterLabel({ amount, label, breakdownItems = [] }: CenterLabelProps) {
  const hasBreakdown = breakdownItems.length > 0;

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${label}-${amount}`}
          className={`${styles.content} ${hasBreakdown ? styles.contentWithBreakdown : ""}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <div className={styles.amount}>{formatCurrency(amount)}</div>
          <div className={styles.label}>{label}</div>
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
      </AnimatePresence>
    </div>
  );
}
