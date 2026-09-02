---
name: claude-altyapisi-commit-disi
description: .claude/ altındaki çalışma altyapısı (ajanlar, hafızalar, kancalar, launch girdileri) aylarca yalnız lokal makinede kalmış, repoya hiç girmemişti — uzak oturum repoyu klondan kurduğu için commit edilmemiş hiçbir şeyi görmez
type: gotcha
---

# .claude/ altyapısı repoya hiç girmemiş — uzak oturum klondan kurar

Kaynak: `.claude/plans/devir-altyapisi.md` ("SPRINTİN KÖK BULGUSU", 2026-09-02).

**Why:** Proje aylarca yalnız **lokal** oturumlarda çalıştı. `.claude/agents/`,
`.claude/memories/`, `.claude/settings.json`, `.claude/launch.json` diskte
duruyordu ve her yeni lokal oturum onları doğrudan görüyordu — hiçbirinin
commit edilmesi gerekmediği hissini verdi. Emre 2026-09-02'de GitHub üzerinden
**uzak** oturumla çalışmaya başlayınca zemin değişti: uzak oturum repoyu
**klondan** kurar, commit edilmemiş olan orada YOKTUR. Kanıt (bu turda
tekrar doğrulandı):

    git log --all --oneline -- .claude/agents/
    → yalnız bu sprintin iki commit'i (6129804, bc12209) — dizin bu
      sprintten ÖNCE repoda hiç var olmamış

    git log --all --oneline -- .claude/memories/
    → yalnız üç commit: 1e7264f (önceki bir oturum, aynı gün 00:47) ·
      1bd6683 + 797aef2 (bu sprint)

Oysa `tests/referans-butunlugu.test.js`'in TABAN'ı (ilk koşuda ölçülen 82
kırık referans örneği, 36 ayrı ad — 33'ü devralınan borç) bunun tek seferlik
bir eksiklik değil, **aylarca biriken bir örüntü** olduğunu gösteriyor: 23 ad
`[[hafıza]]` bağı (`ad-senkronu-kurali`, `boot-nabzi`, `tanima-motoru`,
`safestorage-kuyruk-flush-kilidi`, `llm-bicimleri-geri-sizar`…), 10 ad
`.claude/plans/*.md` yolu. Bu adlar gerçek çalışma belleği biriktiğini
gösteriyor; bellek **hiç commit edilmemiş** — lokal diskte kaldı, uzak
oturum onu hiç görmedi.

Sonucu tek bir semptom değil, aynı sprint içinde tekrar eden bir örüntüydü:
§4.4'ün devir kapısı 29 gün ölü kaldı çünkü `uygulayici` adı harness'a hiç
ulaşmadı (`Agent({ subagent_type: 'uygulayici' })` → "Agent type 'uygulayici'
not found") — ajan dosyası diskte vardı, repoda yoktu. Aynı sprintte
`.claude/settings.json` (iki Stop kancası), `.claude/launch.json` (preview
attach girdisi) ve iki mimari plan belgesi de aynı sebeple eksik çıktı.

**How to apply:**
- `.claude/` altına dair bir eksiklik/regresyon bulduğunda önce sor: *diskte
  mi yok, repoda mı yok?* `ls .claude/<alt-dizin>` diskteki hâli gösterir,
  `git ls-files .claude/<alt-dizin>` gerçek (klonlanabilir) hâli gösterir.
  İkisi ayrışıyorsa kök sebep bu olguyla aynıdır — yeni bir kırık DEĞİL.
- Uzak oturumda bir `.claude/agents/*.md` sözleşmesi "tanınmıyor" görünüyorsa
  önce `git ls-files .claude/agents/` ile repoda olup olmadığına bak; harness
  ajanları oturum AÇILIŞINDA tarar — aynı oturum içinde sonradan commit etmek
  onu tanıtmaz, kanıt ancak SONRAKİ oturumda gelir.
- Kayıp hafıza dosyalarının içeriği **uydurulamaz** (§6.10 gerçeklik kuralı) —
  yalnız lokal `.claude/` dizininin commit edilmesiyle geri gelir. Bu ELLE
  bir iştir (§6.5); kapı (`tests/referans-butunlugu.test.js`) bu borcu
  TABAN'da dondurur, büyümesini yasaklar, ödenmesini serbest bırakır.
- Ölçen aletin kendisi de bu körlükten payını alabilir: aynı sprintte devir
  nabzı (`scripts/devir-notu.sh`) `uygulayici` adının tanınmadığını
  "sıfır devir" diye yanlış yorumladı — ortam kırığıyla aletin kendi
  kırığını (başarısız çağrının da sayılması) ayırt etmeden önce ikisini
  karıştırmamak gerekir.

İlgili: [[bagsiz-ad-kapisi]] (aynı sprintte bulunan dördüncü kırık referans,
bu kök bulgunun bir başka türevi) · [[olu-kod-temizlikleri]] (tarihsel
KORUNANLAR listesinin de aynı sebeple kayıp olduğu dosya)
