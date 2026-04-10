export interface BudgetNode {
  id: string;
  title: string;
  desc: string;
  total: number;
  source?: string;
  sourceUrl?: string;
  categories?: BudgetNode[];
}
