import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Expense, Category, Account, ExpenseLimit, CustomAccountTotal } from '../types';
import { INITIAL_CATEGORIES, INITIAL_ACCOUNTS, INITIAL_LIMITS, INITIAL_EXPENSES } from '../utils/mockData';
import { normalizeTag, withParentTags, getChildTags, getParentTags, type TagParentsMap } from '../utils/tagHierarchy';
import { useAuth } from './AuthContext';
import { db } from '../firebase';

interface ExpenseContextType {
  expenses: Expense[];
  categories: Category[];
  accounts: Account[];
  customTotals: CustomAccountTotal[];
  limits: ExpenseLimit[];
  allTags: string[];
  isCloudSyncing: boolean;
  editingExpense: Expense | null;
  setEditingExpense: (expense: Expense | null) => void;
  addExpense: (expenseData: Omit<Expense, 'id' | 'createdAt'>) => void;
  addExpensesBatch: (expensesBatch: Omit<Expense, 'id' | 'createdAt'>[]) => void;
  updateExpense: (id: string, updatedData: Partial<Expense>) => void;
  updateRecurringSeriesFuture: (id: string, updatedData: Partial<Expense>, remainingFutureCount?: number, customStartRecurrenceNumber?: number) => void;
  approveExpense: (id: string, modifiedData?: Partial<Expense>) => void;
  updateSplitBatch: (splitBatchId: string, updatedSplits: Omit<Expense, 'id' | 'createdAt'>[]) => void;
  deleteExpense: (id: string) => void;
  deleteSplitBatch: (splitBatchId: string) => void;
  addCategory: (categoryData: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, data: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => void;
  addSubCategory: (categoryId: string, name: string) => void;
  updateSubCategory: (categoryId: string, subCategoryId: string, name: string) => void;
  deleteSubCategory: (categoryId: string, subCategoryId: string) => void;
  addLimit: (limitData: Omit<ExpenseLimit, 'id' | 'spentAmount'>) => void;
  updateLimit: (limit: ExpenseLimit) => void;
  deleteLimit: (id: string) => void;
  addAccount: (accountData: Omit<Account, 'id'>) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  addCustomTotal: (customTotalData: Omit<CustomAccountTotal, 'id'>) => void;
  updateCustomTotal: (customTotal: CustomAccountTotal) => void;
  deleteCustomTotal: (id: string) => void;
  resetToDefaultData: () => void;
  renameTag: (oldTag: string, newTag: string) => void;
  mergeTags: (sourceTags: string[], targetTag: string) => void;
  deleteTag: (tagToDelete: string) => void;
  mergeCategories: (sourceCategoryIds: string[], targetCategoryId: string) => void;
  // Bağlı Etiketler: { altEtiket: [üstEtiketler] }
  tagParents: TagParentsMap;
  /** Bir etiketi üst etikete bağlar (parent=null ise bağlantıyı kaldırır). Hata varsa mesaj döndürür. */
  setTagParent: (childTag: string, parentTag: string | null) => string | null;
  addTagParent: (childTag: string, parentTag: string) => string | null;
  removeTagParent: (childTag: string, parentTag: string) => void;
  addTagChild: (parentTag: string, childTag: string) => string | null;
  removeTagChild: (parentTag: string, childTag: string) => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const LOCAL_KEYS = {
  EXPENSES: 'masraf_app_expenses',
  CATEGORIES: 'masraf_app_categories',
  ACCOUNTS: 'masraf_app_accounts',
  CUSTOM_TOTALS: 'masraf_app_custom_totals',
  LIMITS: 'masraf_app_limits',
  TAG_PARENTS: 'masraf_app_tag_parents',
};

// Helper: Ay ekleme işleminde ayın son gününü aşmayacak şekilde sınırla (Örn: 30 Ocak -> 28 Şubat)
function addMonthsClamped(y: number, m: number, d: number, monthsToAdd: number): string {
  const targetFirstDay = new Date(y, m - 1 + monthsToAdd, 1);
  const targetYear = targetFirstDay.getFullYear();
  const targetMonth = targetFirstDay.getMonth();
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const safeDay = Math.min(d, daysInMonth);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

// Helper: Add recurrence interval to YYYY-MM-DD
function addRecurrenceToDateString(dateStr: string, frequency: 'gunluk' | 'haftalik' | 'aylik' | 'yillik', step: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (frequency === 'gunluk') {
    const target = new Date(y, m - 1, d + step);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  }
  if (frequency === 'haftalik') {
    const target = new Date(y, m - 1, d + step * 7);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  }
  if (frequency === 'yillik') {
    return addMonthsClamped(y, m, d, step * 12);
  }
  // Default aylik
  return addMonthsClamped(y, m, d, step);
}

// Helper: Add months to a YYYY-MM-DD string preserving day (clamped to month's last day)
function addMonthsToDateString(dateStr: string, monthsToAdd: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return addMonthsClamped(y, m, d, monthsToAdd);
}

// Clean object of any undefined fields for Firestore compatibility
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// Helper: Ensure all active unlimited recurring expenses have future occurrences projected (up to 24 cycles ahead)
function projectMissingUnlimitedRecurrences(list: Expense[]): Expense[] {
  if (!Array.isArray(list) || list.length === 0) return list || [];
  const todayStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  // Find all items that are part of an unlimited recurrence
  const unlimitedItems = list.filter(e => e.isUnlimitedRecurrence);
  if (unlimitedItems.length === 0) return list;

  // Group by recurrenceBatchId or individual id
  const seriesGroups = new Map<string, Expense[]>();
  unlimitedItems.forEach(item => {
    const key = item.recurrenceBatchId || item.id;
    if (!seriesGroups.has(key)) seriesGroups.set(key, []);
    seriesGroups.get(key)!.push(item);
  });

  const addedItems: Expense[] = [];

  seriesGroups.forEach((_groupItems, batchId) => {
    // Find all items in the full list with this batchId
    const allInSeries = list.filter(e => (e.recurrenceBatchId && e.recurrenceBatchId === batchId) || e.id === batchId);
    allInSeries.sort((a, b) => a.date.localeCompare(b.date));

    const latestItem = allInSeries[allInSeries.length - 1];
    if (!latestItem) return;

    // Count future items (> todayStr)
    const futureCount = allInSeries.filter(e => e.date > todayStr).length;
    const targetFutureCount = 24;
    const missingCount = targetFutureCount - futureCount;

    if (missingCount > 0) {
      const freq = latestItem.recurrenceFrequency || 'aylik';
      const willAskApproval = Boolean(latestItem.askApproval);
      const isTheor = Boolean(latestItem.isTheoretical || latestItem.paymentType === 'teorik');
      const startNum = (latestItem.installmentNumber || allInSeries.length) + 1;

      for (let i = 1; i <= missingCount; i++) {
        const itemDate = addRecurrenceToDateString(latestItem.date, freq, i);
        const recNumber = startNum + (i - 1);
        const newId = `${batchId}-rec-gen-${i}-${Math.random().toString(36).substring(2, 7)}`;

        addedItems.push({
          ...latestItem,
          id: newId,
          parentExpenseId: batchId,
          recurrenceBatchId: batchId,
          isUnlimitedRecurrence: true,
          isTheoretical: isTheor,
          paymentType: latestItem.paymentType || (isTheor ? 'teorik' : 'tekrarlayan'),
          installmentNumber: recNumber,
          installmentCount: undefined,
          date: itemDate,
          status: willAskApproval && !isTheor ? 'pending' : undefined,
          pendingApproval: false,
          askApproval: isTheor ? false : willAskApproval,
          createdAt: nowIso,
        });
      }
    }
  });

  if (addedItems.length === 0) return list;
  return [...list, ...addedItems];
}

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [hasLoadedCloud, setHasLoadedCloud] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // In-memory states (defaults to EMPTY expenses now)
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(LOCAL_KEYS.EXPENSES);
    const parsed: Expense[] = saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    return projectMissingUnlimitedRecurrences(parsed);
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(LOCAL_KEYS.CATEGORIES);
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem(LOCAL_KEYS.ACCOUNTS);
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [customTotals, setCustomTotals] = useState<CustomAccountTotal[]>(() => {
    const saved = localStorage.getItem(LOCAL_KEYS.CUSTOM_TOTALS);
    return saved ? JSON.parse(saved) : [];
  });

  const [limits, setLimits] = useState<ExpenseLimit[]>(() => {
    const saved = localStorage.getItem(LOCAL_KEYS.LIMITS);
    return saved ? JSON.parse(saved) : INITIAL_LIMITS;
  });

  const [tagParents, setTagParents] = useState<TagParentsMap>(() => {
    const saved = localStorage.getItem(LOCAL_KEYS.TAG_PARENTS);
    return saved ? JSON.parse(saved) : {};
  });

  // Direct persistence helper to immediately write to Firestore without waiting for debounce
  const saveToFirestoreNow = async (
    newExpenses: Expense[],
    newCategories = categories,
    newAccounts = accounts,
    newLimits = limits,
    newCustomTotals = customTotals,
    newTagParents = tagParents
  ) => {
    if (!user) return;
    try {
      setIsCloudSyncing(true);
      const userDocRef = doc(db, 'users', user.uid);
      const payload = sanitizeForFirestore({
        expenses: newExpenses,
        categories: newCategories,
        accounts: newAccounts,
        customTotals: newCustomTotals,
        limits: newLimits,
        tagParents: newTagParents,
        userEmail: user.email,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(userDocRef, payload, { merge: true });
    } catch (err) {
      console.error('Firestore anlık kayıt hatası:', err);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Pull data from Firestore on login
  useEffect(() => {
    if (!user) {
      setHasLoadedCloud(false);
      return;
    }

    const loadUserData = async () => {
      try {
        setIsCloudSyncing(true);
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.expenses)) {
            const projected = projectMissingUnlimitedRecurrences(data.expenses);
            setExpenses(projected);
            localStorage.setItem(LOCAL_KEYS.EXPENSES, JSON.stringify(projected));
          }
          if (Array.isArray(data.categories)) {
            setCategories(data.categories);
            localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify(data.categories));
          }
          if (Array.isArray(data.accounts)) {
            setAccounts(data.accounts);
            localStorage.setItem(LOCAL_KEYS.ACCOUNTS, JSON.stringify(data.accounts));
          }
          if (Array.isArray(data.customTotals)) {
            setCustomTotals(data.customTotals);
            localStorage.setItem(LOCAL_KEYS.CUSTOM_TOTALS, JSON.stringify(data.customTotals));
          }
          if (Array.isArray(data.limits)) {
            setLimits(data.limits);
            localStorage.setItem(LOCAL_KEYS.LIMITS, JSON.stringify(data.limits));
          }
          if (data.tagParents && typeof data.tagParents === 'object') {
            setTagParents(data.tagParents);
            localStorage.setItem(LOCAL_KEYS.TAG_PARENTS, JSON.stringify(data.tagParents));
          }
        } else {
          // Initialize document for new user
          const payload = sanitizeForFirestore({
            expenses,
            categories,
            accounts,
            customTotals,
            limits,
            tagParents,
            userEmail: user.email,
            updatedAt: new Date().toISOString(),
          });
          await setDoc(userDocRef, payload);
        }
      } catch (err) {
        console.error('Firestore veri yükleme hatası:', err);
      } finally {
        setIsCloudSyncing(false);
        setHasLoadedCloud(true);
      }
    };

    loadUserData();
  }, [user]);

  // Sync state to localStorage immediately
  useEffect(() => {
    localStorage.setItem(LOCAL_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEYS.CUSTOM_TOTALS, JSON.stringify(customTotals));
  }, [customTotals]);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEYS.LIMITS, JSON.stringify(limits));
  }, [limits]);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEYS.TAG_PARENTS, JSON.stringify(tagParents));
  }, [tagParents]);

  // Secondary backup background sync to Firestore
  useEffect(() => {
    if (!user || !hasLoadedCloud) return;

    const timeout = setTimeout(() => {
      saveToFirestoreNow(expenses, categories, accounts, limits, customTotals, tagParents);
    }, 600);

    return () => clearTimeout(timeout);
  }, [categories, accounts, limits, customTotals, tagParents]);

  // Calculate spent amounts for limits
  useEffect(() => {
    setLimits(prevLimits =>
      prevLimits.map(lim => {
        const totalSpent = expenses
          .filter(e => e.limitId === lim.id)
          .reduce((sum, e) => sum + e.amount, 0);
        return { ...lim, spentAmount: totalSpent };
      })
    );
  }, [expenses]);

  // Check if any scheduled installment or recurring expense has reached its due date today or in the past
  // and needs user confirmation before formalizing into account
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let needsUpdate = false;

    const checkedExpenses = expenses.map(exp => {
      // If marked to ask approval, currently pending and due date has arrived (exp.date <= todayStr)
      if (exp.askApproval && exp.status === 'pending' && exp.date <= todayStr && !exp.pendingApproval) {
        needsUpdate = true;
        return {
          ...exp,
          pendingApproval: true,
        };
      }
      return exp;
    });

    if (needsUpdate) {
      setExpenses(checkedExpenses);
      saveToFirestoreNow(checkedExpenses);
    }
  }, [expenses]);

  // Derive unique tags (harcamalardaki + bağlı etiket tanımlarındaki)
  const allTags = React.useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => {
      (e.tags || []).forEach(t => {
        const norm = normalizeTag(t);
        if (norm) set.add(norm);
      });
    });
    Object.keys(tagParents).forEach(k => {
      const norm = normalizeTag(k);
      if (norm) set.add(norm);
    });
    Object.values(tagParents).forEach(val => {
      if (Array.isArray(val)) {
        val.forEach(p => {
          const norm = normalizeTag(p);
          if (norm) set.add(norm);
        });
      } else if (typeof val === 'string') {
        const norm = normalizeTag(val);
        if (norm) set.add(norm);
      }
    });
    return Array.from(set).sort();
  }, [expenses, tagParents]);

  const addExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    const isInstallment = expenseData.paymentType === 'taksitli' && (expenseData.installmentCount || 1) > 1;
    const nowIso = new Date().toISOString();
    const parentId = 'exp-' + Date.now();

    let updatedList: Expense[] = [];

    if (isInstallment) {
      const count = expenseData.installmentCount!;
      const totalAmount = expenseData.totalAmount || (expenseData.amount * count);
      const installmentAmount = Math.round((totalAmount / count) * 100) / 100;
      const todayStr = new Date().toISOString().split('T')[0];
      const willAskApproval = Boolean(expenseData.askApproval);
      const startNum = expenseData.startInstallmentNumber && expenseData.startInstallmentNumber > 0
        ? expenseData.startInstallmentNumber
        : 1;
      
      const newExpensesBatch: Expense[] = [];

      for (let i = 1; i <= count; i++) {
        const currentAmount = (i === count)
          ? Math.round((totalAmount - (installmentAmount * (count - 1))) * 100) / 100
          : installmentAmount;

        const installmentDate = addMonthsToDateString(expenseData.date, i - 1);
        const isFuture = installmentDate > todayStr;
        const isDueOrPast = installmentDate <= todayStr;

        // If askApproval is enabled:
        // Future installments: pendingApproval: false, status: 'pending' (vadesi gelince sorulacak)
        // Today or past installments: if i === 1, it's immediately approved
        let status: 'pending' | 'approved' | undefined = undefined;
        let pendingApproval = false;

        if (willAskApproval) {
          if (isFuture) {
            status = 'pending';
            pendingApproval = false; // Günü gelene kadar henüz onay istemiyor
          } else if (i > 1 && isDueOrPast) {
            status = 'pending';
            pendingApproval = true; // Günü gelmiş, onay bekliyor
          } else {
            status = 'approved';
            pendingApproval = false;
          }
        }

        const currentInstallmentNumber = startNum + (i - 1);
        const displayTotalCount = startNum > 1 ? (startNum + count - 1) : count;

        newExpensesBatch.push({
          ...expenseData,
          id: i === 1 ? parentId : `${parentId}-inst-${i}`,
          parentExpenseId: parentId,
          amount: currentAmount,
          totalAmount: totalAmount,
          installmentNumber: currentInstallmentNumber,
          installmentCount: displayTotalCount,
          date: installmentDate,
          status,
          pendingApproval,
          askApproval: willAskApproval,
          createdAt: nowIso,
        });
      }

      updatedList = [...newExpensesBatch, ...expenses];
      setExpenses(updatedList);

      if (expenseData.accountId) {
        setAccounts(prev =>
          prev.map(acc => {
            if (acc.id === expenseData.accountId) {
              return {
                ...acc,
                balance: acc.balance - installmentAmount,
              };
            }
            return acc;
          })
        );
      }
    } else if (expenseData.paymentType === 'tekrarlayan' || expenseData.paymentType === 'teorik') {
      const isTheor = expenseData.paymentType === 'teorik' || Boolean(expenseData.isTheoretical);
      const isUnlimited = Boolean(expenseData.isUnlimitedRecurrence);
      // For unlimited, pre-generate next 24 cycles (e.g. 2 years ahead) and mark as unlimited recurrence
      const count = isUnlimited ? 24 : (expenseData.recurrenceCount || 1);
      const freq = expenseData.recurrenceFrequency || 'aylik';
      const todayStr = new Date().toISOString().split('T')[0];
      const willAskApproval = Boolean(expenseData.askApproval);
      const startNum = expenseData.startRecurrenceNumber && expenseData.startRecurrenceNumber > 0
        ? expenseData.startRecurrenceNumber
        : 1;
      const newExpensesBatch: Expense[] = [];

      for (let i = 1; i <= count; i++) {
        const itemDate = addRecurrenceToDateString(expenseData.date, freq, i - 1);
        const isFuture = itemDate > todayStr;
        const isDueOrPast = itemDate <= todayStr;

        let status: 'pending' | 'approved' | undefined = undefined;
        let pendingApproval = false;

        if (willAskApproval && !isTheor) {
          if (isFuture) {
            status = 'pending';
            pendingApproval = false;
          } else if (i > 1 && isDueOrPast) {
            status = 'pending';
            pendingApproval = true;
          } else {
            status = 'approved';
            pendingApproval = false;
          }
        }

        const currentRecurrenceNumber = startNum + (i - 1);

        newExpensesBatch.push({
          ...expenseData,
          id: i === 1 ? parentId : `${parentId}-rec-${i}`,
          parentExpenseId: parentId,
          recurrenceBatchId: parentId,
          isUnlimitedRecurrence: isUnlimited,
          isTheoretical: isTheor,
          paymentType: expenseData.paymentType,
          installmentNumber: currentRecurrenceNumber,
          installmentCount: isUnlimited ? undefined : (startNum > 1 ? startNum + count - 1 : count),
          date: itemDate,
          status,
          pendingApproval,
          askApproval: isTheor ? false : willAskApproval,
          createdAt: nowIso,
        });
      }

      updatedList = [...newExpensesBatch, ...expenses];
      setExpenses(updatedList);

      // Teorik harcamalar hesap bakiyesini ETKİLEMEZ (gerçek bir para çıkışı değildir)
      if (expenseData.accountId && !isTheor) {
        setAccounts(prev =>
          prev.map(acc => {
            if (acc.id === expenseData.accountId) {
              return {
                ...acc,
                balance: acc.balance - expenseData.amount,
              };
            }
            return acc;
          })
        );
      }
    } else {
      const newExpense: Expense = {
        ...expenseData,
        id: parentId,
        createdAt: nowIso,
      };

      updatedList = [newExpense, ...expenses];
      setExpenses(updatedList);

      if (expenseData.accountId) {
        setAccounts(prev =>
          prev.map(acc => {
            if (acc.id === expenseData.accountId) {
              return {
                ...acc,
                balance: acc.balance - expenseData.amount,
              };
            }
            return acc;
          })
        );
      }
    }

    // Immediately trigger Firestore write
    saveToFirestoreNow(updatedList);
  };

  // Add multiple expenses at once (used for split expenses and bulk operations)
  const addExpensesBatch = (expensesBatch: Omit<Expense, 'id' | 'createdAt'>[]) => {
    if (!expensesBatch || expensesBatch.length === 0) return;

    const nowIso = new Date().toISOString();
    let updatedList = [...expenses];
    const newItems: Expense[] = [];

    // Track account balance deductions
    const accountDeductions: Record<string, number> = {};

    expensesBatch.forEach((item, index) => {
      const isInstallment = item.paymentType === 'taksitli' && (item.installmentCount || 1) > 1;
      const isRecurring = item.paymentType === 'tekrarlayan' || item.paymentType === 'teorik';
      const parentId = 'exp-' + Date.now() + '-' + index;

      if (isInstallment) {
        const count = item.installmentCount!;
        const totalAmount = item.totalAmount || (item.amount * count);
        const installmentAmount = Math.round((totalAmount / count) * 100) / 100;
        const todayStr = new Date().toISOString().split('T')[0];
        const willAskApproval = Boolean(item.askApproval);

        for (let i = 1; i <= count; i++) {
          const currentAmount = (i === count)
            ? Math.round((totalAmount - (installmentAmount * (count - 1))) * 100) / 100
            : installmentAmount;

          const installmentDate = addMonthsToDateString(item.date, i - 1);
          const isFuture = installmentDate > todayStr;
          const isDueOrPast = installmentDate <= todayStr;

          let status: 'pending' | 'approved' | undefined = undefined;
          let pendingApproval = false;

          if (willAskApproval) {
            if (isFuture) {
              status = 'pending';
              pendingApproval = false;
            } else if (i > 1 && isDueOrPast) {
              status = 'pending';
              pendingApproval = true;
            } else {
              status = 'approved';
              pendingApproval = false;
            }
          }

          newItems.push({
            ...item,
            id: i === 1 ? parentId : `${parentId}-inst-${i}`,
            parentExpenseId: parentId,
            amount: currentAmount,
            totalAmount: totalAmount,
            installmentNumber: i,
            installmentCount: count,
            date: installmentDate,
            status,
            pendingApproval,
            askApproval: willAskApproval,
            createdAt: nowIso,
          });
        }

        if (item.accountId) {
          accountDeductions[item.accountId] = (accountDeductions[item.accountId] || 0) + installmentAmount;
        }
      } else if (isRecurring) {
        const isTheor = item.paymentType === 'teorik' || Boolean(item.isTheoretical);
        const isUnlimited = Boolean(item.isUnlimitedRecurrence);
        const count = isUnlimited ? 24 : (item.recurrenceCount || 1);
        const freq = item.recurrenceFrequency || 'aylik';
        const todayStr = new Date().toISOString().split('T')[0];
        const willAskApproval = Boolean(item.askApproval);
        const startNum = item.startRecurrenceNumber && item.startRecurrenceNumber > 0 ? item.startRecurrenceNumber : 1;

        for (let i = 1; i <= count; i++) {
          const itemDate = addRecurrenceToDateString(item.date, freq, i - 1);
          const isFuture = itemDate > todayStr;
          const isDueOrPast = itemDate <= todayStr;

          let status: 'pending' | 'approved' | undefined = undefined;
          let pendingApproval = false;

          if (willAskApproval && !isTheor) {
            if (isFuture) {
              status = 'pending';
              pendingApproval = false;
            } else if (i > 1 && isDueOrPast) {
              status = 'pending';
              pendingApproval = true;
            } else {
              status = 'approved';
              pendingApproval = false;
            }
          }

          const currentRecurrenceNumber = startNum + (i - 1);

          newItems.push({
            ...item,
            id: i === 1 ? parentId : `${parentId}-rec-${i}`,
            parentExpenseId: parentId,
            recurrenceBatchId: parentId,
            isUnlimitedRecurrence: isUnlimited,
            isTheoretical: isTheor,
            paymentType: item.paymentType,
            installmentNumber: currentRecurrenceNumber,
            installmentCount: isUnlimited ? undefined : (startNum > 1 ? startNum + count - 1 : count),
            date: itemDate,
            status,
            pendingApproval,
            askApproval: isTheor ? false : willAskApproval,
            createdAt: nowIso,
          });
        }

        if (item.accountId && !isTheor) {
          accountDeductions[item.accountId] = (accountDeductions[item.accountId] || 0) + item.amount;
        }
      } else {
        newItems.push({
          ...item,
          id: parentId,
          createdAt: nowIso,
        });

        if (item.accountId && !item.isTheoretical && item.paymentType !== 'teorik') {
          accountDeductions[item.accountId] = (accountDeductions[item.accountId] || 0) + item.amount;
        }
      }
    });

    updatedList = [...newItems, ...updatedList];
    setExpenses(updatedList);

    // Update affected accounts
    if (Object.keys(accountDeductions).length > 0) {
      setAccounts(prev =>
        prev.map(acc => {
          if (accountDeductions[acc.id]) {
            return {
              ...acc,
              balance: acc.balance - accountDeductions[acc.id],
            };
          }
          return acc;
        })
      );
    }

    saveToFirestoreNow(updatedList);
  };

  const updateExpense = (id: string, updatedData: Partial<Expense>) => {
    const target = expenses.find(e => e.id === id);

    // Check if this is a recurring expense with future occurrences or series
    const isRecurring = target?.paymentType === 'tekrarlayan' || Boolean(target?.recurrenceBatchId);

    if (isRecurring && target?.recurrenceBatchId) {
      // Find all brother occurrences in the same recurrence batch
      const relatedBatchItems = expenses.filter(
        e => e.recurrenceBatchId === target.recurrenceBatchId && e.id !== id
      );

      if (relatedBatchItems.length > 0) {
        const applyToAll = confirm(
          '🔔 DİKKAT: Bu tekrarlayan harcama serisine ait bir kayıttır.\n\n' +
          'Yapacağınız değişiklikler bu harcama serisindeki TÜM TEKRARLARI etkileyecektir.\n\n' +
          'Tüm serinin güncellenmesini onaylıyor musunuz?\n\n' +
          '[Tamam] = Tüm seriyi güncelle\n' +
          '[İptal] = Sadece bu harcamayı güncelle'
        );

        if (applyToAll) {
          const updatedList = expenses.map(item => {
            if (item.id === id) {
              return { ...item, ...updatedData };
            }
            if (item.recurrenceBatchId === target.recurrenceBatchId) {
              return {
                ...item,
                amount: updatedData.amount !== undefined ? updatedData.amount : item.amount,
                title: updatedData.title !== undefined ? updatedData.title : item.title,
                description: updatedData.description !== undefined ? updatedData.description : item.description,
                categoryId: updatedData.categoryId !== undefined ? updatedData.categoryId : item.categoryId,
                subcategoryId: updatedData.subcategoryId !== undefined ? updatedData.subcategoryId : item.subcategoryId,
                necessity: updatedData.necessity !== undefined ? updatedData.necessity : item.necessity,
                tags: updatedData.tags !== undefined ? updatedData.tags : item.tags,
                accountId: updatedData.accountId !== undefined ? updatedData.accountId : item.accountId,
                limitId: updatedData.limitId !== undefined ? updatedData.limitId : item.limitId,
                askApproval: updatedData.askApproval !== undefined ? updatedData.askApproval : item.askApproval,
              };
            }
            return item;
          });

          setExpenses(updatedList);
          saveToFirestoreNow(updatedList);
          return;
        }
      }
    }

    // Check if this is an installment expense
    const isInstallment = target?.paymentType === 'taksitli' && Boolean(target?.parentExpenseId);

    if (isInstallment && target?.parentExpenseId) {
      // Find all brother installments belonging to this purchase
      const relatedInstallments = expenses.filter(
        e => (e.parentExpenseId === target.parentExpenseId || e.id === target.parentExpenseId) && e.id !== id
      );

      if (relatedInstallments.length > 0) {
        const applyToAllInstallments = confirm(
          '🔔 DİKKAT: Bu taksitli bir harcamadır.\n\n' +
          'Yapacağınız değişiklikler bu harcamanın TÜM TAKSİT SERİSİNİ etkileyecektir (başlık, kategori, hesap, tutar vb.).\n\n' +
          'Tüm taksit serisinin güncellenmesini onaylıyor musunuz?\n\n' +
          '[Tamam] = Tüm taksitleri güncelle\n' +
          '[İptal] = Sadece bu taksiti güncelle'
        );

        if (applyToAllInstallments) {
          // If installment amount changed, totalAmount is updated across installments
          const count = target.installmentCount || (relatedInstallments.length + 1);
          const newAmount = updatedData.amount !== undefined ? updatedData.amount : target.amount;
          const newTotalAmount = updatedData.totalAmount !== undefined ? updatedData.totalAmount : (newAmount * count);

          const updatedList = expenses.map(item => {
            if (item.id === id) {
              return { 
                ...item, 
                ...updatedData,
                totalAmount: newTotalAmount,
              };
            }
            if (item.parentExpenseId === target.parentExpenseId || item.id === target.parentExpenseId) {
              return {
                ...item,
                amount: newAmount,
                totalAmount: newTotalAmount,
                title: updatedData.title !== undefined ? updatedData.title : item.title,
                description: updatedData.description !== undefined ? updatedData.description : item.description,
                categoryId: updatedData.categoryId !== undefined ? updatedData.categoryId : item.categoryId,
                subcategoryId: updatedData.subcategoryId !== undefined ? updatedData.subcategoryId : item.subcategoryId,
                tags: updatedData.tags !== undefined ? updatedData.tags : item.tags,
                necessity: updatedData.necessity !== undefined ? updatedData.necessity : item.necessity,
                accountId: updatedData.accountId !== undefined ? updatedData.accountId : item.accountId,
                limitId: updatedData.limitId !== undefined ? updatedData.limitId : item.limitId,
                askApproval: updatedData.askApproval !== undefined ? updatedData.askApproval : item.askApproval,
              };
            }
            return item;
          });

          setExpenses(updatedList);
          saveToFirestoreNow(updatedList);
          return;
        }
      }
    }

    // Default: update only this single expense record (past & existing records remain independent)
    const updatedList = expenses.map(item => {
      if (item.id === id) {
        return {
          ...item,
          ...updatedData,
        };
      }
      return item;
    });

    setExpenses(updatedList);
    saveToFirestoreNow(updatedList);
  };

  // Tekrarlayan serinin gelecekteki tekrarlarını ve kalan tekrar sayısını güncelle
  // Geçmiş (target.date'ten önceki) kayıtlara ASLA dokunulmaz.
  // Seçili kayıt ve sonraki tekrarlar, kullanıcının belirlediği başlangıç no ve kalan tekrar sayısına göre ayarlanır.
  const updateRecurringSeriesFuture = (
    id: string,
    updatedData: Partial<Expense>,
    remainingFutureCount?: number,
    customStartRecurrenceNumber?: number
  ) => {
    const target = expenses.find(e => e.id === id);
    if (!target) return;

    const batchId = target.recurrenceBatchId;
    if (!batchId) {
      // Tekil harcama ise normal güncelle
      updateExpense(id, updatedData);
      return;
    }

    const freq = (updatedData.recurrenceFrequency || target.recurrenceFrequency || 'aylik') as 'gunluk' | 'haftalik' | 'aylik' | 'yillik';
    const isUnlimited = updatedData.isUnlimitedRecurrence !== undefined
      ? Boolean(updatedData.isUnlimitedRecurrence)
      : Boolean(target.isUnlimitedRecurrence);
    const isTheor = updatedData.paymentType === 'teorik'
      || updatedData.isTheoretical !== undefined
      ? Boolean(updatedData.isTheoretical || updatedData.paymentType === 'teorik')
      : Boolean(target.isTheoretical || target.paymentType === 'teorik');

    const currentRecNumber = (customStartRecurrenceNumber !== undefined && customStartRecurrenceNumber > 0)
      ? customStartRecurrenceNumber
      : (target.installmentNumber || 1);
    const nowIso = new Date().toISOString();
    const todayStr = new Date().toISOString().split('T')[0];
    const willAskApproval = updatedData.askApproval !== undefined ? updatedData.askApproval : Boolean(target.askApproval);

    // Geçmiş veya diğer harcamaları koru (batchId'si aynı olup date < target.date olanlar geçmiş kabul edilir)
    const untouchedExpenses = expenses.filter(e => {
      if (e.recurrenceBatchId === batchId && e.date >= target.date) {
        return false; // Yeniden oluşturulacak/güncellenecek
      }
      return true;
    });

    // Kalan tekrar sayısı belirtilmişse ona göre üret; belirtilmemişse veya sınırsızsa 24 dönem üret
    const existingFutureCount = expenses.filter(e => e.recurrenceBatchId === batchId && e.date >= target.date).length;
    const countToGenerate = isUnlimited
      ? 24
      : ((remainingFutureCount && remainingFutureCount > 0) ? remainingFutureCount : Math.max(existingFutureCount, 1));

    const newFutureBatch: Expense[] = [];
    const baseDate = updatedData.date || target.date;

    for (let i = 0; i < countToGenerate; i++) {
      const itemDate = addRecurrenceToDateString(baseDate, freq, i);
      const recNumber = currentRecNumber + i;
      const itemId = i === 0 ? target.id : `${batchId}-rec-f-${Date.now()}-${i}`;
      const isFuture = itemDate > todayStr;
      const isDueOrPast = itemDate <= todayStr;

      let status: 'pending' | 'approved' | undefined = undefined;
      let pendingApproval = false;

      if (willAskApproval && !isTheor) {
        if (isFuture) {
          status = 'pending';
          pendingApproval = false;
        } else if (i > 0 && isDueOrPast) {
          status = 'pending';
          pendingApproval = true;
        } else {
          status = (i === 0 && target.status) ? target.status : 'approved';
          pendingApproval = (i === 0 && target.pendingApproval) ? target.pendingApproval : false;
        }
      }

      newFutureBatch.push({
        ...target,
        ...updatedData,
        id: itemId,
        date: itemDate,
        installmentNumber: recNumber,
        installmentCount: isUnlimited ? undefined : (currentRecNumber + countToGenerate - 1),
        recurrenceBatchId: batchId,
        isUnlimitedRecurrence: isUnlimited,
        isTheoretical: isTheor,
        paymentType: updatedData.paymentType || target.paymentType || (isTheor ? 'teorik' : 'tekrarlayan'),
        status: isTheor ? undefined : status,
        pendingApproval: isTheor ? false : pendingApproval,
        askApproval: isTheor ? false : willAskApproval,
        createdAt: target.createdAt || nowIso,
      });
    }

    const updatedList = [...newFutureBatch, ...untouchedExpenses];
    setExpenses(updatedList);
    saveToFirestoreNow(updatedList);
  };


  // Günü gelen taksitli veya tekrarlı harcamayı onayla ve bireysele dönüştür
  // Yapılan herhangi bir değişiklik sadece bu tek harcama kaydını ilgilendirir, diğer tekrarları veya geleceği etkilemez!
  const approveExpense = (id: string, modifiedData?: Partial<Expense>) => {
    const target = expenses.find(e => e.id === id);
    if (!target) return;

    const mergedData = {
      ...target,
      ...(modifiedData || {}),
      status: 'approved' as const,
      pendingApproval: false,
      // Bireysele döndürme: bu harcamanın artık bağımsız bir kayıt olduğunu garantiler
      // Geçmiş veya gelecek bağlantı zincirini bu log özelinde koparır
      parentExpenseId: undefined,
      recurrenceBatchId: undefined,
    };

    const updatedList = expenses.map(item => (item.id === id ? mergedData : item));
    setExpenses(updatedList);

    // Eğer harcamada hesap belirtilmişse hesap bakiyesinden bu tek seferlik harcamayı düş
    const finalAccountId = mergedData.accountId;
    const finalAmount = mergedData.amount;

    if (finalAccountId && finalAmount > 0) {
      setAccounts(prev =>
        prev.map(acc => {
          if (acc.id === finalAccountId) {
            return {
              ...acc,
              balance: acc.balance - finalAmount,
            };
          }
          return acc;
        })
      );
    }

    saveToFirestoreNow(updatedList);
  };

  const deleteExpense = (id: string) => {
    const target = expenses.find(e => e.id === id);
    let updatedList = expenses;

    if ((target?.paymentType === 'tekrarlayan' || target?.paymentType === 'teorik') && target?.recurrenceBatchId) {
      const isRelated = confirm('Bu tekrarlayan bir harcama. Sadece bu kaydı mı silmek istersiniz?\n\n[Tamam] = Gelecekteki tüm tekrarlar da silinsin (Geçmiş kayıtlar silinmez)\n[İptal] = Sadece bu tek kayıt silinsin');
      if (isRelated) {
        updatedList = expenses
          .filter(e => {
            if (e.recurrenceBatchId === target.recurrenceBatchId && e.date >= target.date) {
              return false;
            }
            return true;
          })
          .map(e => {
            // Serinin kalan eski kayıtlarında sınırsız tekrar bayrağını kapat (yeniden türemesin)
            if (e.recurrenceBatchId === target.recurrenceBatchId) {
              return { ...e, isUnlimitedRecurrence: false };
            }
            return e;
          });
      } else {
        updatedList = expenses.filter(e => e.id !== id);
      }
    } else if (target?.parentExpenseId) {
      const isRelated = confirm('Bu taksitli bir harcama. Diğer tüm taksitleri de silmek istiyor musunuz?');
      if (isRelated) {
        updatedList = expenses.filter(e => e.parentExpenseId !== target.parentExpenseId && e.id !== target.parentExpenseId);
      } else {
        updatedList = expenses.filter(e => e.id !== id);
      }
    } else {
      updatedList = expenses.filter(e => e.id !== id);
    }

    setExpenses(updatedList);
    saveToFirestoreNow(updatedList);
  };

  // Delete all expenses belonging to a split batch
  const deleteSplitBatch = (splitBatchId: string) => {
    if (!splitBatchId) return;
    const updatedList = expenses.filter(e => e.splitBatchId !== splitBatchId);
    setExpenses(updatedList);
    saveToFirestoreNow(updatedList);
  };

  // Update a split batch: removes existing items with splitBatchId and adds newly updated split items
  const updateSplitBatch = (splitBatchId: string, updatedSplits: Omit<Expense, 'id' | 'createdAt'>[]) => {
    if (!splitBatchId || !updatedSplits || updatedSplits.length === 0) return;

    const nowIso = new Date().toISOString();
    // Filter out old records of this split batch
    const remainingExpenses = expenses.filter(e => e.splitBatchId !== splitBatchId);
    const newItems: Expense[] = [];

    updatedSplits.forEach((item, index) => {
      const isInstallment = item.paymentType === 'taksitli' && (item.installmentCount || 1) > 1;
      const parentId = 'exp-' + Date.now() + '-' + index;

      if (isInstallment) {
        const count = item.installmentCount!;
        const totalAmount = item.totalAmount || (item.amount * count);
        const installmentAmount = Math.round((totalAmount / count) * 100) / 100;
        const todayStr = new Date().toISOString().split('T')[0];
        const willAskApproval = Boolean(item.askApproval);

        for (let i = 1; i <= count; i++) {
          const currentAmount = (i === count)
            ? Math.round((totalAmount - (installmentAmount * (count - 1))) * 100) / 100
            : installmentAmount;

          const installmentDate = addMonthsToDateString(item.date, i - 1);
          const isFuture = installmentDate > todayStr;
          const isDueOrPast = installmentDate <= todayStr;

          let status: 'pending' | 'approved' | undefined = undefined;
          let pendingApproval = false;

          if (willAskApproval) {
            if (isFuture) {
              status = 'pending';
              pendingApproval = false;
            } else if (i > 1 && isDueOrPast) {
              status = 'pending';
              pendingApproval = true;
            } else {
              status = 'approved';
              pendingApproval = false;
            }
          }

          newItems.push({
            ...item,
            id: i === 1 ? parentId : `${parentId}-inst-${i}`,
            parentExpenseId: parentId,
            amount: currentAmount,
            totalAmount: totalAmount,
            installmentNumber: i,
            installmentCount: count,
            date: installmentDate,
            status,
            pendingApproval,
            askApproval: willAskApproval,
            createdAt: nowIso,
            splitBatchId,
          });
        }
      } else {
        newItems.push({
          ...item,
          id: parentId,
          createdAt: nowIso,
          splitBatchId,
        });
      }
    });

    const updatedList = [...newItems, ...remainingExpenses];
    setExpenses(updatedList);
    saveToFirestoreNow(updatedList);
  };

  const addCategory = (categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: 'cat-' + Date.now(),
    };
    const nextCategories = [...categories, newCategory];
    setCategories(nextCategories);
    saveToFirestoreNow(expenses, nextCategories);
  };

  const updateCategory = (id: string, data: Partial<Omit<Category, 'id'>>) => {
    const nextCategories = categories.map(cat => {
      if (cat.id === id) {
        return { ...cat, ...data };
      }
      return cat;
    });
    setCategories(nextCategories);
    saveToFirestoreNow(expenses, nextCategories);
  };

  const deleteCategory = (id: string) => {
    const nextCategories = categories.filter(c => c.id !== id);
    setCategories(nextCategories);
    saveToFirestoreNow(expenses, nextCategories);
  };

  const addSubCategory = (categoryId: string, name: string) => {
    const nextCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          subcategories: [...cat.subcategories, { id: 'sub-' + Date.now(), name }],
        };
      }
      return cat;
    });
    setCategories(nextCategories);
    saveToFirestoreNow(expenses, nextCategories);
  };

  const updateSubCategory = (categoryId: string, subCategoryId: string, name: string) => {
    const nextCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          subcategories: cat.subcategories.map(sub =>
            sub.id === subCategoryId ? { ...sub, name } : sub
          ),
        };
      }
      return cat;
    });
    setCategories(nextCategories);
    saveToFirestoreNow(expenses, nextCategories);
  };

  const deleteSubCategory = (categoryId: string, subCategoryId: string) => {
    const nextCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          subcategories: cat.subcategories.filter(sub => sub.id !== subCategoryId),
        };
      }
      return cat;
    });
    setCategories(nextCategories);
    saveToFirestoreNow(expenses, nextCategories);
  };

  const addLimit = (limitData: Omit<ExpenseLimit, 'id' | 'spentAmount'>) => {
    const newLimit: ExpenseLimit = {
      ...limitData,
      id: 'lim-' + Date.now(),
      spentAmount: 0,
    };
    const nextLimits = [...limits, newLimit];
    setLimits(nextLimits);
    saveToFirestoreNow(expenses, categories, accounts, nextLimits);
  };

  const updateLimit = (updatedLimit: ExpenseLimit) => {
    const nextLimits = limits.map(l => (l.id === updatedLimit.id ? updatedLimit : l));
    setLimits(nextLimits);
    saveToFirestoreNow(expenses, categories, accounts, nextLimits);
  };

  const deleteLimit = (id: string) => {
    const nextLimits = limits.filter(l => l.id !== id);
    setLimits(nextLimits);
    const updatedExpenses = expenses.map(e => (e.limitId === id ? { ...e, limitId: undefined } : e));
    setExpenses(updatedExpenses);
    saveToFirestoreNow(updatedExpenses, categories, accounts, nextLimits);
  };

  const addAccount = (accountData: Omit<Account, 'id'>) => {
    const newAccount: Account = {
      ...accountData,
      id: 'acc-' + Date.now(),
    };
    const nextAccounts = [...accounts, newAccount];
    setAccounts(nextAccounts);
    saveToFirestoreNow(expenses, categories, nextAccounts);
  };

  const updateAccount = (updatedAccount: Account) => {
    const nextAccounts = accounts.map(a => (a.id === updatedAccount.id ? updatedAccount : a));
    setAccounts(nextAccounts);
    saveToFirestoreNow(expenses, categories, nextAccounts);
  };

  const deleteAccount = (id: string) => {
    const nextAccounts = accounts.filter(a => a.id !== id);
    setAccounts(nextAccounts);
    // Also remove this account from any customTotals
    const nextCustomTotals = customTotals.map(ct => ({
      ...ct,
      accountIds: ct.accountIds.filter(accId => accId !== id),
    }));
    setCustomTotals(nextCustomTotals);
    const updatedExpenses = expenses.map(e => (e.accountId === id ? { ...e, accountId: undefined } : e));
    setExpenses(updatedExpenses);
    saveToFirestoreNow(updatedExpenses, categories, nextAccounts, limits, nextCustomTotals);
  };

  const addCustomTotal = (customTotalData: Omit<CustomAccountTotal, 'id'>) => {
    const newCustomTotal: CustomAccountTotal = {
      ...customTotalData,
      id: 'ct-' + Date.now(),
    };
    const nextCustomTotals = [...customTotals, newCustomTotal];
    setCustomTotals(nextCustomTotals);
    saveToFirestoreNow(expenses, categories, accounts, limits, nextCustomTotals);
  };

  const updateCustomTotal = (updatedCustomTotal: CustomAccountTotal) => {
    const nextCustomTotals = customTotals.map(ct => (ct.id === updatedCustomTotal.id ? updatedCustomTotal : ct));
    setCustomTotals(nextCustomTotals);
    saveToFirestoreNow(expenses, categories, accounts, limits, nextCustomTotals);
  };

  const deleteCustomTotal = (id: string) => {
    const nextCustomTotals = customTotals.filter(ct => ct.id !== id);
    setCustomTotals(nextCustomTotals);
    saveToFirestoreNow(expenses, categories, accounts, limits, nextCustomTotals);
  };

  const resetToDefaultData = () => {
    setExpenses([]);
    setCategories(INITIAL_CATEGORIES);
    setAccounts(INITIAL_ACCOUNTS);
    setCustomTotals([]);
    setLimits(INITIAL_LIMITS);
    localStorage.clear();
    saveToFirestoreNow([], INITIAL_CATEGORIES, INITIAL_ACCOUNTS, INITIAL_LIMITS, []);
  };

  // Tag Operations: Rename Tag
  const renameTag = (oldTag: string, newTag: string) => {
    const cleanOld = oldTag.trim().toLowerCase();
    const cleanNew = newTag.trim().toLowerCase().replace(/^#/, '');
    if (!cleanOld || !cleanNew || cleanOld === cleanNew) return;

    const updatedExpenses = expenses.map(exp => {
      if (!exp.tags || exp.tags.length === 0) return exp;
      let hasChanged = false;
      const newTagsSet = new Set<string>();

      exp.tags.forEach(t => {
        const lower = t.trim().toLowerCase();
        if (lower === cleanOld) {
          newTagsSet.add(cleanNew);
          hasChanged = true;
        } else {
          newTagsSet.add(lower);
        }
      });

      if (hasChanged) {
        return { ...exp, tags: Array.from(newTagsSet) };
      }
      return exp;
    });

    // Bağlı etiket eşlemesini güncelle
    const nextTagParents: TagParentsMap = {};
    Object.entries(tagParents).forEach(([child, parentsVal]) => {
      const c = child === cleanOld ? cleanNew : child;
      const parentsList = Array.isArray(parentsVal)
        ? parentsVal.map(p => (p === cleanOld ? cleanNew : p))
        : typeof parentsVal === 'string'
        ? [parentsVal === cleanOld ? cleanNew : parentsVal]
        : [];
      const filtered = Array.from(new Set(parentsList.filter(p => p !== c)));
      if (filtered.length > 0) {
        nextTagParents[c] = filtered;
      }
    });
    setTagParents(nextTagParents);

    setExpenses(updatedExpenses);
    saveToFirestoreNow(updatedExpenses, categories, accounts, limits, customTotals, nextTagParents);
  };

  // Tag Operations: Merge multiple tags into a target tag (deduplicating per expense)
  const mergeTags = (sourceTags: string[], targetTag: string) => {
    const cleanSources = new Set(sourceTags.map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean));
    const cleanTarget = targetTag.trim().toLowerCase().replace(/^#/, '');
    if (cleanSources.size === 0 || !cleanTarget) return;

    const updatedExpenses = expenses.map(exp => {
      if (!exp.tags || exp.tags.length === 0) return exp;
      let hasChanged = false;
      const newTagsSet = new Set<string>();

      exp.tags.forEach(t => {
        const lower = t.trim().toLowerCase();
        if (cleanSources.has(lower)) {
          newTagsSet.add(cleanTarget);
          hasChanged = true;
        } else {
          newTagsSet.add(lower);
        }
      });

      if (hasChanged) {
        return { ...exp, tags: Array.from(newTagsSet) };
      }
      return exp;
    });

    // Bağlı etiket eşlemesini güncelle: kaynaklar hedefe dönüşür
    const nextTagParents: TagParentsMap = {};
    const mergedTargetParents: string[] = getParentTags(cleanTarget, tagParents);

    Object.entries(tagParents).forEach(([child, parentsVal]) => {
      const parentsList = Array.isArray(parentsVal)
        ? parentsVal
        : typeof parentsVal === 'string'
        ? [parentsVal]
        : [];

      if (cleanSources.has(child)) {
        parentsList.forEach(p => {
          const mappedP = cleanSources.has(p) ? cleanTarget : p;
          if (mappedP !== cleanTarget && !mergedTargetParents.includes(mappedP)) {
            mergedTargetParents.push(mappedP);
          }
        });
        return;
      }

      const mappedParents = parentsList.map(p => (cleanSources.has(p) ? cleanTarget : p)).filter(p => p !== child);
      const uniqueParents = Array.from(new Set(mappedParents));
      if (uniqueParents.length > 0) {
        nextTagParents[child] = uniqueParents;
      }
    });

    if (mergedTargetParents.length > 0) {
      nextTagParents[cleanTarget] = Array.from(new Set(mergedTargetParents));
    }
    setTagParents(nextTagParents);

    setExpenses(updatedExpenses);
    saveToFirestoreNow(updatedExpenses, categories, accounts, limits, customTotals, nextTagParents);
  };

  // Tag Operations: Delete a tag from all expenses
  const deleteTag = (tagToDelete: string) => {
    const cleanTarget = tagToDelete.trim().toLowerCase().replace(/^#/, '');
    if (!cleanTarget) return;

    const updatedExpenses = expenses.map(exp => {
      if (!exp.tags || exp.tags.length === 0) return exp;
      const filtered = exp.tags.filter(t => t.trim().toLowerCase() !== cleanTarget);
      if (filtered.length !== exp.tags.length) {
        return { ...exp, tags: filtered };
      }
      return exp;
    });

    // Bu etikete ait tüm bağlantıları kaldır
    const nextTagParents: TagParentsMap = {};
    Object.entries(tagParents).forEach(([child, parentsVal]) => {
      if (child === cleanTarget) return;
      const parentsList = Array.isArray(parentsVal)
        ? parentsVal
        : typeof parentsVal === 'string'
        ? [parentsVal]
        : [];
      const filteredParents = parentsList.filter(p => p !== cleanTarget);
      if (filteredParents.length > 0) {
        nextTagParents[child] = filteredParents;
      }
    });
    setTagParents(nextTagParents);

    setExpenses(updatedExpenses);
    saveToFirestoreNow(updatedExpenses, categories, accounts, limits, customTotals, nextTagParents);
  };

  // Döngüsel bağ kontrolü (child -> parent bağı döngü yaratıyor mu?)
  const isDescendant = (candidateDescendant: string, ancestor: string, map: TagParentsMap): boolean => {
    const normDesc = normalizeTag(candidateDescendant);
    const normAnc = normalizeTag(ancestor);
    if (!normDesc || !normAnc) return false;
    if (normDesc === normAnc) return true;
    const children = getChildTags(normAnc, map);
    for (const child of children) {
      if (child === normDesc || isDescendant(normDesc, child, map)) {
        return true;
      }
    }
    return false;
  };

  // Bir alt etikete üst etiket ekle
  const addTagParent = (childTag: string, parentTag: string): string | null => {
    const child = normalizeTag(childTag);
    const parent = normalizeTag(parentTag);
    if (!child || !parent) return 'Geçersiz etiket.';
    if (child === parent) return 'Bir etiket kendisine bağlanamaz.';

    if (isDescendant(parent, child, tagParents)) {
      return `"${parentTag}" zaten "${childTag}" etiketine bağlı bir alt etiket. Döngüsel bağ oluşturulamaz.`;
    }

    const currentParents = getParentTags(child, tagParents);
    if (currentParents.includes(parent)) {
      return null;
    }

    const nextParents = [...currentParents, parent];
    const nextTagParents: TagParentsMap = {
      ...tagParents,
      [child]: nextParents,
    };

    const updatedExpenses = expenses.map(exp => {
      const expTags = (exp.tags || []).map(normalizeTag);
      if (!expTags.includes(child) || expTags.includes(parent)) return exp;
      return { ...exp, tags: withParentTags(exp.tags, nextTagParents) };
    });

    setTagParents(nextTagParents);
    setExpenses(updatedExpenses);
    saveToFirestoreNow(updatedExpenses, categories, accounts, limits, customTotals, nextTagParents);
    return null;
  };

  // Bir alt etiketten belirli bir üst etiketi kaldır
  const removeTagParent = (childTag: string, parentTag: string) => {
    const child = normalizeTag(childTag);
    const parent = normalizeTag(parentTag);
    if (!child || !parent) return;

    const currentParents = getParentTags(child, tagParents);
    const nextParents = currentParents.filter(p => p !== parent);
    const nextTagParents: TagParentsMap = { ...tagParents };

    if (nextParents.length === 0) {
      delete nextTagParents[child];
    } else {
      nextTagParents[child] = nextParents;
    }

    setTagParents(nextTagParents);
    saveToFirestoreNow(expenses, categories, accounts, limits, customTotals, nextTagParents);
  };

  // Bir üst etikete alt etiket ekle (eşdeğeri: alt etikete bu üst etiketi eklemek)
  const addTagChild = (parentTag: string, childTag: string): string | null => {
    return addTagParent(childTag, parentTag);
  };

  // Bir üst etiketten alt etiketi ayır
  const removeTagChild = (parentTag: string, childTag: string) => {
    removeTagParent(childTag, parentTag);
  };

  // Geriye dönük uyumluluk: setTagParent
  const setTagParent = (childTag: string, parentTag: string | null): string | null => {
    const child = normalizeTag(childTag);
    if (!child) return 'Geçersiz etiket.';

    if (parentTag === null || !normalizeTag(parentTag)) {
      if (!tagParents[child]) return null;
      const nextTagParents = { ...tagParents };
      delete nextTagParents[child];
      setTagParents(nextTagParents);
      saveToFirestoreNow(expenses, categories, accounts, limits, customTotals, nextTagParents);
      return null;
    }

    return addTagParent(childTag, parentTag);
  };

  // Category Operations: Merge source categories into target category
  const mergeCategories = (sourceCategoryIds: string[], targetCategoryId: string) => {
    const targetCat = categories.find(c => c.id === targetCategoryId);
    if (!targetCat) return;

    const sourcesSet = new Set(sourceCategoryIds.filter(id => id !== targetCategoryId));
    if (sourcesSet.size === 0) return;

    // Collect all subcategories from source categories to prevent losing them
    const sourceCats = categories.filter(c => sourcesSet.has(c.id));
    const combinedSubcategories = [...targetCat.subcategories];
    sourceCats.forEach(sCat => {
      sCat.subcategories.forEach(sSub => {
        if (!combinedSubcategories.some(sub => sub.name.toLowerCase() === sSub.name.toLowerCase())) {
          combinedSubcategories.push(sSub);
        }
      });
    });

    // Update categories list (remove source categories, update target subcategories)
    const nextCategories = categories
      .filter(c => !sourcesSet.has(c.id))
      .map(c => c.id === targetCategoryId ? { ...c, subcategories: combinedSubcategories } : c);

    // Update expenses: any expense belonging to a merged category points to targetCategoryId
    const updatedExpenses = expenses.map(exp => {
      if (exp.categoryId && sourcesSet.has(exp.categoryId)) {
        return {
          ...exp,
          categoryId: targetCategoryId,
          // Reset subcategory if it belonged specifically to an old category not present, but if matching keep or let user edit
        };
      }
      return exp;
    });

    setCategories(nextCategories);
    setExpenses(updatedExpenses);
    saveToFirestoreNow(updatedExpenses, nextCategories);
  };

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        categories,
        accounts,
        customTotals,
        limits,
        allTags,
        isCloudSyncing,
        editingExpense,
        setEditingExpense,
        addExpense,
        addExpensesBatch,
        updateExpense,
        updateRecurringSeriesFuture,
        approveExpense,
        updateSplitBatch,
        deleteExpense,
        deleteSplitBatch,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubCategory,
        updateSubCategory,
        deleteSubCategory,
        addLimit,
        updateLimit,
        deleteLimit,
        addAccount,
        updateAccount,
        deleteAccount,
        addCustomTotal,
        updateCustomTotal,
        deleteCustomTotal,
        resetToDefaultData,
        renameTag,
        mergeTags,
        deleteTag,
        mergeCategories,
        tagParents,
        setTagParent,
        addTagParent,
        removeTagParent,
        addTagChild,
        removeTagChild,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};
