---
name: kart-evreni-koleksiyon-nabzi
description: "2026-08-19 İç Çalışma 04 rev.2 · Kart Evreni: eski beş boşluğun karnesi + 5 faz TAM (wtLogKart iki kol · Gözlemevi Koleksiyonun Nabzı · pusula tazeleme · şema sondası · deste-en); ELLE: migration 044"
metadata:
  node_type: memory
  type: project
---

**İç Çalışma 04 rev.2 (2026-08-19).** 18 Temmuz'un Kart Evreni artifact'ı SİLİNMİŞTİ;
metni oturum kaydından (`f323b95f…jsonl`, Write→`ic-04-kart-body.html`) kurtarıldı —
**silinen artifact'lar transkriptten geri gelir**, önce orayı ara.
Yeni yayın: https://claude.ai/code/artifact/14d5b7d6-e5e4-44ff-b592-0522c7333fee

**Eski beş boşluğun karnesi (koda karşı):** A migration → sadeleşti (konsolidasyon),
açık · B ölçüm → **genişledi** (hazine de kör) · C plato → dönüştü (12f'de pity VAR;
kimlik tarafında soru "kart gelmiyor"dan "kartlar bitiyor"a döndü) · D paylaşım →
**KAPANDI** (`shrShareStory` 10q:1514, 12f:612) · E dil → **kötüleşti** (DE pilotu
silinince EN'e de kalıp kalmadı).

**Yapılan 5 faz:**
1. **`wtLogKart(olay, meta)`** (00f) — `wtLogLatency` kalıbı, `kind:'kart'`, YENİ TABLO YOK.
   İki kol tek kanalda: kimlik (10q `kkOpenPack` → ilk-kart/kazanim) + bilgelik
   (12f `hzBuyPack` → paket/dupe-iade, `hzSetCeremony` → set-tamam).
   Gizlilik `wtLogCtx`'in ikizi: kart METNİ etiket desenine takılıp null'a düşer.
2. **Gözlemevi · Koleksiyonun Nabzı** (`_koleksiyonNabzi`, 13q) + `migrations/044`.
3. **Pusula tazeleme** — kesit 08-07'de 12'ye indi, dört yer 112 diyordu.
4. **Şema Sondası** (13q) — **migration GEREKTİRMEZ**: varlık `42P01`/`42703` hata
   kodundan okunur; RLS boş dönebilir, kanıt hatanın kendisidir.
5. **`js/parts/i18n/en-deste.js`** + `js/ext/deste-en.js` — 12 kartın transcreation'ı.

**İKİ KIRIK, ikisi de denetimde bulundu (yöntemin kanıtı):**
- **Faz denetimi:** `set-tamam` damgası önce `hzBuyPack`'teydi — set orada TESPİT
  edilir ama +40 Elmas tören KAPANINCA (`hzSetCeremony`) verilir. Ödenmemiş bonusu
  ödenmiş göstermek §6.10 ihlaliydi → damga `awardElmas`'ın yanına taşındı.
- **Dikiş turu:** kimlik kolu `meta.kategori`'ye kartın KENDİ kategorisini yazar
  (cekirdek|temel|golge|tuzak|bilesik), panel hepsini tek etiketle çizer — ham
  kategoriyle gruplayan SQL aynı satırı BEŞ KEZ döndürüyordu. 044 iki kola indirger.

**Why:** Ekonomisi olan bir koleksiyon ölçülmeden ayarlanamaz; nadirlik oranlarına ve
pity eşiklerine bu tablo dolmadan dokunulmaması bilinçli sınırdır.
**How to apply:** Kart evreninde işe başlarken önce `kart_pulse`'a bak. Yeni bir kart
olayı eklerken kanal hazır — `window.wtLogKart?.(olay, {kartId, nadirlik, kategori, n,
elmas})`, damgayı ÜRETEN değil TESLİM EDEN yer basar.
**ELLE bekleyen:** `migrations/044_gozlemevi_koleksiyon_nabzi.sql` (Supabase SQL
editörü) — uygulanmadan panel hiç çizilmez, "0 kazanım" yazmaz.
İlgili: [[deste-12-kesit-karari]] · [[hazine-destesi-kart-paketleri]] ·
[[gozlemevi-kullanim-nabzi]] · [[gerceklik-mimarisi]] · [[kisilerim-kart-motoru]] ·
[[gerceklik-denetci-muafiyet-penceresi]] · [[deste-en-karari]]
