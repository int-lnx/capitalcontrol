import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';
import { BarChart2 } from 'lucide-react';
import { PieChart } from './PieChart';

export const MonthlySummaryView: React.FC = () => {
  const { expenses, categories } = useExpenses();

  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Extract all unique months (YYYY-MM)
  const monthMap = expenses.reduce<{ [monthKey: string]: { total: number; count: number; items: typeof expenses } }>(
    (acc, exp) => {
      const monthKey = exp.date.substring(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = { total: 0, count: 0, items: [] };
      }
      acc[monthKey].total += exp.amount;
      acc[monthKey].count += 1;
      acc[monthKey].items.push(exp);
      return acc;
    },
    {}
  );

  const sortedMonths = Object.keys(monthMap).sort((a, b) => b.localeCompare(a));
  const activeMonth = selectedMonth || (sortedMonths.length > 0 ? sortedMonths[0] : '');

  const formatMonthTitle = (ym: string) => {
    if (!ym) return '';
    const [year, m] = ym.split('-');
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return `${monthNames[parseInt(m, 10) - 1] || m} ${year}`;
  };

  const activeMonthData = activeMonth ? monthMap[activeMonth] : null;

  // Breakdown by category for selected month
  const categoryBreakdown = activeMonthData
    ? categories.map(cat => {
        const spent = activeMonthData.items
          .filter(e => e.categoryId === cat.id)
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          id: cat.id,
          label: cat.name,
          value: spent,
          color: cat.color,
        };
      }).filter(c => c.value > 0)
    : [];

  // Add uncategorized if any
  if (activeMonthData) {
    const uncatSpent = activeMonthData.items
      .filter(e => !e.categoryId)
      .reduce((sum, e) => sum + e.amount, 0);
    if (uncatSpent > 0) {
      categoryBreakdown.push({
        id: 'general',
        label: 'Genel (Kategorisiz)',
        value: uncatSpent,
        color: '#64748b',
      });
    }
  }

  const grandTotal = Object.values(monthMap).reduce((s, m) => s + m.total, 0);
  const avgMonthly = sortedMonths.length > 0 ? grandTotal / sortedMonths.length : 0;

  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const pastAndCurrentMonths = sortedMonths.filter(m => m <= currentMonthKey);
  const futureMonths = sortedMonths.filter(m => m > currentMonthKey).sort((a, b) => a.localeCompare(b)); // Sort upcoming ascending

  const totalFutureAmount = futureMonths.reduce((sum, m) => sum + (monthMap[m]?.total || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Aylık Harcama Özeti & Gelecek Planı</h2>
            <p className="text-xs text-slate-400">Mevcut gerçekleşen harcamalarınız ve gelecek ayların taahhüt/taksit toplamları</p>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-4 text-xs flex-wrap justify-end">
          <div className="p-2.5 sm:p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-right">
            <span className="text-slate-400 block text-[10px]">Aylık Ortalama</span>
            <span className="font-extrabold text-teal-300 text-xs sm:text-sm">{formatCurrency(avgMonthly)}</span>
          </div>
          {futureMonths.length > 0 && (
            <div className="p-2.5 sm:p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-right">
              <span className="text-amber-400 block text-[10px] font-bold">Gelecek Aylar Toplamı</span>
              <span className="font-extrabold text-amber-300 text-xs sm:text-sm">{formatCurrency(totalFutureAmount)}</span>
            </div>
          )}
          <div className="p-2.5 sm:p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-right">
            <span className="text-slate-400 block text-[10px]">Toplam Dönem</span>
            <span className="font-extrabold text-white text-xs sm:text-sm">{sortedMonths.length} Ay</span>
          </div>
        </div>
      </div>

      {/* 1. GELECEK AYLAR (Varsa özel vurgulu blok) */}
      {/* 1. SEÇİLİ AYIN GRAFİĞİ EN ÜSTTE */}
      {activeMonthData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>📊</span>
              <span>{formatMonthTitle(activeMonth)} Kategori Dağılımı (Yüzdesel)</span>
            </h3>
            <span className="text-xs font-bold text-emerald-400">
              Seçili Ay Toplamı: {formatCurrency(activeMonthData.total)}
            </span>
          </div>

          <PieChart
            data={categoryBreakdown}
            title={`${formatMonthTitle(activeMonth)} Dağılım Grafiği`}
          />
        </div>
      )}

      {/* 2. GELECEK AYLAR (Varsa özel vurgulu blok) */}
      {futureMonths.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔮</span>
              <span>Gelecek Aylar Toplamları & Taksit Yansıması ({futureMonths.length} Ay)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Toplam: {formatCurrency(totalFutureAmount)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {futureMonths.map(ym => {
              const mData = monthMap[ym];
              const isSelected = activeMonth === ym;
              return (
                <button
                  key={ym}
                  onClick={() => setSelectedMonth(ym)}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                      : 'bg-slate-900/70 border-amber-500/30 hover:border-amber-500/60 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-amber-200">{formatMonthTitle(ym)}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      Gelecek Ay • {mData.count} Kalem
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Beklenen Ödeme:</span>
                    <span className="text-base font-black text-amber-400">
                      {formatCurrency(mData.total)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MEVCUT VE GEÇMİŞ AYLAR */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>📅</span>
          <span>Mevcut ve Geçmiş Aylar</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pastAndCurrentMonths.map(ym => {
            const mData = monthMap[ym];
            const isSelected = activeMonth === ym;
            const isCurrent = ym === currentMonthKey;
            return (
              <button
                key={ym}
                onClick={() => setSelectedMonth(ym)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-teal-500 shadow-lg shadow-teal-500/10 ring-1 ring-teal-500'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-bold text-white">{formatMonthTitle(ym)}</span>
                    {isCurrent && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Bu Ay
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                    {mData.count} Harcama
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Toplam Tutar:</span>
                  <span className="text-base font-black text-emerald-400">
                    {formatCurrency(mData.total)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
