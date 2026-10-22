import React, { useState, useEffect, useMemo } from 'react';
import { X, Tag as TagIcon, Check, Calendar, CreditCard, ShieldAlert, Sparkles, Edit3, Repeat, Clock, TrendingUp, Trash2, Plus, Scissors, Layers } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import type { PaymentType, RecurrenceFrequency, NecessityLevel, Expense } from '../types';
import { getTodayString, formatCurrency } from '../utils/formatters';
import { withParentTags } from '../utils/tagHierarchy';
import { TagChips } from './TagChips';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface SplitItem {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  subcategoryId: string;
  necessity: NecessityLevel;
  limitId: string;
  tags: string[];
  title?: string;
}

const NECESSITY_OPTIONS: { id: NecessityLevel; label: string; desc: string; color: string }[] = [
  { id: 'Fizyolojik', label: 'Fizyolojik', desc: 'Mutfak, gıda, su, sağlık', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/40' },
  { id: 'Temel', label: 'Temel', desc: 'Kira, fatura, ulaşım', color: 'from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/40' },
  { id: 'Makul', label: 'Makul', desc: 'Sinema, kitap, sosyal hayat', color: 'from-indigo-500/20 to-purple-500/20 text-indigo-300 border-indigo-500/40' },
  { id: 'Kaçınılabilir', label: 'Kaçınılabilir', desc: 'Ertelenemez olmayan harcamalar', color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40' },
  { id: 'İsraf', label: 'İsraf', desc: 'Kaçınılması gereken lüks/tüketim', color: 'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/40' },
  { id: 'Tanımsız', label: 'Tanımsız', desc: 'Belirtilmemiş / nötr', color: 'from-slate-700/20 to-slate-800/20 text-slate-400 border-slate-700' },
];

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({ isOpen, onClose }) => {
  const {
    expenses,
    categories,
    accounts,
    limits,
    addExpense,
    addExpensesBatch,
    updateExpense,
    updateRecurringSeriesFuture,
    updateSplitBatch,
    deleteExpense,
    deleteSplitBatch,
    addCategory,
    editingExpense,
    setEditingExpense,
    tagParents
  } = useExpenses();

  const isEditing = Boolean(editingExpense);

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayString());
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('pesin');
  
  // Taksit & Tekrar states
  const [installmentCount, setInstallmentCount] = useState<number>(3);
  const [installmentCountInput, setInstallmentCountInput] = useState<string>('3');
  const [isAmountTotal, setIsAmountTotal] = useState<boolean>(true); // true = toplam tutar girdim, false = taksit başı tutar girdim
  const [startInstallmentNumberInput, setStartInstallmentNumberInput] = useState<string>('1');
  const [startRecurrenceNumberInput, setStartRecurrenceNumberInput] = useState<string>('1');
  const [remainingRecurrenceCountInput, setRemainingRecurrenceCountInput] = useState<string>('');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('aylik');
  const [recurrenceCount, setRecurrenceCount] = useState<number>(12);
  const [recurrenceCountInput, setRecurrenceCountInput] = useState<string>('12');
  const [isUnlimitedRecurrence, setIsUnlimitedRecurrence] = useState<boolean>(false);
  const [askApproval, setAskApproval] = useState<boolean>(true); // Günü geldiğinde önce onay istensin mi

  const [necessity, setNecessity] = useState<NecessityLevel>('Tanımsız');
  const [accountId, setAccountId] = useState<string>('');
  const [limitId, setLimitId] = useState<string>('');

  // Tags input
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');

  // --- AYRIM / BÖLME (SPLIT) STATES ---
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [isSplitBarOpen, setIsSplitBarOpen] = useState<boolean>(false);
  const [splitInputAmount, setSplitInputAmount] = useState<string>('');
  const [splits, setSplits] = useState<SplitItem[]>([]);
  const [activeSplitIndex, setActiveSplitIndex] = useState<number>(0);

  // Quick category creation states
  const [isQuickAddingCat, setIsQuickAddingCat] = useState<boolean>(false);
  const [quickCatName, setQuickCatName] = useState<string>('');
  const [quickCatColor, setQuickCatColor] = useState<string>('#3b82f6');
  const QUICK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

  // Pre-fill fields when editingExpense changes
  useEffect(() => {
    if (editingExpense) {
      // Check if this editing expense belongs to a split batch
      if (editingExpense.splitBatchId) {
        const batchItems = expenses.filter(e => e.splitBatchId === editingExpense.splitBatchId);
        if (batchItems.length > 0) {
          // Sort batch items consistently: first by installment number or creation order, or by id
          const sortedBatch = [...batchItems].sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0) || a.id.localeCompare(b.id));
          
          // Original total is either stored or sum of amounts
          const origTotal = editingExpense.splitOriginalTotal || sortedBatch.reduce((sum, item) => sum + (item.totalAmount || item.amount), 0);
          
          const reconstructedSplits: SplitItem[] = sortedBatch.map((item, idx) => ({
            id: `split-${idx + 1}`,
            name: `${idx + 1}. Ayrım`,
            amount: item.totalAmount || item.amount,
            categoryId: item.categoryId || '',
            subcategoryId: item.subcategoryId || '',
            necessity: item.necessity || 'Tanımsız',
            limitId: item.limitId || '',
            tags: [...(item.tags || [])],
            title: item.title || `${idx + 1}. Ayrım`,
          }));

          const targetIndex = sortedBatch.findIndex(e => e.id === editingExpense.id);
          const activeIdx = targetIndex >= 0 ? targetIndex : 0;
          const currentItem = sortedBatch[activeIdx];

          setAmount(String(origTotal));
          setDate(currentItem.date || getTodayString());
          setTitle(currentItem.title || '');
          setDescription(currentItem.description || '');
          setCategoryId(currentItem.categoryId || '');
          setSubcategoryId(currentItem.subcategoryId || '');
          setPaymentType(currentItem.paymentType || 'pesin');
          const count = currentItem.installmentCount || 3;
          setInstallmentCount(count);
          setInstallmentCountInput(String(count));
          setIsAmountTotal(true);
          setAskApproval(currentItem.askApproval !== false);
          setNecessity(currentItem.necessity || 'Tanımsız');
          setAccountId(currentItem.accountId || '');
          setLimitId(currentItem.limitId || '');
          setTags(currentItem.tags || []);

          setSplits(reconstructedSplits);
          setIsSplitMode(true);
          setIsSplitBarOpen(false);
          setActiveSplitIndex(activeIdx);
          return;
        }
      }

      // Standard single expense editing
      setAmount(String(editingExpense.amount));
      setDate(editingExpense.date);
      setTitle(editingExpense.title || '');
      setDescription(editingExpense.description || '');
      setCategoryId(editingExpense.categoryId || '');
      setSubcategoryId(editingExpense.subcategoryId || '');
      setNecessity(editingExpense.necessity || 'Tanımsız');
      setAccountId(editingExpense.accountId || '');
      setLimitId(editingExpense.limitId || '');
      setTags(editingExpense.tags || []);
      // Ensure correct paymentType even if not explicitly stored
      const inferredPaymentType: PaymentType = editingExpense.paymentType 
        || (editingExpense.recurrenceBatchId ? 'tekrarlayan' : editingExpense.parentExpenseId ? 'taksitli' : 'pesin');
      setPaymentType(inferredPaymentType);
      const instCount = editingExpense.installmentCount || 3;
      setInstallmentCount(instCount);
      setInstallmentCountInput(String(instCount));
      setIsAmountTotal(true);
      setRecurrenceFrequency(editingExpense.recurrenceFrequency || 'aylik');
      const recCount = editingExpense.recurrenceCount || 12;
      setRecurrenceCount(recCount);
      setRecurrenceCountInput(String(recCount));
      setIsUnlimitedRecurrence(Boolean(editingExpense.isUnlimitedRecurrence));
      setAskApproval(editingExpense.askApproval !== false);
      // Check if editing a recurring series to compute remaining count
      if ((inferredPaymentType === 'tekrarlayan' || editingExpense.recurrenceBatchId) && editingExpense.recurrenceBatchId) {
        const remainingBatch = expenses.filter(
          e => e.recurrenceBatchId === editingExpense.recurrenceBatchId && e.date >= editingExpense.date
        );
        const remCount = remainingBatch.length > 0 ? remainingBatch.length : 1;
        setRemainingRecurrenceCountInput(String(remCount));
      } else {
        setRemainingRecurrenceCountInput('');
      }

      setStartInstallmentNumberInput(String(editingExpense.installmentNumber || 1));
      setStartRecurrenceNumberInput(String(editingExpense.installmentNumber || 1));
      setIsSplitMode(false);
      setIsSplitBarOpen(false);
      setSplits([]);
      setActiveSplitIndex(0);
    } else {
      setAmount('');
      setDate(getTodayString());
      setTitle('');
      setDescription('');
      setCategoryId('');
      setSubcategoryId('');
      setPaymentType('pesin');
      setInstallmentCount(3);
      setInstallmentCountInput('3');
      setIsAmountTotal(true);
      setStartInstallmentNumberInput('1');
      setStartRecurrenceNumberInput('1');
      setRemainingRecurrenceCountInput('');
      setRecurrenceFrequency('aylik');
      setRecurrenceCount(12);
      setRecurrenceCountInput('12');
      setIsUnlimitedRecurrence(false);
      setAskApproval(true);
      setNecessity('Tanımsız');
      setAccountId('');
      setLimitId('');
      setTags([]);
      setIsSplitMode(false);
      setIsSplitBarOpen(false);
      setSplits([]);
      setActiveSplitIndex(0);
    }
  }, [editingExpense, isOpen, expenses]);

  const handleAddTag = (tagToAdd: string) => {
    const formatted = tagToAdd.trim().toLowerCase().replace(/^#/, '');
    if (formatted && !tags.includes(formatted)) {
      // Bağlı etiket: Eğer girilen etiket bir üst etikete bağlıysa, üst etiketi de otomatik dahil et
      const nextTags = withParentTags([...tags, formatted], tagParents);
      setTags(nextTags);
      if (isSplitMode) {
        updateActiveSplit({ tags: nextTags });
      }
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter(t => t !== tagToRemove);
    setTags(nextTags);
    if (isSplitMode) {
      updateActiveSplit({ tags: nextTags });
    }
  };

  const handleRemoveTagGroup = (parent: string, children: string[]) => {
    const toRemove = new Set([parent, ...children]);
    const nextTags = tags.filter(t => !toRemove.has(t));
    setTags(nextTags);
    if (isSplitMode) {
      updateActiveSplit({ tags: nextTags });
    }
  };

  // 1. Son girilen etiketler (tarih/oluşturulma sırasına göre en son kullanılan benzersiz 15 etiket)
  const recentTags = useMemo(() => {
    if (!expenses || !Array.isArray(expenses)) return [];
    const sorted = [...expenses].sort((a, b) => {
      const dateA = (a.date || '') + (a.createdAt || '');
      const dateB = (b.date || '') + (b.createdAt || '');
      return dateB.localeCompare(dateA);
    });
    const seen = new Set<string>();
    const result: string[] = [];
    for (const exp of sorted) {
      if (exp && exp.tags && Array.isArray(exp.tags)) {
        for (const t of exp.tags) {
          if (typeof t === 'string') {
            const clean = t.trim().toLowerCase();
            if (clean && !seen.has(clean)) {
              seen.add(clean);
              result.push(clean);
              if (result.length >= 15) break;
            }
          }
        }
      }
      if (result.length >= 15) break;
    }
    return result;
  }, [expenses]);

  // 2. En çok seçilen / kullanılan etiketler (kullanım frekansına göre tüm etiketler - sınırsız)
  const topTags = useMemo(() => {
    if (!expenses || !Array.isArray(expenses)) return [];
    const counts: Record<string, number> = {};
    for (const exp of expenses) {
      if (exp && exp.tags && Array.isArray(exp.tags)) {
        for (const t of exp.tags) {
          if (typeof t === 'string') {
            const clean = t.trim().toLowerCase();
            if (clean) {
              counts[clean] = (counts[clean] || 0) + 1;
            }
          }
        }
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);
  }, [expenses]);

  // Tüm benzersiz etiketler havuzu
  const allKnownTags = useMemo(() => {
    if (!expenses || !Array.isArray(expenses)) return [];
    const set = new Set<string>();
    for (const exp of expenses) {
      if (exp && exp.tags && Array.isArray(exp.tags)) {
        for (const t of exp.tags) {
          if (typeof t === 'string') {
            const clean = t.trim().toLowerCase();
            if (clean) set.add(clean);
          }
        }
      }
    }
    return Array.from(set);
  }, [expenses]);

  // 3. Birlikte Sık Kullanılan Etiketler (Co-occurrence / En alakalı 15 etiket)
  // Seçili etiketlerle geçmişte aynı harcamada en çok beraber yer alan etiketleri tespit eder
  const coOccurrenceTags = useMemo(() => {
    if (!expenses || !Array.isArray(expenses) || tags.length === 0) return [];

    const selectedSet = new Set(tags.map(t => t.toLowerCase().trim()));
    const scoreMap: Record<string, number> = {};

    for (const exp of expenses) {
      if (exp && exp.tags && Array.isArray(exp.tags) && exp.tags.length > 1) {
        const expTags = exp.tags.map(t => (typeof t === 'string' ? t.trim().toLowerCase() : '')).filter(Boolean);
        // Bu harcamada seçili etiketlerimizden en az biri var mı?
        const intersection = expTags.filter(t => selectedSet.has(t));
        if (intersection.length > 0) {
          // Bu harcamadaki diğer etiketlere puan ekle (daha çok seçili etiket barındıran harcamalar daha güçlü bağ oluşturur)
          const weight = intersection.length;
          for (const t of expTags) {
            if (!selectedSet.has(t)) {
              scoreMap[t] = (scoreMap[t] || 0) + weight;
            }
          }
        }
      }
    }

    // En çok birlikte kullanılan ilk 15 etiketi sırala
    return Object.entries(scoreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([t]) => t);
  }, [expenses, tags]);

  // 4. Yazarken anlık eşleşen etiket önerileri (benzer etiketler)
  const matchingSuggestions = useMemo(() => {
    const query = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (!query) return [];
    return allKnownTags
      .filter(t => t.includes(query) && !tags.includes(t))
      .slice(0, 8);
  }, [tagInput, allKnownTags, tags]);

  const rawNumber = parseFloat(amount) || 0;
  // If user entered total amount, calculate installment amount; if entered installment, calculate total
  const calculatedTotal = paymentType === 'taksitli' && !isAmountTotal
    ? rawNumber * (installmentCount || 1)
    : rawNumber;
  const calculatedInstallment = paymentType === 'taksitli' && (installmentCount || 1) > 0
    ? (isAmountTotal ? calculatedTotal / installmentCount : rawNumber)
    : rawNumber;

  // Dynamic recalculation when total amount changes in split mode
  const handleAmountChange = (newAmountStr: string) => {
    setAmount(newAmountStr);
    const newTotal = parseFloat(newAmountStr);

    if (isSplitMode && splits.length > 0) {
      if (isNaN(newTotal) || newTotal <= 0) return;

      // Sum of fixed splits (all except the last one / remaining split)
      const fixedSplitsSum = splits
        .slice(0, -1)
        .reduce((sum, item) => sum + item.amount, 0);

      // If new total is less than the sum of other splits, show warning / validation error
      if (newTotal <= fixedSplitsSum) {
        // We still allow user to adjust or show feedback
        setSplits(prev => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          next[lastIdx] = {
            ...next[lastIdx],
            amount: 0,
          };
          return next;
        });
        return;
      }

      // Automatically recalculate remaining split amount
      const newRemaining = Math.round((newTotal - fixedSplitsSum) * 100) / 100;
      setSplits(prev => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        next[lastIdx] = {
          ...next[lastIdx],
          amount: newRemaining,
        };
        return next;
      });
    }
  };

  // Split management functions
  const handleOpenSplitBar = () => {
    if (isNaN(rawNumber) || rawNumber <= 0) {
      alert('Lütfen önce bölmek istediğiniz toplam harcama tutarını giriniz.');
      return;
    }
    setSplitInputAmount('');
    setIsSplitBarOpen(true);
  };

  const handleConfirmSplit = () => {
    const splitVal = parseFloat(splitInputAmount);
    if (isNaN(splitVal) || splitVal <= 0) {
      alert('Lütfen bölünecek geçerli bir tutar giriniz.');
      return;
    }

    // SCENARIO 1: İlk kez ayırma işlemi (tek harcamadan 2 ayrıma)
    if (!isSplitMode || splits.length === 0) {
      if (splitVal >= rawNumber) {
        alert(`Ayrılacak miktar toplam tutardan (${formatCurrency(rawNumber)}) küçük olmalıdır.`);
        return;
      }

      const remainingVal = Math.round((rawNumber - splitVal) * 100) / 100;

      // 1. Ayrım: Kullanıcının girdiği ve yeni ayırdığı kısım (yeni başlık ve seçimler atanacak)
      const split1: SplitItem = {
        id: 'split-1',
        name: `1. Ayrım (${rawNumber} TL)`,
        amount: splitVal,
        categoryId: '',
        subcategoryId: '',
        necessity: 'Tanımsız',
        limitId: '',
        tags: [],
        title: `1. Ayrım (${rawNumber} TL)`,
      };

      // 2. Ayrım (Kalan kısım): Bölünmeden önceki orijinal başlık, kategori ve etiketleri üzerine alır
      const split2: SplitItem = {
        id: 'split-2',
        name: `2. Ayrım (${rawNumber} TL)`,
        amount: remainingVal,
        categoryId,
        subcategoryId,
        necessity,
        limitId,
        tags: [...tags],
        title: title || `2. Ayrım (${rawNumber} TL)`,
      };

      setSplits([split1, split2]);
      setIsSplitMode(true);
      setIsSplitBarOpen(false);
      // Yeni ayrılan kısma odaklan ve form alanlarını temizle ki yeni başlık/kategori girilsin
      setActiveSplitIndex(0);
      setCategoryId('');
      setSubcategoryId('');
      setNecessity('Tanımsız');
      setLimitId('');
      setTags([]);
      setTitle(`1. Ayrım (${rawNumber} TL)`);
      return;
    }

    // SCENARIO 2: RECURRING SPLIT - Seçili mevcut sekmeden yeni bir parça ayırma
    // Seçili sekmeden splitVal miktarı yeni bir ayrım olarak koparılır (yeni başlık/kategori alır)
    // Seçili sekmede ise kalan miktar kalır ve önceki etiket/kategorilerini korur.
    const activeSplit = splits[activeSplitIndex];
    if (!activeSplit) return;

    if (splitVal >= activeSplit.amount) {
      alert(
        `Ayrılacak miktar seçili ayrımın tutarından (${formatCurrency(activeSplit.amount)}) küçük olmalıdır.`
      );
      return;
    }

    const separatedPortion = splitVal;
    const remainingPortion = Math.round((activeSplit.amount - splitVal) * 100) / 100;

    // Build new updated splits array
    const newSplits: SplitItem[] = [];
    splits.forEach((s, idx) => {
      if (idx === activeSplitIndex) {
        // Yeni ayrılan kısım (boş/yeni seçimler ve başlık alır)
        newSplits.push({
          id: `split-${Date.now()}`,
          name: '',
          amount: separatedPortion,
          categoryId: '',
          subcategoryId: '',
          necessity: 'Tanımsız',
          limitId: '',
          tags: [],
          title: '',
        });

        // Kalan kısım: Mevcut etiket, kategori ve başlıklarını korur
        newSplits.push({
          ...s,
          amount: remainingPortion,
          categoryId,
          subcategoryId,
          necessity,
          limitId,
          tags: [...tags],
          title: title || s.title,
        });
      } else {
        newSplits.push(s);
      }
    });

    // Re-index all split names and titles nicely
    const reindexedSplits = newSplits.map((s, idx) => ({
      ...s,
      name: `${idx + 1}. Ayrım (${rawNumber} TL)`,
      title: s.title || `${idx + 1}. Ayrım (${rawNumber} TL)`,
    }));

    setSplits(reindexedSplits);
    setIsSplitBarOpen(false);
    // Yeni ayrılan sekme (activeSplitIndex konumundaki yeni parça) aktif olsun ve form sıfırlansın
    setActiveSplitIndex(activeSplitIndex);
    setCategoryId('');
    setSubcategoryId('');
    setNecessity('Tanımsız');
    setLimitId('');
    setTags([]);
    setTitle(`${activeSplitIndex + 1}. Ayrım (${rawNumber} TL)`);
  };

  const handleCancelSplitMode = () => {
    if (confirm('Ayrımı iptal edip harcamayı tek parça haline getirmek istiyor musunuz?')) {
      setIsSplitMode(false);
      setIsSplitBarOpen(false);
      setSplits([]);
      setActiveSplitIndex(0);
    }
  };

  // Sync current form fields into active split item
  const updateActiveSplit = (updatedFields: Partial<SplitItem>) => {
    if (!isSplitMode || splits.length === 0) return;
    setSplits(prev => {
      const next = [...prev];
      if (next[activeSplitIndex]) {
        next[activeSplitIndex] = {
          ...next[activeSplitIndex],
          ...updatedFields,
        };
      }
      return next;
    });
  };

  // When switching split tab
  const handleSelectSplitTab = (index: number) => {
    if (index === activeSplitIndex || !splits[index]) return;
    // Save current fields to current active split first
    const currentSplit = splits[activeSplitIndex];
    if (currentSplit) {
      currentSplit.categoryId = categoryId;
      currentSplit.subcategoryId = subcategoryId;
      currentSplit.necessity = necessity;
      currentSplit.limitId = limitId;
      currentSplit.tags = [...tags];
      currentSplit.title = title;
      currentSplit.amount = splits[activeSplitIndex].amount;
    }

    // Switch to target split and populate form fields
    const targetSplit = splits[index];
    setActiveSplitIndex(index);
    setCategoryId(targetSplit.categoryId || '');
    setSubcategoryId(targetSplit.subcategoryId || '');
    setNecessity(targetSplit.necessity || 'Tanımsız');
    setLimitId(targetSplit.limitId || '');
    setTags([...targetSplit.tags]);
    setTitle(targetSplit.title || '');
  };

  // Keep active split item synced as user edits inputs
  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    setSubcategoryId('');
    if (isSplitMode) {
      updateActiveSplit({ categoryId: catId, subcategoryId: '' });
    }
  };

  const handleSubcategoryChange = (subId: string) => {
    setSubcategoryId(subId);
    if (isSplitMode) {
      updateActiveSplit({ subcategoryId: subId });
    }
  };

  const handleNecessityChange = (nec: NecessityLevel) => {
    setNecessity(nec);
    if (isSplitMode) {
      updateActiveSplit({ necessity: nec });
    }
  };

  const handleLimitChange = (limId: string) => {
    setLimitId(limId);
    if (isSplitMode) {
      updateActiveSplit({ limitId: limId });
    }
  };

  if (!isOpen) return null;

  const selectedCategory = categories.find(c => c.id === categoryId);

  const handleClose = () => {
    setEditingExpense(null);
    setIsSplitMode(false);
    setIsSplitBarOpen(false);
    setSplits([]);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(rawNumber) || rawNumber <= 0) {
      alert('Lütfen geçerli bir miktar giriniz.');
      return;
    }

    if (!date) {
      alert('Lütfen bir tarih seçiniz.');
      return;
    }

    // 1. IS SPLIT MODE: Create or update batch of expenses linked together
    if (isSplitMode && splits.length > 0) {
      // Ensure the active split has the latest state from current inputs
      const finalSplits = splits.map((s, idx) => {
        if (idx === activeSplitIndex) {
          return {
            ...s,
            categoryId,
            subcategoryId,
            necessity,
            limitId,
            tags: [...tags],
            title: title.trim() || s.title || `${idx + 1}. Ayrım (${rawNumber} TL)`,
          };
        }
        return s;
      });

      // VALIDATION: Total amount check
      const splitsSum = finalSplits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(splitsSum - rawNumber) > 0.05) {
        alert(
          `HATA: Ayrımlar toplamı (${formatCurrency(splitsSum)}), girilen ana tutara (${formatCurrency(rawNumber)}) eşit olmalıdır!\n\n` +
          `Lütfen tutarları kontrol ediniz.`
        );
        return;
      }

      // Check for zero or negative split amounts
      const hasInvalidAmount = finalSplits.some(s => s.amount <= 0);
      if (hasInvalidAmount) {
        alert('HATA: Ayrılan miktarlar 0 TL veya negatif olamaz! Lütfen toplam tutarı ve ayrımları kontrol ediniz.');
        return;
      }

      const splitBatchId = (isEditing && editingExpense?.splitBatchId) 
        ? editingExpense.splitBatchId 
        : ('split-' + Date.now());

      const isInstallment = paymentType === 'taksitli' && (installmentCount || 1) > 1;

      const batchToSave: Omit<Expense, 'id' | 'createdAt'>[] = finalSplits.map((sp, idx) => {
        // If installment, calculate each split's per-installment amount proportionally
        const splitInstallmentAmt = isInstallment
          ? Math.round((sp.amount / installmentCount) * 100) / 100
          : sp.amount;

        return {
          amount: isInstallment ? splitInstallmentAmt : sp.amount,
          totalAmount: isInstallment ? sp.amount : undefined,
          date,
          title: sp.title || (title ? `${title} (${idx + 1}. Ayrım)` : `${idx + 1}. Ayrım (${rawNumber} TL)`),
          description: description.trim() || undefined,
          categoryId: sp.categoryId || undefined,
          subcategoryId: sp.subcategoryId || undefined,
          tags: sp.tags,
          paymentType,
          installmentCount: isInstallment ? installmentCount : undefined,
          askApproval: isInstallment ? askApproval : undefined,
          necessity: sp.necessity,
          accountId: accountId || undefined,
          limitId: sp.limitId || undefined,
          splitBatchId,
          splitOriginalTotal: rawNumber,
          splitTitle: `${idx + 1}. Ayrım (${rawNumber} TL)`,
        };
      });

      if (isEditing && editingExpense?.splitBatchId) {
        updateSplitBatch(editingExpense.splitBatchId, batchToSave);
      } else {
        addExpensesBatch(batchToSave);
      }

      handleClose();
      return;
    }

    // 2. STANDARD SINGLE EXPENSE
    if (isEditing && editingExpense) {
      // Tekrarlayan seri düzenleniyorsa:
      if ((editingExpense.paymentType === 'tekrarlayan' || editingExpense.recurrenceBatchId) && editingExpense.recurrenceBatchId) {
        const remainingCount = parseInt(remainingRecurrenceCountInput, 10);
        const parsedStartRecurrence = parseInt(startRecurrenceNumberInput, 10);
        updateRecurringSeriesFuture(
          editingExpense.id,
          {
            amount: rawNumber,
            date,
            title: title.trim() || undefined,
            description: description.trim() || undefined,
            categoryId: categoryId || undefined,
            subcategoryId: subcategoryId || undefined,
            tags,
            necessity,
            accountId: accountId || undefined,
            limitId: limitId || undefined,
            recurrenceFrequency,
            askApproval,
          },
          !isNaN(remainingCount) && remainingCount > 0 ? remainingCount : undefined,
          !isNaN(parsedStartRecurrence) && parsedStartRecurrence > 0 ? parsedStartRecurrence : undefined
        );
      } else {
        // Update existing expense (bireysel harcama güncellemesi: geçmiş ve diğer kayıtları bozmaz)
        updateExpense(editingExpense.id, {
          amount: rawNumber,
          date,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          categoryId: categoryId || undefined,
          subcategoryId: subcategoryId || undefined,
          tags,
          necessity,
          accountId: accountId || undefined,
          limitId: limitId || undefined,
          askApproval: (paymentType === 'taksitli' || paymentType === 'tekrarlayan') ? askApproval : undefined,
        });
      }
    } else {
      // Add new expense
      const parsedStartInstallment = parseInt(startInstallmentNumberInput, 10);
      const parsedStartRecurrence = parseInt(startRecurrenceNumberInput, 10);

      addExpense({
        amount: paymentType === 'taksitli' ? calculatedInstallment : rawNumber,
        totalAmount: paymentType === 'taksitli' ? calculatedTotal : undefined,
        date,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        tags,
        paymentType,
        installmentCount: paymentType === 'taksitli' ? installmentCount : undefined,
        startInstallmentNumber: (paymentType === 'taksitli' && !isAmountTotal && !isNaN(parsedStartInstallment) && parsedStartInstallment > 0)
          ? parsedStartInstallment
          : undefined,
        recurrenceFrequency: paymentType === 'tekrarlayan' ? recurrenceFrequency : undefined,
        recurrenceCount: paymentType === 'tekrarlayan' ? (isUnlimitedRecurrence ? undefined : recurrenceCount) : undefined,
        isUnlimitedRecurrence: paymentType === 'tekrarlayan' ? isUnlimitedRecurrence : undefined,
        startRecurrenceNumber: (paymentType === 'tekrarlayan' && !isNaN(parsedStartRecurrence) && parsedStartRecurrence > 0)
          ? parsedStartRecurrence
          : undefined,
        askApproval: (paymentType === 'taksitli' || paymentType === 'tekrarlayan') ? askApproval : undefined,
        necessity,
        accountId: accountId || undefined,
        limitId: limitId || undefined,
      });
    }

    handleClose();
  };

  const handleSaveQuickCat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickCatName.trim()) return;

    addCategory({
      name: quickCatName.trim(),
      color: quickCatColor,
      iconName: 'Folder',
      subcategories: [],
    });

    // En son eklenen kategorinin seçilmesi için listeyi tarayacak
    // Context senkron çalıştığından veya isim üzerinden eşleşebilir
    const createdCatName = quickCatName.trim();
    setQuickCatName('');
    setIsQuickAddingCat(false);
    
    // Küçük bir gecikmeyle yeni oluşan kategoriyi seçelim
    setTimeout(() => {
      const found = categories.find(c => c.name.toLowerCase() === createdCatName.toLowerCase());
      if (found) {
        setCategoryId(found.id);
      }
    }, 50);
  };

  const handleDeleteExpense = () => {
    if (!editingExpense) return;
    if (editingExpense.splitBatchId) {
      if (confirm('Bu bölünmüş bir harcama. Bu işleme ait tüm ayrımları silmek istediğinize emin misiniz?')) {
        deleteSplitBatch(editingExpense.splitBatchId);
        handleClose();
      }
      return;
    }
    if (confirm('Bu harcama kaydını kalıcı olarak silmek istediğinize emin misiniz?')) {
      deleteExpense(editingExpense.id);
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-slate-700/80 shadow-2xl bg-slate-900 text-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 pb-3 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isEditing ? 'Harcamayı Düzenle' : 'Yeni Harcama Ekle'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? 'Harcama detaylarını güncelleyin' : 'Geçmiş, bugünkü veya taksitli masrafınızı kaydedin'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          
          {/* Payment Type / Seri Ayarları */}
          {(!isEditing || paymentType === 'tekrarlayan' || paymentType === 'taksitli' || Boolean(editingExpense?.recurrenceBatchId)) && (
            <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
              {!isEditing ? (
                <>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Ödeme Türü</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentType('pesin')}
                      className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                        paymentType === 'pesin'
                          ? 'bg-teal-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Check className={`w-3 h-3 ${paymentType === 'pesin' ? 'block' : 'hidden'}`} />
                      <span>Peşin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentType('taksitli')}
                      className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                        paymentType === 'taksitli'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Check className={`w-3 h-3 ${paymentType === 'taksitli' ? 'block' : 'hidden'}`} />
                      <span>Taksitli</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentType('tekrarlayan')}
                      className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                        paymentType === 'tekrarlayan'
                          ? 'bg-indigo-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Repeat className="w-3 h-3" />
                      <span>Tekrarlı</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-700/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <Repeat className="w-4 h-4 text-indigo-400" />
                    <span>Tekrarlayan Harcama Serisi Ayarları</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                    Gelecek Seriyi Güncelle
                  </span>
                </div>
              )}

              {/* Taksitli Seçenekleri */}
              {paymentType === 'taksitli' && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-medium">Taksit Sayısı:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={installmentCountInput}
                        onChange={e => {
                          const rawVal = e.target.value.replace(/[^0-9]/g, '');
                          setInstallmentCountInput(rawVal);
                          if (rawVal === '') {
                            setInstallmentCount(1);
                          } else {
                            const val = parseInt(rawVal, 10);
                            setInstallmentCount(Math.min(val, 60));
                          }
                        }}
                        onBlur={() => {
                          if (!installmentCountInput || parseInt(installmentCountInput, 10) < 2) {
                            setInstallmentCount(2);
                            setInstallmentCountInput('2');
                          } else if (parseInt(installmentCountInput, 10) > 60) {
                            setInstallmentCount(60);
                            setInstallmentCountInput('60');
                          }
                        }}
                        className="w-16 px-2 py-1 bg-slate-800 border border-amber-500/50 text-amber-300 font-bold text-center text-xs rounded-lg outline-none"
                        placeholder="Örn: 3"
                      />
                      <span className="text-[11px] text-amber-400 font-semibold">Taksit</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-500/20">
                    <span className="text-slate-300">Girdiğiniz Tutar Türü:</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAmountTotal(true)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isAmountTotal ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Toplam Tutar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAmountTotal(false)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          !isAmountTotal ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Her Bir Taksit
                      </button>
                    </div>
                  </div>

                  {/* Sadece "Her Bir Taksit" seçildiğinde Başlangıç Taksit No alanı gösterilir */}
                  {!isAmountTotal && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-500/20">
                      <div className="flex flex-col">
                        <span className="text-amber-200 font-medium">Başlangıç Taksit No:</span>
                        <span className="text-[10px] text-slate-400">Örn: 3 girilirse taksitler 3 / {((parseInt(startInstallmentNumberInput, 10) || 1) + installmentCount - 1)} olarak başlar</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={startInstallmentNumberInput}
                          onChange={e => {
                            const rawVal = e.target.value.replace(/[^0-9]/g, '');
                            setStartInstallmentNumberInput(rawVal);
                          }}
                          onBlur={() => {
                            if (!startInstallmentNumberInput || parseInt(startInstallmentNumberInput, 10) < 1) {
                              setStartInstallmentNumberInput('1');
                            }
                          }}
                          className="w-16 px-2 py-1 bg-slate-800 border border-amber-500/50 text-amber-300 font-bold text-center text-xs rounded-lg outline-none"
                          placeholder="1"
                        />
                        <span className="text-[11px] text-amber-400 font-semibold">. Taksit</span>
                      </div>
                    </div>
                  )}

                  {/* Onay İstensin mi Ayarı */}
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-amber-500/20">
                    <div className="flex flex-col">
                      <span className="text-amber-200 font-medium">Günü gelince sorulsun mu?</span>
                      <span className="text-[10px] text-slate-400">Vadesi geldiğinde hesaba yansımadan önce onayınızı ister</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={askApproval}
                        onChange={e => setAskApproval(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {rawNumber > 0 && (
                    <div className="text-[11px] text-amber-300/90 pt-1 flex justify-between bg-slate-900/60 p-2 rounded-md">
                      <span>Toplam: <b>{calculatedTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</b></span>
                      <span>Aylık: <b>{calculatedInstallment.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</b> ({installmentCount || 1} ay)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tekrarlı Harcama Seçenekleri */}
              {paymentType === 'tekrarlayan' && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-indigo-300 font-medium">Tekrar Periyodu:</span>
                    <select
                      value={recurrenceFrequency}
                      onChange={e => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                      className="bg-slate-800 border border-indigo-500/40 text-indigo-300 text-xs rounded-lg px-2 py-1 outline-none"
                    >
                      <option value="gunluk">Günlük</option>
                      <option value="haftalik">Haftalık</option>
                      <option value="aylik">Aylık (Örn: Kira, Abonelik)</option>
                      <option value="yillik">Yıllık (Örn: Vergi, Sigorta)</option>
                    </select>
                  </div>

                  {/* Sınırsız Tekrar Seçimi */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-500/20">
                    <span className="text-slate-300">Tekrar Türü:</span>
                    <div className="flex items-center gap-1.5 bg-slate-800/90 p-0.5 rounded-lg border border-indigo-500/30">
                      <button
                        type="button"
                        onClick={() => setIsUnlimitedRecurrence(true)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          isUnlimitedRecurrence
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Sınırsız (Sürekli)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsUnlimitedRecurrence(false)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          !isUnlimitedRecurrence
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Belirli Sayıda
                      </button>
                    </div>
                  </div>

                  {!isUnlimitedRecurrence ? (
                    <>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-500/20">
                        <span className="text-slate-300">
                          {isEditing && editingExpense?.recurrenceBatchId ? 'Üretilecek/Kalan Tekrar Sayısı:' : 'Toplam Tekrar Sayısı:'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={isEditing && editingExpense?.recurrenceBatchId ? remainingRecurrenceCountInput : recurrenceCountInput}
                            onChange={e => {
                              const rawVal = e.target.value.replace(/[^0-9]/g, '');
                              if (isEditing && editingExpense?.recurrenceBatchId) {
                                setRemainingRecurrenceCountInput(rawVal);
                              } else {
                                setRecurrenceCountInput(rawVal);
                                if (rawVal === '') {
                                  setRecurrenceCount(1);
                                } else {
                                  const val = parseInt(rawVal, 10);
                                  setRecurrenceCount(Math.min(val, 120));
                                }
                              }
                            }}
                            onBlur={() => {
                              if (isEditing && editingExpense?.recurrenceBatchId) {
                                if (!remainingRecurrenceCountInput || parseInt(remainingRecurrenceCountInput, 10) < 1) {
                                  setRemainingRecurrenceCountInput('1');
                                } else if (parseInt(remainingRecurrenceCountInput, 10) > 120) {
                                  setRemainingRecurrenceCountInput('120');
                                }
                              } else {
                                if (!recurrenceCountInput || parseInt(recurrenceCountInput, 10) < 1) {
                                  setRecurrenceCount(1);
                                  setRecurrenceCountInput('1');
                                } else if (parseInt(recurrenceCountInput, 10) > 120) {
                                  setRecurrenceCount(120);
                                  setRecurrenceCountInput('120');
                                }
                              }
                            }}
                            className="w-16 px-2 py-1 bg-slate-800 border border-indigo-500/50 text-indigo-300 font-bold text-center text-xs rounded-lg outline-none"
                          />
                          <span className="text-[11px] text-indigo-300 font-semibold">Kez</span>
                        </div>
                      </div>

                      {/* Başlangıç Tekrar Numarası (Yeni harcama oluştururken veya var olan seriyi güncellerken) */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-500/20">
                        <div className="flex flex-col">
                          <span className="text-indigo-200 font-medium">
                            {isEditing ? 'Bu Kaydın Tekrar No (Başlangıç):' : 'Başlangıç Tekrar No:'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isEditing
                              ? 'Bu kaydın tekrar sırasını değiştirebilirsiniz. Gelecek kayıtlar buradan başlayarak artar (geçmiş korunur).'
                              : 'Örn: 5 girilirse tekrarlar 5. Tekrar, 6. Tekrar olarak başlar'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={startRecurrenceNumberInput}
                            onChange={e => {
                              const rawVal = e.target.value.replace(/[^0-9]/g, '');
                              setStartRecurrenceNumberInput(rawVal);
                            }}
                            onBlur={() => {
                              if (!startRecurrenceNumberInput || parseInt(startRecurrenceNumberInput, 10) < 1) {
                                setStartRecurrenceNumberInput(String(editingExpense?.installmentNumber || 1));
                              }
                            }}
                            className="w-16 px-2 py-1 bg-slate-800 border border-indigo-500/50 text-indigo-300 font-bold text-center text-xs rounded-lg outline-none"
                            placeholder="1"
                          />
                          <span className="text-[11px] text-indigo-400 font-semibold">. Tekrar</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-1.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-200 flex items-center gap-1.5">
                      <span>♾️</span>
                      <span>Her periyot otomatik tekrarlanır. İleride tutar değişirse sadece geleceğe yansır, geçmiş kayıtlar korunur.</span>
                    </div>
                  )}

                  {/* Onay İstensin mi Ayarı */}
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-indigo-500/20">
                    <div className="flex flex-col">
                      <span className="text-indigo-200 font-medium">Günü gelince sorulsun mu?</span>
                      <span className="text-[10px] text-slate-400">Tekrar günü geldiğinde hesaba yansımadan önce onayınızı ister</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={askApproval}
                        onChange={e => setAskApproval(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Amount & Date (REQUIRED) */}
          <div className="p-3 bg-slate-800/40 rounded-2xl border border-slate-700/60 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-emerald-400">
                    {paymentType === 'taksitli' && !isAmountTotal ? 'Her Bir Taksit Tutarı (TL)' : 'Tutar (TL)'} <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    {isSplitMode && (
                      <button
                        type="button"
                        onClick={handleCancelSplitMode}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 transition-all shadow-sm"
                        title="Ayrımı İptal Et"
                      >
                        Ayrımı Kaldır
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleOpenSplitBar}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30"
                      title={isSplitMode ? `${activeSplitIndex + 1}. Ayrımı Tekrar Ayır` : 'Harcamayı birden fazla kategori ve etikete ayır'}
                    >
                      <Scissors className="w-3 h-3" />
                      <span>{isSplitMode ? `${activeSplitIndex + 1}. Ayrımı Ayır` : 'Ayır'}</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => handleAmountChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-emerald-500/40 focus:border-emerald-400 rounded-xl text-white font-semibold placeholder-slate-500 outline-none transition-all"
                  />
                  <span className="absolute right-3 top-2 text-xs text-emerald-400 font-bold">TL</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-emerald-400">
                    Tarih <span className="text-rose-400">*</span>
                  </label>
                  {/* Hızlı Tarih Seçim Butonları */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        setDate(today.toISOString().split('T')[0]);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                        date === getTodayString()
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
                      }`}
                    >
                      Bugün
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setDate(yesterday.toISOString().split('T')[0]);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                        (() => {
                          const y = new Date();
                          y.setDate(y.getDate() - 1);
                          return date === y.toISOString().split('T')[0];
                        })()
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
                      }`}
                    >
                      Dün
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const dayBefore = new Date();
                        dayBefore.setDate(dayBefore.getDate() - 2);
                        setDate(dayBefore.toISOString().split('T')[0]);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                        (() => {
                          const b = new Date();
                          b.setDate(b.getDate() - 2);
                          return date === b.toISOString().split('T')[0];
                        })()
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
                      }`}
                    >
                      Dünden Önceki Gün
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-emerald-500/40 focus:border-emerald-400 rounded-xl text-white text-sm outline-none transition-all"
                  />
                  <Calendar className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* AYIR BUTONU TIKLANDIĞINDA AÇILAN YATAY GİRİŞ BARI */}
            {isSplitBarOpen && (
              <div className="p-3 bg-slate-900/95 border border-teal-500/50 rounded-xl space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-300 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5" />
                    <span>
                      {isSplitMode && splits[activeSplitIndex]
                        ? `${activeSplitIndex + 1}. Ayrımı Ayır (${formatCurrency(splits[activeSplitIndex].amount)})`
                        : 'Ayrılacak Miktarı Giriniz'}
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isSplitMode && splits[activeSplitIndex] ? (
                      <>Seçili Ayrım: <b className="text-white">{formatCurrency(splits[activeSplitIndex].amount)}</b></>
                    ) : (
                      <>Toplam: <b className="text-white">{formatCurrency(rawNumber)}</b></>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ayrılacak Tutar (TL)..."
                      value={splitInputAmount}
                      onChange={e => setSplitInputAmount(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleConfirmSplit();
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 focus:border-teal-400 rounded-lg text-xs text-white outline-none"
                      autoFocus
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-semibold">TL</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmSplit}
                    className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
                  >
                    OK / Ayır
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSplitBarOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                    title="Kapat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {parseFloat(splitInputAmount) > 0 && (
                  <div className="text-[11px] text-teal-300/90 flex justify-between bg-slate-800/60 px-2 py-1 rounded-md">
                    {isSplitMode && splits[activeSplitIndex] ? (
                      parseFloat(splitInputAmount) < splits[activeSplitIndex].amount ? (
                        <>
                          <span>1. Kısım: <b>{formatCurrency(parseFloat(splitInputAmount))}</b></span>
                          <span>2. Kısım: <b>{formatCurrency(splits[activeSplitIndex].amount - parseFloat(splitInputAmount))}</b></span>
                        </>
                      ) : (
                        <span className="text-rose-400">Girilen tutar seçili ayrımın tutarından küçük olmalıdır!</span>
                      )
                    ) : (
                      parseFloat(splitInputAmount) < rawNumber ? (
                        <>
                          <span>1. Ayrım: <b>{formatCurrency(parseFloat(splitInputAmount))}</b></span>
                          <span>2. Ayrım (Kalan): <b>{formatCurrency(rawNumber - parseFloat(splitInputAmount))}</b></span>
                        </>
                      ) : (
                        <span className="text-rose-400">Girilen tutar toplam tutardan küçük olmalıdır!</span>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* BÖLÜNDÜKTEN SONRA OLUŞAN AYRIM TABLARI (TABS BAR) */}
            {isSplitMode && splits.length > 0 && (
              <div className="pt-2 border-t border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-teal-400" />
                    <span>Ayrım Sekmeleri (Düzenlemek istediğiniz kısmı seçin):</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelSplitMode}
                    className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                  >
                    Ayrımı Kaldır
                  </button>
                </div>

                {/* Uyarı: Ana tutar ayrımların altına düşerse */}
                {(() => {
                  const splitsSum = splits.reduce((sum, s) => sum + s.amount, 0);
                  const remaining = splits[splits.length - 1]?.amount || 0;
                  if (rawNumber > 0 && Math.abs(splitsSum - rawNumber) > 0.05) {
                    return (
                      <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-[11px] text-rose-300 flex items-center justify-between">
                        <span>⚠️ Toplam tutar ({formatCurrency(rawNumber)}) ayrımlar toplamından ({formatCurrency(splitsSum)}) farklı!</span>
                      </div>
                    );
                  }
                  if (remaining <= 0) {
                    return (
                      <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-300">
                        ⚠️ Toplam tutar düşürüldü ve kalan ayrım 0 TL oldu. Lütfen toplam tutarı veya diğer ayrımları kontrol ediniz.
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {splits.map((sp, idx) => {
                    const isTabActive = activeSplitIndex === idx;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => handleSelectSplitTab(idx)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          isTabActive
                            ? 'bg-teal-500/20 border-teal-400 ring-1 ring-teal-400/50 shadow-md'
                            : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-bold truncate mr-1 ${isTabActive ? 'text-teal-300' : 'text-slate-300'}`}>
                            {idx + 1}. Ayrım ({rawNumber} TL)
                          </span>
                          <span className={`text-xs font-black shrink-0 ${isTabActive ? 'text-emerald-300' : 'text-slate-200'}`}>
                            {formatCurrency(sp.amount)}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400 truncate mt-0.5">
                          {sp.categoryId ? (categories.find(c => c.id === sp.categoryId)?.name || 'Kategori Seçili') : 'Kategori Seçilmedi'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* GÖRSEL AYIRICI ÇİZGİ / SEPARATOR */}
          <div className="flex items-center gap-2 py-0.5">
            <div className="flex-1 border-t border-slate-800"></div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
              {isSplitMode ? `${activeSplitIndex + 1}. Ayrım Detayları (${formatCurrency(splits[activeSplitIndex]?.amount || 0)})` : 'Masraf Detayları'}
            </span>
            <div className="flex-1 border-t border-slate-800"></div>
          </div>

          {/* Necessity (Tasarruf & İhtiyaç Seviyesi) */}
          <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800 space-y-1.5">
            <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-teal-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Tasarruf / İhtiyaç Seviyesi
              </span>
              <span className="text-[10px] text-slate-500">Harcama ne kadar gerekli?</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {NECESSITY_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleNecessityChange(opt.id)}
                  className={`p-1.5 rounded-lg border text-left transition-all ${
                    necessity === opt.id
                      ? `bg-gradient-to-br ${opt.color} shadow-sm border-teal-400/80 font-bold`
                      : 'bg-slate-800/70 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] leading-tight">{opt.label}</div>
                  <div className="text-[9px] opacity-70 truncate mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Başlık <span className="text-slate-500">(İsteğe Bağlı)</span>
              </label>
              <input
                type="text"
                placeholder="Örn: Market alışverişi, Kira, Kahve..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Açıklama <span className="text-slate-500">(İsteğe Bağlı)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Detaylar veya ek notlar..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Category & Subcategory */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Kategori</label>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddingCat(!isQuickAddingCat)}
                    className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isQuickAddingCat ? 'Kapat' : 'Yeni Kategori'}</span>
                  </button>
                </div>
                <select
                  value={categoryId}
                  onChange={e => {
                    if (e.target.value === '__NEW_CAT__') {
                      setIsQuickAddingCat(true);
                    } else {
                      handleCategoryChange(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white outline-none"
                >
                  <option value="__NEW_CAT__" className="text-teal-400 font-bold bg-slate-900">
                    ➕ Yeni Kategori Ekle...
                  </option>
                  <option value="">Kategori Dışı (Genel)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Alt Kategori</label>
                <select
                  disabled={!selectedCategory || selectedCategory.subcategories.length === 0}
                  value={subcategoryId}
                  onChange={e => handleSubcategoryChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">Seçiniz</option>
                  {selectedCategory?.subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hızlı Kategori Ekleme Açılır Kutusu */}
            {isQuickAddingCat && (
              <div className="p-2.5 bg-slate-800/90 border border-teal-500/40 rounded-xl space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Hızlı Yeni Kategori Oluştur</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddingCat(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Kategori adı (örn: Hobiler, Araç...)"
                    value={quickCatName}
                    onChange={e => setQuickCatName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveQuickCat();
                      }
                    }}
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 focus:border-teal-400 rounded-lg text-xs text-white outline-none"
                  />
                  {/* Renk Seçimi */}
                  <div className="flex items-center space-x-1 p-0.5 bg-slate-900 rounded-lg border border-slate-700">
                    {QUICK_COLORS.slice(0, 5).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setQuickCatColor(c)}
                        className={`w-4 h-4 rounded-full transition-transform ${
                          quickCatColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveQuickCat()}
                    className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
                  >
                    Ekle
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Account & Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                <span>Hesap / Kart</span>
              </label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white outline-none"
              >
                <option value="">Hesap Dışı (Genel)</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.balance.toLocaleString('tr-TR')} ₺)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300 flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bütçe Limiti Eşle</span>
                </label>
                {/* Seçilen limitin son durum rozeti */}
                {(() => {
                  const selectedLimit = limits.find(lim => lim.id === limitId);
                  if (!selectedLimit) return null;
                  const ratio = selectedLimit.targetAmount > 0
                    ? (selectedLimit.spentAmount / selectedLimit.targetAmount) * 100
                    : 0;
                  const pct = Math.round(ratio);

                  // Renk geçişi: %80 ve üstü kızarsın, altında yeşilden sarıya geçiş
                  let badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                  if (pct >= 80) {
                    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
                  } else if (pct >= 50) {
                    badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                  }

                  return (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badgeColor}`}>
                      %{pct} • {formatCurrency(selectedLimit.spentAmount)} / {formatCurrency(selectedLimit.targetAmount)}
                    </span>
                  );
                })()}
              </div>

              <select
                value={limitId}
                onChange={e => handleLimitChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white outline-none"
              >
                <option value="">Limit Yok</option>
                {limits.map(lim => {
                  const ratio = lim.targetAmount > 0 ? (lim.spentAmount / lim.targetAmount) * 100 : 0;
                  const pct = Math.round(ratio);
                  const statusSymbol = pct >= 80 ? '🔴' : pct >= 50 ? '🟡' : '🟢';
                  return (
                    <option key={lim.id} value={lim.id}>
                      {statusSymbol} {lim.name} — %{pct} ({formatCurrency(lim.spentAmount)} / {formatCurrency(lim.targetAmount)})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <TagIcon className="w-3.5 h-3.5 text-teal-400" />
                <span>Etiketler</span>
              </span>
              {tags.length > 0 && (
                <span className="text-[10px] text-teal-400/80 font-normal">
                  {tags.length} etiket seçildi
                </span>
              )}
            </label>

            {/* Tag Input with Autocomplete Suggestions */}
            <div className="relative">
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="Örn: kahve, yemek... (Yazarken önerir)"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (matchingSuggestions.length > 0 && !allKnownTags.includes(tagInput.trim().toLowerCase())) {
                        handleAddTag(matchingSuggestions[0]);
                      } else {
                        handleAddTag(tagInput);
                      }
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-slate-800/80 border border-slate-700 focus:border-teal-500 rounded-xl text-xs text-white outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="px-3 py-1.5 bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-semibold hover:bg-teal-500/20 transition-all shrink-0"
                >
                  Ekle
                </button>
              </div>

              {/* 1. Benzer Etiket Önerileri Dropdown (Yazarken eşleşenler) */}
              {matchingSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-slate-900/95 border border-teal-500/30 rounded-xl shadow-xl backdrop-blur-md p-1.5 flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                  <div className="w-full text-[10px] text-slate-400 px-1 py-0.5 font-medium flex items-center justify-between">
                    <span>Benzer Etiketler:</span>
                    <span className="text-teal-400 text-[9px]">(Tıklayıp ekleyin)</span>
                  </div>
                  {matchingSuggestions.map(suggested => (
                    <button
                      key={suggested}
                      type="button"
                      onClick={() => handleAddTag(suggested)}
                      className="px-2 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 text-xs font-medium border border-teal-500/40 transition-all flex items-center space-x-1"
                    >
                      <span>#{suggested}</span>
                      <span className="text-[10px] opacity-70">+</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <TagChips
                  tags={tags}
                  size="sm"
                  onRemove={handleRemoveTag}
                  onRemoveGroup={handleRemoveTagGroup}
                />
              </div>
            )}

            {/* 2. Etiket Öneri Barları: Birlikte Sık Kullanılanlar (Akıllı Öneri), Son Girilenler & En Çok Seçilenler */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              {/* Satır 0: Birlikte Sık Kullanılan Etiketler (Seçili etiketlere göre akıllı 15 öneri) */}
              {coOccurrenceTags.length > 0 && (
                <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-teal-500/10 border border-purple-500/30 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[10px] mb-1 font-semibold">
                    <span className="flex items-center space-x-1 text-purple-300">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Birlikte Sık Kullanılanlar</span>
                      <span className="text-purple-400/70 font-normal">({coOccurrenceTags.length})</span>
                    </span>
                    <span className="text-[9px] text-purple-400/80 font-normal">
                      Seçtiklerinizle en çok eşleşenler
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                    {coOccurrenceTags.map(tag => (
                      <button
                        key={`co-${tag}`}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center space-x-1 border bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border-purple-500/40 shadow-sm active:scale-95"
                        title="Bu etiketi ekle"
                      >
                        <span>#{tag}</span>
                        <span className="text-[10px] text-purple-300 font-bold">+</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Satır 1: Son Girilen Etiketler */}
              {recentTags.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1 text-[10px] text-slate-400 mb-1 font-medium">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>Son Girilenler</span>
                    <span className="text-slate-600">({recentTags.length})</span>
                  </div>
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                    {recentTags.map(tag => {
                      const isSelected = tags.includes(tag);
                      return (
                        <button
                          key={`recent-${tag}`}
                          type="button"
                          onClick={() => isSelected ? handleRemoveTag(tag) : handleAddTag(tag)}
                          className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center space-x-1 border ${
                            isSelected
                              ? 'bg-teal-500/20 text-teal-200 border-teal-500/60 shadow-sm'
                              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border-slate-700/80'
                          }`}
                        >
                          <span>#{tag}</span>
                          {isSelected && <span className="text-[9px] text-teal-400 font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Satır 2: En Çok Seçilen Etiketler */}
              {topTags.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1 text-[10px] text-slate-400 mb-1 font-medium">
                    <TrendingUp className="w-3 h-3 text-amber-400" />
                    <span>En Çok Seçilenler</span>
                    <span className="text-slate-600">({topTags.length})</span>
                  </div>
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                    {topTags.map(tag => {
                      const isSelected = tags.includes(tag);
                      return (
                        <button
                          key={`top-${tag}`}
                          type="button"
                          onClick={() => isSelected ? handleRemoveTag(tag) : handleAddTag(tag)}
                          className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center space-x-1 border ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 shadow-sm'
                              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border-slate-700/80'
                          }`}
                        >
                          <span>#{tag}</span>
                          {isSelected && <span className="text-[9px] text-amber-400 font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          </div>

          {/* Submit & Action Buttons (Always Visible at Bottom) */}
          <div className="shrink-0 p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between z-10">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDeleteExpense}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kaydı Sil</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isEditing ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
