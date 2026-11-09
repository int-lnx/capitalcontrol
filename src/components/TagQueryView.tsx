import React, { useState, useMemo } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency, formatDateFormatted } from '../utils/formatters';
import {
  Tag as TagIcon,
  RotateCcw,
  Clock,
  Edit2,
  Trash2,
  GitMerge,
  Check,
  X,
  Link2,
  Plus,
  Network,
  FolderTree,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { PieChart } from './PieChart';
import { PeriodPickerModal } from './PeriodPickerModal';
import { TagChips } from './TagChips';
import {
  getChildTags,
  getParentTags,
  getTagTreePreviews,
  normalizeTag
} from '../utils/tagHierarchy';

const NECESSITY_BORDER_STYLES: Record<string, { border: string; bg: string; text: string; label: string }> = {
  Fizyolojik: {
    border: 'border-emerald-500/40 hover:border-emerald-400/70',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-400',
    label: 'Fizyolojik',
  },
  Temel: {
    border: 'border-blue-500/40 hover:border-blue-400/70',
    bg: 'bg-blue-950/20',
    text: 'text-blue-400',
    label: 'Temel',
  },
  Makul: {
    border: 'border-purple-500/40 hover:border-purple-400/70',
    bg: 'bg-purple-950/20',
    text: 'text-purple-300',
    label: 'Makul',
  },
  Kaçınılabilir: {
    border: 'border-amber-500/40 hover:border-amber-400/70',
    bg: 'bg-amber-950/20',
    text: 'text-amber-400',
    label: 'Kaçınılabilir',
  },
  İsraf: {
    border: 'border-rose-500/50 hover:border-rose-400/80',
    bg: 'bg-rose-950/25',
    text: 'text-rose-400',
    label: 'İsraf',
  },
  Tanımsız: {
    border: 'border-slate-800 hover:border-slate-700',
    bg: 'bg-slate-900/60',
    text: 'text-slate-400',
    label: 'Tanımsız',
  },
};

interface TagQueryViewProps {
  periodFilter?: string;
  onPeriodFilterChange?: (p: string) => void;
  showTheoretical?: boolean;
  onToggleTheoretical?: () => void;
}

export const TagQueryView: React.FC<TagQueryViewProps> = ({
  periodFilter,
  onPeriodFilterChange,
  showTheoretical,
  onToggleTheoretical,
}) => {
  const {
    expenses,
    allTags,
    categories,
    accounts,
    limits,
    renameTag,
    mergeTags,
    deleteTag,
    tagParents,
    addTagParent,
    removeTagParent,
    addTagChild,
    removeTagChild,
    setEditingExpense
  } = useExpenses();

  const currentMonthKey = new Date().toISOString().substring(0, 7);

  const [localShowTheor, setLocalShowTheor] = useState<boolean>(() => {
    const saved = localStorage.getItem('masraf_status_show_theoretical');
    return saved !== null ? saved === 'true' : true;
  });
  const effectiveShowTheor = showTheoretical !== undefined ? showTheoretical : localShowTheor;
  const handleToggleTheor = onToggleTheoretical || (() => setLocalShowTheor(p => !p));

  const [selectedTag, setSelectedTag] = useState<string>('');
  const [localSelectedMonthFilter, setLocalSelectedMonthFilter] = useState<string>(currentMonthKey);
  const selectedMonthFilter = periodFilter !== undefined ? periodFilter : localSelectedMonthFilter;
  const setSelectedMonthFilter = onPeriodFilterChange || setLocalSelectedMonthFilter;

  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals state
  const [activeActionTag, setActiveActionTag] = useState<string | null>(null);
  const [renameModalTag, setRenameModalTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState<string>('');
  const [mergeModalTag, setMergeModalTag] = useState<string | null>(null);
  const [targetMergeTag, setTargetMergeTag] = useState<string>('');

  // Link Tag Modal state (Bağlı Etiket Belirle / Ağaç Yönetimi)
  const [linkModalTag, setLinkModalTag] = useState<string | null>(null);
  const [inputParentTag, setInputParentTag] = useState<string>('');
  const [inputChildTag, setInputChildTag] = useState<string>('');
  const [linkError, setLinkError] = useState<string | null>(null);

  // Yazarken anlık eşleşen üst etiket önerileri (tıklanınca inputu doldurur)
  const parentSuggestions = useMemo(() => {
    const query = normalizeTag(inputParentTag);
    if (!query) return [];
    const existingParents = linkModalTag ? getParentTags(linkModalTag, tagParents) : [];
    return allTags
      .filter(t => {
        const norm = normalizeTag(t);
        return norm.includes(query) && norm !== normalizeTag(linkModalTag || '') && !existingParents.includes(norm);
      })
      .slice(0, 10);
  }, [inputParentTag, allTags, linkModalTag, tagParents]);

  // Yazarken anlık eşleşen alt etiket önerileri (tıklanınca inputu doldurur)
  const childSuggestions = useMemo(() => {
    const query = normalizeTag(inputChildTag);
    if (!query) return [];
    const existingChildren = linkModalTag ? getChildTags(linkModalTag, tagParents) : [];
    return allTags
      .filter(t => {
        const norm = normalizeTag(t);
        return norm.includes(query) && norm !== normalizeTag(linkModalTag || '') && !existingChildren.includes(norm);
      })
      .slice(0, 10);
  }, [inputChildTag, allTags, linkModalTag, tagParents]);

  // Available months (tüm geçmiş, mevcut ve gelecek dönemler)
  const availableMonths = Array.from(
    new Set(
      expenses
        .filter(e => {
          if (e.isTheoretical || e.paymentType === 'teorik') {
            if (!effectiveShowTheor) return false;
            if (e.date.substring(0, 7) < currentMonthKey) return false;
          }
          return true;
        })
        .map(e => e.date.substring(0, 7))
    )
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

  // BASE EXPENSES: Filtered by period (gelecek dönemler ve onay bekleyenler de grafiksel görünüme dahil)
  const baseExpenses = expenses.filter(exp => {
    const isTheor = Boolean(exp.isTheoretical || exp.paymentType === 'teorik');
    if (isTheor) {
      if (!effectiveShowTheor) return false;
      // Ayı geçmiş teorik harcamalar kaybolur
      if (exp.date.substring(0, 7) < currentMonthKey) return false;
    }
    const matchesMonth = selectedMonthFilter !== 'all' ? exp.date.startsWith(selectedMonthFilter) : true;
    return matchesMonth;
  });

  const trueBaseTotalSpent = baseExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Filter matching expenses
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

  // Direct tag totals
  const tagDirectTotals: { [tag: string]: { total: number; count: number } } = {};
  let untaggedDirectTotal = 0;

  baseExpenses.forEach(exp => {
    const validTags = (exp.tags || []).map(t => t.toLowerCase().trim()).filter(Boolean);
    if (validTags.length === 0) {
      untaggedDirectTotal += exp.amount;
    } else {
      validTags.forEach(t => {
        if (!tagDirectTotals[t]) tagDirectTotals[t] = { total: 0, count: 0 };
        tagDirectTotals[t].total += exp.amount;
        tagDirectTotals[t].count += 1;
      });
    }
  });

  const sortedTagEntries = Object.entries(tagDirectTotals)
    .sort((a, b) => b[1].total - a[1].total);

  // Pie chart data: include all tags so everything is accessible in the list
  const tagChartData: { label: string; value: number; color?: string }[] = sortedTagEntries
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

  const handleOpenTagActions = (label: string) => {
    if (label === 'Etiketsiz') return;
    const cleaned = normalizeTag(label);
    if (cleaned) {
      setActiveActionTag(cleaned);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. GRAFİK VE DÖNEM SEÇİCİ */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Sol Üst: Dönem Seçici ve Teorik Toggle Butonları */}
          <div className="flex items-center gap-2 self-start flex-wrap">
            <button
              type="button"
              onClick={() => setIsPeriodModalOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/80 px-2.5 py-1.5 rounded-xl transition-colors"
              title="Dönem Seçimi Yap"
            >
              <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="text-[11px] text-slate-400 font-medium">Dönem:</span>
              <span className="text-xs font-semibold text-teal-300">
                {formatMonthName(selectedMonthFilter)}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleTheor}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                effectiveShowTheor
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200'
              }`}
              title="Teorik / Varsayımsal Harcamaları Göster / Gizle"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Teorik: {effectiveShowTheor ? 'Açık' : 'Kapalı'}</span>
            </button>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400">Harcama Toplamı: </span>
            <span className="text-xs font-extrabold text-teal-400">{formatCurrency(trueBaseTotalSpent)}</span>
          </div>
        </div>

        {/* Donut Grafik ve Liste (Uzun basıldığında düzenleme penceresi açılır) */}
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
          onItemLongPress={handleOpenTagActions}
          title={`${formatMonthName(selectedMonthFilter)} Etiket Payı`}
        />
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
              const subcategory = category?.subcategories.find(s => s.id === exp.subcategoryId);
              const account = accounts.find(a => a.id === exp.accountId);
              const limit = limits.find(l => l.id === exp.limitId);
              const rawLvl = (exp.necessity || 'Tanımsız') as string;
              const styleInfo = NECESSITY_BORDER_STYLES[rawLvl] || NECESSITY_BORDER_STYLES['Tanımsız'];

              return (
                <div
                  key={exp.id}
                  onClick={() => setEditingExpense(exp)}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all ${styleInfo.border} ${styleInfo.bg} hover:border-teal-500/60 hover:shadow-lg hover:shadow-teal-950/20 active:scale-[0.99] cursor-pointer backdrop-blur-sm flex flex-col gap-2`}
                  title="Harcamayı düzenlemek için tıklayın"
                >
                  {/* Top Row: Category (Left), Middle Info, Amount & Payment Type (Right) */}
                  <div className="flex items-start justify-between gap-2">
                    {/* 1. LEFT: Category Pill + Necessity badge */}
                    <div className="flex flex-col items-start gap-1 flex-shrink-0 w-20 sm:w-24">
                      {category ? (
                        <div
                          className="px-2 py-0.5 rounded-lg text-slate-950 font-bold text-[10px] sm:text-[11px] max-w-full truncate shadow-sm"
                          style={{ backgroundColor: category.color || '#3b82f6' }}
                          title={`${category.name}${subcategory ? ` / ${subcategory.name}` : ''}`}
                        >
                          {category.name}
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                          Kategori Dışı
                        </span>
                      )}
                      <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border bg-slate-900/60 ${styleInfo.text} border-current/30 truncate max-w-full`}>
                        {styleInfo.label}
                      </span>
                    </div>

                    {/* 2. MIDDLE: Title, Description, Account, Limit, Date */}
                    <div className="flex-1 min-w-0 space-y-0.5 px-1">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <h4 className="font-semibold text-slate-100 text-xs sm:text-sm truncate">
                          {exp.title || 'Başlıksız Harcama'}
                        </h4>
                        {exp.splitBatchId && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {exp.splitTitle || 'Ayrım'}
                          </span>
                        )}
                        {subcategory && (
                          <span className="text-[9px] text-slate-400 font-medium hidden sm:inline">
                            ({subcategory.name})
                          </span>
                        )}
                        {account && (
                          <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {account.name}
                          </span>
                        )}
                        {limit && (
                          <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {limit.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span>{formatDateFormatted(exp.date)}</span>
                      </div>

                      {exp.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {exp.description}
                        </p>
                      )}
                    </div>

                    {/* 3. RIGHT: Amount & Underneath Payment Details */}
                    <div className="flex flex-col items-end flex-shrink-0 text-right">
                      <span className="text-xs sm:text-base font-extrabold text-emerald-400">
                        {formatCurrency(exp.amount)}
                      </span>
                      <div className="mt-0.5 flex flex-col items-end">
                        {exp.paymentType === 'taksitli' ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {exp.installmentNumber ? `${exp.installmentNumber}. / ${exp.installmentCount} Taksit` : `${exp.installmentCount} Taksit`}
                          </span>
                        ) : exp.paymentType === 'tekrarlayan' ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {exp.isUnlimitedRecurrence ? 'Sürekli Tekrar' : `${exp.installmentNumber || 1}. Tekrar`}
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-teal-400 opacity-90">
                            Peşin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Tags extending full width with plenty of space! */}
                  {exp.tags && exp.tags.length > 0 && (
                    <div className="w-full flex items-center flex-wrap gap-1.5 pt-1.5 border-t border-slate-800/40">
                      <TagChips tags={exp.tags} size="xs" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: ETIKET İŞLEM VE AĞ YAPISI PENCERESI (LONG-PRESS)    */}
      {/* ============================================================ */}
      {activeActionTag && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-5 rounded-2xl border border-slate-700 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            {/* Başlık ve Kapat Butonu */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <TagIcon className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">#{activeActionTag}</h4>
                  <p className="text-[10px] text-slate-400">
                    {tagDirectTotals[activeActionTag]
                      ? `${formatCurrency(tagDirectTotals[activeActionTag].total)} • ${tagDirectTotals[activeActionTag].count} işlem`
                      : 'Bu dönem harcama yok'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveActionTag(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TÜM AĞ YAPISI (Hangi etiketlere nasıl bağlı) */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
                <Network className="w-3.5 h-3.5 text-teal-400" />
                <span>Etiket Ağ Yapısı & Bağlantıları</span>
              </div>

              {(() => {
                const treePreviews = getTagTreePreviews(activeActionTag, tagParents);
                const childTags = getChildTags(activeActionTag, tagParents);
                const hasParents = treePreviews.length > 0;
                const hasChildren = childTags.length > 0;

                if (!hasParents && !hasChildren) {
                  return (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                      <span>Bağımsız Etiket (Herhangi bir üst veya alt etiket bağlantısı bulunmuyor).</span>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {/* Üst grup ağaçları */}
                    {treePreviews.map((grp) => (
                      <div
                        key={grp.parent}
                        className="p-3 rounded-xl bg-slate-900/80 border border-violet-500/30 space-y-1.5"
                      >
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-violet-300">
                          <FolderTree className="w-3.5 h-3.5 text-violet-400" />
                          <span>#{grp.parent} (Üst Etiket)</span>
                        </div>
                        <div className="ml-3 pl-2.5 border-l-2 border-violet-500/30 space-y-1 text-xs">
                          {grp.children.map(child => {
                            const isCurrent = child === activeActionTag;
                            return (
                              <div
                                key={child}
                                className={`flex items-center space-x-1.5 py-0.5 ${
                                  isCurrent ? 'font-bold text-teal-300' : 'text-slate-300'
                                }`}
                              >
                                <span className="text-slate-500 font-mono text-[10px]">•</span>
                                <span>#{child}</span>
                                {isCurrent && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                    Mevcut *
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Bu etiketin kendi alt etiketleri varsa */}
                    {hasChildren && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-teal-500/30 space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-300">
                          <FolderTree className="w-3.5 h-3.5 text-teal-400" />
                          <span>#{activeActionTag} * (Mevcut Etiketin Altındakiler)</span>
                        </div>
                        <div className="ml-3 pl-2.5 border-l-2 border-teal-500/30 space-y-1 text-xs">
                          {childTags.map(child => (
                            <div key={child} className="flex items-center space-x-1.5 text-slate-300 py-0.5">
                              <span className="text-slate-500 font-mono text-[10px]">•</span>
                              <span>#{child}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* SEÇENEKLER: DÜZENLE, BAĞLA, BİRLEŞTİR, SİL */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">İşlemler:</span>
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Düzenle */}
                <button
                  type="button"
                  onClick={() => {
                    setRenameModalTag(activeActionTag);
                    setNewTagName(activeActionTag);
                    setActiveActionTag(null);
                  }}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/70 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center space-x-2 transition-all"
                  title="Etiket Adını Değiştir"
                >
                  <Edit2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Düzenle</span>
                </button>

                {/* 2. Bağla */}
                <button
                  type="button"
                  onClick={() => {
                    setLinkModalTag(activeActionTag);
                    setInputParentTag('');
                    setInputChildTag('');
                    setLinkError(null);
                    setActiveActionTag(null);
                  }}
                  className="p-2.5 bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/30 rounded-xl text-xs font-semibold text-violet-200 flex items-center justify-center space-x-2 transition-all"
                  title="Üst ve Alt Etiketleri Belirle / Yönet"
                >
                  <Link2 className="w-3.5 h-3.5 text-violet-400" />
                  <span>Bağla</span>
                </button>

                {/* 3. Birleştir */}
                <button
                  type="button"
                  onClick={() => {
                    setMergeModalTag(activeActionTag);
                    setTargetMergeTag('');
                    setActiveActionTag(null);
                  }}
                  className="p-2.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 rounded-xl text-xs font-semibold text-indigo-200 flex items-center justify-center space-x-2 transition-all"
                  title="Başka Bir Etiketle Birleştir"
                >
                  <GitMerge className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Birleştir</span>
                </button>

                {/* 4. Sil */}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`"#${activeActionTag}" etiketini tüm harcamalardan ve bağlantılardan kaldırmak istediğinize emin misiniz?`)) {
                      deleteTag(activeActionTag);
                      if (selectedTag.toLowerCase() === activeActionTag.toLowerCase()) {
                        setSelectedTag('');
                      }
                      setActiveActionTag(null);
                    }
                  }}
                  className="p-2.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-300 flex items-center justify-center space-x-2 transition-all"
                  title="Etiketi Tamamen Sil"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sil</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: BAĞLI ETIKET BELİRLE & AĞAÇ ÖNİZLEMESİ             */}
      {/* ============================================================ */}
      {linkModalTag && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-5 rounded-2xl border border-slate-700 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            
            {/* Başlık */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-violet-400" />
                <span>Bağlı Etiket Belirle: #{linkModalTag}</span>
              </h4>
              <button
                type="button"
                onClick={() => setLinkModalTag(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* HATA MESAJI (Varsa) */}
            {linkError && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-center space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{linkError}</span>
              </div>
            )}

            {/* ÖNİZLEME: ETİKETİN BULUNDUĞU ETİKET GRUPLARI / AĞAÇLAR */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-teal-400" />
                <span>Etiket Grubu Ağaç Önizlemesi</span>
              </label>

              {(() => {
                const previews = getTagTreePreviews(linkModalTag, tagParents);
                const children = getChildTags(linkModalTag, tagParents);
                const hasParents = previews.length > 0;
                const hasChildren = children.length > 0;

                if (!hasParents && !hasChildren) {
                  return (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                      Bu etikete henüz bir üst veya alt etiket bağlanmamış. Aşağıdaki alanlardan dilediğiniz üst veya alt etiketleri ekleyebilirsiniz.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {/* Üst grup ağaçları (Örn: Faturalar -> Elektrik*, Su, internet | Ev -> Elektrik*, kira, mutfak) */}
                    {previews.map(grp => (
                      <div
                        key={grp.parent}
                        className="p-3 rounded-xl bg-slate-900/80 border border-violet-500/30 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-violet-300">
                            {grp.parent}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              removeTagParent(linkModalTag, grp.parent);
                              setLinkError(null);
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline"
                            title="Bu üst etiket bağını kaldır"
                          >
                            Bağı Kaldır
                          </button>
                        </div>
                        <div className="ml-2 pl-2 border-l-2 border-violet-500/30 space-y-0.5 text-xs">
                          {grp.children.map(child => {
                            const isCurrent = child === linkModalTag;
                            return (
                              <div
                                key={child}
                                className={`flex items-center space-x-1.5 py-0.5 ${
                                  isCurrent ? 'font-bold text-teal-300' : 'text-slate-400'
                                }`}
                              >
                                <span>- {child}</span>
                                {isCurrent && (
                                  <span className="text-[10px] px-1 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                    *
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Kendi alt etiketleri ağacı (Örn: Elektrik* -> trafo, jeneratör vb.) */}
                    {hasChildren && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-teal-500/30 space-y-1.5">
                        <div className="text-xs font-bold text-teal-300">
                          {linkModalTag} * (Mevcut Etiket)
                        </div>
                        <div className="ml-2 pl-2 border-l-2 border-teal-500/30 space-y-0.5 text-xs">
                          {children.map(child => (
                            <div key={child} className="flex items-center justify-between text-slate-300 py-0.5">
                              <span>- {child}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  removeTagChild(linkModalTag, child);
                                  setLinkError(null);
                                }}
                                className="text-[10px] text-rose-400 hover:text-rose-300"
                                title="Alt etiketi ayır"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* YÖNETİM BÖLÜMÜ: ÜST ETİKETLER */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-violet-300">
                1. Üst (Ana) Etiket Ekle
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputParentTag}
                  onChange={e => {
                    setInputParentTag(e.target.value);
                    setLinkError(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!inputParentTag.trim()) return;
                      const err = addTagParent(linkModalTag, inputParentTag.trim());
                      if (err) {
                        setLinkError(err);
                      } else {
                        setInputParentTag('');
                        setLinkError(null);
                      }
                    }
                  }}
                  placeholder="Örn: Faturalar, Ev... (Yazarken önerir)"
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 focus:border-violet-400 rounded-xl text-xs text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!inputParentTag.trim()) return;
                    const err = addTagParent(linkModalTag, inputParentTag.trim());
                    if (err) {
                      setLinkError(err);
                    } else {
                      setInputParentTag('');
                      setLinkError(null);
                    }
                  }}
                  disabled={!inputParentTag.trim()}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ekle</span>
                </button>
              </div>

              {/* Yazarken anlık öneriler (Tıklanınca kutuyu doldurur) */}
              {parentSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 animate-in fade-in duration-100">
                  <span className="text-[10px] text-slate-400 font-medium">Önerilenler:</span>
                  {parentSuggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInputParentTag(s)}
                      className="px-2 py-0.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/40 text-violet-200 border border-violet-500/30 text-xs font-medium transition-colors"
                      title={`"${s}" ile doldur`}
                    >
                      #{s}
                    </button>
                  ))}
                </div>
              )}

              {/* Mevcut bağlı üst etiketler listesi */}
              {(() => {
                const parents = getParentTags(linkModalTag, tagParents);
                if (parents.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {parents.map(p => (
                      <span
                        key={p}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs"
                      >
                        <span>#{p}</span>
                        <button
                          type="button"
                          onClick={() => {
                            removeTagParent(linkModalTag, p);
                            setLinkError(null);
                          }}
                          className="hover:text-rose-400 p-0.5 rounded"
                          title="Üst etiket bağını kaldır"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* YÖNETİM BÖLÜMÜ: ALT ETİKETLER */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-teal-300">
                2. Alt Etiket Ekle
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputChildTag}
                  onChange={e => {
                    setInputChildTag(e.target.value);
                    setLinkError(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!inputChildTag.trim()) return;
                      const err = addTagChild(linkModalTag, inputChildTag.trim());
                      if (err) {
                        setLinkError(err);
                      } else {
                        setInputChildTag('');
                        setLinkError(null);
                      }
                    }
                  }}
                  placeholder="Örn: Su, İnternet... (Yazarken önerir)"
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 focus:border-teal-400 rounded-xl text-xs text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!inputChildTag.trim()) return;
                    const err = addTagChild(linkModalTag, inputChildTag.trim());
                    if (err) {
                      setLinkError(err);
                    } else {
                      setInputChildTag('');
                      setLinkError(null);
                    }
                  }}
                  disabled={!inputChildTag.trim()}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ekle</span>
                </button>
              </div>

              {/* Yazarken anlık öneriler (Tıklanınca kutuyu doldurur) */}
              {childSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 animate-in fade-in duration-100">
                  <span className="text-[10px] text-slate-400 font-medium">Önerilenler:</span>
                  {childSuggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInputChildTag(s)}
                      className="px-2 py-0.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/40 text-teal-200 border border-teal-500/30 text-xs font-medium transition-colors"
                      title={`"${s}" ile doldur`}
                    >
                      #{s}
                    </button>
                  ))}
                </div>
              )}

              {/* Mevcut bağlı alt etiketler listesi */}
              {(() => {
                const childs = getChildTags(linkModalTag, tagParents);
                if (childs.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {childs.map(c => (
                      <span
                        key={c}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs"
                      >
                        <span>#{c}</span>
                        <button
                          type="button"
                          onClick={() => {
                            removeTagChild(linkModalTag, c);
                            setLinkError(null);
                          }}
                          className="hover:text-rose-400 p-0.5 rounded"
                          title="Alt etiket bağını kaldır"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Kapat / Tamam Butonu */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setLinkModalTag(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors"
              >
                Kapat
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: ETIKET ADI DÜZENLEME                                */}
      {/* ============================================================ */}
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
                      setSelectedTag(normalizeTag(newTagName));
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

      {/* ============================================================ */}
      {/* MODAL 4: ETIKETLERI BIRLEŞTIRME                              */}
      {/* ============================================================ */}
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
