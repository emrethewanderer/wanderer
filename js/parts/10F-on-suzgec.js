/* ═══════════════════════════════════════════════════════
   10F — ÖN SÜZGEÇ · Yayından önceki tek bakış
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Halka anonimdir ve anonimlik bir vaat değil, bir mühürdür (10C: rumuzu
     sunucu yazar). Ama mührün koruyamadığı tek şey var: kullanıcının kendi
     eliyle yazdığı telefon numarası. "Mesele Sensin" diyen bir ürün,
     kullanıcıyı kendi anlık cömertliğinden de korumak zorundadır — çünkü
     paylaşılan kart geri alınabilir, ekran görüntüsü alınamaz.

     İkinci koruma yönü terstir: karanlık bir andaki cümle, anonim bir akışa
     değil, yanında durabilecek birine gitmelidir. Kriz halkanın işi değildir.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     `szDenetle(metin)` → { gecer, sebep, mesaj }. Yayın yolundaki iki yüzey
     bunu çağırır: 10C sfPostComment (yorum) ve 10A (kart metni). `gecer`
     false ise INSERT hiç denenmez.

   NE YAPMAZ — ve bu bir karardır, eksiklik değil:
     Küfür/hakaret kelime listesi YOKTUR. Üç gerekçe:
     (1) Yanlış pozitif, ürünün en kırılgan anında konuşur — insan kendi
         cümlesini paylaşırken. "Uygunsuz içerik" demek, sessiz bir hakarettir.
     (2) Kelime listesi niyet kanıtı olmadan hüküm verir; §6.10'un "kanıtı
         olmayan değer yoktur" kuralı yargılara da uygulanır.
     (3) Reaktif ⚑ raporu (10C sfReportCard → paylasim_raporlari → admin
         RAPORLAR ekranı) ikinci hat olarak ZATEN var ve insan gözü taşıyor.
     Ön süzgeç yalnız **tartışmasız** olanı tutar: kimlik bilgisi ve kriz.

   Kriz için ikinci bir dedektör YAZILMADI: `detectCrisis` (13-extras:816)
   on bir dilde desen taşıyor ve Emniyet Katmanı'nın tek kaynağıdır. Yeni bir
   motor kurmak, iki motorun zamanla ayrışması demekti (§1.3).

   Kalıcılık: yok — saf fonksiyon, durum tutmaz.
   Konvansiyon: i18n t(); window.sz* expose; stil yok (çağıran toast basar).
═══════════════════════════════════════════════════════ */
import { t } from './15-i18n.js';
import { detectCrisis } from './13-extras.js';

/* ─── 1. KİMLİK DESENLERİ ─── */

/* Desenler DAR tutuldu: her biri yanlış pozitifi yanlış negatife tercih
   etmeyecek şekilde yazıldı. "Bir sayı gördüm" değil, "bu bir numaraya
   benziyor" eşiği. Gevşek bir desen (ör. herhangi 10 hane) tarih, sayaç ve
   kilometre taşlarını da yakalardı — ve kullanıcı neden engellendiğini
   anlamazdı. */
const SZ_DESENLER = [
  {
    ad: 'telefon',
    /* TR cep: 0/+90 önekli ya da çıplak 5xx + 9 hane. Aralarda boşluk, nokta,
       tire ve parantez serbest — insanlar numarayı böyle yazar. */
    re: /(?:\+?90[\s.\-()]*)?0?[\s.\-()]*5\d{2}[\s.\-()]*\d{3}[\s.\-()]*\d{2}[\s.\-()]*\d{2}(?!\d)/,
  },
  {
    ad: 'eposta',
    re: /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/,
  },
  {
    ad: 'tckn',
    /* 11 hane, sıfırla başlamaz — TC kimlik numarasının biçimsel kuralı.
       Doğrulama algoritması KOŞULMAZ: amaç kimlik doğrulamak değil, "burada
       kimlik numarası olabilir" demek. */
    re: /(?<!\d)[1-9]\d{10}(?!\d)/,
  },
  {
    ad: 'iban',
    re: /\bTR\d{2}[\s]?(?:\d{4}[\s]?){5}\d{2}\b/i,
  },
];

/* ─── 2. TEK GİRİŞ ─── */

/**
 * Yayın öncesi tek bakış.
 * @param {string} metin — kullanıcının yazdığı ham metin
 * @returns {{gecer: boolean, sebep: string|null, mesaj: string|null}}
 *   `gecer:false` ise çağıran INSERT'i HİÇ denemez ve `mesaj`ı gösterir.
 *
 * Sıra bilinçlidir: kriz önce bakılır. Bir cümlede hem numara hem kriz
 * sinyali varsa, kullanıcıya söylenmesi gereken şey numara değildir.
 */
export function szDenetle(metin) {
  const s = String(metin == null ? '' : metin);
  if (!s.trim()) return { gecer: true, sebep: null, mesaj: null };

  /* Kriz — Emniyet Katmanı'nın kendi dedektörü (13-extras:816, 11 dil).
     Mesaj SUÇLAMAZ ve moderasyon dili kurmaz: burada engellenen bir kural
     ihlali değil, yanlış adrese gitmek üzere olan bir cümledir. */
  try {
    if (detectCrisis(s)) {
      return {
        gecer: false,
        sebep: 'kriz',
        mesaj: t('sz.kriz',
          'Bu cümle halkaya değil, yanında durabilecek birine gitmeli. ' +
          'Burada kalsın — ve istersen şimdi konuşalım.'),
      };
    }
  } catch (_) { /* dedektör yüklenmediyse süzgeç kimlik tarafını yine yapar */ }

  /* Kimlik — kullanıcıyı kendi anlık cömertliğinden koruma. */
  for (const d of SZ_DESENLER) {
    let bulundu = false;
    try { bulundu = d.re.test(s); } catch (_) { bulundu = false; }
    if (!bulundu) continue;
    return {
      gecer: false,
      sebep: d.ad,
      mesaj: t(`sz.${d.ad}`, _varsayilanMesaj(d.ad)),
    };
  }

  return { gecer: true, sebep: null, mesaj: null };
}

/* Inline fallback'ler (§5.2: UI string'lerde fallback ŞART). Ton kuralı:
   cümle kullanıcının metnini över, çıkarılacak şeyi adıyla söyler ve
   "uygunsuz" demez — çıkarılan şey içerik değil, iz. */
function _varsayilanMesaj(ad) {
  switch (ad) {
    case 'telefon': return 'Burada bir telefon numarası görünüyor. Cümlen kalsın — numara çıksın.';
    case 'eposta':  return 'Burada bir e-posta adresi görünüyor. Cümlen kalsın — adres çıksın.';
    case 'tckn':    return 'Burada kimlik numarasına benzeyen bir dizi var. Halka anonim; o da öyle kalsın.';
    case 'iban':    return 'Burada bir IBAN görünüyor. Bu alan onun yeri değil.';
    default:        return 'Bu metinde kişisel bir bilgi görünüyor.';
  }
}

/* ─── 3. WINDOW EXPOSE (TDZ-güvenli) ─── */
if (typeof window !== 'undefined') {
  window.szDenetle = szDenetle;
}
