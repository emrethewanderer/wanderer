/**
 * SOHBET KUTSAL ALANDIR — Character.ai kapısı (TASARIM-PRENSIPLERI §8b)
 *
 * FELSEFE (Emre):
 *   Character.ai'ın çöküşünde en sık tekrarlanan şikâyet, konuşmanın ortasına
 *   inen tam ekran reklamdı. Kullanıcı kendini anlattığı bir cümlenin ardından
 *   satın alma perdesi görüyordu. Sohbet bu üründe bir vitrin değil, bir
 *   ocaktır: para eşikte durur, akışın ortasında değil.
 *
 * NEDEN STATİK KAPI:
 *   Bu bir görsel tercih değil, bir sözdür (§8b madde 1) — ve yazılı bir söz,
 *   koda karşı sınanmadığı sürece yalnız iyi niyettir. Kapı `_src.html`'in
 *   sohbet ekranını okur: reklam yüzeyi, tam ekran satış perdesi ya da
 *   "izle ve kazan" mekaniği oraya sızarsa test kırmızı yanar.
 *
 *   Kota duvarı (13m) bu kapının DIŞINDADIR: o bir satış yüzeyi değil, bir
 *   sınırın dürüst bildirimidir ve akışın ortasına inmez.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC_HTML = readFileSync(join(ROOT, '_src.html'), 'utf8');

/** #chat-view bloğunu kaba ama kararlı biçimde kes: açılıştan bir sonraki
 *  kardeş view'ın id'sine kadar. */
function chatViewBlogu() {
  const bas = SRC_HTML.indexOf('id="chat-view"');
  expect(bas, '#chat-view bulunamadı — ekran yeniden adlandırıldıysa bu kapı da güncellenmeli').toBeGreaterThan(-1);
  const sonraki = SRC_HTML.indexOf('class="view', bas + 10);
  return SRC_HTML.slice(bas, sonraki > -1 ? sonraki : SRC_HTML.length);
}

describe('Sohbet ekranında monetizasyon yüzeyi yok', () => {
  const blok = chatViewBlogu();

  /* Desenler c.ai'ın literal isimlendirmesiyle sınırlı kalmamalı: gerçek bir
     entegrasyon SDK'nın kendi adıyla gelir (admob, unity-ads, ironsource…).
     Denetim (2026-08-25) ilk hâlin bu adları kaçırdığını kanıtladı. */
  it('reklam kabı / slot / banner / SDK sınıfı taşımaz', () => {
    const yasak = /(ad-slot|ad-container|adsbygoogle|ad-banner|banner-ad|native-ad|ads-container|interstitial|admob|unity[-_]?ads|ironsource|applovin|audience[-_]?network|sponsored-)/i;
    expect(blok).not.toMatch(yasak);
  });

  it('sohbetin içinde satın alma / izle-kazan çağrısı bulunmaz', () => {
    // Kota duvarı ayrı: o bir sınır bildirimi (ktGate akışın BAŞINDA çalışır,
    // yanıtın ortasına inmez) — satış perdesi değil.
    const yasak = /(showPaywall|paywall-modal|openCheckout|purchaseNow|buyNow|upsell|rewarded[_-]?ad|watch[-_]?ad)/i;
    expect(blok).not.toMatch(yasak);
  });

  it('üçüncü taraf reklam/analitik betiği yüklenmez', () => {
    const yasak = /(googlesyndication|doubleclick|adservice|taboola|outbrain)/i;
    expect(SRC_HTML).not.toMatch(yasak);
  });

  it('anayasada madde yazılı (belge ile kod aynı sözü taşır)', () => {
    const anayasa = readFileSync(join(ROOT, 'TASARIM-PRENSIPLERI.md'), 'utf8');
    expect(anayasa).toMatch(/Sohbet kutsal alandır/);
    expect(anayasa).toMatch(/Monetizasyon sohbetin İÇİNE girmez/);
  });
});
