import React, { useState, useRef } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { FolderTree, Plus, Trash2, ChevronRight, X, Edit2, Check, Clock, GitMerge, RotateCcw } from 'lucide-react';
import { formatCurrency, formatDateFormatted, getTodayString } from '../utils/formatters';
import { PieChart } from './PieChart';
import { PeriodPickerModal } from './PeriodPickerModal';
import { TagChips } from './TagChips';

export const CategoryManagerView: React.FC = () => {
  const {
    categories,
    expenses,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    mergeCategories,
    setEditingExpense,
  } = useExpenses();

  const todayStr = getTodayString();
  const currentMonthKey = new Date().toISOString().substring(0, 7);

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [selectedCatForSub, setSelectedCatForSub] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(currentMonthKey);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false);

  // Long-press and Category Action Menu / Merge Modal States
  const [activeActionCatId, setActiveActionCatId] = useState<string | null>(null);
  const [mergeModalCatId, setMergeModalCatId] = useState<string | null>(null);
  const [targetMergeCatId, setTargetMergeCatId] = useState<string>('');

  const catLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCatLongPressTriggeredRef = useRef<boolean>(false);

  // Available months (Past and current only)
  const availableMonths = Array.from(
    new Set(expenses.filter(e => e.date <= todayStr).map(e => e.date.substring(0, 7)))
  );
  if (!availableMonths.includes(currentMonthKey)) {
    availableMonths.push(currentMonthKey);
  }
  availableMonths.sort((a, b) => b.localeCompare(a));

  const formatMonthName = (ym: string) => {
    if (ym === 'all') return 'Tüm Dönemler';
    if (ym.length === 4) return `${ym} Yılı`;
    const [year, m] = ym.split('-');
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return `${monthNames[parseInt(m, 10) - 1] || m} ${year}`;
  };

  // Base expenses strictly filtered by period
  const baseExpenses = expenses.filter(exp => {
    const isPastOrToday = exp.date <= todayStr;
    const matchesMonth = selectedMonthFilter !== 'all' ? exp.date.startsWith(selectedMonthFilter) : true;
    return isPastOrToday && matchesMonth;
  });

  const periodTotalSpent = baseExpenses.reduce((s, e) => s + e.amount, 0);

  // Düzenleme modları state'leri
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('');

  const [editingSubKey, setEditingSubKey] = useState<string | null>(null); // "catId_subId"
  const [editSubName, setEditSubName] = useState('');

  const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

  const handleAddMainCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    addCategory({
      name: newCatName.trim(),
      color: newCatColor,
      iconName: 'Folder',
      subcategories: [],
    });

    setNewCatName('');
  };

  const handleStartEditCat = (cat: (typeof categories)[0]) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color || '#3b82f6');
  };

  const handleSaveEditCat = (catId: string) => {
    if (!editCatName.trim()) return;
    updateCategory(catId, {
      name: editCatName.trim(),
      color: editCatColor,
    });
    setEditingCatId(null);
  };

  const handleAddSubCategory = (categoryId: string) => {
    if (!newSubName.trim()) return;
    addSubCategory(categoryId, newSubName.trim());
    setNewSubName('');
    setSelectedCatForSub(null);
  };

  const handleStartEditSub = (categoryId: string, subId: string, currentName: string) => {
    setEditingSubKey(`${categoryId}_${subId}`);
    setEditSubName(currentName);
  };

  const handleSaveEditSub = (categoryId: string, subId: string) => {
    if (!editSubName.trim()) return;
    updateSubCategory(categoryId, subId, editSubName.trim());
    setEditingSubKey(null);
  };

  // Pie chart calculation for categories based on selected period
  const categoryChartData = categories.map(cat => {
    const catExpenses = baseExpenses.filter(e => e.categoryId === cat.id);
    const totalSpent = catExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate subcategory breakdown for this category
    const subItems: { id?: string; label: string; value: number }[] = [];

    cat.subcategories.forEach(sub => {
      const subSpent = catExpenses
        .filter(e => e.subcategoryId === sub.id)
        .reduce((sum, e) => sum + e.amount, 0);
      if (subSpent > 0) {
        subItems.push({
          id: sub.id,
          label: sub.name,
          value: subSpent,
        });
      }
    });

    // Expenses in this category without an explicit subcategory
    const noSubSpent = catExpenses
      .filter(e => !e.subcategoryId)
      .reduce((sum, e) => sum + e.amount, 0);
    if (noSubSpent > 0 && subItems.length > 0) {
      subItems.push({
        id: `${cat.id}_other`,
        label: 'Alt Kategori Belirtilmemiş',
        value: noSubSpent,
      });
    }

    // Sort subItems descending by value
    subItems.sort((a, b) => b.value - a.value);

    return {
      id: cat.id,
      label: cat.name,
      value: totalSpent,
      color: cat.color,
      subItems: subItems.length > 0 ? subItems : undefined,
    };
  }).filter(c => c.value > 0);

  // Uncategorized in selected period
  const uncatSpent = baseExpenses.filter(e => !e.categoryId).reduce((s, e) => s + e.amount, 0);
  if (uncatSpent > 0) {
    categoryChartData.push({
      id: 'uncategorized',
      label: 'Kategori Dışı',
      value: uncatSpent,
      color: '#64748b',
      subItems: undefined,
    });
  }

  // All-time uncategorized count and total (for the categories list view)
  const allTimeUncategorizedExpenses = expenses.filter(e => !e.categoryId);
  const allTimeUncategorizedTotal = allTimeUncategorizedExpenses.reduce((s, e) => s + e.amount, 0);

  // Filtered expenses list to display when a category is selected (or all in period)
  const categoryFilteredExpenses = baseExpenses.filter(exp => {
    if (!selectedCategoryFilter) return true;
    if (selectedCategoryFilter === 'uncategorized') return !exp.categoryId;
    return exp.categoryId === selectedCategoryFilter;
  });
  const categoryFilteredTotal = categoryFilteredExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5">
      
      {/* 1. PIE CHART VE DÖNEM SEÇİCİ EN ÜSTTE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Sol Üst: Dönem Seçici Butonu */}
          <button
            type="button"
            onClick={() => setIsPeriodModalOpen(true)}
            className="flex items-center space-x-1.5 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/80 px-2.5 py-1.5 rounded-xl self-start transition-colors"
            title="Dönem Seçimi Yap"
          >
            <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium">Dönem:</span>
            <span className="text-xs font-semibold text-teal-300">
              {formatMonthName(selectedMonthFilter)}
            </span>
          </button>

          <div className="text-right">
            <span className="text-xs text-slate-400">Dönem Harcama Toplamı: </span>
            <span className="text-xs font-extrabold text-teal-400">{formatCurrency(periodTotalSpent)}</span>
          </div>
        </div>

        <PieChart
          data={categoryChartData}
          customTotal={periodTotalSpent > 0 ? periodTotalSpent : undefined}
          selectedLabel={selectedCategoryFilter ? (selectedCategoryFilter === 'uncategorized' ? 'Kategori Dışı' : categories.find(c => c.id === selectedCategoryFilter)?.name) : undefined}
          onSliceClick={(label, id) => {
            const targetId = id || (label === 'Kategori Dışı' ? 'uncategorized' : categories.find(c => c.name === label)?.id || null);
            setSelectedCategoryFilter(prev => (prev === targetId ? null : targetId));
          }}
          title={`${formatMonthName(selectedMonthFilter)} Kategori Payı`}
        />
      </div>

      {/* 2. Banner */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Kategori & Alt Kategori Yönetimi</h2>
            <p className="text-xs text-slate-400">
              Harcamalarınızı gruplamak için ana kategoriler ve detaylı alt kategoriler oluşturun, düzenleyin veya silin
            </p>
          </div>
        </div>
      </div>

      {/* Add New Category Box */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center space-x-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Yeni Ana Kategori Ekle</span>
        </h3>

        <form onSubmit={handleAddMainCategory} className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Örn: Sağlık, Araç, Eğlence..."
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            className="flex-1 min-w-[200px] px-3.5 py-2 bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl text-sm text-white outline-none"
          />

          {/* Color Picker Buttons */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setNewCatColor(color)}
                className={`w-6 h-6 rounded-lg transition-transform ${
                  newCatColor === color ? 'scale-110 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
          >
            Kategori Oluştur
          </button>
        </form>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-300">
          Mevcut Kategoriler ({categories.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kategori Dışı Kartı */}
          <div
            onClick={() => setSelectedCategoryFilter(prev => prev === 'uncategorized' ? null : 'uncategorized')}
            className={`glass-card p-5 rounded-2xl border transition-all space-y-3 relative cursor-pointer select-none ${
              selectedCategoryFilter === 'uncategorized'
                ? 'border-slate-300 bg-slate-800/90 ring-1 ring-slate-400'
                : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700'
            }`}
            title="Bu kategorideki harcamaları filtrelemek için tıklayın"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="w-4 h-4 rounded-full bg-slate-500 shadow-sm shrink-0 flex items-center justify-center text-[10px] text-white">
                  ⚪
                </span>
                <h4 className="text-base font-bold text-slate-200">Kategori Dışı</h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                  Otomatik / Varsayılan
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-slate-300">
                  {formatCurrency(allTimeUncategorizedTotal)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Kategori seçilmeden kaydedilen harcamalar</span>
              <span className="font-semibold text-slate-300">{allTimeUncategorizedExpenses.length} Kayıt</span>
            </div>
          </div>

          {categories.map(category => {
            const isEditingCat = editingCatId === category.id;
            const isActionOpen = activeActionCatId === category.id;

            const handleCatPointerDown = () => {
              isCatLongPressTriggeredRef.current = false;
              catLongPressTimerRef.current = setTimeout(() => {
                isCatLongPressTriggeredRef.current = true;
                setActiveActionCatId(category.id);
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  try { navigator.vibrate(50); } catch (_) {}
                }
              }, 450);
            };

            const handleCatPointerUpOrLeave = () => {
              if (catLongPressTimerRef.current) {
                clearTimeout(catLongPressTimerRef.current);
                catLongPressTimerRef.current = null;
              }
            };

            const handleCatClick = () => {
              if (isCatLongPressTriggeredRef.current) {
                isCatLongPressTriggeredRef.current = false;
                return;
              }
              if (!isEditingCat) {
                setSelectedCategoryFilter(prev => prev === category.id ? null : category.id);
              }
            };

            return (
              <div
                key={category.id}
                onPointerDown={handleCatPointerDown}
                onPointerUp={handleCatPointerUpOrLeave}
                onPointerCancel={handleCatPointerUpOrLeave}
                onPointerLeave={handleCatPointerUpOrLeave}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActiveActionCatId(category.id);
                }}
                onClick={handleCatClick}
                className={`glass-card p-5 rounded-2xl border transition-all space-y-3 relative group select-none cursor-pointer ${
                  selectedCategoryFilter === category.id
                    ? 'border-teal-400 bg-slate-800/95 ring-2 ring-teal-500/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
                title="Harcamaları filtrelemek için tıklayın, düzenlemek/birleştirmek için basılı tutun"
              >
                {/* Main Category Header / Edit Bar */}
                {isEditingCat ? (
                  <div className="space-y-2.5 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editCatName}
                        onChange={e => setEditCatName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-teal-500 rounded-xl text-sm text-white font-bold outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditCat(category.id)}
                        className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors"
                        title="Kaydet"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                        title="İptal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Renk Seçici Düzenleme */}
                    <div className="flex items-center space-x-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700/80">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditCatColor(color)}
                          className={`w-5 h-5 rounded-md transition-transform ${
                            editCatColor === color ? 'scale-110 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-4 h-4 rounded-full shadow-sm shrink-0"
                        style={{ backgroundColor: category.color || '#3b82f6' }}
                      />
                      <h4 className="text-base font-bold text-white truncate">{category.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {category.subcategories.length} Alt Kategori
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleStartEditCat(category)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-colors"
                        title="Kategoriyi Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setMergeModalCatId(category.id);
                          setTargetMergeCatId('');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                        title="Kategoriyi Birleştir"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`"${category.name}" kategorisini ve alt kategorilerini silmek istediğinize emin misiniz?`)) {
                            deleteCategory(category.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Kategoriyi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Basılı Tutulunca Açılan Hızlı İşlem Barı */}
                {isActionOpen && !isEditingCat && (
                  <div className="p-2 bg-slate-900/90 border border-slate-700/80 rounded-xl flex items-center justify-between gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        handleStartEditCat(category);
                        setActiveActionCatId(null);
                      }}
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-200 flex items-center justify-center space-x-1"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-teal-400" />
                      <span>Düzenle</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMergeModalCatId(category.id);
                        setTargetMergeCatId('');
                        setActiveActionCatId(null);
                      }}
                      className="flex-1 py-1.5 px-2 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-lg text-xs font-semibold text-indigo-300 flex items-center justify-center space-x-1"
                    >
                      <GitMerge className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Birleştir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`"${category.name}" kategorisini ve alt kategorilerini silmek istediğinize emin misiniz?`)) {
                          deleteCategory(category.id);
                          setActiveActionCatId(null);
                        }
                      }}
                      className="py-1.5 px-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 rounded-lg text-xs font-semibold text-rose-300 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveActionCatId(null)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Subcategories List */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Alt Kategoriler:</span>
                  </div>

                  {category.subcategories.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-1">Henüz alt kategori eklenmedi</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {category.subcategories.map(sub => {
                        const isEditingThisSub = editingSubKey === `${category.id}_${sub.id}`;

                        if (isEditingThisSub) {
                          return (
                            <div
                              key={sub.id}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-900 border border-teal-500 rounded-lg"
                            >
                              <input
                                type="text"
                                value={editSubName}
                                onChange={e => setEditSubName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEditSub(category.id, sub.id);
                                }}
                                className="w-24 bg-transparent text-xs text-white outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditSub(category.id, sub.id)}
                                className="p-0.5 text-emerald-400 hover:text-emerald-300"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSubKey(null)}
                                className="p-0.5 text-slate-400 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={sub.id}
                            className="group/sub text-xs px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-200 flex items-center space-x-1.5 transition-colors"
                          >
                            <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{sub.name}</span>
                            <div className="flex items-center space-x-0.5 opacity-70 group-hover/sub:opacity-100 ml-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditSub(category.id, sub.id, sub.name)}
                                className="p-0.5 text-slate-400 hover:text-teal-300 transition-colors"
                                title="Alt Kategoriyi Düzenle"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`"${sub.name}" alt kategorisini silmek istediğinize emin misiniz?`)) {
                                    deleteSubCategory(category.id, sub.id);
                                  }
                                }}
                                className="p-0.5 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Alt Kategoriyi Sil"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add Subcategory Trigger / Form */}
                {selectedCatForSub === category.id ? (
                  <div className="pt-2 flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Alt kategori adı..."
                      value={newSubName}
                      onChange={e => setNewSubName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddSubCategory(category.id);
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSubCategory(category.id)}
                      className="px-3 py-1.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-lg"
                    >
                      Ekle
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCatForSub(null)}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedCatForSub(category.id)}
                    className="pt-1 text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Alt Kategori Ekle</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SEÇİLİ KATEGORİ HARCAMA LİSTESİ (LOG KAYITLARI) */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white">
              {selectedCategoryFilter === 'uncategorized'
                ? 'Kategori Dışı Harcamalar'
                : selectedCategoryFilter
                ? `${categories.find(c => c.id === selectedCategoryFilter)?.name || 'Kategori'} Harcamaları`
                : `${formatMonthName(selectedMonthFilter)} Tüm Harcamalar`}
            </h3>
            {selectedCategoryFilter && (
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter(null)}
                className="text-[11px] text-teal-400 hover:text-teal-300 underline ml-1 cursor-pointer flex items-center gap-1"
                title="Filtreyi Kaldır"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Tümünü Göster</span>
              </button>
            )}
          </div>
          <div className="text-right flex items-center gap-2">
            <span className="text-xs text-slate-400">{categoryFilteredExpenses.length} Kayıt</span>
            <span className="text-sm font-extrabold text-emerald-400">{formatCurrency(categoryFilteredTotal)}</span>
          </div>
        </div>

        {categoryFilteredExpenses.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Bu kategoride veya dönemde harcama bulunamadı.</p>
        ) : (
          <div className="space-y-2">
            {categoryFilteredExpenses.map(exp => {
              const category = categories.find(c => c.id === exp.categoryId);
              const subcategory = category?.subcategories.find(s => s.id === exp.subcategoryId);

              return (
                <div
                  key={exp.id}
                  onClick={() => setEditingExpense(exp)}
                  className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-teal-500/50 transition-all flex items-center justify-between gap-3 text-xs cursor-pointer group"
                  title="Düzenlemek veya silmek için tıklayın"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category?.color || '#64748b' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <h4 className="font-semibold text-slate-100 truncate group-hover:text-teal-300 transition-colors">
                          {exp.title || 'Harcama'}
                        </h4>
                        {subcategory && (
                          <span className="text-[10px] text-slate-400">({subcategory.name})</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{formatDateFormatted(exp.date)}</span>
                        <span>• {category?.name || 'Kategori Dışı'}</span>
                        {exp.tags && exp.tags.length > 0 && (
                          <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            <TagChips tags={exp.tags} size="xs" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="font-extrabold text-emerald-400 shrink-0 text-sm">
                    {formatCurrency(exp.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: KATEGORI BIRLEŞTIRME */}
      {mergeModalCatId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-5 rounded-2xl border border-slate-700 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <GitMerge className="w-4 h-4 text-indigo-400" />
                <span>Kategorileri Birleştir</span>
              </h4>
              <button
                type="button"
                onClick={() => setMergeModalCatId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {(() => {
                const sourceCat = categories.find(c => c.id === mergeModalCatId);
                return (
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: sourceCat?.color || '#3b82f6' }}
                    />
                    <span>Kaynak Kategori: <strong className="text-rose-400">{sourceCat?.name}</strong></span>
                  </div>
                );
              })()}

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">Hedef Kategori (Bunun altında birleştirilecek):</label>
                <select
                  value={targetMergeCatId}
                  onChange={(e) => setTargetMergeCatId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 focus:border-indigo-400 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">Hedef Kategori Seçin...</option>
                  {categories
                    .filter(c => c.id !== mergeModalCatId)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.subcategories.length} Alt Kategori)
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                  💡 <strong>Nasıl Çalışır?</strong> Kaynak kategorideki tüm harcamalar hedef kategoriye aktarılır. Varsa alt kategorileri de hedef kategorinin altına güvenle birleştirilir. Kaynak kategori listeden kaldırılır.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMergeModalCatId(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (targetMergeCatId) {
                    mergeCategories([mergeModalCatId], targetMergeCatId);
                    setMergeModalCatId(null);
                  }
                }}
                disabled={!targetMergeCatId}
                className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Birleştir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Period Picker Modal */}
      <PeriodPickerModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        value={selectedMonthFilter}
        onChange={setSelectedMonthFilter}
        themeColor="teal"
        availableMonths={availableMonths}
      />

    </div>
  );
};
