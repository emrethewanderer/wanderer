---
name: oz-denetim-ve-commit-kapanisi
description: "Her çalışma turu sonunda detaylı öz-denetim (bul→düzelt) yapılır, SONRA git commit ile kapatılır — durağan talimat, push hariç"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8e03ac4b-80fb-49e9-aeeb-762e37e16f11
  modified: 2026-07-24T14:52:46.290Z
---

Her çalışma bitiminde (bir görev/istek tamamlandığında), doğrulama
kapısından (build→test→preview→konsol) geçtikten SONRA iki adımlık bir
kapanış zorunlu:

1. **Öz-denetim turu:** o turda yapılan HER şeyi baştan sona yeniden
   incele — yapılanları detaylı analiz et, hataları/sorunları bul, düzelt,
   iyileştirmeleri uygula. Bulup rapor edip bırakmak yetmez; düzeltilmiş
   olarak raporlanır.
2. **Commit:** `git status`/`git diff` ile neyin gireceğini gözden geçir
   (sır/kimlik bilgisi taşıyan dosyaya dikkat), anlamlı bir mesajla commit
   oluştur ve turu kapat.

**Why:** Emre 2026-07-24'te bunu durağan bir çalışma kuralı olarak verdi —
"her çalışma bitiminde detaylı analiz + hata giderme + commit ile bitirsin"
istedi. Bu, genel sistem kuralının ("yalnız istenince commit et") BİLİNÇLİ
ve kalıcı istisnasıdır: onay her turda tekrar sorulmaz, çünkü talimat
PROTOKOL-FABLE.md'ye (repo kökü, her oturumda otomatik yüklenir) işlendi.
**Push bu kapsamda DEĞİL** — push hâlâ ayrı, açık onay ister.

**How to apply:** Kanonik metin `PROTOKOL-FABLE.md` §3.5 "Sprint kapanışı
(öz-denetim + commit)" ve §9 kontrol listesinde işlendi (bkz.
[[fable-protokol-belgesi]] — yeni çalışma-tarzı kuralları hem hafızaya hem
protokole yazılır). [[fable-5-gorev-listesi-protokolu]] görev-içi ara
kontrolleri kapsar (her TaskUpdate `completed` öncesi); bu memory ise
TURUN/sprint'in tamamı bittiğindeki NİHAİ kapanışı kapsar — ikisi birlikte
çalışır, biri diğerinin yerine geçmez. Küçük, tek mesajlık sorular (kod
değişikliği içermeyen) bu kapanışı tetiklemez — yalnız gerçek
değişiklik/görev turları.
