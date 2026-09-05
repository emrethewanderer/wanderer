---
name: gozlemevi-kullanim-nabzi
description: "Kullanım telemetri sistemi (2026-07-11): 00f tracker (view+overlay segmentleri) → usage_events (mig 033 ELLE) → 13q Gözlemevi admin odası + LLM 'Emre'nin Tavsiyeleri' (usage_insights)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8eda8f12-b528-4cf1-b66f-7dd767699c51
---

Kullanım Nabzı + Gözlemevi (2026-07-11, Fable 5) — kullanıcının NEREDE vakit geçirdiğini ölçen + admin'e yorumlayan sistem. Plan: `.claude/plans/gozlemevi-kullanim-nabzi.md`.

## Mimari
- **00f-kullanim-nabzi.js** (~6 KB, kullanıcı bundle'ında): segment tracker. `wtInit()` post-auth bloğunun SONUNDA (03, ktInit'ten sonra). Ölçüm noktası `switchViewHooks.after(fn)` — registry GLOBAL listener'lı (00a:631), view-adına kayıt DEĞİL; monkey-patch yok.
- İki katman: `kind:'view'` (switchView) + `kind:'overlay'` (tören portalları, `window.wtOverlayOpen/Close('ad')` — 1 satır enstrümantasyon). **Overlay süresi view'ın İÇİNDE — toplamlarda asla üst üste toplanmaz** (13q ayrı kümelerde gösterir).
- Enstrümante portallar: seri-muhru(10t) · yol(10f) · bakis(10E) · aksam-toreni(13h) · meclis(13i) · ayin-filmi(13j) · hafiza(09c) · kart-detay(10q) · anin-ocagi(10A) · gunluk-ritus(10s). `sub`/`oik` view olarak zaten ölçülür — bilinçli atlandı.
- Chat segmenti meta: `{msgs:N}` (getUserMsgCount farkı) — "12 dk 0 mesaj" sessiz ziyaret tespiti.
- Dayanıklılık: hidden→flush (birincil ağ yolu) · pagehide→YALNIZ checkpoint (çift gönderim sıfır) · 20sn `localStorage` checkpoint (`etw_wt_ckpt_<uid>`; **SafeStorage DEĞİL** — o her yazışı Supabase KV'ye taşır, spam olur) · boot'ta yetim kurtarma. Filtreler: <1.5sn atılır, >30dk kırpılır, tampon 300 tavan.
- Öz-denetim düzeltmeleri (aynı gün): `wtOverlayOpen` aynı-ad guard'ı (10s adım-adım mount segmenti bölüyordu) · `_openView` hidden guard'ı (arka planda süre sayılmaz) · hidden→visible dönüşünde açık tören yeniden açılır (`_lastOv`) · 13q trend gün anahtarı `toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'})` (toISOString UTC tuzağı) · RPC'ye REVOKE PUBLIC/anon + users LIMIT 100.

## Veri (mig 033 — ELLE)
- `usage_events`: owner INSERT/SELECT RLS (002 kalıbı); **admin SELECT politikası bilerek YOK** — admin okuması yalnız `admin_usage_report(p_days) RETURNS jsonb` SECURITY DEFINER RPC'den (ilk satır is_admin guard). Tek çağrıda: overview + screens + heatmap(ISODOW, Europe/Istanbul) + transitions + trend + chat_depth + users(auth.users email join) + silent_users(7+ gün). RPC içinde `LEAST(duration_ms,1800000)` kırpma.
- `usage_insights`: LLM yorum kalıcılığı (admin ALL RLS, 026 kalıbı).

## Admin (13q-gozlemevi.js — yalnız switchAdmin dinamik import)
- Oda: ÇEKİRDEK bölümünde "GÖZLEMEVİ · gezginlerin ayak izleri" (usturlap sigili). `page-gozlemevi` + `#gozlemevi-host`; stiller `gzEnsureStyles()` (bundle CSS'e girmez).
- Bölümler: dönem çipleri 7/30/90 · kadran kartları · günlük trend · Zaman Haritası (altın=ekran/lapis=tören+katılım %) · Nabız Saati 7×24 · Akış · Sohbet Derinliği · Gezginler tablosu · sessiz gezginler.
- **Emre'nin Tavsiyeleri**: `gzYorumla()` → callLLM `skipPersona:true` + SUMMARY_MODEL; GÖZLEM→TEŞHİS→ÖNERİ formatı; vizyon çerçevesi (Üç Mühür + 4 direk + kart ekonomisi + Studio dönüşümü) prompt'ta. **E-posta/kimlik LLM'e ASLA gitmez** (`_compactForLLM` anonimleştirir). 7 gün bayatlama daveti; hatada eski yorum korunur.

## Hijyen
- delete-user + reset-user USER_TABLES'a `usage_events` eklendi (**ELLE redeploy gerekli**). usage_insights kullanıcıya ait değil, silinmez.
- 13p gizlilik "Kullanım ve teknik veriler" satırı TR/EN genişletildi; HK_VERSION 1.0→1.1, HK_EFFECTIVE 2026-07-11.
- Gizlilik sözleşmesi: içerik ASLA loglanmaz — yalnız ekran adı + süre + sayı.

Doğrulandı: build ✓, 554/554 vitest ✓, konsol temiz ✓, admin'de oda+sayfa+13q yükleme + RPC-yok hata mesajı ("mig 033 ELLE") ✓. İlişkili: [[admin-ayri-sayfa]], [[cekirdek-omurga-haritasi]], [[hukuki-cerceve]].

**GOTCHA (2026-08-26) — RPC Temmuz'dan beri çağrıldığında patlıyordu.**
`admin_usage_report`'un ana CTE'si (`ev`) süreyi `dur_ms` adıyla dışa açar;
042'de eklenen `memory_pulse` ve `latency_pulse` blokları ise çıplak
`duration_ms` okuyordu (044 ve 045'e aynen taşındı). PL/pgSQL gövdesi
`CREATE` anında yalnız **sözdizimi** denetlenir — sütun çözümlemesi ilk
çağrıya kalır. Yani migration'ı koşan yeşil çıktı görür, kırığı ancak
paneli AÇAN bulur; ve o an tek bir kart değil RPC'nin tamamı düşer.
Düzeltme yalnız güncel tanımda (`046`); 042/044/045 tarihsel kayıt olarak
bozuk bırakıldı. Ders: yalnız ELLE koşulan SQL'de "yeşil migration" bir
doğrulama değildir — kapı, fonksiyonun ÇAĞRILDIĞI yerdedir.
Ayrıntı: [[esigin-nabzi]].