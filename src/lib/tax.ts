// 2025 federal income tax brackets (single filer)
const BRACKETS = [
  { min: 0, max: 11925, rate: 0.10 },
  { min: 11925, max: 48475, rate: 0.12 },
  { min: 48475, max: 103350, rate: 0.22 },
  { min: 103350, max: 197300, rate: 0.24 },
  { min: 197300, max: 250525, rate: 0.32 },
  { min: 250525, max: 626350, rate: 0.35 },
  { min: 626350, max: Infinity, rate: 0.37 },
];

// 2025 standard deduction (single)
const STANDARD_DEDUCTION = 15700;

// FICA rates
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_CAP = 176100;
const MEDICARE_RATE = 0.0145;

export function computeFederalTax(grossIncome: number): number {
  const taxableIncome = Math.max(0, grossIncome - STANDARD_DEDUCTION);

  let incomeTax = 0;
  for (const bracket of BRACKETS) {
    if (taxableIncome <= bracket.min) break;
    const taxable = Math.min(taxableIncome, bracket.max) - bracket.min;
    incomeTax += taxable * bracket.rate;
  }

  const ssTax = Math.min(grossIncome, SOCIAL_SECURITY_CAP) * SOCIAL_SECURITY_RATE;
  const medicareTax = grossIncome * MEDICARE_RATE;

  return incomeTax + ssTax + medicareTax;
}

// Total federal revenue (FY2025 estimate) for scaling
const TOTAL_FEDERAL_REVENUE = 4_918_000_000_000;
const TOTAL_FEDERAL_SPENDING = 6_752_000_000_000;

export function computeUserShare(userTax: number, categoryTotal: number): number {
  return (userTax / TOTAL_FEDERAL_REVENUE) * categoryTotal;
}

export function computeUserShareOfTotal(userTax: number): number {
  return (userTax / TOTAL_FEDERAL_REVENUE) * TOTAL_FEDERAL_SPENDING;
}
