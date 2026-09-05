---
name: gecmis-gunler-tiklanabilir
description: "2026-08-19 — liste doldu ama tıklanmıyordu: kök çıplak _currentLang okumasıydı; ardından üç yetim daha çıktı ve denetçinin template körlüğü ölçüldü (06'nın %83'ü taranmıyormuş)"
metadata:
  type: project
---

[[gecmis-gunler-ozet-zinciri]] listeyi doldurdu; bu tur **tıklamayı** açtı.
Semptom: bir özete dokunuluyor, hiçbir şey olmuyordu.

## Kök: çıplak `_currentLang`

`11-w2-chat-cal.js`'in **altı** satırı `_currentLang` diye bir ad okuyordu —
modülde ne tanım ne import vardı. Doğrusu `S._currentLang`. `chDrawerOpenDay`
içindeki satır (`const _lang = _currentLang || 'tr'`) her tıklamada
`ReferenceError` atıyor, inline `onclick` hatayı sessizce yutuyordu.

Bu, [[yetim-kopru-denetcisi]]'nin **üçüncü sınıfıdır**: çağrı değil **okuma**.
Diğer beş satır ölü yüzeylerdeydi (takvim, `history-view` — DOM'da yok), o
yüzden yıllarca görünmedi.

## Ardından çıkan üç yetim

| Ad | Yer | Etkisi |
|---|---|---|
| `_createMsgEl` | `11:127` (VirtualScroller kolu) | uzun sohbet yeniden çiziminde ölüm |
| `applySessionPartDots` | `06:253` `openSummarySession` **son satırı** | HER geçmiş seans açılışında |
| `getUserFirstName` | `11:451` `w2OpenFullChat` | her kullanıcı mesajı çiziminde |

## Denetçinin kör alanı — ölçüldü

Üçü de denetçinin ikinci sınıfının kapsamındaydı ama görünmedi. Sebep
`govde()`'nin template literal temizliğiydi: `` `(?:\\.|\$\{[^}]*\}|[^`\\])*` ``
iç içe `${...}` gördüğü her yerde yanlış eşleşip devasa blokları tek dize
sayıyordu. Ölçüm: **06'nın %83'ü, 11'in %84'ü** hiç taranmıyordu.

Düzeltme: template'ler artık silinmez (içindeki `${foo()}` gerçek bir
çağrıdır), tanımlar **ham kaynaktan** toplanır (gövde temizliği tanımı
yutarsa denetçi kendi tanımlı adını yetim sanar). Bedel ölçüldü: repoda tek
ek şüpheli — o da gerçek yetim çıktı. Taranan export adı 795 → 962.

## Dördüncü kırık: açılan seansı bugünün akışı eziyordu

`openSummarySession` önce çiziyor, sonra `EventBus.emit('navigate')`
diyordu; navigate 03'ün `switchView`'ını, o da `w2RenderInfiniteChat()`'i
tetikleyip "sonsuz bugün" akışını geçmiş seansın üstüne yazıyordu. Canlı
ölçüm: `w2key` geçmiş seansı gösterirken DOM bugünü çiziyordu. **Sıra
tersine alındı** — önce navigate, sonra çiz. Üstüne `llmLeaveHome()`
(10y): `llm-home` sınıfı akışı gizlediği için mesajlar DOM'a yazılıyor ama
ekranda karşılama duruyordu (ölçüm: 7 mesaj, alan yüksekliği 0).

## Listenin birimi artık GÜN

Liste yalnız `chat_summaries`'ten çiziliyordu; özeti olmayan gün kullanıcı
için YOK'a eşitti (canlıda: 2 satır görünürken 13 gün vardı). `_chGunler()`
özet map'i ile `S.allSessions`'ı birleştirir. **Bugün listeye girmez** — o gün
kapanmadı, sohbeti zaten ekranda.

**Emre'nin kararı:** özetsiz satırın ayrı görsel dili YOK. Aynı tasarım, aynı
kapı (`chDrawerOpenDay`), aynı `ws-ozet-*` primitifleri; fark yalnız içerikte —
ton etiketi yoktur (ton bir yorumdur, yorumlayan olmamıştır), başlık
kullanıcının kendi ilk cümlesidir, özetin yerinde "Özet Yok" bloğu durur ve
geçmiş sohbete panelin kendi "TAM SOHBETİ GÖRÜNTÜLE" düğmesinden varılır
(`_chSidFromDayKey` ile gün anahtarından seans kimliği türetilir).

**Why:** Bir kapının açılmaması iki şey olabilir — kapı yok, ya da kapı kırık.
İkisini ayırt etmenin tek yolu tıklamayı gerçekten koşturmaktır; build ve
testler yeşilken de kırık olabilir.

**How to apply:** Inline `onclick` ile çağrılan her fonksiyonu preview'da
GERÇEKTEN tıkla. Sessiz düşen bir tıklama önce `ReferenceError` diye aranır.
Tezgâh: `.claude/harness/gecmis-gunler.html` (bkz. [[preview-harness-anon-oturum]]).

Bkz. [[gecmis-gunler-ozet-zinciri]] · [[yetim-kopru-denetcisi]] ·
[[sohbet-canli-dom-korumasi]] · [[dil-beyani-kapisi]]
