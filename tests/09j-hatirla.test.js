/**
 * 09j — Hatırla ("Bunu unutma")
 *
 * Beyan-pin: hafızanın dizgini kullanıcıda. Pinlenebilen tek şey KULLANICININ
 * KENDİ sözüdür — modelin cümlesi mühürlenseydi hatırlanan bir yorum olurdu
 * ve köken kullanıcıdan kopardı (§6.10).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import {
  htInit, htPinToggle, htPinliMi, htListe, htUnpin, htBaglamBloku,
  htSozHavuzu, htAlintiAyikla, htAlintiHTML,
} from '../js/parts/09j-hatirla.js';

const KEY = 'etw_hatirla_v1_u1';

/** Şerit butonu taklidi — msgRawText balonun _rawText'ini okur (06 tek kaynak). */
function balonluButon(text) {
  const msg = document.createElement('div');
  msg.className = 'message user';
  msg._rawText = text;
  const btn = document.createElement('button');
  btn.className = 'fb-btn';
  btn.dataset.ht = '1';
  msg.appendChild(btn);
  document.body.appendChild(msg);
  return btn;
}

describe('09j — mühürlü sözler', () => {
  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    SafeStorage.remove(KEY);          // bellek-içi _kvCache testler arası taşınır
    document.body.innerHTML = '';
    htInit();
  });

  it('pin sözü listeye ekler, ikinci dokunuş geri alır', () => {
    const btn = balonluButon('Babamla konuşmayı erteliyorum.');
    htPinToggle(btn);
    expect(htListe()).toHaveLength(1);
    expect(htPinliMi('Babamla konuşmayı erteliyorum.')).toBe(true);

    htPinToggle(btn);
    expect(htListe()).toHaveLength(0);
    expect(htPinliMi('Babamla konuşmayı erteliyorum.')).toBe(false);
  });

  it('kimlik metinden türer — reload sonrası aynı cümle pinli tanınır', () => {
    htPinToggle(balonluButon('Sabah yürüyüşü benim için bir söz.'));
    const kayit = SafeStorage.get(KEY, null);
    expect(Array.isArray(kayit)).toBe(true);

    // "reload": bellek aynası düşer, disk kalır
    htInit();
    expect(htPinliMi('Sabah yürüyüşü benim için bir söz.')).toBe(true);
    // aynı cümlenin baş/son boşluğu kimliği değiştirmez
    expect(htPinliMi('  Sabah yürüyüşü benim için bir söz.  ')).toBe(true);
  });

  it('tavan dolunca yeni söz girmez ve eskisini SESSİZCE düşürmez', () => {
    for (let i = 0; i < 12; i++) htPinToggle(balonluButon('Söz numarası ' + i));
    const l = htListe();
    expect(l).toHaveLength(10);
    expect(htPinliMi('Söz numarası 0')).toBe(true);   // ilk mühür yerinde durur
    expect(htPinliMi('Söz numarası 11')).toBe(false); // tavan aşan hiç girmedi
  });

  it('boş/whitespace mesaj pinlenmez', () => {
    htPinToggle(balonluButon('   '));
    expect(htListe()).toHaveLength(0);
  });

  it('htUnpin panelden kaldırır; olmayan kimlik sessizce false döner', () => {
    htPinToggle(balonluButon('Bunu unutma dediğim cümle.'));
    const id = htListe()[0].id;
    expect(htUnpin(id)).toBe(true);
    expect(htListe()).toHaveLength(0);
    expect(htUnpin('yok-boyle-bir-id')).toBe(false);
  });

  it('bağlam bloğu boşken \'\' döner (token israfı yok), doluyken sözü ve günü taşır', () => {
    expect(htBaglamBloku()).toBe('');
    htPinToggle(balonluButon('Emeğimin karşılığını alamıyorum.'));
    const blok = htBaglamBloku();
    expect(blok).toContain('Emeğimin karşılığını alamıyorum.');
    expect(blok).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('mühürlenen söz anlamsal havuza da düşer (09f köprüsü)', () => {
    const casus = vi.fn();
    window.ehIngestMoment = casus;
    htPinToggle(balonluButon('Kardeşimle aramı düzeltmek istiyorum.'));
    expect(casus).toHaveBeenCalledOnce();
    expect(casus.mock.calls[0][0]).toContain('Kardeşimle');
    delete window.ehIngestMoment;
  });

  it('09f köprüsü patlarsa pin yine de tutar (asla bloklama)', () => {
    window.ehIngestMoment = () => { throw new Error('embed yok'); };
    expect(() => htPinToggle(balonluButon('Kırık köprüye rağmen.'))).not.toThrow();
    expect(htListe()).toHaveLength(1);
    delete window.ehIngestMoment;
  });

  it('kullanıcı değişince başka hesabın mühürleri görünmez', () => {
    htPinToggle(balonluButon('Birinci hesabın sözü.'));
    S.currentUser = { id: 'u2' };
    SafeStorage.remove('etw_hatirla_v1_u2');
    htInit();
    expect(htListe()).toHaveLength(0);
  });

  it('şerit butonunun aria-pressed durumu pin ile birlikte döner', () => {
    const btn = balonluButon('Aria sınaması.');
    htPinToggle(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    htPinToggle(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });
});


/* ═══ FAZ 3 — görünür kanıt ═══
   Alıntı EŞİKLE değil eşleştirmeyle doğrulanır: model cümleyi yazmaz,
   numarasını gösterir; metni uygulama kaynaktan keser. Uydurma alıntı
   yapısal olarak imkânsız olmalı — bu testler o kapıyı mühürler. */
describe('09j — söz havuzu ve alıntı ayıklama', () => {
  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    S.allSessions = {};
    S.chatHistory = [];
    SafeStorage.remove('etw_hatirla_v1_u1');
    document.body.innerHTML = '';
    delete window.ypGetFullState;
    htInit();
  });

  it('havuz boşken null döner (bölüm hiç doğmaz)', () => {
    expect(htSozHavuzu()).toBeNull();
  });

  it('mühürlü sözler havuzun BAŞINDA durur', () => {
    S.chatHistory = [{ role: 'user', content: 'Sıradan bir cümle.' }];
    htPinToggle(balonluButon('Mühürlediğim cümle.'));
    const h = htSozHavuzu();
    expect(h.sozler[0]).toBe('Mühürlediğim cümle.');
    expect(h.metin).toContain('[S1]');
  });

  it('portrenin kanıtları da havuza girer', () => {
    window.ypGetFullState = () => ({
      degerler: [{ deger: 'emek', kanit: 'Emeğimin karşılığını alamıyorum.' }],
      celiskiler: [{ metin: 'çelişki', kanit: 'Hem kaçıyorum hem istiyorum.' }],
    });
    const h = htSozHavuzu();
    expect(h.sozler).toContain('Emeğimin karşılığını alamıyorum.');
    expect(h.sozler).toContain('Hem kaçıyorum hem istiyorum.');
  });

  it('havuz tavanı 8 sözü aşmaz', () => {
    S.chatHistory = Array.from({ length: 20 }, (_, i) => ({ role: 'user', content: 'Cümle ' + i }));
    expect(htSozHavuzu().sozler.length).toBeLessThanOrEqual(8);
  });

  it('[S1] referansı KAYNAKTAN kesilen cümleye çözülür ve metinden düşer', () => {
    htPinToggle(balonluButon('Babamla konuşmayı erteliyorum.'));
    const h = htSozHavuzu();
    const { text, alintilar } = htAlintiAyikla('Bunu daha önce de söylemiştin. [S1]', h.harita, h.sozler);
    expect(alintilar).toHaveLength(1);
    expect(alintilar[0].alinti).toBe('Babamla konuşmayı erteliyorum.');
    expect(text).not.toContain('[S1]');
    expect(text).toBe('Bunu daha önce de söylemiştin.');
  });

  it('havuzda karşılığı OLMAYAN referans sessizce düşer — uydurma alıntı çizilmez', () => {
    htPinToggle(balonluButon('Tek sözüm.'));
    const h = htSozHavuzu();
    const { text, alintilar } = htAlintiAyikla('Şöyle demiştin: [S7]', h.harita, h.sozler);
    expect(alintilar).toHaveLength(0);
    expect(text).not.toContain('S7');
  });

  it('biçim bozulsa da referans tanınır ((S1), [s1]) — kanıt noktalama yüzünden düşmez', () => {
    htPinToggle(balonluButon('Biçim sınaması cümlesi.'));
    const h = htSozHavuzu();
    ['(S1)', '[s1]', '[ S1 ]'].forEach(v => {
      const r = htAlintiAyikla('Hatırlıyorum ' + v, h.harita, h.sozler);
      expect(r.alintilar, v + ' tanınmadı').toHaveLength(1);
    });
  });

  it('aynı söz iki kez gösterilse tek blok olur', () => {
    htPinToggle(balonluButon('Tekrar eden söz.'));
    const h = htSozHavuzu();
    const { alintilar } = htAlintiAyikla('Hem [S1] hem de [S1] dedin.', h.harita, h.sozler);
    expect(alintilar).toHaveLength(1);
  });

  it('yanıt yalnız referanstan ibaretse metin boş kalmaz', () => {
    htPinToggle(balonluButon('Yalnız referans.'));
    const h = htSozHavuzu();
    const { text } = htAlintiAyikla('[S1]', h.harita, h.sozler);
    expect(text.length).toBeGreaterThan(0);
  });

  it('havuz yoksa metin olduğu gibi kalır', () => {
    const { text, alintilar } = htAlintiAyikla('Düz bir yanıt.', null, null);
    expect(text).toBe('Düz bir yanıt.');
    expect(alintilar).toEqual([]);
  });

  it('alıntı HTML\'i kullanıcı metnini KAÇIRIR (escapeHTML)', () => {
    const html = htAlintiHTML([{ ref: 'S1', alinti: '<img src=x onerror=alert(1)>', gun: '2026-08-24' }]);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('2026-08-24');
  });

  it('mühürlü sözün alıntısı GÜNÜNÜ taşır, havuzdan gelen taşımaz', () => {
    htPinToggle(balonluButon('Mühürlü söz.'));
    S.chatHistory = [{ role: 'user', content: 'Mühürsüz söz.' }];
    const h = htSozHavuzu();
    const muhurluIdx = h.sozler.indexOf('Mühürlü söz.') + 1;
    const mühürsüzIdx = h.sozler.indexOf('Mühürsüz söz.') + 1;
    expect(htAlintiAyikla('[S' + muhurluIdx + ']', h.harita, h.sozler).alintilar[0].gun).toBeTruthy();
    expect(htAlintiAyikla('[S' + mühürsüzIdx + ']', h.harita, h.sozler).alintilar[0].gun).toBe('');
  });
});
