/**
 * GÜN ANAHTARI OKUYUCUSU — parseDayKey (00a) · İç Çalışma 10 · boşluk B
 *
 * Bu repoda gün anahtarının iki yazım biçimi var ve ikisi de bilinçli:
 *   localDayKey()  → 'YYYY-M-D'   ay 0-TABANLI, pad'siz  (aktivite defteri)
 *   localISODate() → 'YYYY-MM-DD' ay 1-tabanlı, padded   (10t/10u defterleri)
 *
 * rev.1 raporu bunu "iki format yan yana yaşıyor, her yeni tüketici aynı
 * mayına basmaya aday" diye adlandırmıştı. Çözüm format GÖÇÜ değil (cihazlarda
 * duran gerçek defterleri yeniden yazmak riskli ve gereksiz) — okuma tarafının
 * tek elde toplanması.
 *
 * Bu dosyanın asıl işi tek bir tuzağı kilitlemek: **otomatik ayrım mümkün
 * değildir.** '2026-11-25' iki biçimde de geçerlidir ama farklı ayı gösterir.
 * Sessizce tahmin eden bir okuyucu yılın çoğunda doğru, bazı günlerinde bir ay
 * şaşardı — ve o hata Wrapped'in "aktif gün" sayısında görünmeden yaşardı.
 */
import { describe, it, expect } from 'vitest';
import { parseDayKey, localDayKey, localISODate } from '../js/parts/00a-infrastructure.js';

describe('parseDayKey — iki biçim, tek okuyucu', () => {
  it('padded/1-tabanlı biçimi (localISODate) varsayılan olarak çözer', () => {
    const d = parseDayKey('2026-09-03');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);      // Eylül → 0-tabanlı 8
    expect(d.getDate()).toBe(3);
  });

  it('pad\'siz/0-tabanlı biçimi (localDayKey) taban0:true ile çözer', () => {
    const d = parseDayKey('2026-8-3', { taban0: true });
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);      // 0-tabanlı yazımda "8" zaten Eylül
    expect(d.getDate()).toBe(3);
  });

  /* TUZAĞIN KENDİSİ — bu test, otomatik ayrımın neden yasaklandığını kanıtlar.
     Aynı string, iki bayrakla iki FARKLI aya çözülür. Bir gün biri
     "parseDayKey formatı kendi anlasın" derse, bu test ona ne kaybedeceğini
     gösterir. */
  it('AYNI string iki bayrakla iki farklı ayı verir — tahmin edilemez', () => {
    const iso  = parseDayKey('2026-11-25');                   // Kasım 25
    const ham  = parseDayKey('2026-11-25', { taban0: true });  // Aralık 25
    expect(iso.getMonth()).toBe(10);
    expect(ham.getMonth()).toBe(11);
    expect(iso.getTime()).not.toBe(ham.getTime());
  });

  it('kendi yazıcılarının çıktısını gidiş-dönüş çözer', () => {
    const bugun = new Date(2026, 0, 5);                        // 5 Ocak 2026
    expect(parseDayKey(localISODate(bugun)).getTime()).toBe(bugun.getTime());
    expect(parseDayKey(localDayKey(bugun), { taban0: true }).getTime()).toBe(bugun.getTime());
  });

  it('Ocak ayı: 0-tabanlı yazım "2026-0-5" üretir ve doğru çözülür', () => {
    expect(localDayKey(new Date(2026, 0, 5))).toBe('2026-0-5');
    const d = parseDayKey('2026-0-5', { taban0: true });
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(5);
  });

  it('YEREL gece yarısına kurar — UTC kaymaz ([[yerel-tarih-anahtari]])', () => {
    const d = parseDayKey('2026-09-03');
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    // Yerel kurucu kullanıldığının kanıtı: bileşenler geri okunduğunda aynı.
    expect(localISODate(d)).toBe('2026-09-03');
  });

  it('çözülemeyen girdide null döner — asla uydurulmuş bir gün', () => {
    for (const kotu of [null, undefined, '', 'bugün', '2026-09', '2026-09-03-01', {}, 42]) {
      expect(parseDayKey(kotu)).toBeNull();
    }
  });

  it('takvimde olmayan gün null döner — Date sessizce kaydırmaz', () => {
    // new Date(2026, 1, 31) sessizce 3 Mart'a kayar; okuyucu buna izin vermez.
    expect(parseDayKey('2026-02-31')).toBeNull();
    expect(parseDayKey('2026-13-01')).toBeNull();
    expect(parseDayKey('2026-00-10')).toBeNull();   // 1-tabanlı yazımda ay 0 yoktur
  });

  it('taban0 modunda ay 12 geçersizdir (0-11 aralığı)', () => {
    expect(parseDayKey('2026-11-01', { taban0: true })).toBeInstanceOf(Date); // Aralık
    expect(parseDayKey('2026-12-01', { taban0: true })).toBeNull();
  });

  it('artık gün: 29 Şubat 2028 geçerli, 2027 değil', () => {
    expect(parseDayKey('2028-02-29')).toBeInstanceOf(Date);
    expect(parseDayKey('2027-02-29')).toBeNull();
  });
});
