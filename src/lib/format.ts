const compactFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const fullFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatSubDollarAmount(amount: number): string {
  if (amount === 0) {
    return fullFormatter.format(amount);
  }

  const sign = amount < 0 ? "-" : "";
  const cents = Math.abs(amount) * 100;

  if (cents < 1) {
    return `${sign}<1¢`;
  }

  return `${sign}${Math.round(cents)}¢`;
}

export function formatCurrency(amount: number): string {
  if (Math.abs(amount) < 1) {
    return formatSubDollarAmount(amount);
  }

  if (Math.abs(amount) >= 1_000_000_000) {
    return compactFormatter.format(amount);
  }
  return fullFormatter.format(amount);
}

export function formatCurrencyFull(amount: number): string {
  if (Math.abs(amount) < 1) {
    return formatSubDollarAmount(amount);
  }

  return fullFormatter.format(amount);
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  const pct = (value / total) * 100;
  if (pct < 0.1) return "<0.1%";
  if (pct < 1) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}
