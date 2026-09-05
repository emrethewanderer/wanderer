/* ═══════════════════════════════════════════════════════
   13a1 — ARAÇ ETİKETLERİ · protokol etiketlerinin SAF YAPRAK kaydı
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     LLM'in eline verilen her etiket bir sözleşmedir ve oda 09'un
     Korunanlar'ı onu tek cümleyle bağlar: *protokol blokları
     finalize/history/DB'den DAİMA sıyrılır.* "Daima" bir koşul kabul
     etmez — kullanıcı, modelin kendisiyle konuştuğu dili ekranda görmez.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     Bu dosya `[KART]` ve `[NISAN]` etiketlerinin marker/regex/parse
     kayıtlarını tutar ve İKİ SAF FONKSİYON verir: `etiketCoz(tur, metin)`
     ve `etiketRegex(tur)`. `13a` onları kendi registry'sine katar
     (`_ARAC_DEFS`), tüketiciler (`10B`, `12e`) doğrudan buradan alır.

   NEDEN AYRI BİR DOSYA — döngü ve "daima" (İç Çalışma 09 · K5, FAZ 9):
     Tüketiciler önce `13a`'yı statik import etti ve gerçek bir döngü
     doğdu: `13a → 06-summary-chat/13-extras → 03-auth-shell → 10B/12e →
     13a`. Döngü iki testi kırdı, o yüzden `window.arac*` köprüsüne
     geçildi — ama köprü sessizce boş kalabilir ve o an etiket EKRANDA
     KALIRDI. Yani döngü kapanırken "daima" sözleşmesi delinmişti.
     Doğru kesme yeri burasıdır: bu dosya HİÇBİR ŞEY import etmez, bu
     yüzden onu import etmek döngü doğurmaz ve tüketici garantisini
     çalışma zamanına değil derleme zamanına bağlar. (Repo'nun
     "saf-yaprak" kuralının aynısı — sidecar'larda da böyle yapılır.)

   Kalıcılık: yok — saf veri + saf fonksiyon, yan etkisi yok.
   Konvansiyon: `window.*` expose YOK (tüketiciler statik import eder);
     domain doğrulaması burada DEĞİL — `[NISAN]` id'sinin gerçek bir nişan
     olup olmadığına `12e` bakar, registry sözlüğü içeri almaz (§1.3).
═══════════════════════════════════════════════════════ */

/* ─── 1. KAYITLAR ─── */
export const ARAC_ETIKETLERI = {
  // [KART: tohum] — 10B'nin sohbet köprüsü. Chip DEĞİL: etiket görünür
  // metinden gizlenir, tohum Atölye tasarımını besler (10B kendi kararı).
  kart: {
    marker: 'KART',
    re: /\[KART:\s*([^\]]{3,200})\]/i,
    parse: (m) => {
      const seed = m[1].replace(/\s+/g, ' ').trim().slice(0, 280);
      // Kısa tohum (regex boşluk yutarak {3,200}'ü sağlamış olabilir)
      // reddedilir — eski `_extractKartTag`'in davranışı birebir: etiket
      // varmış gibi görünüp seed geçersizse KART hiç bulunmamış sayılır.
      return seed.length >= 3 ? { seed } : null;
    },
  },
  // [NISAN:id] — 12e'nin Emre köprüsü. Chip DEĞİL: id HAM hâlde döner,
  // NISANLAR'a karşı doğrulama bilerek 12e'de kalır.
  nisan: {
    marker: 'NISAN',
    re: /\[NISAN:\s*([a-z_]+)\s*\]/i,
    parse: (m) => ({ id: m[1].toLowerCase() }),
  },
};

/* ─── 2. SAF ÇÖZÜCÜLER ─── */

/** Eşleşme yoksa ya da `parse` geçersiz kılarsa `null`; varsa parse
 *  alanları + ham etiket (`tag`) + etiketi çıkarılmış metin (`clean`). */
export function etiketCoz(tur, metin) {
  const def = ARAC_ETIKETLERI[tur];
  if (!def?.re) return null;
  const raw = String(metin || '');
  const m = raw.match(def.re);
  if (!m) return null;
  const parsed = def.parse ? def.parse(m) : {};
  if (!parsed) return null;
  return { ...parsed, tag: m[0], clean: raw.replace(def.re, '').trim() };
}

/** Ham regex — tüketici kendi metnini (ör. render edilmiş `body.innerHTML`)
 *  temizlerken kullanır. İkizini yazmasın diye buradan verilir. */
export function etiketRegex(tur) {
  return ARAC_ETIKETLERI[tur]?.re || null;
}
