---
name: kart-gorsel-dili
description: 12c kart görsel dili — tüm kart yüzeylerinin tek şablonu; altın=şimdi/lapis gece=hedef ekseni; içerik-uyumlu SVG sahne motoru
metadata: 
  node_type: memory
  type: project
  originSessionId: bd74b70e-317a-4a10-9a6f-78f0d15ce09e
  modified: 2026-08-07T15:14:45.286Z
---

**12c-kart-gorsel.js** (2026-06-11): uygulamadaki TÜM kartların tek görsel kaynağı. Emre'nin iki referans tasarımından ("Kart Sırtı" + "04 KAPI lapis gece") türetildi.

- **Anlam ekseni**: altın/obsidyen kart = OLDUĞUN KİŞİ (mühür, şimdi) · lapis gece kart = OLMAK İSTEDİĞİN KİŞİ (hedef, "kapının ardındaki sen", kapı+figür+yıldız ALTIN kalır). Kart sırtı = kafes dokusu + çift halka + fener-pentagon sigili + EMRE THE WANDERER.
- **API**: `ikvCardFace(card,{palette,kicker,badge,sub,rarLabel/rarColor,fog,mini,scene,extra})`, `ikvCardBack()`, `ikvScene(card,{palette,fog,mini})`, `ikvMilestoneScene(d,{palette})`, `ikvLantern()`. window.ikv* de açık.
- **İçerik-uyum**: kategori→sahne (kapi/fidan/derinlik/yildiz/golge/perde/tuzak/halka/pencere/cift), glyph→12a figür pozu (`wsArchFigureBody` export'u), virtue→aksan imi, id soneki (-filiz/-kok/-tac)→bitki kademesi, id hash→yıldız haritası (her kart görsel olarak tek).
- **Boyutlama**: container query (cqw) + px fallback; `.ikv-card--mini` ızgara için. Mini'de SVG drop-shadow filtreleri soyulur (perf), sırt yüzü yalnız `reveal` paketinde basılır.
- **Tüketiciler**: 10q `kkRenderCard3D` (tilt/folyo kabuk korunur; folyo opaklığı ×.18'e indirildi), 12a `wsArchCard`, 10t kilometre kartları (8 eşiğe özel sahne: hilal/kök/eşik/köprü/yol/ikiz/zirve/güneş; kazanılmış=altın, gelecek=lapis), 13g canvas story (kafes+köşe tiki+fener), ff-card sırtı (llm-shell.css).
- **GOTCHA**: sentez.css'teki eski `.ws-arch-card` kutu stilleri kaldırıldı — sarmalayıcıya border/padding GERİ EKLEME (çift çerçeve çizer). 12a↔12c dairesel import'u bilinçli (hoisted function'lar, güvenli).
- Kök dizindeki **kart-test.html** = tasarım galerisi (build'e girmez; preview sunucusu `localhost:3030`'da kökü servis eder).

**2026-08-07 — SAHNE ARTIK YAŞIYOR.** Kart bir resim değil, bir penceredir:
motiflere gömülü CSS hareketi (`IKV_MV` haritası + `_mv` sarmalayıcısı +
`_isik` ışık nabzı) her kartı Harry Potter portresi gibi kıpırdatır. Tek
istisna anlamlıdır: kilitli kart nefes almaz. `opts.live` emekli. Ayrıntı ve
gotcha'lar (SVG transform ezme, `transform-box:fill-box`, rAF gizli sekmede
ateşlenmez): [[yasayan-kart-motoru]].

**2026-08-25 — DETAY BİR SAYFA DEĞİL, KARTIN KENDİSİ.** Emre'nin kararı:
kişinin dört asli unsuru (düşünceler/inançlar/hisler/davranışlar) kartın
DIŞINDA bir listede değil, kartın ÜSTÜNDE yazar; aradaki yol da orada
ölçülür. Plan: `.claude/plans/kart-buyuk-boy-detay.md` (3 faz, tamamı bitti).

- **Boy kart** — `ikvCardFace(card, { boy: true, extra })`. `.ikv-card--boy`
  `aspect-ratio:auto` alır (kart boyuna uzar), sahne `4/5`'te sabit kalır.
  `opts.extra` ad bloğunun altına ham HTML enjekte eder; kaçış ÜRETİCİNİN
  sorumluluğudur (`esc()`), 12c kaçırmaz.
  **GOTCHA:** boy kartta `kk-card3d` mutlak-yükseklik tuzağına ASLA girme —
  sabit yükseklik boy uzamasını keser.
- **`ikvMesafeCizgi(pct, opts)`** — iki kutup arasına gerilen tek çizgi;
  aradaki yolun tek primitifi. Yüzde tek kaynaktan doğar:
  `kkMatchCard().hazirlik`. Çizgi ile cümledeki sayı AYNI ölçüyü söyler;
  sahipli kartta yol tamdır (%100) ve **sayı hiç konuşmaz**.
- **Flip delege kapısı** — grid-stack üzerinde tek dinleyici: çizgiye ya da
  içindeki düğmeye dokunmak kartı ÇEVİRMEZ, yalnız ipucu satırı çevirir.
- **Canlı ölçüm (K6)** — `_kkDetayCanli()`, `kkTick`'in sonunda. Ayrı
  zamanlayıcı YOK: kkTick zaten 4sn idle + visibilitychange + her kullanıcı
  mesajıyla dönüyor; ikinci bir nabız aynı ölçüyü iki kez saydırırdı.
  Yazım **hedeflidir**, yeniden render değil: `--ms-pct` setProperty +
  `.kk-det-req-pct` textContent + durum satırlarında `hidden` toggle.
  Durum satırları (`.kk-det-near` / `.kk-det-zayif` / `.kk-det-req-ok`)
  çizimde HER ZAMAN basılır ki canlı tazeleme DOM kurmasın.
  Rota çipleri ve eksikler listesi bilerek tazelenmez — dinleyicili DOM
  churn'ü kullanıcının okuduğu metni oynatır. Sahiplik `dataset.canliSahip`
  'ten saparsa parça yazılmaz, `kkOpenDetail` töreni yeniden kurar.

**Ders — yeşil test kapı olmayabilir.** FAZ 3'ün testleri ilk koşuda yeşildi;
kapı olduklarını ancak `kkTick` çağrısı geçici sökülüp test `expected +0 to
be 100` ile düştüğünde kanıtlayabildik. Şüpheyi kırmızıyla mühürlemek
protokolün tavsiyesi değil, bu turda gerçekten iş gören adımdı.

**Ders — preview'da modül scope'u kapalıdır.** Kancanın gerçekten ÖLÇTÜĞÜ mü
yoksa aynı değeri mi yeniden yazdığı dışarıdan ayırt edilemiyordu (`window.S`
yok). `kisilerim-test.html`'e `_harnessSinyal(patch, cardId)` köprüsü eklendi:
state'i besler, kartın YENİ hazırlığını döndürür. Doğrulama zinciri böyle
kapandı — sinyal beslendi (yeni hazırlık 100), **kanca çağrılmadan DOM %0'da
kaldı**, kanca çağrılınca 100% oldu. Harness köprüleri `_harness*` önekiyle
yaşar (`_harnessSetMertebe`/`_harnessEsik`/`_harnessDeck`); ürün kodu tanımaz.

İlgili: [[kisilerim-kart-motoru]], [[seri-muhru-toreni]], [[uc-ana-renk-lapis]],
[[mesafe-motoru]], [[preview-harness-anon-oturum]], [[model-devri-sandvic]]
