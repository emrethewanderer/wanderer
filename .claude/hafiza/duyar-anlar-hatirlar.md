---
name: duyar-anlar-hatirlar
description: "2026-08-25 sprint — Character.ai analizinden doğan 6 faz: past_days kendi bütçesi + rollsum kalıcılığı, 09j beyan-pin, [S#] görünür kanıt, dönüş köprüsü, eşiğe vaat, TASARIM §8b + kutsal alan kapısı"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2d14bb49-5ceb-4d4c-ba12-043ff803fc20
  modified: 2026-08-25T11:56:50.913Z
---

Emre'nin isteği üç kollu geldi: Character.ai'ı analiz et, tanıtım cümlesi
(*"Super-intelligent AI chat bots hear you, understand you, and remember you"*)
üzerine değer kat; kullanıcılar chat botları neden seviyor, ders çıkar;
market puanı neden çöktü, ders çıkar. Plan `.claude/plans/duyar-anlar-hatirlar.md`.

## Analizin üç bulgusu

1. **Sevginin mekaniği duyulma + tanınma.** 2025-26 araştırması (APA Monitor
   01-02/2026, Psychology Today 08/2025, arXiv 2506.12605): bağlanmayı en güçlü
   yordayan şey algılanan duygusal destek — yargısızlık, ulaşılabilirlik,
   mahremiyet. Bot kişisel ayrıntıları geri getirdiğinde "beni tanıyor" algısı
   doğuyor. **Hatırlama sevginin mekaniğidir, süsü değil.**
2. **Çöküşün mekaniği tutulmayan vaat + kutsal alana giren para.** c.ai
   1.6★ (Play) / 1.9★ (iOS) / 1.3 (Trustpilot). Sırası: U18 yasağı (11/2025) →
   yüz taraması (04/2026) → sevilen modellerin emekliliği + reklam yoğunluğunun
   iki katına çıkması, **sohbet ortasında tam ekran reklam** (04-05/2026).
   En sık şikâyet: reklam, sonra "20-30 mesajda unutuyor".
3. **c.ai'ın kullanıcıya verdiği tek gerçek hafıza aracı pin'di** (Pinned
   Memories + Chat Memories). İkisi de tek ilkeye işaret eder: hatırlamanın en
   güvenilir kökeni kullanıcının BEYANIDIR — yani [[gerceklik-mimarisi]]'nin
   ta kendisi. c.ai buna UI jesti vermişti, bizde yoktu.

## Ne yapıldı (6 faz, hepsi denetlendi)

| Faz | İş | Kalıcı ders |
|---|---|---|
| 1 | `past_days` kendi bölümü + bütçesi; rollsum `etw_rollsum_v1_<uid>`'e; fmswitch notu | `memoryCtx` user_profile demetinin 3. sırasındaydı, casual'ın 400 karakterini profil+seviye yiyordu — **en sık modda geçmiş sessizce düşüyordu** |
| 2 | `09j-hatirla.js` — beyan-pin (`ht*`), tavan 10, `<pinned_declarations>` | Pinlenebilen tek şey KULLANICININ sözü; modelin cümlesi mühürlenseydi hatırlanan bir YORUM olurdu (§6.10) |
| 3 | Söz havuzu + `[S#]` görünür kanıt + alıntı bloğu + deko replay | Model alıntıyı yazmaz, gösterir → uydurma alıntı **yapısal olarak** imkânsız ([[kesin-alinti-mimarisi]] sohbete indi) |
| 4 | `prompt.presession` yasağı kalktı; dünün özeti + kişisel push metni; selam kartı modele göründü | Uygulamanın iki ağzı vardı: kart "sınavın nasıl geçti?" diyordu, model dediğini bilmiyordu |
| 5 | Alıntı dozu (13→15px), eşiğin alt sözü VAAT oldu | Eşik mobilde TAM DOLU (812/812) — ek satır footer'ı kesiyordu; vaat ek değil, alt sözün kendisi |
| 6 | TASARIM-PRENSIPLERI **§8b** + `tests/sohbet-kutsal-alan.test.js` | Yazılı söz, koda karşı sınanmadıkça yalnız iyi niyettir |

## Çapraz denetimin yakaladıkları (§3.3 — hepsi build+test yeşilken yaşıyordu)

- **"chatHistory hep bugündür" varsayımı üç kez kırıldı** (F1'de iki, F4'te bir).
  Kök: `openSummarySession` (06:220) geçmiş günü açınca hem `currentSessId` hem
  `chatHistory` o güne döner ve o ekrandan mesaj göndermeyi engelleyen kapı yok.
  Kalıp çözüm: `S.currentSessId !== 'day_' + localISODate()` → sus.
- **`[S3]` etiketi AKIŞ sırasında ham görünüyordu** — `[MOD:]` için var olan
  buffer koruması yoktu. `_akisMaskesi` (06) yalnız GÖRÜNTÜYÜ maskeler, `raw`
  bozulmaz; markdown link kuyruğuna (`[metin](htt`) dokunmaz.
- **Selam kartı krizde susmuyordu** — kriz talimatının yanında "sınavın nasıl
  geçti?" duruyordu. Havuz/pin zaten susuyordu, kart bu töreyi almamıştı.
- **Push sorgusu `broadcast`/`test` tipini elemiyordu** — herkese giden duyuru
  "sana gönderdiğim bildirim" diye sunulabiliyordu; tam da c.ai'dan çıkarılan
  sahte-kişiselleştirme dersinin tersi. Whitelist kondu.
- Panel ✕'i `undefined` döndürüp DOM'u tazelemiyordu (storage siliniyor, satır
  kalıyordu) — komşu case'ler sonucu zaten döndürüyordu.

## Bilinen sınırlar (bilinçli, kapsam dışı)

- **Deko replay yalnız `renderHistory` (04) ve 11'in eşik-altı dalında** koşuyor;
  `openSummarySession` ve VirtualScroller dalları `dekoCiz` çağırmıyor →
  "geçmiş seans aç" ve "çok mesajlı gün" yollarında alıntı bloğu geri çizilmez.
  `dekoTanit('arac')` de aynı boşluğu taşıyor (miras, [[sohbet-cekirdegi-ic-calisma]]).
- Havuzun 3. kaynağı `kokenKullaniciSozleri` (recency), `ehRecall` DEĞİL:
  ehRecall async + başlıklandırılmış metin döndürür, `kokenSozBlok`'un
  numaralandıracağı şey kesilmemiş ham cümle olmalı. Anlamsal hatırlama zaten
  `<recalled_memories>` kanalından gidiyor.
- `--text-light` CSS değişkeni repoda 14 yerde kullanılıyor ama HİÇ tanımlı
  değil (eski, sessiz kırık). Yalnız yeni eklenen satır `--text`e çevrildi;
  kalanı ayrı iş olarak işaretlendi.

**ELLE bekleyen: YOK.** `notif_log owner read` RLS ve `notif_log_user_sent_idx`
zaten şemada (migration gerekmedi).

**Why:** c.ai vaadi söylüyor ama tutamıyor; biz tutuyorduk ama söylemiyorduk.
Sprintin ekseni bu asimetriyi kapatmak: hafızanın dizginini kullanıcıya vermek
(pin), hatırlamayı kanıtla göstermek (`[S#]`), ilk temasa köprü kurmak
(presession) ve ancak bunlar kurulduktan SONRA sözü eşiğe yazmak.

**How to apply:** Sohbete yeni bir bağlam kanalı eklerken sor: (1) kanal kendi
bütçesini hak ediyor mu yoksa demet içinde sessizce kırpılır mı, (2) kriz
modunda susmalı mı (varsayılan: EVET), (3) kullanıcıya bir şey gösteriyorsa
kaynağı kullanıcının kendi cümlesi mi. Modelin ürettiği bir etiket ekrana
akıyorsa `_akisMaskesi` kalıbını uygula — finalize'da temizlemek yetmez.

İlgili: [[kesin-alinti-mimarisi]] · [[gerceklik-mimarisi]] · [[tanima-motoru]] ·
[[sohbet-cekirdegi-ic-calisma]] · [[personalization-engine-layers]] ·
[[taniyan-ayna-kisiselestirme-3]] · [[geri-cagri-motoru]] · [[tasarim-prensipleri]]
