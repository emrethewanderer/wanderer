/* ═══════════════════════════════════════════════════════
   BEKLEME DÖNGÜSÜ KAPISI — tavansız bekleyiş ve yanlış GitHub yolu
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Bu repo "sahte başarı yasak" der (§6.2). Sessiz bir sonsuz döngü onun
     kardeşidir: hiçbir şey yanlış RAPORLAMAZ, yalnız hiç bitmez — ve bir
     oturumu saatlerce yiyebilir. Dürüstlük yalnız çıktının değil, DURMANIN
     da sözleşmesidir.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     İki desen aranır ve ikisi de bugün repoda SIFIRDIR (regresyon kapısı):
       1. Tavansız bekleme döngüsü — `while true` / `until …` + `sleep`,
          aynı blokta hiçbir çıkış sayacı yok.
       2. Doğrudan GitHub API — `api.github.com`. Bu oturumda 403 döner
          ("GitHub access is not enabled for this session"); erişim yalnız
          MCP araçlarındadır.
     İkisi 2026-09-03'te BİRLEŞTİ ve 40 dakika yedi: curl 403 döndü, JSON'da
     `status` alanı olmadığı için boş string çıktı, `'' != "completed"` sonsuza
     kadar doğru kaldı. Ne hata basıldı ne döngü kırıldı — koşu çoktan yeşil
     bitmişti, bekleyen sorgu bunu asla göremedi.
   Kalıcılık: Kalıcılık yok — statik tarama
   Konvansiyon: taban SIFIR; kapı büyümeyi yasaklar (kalıp:
                tests/referans-butunlugu.test.js)
═══════════════════════════════════════════════════════ */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

/* Yalnız KABUK yüzeyleri taranır: betikler, kancalar, workflow'lar. Uygulama
   JS'i kapsam dışıdır — orada `while(true)` bir oyun döngüsü ya da bir parser
   olabilir ve bu kapının konusu değildir. */
const TARANAN_KOK = ['scripts', '.github', '.claude/hooks'];
const TARANAN_UZANTI = new Set(['.sh', '.bash', '.yml', '.yaml', '.mjs', '.js']);

/* Bir bekleme döngüsünün TAVANI olduğunu gösteren işaretler. Biri yeterlidir —
   kapı "doğru tavan" değil "herhangi bir tavan" arar; niyeti okumak testin
   işi değil, sonsuzluğu yasaklamak işidir. */
const TAVAN = /\b(break|max|MAX|deneme|attempt|retry|retries|timeout|TIMEOUT|SECONDS|elapsed|deadline|--max-time|-m\s+\d)\b|\bi\+\+|\+=\s*1/;

function gez(dir) {
  const out = [];
  let girdiler;
  try { girdiler = readdirSync(dir); } catch (_) { return out; }
  for (const ad of girdiler) {
    if (ad === 'node_modules' || ad === '.git') continue;
    const tam = join(dir, ad);
    let st;
    try { st = statSync(tam); } catch (_) { continue; }
    if (st.isDirectory()) out.push(...gez(tam));
    else if (TARANAN_UZANTI.has(extname(ad))) out.push(tam);
  }
  return out;
}

function dosyalar() {
  return TARANAN_KOK.flatMap((k) => gez(join(ROOT, k)));
}

describe('bekleme döngüsü kapısı — sessiz sonsuzluk yasak', () => {
  it('kabuk yüzeylerinde tavansız bekleme döngüsü yok', () => {
    const ihlaller = [];
    for (const yol of dosyalar()) {
      const src = readFileSync(yol, 'utf8');
      const satirlar = src.split('\n');
      satirlar.forEach((satir, i) => {
        const dongu = /\bwhile\s+true\b|\buntil\s+[[(]/.test(satir);
        if (!dongu) return;
        /* Döngü gövdesi: açılış satırından sonraki 12 satır. `sleep` yoksa
           bu bir bekleme döngüsü değildir (bir işleme döngüsüdür) ve kapının
           konusu dışındadır. */
        const govde = satirlar.slice(i, i + 12).join('\n');
        if (!/\bsleep\b/.test(govde)) return;
        if (TAVAN.test(govde)) return;
        ihlaller.push(`${yol.replace(ROOT + '/', '')}:${i + 1}`);
      });
    }
    expect(ihlaller, `Tavansız bekleme döngüsü — koşul asla sağlanmazsa süreç sonsuza gider:\n  ${ihlaller.join('\n  ')}\n\nHer bekleme döngüsü bir tavan taşımalı ve tavan dolunca GÜRÜLTÜLÜ bitmeli.`).toEqual([]);
  });

  it('doğrudan GitHub API çağrısı yok — erişim yalnız MCP araçlarında', () => {
    const ihlaller = [];
    for (const yol of dosyalar()) {
      /* Bu testin kendisi deseni metin olarak taşır; kendini saymaz. */
      if (yol.endsWith('bekleme-dongusu-kapisi.test.js')) continue;
      const src = readFileSync(yol, 'utf8');
      src.split('\n').forEach((satir, i) => {
        if (!satir.includes('api.github.com')) return;
        /* GitHub Actions'ın KENDİ içinde koşan adımlar meşrudur — orada token
           gerçektir. Kapı, uzak Claude oturumunun kabuğunu hedefler. */
        if (/\$\{\{\s*(secrets|github)\./.test(satir)) return;
        ihlaller.push(`${yol.replace(ROOT + '/', '')}:${i + 1}`);
      });
    }
    expect(ihlaller, `Doğrudan GitHub API çağrısı:\n  ${ihlaller.join('\n  ')}\n\nUzak oturumda GITHUB_TOKEN bir yer tutucudur ("proxy-injected") ve API 403 döner — SESSİZCE. Erişim yalnız mcp__github__* araçlarındadır.`).toEqual([]);
    });

  it('kapının kendisi — ihlali gerçekten yakalıyor mu', () => {
    /* Ölçen alet de ölçülür (§10.5). Sentetik iki gövde, diskte değil bellekte. */
    const kotu = 'until [ "$(curl -sS api.github.com/x)" = "completed" ]; do\n  sleep 20\ndone';
    const iyi  = 'deneme=0\nuntil [ "$(kontrol)" = "ok" ]; do\n  sleep 5\n  deneme=$((deneme+1))\n  [ $deneme -ge 30 ] && { echo "TAVAN DOLDU"; exit 1; }\ndone';

    const tavansiz = (metin) => {
      const satirlar = metin.split('\n');
      return satirlar.some((satir, i) => {
        if (!/\bwhile\s+true\b|\buntil\s+[[(]/.test(satir)) return false;
        const govde = satirlar.slice(i, i + 12).join('\n');
        return /\bsleep\b/.test(govde) && !TAVAN.test(govde);
      });
    };

    expect(tavansiz(kotu), 'kapı tavansız döngüyü kaçırdı').toBe(true);
    expect(tavansiz(iyi), 'kapı tavanlı döngüyü yanlışlıkla yakaladı').toBe(false);
  });
});
