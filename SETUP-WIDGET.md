# SETUP — Ana Ekran Widget'ı (Seri Mührü)

Seri halkası + Günün Mührü, uygulama açılmadan ana ekranda. JS tarafı hazır
(13k-widget-koprusu.js — native'de otomatik veri yazar); native taraf **elle**:

## 0. Ortak

```bash
npm install            # @capacitor/preferences zaten package.json'da
npx cap sync
```

Veri akışı: uygulama → `Preferences` (group modu) → tek JSON (`widget` anahtarı):
`{ streak, sealedToday, soz, sozCount, kept, reckoned, geldin, gordun, yaptin, elmas, name, updatedAt }`

`geldin/gordun/yaptin` = Üç Mühür gün durumu (Yol dili): GELDİN=bugün buradaydın ·
GÖRDÜN=bugün hayaline baktın · YAPTIN=sözünün hesabını verdin ve en az birini tuttun.
Widget'lar bu üçlüyü ◆/◇ mühür sırası olarak gösterir (eski JSON'la geriye uyumlu).

---

## 1. iOS (WidgetKit)

1. Xcode → `ios/App/App.xcworkspace` aç.
2. **File → New → Target → Widget Extension**, ad: `WandererWidget`
   (Include Configuration App Intent: HAYIR).
3. Üretilen şablon dosyaları silip `native-widgets/ios/WandererWidget.swift`
   içeriğini target'a kopyala.
4. **App Group**: hem `App` hem `WandererWidget` target'ında
   Signing & Capabilities → `+ App Groups` →
   `group.com.emretransformation.wanderer` (ikisinde de işaretli).
5. Widget target'ının iOS sürümü ≥ 17.0 yap (containerBackground API).
6. Derle → simülatörde ana ekrana widget ekle ("Seri Mührü").

Not: Uygulama arka plana geçtiğinde veri yazılır; widget saat başı kendini
tazeler. Anında tazeleme istenirse (opsiyonel) `WidgetsBridgePlugin` adlı
community eklentisi eklenebilir — 13k zaten varsa çağırıyor, yoksa sessiz.

## 2. Android (AppWidget)

1. Kopyala:
   - `native-widgets/android/WandererWidgetProvider.kt`
     → `android/app/src/main/java/com/emretransformation/wanderer/`
   - `native-widgets/android/res/layout/wanderer_widget.xml`
     → `android/app/src/main/res/layout/`
   - `native-widgets/android/res/xml/wanderer_widget_info.xml`
     → `android/app/src/main/res/xml/`
2. `android/app/src/main/AndroidManifest.xml` → `<application>` içine:

```xml
<receiver
    android:name=".WandererWidgetProvider"
    android:exported="false">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/wanderer_widget_info" />
</receiver>
```

3. Android Studio'da derle → ana ekrana widget ekle.

Not: Widget, Capacitor Preferences'ın `WandererWidget` adlı SharedPreferences
dosyasını okur (13k group modu bunu ayarlar). Sistem 30 dk'da bir tazeler;
uygulamadan çıkışta veri zaten güncel yazılmış olur.

## 3. Test

1. Uygulamayı native'de aç, bir gün mühürle, arka plana al.
2. Widget'ta seri sayısı + "✦ bugün mühürlendi" + (varsa) günün sözü görünmeli.
3. Görünmüyorsa: iOS'ta App Group id'sini, Android'de SharedPreferences
   dosya adını (`WandererWidget`) kontrol et.
