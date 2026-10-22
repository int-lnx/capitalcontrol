import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency, formatDateFormatted, getTodayString } from '../utils/formatters';
import type { NecessityLevel } from '../types';
import { Sparkles, Clock } from 'lucide-react';
import { PieChart } from './PieChart';
import { PeriodPickerModal } from './PeriodPickerModal';

const NECESSITY_METAS: Record<NecessityLevel, { label: string; desc: string; color: string; icon: string }> = {
  Fizyolojik: { label: 'Fizyolojik', desc: 'Mutfak, gıda, su, temel sağlık', color: '#10b981', icon: '🥗' },
  Temel: { label: 'Temel', desc: 'Kira, fatura, düzenli ulaşım', color: '#3b82f6', icon: '🏠' },
  Makul: { label: 'Makul', desc: 'Sosyal yaşam, kültür, kitap, sinema', color: '#8b5cf6', icon: '🎬' },
  Kaçınılabilir: { label: 'Kaçınılabilir Harcama', desc: 'Ertelenemez olmayan, fevri harcamalar', color: '#f59e0b', icon: '⚠️' },
  İsraf: { label: 'İsraf', desc: 'Kaçınılması ve kesilmesi gereken harcamalar', color: '#ef4444', icon: '🔥' },
  Tanımsız: { label: 'Tanımsız', desc: 'Henüz tasarruf seviyesi atanmamış', color: '#64748b', icon: '⚪' },
};

const ALL_LEVELS: NecessityLevel[] = ['Fizyolojik', 'Temel', 'Makul', 'Kaçınılabilir', 'İsraf', 'Tanımsız'];

export const SavingsView: React.FC = () => {
  const { expenses, categories, accounts, setEditingExpense } = useExpenses();
  const todayStr = getTodayString();
  const currentMonthKey = new Date().toISOString().substring(0, 7);

  const [selectedLevel, setSelectedLevel] = useState<NecessityLevel | 'ALL'>('ALL');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(currentMonthKey);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false);

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

  // Compute breakdown for each necessity level based on selected period
  const totalsByLevel = ALL_LEVELS.reduce<Record<NecessityLevel, { total: number; count: number }>>(
    (acc, lvl) => {
      acc[lvl] = { total: 0, count: 0 };
      return acc;
    },
    {} as Record<NecessityLevel, { total: number; count: number }>
  );

  baseExpenses.forEach(exp => {
    const rawLvl = exp.necessity as string;
    let lvl: NecessityLevel = 'Tanımsız';
    if (rawLvl === 'Gereksiz') lvl = 'Kaçınılabilir';
    else if (rawLvl === 'Kayıtsız') lvl = 'Tanımsız';
    else if (ALL_LEVELS.includes(rawLvl as NecessityLevel)) lvl = rawLvl as NecessityLevel;

    if (!totalsByLevel[lvl]) {
      totalsByLevel[lvl] = { total: 0, count: 0 };
    }
    totalsByLevel[lvl].total += exp.amount;
    totalsByLevel[lvl].count += 1;
  });

  // Pie chart data
  const chartData = ALL_LEVELS.map(lvl => ({
    id: lvl,
    label: NECESSITY_METAS[lvl].label,
    value: totalsByLevel[lvl].total,
    color: NECESSITY_METAS[lvl].color,
  })).filter(d => d.value > 0);

  // Filtered expense items
  const filteredExpenses = baseExpenses.filter(exp => {
    const rawLvl = exp.necessity as string;
    let expLvl: NecessityLevel = 'Tanımsız';
    if (rawLvl === 'Gereksiz') expLvl = 'Kaçınılabilir';
    else if (rawLvl === 'Kayıtsız') expLvl = 'Tanımsız';
    else if (ALL_LEVELS.includes(rawLvl as NecessityLevel)) expLvl = rawLvl as NecessityLevel;

    if (selectedLevel === 'ALL') return true;
    return expLvl === selectedLevel;
  });

  // Calculate potential savings (Kaçınılabilir + İsraf)
  const wasteAndUnnecessary = (totalsByLevel['Kaçınılabilir']?.total || 0) + (totalsByLevel['İsraf']?.total || 0);
  const savingsPotentialPercent = periodTotalSpent > 0 ? (wasteAndUnnecessary / periodTotalSpent) * 100 : 0;

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
            <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium">Dönem:</span>
            <span className="text-xs font-semibold text-purple-300">
              {formatMonthName(selectedMonthFilter)}
            </span>
          </button>

          <div className="text-right">
            <span className="text-xs text-slate-400">Dönem Harcama Toplamı: </span>
            <span className="text-xs font-extrabold text-purple-300">{formatCurrency(periodTotalSpent)}</span>
          </div>
        </div>

        <PieChart
          data={chartData}
          customTotal={periodTotalSpent > 0 ? periodTotalSpent : undefined}
          selectedLabel={selectedLevel === 'ALL' ? undefined : NECESSITY_METAS[selectedLevel]?.label}
          onSliceClick={(label) => {
            const matchedKey = ALL_LEVELS.find(lvl => NECESSITY_METAS[lvl].label === label || lvl === label);
            if (matchedKey) {
              setSelectedLevel(prev => (prev === matchedKey ? 'ALL' : matchedKey));
            }
          }}
          title={`${formatMonthName(selectedMonthFilter)} Tasarruf Dağılımı`}
        />
      </div>

      {/* 2. TASARRUF POTANSİYELİ BANNERI (GRAFİĞİN HEMEN ALTINDA) */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">Tasarruf & İhtiyaç Seviyesi Analizi</h2>
            <p className="text-[11px] text-slate-400">
              Gereklilik seviyesine göre ayrıştırılan harcama detayları
            </p>
          </div>
        </div>

        <div className="p-2.5 px-3.5 bg-slate-800/80 rounded-xl border border-rose-500/30 text-right w-full sm:w-auto">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Kurtarılabilecek Tasarruf (Kaçınılabilir + İsraf)
          </span>
          <div className="flex items-baseline justify-end gap-1.5">
            <span className="text-sm sm:text-base font-black text-rose-400">
              {formatCurrency(wasteAndUnnecessary)}
            </span>
            <span className="text-xs text-rose-300 font-bold">
              (%{savingsPotentialPercent.toFixed(1)})
            </span>
          </div>
        </div>
      </div>

      {/* 3. SEVİYE SEÇİM KARTLARI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {ALL_LEVELS.map(lvl => {
          const meta = NECESSITY_METAS[lvl];
          const data = totalsByLevel[lvl];
          const isSelected = selectedLevel === lvl;

          return (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(isSelected ? 'ALL' : lvl)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-slate-800 border-teal-400 shadow-md ring-1 ring-teal-400/50'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{meta.icon}</span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
              </div>
              <div className="text-xs font-bold text-white truncate">{meta.label}</div>
              <div className="text-[10px] text-slate-400 truncate">{data.count} Harcama</div>
              <div className="text-[11px] font-black mt-0.5 text-slate-200">
                {formatCurrency(data.total)}
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. HARCAMA LİSTESİ */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs sm:text-sm font-bold text-white">
              {selectedLevel === 'ALL' ? 'Tüm Harcamalar' : `${NECESSITY_METAS[selectedLevel]?.label} Seviyesindeki Harcamalar`}
            </h3>
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 font-medium">
              {filteredExpenses.length} Kayıt
            </span>
          </div>

          {selectedLevel !== 'ALL' && (
            <button
              onClick={() => setSelectedLevel('ALL')}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
            >
              Filtreyi Kaldır
            </button>
          )}
        </div>

        {filteredExpenses.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Bu seviyede harcama bulunamadı.</p>
        ) : (
          <div className="space-y-1.5">
            {filteredExpenses.map(exp => {
              const category = categories.find(c => c.id === exp.categoryId);
              const account = accounts.find(a => a.id === exp.accountId);
              const rawLvl = exp.necessity as string;
              let lvl: NecessityLevel = 'Tanımsız';
              if (rawLvl === 'Gereksiz') lvl = 'Kaçınılabilir';
              else if (rawLvl === 'Kayıtsız') lvl = 'Tanımsız';
              else if (ALL_LEVELS.includes(rawLvl as NecessityLevel)) lvl = rawLvl as NecessityLevel;
              const meta = NECESSITY_METAS[lvl];

              return (
                <div
                  key={exp.id}
                  onClick={() => setEditingExpense(exp)}
                  className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-teal-500/50 hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-between gap-2.5 text-xs active:scale-[0.99]"
                  title="Düzenlemek için tıklayın"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="text-sm shrink-0">{meta.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-semibold text-slate-100 truncate">
                          {exp.title || 'Harcama'}
                        </h4>
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-bold"
                          style={{
                            backgroundColor: `${meta.color}25`,
                            color: meta.color,
                            border: `1px solid ${meta.color}40`,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.2">
                        <span>{formatDateFormatted(exp.date)}</span>
                        <span>• {category?.name || 'Genel'}</span>
                        {account && <span>• {account.name}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-black text-purple-300 text-xs sm:text-sm">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Period Picker Modal */}
      <PeriodPickerModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        value={selectedMonthFilter}
        onChange={setSelectedMonthFilter}
        themeColor="purple"
        availableMonths={availableMonths}
      />

    </div>
  );
};
