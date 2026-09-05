---
name: artifact-arsivi-ve-kurtarma
description: "2026-08-23 — yayınlanan rapor Artifact'lerinin kaynağı /tmp scratchpad'inde yaşadığı için 12 rapor kaybolmuştu; kaynak JSONL'den kurtarıldı ve repoda .claude/artifacts/ kalıcı arşivine taşındı"
metadata: 
  node_type: memory
  type: project
  originSessionId: d9e9d1f3-9ac8-4340-8a57-74cd44166002
  modified: 2026-09-05T17:23:01.175Z
---

Emre 19 İç Çalışma artifact'inden yalnız 7'sini görebiliyordu. Sebep kodda
değildi: **artifact'in kaynak HTML'i oturum scratchpad'inde** yaşıyordu
(`/private/tmp/claude-501/<oturum-id>/scratchpad/`). `/tmp` temizlenince
kaynak gitti; sunucudaki artifact de silinince geri dönüşü kalmadı.

## Kalıcı kural

**Yayınlanacak rapor `.claude/artifacts/` içine yazılır, tmp'ye değil.**
Dizinde `rapor.css` (ortak estetik), `ic-NN-*-body.html` (gövde),
`ic-NN-*.html` (yayınlanan tam dosya) ve `manifest.json` (başlık/favicon/
açıklama) durur. `README.md` 20 raporun URL tablosunu taşır.

Tam dosya gövdeden şöyle kurulur:

    { echo "<title>BAŞLIK</title>"; echo "<style>"; cat rapor.css; echo "</style>"; \
      cat ic-NN-ad-body.html; } > ic-NN-ad.html

## Kurtarma yöntemi (işe yaradı)

1. `Artifact({action:'list'})` → sunucuda ne kaldı.
2. `grep -oh 'claude\.ai/code/artifact/[0-9a-f-]*' *.jsonl | sort -u` →
   kayıtlarda geçen TÜM URL'ler. Aradaki fark kayıp kümesidir.
3. Silinmişliği `WebFetch` doğrular ("artifact not found").
4. Kaynak JSONL'de durur: `tool_use` girdilerinden `Write`'ın `content`'ini
   al, üstüne sonraki `Edit`'leri **sırayla** uygula — dosyanın o oturumdaki
   son hâli budur. Başlık/favicon/description da `Artifact` tool_use
   girdisinde ve birleştirme `Bash` komutundaki `<title>` satırında yazılıdır.
5. Yeniden yayınla → **yeni URL alır**, eskisi ölüdür.

## Atlas dikişi

`ic-00-atlas` 18 rapora link verir. Bir rapor yeniden yayınlanınca URL'si
değişir, Atlas'ın gövdesindeki link ölür. Kurtarmadan sonra Atlas'ın
`ic-00-atlas-body.html`'i de güncellenip aynı URL'de (`url:` parametresiyle)
yeniden yayınlanmalıdır. 2026-08-23'te 14 link tazelendi (12 kurtarılan +
04/05'in Ağustos revizyonları).

**Why:** Artifact sunucuda silinebilir ve `/tmp` her temizlikte kaynağı
götürür — ikisi birlikteyken rapor geri dönüşsüz kaybolur. Repodaki arşiv
tek kopyayı ikiye çıkarır.

**How to apply:** Rapor artifact'i yayınlarken dosyayı `.claude/artifacts/`
içine yaz ve `README.md` tablosuna satırını ekle. **Stili İCAT ETME —
`rapor.css` tek motordur:** gövdeyi onun sınıflarıyla yaz (`.kicker`
`.eyebrow` `.lead` `.meta` `.sec-lead` `.strengths` `.flow` `.gap`/`.gap-id`/
`.pill` `.sector` `.timeline`/`.tl-item` `.note` `.contract` `.measure`
`.honesty` `.finis` `.rise`), tam dosyayı yukarıdaki kabuk kalıbıyla kur.
2026-09-05'te bu atlandı: "Taşınabilir Zemin" raporu önce paralel bir inline
stille yazıldı — aynı paletin, aynı font stack'in ikinci bir kopyası. Öz-denetimde
yakalandı ve gövde `rapor.css`'e taşındı. [[rapor-tasarim-sablonu]]'nun
"sıfırdan tasarım İCAT ETME" maddesi rapor CSS'ine de aynen uygulanır. Kayıp bir artifact
sorulursa yukarıdaki 5 adımı uygula — kayıt varsa içerik kurtarılabilir.

Bkz. [[gecmis-oturum-arkeolojisi]] · [[ic-calisma-atlasi]] · [[rapor-tasarim-sablonu]]
