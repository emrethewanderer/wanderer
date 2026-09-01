/**
 * ANAYASA REGISTER SÖZLEŞMESİ — "Merhaba, Emre" (07b) ihtimalsel dil kapısı
 *
 * NEDEN BU TEST VAR:
 * Anayasa (`ME_SECTIONS`) `meAssembleDoc()` ile tek belgeye mühürlenir ve
 * `admin_settings.system_prompt`'a yazılır; sunucudaki llm-chat onu her
 * sohbet turunda `system` mesajı olarak gönderir. Yani bu dosya bir "veri
 * dosyası" değil, **modelin sesinin kendisidir**.
 *
 * İhtimalsel Dil Devrimi (2026-08-11) kapanırken anayasa kapsam haritasında
 * hiç yer almadı: `scripts/ihtimalsel-denetci.mjs` 07b'yi ne tarar ne de muaf
 * sayar (kör nokta #8). Bedeli 2026-08-19'da görüldü — bölüm 3 kesin tanı
 * retoriği emrederken (`"İlişkilerinde başarısız çünkü…"`), aynı turda giden
 * `prompt.identity.core` kesin hükmü yasaklıyordu. İki `system` mesajı
 * birbiriyle çelişiyordu.
 *
 * Denetçi bu dosyayı regex'le tarayamaz (uzun template literal + gövdede
 * ayet göndermeleri → kanonu hedef gösterirdi). Bekçi bu yüzden bir desen
 * avcısı değil, bir **sözleşme testi**dir: triyajın sonucu silinirse ya da
 * kanon bozulursa kırmızı yanar.
 *
 * Kapsam: yalnız register sözleşmesi. Bölümlerin içeriğini denetlemez —
 * yeni bölüm/örnek eklendiğinde triyaj yine ELLEdir.
 */

import { describe, it, expect } from 'vitest';
import { ME_SECTIONS } from '../js/parts/07b-merhaba-emre-sections.js';

/* Bölüm 3 — "Ton, Ses ve Dil Kişiliği": tanı retoriğinin yaşadığı yer. */
const TON_BOLUMU = ME_SECTIONS.find(s => s.tr === 'Ton, Ses ve Dil Kişiliği');

describe('Anayasa — yapı sözleşmesi', () => {
  it('15 bölüm korunur (meAssembleDoc "## N." parse sözleşmesi buna bağlı)', () => {
    expect(ME_SECTIONS).toHaveLength(15);
  });

  it('her bölüm tr/en başlık ve dolu bir def taşır', () => {
    for (const s of ME_SECTIONS) {
      expect(typeof s.tr).toBe('string');
      expect(s.tr.length).toBeGreaterThan(0);
      expect(typeof s.en).toBe('string');
      expect(s.en.length).toBeGreaterThan(0);
      expect(typeof s.def).toBe('string');
      expect(s.def.length).toBeGreaterThan(0);
    }
  });

  it('Ton bölümü bulunabilir (bu testin çapası)', () => {
    expect(TON_BOLUMU).toBeDefined();
  });
});

describe('Anayasa — ihtimalsel register sözleşmesi (bölüm 3)', () => {
  it('hükmün sahipliğini kullanıcıya devreden kural yazılıdır', () => {
    // Bu cümle silinirse anayasa yine kesin tanı emreder hâle döner.
    expect(TON_BOLUMU.def).toMatch(/hükmün sahipliği devredilir/);
  });

  it('devrin şablonu ("… olabilir") verilmiştir — kural soyut kalmaz', () => {
    // 16b prompt.mode.card.direct ile AYNI şablon: tek ses.
    expect(TON_BOLUMU.def).toMatch(/bir kişi olduğun için oluyor olabilir/);
  });

  it('ölçüm↔yorum ayrımı anayasada da anılır', () => {
    expect(TON_BOLUMU.def).toMatch(/Ölçtüğün ve duyduğun kesindir/);
    expect(TON_BOLUMU.def).toMatch(/yorumun ihtimalseldir/);
  });

  it('"Sen şusun" kalıbı açıkça yasaklanır', () => {
    expect(TON_BOLUMU.def).toMatch(/"Sen şusun" demezsin/);
  });

  it('tanının gücü korunur — register tezi yumuşatmaz', () => {
    // İhtimalsel devrimin kendi denetiminde bir kez yapılan hata: tezi
    // yumuşatmak. Anayasa hükmü devrederken tanıyı ZAYIFLATMAMALI.
    expect(TON_BOLUMU.def).toMatch(/Tanının gücü kaybolmaz/);
    expect(TON_BOLUMU.def).toMatch(/Sorunu dışarıda değil kişide kök salarsın/);
  });
});

describe('Anayasa — kitap kanonu verbatim korunur (§6.3)', () => {
  it('üç imza tanı örneği kitaptaki hâliyle durur', () => {
    // Bunlar kitabın 152 "X çünkü Y" yazısının formudur — üçüncü tekil,
    // bir kişi hakkında hüküm değil. İhtimalselleştirilmezler.
    expect(TON_BOLUMU.def).toMatch(
      /İlişkilerinde başarısız çünkü kendiyle ilişkisinde başarısız/,
    );
    expect(TON_BOLUMU.def).toMatch(
      /Karanlıkta kalıyor çünkü mum yakmak yerine karanlığa sövüyor/,
    );
    expect(TON_BOLUMU.def).toMatch(/Kaçıyor çünkü şu an olduğu kişiyi istemiyor/);
  });

  it('örneklerin üçüncü tekil olduğu açıkça söylenir', () => {
    // Triyajın kalbi: form korunur, ama modelin bunu kullanıcıya nasıl
    // uygulayacağı ayrıca yazılıdır.
    expect(TON_BOLUMU.def).toMatch(/üçüncü tekildir/);
  });

  it('aforizma kanonu ve manevi register yerinde', () => {
    expect(TON_BOLUMU.def).toMatch(/Mesele sensin\./);
    expect(TON_BOLUMU.def).toMatch(/Manevi register doğal ve içtendir/);
  });
});

describe('Anayasa — sekülerleştirme yasağı (§6.3)', () => {
  it('manevi katmanın kaldırılamazlığı yazılı kalır', () => {
    const yasakBolumu = ME_SECTIONS.find(
      s => s.tr === 'Yasak Bölgeler ve Yasaklı Eylemler',
    );
    expect(yasakBolumu).toBeDefined();
    expect(yasakBolumu.def).toMatch(/sekülerleştirmek YASAK/);
  });

  it('çekirdek tez "değişmez" olarak korunur', () => {
    const evrimBolumu = ME_SECTIONS.find(s => s.tr === 'Evrim ve Adaptasyon');
    expect(evrimBolumu).toBeDefined();
    expect(evrimBolumu.def).toMatch(/Değişmez çekirdek: Mesele Sensin/);
  });
});
