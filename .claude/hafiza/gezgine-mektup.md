---
name: gezgine-mektup
description: "13d modülü — ch-drawer profil satırı artık \"Emre the wanderer · Wanderer Movement\"; tıklayınca Ayarlar değil Gezgine Mektup overlay'i açılır; içerik admin \"Mektup\" sekmesinden, founder_letter tablosu (mig 015, elle uygula)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9fe9eab6-8c64-4324-af34-39e130ee4803
---

Gezgine Mektup (2026-06-11): `js/parts/13d-mektup.js` modülü.

- ch-drawer alt profil satırı artık kullanıcıyı değil Emre'yi gösterir: COACH_IMG (veya mektubun photo_url'ü) + "Emre the wanderer" + "Wanderer Movement". `_chSyncProfileRow` (11-w2-chat-cal) sadeleşti, `fmGetActive` importu kaldırıldı.
- `chDrawerProfile()` artık Ayarlar'a değil `mektupOpen()`'a gider (Ayarlar'a drawer'dan başka yol kalmadıysa ana menü arka yüzde duruyor).
- Mektup overlay: büyük oval altın çerçeveli portre + Fraunces başlık + Garamond gövde + ilk harf drop-cap + IM Fell el yazısı "Emre" imzası. CSS chat.css sonunda (mem-panel bloğundan sonra), z 10500. Grende `mix-blend-mode` KULLANMA — ekran görüntüsünde alt katmanı sızdırıyordu; düz opacity 0.05 + sheet'te `isolation: isolate`.
- İçerik: `founder_letter` tablosu (id=1 tek satır; title/body/photo_url) — `migrations/015_founder_letter.sql` Supabase'e ELLE uygulanmalı. Tablo yoksa/boşsa modüldeki DEFAULT_MEKTUP yer tutucusu gösterilir, hata sessiz.
- Admin: "Mektup" sekmesi (`switchAdmin('mektup')` → lazy import `renderMektupAdmin`); alanlar fotoğraf URL/başlık/gövde; "Önizle" `mektupPreviewFromAdmin()` kaydedilmemiş alanlarla açar; "Mektubu Yayınla" `saveMektup` upsert.
- Boş satır = paragraf; tek \n = <br>. window.mektup* main.js importuyla açılır.

İlgili: [[dil-modeli-kabugu]], [[build-source-convention]]
