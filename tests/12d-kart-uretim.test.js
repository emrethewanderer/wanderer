import { describe, it, expect, beforeAll } from 'vitest';
import { kumHeuristicSpec } from '../js/parts/12d-kart-uretim.js';
import { ikvNormSpec, IKV_MOTIF_KEYS } from '../js/parts/12c-kart-gorsel.js';
import { getFullDeck, deckReady } from '../js/parts/12b-kart-destesi.js';

// Deste içeriği sidecar'da (12b2) — test ortamında ESM fallback ile hidrate et.
beforeAll(() => deckReady());

describe('kumHeuristicSpec', () => {
  it('is deterministic for the same seed', () => {
    const input = { seed: 'kart-1', virtue: 'sebat', texts: ['bir dağ yolunda yürüyen'] };
    const a = kumHeuristicSpec(input);
    const b = kumHeuristicSpec(input);
    expect(a).toEqual(b);
  });

  it('produces a normalized, schema-valid spec even with empty input', () => {
    const spec = kumHeuristicSpec({ seed: 'empty' });
    expect(spec).toEqual(ikvNormSpec(spec));
    expect(IKV_MOTIF_KEYS.cerceve).toContain(spec.cerceve);
  });

  it('picks keyword-matched motifs from card text over virtue defaults', () => {
    const spec = kumHeuristicSpec({ seed: 'x', virtue: 'sebat', texts: ['elmas gibi değerin', 'köprüden geçti'] });
    expect(spec.nesne.some(n => n.m === 'elmas')).toBe(true);
    expect(spec.orta.some(o => o.m === 'kopru')).toBe(true);
  });

  /* Eskiden "ilk eşleşen kazanır" idi ve "ilk", sözlükteki YAZIM sırasıydı:
     anlam taşımayan bir sıra sonucu belirliyordu. Artık ölçü eşleşmenin
     kendisi — uzun ipucu kısadan özgüldür. */
  it('özgül ipucu, sözlükte önce yazılmış kısa ipucunu yener', () => {
    // "döngü" (spiral, sözlükte önce) vs "adım adım ilerleyen" (taslar, sonra)
    const spec = kumHeuristicSpec({ seed: 'oz1', texts: ['bir döngü içindeyim ama adım adım ilerleyen biriyim'] });
    expect(spec.yol).toBe('taslar');
  });

  it('çok ipucu tek ipucunu yener', () => {
    // kase: 'bereket' + 'taşan' iki eşleşme; kalp: yalnız 'kalbi'
    const spec = kumHeuristicSpec({ seed: 'oz2', texts: ['kalbi bereket dolu, taşan bir hayat'] });
    expect(spec.nesne[0].m).toBe('kase');
  });

  it('özgüllük sıralaması determinizmi bozmaz', () => {
    const input = { seed: 'oz3', texts: ['kısır döngü, kapıda bekleyiş, tırmanış'] };
    expect(kumHeuristicSpec(input)).toEqual(kumHeuristicSpec(input));
  });

  it('varies scenes across different seeds within the same virtue pool', () => {
    const specs = Array.from({ length: 8 }, (_, i) => kumHeuristicSpec({ seed: 'seed-' + i, virtue: 'ozguven', texts: [] }));
    const serialized = specs.map(s => JSON.stringify(s));
    expect(new Set(serialized).size).toBeGreaterThan(1);
  });
});

describe('getFullDeck sahne integration', () => {
  it('assigns a valid scene spec to every card', () => {
    const deck = getFullDeck();
    expect(deck.length).toBeGreaterThan(0);
    for (const c of deck) {
      expect(c.sahne, `card ${c.id} missing sahne`).toBeTruthy();
      expect(c.sahne).toEqual(ikvNormSpec(c.sahne));
    }
  });

  it('gives most cards visually distinct scenes', () => {
    const deck = getFullDeck();
    const serialized = new Set(deck.map(c => JSON.stringify(c.sahne)));
    // Deste tek bir motif havuzuna sıkışmamalı — çoğunluk benzersiz olmalı.
    expect(serialized.size).toBeGreaterThan(deck.length * 0.5);
  });
});

/* Yayınlanan on iki kartın sahnesi 2026-08-07'de ELLE bestelendi: görsel
   artık bir kelime taramasının sonucu değil, kartın metninden okunmuş bir
   karar. Motor yerinde duruyor ama yalnız BOŞLUĞU dolduruyor — deste
   büyüdüğünde yeni kart hiçbir an sahnesiz kalmaz. */
describe('elle bestelenmiş sahne motoru yener', () => {
  it('elle verilen reçete motor tarafından EZİLMEZ', () => {
    const deck = getFullDeck();
    const kok = deck.find(c => c.id === 'temel-ozsevgi-kok');
    // Elle yazılan imgeler: deniz + kalp + kök kademesi ("yatışan bir iç deniz")
    expect(kok.sahne.uzak.map(u => u.m)).toContain('deniz');
    expect(kok.sahne.nesne.map(n => n.m)).toContain('kalp');
    expect(kok.sahne.bitki).toBe('kok');
  });

  it('evrim hattında sahne EVRİLİR — aynı dünya, büyüyen ışık', () => {
    const deck = getFullDeck();
    const [filiz, kok, tac] = ['filiz', 'kok', 'tac'].map(k => deck.find(c => c.id === 'temel-ozsevgi-' + k));
    // bitki kademesi hattı takip eder
    expect([filiz.sahne.bitki, kok.sahne.bitki, tac.sahne.bitki]).toEqual(['filiz', 'kok', 'tac']);
    // gökyüzü açılır: şafak → şafak → güneş; yıldız sayısı artar
    expect(filiz.sahne.gok).toBe('dogan');
    expect(tac.sahne.gok).toBe('gunes');
    expect(tac.sahne.yildiz).toBeGreaterThan(filiz.sahne.yildiz);
    // çerçeve açılır: taşan kap pencereye sığmaz
    expect(filiz.sahne.cerceve).toBe('pencere');
    expect(tac.sahne.cerceve).toBe('acik');
  });

  it('her sahne şemaya normalize edilmiş gelir (elle yazım ham kalmaz)', () => {
    for (const c of getFullDeck()) expect(c.sahne).toEqual(ikvNormSpec(c.sahne));
  });

  it('sahnesiz kart motora düşer ve determinist kalır', () => {
    const a = kumHeuristicSpec({ seed: 'yeni-kart', virtue: 'ozsevgi', texts: ['kâse taşıyor'] });
    const b = kumHeuristicSpec({ seed: 'yeni-kart', virtue: 'ozsevgi', texts: ['kâse taşıyor'] });
    expect(a).toEqual(b);
    expect(a).toEqual(ikvNormSpec(a));
  });
});

/* Alfabe Işık kart SAHNESİNDEN çekildi (2026-08-07). Kartın görseli yalnız
   kartın kendi metninden doğar; kullanıcının başka bir odada yazdığı nişan
   sahneye sızmaz. Bu blok o kararın regresyon kapısıdır — nişanların geri
   sızması sessizce değil, kırmızı testle olur. (Işık kendi salonunda, kapı
   kazımasında ve kart SIRTINDA yaşamayı sürdürür: tests/10o-fgate-etch.js,
   tests/12e-isik-faz3.js.) */
describe('Alfabe Işık kart sahnesinden çekildi', () => {
  it('motif kütüphanesinde nisan_ önekli hiçbir anahtar kalmadı', () => {
    for (const alan of Object.keys(IKV_MOTIF_KEYS)) {
      const kacak = (IKV_MOTIF_KEYS[alan] || []).filter(k => String(k).startsWith('nisan_'));
      expect(kacak, `${alan} alanında nişan kaçağı`).toEqual([]);
    }
  });

  it('fısıltı temalı metin artık nişan imi değil, kendi imgesini seçer', () => {
    const spec = kumHeuristicSpec({ seed: 'w1', texts: ['zaman yok, hep geç kalıyorum, acele içindeyim'] });
    expect(spec.nesne.every(n => !n.m.startsWith('nisan_'))).toBe(true);
    expect(spec).toEqual(ikvNormSpec(spec));
  });

  it('nisan girdisi artık sahneyi DEĞİŞTİRMEZ (sessizce yok sayılır)', () => {
    const a = kumHeuristicSpec({ seed: 'n1', texts: ['sıradan bir sabah yürüyüşü'] });
    const b = kumHeuristicSpec({ seed: 'n1', texts: ['sıradan bir sabah yürüyüşü'], nisan: 'tohum' });
    expect(b).toEqual(a);
  });

  // Kayıtlı ESKİ kullanıcı reçeteleri (KV/DB) hâlâ nisan_* taşıyor olabilir;
  // _mList süzgeci bilinmeyen anahtarı ayıkladığı için kart KIRILMADAN,
  // yalnız o nesne olmadan çizilir. Ayrı bir göç katmanı bu yüzden yazılmadı.
  it('kayıtlı eski nişanlı reçete kartı kırmaz, sessizce ayıklanır', () => {
    const n = ikvNormSpec({ nesne: ['nisan_sancak', 'elmas'] });
    expect(n.nesne).toEqual([{ m: 'elmas' }]);
  });
});
