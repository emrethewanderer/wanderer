---
name: gundem-oneriye-yedirildi
description: "KARAR 2026-08-10 — haftanın gündemi (DÖNEM KARTI, K7) kendi kutusunu kaybetti; Kişiler ekranındaki \"Emre'nin Önerisi\" bloğuna yedirildi"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4fdddb5f-7b09-43b3-a75b-4c82e494ab00
  modified: 2026-08-10T19:19:05.537Z
---

Haftanın gündemi (DÖNEM KARTI, K7 — `kkDonemErdem`, 10q) artık **kendi
kutusunda yaşamıyor**. Üç ev denendi, üçüncüsü kaldı:

1. **Eskiden:** Bugün'de, Kişilerim'in iki destesinin ÜSTÜNDE ayrı kutu
   (`.kkb-donem`, 10q2 `_donemHTML`). Emre kaldırdı — o bölüm bir vitrindir.
2. **Ara durak (uygulandı, sonra geri alındı):** Geçiş Ekranı'nda İHTİYAÇ
   satırının ardı. Yazıldı, test edildi, preview'da doğrulandı; Emre ekranı
   görünce vazgeçti.
3. **Bugünkü ev:** Kişiler ekranındaki **"Emre'nin Önerisi"** bloğu
   (`kk-emre`, 10q `kkEmreBlock`) — `_donemSerit()` başlığın altında **13px'lik
   bağlam şeridi** (`.kk-emre-donem`), kendi kenarlığı ve zemini YOK.

**Why:** Öneri bloğu zaten *"şimdi neye bakmalısın"* diyor; gündem de aynı
soruya haftalık cevaptır. İkisini ayrı kutulara bölmek aynı sesi iki kez
söylemekti. "Yedirmek" burada gerçek anlamıyla geçerlidir — gündem ikinci bir
kutu olarak DÖNMEZ; dönerse karar çiğnenmiş olur.

**How to apply:**
- Gündeme dokunacak iş `_donemSerit(kk, gorunenIdler)`'e bakar (10q).
- **Tekrar kapısı:** gündemin somut kartı, blokta zaten duran hiçbir kartı
  (ana kart + rota/raf işaretçileri) tekrar etmez. İlk uygulamada ediyordu;
  kırık preview'da yakalandı, testte mühürlendi.
- Motorun matematiği DOKUNULMAZ: öneri kendi kartını kendi seçer
  (`kkOneriRafi` / `EMRE_ONERI`); gündem yalnız haftanın erdemini söyler.
- i18n `kk.emre.donem` (TR+EN). Eski adlar (`kkb.donem.kicker`, `.kkb-donem*`)
  repoda YOK — [[ad-senkronu-kurali]] göçü tamamlandı.
- Doğrulama: `.claude/harness/kisiler-ekrani.html` (anon oturumda Kişiler
  ekranını gerçek CSS'le açar).

Bağlar: [[gecis-ekrani-masa-destesi]] · [[kisilerim-kart-motoru]] ·
[[wanderer-gamification-engine]] · [[ad-senkronu-kurali]]
