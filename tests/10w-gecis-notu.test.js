/**
 * 10w — Wanderer modeli geçiş notu (buildFocusModelContext)
 *
 * Geçiş satırı role='system' olduğu için pencere seçimi (06 _pencereSec) onu
 * eler: kullanıcı görüşmenin ortasında Öz'den Bağ'a geçtiğinde model bunu
 * göremiyordu. Not bu boşluğu kapatır — ama YALNIZ hâlâ aktif olan modele
 * geçilmişse; yoksa eski bir geçişi bugünkü modelin üstüne yapıştırırdı.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../js/state.js';
import { localISODate } from '../js/parts/00a-infrastructure.js';
import { WANDERER_MODELS, buildFocusModelContext, fmGetActiveId } from '../js/parts/10w-w2-odak-modelleri.js';

const OZ = WANDERER_MODELS.find(m => m.id === 'oz');

describe('buildFocusModelContext — model geçişi modele görünür', () => {
  beforeEach(() => {
    S.currentSessId = 'day_' + localISODate();   // varsayılan: bugünkü akış
    S.chatHistory = [];
    S.isPremium = false;                 // premium olmadan aktif model daima 'oz'
    OZ.systemPrompt = 'Bireysel odak.';  // içerik boşsa bölüm hiç üretilmez
    OZ.knowledge = '';
  });

  it('içerik yokken hiçbir şey üretmez (token israfı yok)', () => {
    OZ.systemPrompt = '';
    expect(buildFocusModelContext()).toBe('');
  });

  it('geçiş yokken yalnız model yönergesi gider', () => {
    const ctx = buildFocusModelContext();
    expect(ctx).toContain('<model_davranisi>');
    expect(ctx).not.toContain('ortasında');
  });

  it('bugünün son geçişi aktif modele ise not eklenir', () => {
    expect(fmGetActiveId()).toBe('oz');
    S.chatHistory = [
      { role: 'user', content: 'selam' },
      { role: 'system', content: 'Wanderer Öz', mode: 'fmswitch:oz' },
    ];
    expect(buildFocusModelContext()).toContain('ortasında');
  });

  it('son geçiş BAŞKA bir modele ise not eklenmez', () => {
    S.chatHistory = [{ role: 'system', content: 'Wanderer Bağ', mode: 'fmswitch:bag' }];
    expect(buildFocusModelContext()).not.toContain('ortasında');
  });

  it('eski id\'li geçiş satırı (fmswitch:individual) yeni id\'ye çözülür', () => {
    S.chatHistory = [{ role: 'system', content: 'Odak', mode: 'fmswitch:individual' }];
    expect(buildFocusModelContext()).toContain('ortasında');
  });

  /* DENETİM 2026-08-24 — "S.chatHistory her zaman bugündür" varsayımı yalnız
     post-auth boot anında doğru: openSummarySession (06:220) geçmiş bir günü
     açınca hem currentSessId'yi hem chatHistory'yi o güne çevirir ve o
     ekrandan mesaj göndermeyi engelleyen bir kapı yok. Kapısız hâlde eski bir
     geçiş "bu görüşmenin ortasında" diye modele YANLIŞ olgu olarak giderdi. */
  it('geçmiş bir gün açıkken not GİTMEZ (o geçiş bugüne ait değil)', () => {
    S.currentSessId = 'day_2026-08-14';
    S.chatHistory = [{ role: 'system', content: 'Wanderer Öz', mode: 'fmswitch:oz' }];
    expect(buildFocusModelContext()).not.toContain('ortasında');
  });

  it('chatHistory bozuksa sessizce düşer', () => {
    S.chatHistory = null;
    expect(() => buildFocusModelContext()).not.toThrow();
  });
});
