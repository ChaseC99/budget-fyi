// 2025 federal income tax brackets (single filer)
// Source: IRS Revenue Procedure 2024-40
// https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
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
// Source: IRS Revenue Procedure 2024-40
const STANDARD_DEDUCTION = 15000;

// FICA rates
// Source: SSA https://www.ssa.gov/oact/cola/cbb.html
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_CAP = 176100;
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const ADDITIONAL_MEDICARE_THRESHOLD = 200000;

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
  const additionalMedicareTax =
    Math.max(0, grossIncome - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;

  return incomeTax + ssTax + medicareTax + additionalMedicareTax;
}

// FY 2025 actuals from Treasury Monthly Treasury Statement (Table 9)
// Source: https://fiscaldata.treasury.gov/datasets/monthly-treasury-statement/
const TOTAL_FEDERAL_REVENUE = 5_234_600_000_000;
// Display total excludes a set of government-wide offsets to keep the spending view easier to read.
const TOTAL_FEDERAL_SPENDING = 7_188_900_000_000;

export function computeUserShare(userTax: number, categoryTotal: number): number {
  return (userTax / TOTAL_FEDERAL_REVENUE) * categoryTotal;
}

export function computeUserShareOfTotal(userTax: number): number {
  return (userTax / TOTAL_FEDERAL_REVENUE) * TOTAL_FEDERAL_SPENDING;
}
