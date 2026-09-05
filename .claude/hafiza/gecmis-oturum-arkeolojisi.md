---
name: gecmis-oturum-arkeolojisi
description: "2026-08-23 — 'eski oturumlarda görsel yargı eksik kalmış olabilir mi?' sorusunun ölçülebilir cevabı: oturum JSONL'lerinde model bilgisi durur; ama hüküm modele değil ÜRÜNE bakılarak verilir — dosyanın son commit tarihi, o dönemden kalıp kalmadığını söyler"
metadata:
  type: project
---

Emre sordu: *"Fable 5 ile plan yapıp Sonnet 5 ile tamamen uyguladığım
oturumlar oldu; onlarda görsel dil ve ritim yargısı varsa yapılamamış
olabilir. Geçmiş tüm oturumları denetleyebilir misin?"*

**Kararı (AskUserQuestion): ürünü denetle, modeli değil.** Model kaydı
yalnız öncelik sırası için kullanılır; hüküm bugünkü ekranın anayasaya
uygunluğudur.

## Yöntem — üç adım, tamamı ölçülebilir

1. **Model kayıtta durur.** `~/.claude/projects/<proje>/*.jsonl` satırlarında
   `"model":"claude-opus-5" | "claude-fable-5" | "claude-sonnet-5"` geçer.
   Oturum başına saymak baskın modeli verir.
2. **Dokunulan dosyalar kayıtta durur.** Aynı JSONL'de `tool_use` girdileri:
   `name` ∈ {Edit, Write, MultiEdit} olanların `input.file_path`'i.
3. **KRİTİK FİLTRE — son commit tarihi.** `git log -1 --format=%ad -- <dosya>`
   o dönemden sonra elden geçtiyse, bugünkü hâli artık o dönemin ürünü
   değildir. Bu adım olmadan envanter kocaman ve yanıltıcı çıkar.

## 2026-08-23 taramasının sonucu

| Ölçü | Sayı |
|---|---|
| Taranan oturum | 160 |
| Sonnet-baskın oturum | 29 — hepsi **2026-07-02 → 07-27** |
| Dokunulan dosya | 237 (90'ı görsel yüzey) |
| **Bugün hâlâ o dönemden kalma** | **12** (%13) |

Yani görsel yüzeylerin **%87'si Ağustos turlarında yeniden elden
geçirilmiş**. Donmuş 12 yüzeyde: ölü kod yok, `prefers-reduced-motion`
koruması var (`base.css:258`'in `*` kuralı), i18n fallback temiz; iki
küçük koku çıktı ve düzeltildi (`modes.css`'te `yh-` ailesinin iki çıplak
hex'i, değişken tanımlıyken).

**Kronolojik bulgu (önemli):** 🅞/🅢 devir etiketi **2026-07-27**'de doğdu
([[model-devri-sandvic]]). Sonnet-baskın dönem tam olarak onun ÖNCESİDİR —
yani orada "🅞 faz yanlışlıkla devredildi" olmadı; etiket sistemi henüz
yokken tüm iş tek modelde yapıldı. Kural ihlali değil, **kuralın doğuş
sebebi**.

## Kullanılmayan ölçü — ve nedeni

Plan dosyalarındaki faz durumu (`### FAZ N … BİTTİ`) **güvenilir bir kayıt
değildir**: 66 🅞 fazın yalnız 10'u işaretli, oysa hafıza bazı planları
"TAM" diyor (ör. `tanima-motoru` 7/7). "İşaretsiz faz = yapılmamış iş"
varsayımı kullanılmadı; kullanılsaydı 56 sahte bulgu üretirdi.

**Why:** "Hangi model yaptı" ilginç ama hükmü veremez — model bir olasılık
göstergesidir, kanıt değil. Kanıt üründür. Filtre olmadan bakınca 90 şüpheli
yüzey görünüyor; filtre uygulanınca 12 kalıyor ve bunların denetimi bir
oturumun küçük bir parçasına sığıyor.

**How to apply:** Emre "eski işlerde şu eksik kalmış olabilir mi" diye
sorarsa: JSONL'den model + dosya envanterini çıkar, `git log -1` ile
donmuş olanları süz, yalnız onları anayasaya karşı denetle. Bulguyu
düzeltirken kapsamı donmuş listeyle sınırla — envanterdeki her yüzeyi
yeniden tasarlamak DEĞİL, kırık olanı düzeltmek. Script:
`.claude/plans/gecmis-oturum-envanteri.md` (rapor) ve yöntem bu dosyada.

**Bir de yöntem dersi:** bu turda bir teşhis konuldu ve kanıt onu çürüttü
(`yhPulse` "reduced-motion kapısının dışında" sanıldı; `base.css`'in `*`
kuralı bulununca iddia geri alındı, koddaki yorum dürüstleştirildi).
Denetimin değeri bulduklarında değil, **bulduğunu doğrulama
disiplinindedir**.

Bkz. [[model-devri-sandvic]] · [[tasarim-prensipleri]] · [[olu-kod-temizlikleri]]
