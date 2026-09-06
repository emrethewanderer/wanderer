---
name: ic-calisma-2-nabiz-ve-beyan
description: "İç Çalışma 02 sprinti (18 Ağu 2026) — motorun nabzı (00f/13q/042) + portrede ve P1'de kullanıcının söz hakkı (09i beyan defteri iki tür ailesiyle)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 660eed4b-72f4-4de5-8011-0e93e832b6e9
  modified: 2026-08-18T18:56:10.977Z
---

**İç Çalışma 02 · rev.2 sprinti — 5 faz, 18 Ağustos 2026'da kapandı.** Aynaya
iki şey takıldı: **bir göz** (motor kendi sağlığını ölçüyor) ve **bir kulak**
(kullanıcı gördüğüne "bu ben değilim" diyebiliyor).

**Faz haritası** — plan: `.claude/plans/kisisellestirme-ic-calisma.md`
1. Ölçüm katmanı: `wtLogMemory` + `wtLogCtx` (00f), `_s` kanal→bayt defteri
   (01) → `S._ctxOlcum`, 09a beş grup alt kırılımı, 06'da tur başına tek yazım.
2. Nabzın yüzeyi: `migrations/042_gozlemevi_nabiz.sql` + 13q'da üç kart
   (`memory_pulse` · `latency_pulse` · `ctx_pulse`).
3. Sıcak hafıza: `ehPrefetch` oturumda bir kez, uçuş kilidi `_sicakSoz`.
4. Portrede beyan: `secBeyanId` (kimlik METİNDEN türer) + `secBeyanListe`;
   09c değer/çelişki satırları, 09e damıtmasında iki katmanlı koruma.
5. Aynanın dili: iki dilin sınırı + boş portre daveti (aşağıda).

**FAZ 5'in kararı — panelde iki dil KALIR, sınırı VERİ belirler:**
- **Olgusal kayıt** (kişi/gerçek/önemli gün) → **silinir** (✕). Onu yalnız
  kullanıcının beyanı doğurur; silinince geri gelmez.
- **P1 çıkarımı** (değer/öz-tanım/savunma) → silme + **beyan**. Bu üç liste
  HER mesajda yeniden hasat edilir; silme tek başına yüzeyseldir. 09c
  `_p1Beyan` deftere yazar, defter İKİ yerde okunur: `p1AnalyzePersonality`
  hasatında (madde state'e hiç girmez) ve `buildPersonalizationPrompt`'ta
  (eski state'te birikmiş olan da geçmez).
- **Portrenin okumaları** (değer/çelişki) → **susturulur**, silinmez; kör
  noktalar panele HİÇ basılmaz (yalnız Ayna Anı töreninden geçer).

**Beyan defterinin tür aileleri** (`etw_secici_v1_<uid>`, tek defter):
`portre-deger` · `portre-celiski` (FAZ 4) ve `p1-deger` · `p1-oztanim` ·
`p1-savunma` (FAZ 5). Kimlik daima `tur:normalize(metin)` — indeks DEĞİL.

**Boş portre bir davettir:** kanıt kapısı portreyi boşaltınca panel bölümü
hiç çizmiyordu, kullanıcı sebebini bilmiyordu. Artık motor bir kez konuştuysa
(changelog dolu) davet çizilir; HİÇ konuşmadıysa bölüm yine yok — "henüz" ile
"hiç" ayrı hâllerdir.

**Why:** Motor kullanıcı hakkında konuşuyorsa son söz kullanıcının olmalı; ama
son söz "yok et" değil "bu ben değilim"dir (silme motorun sentezini bozar).
"Sildim ama geri geldi" bir arıza değil, güven kaybıdır — kapı bu yüzden
kökte, hasatta durur.

**How to apply:** Yeniden üretilen bir çıkarıma söz hakkı verirken yeni depo
AÇMA — 09i'nin defterine yeni bir `tur` öneki ekle ve defteri hem üretim
noktasında hem tüketim noktasında oku. Tek nokta yetmez.

**Bilinen sınır (dürüstlük):** beyan kalıcılığı preview'da uçtan uca
sınanamaz — `SafeStorage` belleğe (`_kvCache`) + Supabase kuyruğuna yazar,
localStorage'a DEĞİL; preview anon oturumdur ve `_uidRef` yokken flush olmaz.
Yenilemede defterin boşalması anon'da beklenen davranıştır, kırık değil.

**ELLE bekleyen:** `migrations/042_gozlemevi_nabiz.sql` Supabase'de
çalıştırılmadan Gözlemevi'nin üç nabız kartı hiç çizilmez (kod savunmacı).

İlgili: [[tanima-motoru]] · [[taniyan-ayna-kisiselestirme-3]] ·
[[gozlemevi-kullanim-nabzi]] · [[personalization-engine-layers]] ·
[[gerceklik-mimarisi]] · [[preview-harness-anon-oturum]] ·
[[safestorage-testlerde-kvcache]]
