/**
 * DESTE KESİTİ — mekanik sözleşmesi (2026-08-07 · Emre'nin kararı)
 * ─────────────────────────────────────────────────────────────────────────
 * Deste 112 karttan "en temel" 12'ye indirildi. Kesit rastgele DEĞİL: 10q'nun
 * dört motoru destedeki kart İLİŞKİLERİNDEN beslenir ve hepsi savunmacıdır —
 * malzeme yoksa kod kırılmaz, motor SESSİZCE susar. Sessiz ölüm testle
 * yakalanmaz, bu yüzden burada her motorun malzemesi ayrı ayrı mühürlenir.
 *
 * Emre destede çalışıp ölçeği büyütürken bu dosya kapıdır: kart eklemek
 * serbesttir, bir motoru malzemesiz bırakmak değil.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { deckReady, getFullDeck, getCardById, getDeckStats } from '../js/parts/12b-kart-destesi.js';
import { kkEvrim, kkSentezDurum, kkPanzehir, kkErdemTemsilcisi, kkAltinMi } from '../js/parts/10q-w2-kisi-karti.js';
import { S } from '../js/state.js';

let deck = [];
const GOLGE = new Set(['golge', 'perde', 'tuzak']);

beforeAll(async () => { await deckReady(); deck = getFullDeck(); }, 30000);

describe('kesit — ölçek ve nadirlik dengesi', () => {
  it('yayınlanan kesit tam 12 karttır', () => {
    expect(deck.length).toBe(12);
  });

  /* 112'lik destenin dağılımı 12 kartta erken kullanıcıya yalnız 2 kart
     bırakıyordu (yaygin 2) — tören sönerdi. Yeniden dengelendi. */
  it('nadirlik dağılımı 5 yaygin · 4 nadir · 2 nadide · 1 efsane', () => {
    const st = getDeckStats();
    expect(st.byRarity).toEqual({ yaygin: 5, nadir: 4, nadide: 2, efsane: 1 });
  });

  it('kart id\'leri tekildir ve her kartın reçetesi doludur', () => {
    expect(new Set(deck.map(c => c.id)).size).toBe(deck.length);
    for (const c of deck) {
      expect(c.recipe?.signals?.length, c.id).toBeGreaterThan(0);
      expect(typeof c.recipe.threshold, c.id).toBe('number');
    }
  });
});

describe('EVRİM — iki hat tam kurulu', () => {
  const HATLAR = ['temel-ozsevgi', 'temel-ozsaygi'];

  it('her hattın üç kademesi de destededir', () => {
    for (const hat of HATLAR) {
      for (const kademe of ['filiz', 'kok', 'tac']) {
        expect(getCardById(`${hat}-${kademe}`), `${hat}-${kademe}`).toBeTruthy();
      }
    }
  });

  /* kkEvrim id'den okur; zincirin kopmaması demek, işaret ettiği kartın
     GERÇEKTEN destede olması demektir — sahipsiz bir `sonraki` sessiz kopuştur. */
  it('evrim zinciri kopmaz — her halkanın işaret ettiği kart destededir', () => {
    for (const hat of HATLAR) {
      const filiz = kkEvrim(`${hat}-filiz`);
      expect(filiz.onceki).toBeNull();
      expect(getCardById(filiz.sonraki), filiz.sonraki).toBeTruthy();

      const kok = kkEvrim(`${hat}-kok`);
      expect(getCardById(kok.onceki), kok.onceki).toBeTruthy();
      expect(getCardById(kok.sonraki), kok.sonraki).toBeTruthy();

      const tac = kkEvrim(`${hat}-tac`);
      expect(getCardById(tac.onceki), tac.onceki).toBeTruthy();
      expect(tac.sonraki).toBeNull();
    }
  });
});

describe('SENTEZ — bileşiğin malzemesi destede duruyor', () => {
  it('bileşik kart vardır ve iki erdeminin de temsilcisi bulunur', () => {
    const bilesik = deck.filter(c => c.category === 'bilesik');
    expect(bilesik.length).toBeGreaterThan(0);

    // Tüm desteyi sahipli say: malzeme VARLIĞI sınanıyor, kazanım değil.
    const hepsi = {};
    for (const c of deck) hepsi[c.id] = { earnedAt: 'x', mertebe: 1 };

    for (const b of bilesik) {
      const d = kkSentezDurum(b, hepsi);
      expect(d, b.id).toBeTruthy();
      expect(d.eksikErdemler, `${b.id} → malzemesiz erdem`).toEqual([]);
      expect(d.hazir, b.id).toBe(true);
      // Malzeme başka bir bileşik ya da gölge OLAMAZ (sentez saf tutulur)
      for (const k of [d.kart1, d.kart2]) {
        expect(k.category, k.id).not.toBe('bilesik');
        expect(GOLGE.has(k.category), k.id).toBe(false);
      }
    }
  });
});

describe('PANZEHİR — her gölgenin ışığı destede', () => {
  it('gölge kartları vardır ve her birinin erdeminde bir ışık kartı bulunur', () => {
    const golgeler = deck.filter(c => GOLGE.has(c.category));
    expect(golgeler.length).toBeGreaterThan(0);

    const hepsi = {};
    for (const c of deck) hepsi[c.id] = { earnedAt: 'x', mertebe: 1 };

    for (const g of golgeler) {
      const pz = kkPanzehir(g, hepsi);
      expect(pz, g.id).not.toBeNull();
      expect(pz.erdem, g.id).toBeTruthy();
      expect(pz.acik, `${g.id} → panzehir ışığı destede yok`).toBe(true);
      expect(GOLGE.has(pz.kart.category), pz.kart.id).toBe(false);
    }
  });
});

describe('ALTIN KART — nişanenin taşıyıcısı', () => {
  it('en az bir efsane kart vardır ve sahipken canlı çizilir', () => {
    const efsane = deck.filter(c => c.rarity === 'efsane');
    expect(efsane.length).toBeGreaterThan(0);

    S._kisiKarti = { collection: { [efsane[0].id]: { earnedAt: 'x', mertebe: 1 } } };
    expect(kkAltinMi(efsane[0])).toBe(true);
  });
});

describe('ERDEM BÜTÜNLÜĞÜ — kartın kimliği reçetesiyle aynı erdemden', () => {
  /* Yakalanan kırık (2026-08-07): çekirdek kartların `virtue` alanı 12a'dan
     ham geliyordu (niyetli orada 'sebat' der), reçete ise CEKIRDEK_VIRTUE_MAP
     üzerinden başka bir erdemden kuruluyordu. Sentez/panzehir/temsilci motorları
     `card.virtue`ya baktığı için kart kendi erdeminde BULUNAMIYORDU. */
  it('her kartın erdemi, o erdemin temsilcisi aranınca kendini bulur', () => {
    const hepsi = {};
    for (const c of deck) hepsi[c.id] = { earnedAt: 'x', mertebe: 1 };

    for (const c of deck) {
      if (c.category === 'bilesik' || GOLGE.has(c.category)) continue;
      const temsilci = kkErdemTemsilcisi(c.virtue, hepsi);
      expect(temsilci, `${c.id} · ${c.virtue}`).toBeTruthy();
      expect(temsilci.virtue, c.id).toBe(c.virtue);
    }
  });

  it('çekirdek kartlar üç ayrı erdem taşır — omurga tek erdeme çökmez', () => {
    const cekirdek = deck.filter(c => c.category === 'cekirdek');
    expect(cekirdek.length).toBe(3);
    expect(new Set(cekirdek.map(c => c.virtue)).size).toBe(3);
  });
});
