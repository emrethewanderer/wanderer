# Wanderer AI — Çalışma Anayasası

Bu projede HANGİ Claude modeli çalışırsa çalışsın (Opus, Sonnet, Haiku…),
aşağıda import edilen Fable Protokolü'ne uyar. Protokol; çalışma döngüsünü,
yazım sesini, kod konvansiyonlarını, doğrulama kapılarını ve repo mutlak
kurallarını tanımlar. Oturuma başlamadan önce okunmuş ve benimsenmiş sayılır.

@PROTOKOL-FABLE.md

## Import çalışmazsa asgari çekirdek (yedek)

1. Emre ile daima Türkçe konuş; `PROTOKOL-FABLE.md` dosyasını oku ve uygula.
2. `_src.html` düzenle — `index.html` build çıktısıdır, elle DÜZENLENMEZ.
3. Her faz sonunda kapı: `./build.sh` yeşil → **hedefli** test (o fazın
   dosyaları; tam süit yalnız sprint kapanışında) → **`npm run kapi:genel`**
   (repo-geneli kapılar; hiçbir önekle bulunmazlar, ~17 sn) → **doğrulama tarayıcısı**
   `node scripts/dogrula.mjs` (Playwright: sayfayı açar, canlı DOM/state
   sorgusunu koşar, konsolu okur) → "Konsol temiz." Cümleyi koşucunun çıkış
   kodu söyler, sen değil. Faz denetimi **öteki modelde** yapılır — yazan
   denetlemez: Opus yazdıysa Sonnet, Sonnet yazdıysa Opus (§3.3).
   Sunucu TEK ORIGIN'dir (`localhost:3030`) ve koşucu ayaktaysa ona bağlanır,
   değilse kendi kurar. Önbellek şüphesinde yeni port AÇMA — sunucu
   `no-store` basar, `/sw.js` kill-switch'tir (§3.3). Tarayıcı bulunamazsa
   kapı atlanmaz, KIRMIZI kapanır — "sınanamadı" bir kapanış hâli değildir.
4. Sahte başarı yasak: doğrulanmamış hiçbir şeyi "çalışıyor" diye raporlama.
5. Supabase migration / edge function deploy ELLE işidir — "Senin yapman
   gereken" başlığıyla ayır, deploy edilmiş varsayma.
6. Görsel işte `TASARIM-PRENSIPLERI.md` anayasadır.
7. **DEVİR bloğunun tek eşiği:** kota %95'e geldi **ve** kalan pay kalan işi
   bitirmeye yetmiyor (§3.6). İkisi birlikte doğru değilse brifing YOK —
   plana ara vermeden devam et. Eşik doğruysa turun son mesajında
   yapıştırılabilir **DEVİR** bloğu: görev, biten/yarım, diskteki durum,
   **İlk hamle**, ELLE bekleyenler, okunacak hafıza.
8. **Kapı YOKLANIR, beklenmez.** Push sonrası koşuyu `mcp__github__actions_get`
   ile OKU; `in_progress` ise işe devam et, sonra tekrar yokla. Kabukta bekleme
   döngüsü kurma ve `api.github.com`'a doğrudan gitme — token bir yer
   tutucudur, API 403 döner ve tavansız bir `until` SESSİZCE sonsuza gider
   (2026-09-03: 40 dakika, üstelik koşu çoktan yeşil bitmişti).
   Kapı: `tests/bekleme-dongusu-kapisi.test.js` · ayrıntı §10.6.
9. **Uzak oturum (GitHub) diski değil REPOYU görür** — `.claude/` altındaki
   her şey (ajanlar, planlar, hafıza, `settings.json`, `launch.json`) commit
   edilir, yoksa uzakta YOKTUR — devir orada denenemez bile.
   Tek istisna üretilmiş olan `.claude/DEVIR.md` (gitignore'da). Uzakta kap
   geçicidir — commit edilmeyen iş oturumla ölür, o yüzden push kaydın
   kendisidir. Ayrıntı: `PROTOKOL-FABLE.md` §10.
10. **Faz kapanışı turu bitirmez.** Her fazın sonunda kayıt noktası atılır —
   TaskList güncel + plan dosyasında fazın durumu ve sıradaki **İlk hamle** +
   commit — sonra kısa durum bildirimiyle **sorusuz** sonraki faza geçilir;
   Emre'nin "devam" demesi beklenmez. Mekanik fotoğrafı Stop kancası yazar
   (`.claude/DEVIR.md`); yeni oturum sırayla onu, planı, sonra hafızayı okur.
11. **Koşulan ağaç, commit'lenen ağaç olmalı.** Tam süit koşulduktan
    SONRA çalışma ağacına dokunulduysa (bir plan satırı, bir belge cümlesi
    bile) süit yeniden koşulur — "yeşil" koşunun sıfatıdır, ağacın değil.
    CI'ın ("Kapı") kırmızısı bir bildirim değil **iştir**: görüldüğü an
    fazın devamı durur. Ayrıntı: `PROTOKOL-FABLE.md` §3.5 madde 2 ve §10.4.
12. **Opus öz-denetimi (§3.7) dikiş turundan sonra, tam süitten önce
    koşar.** Plana/koda/vizyona/sürece karşı dört eksen: her bulgu
    düzeltilir, plana taşınır ya da gerekçeyle reddedilir — dördüncü bir
    hâl ("not edildi") yok. Kapanan plan `## Opus öz-denetimi` kaydını
    taşır; kayıt yoksa tur koşulmamış sayılır. Ayrıntı: `PROTOKOL-FABLE.md`
    §3.7.
13. **Hafıza İKİ yerde yaşar; ikisini de oku, doğru olana yaz.**
    `.claude/hafiza/` (195 dosya, indeks `MEMORY.md`) Emre'nin lokal
    hafızasının **aynasıdır** — gerçek kaynağı `~/.claude/projects/<slug>/memory/`,
    tazeleyicisi `./scripts/hafiza-senkron.sh disa`. `.claude/memories/`
    (38 dosya) ise **repo tarafında, koda karşı** yazılmış hafızadır.
    24 ad ikisinde de var ve içerikleri farklı: aynadaki sürüm kararın NİÇİN
    verildiğini, repo sürümü bugün kodda NEREDE durduğunu taşır — biri
    ötekinin yerine geçmez. Bir hafıza adı ararken **iki dizine de bak**;
    indeks satırı özet, dosya gerçektir.
    **Yazarken:** uzak oturumdaysan (GitHub/cloud) hafızayı `.claude/memories/`
    altına yaz. `hafiza/`ya YAZMA — `disa` kolu `rsync --delete` kullanır ve
    oraya repo tarafından konan dosya ilk senkronda silinir. Lokaldeysen memory
    aracına yaz, kapanıştan önce `disa` koştur (kapı: `… fark` temiz olmalı),
    sonra commit et.
    Roller ve tek depoya inme sırası: `.claude/memories/README.md`.
    Geçiş envanteri: `TASINABILIR-ZEMIN.md`.
