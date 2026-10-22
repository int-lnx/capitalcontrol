import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency, formatDateFormatted, getTodayString } from '../utils/formatters';
import {
  Search,
  Calendar,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
} from 'lucide-react';
import { PeriodPickerModal } from './PeriodPickerModal';
import { TagChips } from './TagChips';

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
  const { expenses, categories, accounts, limits, setEditingExpense, approveExpense, deleteExpense } = useExpenses();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  
  // Selection state for log entries
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());

  // Günü gelip onay bekleyen taksitli veya tekrarlı harcamalar
  const todayStr = getTodayString();
  const pendingApprovalExpenses = expenses.filter(
    exp => exp.askApproval && (exp.pendingApproval || (exp.status === 'pending' && exp.date <= todayStr))
  ).sort((a, b) => a.date.localeCompare(b.date));

  // Ref to track long-press timer and state
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = React.useRef(false);

  // Month filter in YYYY-MM format, default to current month
  const todayDate = new Date();
  const currentMonthKey = todayDate.toISOString().substring(0, 7);
  
  // Calculate next month (en yakın bir sonraki ay)
  const nextMonthDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(currentMonthKey);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState<boolean>(false);

  // Unique YYYY-MM months available including next month and current month
  const availableMonths = Array.from(
    new Set(expenses.map(e => e.date.substring(0, 7)))
  );
  if (!availableMonths.includes(currentMonthKey)) {
    availableMonths.push(currentMonthKey);
  }
  if (!availableMonths.includes(nextMonthKey)) {
    availableMonths.push(nextMonthKey);
  }
  // Sort from nearest upcoming/current month to older months (descending order)
  availableMonths.sort((a, b) => b.localeCompare(a));

  // EXPENSES: If future month is explicitly chosen, show that month's entries; otherwise limit to today
  const activePeriodExpenses = expenses.filter(exp => {
    if (selectedMonthFilter !== 'all' && selectedMonthFilter.length === 7 && selectedMonthFilter > currentMonthKey) {
      return exp.date.startsWith(selectedMonthFilter);
    }
    return exp.date <= todayStr;
  });

  // Filtered expenses list based on search, category, and month/year
  const filteredExpenses = activePeriodExpenses.filter(exp => {
    const matchesSearch =
      (exp.title && exp.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      exp.amount.toString().includes(searchTerm);

    const matchesCategory = selectedCategoryFilter ? exp.categoryId === selectedCategoryFilter : true;
    const matchesMonth = selectedMonthFilter !== 'all' ? exp.date.startsWith(selectedMonthFilter) : true;

    return matchesSearch && matchesCategory && matchesMonth;
  });

  // Dynamic calculations:
  // 1. Total of currently displayed (filtered) expenses
  const displayedTotalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const displayedCount = filteredExpenses.length;

  // 2. Total of selected expenses (among all expenses or filtered)
  const selectedExpenses = filteredExpenses.filter(e => selectedExpenseIds.has(e.id));
  const selectedTotalSpent = selectedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const isSelectionActive = selectedExpenseIds.size > 0;

  // Toggle selection for an expense
  const toggleExpenseSelection = (id: string) => {
    setSelectedExpenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedExpenseIds(new Set());
  };

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
    if (yearMonth.length === 4) return `${yearMonth} Yılı`;
    const [year, month] = yearMonth.split('-');
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    return `${monthNames[monthIdx] || month} ${year}`;
  };

  // Long press event handlers for touch and mouse
  const handlePointerDown = (expenseId: string) => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      toggleExpenseSelection(expenseId);
      // Optional subtle vibration feedback if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch (_) {}
      }
    }, 450); // 450ms long press threshold
  };

  const handlePointerUpOrLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCardClick = (expense: (typeof expenses)[0]) => {
    // If long press just triggered, ignore click event
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }

    // If selection mode is active, clicking toggles selection instead of opening editor
    if (selectedExpenseIds.size > 0) {
      toggleExpenseSelection(expense.id);
      return;
    }

    // Otherwise standard behavior: open edit modal
    setEditingExpense(expense);
  };

  const renderExpenseCard = (expense: (typeof expenses)[0]) => {
    const category = categories.find(c => c.id === expense.categoryId);
    const subcategory = category?.subcategories.find(s => s.id === expense.subcategoryId);
    const account = accounts.find(a => a.id === expense.accountId);
    const limit = limits.find(l => l.id === expense.limitId);
    const rawLvl = (expense.necessity || 'Tanımsız') as string;
    const styleInfo = NECESSITY_BORDER_STYLES[rawLvl] || NECESSITY_BORDER_STYLES['Tanımsız'];

    const isSelected = selectedExpenseIds.has(expense.id);

    return (
      <div key={expense.id} className="relative group select-none">
        {/* Card Container - Basılı tutunca seçilir, seçim modunda tıkla seç/bırak, normalde tıkla düzenle */}
        <div
          onPointerDown={() => handlePointerDown(expense.id)}
          onPointerUp={handlePointerUpOrLeave}
          onPointerCancel={handlePointerUpOrLeave}
          onPointerLeave={handlePointerUpOrLeave}
          onClick={() => handleCardClick(expense)}
          className={`p-2 sm:p-2.5 rounded-xl border transition-all ${
            isSelected
              ? 'border-2 border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-950/40'
              : `${styleInfo.border} ${styleInfo.bg} hover:border-teal-500/60 hover:shadow-lg hover:shadow-teal-950/20`
          } active:scale-[0.99] backdrop-blur-sm flex flex-col gap-1.5 relative cursor-pointer`}
          title={isSelectionActive ? 'Seçimi aç/kapat' : 'Düzenlemek için tıkla, seçmek için basılı tut'}
        >
          {/* Selected check indicator badge */}
          {isSelected && (
            <div className="absolute -top-1.5 -right-1.5 z-20 bg-emerald-500 text-slate-950 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs shadow-md border border-slate-900 animate-in zoom-in-75 duration-150">
              ✓
            </div>
          )}
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
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/80">
                  Kategori Dışı
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
                {expense.splitBatchId && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {expense.splitTitle || (expense.splitOriginalTotal ? `Ayrım (${formatCurrency(expense.splitOriginalTotal)})` : 'Ayrım')}
                  </span>
                )}
                {subcategory && (
                  <span className="text-[9px] text-slate-400 font-medium hidden sm:inline">
                    ({subcategory.name})
                  </span>
                )}
                {account ? (
                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {account.name}
                  </span>
                ) : (
                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/70">
                    Hesap Dışı
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
                {expense.askApproval && (expense.pendingApproval || (expense.status === 'pending' && expense.date <= todayStr)) && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 mt-0.5 animate-pulse">
                    Onay Bekliyor
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Row: Tags extending full width, horizontally scrollable */}
          {expense.tags && expense.tags.length > 0 && (
            <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-1 pt-1 border-t border-slate-800/40">
              <TagChips tags={expense.tags} size="xs" />
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

        {/* Period Picker Trigger Button */}
        <button
          type="button"
          onClick={() => setIsPeriodModalOpen(true)}
          className="flex items-center space-x-1.5 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/80 px-2 py-1.5 rounded-lg shrink-0 max-w-[130px] sm:max-w-none transition-colors"
          title="Dönem Seçimi Yap"
        >
          <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-emerald-400 truncate">
            {formatMonthName(selectedMonthFilter)}
          </span>
        </button>

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

      {/* Summary Cards - Dynamically reflects either displayed results (filter/search) or selected logs */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left Card: Shows either Selected Logs total or Displayed (Filtered) total */}
        <div className={`glass-card p-2 sm:p-2.5 rounded-xl border-l-2 sm:border-l-4 transition-all relative flex items-center justify-between ${
          isSelectionActive 
            ? 'border-l-emerald-400 bg-emerald-950/30 border border-emerald-500/40 ring-1 ring-emerald-500/30' 
            : 'border-l-emerald-500'
        }`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between pr-1">
              <p className="text-[10px] text-slate-300 font-bold truncate">
                {isSelectionActive
                  ? `Seçili Toplam (${selectedExpenseIds.size})`
                  : (selectedMonthFilter === 'all'
                      ? (searchTerm || selectedCategoryFilter ? 'Filtrelenen Toplam' : 'Tüm Dönemler')
                      : `${formatMonthName(selectedMonthFilter)} Toplamı`)}
              </p>
              {isSelectionActive && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelection();
                  }}
                  className="text-[9px] text-emerald-300 hover:text-emerald-100 underline ml-1 cursor-pointer shrink-0"
                  title="Seçimleri Temizle"
                >
                  Temizle
                </button>
              )}
            </div>
            <p className="text-xs sm:text-base font-black text-emerald-400 mt-0.5 truncate">
              {formatCurrency(isSelectionActive ? selectedTotalSpent : displayedTotalSpent)}
            </p>
          </div>
        </div>

        {/* Right Card: Transaction count for the displayed / selected records */}
        <div className="glass-card p-2 sm:p-2.5 rounded-xl border-l-2 sm:border-l-4 border-l-teal-500 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {isSelectionActive 
                ? 'Seçili Adet' 
                : (selectedMonthFilter === 'all' ? 'Gösterilen İşlem' : `${formatMonthName(selectedMonthFilter)} İşlem`)}
            </p>
            <p className="text-xs sm:text-base font-black text-slate-100 mt-0.5 truncate">
              {isSelectionActive ? `${selectedExpenseIds.size} Adet` : `${displayedCount} Adet`}
            </p>
          </div>
          <span className="text-[10px] text-teal-400/80 font-medium hidden sm:inline shrink-0">
            {sortedDates.length} Aktif Gün
          </span>
        </div>
      </div>

      {/* Onay Bekleyen Günü Gelmiş Harcamalar Paneli (Önce onay sorulan taksitli / tekrarlı harcamalar) */}
      {pendingApprovalExpenses.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 shadow-xl space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-amber-300">
                  Günü Gelen Harcama Onayları ({pendingApprovalExpenses.length})
                </h3>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Bu harcamanın günü geldi. Hesaba yansımadan önce onaylayabilir veya düzenleyebilirsiniz.
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              Onay Bekliyor
            </span>
          </div>

          <div className="space-y-2">
            {pendingApprovalExpenses.map(item => {
              const category = categories.find(c => c.id === item.categoryId);
              const subcategory = category?.subcategories.find(s => s.id === item.subcategoryId);
              const account = accounts.find(a => a.id === item.accountId);

              return (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-md"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-100">
                        {item.title || 'Başlıksız Harcama'}
                      </span>
                      {category && (
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-950"
                          style={{ backgroundColor: category.color || '#3b82f6' }}
                        >
                          {category.name}
                        </span>
                      )}
                      {subcategory && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({subcategory.name})
                        </span>
                      )}
                      {account && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {account.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                      <span>Vade Tarihi: <b className="text-amber-300">{formatDateFormatted(item.date)}</b></span>
                      <span>•</span>
                      <span>
                        {item.paymentType === 'taksitli'
                          ? (item.installmentNumber ? `${item.installmentNumber}. / ${item.installmentCount} Taksit` : `${item.installmentCount} Taksit`)
                          : `${item.installmentNumber || 1}. Tekrar`}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">{item.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="text-left sm:text-right mr-1">
                      <span className="text-xs sm:text-sm font-extrabold text-amber-400 block">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        {item.totalAmount ? `Top: ${formatCurrency(item.totalAmount)}` : 'Harcama'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {/* Düzenle Butonu - Bireysel harcama olarak modal açılır, yapılan değişiklik sadece bu kaydı etkiler */}
                      <button
                        type="button"
                        onClick={() => setEditingExpense(item)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1 transition-all"
                        title="Bu harcamayı düzenle (Sadece bu logu etkiler)"
                      >
                        <Edit className="w-3 h-3 text-teal-400" />
                        <span className="hidden xs:inline">Değiştir</span>
                      </button>

                      {/* Onayla Butonu - Doğrudan bireysele döner, hesaba yansır */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`"${item.title || 'Harcama'}" (${formatCurrency(item.amount)}) onaylanıp hesaba yansıtılsın mı?\n\nBu harcama bağımsız bireysel kayda dönüşecektir.`)) {
                            approveExpense(item.id);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center space-x-1 shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        title="Harcamayı onayla ve hesaba yansıt"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Onayla</span>
                      </button>

                      {/* Sil / İptal Et */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Bu günü gelmiş harcamayı silmek/iptal etmek istiyor musunuz?')) {
                            deleteExpense(item.id);
                          }
                        }}
                        className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        title="Bu harcamayı sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Period Picker Modal */}
      <PeriodPickerModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        value={selectedMonthFilter}
        onChange={setSelectedMonthFilter}
        themeColor="emerald"
        availableMonths={availableMonths}
      />

    </div>
  );
};
