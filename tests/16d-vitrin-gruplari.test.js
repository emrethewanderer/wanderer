/**
 * EMRE'NİN SESİ — VİTRİN VE ODA SÖZLEŞMESİ (16d)
 *
 * NEDEN BU TEST VAR:
 * Panel her yönlendirmeyi gösterir — ama "gösterir" ile "bulunur" aynı şey
 * değil. ES_GROUPS regex'leri Temmuz'da donduruldu; sonraki bir ayda eklenen
 * 42 anahtarın 29'u son-çare grubuna ("BAĞLAM & TEKNİK PARÇALAR") düştü.
 * İçlerinde sesin en ağır kararları vardı: Oluş Sınaması'nın sekiz anahtarlık
 * hüküm dili, Ayna Protokolü'nün hipotez kuralları, İmge Kapısı'nın doz
 * sınırı. Emre bir sesi ayarlamak istediğinde 124 satırlık bir torbayı
 * taraması gerekiyordu.
 *
 * En keskin belirti: grubun adı "ÖZET & AYNA MOTORLARI" iken regex'i `ayna`
 * içermiyordu — `prompt.ayna.*` kendi odasının kapısından geçemiyordu. Bu
 * testin çekirdek fikri de odur: **grubun adı neyi vaat ediyorsa regex'i onu
 * yakalamalı.**
 *
 * 16d DOM'a bağlı olduğu için modül import edilmez; ES_GROUPS kaynaktan
 * okunur (tests/sunucu-sesi.test.js ile aynı yöntem).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROMPT_I18N_CORE } from '../js/parts/16b-i18n-prompt-dict-core.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'js/parts/16d-emre-sesi.js'), 'utf8');

/* ES_GROUPS'u kaynaktan çöz: [{ label, re }] */
const GRUP_BLOGU = SRC.slice(
  SRC.indexOf('const ES_GROUPS = ['),
  SRC.indexOf('function _esGroupOf'),
);
const GRUPLAR = [...GRUP_BLOGU.matchAll(/label: '([^']+)',\s*re: (\/.+?\/)\s*\}/g)].map(
  (m) => ({ label: m[1], re: new Function(`return ${m[2]}`)() }),
);

const FEATURED = [
  ...SRC.slice(SRC.indexOf('const ES_FEATURED = ['), SRC.indexOf('const ES_SERVER_KEYS'))
    .matchAll(/key: '([^']+)'/g),
].map((m) => m[1]);

const TUM_ANAHTARLAR = Object.keys(PROMPT_I18N_CORE.tr);
const SON_CARE = GRUPLAR[GRUPLAR.length - 1];

function grubuBul(key) {
  for (const g of GRUPLAR) if (g.re.test(key)) return g.label;
  return SON_CARE.label;
}

describe('16d — grup yapısı', () => {
  it('ES_GROUPS çözülebiliyor (bu testin çapası)', () => {
    expect(GRUPLAR.length).toBeGreaterThan(5);
    expect(FEATURED.length).toBeGreaterThan(20);
  });

  it('son grup gerçekten son-çare (her anahtarı yakalar)', () => {
    expect(SON_CARE.re.test('prompt.rastgele.bir.anahtar')).toBe(true);
  });

  it('son-çare dışındaki her grup en az bir anahtar yakalar (ölü regex yok)', () => {
    const olu = [];
    for (const g of GRUPLAR.slice(0, -1)) {
      const sayi = TUM_ANAHTARLAR.filter((k) => g.re.test(k)).length;
      // SUNUCU SESLERİ sözlükte yaşamaz — anahtarları ES_SERVER_KEYS'ten gelir.
      if (!sayi && g.label !== 'SUNUCU SESLERİ') olu.push(g.label);
    }
    expect(olu).toEqual([]);
  });
});

describe('16d — grup adı verdiği sözü tutar', () => {
  /* H boşluğunun kökü: ad bir aile vaat ederken regex onu yakalamıyordu. */
  const SOZLER = [
    { ad: 'ÖZET & AYNA MOTORLARI', onek: 'prompt.ayna.generate_system' },
    { ad: 'ÖZET & AYNA MOTORLARI', onek: 'prompt.summary.system' },
    { ad: 'RİTÜEL ATÖLYELERİ', onek: 'prompt.olus.sinama_karar_system' },
    { ad: 'RİTÜEL ATÖLYELERİ', onek: 'prompt.portre.synth_system' },
    { ad: 'RİTÜEL ATÖLYELERİ', onek: 'prompt.imge.merdiven' },
    { ad: 'KİŞİSELLEŞTİRME KATMANLARI', onek: 'prompt.p3.day_intense' },
    { ad: 'KİŞİSELLEŞTİRME KATMANLARI', onek: 'prompt.personalization.deep_analysis_rules' },
    { ad: 'SUNUCU SESLERİ', onek: 'prompt.srv.baslatici.system' },
  ];

  for (const { ad, onek } of SOZLER) {
    it(`${onek} → ${ad}`, () => {
      expect(grubuBul(onek)).toBe(ad);
    });
  }
});

describe('16d — torba taşmıyor', () => {
  it('son-çare grubu sözlüğün yarısından azını taşır', () => {
    const torba = TUM_ANAHTARLAR.filter(
      (k) => !FEATURED.includes(k) && grubuBul(k) === SON_CARE.label,
    );
    // Ölçü bir kalite hedefi değil, kayma alarmı: torba büyümeye başlarsa
    // yeni bir aile doğmuş ve odasını bulamamış demektir.
    expect(torba.length).toBeLessThan(TUM_ANAHTARLAR.length / 2);
  });

  it('bu ayın anahtar aileleri torbada değil', () => {
    const aileler = [
      'prompt.ayna.generate_user',
      'prompt.olus.davet_system',
      'prompt.olus.kapi_user',
      'prompt.imge.baglam_header',
      'prompt.oik.resynth_system',
      'prompt.yp.consolidate_system',
      'prompt.gozlemevi.analist_system',
      'prompt.commitment.resolved_kept',
      'prompt.personalization.deep_analysis_task',
    ];
    const torbada = aileler.filter((k) => grubuBul(k) === SON_CARE.label);
    expect(torbada).toEqual([]);
  });
});

describe('16d — vitrin (hüküm veren sesler)', () => {
  it('kullanıcı hakkında hüküm veren üç ses vitrinde', () => {
    // Üçü de kanıt kapısına bağlı; torbada aranmamalılar.
    expect(FEATURED).toContain('prompt.olus.sinama_karar_system');
    expect(FEATURED).toContain('prompt.ayna.generate_system');
    expect(FEATURED).toContain('prompt.oruntu.distill_system');
  });

  it('vitrindeki her anahtar sözlükte gerçekten var (yetim yok)', () => {
    // Vitrin yalnız client sözlüğünden beslenir; sunucu anahtarları ayrı
    // listede (ES_SERVER_KEYS) yaşar ve kendi grubunda görünür — sözleşmeleri
    // tests/sunucu-sesi.test.js'te.
    const yetim = FEATURED.filter((k) => !TUM_ANAHTARLAR.includes(k));
    expect(yetim).toEqual([]);
  });

  it('vitrin sunucu anahtarı taşımaz (onların yeri ES_SERVER_KEYS)', () => {
    expect(FEATURED.filter((k) => k.startsWith('prompt.srv.'))).toEqual([]);
  });
});
