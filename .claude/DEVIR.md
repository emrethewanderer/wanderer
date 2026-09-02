# DEVİR — mekanik kayıt noktası

> Bu dosyayı Stop kancası (`scripts/devir-notu.sh`) her tur sonunda
> yeniden yazar; elle düzenlenmez. Yargı gerektiren "İlk hamle" satırı
> burada YOKTUR — onu faz kapanışında model, plan dosyasına yazar.

**Yazıldığı an:** 2026-09-02 08:21  ·  **Dal:** claude/plan-phases-sonnet-opus-yfljds

## Son commit
```
fc259fa  2026-09-02 03:57  Merge pull request #1 from emrethewanderer/claude/z-ai-audit-completion-fiamh4
```

## Çalışma ağacı
```
?? .claude/DEVIR.md
?? .claude/agents/
?? .claude/plans/devir-altyapisi.md
```

## Son commitler
```
fc259fa Merge pull request #1 from emrethewanderer/claude/z-ai-audit-completion-fiamh4
828a20b Plan kapanışı: on faz, sapmalar ve bekleyen elle işler kaydedildi
1e7264f Hafıza: XSS kapısı ve denetçi tarama yarışı
58b645a Denetçileri tarama yarışına dayanıklı yap — CI'ın ilk koşusunun bulduğu kırık
1bd4aca Onarım FAZ 8-10: native senkron kapıya bağlandı, ölü küme söküldü, belgeler gerçeğe çekildi
1be5df8 Onarım FAZ 6-7: CI kapısı kuruldu, sanitize config'i gerçekten izin veriyor
```

## En son dokunulan plan

`.claude/plans/devir-altyapisi.md` — 2026-09-02 08:12

```
81:### FAZ 1 — Ajan sözleşmeleri · 🅞 · ~1 oturum
88:### FAZ 2 — Stop kancası yapılandırması · 🅢 · ~1 oturum
94:### FAZ 3 — Preview attach girdisi · 🅢 · ~1 oturum
101:### FAZ 4 — Kırık plan referansları · 🅢 · ~1 oturum
109:### FAZ 5 — Ölü kod hafızası · 🅢 · ~1 oturum
115:### FAZ 6 — Kapı sınaması + kapanış · 🅢 · ~1 oturum
```

## Devir nabzı (§4.4 devir kapısı)

Son 14 gün — planlarda yazılan **🅢 faz: 14** · `uygulayici` çağrısı: **1**

> ⚠️ **Devir kapısı kapalı.** 14 🅢 faza karşı 1 çağrı.
> §4.4: 🅢 faz DEVREDİLİR — kendin uyguluyorsan gerekçe plana
> `Devir dışı:` satırıyla yazılır. Kural 2026-08-11 → 08-25
> arasında tam olarak böyle öldü: 85 🅢 faza karşı 1 çağrı.
