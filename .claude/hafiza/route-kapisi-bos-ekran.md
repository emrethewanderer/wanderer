---
name: route-kapisi-bos-ekran
description: "GOTCHA — ALLOWED_VIEWS'ta odası olmayan hedef kullanıcıyı BOŞ EKRANA düşürür; iki statik kapı testi (03-allowed-views + 13s organ sözleşmesi)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 571fdbcd-29ce-4d4b-befc-3d7daf413421
  modified: 2026-08-17T08:33:14.560Z
---

`switchView` (03-auth-shell.js) ÖNCE bütün view'ların `active` sınıfını siler,
SONRA hedefi arar; bulamazsa `console.warn` + `return`. Yani DOM'u olmayan bir
hedef "işe yaramaz bir route" değil, **hiçbir ekranın açık olmadığı bir
uygulama** demektir. 2026-08-17'de `ALLOWED_VIEWS` 13 ölü hedef taşıyordu —
`?view=library` kullanıcıyı bomboş bir ekrana düşürüyordu.

Aynı turda ikinci sessiz kırık: 13s Geçiş Yolu organları `window[organAdi]` ile
**dinamik** çağırıyor (`13s:104 _openOrgan`). `skOpen`/`rvOpen`/`aynaOpenKanit`
hiç expose edilmemişti; 21 günlük yolun 6–10. günleri sessizce boşa düşüyordu.
`yetim-kopru-denetci.mjs` bunu göremez — dinamik erişim statik `window.foo?.()`
desenine benzemez.

**Why:** İki kırık da build ve testler yeşilken yaşıyordu. Mevcut 13s testleri
organı `vi.fn()` ile window'a KENDİLERİ asıyordu; mock, gerçeği örtüyordu.

**How to apply:**
- Yeni ekran eklerken `ALLOWED_VIEWS` + `switchView` dalı + `#<ad>-view`
  üçlüsünü birlikte düşün. Kapı: `tests/03-allowed-views.test.js` — izinli her
  hedefin `_src.html`'de odası var mı ve `switchView`'ın her `v === '…'` dalı
  gerçek bir ekrana mı bakıyor (alias'ları kaynaktan okur: arketip→oik,
  meclis→hasimlar).
- Bir modülün açıcısını `window`'a asmayı unutma: kapı
  `tests/13s-gecis-yolu.test.js` sonundaki "Perde organları — window
  sözleşmesi", PERDELER'deki her organ adının main.js expose bloğunda ya da bir
  parts dosyasının `window.X =` satırında durduğunu KAYNAKTAN doğrular
  (yorumlar ayıklanır ki açıklama satırı kanıt sayılmasın).
- Ölü route silerken yükleyici gövdesini ayrı düşün: `loadSummaries`,
  `loadRoadmap`, `loadUserProfile` dalları ölüydü ama fonksiyonların kendileri
  post-auth'ta canlı.

İlgili: [[yetim-kopru-denetcisi]] · [[olu-kod-temizlikleri]] ·
[[cekirdek-omurga-haritasi]]
