import { useState, useEffect, useCallback } from "react";
import styles from "./IncomeInput.module.css";

interface IncomeInputProps {
  onIncomeChange: (income: number) => void;
}

const STORAGE_KEY = "budget-fyi-income";

export function IncomeInput({ onIncomeChange }: IncomeInputProps) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) {
        onIncomeChange(parsed);
        setInputValue(parsed.toLocaleString("en-US"));
      }
    }
  }, [onIncomeChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      const num = parseInt(raw, 10) || 0;
      setInputValue(num > 0 ? num.toLocaleString("en-US") : "");
      onIncomeChange(num);
      if (num > 0) {
        localStorage.setItem(STORAGE_KEY, String(num));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [onIncomeChange],
  );

  return (
    <div className={styles.container}>
      <div className={styles.inputShell}>
        <span className={styles.inputPrefix}>$</span>
        <input
          className={styles.input}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleChange}
          placeholder="100,000"
          aria-label="Enter your annual income"
        />
      </div>
      <div className={styles.helperText}>Enter your income to see your share of the bill.</div>
    </div>
  );
}
