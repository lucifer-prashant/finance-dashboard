// types/transaction.ts
export interface Transaction {
  id: string;
  vendor: string;
  amount: string;
  date: string;
  category: string;
  type: 'debit' | 'credit';
}

export interface MonthlySpending {
  month: string;
  total: number;
}

export interface CategorySpending {
  category: string;
  total: number;
  percentage: number;
}

export interface VendorSpending {
  vendor: string;
  total: number;
  count: number;
}

export interface FilterOptions {
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  vendors?: string[];
  minAmount?: number;
  maxAmount?: number;
}