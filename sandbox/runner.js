'use strict';
// Exécute le JavaScript d'une commande personnalisée DANS UN PROCESSUS SÉPARÉ lancé avec le modèle de permissions de Node
// (aucun accès fichiers, processus ou workers), sans variables d'environnement, avec une mémoire limitée.
// Le script ne parle au bot que par ce canal : chaque appel est revalidé et limité côté bot.
const vm = require('vm');

let nextId = 1;
const pending = new Map();

process.on('message', msg => {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'result') {
    const waiting = pending.get(msg.id);
    if (!waiting) return;
    pending.delete(msg.id);
    if (msg.error) waiting.reject(String(msg.error));
    else waiting.resolve(typeof msg.value === 'string' ? msg.value : '');
    return;
  }

  if (msg.type === 'run') {
    run(String(msg.code), String(msg.context)).then(
      () => process.send({ type: 'done' }),
      error => process.send({ type: 'error', message: String(error && error.message ? error.message : error).slice(0, 500) })
    );
  }
});

// Les échanges avec l'extérieur ne contiennent que des chaînes : aucun objet de ce processus n'est visible du script
function hostCall(method, argsJson) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    process.send({ type: 'call', id, method: String(method), args: String(argsJson) });
  });
}

const BOOTSTRAP = `(function (hostCall, contextJson) {
  'use strict';
  const call = async (method, ...args) => {
    let out;
    try { out = await hostCall(method, JSON.stringify(args)); }
    catch (e) { throw new Error(String(e)); }
    return out === '' ? undefined : JSON.parse(out);
  };
  const ctx = JSON.parse(contextJson);
  const api = {
    reply: a => call('reply', a),
    send: (channelId, a) => call('send', channelId, a),
    dm: (userId, text) => call('dm', userId, String(text)),
    addRole: (userId, roleId) => call('addRole', userId, roleId),
    removeRole: (userId, roleId) => call('removeRole', userId, roleId),
    timeout: (userId, minutes, reason) => call('timeout', userId, Number(minutes), String(reason || '')),
    kick: (userId, reason) => call('kick', userId, String(reason || '')),
    ban: (userId, reason) => call('ban', userId, String(reason || '')),
    setNickname: (userId, nickname) => call('nickname', userId, String(nickname || '')),
    member: userId => call('member', userId),
    sleep: ms => call('sleep', Number(ms)),
    random: (min, max) => { min = Math.ceil(min); max = Math.floor(max); return min + Math.floor(Math.random() * (max - min + 1)); },
    log: (...parts) => call('log', parts.map(String).join(' ')),
    data: {
      get: key => call('dataGet', 'guild', '', String(key)),
      set: (key, value) => call('dataSet', 'guild', '', String(key), String(value)),
      delete: key => call('dataDelete', 'guild', '', String(key))
    },
    userData: {
      get: (userId, key) => call('dataGet', 'user', String(userId), String(key)),
      set: (userId, key, value) => call('dataSet', 'user', String(userId), String(key), String(value)),
      delete: (userId, key) => call('dataDelete', 'user', String(userId), String(key))
    }
  };
  for (const [name, value] of Object.entries(api)) Object.defineProperty(globalThis, name, { value, enumerable: true });
  Object.defineProperty(globalThis, 'console', { value: { log: api.log, info: api.log, warn: api.log, error: api.log } });
  for (const [name, value] of Object.entries(ctx)) Object.defineProperty(globalThis, name, { value, enumerable: true });
})`;

async function run(code, contextJson) {
  // Pas d'eval ni de new Function dans le script ; le code du script est compilé ici, hors de cette restriction
  const sandbox = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(BOOTSTRAP, sandbox, { timeout: 1000 })(hostCall, contextJson);
  const result = vm.runInContext('(async () => {\n' + code + '\n})()', sandbox, { timeout: 2000, filename: 'commande.js' });
  await result;
}
