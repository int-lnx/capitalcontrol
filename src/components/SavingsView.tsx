import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency, formatDateFormatted } from '../utils/formatters';
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

interface SavingsViewProps {
  periodFilter?: string;
  onPeriodFilterChange?: (p: string) => void;
  showTheoretical?: boolean;
  onToggleTheoretical?: () => void;
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  periodFilter,
  onPeriodFilterChange,
  showTheoretical,
  onToggleTheoretical,
}) => {
  const { expenses, categories, accounts, setEditingExpense } = useExpenses();
  const currentMonthKey = new Date().toISOString().substring(0, 7);

  const [localShowTheor, setLocalShowTheor] = useState<boolean>(() => {
    const saved = localStorage.getItem('masraf_status_show_theoretical');
    return saved !== null ? saved === 'true' : true;
  });
  const effectiveShowTheor = showTheoretical !== undefined ? showTheoretical : localShowTheor;
  const handleToggleTheor = onToggleTheoretical || (() => setLocalShowTheor(p => !p));

  const [selectedLevel, setSelectedLevel] = useState<NecessityLevel | 'ALL' | 'FIRSAT'>('ALL');
  const [localMonthFilter, setLocalMonthFilter] = useState<string>(currentMonthKey);
  const selectedMonthFilter = periodFilter !== undefined ? periodFilter : localMonthFilter;
  const setSelectedMonthFilter = onPeriodFilterChange || setLocalMonthFilter;
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false);

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

  // Base expenses strictly filtered by period (gelecek dönemler ve onay bekleyenler de grafiksel görünüme dahil)
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

  // Fırsat kayıtları nakit çıkışı değildir; kaçan tasarruf potansiyeli olarak ayrıştırılır
  const realExpenses = baseExpenses.filter(e => e.paymentType !== 'firsat' && !e.isOpportunity);
  const opportunityExpenses = baseExpenses.filter(e => e.paymentType === 'firsat' || e.isOpportunity);

  const periodTotalSpent = realExpenses.reduce((s, e) => s + e.amount, 0);
  const missedOpportunitiesTotal = opportunityExpenses.reduce((s, e) => s + e.amount, 0);

  // Compute breakdown for each necessity level based on selected period
  const totalsByLevel = ALL_LEVELS.reduce<Record<NecessityLevel, { total: number; count: number }>>(
    (acc, lvl) => {
      acc[lvl] = { total: 0, count: 0 };
      return acc;
    },
    {} as Record<NecessityLevel, { total: number; count: number }>
  );

  realExpenses.forEach(exp => {
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
    const isOpp = Boolean(exp.paymentType === 'firsat' || exp.isOpportunity);
    if (selectedLevel === 'FIRSAT') {
      return isOpp;
    }
    if (selectedLevel === 'ALL') {
      return true;
    }
    if (isOpp) return false;

    const rawLvl = exp.necessity as string;
    let expLvl: NecessityLevel = 'Tanımsız';
    if (rawLvl === 'Gereksiz') expLvl = 'Kaçınılabilir';
    else if (rawLvl === 'Kayıtsız') expLvl = 'Tanımsız';
    else if (ALL_LEVELS.includes(rawLvl as NecessityLevel)) expLvl = rawLvl as NecessityLevel;

    return expLvl === selectedLevel;
  });

  // Calculate potential savings: Kaçınılabilir + İsraf + Kaçan Fırsatlar
  const wasteAndUnnecessary = (totalsByLevel['Kaçınılabilir']?.total || 0) + (totalsByLevel['İsraf']?.total || 0);
  const totalPotentialSavings = wasteAndUnnecessary + missedOpportunitiesTotal;
  const savingsPotentialPercent = periodTotalSpent > 0 ? (wasteAndUnnecessary / periodTotalSpent) * 100 : 0;

  return (
    <div className="space-y-5">
      
      {/* 1. PIE CHART VE DÖNEM SEÇİCİ EN ÜSTTE */}
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
              <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-[11px] text-slate-400 font-medium">Dönem:</span>
              <span className="text-xs font-semibold text-purple-300">
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
            <span className="text-xs text-slate-400">Dönem Harcama Toplamı: </span>
            <span className="text-xs font-extrabold text-purple-300">{formatCurrency(periodTotalSpent)}</span>
          </div>
        </div>

        <PieChart
          data={chartData}
          customTotal={periodTotalSpent > 0 ? periodTotalSpent : undefined}
          selectedLabel={selectedLevel === 'ALL' || selectedLevel === 'FIRSAT' ? undefined : NECESSITY_METAS[selectedLevel]?.label}
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
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">Tasarruf & İhtiyaç Seviyesi Analizi</h2>
            <p className="text-[11px] text-slate-400">
              Gereklilik seviyesine ve kaçan fırsatlara göre tasarruf potansiyeli
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Ayrı Satırda Kaçan Fırsatlar */}
          <div className="p-2.5 px-3.5 bg-slate-800/80 rounded-xl border border-amber-500/30 text-right">
            <span className="text-amber-400 block text-[10px] uppercase font-bold tracking-wider">
              🎯 Kaçan Fırsatlar
            </span>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-sm sm:text-base font-black text-amber-300">
                {formatCurrency(missedOpportunitiesTotal)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                ({opportunityExpenses.length} fırsat)
              </span>
            </div>
          </div>

          {/* Toplam Tasarruf Edilebilir Miktar (Kaçınılabilir + İsraf + Kaçan Fırsatlar) */}
          <div className="p-2.5 px-3.5 bg-slate-800/90 rounded-xl border border-rose-500/40 text-right shadow-sm">
            <span className="text-slate-300 block text-[10px] uppercase font-bold tracking-wider">
              Toplam Tasarruf Edilebilir
            </span>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-base sm:text-lg font-black text-rose-400">
                {formatCurrency(totalPotentialSavings)}
              </span>
              <span className="text-[11px] text-rose-300 font-bold">
                (İsraf: {formatCurrency(wasteAndUnnecessary)}{periodTotalSpent > 0 ? ` • %${savingsPotentialPercent.toFixed(1)}` : ''})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEVİYE SEÇİM KARTLARI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
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

        {/* 7. Kaçan Fırsat Kartı */}
        <button
          onClick={() => setSelectedLevel(selectedLevel === 'FIRSAT' ? 'ALL' : 'FIRSAT')}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            selectedLevel === 'FIRSAT'
              ? 'bg-amber-950/40 border-amber-400 shadow-md ring-1 ring-amber-400/50'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-amber-600/50 hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm">🎯</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <div className="text-xs font-bold text-amber-300 truncate">Kaçan Fırsat</div>
          <div className="text-[10px] text-slate-400 truncate">{opportunityExpenses.length} Fırsat</div>
          <div className="text-[11px] font-black mt-0.5 text-amber-400">
            {formatCurrency(missedOpportunitiesTotal)}
          </div>
        </button>
      </div>

      {/* 4. HARCAMA VE FIRSAT LİSTESİ */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs sm:text-sm font-bold text-white">
              {selectedLevel === 'ALL'
                ? 'Tüm Harcamalar & Fırsatlar'
                : selectedLevel === 'FIRSAT'
                ? 'Kaçan Fırsatlar'
                : `${NECESSITY_METAS[selectedLevel]?.label} Seviyesindeki Harcamalar`}
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
          <p className="text-xs text-slate-500 py-6 text-center">Bu kriterde kayıt bulunamadı.</p>
        ) : (
          <div className="space-y-1.5">
            {filteredExpenses.map(exp => {
              const isOpp = Boolean(exp.paymentType === 'firsat' || exp.isOpportunity);
              const category = categories.find(c => c.id === exp.categoryId);
              const account = accounts.find(a => a.id === exp.accountId);
              const rawLvl = exp.necessity as string;
              let lvl: NecessityLevel = 'Tanımsız';
              if (rawLvl === 'Gereksiz') lvl = 'Kaçınılabilir';
              else if (rawLvl === 'Kayıtsız') lvl = 'Tanımsız';
              else if (ALL_LEVELS.includes(rawLvl as NecessityLevel)) lvl = rawLvl as NecessityLevel;
              const meta = isOpp
                ? { label: 'Kaçan Fırsat', icon: '🎯', color: '#f59e0b' }
                : NECESSITY_METAS[lvl];

              return (
                <div
                  key={exp.id}
                  onClick={() => setEditingExpense(exp)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-xs active:scale-[0.99] ${
                    isOpp
                      ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/30'
                      : 'bg-slate-800/60 border-slate-700/60 hover:border-teal-500/50 hover:bg-slate-800'
                  }`}
                  title="Düzenlemek için tıklayın"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="text-sm shrink-0">{meta.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-semibold text-slate-100 truncate">
                          {exp.title || (isOpp ? 'Kaçan Fırsat' : 'Harcama')}
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
                        {isOpp && <span className="text-amber-400 font-medium">• Bakiye düşmez</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`font-black text-xs sm:text-sm ${isOpp ? 'text-amber-400' : 'text-purple-300'}`}>
                      {formatCurrency(exp.amount)}
                    </span>
                    {isOpp && (
                      <span className="block text-[9px] text-amber-400/80 font-medium">Kaçan Fırsat</span>
                    )}
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
