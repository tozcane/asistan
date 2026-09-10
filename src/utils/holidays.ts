export interface HolidayInfo {
  name: string;
  type: 'national' | 'religious';
  badge: string; // e.g. '🇹🇷' or '🌙'
}

// Sabit Türkiye Resmi Tatilleri (Ay-Gün formatı, MM-DD)
// 15 Temmuz KULLANICI TALEBİ DOĞRULTUSUNDA KESİNLİKLE DAHİL EDİLMEMİŞTİR.
const FIXED_NATIONAL_HOLIDAYS: Record<string, string> = {
  '01-01': 'Yılbaşı',
  '04-23': 'Ulusal Egemenlik ve Çocuk Bayramı',
  '05-01': 'Emek ve Dayanışma Günü',
  '05-19': "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
  '08-30': 'Zafer Bayramı',
  '10-29': 'Cumhuriyet Bayramı',
};

// Dini Bayramlar (Hicri takvime göre yıllara göre YYYY-MM-DD)
// Ramazan Bayramı (Arife + 3 gün), Kurban Bayramı (Arife + 4 gün)
const DINI_BAYRAMLAR: Record<string, string> = {
  // 2025 Yılı
  '2025-03-29': 'Ramazan Bayramı Arifesi',
  '2025-03-30': 'Ramazan Bayramı 1. Gün',
  '2025-03-31': 'Ramazan Bayramı 2. Gün',
  '2025-04-01': 'Ramazan Bayramı 3. Gün',
  '2025-06-05': 'Kurban Bayramı Arifesi',
  '2025-06-06': 'Kurban Bayramı 1. Gün',
  '2025-06-07': 'Kurban Bayramı 2. Gün',
  '2025-06-08': 'Kurban Bayramı 3. Gün',
  '2025-06-09': 'Kurban Bayramı 4. Gün',

  // 2026 Yılı
  '2026-03-19': 'Ramazan Bayramı Arifesi',
  '2026-03-20': 'Ramazan Bayramı 1. Gün',
  '2026-03-21': 'Ramazan Bayramı 2. Gün',
  '2026-03-22': 'Ramazan Bayramı 3. Gün',
  '2026-05-26': 'Kurban Bayramı Arifesi',
  '2026-05-27': 'Kurban Bayramı 1. Gün',
  '2026-05-28': 'Kurban Bayramı 2. Gün',
  '2026-05-29': 'Kurban Bayramı 3. Gün',
  '2026-05-30': 'Kurban Bayramı 4. Gün',

  // 2027 Yılı
  '2027-03-09': 'Ramazan Bayramı Arifesi',
  '2027-03-10': 'Ramazan Bayramı 1. Gün',
  '2027-03-11': 'Ramazan Bayramı 2. Gün',
  '2027-03-12': 'Ramazan Bayramı 3. Gün',
  '2027-05-16': 'Kurban Bayramı Arifesi',
  '2027-05-17': 'Kurban Bayramı 1. Gün',
  '2027-05-18': 'Kurban Bayramı 2. Gün',
  '2027-05-19': 'Kurban Bayramı 3. Gün',
  '2027-05-20': 'Kurban Bayramı 4. Gün',
};

/**
 * Verilen YYYY-MM-DD tarihine ait bayram/tatil bilgisi döner.
 * Tatil yoksa null döner.
 */
export function getHolidayForDate(dateStr: string): HolidayInfo | null {
  if (!dateStr) return null;

  // 1. Dini bayram kontrolü (Tam tarih eşleşmesi)
  if (DINI_BAYRAMLAR[dateStr]) {
    return {
      name: DINI_BAYRAMLAR[dateStr],
      type: 'religious',
      badge: '🌙',
    };
  }

  // 2. Sabit resmi bayram kontrolü (MM-DD eşleşmesi)
  const monthDay = dateStr.slice(5); // YYYY-MM-DD -> MM-DD
  if (FIXED_NATIONAL_HOLIDAYS[monthDay]) {
    return {
      name: FIXED_NATIONAL_HOLIDAYS[monthDay],
      type: 'national',
      badge: '🇹🇷',
    };
  }

  return null;
}
