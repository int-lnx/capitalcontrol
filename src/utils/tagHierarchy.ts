// Bağlı Etiket (Üst/Alt etiket) yardımcı fonksiyonları
// tagParents: { altEtiket: üstEtiket } şeklinde tek seviyeli bir eşleme tutar.
// Örn: { sigara: 'sağlıksız', alkol: 'sağlıksız', ilaç: 'sağlık' }

export type TagParentsMap = Record<string, string>;

export type TagGroup =
  | { type: 'group'; parent: string; children: string[] }
  | { type: 'single'; tag: string };

export const normalizeTag = (t: string): string =>
  (t || '').trim().toLowerCase().replace(/^#/, '');

/** Bir etiketin bağlı olduğu üst etiketi döndürür (yoksa undefined). */
export const getParentTag = (tag: string, tagParents: TagParentsMap): string | undefined =>
  tagParents[normalizeTag(tag)];

/** Belirli bir üst etiketin tüm alt etiketlerini döndürür. */
export const getChildTags = (parent: string, tagParents: TagParentsMap): string[] => {
  const p = normalizeTag(parent);
  return Object.entries(tagParents)
    .filter(([, par]) => par === p)
    .map(([child]) => child)
    .sort();
};

/** Bir etiketin üst etiket olup olmadığını kontrol eder. */
export const isParentTag = (tag: string, tagParents: TagParentsMap): boolean => {
  const t = normalizeTag(tag);
  return Object.values(tagParents).includes(t);
};

/**
 * Etiket listesine, içindeki alt etiketlerin üst etiketlerini otomatik ekler.
 * Üst etiket, ilk alt etiketinin hemen önüne yerleştirilir.
 */
export const withParentTags = (tags: string[], tagParents: TagParentsMap): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const t = normalizeTag(raw);
    if (!t) continue;
    const parent = tagParents[t];
    if (parent && !seen.has(parent)) {
      seen.add(parent);
      result.push(parent);
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
 * Alt etiketi olmayan üst etiketler tek başına gösterilir.
 */
export const groupTagsForDisplay = (tags: string[], tagParents: TagParentsMap): TagGroup[] => {
  const normalized = Array.from(new Set((tags || []).map(normalizeTag).filter(Boolean)));
  const groups = new Map<string, string[]>();
  const order: string[] = []; // sıralamayı korumak için anahtarlar ('g:parent' / 's:tag')

  normalized.forEach(t => {
    const parent = tagParents[t];
    if (parent) {
      if (!groups.has(parent)) {
        groups.set(parent, []);
        order.push(`g:${parent}`);
      }
      groups.get(parent)!.push(t);
    }
  });

  normalized.forEach(t => {
    if (tagParents[t]) return; // alt etiket, grup içinde
    if (groups.has(t)) {
      // Üst etiket zaten grubun başlığı olarak gösteriliyor; sırayı bu etiketin konumuna çek
      return;
    }
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
