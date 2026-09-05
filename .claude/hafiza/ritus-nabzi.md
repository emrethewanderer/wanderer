---
name: ritus-nabzi
description: "wtLogRitus (kind='ritus') — dokuz ritüel yüzeyinin hunisi; Gözlemevi'nde Ritüellerin Nabzı; ELLE: migration 045"
metadata:
  type: project
---

**19 Ağustos 2026 · İç Çalışma 05 rev.3 FAZ 1 ve 3.** Ritüel mimarisi ürünün
dönüşüm motorudur ve motorun devri ölçülmüyordu: dört direk (10i/10k/10l/10m)
ile üç yeni yüzey (10n/13A/10h) hiç yazmıyordu, 10s ile 10t yalnız törenin
SÜRESİNİ yazıyordu.

**Kanal:** `wtLogRitus(ritus, olay, {adim, sureMs, n})` → `kind:'ritus'`
(`00f:352`), `wtLogKart`'ın ikizi. Şema değişmez — mevcut `usage_events`
satırıdır. `screen`=ritüel adı, `prev_screen`=olay, `meta={adim,n}`.
- **Kapalı kümeler:** ritüel = `gunluk-ritus · hayal · kendinle-konusma ·
  degerlendirme · engel-atlasi · dinlenme · derin-calisma · sefer ·
  seri-muhru`; olay = `basladi · tamam · birakti`.
- **Gizlilik:** meta yalnız iki sayı taşır; kullanıcının cümlesi hiç girmez.
- **Damgayı teslim eden basar:** `tamam` state kaydeden `xxSave()`'de değil,
  ritüelin kendi mühür/bitiş anında yazılır.
- **`wtTorenSonuc` ile ilişkisi:** o YEREL oturum izine yazar (Tanıma
  Motoru'nun seçicisi okur), `wtLogRitus` sunucu kolunu açar. Anlam kümesi
  tektir: muhur↔tamam, kapat↔birakti.

**Panel:** `13q _ritusNabzi` — başlayan/sonuna kalan gezgin · söz veren ↔
akşam hesabını veren · tutulan söz · yarıda bırakılan; ritüel çubukları ve
"yarım kalanların durduğu adım". Beş teşhis eşiği yarışmaz (if/else), en
ağırı konuşur.

**DİKİŞ:** `00f._RITUS` ile `13q._RITUS_AD` anahtarları ÖRTÜŞMELİ — ayrışırsa
panel yeni bir ritüeli "sessiz direk" sanıp admin'e yanlış teşhis basar.
`tests/13q-gozlemevi.test.js`'te küme aynası testi bunu mühürler.

**ELLE bekleyen:** `migrations/045_gozlemevi_ritus_nabzi.sql` (044'ün gövdesi +
`ritus_pulse`). Uygulanmadan panel çizilmez — kanıtsız sıfır basmaz (§6.10);
durumu Gözlemevi'ndeki Şema Sondası söyler.

İlgili: [[gozlemevi-kullanim-nabzi]] · [[kart-evreni-koleksiyon-nabzi]] ·
[[emek-sayar-bakis-saymaz]] · [[wanderer-gamification-engine]] ·
[[tanima-motoru]] · [[gerceklik-mimarisi]]
