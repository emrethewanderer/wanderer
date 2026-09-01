/**
 * FAZ 4 — Dönüş köprüsü (sabah açılışı + selam kartı)
 *
 * Eski kural açılışta geçmişe atfı YASAKLIYORDU ("geçmiş günlerden spesifik
 * bir konuyu tekrar ETME"); tanınma hissinin doğduğu ilk temas jenerikti.
 * Yeni denge: TEK kanıtlı köprü, sonra odak bugüne döner. Köprünün kaynağı
 * uydurulamaz — yalnız prompta yazılan iki satır.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../js/state.js';
import { p } from '../js/parts/16-i18n-prompts.js';
import { nowTR, detectTopics } from '../js/parts/00-config-tracking.js';
globalThis.nowTR = nowTR;
globalThis.detectTopics = detectTopics;

import { getGreetingContext, invalidateContextCache } from '../js/parts/01-prompts-modes.js';
import { w2GetGreetingCardContext } from '../js/parts/10-features-w2.js';
import { localISODate } from '../js/parts/00a-infrastructure.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GUN_ANAHTARI = () => 'w2_greeting_text_' + nowTR().toDateString();

describe('prompt.presession — köprü izinli ama uydurma yasak', () => {
  it('artık "tekrar ETME" yasağını taşımaz', () => {
    const metin = p('prompt.presession', { totalSessions: 5, streak: 3, daysSinceLast: 1, memoryNotes: '', sonGun: '', sonPush: '' });
    expect(metin).not.toContain('tekrar ETME');
  });

  it('köprüyü YALNIZ verilen bilgiye bağlar (uydurma kapısı prompt\'ta)', () => {
    const metin = p('prompt.presession', { totalSessions: 5, streak: 3, daysSinceLast: 2, memoryNotes: '', sonGun: '', sonPush: '' });
    expect(metin).toMatch(/YALNIZ yukarıda yazılı/);
    expect(metin).toMatch(/köprü KURMA/);
  });

  it('son gün ve son push satırları prompta yerleşir', () => {
    const sonGun = p('prompt.presession.son_gun', { tarih: '2026-08-23', not: 'Babasıyla konuşmayı erteledi.' });
    const sonPush = p('prompt.presession.son_push', { metin: 'Dün bıraktığın yerde bekliyorum.' });
    const metin = p('prompt.presession', { totalSessions: 5, streak: 3, daysSinceLast: 2, memoryNotes: '', sonGun, sonPush });
    expect(metin).toContain('Babasıyla konuşmayı erteledi.');
    expect(metin).toContain('Dün bıraktığın yerde bekliyorum.');
    expect(metin).toContain('2026-08-23');
  });

  it('EN karşılığı aynı sözleşmeyi taşır', () => {
    S._currentLang = 'en';
    const metin = p('prompt.presession', { totalSessions: 5, streak: 3, daysSinceLast: 1, memoryNotes: '', sonGun: '', sonPush: '' });
    S._currentLang = 'tr';
    // EN sözlüğü sidecar; yüklenmediyse TR'ye düşer — iki durumda da yasak yok
    expect(metin).not.toContain('do NOT repeat a specific topic');
  });
});

describe('presession girdileri — kanıt yoksa satır doğmaz', () => {
  it('narrative memory boşken son_gun satırı hiç üretilmez', () => {
    // sonGunCtx üretimi: S._narrativeMemory[0]?.note yoksa '' (01:47)
    S._narrativeMemory = [];
    const sonGun = S._narrativeMemory[0];
    const ctx = sonGun?.note ? p('prompt.presession.son_gun', { tarih: '', not: sonGun.note }) : '';
    expect(ctx).toBe('');
    const metin = p('prompt.presession', { totalSessions: 1, streak: 0, daysSinceLast: 0, memoryNotes: '', sonGun: ctx, sonPush: '' });
    expect(metin).not.toContain('Son konuştuğunuz gün');
  });

  it('push whitelist yalnız kişisel tetikleri taşır — broadcast/test dışarıda', () => {
    // Sözleşme kaynakta: .in('type', [...]) — duyuru kişisel gibi sunulmaz
    // jsdom ortamında import.meta.url file: şeması değil — kök cwd'dir
    const kaynak = readFileSync(join(process.cwd(), 'js/parts/01-prompts-modes.js'), 'utf8');
    const satir = kaynak.match(/\.in\('type', \[([^\]]+)\]\)/);
    expect(satir, "notification_log sorgusunda tip whitelist'i yok").toBeTruthy();
    expect(satir[1]).not.toContain('broadcast');
    expect(satir[1]).not.toContain('test');
    expect(satir[1]).toContain('winback');
  });
});

describe('selam kartı köprüsü — uygulamanın iki ağzı olmaz', () => {
  beforeEach(() => {
    sessionStorage.clear();
    S.chatHistory = [];
    S.currentSessId = 'day_' + localISODate();
    delete window.getCrisisContext;
    invalidateContextCache();
  });

  it('kart yokken bağlam boş', () => {
    expect(w2GetGreetingCardContext()).toBe('');
  });

  it('kart varsa metni bağlama girer', () => {
    sessionStorage.setItem(GUN_ANAHTARI(), 'Geçen sefer sınavdan söz etmiştin — nasıl geçti?');
    const ctx = w2GetGreetingCardContext();
    expect(ctx).toContain('nasıl geçti?');
  });

  it('günün ilk turlarından sonra susar (gürültü olmasın)', () => {
    sessionStorage.setItem(GUN_ANAHTARI(), 'Bugün nasıl başlıyoruz?');
    S.chatHistory = Array.from({ length: 4 }, () => ({ role: 'user', content: 'x' }));
    expect(w2GetGreetingCardContext()).toBe('');
  });

  it('getGreetingContext kartı taşır — selam olmayan mesajda da', () => {
    sessionStorage.setItem(GUN_ANAHTARI(), 'Dün emeğinden söz etmiştin.');
    window.w2GetGreetingCardContext = w2GetGreetingCardContext;
    const ctx = getGreetingContext('bugün çok yorgunum');
    expect(ctx).toContain('Dün emeğinden söz etmiştin.');
    delete window.w2GetGreetingCardContext;
  });

  /* DENETİM 2026-08-25 — kriz register'ı. Kullanıcı krizini açtığı ilk
     mesajda model, EN YÜKSEK öncelikli blokta kriz talimatının yanında
     "geçen sefer sınavın nasıl geçti?" hatırlatmasını görüyordu. Havuz ve
     pin kriz modunda zaten susuyor; selam kartı bu kalıbı almamıştı. */
  it('kriz anında selam kartı SUSAR', () => {
    sessionStorage.setItem(GUN_ANAHTARI(), 'Geçen sefer sınavdan söz etmiştin — nasıl geçti?');
    window.getCrisisContext = () => '[KRİZ SİNYALİ TESPİT EDİLDİ]';
    expect(w2GetGreetingCardContext()).toBe('');
    delete window.getCrisisContext;
  });

  /* FAZ 1'in kırığının aynı sınıfı: "chatHistory hep bugündür" yalnız boot
     anında doğru — openSummarySession geçmiş günü açınca bozulur. */
  it('geçmiş bir gün açıkken selam kartı bağlama girmez', () => {
    sessionStorage.setItem(GUN_ANAHTARI(), 'Bugünün selamı.');
    S.currentSessId = 'day_2026-08-14';
    expect(w2GetGreetingCardContext()).toBe('');
    S.currentSessId = 'day_' + localISODate();
    expect(w2GetGreetingCardContext()).toContain('Bugünün selamı.');
  });

  it('köprü modülü yoksa selam kanalı eskisi gibi çalışır', () => {
    delete window.w2GetGreetingCardContext;
    expect(() => getGreetingContext('merhaba')).not.toThrow();
  });
});
