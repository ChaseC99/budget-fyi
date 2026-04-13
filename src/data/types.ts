export interface BudgetNode {
  id: string;
  title: string;
  desc: string;
  details?: string;
  total: number;
  source?: string;
  categories?: BudgetNode[];
  notableExpenses?: BudgetNode[];
}
