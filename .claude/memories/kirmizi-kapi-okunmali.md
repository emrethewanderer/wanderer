---
name: kirmizi-kapi-okunmali
description: Uzak oturumda kırmızı CI bir iştir — ama önce OKUNMALI; madde faz kapanışına taşındı
type: gotcha
---

# Bakılmayan kapı, kırmızı bile olsa sessizdir

`PROTOKOL-FABLE.md` §10.4 kırmızı Kapı'nın iki hâlini tanımlıyordu ve ikisi de
2026-09-02'de ölçülmüştü: kapıyı **bir iş** sayan koşu kırığı 10 dakikada
kapattı, **bir bildirim** sayan koşu 50 dakikada.

**Üçüncü hâl 2026-09-03'te ölçüldü ve ikisinden de kötü: kapı HİÇ okunmadı.**
Dört koşu üst üste kırmızı bastı (#57–#60), Emre dört e-posta aldı, oturum
hiçbirini görmedi ve üç faz o kırmızının üstüne inşa edildi.

**Why:** kural kağıtta vardı — §9'un kontrol listesinde *"Uzak oturumsa: push
sonrası Kapı koşusu izlendi"* yazıyordu. Ama madde **sprint kapanışı**
listesindeydi, oysa uzak oturumda push **her fazda** olur (§10.4: commit
edilmeyen iş oturumla ölür, push kaydın kendisidir). Kural doğru yerde
durmayınca hiç işlemedi.

Ders §4.4'ün 29 günlük ölümüyle aynı: **kapının yeri, kapının varlığından
önemlidir.** Bir kural karar anına bakmıyorsa kapı değildir.

**How to apply:** her faz kapanışında, push ettiysen o push'un koşusunu OKU
(`actions_list` → `conclusion`). Kırmızıysa sonraki faz açılmaz. Kırmızıyı bir
iş saymak için önce onu görmek gerekir.

Bağlar: [[repo-geneli-kapilar]] · [[claude-altyapisi-commit-disi]]
