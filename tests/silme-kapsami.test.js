// @vitest-environment node
// Dosya sistemiyle çalışır, DOM'a hiç dokunmaz — jsdom kurulumunu boşa ödemez.
// Kalıp tests/sunucu-sesi.test.js ve tests/referans-butunlugu-kapisi.test.js ile aynı:
// kaynağı readFileSync ile oku, regex'le sözleşmeyi ara.

/**
 * SİLME KAPSAMI KAPISI — "hesabını silen kullanıcının hiçbir dosyası yetim kalmaz"
 *
 * NEDEN BU TEST VAR (İç Çalışma 09 · boşluk A, İç Çalışma 15 · boşluk D):
 * delete-user ve reset-user, chat-images bucket'ının yalnız `{uid}/` önekini
 * temizliyordu. Ama "Hayalini Resmet" (js/parts/10i-w2-hayal-alemi.js) aynı
 * bucket'a AYRI bir önekle yazıyor: `hayal/{uid}/{sceneId}.jpg`. Sonuç: hesap
 * silindiğinde ya da sıfırlandığında bu görseller depoda yetim kalıyordu —
 * KVKK/GDPR "silme hakkı" kırığı.
 *
 * Kapı iki şeyi birlikte sınar:
 *   1. her iki edge fonksiyonu da chat-images'te HEM `{uid}` HEM `hayal/{uid}`
 *      önekini list+remove eder (K4: yeni bucket değil, yeni önek — ikinci
 *      bir `storage.from('chat-images')` çağrısı yeterli, ikinci bir bucket
 *      açılmamalı).
 *   2. 10i'nin yazma yolu hâlâ `hayal/` ile başlıyor — yazma yolu değişirse
 *      (ad göçü) bu test kırmızı olur ve kapsamın da göç etmesi gerektiğini
 *      söyler; sessizce ayrışmaz.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const oku = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const EDGE_DOSYALARI = [
  'supabase/functions/delete-user/index.ts',
  'supabase/functions/reset-user/index.ts',
];

describe('Silme kapsamı — chat-images bucket, iki önek', () => {
  for (const dosya of EDGE_DOSYALARI) {
    describe(dosya, () => {
      const KAYNAK = oku(dosya);

      it('sohbet görselleri önekini (chat-images/{uid}) hâlâ listeler ve siler', () => {
        expect(KAYNAK).toMatch(/storage\.from\('chat-images'\)\s*\n\s*\.list\(user\.id, \{ limit: 1000 \}\)/);
        expect(KAYNAK).toMatch(/\.remove\(imgs\.map\(\(f\) => `\$\{user\.id\}\/\$\{f\.name\}`\)\)/);
      });

      it('hayal önekini (chat-images/hayal/{uid}) de listeler ve siler', () => {
        expect(KAYNAK).toMatch(/storage\.from\('chat-images'\)\s*\n\s*\.list\(`hayal\/\$\{user\.id\}`, \{ limit: 1000 \}\)/);
        expect(KAYNAK).toMatch(/\.remove\(hayaller\.map\(\(f\) => `hayal\/\$\{user\.id\}\/\$\{f\.name\}`\)\)/);
      });

      it('hayal bloğu kendi etiketiyle hata toplar — chat-images bloğuyla karışmaz', () => {
        expect(KAYNAK).toMatch(/errors\.push\(\{ table: 'storage:chat-images:hayal'/);
      });

      it('hayal bloğu AYNI try/catch kalıbını taşır (sessiz düşüş, §5.2)', () => {
        const blokBasi = KAYNAK.indexOf("list(`hayal/${user.id}`");
        expect(blokBasi).toBeGreaterThan(-1);
        const tryBasi = KAYNAK.lastIndexOf('try {', blokBasi);
        expect(tryBasi).toBeGreaterThan(-1);
        const cevre = KAYNAK.slice(tryBasi, blokBasi + 400);
        expect(cevre).toMatch(/^try \{/);
        expect(cevre).toMatch(/\} catch \(e\) \{/);
        expect(cevre).toMatch(/\(e as Error\)\?\.message \|\| 'list\/remove failed'/);
      });

      it('ikinci bucket AÇILMAZ — hayal bloğu da chat-images kullanır (K4)', () => {
        // "hayal" bir bucket adı olarak storage.from(...) içinde geçmemeli.
        expect(KAYNAK).not.toMatch(/storage\.from\('hayal'\)/);
      });
    });
  }
});

describe('Silme kapsamı — 10i yazma yolu değişmedi (kapsam onunla senkron)', () => {
  const HAYAL_ALEMI = oku('js/parts/10i-w2-hayal-alemi.js');

  it('Hayalini Resmet görseli hâlâ chat-images bucket\'ının hayal/{uid}/ önekine yazılıyor', () => {
    // Yazma yolu değişirse (ör. ad göçü) edge fonksiyonlarının temizlediği
    // önek de göç etmeli — bu satır kırıldığında kapsamın da güncellenmesi
    // gerektiğini haber verir, sessizce ayrışmaz.
    expect(HAYAL_ALEMI).toMatch(/const path = `hayal\/\$\{uid\}\/\$\{sceneId\}\.jpg`/);
    expect(HAYAL_ALEMI).toMatch(/sb\.storage\.from\('chat-images'\)/);
  });
});
