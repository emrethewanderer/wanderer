---
name: fable-5-ortaklik-ve-planlama
description: "Emre↔Fable ortaklık dinamiği (geniş delegasyon, otonom sprint) + Fable'ın plan artefaktı şablonu (Bağlam→Kararlar→Fazlar→Ton Rehberi→Riskler→Doğrulama→Korunan Sözleşmeler)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b69c1823-153e-4c2b-a536-eb890e2072c5
---

22 oturumun kullanıcı turları + bir plan artefaktının (keen-forging-mango.md) analizi.

## Ortaklık dinamiği
- **Emre geniş delege eder.** Açılış mesajı tüm vizyonu taşır (uzun, "şöyle olsun" diye); sonrası kısa yeşil ışık: "Devam edelim" (4×), "Tamamını yapalım" (2×), "Başlayalım" (2×), "Plana tamamıyla sadık kalarak devam edelim". Sık sık **"hepsini/tamamını yap"** der — küçük onaylar beklemez.
- **Fable uzun otonom sprint koşar.** Adım adım izin istemeden, kendi TaskList'i + doğrulamasıyla işi sonuna götürür. Bu güven, üç şeyle korunur: (1) dürüst kapanış raporu, (2) "Senin yapman gereken" elle adımlar, (3) "Korunan sözleşmeler" — Emre hiçbir şeyin bozulmadığını görür.
- **Akış-içi düzeltme nadirdi** Fable oturumlarında; bug-fix'ler genelde AYRI oturumlardaydı (Opus/Sonnet). Yani Fable = büyük inşa; düzeltme döngüsü ayrı.
- **Gerçek çatal varsa sorar.** `AskUserQuestion` yalnız kapsam/mimari kararında (Üç Mühür: "tam yeniden tasarım mı?"). Emre kapsam kararı verince ("Sesimi eklemek hariç hepsini yapalım") Fable **anında hafızaya yazıp** uyar.
- **Uygula:** Emre vizyon + "yap" dediğinde uzun otonom çalış; her küçük adımda sorma. Ama gerçek bir mimari/kapsam çatalında dur ve sor. Kapanışta dürüst rapor + elle adımlar + korunan sözleşmeler ver.

## Plan artefaktı şablonu (.claude/plans/*.md — büyük iş öncesi)
Sırasıyla:
1. **`# Başlık — "veciz tagline"`** (Üç Mühür → "İki Kart Arasındaki Yol")
2. **`## Bağlam`** — bugünkü hâlin sorunu + **"Onaylanan kararlar"** numaralı liste; sonra **`### Merkez kavram`** (tek paragraf öz).
3. **`## Ana Tasarım Kararları → ### K1/K2/K3`** — anahtarlı kararlar, her birinde gerekçe + tam dosya:satır referansı + fallback zinciri.
4. **`## Fazlar (her biri bağımsız ship edilebilir)`** → `### FAZ N` her fazda **Yeni:** / **Değişen:** dosya listesi + gerektiğinde HTML/kod iskeleti.
5. **`## State / Veri`** — Değişmeyen anahtarlar · Yeni (tek) anahtar · **tuzaklar** (gün-anahtarı 0-index, çift sayım).
6. **`## Ton Rehberi (kitap-köklü TR)`** — gerçek örnek microcopy ("Geldin. Bugünün halkasına ilk vuruş düştü…"); sayaç dili yasak.
7. **`## Riskler / Dikkat`** — numaralı (TDZ/init nereye, kota üçlüsü dokunma, reduced-motion).
8. **`## Doğrulama (preview, her faz sonunda)`** — numaralı senaryolar + `typeof window.x === 'function'` sözleşme regresyon kontrolü.
9. **`## Kritik Dosyalar`** — YENİ / yerinde-evrim / yeniden-kullanılan ayrımıyla.

İmza kavram: **"Korunan sözleşmeler"** — mevcut `window.*` fonksiyon adları, DOM id'leri, storage anahtarları, onclick'ler değişmez; yeni gövde eski ada delege edilir (`smOpenCollection → yolOpen`). Böylece büyük yeniden-tasarım bile çağıran tarafları kırmaz. Plan = EnterPlanMode + keşif alt-ajanı + AskUserQuestion ile kurulur, `.claude/plans/<slug>.md`'e yazılır, ExitPlanMode'la onaya sunulur.
