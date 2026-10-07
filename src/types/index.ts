export type PaymentType = 'pesin' | 'taksitli' | 'tekrarlayan';

export type RecurrenceFrequency = 'gunluk' | 'haftalik' | 'aylik' | 'yillik';

export type NecessityLevel = 'Fizyolojik' | 'Temel' | 'Makul' | 'Kaçınılabilir' | 'İsraf' | 'Tanımsız';

export interface SubCategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  iconName: string;
  subcategories: SubCategory[];
}

export interface Account {
  id: string;
  name: string;
  type: 'nakit' | 'banka' | 'kredi_karti' | 'diger';
  balance: number;
  currency: string;
  color: string;
}

export interface ExpenseLimit {
  id: string;
  name: string;
  targetAmount: number;
  spentAmount: number;
  category?: string;
  description?: string;
}

export interface Expense {
  id: string;
  amount: number; // For installment, this is the current installment amount or single payment
  totalAmount?: number; // Total purchase amount (all installments combined)
  installmentNumber?: number; // e.g., 1 (out of installmentCount)
  installmentCount?: number; // Total installments, e.g. 3
  parentExpenseId?: string; // Links future installments to the original purchase
  date: string; // YYYY-MM-DD
  title?: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  tags: string[];
  paymentType: PaymentType;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceCount?: number;
  isUnlimitedRecurrence?: boolean; // Sınırsız / sürekli tekrarlayan harcama
  recurrenceBatchId?: string; // Tekrarlı harcama grubunu ilişkilendiren kimlik
  accountId?: string;
  limitId?: string;
  necessity?: NecessityLevel;
  createdAt: string;
}

export type MainTabType = 'records' | 'status' | 'accounts';

export type TabType = 
  | 'timeline' 
  | 'calendar' 
  | 'monthly' 
  | 'upcoming' 
  | 'tag_query' 
  | 'categories' 
  | 'savings' 
  | 'accounts' 
  | 'limits';
