---
name: fable-5-gorev-listesi-protokolu
description: "Görev listesindeki her görev bitince dur, o göreve kadarki her şeyi analiz et, sonra soru sormadan yeni göreve geç"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 616d14c0-289e-431f-8165-5ab0bd2f84ee
---

Görev listesiyle (TaskCreate/TaskUpdate) ilerlerken: her görev TAMAMLANDIĞINDA
dur, o görevde ve o göreve kadar yapılan her şeyi baştan sona analiz et (hata
ara, düzelt, iyileştir) — SONRA bir sonraki göreve geç. Emre'ye soru sormadan,
otonom şekilde.

**Neden:** [[tum-diller-native-2]] gibi çok-katmanlı, uzun soluklu işlerde
(FAZ 1 Almanca dalgası: UI→prompt→detect→deste→hukuk sırası) her katman
bitince gözden geçirme yapılmazsa küçük hatalar (deyim kaçakları, terim
tutarsızlığı) sonraki katmanlara taşınıp birikir. Emre bunu önceki turda iki
kez ayrı ayrı istedi ("detaylı analiz + hata gider + devam et") — bunu artık
her görev geçişinde varsayılan davranış olarak uygula, tekrar istemesine
gerek kalmasın.

**Nasıl uygulanır:**
- TaskUpdate ile bir görevi `completed` işaretlemeden ÖNCE: o görevin ürettiği
  dosya(lar)ı baştan sona yeniden oku, terminoloji tutarlılığı + dilbilgisi +
  register-anayasası uyumu + yapısal doğrulayıcı (varsa) kontrolü yap.
  Bulunan sorunları düzelt, sonra `completed` işaretle.
- Analiz çıktısı kullanıcıya kısa ve somut raporlanır (ne bulundu, ne
  düzeltildi) — ama bu bir onay isteği DEĞİL, bir durum bildirimidir; hemen
  ardından bir sonraki göreve geçilir.
- Bu davranış yalnız i18n dalga işine özel değil — Emre'nin genel çalışma
  tarzıyla örtüşüyor ([[fable-5-calisma-tarzi.md]]: "keşfet→build+test+preview
  doğrula" döngüsü); görev-listesi kullanılan HER uzun işte varsayılan olarak
  uygulanmalı.
