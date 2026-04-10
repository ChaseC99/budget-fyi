export interface BudgetNode {
  id: string;
  title: string;
  desc: string;
  total: number;
  source?: string;
  categories?: BudgetNode[];
}
