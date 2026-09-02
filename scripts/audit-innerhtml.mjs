#!/usr/bin/env node
/**
 * Wanderer AI — XSS YÜZEY DENETÇİSİ
 * "HTML'e giren her değerin bir kaçış kaydı vardır" sınıfının bekçisi.
 *
 * ESKİ MOTOR NEDEN YANLIŞ SAYIYORDU (denetim D3):
 * `.innerHTML =` satırını bulup ±2 SATIRLIK PENCEREYE bakıyordu. Bu iki
 * yönde de yalan söylüyordu:
 *   — Şişiriyordu: `list.innerHTML = notes.map(n => \`…${escapeHTML(n.t)}…\`)`
 *     gibi çok satırlı bir blokta kaçış altı satır aşağıdaysa pencereye
 *     girmiyor, temiz kod "riskli" sayılıyordu (105 kayıttan çoğu buydu).
 *   — KAÇIRIYORDU: komşu satırdaki alakasız bir `escapeHTML` yüzünden
 *     gerçekten korumasız bir atama "kaçışlı" damgası yiyordu. Tehlikeli
 *     olan buydu.
 *
 * YENİ MOTORUN ÖLÇÜSÜ: satır değil, İFADE — ve yalnız `innerHTML` değil,
 * HTML ÜRETEN HER TEMPLATE. Bu repoda HTML çoğunlukla `innerHTML` satırında
 * değil, HTML döndüren yardımcı fonksiyonlarda kurulur
 * (`${_atlRing(1)}`, `${kkRenderCard3D(kart)}`). Bir fonksiyon çağrısını
 * tek başına "riskli" saymak da, "güvenli" saymak da yanlıştır: doğrusu
 * O FONKSİYONUN KENDİ TEMPLATE'İNİ de taramaktır — motor bunu yapar, bu
 * yüzden çağrı yerinde fonksiyon çağrıları yapısal sayılır.
 *
 * Bir interpolasyon GÜVENLİdir eğer:
 *   escapeHTML/esc/_esc/... ile sarılıysa · i18n getter'ı ise (t/p) ·
 *   salt literal/aritmetik ise · UPPER_SNAKE sabit ise · fonksiyon çağrısı
 *   ise (o fonksiyonun gövdesi ayrıca taranır) · sanitize'dan geçiyorsa.
 * Aksi hâlde ham veri erişimidir ve kayda geçer.
 *
 * KAPI: `scripts/xss-taban.json` bugünkü kayıtları dondurur; denetçi
 * listenin BÜYÜMESİNİ yasaklar. Listeden düşmek (kaçış eklemek) serbesttir
 * ve `--taban-yaz` ile kayda geçer. Liste boşaldığında kapı sert kapıya
 * döner. Bilinçli istisna satırda `/* XSS-MUAF: gerekçe *​/` ile beyan edilir.
 *
 * Kullanım:
 *   node scripts/audit-innerhtml.mjs              → denetle (ihlalde exit 1)
 *   node scripts/audit-innerhtml.mjs --liste      → tüm kayıtları dök
 *   node scripts/audit-innerhtml.mjs --taban-yaz  → tabanı bugüne çek
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARAMA_KOKU = join(ROOT, 'js');
const TABAN_YOL = join(ROOT, 'scripts/xss-taban.json');

/* ─── 1. DOSYA GEZGİNİ ─── */
function gez(dizin) {
  const out = [];
  for (const f of readdirSync(dizin)) {
    const tam = join(dizin, f);
    if (statSync(tam).isDirectory()) out.push(...gez(tam));
    else if (f.endsWith('.js')) out.push(tam);
  }
  return out;
}

/* ─── 2. TEMPLATE LITERAL AYIKLAYICI ───
   Kaynaktaki her backtick bloğunu, iç içe `${...}` bloklarıyla birlikte
   dengeli biçimde çıkarır. Tırnak ve kaçış farkındadır — yoksa bir
   apostroflu Türkçe metin ("Emre'nin") ayıklamayı raydan çıkarırdı. */
function templateBloklari(src) {
  const bloklar = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2); if (i < 0) break; i += 2; continue; }
    if (c === '"' || c === "'") {
      const t = c; i++;
      while (i < src.length && src[i] !== t) { if (src[i] === '\\') i++; i++; }
      i++; continue;
    }
    if (c === '`') {
      const bas = i; i++;
      let derinlik = 0;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '$' && src[i + 1] === '{') { derinlik++; i += 2; continue; }
        if (src[i] === '}' && derinlik > 0) { derinlik--; i++; continue; }
        if (src[i] === '`' && derinlik === 0) break;
        if (src[i] === '`' && derinlik > 0) {           // iç içe template
          let d2 = 0; i++;
          while (i < src.length) {
            if (src[i] === '\\') { i += 2; continue; }
            if (src[i] === '$' && src[i + 1] === '{') { d2++; i += 2; continue; }
            if (src[i] === '}' && d2 > 0) { d2--; i++; continue; }
            if (src[i] === '`' && d2 === 0) { i++; break; }
            i++;
          }
          continue;
        }
        i++;
      }
      bloklar.push({ bas, metin: src.slice(bas, i + 1) });
      i++; continue;
    }
    i++;
  }
  return bloklar;
}

/* ─── 3. İNTERPOLASYON AYIKLAYICI ─── */
function interpolasyonlar(tpl) {
  const out = [];
  for (let i = 0; i < tpl.length; i++) {
    if (tpl[i] === '$' && tpl[i + 1] === '{') {
      let d = 1, j = i + 2, tirnak = null;
      for (; j < tpl.length && d > 0; j++) {
        const c = tpl[j];
        if (c === '\\') { j++; continue; }
        if (tirnak) { if (c === tirnak) tirnak = null; continue; }
        if (c === '"' || c === "'" || c === '`') { tirnak = c; continue; }
        if (c === '{') d++; else if (c === '}') d--;
      }
      out.push(tpl.slice(i + 2, j - 1));
      i = j - 1;
    }
  }
  return out;
}

/* ─── 4. SINIFLANDIRICI ─── */
const KACIS = /^(escapeHTML|esc|_esc|_libEsc|ikvEsc|escAttr|safeHTML|safeMarkdownHTML|sanitizeMarkdown|DOMPurify\.sanitize)\s*\(/;
const I18N = /^(t|p|tSes)\s*\(/;
const YAPISAL_AD = /^(i|j|n|k|idx|index|no|sira|adet|Math|String|Number|Boolean|JSON|Array|Object|length|toFixed|round|floor|ceil|abs|min|max|map|join|filter|slice|padStart|padEnd|repeat|toString|toUpperCase|toLowerCase|trim|reverse|sort|concat)$/;

function tur(ham) {
  const s = String(ham).trim();
  if (!s) return 'guvenli';

  // Ternary: koşul HTML'e yazılmaz, dallar yazılır.
  const q = s.indexOf('?');
  if (q > 0 && s.includes(':') && !s.slice(0, q).includes('(')) {
    const kalan = s.slice(q + 1);
    const c = kalan.lastIndexOf(':');
    if (c > 0) {
      return (tur(kalan.slice(0, c)) === 'riskli' || tur(kalan.slice(c + 1)) === 'riskli')
        ? 'riskli' : 'guvenli';
    }
  }
  if (KACIS.test(s)) return 'kacisli';
  // Elle yazılmış kaçış: `(x || '').replace(/</g, '&lt;')` deseni repoda
  // escapeHTML'den önce de vardı ve gerçek bir kaçıştır — kaydetmek yerine
  // kaçışlı sayılır (yoksa taban gürültüyle şişer ve kapı okunmaz olur).
  if (/\.replace\s*\(\s*\/[&<>"']/.test(s) && /&(amp|lt|gt|quot|#39);/.test(s)) return 'kacisli';
  if (I18N.test(s)) return 'guvenli';

  // İç template varsa onun interpolasyonları ayrıca sınanır; dış kabuk
  // (map/join/filter zinciri) yapısaldır, HTML'e doğrudan girmez.
  if (s.includes('`')) {
    return interpolasyonlar(s).some(x => tur(x) === 'riskli') ? 'riskli' : 'guvenli';
  }
  if (/\.length\s*$/.test(s)) return 'guvenli';

  // Fonksiyon çağrısı: gövdesi ayrıca taranır (bu motor tüm template'lere
  // bakar), o yüzden çağrı yerinde yapısal sayılır. `obj.alan` erişimi ise
  // ham veridir — parantezi olmayan property zinciri riskli kalır.
  const cip = s.replace(/(['"])(?:\\.|(?!\1).)*\1/g, '""');
  if (/^[A-Za-z_$][\w$.]*\s*\(/.test(cip) && !/^[A-Za-z_$][\w$]*\s*$/.test(cip)) return 'guvenli';

  const adlar = cip.match(/[A-Za-z_$][\w$]*/g) || [];
  if (!adlar.length) return 'guvenli';
  if (adlar.every(a => YAPISAL_AD.test(a) || /^_?[A-Z][A-Z0-9_]*$/.test(a))) return 'guvenli';
  return 'riskli';
}

/* ─── 5. TARAMA ─── */
const say = { toplam: 0, guvenli: 0, kacisli: 0, riskli: 0, muaf: 0 };
const kayitlar = [];

for (const dosya of gez(TARAMA_KOKU)) {
  const src = readFileSync(dosya, 'utf8');
  const yol = dosya.replace(ROOT + '/', '');
  const satirBasi = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') satirBasi.push(i + 1);
  const satirNo = (ofs) => {
    let lo = 0, hi = satirBasi.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (satirBasi[m] <= ofs) lo = m; else hi = m - 1; }
    return lo + 1;
  };

  for (const blok of templateBloklari(src)) {
    if (!/<[a-zA-Z/]/.test(blok.metin)) continue;      // HTML üretmeyen template
    for (const ic of interpolasyonlar(blok.metin)) {
      say.toplam++;
      const t = tur(ic);
      if (t === 'kacisli') { say.kacisli++; continue; }
      if (t === 'guvenli') { say.guvenli++; continue; }
      const no = satirNo(blok.bas);
      // MUAF beyanı template'in İÇİNDE de olabilir, hemen ÜSTÜNDEKİ yorum
      // satırında da (yaygın hâli budur) — iki satır yukarısı da okunur.
      const sonSatir = satirNo(blok.bas + blok.metin.length);
      const satirMetni = src.split('\n').slice(Math.max(0, no - 3), sonSatir).join(' ');
      if (/XSS-MUAF:/.test(satirMetni)) { say.muaf++; continue; }
      say.riskli++;
      kayitlar.push(`${yol}:${ic.split('\n')[0].trim().slice(0, 60)}`);
    }
  }
}

const benzersiz = [...new Set(kayitlar)].sort();

/* ─── 6. TABAN KARŞILAŞTIRMA ─── */
let taban = { _aciklama: '', kayitlar: [] };
try { taban = JSON.parse(readFileSync(TABAN_YOL, 'utf8')); } catch (_) {}
const tabanSet = new Set(taban.kayitlar || []);

if (process.argv.includes('--taban-yaz')) {
  writeFileSync(TABAN_YOL, JSON.stringify({
    _aciklama: taban._aciklama || 'XSS denetçisinin taban çizgisi — BUGÜN kaçış kaydı olmayan interpolasyonlar. Kapı bu listenin BÜYÜMESİNİ yasaklar: yeni bir korumasız interpolasyon doğamaz. Listeden düşmek (escapeHTML eklemek) serbesttir ve --taban-yaz ile kayda geçer. Liste boşaldığında kapı sert kapıya döner. Bilinçli istisna satırda /* XSS-MUAF: gerekçe */ ile beyan edilir.',
    kayitlar: benzersiz,
  }, null, 2) + '\n');
  console.log(`✓ taban yazıldı — ${benzersiz.length} kayıt`);
  process.exit(0);
}

console.log('XSS yüzey denetçisi — HTML üreten template interpolasyonları');
console.log('────────────────────────────────────────────────────────────');
console.log(`Toplam interpolasyon : ${say.toplam}`);
console.log(`  güvenli            : ${say.guvenli}   (i18n · sabit · yapısal · fonksiyon çağrısı)`);
console.log(`  kaçışlı            : ${say.kacisli}   (escapeHTML/safeHTML zincirinden geçer)`);
console.log(`  muaf               : ${say.muaf}   (XSS-MUAF beyanı)`);
console.log(`  kayıtlı ham erişim : ${say.riskli}   (${benzersiz.length} benzersiz)`);

if (process.argv.includes('--liste')) {
  console.log('\nKayıtlar:');
  for (const k of benzersiz) console.log('  ' + k);
}

const yeniler = benzersiz.filter(k => !tabanSet.has(k));
const dusenler = [...tabanSet].filter(k => !benzersiz.includes(k));

if (dusenler.length) {
  console.log(`\n✓ ${dusenler.length} kayıt tabandan düştü (kaçış eklenmiş) — --taban-yaz ile kayda geçir.`);
}
if (yeniler.length) {
  console.log(`\n✗ TABAN BÜYÜDÜ — ${yeniler.length} yeni korumasız interpolasyon:`);
  for (const y of yeniler.slice(0, 25)) console.log('  ' + y);
  if (yeniler.length > 25) console.log(`  … +${yeniler.length - 25} tane daha`);
  console.log('\nHTML\'e giren her değerin bir kaçış kaydı olmalı: escapeHTML(...) ile sar,');
  console.log('ya da bilinçli istisnaysa satıra /* XSS-MUAF: gerekçe */ yaz.');
  process.exit(1);
}

console.log('\n✓ XSS denetçisi: taban aşılmadı — yeni korumasız interpolasyon yok.');
process.exit(0);
