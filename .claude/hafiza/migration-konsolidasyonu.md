---
name: migration-konsolidasyonu
description: "2026-07-26 kırk migration tek 000_wanderer_schema.sql'de birleşti; eski mig NNN dosyaları YOK, yeni işler 041'den"
metadata: 
  node_type: memory
  type: project
  originSessionId: a1a41a0c-b62d-45d2-9e64-826c7b8b28e5
  modified: 2026-08-01T12:19:12.012Z
---

2026-07-26: `migrations/001–040` silindi (git geçmişinde duruyorlar), yerine
tek dosya geldi — **`migrations/000_wanderer_schema.sql`** (2417 satır / 132 KB;
32 tablo, 22 fonksiyon, 8 trigger, 1 view). Yanında `migrations/README.md`.

**Why:** Kırk dosya birikmişti ve hangisinin Supabase'de uygulandığı belirsizdi
("Supabase'de bilmediklerim de var" — Emre). Tek dosya, uygulanma geçmişinden
BAĞIMSIZ olarak doğru sonucu verir: eksiği tamamlar, var olana dokunmaz.

**How to apply:**

- Herhangi bir hafıza/plan dosyası "mig 0NN" ya da `migrations/0NN_*.sql`
  diyorsa o dosya artık YOK — içeriği 000'in ilgili bölümündedir. Eski
  numaralar yalnız tarihsel atıftır (git geçmişi).
- **Yeni şema işleri 041'den** devam eder. 001'e geri dönülmez.
- Dosyanın yapısı: §1 uzantılar · §2 ad göçü (RENAME) · §3 elle kurulmuş
  tablolara eklentiler · §4 modül tabloları · §5 view · §6 fonksiyonlar ·
  §7 trigger · §8 yetkiler · §9 tohum satırlar · §10 doğrulama · §11
  kaldırılanlar + opsiyonel temizlik · §12 şema envanteri sorgusu.
- **Sıra kritik:** §2 (RENAME) §4'ten (CREATE) ÖNCE gelir. Tersi olursa
  `portre`/`gecis_kartlarim` yanına BOŞ ikiz tablo doğar, veri eski adda
  mahsur kalır.

**GOTCHA (bu turda gerçek testte yakalandı):** `CREATE TABLE IF NOT EXISTS`
mevcut bir tabloya kolon EKLEMEZ. §2'deki RENAME yoluyla gelen iki tablo
(`portre`, `gecis_kartlarim`) CREATE'i hiç görmez — kolonu eksikse sonraki
`CREATE INDEX … (user_id, state)` `column "state" does not exist` ile patlar.
Bu yüzden o iki tablonun TÜM kolonları `ADD COLUMN IF NOT EXISTS` ile
tamamlanır. Yeni bir tablo RENAME ile geliyorsa aynı disiplin şart.

**GOTCHA #2 (2026-07-26, gerçek Supabase koşusunda — pglite testinde
yakalanamadı):** §5'teki `paylasilan_haftanin_topu` view'i `SELECT *` kullanıyordu.
Mevcut DB'de `paylasilan_kartlar` tablosu ESKİ migration'lardan zaten vardı ve
`report_count` kolonu ona sonradan `ALTER TABLE ADD COLUMN` ile eklenmişti — yani
kolonun fiziksel sırası, dosyadaki taze `CREATE TABLE`'da yazan sıradan farklıydı.
`*` açılımı bu yüzden DB'nin geçmişine göre değişken; `CREATE OR REPLACE VIEW`
Postgres'te kolon adı/sırası değiştiremez (42P16: "cannot change name of view
column"). **Çözüm:** `CREATE OR REPLACE VIEW` yerine `DROP VIEW IF EXISTS` +
`CREATE VIEW` — kolon pozisyonu garantisine bağlı kalmadan idempotent olur
(`000_wanderer_schema.sql:1244`). Ders: `SELECT *` içeren herhangi bir view,
altındaki tablonun kolon ekleme geçmişi CREATE TABLE sırasından saparsa aynı
şekilde patlar — yeni view yazılırken ya explicit kolon listesi ya da DROP+CREATE
kalıbı tercih edilmeli.

**GOTCHA #3 (2026-07-26, gerçek Supabase koşusunda, GOTCHA #2'nin hemen ardından):**
§3.1'in yorumu `is_premium/is_premium_plus/is_admin ZATEN vardı (elle kurulum)`
diyordu ama Emre'nin gerçek DB'sinde `is_premium_plus` yoktu — `_quota_tier()`
tanımlanırken `42703 column p.is_premium_plus does not exist` ile patladı.
Genel ders: `LANGUAGE sql` fonksiyonlar (plpgsql'in aksine) CREATE anında GÖVDE
İÇİ SQL'i tam parse-analyze'den geçirir — kolon yoksa CREATE FUNCTION'ın
kendisi hata verir (ilk çağrıya kadar beklemez). plpgsql fonksiyonlar bunun
tersine SQL gövdesini yalnız SÖZDİZİMSEL kontrol eder, kolon/tablo varlığını
ilk ÇAĞRIDA kontrol eder — bu yüzden aynı dosyadaki plpgsql trigger'lar
(`protect_profile_privileges` vb.) profiles.is_admin'e güvenmiş ve migration
sırasında sessiz kalmıştı, sorunu yalnız `_quota_tier` (LANGUAGE sql) açığa
çıkardı. **Çözüm:** üç kolon da (`is_admin`, `is_premium`, `is_premium_plus`)
§3.1'e `ADD COLUMN IF NOT EXISTS boolean NOT NULL DEFAULT false` olarak eklendi
(`000_wanderer_schema.sql:181-183`) — "elle kurulmuş tabloya zaten var"
varsayımı asla güvenilir değil, aynı [[migration-konsolidasyonu]] dosyasının
GOTCHA #1'i (RENAME'le gelen tabloda eksik kolon) ile aynı kök sınıf. **Genel
kural:** §3 bloklarından herhangi birine yeni bir "zaten var" kolonu eklerken,
o kolonun dosyada bir `LANGUAGE sql` fonksiyon içinde referans edilip
edilmediğini kontrol et — plpgsql sessiz kalır ama SQL-language fonksiyon
migration'ı anında patlatır.

**Ölü nesneler — konsolideye ALINMADI** (§11'de dökümü var):
`focus_models` (010; `wanderer_models` yerine geçti, 10w yalnız fallback
okur ve tablo yoksa sessizce çıkar) · `ilham_kartlari` (023; içeriği 025'te
`gecis_kartlarim`'a göçtü) · `paylasilan_kart_kopyala(BIGINT)` RPC (025'te
REVOKE edildi). Mevcut DB'de duruyorlarsa dokunulmuyor; §11'de yorumlu bir
DROP bloğu var (Emre isterse açar).

**Bir kerelik veri işleri de alınmadı** — en tehlikelisi mig 014'ün
`update profiles set trial_ends_at = now() + 30 gün` satırıydı: bugün koşsa
TÜM kullanıcılara 30 günlük Studio denemesi açardı. Fiyatlandırma v2'de yeni
hesap FREE başlar ([[fiyatlandirma-plani-v2]]).

**Kendi içinde eksiksiz (2026-07-26 ikinci tur):** Emre "kopyala-yapıştır, tek
dosya, başka bir konuyla ilgilenmeyeyim" dedi → üç eksik kapatıldı: (1) mig 028'in
üç model içeriği (Öz/Bağ/Eser system_prompt + knowledge + greeting + starters,
~24 KB) §9'a `ON CONFLICT DO NOTHING` ile alındı — Model Stüdyosu düzenlemeleri
ezilmez; (2) mig 030'un Free kota güncellemesi koşullu alındı (yalnız satır hâlâ
15/75 ise 10/40'a çeker, elle ayarı ezmez); (3) dosya başına kutulu "NE
YAPACAKSIN" bloğu + §11'e `supabase_migrations.schema_migrations` notu
(CLI defteri; şemayı etkilemez, temizliği yorumlu bırakıldı).

**Doğrulama yöntemi (tekrar kullanılabilir):** yerelde Postgres yok, bu yüzden
scratchpad'de `@electric-sql/pglite` (WASM Postgres) ile koşturuldu — auth
şeması + roller + elle kurulmuş 4 tablo taklit edilir, pgvector 4 noktada
stub'lanır. Kanıtlananlar: 3 kez üst üste sorunsuz (idempotens), tohum
satırlar tekrarlanmadı, 4 ad-göçü senaryosu (en eski DB / yarı göç / göç tamam
/ çakışma) veri kaybı olmadan geçti, `wanderer_rumuz` 5 uuid + `fnv1a('anon')`
JS ikiziyle birebir; üç model boş DB'de dolu geliyor (prompt 2-3 KB, bilgi 4-6 KB,
4 başlatıcı) ve ikinci koşuşta elle yapılan düzenleme + elle ayarlanan kota
korunuyor; eski 15/75 kurulumu 10/40'a çekiliyor.

**Şemanın dışında kalanlar** (repoda hiç migration'ı olmayan, Supabase'de elle
kurulmuş ~23 tablo): `profiles`, `chat_history`, `chat_summaries`,
`challenge_progress`, `admin_settings`, `public_settings`, `knowledge_base`,
`knowledge_chunks`, `user_analytics`, `user_profile`, `user_patterns`,
`user_tracks`, `user_manifesto`, `mood_history`, `homework`, `notebook`,
`parts_log`, `somatic_log`, `breakthrough_moments`, `transformation_cards`,
`weekly_reports`, `onboarding_answers`, `feedbacks`. 000 bunları YARATMAZ;
yalnız §3'te üzerlerine kolon/politika ekler (tablo gerçekten varsa,
`to_regclass` kapılı). Gerçek envanter için §12 sorgusu.

Repo referansları da güncellendi: kullanıcıya görünen 39 "şu migration'ı
çalıştır" mesajı (js + i18n TR/EN + `_src.html` + 9 SETUP dosyası) artık
000'e işaret ediyor; `PROTOKOL-FABLE.md` §4.3'ün RENAME emsali de.

**Kaçak: `MEMORY.md` indeksi (2026-08-01'de düzeltildi).** O turda repo
taranmıştı ama hafıza indeksi taranmamıştı — indeks 23 ayrı **"mig NNN
ELLE"** iddiası taşımaya devam ediyordu (mig 003…038). `migrations/` altında
yalnız `000_wanderer_schema.sql` + `README.md` var; yani indeks, olmayan
dosyalar için Emre'ye elle iş buyuruyordu. Hepsi "ELLE: şema"ya çevrildi ya
da (salt tarihsel atıflar) kaldırıldı. **Ders:** bir göç turunda "referanslar
güncellendi" derken hafıza indeksi de referanstır — repo `grep`'i onu
görmez, çünkü `~/.claude/projects/…/memory/` repo dışındadır.

Bkz. [[ad-senkronu-kurali]], [[iki-kisi-bir-deste]], [[kota-motoru]],
[[fiyatlandirma-plani-v2]], [[ilham-kartlari-sosyal-feed]],
[[gozlemevi-kullanim-nabzi]], [[taniyan-ayna-kisiselestirme-3]].
