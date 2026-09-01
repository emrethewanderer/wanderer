#!/usr/bin/env node
/**
 * Kitap Bilgesi (Geçiş Motoru FAZ 5) — iki kitabın PDF metnini mevcut
 * "Bilgi Tabanı" şemasına (knowledge_base/knowledge_chunks) embed eder.
 *
 * NEDEN bu script gerekiyor: sohbetin RAG tetikleyicisi (buildSmartRagQuery,
 * 01-prompts-modes.js) ve sunucunun embed+match+kaynakça-gösterme akışı
 * (llm-chat Edge Function, runRAG) ZATEN TAM ÇALIŞIYOR — knowledge_chunks
 * tablosu production'da var (bkz. migrations/034_epizodik_hafiza.sql:3
 * yorumu). Eksik olan tek şey VERİ: iki kitabın metni hiç embed edilmemiş.
 * Bu script admin panelinin "Bilgi Tabanı" özelliğinin (07-settings-
 * knowledge.js saveKnowledge) YAPTIĞI işi toplu ve otomatik yapar — YENİ
 * bir tablo/RPC/Edge Function icat etmez, AYNI şemayı kullanır.
 *
 * ELLE çalıştırılır (embedding API maliyeti + süresi nedeniyle otomatik
 * değil; ~500 sayfa ~1000+ embedding çağrısı demek, dakikalarca sürer):
 *
 *   npm install pdf-parse
 *   SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   LLM_API_KEY=... \
 *   node scripts/embed-kitaplar.mjs \
 *     "/path/Wanderer İlişki Felsefesi.pdf" "Wanderer İlişki Felsefesi" \
 *     "/path/Zihniyet Devrimi'ne Çağrı.pdf" "Zihniyet Devrimi'ne Çağrı"
 *
 * Şema (07-settings-knowledge.js'in KANITLADIĞI kolonlar — book/section
 * gibi TAHMİNİ kolonlar eklenmedi; llm-chat'in runRAG'ı bunlar yoksa zaten
 * 'Mesele Sensin' fallback'ine düşüyor, kırılma yok):
 *   knowledge_base(id, title, content, created_at)
 *   knowledge_chunks(id, knowledge_id, chunk_text, embedding)
 *
 * Yeniden çalıştırma: idempotent DEĞİL — aynı kitabı iki kez verirsen
 * knowledge_base'de duplike kayıt oluşur. Önce Supabase'den eski kaydı
 * (knowledge_base + ilişkili knowledge_chunks) sil, sonra tekrar çalıştır.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LLM_API_KEY   = process.env.LLM_API_KEY;
const LLMAPI_BASE   = 'https://api.llmapi.ai';
const EMBED_MODEL   = 'text-embedding-3-small'; // llm-chat'in runRAG'ıyla AYNI model
const CHUNK_MAX     = 800;   // 07-settings-knowledge.js chunkText ile AYNI hedef
const CONTENT_CAP   = 100000; // knowledge_base.content'e yazılacak üst sınır (güvenlik payı)
const THROTTLE_MS   = 150;   // embedding API'ye nezaket aralığı

if (!SUPABASE_URL || !SERVICE_KEY || !LLM_API_KEY) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LLM_API_KEY env değişkenleri gerekli.');
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.length || args.length % 2 !== 0) {
  console.error('Kullanım: node scripts/embed-kitaplar.mjs <pdf1> <başlık1> [<pdf2> <başlık2> ...]');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

/* 07-settings-knowledge.js chunkText() ile AYNI mantık (Node.js karşılığı) —
   iki kaynak birbirinden BAĞIMSIZ kalsın diye kasıtlı olarak kopyalandı,
   import edilmedi (bu dosya tarayıcı-DOM bağımlılıkları taşıyor). */
function chunkText(text, maxChars = CHUNK_MAX) {
  const paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const para of paragraphs) {
    if (para.length > maxChars) {
      if (current) { chunks.push(current.trim()); current = ''; }
      const sents = para.match(/[^.!?\n]+[.!?]*/g) || [para];
      for (const s of sents) {
        const trimmed = s.trim();
        if (!trimmed) continue;
        if ((current + ' ' + trimmed).trim().length > maxChars && current) {
          chunks.push(current.trim()); current = trimmed;
        } else {
          current = current ? current + ' ' + trimmed : trimmed;
        }
      }
    } else if ((current + '\n\n' + para).trim().length > maxChars && current) {
      chunks.push(current.trim()); current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.trim()];
}

async function getEmbedding(text) {
  const res = await fetch(`${LLMAPI_BASE}/v1/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${LLM_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`Embedding API hatası (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!embedding) throw new Error('Embedding yanıtı geçersiz: ' + JSON.stringify(data).slice(0, 200));
  return embedding;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function embedBook(pdfPath, title) {
  let pdfParse;
  try {
    ({ default: pdfParse } = await import('pdf-parse'));
  } catch (_) {
    console.error('pdf-parse kurulu değil — önce çalıştır: npm install pdf-parse');
    process.exit(1);
  }

  console.log(`\n=== ${title} ===`);
  const buf = readFileSync(pdfPath);
  const { text } = await pdfParse(buf);
  const chunks = chunkText(text);
  console.log(`${chunks.length} parçaya bölündü (kaynak: ${text.length} karakter).`);

  const { data: kbRows, error: kbErr } = await supabase
    .from('knowledge_base')
    .insert([{ title, content: text.slice(0, CONTENT_CAP) }])
    .select();
  if (kbErr) throw new Error(`knowledge_base insert hatası: ${kbErr.message}`);
  const knowledgeId = kbRows[0].id;

  let done = 0, failed = 0;
  for (const chunk of chunks) {
    try {
      const embedding = await getEmbedding(chunk);
      const { error: chunkErr } = await supabase.from('knowledge_chunks').insert([{
        knowledge_id: knowledgeId,
        chunk_text: chunk,
        embedding: JSON.stringify(embedding),
      }]);
      if (chunkErr) throw new Error(chunkErr.message);
      done++;
    } catch (e) {
      failed++;
      console.warn(`  parça ${done + failed}/${chunks.length} başarısız: ${e.message}`);
    }
    if ((done + failed) % 10 === 0) console.log(`  ${done + failed}/${chunks.length}...`);
    await sleep(THROTTLE_MS);
  }
  console.log(`${title}: ${done} parça embed edildi, ${failed} başarısız.`);
}

for (let i = 0; i < args.length; i += 2) {
  await embedBook(args[i], args[i + 1]);
}
console.log('\nTamamlandı.');
