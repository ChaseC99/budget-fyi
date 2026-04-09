import { motion, AnimatePresence } from "motion/react";
import { formatCurrency } from "../lib/format";
import styles from "./CenterLabel.module.css";

interface CenterLabelProps {
  amount: number;
  label: string;
}

export function CenterLabel({ amount, label }: CenterLabelProps) {
  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        <motion.div
          key={amount}
          className={styles.content}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <div className={styles.amount}>{formatCurrency(amount)}</div>
          <div className={styles.label}>{label}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
