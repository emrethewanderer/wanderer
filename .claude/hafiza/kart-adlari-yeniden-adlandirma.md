---
name: kart-adlari-yeniden-adlandirma
description: "KARAR (2026-07-24) — Benlik Kartım / Benim Kartım / Senin Kartın adları birbirine karışıyor; Emre ÜÇÜNÜ BİRDEN yeniden adlandırmayı seçti (görünen metin değişir, sözleşmeler korunur)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7dbc7b06-d9c9-4836-9455-08d89a7075a3
  modified: 2026-07-25T10:37:34.236Z
---

**Bulgu (2026-07-24, "uygulamayı kullanıcı gibi gez" turunda):** üç ayrı yüzey
birbirine çok benzeyen adlar taşıyor ve gerçek bir kullanıcı bunları aynı şey
sanıyor. Kod doğru — üçünün veri kaynağı da AYRI:

| Görünen ad | Modül | Gerçekte ne | Veri kaynağı |
|---|---|---|---|
| **Benlik Kartım** | `02c-self-card.js` (`sc.*`) | kullanıcının EL YAZISIYLA yazdığı tek canlı kimlik kartı; onboarding'de doğar | `S._benlikKarti` |
| **Benim Kartım** | `10A-an-karti.js` (`ak.*`) | altın/lapis iki kutuplu AN kartı töreni (Atölye) | `S._anKartlari` / `benim_kartlarim` tablosu |
| **Senin Kartın** | `10q-w2-kisi-karti.js` (`kk.living.*`) | KART DEĞİL — toplanan Kişi Kartları'ndan türeyen bütünlük göstergesi (4 boyut + /100) | `S._kisiKarti.profile` |

En kafa karıştırıcı olan üçüncüsü: "kart" denen şey aslında bir ölçü/gösterge.
Kullanıcı Kişilerim'de dolu barlı "Senin Kartın"ı görüp, Benlik Kartım'da
"Kartın henüz boş" yazısıyla karşılaşınca çelişki sanıyor.

**Emre'nin kararı (2026-07-24, AskUserQuestion):** "Üçünü birden yeniden
adlandıralım." → kapsamlı adlandırma turu; üç yüzeyin de görünen adı masada.

**SEÇİLEN AD SİSTEMİ (Emre, 2026-07-24 · "Sistem A"):**

| Modül | ESKİ ad | **YENİ ad** | EN |
|---|---|---|---|
| 02c | Benlik Kartım | **Portrem** | My Portrait |
| 10A | Benim Kartım | **Geçiş Kartım** | My Transition Card |
| 10q | Senin Kartın | **Bütünlüğün** | Your Wholeness |

Gerekçe: "kart" kelimesi yalnız GERÇEK kartlarda kalır (10q bir ölçüdür, kart
değil); 02c modülün kendi "portre" dilini benimser ("ilk portren, yolun
başlangıcı"); 10A altın→lapis GEÇİŞİNİ adında taşır (Geçiş Motoru'yla aynı dil).
Türkçe ek uyumuna dikkat: Portrem / Portren / Portrenden / Portresine.

**⚠️ AŞILDI (2026-07-25):** Aşağıdaki "korunan sözleşmeler" sınırı ARTIK
GEÇERLİ DEĞİL. Emre §4.3'ü tersine çevirdi (görünen ad değişirse iç ad da
değişir) ve üç kartın iç adı da koda taşındı — `sc.`→`por.`, `ak.`→`gk.`,
`kk.living`→`kk.butunluk`, storage ve Supabase tabloları dahil.
**Güncel ad haritası için [[ad-senkronu-kurali]]'na bak.** Aşağısı yalnız
o turun tarihsel kaydıdır:

- ~~`window.*` fonksiyon adları (`akOpen*`, `benlik*` …)~~ → `gkOpen*`, `por*`
- ~~DOM id'leri (`#benlik-root`, `#ak-*`, `#kk-living-header`)~~ → `#portre-root`, `#gk-*`, `#kk-butunluk-header`
- ~~storage anahtarları~~ → `etw_portre_*`, `etw_gecis_kartlari_v1` (geri-okumalı göç)
- ~~Supabase tablo adları~~ → `portre`, `gecis_kartlarim` (mig 039, ELLE)
- ~~kod önekleri kalır~~ → hepsi döndü (`kk` hariç: Kişilerim'in adı değişmedi)

**UYGULANDI (2026-07-24, aynı tur):** 59 sözlük değeri (TR 29 + EN 30) + 6
`_src.html` statik metni + 7 JS inline fallback'i döndü. Yol boyunca 4 i18n'siz
statik metin bulunup bağlandı (`sc.topbar_title`, `sc.topbar_mode`,
`sc.drawer_kicker` yeni; `studio.room.kkmine` yeniden kullanıldı).

**Konvansiyon — ARTIK GEÇERSİZ:** o turda kod tanımlayıcıları ve i18n anahtar
önekleri eski adı korumuştu; 2026-07-25'te bu konvansiyonun kendisi kaldırıldı
(bkz. [[ad-senkronu-kurali]]). Grep ederken **yeni** adı kullan.

Kapı: build yeşil · 1136 vitest · preview'da TR+EN canlı doğrulandı
(`ESKI_AD_KALDI: false` her iki dilde) · konsol temiz.
Doğrulanamayan tek yüzey: Kişilerim'deki canlı `kk-living-header` paneli
(auth+veri ister, anon preview'da render olmuyor) — sözlük değerleri ve
`t()` çağrı yolu doğrulandı, panelin kendisi Emre'nin oturumunda görülmeli.

Bkz. [[benlik-karti-2-olunan-ad]], [[an-karti]], [[kisilerim-kart-motoru]],
[[tr-en-i18n-tamamlama]] (aynı turda kapanan aria i18n dalgası).
