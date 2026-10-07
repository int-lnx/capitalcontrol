import React, { useState, useEffect, useMemo } from 'react';
import { X, Tag as TagIcon, Check, Calendar, CreditCard, ShieldAlert, Sparkles, Edit3, Repeat, Clock, TrendingUp, Trash2, Plus } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import type { PaymentType, RecurrenceFrequency, NecessityLevel } from '../types';
import { getTodayString } from '../utils/formatters';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  const { expenses, categories, accounts, limits, addExpense, updateExpense, deleteExpense, addCategory, editingExpense, setEditingExpense } = useExpenses();

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
  const [isAmountTotal, setIsAmountTotal] = useState<boolean>(true); // true = toplam tutar girdim, false = taksit başı tutar girdim
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('aylik');
  const [recurrenceCount, setRecurrenceCount] = useState<number>(12);
  const [isUnlimitedRecurrence, setIsUnlimitedRecurrence] = useState<boolean>(false);

  const [necessity, setNecessity] = useState<NecessityLevel>('Tanımsız');
  const [accountId, setAccountId] = useState<string>('');
  const [limitId, setLimitId] = useState<string>('');

  // Tags input
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');

  // Quick category creation states
  const [isQuickAddingCat, setIsQuickAddingCat] = useState<boolean>(false);
  const [quickCatName, setQuickCatName] = useState<string>('');
  const [quickCatColor, setQuickCatColor] = useState<string>('#3b82f6');
  const QUICK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

  // Pre-fill fields when editingExpense changes
  useEffect(() => {
    if (editingExpense) {
      setAmount(String(editingExpense.amount));
      setDate(editingExpense.date);
      setTitle(editingExpense.title || '');
      setDescription(editingExpense.description || '');
      setCategoryId(editingExpense.categoryId || '');
      setSubcategoryId(editingExpense.subcategoryId || '');
      setPaymentType(editingExpense.paymentType || 'pesin');
      setInstallmentCount(editingExpense.installmentCount || 3);
      setIsAmountTotal(true);
      setRecurrenceFrequency(editingExpense.recurrenceFrequency || 'aylik');
      setRecurrenceCount(editingExpense.recurrenceCount || 12);
      setIsUnlimitedRecurrence(Boolean(editingExpense.isUnlimitedRecurrence));
      setNecessity(editingExpense.necessity || 'Tanımsız');
      setAccountId(editingExpense.accountId || '');
      setLimitId(editingExpense.limitId || '');
      setTags(editingExpense.tags || []);
    } else {
      setAmount('');
      setDate(getTodayString());
      setTitle('');
      setDescription('');
      setCategoryId('');
      setSubcategoryId('');
      setPaymentType('pesin');
      setInstallmentCount(3);
      setIsAmountTotal(true);
      setRecurrenceFrequency('aylik');
      setRecurrenceCount(12);
      setIsUnlimitedRecurrence(false);
      setNecessity('Tanımsız');
      setAccountId('');
      setLimitId('');
      setTags([]);
    }
  }, [editingExpense, isOpen]);

  const handleAddTag = (tagToAdd: string) => {
    const formatted = tagToAdd.trim().toLowerCase().replace(/^#/, '');
    if (formatted && !tags.includes(formatted)) {
      setTags([...tags, formatted]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
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

  // 2. En çok seçilen / kullanılan etiketler (kullanım frekansına göre ilk 15 etiket)
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
      .map(([t]) => t)
      .slice(0, 15);
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

  // 3. Yazarken anlık eşleşen etiket önerileri (benzer etiketler)
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

  if (!isOpen) return null;

  const selectedCategory = categories.find(c => c.id === categoryId);

  const handleClose = () => {
    setEditingExpense(null);
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

    if (isEditing && editingExpense) {
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
      });
    } else {
      // Add new expense
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
        recurrenceFrequency: paymentType === 'tekrarlayan' ? recurrenceFrequency : undefined,
        recurrenceCount: paymentType === 'tekrarlayan' ? (isUnlimitedRecurrence ? undefined : recurrenceCount) : undefined,
        isUnlimitedRecurrence: paymentType === 'tekrarlayan' ? isUnlimitedRecurrence : undefined,
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
    if (confirm('Bu harcama kaydını kalıcı olarak silmek istediğinize emin misiniz?')) {
      deleteExpense(editingExpense.id);
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 pt-10 sm:pt-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-slate-700/80 shadow-2xl p-4 sm:p-6 bg-slate-900 text-slate-100 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900 pb-3 border-b border-slate-800 flex items-center justify-between">
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

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-3">
          
          {/* Payment Type (Peşin, Taksitli, Tekrarlayan) */}
          {!isEditing && (
            <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
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

              {/* Taksitli Seçenekleri */}
              {paymentType === 'taksitli' && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-medium">Taksit Sayısı:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="2"
                        max="60"
                        value={installmentCount || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          setInstallmentCount(isNaN(val) ? 2 : Math.max(2, Math.min(val, 60)));
                        }}
                        className="w-14 px-2 py-1 bg-slate-800 border border-amber-500/50 text-amber-300 font-bold text-center text-xs rounded-lg outline-none"
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

                  {rawNumber > 0 && (
                    <div className="text-[11px] text-amber-300/90 pt-1 flex justify-between bg-slate-900/60 p-2 rounded-md">
                      <span>Toplam: <b>{calculatedTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</b></span>
                      <span>Aylık: <b>{calculatedInstallment.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</b> ({installmentCount} ay)</span>
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
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-500/20">
                      <span className="text-slate-300">Toplam Tekrar Sayısı:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="2"
                          max="120"
                          value={recurrenceCount || ''}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            setRecurrenceCount(isNaN(val) ? 2 : Math.max(2, Math.min(val, 120)));
                          }}
                          className="w-16 px-2 py-1 bg-slate-800 border border-indigo-500/50 text-indigo-300 font-bold text-center text-xs rounded-lg outline-none"
                        />
                        <span className="text-[11px] text-indigo-300 font-semibold">Kez</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-1.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-200 flex items-center gap-1.5">
                      <span>♾️</span>
                      <span>Her periyot otomatik tekrarlanır. İleride tutar değişirse sadece geleceğe yansır, geçmiş kayıtlar korunur.</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Amount & Date (REQUIRED) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1">
                {paymentType === 'taksitli' && !isAmountTotal ? 'Her Bir Taksit Tutarı (TL)' : 'Tutar (TL)'} <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-emerald-500/40 focus:border-emerald-400 rounded-xl text-white font-semibold placeholder-slate-500 outline-none transition-all"
                />
                <span className="absolute right-3 top-2 text-xs text-emerald-400 font-bold">TL</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1">
                Tarih (Geçmiş veya Bugün) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-emerald-500/40 focus:border-emerald-400 rounded-xl text-white text-sm outline-none transition-all"
                />
                <Calendar className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
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
                  onClick={() => setNecessity(opt.id)}
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
                      setCategoryId(e.target.value);
                      setSubcategoryId('');
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white outline-none"
                >
                  <option value="__NEW_CAT__" className="text-teal-400 font-bold bg-slate-900">
                    ➕ Yeni Kategori Ekle...
                  </option>
                  <option value="">Seçiniz (Genel)</option>
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
                  onChange={e => setSubcategoryId(e.target.value)}
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
                <option value="">Hesap Yok (Genel)</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.balance.toLocaleString('tr-TR')} ₺)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Bütçe Limiti Eşle</span>
              </label>
              <select
                value={limitId}
                onChange={e => setLimitId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white outline-none"
              >
                <option value="">Limit Yok</option>
                {limits.map(lim => (
                  <option key={lim.id} value={lim.id}>
                    {lim.name} ({lim.targetAmount.toLocaleString('tr-TR')} ₺)
                  </option>
                ))}
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
              <div className="flex flex-wrap gap-1 pt-0.5">
                {tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-teal-500/15 text-teal-300 text-[11px] font-medium border border-teal-500/30 animate-in fade-in"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-400 ml-1 text-slate-400 transition-colors"
                      title="Etiketi kaldır"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 2. Etiket Öneri Barları: Son Girilenler & En Çok Seçilenler (2 Ayrı Satır, Yatay Kaydırılabilir) */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
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

          {/* Submit & Action Buttons */}
          <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
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
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
