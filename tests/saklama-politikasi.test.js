/**
 * SAKLAMA POLİTİKASI — İç Çalışma 17 · boşluk C (Kalan Yol Haritası FAZ 6).
 *
 * `migrations/053_saklama_politikasi.sql` `usage_events`e bir saklama
 * politikası kazandırır: günlük agregat tablo (`usage_events_daily`) →
 * geri doldurma → `usage_events_prune(p_gun)` RPC. K3'ün sırası pazarlıksız:
 * ham satır silinmeden ÖNCE agregat dolmalı.
 *
 * NOT — bu bir Postgres migration dosyasıdır; vitest onu KOŞTURAMAZ (Deno/
 * Postgres yok). Bu yüzden dosya KAYNAK TARAMASIYLA sınanır — aynı gerekçe
 * `tests/tik-atifi-kapisi.test.js`'in kabul ettiği yöntemdir: biçim değişirse sahte
 * kırmızı verebilir, ama SIRAYI ve SÖZLEŞMEYİ statik olarak kanıtlar.
 * Tarama DAR tutulur — her iddia migration metninin somut bir parçasına
 * bağlanır, "muhtemelen doğrudur" bir madde yoktur.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const sql = readFileSync(join(ROOT, 'migrations/053_saklama_politikasi.sql'), 'utf8');

describe('migrations/053_saklama_politikasi.sql — K3 sözleşmesi', () => {
  it('admin_usage_report HİÇ geçmez — 051 blok zincirine dokunmaz, taşıma borcu doğmaz', () => {
    expect((sql.match(/admin_usage_report/g) || []).length).toBe(0);
  });

  it('gün türetmesi Europe/Istanbul kullanır — TR gün kaydırma tuzağına düşmez', () => {
    // 13q Korunanlar'ın sunucu ikizi: `_quota_day` / admin raporunun local_ts'i
    // ile aynı desen. Her `entered_at`/`now()` kaynaklı ::date dönüşümü bu
    // sarmalayıcının İÇİNDEN geçmeli.
    expect(sql).toContain("AT TIME ZONE 'Europe/Istanbul'");
    expect((sql.match(/AT TIME ZONE 'Europe\/Istanbul'/g) || []).length).toBeGreaterThanOrEqual(5);
  });

  it('naif (Europe/Istanbul\'suz) bir ::date türetmesi YOK — UTC gün kaydırma tuzağı kapalı', () => {
    // Kod bloklarını (yorumlar hariç) al: örnek SQL'i içeren yorum satırları
    // (`-- ... entered_at::date ...` gibi açıklayıcı metin) gerçek bir
    // türetme DEĞİLDİR — yalnız kod satırları taranır.
    const kodSatirlari = sql
      .split('\n')
      .filter((satir) => !satir.trim().startsWith('--'))
      .join('\n');
    // Her ::date çağrısının hemen öncesinde bir kapanış parantezi olmalı —
    // yani çıplak `entered_at::date` ya da `now()::date` YOK, hepsi
    // `(... AT TIME ZONE 'Europe/Istanbul')::date` biçiminde.
    const ciplakTuretme = /(entered_at|now\(\))::date/;
    expect(kodSatirlari).not.toMatch(ciplakTuretme);
  });

  it('toISOString bir JS API\'sidir ve gerçek bir SQL türetmesi olarak KULLANILMAZ', () => {
    // Repo konvansiyonu (000:1516 emsali) toISOString'i yalnız AÇIKLAYICI
    // yorumda anar ("toISOString UTC'dir, TR'de gün kaydırır"); dosyada
    // toISOString GEÇİYORSA bile bu bir çağrı değil bir kıyas cümlesidir —
    // SQL'de zaten çağrılabilir bir fonksiyon değildir. Asıl kilit bir
    // üstteki testtir (çıplak ::date yok); bu test yalnız o kıyasın kod
    // olarak YAZILMADIĞINI doğrular.
    expect(sql).not.toMatch(/\btoISOString\s*\(/);
  });

  it('usage_events_daily tablosu (user_id, gun, screen, kind, adet, toplam_ms) taşır, birincil anahtar dörtlü', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS usage_events_daily');
    expect(sql).toContain('user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE');
    expect(sql).toContain('gun         DATE NOT NULL');
    expect(sql).toContain('screen      TEXT NOT NULL');
    expect(sql).toContain('kind        TEXT NOT NULL');
    expect(sql).toContain('PRIMARY KEY (user_id, gun, screen, kind)');
  });

  it('usage_events_daily üzerinde admin SELECT politikası YOK — usage_events ile aynı kural', () => {
    const policyBlok = sql.slice(
      sql.indexOf('CREATE TABLE IF NOT EXISTS usage_events_daily'),
      sql.indexOf('/* ─── 2.'),
    );
    expect(policyBlok).not.toMatch(/CREATE POLICY[^;]*is_admin/is);
    expect(policyBlok).not.toMatch(/FOR ALL/i);
    // yalnız owner select + owner insert — ikisi de var
    expect(policyBlok).toMatch(/CREATE POLICY "usage_events_daily owner insert"/);
    expect(policyBlok).toMatch(/CREATE POLICY "usage_events_daily owner select"/);
  });

  it('geri doldurma REPLACE semantiğiyle idempotenttir (SET x = EXCLUDED.x, toplamaz)', () => {
    const geriDoldurmaBlok = sql.slice(
      sql.indexOf('/* ─── 2.'),
      sql.indexOf('/* ─── 3.'),
    );
    expect(geriDoldurmaBlok).toContain('ON CONFLICT (user_id, gun, screen, kind) DO UPDATE');
    expect(geriDoldurmaBlok).toContain('SET adet      = EXCLUDED.adet,');
    // toplayan bir semantik (adet = usage_events_daily.adet + EXCLUDED.adet)
    // dosyanın iki kez koşulmasında sayıları katlardı — bu desen YOK.
    expect(geriDoldurmaBlok).not.toMatch(/adet\s*=\s*usage_events_daily\.adet\s*\+/);
  });

  it('usage_events_prune: ÖNCE agregat INSERT, SONRA DELETE gelir (K3 sırası)', () => {
    const fnIdx = sql.indexOf('CREATE OR REPLACE FUNCTION public.usage_events_prune');
    expect(fnIdx).toBeGreaterThan(-1);
    const fnBody = sql.slice(fnIdx, sql.indexOf('$$;', fnIdx) + 3);
    const insertIdx = fnBody.indexOf('INSERT INTO usage_events_daily');
    const deleteIdx = fnBody.indexOf('DELETE FROM usage_events');
    expect(insertIdx).toBeGreaterThan(-1);
    expect(deleteIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeLessThan(deleteIdx);
  });

  it('usage_events_prune varsayılan p_gun=90 alır ve silinen satır sayısını INTEGER olarak döndürür', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.usage_events_prune(p_gun INT DEFAULT 90)');
    expect(sql).toContain('RETURNS INTEGER');
    expect(sql).toContain('GET DIAGNOSTICS v_silinen = ROW_COUNT');
    expect(sql).toContain('RETURN v_silinen');
  });

  it('usage_events_prune SECURITY DEFINER — yalnız service_role çağırabilir, PUBLIC reddedilir', () => {
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.usage_events_prune\(INT\) FROM PUBLIC;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.usage_events_prune\(INT\) TO service_role;/);
    // authenticated'a AYRICA yetki verilmedi — kullanıcı kendi verisini
    // toplu silmez, bu bir bakım işidir (fn_quota_consume emsali).
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.usage_events_prune\(INT\) TO authenticated/);
  });

  it('pg_cron GERÇEKTEN bağlanmaz — kurulum/tetikleme çağrısı yok (bilinçli sınır, ELLE kalır)', () => {
    // Dosyanın kendi başlığı `pg_cron` sözcüğünü AÇIKLAYICI yorumda anar
    // ("bu repoda hiç kullanılmamış") — bu bir belge cümlesidir, bir
    // BAĞLANMA değil. Asıl iddia gerçek kurulum/tetikleme çağrılarının
    // YOKLUĞU: uzantı kurulmaz, zamanlama fonksiyonu çağrılmaz.
    expect(sql).not.toMatch(/CREATE EXTENSION[^;]*pg_cron/i);
    expect(sql).not.toMatch(/cron\.schedule\s*\(/i);
    expect(sql).not.toMatch(/cron\.unschedule\s*\(/i);
  });

  it('usage_events şemasına dokunmaz — CREATE/ALTER/DROP ile usage_events (_daily hariç) hiç anılmaz', () => {
    // Yalnız FROM/agregat kaynağı olarak OKUNUR; şema değişikliği aranmaz.
    expect(sql).not.toMatch(/ALTER TABLE usage_events\b/);
    expect(sql).not.toMatch(/CREATE TABLE (IF NOT EXISTS )?usage_events\b/);
  });
});


/* Faz denetiminde (parent · Opus) bulundu: agregat SICAK/SOĞUK bölünmenin
   soğuk yarısıdır ve geri doldurma bugünü de kapsadığı için yakın günlerde
   EKSİK bir satır bırakır. Kırık bu değildi — kırık, bunun yazılmamış
   olmasıydı: yazılmasa bir gün biri o satırı "günün toplamı" diye okur ve
   ölçülmüş görünen eksik bir sayı basardı (§6.10). */
describe('053 — okuma sözleşmesi yazılı (bayat satır tuzağı)', () => {
  const sql = readFileSync(join(ROOT, 'migrations/053_saklama_politikasi.sql'), 'utf8');

  it('tablonun yalnız ham satırı olmayan günler için otorite olduğu yazılı', () => {
    expect(sql).toContain('OKUMA SÖZLEŞMESİ');
    expect(sql).toMatch(/ham satırı duran gün için `usage_events`/);
  });

  it('çakışmada otoritenin HAM taraf olduğu açıkça söyleniyor', () => {
    expect(sql).toContain('otorite HAM olandır');
  });
});
