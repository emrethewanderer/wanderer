/**
 * Tests for 13B — Tören Kuyruğu (İç Çalışma 05 rev.3 · boşluk C, Atlas D4).
 *
 * Sözleşme üç maddedir:
 *   1. DOM tek gerçek kaynaktır — kuyruk ayrı bir "açık sahne" defteri
 *      tutmaz; tutsaydı state ile DOM ayrıştığında kilitlenirdi.
 *   2. Bütçe YALNIZ davetsiz sahnelere işler: kullanıcının kendi açtığı
 *      tören kotadan düşmez.
 *   3. Kuyruk patlarsa töreni ENGELLEMEZ — bu katmanın işi ritmi korumak,
 *      töreni öldürmek değil.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { trnIzin, trnMesgul, trnAcikSahne, trnDurum, trnSifirla } from '../js/parts/13B-toren-kuyrugu.js';

const portal = (id) => {
  const el = document.createElement('div');
  el.id = id;
  document.body.appendChild(el);
  return el;
};

beforeEach(() => {
  document.body.innerHTML = '';
  trnSifirla();
});

describe('sıra — DOM tek gerçek kaynak', () => {
  it('boş sahnede kimse yok', () => {
    expect(trnAcikSahne()).toBeNull();
    expect(trnMesgul()).toBe(false);
  });

  it('açık tören portalını adıyla görür', () => {
    portal('at-portal');
    expect(trnAcikSahne()).toBe('at-portal');
    expect(trnMesgul()).toBe(true);
  });

  it('portal DOM’dan silinince sıra kendiliğinden boşalır (defter tutulmaz)', () => {
    const el = portal('gl-portal');
    expect(trnMesgul()).toBe(true);
    el.remove();
    expect(trnMesgul()).toBe(false);
  });

  it('üç eski listenin tanıdığı sahnelerin hepsini tanır', () => {
    for (const id of ['gl-portal', 'at-portal', 'sm-portal', 'us-portal',
                      'yol-portal', 'ig-portal', 'mt-portal']) {
      document.body.innerHTML = '';
      portal(id);
      expect(trnAcikSahne()).toBe(id);
    }
  });

  it('kabuk akışları da sırayı tutar: perde, onboarding, kapı', () => {
    const splash = portal('wn-splash');
    splash.classList.add('show');
    expect(trnMesgul()).toBe(true);
    document.body.innerHTML = '';
    portal('onb-ritual');
    expect(trnMesgul()).toBe(true);
    document.body.innerHTML = '';
    const kapi = document.createElement('div');
    kapi.className = 'fgate-overlay';
    document.body.appendChild(kapi);
    expect(trnMesgul()).toBe(true);
  });

  it('inmemiş perde sırayı tutmaz (show sınıfı yoksa)', () => {
    portal('wn-splash');
    expect(trnMesgul()).toBe(false);
  });
});

describe('bütçe — törenin gücü seyrekliğinden gelir', () => {
  it('sahne açıkken izin verilmez', () => {
    portal('sm-portal');
    expect(trnIzin('gunluk-ritus')).toBe(false);
  });

  it('oturum tavanı dolunca davetsiz sahne ertelenir', () => {
    expect(trnIzin('imge-kapisi')).toBe(true);    // 1. birim
    expect(trnIzin('seri-muhru')).toBe(true);     // 2. birim (korumalı, öncelik 2)
    expect(trnIzin('ayin-filmi')).toBe(false);    // tavan doldu
    expect(trnDurum().sayac).toBe(2);
  });

  it('davet edilen tören kotadan düşmez', () => {
    expect(trnIzin('olus-muhru', { davetsiz: false })).toBe(true);
    expect(trnIzin('hazine-paketi', { davetsiz: false })).toBe(true);
    expect(trnDurum().sayac).toBe(0);
    expect(trnIzin('gunluk-ritus')).toBe(true);   // davetsiz kota hâlâ dolu değil
  });

  it('davet edilen tören de sıra kontrolünden geçer', () => {
    portal('gl-portal');
    expect(trnIzin('hazine-paketi', { davetsiz: false })).toBe(false);
  });

  it('gün dönünce bütçe kendini sıfırlar (uzun açık kalan sekme)', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 7, 19, 10, 0, 0));
      trnIzin('a'); trnIzin('b');
      expect(trnIzin('c')).toBe(false);
      vi.setSystemTime(new Date(2026, 7, 20, 10, 0, 0));   // gün döndü
      expect(trnIzin('c')).toBe(true);
      expect(trnDurum().sayac).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('trnDurum tavanı ve açık sahneyi birlikte söyler', () => {
    portal('yol-portal');
    const d = trnDurum();
    expect(d.tavan).toBeGreaterThan(0);
    expect(d.acik).toBe('yol-portal');
  });
});

describe('savunmacı — kuyruk töreni öldürmez', () => {
  it('DOM erişimi patlarsa izin verir', () => {
    const asil = document.getElementById;
    document.getElementById = () => { throw new Error('DOM yok'); };
    try {
      expect(trnIzin('gunluk-ritus')).toBe(true);
    } finally {
      document.getElementById = asil;
    }
  });

  it('window üzerinden erişilebilir — sahneler import etmeden sorar (TDZ)', () => {
    for (const f of ['trnIzin', 'trnMesgul', 'trnAcikSahne', 'trnDurum']) {
      expect(typeof window[f]).toBe('function');
    }
  });
});

/* Dikiş testi: kural TAŞINDI, kopyalanmadı. Üç dosyada elle tutulan portal
   listesi geri gelirse kuyruk yine ayrışır — bu test o geri dönüşü yakalar. */
describe('üç elle tutulan liste gerçekten söküldü', () => {
  const kok = resolve(dirname(fileURLToPath(import.meta.url)), '../js/parts');
  const oku = (f) => readFileSync(`${kok}/${f}`, 'utf-8');

  it('10s, 13h, 13z artık kendi portal listelerini saymıyor', () => {
    for (const f of ['10s-w2-gunluk-ritus.js', '13h-aksam-toreni.js', '13z-imge-kapisi.js']) {
      const src = oku(f);
      // kendi portalını tanımak serbest; BAŞKA törenlerin portallarını
      // tek tek saymak kuyruğun işidir
      expect(src).not.toContain("getElementById('us-portal')");
      expect(src).not.toContain("getElementById('yol-portal')");
      expect(src).toContain('trnMesgul');
    }
  });

  it('sahne sahipleri bütçeyi kuyruktan soruyor', () => {
    expect(oku('10s-w2-gunluk-ritus.js')).toContain("trnIzin?.('gunluk-ritus')");
    expect(oku('13h-aksam-toreni.js')).toContain("trnIzin?.('aksam-toreni')");
    expect(oku('10t-w2-seri-muhru.js')).toContain("trnIzin?.('seri-muhru')");
  });

  it('kuyruk 14-boot’ta yükleniyor — perde inerken de sorulabilsin', () => {
    expect(oku('14-boot.js')).toContain("import './13B-toren-kuyrugu.js'");
  });
});

/* ── Öncelik kalibresi (FAZ 5) ──
   Bütçenin son birimi taahhüt döngüsüne ayrıldı: günün özeti, sözün
   kapanışını kapıda bırakamaz. */
describe('öncelik — anlamın sırası', () => {
  it('son bütçe birimine yalnız taahhüt döngüsü girer', () => {
    expect(trnIzin('imge-kapisi')).toBe(true);        // 1. birim: herkese açık
    expect(trnIzin('aksam-toreni')).toBe(false);      // 2. birim korumalı
    expect(trnIzin('gunluk-ritus')).toBe(true);       // öncelik 1 → geçer
    expect(trnIzin('seri-muhru')).toBe(false);        // tavan doldu
  });

  it('günün mührü de korumalı birime girebilir', () => {
    trnIzin('imge-kapisi');
    expect(trnIzin('seri-muhru')).toBe(true);
  });

  it('tanınmayan sahne en arkaya düşer ama ilk birimi kullanabilir', () => {
    expect(trnIzin('yeni-toren')).toBe(true);
    expect(trnIzin('yeni-toren-2')).toBe(false);
  });

  it('reddedilen sahne bütçeyi harcamaz — sırası gelince açılır', () => {
    trnIzin('imge-kapisi');
    trnIzin('aksam-toreni');                          // reddedildi
    expect(trnDurum().sayac).toBe(1);
    expect(trnIzin('gunluk-ritus')).toBe(true);
  });
});

/* Faz denetiminin yakaladığı kırık (19 Ağustos): kendi sahnesinin tekrar
   açılmasına karşı koruma kuyruğa DEVREDİLEMEZ — kuyruk yüklenmemiş bir
   ortamda (test, erken boot, modül hatası) koruma da yok olur ve aynı
   portal ikinci kez açılır. */
describe('kendi sahnesinin tekrarı — kuyruktan bağımsız koruma', () => {
  const kok = resolve(dirname(fileURLToPath(import.meta.url)), '../js/parts');
  const oku = (f) => readFileSync(`${kok}/${f}`, 'utf-8');

  it('her sahne sahibi kendi portalını hâlâ kendisi kontrol ediyor', () => {
    expect(oku('10s-w2-gunluk-ritus.js')).toContain("getElementById('gl-portal')");
    expect(oku('13h-aksam-toreni.js')).toContain("getElementById('at-portal')");
    expect(oku('13z-imge-kapisi.js')).toContain("getElementById('ig-portal')");
    expect(oku('10t-w2-seri-muhru.js')).toContain("getElementById('sm-portal')");
  });
});

/* Dikiş turunun bulgusu (19 Ağustos): bütçe dolduğunda Günlük Ritüel o
   oturumda büsbütün kayboluyordu — tetik yeniden denemiyor, yani armağan da
   söz de kullanıcıya hiç ulaşmıyordu. Bütçenin işi akşam yığılmasını
   seyreltmek, günün omurgasını kesmek değil. */
describe('zorunlu sahne — bütçe günün omurgasını kesmez', () => {
  it('Günlük Ritüel tavan dolu olsa da geçer', () => {
    trnIzin('imge-kapisi');
    trnIzin('seri-muhru');
    expect(trnDurum().sayac).toBe(2);
    expect(trnIzin('ayin-filmi')).toBe(false);        // sıradan sahne ertelenir
    expect(trnIzin('gunluk-ritus')).toBe(true);       // omurga geçer
  });

  it('muaf sahne bütçeyi yine de tüketir — sonrası sırasını bilsin', () => {
    expect(trnIzin('gunluk-ritus')).toBe(true);
    expect(trnDurum().sayac).toBe(1);
  });

  it('muafiyet SIRAYI delmez: sahne açıkken yine bekler', () => {
    portal('at-portal');
    expect(trnIzin('gunluk-ritus')).toBe(false);
  });
});
