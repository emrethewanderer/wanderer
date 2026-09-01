/**
 * Kod kapısı — 03-auth-shell.js · FAZ 2
 *
 * Kapının gövdesi: adres normalizasyonu, kod haneleri ve iki Supabase çağrısı
 * (signInWithOtp · verifyOtp). Ağ tarafı setup.js'in stub'ıyla kesilir; burada
 * sınanan şey KAPININ DAVRANIŞI — hangi adrese gönderildiği, hangi hâlde hiç
 * gönderilmediği, kodun nasıl okunduğu.
 *
 * Kritik sözleşme: _authAdresNormal TEK normalizasyon noktasıdır. İkinci bir
 * kopya çıkarsa kod bir adrese gider, doğrulama başkasına yapılır ve kullanıcı
 * doğru kodu yazdığı hâlde "geçersiz kod" görür.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  _authAdresNormal,
  _authAdresSupheli,
  authAdresAc,
  authKodIste,
  authKodDogrula,
  authKodTekrar,
  authAdresDegistir,
  authKodHane,
  authKodTus,
  authKodYapistir,
  authEsigeDon,
} from '../js/parts/03-auth-shell.js';
import { sb } from '../js/config.js';

/* Eşiğin sınanan parçası — gerçek _src.html'in aynı id/sınıf iskeleti. */
function esikKur() {
  document.body.innerHTML = `
    <div id="auth-screen">
      <div class="auth-panel" id="auth-adres" style="display:none;">
        <input id="auth-adres-input" type="email">
        <button id="auth-adres-btn">Kodu gönder</button>
      </div>
      <div class="auth-panel" id="auth-kod" style="display:none;">
        <strong id="auth-kod-hedef">—</strong>
        <div class="auth-kod-haneler" id="auth-kod-haneler">
          <input class="auth-kod-hane" maxlength="1">
          <input class="auth-kod-hane" maxlength="1">
          <input class="auth-kod-hane" maxlength="1">
          <input class="auth-kod-hane" maxlength="1">
          <input class="auth-kod-hane" maxlength="1">
          <input class="auth-kod-hane" maxlength="1">
        </div>
        <button id="auth-kod-btn">Eşiği geç</button>
        <button id="auth-kod-tekrar">Yeniden gönder</button>
      </div>
      <div class="auth-panel" id="auth-tanisma" style="display:none;"></div>
      <div class="auth-err" id="auth-error"></div>
    </div>`;
}

const haneler = () => Array.from(document.querySelectorAll('#auth-kod-haneler .auth-kod-hane'));
const hata    = () => document.getElementById('auth-error').textContent;

beforeEach(() => {
  esikKur();
  vi.clearAllMocks();
  vi.useRealTimers();
});

afterEach(() => {
  // Geri sayım gerçek bir interval kurar; panelden çıkmadan biten test onu
  // arkada bırakır ve sonraki testin sahte zamanlayıcısını kirletir.
  authEsigeDon();
  vi.useRealTimers();
});

describe('_authAdresNormal() — tek normalizasyon noktası', () => {
  it('boşlukları kırpar ve küçük harfe indirir', () => {
    // Adres kimliğin KENDİSİ: "Emre@X.com" ile "emre@x.com" aynı hesap
    // olmalı, yoksa aynı kişi iki hesaba ve iki ayrı geçmişe bölünür.
    expect(_authAdresNormal('  Emre@Ornek.COM ')).toBe('emre@ornek.com');
  });

  it('geçerli adresi olduğu gibi kabul eder', () => {
    expect(_authAdresNormal('emre.gulluce+wanderer@ornek.co.uk')).toBe('emre.gulluce+wanderer@ornek.co.uk');
  });

  it('@ içermeyen girdiyi reddeder', () => {
    expect(_authAdresNormal('emre.ornek.com')).toBeNull();
  });

  it('alan adı uzantısı olmayan adresi reddeder', () => {
    expect(_authAdresNormal('emre@ornek')).toBeNull();
  });

  it('boşluk taşıyan adresi reddeder', () => {
    expect(_authAdresNormal('emre @ornek.com')).toBeNull();
  });

  it('iki @ taşıyan adresi reddeder', () => {
    expect(_authAdresNormal('emre@@ornek.com')).toBeNull();
  });

  it('aşırı uzun adresi reddeder', () => {
    expect(_authAdresNormal('a'.repeat(250) + '@ornek.com')).toBeNull();
  });

  it('boş girdide çökmez', () => {
    expect(_authAdresNormal('')).toBeNull();
    expect(_authAdresNormal(null)).toBeNull();
    expect(_authAdresNormal(undefined)).toBeNull();
  });
});

describe('authAdresAc()', () => {
  it('adres panelini öne alır', () => {
    // Kapı seçim ekranı söküldü: eşik zaten adresi gösterir, bu fonksiyon
    // yalnız panelden panele dönüşler için durur.
    document.getElementById('auth-adres').style.display = 'none';
    authAdresAc();
    expect(document.getElementById('auth-adres').style.display).toBe('block');
  });
});

describe('authKodIste()', () => {
  it('geçersiz adreste posta İSTEMEZ — sahte başarı yok', async () => {
    document.getElementById('auth-adres-input').value = 'emre';
    await authKodIste();
    expect(sb.auth.signInWithOtp).not.toHaveBeenCalled();
    expect(document.getElementById('auth-kod').style.display).toBe('none');
    expect(hata()).not.toBe('');
  });

  it('geçerli adreste normalize edilmiş adrese gönderir ve kod panelini açar', async () => {
    document.getElementById('auth-adres-input').value = '  Emre@Ornek.COM ';
    await authKodIste();
    expect(sb.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'emre@ornek.com' });
    expect(document.getElementById('auth-adres').style.display).toBe('none');
    expect(document.getElementById('auth-kod').style.display).toBe('block');
    expect(document.getElementById('auth-kod-hedef').textContent).toBe('emre@ornek.com');
  });

  it('sağlayıcı hatasında kod paneli AÇILMAZ ve hata görünür', async () => {
    sb.auth.signInWithOtp.mockResolvedValueOnce({ data: null, error: { message: 'over_email_send_rate_limit' } });
    document.getElementById('auth-adres-input').value = 'emre@ornek.com';
    await authKodIste();
    expect(document.getElementById('auth-kod').style.display).toBe('none');
    expect(hata()).not.toBe('');
  });

  it('butonu hata sonrası tekrar kullanılabilir bırakır', async () => {
    sb.auth.signInWithOtp.mockResolvedValueOnce({ data: null, error: { message: 'Signups not allowed for otp' } });
    document.getElementById('auth-adres-input').value = 'emre@ornek.com';
    await authKodIste();
    expect(document.getElementById('auth-adres-btn').disabled).toBe(false);
  });
});

describe('kod haneleri', () => {
  it('rakam olmayanı yutar', () => {
    const h = haneler()[0];
    h.value = 'a';
    authKodHane(h);
    expect(h.value).toBe('');
  });

  it('hane dolunca sonrakine geçer', () => {
    const h = haneler();
    h[0].value = '4';
    authKodHane(h[0]);
    expect(document.activeElement).toBe(h[1]);
  });

  it('boş hanede Backspace önceki haneyi siler ve oraya döner', () => {
    const h = haneler();
    h[0].value = '4';
    h[1].value = '';
    const ev = { key: 'Backspace', preventDefault: vi.fn() };
    authKodTus(ev, h[1]);
    expect(h[0].value).toBe('');
    expect(document.activeElement).toBe(h[0]);
    expect(ev.preventDefault).toHaveBeenCalled();
  });

  it('ilk hanede Backspace hiçbir şeyi bozmaz', () => {
    const h = haneler();
    const ev = { key: 'Backspace', preventDefault: vi.fn() };
    expect(() => authKodTus(ev, h[0])).not.toThrow();
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });

  it('yapıştırılan kodu altı haneye dağıtır', () => {
    const ev = { clipboardData: { getData: () => '481902' }, preventDefault: vi.fn() };
    authKodYapistir(ev);
    expect(haneler().map(el => el.value).join('')).toBe('481902');
    expect(ev.preventDefault).toHaveBeenCalled();
  });

  it('posta metninden yapıştırılan kodu ayıklar', () => {
    const ev = { clipboardData: { getData: () => 'Wanderer kodun: 481902' }, preventDefault: vi.fn() };
    authKodYapistir(ev);
    expect(haneler().map(el => el.value).join('')).toBe('481902');
  });

  it('panosu boş yapıştırmada çökmez ve olayı yutmaz', () => {
    const ev = { clipboardData: { getData: () => '' }, preventDefault: vi.fn() };
    expect(() => authKodYapistir(ev)).not.toThrow();
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });
});

describe('authKodDogrula()', () => {
  it('eksik kodda doğrulama İSTEMEZ', async () => {
    haneler()[0].value = '4';
    await authKodDogrula();
    expect(sb.auth.verifyOtp).not.toHaveBeenCalled();
    expect(hata()).not.toBe('');
  });

  it('adres alınmadan doğrulama İSTEMEZ', async () => {
    haneler().forEach((el, i) => { el.value = String(i); });
    await authKodDogrula();
    expect(sb.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('kodu, kodun GÖNDERİLDİĞİ adrese karşı doğrular', async () => {
    document.getElementById('auth-adres-input').value = 'emre@ornek.com';
    await authKodIste();
    // Kullanıcı arada alanı değiştirdi — doğrulama yine ilk adrese yapılmalı.
    document.getElementById('auth-adres-input').value = 'baska@ornek.com';
    haneler().forEach((el, i) => { el.value = '481902'[i]; });
    await authKodDogrula();
    expect(sb.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'emre@ornek.com', token: '481902', type: 'email',
    });
  });

  it('yanlış kodda haneleri temizler ve oturum açmaz', async () => {
    document.getElementById('auth-adres-input').value = 'emre@ornek.com';
    await authKodIste();
    sb.auth.verifyOtp.mockResolvedValueOnce({ data: null, error: { message: 'Token has expired or is invalid' } });
    haneler().forEach((el, i) => { el.value = '000000'[i]; });
    await authKodDogrula();
    expect(haneler().map(el => el.value).join('')).toBe('');
    expect(hata()).not.toBe('');
    expect(document.getElementById('auth-kod').style.display).toBe('block');
  });
});

describe('authAdresDegistir()', () => {
  it('kod panelini kapatır, haneleri siler, adres paneline döner', async () => {
    document.getElementById('auth-adres-input').value = 'emre@ornek.com';
    await authKodIste();
    haneler()[0].value = '7';
    authAdresDegistir();
    expect(document.getElementById('auth-kod').style.display).toBe('none');
    expect(document.getElementById('auth-adres').style.display).toBe('block');
    expect(haneler().map(el => el.value).join('')).toBe('');
  });
});

describe('authKodTekrar() — geri sayım', () => {
  it('sayaç dolmadan ikinci posta göndermez', async () => {
    document.getElementById('auth-adres-input').value = 'emre@ornek.com';
    await authKodIste();
    expect(sb.auth.signInWithOtp).toHaveBeenCalledTimes(1);
    await authKodTekrar();
    expect(sb.auth.signInWithOtp).toHaveBeenCalledTimes(1);
  });

  it('sayaç işlerken tekrar butonu kilitlidir ve kalan süreyi yazar', async () => {
    document.getElementById('auth-adres-input').value = 'emre@ornek.com';
    await authKodIste();
    const btn = document.getElementById('auth-kod-tekrar');
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toMatch(/60/);
  });

  it('sayaç bitince kilit açılır ve ikinci posta gider', async () => {
    // Sahte zamanlayıcı interval KURULMADAN ÖNCE takılmalı: sonra takılırsa
    // gerçek zamanla doğmuş interval'ı ilerletemez ve test kapıyı değil
    // kendi kurulumunu ölçer.
    vi.useFakeTimers();
    document.getElementById('auth-adres-input').value = 'emre@ornek.com';
    await authKodIste();
    const btn = document.getElementById('auth-kod-tekrar');
    expect(btn.disabled).toBe(true);
    vi.advanceTimersByTime(61000);
    expect(btn.disabled).toBe(false);
    vi.useRealTimers();
    await authKodTekrar();
    expect(sb.auth.signInWithOtp).toHaveBeenCalledTimes(2);
  });
});

describe('_authAdresSupheli() — sekmenin en ucuz panzehiri (K9)', () => {
  it('yaygın alan adı yazım hatasını düzeltilmiş hâliyle önerir', () => {
    expect(_authAdresSupheli('emre@gmial.com')).toBe('emre@gmail.com');
    expect(_authAdresSupheli('emre@hotmial.com')).toBe('emre@hotmail.com');
    expect(_authAdresSupheli('emre@yahoo.co')).toBe('emre@yahoo.com');
  });

  it("'.con' uzantısını alan adı listesinden bağımsız yakalar", () => {
    expect(_authAdresSupheli('emre@kendifirmasi.con')).toBe('emre@kendifirmasi.com');
  });

  it('sağlam adres için şüphe üretmez', () => {
    expect(_authAdresSupheli('emre@gmail.com')).toBeNull();
    expect(_authAdresSupheli('emre@kendifirmasi.com.tr')).toBeNull();
  });

  it('bozuk girdide çökmez', () => {
    expect(_authAdresSupheli('')).toBeNull();
    expect(_authAdresSupheli('@gmial.com')).toBeNull();
    expect(_authAdresSupheli(null)).toBeNull();
  });
});

describe('şüphe kapısı ENGELLEMEZ, sorar', () => {
  it('şüpheli adreste ilk basışta göndermez, öneriyi gösterir', async () => {
    document.getElementById('auth-adres-input').value = 'emre@gmial.com';
    await authKodIste();
    expect(sb.auth.signInWithOtp).not.toHaveBeenCalled();
    expect(hata()).toContain('emre@gmail.com');
    expect(document.getElementById('auth-kod').style.display).toBe('none');
  });

  it('ikinci basış onaydır — kullanıcının yazdığı adrese gönderir', async () => {
    const el = document.getElementById('auth-adres-input');
    el.value = 'emre@gmial.com';
    await authKodIste();          // sorar
    await authKodIste();          // onaylar
    expect(sb.auth.signInWithOtp).toHaveBeenCalledTimes(1);
    expect(sb.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'emre@gmial.com' });
  });

  it('sağlam adreste hiç sormaz', async () => {
    document.getElementById('auth-adres-input').value = 'emre@gmail.com';
    await authKodIste();
    expect(sb.auth.signInWithOtp).toHaveBeenCalledTimes(1);
  });
});

describe('authKodDogrula() — BAŞARI yolu', () => {
  it('doğru kodda geri sayımı durdurur ve haneleri SİLMEZ', async () => {
    document.getElementById('auth-adres-input').value = 'emre@ornek.com';
    await authKodIste();
    sb.auth.verifyOtp.mockResolvedValueOnce({
      data: { user: { id: 'u1', email: 'emre@ornek.com', user_metadata: {}, app_metadata: { provider: 'email' } } },
      error: null,
    });
    haneler().forEach((el, i) => { el.value = '481902'[i]; });
    await authKodDogrula();

    expect(sb.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'emre@ornek.com', token: '481902', type: 'email',
    });
    // Hata yolunda haneler temizlenir; başarı yolunda temizlenmemeli.
    expect(haneler().map(el => el.value).join('')).toBe('481902');
    // Geri sayım durmuş olmalı — eşik kapandıysa saniyede bir çalışan
    // bir interval arkada kalmamalı.
    expect(document.getElementById('auth-kod-tekrar').disabled).toBe(false);
  });

  it('initApp patlarsa "ağ hatası" DEMEZ — kod tek kullanımlıktır, yanlış teşhis kilitler', async () => {
    document.getElementById('auth-adres-input').value = 'emre@ornek.com';
    await authKodIste();
    sb.auth.verifyOtp.mockResolvedValueOnce({ data: { user: null }, error: null });
    haneler().forEach((el, i) => { el.value = '481902'[i]; });
    await authKodDogrula();
    expect(hata()).not.toBe('');
    expect(hata().toLowerCase()).not.toContain('bağlantı');
  });
});
