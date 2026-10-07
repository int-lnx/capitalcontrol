import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export const formatCurrency = (amount: number, currency: string = '₺'): string => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + currency;
};

// Compact format for constrained UI elements like calendar cells (e.g. 2.5K ₺ or 850 ₺)
export const formatCurrencyCompact = (amount: number, currency: string = '₺'): string => {
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M ' + currency;
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'k ' + currency;
  }
  return Math.round(amount) + ' ' + currency;
};

export const formatDateFormatted = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    return format(date, 'd MMMM yyyy, EEEE', { locale: tr });
  } catch {
    return dateStr;
  }
};

export const formatDateShort = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    return format(date, 'd MMM yyyy', { locale: tr });
  } catch {
    return dateStr;
  }
};

export const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};
