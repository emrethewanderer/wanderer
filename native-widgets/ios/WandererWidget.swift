// WandererWidget.swift — iOS ana ekran widget'ı (WidgetKit)
// Kurulum: SETUP-WIDGET.md → Xcode'da "Widget Extension" target'ı oluştur,
// bu dosyayı target'a kopyala, App Group'u (app + extension) etkinleştir:
//   group.com.emretransformation.wanderer
//
// Veri: uygulama (13k-widget-koprusu.js) App Group UserDefaults'a
// 'widget' anahtarıyla JSON yazar. Capacitor Preferences group modunda
// anahtarlar düz isimle saklanır.

import WidgetKit
import SwiftUI

private let APP_GROUP = "group.com.emretransformation.wanderer"

// ── Veri modeli (13k JSON'unun ikizi) ──
struct WandererData: Decodable {
    var streak: Int = 0
    var sealedToday: Bool = false
    var soz: String? = nil
    var sozCount: Int = 0
    var kept: Int = 0
    var reckoned: Bool = false
    // Üç Mühür gün durumu (10f Yol dili) — opsiyonel: eski JSON'la da çözülür
    var geldin: Bool? = nil
    var gordun: Bool? = nil
    var yaptin: Bool? = nil
    var name: String = "Gezgin"
    var updatedAt: Double = 0
}

func loadWandererData() -> WandererData {
    let defaults = UserDefaults(suiteName: APP_GROUP)
    // Capacitor Preferences: değer String olarak saklanır
    guard let raw = defaults?.string(forKey: "widget"),
          let json = raw.data(using: .utf8),
          let data = try? JSONDecoder().decode(WandererData.self, from: json)
    else { return WandererData() }
    return data
}

// ── Timeline ──
struct WandererEntry: TimelineEntry {
    let date: Date
    let data: WandererData
}

struct WandererProvider: TimelineProvider {
    func placeholder(in context: Context) -> WandererEntry {
        WandererEntry(date: Date(), data: WandererData(streak: 7, sealedToday: true,
            soz: "Bugün kendime bir dost gibi davranacağım.", sozCount: 1, kept: 0,
            reckoned: false, name: "Gezgin", updatedAt: 0))
    }
    func getSnapshot(in context: Context, completion: @escaping (WandererEntry) -> Void) {
        completion(WandererEntry(date: Date(), data: loadWandererData()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WandererEntry>) -> Void) {
        let entry = WandererEntry(date: Date(), data: loadWandererData())
        // Saat başı tazele (uygulama arka plana geçerken de reload tetiklenir)
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// ── Marka renkleri (obsidyen / altın / lapis / bronz) ──
private let obsidian = Color(red: 0.059, green: 0.047, blue: 0.031)
private let gold = Color(red: 0.961, green: 0.651, blue: 0.137)
private let lapis = Color(red: 0.353, green: 0.541, blue: 0.847)
private let bronze = Color(red: 0.788, green: 0.635, blue: 0.294)
private let ivory = Color(red: 0.918, green: 0.886, blue: 0.839)
private let dim = Color(red: 0.584, green: 0.537, blue: 0.478)

// ── Üç Mühür rozeti — GELDİN(altın) / GÖRDÜN(lapis) / YAPTIN(bronz) ──
struct SealBadge: View {
    let label: String
    let done: Bool
    let tint: Color
    var body: some View {
        VStack(spacing: 2) {
            Text(done ? "◆" : "◇")
                .font(.system(size: 11))
                .foregroundColor(done ? tint : dim.opacity(0.6))
            Text(label)
                .font(.system(size: 7, weight: .semibold))
                .tracking(1.2)
                .foregroundColor(done ? tint.opacity(0.9) : dim.opacity(0.7))
        }
    }
}

// ── Görünüm ──
struct WandererWidgetView: View {
    var entry: WandererEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            // Seri halkası + mühür
            VStack(spacing: family == .systemSmall ? 6 : 8) {
                ZStack {
                    Circle()
                        .stroke(gold.opacity(0.22), lineWidth: 5)
                    Circle()
                        .trim(from: 0, to: entry.data.sealedToday ? 1.0 : 0.04)
                        .stroke(gold, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    VStack(spacing: 0) {
                        Text("\(entry.data.streak)")
                            .font(.system(size: family == .systemSmall ? 26 : 30, weight: .bold, design: .serif))
                            .foregroundColor(ivory)
                        Text("GÜN")
                            .font(.system(size: 8, weight: .semibold))
                            .tracking(2)
                            .foregroundColor(dim)
                    }
                }
                .frame(width: family == .systemSmall ? 74 : 84,
                       height: family == .systemSmall ? 74 : 84)

                Text(entry.data.sealedToday ? "✦ bugün mühürlendi" : "bugünü mühürle")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(entry.data.sealedToday ? gold : dim)

                // Üç Mühür — günün üç vuruşu (Yol dili)
                HStack(spacing: family == .systemSmall ? 10 : 16) {
                    SealBadge(label: "GELDİN", done: entry.data.geldin ?? false, tint: gold)
                    SealBadge(label: "GÖRDÜN", done: entry.data.gordun ?? false, tint: lapis)
                    SealBadge(label: "YAPTIN", done: entry.data.yaptin ?? false, tint: bronze)
                }
                .padding(.top, 2)

                if family != .systemSmall, let soz = entry.data.soz, !soz.isEmpty {
                    Text("“\(soz)”")
                        .font(.system(size: 11, design: .serif))
                        .italic()
                        .foregroundColor(ivory.opacity(0.8))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .padding(.horizontal, 12)
                }
            }
            .padding(10)
        }
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [Color(red: 0.055, green: 0.047, blue: 0.075), obsidian],
                startPoint: .top, endPoint: .bottom)
        }
    }
}

// ── Widget tanımı ──
struct WandererWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "WandererWidget", provider: WandererProvider()) { entry in
            WandererWidgetView(entry: entry)
        }
        .configurationDisplayName("Seri Mührü")
        .description("Zincirin ve Günün Mührü — gözünün önünde.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct WandererWidgetBundle: WidgetBundle {
    var body: some Widget {
        WandererWidget()
    }
}
