// WandererWidgetProvider.kt — Android ana ekran widget'ı
// Kurulum: SETUP-WIDGET.md → dosyaları android/app/src/main altına kopyala
// + AndroidManifest.xml'e receiver ekle.
//
// Veri: uygulama (13k-widget-koprusu.js) Capacitor Preferences group
// modunda 'WandererWidget' adlı SharedPreferences dosyasına 'widget'
// anahtarıyla JSON yazar; widget aynı dosyayı okur.

package com.emretransformation.wanderer

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

class WandererWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) updateWidget(context, manager, id)
    }

    companion object {
        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val prefs = context.getSharedPreferences("WandererWidget", Context.MODE_PRIVATE)
            var streak = 0
            var sealed = false
            var soz: String? = null
            var geldin = false
            var gordun = false
            var yaptin = false
            try {
                val raw = prefs.getString("widget", null)
                if (raw != null) {
                    val o = JSONObject(raw)
                    streak = o.optInt("streak", 0)
                    sealed = o.optBoolean("sealedToday", false)
                    soz = o.optString("soz", "").ifBlank { null }
                    geldin = o.optBoolean("geldin", false)
                    gordun = o.optBoolean("gordun", false)
                    yaptin = o.optBoolean("yaptin", false)
                }
            } catch (_: Exception) { /* bozuk veri → varsayılanlar */ }

            val views = RemoteViews(context.packageName, R.layout.wanderer_widget)
            views.setTextViewText(R.id.widget_streak, streak.toString())
            views.setTextViewText(
                R.id.widget_status,
                if (sealed) "✦ bugün mühürlendi" else "bugünü mühürle"
            )
            // Üç Mühür gün durumu — dolu ◆ / boş ◇ (RemoteViews tek-renk sınırı)
            views.setTextViewText(
                R.id.widget_muhurler,
                "${if (geldin) "◆" else "◇"} GELDİN   ${if (gordun) "◆" else "◇"} GÖRDÜN   ${if (yaptin) "◆" else "◇"} YAPTIN"
            )
            views.setTextViewText(R.id.widget_soz, soz?.let { "“$it”" } ?: "")

            // Tıklama → uygulamayı aç
            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launch != null) {
                val pi = PendingIntent.getActivity(
                    context, 0, launch,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pi)
            }

            manager.updateAppWidget(widgetId, views)
        }
    }
}
