// Supabase Edge Function: reset-user
// Deploy: supabase functions deploy reset-user
//
// "Sıfırdan başla" — hesabı SİLMEDEN, oturumu koruyarak kullanıcının tüm
// kişisel verisini temizler. delete-user'ın ikiz kardeşi:
//   • delete-user → tabloları siler + auth kaydını yok eder (geri dönüş yok)
//   • reset-user  → tabloları siler, auth kaydını + profiles satırını KORUR
//                   (aynı e-posta/şifreyle giriş devam eder; deneme/abonelik
//                    ve admin yetkisi bozulmaz)
//
// profiles satırı silinmez (silinse trigger yeniden yaratmaz, yalnız auth
// INSERT'inde oluşur). Yerine kişisel alanlar (message_count, avatar)
// nötrlenir; ayrıcalıklı sütunlar (is_admin/is_premium/trial_ends_at…) elle
// korunur — service_role olduğu için trigger bunları kilitlemez.
//
// CORS: ALLOWED_ORIGIN ile kısıtlanmalı (production).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

// delete-user ile AYNI liste — kullanıcı_id'li tüm tablolar.
// Yeni kullanıcı tablosu eklenince HER İKİ fonksiyona da eklenmeli.
const USER_TABLES = [
  // Çekirdek (ilk şema — cascade garantisi yok)
  'chat_history',
  'chat_summaries',
  'user_analytics',
  'user_patterns',
  'user_profile',
  'user_tracks',
  'user_manifesto',
  'mood_history',
  'homework',
  'notebook',
  'parts_log',
  'somatic_log',
  'breakthrough_moments',
  'transformation_cards',
  'weekly_reports',
  'onboarding_answers',
  'feedbacks',
  'challenge_progress',
  // Modül tabloları
  'error_logs',
  'suretler',
  'meclis_derinlik',
  'kisi_kartlari',
  'kisi_karti_profile',
  'portre',                // Portrem omurgası (mig 011; 039'da bu adı aldı)
  'benlik_karti',        // eski ad — 039 koşmadıysa (tablo yoksa sessiz geçilir)
  'kimlik_yolculugu',
  'push_subscriptions',
  'user_engagement',
  'notification_log',
  'gecis_kartlarim',     // Geçiş Kartım omurgası (mig 025; 039'da bu adı aldı)
  'benim_kartlarim',      // eski ad — 039 koşmadıysa
  'an_kartlari',          // en eski ad — 027 koşmadıysa
  'oik_kartlari',          // Olmak İstediğin Kişi omurgası (mig 029)
  'ilham_kartlari',        // mig 023
  'paylasilan_kartlar',    // mig 023 — Kişilerin Kişileri paylaşımları
  'paylasim_begenileri',   // mig 023
  'paylasim_yorumlari',    // mig 023
  'paylasim_kayitlari',    // mig 023
  'paylasim_raporlari',    // mig 025 — ⚑ Bildir kayıtları
  'user_letters',          // mig 022 — Kullanıcı Mektubu
  'user_letter_settings',  // mig 022
  'usage_events',          // mig 033 — Kullanım Nabzı segmentleri (Gözlemevi)
  'user_memories',         // mig 034 — Epizodik Hafıza (Tanıyan Ayna FAZ 2)
  // Eski kurulum artıkları (tablo yoksa hata sessizce toplanır)
  'user_settings',
  'messages',
  'sessions',
  'notes',
  'closure_records',
  'knowledge_items',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // İsteyen kullanıcının kim olduğunu doğrula
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: `Bearer ${jwt}` } }
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Service role client — RLS'i aşan toplu silme için
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const errors: { table: string; message: string }[] = [];
  for (const table of USER_TABLES) {
    const { error } = await admin.from(table).delete().eq('user_id', user.id);
    if (error) errors.push({ table, message: error.message });
  }

  // profiles: SİLME — kişisel alanları nötrle, yetki/abonelik sütunlarını koru.
  {
    const { error } = await admin.from('profiles')
      .update({ message_count: 0, avatar: null })
      .eq('id', user.id);
    if (error) errors.push({ table: 'profiles', message: error.message });
  }

  // Storage temizliği — chat-images/{uid}/* ve avatars/avatars/{uid}.*
  try {
    const { data: imgs } = await admin.storage.from('chat-images')
      .list(user.id, { limit: 1000 });
    if (imgs?.length) {
      await admin.storage.from('chat-images')
        .remove(imgs.map((f) => `${user.id}/${f.name}`));
    }
  } catch (e) {
    errors.push({ table: 'storage:chat-images', message: (e as Error)?.message || 'list/remove failed' });
  }
  try {
    const { data: avs } = await admin.storage.from('avatars')
      .list('avatars', { limit: 100, search: user.id });
    if (avs?.length) {
      await admin.storage.from('avatars')
        .remove(avs.map((f) => `avatars/${f.name}`));
    }
  } catch (e) {
    errors.push({ table: 'storage:avatars', message: (e as Error)?.message || 'list/remove failed' });
  }

  // auth kaydı KORUNUR — kullanıcı aynı oturumla devam eder.
  return new Response(JSON.stringify({ ok: true, table_errors: errors }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
