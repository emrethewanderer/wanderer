---
name: emre-yonlendirme-hardcode-yasak
description: "KURAL — Wanderer'a yeni özellik/değişiklik eklerken Emre'yi (persona) yönlendiren hiçbir metin kodda hardcode edilmez; admin \"Emre'nin Sesi\" sözlüğüne anahtar olarak eklenir"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1431ee1f-8127-47c3-ad08-6657f6cd1d39
---

Wanderer'da Emre'nin (persona) davranışını yönlendiren HERHANGİ bir metin — talimat, prompt parçası, "Sen Emre'sin, ..." gibi sistem yönergesi — kod içine ham string olarak hardcode EDİLMEZ. Bunun yerine [[emre-sesi-yonlendirme]] mimarisindeki sözlüğe (16-i18n-prompts.js `p()` anahtarı) yeni bir key olarak eklenir ve admin panelindeki "EMRE'NİN SESİ" odasından (16d-emre-sesi.js → `persona_directives` tablosu, mig 026) canlıda düzenlenebilir hale getirilir.

**Why:** 2026-07-02'de "Emre sadece Admin'den yönlendirilsin" işiyle 7 modülde gömülü hardcoded Emre promptları tek bir admin odasına taşındı (bkz [[emre-sesi-yonlendirme]]). Amaç: Emre'nin sesini kod deploy etmeden, canlıda admin panelinden ayarlayabilmek. Yeni bir özellikte persona'ya talimat gerekiyorsa ve bu hardcode edilirse, merkezileştirme bozulur ve o özellik admin panelinden görünmez/düzenlenemez kalır — bu tam olarak önlemeye çalıştığımız regresyon.

**How to apply:** Wanderer'a yeni bir özellik eklerken veya var olanı değiştirirken, LLM'e/persona'ya (Emre) davranış yönü veren bir metin yazman gerekiyorsa:
1. Metni ilgili modülün içine hardcode ETME.
2. 16-i18n-prompts.js sözlüğüne (TR+EN parite) yeni bir `p()` anahtarı olarak ekle.
3. Anahtarın 16d-emre-sesi.js'teki `ES_GROUPS` regex gruplarından birine düşüp düşmediğini kontrol et (düşmüyorsa panelde "kalan anahtarlar" listesinde otomatik görünür, sorun değil — ama öne-çıkanlar listesine eklemeyi düşün).
4. Kodda `p('anahtar.adı')` ile çağır — asla ham string literal ile değil.
5. **İstisna:** parser'ların okuduğu yapısal token biçimleri ([MOD:]/[ARAC]/JSON şeması) ve sunucu-taraflı system_prompt (admin_settings "Kişilik" odası, bkz [[persona-server-side]]) bu kuralın kapsamı dışında — zaten ayrı mekanizmalarla yönetiliyorlar.

Bu kural her yeni Wanderer özelliği/değişikliği için geçerli — sadece "Emre routing centralization" işinin kendisi için değil.
