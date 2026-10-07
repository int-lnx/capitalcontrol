import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency, formatDateFormatted, getTodayString } from '../utils/formatters';
import { Tag as TagIcon, RotateCcw, Clock } from 'lucide-react';
import { PieChart } from './PieChart';

export const TagQueryView: React.FC = () => {
  const { expenses, allTags, categories } = useExpenses();

  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const todayStr = getTodayString();
  const currentMonthKey = new Date().toISOString().substring(0, 7);

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
      hasTag = (exp.tags || []).map(t => t.toLowerCase()).includes(selectedTag.toLowerCase());
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
          <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1.5 rounded-xl self-start">
            <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium">Dönem:</span>
            <select
              value={selectedMonthFilter}
              onChange={e => setSelectedMonthFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-teal-300 outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">Tüm Dönemler</option>
              {availableMonths.map(m => (
                <option key={m} value={m} className="bg-slate-900 text-slate-200">
                  {formatMonthName(m)}
                </option>
              ))}
            </select>
          </div>

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
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTag(prev => prev === t ? '' : t)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-teal-500/15 border-teal-500 ring-1 ring-teal-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-teal-300 truncate">#{t}</span>
                    <span className="font-extrabold text-emerald-400">{formatCurrency(item.total)}</span>
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
                </button>
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
                  className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3 text-xs"
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
                        <div className="flex gap-1 overflow-hidden">
                          {(exp.tags || []).map(t => (
                            <span key={t} className="text-teal-300 font-medium">#{t}</span>
                          ))}
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

    </div>
  );
};
