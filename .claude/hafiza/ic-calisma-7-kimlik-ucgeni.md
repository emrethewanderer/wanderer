---
name: ic-calisma-7-kimlik-ucgeni
description: "İç Çalışma 07 (Kimlik Üçgeni) 30 Ağu 2026 — 7 faz GLM 5.3 Flash'ta TAM uygulandı, Opus denetledi; ELLE: migration 049"
metadata:
  type: project
---

**İç Çalışma 07 · Kimlik Üçgeni — rev.2 denetimi (30 Ağustos 2026).**
18 Temmuz raporunun (`.claude/artifacts/ic-07-kimlik-body.html`) beş boşluğu
bugünkü koda karşı yeniden okundu:

- **A** (8 ELLE migration) — yapısal olarak KAPANDI: migration'lar
  `000_wanderer_schema.sql`'de konsolide, üçgenin dört tablosu orada.
  Kalan kırık: 13q'daki Şema Sondası üçgenin üç tablosunu (`kimlik_yolculugu`,
  `suretler`, `meclis_derinlik`) görmüyor.
- **B** (ext 11 dilde `invisible_face` eski şema) — **DÜŞTÜ**: ext dil
  paketleri repodan kaldırıldı, ürün TR+EN. `ios/.../prompt-i18n-ext.js`
  yalnız eski bir native build kalıntısı, kaynak değil.
- **C** (iki "olduğun kişi") — kısmen kapandı: `im.portre_note` +
  `im.seed_note` davranış kimliğinin kaynağını söylüyor, karşı köşede yok.
- **D** (telemetri) — **TAM AÇIK**: `10D` ve `13l`'de sıfır `wt*` çağrısı;
  dahası `00f:_RITUS` kapalı kümesinde Geçiş Okuması hiç yok, yani
  Ritüellerin Nabzı onu "sessiz direk" olarak bile göstermiyor.
- **E** (cihaz-yerel) — **AÇIK ve BÜYÜMÜŞ**: `gdpr.js:USER_TABLES` on bir
  tablo sayıyor, üçgenin hiçbiri (+`kisi_kartlari`, `portre`) içinde değil.
  "Verini indir" diyen kullanıcı kim olduğuna dair kaydı ALMIYOR.

**Plan:** `.claude/plans/ic-calisma-07-kimlik-ucgeni-rev2.md` — 7 faz
(5 🅢 / 2 🅞), GLM 5.3 Flash için kalibre edildi: keşifsiz, tam kod blokları,
TR+EN microcopy yazılı, sözleşme + yasaklar bölüm 0'da. Emre planı Z.ai
app'e verecek, uygulandıktan sonra denetime dönecek.

**Migration numarası:** 048 ALINMIŞ (13D Yanılma Nabzı). Üçgenin nabzı
**049**'dur ve bazı 048'dir — `admin_usage_report` her migration'da bütünüyle
yeniden kurulduğu için en yüksek numaralı dosya kopyalanır.

**SONUÇ (30 Ağustos 2026 · uygulandı + denetlendi).** Yedi fazın yedisi de
GLM 5.3 Flash tarafından uygulandı; denetim Opus'ta (§3.3 çapraz model).
Kanal `wtLogKimlik` (00f, onuncu tüketici) · `oik-okuma` ritüel hunisi ·
migration 049 `kimlik_pulse` · Gözlemevi "Dönüşümün Nabzı" paneli ·
üçgenin tek cümlesi (13l rozet) · export kapsamı +6 tablo + `local_only`.
Tam süit 3576 test yeşil.

**Denetimin dersi — dört kırığın dördü de PLANIN hatasıydı.** GLM plana
birebir sadıktı: `TODAY`/`CAT_KEYS`/`DAY_MS`/`S._kimlik` gibi çapaların
hepsi gerçekten vardı, üretici/tüketici alan adları tutuyordu
([[saf-yesil-cagri-olu]] tuzağına düşmedi), migration `cp` ile kopyalandı,
kapıların hepsi yeşil geçti. Ama **sıfır bağımsız yargı**: planın "Okudu"
köşesine taktığı kanıtsız etiket ("mühürleyen" derken `COUNT(DISTINCT
user_id)` okuyordu), teşhisin yanlış alana bağlanması, küçük harfli metnin
VERSAL kicker sınıfına konması ve i18n anahtarlarının yanlış mahalleye
yazılması — dördü de aynen taşındı, `## Duraklar` boş geldi.

**How to apply (model seçimi):** GLM 5.3 Flash **🅢 fazlar için kullanılır**
— sözleşmesi kağıtta tam olan, yargı gerektirmeyen iş. 🅞 fazlara, plan
yazımına ve ad göçüne verilmez. Planı ona verirken bilinçli ol: **plan ne
kadar tam yazılırsa, planın hatası da o kadar eksiksiz uygulanır.** Kanıt
etiketlerini (§6.10) ve görsel sınıfların dilini plana yazarken iki kez
oku — çünkü uygulayan taraf onları sorgulamayacak.

**Why:** Ürünün kuzey yıldızı (hedef belirleme → günlük pratik → kimlik
değişimi) 18 Temmuz'dan beri ölçüsüz; ölçülmeyen kuzey yıldızı yoktur.
Telemetri altyapısı bu arada olgunlaştı (00f'te dokuz kanal) — plan yeni
mimari kurmaz, var olan kalıba onuncu tüketiciyi ekler.

**How to apply:** Denetime gelindiğinde plan dosyasının `## 7 · DOĞRULAMA`
bölümündeki altı davranış senaryosunu preview'da koştur; `kimlik_pulse`
alanının RPC'de gerçekten döndüğünü Şema Sondası satırından oku. İlgili:
[[kimlik-motoru]] · [[olmak-istedigin-kisi]] · [[ic-meclis-suretler]] ·
[[gozlemevi-kullanim-nabzi]] · [[esigin-nabzi]] · [[gerceklik-mimarisi]]
