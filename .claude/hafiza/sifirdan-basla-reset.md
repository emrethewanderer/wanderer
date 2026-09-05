---
name: sifirdan-basla-reset
description: "Ayarlar \"Sıfırdan Başla\" — hesabı silmeden tüm kişisel veriyi temizleyip yeni hesap gibi devam"
metadata: 
  node_type: memory
  type: project
  originSessionId: 693dcc94-1675-4209-b303-31e5ea9ddc4b
---

Ayarlar > "Verim & Hesabım" bölümünde üçüncü seçenek: **Sıfırdan Başla** (altın buton, kırmızı "Kalıcı Sil"in ikizi ama silmeden).

Akış: `gdpr.js` `resetUserData('SIFIRLA')` → `reset-user` edge fn → istemci `_clearLocalUserState()` (tüm `etw_*` localStorage anahtarları **etw_lang hariç** + `indexedDB.deleteDatabase('etw-idb-v1')`) → `location.reload()`. Oturum/profiles satırı korunur → aynı login, trial/premium/admin bozulmaz, Benlik Kartı onboarding'i (`S._benlikKarti?.confirmed` kapısı) baştan tetiklenir.

`reset-user` = `delete-user`'ın ikizi: aynı `USER_TABLES` listesi + storage temizliği, AMA `auth.admin.deleteUser` YOK; profiles satırı silinmez, yalnız `{message_count:0, avatar:null}` ile nötrlenir (service_role olduğu için 017 trigger kilitlemez). Yeni kullanıcı tablosu eklenince listeyi HER İKİ fonksiyonda da güncelle.

**Emre'nin ELLE yapması:** `supabase functions deploy reset-user`. Migration gerekmez (şema değişikliği yok). `ALLOWED_ORIGIN` env zaten delete-user ile paylaşılıyor.

İlgili: [[sistem-saglik-taramasi]] (delete-user GDPR), [[benlik-karti]] (onboarding kapısı).
