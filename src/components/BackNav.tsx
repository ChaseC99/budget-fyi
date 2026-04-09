import { motion } from "motion/react";
import styles from "./BackNav.module.css";

interface BackNavProps {
  parentTitle: string;
  onBack: () => void;
}

export function BackNav({ parentTitle, onBack }: BackNavProps) {
  return (
    <motion.button
      className={styles.back}
      onClick={onBack}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
    >
      <span className={styles.arrow}>&larr;</span>
      Back to {parentTitle}
    </motion.button>
  );
}
