import type { Expense, ExpenseLimit, LimitHistoryRecord } from '../types';

/**
 * Belirtilen yıl ve ayın son gününü aşmayacak şekilde güvenli YYYY-MM-DD tarihi üretir.
 */
function toClampedDateStr(year: number, month1Indexed: number, desiredDay: number): string {
  const daysInTargetMonth = new Date(year, month1Indexed, 0).getDate();
  const safeDay = Math.min(desiredDay, daysInTargetMonth);
  return `${year}-${String(month1Indexed).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

export interface LimitPeriodInfo {
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextResetDate?: string;
  previousPeriodStart?: string;
  previousPeriodEnd?: string;
}

/**
 * Limit ayarlarına göre mevcut dönemin başlangıç, bitiş ve bir sonraki reset tarihlerini hesaplar.
 */
export function getCurrentLimitPeriod(limit: Partial<ExpenseLimit>, refDateStr?: string): LimitPeriodInfo {
  const todayStr = refDateStr || new Date().toISOString().split('T')[0];
  const freq = limit.resetFrequency || 'aylik';

  if (freq === 'yok') {
    return {
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
      nextResetDate: undefined,
    };
  }

  if (freq === 'haftalik') {
    const [y, m, d] = todayStr.split('-').map(Number);
    const ref = new Date(y, m - 1, d);
    const dayOfWeek = ref.getDay(); // 0: Paz, 1: Pzt, ...
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const mon = new Date(ref);
    mon.setDate(ref.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const nextMon = new Date(mon);
    nextMon.setDate(mon.getDate() + 7);

    const prevMon = new Date(mon);
    prevMon.setDate(mon.getDate() - 7);
    const prevSun = new Date(mon);
    prevSun.setDate(mon.getDate() - 1);

    const fmt = (dt: Date) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    return {
      currentPeriodStart: fmt(mon),
      currentPeriodEnd: fmt(sun),
      nextResetDate: fmt(nextMon),
      previousPeriodStart: fmt(prevMon),
      previousPeriodEnd: fmt(prevSun),
    };
  }

  if (freq === 'ozel') {
    const start = limit.startDate || limit.currentPeriodStart || todayStr;
    const next = limit.nextResetDate;
    let end: string | undefined = undefined;
    if (next) {
      const [ny, nm, nd] = next.split('-').map(Number);
      const prevDay = new Date(ny, nm - 1, nd - 1);
      end = `${prevDay.getFullYear()}-${String(prevDay.getMonth() + 1).padStart(2, '0')}-${String(prevDay.getDate()).padStart(2, '0')}`;
    }
    return {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      nextResetDate: next,
    };
  }

  // Varsayılan: Aylık periyot (Örn: her ayın 1'i veya her ayın 15'i maaş günü)
  const resetDay = Math.min(Math.max(limit.resetDay || 1, 1), 31);
  const [y, m, d] = todayStr.split('-').map(Number);

  if (d < resetDay) {
    // Bu ayın reset günü henüz gelmedi. Mevcut periyot önceki ayın reset gününde başladı.
    let prevYear = y;
    let prevMonth = m - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = y - 1;
    }

    const currentPeriodStart = toClampedDateStr(prevYear, prevMonth, resetDay);
    const nextResetDate = toClampedDateStr(y, m, resetDay);

    // Bitiş tarihi: nextResetDate'ten 1 gün önce
    const [nRy, nRm, nRd] = nextResetDate.split('-').map(Number);
    const endDateObj = new Date(nRy, nRm - 1, nRd - 1);
    const currentPeriodEnd = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

    // Önceki dönem
    let ppYear = prevYear;
    let ppMonth = prevMonth - 1;
    if (ppMonth < 1) {
      ppMonth = 12;
      ppYear = prevYear - 1;
    }
    const previousPeriodStart = toClampedDateStr(ppYear, ppMonth, resetDay);
    const [pRy, pRm, pRd] = currentPeriodStart.split('-').map(Number);
    const prevEndObj = new Date(pRy, pRm - 1, pRd - 1);
    const previousPeriodEnd = `${prevEndObj.getFullYear()}-${String(prevEndObj.getMonth() + 1).padStart(2, '0')}-${String(prevEndObj.getDate()).padStart(2, '0')}`;

    return {
      currentPeriodStart,
      currentPeriodEnd,
      nextResetDate,
      previousPeriodStart,
      previousPeriodEnd,
    };
  } else {
    // Bugün d >= resetDay. Mevcut periyot bu ayın reset gününde başladı.
    const currentPeriodStart = toClampedDateStr(y, m, resetDay);

    let nextMonth = m + 1;
    let nextYear = y;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = y + 1;
    }

    const nextResetDate = toClampedDateStr(nextYear, nextMonth, resetDay);

    // Bitiş tarihi: nextResetDate'ten 1 gün önce
    const [nRy, nRm, nRd] = nextResetDate.split('-').map(Number);
    const endDateObj = new Date(nRy, nRm - 1, nRd - 1);
    const currentPeriodEnd = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

    // Önceki dönem
    let prevYear = y;
    let prevMonth = m - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = y - 1;
    }
    const previousPeriodStart = toClampedDateStr(prevYear, prevMonth, resetDay);
    const [cRy, cRm, cRd] = currentPeriodStart.split('-').map(Number);
    const prevEndObj = new Date(cRy, cRm - 1, cRd - 1);
    const previousPeriodEnd = `${prevEndObj.getFullYear()}-${String(prevEndObj.getMonth() + 1).padStart(2, '0')}-${String(prevEndObj.getDate()).padStart(2, '0')}`;

    return {
      currentPeriodStart,
      currentPeriodEnd,
      nextResetDate,
      previousPeriodStart,
      previousPeriodEnd,
    };
  }
}

/**
 * Sonraki yenilenme tarihine kaç gün kaldığını hesaplar.
 */
export function getDaysUntilNextReset(nextResetDate?: string, todayStr?: string): { days: number; text: string } {
  if (!nextResetDate) {
    return { days: -1, text: 'Sürekli (Yenilenme Yok)' };
  }

  const today = todayStr || new Date().toISOString().split('T')[0];
  const [ty, tm, td] = today.split('-').map(Number);
  const [ry, rm, rd] = nextResetDate.split('-').map(Number);

  const tDate = new Date(ty, tm - 1, td);
  const rDate = new Date(ry, rm - 1, rd);

  const diffMs = rDate.getTime() - tDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { days: 0, text: 'Bugün yenileniyor' };
  }
  if (diffDays === 1) {
    return { days: 1, text: 'Yarın yenileniyor' };
  }
  return { days: diffDays, text: `${diffDays} gün kaldı` };
}

/**
 * Tarih aralığını formatlar (Örn: "01.10.2026 - 31.10.2026")
 */
export function formatPeriodRange(start?: string, end?: string): string {
  if (!start && !end) return 'Tüm Zamanlar';
  const fmt = (d: string) => {
    const [year, month, day] = d.split('-');
    return `${day}.${month}.${year}`;
  };
  if (start && end) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return `${fmt(start)} sonrası`;
  return `${fmt(end!)} öncesi`;
}

/**
 * Belirli bir limitin tüm geçmiş dönem kayıtlarını hesaplar ve birleştirir.
 * Hem arşivlenmiş kayıtları (limit.history) hem de geçmiş dönemlere ait harcamaları otomatik bulup gruplar.
 */
export function computeLimitHistory(limit: ExpenseLimit, expenses: Expense[]): LimitHistoryRecord[] {
  const recordsMap = new Map<string, LimitHistoryRecord>();

  // 1. Manuel / Kaydedilmiş geçmiş kayıtları ekle
  (limit.history || []).forEach(record => {
    const key = `${record.periodStart}_${record.periodEnd}`;
    recordsMap.set(key, record);
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const periodInfo = getCurrentLimitPeriod(limit, todayStr);
  const currentStart = limit.currentPeriodStart || periodInfo.currentPeriodStart;

  // 2. Eğer aylık veya haftalık ise, geçmiş dönemlerdeki harcamaları otomatik dönemlere ayırıp geçmiş listesine ekle
  const limitExpenses = expenses.filter(e => {
    if (e.limitId !== limit.id) return false;
    if (e.isTheoretical || e.paymentType === 'teorik' || e.isOpportunity || e.paymentType === 'firsat') return false;
    return true;
  });

  if (limit.resetFrequency === 'aylik' || !limit.resetFrequency) {
    const resetDay = limit.resetDay || 1;
    
    // Geçmiş harcamalardan mevcut dönemden öncekileri bul
    const pastExpenses = limitExpenses.filter(e => !currentStart || e.date < currentStart);

    // Dönem başlangıç tarihlerine göre grupla
    const pastGroups = new Map<string, Expense[]>();

    pastExpenses.forEach(exp => {
      // Bu harcamanın ait olduğu dönem başlangıcını hesapla
      const expPeriod = getCurrentLimitPeriod({ resetFrequency: 'aylik', resetDay }, exp.date);
      const pStart = expPeriod.currentPeriodStart || exp.date.substring(0, 7) + '-01';
      const pEnd = expPeriod.currentPeriodEnd || exp.date.substring(0, 7) + '-28';
      const groupKey = `${pStart}_${pEnd}`;

      if (!pastGroups.has(groupKey)) {
        pastGroups.set(groupKey, []);
      }
      pastGroups.get(groupKey)!.push(exp);
    });

    pastGroups.forEach((groupExpenses, groupKey) => {
      const [periodStart, periodEnd] = groupKey.split('_');
      // Eğer mevcut döneme denk geliyorsa geçmişe ekleme
      if (currentStart && periodStart >= currentStart) return;

      const spentAmount = groupExpenses.reduce((sum, e) => sum + e.amount, 0);
      const target = limit.targetAmount;
      const difference = Math.round((target - spentAmount) * 100) / 100;
      const isOverLimit = spentAmount > target;

      // Eğer zaten arşivde yoksa otomatik ekle; varsa spentAmount güncel harcamalardan doğrulanabilir
      if (!recordsMap.has(groupKey)) {
        recordsMap.set(groupKey, {
          id: `auto-${limit.id}-${periodStart}`,
          periodStart,
          periodEnd,
          targetAmount: target,
          spentAmount,
          difference,
          isOverLimit,
          expenseCount: groupExpenses.length,
          recordedAt: new Date().toISOString(),
        });
      }
    });
  }

  // Tarihe göre yeniden eskiye (en yeni dönem en üstte) sırala
  const allRecords = Array.from(recordsMap.values());
  allRecords.sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  return allRecords;
}

