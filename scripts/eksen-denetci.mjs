#!/usr/bin/env node
/**
 * Wanderer AI — EKSEN DENETÇİSİ
 * "Üç ses gerçekten üç mü" — eksen ayrışmasının kanıtlanabilir kapısı.
 * (.claude/plans/ic-calisma-08-uc-ses-rev2.md FAZ 5 · İç Çalışma 08 boşluk C)
 *
 * NEDEN VAR:
 * Ürün üç ses olduğunu söylüyor (Öz · Bağ · Eser) ve bu bir kimlik iddiası.
 * İçerik bir kez damıtıldı (mig 028 → 000'in INSERT bloğu) ve o günden beri
 * "Bağ'a ilişki sorusu sorulduğunda Öz'den farklı ne yapıyor?" sorusunun
 * cevabı hiçbir ölçümde yoktu.
 *
 * HAKEM NEDEN LLM DEĞİL (§6.10 · ses-eval.mjs'in birebir aynı gerekçesi):
 * İç Çalışma 08 raporu "LLM-hakem rubriği" öneriyordu. Bu repoda kurulamaz:
 * modelin kendi güven sayısı ne beyandır ne ölçüm, kalibre edilmemiş bir
 * öz-beyandır ve kapı olamaz. Bir modelin başka bir modelin sesini "8/10"
 * diye puanlaması aynı şeydir, yalnız bir katman uzakta. Buradaki ölçü metin
 * üzerinde GÖSTERİLEBİLİR: sözcük örtüşmesi ve tekillik — sayılabilir,
 * tekrarlanabilir, tartışmasız.
 *
 * KAPININ GÖREMEDİĞİ (kör nokta defteri):
 *   1. Anlam. İki eksen bambaşka sözcüklerle aynı şeyi söylüyorsa kapı
 *      "ayrıştı" der. Ölçülen kelime dağılımıdır, düşünce değil.
 *   2. Prod. Bu betik repodaki SEED'i ölçer (000'in INSERT bloğu). Model
 *      Stüdyosu'ndan yapılan canlı düzenleme bu kapıdan geçmez — soru
 *      "repoya giren içerik ayrışıyor mu", "gezginin bugün konuştuğu içerik
 *      ayrışıyor mu" değil.
 *   3. Bilgi tabanı. Kapı yalnız system_prompt (eksen DAVRANIŞI) üzerindedir.
 *      knowledge kitap içeriğidir ve örtüşmesi meşrudur: 30 Ağustos ölçümünde
 *      Eser↔Öz knowledge örtüşmesi %28.9'du, çünkü Eser iki kitabın iş
 *      ekseninden damıtıldı. O sayı RAPORDA görünür, kapıda değil.
 *   4. Türkçe biçimbilim. Sözcükler çekimleriyle sayılır: "ilişkide" ile
 *      "ilişkiyi" iki ayrı sözcüktür. Gövdeleme yok — eklendiğinde taban
 *      yeniden ölçülmeli.
 *
 * Kullanım:
 *   node scripts/eksen-denetci.mjs               → rapor + çıkış kodu
 *   node scripts/eksen-denetci.mjs --taban-yaz   → bugünkü ölçümü tabana yaz
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* Üç eksenin içerik blokları 000'de dolar-tırnakla saklanır. Etiketler
   kısaltmadır ve model id'siyle AYNI DEĞİLDİR — bg/es, bag/eser değil.
   Yanlış etiket sessizce boş metin döndürür ve kapı "ayrıştı" der. */
const TAG = { oz: ['ozs', 'ozk'], bag: ['bgs', 'bgk'], eser: ['ess', 'esk'] };
const EKSENLER = ['oz', 'bag', 'eser'];
const CIFTLER = [['oz', 'bag'], ['oz', 'eser'], ['bag', 'eser']];
const SEMA = join(ROOT, 'migrations/000_wanderer_schema.sql');
const TABAN = join(ROOT, 'scripts/eksen-taban.json');

/* Tolerans payı — Stüdyo'dan yapılan normal düzenleme birkaç puan oynatır;
   bu eşikler "içerik kopyalanmış" ölçeğindeki sıçramayı yakalar, üslup
   rötuşunu değil. Sayılar 30 Ağustos 2026 ölçümüne göre seçildi:
   system_prompt örtüşmesi %9.8–10.2, tekillik %72.3–75.5 bandındaydı. */
const JACCARD_MARJ  = 5;   // puan — örtüşme bu kadar YÜKSELEBİLİR
const TEKILLIK_MARJ = 8;   // puan — tekillik bu kadar DÜŞEBİLİR

const DURAK = new Set(['ve','ile','bir','bu','da','de','ki','için','ama','gibi','olarak','çok','daha','her','veya','ise','sen','senin','sana','seni','onun','değil','olan','olur','var','yok','kendi','şey','sonra','önce','böyle','şöyle','yani','eğer','ancak','ilk','tek','iki','üç','bunu','buna','onu','ona','biri','birlikte','kadar','zaman','hangi','olduğu','olmak','şeyi','bunun']);

/** Metni sözcük kümesine çevirir. 4 harften kısa sözcükler ve durak sözcükler
 *  düşer: ölçülen şey EKSEN SÖZLÜĞÜDÜR, Türkçenin ortak iskeleti değil.
 *  `\b` ve `\w` KULLANILMAZ (ses-eval.mjs:47-52'nin tuzağı): JS'te ikisi de
 *  ASCII tanımlıdır, `ç`/`ğ`/`ı` non-word sayılır — ayrıştırma bölmeyle
 *  kurulur, sınır regexiyle değil. */
export function kume(metin) {
  return new Set((metin || '').toLowerCase()
    .replace(/[^a-zçğıöşü\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !DURAK.has(w)));
}

function jaccard(A, B) {
  const kesisim = [...A].filter(x => B.has(x)).length;
  const birlesim = A.size + B.size - kesisim;
  return birlesim ? +(kesisim / birlesim * 100).toFixed(1) : 0;
}

/** Yalnız o eksende geçen sözcüklerin oranı — sesin kendine ait payı. */
function tekillik(id, K) {
  const otekiler = EKSENLER.filter(x => x !== id);
  const tekil = [...K[id]].filter(w => !otekiler.some(o => K[o].has(w)));
  return K[id].size ? +(tekil.length / K[id].size * 100).toFixed(1) : 0;
}

/** Dolar-tırnaklı bloğu çeker. Blok bulunamazsa '' döner — ve bu SESSİZ
 *  GEÇMEZ: olcum() boş metni ihlal olarak raporlar (etiket kaymışsa kapı
 *  "her şey ayrıştı" demesin). */
function blokAl(sql, tag) {
  const m = sql.match(new RegExp('\\$' + tag + '\\$([\\s\\S]*?)\\$' + tag + '\\$'));
  return m ? m[1] : '';
}

const _ciftJaccard = (K) => {
  const o = {};
  for (const [a, b] of CIFTLER) o[`${a}-${b}`] = jaccard(K[a], K[b]);
  return o;
};
const _tekillikler = (K) => {
  const o = {};
  for (const id of EKSENLER) o[id] = tekillik(id, K);
  return o;
};

/** Saf ölçüm — test buradan çağırır, dosya okumaz. */
export function olcum(sql) {
  const K = {}, T = {}, boyut = {}, bos = [];
  for (const id of EKSENLER) {
    const [tSp, tKn] = TAG[id];
    const sp = blokAl(sql, tSp);
    const kn = blokAl(sql, tKn);
    if (!sp || !kn) bos.push(id);
    K[id] = kume(sp);
    T[id] = kume(sp + ' ' + kn);
    boyut[id] = K[id].size;
  }
  return {
    sp:  { jaccard: _ciftJaccard(K), tekillik: _tekillikler(K), boyut },
    tam: { jaccard: _ciftJaccard(T), tekillik: _tekillikler(T) },   // rapor için, kapı DEĞİL
    bos,
  };
}

/** Tabanla karşılaştırır, ihlalleri döndürür. */
export function denetle(olculen, taban) {
  const ihlaller = [];
  const rapor = [];

  for (const id of (olculen.bos || [])) {
    ihlaller.push({
      kod: 'E1',
      mesaj: `${id}: system_prompt/knowledge bloğu okunamadı — dolar-tırnak etiketi değişmiş olabilir`,
    });
  }

  for (const [a, b] of CIFTLER) {
    const k = `${a}-${b}`;
    const t = Number(taban?.sp_jaccard?.[k]);
    const x = olculen.sp.jaccard[k];
    if (Number.isFinite(t)) {
      rapor.push(`  ${a}↔${b} davranış örtüşmesi %${x} (taban %${t})`);
      if (x > t + JACCARD_MARJ) {
        ihlaller.push({
          kod: 'E2',
          mesaj: `${a}↔${b}: eksen davranışı örtüşmesi %${x} (taban %${t}, tavan %${+(t + JACCARD_MARJ).toFixed(1)}) — iki ses birbirine yaklaşıyor`,
        });
      }
    }
  }

  for (const id of EKSENLER) {
    const t = Number(taban?.sp_tekillik?.[id]);
    const x = olculen.sp.tekillik[id];
    if (Number.isFinite(t)) {
      rapor.push(`  ${id} kendine ait sözcük payı %${x} (taban %${t})`);
      if (x < t - TEKILLIK_MARJ) {
        ihlaller.push({
          kod: 'E3',
          mesaj: `${id}: kendine ait sözcük payı %${x} (taban %${t}, taban-altı sınır %${+(t - TEKILLIK_MARJ).toFixed(1)}) — sesin kendi sözlüğü eriyor`,
        });
      }
    }
  }

  return { ihlaller, rapor };
}

/* ─── CLI — yalnız Node'da; testler modülü import eder, korumasız process
   erişimi import anında patlatırdı (ses-eval.mjs ile aynı guard). ─── */
if (typeof process !== 'undefined' && process.argv?.[1] && process.argv[1].endsWith('eksen-denetci.mjs')) {
  const sql = readFileSync(SEMA, 'utf-8');
  const olculen = olcum(sql);

  if (process.argv.includes('--taban-yaz')) {
    const eski = JSON.parse(readFileSync(TABAN, 'utf-8'));
    const yeni = {
      _aciklama: eski._aciklama,
      _olcum_tarihi: new Date().toISOString().slice(0, 10),
      sp_jaccard: olculen.sp.jaccard,
      sp_tekillik: olculen.sp.tekillik,
      _rapor_knowledge_dahil: {
        _not: eski._rapor_knowledge_dahil?._not || 'kapı DEĞİL — yalnız görünürlük.',
        jaccard: olculen.tam.jaccard,
        tekillik: olculen.tam.tekillik,
      },
    };
    writeFileSync(TABAN, JSON.stringify(yeni, null, 2) + '\n');
    const degisen = [
      ...Object.keys(yeni.sp_jaccard).filter(k => yeni.sp_jaccard[k] !== eski.sp_jaccard?.[k]),
      ...Object.keys(yeni.sp_tekillik).filter(k => yeni.sp_tekillik[k] !== eski.sp_tekillik?.[k]),
    ];
    console.log(`✓ eksen tabanı yeniden ölçüldü (${yeni._olcum_tarihi})`);
    console.log(degisen.length
      ? `  değişen ölçüm: ${degisen.join(', ')}`
      : '  taban değerleri değişmedi');
    process.exit(0);
  }

  const taban = JSON.parse(readFileSync(TABAN, 'utf-8'));
  const { ihlaller, rapor } = denetle(olculen, taban);

  if (ihlaller.length) {
    console.error(`✗ eksen-denetçi: ${ihlaller.length} ihlal — üç ses ayrışmıyor\n`);
    for (const i of ihlaller) console.error(`  ${i.kod} — ${i.mesaj}`);
    process.exitCode = 1;
  } else {
    const n = CIFTLER.length + EKSENLER.length;
    console.log(`Üç ses ayrışıyor — ${n} ölçüm taban içinde.`);
    for (const r of rapor) console.log(r);
    console.log(`  (bilgi tabanı dahil — kapı DEĞİL, yalnız görünürlük: Öz↔Eser %${olculen.tam.jaccard['oz-eser']})`);
  }
}
