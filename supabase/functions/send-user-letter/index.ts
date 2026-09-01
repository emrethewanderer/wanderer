// Supabase Edge Function: send-user-letter
// Deploy: supabase functions deploy send-user-letter
//
// "Benim de sana bir mektubum var!" — Studio kullanıcısının Emre'ye AYDA 1 kez
// gönderdiği kişisel mektup. Mektup user_letters tablosuna yazılır (admin paneli
// inbox olarak okur) ve Resend üzerinden user_letter_settings.destination_email
// adresine e-posta olarak iletilir.
//
// Akış (server-side, hiçbir kapı client'a bırakılmaz):
//   1) JWT doğrula
//   2) profiles.is_premium veya is_admin → Studio gate
//   3) user_letters'a bu ay kayıt var mı? (calendar-month, kullanıcının saatine göre değil)
//   4) Gövde uzunluk doğrulaması
//   5) user_letters insert (service_role; RLS yazmayı yalnız bize bırakır)
//   6) destination_email + RESEND_API_KEY varsa e-posta iletisi; sonucu satıra yaz
//   7) JSON yanıt
//
// Env (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY     (opsiyonel — yoksa yalnız DB'ye kaydedilir, admin panelden okunur)
//   RESEND_FROM        (vars. "Wanderer <postaci@wanderer.app>" — Resend doğrulanmış domain)
//   ALLOWED_ORIGIN     (vars. *)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY otomatik mevcut.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const RESEND_FROM    = Deno.env.get('RESEND_FROM') || 'Wanderer <postaci@wanderer.app>';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

// Basit HTML kaçışı (e-posta gövdesinde gösterim için)
function escapeHTML(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function bodyToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map(par => `<p style="margin:0 0 1.2em;font-family:Georgia,serif;font-size:15px;line-height:1.8;color:#222;">${escapeHTML(par.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

async function sendViaResend(to: string, fromUserEmail: string, fromUserName: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const subject = `Wanderer · ${fromUserName || fromUserEmail || 'Gezgin'} sana mektup yazdı`;
  const html = `
    <div style="background:#f7f3ec;padding:24px;font-family:Georgia,serif;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px 28px;border:1px solid #e8e2d4;">
        <div style="font-family:'Cinzel',Georgia,serif;font-size:11px;letter-spacing:4px;color:#b08a3e;text-transform:uppercase;margin-bottom:6px;">Wanderer · Kullanıcı Mektubu</div>
        <div style="font-size:13px;color:#666;margin-bottom:18px;">
          <strong>${escapeHTML(fromUserName || 'Gezgin')}</strong>
          ${fromUserEmail ? `&middot; <a href="mailto:${escapeHTML(fromUserEmail)}" style="color:#b08a3e;text-decoration:none;">${escapeHTML(fromUserEmail)}</a>` : ''}
        </div>
        <hr style="border:0;border-top:1px solid #e8e2d4;margin:0 0 22px;">
        ${bodyToHtml(body)}
      </div>
      <div style="text-align:center;font-size:11px;color:#aaa;margin-top:14px;">— send-user-letter · Wanderer Studio —</div>
    </div>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        html,
        reply_to: fromUserEmail || undefined,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `resend ${res.status}: ${t.slice(0, 240)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'resend network: ' + ((e as Error)?.message || String(e)) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  // ── 1) Auth ──
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'unauthorized' }, 401);
  const { data: { user }, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !user) return json({ error: 'invalid_token' }, 401);

  // ── 2) Studio gate ──
  const { data: prof } = await admin
    .from('profiles')
    .select('is_premium, is_admin, full_name')
    .eq('id', user.id)
    .maybeSingle();
  const isStudio = !!(prof?.is_premium || prof?.is_admin);
  if (!isStudio) {
    return json({ error: 'studio_required', message: 'Bu özellik Wanderer Studio üyelerine açık.' }, 403);
  }

  // ── 3) Aylık limit (calendar-month; UTC değil PG now() — sunucu saatine bağlı) ──
  //     Trigger yerine burada kontrol ediyoruz: tek atomik akış kontrolü daha açık.
  const { data: monthRows, error: monthErr } = await admin
    .from('user_letters')
    .select('id, sent_at')
    .eq('user_id', user.id)
    .gte('sent_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    .limit(1);
  if (monthErr) return json({ error: 'db', message: monthErr.message }, 500);
  if (monthRows && monthRows.length > 0) {
    return json({ error: 'monthly_limit', message: 'Bu ay mektubunu yolladın. Önümüzdeki ay yeniden bir tane yollayabilirsin.' }, 429);
  }

  // ── 4) Body ──
  let payload: { body?: string } = {};
  try { payload = await req.json(); } catch (_) { /* */ }
  const body = (payload.body || '').trim();
  if (body.length < 20) return json({ error: 'too_short', message: 'Mektubun en az 20 karakter olmalı.' }, 400);
  if (body.length > 6000) return json({ error: 'too_long', message: 'Mektup en fazla 6000 karakter olabilir.' }, 400);

  // Kullanıcı snapshot bilgileri
  const userEmail = user.email || '';
  const userName  = prof?.full_name || (user.user_metadata?.full_name as string) || (userEmail ? userEmail.split('@')[0] : '');

  // ── 5) DB insert (service_role; client'lar yazamaz) ──
  const { data: inserted, error: insErr } = await admin
    .from('user_letters')
    .insert({
      user_id: user.id,
      user_email: userEmail || null,
      user_name: userName || null,
      body,
    })
    .select('id')
    .single();
  if (insErr) return json({ error: 'db_insert', message: insErr.message }, 500);

  // ── 6) E-posta iletisi (best-effort; başarısız olursa DB kaydı kalır) ──
  const { data: settings } = await admin
    .from('user_letter_settings')
    .select('destination_email')
    .eq('id', 1)
    .maybeSingle();
  const dest = (settings?.destination_email || '').trim();

  let emailDelivered = false;
  let emailError: string | null = null;
  if (dest && RESEND_API_KEY) {
    const r = await sendViaResend(dest, userEmail, userName, body);
    if (r.ok) emailDelivered = true;
    else emailError = r.error;
  } else if (!dest) {
    emailError = 'destination_email yok (admin panelden yaz)';
  } else if (!RESEND_API_KEY) {
    emailError = 'RESEND_API_KEY yok (yalnız DB)';
  }

  await admin
    .from('user_letters')
    .update({
      sent_email_at: emailDelivered ? new Date().toISOString() : null,
      sent_email_error: emailError,
    })
    .eq('id', inserted.id);

  return json({ ok: true, id: inserted.id, email_delivered: emailDelivered });
});
