import { useState, useEffect, useCallback, useId } from "react";
import { formatCurrencyFull } from "../lib/format";
import styles from "./IncomeInput.module.css";

interface IncomeInputProps {
  income: number;
  onIncomeChange: (income: number) => void;
  userTax: number;
  additionalDebt: number;
  representedSpending: number;
}

const STORAGE_KEY = "budget-fyi-income";

export function IncomeInput({
  income,
  onIncomeChange,
  userTax,
  additionalDebt,
  representedSpending,
}: IncomeInputProps) {
  const [inputValue, setInputValue] = useState("");
  const tooltipId = useId();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) {
        onIncomeChange(parsed);
        setInputValue(parsed.toLocaleString("en-US"));
      }
    }
  }, []);

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

  const hasIncome = income > 0;

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        I made <span className={styles.highlight}>&hellip;</span>
      </div>
      <div className={styles.inputRow}>
        <span className={styles.dollarSign}>$</span>
        <input
          className={styles.input}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleChange}
          placeholder="80,000"
          aria-label="Enter your annual income"
        />
      </div>
      <div className={styles.taxInfo}>
        {hasIncome ? (
          <>
            <span>
              estimated federal spend: {formatCurrencyFull(representedSpending)} <br/>
            </span>
            <span>
              {formatCurrencyFull(userTax)} (federal taxes) + {formatCurrencyFull(additionalDebt)} (additional debt
              <span className={styles.debtGroup}>
                <button
                  type="button"
                  className={styles.infoButton}
                  aria-label="Explain additional debt methodology"
                  aria-describedby={tooltipId}
                >
                  i
                </button>
                <span id={tooltipId} role="tooltip" className={styles.tooltip}>
                  We estimate your federal taxes using income tax plus Social Security and Medicare.
                  Then we scale that amount against total federal revenue to estimate your share of
                  total federal spending. The gap is shown here as additional debt, representing the
                  deficit-financed portion of that spending.
                </span>
              </span>
              )
            </span>
          </>
        ) : (
          "Enter your income to personalize"
        )}
      </div>
    </div>
  );
}
