// Bağlı Etiket (Üst/Alt etiket) yardımcı fonksiyonları
// tagParents: { altEtiket: [üstEtiket1, üstEtiket2, ...] } şeklinde çoklu eşleme tutar.
// Geriye dönük uyumluluk için tekil string değerleri de destekler ({ altEtiket: üstEtiket }).

export type TagParentsMap = Record<string, string[] | string>;

export type TagGroup =
  | { type: 'group'; parent: string; children: string[] }
  | { type: 'single'; tag: string };

export const normalizeTag = (t: string): string =>
  (t || '').trim().toLowerCase().replace(/^#/, '');

/** Bir etiketin bağlı olduğu tüm üst etiketleri dizi olarak döndürür. */
export const getParentTags = (tag: string, tagParents: TagParentsMap): string[] => {
  const norm = normalizeTag(tag);
  const val = tagParents[norm];
  if (!val) return [];
  if (Array.isArray(val)) {
    return Array.from(new Set(val.map(normalizeTag).filter(Boolean)));
  }
  if (typeof val === 'string' && val.trim()) {
    return [normalizeTag(val)];
  }
  return [];
};

/** Bir etiketin ilk bağlı olduğu üst etiketi döndürür (yoksa undefined). */
export const getParentTag = (tag: string, tagParents: TagParentsMap): string | undefined => {
  const parents = getParentTags(tag, tagParents);
  return parents.length > 0 ? parents[0] : undefined;
};

/** Belirli bir üst etiketin tüm alt etiketlerini döndürür. */
export const getChildTags = (parent: string, tagParents: TagParentsMap): string[] => {
  const p = normalizeTag(parent);
  if (!p) return [];
  const children: string[] = [];
  Object.entries(tagParents).forEach(([child, pars]) => {
    const parentList = Array.isArray(pars)
      ? pars.map(normalizeTag)
      : typeof pars === 'string' && pars.trim()
      ? [normalizeTag(pars)]
      : [];
    if (parentList.includes(p)) {
      children.push(normalizeTag(child));
    }
  });
  return Array.from(new Set(children)).sort();
};

/** Bir etiketin herhangi bir alt etiketi olup olmadığını kontrol eder. */
export const isParentTag = (tag: string, tagParents: TagParentsMap): boolean => {
  return getChildTags(tag, tagParents).length > 0;
};

/**
 * Etiket listesine, içindeki alt etiketlerin tüm üst etiketlerini otomatik ekler.
 */
export const withParentTags = (tags: string[], tagParents: TagParentsMap): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const t = normalizeTag(raw);
    if (!t) continue;
    const parents = getParentTags(t, tagParents);
    for (const parent of parents) {
      if (parent && !seen.has(parent)) {
        seen.add(parent);
        result.push(parent);
      }
    }
    if (!seen.has(t)) {
      seen.add(t);
      result.push(t);
    }
  }
  return result;
};

/**
 * Etiketleri görüntüleme için gruplar:
 *  ['sağlıksız', 'sigara', 'alkol', 'kahve'] => [ {group: sağlıksız: [sigara, alkol]}, {single: kahve} ]
 */
export const groupTagsForDisplay = (tags: string[], tagParents: TagParentsMap): TagGroup[] => {
  const normalized = Array.from(new Set((tags || []).map(normalizeTag).filter(Boolean)));
  const groups = new Map<string, string[]>();
  const order: string[] = [];
  const groupedChildren = new Set<string>();

  normalized.forEach(t => {
    const parents = getParentTags(t, tagParents);
    const matchedParents = parents.filter(p => normalized.includes(p));
    const targetParents = matchedParents.length > 0 ? matchedParents : (parents.length > 0 ? [parents[0]] : []);

    targetParents.forEach(parent => {
      if (!groups.has(parent)) {
        groups.set(parent, []);
        order.push(`g:${parent}`);
      }
      if (!groups.get(parent)!.includes(t)) {
        groups.get(parent)!.push(t);
      }
      groupedChildren.add(t);
    });
  });

  normalized.forEach(t => {
    if (groupedChildren.has(t)) return;
    if (groups.has(t)) return;
    order.push(`s:${t}`);
  });

  return order.map(key => {
    if (key.startsWith('g:')) {
      const parent = key.slice(2);
      return { type: 'group', parent, children: groups.get(parent)! } as TagGroup;
    }
    return { type: 'single', tag: key.slice(2) } as TagGroup;
  });
};

/** Metin formatı: "sağlıksız: sigara, alkol | kahve" (Excel vb. için) */
export const formatTagsAsText = (tags: string[], tagParents: TagParentsMap): string => {
  const groups = groupTagsForDisplay(tags, tagParents);
  if (groups.length === 0) return '-';
  return groups
    .map(g => (g.type === 'group' ? `${g.parent}: ${g.children.join(', ')}` : g.tag))
    .join(' | ');
};

export interface TagTreePreviewItem {
  parent: string;
  children: string[];
}

/**
 * Bir etiketin dahil olduğu tüm ağaç gruplarını döndürür.
 * Örn: Elektrik için Faturalar -> [Elektrik, Su, internet] ve Ev -> [elektrik, kira, mutfak]
 */
export const getTagTreePreviews = (tag: string, tagParents: TagParentsMap): TagTreePreviewItem[] => {
  const t = normalizeTag(tag);
  if (!t) return [];
  const parents = getParentTags(t, tagParents);
  const previews: TagTreePreviewItem[] = [];

  parents.forEach(p => {
    const children = getChildTags(p, tagParents);
    // Make sure the examined tag is present in children
    const allKids = Array.from(new Set([...children, t])).sort();
    previews.push({
      parent: p,
      children: allKids,
    });
  });

  return previews;
};
