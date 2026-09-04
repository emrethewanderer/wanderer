// Bildirimler · Web Push (10x) — saf-fonksiyon testleri
import { describe, it, expect, beforeEach } from 'vitest';
import {
  urlBase64ToUint8Array, _buildEngagementSnapshot,
  bildirimSessizKaydet, bildirimRenderSettings,
} from '../js/parts/10x-w2-bildirimler.js';
import { VAPID_PUBLIC } from '../js/config.js';
import { localISODate, SafeStorage } from '../js/parts/00a-infrastructure.js';
import { S } from '../js/state.js';

describe('urlBase64ToUint8Array', () => {
  it('base64url\'ı doğru byte dizisine çevirir', () => {
    const out = urlBase64ToUint8Array('AAAA'); // atob → 3 sıfır byte
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Array.from(out)).toEqual([0, 0, 0]);
  });

  it('VAPID public key 65 byte uncompressed P-256 noktasıdır (0x04 ile başlar)', () => {
    const key = urlBase64ToUint8Array(VAPID_PUBLIC);
    expect(key.length).toBe(65);
    expect(key[0]).toBe(0x04);
  });

  it('- ve _ karakterlerini (url-safe) standart base64\'e map\'ler', () => {
    // '-' → '+', '_' → '/' ; padding eklenir → çözülebilir olmalı
    const out = urlBase64ToUint8Array(VAPID_PUBLIC);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('_buildEngagementSnapshot', () => {
  beforeEach(() => {
    S._gunlukRitus = undefined;
    S.currentUser = { id: 'u1' };
    // Sessiz saat tercihi testler arası sızmasın — biri yazarsa öteki görmesin.
    try { SafeStorage.remove('etw_sessiz_saat_v1_u1'); } catch (_) {}
  });

  it('motor için gerekli tüm sinyal alanlarını içerir', () => {
    const snap = _buildEngagementSnapshot();
    expect(snap).toHaveProperty('tz');
    expect(snap).toHaveProperty('streak');
    expect(snap).toHaveProperty('last_active_date');
    expect(snap).toHaveProperty('last_sealed_date');
    expect(snap).toHaveProperty('pending_soz_text');
  });

  /* SESSİZ SAAT — sözleşme 2026-09-03'te DEĞİŞTİ (İç Çalışma 11 · boşluk C).
     Bu test eskiden `quiet_start === 23` diye kilitliyordu; yani kaldırılan
     davranışın kendisini koruyordu. Payload o iki anahtarı literal yazdığı
     sürece, kullanıcının tabloda ne tercihi olursa olsun her senkron onu
     geri eziyordu — "hardcode" değil, tercihi aktif olarak yok etmek.
     Yeni sözleşme: anahtar YALNIZ gerçek bir tercih varsa gönderilir;
     yoksa upsert onu hiç yazmaz ve DB varsayılanı (23/8, mig 000) ya da
     kullanıcının mevcut değeri korunur. */
  it('SESSİZ SAAT: tercih yokken quiet_* anahtarları payload\'a HİÇ girmez', () => {
    const snap = _buildEngagementSnapshot();
    expect(snap).not.toHaveProperty('quiet_start');
    expect(snap).not.toHaveProperty('quiet_end');
  });

  it('SESSİZ SAAT: geçerli tercih varsa iki anahtar da payload\'a girer', () => {
    SafeStorage.set('etw_sessiz_saat_v1_u1', { start: 1, end: 9 });
    const snap = _buildEngagementSnapshot();
    expect(snap.quiet_start).toBe(1);
    expect(snap.quiet_end).toBe(9);
  });

  it('SESSİZ SAAT: bozuk tercih sessizce düşer — yarım değer gönderilmez', () => {
    SafeStorage.set('etw_sessiz_saat_v1_u1', { start: 'gece', end: 9 });
    const snap = _buildEngagementSnapshot();
    expect(snap).not.toHaveProperty('quiet_start');
    expect(snap).not.toHaveProperty('quiet_end');
  });

  it('SESSİZ SAAT: aralık dışı saat (24) reddedilir', () => {
    SafeStorage.set('etw_sessiz_saat_v1_u1', { start: 24, end: 8 });
    const snap = _buildEngagementSnapshot();
    expect(snap).not.toHaveProperty('quiet_start');
  });

  it('lang alanı aktif arayüz diline eşit olur (push dil kilidi, mig 037)', () => {
    expect(_buildEngagementSnapshot().lang).toBe('tr');
  });

  it('last_active_date her zaman bugünün yerel ISO tarihidir', () => {
    expect(_buildEngagementSnapshot().last_active_date).toBe(localISODate());
  });

  it('söz/seri yokken streak 0 ve pending_soz_text null olur', () => {
    const snap = _buildEngagementSnapshot();
    expect(snap.streak).toBe(0);
    expect(snap.pending_soz_text).toBeNull();
  });

  it('bugün verilmiş, hesabı görülmemiş söz pending_soz_text\'e yansır', () => {
    S._gunlukRitus = {
      date: localISODate(),
      reckoned: false,
      pledges: [{ text: 'Bugün ertelediğim tek adımı atacağım.' }],
    };
    expect(_buildEngagementSnapshot().pending_soz_text).toContain('ertelediğim tek adımı');
  });

  it('akşam hesabı yapılmış (reckoned) söz artık pending sayılmaz', () => {
    S._gunlukRitus = {
      date: localISODate(),
      reckoned: true,
      pledges: [{ text: 'tutuldu' }],
    };
    expect(_buildEngagementSnapshot().pending_soz_text).toBeNull();
  });
});


/* ═══ SESSİZ SAAT YÜZEYİ — İç Çalışma 11 · boşluk C'nin kalan yarısı (FAZ 4)
   Okuyan taraf 3 Eylül'de yazıldı ve o günden beri daima {} döndü: yazan
   yüzey yoktu, yani tercih "ezilmiyor"du ama alınamıyordu da. Bu blok
   yüzeyi sınar — ve en önemlisi, tercih YOKKEN payload'ın hâlâ temiz
   kaldığını (DB varsayılanı bozulmuyor). */
describe('sessiz saat yüzeyi (FAZ 4)', () => {
  const kur = () => {
    document.body.innerHTML =
      '<select id="bld-quiet-start"></select>' +
      '<select id="bld-quiet-end"></select>' +
      '<p id="bld-quiet-note"></p>' +
      '<p id="push-status"></p><input type="checkbox" id="push-toggle">';
  };

  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    try { SafeStorage.remove('etw_sessiz_saat_v1_u1'); } catch (_) {}
    kur();
  });

  it('render 24 saat seçeneği doldurur ve DB varsayılanını gösterir (23/8)', () => {
    bildirimRenderSettings();
    const bas = document.getElementById('bld-quiet-start');
    const bit = document.getElementById('bld-quiet-end');
    expect(bas.options.length).toBe(24);
    expect(bit.options.length).toBe(24);
    // Uydurulmuş bir varsayılan DEĞİL — mig 000'in kolon varsayılanı.
    expect(bas.value).toBe('23');
    expect(bit.value).toBe('8');
  });

  it('tercih yokken not satırı bunun bir VARSAYILAN olduğunu söyler (§6.10)', () => {
    bildirimRenderSettings();
    const not = document.getElementById('bld-quiet-note').textContent;
    expect(not).toContain('varsayılan');
    // Seçili görünen bir değeri "senin seçimin" diye sunmak, kanıtı olmayan
    // bir iddiadır — kart da panel de bunu yapmaz, bu yüzey de yapmaz.
    expect(not).not.toContain('Senin seçimin');
  });

  it('kaydedince SafeStorage\'a yazar ve payload quiet_* taşır', async () => {
    bildirimRenderSettings();
    document.getElementById('bld-quiet-start').value = '1';
    document.getElementById('bld-quiet-end').value = '9';
    await bildirimSessizKaydet();
    expect(SafeStorage.get('etw_sessiz_saat_v1_u1')).toEqual({ start: 1, end: 9 });
    const snap = _buildEngagementSnapshot();
    expect(snap.quiet_start).toBe(1);
    expect(snap.quiet_end).toBe(9);
  });

  it('kaydedildikten sonra not satırı seçimi sahiplenir', async () => {
    bildirimRenderSettings();
    document.getElementById('bld-quiet-start').value = '2';
    document.getElementById('bld-quiet-end').value = '7';
    await bildirimSessizKaydet();
    expect(document.getElementById('bld-quiet-note').textContent).toContain('Senin seçimin');
  });

  it('geçersiz değer YAZILMAZ — payload temiz kalır, DB varsayılanı korunur', async () => {
    bildirimRenderSettings();
    document.getElementById('bld-quiet-start').value = '';
    await bildirimSessizKaydet();
    expect(SafeStorage.get('etw_sessiz_saat_v1_u1')).toBeFalsy();
    const snap = _buildEngagementSnapshot();
    expect(snap).not.toHaveProperty('quiet_start');
    expect(snap).not.toHaveProperty('quiet_end');
  });

  it('yüzey yoksa sessizce düşer — render ve kayıt çökmez', async () => {
    document.body.innerHTML = '';
    expect(() => bildirimRenderSettings()).not.toThrow();
    await expect(bildirimSessizKaydet()).resolves.toBeUndefined();
  });
});
