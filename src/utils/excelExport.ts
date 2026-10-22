import * as XLSX from 'xlsx';
import type { Expense, Category, Account, ExpenseLimit } from '../types';
import { formatTagsAsText, type TagParentsMap } from './tagHierarchy';

interface ExportDataParams {
  expenses: Expense[];
  categories: Category[];
  accounts: Account[];
  limits: ExpenseLimit[];
  tagParents?: TagParentsMap;
  todayStr: string;
}

export function exportFinancialDataToExcel({
  expenses,
  categories,
  accounts,
  limits,
  tagParents = {},
  todayStr,
}: ExportDataParams) {
  // Helpers to get names
  const categoryMap = new Map<string, string>();
  const subcategoryMap = new Map<string, string>();
  categories.forEach(cat => {
    categoryMap.set(cat.id, cat.name);
    cat.subcategories?.forEach(sub => {
      subcategoryMap.set(sub.id, sub.name);
    });
  });

  const accountMap = new Map<string, string>();
  accounts.forEach(acc => accountMap.set(acc.id, acc.name));

  const limitMap = new Map<string, string>();
  limits.forEach(lim => limitMap.set(lim.id, lim.name));

  // 1. SHEET: LOGLAR (Geçmiş ve bugünkü bireysel harcamalar, en yeni en üstte)
  const pastAndTodayExpenses = expenses
    .filter(e => e.date <= todayStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  const logsRows = pastAndTodayExpenses.map(e => {
    const catName = e.categoryId ? (categoryMap.get(e.categoryId) || 'Bilinmiyor') : '-';
    const subCatName = e.subcategoryId ? (subcategoryMap.get(e.subcategoryId) || 'Bilinmiyor') : '-';
    const accName = e.accountId ? (accountMap.get(e.accountId) || 'Bilinmiyor') : '-';
    const limName = e.limitId ? (limitMap.get(e.limitId) || 'Bilinmiyor') : '-';
    const tagsStr = (e.tags && e.tags.length > 0) ? formatTagsAsText(e.tags, tagParents) : '-';

    let paymentTypeStr = 'Peşin';
    if (e.paymentType === 'taksitli' || e.parentExpenseId) {
      paymentTypeStr = `Taksit (${e.installmentNumber || 1}/${e.installmentCount || '?'})`;
    } else if (e.paymentType === 'tekrarlayan' || e.recurrenceBatchId) {
      paymentTypeStr = 'Tekrarlayan';
    }

    return {
      'Tarih': e.date,
      'Tutar (TL)': e.amount,
      'Başlık': e.title || (e.splitTitle ? e.splitTitle : '-'),
      'Açıklama': e.description || '-',
      'Kategori': catName,
      'Alt Kategori': subCatName,
      'Ödeme Türü': paymentTypeStr,
      'Hesap': accName,
      'Tabi Olduğu Limit': limName,
      'Gereklilik Derecesi': e.necessity || 'Tanımsız',
      'Etiketler': tagsStr,
    };
  });

  // 2. SHEET: GELECEK HARCAMALAR
  // Gelecekteki harcamalar sonsuza gitmesin diye serileri gruplayıp özet tek satır yapıyoruz
  const futureExpenses = expenses.filter(e => e.date > todayStr);

  const handledBatchIds = new Set<string>();
  const futureRows: any[] = [];

  const sortedFutureExpenses = [...futureExpenses].sort((a, b) => a.date.localeCompare(b.date));

  for (const exp of sortedFutureExpenses) {
    if (exp.recurrenceBatchId) {
      if (handledBatchIds.has(exp.recurrenceBatchId)) continue;
      handledBatchIds.add(exp.recurrenceBatchId);

      const seriesFuture = expenses
        .filter(e => e.recurrenceBatchId === exp.recurrenceBatchId && e.date > todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));
      const firstUpcomingDate = seriesFuture[0]?.date || exp.date;
      const catName = exp.categoryId ? (categoryMap.get(exp.categoryId) || '-') : '-';
      const subCatName = exp.subcategoryId ? (subcategoryMap.get(exp.subcategoryId) || '-') : '-';
      const accName = exp.accountId ? (accountMap.get(exp.accountId) || '-') : '-';
      const limName = exp.limitId ? (limitMap.get(exp.limitId) || '-') : '-';

      // Sıklık eşlemesi
      const freqLabelMap: Record<string, string> = {
        gunluk: 'Günlük',
        haftalik: 'Haftalık',
        aylik: 'Aylık',
        yillik: 'Yıllık',
      };
      const freqStr = freqLabelMap[exp.recurrenceFrequency || 'aylik'] || (exp.recurrenceFrequency || 'Aylık');

      let repeatCountVal: string | number = '';
      let futureTotalVal: string | number = '';

      if (exp.isUnlimitedRecurrence) {
        repeatCountVal = 'Sınırsız';
        futureTotalVal = 'Sınırsız';
      } else {
        const remainingCount = seriesFuture.length;
        repeatCountVal = remainingCount;
        // Sadece kalan gelecek ödemelerin toplamı
        futureTotalVal = seriesFuture.reduce((sum, item) => sum + item.amount, 0);
      }

      futureRows.push({
        'Başlangıç / Sıradaki Tarih': firstUpcomingDate,
        'Başlık': exp.title || 'Tekrarlayan Masraf Serisi',
        'Açıklama': exp.description || '-',
        'Ödeme Türü': 'Tekrarlayan Seri',
        'Tutar (Tekrar Başına TL)': exp.amount,
        'Gelecek Kalan Tekrar Sayısı': repeatCountVal,
        'Tekrar Sıklığı': freqStr,
        'Gelecek Toplam Tutar (TL)': futureTotalVal,
        'Kategori': catName,
        'Alt Kategori': subCatName,
        'Hesap': accName,
        'Tabi Olduğu Limit': limName,
      });
    } else if (exp.parentExpenseId) {
      // Taksit serisi
      const parentId = exp.parentExpenseId;
      if (handledBatchIds.has(parentId)) continue;
      handledBatchIds.add(parentId);

      const seriesFuture = expenses
        .filter(e => (e.parentExpenseId === parentId || e.id === parentId) && e.date > todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));
      const firstUpcomingDate = seriesFuture[0]?.date || exp.date;
      const catName = exp.categoryId ? (categoryMap.get(exp.categoryId) || '-') : '-';
      const subCatName = exp.subcategoryId ? (subcategoryMap.get(exp.subcategoryId) || '-') : '-';
      const accName = exp.accountId ? (accountMap.get(exp.accountId) || '-') : '-';
      const limName = exp.limitId ? (limitMap.get(exp.limitId) || '-') : '-';

      const remainingCount = seriesFuture.length;
      // Sadece gelecekte ödenecek taksitlerin toplam tutarı (ödenenler hariç)
      const futureInstallmentTotal = seriesFuture.reduce((sum, item) => sum + item.amount, 0);

      futureRows.push({
        'Başlangıç / Sıradaki Tarih': firstUpcomingDate,
        'Başlık': exp.title || 'Taksitli Harcama',
        'Açıklama': exp.description || '-',
        'Ödeme Türü': 'Taksit',
        'Tutar (Tekrar Başına TL)': exp.amount,
        'Gelecek Kalan Tekrar Sayısı': remainingCount,
        'Tekrar Sıklığı': 'Aylık',
        'Gelecek Toplam Tutar (TL)': futureInstallmentTotal,
        'Kategori': catName,
        'Alt Kategori': subCatName,
        'Hesap': accName,
        'Tabi Olduğu Limit': limName,
      });
    } else {
      // Tek seferlik ileri tarihli masraf
      const catName = exp.categoryId ? (categoryMap.get(exp.categoryId) || '-') : '-';
      const subCatName = exp.subcategoryId ? (subcategoryMap.get(exp.subcategoryId) || '-') : '-';
      const accName = exp.accountId ? (accountMap.get(exp.accountId) || '-') : '-';
      const limName = exp.limitId ? (limitMap.get(exp.limitId) || '-') : '-';

      futureRows.push({
        'Başlangıç / Sıradaki Tarih': exp.date,
        'Başlık': exp.title || 'İleri Tarihli Harcama',
        'Açıklama': exp.description || '-',
        'Ödeme Türü': 'Tek Seferlik',
        'Tutar (Tekrar Başına TL)': exp.amount,
        'Gelecek Kalan Tekrar Sayısı': 1,
        'Tekrar Sıklığı': 'Tek Seferlik',
        'Gelecek Toplam Tutar (TL)': exp.amount,
        'Kategori': catName,
        'Alt Kategori': subCatName,
        'Hesap': accName,
        'Tabi Olduğu Limit': limName,
      });
    }
  }

  // --- ÖZETLER İÇİN VERİ HAZIRLIĞI (Aylık bazda, geçmiş + bugünkü harcamalar) ---
  const monthSet = new Set<string>();
  pastAndTodayExpenses.forEach(e => {
    if (e.date && e.date.length >= 7) {
      monthSet.add(e.date.substring(0, 7));
    }
  });
  const sortedMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

  // 3. SHEET: KATEGORİ ÖZET (Aylık)
  const catTotalSpend = new Map<string, number>();
  pastAndTodayExpenses.forEach(e => {
    const cId = e.categoryId || 'uncategorized';
    catTotalSpend.set(cId, (catTotalSpend.get(cId) || 0) + e.amount);
  });

  const topCategories = Array.from(catTotalSpend.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([cId]) => cId);

  const getCatDisplay = (cId: string) => {
    if (cId === 'uncategorized') return 'Kategorisiz';
    return categoryMap.get(cId) || cId;
  };

  const categoryRows = sortedMonths.map(month => {
    const monthExpenses = pastAndTodayExpenses.filter(e => e.date.startsWith(month));
    const totalMonthSpend = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const row: Record<string, any> = {
      'Ay': month,
      'Toplam Harcama (TL)': totalMonthSpend, // İLK 50 KATEGORİNİN SOLUNDA TOPLAM
    };

    topCategories.forEach(cId => {
      const catExpenses = monthExpenses.filter(e => (e.categoryId || 'uncategorized') === cId);
      const catSum = catExpenses.reduce((s, e) => s + e.amount, 0);
      const colTitle = getCatDisplay(cId);
      row[colTitle] = catSum > 0 ? catSum : 0;
    });

    return row;
  });

  // 4. SHEET: ETİKET ÖZET (Aylık)
  const tagTotalSpend = new Map<string, number>();
  pastAndTodayExpenses.forEach(e => {
    if (e.tags && e.tags.length > 0) {
      e.tags.forEach(tag => {
        const cleanTag = tag.trim();
        if (cleanTag) {
          tagTotalSpend.set(cleanTag, (tagTotalSpend.get(cleanTag) || 0) + e.amount);
        }
      });
    }
  });

  const topTags = Array.from(tagTotalSpend.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([t]) => t);

  const tagRows = sortedMonths.map(month => {
    const monthExpenses = pastAndTodayExpenses.filter(e => e.date.startsWith(month));
    const totalMonthSpend = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const row: Record<string, any> = {
      'Ay': month,
      'Toplam Harcama (TL)': totalMonthSpend, // İLK 50 ETİKETİN SOLUNDA TOPLAM
    };

    topTags.forEach(tag => {
      const tagExpenses = monthExpenses.filter(e => e.tags && e.tags.includes(tag));
      const tagSum = tagExpenses.reduce((s, e) => s + e.amount, 0);
      row[`#${tag}`] = tagSum > 0 ? tagSum : 0;
    });

    return row;
  });

  // 5. SHEET: TASARRUF VE GEREKLİLİK ÖZETİ (Aylık)
  const necessityLevels: Array<'Fizyolojik' | 'Temel' | 'Makul' | 'Kaçınılabilir' | 'İsraf' | 'Tanımsız'> = [
    'Fizyolojik',
    'Temel',
    'Makul',
    'Kaçınılabilir',
    'İsraf',
    'Tanımsız',
  ];

  const savingsRows = sortedMonths.map(month => {
    const monthExpenses = pastAndTodayExpenses.filter(e => e.date.startsWith(month));
    const totalMonthSpend = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const necTotals: Record<string, number> = {};
    necessityLevels.forEach(lvl => { necTotals[lvl] = 0; });

    monthExpenses.forEach(e => {
      const nec = e.necessity || 'Tanımsız';
      necTotals[nec] = (necTotals[nec] || 0) + e.amount;
    });

    const avoidableTotal = (necTotals['Kaçınılabilir'] || 0) + (necTotals['İsraf'] || 0);
    const avoidablePct = totalMonthSpend > 0 ? Math.round((avoidableTotal / totalMonthSpend) * 100) : 0;

    const row: Record<string, any> = {
      'Ay': month,
      'Toplam Harcama (TL)': totalMonthSpend,
      'Tasarruf Edilebilir Tutar (TL)': avoidableTotal,
      'Tasarruf Potansiyeli Oranı': `%${avoidablePct}`,
    };

    necessityLevels.forEach(lvl => {
      const amt = necTotals[lvl] || 0;
      const pct = totalMonthSpend > 0 ? ((amt / totalMonthSpend) * 100).toFixed(1) : '0';
      row[`${lvl} (TL)`] = amt;
      row[`${lvl} Payı`] = `%${pct}`;
    });

    return row;
  });

  // WORKBOOK OLUŞTURMA
  const workbook = XLSX.utils.book_new();

  const logsSheet = XLSX.utils.json_to_sheet(logsRows.length > 0 ? logsRows : [{ 'Bilgi': 'Kayıt bulunamadı' }]);
  XLSX.utils.book_append_sheet(workbook, logsSheet, 'Loglar');

  const futureSheet = XLSX.utils.json_to_sheet(futureRows.length > 0 ? futureRows : [{ 'Bilgi': 'Gelecek harcama bulunamadı' }]);
  XLSX.utils.book_append_sheet(workbook, futureSheet, 'Gelecek Harcamalar');

  const categorySheet = XLSX.utils.json_to_sheet(categoryRows.length > 0 ? categoryRows : [{ 'Bilgi': 'Kategori özeti bulunamadı' }]);
  XLSX.utils.book_append_sheet(workbook, categorySheet, 'Kategori Özet');

  const tagSheet = XLSX.utils.json_to_sheet(tagRows.length > 0 ? tagRows : [{ 'Bilgi': 'Etiket özeti bulunamadı' }]);
  XLSX.utils.book_append_sheet(workbook, tagSheet, 'Etiket Özet');

  const savingsSheet = XLSX.utils.json_to_sheet(savingsRows.length > 0 ? savingsRows : [{ 'Bilgi': 'Tasarruf özeti bulunamadı' }]);
  XLSX.utils.book_append_sheet(workbook, savingsSheet, 'Tasarruf ve Gereklilik Özet');

  const filename = `CapitalControl_Finansal_Rapor_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
