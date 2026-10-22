import React from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { groupTagsForDisplay } from '../utils/tagHierarchy';

interface TagChipsProps {
  tags: string[];
  size?: 'xs' | 'sm';
  /** Verilirse her etiketin yanında kaldırma (×) butonu çıkar */
  onRemove?: (tag: string) => void;
  /** Grup başlığındaki × tıklanınca (üst etiket + tüm alt etiketleri kaldırmak için) */
  onRemoveGroup?: (parent: string, children: string[]) => void;
  className?: string;
}

/**
 * Etiketleri bağlı etiket mantığına göre gruplayarak gösterir:
 *   [Sağlıksız: #sigara #alkol]  #kahve
 */
export const TagChips: React.FC<TagChipsProps> = ({ tags, size = 'xs', onRemove, onRemoveGroup, className = '' }) => {
  const { tagParents } = useExpenses();
  const groups = groupTagsForDisplay(tags || [], tagParents);
  if (groups.length === 0) return null;

  const textSize = size === 'xs' ? 'text-[9px]' : 'text-[11px]';
  const pad = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2 py-0.5';

  const removeBtn = (onClick: () => void, title: string) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="ml-0.5 text-slate-400 hover:text-rose-400 transition-colors leading-none"
      title={title}
    >
      &times;
    </button>
  );

  return (
    <>
      {groups.map(g => {
        if (g.type === 'single') {
          return (
            <span
              key={`s-${g.tag}`}
              className={`${textSize} ${pad} inline-flex items-center rounded-md bg-slate-800/90 text-teal-300 border border-teal-500/20 whitespace-nowrap flex-shrink-0 ${className}`}
            >
              #{g.tag}
              {onRemove && removeBtn(() => onRemove(g.tag), 'Etiketi kaldır')}
            </span>
          );
        }
        return (
          <span
            key={`g-${g.parent}`}
            className={`${textSize} inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-violet-500/15 to-teal-500/10 border border-violet-500/30 whitespace-nowrap flex-shrink-0 overflow-hidden ${className}`}
            title={`Bağlı etiket: ${g.parent} → ${g.children.join(', ')}`}
          >
            <span className={`${pad} bg-violet-500/25 text-violet-200 font-bold capitalize inline-flex items-center`}>
              {g.parent}:
              {onRemoveGroup && removeBtn(() => onRemoveGroup(g.parent, g.children), 'Grubu kaldır')}
            </span>
            <span className="inline-flex items-center gap-1 pr-1.5">
              {g.children.map((c, idx) => (
                <span key={c} className="text-teal-300 inline-flex items-center">
                  {c}
                  {onRemove && removeBtn(() => onRemove(c), 'Etiketi kaldır')}
                  {idx < g.children.length - 1 && <span className="text-slate-500">,</span>}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </>
  );
};
