---
name: safestorage-kuyruk-flush-kilidi
description: SafeStorage'ın yazım kuyruğu tek `_flushQueue()` kilidiyle korunur (`_flushing`/`_flushPending`) — kilit olmadan eşzamanlı flush aynı kuyruk item'ını iki kez deniyor, retry bütçesini erken tüketiyordu; tanışma kapısının yarıda kesilip ikinci `storageInit` turunu başlatması bu kilidin tam da neden var olduğu senaryodur
type: gotcha
---

# SafeStorage kuyruk/flush kilidi — eşzamanlı flush aynı item'ı iki kez dener

> **Bu dosya hakkında.** `[[boot-nabzi]]`'nin kendi "İlgili" satırı ve
> `js/parts/03-auth-shell.js:1031`'deki yorum bu ada `[[safestorage-kuyruk-flush-kilidi]]`
> diye bağ veriyordu; hedef `.claude/memories/` altında YOKTU (kapı:
> `tests/referans-butunlugu-kapisi.test.js` TABAN'ı). Aynı isimli bir özgün dosya
> repoya hiç girmedi — `git log --all -- .claude/memories/` bu adı hiç
> döndürmüyor ([[claude-altyapisi-commit-disi]]). **Bu dosya o özgün metnin
> kurtarılmış hâli DEĞİLDİR.** İçeriği bugünkü repodan yeniden keşifle
> yazıldı: kilidin kendisi (`js/parts/00a-infrastructure.js`) ve onu
> tetikleyen tanışma-kapısı yarışı (`js/parts/03-auth-shell.js`) repoda
> duruyor, her cümlenin bir `dosya:satır` karşılığı var. Emsal:
> `[[olu-kod-temizlikleri]]`.
>
> **Kayıp olan:** kilidin gerçekten kırıldığı ilk oturumun ayrıntısı —
> hangi commit, hangi kullanıcı akışı, kaç toast. Elde yalnız kod
> yorumunun bıraktığı SONUÇ var (`00a-infrastructure.js:136-139`): "iki tur
> AYNI item nesnesini deniyor, retries çift artıyor, 5'lik bütçe 2-3 gerçek
> denemede tükeniyor, geçici hata kalıcı hata gibi görünüp toast basıyor."
> Olayın kendisi (ne zaman, kim fark etti) yeniden üretilemez.

**Why:** `SafeStorage` tek bir modül-seviyesi kuyruktur (`_writeQueue`,
`00a-infrastructure.js:52`) ve `set()`/`delete()` her çağrıda kuyruğa yazıp
`_scheduleFlush(0)` ile bir flush zamanlar (`:243-253`). Bir flush zaten
uçuştayken (Supabase'e `await` ile upsert/delete atarken) yeni bir
`SafeStorage.set()` ikinci bir `_flushQueue()` çağrısını tetikleyebilirdi —
ikisi de `_writeQueue`'nun AYNI anlık görüntüsünü (`Array.from(_writeQueue.entries())`,
`:160`) alır ve aynı `item` nesnesini paylaşırdı. Hata olduğunda her iki tur
da `item.retries++` yapardı (`:180-183`), yani gerçek bir ağ denemesi iki
retry hakkı yakardı. `MAX_RETRIES = 5` (`:56`) bu yüzden pratikte 2-3
denemede tükeniyor, kullanıcıya geçici bir ağ dalgalanması KALICI yazım
hatası gibi (`_reportPersistFailure`, `:112-134`) gösteriliyordu.

**How to apply:**

## 1 · Kilidin kendisi — `_flushing` / `_flushPending`

```
async function _flushQueue() {
  if (_flushing) { _flushPending = true; return; }
  _flushing = true;
  try { await _flushQueueRun(); }
  finally {
    _flushing = false;
    if (_flushPending) { _flushPending = false; if (_writeQueue.size) _scheduleFlush(0); }
  }
}
```
(`00a-infrastructure.js:143-151`) Re-entrant bir çağrı gerçek işi YAPMAZ,
yalnız "bittiğinde bir daha çalış" bayrağı bırakır. `finally` bloğu hata
yolunda da (üstteki `_flushQueueRun` reddederse) kilidi mutlaka açar —
guard olmadan bir istisna kilidi sonsuza kadar kapalı bırakabilirdi.
Bu iki değişken `00a`'nın private state'idir; dışarıdan `_flushing`'e
erişen ya da onu resetleyen bir çağrı olursa kilit anlamını yitirir.

## 2 · Tetikleyici senaryo — tanışma kapısının yarıda kesilen ikinci turu

`initApp` (`03-auth-shell.js`) profil sorgusu ve `storageInit` çağrısını
PARALEL başlatır (`profilSoz`/`storageSoz`, `:1017-1021`, `[[boot-nabzi]]`
paralellik sözleşmesi). Kullanıcı ilk kez giriyorsa (`_tanismaGerekli`)
akış tanışma ekranına döner — ama storage HÂLÂ yolda olabilir:

```
// Kapı kapanıyor ama storage yolda: yarım bırakılırsa tanışma bitince
// gelen İKİNCİ initApp turu ikinci bir storageInit başlatır ve ikisi
// SafeStorage'ın kuyruk flush kilidinde yarışır
// ([[safestorage-kuyruk-flush-kilidi]] — eşzamanlı flush kuyruğu iki
// kez tüketiyordu). Bitmesini bekleyip öyle dönüyoruz.
try { await storageSoz; } catch (_) {}
_showTanisma(user);
```
(`03-auth-shell.js:1028-1034`) `await storageSoz` burada dekoratif değil —
kaldırılırsa tanışma tamamlanıp `initApp` ikinci kez çağrıldığında yeni bir
`storageInit(sb, user.id)` daha başlar (`:1021`) ve module-level
`_writeQueue`/`_flushing` state'i ilk turdan kalan kuyrukla aynı anda
çalışmaya başlayabilir — kilidin asıl koruduğu yarış tam olarak budur.
`storageInit`'in kendisi kilitli DEĞİLDİR (`_flushing` yalnız `_flushQueue`
çağrılarını serileştirir); tanışma dalındaki `await` bu yüzden ayrı bir
savunma katmanıdır, kilidin ikamesi değil.

## 3 · Kilide dokunmadan önce

- `_flushing`/`_flushPending` ikisi de `00a-infrastructure.js` dışına HİÇ
  açılmaz (`window.*` köprüsü yok) — kilit yalnızca modül içi bir sözleşme.
- Kuyruk aynası (`_writeQueueCkpt`, `:81-90`) kilitten BAĞIMSIZ bir ikinci
  savunma katmanıdır: `pagehide`'da async flush yarıda ölürse senkron
  localStorage aynası bekleyen yazımları saklar, sonraki `storageInit` onu
  devralır (`:217-232`). Kilit eşzamanlı ÇİFTE DENEMEYİ önler, ayna
  YARIDA KESİLEN tekli denemeyi kurtarır — ikisi farklı hataya bakar.
- Doğrulama: `tests/00a-infrastructure.test.js`'in "SafeStorage yazım
  kuyruğu lifecycle flush" bloğu (`:479-`) kuyruk/ckpt/gecikmiş-yazım
  senaryolarını kapsar ama `_flushing`/`_flushPending` adları testte hiç
  geçmiyor (grep doğrulaması: sıfır eşleşme) — kilidin kendisi, tanışma
  kapısının çifte `storageInit` senaryosu gibi, bugün dedike bir testle
  mühürlenmiş DEĞİL. Bu alanda değişiklik yapan biri regresyonu yalnız
  davranışsal doğrulamayla (iki paralel `SafeStorage.set` + başarısız
  upsert simülasyonu) yakalar.

İlgili: [[boot-nabzi]] (aynı `initApp` turu, aynı paralellik sözleşmesi) ·
[[claude-altyapisi-commit-disi]] (bu dosyanın neden eksik olduğu) ·
[[olu-kod-temizlikleri]] (kayıp içerikle başa çıkmanın emsali)
