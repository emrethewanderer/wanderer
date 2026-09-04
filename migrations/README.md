# migrations/

## Bugünkü hâl

Tek dosya: **`000_wanderer_schema.sql`** — Wanderer AI'ın Supabase şemasının
tamamı. 2026-07-25'te 001–040 arası kırk migration bu dosyada birleştirildi;
eskiler silindi (git geçmişinde duruyorlar).

Dosya iki durumda da doğru çalışır:

- **Boş proje** → her şeyi sıfırdan kurar.
- **Bugünkü production** → hangi migration'ın uygulanıp uygulanmadığından
  bağımsız olarak eksikleri tamamlar, var olana dokunmaz.

İçinde tek bir `DROP TABLE` / `DROP COLUMN` / `DELETE` yok. İdempotenttir —
baştan sona birden çok kez çalıştırmak zarar vermez.

## Nasıl uygulanır

Supabase Dashboard → SQL Editor → New query → dosyanın TAMAMINI yapıştır → Run.
Başka adım yok. İstersen sonrasında §10'daki doğrulama sorgularını koştur
(zorunlu değil).

Bu ELLE bir iştir (repo konvansiyonu) — hiçbir script otomatik uygulamaz.

Dosya kendi içinde eksiksizdir: şema + RLS + fonksiyonlar + trigger'lar +
yetkiler + tohum satırlar + üç Wanderer modelinin tam içeriği (Öz/Bağ/Eser
sistem promptu, bilgi tabanı, karşılama, başlatıcılar). İçerik tohumları
`ON CONFLICT DO NOTHING` ile korumalı — Model Stüdyosu'ndan yaptığın
düzenlemeler ezilmez.

## Bundan sonrası — bekleyen ELLE borcu

Yeni şema işleri **041'den** devam eder. Numara git geçmişiyle tutarlı kalsın
diye 001'e geri dönülmez.

Aşağıdaki on üç dosyanın **hiçbiri otomatik uygulanmaz** (§6.5 — ELLE iştir)
ve uygulanıp uygulanmadıkları **repodan görünmez**. Kod hepsinde savunmacı
yazılmıştır: eksik şema hiçbir yeri kırmaz, ilgili yüzey yalnız sessizce
çizilmez ya da yerel moda düşer. "Sessizce çizilmemek" bir sözleşmedir —
kanıtsız sıfır basmaktansa hiç basmamak (§6.10).

### SIRA ÖNEMLİDİR

Sekizi (`042 · 044 · 045 · 046 · 048 · 049 · 050 · 051`) `admin_usage_report`
fonksiyonunu **baştan yeniden kurar** ve her biri bir öncekinin gövdesini
aynen taşıyıp üstüne kendi bloğunu ekler. Bu yüzden tek doğru sıra:

    000 → 041 → 042 → 043 → 044 → 045 → 046 → 047 → 048 → 049 → 050 → 051

Her dosya bir öncekinin bloklarını taşıdığı için **atlamak zararsızdır** —
`045`'i atlayıp `046`'yı koşarsan `045`'in bloğu da gelir. Tehlike ters
yöndedir: **daha düşük numaralı bir dosyayı sonradan tek başına koşmak**,
kendinden sonraki blokları siler (örn. `051`'den sonra `044`'ü koşmak
045–051'in kartlarını düşürür). Kaybolan kartın sebebi kodda görünmez.
Kural tek cümle: **en güncel tanım daima en yüksek numaradadır** (bugün
`051`); şüphede kalırsan yalnız onu koş.

Taşıma 2026-09-03'te dosya dosya ölçüldü — `051` on yedi bloğun hepsini
içerir: `mode` · `memory` · `latency` · `ctx` · `kart` · `ritus` · `esik` ·
`duygu` · `kimlik` · `model` (050'den taşınan on) + `kota` · `arac` · `bolge` ·
`paylasim` · `safety` · `error` · `notification` (051'in yedi yenisi) —
hepsi `*_pulse` anahtarıyla. `error_pulse` ve `notification_pulse`
`usage_events` DIŞINDAKİ iki tablodan okur (`error_logs`,
`notification_log`) — yazılıyorlardı, `051`'e kadar hiç okunmuyorlardı.
Yeni bir dosya bu listeyi eksiltirse, eksilen kart Gözlemevi'nden sessizce
kaybolur — bu artık kanıtla yakalanır: `tests/migration-blok-tasima.test.js`
her dosyanın bir öncekinin tüm üst-düzey bloklarını taşıdığını sınar.

### Defter

| # | Dosya | Ne yapar | Kaynak | Uygulanmazsa |
|---|---|---|---|---|
| 041 | `chat_decorations.sql` | `chat_history.decorations` (JSONB) — alıntı kartı, çip, takip, kaynakça mesajın kimliğine bağlanır | İç Çalışma 01 · C | Süsler hard reload'da ölür; deko yazımı sessizce düşer |
| 042 | `gozlemevi_nabiz.sql` | Hafıza · gecikme · bağlam nabızları rapora girer | İç Çalışma 02 · A/F/D | Epizodik hafızanın canlı mı fallback mi olduğu görünmez |
| 043 | `persona_directives_history.sql` | Append-only geçmiş defteri + trigger — "Yayınla" geri alınabilir olur | İç Çalışma 03 · B | Panel "geçmiş defteri henüz kurulmamış" der; yayın geri alınamaz |
| 044 | `gozlemevi_koleksiyon_nabzi.sql` | Koleksiyonun Nabzı — kimlik ve bilgelik kollarının ekonomisi | İç Çalışma 04 · Y1 | Panel hiç çizilmez |
| 045 | `gozlemevi_ritus_nabzi.sql` | Ritüellerin Nabzı — dokuz yüzeyin hunisi | İç Çalışma 05 · A | Panel hiç çizilmez |
| 046 | `gozlemevi_esik_nabzi.sql` | Eşiğin Nabzı — onboarding hunisi (`kind='esik'`) | İç Çalışma 06 · A | Panel hiç çizilmez |
| 047 | `telefon_kimlik_ve_posta.sql` | Kod kapısı kimliği + posta defteri (e-posta tek anahtar) | Kod Kapısı sprinti | Eski kapılar konuşur; posta defteri yok |
| 048 | `gozlemevi_duygu_nabzi.sql` | Yanılma Nabzı — Duygu Motoru'nun kendi hata oranı | 13D §10 · FAZ 15 | Panel hiç çizilmez |
| 049 | `gozlemevi_kimlik_nabzi.sql` | Kimlik Üçgeni'nin nabzı (`kind='kimlik'`) | İç Çalışma 07 · D | Panel hiç çizilmez |
| 050 | `gozlemevi_model_nabzi.sql` | Üç Sesin Nabzı (`kind='model'` + `latency.meta.fm`) | İç Çalışma 08 · A | Panel `model_pulse`'ı hiç görmez |
| 051 | `gozlemevi_tek_cam.sql` | Yedi yeni nabız: kota · araç · bölge · paylaşım · emniyet (`usage_events`) + hata · bildirim (`error_logs`/`notification_log`, ilk kez okunuyor) | On İki Odanın Denetimi · FAZ 4 | Panel yedi kartı hiç görmez; `error_logs`/`notification_log` yoksa iki blok `null` döner (`to_regclass` kapısı) |
| 052 | `tik_atifi.sql` | `notif_mark_clicked(p_id)` RPC — `notification_log.clicked_at`'i yalnız kendi satırında, yalnız ilk tıkta mühürler (SECURITY DEFINER, RLS UPDATE verilmez) | İç Çalışma 11 rev.2 · boşluk B (Kalan Yol Haritası FAZ 5) | Tık atıfı hiç yazılmaz; Davetin Nabzı dürüst "boşluk" notunu göstermeye devam eder — sızıntı yok, yalnız eksik veri |
| 053 | `saklama_politikasi.sql` | `usage_events_daily` günlük agregat tablosu + geri doldurma + `usage_events_prune(p_gun)` RPC (SECURITY DEFINER, yalnız `service_role`) — ham satır silinmeden önce agregat dolar (K3) | İç Çalışma 17 · boşluk C (Kalan Yol Haritası FAZ 6) | `usage_events` sınırsız büyümeye devam eder; agregat tablo boş kalır — sızıntı yok, yalnız birikim |

### Durumu nereden görürsün

Gözlemevi → **Şema Sondası**. Varlık kanıtı satır sayısı değil **hata
kodudur** (`42P01` tablo yok · `42703` kolon yok); RLS yüzünden boş dönmek
"yok" demek değildir. Sonda ayrıca **tablo VAR ≠ içerik DOLU** ayrımını
yapar: `wanderer_models` tablosu kurulmuş ama `system_prompt` boşsa üç sesin
eksen davranışı yoktur.

### Ayrıca ELLE bekleyen, migration olmayan üç iş

- İki edge function redeploy: `soz-terzisi` · `sohbet-baslaticilari`
  (İç Çalışma 03 · F). Yapılmazsa panel kaydeder, sunucu okumaz.
- Admin → *Merhaba, Emre* → **Yayınla**: anayasanın güncel register'ı
  `admin_settings.system_prompt`'a insin (İç Çalışma 03 · A′). Yapılmazsa
  sunucu eski anayasayı konuşur.
- `send-push` edge function redeploy (İç Çalışma 11 · boşluk B · FAZ 5,
  `052` ile birlikte). Yapılmazsa payload `nid` taşımaz — tık atıfı RPC'si
  kurulu olsa bile hiç çağrılmaz, Davetin Nabzı dürüst boşluk notunu
  göstermeye devam eder.

## Yeni migration eklerken

İki seçenek var: ayrı dosya olarak bırakmak, ya da `000_wanderer_schema.sql`'e
işleyip dosyayı silmek. İkincisi tercih edilirse aynı disiplin geçerli:
`IF NOT EXISTS` / `DROP POLICY IF EXISTS` + yeniden kurulum, yıkıcı ifade yok.
`admin_usage_report`'a dokunan bir dosya, bir öncekinin **tüm** bloklarını
taşımak zorundadır — ve bu defterin tablosuna bir satır ekler.
