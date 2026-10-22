import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Check, CalendarDays } from 'lucide-react';

interface PeriodPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current value: 'all', 'YYYY', or 'YYYY-MM' */
  value: string;
  onChange: (value: string) => void;
  /** Optional theme color tint: 'teal', 'emerald', 'purple' */
  themeColor?: 'teal' | 'emerald' | 'purple';
  /** Available dates / months from expenses if we want to show active indicators */
  availableMonths?: string[];
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const PeriodPickerModal: React.FC<PeriodPickerModalProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  themeColor = 'teal',
  availableMonths = [],
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth(); // 0..11

  // Parse initial selected year and month
  const initialYear = value === 'all' 
    ? currentYear 
    : parseInt(value.substring(0, 4), 10) || currentYear;

  const [activeYear, setActiveYear] = useState<number>(initialYear);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (value !== 'all') {
        const y = parseInt(value.substring(0, 4), 10);
        if (y) setActiveYear(y);
      }
    }
  }, [isOpen, value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Check what is currently selected
  const isAllSelected = value === 'all';
  const isYearSelected = value === String(activeYear);
  const selectedYearMonth = value.length === 7 ? value : null;

  const handleSelectAll = () => {
    onChange('all');
    onClose();
  };

  const handleSelectFullYear = () => {
    onChange(String(activeYear));
    onClose();
  };

  const handleSelectMonth = (monthIdx: number) => {
    const ym = `${activeYear}-${String(monthIdx + 1).padStart(2, '0')}`;
    onChange(ym);
    onClose();
  };

  // Color theme classes
  const themeStyles = {
    teal: {
      accentText: 'text-teal-400',
      activeBg: 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20',
      outlineActive: 'border-teal-500 bg-teal-500/10 text-teal-300',
      badgeDot: 'bg-teal-400',
      headerGradient: 'from-teal-500/15 to-transparent',
    },
    emerald: {
      accentText: 'text-emerald-400',
      activeBg: 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20',
      outlineActive: 'border-emerald-500 bg-emerald-500/10 text-emerald-300',
      badgeDot: 'bg-emerald-400',
      headerGradient: 'from-emerald-500/15 to-transparent',
    },
    purple: {
      accentText: 'text-purple-400',
      activeBg: 'bg-purple-500 text-slate-950 font-bold shadow-md shadow-purple-500/20',
      outlineActive: 'border-purple-500 bg-purple-500/10 text-purple-300',
      badgeDot: 'bg-purple-400',
      headerGradient: 'from-purple-500/15 to-transparent',
    },
  }[themeColor];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className={`p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r ${themeStyles.headerGradient}`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-200">
              <Calendar className={`w-4 h-4 ${themeStyles.accentText}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Dönem Seçimi</h3>
              <p className="text-[11px] text-slate-400">Ay veya tüm yıl bazında filtreleyin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          
          {/* Quick Option: Tüm Dönemler */}
          <button
            type="button"
            onClick={handleSelectAll}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
              isAllSelected
                ? themeStyles.activeBg
                : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 opacity-80" />
              <span>Tüm Dönemler (Filtresiz)</span>
            </div>
            {isAllSelected && <Check className="w-4 h-4" />}
          </button>

          {/* Year Navigation Bar */}
          <div className="p-2 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveYear(y => y - 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title="Önceki Yıl"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSelectFullYear}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                isYearSelected
                  ? themeStyles.activeBg
                  : 'bg-slate-800 border-slate-700 text-white hover:border-teal-500/50'
              }`}
              title={`${activeYear} yılının tümünü seç`}
            >
              <span>{activeYear} Yılı (Tümü)</span>
              {isYearSelected && <span className="ml-1.5 text-[10px]">✓</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveYear(y => y + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title="Sonraki Yıl"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month Calendar Grid (3 x 4) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {activeYear} Ayları
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveYear(currentYear);
                  handleSelectMonth(currentMonthIdx);
                }}
                className={`text-[10px] font-bold ${themeStyles.accentText} hover:underline`}
              >
                Bu Ay'a Git
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {MONTH_NAMES.map((mName, idx) => {
                const ymKey = `${activeYear}-${String(idx + 1).padStart(2, '0')}`;
                const isSelected = selectedYearMonth === ymKey;
                const isCurrentMonth = activeYear === currentYear && idx === currentMonthIdx;
                const hasData = availableMonths.length === 0 || availableMonths.includes(ymKey);

                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => handleSelectMonth(idx)}
                    className={`relative py-2.5 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? themeStyles.activeBg
                        : isCurrentMonth
                        ? `bg-slate-800/90 border-slate-600 text-white font-bold ring-1 ring-slate-500`
                        : 'bg-slate-800/40 border-slate-800/90 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-semibold">{mName}</span>
                    
                    {/* Sub indicator badge for current month or recorded data */}
                    {isCurrentMonth && !isSelected && (
                      <span className={`text-[9px] font-bold ${themeStyles.accentText} mt-0.5`}>
                        Şimdi
                      </span>
                    )}

                    {hasData && !isSelected && !isCurrentMonth && (
                      <span className="w-1 h-1 rounded-full bg-slate-500 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Seçili: <strong className="text-slate-200">
            {value === 'all'
              ? 'Tüm Dönemler'
              : value.length === 4
              ? `${value} Yılı`
              : `${MONTH_NAMES[parseInt(value.split('-')[1], 10) - 1]} ${value.split('-')[0]}`}
          </strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
