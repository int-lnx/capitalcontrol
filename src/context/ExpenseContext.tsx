import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Expense, Category, Account, ExpenseLimit } from '../types';
import { INITIAL_CATEGORIES, INITIAL_ACCOUNTS, INITIAL_LIMITS, INITIAL_EXPENSES } from '../utils/mockData';
import { useAuth } from './AuthContext';
import { db } from '../firebase';

interface ExpenseContextType {
  expenses: Expense[];
  categories: Category[];
  accounts: Account[];
  limits: ExpenseLimit[];
  allTags: string[];
  isCloudSyncing: boolean;
  editingExpense: Expense | null;
  setEditingExpense: (expense: Expense | null) => void;
  addExpense: (expenseData: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, updatedData: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
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
  resetToDefaultData: () => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const LOCAL_KEYS = {
  EXPENSES: 'masraf_app_expenses',
  CATEGORIES: 'masraf_app_categories',
  ACCOUNTS: 'masraf_app_accounts',
  LIMITS: 'masraf_app_limits',
};

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
    const target = new Date(y + step, m - 1, d);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  }
  // Default aylik
  const target = new Date(y, m - 1 + step, d);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}

// Helper: Add months to a YYYY-MM-DD string preserving day
function addMonthsToDateString(dateStr: string, monthsToAdd: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1 + monthsToAdd, d);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Clean object of any undefined fields for Firestore compatibility
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [hasLoadedCloud, setHasLoadedCloud] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // In-memory states (defaults to EMPTY expenses now)
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(LOCAL_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(LOCAL_KEYS.CATEGORIES);
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem(LOCAL_KEYS.ACCOUNTS);
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [limits, setLimits] = useState<ExpenseLimit[]>(() => {
    const saved = localStorage.getItem(LOCAL_KEYS.LIMITS);
    return saved ? JSON.parse(saved) : INITIAL_LIMITS;
  });

  // Direct persistence helper to immediately write to Firestore without waiting for debounce
  const saveToFirestoreNow = async (
    newExpenses: Expense[],
    newCategories = categories,
    newAccounts = accounts,
    newLimits = limits
  ) => {
    if (!user) return;
    try {
      setIsCloudSyncing(true);
      const userDocRef = doc(db, 'users', user.uid);
      const payload = sanitizeForFirestore({
        expenses: newExpenses,
        categories: newCategories,
        accounts: newAccounts,
        limits: newLimits,
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
            setExpenses(data.expenses);
            localStorage.setItem(LOCAL_KEYS.EXPENSES, JSON.stringify(data.expenses));
          }
          if (Array.isArray(data.categories)) {
            setCategories(data.categories);
            localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify(data.categories));
          }
          if (Array.isArray(data.accounts)) {
            setAccounts(data.accounts);
            localStorage.setItem(LOCAL_KEYS.ACCOUNTS, JSON.stringify(data.accounts));
          }
          if (Array.isArray(data.limits)) {
            setLimits(data.limits);
            localStorage.setItem(LOCAL_KEYS.LIMITS, JSON.stringify(data.limits));
          }
        } else {
          // Initialize document for new user
          const payload = sanitizeForFirestore({
            expenses,
            categories,
            accounts,
            limits,
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
    localStorage.setItem(LOCAL_KEYS.LIMITS, JSON.stringify(limits));
  }, [limits]);

  // Secondary backup background sync to Firestore
  useEffect(() => {
    if (!user || !hasLoadedCloud) return;

    const timeout = setTimeout(() => {
      saveToFirestoreNow(expenses, categories, accounts, limits);
    }, 600);

    return () => clearTimeout(timeout);
  }, [categories, accounts, limits]);

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

  // Derive unique tags
  const allTags = Array.from(
    new Set(expenses.flatMap(e => (e.tags || []).map(t => t.toLowerCase().trim())).filter(Boolean))
  ).sort();

  const addExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    const isInstallment = expenseData.paymentType === 'taksitli' && (expenseData.installmentCount || 1) > 1;
    const nowIso = new Date().toISOString();
    const parentId = 'exp-' + Date.now();

    let updatedList: Expense[] = [];

    if (isInstallment) {
      const count = expenseData.installmentCount!;
      const totalAmount = expenseData.totalAmount || (expenseData.amount * count);
      const installmentAmount = Math.round((totalAmount / count) * 100) / 100;
      
      const newExpensesBatch: Expense[] = [];

      for (let i = 1; i <= count; i++) {
        const currentAmount = (i === count)
          ? Math.round((totalAmount - (installmentAmount * (count - 1))) * 100) / 100
          : installmentAmount;

        const installmentDate = addMonthsToDateString(expenseData.date, i - 1);

        newExpensesBatch.push({
          ...expenseData,
          id: i === 1 ? parentId : `${parentId}-inst-${i}`,
          parentExpenseId: parentId,
          amount: currentAmount,
          totalAmount: totalAmount,
          installmentNumber: i,
          installmentCount: count,
          date: installmentDate,
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
    } else if (expenseData.paymentType === 'tekrarlayan') {
      const isUnlimited = Boolean(expenseData.isUnlimitedRecurrence);
      // For unlimited, pre-generate next 24 cycles (e.g. 2 years ahead) and mark as unlimited recurrence
      const count = isUnlimited ? 24 : (expenseData.recurrenceCount || 1);
      const freq = expenseData.recurrenceFrequency || 'aylik';
      const newExpensesBatch: Expense[] = [];

      for (let i = 1; i <= count; i++) {
        const itemDate = addRecurrenceToDateString(expenseData.date, freq, i - 1);
        newExpensesBatch.push({
          ...expenseData,
          id: i === 1 ? parentId : `${parentId}-rec-${i}`,
          parentExpenseId: parentId,
          recurrenceBatchId: parentId,
          isUnlimitedRecurrence: isUnlimited,
          installmentNumber: i,
          installmentCount: isUnlimited ? undefined : count,
          date: itemDate,
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

  const updateExpense = (id: string, updatedData: Partial<Expense>) => {
    const target = expenses.find(e => e.id === id);

    // Check if this is a recurring expense with future occurrences
    const isRecurring = target?.paymentType === 'tekrarlayan' || Boolean(target?.recurrenceBatchId);

    if (isRecurring && target?.recurrenceBatchId) {
      // Find all upcoming future occurrences in the same recurrence batch
      const futureBatchItems = expenses.filter(
        e => e.recurrenceBatchId === target.recurrenceBatchId && e.date > target.date && e.id !== id
      );

      if (futureBatchItems.length > 0) {
        const applyToFuture = confirm(
          'Bu tekrarlayan bir harcama.\n\n' +
          'Yapılan değişikliğin SADECE bu harcamaya mı yoksa BUNDAN SONRAKİ gelecekteki tekrarlara da yansımasını ister misiniz?\n\n' +
          '[Tamam] = Bu harcama ve sonraki tüm tekrarlar güncellensin (Eski geçmiş kayıtlar korunur)\n' +
          '[İptal] = Sadece bu harcama güncellensin'
        );

        if (applyToFuture) {
          // Update this item and all future items in this batch. Past entries remain untouched!
          const updatedList = expenses.map(item => {
            if (item.id === id) {
              return { ...item, ...updatedData };
            }
            if (item.recurrenceBatchId === target.recurrenceBatchId && item.date > target.date) {
              // Update future entries with new amount/details, keeping their original future dates
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
        // Automatically sync tags, title, description, category, subcategory, necessity, account, limit across ALL installments of this purchase
        const updatedList = expenses.map(item => {
          if (item.id === id) {
            return { ...item, ...updatedData };
          }
          if (item.parentExpenseId === target.parentExpenseId || item.id === target.parentExpenseId) {
            return {
              ...item,
              title: updatedData.title !== undefined ? updatedData.title : item.title,
              description: updatedData.description !== undefined ? updatedData.description : item.description,
              categoryId: updatedData.categoryId !== undefined ? updatedData.categoryId : item.categoryId,
              subcategoryId: updatedData.subcategoryId !== undefined ? updatedData.subcategoryId : item.subcategoryId,
              tags: updatedData.tags !== undefined ? updatedData.tags : item.tags,
              necessity: updatedData.necessity !== undefined ? updatedData.necessity : item.necessity,
              accountId: updatedData.accountId !== undefined ? updatedData.accountId : item.accountId,
              limitId: updatedData.limitId !== undefined ? updatedData.limitId : item.limitId,
            };
          }
          return item;
        });

        setExpenses(updatedList);
        saveToFirestoreNow(updatedList);
        return;
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

  const deleteExpense = (id: string) => {
    const target = expenses.find(e => e.id === id);
    let updatedList = expenses;

    if (target?.paymentType === 'tekrarlayan' && target?.recurrenceBatchId) {
      const isRelated = confirm('Bu tekrarlayan bir harcama. Sadece bu kaydı mı silmek istersiniz?\n\n[Tamam] = Gelecekteki tüm tekrarlar da silinsin (Geçmiş kayıtlar silinmez)\n[İptal] = Sadece bu tek kayıt silinsin');
      if (isRelated) {
        updatedList = expenses.filter(e => {
          if (e.recurrenceBatchId === target.recurrenceBatchId && e.date >= target.date) {
            return false;
          }
          return true;
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
    const updatedExpenses = expenses.map(e => (e.accountId === id ? { ...e, accountId: undefined } : e));
    setExpenses(updatedExpenses);
    saveToFirestoreNow(updatedExpenses, categories, nextAccounts);
  };

  const resetToDefaultData = () => {
    setExpenses([]);
    setCategories(INITIAL_CATEGORIES);
    setAccounts(INITIAL_ACCOUNTS);
    setLimits(INITIAL_LIMITS);
    localStorage.clear();
    saveToFirestoreNow([], INITIAL_CATEGORIES, INITIAL_ACCOUNTS, INITIAL_LIMITS);
  };

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        categories,
        accounts,
        limits,
        allTags,
        isCloudSyncing,
        editingExpense,
        setEditingExpense,
        addExpense,
        updateExpense,
        deleteExpense,
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
        resetToDefaultData,
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
