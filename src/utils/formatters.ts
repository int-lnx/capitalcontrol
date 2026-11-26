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

/**
 * Evaluates a mathematical formula or numeric string (e.g., "=100+200", "100+200", "150*1.2-30", "12,5+7,5").
 * Returns the rounded numeric result (2 decimal places), or NaN if invalid.
 */
export const evaluateFormula = (input: string): number => {
  if (!input) return NaN;
  const trimmed = input.trim();
  if (!trimmed) return NaN;

  // Strip optional leading '=' and spaces, normalize comma to dot
  const expr = trimmed.replace(/^=/, '').replace(/\s+/g, '').replace(/,/g, '.');
  if (!expr) return NaN;

  // Allow only digits, decimal points, parentheses, and +, -, *, /
  if (!/^[0-9.+\-*/()]+$/.test(expr)) return NaN;

  // Tokenizer & Recursive Descent Parser for safe arithmetic evaluation
  let pos = 0;

  const parseExpression = (): number => {
    let val = parseTerm();
    while (pos < expr.length && (expr[pos] === '+' || expr[pos] === '-')) {
      const op = expr[pos++];
      const right = parseTerm();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  };

  const parseTerm = (): number => {
    let val = parseFactor();
    while (pos < expr.length && (expr[pos] === '*' || expr[pos] === '/')) {
      const op = expr[pos++];
      const right = parseFactor();
      if (op === '*') {
        val = val * right;
      } else {
        if (right === 0) return NaN;
        val = val / right;
      }
    }
    return val;
  };

  const parseFactor = (): number => {
    // Handle unary + or -
    if (expr[pos] === '+') {
      pos++;
      return parseFactor();
    }
    if (expr[pos] === '-') {
      pos++;
      return -parseFactor();
    }

    // Handle parentheses
    if (expr[pos] === '(') {
      pos++;
      const val = parseExpression();
      if (expr[pos] !== ')') return NaN;
      pos++;
      return val;
    }

    // Parse number
    const start = pos;
    let dotCount = 0;
    while (pos < expr.length && ((expr[pos] >= '0' && expr[pos] <= '9') || expr[pos] === '.')) {
      if (expr[pos] === '.') dotCount++;
      pos++;
    }
    if (start === pos || dotCount > 1) return NaN;
    const numStr = expr.slice(start, pos);
    if (numStr === '.') return NaN;
    return parseFloat(numStr);
  };

  const result = parseExpression();
  if (pos !== expr.length || !Number.isFinite(result)) {
    return NaN;
  }

  return Math.round(result * 100) / 100;
};

/**
 * Checks whether the given string is a formula (starts with '=' or contains binary operators).
 */
export const isFormulaExpression = (input: string): boolean => {
  if (!input) return false;
  const trimmed = input.trim();
  if (trimmed.startsWith('=')) return true;
  // Contains +, *, /, or a '-' not at index 0
  return /[+*/]/.test(trimmed) || trimmed.slice(1).includes('-');
};
