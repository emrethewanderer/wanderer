---
name: safestorage-testlerde-kvcache
description: "GOTCHA: SafeStorage localStorage DEĞİL bellek-içi _kvCache üzerinde çalışır — testlerde localStorage.clear() izolasyon sağlamaz, SafeStorage.remove(key) gerekir"
metadata: 
  node_type: memory
  type: reference
  originSessionId: c828b587-a02e-4158-a38e-190faa343f37
  modified: 2026-07-31T18:15:46.212Z
---

`SafeStorage` (00a-infrastructure.js:256) **localStorage kullanmaz**: değerleri
modül kapsamındaki bellek-içi `_kvCache` Map'inde tutar ve arka planda
Supabase'e yazar (`_persistToSupabase`).

**Sonuç (2026-07-31'de 13u testlerinde yakalandı):** vitest/jsdom'da
`localStorage.clear()` SafeStorage'ı TEMİZLEMEZ. Bir testin `sdSave()`'i
bir sonraki testin `sdLoad()`/`sdInit()` çağrısında geri okunur ve test
"boş defter" beklerken dolu defter bulur — hata mesajı yanıltıcıdır
(davranış doğrudur, izolasyon yanlıştır).

**Why:** SafeStorage tarayıcı deposuna değil, hesap-başına Supabase'e
yaslanır; localStorage yalnız cihaz-yerel taslaklar için kullanılır.

**How to apply:** SafeStorage'a yazan bir modülü test ederken `beforeEach`
içinde anahtarı doğrudan sil:

```js
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
const TEST_UIDS = ['sd-test-user', 'baska-user'];
TEST_UIDS.forEach(uid => { try { SafeStorage.remove(`etw_x_v1_${uid}`); } catch (_) {} });
```

Per-uid anahtar kullanan modüllerde test uid'lerinin HEPSİ silinmeli —
"başka uid sızmıyor" testi kendi anahtarını da bırakır.
İlgili: [[soz-ihtiyac-motoru-karari]] [[test-kirilganligi-jsdom-stil-isinmasi]].
