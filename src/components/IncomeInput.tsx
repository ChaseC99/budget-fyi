import { useState, useCallback } from "react";
import { computeFederalTax } from "../lib/tax";
import styles from "./IncomeInput.module.css";

interface IncomeInputProps {
  onTaxChange: (tax: number) => void;
}

type InputMode = "income" | "taxBill";

function formatCurrencyValue(value: number): string {
  return value > 0 ? value.toLocaleString("en-US") : "";
}

export function IncomeInput({ onTaxChange }: IncomeInputProps) {
  const [mode, setMode] = useState<InputMode>("income");
  const [incomeValue, setIncomeValue] = useState("");
  const [taxBillValue, setTaxBillValue] = useState("");

  const handleIncomeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      const num = parseInt(raw, 10) || 0;

      setIncomeValue(formatCurrencyValue(num));
      if (mode === "income") {
        onTaxChange(computeFederalTax(num));
      }
    },
    [mode, onTaxChange],
  );

  const handleTaxBillChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      const num = parseInt(raw, 10) || 0;

      setTaxBillValue(formatCurrencyValue(num));
      if (mode === "taxBill") {
        onTaxChange(num);
      }
    },
    [mode, onTaxChange],
  );

  const handleModeToggle = useCallback(() => {
    const nextMode: InputMode = mode === "income" ? "taxBill" : "income";
    const nextIncome = parseInt(incomeValue.replace(/[^0-9]/g, ""), 10) || 0;
    const nextTaxBill = parseInt(taxBillValue.replace(/[^0-9]/g, ""), 10) || 0;

    setMode(nextMode);
    onTaxChange(nextMode === "income" ? computeFederalTax(nextIncome) : nextTaxBill);
  }, [incomeValue, mode, onTaxChange, taxBillValue]);

  const isIncomeMode = mode === "income";
  const inputValue = isIncomeMode ? incomeValue : taxBillValue;
  const placeholder = isIncomeMode ? "100,000" : "15,000";
  const ariaLabel = isIncomeMode ? "Enter your annual income" : "Enter your exact federal tax bill";
  const helperText = isIncomeMode
    ? "Enter your income to estimate your share of the bill."
    : "Enter your exact tax bill to see your share of the bill.";
  const toggleText = isIncomeMode
    ? "or enter your exact tax bill"
    : "or estimate taxes from your income";

  return (
    <div className={styles.container}>
      <div className={styles.inputShell}>
        <span className={styles.inputPrefix}>$</span>
        <input
          className={styles.input}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={isIncomeMode ? handleIncomeChange : handleTaxBillChange}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
      </div>
      <div className={styles.helperText}>
        {helperText}
        <button type="button" className={styles.modeToggle} onClick={handleModeToggle}>
          {toggleText}
        </button>
      </div>
    </div>
  );
}
