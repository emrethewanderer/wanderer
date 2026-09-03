/**
 * ÖN SÜZGEÇ (10F) — yayın öncesi tek bakış · İç Çalışma 12 · boşluk A
 *
 * rev.1'in bulgusu: "Paylaşılan kart metni ve 600 karakterlik yorumlar
 * doğrudan herkese açık akışa iner; tek savunma sonradan gelen ⚑ raporu."
 *
 * Bu dosya iki şeyi birden kilitler ve ikincisi en az birincisi kadar önemli:
 *   1) TUTULMASI GEREKEN — telefon, e-posta, kimlik no, IBAN, kriz sinyali.
 *   2) TUTULMAMASI GEREKEN — tarih, sayaç, kilometre taşı, seri sayısı.
 *
 * (2) olmadan (1) bir kapı değil bir tuzaktır: kendi cümlesini paylaşan
 * insana "uygunsuz içerik" demek, koruduğunu iddia ettiği kişiyi incitir.
 * Desenler bu yüzden DAR yazıldı ve testin yarısı yanlış pozitif avıdır.
 */
import { describe, it, expect } from 'vitest';
import { szDenetle } from '../js/parts/10F-on-suzgec.js';

describe('szDenetle — tutulması gerekenler', () => {
  it('TR cep numarasını yakalar (bitişik)', () => {
    const r = szDenetle('bana ulaş 05321234567 buradan');
    expect(r.gecer).toBe(false);
    expect(r.sebep).toBe('telefon');
    expect(r.mesaj).toBeTruthy();
  });

  it('boşluklu / tireli / +90 önekli yazımları da yakalar', () => {
    for (const n of ['0532 123 45 67', '+90 532 123 45 67', '532-123-45-67', '(0532) 123 45 67']) {
      expect(szDenetle(`numaram ${n} arayabilirsin`).sebep).toBe('telefon');
    }
  });

  it('e-posta adresini yakalar', () => {
    expect(szDenetle('yazmak istersen ali@ornek.com').sebep).toBe('eposta');
  });

  it('kimlik numarasına benzeyen 11 haneyi yakalar', () => {
    expect(szDenetle('kimlik 12345678901 diye geçiyor').sebep).toBe('tckn');
  });

  it('IBAN yakalar', () => {
    expect(szDenetle('TR33 0006 1005 1978 6457 8413 26').sebep).toBe('iban');
  });

  it('kriz sinyalini yakalar — kendi dedektörüyle (13-extras, 11 dil)', () => {
    const r = szDenetle('artık yaşamak istemiyorum, hiçbir şeyin anlamı yok');
    expect(r.gecer).toBe(false);
    expect(r.sebep).toBe('kriz');
  });

  /* SIRA — bir cümlede hem numara hem kriz varsa, söylenmesi gereken şey
     numara değildir. */
  it('kriz, kimlik bilgisinden ÖNCE gelir', () => {
    expect(szDenetle('ölmek istiyorum, ara beni 05321234567').sebep).toBe('kriz');
  });
});

describe('szDenetle — tutulMAMASI gerekenler (yanlış pozitif avı)', () => {
  it('temiz metin geçer', () => {
    const r = szDenetle('Bugün ertelediğim tek adımı attım. Eski ben bırakırdı.');
    expect(r.gecer).toBe(true);
    expect(r.sebep).toBeNull();
    expect(r.mesaj).toBeNull();
  });

  it('boş / null / boşluk geçer', () => {
    for (const v of ['', '   ', null, undefined]) expect(szDenetle(v).gecer).toBe(true);
  });

  it('tarihler engellenmez', () => {
    for (const s of ['3 Eylül 2026 günü karar verdim', '2026-09-03 tarihinde', '18/07/2026']) {
      expect(szDenetle(s).gecer).toBe(true);
    }
  });

  it('seri ve kilometre taşı sayıları engellenmez', () => {
    for (const s of ['100 günlük zincirimi dövdüm', '365 gün oldu', '7 gündür ayaktayım']) {
      expect(szDenetle(s).gecer).toBe(true);
    }
  });

  it('saat, yüzde ve para gibi gündelik sayılar engellenmez', () => {
    for (const s of ['sabah 05:30da kalktım', 'yüzde 40 daha iyiyim', '250 lira biriktirdim']) {
      expect(szDenetle(s).gecer).toBe(true);
    }
  });

  /* 11 haneden KISA ya da UZUN bir sayı kimlik numarası değildir — desen
     sınırı burada; gevşetilirse yukarıdaki sayaçlar da düşerdi. */
  it('10 ve 12 haneli sayılar kimlik sayılmaz', () => {
    expect(szDenetle('kod 1234567890 idi').gecer).toBe(true);
    expect(szDenetle('kod 123456789012 idi').gecer).toBe(true);
  });

  it('mecazlar kriz sayılmaz — dedektörün kendi ayrımı korunur', () => {
    expect(szDenetle('bu iş beni öldürüyor ama devam ediyorum').gecer).toBe(true);
  });
});

describe('szDenetle — sözleşme', () => {
  it('daima üç alanlı bir nesne döner', () => {
    for (const s of ['temiz', '05321234567', 'ölmek istiyorum']) {
      const r = szDenetle(s);
      expect(Object.keys(r).sort()).toEqual(['gecer', 'mesaj', 'sebep']);
      expect(typeof r.gecer).toBe('boolean');
    }
  });

  it('engellenen her sebep kullanıcıya gösterilecek bir mesaj taşır', () => {
    for (const s of ['05321234567', 'a@b.com', '12345678901', 'TR330006100519786457841326', 'intihar']) {
      const r = szDenetle(s);
      expect(r.gecer).toBe(false);
      expect(typeof r.mesaj).toBe('string');
      expect(r.mesaj.length).toBeGreaterThan(10);
      // Ton kuralı: süzgeç kullanıcıyı yargılamaz.
      expect(r.mesaj.toLowerCase()).not.toContain('uygunsuz');
      expect(r.mesaj.toLowerCase()).not.toContain('yasak');
      expect(r.mesaj.toLowerCase()).not.toContain('ihlal');
    }
  });
});
