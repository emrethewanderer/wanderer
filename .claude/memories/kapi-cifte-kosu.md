---
name: kapi-cifte-kosu
description: Kapı workflow'u push+pull_request ile iki kez koşuyordu; "ikisi farklı ağaçtır" gerekçesi beş PR'de de yanlış çıktı — tetik sökülmedi, gerekçe her koşuda ölçülür oldu
type: gotcha
---

# Kapının çifte koşusu — gerekçe bir varsayımdı, ölçülünce yanlış çıktı

`.github/workflows/kapi.yml` + `tests/kapi-workflow.test.js` (2026-09-03).

**Belirti (Emre'nin gördüğü):** PR'yi merge etmeye gidince merge kutusunda
aynı adı taşıyan iki satır — *"Kapı / build · süit · denetçiler"* — biri
`in progress`, biri `successful`. Hangisinin neyi sınadığı okunamıyor.

**Why:** Workflow hem `push: branches:['**']` hem `pull_request` ile
tetikleniyordu ve ikisi de aynı job adını taşıyordu. Yorumdaki gerekçe
şuydu: *"push dalın kendi ağacını sınar, pull_request base ile birleşmiş
ağacı (`refs/pull/N/merge`) — ikisi farklı ağaçtır… çifte koşu bilinçlidir,
israf diye SÖKÜLMEZ."*

Gerekçe genel olarak doğru ama bu repoda **ölçülmemişti**. Ölçüldüğünde
beş PR'nin beşinde de merge commit'inin ağacı, dalın head ağacına bit bit
eşit çıktı:

    3992dbe/6134284 · a48e2c1/428ef2e · 663b133/db7f3bf
    fc91681/a79210a · ad68dbd/92e33fe        → hepsi AYNI tree sha

Sebep: base yalnız Emre'nin merge'leriyle ilerliyor ve PR'ler base
ilerlemeden, açıldıktan **8–18 saniye sonra** merge ediliyor. Yani
`pull_request` koşusu, `push` koşusunun bire bir kopyasıydı; her PR aynı
ağacı üç kez sınıyordu (dal push + PR + merge sonrası main push).

`in progress` olan da hep PR kopyasıydı: dal koşusu saatler önce bitmiş
oluyor, PR koşusu PR açılışında başlıyor ve ~4 dakika sürüyor. Emre 12.
saniyede bakınca gördüğü şey buydu — bir kırık değil, **bilgi üretmeyen bir
tekrarın** ortası.

**How to apply:** Tetik SÖKÜLMEDİ; gerekçesi ölçülebilir yapıldı. `Ağaç
kimliği` adımı her PR koşusunda birleşmiş ağacı dalınkiyle karşılaştırır:

- **aynıysa** → pahalı adımlar `if: steps.agac.outputs.kos == 'evet'` ile
  atlanır (aynı ağacı ikinci kez sınamak bilgi üretmez, bekleme üretir);
- **farklıysa** (base ilerlemiş) → kapı tam koşar. Kuralın
  (*"koşulan ağaç, commit'lenen ağaç olmalı"*, PROTOKOL §3.5/2) korumak
  istediği hâl tam budur ve korunur.

Job adı da event'e göre ayrışır (`dal ağacı` / `birleşmiş ağaç`) — aynı adı
taşıyan iki satır, okuyan için iki ayrı iş değil bir tören görüntüsüdür.

**İki tuzak (ikisi de bu turda ısırdı):**

1. `git rev-parse 'HEAD^2^{tree}'` çözemediği ref'i **stdout'a olduğu gibi
   basar** (exit 128 ama çıktı DOLU). `|| echo ''` fallback'i bu yüzden hiç
   çalışmaz, değişken boş kalmaz ve "okunamadı" dalı ölü kalır — kapı yanlış
   gerekçeyle karar verir. `--verify --quiet` ŞARTTIR.
2. `refs/pull/N/merge` bir merge commit'tir: parent1 base, **parent2 dalın
   head'i**. Karşılaştırma commit sha'sıyla değil **tree sha'sıyla** yapılır —
   merge commit'in sha'sı daima farklıdır, ağacı olmayabilir. `fetch-depth: 2`
   ikinci parent'ı çözmeye yeter; `0`'ın bedelini ödemeye gerek yok.

**Daha derin bulgu — kapı merge'i durdurmuyor.** Ölçüm sırasında çıktı:
beş PR'nin beşi de PR kapısı bitmeden merge edilmişti (kapı bitişinden
~3 dk 40 sn ÖNCE). Required status check tanımlı değil; yani kapı bugün bir
kapı değil bir **bildirim**. `push` koşusu her seferinde önceden yeşildi, o
yüzden ağaç sınanmamış değildi — ama korumayı sağlayan şey kural değil
tesadüftü. Bunu gerçek kapıya çevirmek ELLE iştir (branch protection →
required check + auto-merge) ve Emre'nin kararına bırakıldı.

**Ders (§10.5 ile aynı):** bir kapının gerekçesi yazılı olması onu doğru
yapmaz. *"İkisi farklı ağaçtır"* cümlesi kağıtta iki ay durdu; ölçen tek
satır (`git rev-parse HEAD^{tree}` vs `HEAD^2^{tree}`) yazılana kadar kimse
yanlış olduğunu göremedi. Bağlar: [[kapi-sessiz-gec]] · [[dogrulama-tarayicisi]]
