/* ═══════════════════════════════════════════════════════════════
   GDPR — Kullanıcı verisi export + hesap silme
   - exportUserData: tüm tablolardan kullanıcı verisini topla, JSON indirsin
   - deleteUserAccount: Supabase Edge Function ile hesabı + verisini sil
═══════════════════════════════════════════════════════════════ */
import { S } from '../state.js';
import { sb, EDGE_FN_BASE } from '../config.js';
import { showToast } from './00a-infrastructure.js';
import { t } from './15-i18n.js';

// Kullanıcı verisi içeren tüm tablolar.
// Yeni tablo eklendiğinde buraya da eklenmeli (GDPR uyumu için kritik).
const USER_TABLES = [
  'user_settings',
  'user_analytics',
  'user_manifesto',
  'user_profile',
  'challenge_progress',
  'knowledge_items',
  'messages',
  'sessions',
  'notes',
  'closure_records',
  // Kimlik Üçgeni (İç Çalışma 07 rev.2 · boşluk E): taşınabilirlik hakkı
  // yalnız sohbeti değil, kullanıcının KİM OLDUĞUNA dair kaydı da kapsar.
  // Bu altı tablo 18 Temmuz'dan beri dışa aktarımın dışındaydı — sessizce,
  // yani en kötü biçimde. Tablo yoksa döngü hatayı `payload.errors`'a yazıp
  // devam eder; eklemek güvenlidir.
  'oik_kartlari',       // olmak istediğin kişi (10D)
  'kimlik_yolculugu',   // olduğun kişinin geçmişi (13l)
  'suretler',           // aradaki parçalar (10p)
  'meclis_derinlik',    // Zayıf→Güçlü kayışının ölçümü (10p)
  'kisi_kartlari',      // kazanılan koleksiyon (10q)
  'portre',             // kendini nasıl tanıdığın (02c)
  // ... gerekirse genişlet
];

/**
 * Kullanıcının tüm verisini Supabase'den çekip JSON olarak indirir.
 * Login olunmuş kullanıcı gerek.
 */
export async function exportUserData() {
  if (!S.currentUser?.id) {
    showToast(t('toast.login_required', 'Önce giriş yap'), true);
    return;
  }

  showToast(t('toast.export_started', 'Verin hazırlanıyor...'));

  const payload = {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    user: {
      id: S.currentUser.id,
      email: S.currentUser.email,
      created_at: S.currentUser.created_at,
      username: S.username || null,
    },
    tables: {},
    errors: []
  };

  // Rızanın KÖKENİ (047 K4/§6.10): "bültene razı" bir yargıdır ve yargının
  // kanıtı olmak zorundadır — hangi metni, ne zaman, hangi yolla kabul etti.
  // S.bultenIzin girişte donmuş olabilir; dışa aktarım satırdan TAZE okur.
  try {
    const { data: profRow, error: profErr } = await sb
      .from('profiles')
      .select('bulten_izin, bulten_izin_at, bulten_izin_kaynak, bulten_izin_surum')
      .eq('id', S.currentUser.id)
      .maybeSingle();
    if (profErr) {
      payload.errors.push({ table: 'profiles', message: profErr.message });
    } else if (profRow) {
      payload.user.bulten_izin        = profRow.bulten_izin === true;
      payload.user.bulten_izin_at     = profRow.bulten_izin_at || null;
      payload.user.bulten_izin_kaynak = profRow.bulten_izin_kaynak || null;
      payload.user.bulten_izin_surum  = profRow.bulten_izin_surum || null;
    }
  } catch (e) {
    payload.errors.push({ table: 'profiles', message: e.message || String(e) });
  }

  for (const table of USER_TABLES) {
    try {
      const { data, error } = await sb.from(table).select('*').eq('user_id', S.currentUser.id);
      if (error) {
        payload.errors.push({ table, message: error.message });
        continue;
      }
      payload.tables[table] = data || [];
    } catch (e) {
      payload.errors.push({ table, message: e.message || String(e) });
    }
  }

  // Cihaz-yerel katman (İç Çalışma 07 rev.2 · boşluk E): Kimlik Motoru'nun
  // olay defteri ve Geçiş Okuması ses kayıtları GİZLİLİK GEREĞİ sunucuya
  // hiç çıkmaz — bu bilinçli bir tercihtir. Ama sessizce eksik bir dosya
  // vermek dürüstlük değildir: dışa aktarım neyin dışarıda kaldığını SÖYLER.
  // Ses kaydının kendisi (blob) JSON'a gömülmez — dosyayı megabaytlarca
  // base64 ile şişirir; yerine kaydın VARLIĞI ve süresi yazılır.
  try {
    // Defter localStorage'dan DEĞİL state'ten okunur: 13l SafeStorage
    // kullanır ve SafeStorage yazdığını Supabase KV'ye de taşır — ham
    // anahtarı JSON.parse etmek o sarmalayıcıya bel bağlamak olur.
    // `S._kimlik` post-auth hidrasyondan sonra zaten dolu ve tek gerçektir.
    const _im = S._kimlik || null;
    payload.local_only = {
      not: 'Bu iki katman yalnız bu cihazda tutulur; sunucuya hiç gönderilmez.',
      kimlik_olay_defteri:    Array.isArray(_im && _im.ledger)         ? _im.ledger         : [],
      kimlik_persona_gecmisi: Array.isArray(_im && _im.personaHistory) ? _im.personaHistory : [],
      ses_kayitlari: 'Geçiş Okuması ses kayıtları bu cihazın IndexedDB’sindedir ve bu dosyaya dahil değildir.',
    };
  } catch (e) {
    payload.errors.push({ table: 'local_only', message: e.message || String(e) });
  }

  // Tarayıcıda indir
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wanderer-export-${S.currentUser.id.slice(0, 8)}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  showToast(t('toast.export_done', 'Verin indirildi.'));
}

/**
 * Hesabı kalıcı olarak siler. Edge Function üzerinden auth.deleteUser çağrılır
 * çünkü browser'dan başka kullanıcıyı silmek mümkün değildir (admin privilege).
 *
 * Edge Function şablonu: supabase/functions/delete-user/index.ts
 */
export async function deleteUserAccount(confirmText) {
  if (!S.currentUser?.id) {
    showToast(t('toast.login_required', 'Önce giriş yap'), true);
    return;
  }

  const _delKw = t('gdpr.delete_keyword', 'SİL');
  if (confirmText !== _delKw) {
    showToast(t('toast.delete_confirm_required', '"{kw}" yazarak onaylayın').replace('{kw}', _delKw), true);
    return;
  }

  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.access_token) throw new Error('Oturum bulunamadı');

    const res = await fetch(`${EDGE_FN_BASE}/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ user_id: S.currentUser.id })
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${body}`);
    }

    showToast(t('toast.account_deleted', 'Hesabın silindi. Görüşmek üzere.'));
    setTimeout(async () => {
      await sb.auth.signOut();
      window.location.reload();
    }, 2000);
  } catch (e) {
    showToast(t('toast.delete_failed', 'Hesap silinemedi: ') + (e.message || e), true);
  }
}

/**
 * "Sıfırdan başla" — hesabı SİLMEDEN tüm kişisel veriyi temizler.
 * Sunucu tarafı (reset-user edge fn) tabloları + storage'ı süpürür ama auth
 * kaydını ve profiles satırını (deneme/abonelik/admin) korur. Ardından bu
 * istemci, yerel önbelleği (etw_* localStorage + IndexedDB) temizler ve
 * sayfayı yeniler — oturum aynı kalır, uygulama yeni hesap gibi açılır
 * (Portre onboarding'i baştan tetiklenir).
 */
export async function resetUserData(confirmText) {
  if (!S.currentUser?.id) {
    showToast(t('toast.login_required', 'Önce giriş yap'), true);
    return;
  }

  const _resetKw = t('gdpr.reset_keyword', 'SIFIRLA');
  if (confirmText !== _resetKw) {
    showToast(t('toast.reset_confirm_required', '"{kw}" yazarak onaylayın').replace('{kw}', _resetKw), true);
    return;
  }

  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.access_token) throw new Error('Oturum bulunamadı');

    showToast(t('toast.reset_started', 'Verin sıfırlanıyor...'));

    const res = await fetch(`${EDGE_FN_BASE}/reset-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ user_id: S.currentUser.id })
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${body}`);
    }

    // Yerel önbelleği temizle: tüm etw_* anahtarları (dil tercihi hariç) +
    // IndexedDB veritabanı (00b-indexeddb.js: 'etw-idb-v1').
    _clearLocalUserState();

    showToast(t('toast.reset_done', 'Hesabın sıfırlandı. Sıfırdan başlıyoruz.'));
    setTimeout(() => { window.location.reload(); }, 1600);
  } catch (e) {
    showToast(t('toast.reset_failed', 'Sıfırlama başarısız: ') + (e.message || e), true);
  }
}

/** Tüm yerel kullanıcı durumunu siler (dil tercihi korunur). */
function _clearLocalUserState() {
  try {
    const drop = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      // etw_* uygulama anahtarları — dil tercihini (etw_lang) koru.
      if (k && k.startsWith('etw_') && k !== 'etw_lang') drop.push(k);
    }
    drop.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
  } catch (_) {}
  // IndexedDB önbelleği (chat/özet/yolculuk/ses kayıtları) — tümünü düşür.
  try { indexedDB.deleteDatabase('etw-idb-v1'); } catch (_) {}
}

/**
 * Settings ekranına GDPR butonlarını dinamik olarak ekler.
 * 07-settings-knowledge.js'in loadSettings() fonksiyonu çağırır.
 * Halihazırda mounted ise no-op.
 */
export function mountGdprUI() {
  const settingsContainer =
    document.getElementById('settings-form') ||
    document.querySelector('#settings-view .settings-content') ||
    document.querySelector('#settings-view');
  if (!settingsContainer) return;
  if (document.getElementById('gdpr-section')) return; // zaten mounted

  const section = document.createElement('div');
  section.id = 'gdpr-section';
  section.style.cssText = 'margin-top:32px;padding-top:24px;border-top:1px solid var(--border);';
  section.innerHTML = `
    <div class="doc-eyebrow">${t('gdpr.heading', 'Verim & Hesabım')}</div>
    <p class="doc-lead" style="margin-bottom:16px;">
      ${t('gdpr.desc', 'Tüm kayıtlı veriyi JSON olarak indirebilir, hesabını sıfırdan başlatabilir veya kalıcı olarak silebilirsin (GDPR).')}
    </p>
    <button type="button" id="gdpr-export-btn"
      class="btn-outline-gold" style="width:100%;margin-bottom:12px;padding:12px;">
      ${t('gdpr.export_btn', '↓ Verimi İndir (JSON)')}
    </button>
    <button type="button" id="gdpr-reset-btn"
      style="width:100%;margin-bottom:8px;padding:12px;background:none;border:1px solid var(--gold, #B8953C);
             color:var(--gold, #B8953C);font-size:12px;letter-spacing:2px;cursor:pointer;border-radius:4px;">
      ${t('gdpr.reset_btn', '↺ Sıfırdan Başla')}
    </button>
    <div class="doc-note doc-note--gold" style="margin-bottom:16px;">
      ${t('gdpr.reset_desc', 'Hakkındaki tüm bilgi ve kayıtlar silinir; aynı hesapla yeni bir kullanıcı gibi sıfırdan devam edersin.')}
    </div>
    <button type="button" id="gdpr-delete-btn"
      style="width:100%;padding:12px;background:none;border:1px solid var(--red, #C0392B);
             color:var(--red, #C0392B);font-size:12px;letter-spacing:2px;cursor:pointer;border-radius:4px;">
      ${t('gdpr.delete_btn', '✕ Hesabımı Kalıcı Olarak Sil')}
    </button>
  `;
  settingsContainer.appendChild(section);

  document.getElementById('gdpr-export-btn').addEventListener('click', exportUserData);
  document.getElementById('gdpr-reset-btn').addEventListener('click', () => {
    const txt = prompt(t('gdpr.reset_prompt', 'Hakkındaki tüm kayıtlar silinecek ve sıfırdan başlayacaksın (hesabın açık kalır).\n\nOnaylamak için "{kw}" yaz:').replace('{kw}', t('gdpr.reset_keyword', 'SIFIRLA')));
    if (txt !== null) resetUserData(txt);
  });
  document.getElementById('gdpr-delete-btn').addEventListener('click', () => {
    const txt = prompt(t('gdpr.delete_prompt', 'Hesabını silmek için "{kw}" yaz (geri alınamaz):').replace('{kw}', t('gdpr.delete_keyword', 'SİL')));
    if (txt !== null) deleteUserAccount(txt);
  });
}
