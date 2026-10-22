import React, { useState, useRef } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency, formatDateFormatted, getTodayString } from '../utils/formatters';
import { Tag as TagIcon, RotateCcw, Clock, Edit2, Trash2, GitMerge, Check, X, MoreVertical, Link2, Unlink } from 'lucide-react';
import { PieChart } from './PieChart';
import { PeriodPickerModal } from './PeriodPickerModal';
import { TagChips } from './TagChips';
import { getChildTags, normalizeTag } from '../utils/tagHierarchy';

export const TagQueryView: React.FC = () => {
  const {
    expenses,
    allTags,
    categories,
    renameTag,
    mergeTags,
    deleteTag,
    tagParents,
    setTagParent,
    setEditingExpense
  } = useExpenses();

  const todayStr = getTodayString();
  const currentMonthKey = new Date().toISOString().substring(0, 7);

  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(currentMonthKey);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Tag Management States: Long-press action menu, rename, and merge modals
  const [activeActionTag, setActiveActionTag] = useState<string | null>(null);
  const [renameModalTag, setRenameModalTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState<string>('');
  const [mergeModalTag, setMergeModalTag] = useState<string | null>(null);
  const [targetMergeTag, setTargetMergeTag] = useState<string>('');
  // Link Tag Modal state: hangi etiket hangi üst etikete bağlanacak
  const [linkModalTag, setLinkModalTag] = useState<string | null>(null);
  const [targetParentTag, setTargetParentTag] = useState<string>('');
  const [linkError, setLinkError] = useState<string | null>(null);

  // Long-press detection timer and flags
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

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

  // BASE EXPENSES: Strict past and current expenses (No future expenses)
  const baseExpenses = expenses.filter(exp => {
    const isPastOrToday = exp.date <= todayStr;
    const matchesMonth = selectedMonthFilter !== 'all' ? exp.date.startsWith(selectedMonthFilter) : true;
    return isPastOrToday && matchesMonth;
  });

  // TRUE LOG TOTAL: The actual sum of unique expense records in this selected period
  const trueBaseTotalSpent = baseExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Filter matching expenses (for search/date filters and tag filtering)
  const filteredExpenses = baseExpenses.filter(exp => {
    let hasTag = true;
    if (selectedTag === '__untagged__') {
      hasTag = !exp.tags || exp.tags.length === 0;
    } else if (selectedTag) {
      const cleanSel = normalizeTag(selectedTag);
      const childs = getChildTags(cleanSel, tagParents);
      const matchingTags = new Set([cleanSel, ...childs]);
      hasTag = (exp.tags || []).some(t => matchingTags.has(normalizeTag(t)));
    }

    const matchesStartDate = startDate ? exp.date >= startDate : true;
    const matchesEndDate = endDate ? exp.date <= endDate : true;

    return hasTag && matchesStartDate && matchesEndDate;
  });

  const totalFilteredSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // TRUE TAG AGGREGATION:
  // Her bir etiketin dokunduğu harcamaların gerçek tam tutarı (şişirme paylaştırma olmadan)
  // Örneğin 1.000 TL TSS hem #saglik hem #sigorta ise her iki etiketin de dokunduğu tutar 1.000 TL'dir.
  const tagDirectTotals: { [tag: string]: { total: number; count: number } } = {};
  let untaggedDirectTotal = 0;
  let untaggedCount = 0;

  baseExpenses.forEach(exp => {
    const validTags = (exp.tags || []).map(t => t.toLowerCase().trim()).filter(Boolean);
    if (validTags.length === 0) {
      untaggedDirectTotal += exp.amount;
      untaggedCount += 1;
    } else {
      validTags.forEach(t => {
        if (!tagDirectTotals[t]) tagDirectTotals[t] = { total: 0, count: 0 };
        tagDirectTotals[t].total += exp.amount;
        tagDirectTotals[t].count += 1;
      });
    }
  });

  // Sort by highest spending
  const sortedTagEntries = Object.entries(tagDirectTotals)
    .sort((a, b) => b[1].total - a[1].total);

  // Pie chart slice data
  const tagChartData: { label: string; value: number; color?: string }[] = sortedTagEntries
    .slice(0, 10)
    .map(([t, item]) => ({
      label: `#${t}`,
      value: Math.round(item.total * 100) / 100,
    }));

  if (untaggedDirectTotal > 0) {
    tagChartData.push({
      label: 'Etiketsiz',
      value: Math.round(untaggedDirectTotal * 100) / 100,
      color: '#64748b',
    });
  }

  tagChartData.sort((a, b) => b.value - a.value);

  const clearFilters = () => {
    setSelectedTag('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-5">
      
      {/* 1. GRAFİK VE DÖNEM SEÇİCİ */}
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
            <span className="text-xs text-slate-400">Gerçek Harcama Toplamı: </span>
            <span className="text-xs font-extrabold text-teal-400">{formatCurrency(trueBaseTotalSpent)}</span>
          </div>
        </div>

        {/* Donut Grafik (Gerçek Toplam üzerinden oranlı) */}
        <PieChart
          data={tagChartData}
          customTotal={trueBaseTotalSpent > 0 ? trueBaseTotalSpent : undefined}
          selectedLabel={selectedTag === '__untagged__' ? 'Etiketsiz' : (selectedTag ? `#${selectedTag.toLowerCase()}` : undefined)}
          onSliceClick={(label) => {
            if (label === 'Etiketsiz') {
              setSelectedTag(prev => prev === '__untagged__' ? '' : '__untagged__');
            } else {
              const cleaned = label.replace(/^#/, '');
              setSelectedTag(prev => prev === cleaned ? '' : cleaned);
            }
          }}
          title={`${formatMonthName(selectedMonthFilter)} Etiket Payı`}
        />

        {/* Etiketlerin Gerçek Harcama İçindeki Yüzdeleri Kart Listesi */}
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Etiket Bazında Gerçek Harcama & Oranlar</span>
            <span className="text-[10px] text-slate-400">Harcama Toplamına Oranı</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {sortedTagEntries.map(([t, item]) => {
              const percentage = trueBaseTotalSpent > 0 ? (item.total / trueBaseTotalSpent) * 100 : 0;
              const isSelected = selectedTag.toLowerCase() === t;
              const isActionOpen = activeActionTag === t;

              const handlePointerDown = () => {
                isLongPressTriggeredRef.current = false;
                longPressTimerRef.current = setTimeout(() => {
                  isLongPressTriggeredRef.current = true;
                  setActiveActionTag(t);
                  if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    try { navigator.vibrate(50); } catch (_) {}
                  }
                }, 450);
              };

              const handlePointerUpOrLeave = () => {
                if (longPressTimerRef.current) {
                  clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = null;
                }
              };

              const handleClick = () => {
                if (isLongPressTriggeredRef.current) {
                  isLongPressTriggeredRef.current = false;
                  return;
                }
                setSelectedTag(prev => prev === t ? '' : t);
              };

              return (
                <div
                  key={t}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUpOrLeave}
                  onPointerCancel={handlePointerUpOrLeave}
                  onPointerLeave={handlePointerUpOrLeave}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActiveActionTag(t);
                  }}
                  onClick={handleClick}
                  className={`p-2.5 rounded-xl border text-left transition-all relative select-none cursor-pointer group ${
                    isSelected
                      ? 'bg-teal-500/15 border-teal-500 ring-1 ring-teal-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                  title="Filtrelemek için tıkla, düzenlemek/birleştirmek için basılı tut"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center space-x-1 min-w-0">
                      <span className="font-bold text-teal-300 truncate">#{t}</span>
                      {tagParents[t] && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0 font-medium" title={`Bağlı olduğu üst etiket: #${tagParents[t]}`}>
                          ↳ {tagParents[t]}
                        </span>
                      )}
                      {getChildTags(t, tagParents).length > 0 && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0 font-medium" title={`Alt etiketler: ${getChildTags(t, tagParents).join(', ')}`}>
                          +{getChildTags(t, tagParents).length} alt
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="font-extrabold text-emerald-400">{formatCurrency(item.total)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionTag(activeActionTag === t ? null : t);
                        }}
                        className="opacity-40 group-hover:opacity-100 hover:text-white p-0.5 rounded transition-opacity"
                        title="İşlemler (Düzenle / Birleştir / Sil)"
                      >
                        <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress bar showing % of total expenses */}
                  <div className="w-full bg-slate-900/80 rounded-full h-1.5 overflow-hidden flex mb-1">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{item.count} işlem</span>
                    <span className="font-bold text-slate-200">
                      Toplamın %{percentage.toFixed(1)}'i
                    </span>
                  </div>

                  {/* Basılı Tutulunca / Tıklanınca Açılan Hızlı İşlem Menüsü */}
                  {isActionOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 pt-2 border-t border-slate-700/80 flex items-center justify-between gap-1 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setRenameModalTag(t);
                          setNewTagName(t);
                          setActiveActionTag(null);
                        }}
                        className="flex-1 py-1 px-1.5 bg-slate-700/80 hover:bg-slate-700 rounded-lg text-[10px] font-semibold text-slate-200 flex items-center justify-center space-x-1"
                        title="Etiket Adını Düzenle"
                      >
                        <Edit2 className="w-3 h-3 text-teal-400" />
                        <span>Düzenle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLinkModalTag(t);
                          setTargetParentTag(tagParents[t] || '');
                          setLinkError(null);
                          setActiveActionTag(null);
                        }}
                        className="flex-1 py-1 px-1.5 bg-violet-900/50 hover:bg-violet-900/70 border border-violet-500/30 rounded-lg text-[10px] font-semibold text-violet-200 flex items-center justify-center space-x-1"
                        title="Üst Etikete Bağla / Bağlantıyı Değiştir"
                      >
                        <Link2 className="w-3 h-3 text-violet-400" />
                        <span>{tagParents[t] ? 'Bağlantı' : 'Bağla'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMergeModalTag(t);
                          setTargetMergeTag('');
                          setActiveActionTag(null);
                        }}
                        className="flex-1 py-1 px-1.5 bg-indigo-900/50 hover:bg-indigo-900/70 border border-indigo-500/30 rounded-lg text-[10px] font-semibold text-indigo-200 flex items-center justify-center space-x-1"
                        title="Başka Bir Etiketle Birleştir"
                      >
                        <GitMerge className="w-3 h-3 text-indigo-400" />
                        <span>Birleştir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`"#${t}" etiketini tüm harcamalardan kaldırmak istediğinize emin misiniz?`)) {
                            deleteTag(t);
                            setActiveActionTag(null);
                          }
                        }}
                        className="py-1 px-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 rounded-lg text-[10px] font-semibold text-rose-300 flex items-center justify-center"
                        title="Etiketi Sil"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveActionTag(null)}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Kapat"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {untaggedDirectTotal > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTag(prev => prev === '__untagged__' ? '' : '__untagged__')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedTag === '__untagged__'
                    ? 'bg-slate-700/40 border-slate-400 ring-1 ring-slate-400/50'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-300">Etiketsiz</span>
                  <span className="font-extrabold text-slate-300">{formatCurrency(untaggedDirectTotal)}</span>
                </div>
                
                <div className="w-full bg-slate-900/80 rounded-full h-1.5 overflow-hidden flex mb-1">
                  <div
                    className="bg-slate-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(trueBaseTotalSpent > 0 ? (untaggedDirectTotal / trueBaseTotalSpent) * 100 : 0, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{untaggedCount} işlem</span>
                  <span className="font-bold text-slate-200">
                    Toplamın %{((untaggedDirectTotal / trueBaseTotalSpent) * 100).toFixed(1)}'i
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. 1-ROW COMPACT FILTER BAR */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-800">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          
          {/* Tag Selector */}
          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <TagIcon className="w-4 h-4 text-teal-400 shrink-0" />
            <select
              value={selectedTag}
              onChange={e => setSelectedTag(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700/80 focus:border-teal-500 rounded-xl text-xs text-white outline-none"
            >
              <option value="">Tüm Etiketler ({allTags.length})</option>
              <option value="__untagged__">Etiketsiz Harcamalar</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[11px] text-slate-400">Tarih:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700/80 focus:border-teal-500 rounded-xl text-xs text-white outline-none"
            />
            <span className="text-slate-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700/80 focus:border-teal-500 rounded-xl text-xs text-white outline-none"
            />

            {(selectedTag || startDate || endDate) && (
              <button
                type="button"
                onClick={clearFilters}
                title="Filtreleri Temizle"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Result Summary Badge */}
          <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-800">
            <span className="text-xs text-slate-400">{filteredExpenses.length} Kayıt</span>
            <span className="text-sm font-extrabold text-teal-400">{formatCurrency(totalFilteredSpent)}</span>
          </div>

        </div>
      </div>

      {/* FILTERED LIST */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white">
          {selectedTag ? `#${selectedTag} Etiketli Harcamalar` : 'Filtrelenmiş Harcama Listesi'}
        </h3>

        {filteredExpenses.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Filtreye uygun harcama bulunamadı.</p>
        ) : (
          <div className="space-y-2">
            {filteredExpenses.map(exp => {
              const category = categories.find(c => c.id === exp.categoryId);
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
                      style={{ backgroundColor: category?.color || '#3b82f6' }}
                    />
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-100 truncate">{exp.title || 'Harcama'}</h4>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{formatDateFormatted(exp.date)}</span>
                        <span>• {category?.name || 'Genel'}</span>
                        <div className="flex gap-1 overflow-x-auto no-scrollbar">
                          <TagChips tags={exp.tags || []} size="xs" />
                        </div>
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

      {/* MODAL: ETIKET ADI DÜZENLEME */}
      {renameModalTag && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-5 rounded-2xl border border-slate-700 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-teal-400" />
                <span>Etiketi Düzenle</span>
              </h4>
              <button
                type="button"
                onClick={() => setRenameModalTag(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">Yeni Etiket Adı</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">#</span>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="etiket-adi"
                  className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 focus:border-teal-400 rounded-xl text-xs text-white outline-none"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                "#{renameModalTag}" etiketini içeren tüm harcamalar güncellenecektir.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenameModalTag(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newTagName.trim()) {
                    renameTag(renameModalTag, newTagName.trim());
                    if (selectedTag.toLowerCase() === renameModalTag.toLowerCase()) {
                      setSelectedTag(newTagName.trim().toLowerCase().replace(/^#/, ''));
                    }
                    setRenameModalTag(null);
                  }
                }}
                disabled={!newTagName.trim()}
                className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ETIKETLERI BIRLEŞTIRME */}
      {mergeModalTag && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-5 rounded-2xl border border-slate-700 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <GitMerge className="w-4 h-4 text-indigo-400" />
                <span>Etiketleri Birleştir</span>
              </h4>
              <button
                type="button"
                onClick={() => setMergeModalTag(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                Kaynak Etiket: <span className="font-bold text-rose-400">#{mergeModalTag}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">Hedef Etiket (Bunun altında birleştirilecek):</label>
                <select
                  value={targetMergeTag}
                  onChange={(e) => setTargetMergeTag(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 focus:border-indigo-400 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">Hedef Etiket Seçin...</option>
                  {allTags
                    .filter(t => t.toLowerCase() !== mergeModalTag.toLowerCase())
                    .map(t => (
                      <option key={t} value={t}>
                        #{t}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                  💡 <strong>Nasıl Çalışır?</strong> Örneğin <em>fun</em> ve <em>eğlence</em> birleştirildiğinde tüm <em>fun</em> etiketleri <em>eğlence</em> olur. Eğer bir harcamada her ikisi de varsa, harcama tekrar etmez ve tek bir <em>eğlence</em> etiketi kalır.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMergeModalTag(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (targetMergeTag) {
                    mergeTags([mergeModalTag], targetMergeTag);
                    if (selectedTag.toLowerCase() === mergeModalTag.toLowerCase()) {
                      setSelectedTag(targetMergeTag);
                    }
                    setMergeModalTag(null);
                  }
                }}
                disabled={!targetMergeTag}
                className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Birleştir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BAĞLI ETIKET (ÜST ETIKETE BAĞLAMA) */}
      {linkModalTag && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-5 rounded-2xl border border-slate-700 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-violet-400" />
                <span>Bağlı Etiket Belirle</span>
              </h4>
              <button
                type="button"
                onClick={() => setLinkModalTag(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                Alt Etiket: <span className="font-bold text-teal-300">#{linkModalTag}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">Üst (Ana) Etiket:</label>
                <input
                  type="text"
                  value={targetParentTag}
                  onChange={(e) => {
                    setTargetParentTag(e.target.value);
                    setLinkError(null);
                  }}
                  placeholder="Örn: Sağlık, Sağlıksız..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 focus:border-violet-400 rounded-xl text-xs text-white outline-none"
                  list="known-parent-candidates"
                />
                <datalist id="known-parent-candidates">
                  {allTags
                    .filter(t => t.toLowerCase() !== linkModalTag.toLowerCase())
                    .map(t => (
                      <option key={t} value={t} />
                    ))}
                </datalist>

                {linkError && (
                  <p className="text-[11px] text-rose-400 pt-0.5">{linkError}</p>
                )}

                <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                  💡 <strong>Nasıl Çalışır?</strong> Örneğin <em>{linkModalTag}</em> etiketini <em>Sağlıksız</em> ana etiketine bağlarsanız; harcama girerken #{linkModalTag} seçildiği anda otomatik olarak #{targetParentTag || 'Sağlıksız'} da eklenecek ve kartlarda <em>"{targetParentTag || 'Sağlıksız'}: {linkModalTag}"</em> olarak gruplanacaktır.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              {tagParents[linkModalTag] ? (
                <button
                  type="button"
                  onClick={() => {
                    setTagParent(linkModalTag, null);
                    setLinkModalTag(null);
                  }}
                  className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-1 transition-colors"
                  title="Bağlantıyı Kaldır"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Bağı Kopar</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLinkModalTag(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const err = setTagParent(linkModalTag, targetParentTag.trim() || null);
                    if (err) {
                      setLinkError(err);
                    } else {
                      setLinkModalTag(null);
                    }
                  }}
                  disabled={!targetParentTag.trim()}
                  className="px-4 py-1.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Kaydet</span>
                </button>
              </div>
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
