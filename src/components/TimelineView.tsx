import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency, formatDateFormatted, getTodayString } from '../utils/formatters';
import {
  Search,
  Calendar,
  Filter,
  Clock,
} from 'lucide-react';

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
  Gereksiz: {
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
  Kayıtsız: {
    border: 'border-slate-800 hover:border-slate-700',
    bg: 'bg-slate-900/60',
    text: 'text-slate-400',
    label: 'Tanımsız',
  },
};

export const TimelineView: React.FC = () => {
  const { expenses, categories, accounts, limits, setEditingExpense } = useExpenses();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  
  // Month filter in YYYY-MM format, default to 'all' so any past or entered record is immediately visible
  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

  const todayStr = getTodayString();

  // Unique YYYY-MM months available
  const availableMonths = Array.from(
    new Set(expenses.map(e => e.date.substring(0, 7)))
  );
  if (!availableMonths.includes(currentMonthKey)) {
    availableMonths.push(currentMonthKey);
  }
  availableMonths.sort((a, b) => b.localeCompare(a));

  // Current Month Summary Stats (Covers the selected month, or all past/current expenses if 'all')
  const monthTargetExpenses = selectedMonthFilter === 'all'
    ? expenses.filter(e => e.date <= todayStr)
    : expenses.filter(e => e.date.startsWith(selectedMonthFilter));
  const currentMonthTotalSpent = monthTargetExpenses.reduce((sum, e) => sum + e.amount, 0);
  const currentMonthTransactionsCount = monthTargetExpenses.length;

  // ONLY CURRENT AND PAST EXPENSES (All records dated today or before, including any past logs)
  const pastAndCurrentExpenses = expenses.filter(exp => exp.date <= todayStr);

  // Filtered expenses list
  const filteredExpenses = pastAndCurrentExpenses.filter(exp => {
    const matchesSearch =
      (exp.title && exp.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      exp.amount.toString().includes(searchTerm);

    const matchesCategory = selectedCategoryFilter ? exp.categoryId === selectedCategoryFilter : true;
    const matchesMonth = selectedMonthFilter !== 'all' ? exp.date.startsWith(selectedMonthFilter) : true;

    return matchesSearch && matchesCategory && matchesMonth;
  });

  // Group by date
  const groupedByDate = filteredExpenses.reduce<{ [dateKey: string]: typeof expenses }>((acc, exp) => {
    if (!acc[exp.date]) acc[exp.date] = [];
    acc[exp.date].push(exp);
    return acc;
  }, {});

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const formatMonthName = (yearMonth: string) => {
    if (yearMonth === 'all') return 'Tüm Dönemler';
    const [year, month] = yearMonth.split('-');
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    return `${monthNames[monthIdx] || month} ${year}`;
  };

  const renderExpenseCard = (expense: (typeof expenses)[0]) => {
    const category = categories.find(c => c.id === expense.categoryId);
    const subcategory = category?.subcategories.find(s => s.id === expense.subcategoryId);
    const account = accounts.find(a => a.id === expense.accountId);
    const limit = limits.find(l => l.id === expense.limitId);
    const rawLvl = (expense.necessity || 'Tanımsız') as string;
    const styleInfo = NECESSITY_BORDER_STYLES[rawLvl] || NECESSITY_BORDER_STYLES['Tanımsız'];

    return (
      <div key={expense.id} className="relative group select-none">
        {/* Card Container - Tek tıkla düzenleme paneli açılır */}
        <div
          onClick={() => setEditingExpense(expense)}
          className={`p-2 sm:p-2.5 rounded-xl border transition-all ${styleInfo.border} ${styleInfo.bg} hover:border-teal-500/60 hover:shadow-lg hover:shadow-teal-950/20 active:scale-[0.99] backdrop-blur-sm flex flex-col gap-1.5 relative cursor-pointer`}
          title="Düzenlemek veya silmek için tıklayın"
        >
          {/* Top Row: Category (Left), Middle Info, Amount & Installment (Right) */}
          <div className="flex items-start justify-between gap-2">
            
            {/* 1. LEFT: Compact Category Pill + Necessity badge stacked */}
            <div className="flex flex-col items-start gap-1 flex-shrink-0 w-20 sm:w-24">
              {category ? (
                <div
                  className="px-2 py-0.5 rounded-md text-slate-950 font-bold text-[10px] sm:text-[11px] max-w-full truncate shadow-sm"
                  style={{ backgroundColor: category.color || '#3b82f6' }}
                  title={`${category.name}${subcategory ? ` / ${subcategory.name}` : ''}`}
                >
                  {category.name}
                </div>
              ) : (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                  Genel
                </span>
              )}

              {/* Necessity Under Category */}
              <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border bg-slate-900/60 ${styleInfo.text} border-current/30 truncate max-w-full`}>
                {styleInfo.label}
              </span>
            </div>

            {/* 2. MIDDLE: Title, Description, Account & Subcategory */}
            <div className="flex-1 min-w-0 space-y-0.5 px-1">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <h4 className="font-semibold text-slate-100 text-xs sm:text-sm truncate">
                  {expense.title || 'Başlıksız Harcama'}
                </h4>
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

              {expense.description && (
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  {expense.description}
                </p>
              )}
            </div>

            {/* 3. RIGHT: Amount & Underneath Payment Details */}
            <div className="flex flex-col items-end flex-shrink-0 text-right">
              <span className="text-xs sm:text-sm font-extrabold text-slate-100">
                {formatCurrency(expense.amount)}
              </span>

              {/* Payment Type, Installment Progress, and Total Amount Below Price */}
              <div className="mt-0.5 flex flex-col items-end">
                {expense.paymentType === 'taksitli' ? (
                  <>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {expense.installmentNumber ? `${expense.installmentNumber}. / ${expense.installmentCount} Taksit` : `${expense.installmentCount} Taksit`}
                    </span>
                    {expense.totalAmount && (
                      <span className="text-[9px] text-slate-400 font-medium mt-0.2">
                        (Top: {formatCurrency(expense.totalAmount)})
                      </span>
                    )}
                  </>
                ) : expense.paymentType === 'tekrarlayan' ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {expense.isUnlimitedRecurrence ? 'Sürekli Tekrar' : `${expense.installmentNumber || 1}. Tekrar`}
                  </span>
                ) : (
                  <span className="text-[9px] font-medium text-teal-400 opacity-90">
                    Peşin
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Row: Tags extending full width, horizontally scrollable */}
          {expense.tags && expense.tags.length > 0 && (
            <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-1 pt-1 border-t border-slate-800/40">
              {expense.tags.map(tag => (
                <span
                  key={tag}
                  className="text-[9px] px-2 py-0.2 rounded bg-slate-800/90 text-teal-300 border border-teal-500/20 whitespace-nowrap flex-shrink-0"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      
      {/* 1-ROW UNIFIED COMPACT BAR: Search + Month + Category Filter In Same Row */}
      <div className="glass-panel p-1.5 sm:p-2 rounded-xl flex items-center gap-1.5 sm:gap-2 w-full max-w-full overflow-hidden">
        
        {/* Search Input (Expands to fill available space, min-w-0 to prevent horizontal stretch) */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            placeholder="Ara..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-1.5 py-1.5 bg-slate-800/90 border border-slate-700/80 focus:border-emerald-500 rounded-lg text-xs text-slate-100 placeholder-slate-400 outline-none"
          />
          <Search className="w-3.5 h-3.5 absolute left-1.5 top-2 text-slate-400 pointer-events-none" />
        </div>

        {/* Month Dropdown Selector */}
        <div className="flex items-center space-x-1 bg-slate-800/90 border border-slate-700/80 px-1.5 py-1.5 rounded-lg shrink-0 max-w-[110px] sm:max-w-none">
          <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <select
            value={selectedMonthFilter}
            onChange={e => setSelectedMonthFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-emerald-400 outline-none cursor-pointer w-full truncate"
          >
            <option value="all" className="bg-slate-900 text-slate-200">Tümü</option>
            {availableMonths.map(m => (
              <option key={m} value={m} className="bg-slate-900 text-slate-200">
                {formatMonthName(m)}
              </option>
            ))}
          </select>
        </div>

        {/* Category Dropdown with Clean Filter Icon - Constrained width & truncate to prevent overflow */}
        <div className="flex items-center space-x-1 bg-slate-800/90 border border-slate-700/80 px-1.5 py-1.5 rounded-lg shrink-0 max-w-[90px] sm:max-w-[130px]">
          <Filter className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <select
            value={selectedCategoryFilter}
            onChange={e => setSelectedCategoryFilter(e.target.value)}
            className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer w-full truncate"
          >
            <option value="" className="bg-slate-900 text-slate-200">Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                {c.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Summary Cards - Specific to the Selected Month with interactive month switcher */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left Card: Shows specific month name (e.g. Ekim 2026 Harcaması or Tüm Dönemler), clickable to select month */}
        <div className="glass-card p-2 sm:p-2.5 rounded-xl border-l-2 sm:border-l-4 border-l-emerald-500 relative flex items-center justify-between group hover:border-emerald-400 transition-all">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1">
              <p className="text-[10px] text-slate-300 font-bold truncate">
                {selectedMonthFilter === 'all' ? 'Tüm Dönemler Harcaması' : `${formatMonthName(selectedMonthFilter)} Harcaması`}
              </p>
              <span className="text-[9px] text-emerald-400">▼</span>
            </div>
            <p className="text-xs sm:text-base font-black text-emerald-400 mt-0.5 truncate">
              {formatCurrency(currentMonthTotalSpent)}
            </p>
          </div>

          {/* Invisible overlay select allowing instant tap-to-change month */}
          <select
            value={selectedMonthFilter}
            onChange={e => setSelectedMonthFilter(e.target.value)}
            title="Dönem Değiştir"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
            <option value="all" className="bg-slate-900 text-slate-200">Tüm Dönemler</option>
            {availableMonths.map(m => (
              <option key={m} value={m} className="bg-slate-900 text-slate-200">
                {formatMonthName(m)}
              </option>
            ))}
          </select>
        </div>

        {/* Right Card: Transaction count for the selected period */}
        <div className="glass-card p-2 sm:p-2.5 rounded-xl border-l-2 sm:border-l-4 border-l-teal-500 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {selectedMonthFilter === 'all' ? 'Toplam İşlem' : `${formatMonthName(selectedMonthFilter)} İşlem`}
            </p>
            <p className="text-xs sm:text-base font-black text-slate-100 mt-0.5 truncate">
              {currentMonthTransactionsCount} Adet
            </p>
          </div>
          <span className="text-[10px] text-teal-400/80 font-medium hidden sm:inline shrink-0">
            {sortedDates.length} Aktif Gün
          </span>
        </div>
      </div>

      {/* Daily Timeline Journal (Past and Present Only) */}
      {sortedDates.length === 0 ? (
        <div className="glass-panel p-8 text-center rounded-xl space-y-2">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-xs sm:text-sm font-semibold text-slate-300">Bu dönemde kaydedilmiş harcama yok</h3>
          <p className="text-[11px] text-slate-500">Yeni bir masraf eklemek için sağ üstteki "Harcama Ekle" butonunu kullanın.</p>
        </div>
      ) : (
        <div id="today-journal-anchor" className="space-y-3">
          {sortedDates.map(dateKey => {
            const dayExpenses = groupedByDate[dateKey];
            const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
            const isToday = dateKey === todayStr;

            return (
              <div key={dateKey} className="space-y-1">
                
                {/* Day Header Banner */}
                <div
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs shadow-sm ${
                    isToday
                      ? 'bg-teal-950/40 border-teal-500/70 text-teal-300'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold">
                      {formatDateFormatted(dateKey)}
                    </span>
                    {isToday && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500 text-slate-950 font-black">
                        BUGÜN
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-medium">
                      {dayExpenses.length}
                    </span>
                  </div>
                  <div className="font-extrabold text-emerald-400">
                    {formatCurrency(dayTotal)}
                  </div>
                </div>

                {/* Day Expense Items */}
                <div className="space-y-1">
                  {dayExpenses.map(renderExpenseCard)}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Helpful Hint */}
      <div className="text-center py-1 text-[10px] text-slate-500">
        💡 İpucu: Düzenlemek veya silmek için harcama kartına <b>basılı tutun</b> (veya sağ tıklayın).
      </div>

    </div>
  );
};
