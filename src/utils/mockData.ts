import type { Category, Account, ExpenseLimit, Expense } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Mutfak & Market',
    color: '#3b82f6', // blue
    iconName: 'ShoppingCart',
    subcategories: [
      { id: 'sub-1', name: 'Süpermarket' },
      { id: 'sub-2', name: 'Manav & Şarküteri' },
      { id: 'sub-3', name: 'Kasap' },
    ],
  },
  {
    id: 'cat-2',
    name: 'Ulaşım',
    color: '#f59e0b', // amber
    iconName: 'Car',
    subcategories: [
      { id: 'sub-4', name: 'Yakıt' },
      { id: 'sub-5', name: 'Toplu Taşıma' },
      { id: 'sub-6', name: 'Otopark & Taksitle Yol' },
    ],
  },
  {
    id: 'cat-3',
    name: 'Yeme & İçme',
    color: '#ef4444', // red
    iconName: 'Utensils',
    subcategories: [
      { id: 'sub-7', name: 'Restoran & Kafe' },
      { id: 'sub-8', name: 'Kahve / Tatlı' },
      { id: 'sub-9', name: 'Yemek Siparişi' },
    ],
  },
  {
    id: 'cat-4',
    name: 'Fatura & Ev',
    color: '#10b981', // emerald
    iconName: 'Home',
    subcategories: [
      { id: 'sub-10', name: 'Elektrik & Su' },
      { id: 'sub-11', name: 'İnternet & Telefon' },
      { id: 'sub-12', name: 'Kira / Aidat' },
    ],
  },
  {
    id: 'cat-5',
    name: 'Eğlence & Hobiler',
    color: '#8b5cf6', // purple
    iconName: 'Film',
    subcategories: [
      { id: 'sub-13', name: 'Sinema / Tiyatro' },
      { id: 'sub-14', name: 'Dijital Abonelikler' },
      { id: 'sub-15', name: 'Kitap & Oyun' },
    ],
  },
];

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    name: 'Nakit Cüzdan',
    type: 'nakit',
    balance: 2450.00,
    currency: '₺',
    color: '#10b981',
  },
  {
    id: 'acc-2',
    name: 'Garanti Bankası Ana Hesap',
    type: 'banka',
    balance: 18500.50,
    currency: '₺',
    color: '#3b82f6',
  },
  {
    id: 'acc-3',
    name: 'Bonus Kredi Kartı',
    type: 'kredi_karti',
    balance: -3400.00,
    currency: '₺',
    color: '#8b5cf6',
  },
];

export const INITIAL_LIMITS: ExpenseLimit[] = [
  {
    id: 'lim-1',
    name: 'Enes',
    targetAmount: 5000.00,
    spentAmount: 1450.00,
    description: "Enes'in harcamaları için ayrılan özel limit",
  },
  {
    id: 'lim-2',
    name: 'Aylık Market Limiti',
    targetAmount: 4000.00,
    spentAmount: 2350.00,
    description: 'Aylık mutfak ve gıda alışveriş sınırı',
  },
  {
    id: 'lim-3',
    name: 'Dışarıda Yemek Limiti',
    targetAmount: 2000.00,
    spentAmount: 1800.00,
    description: 'Kafe ve restoran harcamaları için',
  },
];

export const INITIAL_EXPENSES: Expense[] = [];
