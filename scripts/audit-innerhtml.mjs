#!/usr/bin/env node
/**
 * Audit script — js/parts/*.js içindeki tüm `el.innerHTML = ...` çağrılarını
 * kategorize eder. XSS yüzeyini belirler ve codemod takip listesi üretir.
 *
 * Kategoriler:
 *   - SAFE: statik template literal, kullanıcı/LLM data yok
 *   - ESCAPED: escapeHTML(x) ile sanitize edilmiş
 *   - SANITIZED: sanitizeMarkdown / safeMarkdownHTML / DOMPurify çağrısı içinde
 *   - RISKY: yukarıdakilerden hiçbiri değil — manual review gerek
 *
 * Kullanım: node scripts/audit-innerhtml.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PARTS_DIR = join(process.cwd(), 'js', 'parts');

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (f.endsWith('.js')) out.push(full);
  }
  return out;
}

const stats = { safe: 0, escaped: 0, sanitized: 0, risky: 0, total: 0 };
const risky = [];

for (const file of walk(PARTS_DIR)) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/\.innerHTML\s*=\s*(.+)/);
    if (!m) continue;
    stats.total++;
    const rhs = m[1];
    const context = lines.slice(Math.max(0, i - 2), i + 3).join('\n');

    if (/sanitize(Markdown)?|safeMarkdownHTML|DOMPurify\.sanitize|setHTML/.test(context)) {
      stats.sanitized++;
    } else if (/escapeHTML\(/.test(context)) {
      stats.escaped++;
    } else if (/^['"`][^${]*['"`]\s*;?\s*$/.test(rhs.trim()) || /^['"`]/.test(rhs.trim()) && !rhs.includes('${')) {
      stats.safe++;
    } else {
      stats.risky++;
      risky.push({ file: file.replace(process.cwd() + '/', ''), line: i + 1, code: line.trim().slice(0, 120) });
    }
  }
}

console.log('innerHTML Audit Report');
console.log('────────────────────────────');
console.log(`Total:      ${stats.total}`);
console.log(`Safe:       ${stats.safe}   (static template — no user data)`);
console.log(`Escaped:    ${stats.escaped}   (escapeHTML helper'lı)`);
console.log(`Sanitized:  ${stats.sanitized}   (DOMPurify/sanitizeMarkdown'dan geçer)`);
console.log(`Risky:      ${stats.risky}   (manual review gerek)`);
console.log();

if (risky.length) {
  console.log('Risky locations:');
  for (const r of risky.slice(0, 30)) {
    console.log(`  ${r.file}:${r.line}`);
    console.log(`    ${r.code}`);
  }
  if (risky.length > 30) console.log(`  ... +${risky.length - 30} more`);
}

const xssRiskRatio = (stats.risky / stats.total * 100).toFixed(1);
console.log(`\nXSS risk ratio: ${xssRiskRatio}% (target: < 5%)`);
process.exit(stats.risky > 30 ? 1 : 0);
