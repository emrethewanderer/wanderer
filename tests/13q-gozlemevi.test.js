/**
 * Tests for js/parts/13q-gozlemevi.js — İç Çalışma 02 · FAZ 2 (nabzın yüzeyi).
 *
 * Asıl sınanan şey estetik değil SÖZLEŞME: migration 042 uygulanmadığında
 * RPC bu alanları HİÇ döndürmez. O durumda kart "boş kutu" göstermemeli,
 * hiç çizilmemeli — boş bir kart, ölçüm varmış izlenimi verir ki bu sahte
 * başarıdır (§6.2). Bir de A boşluğunun teşhis cümlesi: uzak yol %0 ise
 * kullanıcıya değil ADMIN'e "altyapı ölü olabilir" denmeli.
 */

import { describe, it, expect } from 'vitest';
import { _hafizaNabzi, _gecikmeNabzi, _baglamNabzi, _koleksiyonNabzi, _ritusNabzi, _esikNabzi, _duyguNabzi, _donusumNabzi, _sesNabzi, _sondaHTML, _emniyetNabzi, _hataNabzi, _davetNabzi, _gelirNabzi, _aracNabzi, _bolgeNabzi, _halkaNabzi, _alarmListesi, _alarmListesiHTML } from '../js/parts/13q-gozlemevi.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

describe('migration 042 uygulanmadıysa — kart hiç çizilmez', () => {
  it('hafıza nabzı: alan yoksa boş string', () => {
    expect(_hafizaNabzi(undefined)).toBe('');
    expect(_hafizaNabzi(null)).toBe('');
    expect(_hafizaNabzi({ total: 0 })).toBe('');
  });

  it('gecikme nabzı: alan yoksa boş string', () => {
    expect(_gecikmeNabzi(undefined)).toBe('');
    expect(_gecikmeNabzi({ total_turns: 0 })).toBe('');
  });

  it('bağlam nabzı: alan yoksa boş string', () => {
    expect(_baglamNabzi(undefined)).toBe('');
    expect(_baglamNabzi({ total_turns: 0 })).toBe('');
  });
});

describe('Hafıza Nabzı — A boşluğunun teşhisi', () => {
  const temel = { total: 40, recall: 25, ingest: 15, avg_ms: 310, hata_pct: 0, yollar: [] };

  it('uzak yol %0 ise altyapı teşhisini yazar (ELLE iş uyarısı)', () => {
    const html = _hafizaNabzi({ ...temel, uzak_pct: 0 });
    expect(html).toContain('uzak yol hiç görünmedi');
    expect(html).toContain('user_memories');
    expect(html).toContain('llm-embed');
  });

  it('uzak yol varsa teşhis cümlesi YAZILMAZ', () => {
    const html = _hafizaNabzi({ ...temel, uzak_pct: 68 });
    expect(html).not.toContain('uzak yol hiç görünmedi');
    expect(html).toContain('%68');
  });

  it('hata oranı yüksekse ayrı uyarı verir', () => {
    const html = _hafizaNabzi({ ...temel, uzak_pct: 40, hata_pct: 35 });
    expect(html).toContain('hata oranı %35');
  });

  it('yol satırlarını Türkçe adlarıyla çizer', () => {
    const html = _hafizaNabzi({
      ...temel, uzak_pct: 50,
      yollar: [{ tur: 'recall', yol: 'uzak', count: 12 }, { tur: 'backfill', yol: 'hata', count: 3 }],
    });
    expect(html).toContain('geri çağırma · uzak (pgvector)');
    expect(html).toContain('dolgu · hata');
  });
});

describe('Gecikme Nabzı — bir aydır yazılan ölçü ilk kez okunuyor', () => {
  it('ortanca ve p95 ile model kırılımını çizer', () => {
    const html = _gecikmeNabzi({
      total_turns: 120, p50_ms: 2400, p95_ms: 9100,
      models: [{ model: 'deepseek-v4-flash', count: 100, p50_ms: 2300 }],
    });
    expect(html).toContain('ortanca <b>2400 ms</b>');
    expect(html).toContain('en yavaş %5 <b>9100 ms</b>');
    expect(html).toContain('deepseek-v4-flash');
  });
});

describe('Bağlam Nabzı — kanal ile alt kırılım karışmaz (H)', () => {
  const cp = {
    total_turns: 90, avg_toplam: 7400, max_toplam: 12100,
    kanallar: [
      { kanal: 'personalization', avg_bytes: 3100, turns: 90 },
      { kanal: 'user_profile', avg_bytes: 900, turns: 88 },
      { kanal: 'p_kimlik', avg_bytes: 1200, turns: 90 },
      { kanal: 'p_calisma', avg_bytes: 700, turns: 60 },
    ],
  };

  it('p_ önekli satırlar ayrı grupta ve kırılım olarak anlatılır', () => {
    const html = _baglamNabzi(cp);
    expect(html).toContain('personalization kanalının içi');
    expect(html).toContain('kimlik motorları');
    expect(html).toContain('ritüel · odak · imge · iz');
  });

  it('kanal adları Türkçeye çevrilir, ham anahtar sızmaz', () => {
    const html = _baglamNabzi(cp);
    expect(html).toContain('kişiselleştirme');
    expect(html).not.toContain('>p_kimlik<');
  });

  it('alt kırılım yoksa o blok hiç çizilmez', () => {
    const html = _baglamNabzi({ ...cp, kanallar: cp.kanallar.filter(x => !x.kanal.startsWith('p_')) });
    expect(html).not.toContain('personalization kanalının içi');
  });
});

/* ── Koleksiyonun Nabzı (İç Çalışma 04 rev.2 · Y1) ──
   Kart evreninin iki kolu tek panelde okunur. Kanıtsız sayı basmama kuralı
   (§6.10) burada da geçerlidir: migration 044 uygulanmadıysa kart HİÇ
   çizilmez — "0 kazanım" yazmak, ölçülmemiş bir sıfırı ölçülmüş göstermektir. */
describe('Koleksiyonun Nabzı — migration 044 yoksa kart çizilmez', () => {
  it('alan yoksa boş string', () => {
    expect(_koleksiyonNabzi(undefined)).toBe('');
    expect(_koleksiyonNabzi(null)).toBe('');
    expect(_koleksiyonNabzi({ total: 0 })).toBe('');
  });
});

describe('Koleksiyonun Nabzı — iki kol ve Elmas\'ın iki yönü', () => {
  const temel = {
    total: 40, ilk_karti_acan: 7, kazanim: 12, paket: 9, set_tamam: 1,
    elmas_harcanan: 270, elmas_iade: 24, ort_koleksiyon: 4,
    nadirlikler: [
      { nadirlik: 'yaygin', kategori: 'kimlik', count: 8 },
      { nadirlik: 'nadide', kategori: 'hazine', count: 5 },
    ],
  };

  it('özet satırı iki kolu da sayar; Elmas iki yönlü gösterilir', () => {
    const html = _koleksiyonNabzi(temel);
    expect(html).toContain('Koleksiyonun Nabzı');
    expect(html).toContain('<b>7</b> gezgin ilk kartını açtı');
    expect(html).toContain('<b>12</b> kimlik teslimi');
    expect(html).toContain('<b>9</b> paket');
    expect(html).toContain('−270');
    expect(html).toContain('+24');
  });

  /* Dikiş turu bulgusu (19 Ağustos): kimlik kolu meta.kategori'ye kartın KENDİ
     kategorisini yazar (cekirdek|temel|golge|tuzak|bilesik), panel ise hepsini
     tek etiketle çizer — ham kategoriyle gruplayan SQL aynı satırı beş kez
     döndürüyordu. 044 artık iki kola indirger; panel bu sözleşmeye güvenir. */
  it('kol etiketi iki değere indirgenmiştir — kimlik ya da bilgelik', () => {
    const html = _koleksiyonNabzi({
      ...temel,
      nadirlikler: [
        { nadirlik: 'yaygin', kategori: 'kimlik', count: 8 },
        { nadirlik: 'yaygin', kategori: 'hazine', count: 3 },
      ],
    });
    expect(html).toContain('yaygın · kimlik');
    expect(html).toContain('yaygın · bilgelik');
    expect(html).not.toContain('· temel');
    expect(html).not.toContain('· cekirdek');
  });

  it('hazine satırı lapis, kimlik satırı altın çubuk alır', () => {
    const html = _koleksiyonNabzi(temel);
    expect(html).toContain('yaygın · kimlik');
    expect(html).toContain('nadide · bilgelik');
    expect(html.match(/gz-bar--lapis/g) || []).toHaveLength(1);
  });

  it('kimlik kolu sessizse şema/eşik teşhisi düşer (ELLE iş uyarısı)', () => {
    const html = _koleksiyonNabzi({ ...temel, kazanim: 0, ilk_karti_acan: 0 });
    expect(html).toContain('kimlik kolu sessiz');
    expect(html).toContain('kisi_kartlari');
  });

  it('paket hiç açılmamışsa Elmas dolaşmıyor teşhisi düşer', () => {
    const html = _koleksiyonNabzi({ ...temel, paket: 0 });
    expect(html).toContain('Elmas birikiyor ama dönmüyor');
  });

  it('iade harcamanın yarısını geçerse kopya uyarısı düşer', () => {
    const html = _koleksiyonNabzi({ ...temel, elmas_harcanan: 100, elmas_iade: 60 });
    expect(html).toContain('kopya döndürüyor');
  });

  it('teşhisler yarışmaz — kimlik sessizken kopya uyarısı basılmaz', () => {
    const html = _koleksiyonNabzi({ ...temel, kazanim: 0, elmas_harcanan: 100, elmas_iade: 60 });
    expect(html).toContain('kimlik kolu sessiz');
    expect(html).not.toContain('kopya döndürüyor');
  });
});

/* ── Şema Sondası (İç Çalışma 04 rev.2 · Y5) ──
   Sonda migration GEREKTİRMEZ: varlık hata kodundan okunur. Buradaki sözleşme
   şu: sonda asla "uygulanmış" diye yalan söylemez, ve 044/045'in varlığını
   raporun kart_pulse / ritus_pulse ALANLARININ varlığından okur — içleri boş
   olabilir (veri yokluğu ile şema yokluğu ayrı şeylerdir). */
describe('Şema Sondası — sessiz fallback\'in sesi', () => {
  const hepsiVar = [
    { ad: 'Koleksiyon tablosu', ok: true, not: 'x' },
    { ad: 'Altın kartın sahnesi', ok: true, not: 'y' },
    { ad: 'Lapis kartın sahnesi', ok: true, not: 'z' },
  ];

  /* On İki Odanın Denetimi · FAZ 5: yedi yeni nabız (migration 051) altı
     eskinin yanına biner — sonda artık ON ÜÇ alanı öğrenir. Tek noktadan
     tutulur ki her "alanı yoksa" testi ötekileri elle kopyalamak zorunda
     kalmasın (`eksi()` yalnız sınanan alanı çıkarır, gerisi hep TAM kalır —
     bir alanın yokluğu TAM BİR borç saymalı). */
  const TUM_NABIZLAR = {
    kart_pulse: {}, ritus_pulse: {}, esik_pulse: {}, duygu_pulse: {},
    kimlik_pulse: {}, model_pulse: {}, safety_pulse: {}, error_pulse: {},
    notification_pulse: {}, kota_pulse: {}, arac_pulse: {}, bolge_pulse: {},
    paylasim_pulse: {},
  };
  const eksi = (k) => { const r = { ...TUM_NABIZLAR }; delete r[k]; return r; };

  it('on üç nabzın on üçü de varsa borç kapalı der', () => {
    const html = _sondaHTML(hepsiVar, TUM_NABIZLAR);
    expect(html).toContain('şema borcu kapalı');
    expect(html).not.toContain('ELLE bekliyor');
  });

  it('kart_pulse alanı yoksa 044 borcu açık sayılır — içi boş olması yetmez', () => {
    const bosPulse = _sondaHTML(hepsiVar, TUM_NABIZLAR);
    expect(bosPulse).toContain('şema borcu kapalı');       // alanlar VAR, veri yok
    const yok = _sondaHTML(hepsiVar, eksi('kart_pulse'));
    expect(yok).toContain('1 şema borcu açık');
    expect(yok).toContain('migration 044');
  });

  it('ritus_pulse alanı yoksa 045 borcu açık sayılır', () => {
    const yok = _sondaHTML(hepsiVar, eksi('ritus_pulse'));
    expect(yok).toContain('1 şema borcu açık');
    expect(yok).toContain('migration 045');
    expect(yok).toContain('ritüel olaylarını okuyamaz');
  });

  it('esik_pulse alanı yoksa 046 borcu açık sayılır — huni okunamaz', () => {
    const yok = _sondaHTML(hepsiVar, eksi('esik_pulse'));
    expect(yok).toContain('Eşiğin Nabzı (migration 046)');
    expect(yok).toContain('✗ ELLE bekliyor');
    expect(yok).toContain('kadran onboarding hunisini okuyamaz');
  });

  it('duygu_pulse alanı yoksa 048 borcu açık sayılır — yanılma defteri okunamaz (FAZ 15)', () => {
    const yok = _sondaHTML(hepsiVar, eksi('duygu_pulse'));
    expect(yok).toContain('1 şema borcu açık');
    expect(yok).toContain('Yanılma Nabzı (migration 048)');
    expect(yok).toContain('kadran yanılma defterini okuyamaz');
  });

  it('on üç nabız da yoksa on üç borç birden sayılır', () => {
    expect(_sondaHTML(hepsiVar, { overview: {} })).toContain('13 şema borcu açık');
  });

  it('eksik tablo sayılır ve sonucu tek cümleyle söylenir', () => {
    const html = _sondaHTML([
      { ad: 'Koleksiyon tablosu', ok: false, not: 'kazanılan kartlar cihazlar arası taşınmaz' },
      ...hepsiVar.slice(1),
    ], TUM_NABIZLAR);
    expect(html).toContain('1 şema borcu açık');
    expect(html).toContain('cihazlar arası taşınmaz');
  });

  it('kimlik_pulse alanı yoksa 049 borcu açık sayılır — üçgen okunamaz', () => {
    const yok = _sondaHTML(hepsiVar, eksi('kimlik_pulse'));
    expect(yok).toContain('Dönüşümün Nabzı (migration 049)');
    expect(yok).toContain('✗ ELLE bekliyor');
    expect(yok).toContain('üçgenin kaymalarını okuyamaz');
  });

  it('sonda sonucu yoksa çökmez', () => {
    expect(() => _sondaHTML(undefined, undefined)).not.toThrow();
    expect(_sondaHTML(undefined, undefined)).toContain('Şema Sondası');
  });

  it('model_pulse alanı yoksa 050 borcu açık sayılır — eksen seçimi okunamaz', () => {
    const yok = _sondaHTML(hepsiVar, eksi('model_pulse'));
    expect(yok).toContain('Üç Sesin Nabzı (migration 050)');
    expect(yok).toContain('✗ ELLE bekliyor');
    expect(yok).toContain('kadran eksen seçimlerini okuyamaz');
    expect(yok).toContain('1 şema borcu açık');
  });

  /* On İki Odanın Denetimi · FAZ 5 — yedi yeni nabız, tek migration (051),
     ortak sözleşme: alan yoksa borç açık, içi boş olması yetmez. */
  it('safety_pulse alanı yoksa 051 borcu açık sayılır — Emniyet Nabzı okunamaz', () => {
    const yok = _sondaHTML(hepsiVar, eksi('safety_pulse'));
    expect(yok).toContain('Emniyet Nabzı (migration 051)');
    expect(yok).toContain('✗ ELLE bekliyor');
    expect(yok).toContain('1 şema borcu açık');
  });

  it('error_pulse alanı yoksa 051 borcu açık sayılır — Hata Nabzı okunamaz', () => {
    const yok = _sondaHTML(hepsiVar, eksi('error_pulse'));
    expect(yok).toContain('Hata Nabzı (migration 051)');
    expect(yok).toContain('kadran error_logs tablosunu okuyamaz');
    expect(yok).toContain('1 şema borcu açık');
  });

  it('notification_pulse alanı yoksa 051 borcu açık sayılır — Davetin Nabzı okunamaz', () => {
    const yok = _sondaHTML(hepsiVar, eksi('notification_pulse'));
    expect(yok).toContain('Davetin Nabzı (migration 051)');
    expect(yok).toContain('kadran notification_log tablosunu okuyamaz');
    expect(yok).toContain('1 şema borcu açık');
  });

  it('kota_pulse alanı yoksa 051 borcu açık sayılır — Gelirin Nabzı okunamaz', () => {
    const yok = _sondaHTML(hepsiVar, eksi('kota_pulse'));
    expect(yok).toContain('Gelirin Nabzı (migration 051)');
    expect(yok).toContain('kadran paywall hunisini okuyamaz');
    expect(yok).toContain('1 şema borcu açık');
  });

  it('arac_pulse alanı yoksa 051 borcu açık sayılır — Araç Nabzı okunamaz', () => {
    const yok = _sondaHTML(hepsiVar, eksi('arac_pulse'));
    expect(yok).toContain('Araç Nabzı (migration 051)');
    expect(yok).toContain('1 şema borcu açık');
  });

  it('bolge_pulse alanı yoksa 051 borcu açık sayılır — Bölge Nabzı okunamaz', () => {
    const yok = _sondaHTML(hepsiVar, eksi('bolge_pulse'));
    expect(yok).toContain('Bölge Nabzı (migration 051)');
    expect(yok).toContain('1 şema borcu açık');
  });

  it('paylasim_pulse alanı yoksa 051 borcu açık sayılır — Halkanın Nabzı okunamaz', () => {
    const yok = _sondaHTML(hepsiVar, eksi('paylasim_pulse'));
    expect(yok).toContain('Halkanın Nabzı (migration 051)');
    expect(yok).toContain('kadran paylaşım hunisini okuyamaz');
    expect(yok).toContain('1 şema borcu açık');
  });

  /* Üç Sesin tablosu (İç Çalışma 08 rev.2 · FAZ 6): tablo VARLIĞI ile içerik
     DOLULUĞU ayrı ölçülür — "tablo var" demek "üç ses konuşuyor" demek
     değildir. Sonda okunamadıysa satır hiç çizilmez: kadran susar, yalan
     söylemez. */
  const altiAlanTam = TUM_NABIZLAR;

  it('içerik sondası okunamadıysa "Üç sesin içeriği" satırı hiç çizilmez', () => {
    const html = _sondaHTML(hepsiVar, altiAlanTam);
    expect(html).not.toContain('Üç sesin içeriği');
    expect(html).toContain('şema borcu kapalı');
  });

  it('üç eksenin üçü de doluysa içerik satırı uygulanmış der, borç artmaz', () => {
    const html = _sondaHTML(hepsiVar, altiAlanTam, { dolu: 3, toplam: 3 });
    expect(html).toContain('Üç sesin içeriği');
    expect(html).toContain('✓ uygulanmış');
    expect(html).toContain('şema borcu kapalı');
  });

  it('eksenlerden biri doluysa borç açılır ve kaçta kaç olduğu söylenir', () => {
    const html = _sondaHTML(hepsiVar, altiAlanTam, { dolu: 1, toplam: 3 });
    expect(html).toContain('✗ ELLE bekliyor');
    expect(html).toContain('1/3');
    expect(html).toContain('1 şema borcu açık');
  });

  /* DENETİM 2026-08-31: satırın hükmü ile borç sayacı ayrı ifadelerden
     okunuyordu — tablo VAR ama INSERT hiç koşmamışken (0/0) satır ✗ diyor,
     sayaç saymıyordu. Kadran kendi kendisiyle çelişiyordu. */
  it('tablo boşken (0/0) satır da sayaç da borcu görür — çelişki yok', () => {
    const html = _sondaHTML(hepsiVar, altiAlanTam, { dolu: 0, toplam: 0 });
    expect(html).toContain('0/0 eksen dolu');
    expect(html).toContain('✗ ELLE bekliyor');
    expect(html).toContain('1 şema borcu açık');
    expect(html).not.toContain('şema borcu kapalı');
  });
});

/* ── Ritüellerin Nabzı (İç Çalışma 05 rev.3 · boşluk A) ──
   Panelin sözleşmesi üç maddedir: (1) migration 045 yoksa hiç çizilmez —
   boş kart ölçüm varmış izlenimi verir (§6.2); (2) gezgin sayısı ile satır
   sayısı karıştırılmaz; (3) teşhis eşikleri yarışmaz, en ağırı konuşur. */
describe('Ritüellerin Nabzı — panel sözleşmesi', () => {
  const dolu = {
    total: 40, basladi: 20, tamam: 14, birakti: 6,
    baslayan_gezgin: 10, tamamlayan_gezgin: 8,
    soz_veren: 9, hesap_veren: 7, soz_atlanan: 2, tutulan_soz: 12,
    ritueller: [
      { ad: 'gunluk-ritus', basladi: 9, tamam: 7, birakti: 2, gezgin: 9 },
      { ad: 'hayal', basladi: 5, tamam: 3, birakti: 2, gezgin: 4 },
      { ad: 'kendinle-konusma', basladi: 3, tamam: 2, birakti: 1, gezgin: 3 },
      { ad: 'degerlendirme', basladi: 1, tamam: 1, birakti: 0, gezgin: 1 },
      { ad: 'engel-atlasi', basladi: 2, tamam: 0, birakti: 0, gezgin: 2 },
      { ad: 'dinlenme', basladi: 0, tamam: 1, birakti: 0, gezgin: 1 },
      { ad: 'derin-calisma', basladi: 0, tamam: 0, birakti: 1, gezgin: 1 },
      { ad: 'sefer', basladi: 0, tamam: 0, birakti: 0, gezgin: 1 },
      { ad: 'seri-muhru', basladi: 0, tamam: 0, birakti: 0, gezgin: 1 },
    ],
    terk_adimlari: [{ ad: 'gunluk-ritus', adim: 2, count: 2 }],
  };

  it('migration 045 uygulanmadıysa hiç çizilmez — kanıtsız sıfır basmaz', () => {
    expect(_ritusNabzi(undefined)).toBe('');
    expect(_ritusNabzi(null)).toBe('');
    expect(_ritusNabzi({ total: 0 })).toBe('');
  });

  it('gezgin sayısı satır sayısından ayrı okunur', () => {
    const html = _ritusNabzi(dolu);
    expect(html).toContain('<b>10</b> gezgin bir ritüele başladı');
    expect(html).toContain('<b>8</b>');
    expect(html).toContain('<b>6</b> kez yarıda bırakıldı');
  });

  it('taahhüt döngüsünün iki ucu yazılır: söz ve akşam hesabı', () => {
    const html = _ritusNabzi(dolu);
    expect(html).toContain('Söz veren <b>9</b>');
    expect(html).toContain('akşam hesabını veren <b>7</b>');
    expect(html).toContain('tutulan söz <b>12</b>');
    expect(html).toContain('atlanan <b>2</b>');
  });

  it('ritüel adları Türkçeye çevrilir — kod adı ekrana sızmaz', () => {
    const html = _ritusNabzi(dolu);
    expect(html).toContain('Kendinle Konuşmak');
    expect(html).toContain('Başarı Günlüğü');
    expect(html).not.toContain('kendinle-konusma');
  });

  it('hiç tamamlanmamışsa huninin çıkışı kapalı der (en ağır teşhis önce)', () => {
    const html = _ritusNabzi({ ...dolu, tamamlayan_gezgin: 0 });
    expect(html).toContain('huninin çıkışı kapalı');
    expect(html).not.toContain('döngü yarım kapanıyor');
  });

  it('sessiz direkler adlarıyla söylenir', () => {
    const html = _ritusNabzi({
      ...dolu,
      ritueller: dolu.ritueller.slice(0, 5),
    });
    expect(html).toContain('5 direğe hiç dokunulmadı');
    expect(html).toContain('Başarı Günlüğü');
    expect(html).toContain('Derin Çalışma');
  });

  it('söz verip hesaba dönmeyen çoğunluksa döngünün yarım kaldığını söyler', () => {
    const html = _ritusNabzi({ ...dolu, hesap_veren: 3 });
    expect(html).toContain('döngü yarım kapanıyor');
  });

  it('terk adımı yalnız bilinen adımda yazılır (adim=0 ölçülmemiştir)', () => {
    expect(_ritusNabzi(dolu)).toContain('2.</b> adım');
    const olcusuz = _ritusNabzi({ ...dolu, terk_adimlari: [{ ad: 'hayal', adim: 0, count: 5 }] });
    expect(olcusuz).not.toContain('adım');
  });

  it('bozuk/eksik alanlarda çökmez', () => {
    expect(() => _ritusNabzi({ total: 3, ritueller: null, terk_adimlari: 'x' })).not.toThrow();
  });
});

/* Dikiş testi: panelin ad haritası 00f'teki kapalı kümenin AYNASIDIR.
   İkisi ayrışırsa panel yeni bir ritüeli "sessiz direk" sanır ve admin'e
   yanlış teşhis basar — sessiz bir yalan, gürültülü bir hatadan beterdir. */
describe('küme aynası — 00f ile 13q aynı on ritüeli tanır', () => {
  it('_RITUS (00f) ile _RITUS_AD (13q) anahtarları örtüşür', () => {
    const kok = resolve(dirname(fileURLToPath(import.meta.url)), '../js/parts');
    const oku = (f, re) => {
      const m = readFileSync(`${kok}/${f}`, 'utf-8').match(re);
      return new Set([...m[1].matchAll(/'([a-z-]+)'/g)].map(x => x[1]));
    };
    const kume = oku('00f-kullanim-nabzi.js', /const _RITUS = new Set\(\[([\s\S]*?)\]\)/);
    const adlar = oku('13q-gozlemevi.js', /const _RITUS_AD = \{([\s\S]*?)\n\};/);
    expect([...kume].sort()).toEqual([...adlar].sort());
    expect(kume.size).toBe(10);
  });
});

/* ── Eşiğin Nabzı (İç Çalışma 06 rev.2 · FAZ 4) ──
   Huninin cevabı basamakların ARASINDADIR: kartın işi en küçük sayıyı
   göstermek değil, en büyük DÜŞÜŞÜ adlandırmak. Bir de §6.10: payda yoksa
   oran da yoktur — kanıtsız değer gösterilmez. */
const esikTam = {
  total: 120,
  perde: { n: 40, atlandi: 6, ort_ms: 3400, kat1: 25, kat2: 15 },
  dil_kapisi: 12,
  huni: {
    basladi: 30, dusunceler: 28, inanclar: 26, duygular: 12, davranislar: 11,
    sentez_ok: 10, sentez_fallback: 1, dogus: 10, atladi: 4,
  },
  esik_ekrani: { acildi: 22, kapandi: 21 },
};

describe('Eşiğin Nabzı — migration 046 yoksa kart hiç çizilmez', () => {
  it('alan yoksa boş string', () => {
    expect(_esikNabzi(undefined)).toBe('');
    expect(_esikNabzi(null)).toBe('');
    expect(_esikNabzi({})).toBe('');
  });
  it('total 0 ise çizilmez — boş kart ölçüm varmış izlenimi verir', () => {
    expect(_esikNabzi({ total: 0, huni: { basladi: 5 } })).toBe('');
  });
});

describe('Eşiğin Nabzı — huninin okunuşu', () => {
  it('altı basamak da çubuk satırı olarak çizilir', () => {
    const h = _esikNabzi(esikTam);
    ['Eşiğe geldi', 'Düşünceler', 'İnançlar', 'Duygular', 'Davranışlar', 'Kartını mühürledi']
      .forEach(ad => expect(h).toContain(ad));
  });

  it('en büyük DÜŞÜŞÜ adlandırır — en küçük sayıyı değil', () => {
    // İnançlar 26 → Duygular 12: %54 kayıp. Davranışlar (11) daha küçük bir
    // sayı ama oradaki kayıp yalnız %8 — teşhis Duygular demeli.
    const h = _esikNabzi(esikTam);
    expect(h).toContain('Duygular</b> basamağında düşüyor');
    expect(h).toContain("%54'i geçmiyor");
  });

  it('kimse eşiğe gelmediyse teşhis ölçümün yeniliğini söyler, kayıp uydurmaz', () => {
    const h = _esikNabzi({ total: 3, huni: { basladi: 0, dogus: 0 } });
    expect(h).toContain('eşiğe kimse gelmedi');
    expect(h).not.toContain('basamağında düşüyor');
  });

  it('gelen var ama mühürleyen yoksa: çıkış kapalı', () => {
    const h = _esikNabzi({ total: 9, huni: { basladi: 7, dusunceler: 5, dogus: 0 } });
    expect(h).toContain('huninin çıkışı kapalı');
  });

  it('sentez fallback oranı beşte biri aşarsa teşhis onu söyler', () => {
    const h = _esikNabzi({
      total: 20,
      huni: { basladi: 10, dusunceler: 10, inanclar: 10, duygular: 10,
              davranislar: 10, sentez_ok: 6, sentez_fallback: 4, dogus: 9 },
    });
    expect(h).toContain("kart LLM'siz doğuyor");
  });

  it('perde satırı: atlama + ortalama süre + iki kademe', () => {
    const h = _esikNabzi(esikTam);
    expect(h).toContain('Perde <b>40</b> kez indi');
    expect(h).toContain("<b>6</b>'i dokunuşla atlandı");
    expect(h).toContain('ortalama <b>3.4 sn</b> izlendi');
    expect(h).toContain('tam tören <b>25</b> / kısa nefes <b>15</b>');
  });

  it('§6.10 — ölçülmemiş süre sayı olarak gösterilmez', () => {
    const h = _esikNabzi({ total: 5, perde: { n: 5, atlandi: 0, ort_ms: 0, kat1: 5, kat2: 0 }, huni: { basladi: 1, dogus: 1 } });
    expect(h).toContain('Perde <b>5</b> kez indi');
    expect(h).not.toContain('ortalama');
  });

  it('perde hiç inmediyse perde satırı hiç yazılmaz', () => {
    const h = _esikNabzi({ total: 4, huni: { basladi: 4, dogus: 4 } });
    expect(h).not.toContain('Perde <b>');
  });
});

/* Dikiş testi: panelin basamak anahtarları 00f'nin İKİ kapalı kümesinden
   beslenir — `basladi`/`dogus` olay adıdır (_ESIK_OLAY), dört kategori ise
   ikincil eksendir (_ESIK_PREV). Biri yeniden adlandırılırsa panel o
   basamağı sessizce 0 sanır: gürültülü bir hata değil, sessiz bir yalan. */
describe('küme aynası — 13q basamakları 00f kümelerinde var', () => {
  it('_ESIK_BASAMAK anahtarları _ESIK_OLAY ∪ _ESIK_PREV içinde', () => {
    const kok = resolve(dirname(fileURLToPath(import.meta.url)), '../js/parts');
    const src00f = readFileSync(`${kok}/00f-kullanim-nabzi.js`, 'utf-8');
    const oku = (re) => new Set([...src00f.match(re)[1].matchAll(/'([a-z-]+)'/g)].map(x => x[1]));
    const olay = oku(/const _ESIK_OLAY = new Set\(\[([\s\S]*?)\]\)/);
    const prev = oku(/const _ESIK_PREV = new Set\(\[([\s\S]*?)\]\)/);
    const birlesim = new Set([...olay, ...prev]);

    const src13q = readFileSync(`${kok}/13q-gozlemevi.js`, 'utf-8');
    const basamak = [...src13q.match(/const _ESIK_BASAMAK = \[([\s\S]*?)\n\];/)[1]
      .matchAll(/\['([a-z-]+)',/g)].map(x => x[1]);

    expect(basamak.length).toBe(6);
    basamak.forEach(k => expect(birlesim.has(k)).toBe(true));
    expect(olay.size).toBe(8);
  });
});

/* ── Yanılma Nabzı (13D §10 · K13 · FAZ 15) ──
   Panelin sözleşmesi üçtür: (1) migration 048 yoksa hiç çizilmez — boş
   kart ölçüm varmış izlenimi verir (§6.2); (2) oran payda 5'in (13D
   DG_YANILMA_MIN_N) altındayken GÖSTERİLMEZ (§6.10); (3) sohbet, veri ne
   olursa olsun "eşiği aştı" listesine hiç girmez (K13 — sohbet kapanmaz). */
describe('Yanılma Nabzı — migration 048 yoksa kart hiç çizilmez', () => {
  it('alan yoksa boş string', () => {
    expect(_duyguNabzi(undefined)).toBe('');
    expect(_duyguNabzi(null)).toBe('');
    expect(_duyguNabzi({ total: 0 })).toBe('');
  });

  it('total varken yuzeyler boş dizi ise de boş string', () => {
    expect(_duyguNabzi({ total: 5, yuzeyler: [] })).toBe('');
  });
});

describe('Yanılma Nabzı — okunuş', () => {
  it('n < 5 iken oran GÖSTERİLMEZ, ham sayı görünür', () => {
    const h = _duyguNabzi({ total: 4, yuzeyler: [{ yuzey: 'secici', konustu: 4, duzeltildi: 2 }] });
    expect(h).toContain('Seçici sıralaması');
    expect(h).toContain('4 · 2✕'); // ham sayı — oran DEĞİL
    expect(h).not.toMatch(/\d+ · \d+✕ · %\d/); // n>=5'in dolu-val kalıbı burada YOK
    expect(h).toContain('henüz hiçbir yüzey 5 konuşmaya ulaşmadı');
  });

  it('n >= 5 iken oran görünür ve yüzde olarak yazılır', () => {
    const h = _duyguNabzi({ total: 5, yuzeyler: [{ yuzey: 'push', konustu: 5, duzeltildi: 2 }] });
    expect(h).toContain('Bildirim');
    expect(h).toContain('%40');
  });

  it('eşiği (%34) AŞAN yüzey tanı satırında adıyla anılır', () => {
    const h = _duyguNabzi({ total: 5, yuzeyler: [{ yuzey: 'kart', konustu: 5, duzeltildi: 2 }] });
    expect(h).toContain('Kart sunumu');
    expect(h).toContain('eşiği aştı');
  });

  it('sohbet eşiği aşsa bile "eşiği aştı" listesine GİRMEZ — K13 sohbet istisnası', () => {
    const h = _duyguNabzi({ total: 20, yuzeyler: [{ yuzey: 'sohbet', konustu: 20, duzeltildi: 18 }] });
    expect(h).toContain('Sohbet');
    expect(h).not.toContain('eşiği aştı');
  });

  it('bilinmeyen bir yüzey adı çökmez, kendi adıyla düşer', () => {
    expect(() => _duyguNabzi({ total: 5, yuzeyler: [{ yuzey: 'uydurma', konustu: 5, duzeltildi: 1 }] })).not.toThrow();
  });
});

/* ── Dönüşümün Nabzı (İç Çalışma 07 rev.2 · boşluk D) ──
   Panelin sözleşmesi: kanıtsız değer gösterilmez (okuma köşesi ritus
   kanalından gelir; o kanal sessizse köşe "—" çizilir, 0 DEĞİL), ve
   teşhis cümlesi en ağır bulguyu seçer. */
describe('Dönüşümün Nabzı — üçgenin kuzey yıldızı', () => {
  it('veri yoksa panel hiç çizilmez — boş kadran yalan söylemez', () => {
    expect(_donusumNabzi(undefined, undefined)).toBe('');
    expect(_donusumNabzi(null, null)).toBe('');
    expect(_donusumNabzi({ total: 0 }, {})).toBe('');
  });

  it('okuma kanalı sessizse köşe "—" çizilir, sıfır değil', () => {
    const html = _donusumNabzi({ total: 5, tasarlayan: 3, kayma: 1 }, { ritueller: [] });
    expect(html).toContain('>—<');
    expect(html).toContain('Okudu');
  });

  it('okuma köşesi ritus kanalından okunur — kimlik kanalında sayılmaz', () => {
    const html = _donusumNabzi(
      { total: 5, tasarlayan: 3, kayma: 2, kayan_gezgin: 2 },
      { ritueller: [{ ad: 'oik-okuma', gezgin: 7, tamam: 19 }] },
    );
    expect(html).toContain('7');
    expect(html).toContain('19');
  });

  it('kimse tasarlamadıysa en ağır teşhis seçilir', () => {
    const html = _donusumNabzi({ total: 4, tasarlayan: 0, kayma: 4 }, {});
    expect(html).toContain('lapis köşesi boş');
  });

  it('kart tasarlanıp okunmuyorsa Geçiş Protokolü uyarısı çıkar', () => {
    const html = _donusumNabzi(
      { total: 4, tasarlayan: 4 },
      { ritueller: [{ ad: 'oik-okuma', gezgin: 0, tamam: 0 }] },
    );
    expect(html).toContain('kâğıtta kaldı');
  });

  it('kayma yokken yalnız devir varsa davranış köşesi sessiz sayılır', () => {
    const html = _donusumNabzi({ total: 3, tasarlayan: 2, kayma: 0, devir: 3 }, { ritueller: [{ ad: 'oik-okuma', gezgin: 2, tamam: 5 }] });
    expect(html).toContain('kendi hükmünü vermedi');
  });

  /* Denetim bulgusu (30 Ağu 2026): teşhis `gezgin`e bağlıydı — oysa ritus
     tarafında `gezgin` COUNT(DISTINCT user_id)'dir ve okumayı AÇIP BIRAKAN
     da onu doldurur. Tek kişi portalı açıp kapattığında sayı 1 oluyor,
     "kâğıtta kaldı" teşhisi hiç söylenmiyordu — tam da söylemesi gereken
     an. Kapı artık mühürde: kanıt `tamam`dır. */
  it('gezgin girmiş ama hiç mühürlememişse teşhis yine kâğıtta kaldı der', () => {
    const html = _donusumNabzi(
      { total: 4, tasarlayan: 4 },
      { ritueller: [{ ad: 'oik-okuma', gezgin: 6, tamam: 0 }] },
    );
    expect(html).toContain('kâğıtta kaldı');
  });

  /* Köşenin adı kanıtına uymalı (§6.10): `gezgin` mührü değil girişi sayar,
     o yüzden altyazı "mühürleyen" diyemez. */
  it('Okudu köşesi mühürleyen değil giren gezgin diye adlandırılır', () => {
    const html = _donusumNabzi(
      { total: 5, tasarlayan: 3, kayma: 2 },
      { ritueller: [{ ad: 'oik-okuma', gezgin: 7, tamam: 19 }] },
    );
    expect(html).toContain('giren gezgin');
    expect(html).not.toContain('mühürleyen');
  });
});

/* ── Üç Sesin Nabzı (İç Çalışma 08 rev.2 · boşluk A) ──
   Panelin sözleşmesi: (1) iki kol da boşsa hiç çizilmez — kanıtsız sıfır
   basılmaz (§6.10); (2) yalnız TUR varsa bile çizilir — seçim hiç
   yapılmamış olabilir ama yaşanmış kullanım söyleyecek sözü vardır;
   (3) kilit ile seçim yan yana durur ama toplanmaz (K1). */
describe('Üç Sesin Nabzı — panel sözleşmesi', () => {
  it('boş veri panel çizmez', () => {
    expect(_sesNabzi(null)).toBe('');
    expect(_sesNabzi(undefined)).toBe('');
    expect(_sesNabzi({ total: 0 })).toBe('');
  });

  it('yalnız tur varsa panel ÇİZİLİR — seçim olmasa da yaşanan kullanım söz söyler', () => {
    const html = _sesNabzi({ total: 0, eksen_tur: [{ model: 'oz', tur: 5, gezgin: 2 }] });
    expect(html).not.toBe('');
    expect(html).toContain('Öz ◆ bireysel');
    expect(html).toContain('yaşanan kullanım');
  });

  it('kilit varken seçim yoksa teşhis kapıyı söyler', () => {
    const html = _sesNabzi({ total: 3, kilit: 3, kilitlenen: 2, secim: 0 });
    expect(html).toContain("Pro'nun arkasında");
  });

  it('tek ses baskınsa teşhis üçün bire düştüğünü söyler', () => {
    const html = _sesNabzi({
      total: 5, secim: 5, secen: 3,
      eksen_tur: [{ model: 'oz', tur: 95, gezgin: 9 }, { model: 'bag', tur: 5, gezgin: 1 }],
    });
    expect(html).toContain('tek sese düşmüş');
    expect(html).toContain('%95');
  });

  it('payda yoksa köşe sayı yerine "—" koyar — uydurma sıfır değil', () => {
    const html = _sesNabzi({ total: 2, secim: 2, secen: 0, eksen_tur: [{ model: 'oz', tur: 4, gezgin: 1 }] });
    expect(html).toContain('>—<');
    expect(html).toContain('Seçti');
  });

  it('geçiş matrisi eksen adlarıyla çizilir', () => {
    const html = _sesNabzi({ total: 4, secim: 4, secen: 2, gecis: [{ from: 'oz', to: 'bag', n: 4 }] });
    expect(html).toContain('Öz ◆ bireysel → Bağ ❖ ilişki');
    expect(html).toContain('geçiş matrisi');
  });

  it('kilit dağılımı lapis çubukla çizilir — kullanım değil, karşılanmamış talep', () => {
    const html = _sesNabzi({ total: 3, secim: 1, secen: 1, kilit: 2, kilitlenen: 1, kilit_dagilim: [{ model: 'eser', n: 2, gezgin: 1 }] });
    expect(html).toContain('karşılanmamış talep');
    expect(html).toContain('Eser ▲ iş');
    expect(html).toContain('gz-bar--lapis');
  });

  it('sessiz düşüş ayrı satırda söylenir', () => {
    const html = _sesNabzi({ total: 2, secim: 2, secen: 1, dus: 1, dusen: 1 });
    // satir() etiketi esc()'ten geçer — apostrof &#39;ya döner, o yüzden
    // escape'siz parça sınanır.
    expect(html).toContain('dönen eksen');
    expect(html).toContain('1 kez · 1 gezgin');
  });

  it('bozuk/eksik alanlarda çökmez', () => {
    expect(() => _sesNabzi({ total: 3, eksen_tur: null, secim_dagilim: 'x', gecis: 7 })).not.toThrow();
  });
});

/* ══════════════════════════════════════════════════════════════════
   On İki Odanın Denetimi (İç Çalışma 08-19) · FAZ 5 — Gözlemevi kartları
   Yedi yeni kart migration 051'in yedi bloğunu okur. Sözleşme öncekilerle
   birebir aynı: kolun ikisi de boşsa kart HİÇ çizilmez (kanıtsız sıfır
   yok, §6.10), payda yoksa oran gösterilmez, teşhis en ağırdan konuşur.
   ══════════════════════════════════════════════════════════════════ */

describe('FAZ 5 — yedi kart, boş veriyle çizilmez (§6.10 kanıtı)', () => {
  const fonksiyonlar = [
    ['_emniyetNabzi', _emniyetNabzi],
    ['_hataNabzi', _hataNabzi],
    ['_davetNabzi', _davetNabzi],
    ['_gelirNabzi', _gelirNabzi],
    ['_aracNabzi', _aracNabzi],
    ['_bolgeNabzi', _bolgeNabzi],
    ['_halkaNabzi', _halkaNabzi],
  ];

  it.each(fonksiyonlar)('%s: undefined/null/{} için boş string döner', (_ad, fn) => {
    expect(fn(undefined)).toBe('');
    expect(fn(null)).toBe('');
    expect(fn({})).toBe('');
  });
});

describe('Emniyet Nabzı — sinyal → kart → lütuf (15·B)', () => {
  it('sp yoksa ya da total 0 ise çizilmez', () => {
    expect(_emniyetNabzi({ total: 0 })).toBe('');
  });

  it('sinyal var kart yoksa teşhis yazar (soğuma penceresi şüphesi)', () => {
    const html = _emniyetNabzi({ total: 3, olaylar: [{ olay: 'crisis_signal', n: 3, gezgin: 2 }] });
    expect(html).toContain('sinyal yakalanıyor ama kart gösterilmiyor');
    expect(html).toContain('20 dk soğuma penceresi');
  });

  it('sinyal ve kart birlikteyse teşhis yazılmaz', () => {
    const html = _emniyetNabzi({
      total: 4,
      olaylar: [{ olay: 'crisis_signal', n: 2, gezgin: 2 }, { olay: 'crisis_card', n: 2, gezgin: 2 }],
    });
    expect(html).not.toContain('soğuma penceresi');
  });

  it('kaçırma oranı ölçmediğini kartın altında her zaman söyler', () => {
    const html = _emniyetNabzi({ total: 1, olaylar: [{ olay: 'crisis_grace', n: 1, gezgin: 1 }] });
    expect(html).toContain('kaçırma oranını ölçmez');
    expect(html).toContain('sentetik bir kriz eval setiyle ölçülür');
  });

  it('üç köşe Sinyal · Kart · Lütuf adlarıyla çizilir', () => {
    const html = _emniyetNabzi({
      total: 3,
      olaylar: [
        { olay: 'crisis_signal', n: 1 }, { olay: 'crisis_card', n: 1 }, { olay: 'crisis_grace', n: 1 },
      ],
    });
    expect(html).toContain('Sinyal');
    expect(html).toContain('Kart');
    expect(html).toContain('Lütuf');
  });
});

describe('Hata Nabzı — hangi hata tekrarlıyor (14·B)', () => {
  it('tek etiket toplamın %40+\'ını taşıyorsa teşhis yazar', () => {
    const html = _hataNabzi({
      total: 10, affected_users: 4,
      top_labels: [{ label: 'kumComposeFromText', n: 5 }, { label: 'other', n: 5 }],
    });
    expect(html).toContain("hataların %50'i tek etikette toplanıyor");
    expect(html).toContain('kumComposeFromText');
  });

  it('dağılım dengeliyse (%40 altı) teşhis yazılmaz', () => {
    const html = _hataNabzi({
      total: 10, affected_users: 4,
      top_labels: [{ label: 'a', n: 3 }, { label: 'b', n: 3 }, { label: 'c', n: 4 }],
    });
    expect(html).not.toContain('tek etikette toplanıyor');
  });

  it('label alanı esc() üzerinden geçer — XSS payload metne dönüşür', () => {
    const html = _hataNabzi({
      total: 10, affected_users: 1,
      top_labels: [{ label: '<img src=x onerror=alert(1)>', n: 9 }],
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('error_message/error_stack alanlarını hiç istemez — yalnız label/total/affected_users okunur', () => {
    const html = _hataNabzi({ total: 2, affected_users: 1, top_labels: [], error_message: 'sızmamalı' });
    expect(html).not.toContain('sızmamalı');
  });
});

describe('Davetin Nabzı — motor koşuyor mu, dönüş var mı (11·B)', () => {
  it('tip_dagilim dizisi yoksa (alan gelmediyse) çizilmez', () => {
    expect(_davetNabzi({ total: 0 })).toBe('');
  });

  it('gönderim hiç yoksa "motor koşmamış" teşhisini yazar', () => {
    const html = _davetNabzi({ total: 0, tip_dagilim: [] });
    expect(html).toContain('motor bu pencerede hiç koşmamış');
    expect(html).toContain('pg_cron kurulu mu?');
  });

  it("gönderim var tıklanma yoksa BOŞLUK der — \"kimse tıklamadı\" DEMEZ", () => {
    /* Cümle FAZ 5'te tazelendi: eskiden "notificationclick atıfı takılı
       değil" diyordu ve o iddia atıf zinciri kurulunca YANLIŞ hâle geldi.
       Test artık cümlenin harfini değil TAAHHÜDÜNÜ ölçüyor: sıfırın bir
       sonuç değil bir boşluk olduğunu söylemek, ve ELLE bekleyeni adıyla
       anmak. Harfe bağlı bir test, metin her tazelendiğinde sahte kırmızı
       verir — ve sahte kırmızı, kapıya olan güveni yer. */
    const html = _davetNabzi({ total: 5, tip_dagilim: [{ tip: 'morning', gonderim: 5, tiklanma: 0 }] });
    expect(html).toContain('bu sıfır bir sonuç değil bir boşluk');
    expect(html).toContain('ELLE bekliyor');
    /* Olumsuz iddia KELİMEYE değil TAAHHÜDE bağlanır. İlk yazımda
       `not.toContain('kimse tıklamadı')` yazdım ve test kırmızı verdi —
       çünkü kart tam da o kelimeleri "ayırt edemediğimiz iki durumdan biri"
       olarak sayıyor. Yasak olan şey kelimeyi ANMAK değil, o hükmü VERMEK.
       Kartın taahhüdü tek cümlede: iki durumu ayırt edemediğini söylemek. */
    expect(html).toContain('AYIRT EDEMİYORUZ');
  });

  it('tıklanma da varsa "motor koşmamış" teşhisi yazılmaz — sütun kendi verisiyle konuşur (FAZ 5)', () => {
    const html = _davetNabzi({ total: 5, tip_dagilim: [{ tip: 'morning', gonderim: 5, tiklanma: 2 }] });
    expect(html).not.toContain('motor bu pencerede');
    expect(html).not.toContain('dönüş yok');
    expect(html).toContain('dönüş oranı %40');
  });

  /* FAZ 5 (İç Çalışma 11 · boşluk B) — dürüst not KALDIRILMADI, KOŞULLU
     hâle geldi: veri geldiğinde (tiklanma > 0) sütun konuşur, gelmediğinde
     bugünkü not AYNEN durur. */
  it('tiklanma 0 ise alt not eski dürüst metni AYNEN korur', () => {
    const html = _davetNabzi({ total: 5, tip_dagilim: [{ tip: 'morning', gonderim: 5, tiklanma: 0 }] });
    expect(html).toContain('Tık sütunu henüz konuşmuyor');
    expect(html).toContain('AYIRT EDEMİYORUZ');
  });

  it('tiklanma > 0 ise alt not "artık konuşuyor"a döner, eski dürüst not YAZILMAZ', () => {
    const html = _davetNabzi({ total: 5, tip_dagilim: [{ tip: 'morning', gonderim: 5, tiklanma: 2 }] });
    expect(html).toContain('Tık sütunu artık konuşuyor');
    expect(html).not.toContain('Tık sütunu henüz konuşmuyor');
    expect(html).toContain('2');
  });

  it('tip alanı esc() üzerinden geçer (sunucudan gelir)', () => {
    const html = _davetNabzi({ total: 1, tip_dagilim: [{ tip: '<b>x</b>', gonderim: 1, tiklanma: 0 }] });
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;');
  });

  it('title/body alanlarını hiç istemez — yalnız tip + sayı okunur', () => {
    const html = _davetNabzi({ total: 1, tip_dagilim: [{ tip: 'morning', gonderim: 1, tiklanma: 0 }], title: 'sızmamalı', body: 'sızmamalı2' });
    expect(html).not.toContain('sızmamalı');
  });
});

describe('Gelirin Nabzı — paywall hunisinin ilk basamakları (16·C)', () => {
  it('duvar var kapı yoksa teşhis yazar', () => {
    const html = _gelirNabzi({ total: 3, huni: [{ olay: 'duvar', n: 3, gezgin: 2 }] });
    expect(html).toContain('duvara çarpılıyor ama teklif hiç açılmıyor');
  });

  it('kapı var sheet yoksa teşhis yazar (duvar da varsa en ağırı — duvar/kapı ikilisi — önce konuşur)', () => {
    const html = _gelirNabzi({ total: 2, huni: [{ olay: 'gate', n: 2, gezgin: 1 }] });
    expect(html).toContain("teklif görülüyor, sheet'e geçilmiyor");
  });

  it('duvar ve kapı birlikte yoksa "kapı yok" teşhisi, "sheet yok" teşhisinin ÖNÜNE geçer', () => {
    const html = _gelirNabzi({ total: 3, huni: [{ olay: 'duvar', n: 3, gezgin: 1 }] });
    expect(html).toContain('duvara çarpılıyor');
    expect(html).not.toContain("sheet'e geçilmiyor");
  });

  it('satın alma sayısını ölçmediğini kartın altında her zaman söyler', () => {
    const html = _gelirNabzi({ total: 1, huni: [{ olay: 'iptal', n: 1, gezgin: 1 }] });
    expect(html).toContain('satın alma sayısını ölçmez');
    expect(html).toContain("RevenueCat'in defteridir");
  });

  it('dört köşe Duvar · Kapı · Sheet · İptal adlarıyla çizilir', () => {
    const html = _gelirNabzi({
      total: 4,
      huni: [{ olay: 'duvar', n: 1 }, { olay: 'gate', n: 1 }, { olay: 'sheet', n: 1 }, { olay: 'iptal', n: 1 }],
    });
    expect(html).toContain('Duvar');
    expect(html).toContain('Kapı');
    expect(html).toContain('Sheet');
    expect(html).toContain('İptal');
  });
});

describe('Araç Nabzı — öneri kabul mü ret mi görüyor (09·D)', () => {
  it('öneri var, dokunuş (onay/ret) yoksa teşhis yazar', () => {
    const html = _aracNabzi({ total: 3, matris: [{ arac: 'soz', olay: 'oner', n: 3 }] });
    expect(html).toContain('chip çiziliyor ama kimse dokunmuyor');
    expect(html).toContain('sessizce kayboluyor');
  });

  it('onay ya da ret varsa teşhis yazılmaz', () => {
    const html = _aracNabzi({
      total: 2,
      matris: [{ arac: 'soz', olay: 'oner', n: 1 }, { arac: 'soz', olay: 'onayla', n: 1 }],
    });
    expect(html).not.toContain('sessizce kayboluyor');
  });

  it('araç bazında çubuk her aracın öneri/onay/ret dağılımını gösterir', () => {
    const html = _aracNabzi({
      total: 3,
      matris: [
        { arac: 'not', olay: 'oner', n: 2 }, { arac: 'not', olay: 'onayla', n: 1 },
        { arac: 'imge', olay: 'reddet', n: 1 },
      ],
    });
    expect(html).toContain('Not');
    expect(html).toContain('İmge');
    expect(html).toContain('2 öneri · 1 onay · 0 ret');
  });
});

describe('Bölge Nabzı — Bugün\'ün altına kaç kişi iniyor (18·A)', () => {
  it('bugun_gorenler 0/eksikse kart hiç çizilmez (payda kuralı, K3+§6.10)', () => {
    expect(_bolgeNabzi({ total: 5, bugun_gorenler: 0, bolgeler: [{ bolge: 'ayrac', gezgin: 3 }] })).toBe('');
    expect(_bolgeNabzi({ total: 5, bolgeler: [] })).toBe('');
  });

  it('ayraç erişimi %50 altındaysa STÜDYO fold teşhisini yazar', () => {
    const html = _bolgeNabzi({ bugun_gorenler: 10, bolgeler: [{ bolge: 'ayrac', gezgin: 3 }] });
    expect(html).toContain("Bugün'e giren 10 gezginin yalnız %30'i ayracın altına indi");
    expect(html).toContain('STÜDYO fold altında kalıyor');
  });

  it('ayraç erişimi %50 ve üstündeyse teşhis yazılmaz', () => {
    const html = _bolgeNabzi({ bugun_gorenler: 10, bolgeler: [{ bolge: 'ayrac', gezgin: 6 }] });
    expect(html).not.toContain('STÜDYO fold altında kalıyor');
  });

  it('bölge adları Türkçe etiketlerle çizilir', () => {
    const html = _bolgeNabzi({
      bugun_gorenler: 10,
      bolgeler: [{ bolge: 'icdunya', gezgin: 4 }, { bolge: 'yolculuk', gezgin: 2 }],
    });
    expect(html).toContain('İç Dünya');
    expect(html).toContain('Yolculuk');
  });
});

describe('Halkanın Nabzı — paylaşım nereye düşüyor (12·C)', () => {
  it('indir sayısı story\'i geçtiğinde teşhis yazar', () => {
    const html = _halkaNabzi({ total: 5, huni: [{ olay: 'story', n: 1 }, { olay: 'indir', n: 4 }] });
    expect(html).toContain('paylaşım çoğunlukla indirmeye düşüyor');
    expect(html).toContain('Share sheet');
  });

  it('story indir\'e eşit ya da fazlaysa teşhis yazılmaz', () => {
    const html = _halkaNabzi({ total: 4, huni: [{ olay: 'story', n: 3 }, { olay: 'indir', n: 1 }] });
    expect(html).not.toContain('çoğunlukla indirmeye düşüyor');
  });

  it('dört köşe Story · Yazı · Kopyala · İndir adlarıyla çizilir', () => {
    const html = _halkaNabzi({
      total: 4,
      huni: [{ olay: 'story', n: 1 }, { olay: 'yazi', n: 1 }, { olay: 'kopyala', n: 1 }, { olay: 'indir', n: 1 }],
    });
    expect(html).toContain('Story');
    expect(html).toContain('Yazı');
    expect(html).toContain('Kopyala');
    expect(html).toContain('İndir');
  });

  it('tur_dagilim boşsa kırılım satırı hiç çizilmez (uydurulmaz)', () => {
    const html = _halkaNabzi({ total: 1, huni: [{ olay: 'story', n: 1 }], tur_dagilim: [] });
    expect(html).not.toContain('paylaşılan şeyin sınıfı');
  });

  it('tur_dagilim doluysa kırılım satırı çizilir', () => {
    const html = _halkaNabzi({ total: 1, huni: [{ olay: 'story', n: 1 }], tur_dagilim: [{ tur: 'kart', n: 1 }] });
    expect(html).toContain('paylaşılan şeyin sınıfı');
    expect(html).toContain('kart');
  });
});

/* ── Eşik Alarmları — İç Çalışma 17 · F2 (FAZ 13, "Eşik alarmı altyapısı") ──
   Oda 17'nin tespiti: "her kart eşiği aşınca kendi tanısını yazıyor". Bu
   testlerin işi YENİ bir teşhis mantığı sınamak DEĞİL — toplayıcının
   kartların KENDİ üretimini (aynı fonksiyon, aynı veri) eksiksiz ve
   doğru topladığını, ve salt BİLGİLENDİRME notlarını (işaretsiz gz-n)
   alarm saymadığını kanıtlamaktır. */
describe('Eşik Alarmları — _alarmListesi kartların ZATEN yazdığı teşhisi toplar', () => {
  it('hiçbir kart çizilmiyorsa (boş rapor) alarm listesi boştur', () => {
    expect(_alarmListesi({})).toEqual([]);
    expect(_alarmListesi(undefined)).toEqual([]);
  });

  it('tek bir kartın teşhisi kartın KENDİ başlığıyla toplanır', () => {
    const d = { safety_pulse: { total: 3, olaylar: [{ olay: 'crisis_signal', n: 3, gezgin: 2 }] } };
    const alarmlar = _alarmListesi(d);
    expect(alarmlar).toHaveLength(1);
    expect(alarmlar[0].kart).toBe('Emniyet Nabzı — sinyal karta, kart lütfa geçiyor mu');
    expect(alarmlar[0].mesaj).toContain('sinyal yakalanıyor ama kart gösterilmiyor');
  });

  it('salt bilgilendirme notu (işaretsiz gz-n) alarm SAYILMAZ', () => {
    // Emniyet Nabzı HER ZAMAN "kaçırma oranını ölçmez" notunu taşır — bu
    // teşhis değil sabit bir dürüstlük notudur (data-gz-alarm işaretsiz).
    const d = { safety_pulse: { total: 1, olaylar: [{ olay: 'crisis_grace', n: 1, gezgin: 1 }] } };
    const alarmlar = _alarmListesi(d);
    expect(alarmlar.some(a => a.mesaj.includes('kaçırma oranını ölçmez'))).toBe(false);
  });

  it('birden fazla kart aynı turda teşhis yazınca hepsi tek listede toplanır', () => {
    const d = {
      safety_pulse: { total: 3, olaylar: [{ olay: 'crisis_signal', n: 3, gezgin: 2 }] },
      kota_pulse: { total: 3, huni: [{ olay: 'duvar', n: 3, gezgin: 2 }] }, // gate yok → "teklif hiç açılmıyor"
      arac_pulse: { total: 3, matris: [{ arac: 'soz', olay: 'oner', n: 3 }] }, // onay/ret yok
    };
    const alarmlar = _alarmListesi(d);
    const kartlar = alarmlar.map(a => a.kart);
    expect(kartlar).toContain('Emniyet Nabzı — sinyal karta, kart lütfa geçiyor mu');
    expect(kartlar).toContain('Gelirin Nabzı — paywall hunisinin ilk basamakları');
    expect(kartlar).toContain('Araç Nabzı — öneri kabul mü ret mi görüyor');
    expect(alarmlar).toHaveLength(3);
  });

  it('mesaj kartın KENDİ render ettiği metinle birebir aynıdır — ikinci bir hesap yok (§1.3)', () => {
    // esikTam (yukarıdaki fixture) _esikNabzi ile bağımsız çağrıldığında da
    // AYNI teşhisi üretir — toplayıcı kaynağından alır, ikizini kurmaz.
    // Karşılaştırma etiketsiz yapılır: kartın kendi HTML'i <b> taşır,
    // toplayıcının mesajı düz metindir — ikisi aynı KAYNAKTAN gelir ama
    // biçimleri farklıdır (biri ekran için, öteki liste için).
    const dogrudanDuz = _esikNabzi(esikTam).replace(/<[^>]+>/g, '');
    const alarmlar = _alarmListesi({ esik_pulse: esikTam });
    expect(alarmlar).toHaveLength(1);
    expect(dogrudanDuz).toContain(alarmlar[0].mesaj);
  });

  it('bozuk/eksik alanlarda çökmez — bir kartın patlaması listeyi düşürmez', () => {
    expect(() => _alarmListesi({ ritus_pulse: { total: 3, ritueller: null, terk_adimlari: 'x' } })).not.toThrow();
  });
});

describe('_alarmListesiHTML — boşsa hiç çizilmez, doluysa kart adıyla listelenir', () => {
  it('boş liste hiçbir şey basmaz (uydurulmuş "her şey sakin" cümlesi yok)', () => {
    expect(_alarmListesiHTML([])).toBe('');
  });

  it('dolu liste kart adını ve mesajı taşır', () => {
    const html = _alarmListesiHTML([{ kart: 'Test Kartı', mesaj: 'teşhis metni' }]);
    expect(html).toContain('Eşik Alarmları');
    expect(html).toContain('Test Kartı');
    expect(html).toContain('teşhis metni');
  });

  it('kart adı/mesaj HTML\'e kaçışsız gitmez (XSS savunması, §5.2)', () => {
    const html = _alarmListesiHTML([{ kart: '<img src=x onerror=alert(1)>', mesaj: '<b>x</b>' }]);
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b>x</b>');
  });
});
