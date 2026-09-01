/**
 * PROVA SAHNESİ (16g) — taslak canlıya SIZMAZ
 *
 * NEDEN BU TEST VAR:
 * Prova, düzenlenmekte olan yönlendirmeleri canlı override haritasının
 * üstüne geçici olarak bindirir. Bindirme geri alınmazsa yayınlanmamış bir
 * taslak, o oturumdaki HER kullanıcı çağrısında yürürlükte kalır — ve
 * hiçbir yerde görünmez: panel "VARSAYILAN" der, DB boştur, ama Emre
 * konuşurken taslağı kullanır. Sessiz ve teşhisi zor bir kırık.
 *
 * Bu yüzden asıl sözleşme "prova çalışıyor mu" değil, **"prova bitince
 * harita eski hâline dönüyor mu"**dur — LLM hata verse de, çağrı yarıda
 * kalsa da.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/* callLLM ağa çıkar; provanın kendi mantığını sınamak için değiştiriyoruz.
   Mod kılavuzu p() zincirinden geçtiği için GERÇEK kalır — provanın taslağı
   kılavuza yansıtıp yansıtmadığını ancak öyle görebiliriz. */
const cagrilar = [];
vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  // Yalnız callLLM değişir; modülün öbür export'ları yerinde kalmalı —
  // 03-auth-shell → 11-w2-chat-cal zinciri onlara bağlı (TDZ kırılır).
  const actual = await importOriginal();
  return {
    ...actual,
    callLLM: vi.fn(async (arg) => {
      cagrilar.push(arg);
      if (globalThis.__prvPatlat) throw new Error('LLM düştü');
      return 'prova yanıtı';
    }),
  };
});

const { prvKos, prvMesgul } = await import('../js/parts/16g-prova-sahnesi.js');
const { p, setPromptOverrides, getPromptOverrides } = await import('../js/parts/16-i18n-prompts.js');

const CANLI = { tr: { 'prompt.greeting': 'CANLI SELAM' } };

beforeEach(() => {
  cagrilar.length = 0;
  globalThis.__prvPatlat = false;
  setPromptOverrides(structuredClone(CANLI));
});

describe('16g — override simetrisi', () => {
  it('getPromptOverrides yürürlükteki haritayı döner', () => {
    expect(getPromptOverrides()).toEqual(CANLI);
  });

  it('dönen harita kopyadır — çağıran canlıyı düzenleyemez', () => {
    const k = getPromptOverrides();
    k.tr['prompt.greeting'] = 'KURCALANDI';
    expect(p('prompt.greeting')).toBe('CANLI SELAM');
  });
});

describe('16g — prova taslağı bindirir', () => {
  it('taslak koşu SIRASINDA yürürlüktedir', async () => {
    // Kılavuz taslak yürürlükteyken kurulur; p()'nin taslağı gördüğünü
    // callLLM'e giden systemPrompt üzerinden değil, doğrudan sınıyoruz.
    let icerideki;
    const { callLLM } = await import('../js/parts/04-llm-hero-history.js');
    callLLM.mockImplementationOnce(async (arg) => {
      cagrilar.push(arg);
      icerideki = p('prompt.greeting');
      return 'yanıt';
    });

    await prvKos({ tr: { 'prompt.greeting': 'TASLAK SELAM' } }, 'merhaba');
    expect(icerideki).toBe('TASLAK SELAM');
  });

  it('taslakta olmayan anahtar canlı hâlini korur (sığ birleşim)', async () => {
    let baska;
    const { callLLM } = await import('../js/parts/04-llm-hero-history.js');
    callLLM.mockImplementationOnce(async () => { baska = p('prompt.greeting'); return 'y'; });
    await prvKos({ tr: { 'prompt.crisis': 'TASLAK KRİZ' } }, 'merhaba');
    expect(baska).toBe('CANLI SELAM');
  });
});

describe('16g — taslak canlıya SIZMAZ (asıl sözleşme)', () => {
  it('başarılı koşudan sonra harita eski hâline döner', async () => {
    await prvKos({ tr: { 'prompt.greeting': 'TASLAK SELAM' } }, 'merhaba');
    expect(getPromptOverrides()).toEqual(CANLI);
    expect(p('prompt.greeting')).toBe('CANLI SELAM');
  });

  it('LLM DÜŞSE BİLE harita geri alınır (finally)', async () => {
    globalThis.__prvPatlat = true;
    await expect(prvKos({ tr: { 'prompt.greeting': 'TASLAK' } }, 'merhaba')).rejects.toThrow('LLM düştü');
    expect(getPromptOverrides()).toEqual(CANLI);
    expect(p('prompt.greeting')).toBe('CANLI SELAM');
  });

  it('boş mesajda hiç bindirmez', async () => {
    await expect(prvKos({ tr: { 'prompt.greeting': 'TASLAK' } }, '   ')).rejects.toThrow();
    expect(p('prompt.greeting')).toBe('CANLI SELAM');
    expect(cagrilar).toHaveLength(0);
  });
});

describe('16g — prova iz bırakmaz', () => {
  it('persona kapatılmaz — gerçek turun hâli korunur', async () => {
    await prvKos({}, 'merhaba');
    expect(cagrilar[0].skipPersona).toBe(false);
  });

  it('mod kılavuzu varsayılan olarak gider', async () => {
    await prvKos({}, 'merhaba');
    expect(typeof cagrilar[0].systemPrompt).toBe('string');
    expect(cagrilar[0].systemPrompt.length).toBeGreaterThan(0);
  });

  it('modKilavuzu:false ile çıplak koşulabilir', async () => {
    await prvKos({}, 'merhaba', { modKilavuzu: false });
    expect(cagrilar[0].systemPrompt).toBe('');
  });

  it('tek kullanıcı mesajı gönderilir — sohbet geçmişi taşınmaz', async () => {
    await prvKos({}, 'bugün yorgunum');
    expect(cagrilar[0].contents).toHaveLength(1);
    expect(cagrilar[0].contents[0].role).toBe('user');
    expect(cagrilar[0].contents[0].parts[0].text).toBe('bugün yorgunum');
  });

  it('koşu bitince meşgul kapısı açılır', async () => {
    expect(prvMesgul()).toBe(false);
    await prvKos({}, 'merhaba');
    expect(prvMesgul()).toBe(false);
  });

  it('hata sonrası da meşgul kapısı açılır', async () => {
    globalThis.__prvPatlat = true;
    await expect(prvKos({}, 'merhaba')).rejects.toThrow();
    expect(prvMesgul()).toBe(false);
  });
});
