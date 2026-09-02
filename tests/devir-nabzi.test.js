// @vitest-environment node
/**
 * DEVİR NABZI KAPISI — scripts/devir-notu.sh
 *
 * §4.4'ün devir kuralı 2026-07-27'de kondu ve 2026-08-11'de sessizce öldü.
 * 08-25 ölçümü: planlarda 149 🅢 faz, `uygulayici` çağrısı 11 — 12 Ağustos
 * sonrası 85 🅢 faza karşı 1. Kural kağıtta doğruydu; kimse ölçmediği için
 * kimse öldüğünü görmedi.
 *
 * Nabız o körlüğü kapatır, ama nabzın kendisi de sessizce yalan söyleyebilir:
 * ilk yazımında proje slug'ı yalnız '/' karakterini çeviriyordu ve repo adında
 * boşluk olduğu için ("Wanderer AI") JSONL dizini hiç bulunamadı — sayaç 0
 * bastı, yani "kapı kapalı" uyarısı DOĞRU sebeple değil YANLIŞ sebeple
 * görünüyordu. Ölçen aletin kendisi ölçülmezse ölçüm bir teselli olur.
 * Bu dosya o aleti ölçer.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const KAYNAK = path.resolve(__dirname, '../scripts/devir-notu.sh');

let kok; // her koşuda taze geçici kök

/** Boşluklu dizin adı BİLEREK seçildi — asıl bug oradaydı. */
function sahteRepoKur() {
  const taban = fs.mkdtempSync(path.join(os.tmpdir(), 'devir-nabzi-'));
  const repo = path.join(taban, 'Wanderer AI');
  const ev = path.join(taban, 'ev');
  fs.mkdirSync(path.join(repo, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(repo, '.claude', 'plans'), { recursive: true });
  fs.copyFileSync(KAYNAK, path.join(repo, 'scripts', 'devir-notu.sh'));

  // Script repo değilse sessizce çıkar — git deposu şart.
  execFileSync('git', ['init', '-q'], { cwd: repo });
  execFileSync('git', ['config', 'user.email', 't@t.t'], { cwd: repo });
  execFileSync('git', ['config', 'user.name', 't'], { cwd: repo });
  fs.writeFileSync(path.join(repo, 'x.txt'), 'x');
  execFileSync('git', ['add', '-A'], { cwd: repo });
  execFileSync('git', ['commit', '-qm', 'ilk'], { cwd: repo });

  return { taban, repo, ev };
}

/** Claude Code slug'ı: '/' VE boşluk tireye döner. */
function slugla(yol) {
  return yol.replace(/[/ ]/g, '-');
}

function planYaz(repo, sFazSayisi) {
  const satirlar = [];
  for (let i = 1; i <= sFazSayisi; i++) {
    satirlar.push(`### FAZ ${i} — deneme · 🅢 · ~1 oturum`);
  }
  fs.writeFileSync(path.join(repo, '.claude', 'plans', 'deneme.md'), satirlar.join('\n'));
}

/** gunOnce=0 → bugün. 14'ten büyük değer eşiğin dışına düşmeli. */
function cagriYaz(ev, repo, tarihler) {
  const dizin = path.join(ev, '.claude', 'projects', slugla(repo));
  fs.mkdirSync(dizin, { recursive: true });
  const satirlar = tarihler.map((gunOnce) => {
    const d = new Date(Date.now() - gunOnce * 86400000).toISOString();
    return JSON.stringify({
      timestamp: d,
      message: { content: [{ type: 'tool_use', input: { subagent_type: 'uygulayici' } }] },
    });
  });
  fs.writeFileSync(path.join(dizin, 'oturum.jsonl'), satirlar.join('\n') + '\n');
}

/**
 * Gerçek transkript biçimini taklit eder: her çağrının bir `id`'si ve
 * ardından gelen bir `tool_result`'ı vardır. `basarisizSayisi` kadar çağrı
 * "Agent type 'uygulayici' not found" hatasıyla döner (`is_error:true`) —
 * bu sprintte gerçekte olan tam olarak buydu.
 */
function karisikCagriYaz(ev, repo, { basarili = 0, basarisiz = 0 } = {}) {
  const dizin = path.join(ev, '.claude', 'projects', slugla(repo));
  fs.mkdirSync(dizin, { recursive: true });
  const simdi = new Date().toISOString();
  const satirlar = [];
  for (let i = 0; i < basarili; i++) {
    const id = `toolu_basarili${i}`;
    satirlar.push(JSON.stringify({
      timestamp: simdi,
      message: { role: 'assistant', content: [
        { type: 'tool_use', id, name: 'Agent', input: { subagent_type: 'uygulayici' } },
      ] },
    }));
    satirlar.push(JSON.stringify({
      timestamp: simdi,
      message: { role: 'user', content: [
        { type: 'tool_result', tool_use_id: id, content: [{ type: 'text', text: 'hazır' }] },
      ] },
    }));
  }
  for (let i = 0; i < basarisiz; i++) {
    const id = `toolu_basarisiz${i}`;
    satirlar.push(JSON.stringify({
      timestamp: simdi,
      message: { role: 'assistant', content: [
        { type: 'tool_use', id, name: 'Agent', input: { subagent_type: 'uygulayici' } },
      ] },
    }));
    satirlar.push(JSON.stringify({
      timestamp: simdi,
      message: { role: 'user', content: [
        { type: 'tool_result', tool_use_id: id, content: "Agent type 'uygulayici' not found.", is_error: true },
      ] },
    }));
  }
  fs.writeFileSync(path.join(dizin, 'oturum.jsonl'), satirlar.join('\n') + '\n');
}

function kostur({ repo, ev }) {
  execFileSync('bash', [path.join(repo, 'scripts', 'devir-notu.sh')], {
    env: { ...process.env, HOME: ev },
  });
  return fs.readFileSync(path.join(repo, '.claude', 'DEVIR.md'), 'utf8');
}

beforeAll(() => {
  kok = sahteRepoKur();
});

afterAll(() => {
  try { fs.rmSync(kok.taban, { recursive: true, force: true }); } catch (_) {}
});

describe('devir nabzı — sayaç', () => {
  it('boşluklu repo yolunda JSONL dizinini bulur (slug bug regresyonu)', () => {
    planYaz(kok.repo, 10);
    cagriYaz(kok.ev, kok.repo, [0, 1, 2]);
    const cikti = kostur(kok);

    expect(cikti).toContain('## Devir nabzı');
    // Slug yalnız '/' çevirseydi dizin bulunamaz ve burası 0 olurdu.
    expect(cikti).toMatch(/`uygulayici` çağrısı: \*\*3\*\*/);
  });

  it('14 günden eski çağrıyı saymaz — dosya bugün dokunulmuş olsa bile', () => {
    planYaz(kok.repo, 10);
    cagriYaz(kok.ev, kok.repo, [0, 30, 45]); // dosyanın mtime'ı ŞİMDİ
    const cikti = kostur(kok);

    // mtime'a bakan bir sayaç 3 sayardı; tarihe bakan 1 sayar.
    expect(cikti).toMatch(/`uygulayici` çağrısı: \*\*1\*\*/);
  });

  it('🅢 faz sayısını plan başlıklarından okur', () => {
    planYaz(kok.repo, 7);
    cagriYaz(kok.ev, kok.repo, [0]);
    expect(kostur(kok)).toMatch(/\*\*🅢 faz: 7\*\*/);
  });

  it('başarısız (hata dönen) çağrıyı saymaz — transkripte yazılmış olmak yetmez', () => {
    // Bu sprintte gerçekte olan: 2 çağrı denendi, ikisi de
    // "Agent type 'uygulayici' not found" ile döndü. Eski sayaç ikisini de
    // "devir yapıldı" sayıyordu çünkü yalnız satırın varlığına bakıyordu.
    planYaz(kok.repo, 5);
    karisikCagriYaz(kok.ev, kok.repo, { basarili: 1, basarisiz: 2 });
    const cikti = kostur(kok);
    expect(cikti).toMatch(/`uygulayici` çağrısı: \*\*1\*\*/);
  });
});

describe('devir nabzı — uyarı eşiği', () => {
  it('🅢 faz varken hiç çağrı yoksa uyarır', () => {
    planYaz(kok.repo, 12);
    cagriYaz(kok.ev, kok.repo, []);
    const cikti = kostur(kok);
    expect(cikti).toContain('Devir kapısı kapalı');
    expect(cikti).toMatch(/12 🅢 faza karşı 0 çağrı/);
  });

  it('oran %20 altındaysa uyarır — birleştirme değil, terk', () => {
    planYaz(kok.repo, 20);
    cagriYaz(kok.ev, kok.repo, [0, 1]); // 2/20 = %10
    expect(kostur(kok)).toContain('Devir kapısı kapalı');
  });

  it('oran %20 üstündeyse uyarmaz — §4.4 birleştirmeye izin verir', () => {
    planYaz(kok.repo, 8);
    cagriYaz(kok.ev, kok.repo, [0, 1, 2]); // 3/8 = %37
    const cikti = kostur(kok);
    expect(cikti).toContain('## Devir nabzı');
    expect(cikti).not.toContain('Devir kapısı kapalı');
  });

  it('hiç 🅢 faz yoksa uyarmaz — sıfıra bölünen bir kapı yok', () => {
    fs.writeFileSync(
      path.join(kok.repo, '.claude', 'plans', 'deneme.md'),
      '### FAZ 1 — görsel dil · 🅞 · ~2 oturum',
    );
    cagriYaz(kok.ev, kok.repo, []);
    expect(kostur(kok)).not.toContain('Devir kapısı kapalı');
  });
});
