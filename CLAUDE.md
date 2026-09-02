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
   dosyaları; tam süit yalnız sprint kapanışında) → preview'da canlı
   doğrulama → "Konsol temiz." Faz denetimi **öteki modelde** yapılır —
   yazan denetlemez: Opus yazdıysa Sonnet, Sonnet yazdıysa Opus (§3.3).
   Preview TEK ORIGIN'dir (`localhost:3030`): önce
   `./scripts/preview-baslat.sh`, sonra
   `preview_start({ name: 'wanderer' })`. Önbellek şüphesinde yeni port
   AÇMA — sunucu `no-store` basar, `/sw.js` kill-switch'tir (§3.3).
4. Sahte başarı yasak: doğrulanmamış hiçbir şeyi "çalışıyor" diye raporlama.
5. Supabase migration / edge function deploy ELLE işidir — "Senin yapman
   gereken" başlığıyla ayır, deploy edilmiş varsayma.
6. Görsel işte `TASARIM-PRENSIPLERI.md` anayasadır.
7. **DEVİR bloğunun tek eşiği:** kota %95'e geldi **ve** kalan pay kalan işi
   bitirmeye yetmiyor (§3.6). İkisi birlikte doğru değilse brifing YOK —
   plana ara vermeden devam et. Eşik doğruysa turun son mesajında
   yapıştırılabilir **DEVİR** bloğu: görev, biten/yarım, diskteki durum,
   **İlk hamle**, ELLE bekleyenler, okunacak hafıza.
8. **Uzak oturum (GitHub) diski değil REPOYU görür** — `.claude/` altındaki
   her şey (ajanlar, planlar, hafıza, `settings.json`, `launch.json`) commit
   edilir, yoksa uzakta YOKTUR — devir orada denenemez bile.
   Tek istisna üretilmiş olan `.claude/DEVIR.md` (gitignore'da). Uzakta kap
   geçicidir — commit edilmeyen iş oturumla ölür, o yüzden push kaydın
   kendisidir. Ayrıntı: `PROTOKOL-FABLE.md` §10.
9. **Faz kapanışı turu bitirmez.** Her fazın sonunda kayıt noktası atılır —
   TaskList güncel + plan dosyasında fazın durumu ve sıradaki **İlk hamle** +
   commit — sonra kısa durum bildirimiyle **sorusuz** sonraki faza geçilir;
   Emre'nin "devam" demesi beklenmez. Mekanik fotoğrafı Stop kancası yazar
   (`.claude/DEVIR.md`); yeni oturum sırayla onu, planı, sonra hafızayı okur.
