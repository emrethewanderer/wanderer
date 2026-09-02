---
name: kisi-kartlari
description: Kişilerim (10q) uygulamanın ana kart mekaniğidir ve iki ÖZEL tabloya yazar (kisi_karti_profile + kisi_kartlari); kolon yoksa 42703 yakalanıp cihaz-yerel yaşanır — yeni bir mekaniğin kalıcılığını seçerken emsal budur
type: karar
---

# Kişi Kartları — özel tablo mu, KV mi? (ve 42703 kademeli düşüşü)

> **Bu dosya hakkında.** `js/parts/12f-hazine-paketleri.js:21` bu ada
> `[[kisi-kartlari]] örneği` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında yoktu. Özgün dosya repoya hiç girmedi
> ([[claude-altyapisi-commit-disi]]); **bu metin kurtarma değildir**, bugünkü
> koddan ve `migrations/000_wanderer_schema.sql`'den yeniden keşifle yazıldı.
>
> **Kayıp olan:** özgün dosyanın kapsamı. Ad tek başına motoru mu, kalıcılık
> kararını mı, yoksa kart sınıfının tamamını mı anlatıyordu **bilinmiyor**.
> Bu dosya, ada bağ veren TEK atıf yerinin sorduğu soruyu merkeze alır:
> *yeni bir kart/koleksiyon mekaniği kendi tablosunu hak eder mi?*

**Why:** Kişilerim (`js/parts/10q-w2-kisi-karti.js`) uygulamanın **ana
oyunlaştırma mekaniğidir**: arka planda her etkileşimi analiz eden motor
kullanıcının canlı Kişi Kartı'nı hesaplar (Düşünceler·İnançlar·Hisler·
Davranışlar, 0-100) ve profil bir kartın reçetesini tuttuğunda kart
**beyan edilmek üzere** eşiğe düşer (banner, satır 1-13).

    etkileşim → kkTick() → kkComputeSignals/Profile → kkMatchCard(her kart)
              → yeni kazanım? → kuyruk → kkOpenPack() → koleksiyon

İki tasarım kararı motorun içinde yaşıyor:

1. **Durum paylaşılır, asla düşürülmez.** `S._archetypes[id]` tüm kartlar
   için ortaktır; motor 12a'nın 12 çekirdek arketipini de otomatik sürer ve
   *"yalnızca YÜKSELTİR, asla düşürmez"* (banner). Bir tarama turu kullanıcıyı
   geriletemez.
2. **Kazanımın tek kapısı beyandır** — bkz. [[olus-muhru-2-muhru-sen-basarsin]].

**Kalıcılık kararı — bu dosyanın asıl konusu.** Kişilerim **iki özel tabloya**
yazar (`migrations/000_wanderer_schema.sql:611+`):

| Tablo | Şekli | Ne taşır |
|---|---|---|
| `kisi_karti_profile` | user başına TEK satır | dört boyut · `history` (son ~300) · `hedefler` · `yapi` · `esik` |
| `kisi_kartlari` | kart başına satır, `UNIQUE (user_id, card_id)` | kazanım anının fotoğrafı: rarity, dims, score, earned_at |

Karşı örnek Hazine'dir (`12f-hazine-paketleri.js:21`): **yeni tablo yok**,
SafeStorage per-uid + `user_analytics` KV senkronu. Ayrımın pratik ölçüsü
şudur: Kişilerim kart başına satır ister (tekillik kısıtı, zaman ekseni,
`earned_at` sıralaması), Hazine ise bütün hâlinde okunup yazılan sınırlı bir
bloktur.

> **Dürüst uyarı — yorumla kod arasında bir ayrışma var.** 12f'nin cümlesi
> ayrımı *"hazine sosyal yüzeye çıkmıyor"* diye gerekçelendiriyor. Bu cümle
> "kişi kartları sosyal yüzeye çıkar" diye okunursa **bugünkü repoda
> doğrulanmıyor**: `kisi_kartlari` sahibine kapalı bir tablodur ve kişi
> kartları için hiçbir paylaşım yolu yok — `paylasilan_kartlar`'a yalnız
> 10A (Geçiş Kartım) yazıyor (`10A-gecis-karti.js:1303`), sosyal feed 10C
> onu okuyor. Cümle "hazine sosyal değil, o yüzden blok yeter" diye de
> okunabilir ve o hâliyle tutarlıdır. **Kalıcılık kararını verirken sosyal
> yüzeyi ölçü alma** — ölçü, verinin kart başına mı bütün hâlinde mi
> okunduğudur.

**How to apply:**

## 1 · Yeni bir koleksiyon/mekanik eklerken tabloyu şu soruyla seç

*Veri kart başına mı sorgulanacak (tekillik, sıralama, zaman ekseni), yoksa
bütün hâlinde okunup yazılan sınırlı bir blok mu?* Birincisi tablo ister;
ikincisi `user_analytics` KV + SafeStorage ile yaşar ve **yeni tablo
açmaz** (12f emsali). Şüphedeyken KV tarafını seç: tablo eklemek ELLE bir
migration'dır (§6.5) ve geri alması pahalıdır.

## 2 · Yeni kolon eklerken 42703 desenini KOPYALA

Bu şemanın imza deseni, üç kolonun yorumunda üç kez tekrarlanıyor
(`hedefler`, `yapi`, `esik`): *"Kolon YOKKEN client 42703'ü yakalar ve bu
veri cihaz-yerel (IndexedDB) yaşamaya devam eder — hiçbir akış kırılmaz."*
Kod tarafındaki hâli `10q:1167-1176`'daki **kademeli seçim zinciri**dir:
önce `history,hedefler,yapi,esik` denenir, hata gelirse `…,yapi`, sonra
`…,hedefler`, en sonda yalnız `history`. Yani migration uygulanmadan da
uygulama çalışır — §6.5'in *"deploy edilmiş VARSAYMAZSIN"* kuralının koda
geçmiş hâli.

Yeni bir kolon eklerken bu zincire bir basamak ekle; eklemezsen migration'ı
çalıştırmamış her kullanıcıda o okuma **sessizce** düşer.

## 3 · Eşik havuzunun kaybı kabul edilmiş bir maliyettir

`esik` kolonu yoksa havuz cihaz-yerel yaşar; ikinci cihazda `kkTick` aynı
reçeteleri yeniden hesaplayıp havuzu doldurur (koleksiyon zaten bulutta).
Şema yorumunun kendi ifadesiyle *"tek maliyet reddedilmiş/davet geçmişinin o
cihazda unutulması"*. Bunu bir kırık sanıp "düzeltmeye" kalkma — bilinçli
bir takas.

İlgili: [[olus-muhru-2-muhru-sen-basarsin]] (eşikten koleksiyona geçişin
töreni; şema yorumu kararı `2026-07-27` diye tarihler) ·
[[olunan-ve-niyet-alinan-karari]] (`hedefler` kolonunun neyi beslediği) ·
[[ilham-kartlari-sosyal-feed]] (asıl sosyal yüzeyin hangi kart sınıfına ait
olduğu)
