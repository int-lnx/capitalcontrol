import React, { useState, useMemo } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import type { NecessityLevel } from '../types';
import { withParentTags } from '../utils/tagHierarchy';
import {
  X,
  Check,
  Tag,
  ShieldAlert,
  Sparkles,
  CreditCard,
  Folder,
  Calendar,
  Plus,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedExpenseIds: string[];
  onSuccess: () => void;
}

const NECESSITY_OPTIONS: { id: NecessityLevel; label: string; icon: string; color: string }[] = [
  { id: 'Fizyolojik', label: 'Fizyolojik', icon: '🥗', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/50 text-emerald-300' },
  { id: 'Temel', label: 'Temel', icon: '🏠', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/50 text-blue-300' },
  { id: 'Makul', label: 'Makul', icon: '🎬', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/50 text-purple-300' },
  { id: 'Kaçınılabilir', label: 'Kaçınılabilir', icon: '⚠️', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/50 text-amber-300' },
  { id: 'İsraf', label: 'İsraf', icon: '🔥', color: 'from-rose-500/20 to-rose-600/10 border-rose-500/50 text-rose-300' },
  { id: 'Tanımsız', label: 'Tanımsız', icon: '⚪', color: 'from-slate-700/20 to-slate-800/10 border-slate-600/50 text-slate-300' },
];

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  selectedExpenseIds,
  onSuccess,
}) => {
  const {
    categories,
    accounts,
    limits,
    expenses,
    tagParents,
    bulkUpdateExpenses,
  } = useExpenses();

  // Field toggles
  const [applyCategory, setApplyCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');

  const [applyTags, setApplyTags] = useState(false);
  const [tagMode, setTagMode] = useState<'add' | 'replace' | 'remove'>('add');
  const [tagsToApply, setTagsToApply] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [applyLimit, setApplyLimit] = useState(false);
  const [selectedLimitId, setSelectedLimitId] = useState('none');

  const [applyNecessity, setApplyNecessity] = useState(false);
  const [selectedNecessity, setSelectedNecessity] = useState<NecessityLevel>('Makul');

  const [applyAccount, setApplyAccount] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('none');

  const [applyDate, setApplyDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Derived selected category's subcategories
  const currentCategory = categories.find(c => c.id === selectedCategoryId);
  const subcategories = currentCategory?.subcategories || [];

  // Known tags for autocomplete
  const allKnownTags = useMemo(() => {
    if (!expenses) return [];
    const set = new Set<string>();
    for (const exp of expenses) {
      if (exp.tags) {
        for (const t of exp.tags) {
          if (t) set.add(t.toLowerCase().trim());
        }
      }
    }
    return Array.from(set);
  }, [expenses]);

  // Tag autocomplete filtered
  const filteredTagSuggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (!q) return [];
    return allKnownTags
      .filter(t => t.includes(q) && !tagsToApply.includes(t))
      .slice(0, 8);
  }, [tagInput, allKnownTags, tagsToApply]);

  const handleAddTag = (tagStr: string) => {
    const clean = tagStr.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tagsToApply.includes(clean)) {
      const nextTags = withParentTags([...tagsToApply, clean], tagParents);
      setTagsToApply(nextTags);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagsToApply(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const hasAnyChange =
      applyCategory ||
      applyTags ||
      applyLimit ||
      applyNecessity ||
      applyAccount ||
      applyDate;

    if (!hasAnyChange) {
      alert('Lütfen toplu olarak güncellemek istediğiniz en az bir alanı işaretleyin.');
      return;
    }

    if (applyTags && tagsToApply.length === 0) {
      alert('Etiketleri güncellemek için en az bir etiket eklemeli veya seçeneğin işaretini kaldırmalısınız.');
      return;
    }

    if (applyCategory && !selectedCategoryId) {
      alert('Lütfen uygulanacak bir kategori seçiniz.');
      return;
    }

    // Perform bulk update
    bulkUpdateExpenses(selectedExpenseIds, (exp) => {
      const patch: Partial<typeof exp> = {};

      if (applyCategory) {
        patch.categoryId = selectedCategoryId;
        patch.subcategoryId = selectedSubcategoryId || undefined;
      }

      if (applyTags && tagsToApply.length > 0) {
        const current = exp.tags || [];
        if (tagMode === 'add') {
          // Append new tags and auto-include parents
          const combined = Array.from(new Set([...current, ...tagsToApply]));
          patch.tags = withParentTags(combined, tagParents);
        } else if (tagMode === 'replace') {
          patch.tags = [...tagsToApply];
        } else if (tagMode === 'remove') {
          const toRemove = new Set(tagsToApply);
          patch.tags = current.filter(t => !toRemove.has(t));
        }
      }

      if (applyLimit) {
        patch.limitId = selectedLimitId === 'none' ? undefined : selectedLimitId;
      }

      if (applyNecessity) {
        patch.necessity = selectedNecessity;
      }

      if (applyAccount) {
        patch.accountId = selectedAccountId === 'none' ? undefined : selectedAccountId;
      }

      if (applyDate && selectedDate) {
        patch.date = selectedDate;
      }

      return patch;
    });

    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Toplu Düzenleme</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-extrabold border border-teal-500/40">
                  {selectedExpenseIds.length} Seçili
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Seçtiğiniz alanlar işaretli tüm kayıtlara uygulanacaktır.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          
          {/* Info note */}
          <div className="flex items-start space-x-2 text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50">
            <HelpCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span>
              Yalnızca kutucuğunu <b>işaretlediğiniz</b> alanlar güncellenir. İşaretlenmeyen özellikler log kayıtlarının kendi mevcut değerlerinde kalır.
            </span>
          </div>

          {/* 1. KATEGORİ SEÇİMİ */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            applyCategory ? 'bg-slate-800/70 border-teal-500/60 shadow-sm' : 'bg-slate-800/30 border-slate-800'
          }`}>
            <label className="flex items-center space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyCategory}
                onChange={e => setApplyCategory(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-teal-400"
              />
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Folder className="w-3.5 h-3.5 text-teal-400" />
                <span>Kategoriyi Güncelle</span>
              </span>
            </label>

            {applyCategory && (
              <div className="mt-3 pt-3 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Yeni Kategori</label>
                  <select
                    value={selectedCategoryId}
                    onChange={e => {
                      setSelectedCategoryId(e.target.value);
                      setSelectedSubcategoryId('');
                    }}
                    className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700 focus:border-teal-400 rounded-xl text-xs text-white outline-none"
                    required={applyCategory}
                  >
                    <option value="">Kategori Seçiniz...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {subcategories.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Alt Kategori (İsteğe Bağlı)</label>
                    <select
                      value={selectedSubcategoryId}
                      onChange={e => setSelectedSubcategoryId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700 focus:border-teal-400 rounded-xl text-xs text-white outline-none"
                    >
                      <option value="">Alt Kategori Yok</option>
                      {subcategories.map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. ETİKETLER */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            applyTags ? 'bg-slate-800/70 border-teal-500/60 shadow-sm' : 'bg-slate-800/30 border-slate-800'
          }`}>
            <label className="flex items-center space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyTags}
                onChange={e => setApplyTags(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-teal-400"
              />
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-400" />
                <span>Etiketleri Güncelle</span>
              </span>
            </label>

            {applyTags && (
              <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-3">
                {/* Mode Selector */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-700/70">
                  <button
                    type="button"
                    onClick={() => setTagMode('add')}
                    className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                      tagMode === 'add' ? 'bg-teal-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ➕ Üzerine Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => setTagMode('replace')}
                    className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                      tagMode === 'replace' ? 'bg-teal-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🔄 Değiştir
                  </button>
                  <button
                    type="button"
                    onClick={() => setTagMode('remove')}
                    className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                      tagMode === 'remove' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🗑️ Kaldır
                  </button>
                </div>

                {/* Tag Input */}
                <div className="relative">
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder="Etiket yazıp ekleyin..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (tagInput.trim()) handleAddTag(tagInput);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-900/90 border border-slate-700 focus:border-teal-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (tagInput.trim()) handleAddTag(tagInput);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ekle</span>
                    </button>
                  </div>

                  {/* Autocomplete suggestions dropdown */}
                  {filteredTagSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-36 overflow-y-auto">
                      {filteredTagSuggestions.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleAddTag(tag)}
                          className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-teal-300 transition-colors flex items-center justify-between"
                        >
                          <span>#{tag}</span>
                          <span className="text-[10px] text-slate-500">Öneri</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Tag Pills */}
                {tagsToApply.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tagsToApply.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-rose-400 transition-colors ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. BÜTÇE LİMİTİ */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            applyLimit ? 'bg-slate-800/70 border-teal-500/60 shadow-sm' : 'bg-slate-800/30 border-slate-800'
          }`}>
            <label className="flex items-center space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyLimit}
                onChange={e => setApplyLimit(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-teal-400"
              />
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Bütçe Limiti Eşlemesini Güncelle</span>
              </span>
            </label>

            {applyLimit && (
              <div className="mt-3 pt-3 border-t border-slate-700/60">
                <select
                  value={selectedLimitId}
                  onChange={e => setSelectedLimitId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700 focus:border-teal-400 rounded-xl text-xs text-white outline-none"
                >
                  <option value="none">🚫 Limit Eşleşmesini Kaldır (Limitsiz)</option>
                  {limits.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.targetAmount.toLocaleString('tr-TR')} ₺)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 4. TASARRUF / İHTİYAÇ SEVİYESİ */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            applyNecessity ? 'bg-slate-800/70 border-teal-500/60 shadow-sm' : 'bg-slate-800/30 border-slate-800'
          }`}>
            <label className="flex items-center space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyNecessity}
                onChange={e => setApplyNecessity(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-teal-400"
              />
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Tasarruf / İhtiyaç Seviyesini Güncelle</span>
              </span>
            </label>

            {applyNecessity && (
              <div className="mt-3 pt-3 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {NECESSITY_OPTIONS.map(opt => {
                  const isSelected = selectedNecessity === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedNecessity(opt.id)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? `bg-gradient-to-br ${opt.color} ring-1 ring-teal-400 font-bold shadow-sm`
                          : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm">{opt.icon}</span>
                        <span className="text-xs">{opt.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. HESAP / KART */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            applyAccount ? 'bg-slate-800/70 border-teal-500/60 shadow-sm' : 'bg-slate-800/30 border-slate-800'
          }`}>
            <label className="flex items-center space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyAccount}
                onChange={e => setApplyAccount(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-teal-400"
              />
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                <span>Hesap / Kart Eşlemesini Güncelle</span>
              </span>
            </label>

            {applyAccount && (
              <div className="mt-3 pt-3 border-t border-slate-700/60">
                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700 focus:border-teal-400 rounded-xl text-xs text-white outline-none"
                >
                  <option value="none">Hesap Dışı (Genel)</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.balance.toLocaleString('tr-TR')} ₺)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 6. TARİH */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            applyDate ? 'bg-slate-800/70 border-teal-500/60 shadow-sm' : 'bg-slate-800/30 border-slate-800'
          }`}>
            <label className="flex items-center space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyDate}
                onChange={e => setApplyDate(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-teal-400"
              />
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>Tarihi Güncelle</span>
              </span>
            </label>

            {applyDate && (
              <div className="mt-3 pt-3 border-t border-slate-700/60">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-slate-700 focus:border-teal-400 rounded-xl text-xs text-white outline-none"
                  required={applyDate}
                />
              </div>
            )}
          </div>

        </form>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-end space-x-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center space-x-1.5 shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Değişiklikleri Uygula</span>
          </button>
        </div>

      </div>
    </div>
  );
};
