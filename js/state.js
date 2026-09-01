/**
 * Wanderer — shared mutable state (Faz 2.3 — bölünmüş).
 *
 * Mantıksal slice'lara bölünmüş 11 alt-modülden tek bir `S` objesi compose edilir.
 * Modüller hâlâ `import { S } from '../state.js'` ile aynı reference'a erişir
 * (mutation'lar tüm modüllerden görünür — eski davranış korunur).
 *
 * Yeni slice eklemek için: js/state/<name>.js oluştur, aşağıdaki dizi içine ekle.
 */
import { authState }            from './state/auth.js';
import { chatState }            from './state/chat.js';
import { settingsState }        from './state/settings.js';
import { personalizationState } from './state/personalization.js';
import { depthState }           from './state/depth.js';
import { w2State }              from './state/w2.js';
import { extrasState }          from './state/extras.js';
import { porState }          from './state/portre.js';
import { gecisKartiState }         from './state/gecis-karti.js';
import { ilhamState }           from './state/ilham.js';
import { oikState }             from './state/oik.js';

export { authState, chatState, settingsState, personalizationState, depthState, w2State, extrasState, porState, gecisKartiState, ilhamState, oikState };

/** @type {Record<string, any>} */
export const S = Object.assign(
  {},
  authState,
  chatState,
  settingsState,
  personalizationState,
  depthState,
  w2State,
  extrasState,
  porState,
  gecisKartiState,
  ilhamState,
  oikState,
);
