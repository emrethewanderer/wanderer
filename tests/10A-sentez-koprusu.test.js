// Sentez köprüsü (10A) — Atölye kutbu, iki toplamın anladığı dile çevrilir.
//   gkPoleAsCard : kategori eşlemesi (duygular→hisler) + {text}→string + id
//   gkPoleAsCardRef / gkRefResolve : `gk_<id>_<which>` çözümü
// Bu köprü olmadan Atölye kartı KİŞİLERİM'de görünür ama Portre'ye/OİK
// kartına akmaz — deste birleşmiş, kan dolaşımı bağlanmamış olurdu.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  gkPoleAsCard, gkPoleAsCardRef, gkRefResolve, _feedSentez, _graduateSentez, _releaseSentez,
} from '../js/parts/10A-gecis-karti.js';
import { S } from '../js/state.js';

const madde = (text) => ({ text, src: 'llm', at: '2026-07-27T10:00:00.000Z' });

const kart = (over = {}) => ({
  id: 'k1',
  ihtiyac: 'Öfkemi tutamıyorum',
  source: 'bugun',
  golden: {
    baslik: 'Öfkesine Kapılan', whisper: 'kıvılcım anında',
    dusunceler: [madde('Haksızlığa uğradım')],
    inanclar: [madde('Sesimi yükseltmezsem duyulmam')],
    duygular: [madde('Göğsümde basınç')],
    davranislar: [madde('Sesimi yükseltiyorum')],
  },
  lapis: {
    baslik: 'Sükûnetle Duran', whisper: 'fırtınada sabit',
    dusunceler: [madde('Cevap vermemek de bir cevaptır')],
    inanclar: [madde('Sükûnet güçtür')],
    duygular: [madde('Genişleyen bir sakinlik')],
    davranislar: [madde('Üç nefes alıp konuşuyorum')],
  },
  strikes: { gordun: false, yurudun: false, oldum: false },
  state: 'active',
  created_at: '2026-07-27T10:00:00.000Z',
  updated_at: '2026-07-27T10:00:00.000Z',
  sealed_at: null,
});

beforeEach(() => {
  S._gecisKartlari = [kart()];
  S._gecisKartiAktif = 'k1';
});

describe('gkPoleAsCard — kutup, absorb sözleşmesine çevrilir', () => {
  it('duygular → hisler eşlenir (absorb ABSORB_MAP ile aynı dil)', () => {
    const c = gkPoleAsCard('k1', 'golden');
    expect(c.hisler).toEqual(['Göğsümde basınç']);
    expect(c.duygular).toBeUndefined();     // eski ad taşınmaz
  });

  it('{text,src,at} nesneleri düz string olur (portreye [object Object] yazılmaz)', () => {
    const c = gkPoleAsCard('k1', 'lapis');
    c.dusunceler.concat(c.inanclar, c.hisler, c.davranislar).forEach(v => {
      expect(typeof v).toBe('string');
      expect(v).not.toContain('object');
    });
  });

  it('id deste elemanıyla AYNI biçimde: gk_<id>_<which>', () => {
    expect(gkPoleAsCard('k1', 'golden').id).toBe('gk_k1_golden');
    expect(gkPoleAsCard('k1', 'lapis').id).toBe('gk_k1_lapis');
  });

  it('kutup adı kartın adı olur', () => {
    expect(gkPoleAsCard('k1', 'lapis').name).toBe('Sükûnetle Duran');
  });

  it('bilinmeyen kart null döner (çağıran guard eder)', () => {
    expect(gkPoleAsCard('yok', 'golden')).toBeNull();
  });

  it('boş/kısa maddeler elenir — absorb minimum uzunluk bekler', () => {
    S._gecisKartlari = [kart()];
    S._gecisKartlari[0].golden.dusunceler = [madde('a'), madde(''), madde('Gerçek bir madde')];
    expect(gkPoleAsCard('k1', 'golden').dusunceler).toEqual(['Gerçek bir madde']);
  });

  it('ham string dizisi de kabul edilir (şema evrilirse kırılmaz)', () => {
    S._gecisKartlari = [kart()];
    S._gecisKartlari[0].lapis.inanclar = ['Düz string madde'];
    expect(gkPoleAsCard('k1', 'lapis').inanclar).toEqual(['Düz string madde']);
  });
});

describe('gkPoleAsCardRef — kuyruk drenajının çözücüsü', () => {
  it('ref biçimini çözer', () => {
    expect(gkPoleAsCardRef('gk_k1_lapis').id).toBe('gk_k1_lapis');
  });

  it('katalog id\'si verilirse null döner — çağıran getCardById\'ye düşer', () => {
    expect(gkPoleAsCardRef('gercek-bireysel-ozsaygi')).toBeNull();
  });
});

describe('gkRefResolve — Benlik Yapısı düğümü', () => {
  it('kutup yüzü döner ve _gk izini taşır', () => {
    const r = gkRefResolve('gk_k1_golden');
    expect(r.name).toBe('Öfkesine Kapılan');
    expect(r._gk).toEqual({ kartId: 'k1', which: 'golden', mezun: false });
  });

  it('mezun kartın lapis kutbu ALTIN erdemle döner (artık o kişi)', () => {
    S._gecisKartlari[0].state = 'completed';
    const r = gkRefResolve('gk_k1_lapis');
    expect(r._gk.mezun).toBe(true);
    expect(r.virtue).toBe('yansima');
  });

  it('yürünen geçişin lapis kutbu LAPİS erdemle döner', () => {
    expect(gkRefResolve('gk_k1_lapis').virtue).toBe('odak');
  });

  it('geçersiz ref null döner', () => {
    expect(gkRefResolve('portre-olunan')).toBeNull();
    expect(gkRefResolve('')).toBeNull();
    expect(gkRefResolve(null)).toBeNull();
  });
});

describe('_feedSentez — doğan kart iki toplama birden akar', () => {
  beforeEach(() => {
    window.porAbsorbCard = vi.fn();
    window.oikAbsorbCard = vi.fn();
    window.oikReleaseCard = vi.fn();
  });
  afterEach(() => {
    delete window.porAbsorbCard;
    delete window.oikAbsorbCard;
    delete window.oikReleaseCard;
  });

  it('LAPİS kutup "Niyet Alınan"a, ALTIN kutup "Olunan"a işlenir', () => {
    _feedSentez(S._gecisKartlari[0]);
    expect(window.oikAbsorbCard).toHaveBeenCalledTimes(1);
    expect(window.porAbsorbCard).toHaveBeenCalledTimes(1);
    expect(window.oikAbsorbCard.mock.calls[0][0].id).toBe('gk_k1_lapis');
    expect(window.porAbsorbCard.mock.calls[0][0].id).toBe('gk_k1_golden');
  });

  it('altın beslemede sentez ERTELENMEZ — silent bayrağı geçilmez', () => {
    _feedSentez(S._gecisKartlari[0]);
    expect(window.porAbsorbCard.mock.calls[0][1]).toBeUndefined();
  });

  it('bir kutup patlarsa diğeri yine akar (asla bloklama)', () => {
    window.oikAbsorbCard = vi.fn(() => { throw new Error('oik yok'); });
    expect(() => _feedSentez(S._gecisKartlari[0])).not.toThrow();
    expect(window.porAbsorbCard).toHaveBeenCalledTimes(1);
  });

  it('kartsız çağrı sessizce düşer', () => {
    expect(() => _feedSentez(null)).not.toThrow();
    expect(window.porAbsorbCard).not.toHaveBeenCalled();
  });
});

describe('_graduateSentez — hedef olunmuşa dönüşür', () => {
  const sira = [];
  beforeEach(() => {
    sira.length = 0;
    window.porAbsorbCard = vi.fn(() => { sira.push('absorb'); });
    window.oikReleaseCard = vi.fn(() => { sira.push('release'); });
  });
  afterEach(() => {
    delete window.porAbsorbCard;
    delete window.oikReleaseCard;
  });

  it('lapis kutup Portre\'ye işlenir ve hedeften çekilir', () => {
    _graduateSentez(S._gecisKartlari[0]);
    expect(window.porAbsorbCard.mock.calls[0][0].id).toBe('gk_k1_lapis');
    expect(window.oikReleaseCard).toHaveBeenCalledWith('gk_k1_lapis');
  });

  it('SIRA kritik: önce absorb, sonra release (iz bir an bile boş kalmaz)', () => {
    _graduateSentez(S._gecisKartlari[0]);
    expect(sira).toEqual(['absorb', 'release']);
  });

  it('absorb patlasa bile hedef mührü düşer', () => {
    window.porAbsorbCard = vi.fn(() => { throw new Error('portre yok'); });
    expect(() => _graduateSentez(S._gecisKartlari[0])).not.toThrow();
    expect(window.oikReleaseCard).toHaveBeenCalledWith('gk_k1_lapis');
  });
});

describe('_releaseSentez — yol bırakılınca iz iki toplamdan da çekilir', () => {
  beforeEach(() => {
    window.porReleaseCard = vi.fn();
    window.oikReleaseCard = vi.fn();
  });
  afterEach(() => {
    delete window.porReleaseCard;
    delete window.oikReleaseCard;
  });

  it('her iki kutbun ref izi de geri çağrılır', () => {
    _releaseSentez(S._gecisKartlari[0]);
    expect(window.porReleaseCard).toHaveBeenCalledWith('gk_k1_golden');
    expect(window.oikReleaseCard).toHaveBeenCalledWith('gk_k1_lapis');
  });

  it('bir taraf patlarsa diğeri yine temizlenir', () => {
    window.porReleaseCard = vi.fn(() => { throw new Error('portre yok'); });
    expect(() => _releaseSentez(S._gecisKartlari[0])).not.toThrow();
    expect(window.oikReleaseCard).toHaveBeenCalledWith('gk_k1_lapis');
  });
});
