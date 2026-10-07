import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency, formatCurrencyCompact, formatDateFormatted } from '../utils/formatters';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { expenses, categories, accounts } = useExpenses();

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Number of days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Day of week of first day (Monday = 0 ... Sunday = 6)
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

  // Group current month expenses by YYYY-MM-DD
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthExpenses = expenses.filter(e => e.date.startsWith(monthPrefix));
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const expensesByDate = monthExpenses.reduce<{ [dayStr: string]: typeof expenses }>((acc, exp) => {
    if (!acc[exp.date]) acc[exp.date] = [];
    acc[exp.date].push(exp);
    return acc;
  }, {});

  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const selectedExpenses = selectedDayStr ? expenses.filter(e => e.date === selectedDayStr) : [];
  const selectedDayTotal = selectedExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4">
      
      {/* Month Navigator Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{monthNames[month]} {year}</span>
              <button
                onClick={goToToday}
                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-400 border border-teal-500/30 hover:bg-slate-700"
              >
                Bugün
              </button>
            </h2>
            <p className="text-xs text-slate-400">
              Bu ay toplam: <span className="text-emerald-400 font-bold">{formatCurrency(monthTotal)}</span> ({monthExpenses.length} Harcama)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-panel p-3 sm:p-5 rounded-2xl border border-slate-800">
        
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-slate-400">
          {weekDays.map(d => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-16 sm:h-24 rounded-xl bg-slate-900/30 border border-transparent opacity-30" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayExpList = expensesByDate[dayStr] || [];
            const dayTotal = dayExpList.reduce((sum, e) => sum + e.amount, 0);
            const isToday = dayStr === new Date().toISOString().substring(0, 10);
            const isSelected = selectedDayStr === dayStr;

            return (
              <button
                key={dayStr}
                onClick={() => setSelectedDayStr(dayStr === selectedDayStr ? null : dayStr)}
                className={`h-16 sm:h-24 p-1 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${
                  isSelected
                    ? 'bg-teal-950/40 border-teal-500 shadow-md shadow-teal-500/20'
                    : isToday
                    ? 'bg-slate-800/90 border-emerald-500/60'
                    : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-bold ${isToday ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {dayNum}
                  </span>
                  {dayExpList.length > 0 && (
                    <span className="text-[9px] font-bold px-1 rounded-full bg-slate-800 text-slate-400 hidden sm:inline">
                      {dayExpList.length}
                    </span>
                  )}
                </div>

                {dayTotal > 0 ? (
                  <div className="mt-auto">
                    <div className="text-[10px] sm:text-xs font-black text-emerald-400 truncate">
                      {formatCurrencyCompact(dayTotal)}
                    </div>
                    {/* Dots for categories */}
                    <div className="flex gap-0.5 mt-0.5 overflow-hidden">
                      {dayExpList.slice(0, 4).map((exp, i) => {
                        const cat = categories.find(c => c.id === exp.categoryId);
                        return (
                          <div
                            key={exp.id + i}
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat?.color || '#3b82f6' }}
                          />
                        );
                      })}
                      {dayExpList.length > 4 && (
                        <span className="text-[8px] text-slate-400 leading-none">+</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-[9px] text-slate-700 hidden sm:block">-</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Panel */}
      {selectedDayStr && (
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-teal-500/40 bg-slate-900/90 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                {formatDateFormatted(selectedDayStr)} Harcamaları
              </h3>
              <p className="text-xs text-slate-400">{selectedExpenses.length} Harcama Kaydı</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Günlük Toplam</span>
              <span className="text-base font-extrabold text-emerald-400">{formatCurrency(selectedDayTotal)}</span>
            </div>
          </div>

          {selectedExpenses.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">Bu tarihte yapılmış herhangi bir harcama yok.</p>
          ) : (
            <div className="space-y-2">
              {selectedExpenses.map(exp => {
                const category = categories.find(c => c.id === exp.categoryId);
                const account = accounts.find(a => a.id === exp.accountId);
                return (
                  <div
                    key={exp.id}
                    className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category?.color || '#3b82f6' }}
                      />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-100 truncate">{exp.title || 'Harcama'}</h4>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                          <span>{category?.name || 'Genel'}</span>
                          {account && <span>• {account.name}</span>}
                          {exp.necessity && (
                            <span className="px-1 py-0.2 rounded bg-slate-700 text-teal-300">
                              {exp.necessity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-400 ml-2 flex-shrink-0">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
