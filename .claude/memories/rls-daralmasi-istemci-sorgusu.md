---
name: rls-daralmasi-istemci-sorgusu
description: Anonimlik için daraltılmış bir RLS politikası, istemci tarafındaki "başkasının X'i var mı" sorgularını sessizce HEP BOŞ döndürür — filtre RLS'ten sonra çalışır ve ölü bir filtredir; doğru kanal herkese açık agregat sayaçtır
type: gotcha
---

# RLS daralması — sessizce boş dönen istemci sorgusu

Kaynak: 2026-09-05, İç Çalışma 12 · FAZ 11 (sosyal bildirim altyapısı).

`paylasim_begenileri` tablosunun RLS'i bir anonimlik kararıyla daraltılmıştır
(`migrations/000_wanderer_schema.sql:860-870`) ve şemanın kendi yorumu bunu
yazar: *"Anonimlik daraltması: herkese açık SELECT rumuz sözünü deliyordu.
Sayaçlar `paylasilan_kartlar`'ın trigger kolonlarından okunur; client kendi
satırını çeker."* Politika `own read`'tir: `USING (user_id = auth.uid())`.

FAZ 11'in rozeti ("kartına biri dokundu mu") ilk hâlinde şunu yazıyordu:

```js
sb.from('paylasim_begenileri').select('id')
  .in('card_id', cardIds).gt('created_at', gorulen).neq('user_id', uid)
```

**Bu sorgu hiçbir zaman hata vermez — hep boş döner.** RLS zaten yalnız
kullanıcının KENDİ beğeni satırlarını görünür kılıyor; `.neq('user_id', uid)`
o kümeden kendi satırlarını da eleyince geriye tanım gereği hiçbir şey
kalmıyor. Yani rozet beğeni için asla yanmazdı ve hiçbir kapı kırmızıya
dönmezdi: ne bir exception, ne bir 4xx, yalnız `[]`.

**Why:** Bu, §6.2'nin (sahte başarı) veri katmanındaki hâlidir — kod
çalışıyor GİBİ görünür, testler yeşil geçer, ama ölçtüğünü ölçmez. Testler de
yakalayamaz: mock'lanmış bir `sb` RLS'i taklit etmez, istenen satırı döndürür
ve yeşil basar. Kırık yalnız ÜRETİMDE, sessizce yaşar.

**How to apply:**
1. Bir istemci sorgusu **başkasının** satırını arıyorsa, önce o tablonun RLS
   politikasını `migrations/000_wanderer_schema.sql`'de OKU. `own read`
   görüyorsan o sorgu yazılamaz — mimari olarak imkânsızdır, bir bug değil.
2. Doğru kanal genellikle zaten kuruludur: bu repoda **herkese açık agregat
   sayaç** (`paylasilan_kartlar.like_count`, trigger'la güncellenir). "Yeni
   var mı" sorusu satır sayımıyla değil, sayacın bir **tabana göre
   delta**sıyla cevaplanır (taban SafeStorage'da per-uid tutulur).
3. Aynı alandaki iki tablo aynı politikaya sahip OLMAYABİLİR:
   `paylasim_yorumlari` `all read`'tir (`hidden=false`), `paylasim_begenileri`
   `own read`. İki sinyal bu yüzden FARKLI yollardan okunur — birini ötekinin
   kalıbıyla yazmak tam bu tuzağa düşürür.
4. Mock'lu bir test bu sınıfı **kanıtlayamaz**. RLS iddiasını migration
   kaynağına karşı doğrula (grep), ve testin ne kanıtlayıp ne kanıtlamadığını
   testin kendi yorumuna yaz.

Bağlar: [[kapi-sessiz-gec]] (boş sonuç tek başına bir sonuç değildir) ·
[[silinen-mekanizmanin-gerekcesi]] · [[ilham-kartlari-sosyal-feed]].
