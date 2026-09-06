/**
 * KADRAN ALARM ŞERİDİ — İç Çalışma 17·F2 (FAZ 13a) · 2026-09-06
 *
 * Oda 17'nin cümlesi şuydu: "her kart eşiği aşınca kendi tanısını yazıyor."
 * Yazıyordu — ama yirmi dört kartın içine dağılmış hâlde, yani hiçbiri
 * alarm gibi okunmuyordu. FAZ 13a yeni bir teşhis motoru YAZMAZ; var olan
 * cümleleri tek yerde toplar ve kadranın EN ÜSTÜNE koyar.
 *
 * Dört iddia ayrı ayrı tutuluyor çünkü dördü de tek başına bozulabilir:
 *   1. YAPISAL  — tanı yazan her kart deftere de yazıyor mu (liste değil
 *      DESEN: yeni bir kart eklendiğinde kapı kendiliğinden büyür).
 *   2. SIRA     — şerit kartlardan SONRA okunuyor mu. Bu fazın en sinsi
 *      tuzağı: şerit doğrudan template'in içine konsaydı defter henüz BOŞ
 *      olurdu ve şerit sessizce hiç görünmezdi. Sessiz bir boşluk, kırık
 *      bir şeritten kötüdür.
 *   3. SARGI    — kartın `<span class="gz-n">— …</span>` kabuğu soyuluyor
 *      mu, ve eşleşmeyen bir girdi olduğu gibi kalıyor mu.
 *   4. SIFIRLAMA — ikinci render'da liste katlanıyor mu (FAZ 4'te bir kez
 *      yaşanmış kırığın ikizi).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  gzAlarm, _alarmDefteriOku, _renderAll,
  _hataNabzi, _emniyetNabzi,
} from '../js/parts/13q-gozlemevi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KAYNAK = readFileSync(join(__dirname, '../js/parts/13q-gozlemevi.js'), 'utf8');

beforeEach(() => { _renderAll({ overview: { active_users: 0 } }); });

describe('1 · yapısal — tanı yazan her kart deftere de yazar', () => {
  it('`tani` değişkeni olan HER nabız fonksiyonu `gzAlarm` çağırır', () => {
    /* Liste ELLE yazılmıyor, kaynaktan TÜRETİLİYOR. Gerekçe FAZ 11'in
       dersinin genellenmiş hâli: bir kanalın tanıdığı ama beslemediği
       basamak sessizce boş kalır, ve boşluk kırıktan uzun yaşar. Elle
       bakımlı bir liste bayatlar; desen bayatlamaz. */
    const fonksiyonlar = [...KAYNAK.matchAll(/^(?:export )?function (_\w*Nabzi)\(/gm)]
      .map((m) => ({ ad: m[1], bas: m.index }));
    expect(fonksiyonlar.length, 'hiç nabız fonksiyonu bulunamadı').toBeGreaterThan(10);

    const eksik = [];
    for (let i = 0; i < fonksiyonlar.length; i++) {
      const bas = fonksiyonlar[i].bas;
      const son = i + 1 < fonksiyonlar.length ? fonksiyonlar[i + 1].bas : KAYNAK.length;
      const govde = KAYNAK.slice(bas, son);
      // Yalnız tanı YAZAN kartlar sorumludur; tanısı olmayan kart muaftır.
      if (!/\btani\s*=/.test(govde)) continue;
      if (!/gzAlarm\(/.test(govde)) eksik.push(fonksiyonlar[i].ad);
    }
    expect(eksik, `tanı yazıp deftere yazmayan kart(lar): ${eksik.join(', ')}`).toEqual([]);
  });

  it('davranışsal — bir kart tanısını üretince defterde görünür', () => {
    // `_hataNabzi`: en sık etiketin payı %40'ı aşınca tanı yazar.
    _hataNabzi({ total: 10, affected_users: 3, top_labels: [{ label: 'llm_timeout', n: 8 }] });
    const defter = _alarmDefteriOku();
    const kayit = defter.find((a) => a.alan === 'hata');
    expect(kayit, 'hata kartı tanı yazdı ama deftere geçmedi').toBeTruthy();
    expect(kayit.metin).toContain('llm_timeout');
    // Sargı soyulmuş olmalı: şerit çıplak metin taşır.
    expect(kayit.metin).not.toContain('<span class="gz-n">');
  });

  it('tanısı olmayan kart deftere YAZMAZ — alarmsız kart şeritte yer kaplamaz', () => {
    // Sinyal de kart da varsa `_emniyetNabzi` tanı üretmez.
    _emniyetNabzi({ total: 4, olaylar: [
      { olay: 'crisis_signal', n: 2 }, { olay: 'crisis_card', n: 2 },
    ] });
    expect(_alarmDefteriOku().find((a) => a.alan === 'emniyet')).toBeUndefined();
  });
});

describe('2 · sıra — şerit kartlardan SONRA okunur', () => {
  /** `_renderAll`'ın beklediği en küçük gerçekçi rapor. */
  const rapor = () => ({
    overview: { active_users: 5 },
    trend: [], screens: [], heatmap: [], transitions: [],
    error_pulse: { total: 10, affected_users: 3, top_labels: [{ label: 'llm_timeout', n: 8 }] },
  });

  it('şerit gerçekten alarm cümlesini TAŞIR — boş şerit kırmızı yakar', () => {
    const html = _renderAll(rapor());
    expect(html, 'alarm şeridi hiç basılmamış').toContain('Alarm Şeridi');
    expect(html, 'şerit basıldı ama alarm cümlesi İÇİNDE yok — sıra tuzağı')
      .toContain('llm_timeout');
  });

  it('şerit kadranın EN ÜSTÜNDE: ilk nabız kartından ÖNCE gelir', () => {
    /* Yirmi dört kartın altında duran bir alarm, alarm değildir. */
    const html = _renderAll(rapor());
    const seritIdx = html.indexOf('Alarm Şeridi');
    const kadranIdx = html.indexOf('admin-stat-row');   // `_kadran`'ın ilk çıktısı
    expect(seritIdx).toBeGreaterThan(-1);
    expect(kadranIdx).toBeGreaterThan(-1);
    expect(seritIdx, 'şerit kartların ALTINDA kalmış').toBeLessThan(kadranIdx);
  });

  it('hiç alarm yoksa şerit HİÇ basılmaz — boş bir kutu değil', () => {
    const html = _renderAll({ overview: { active_users: 5 }, trend: [], screens: [], heatmap: [], transitions: [] });
    expect(html).not.toContain('Alarm Şeridi');
  });
});

describe('3 · sargı soyma', () => {
  it('`<span class="gz-n">— X</span>` → `X`', () => {
    gzAlarm('deneme', '<span class="gz-n">— huninin çıkışı kapalı</span>');
    expect(_alarmDefteriOku().at(-1).metin).toBe('huninin çıkışı kapalı');
  });

  it('eşleşmeyen girdi OLDUĞU GİBİ kalır — sargı değişirse şerit susmaz', () => {
    gzAlarm('deneme', '<b>başka bir biçim</b>');
    expect(_alarmDefteriOku().at(-1).metin).toBe('<b>başka bir biçim</b>');
  });

  it('boş/undefined tanı YUTULUR', () => {
    const once = _alarmDefteriOku().length;
    gzAlarm('deneme', '');
    gzAlarm('deneme', undefined);
    gzAlarm('deneme', null);
    expect(_alarmDefteriOku().length).toBe(once);
  });
});

describe('5 · seviye (FAZ 14a) — kritik önce, ve yalnız ikisi kritik', () => {
  it('emniyet ve hata `kritik`, geri kalan `uyari`', () => {
    gzAlarm('emniyet', '<span class="gz-n">— kart açılmıyor</span>');
    gzAlarm('gelir',   '<span class="gz-n">— teklif açılmıyor</span>');
    const d = _alarmDefteriOku();
    expect(d.find((a) => a.alan === 'emniyet').seviye).toBe('kritik');
    expect(d.find((a) => a.alan === 'gelir').seviye).toBe('uyari');
  });

  it('şerit KRİTİĞİ önce basar — sırasız bir şerit yalnız bir özettir', () => {
    /* Bu, seviyenin bir etiket mi yoksa bir KALDIRAÇ mı olduğunu ölçen
       tek testtir (§1.1).

       SINAV SINADIĞINI SINAMALI: kayıt sırası GERÇEKTEN ters olmalı, yoksa
       sıralama silinse bile test yeşil kalır. `_renderAll`'ın çağrı sırasında
       `_ritusNabzi` `_hataNabzi`'den ÖNCEDİR — yani `uyari` deftere önce
       girer, `kritik` sonra. Sıralama düşerse şerit onları bu ters sırayla
       basar ve test kırmızı yanar.
       (İlk yazımda `kota_pulse` seçilmişti; oysa `_gelirNabzi` zaten
       `_hataNabzi`'den SONRA koşuyor — test sıralamayı hiç sınamıyordu ve
       yeşil yanıyordu. Bu repo bu dersi FAZ 2c'de bir kez ödemişti.) */
    const html = _renderAll({
      overview: { active_users: 5 }, trend: [], screens: [], heatmap: [], transitions: [],
      ritus_pulse: { total: 5, baslayan_gezgin: 4, tamamlayan_gezgin: 0 },              // uyari — ÖNCE koşar
      error_pulse: { total: 10, affected_users: 3, top_labels: [{ label: 'llm_timeout', n: 8 }] }, // kritik — SONRA
    });
    const kritikIdx = html.indexOf('llm_timeout');
    const uyariIdx  = html.indexOf('hiçbir ritüel sonuna kadar gitmemiş');
    expect(kritikIdx, 'kritik alarm şeritte yok').toBeGreaterThan(-1);
    expect(uyariIdx, 'uyarı alarmı şeritte yok').toBeGreaterThan(-1);
    expect(kritikIdx, 'kritik alarm uyarının ALTINDA kalmış').toBeLessThan(uyariIdx);
  });

  it('defterin KENDİSİ kayıt sırasını korur — sıralama kopyada yapılır', () => {
    gzAlarm('gelir',   '<span class="gz-n">— a</span>');
    gzAlarm('emniyet', '<span class="gz-n">— b</span>');
    const d = _alarmDefteriOku();
    expect(d.at(-2).alan).toBe('gelir');
    expect(d.at(-1).alan).toBe('emniyet');
  });
});

describe('4 · sıfırlama — ikinci render listeyi katlamaz', () => {
  it('iki ardışık `_renderAll` aynı alarmı iki kez yazmaz', () => {
    const rapor = {
      overview: { active_users: 5 }, trend: [], screens: [], heatmap: [], transitions: [],
      error_pulse: { total: 10, affected_users: 3, top_labels: [{ label: 'llm_timeout', n: 8 }] },
    };
    _renderAll(rapor);
    const birinci = _alarmDefteriOku().filter((a) => a.alan === 'hata').length;
    _renderAll(rapor);
    const ikinci = _alarmDefteriOku().filter((a) => a.alan === 'hata').length;
    expect(birinci).toBe(1);
    expect(ikinci, 'defter katlanmış — `_renderAll` başındaki sıfırlama düşmüş').toBe(1);
  });
});
