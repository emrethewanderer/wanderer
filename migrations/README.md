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

## Bundan sonrası

Yeni şema işleri **041'den** devam eder (`041_*.sql`, `042_*.sql`, …,
`046_*.sql`). Numara git geçmişiyle tutarlı kalsın diye 001'e geri dönülmez.

- `046_gozlemevi_esik_nabzi.sql` — Eşiğin Nabzı: `admin_usage_report`'a
  `esik_pulse` bloğu ekler (`kind='esik'`, İç Çalışma 06 rev.2 FAZ 3). ELLE
  koşulur — Supabase Dashboard → SQL Editor.

- `050_gozlemevi_model_nabzi.sql` — Üç Sesin Nabzı: `admin_usage_report`'a
  `model_pulse` bloğu ekler (`kind='model'` + `kind='latency'` satırlarının
  `meta.fm` alanı; İç Çalışma 08 rev.2 FAZ 3). ELLE koşulur — Supabase
  Dashboard → SQL Editor. Uygulanmadan panel `model_pulse`'ı hiç görmez,
  Şema Sondası'nın borç sayacı bunu görünür kılar.

Yeni bir migration biriktiğinde iki seçenek var: ayrı dosya olarak bırakmak,
ya da `000_wanderer_schema.sql`'e işleyip dosyayı silmek. İkincisi tercih
edilirse aynı disiplin geçerli: `IF NOT EXISTS` / `DROP POLICY IF EXISTS` +
yeniden kurulum, yıkıcı ifade yok.

## Şemanın DIŞINDA kalanlar

`profiles`, `chat_history`, `chat_summaries`, `challenge_progress`,
`admin_settings`, `public_settings`, `knowledge_base`, `knowledge_chunks`,
`user_analytics`, `user_profile`, `user_patterns`, `user_tracks`,
`user_manifesto`, `mood_history`, `homework`, `notebook`, `parts_log`,
`somatic_log`, `breakthrough_moments`, `transformation_cards`,
`weekly_reports`, `onboarding_answers`, `feedbacks` — bunlar Supabase'de elle
kurulmuş, repoda hiç migration'ı olmayan tablolar. `000` onları yaratmaz;
yalnız §3'te üzerlerine kolon/politika ekler (tablo gerçekten varsa).

Gerçek envanteri görmek için `000_wanderer_schema.sql` §12'deki sorguyu koştur.
