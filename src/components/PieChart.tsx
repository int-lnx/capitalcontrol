import React, { useState } from 'react';

export interface PieSubItem {
  id?: string;
  label: string;
  value: number;
}

export interface PieChartItem {
  label: string;
  value: number;
  color?: string;
  id?: string;
  subItems?: PieSubItem[];
}

interface PieSlice {
  label: string;
  value: number;
  color: string;
  percentage: number;
  subLabel?: string;
  id?: string;
  subItems?: PieSubItem[];
}

interface PieChartProps {
  data: PieChartItem[];
  title?: string;
  onSliceClick?: (label: string, id?: string) => void;
  selectedLabel?: string;
  customTotal?: number; // Optional override for the true base total
}

const DEFAULT_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#ef4444', '#14b8a6', '#6366f1', '#84cc16'
];

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  onSliceClick,
  selectedLabel,
  customTotal,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = customTotal !== undefined ? customTotal : data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0 || data.length === 0) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
        {title && <h3 className="text-sm font-semibold text-slate-300 mb-2">{title}</h3>}
        Grafik için gösterilecek harcama verisi bulunamadı.
      </div>
    );
  }

  // Calculate slices with angles
  let cumulativeAngle = 0;
  const slices: (PieSlice & { startAngle: number; endAngle: number })[] = data
    .filter(d => d.value > 0)
    .map((item, index) => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = cumulativeAngle;
      cumulativeAngle += angle;
      return {
        label: item.label,
        value: item.value,
        color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        percentage,
        startAngle,
        endAngle: cumulativeAngle,
        id: item.id,
        subItems: item.subItems,
      };
    });

  // SVG coordinate helpers (center 100, 100, radius 80)
  const cx = 100;
  const cy = 100;
  const radius = 75;
  const innerRadius = 45; // Donut style

  const getCoordinates = (angleInDegrees: number, r: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const createDonutSlice = (startAngle: number, endAngle: number) => {
    // Handling full 360 circle
    const isFullCircle = endAngle - startAngle >= 359.99;
    const effectiveEndAngle = isFullCircle ? startAngle + 359.99 : endAngle;

    const startOuter = getCoordinates(startAngle, radius);
    const endOuter = getCoordinates(effectiveEndAngle, radius);
    const startInner = getCoordinates(effectiveEndAngle, innerRadius);
    const endInner = getCoordinates(startAngle, innerRadius);

    const largeArcFlag = effectiveEndAngle - startAngle <= 180 ? 0 : 1;

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
      'Z',
    ].join(' ');
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
      
      {/* SVG Donut */}
      <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-0 drop-shadow-lg">
          {slices.map((slice, i) => {
            const isHovered = hoveredIndex === i;
            const isSelected = selectedLabel === slice.label;
            return (
              <path
                key={slice.label + i}
                d={createDonutSlice(slice.startAngle, slice.endAngle)}
                fill={slice.color}
                className="transition-all duration-200 cursor-pointer"
                opacity={selectedLabel ? (isSelected ? 1 : 0.35) : isHovered ? 0.9 : 0.85}
                stroke="#090d16"
                strokeWidth={isSelected || isHovered ? "3" : "1.5"}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSliceClick && onSliceClick(slice.label, slice.id)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Toplam</span>
          <span className="text-xs font-black text-white">
            {total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
          </span>
        </div>
      </div>

      {/* Legend & Percentages List */}
      <div className="flex-1 w-full space-y-2 max-h-64 overflow-y-auto pr-1">
        {title && <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">{title}</h3>}
        {slices.map((slice, i) => {
          const isSelected = selectedLabel === slice.label;
          const hasSubItems = slice.subItems && slice.subItems.length > 0;

          return (
            <div key={slice.label + i} className="space-y-1">
              <button
                type="button"
                onClick={() => onSliceClick && onSliceClick(slice.label, slice.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border text-left text-xs transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-teal-500 shadow-sm shadow-teal-500/10'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="font-medium text-slate-200 truncate">{slice.label}</span>
                </div>
                <div className="flex items-center space-x-3 ml-2 flex-shrink-0">
                  <span className="text-slate-400 font-semibold text-[11px]">
                    %{slice.percentage.toFixed(1)}
                  </span>
                  <span className="font-bold text-slate-100">
                    {slice.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                  </span>
                </div>
              </button>

              {/* Sub-items (Alt Kategoriler / Detaylar) */}
              {hasSubItems && (
                <div className="ml-5 pl-2.5 border-l-2 border-slate-800/80 space-y-1 py-0.5">
                  {slice.subItems!.map((sub, subIdx) => {
                    const subPercent = slice.value > 0 ? (sub.value / slice.value) * 100 : 0;
                    return (
                      <div
                        key={sub.id || sub.label + subIdx}
                        className="flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 py-0.5 px-1.5 rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span className="text-slate-600 font-mono text-[10px]">•</span>
                          <span className="truncate text-slate-300 font-medium">{sub.label}</span>
                        </div>
                        <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                          <span className="text-[10px] text-slate-500">
                            %{subPercent.toFixed(0)}
                          </span>
                          <span className="font-semibold text-slate-300">
                            {sub.value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
