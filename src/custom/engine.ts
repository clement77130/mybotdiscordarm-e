// Moteur des commandes personnalisées « par blocs ».
// Un programme est une liste de blocs (JSON). Il est validé strictement à l'enregistrement, puis exécuté par un
// interpréteur qui n'utilise jamais eval : calculs et conditions passent par de petits analyseurs maison.

// ───── Types ─────

export interface ButtonDef {
  label: string;
  style: 'primary' | 'secondary' | 'success' | 'danger';
  key: string;
}

export interface MessagePayload {
  content?: string;
  embed?: { title?: string; description?: string; color?: string; footer?: string };
  buttons?: ButtonDef[];
}

export type Scope = 'guild' | 'user';

export interface Ops {
  reply(payload: MessagePayload): Promise<void>;
  send(channelId: string, payload: MessagePayload): Promise<void>;
  dm(userId: string, text: string): Promise<void>;
  addRole(userId: string, roleId: string): Promise<void>;
  removeRole(userId: string, roleId: string): Promise<void>;
  timeout(userId: string, minutes: number, reason: string): Promise<void>;
  kick(userId: string, reason: string): Promise<void>;
  ban(userId: string, reason: string): Promise<void>;
  nickname(userId: string, nickname: string): Promise<void>;
  hasRole(userId: string, roleId: string): Promise<boolean>;
  isAdmin(userId: string): Promise<boolean>;
  dataGet(scope: Scope, scopeId: string, key: string): Promise<string | null>;
  dataSet(scope: Scope, scopeId: string, key: string, value: string): Promise<void>;
  dataDelete(scope: Scope, scopeId: string, key: string): Promise<void>;
}

export interface Block {
  type: string;
  [field: string]: unknown;
}

export class ProgramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProgramError';
  }
}

// ───── Définition des blocs (utilisée par la validation ET par l'éditeur du panel) ─────

export type FieldKind = 'text' | 'textarea' | 'number' | 'select' | 'role' | 'channel' | 'bool' | 'color' | 'buttons' | 'cond' | 'name';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  max?: number;
  placeholder?: string;
  default?: unknown;
  options?: { value: string; label: string }[];
  min?: number;
  maxValue?: number;
  // champ affiché seulement si un autre champ est vrai
  showIf?: string;
}

export interface BlockDef {
  type: string;
  label: string;
  category: string;
  icon: string;
  help?: string;
  fields: FieldDef[];
  // zones de blocs imbriquées
  slots?: { key: string; label: string }[];
}

const USER_FIELD: FieldDef = { key: 'user', label: 'Membre', kind: 'text', default: '{user.id}', max: 100, placeholder: '{user.id}' };
const SCOPE_FIELD: FieldDef = {
  key: 'scope',
  label: 'Mémoire',
  kind: 'select',
  default: 'user',
  options: [
    { value: 'user', label: 'Du membre' },
    { value: 'guild', label: 'Du serveur' }
  ]
};
const EMBED_FIELDS: FieldDef[] = [
  { key: 'useEmbed', label: 'Afficher dans un embed', kind: 'bool', default: false },
  { key: 'title', label: "Titre de l'embed", kind: 'text', max: 256, showIf: 'useEmbed' },
  { key: 'color', label: 'Couleur', kind: 'color', default: '#5865f2', showIf: 'useEmbed' },
  { key: 'buttons', label: 'Boutons', kind: 'buttons' }
];

export const BLOCK_DEFS: BlockDef[] = [
  { type: 'reply', label: 'Répondre', category: 'Messages', icon: '💬', help: 'Répond à la personne qui a utilisé la commande.', fields: [{ key: 'text', label: 'Message', kind: 'textarea', max: 2000, placeholder: 'Bonjour {user} !' }, ...EMBED_FIELDS] },
  { type: 'send', label: 'Envoyer dans un salon', category: 'Messages', icon: '📢', fields: [{ key: 'channel', label: 'Salon', kind: 'channel' }, { key: 'text', label: 'Message', kind: 'textarea', max: 2000 }, ...EMBED_FIELDS] },
  { type: 'dm', label: 'Envoyer un message privé', category: 'Messages', icon: '✉️', fields: [USER_FIELD, { key: 'text', label: 'Message', kind: 'textarea', max: 2000 }] },

  { type: 'addRole', label: 'Donner un rôle', category: 'Membres', icon: '➕', fields: [USER_FIELD, { key: 'role', label: 'Rôle', kind: 'role' }] },
  { type: 'removeRole', label: 'Retirer un rôle', category: 'Membres', icon: '➖', fields: [USER_FIELD, { key: 'role', label: 'Rôle', kind: 'role' }] },
  { type: 'nickname', label: 'Changer le pseudo', category: 'Membres', icon: '✏️', fields: [USER_FIELD, { key: 'nickname', label: 'Nouveau pseudo', kind: 'text', max: 32 }] },
  { type: 'timeout', label: 'Exclure temporairement', category: 'Membres', icon: '⏳', fields: [USER_FIELD, { key: 'minutes', label: 'Minutes', kind: 'number', default: 10, min: 1, maxValue: 40320 }, { key: 'reason', label: 'Raison', kind: 'text', max: 200 }] },
  { type: 'kick', label: 'Expulser', category: 'Membres', icon: '👢', fields: [USER_FIELD, { key: 'reason', label: 'Raison', kind: 'text', max: 200 }] },
  { type: 'ban', label: 'Bannir', category: 'Membres', icon: '🔨', fields: [USER_FIELD, { key: 'reason', label: 'Raison', kind: 'text', max: 200 }] },

  { type: 'set', label: 'Définir une variable', category: 'Variables', icon: '📦', help: 'Utilisable ensuite avec {nom}.', fields: [{ key: 'name', label: 'Nom', kind: 'name', max: 30, placeholder: 'score' }, { key: 'value', label: 'Valeur', kind: 'text', max: 500 }] },
  { type: 'calc', label: 'Calculer', category: 'Variables', icon: '🧮', help: '+ - * / % ( ) abs() round() floor() ceil() min() max() sqrt()', fields: [{ key: 'name', label: 'Nom du résultat', kind: 'name', max: 30 }, { key: 'expression', label: 'Calcul', kind: 'text', max: 200, placeholder: '{score} + 5' }] },
  { type: 'random', label: 'Nombre aléatoire', category: 'Variables', icon: '🎲', fields: [{ key: 'name', label: 'Nom du résultat', kind: 'name', max: 30 }, { key: 'min', label: 'Minimum', kind: 'number', default: 1 }, { key: 'max', label: 'Maximum', kind: 'number', default: 6 }] },
  { type: 'pick', label: 'Choisir au hasard', category: 'Variables', icon: '🎯', fields: [{ key: 'name', label: 'Nom du résultat', kind: 'name', max: 30 }, { key: 'options', label: 'Choix (un par ligne)', kind: 'textarea', max: 1500 }] },

  { type: 'dataGet', label: 'Lire dans la mémoire', category: 'Mémoire', icon: '📖', fields: [{ key: 'name', label: 'Mettre dans la variable', kind: 'name', max: 30 }, SCOPE_FIELD, { ...USER_FIELD, showIf: 'scopeIsUser' }, { key: 'key', label: 'Clé', kind: 'name', max: 50, placeholder: 'points' }, { key: 'default', label: 'Valeur si vide', kind: 'text', max: 200, default: '0' }] },
  { type: 'dataSet', label: 'Écrire dans la mémoire', category: 'Mémoire', icon: '💾', fields: [SCOPE_FIELD, { ...USER_FIELD, showIf: 'scopeIsUser' }, { key: 'key', label: 'Clé', kind: 'name', max: 50 }, { key: 'value', label: 'Valeur', kind: 'text', max: 500 }] },
  { type: 'dataAdd', label: 'Ajouter à un nombre mémorisé', category: 'Mémoire', icon: '📈', fields: [{ key: 'name', label: 'Mettre le résultat dans la variable (facultatif)', kind: 'name', max: 30 }, SCOPE_FIELD, { ...USER_FIELD, showIf: 'scopeIsUser' }, { key: 'key', label: 'Clé', kind: 'name', max: 50 }, { key: 'amount', label: 'Quantité (négative pour retirer)', kind: 'text', max: 50, default: '1' }] },
  { type: 'dataDelete', label: 'Effacer de la mémoire', category: 'Mémoire', icon: '🗑️', fields: [SCOPE_FIELD, { ...USER_FIELD, showIf: 'scopeIsUser' }, { key: 'key', label: 'Clé', kind: 'name', max: 50 }] },

  { type: 'if', label: 'Si… alors… sinon', category: 'Logique', icon: '🔀', fields: [{ key: 'cond', label: 'Conditions', kind: 'cond' }], slots: [{ key: 'then', label: 'Alors' }, { key: 'else', label: 'Sinon' }] },
  { type: 'repeat', label: 'Répéter', category: 'Logique', icon: '🔁', fields: [{ key: 'times', label: 'Nombre de fois', kind: 'number', default: 3, min: 1, maxValue: 50 }], slots: [{ key: 'body', label: 'Répéter ces blocs' }] },
  { type: 'wait', label: 'Attendre', category: 'Logique', icon: '⏱️', fields: [{ key: 'seconds', label: 'Secondes', kind: 'number', default: 2, min: 1, maxValue: 10 }] },
  { type: 'stop', label: 'Arrêter', category: 'Logique', icon: '🛑', help: 'Arrête la commande ici.', fields: [] }
];

const DEFS = new Map(BLOCK_DEFS.map(d => [d.type, d]));

export const CONDITION_TYPES = [
  { type: 'compare', label: 'Comparer deux valeurs' },
  { type: 'hasRole', label: 'Le membre a le rôle' },
  { type: 'isAdmin', label: 'Le membre est administrateur' },
  { type: 'chance', label: 'Chance (en %)' },
  { type: 'exists', label: 'La variable est renseignée' }
];

export const COMPARE_OPS = [
  { value: '==', label: 'est égal à' },
  { value: '!=', label: "n'est pas égal à" },
  { value: '>', label: 'est plus grand que' },
  { value: '<', label: 'est plus petit que' },
  { value: '>=', label: 'est plus grand ou égal à' },
  { value: '<=', label: 'est plus petit ou égal à' },
  { value: 'contains', label: 'contient' },
  { value: 'startsWith', label: 'commence par' },
  { value: 'endsWith', label: 'finit par' }
];

export const BUTTON_STYLES: ButtonDef['style'][] = ['primary', 'secondary', 'success', 'danger'];

export const VARIABLES_HELP = [
  ['{user}', 'Mention de la personne'],
  ['{user.id}', 'Son identifiant'],
  ['{user.name}', "Son nom d'utilisateur"],
  ['{user.nickname}', 'Son pseudo sur le serveur'],
  ['{server.name}', 'Nom du serveur'],
  ['{server.members}', 'Nombre de membres'],
  ['{channel}', 'Mention du salon'],
  ['{channel.name}', 'Nom du salon'],
  ['{option.nom}', "Valeur de l'option « nom » de la commande"],
  ['{date}', 'Date du jour'],
  ['{time}', 'Heure']
];

// ───── Validation / nettoyage ─────

export const MAX_BLOCKS = 200;
export const MAX_DEPTH = 8;
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,29}$/;
const KEY_RE = /^[A-Za-z0-9_.-]{1,50}$/;
const BUTTON_KEY_RE = /^[a-z0-9_-]{1,40}$/;
const ID_RE = /^\d{5,25}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function sanitizeCondItem(raw: any): Record<string, unknown> {
  const type = String(raw?.type);
  const not = raw?.not === true;
  switch (type) {
    case 'compare': {
      if (!COMPARE_OPS.some(o => o.value === raw.op)) throw new ProgramError('Opérateur de comparaison inconnu');
      return { type, not, left: str(raw.left, 300), op: raw.op, right: str(raw.right, 300) };
    }
    case 'hasRole':
      return { type, not, user: str(raw.user, 100) || '{user.id}', role: ID_RE.test(String(raw.role)) ? String(raw.role) : '' };
    case 'isAdmin':
      return { type, not, user: str(raw.user, 100) || '{user.id}' };
    case 'chance': {
      const percent = Number(raw.percent);
      return { type, not, percent: Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 50 };
    }
    case 'exists': {
      const name = str(raw.name, 30);
      if (name && !NAME_RE.test(name)) throw new ProgramError('Nom de variable invalide dans une condition');
      return { type, not, name };
    }
    default:
      throw new ProgramError('Type de condition inconnu');
  }
}

function sanitizeCond(raw: any): { mode: 'all' | 'any'; items: Record<string, unknown>[] } {
  const items = Array.isArray(raw?.items) ? raw.items.slice(0, 10).map(sanitizeCondItem) : [];
  return { mode: raw?.mode === 'any' ? 'any' : 'all', items };
}

function sanitizeButtons(raw: unknown): ButtonDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 5).map((b: any) => {
    const key = str(b?.key, 40);
    if (!BUTTON_KEY_RE.test(key)) throw new ProgramError(`Identifiant de bouton invalide : « ${key} » (lettres minuscules, chiffres, - et _)`);
    const style = BUTTON_STYLES.includes(b?.style) ? b.style : 'primary';
    const label = str(b?.label, 80).trim();
    if (!label) throw new ProgramError('Chaque bouton doit avoir un texte');
    return { label, style, key };
  });
}

function sanitizeBlocks(raw: unknown, depth: number, counter: { n: number }): Block[] {
  if (!Array.isArray(raw)) return [];
  if (depth > MAX_DEPTH) throw new ProgramError('Blocs trop imbriqués');

  return raw.map((b: any) => {
    const def = DEFS.get(String(b?.type));
    if (!def) throw new ProgramError(`Bloc inconnu : ${String(b?.type)}`);
    if (++counter.n > MAX_BLOCKS) throw new ProgramError(`Trop de blocs (${MAX_BLOCKS} maximum)`);

    const out: Block = { type: def.type };
    for (const f of def.fields) {
      const value = b[f.key];
      switch (f.kind) {
        case 'text':
        case 'textarea':
          out[f.key] = str(value, f.max ?? 500);
          break;
        case 'name': {
          const v = str(value, f.max ?? 30).trim();
          const ok = f.key === 'key' ? KEY_RE.test(v) : NAME_RE.test(v);
          if (v && !ok) throw new ProgramError(`« ${f.label} » invalide : lettres, chiffres et _ uniquement`);
          out[f.key] = v;
          break;
        }
        case 'number': {
          const n = Number(value);
          const min = f.min ?? -1_000_000_000;
          const max = f.maxValue ?? 1_000_000_000;
          out[f.key] = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : Number(f.default ?? 0);
          break;
        }
        case 'select': {
          const allowed = f.options!.map(o => o.value);
          out[f.key] = allowed.includes(String(value)) ? String(value) : String(f.default ?? allowed[0]);
          break;
        }
        case 'role':
        case 'channel':
          out[f.key] = ID_RE.test(String(value)) ? String(value) : '';
          break;
        case 'bool':
          out[f.key] = value === true;
          break;
        case 'color':
          out[f.key] = COLOR_RE.test(String(value)) ? String(value) : String(f.default ?? '#5865f2');
          break;
        case 'buttons':
          out[f.key] = sanitizeButtons(value);
          break;
        case 'cond':
          out[f.key] = sanitizeCond(value);
          break;
      }
    }
    for (const slot of def.slots ?? []) {
      out[slot.key] = sanitizeBlocks(b[slot.key], depth + 1, counter);
    }
    return out;
  });
}

export function sanitizeProgram(raw: unknown): Block[] {
  return sanitizeBlocks(raw, 0, { n: 0 });
}

// ───── Variables et calcul ─────

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([A-Za-z_][A-Za-z0-9_.]*)\}/g, (match, path: string) =>
    Object.prototype.hasOwnProperty.call(vars, path) ? vars[path] : match
  );
}

const MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sqrt: Math.sqrt,
  min: Math.min,
  max: Math.max
};

// Expression arithmétique sûre : nombres, + - * / %, parenthèses, quelques fonctions
export function evaluateMath(expression: string): number {
  const tokens = expression.match(/\d+(?:\.\d+)?|[A-Za-z_]+|[()+\-*/%,]/g) ?? [];
  if (tokens.join('').length < expression.replace(/\s+/g, '').length) throw new ProgramError(`Calcul invalide : « ${expression} »`);
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr(depth: number): number {
    if (depth > 30) throw new ProgramError('Calcul trop imbriqué');
    let value = parseTerm(depth);
    while (peek() === '+' || peek() === '-') value = next() === '+' ? value + parseTerm(depth) : value - parseTerm(depth);
    return value;
  }

  function parseTerm(depth: number): number {
    let value = parseUnary(depth);
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = next();
      const right = parseUnary(depth);
      value = op === '*' ? value * right : op === '/' ? value / right : value % right;
    }
    return value;
  }

  function parseUnary(depth: number): number {
    if (peek() === '-') {
      next();
      return -parseUnary(depth);
    }
    if (peek() === '+') {
      next();
      return parseUnary(depth);
    }
    return parsePrimary(depth);
  }

  function parsePrimary(depth: number): number {
    const token = next();
    if (token === undefined) throw new ProgramError(`Calcul incomplet : « ${expression} »`);
    if (token === '(') {
      const value = parseExpr(depth + 1);
      if (next() !== ')') throw new ProgramError(`Parenthèse manquante : « ${expression} »`);
      return value;
    }
    if (/^\d/.test(token)) return Number(token);
    if (/^[A-Za-z_]/.test(token)) {
      const fn = MATH_FUNCTIONS[token.toLowerCase()];
      if (!fn || next() !== '(') throw new ProgramError(`Fonction inconnue : ${token}`);
      const args: number[] = [];
      if (peek() !== ')') {
        do args.push(parseExpr(depth + 1));
        while (peek() === ',' && next());
      }
      if (next() !== ')') throw new ProgramError(`Parenthèse manquante : « ${expression} »`);
      return fn(...args);
    }
    throw new ProgramError(`Calcul invalide : « ${expression} »`);
  }

  const result = parseExpr(0);
  if (pos < tokens.length) throw new ProgramError(`Calcul invalide : « ${expression} »`);
  if (!Number.isFinite(result)) throw new ProgramError('Le calcul ne donne pas un nombre valide (division par zéro ?)');
  return Math.round(result * 1e9) / 1e9;
}

const isNumeric = (s: string) => s.trim() !== '' && Number.isFinite(Number(s));

export function compareValues(left: string, op: string, right: string): boolean {
  const numeric = isNumeric(left) && isNumeric(right);
  const a = numeric ? Number(left) : left.toLowerCase();
  const b = numeric ? Number(right) : right.toLowerCase();
  switch (op) {
    case '==': return a === b;
    case '!=': return a !== b;
    case '>': return a > b;
    case '<': return a < b;
    case '>=': return a >= b;
    case '<=': return a <= b;
    case 'contains': return left.toLowerCase().includes(right.toLowerCase());
    case 'startsWith': return left.toLowerCase().startsWith(right.toLowerCase());
    case 'endsWith': return left.toLowerCase().endsWith(right.toLowerCase());
    default: return false;
  }
}

// ───── Interpréteur ─────

export interface RunLimits {
  maxSteps: number;
  maxWaitSeconds: number;
}

export const DEFAULT_LIMITS: RunLimits = { maxSteps: 500, maxWaitSeconds: 15 };

class Stop extends Error {}

export interface RunOptions {
  limits?: RunLimits;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export async function runProgram(program: Block[], vars: Record<string, string>, ops: Ops, options: RunOptions = {}): Promise<void> {
  const limits = options.limits ?? DEFAULT_LIMITS;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const state = { steps: 0, waited: 0 };

  const fill = (value: unknown) => interpolate(String(value ?? ''), vars);
  const setVar = (name: unknown, value: string) => {
    const n = String(name ?? '').trim();
    if (n) vars[n] = value;
  };

  async function evalCond(group: any): Promise<boolean> {
    const items: any[] = group?.items ?? [];
    if (items.length === 0) return true;
    const results: boolean[] = [];
    for (const item of items) {
      let result: boolean;
      switch (item.type) {
        case 'compare': result = compareValues(fill(item.left), item.op, fill(item.right)); break;
        case 'hasRole': result = item.role ? await ops.hasRole(fill(item.user), item.role) : false; break;
        case 'isAdmin': result = await ops.isAdmin(fill(item.user)); break;
        case 'chance': result = random() * 100 < Number(item.percent); break;
        case 'exists': result = !!item.name && (vars[item.name] ?? '') !== ''; break;
        default: result = false;
      }
      results.push(item.not ? !result : result);
    }
    return group.mode === 'any' ? results.some(Boolean) : results.every(Boolean);
  }

  function payload(b: Block): MessagePayload {
    const text = fill(b.text);
    if (b.useEmbed) {
      return {
        content: undefined,
        embed: { title: fill(b.title) || undefined, description: text || undefined, color: String(b.color || '#5865f2') },
        buttons: (b.buttons as ButtonDef[]) ?? []
      };
    }
    return { content: text || undefined, buttons: (b.buttons as ButtonDef[]) ?? [] };
  }

  const scopeId = (b: Block) => (b.scope === 'guild' ? '' : fill(b.user));
  const scopeOf = (b: Block): Scope => (b.scope === 'guild' ? 'guild' : 'user');

  async function execBlock(b: Block): Promise<void> {
    if (++state.steps > limits.maxSteps) throw new ProgramError(`Trop d'étapes (${limits.maxSteps} maximum) : une boucle est peut-être infinie`);

    switch (b.type) {
      case 'reply': return ops.reply(payload(b));
      case 'send': {
        if (!b.channel) throw new ProgramError('Le bloc « Envoyer dans un salon » n\'a pas de salon');
        return ops.send(String(b.channel), payload(b));
      }
      case 'dm': return ops.dm(fill(b.user), fill(b.text));
      case 'addRole': return ops.addRole(fill(b.user), String(b.role));
      case 'removeRole': return ops.removeRole(fill(b.user), String(b.role));
      case 'nickname': return ops.nickname(fill(b.user), fill(b.nickname));
      case 'timeout': return ops.timeout(fill(b.user), Number(b.minutes), fill(b.reason));
      case 'kick': return ops.kick(fill(b.user), fill(b.reason));
      case 'ban': return ops.ban(fill(b.user), fill(b.reason));

      case 'set': return setVar(b.name, fill(b.value));
      case 'calc': return setVar(b.name, String(evaluateMath(fill(b.expression))));
      case 'random': {
        const min = Math.ceil(Number(b.min));
        const max = Math.floor(Number(b.max));
        const lo = Math.min(min, max);
        const hi = Math.max(min, max);
        return setVar(b.name, String(lo + Math.floor(random() * (hi - lo + 1))));
      }
      case 'pick': {
        const choices = fill(b.options).split('\n').map(s => s.trim()).filter(Boolean);
        return setVar(b.name, choices.length ? choices[Math.floor(random() * choices.length)] : '');
      }

      case 'dataGet': {
        const value = await ops.dataGet(scopeOf(b), scopeId(b), fill(b.key));
        return setVar(b.name, value ?? fill(b.default));
      }
      case 'dataSet': return ops.dataSet(scopeOf(b), scopeId(b), fill(b.key), fill(b.value));
      case 'dataAdd': {
        const key = fill(b.key);
        const current = Number((await ops.dataGet(scopeOf(b), scopeId(b), key)) ?? 0);
        const amount = Number(fill(b.amount));
        if (!Number.isFinite(amount)) throw new ProgramError('La quantité à ajouter n\'est pas un nombre');
        const total = String((Number.isFinite(current) ? current : 0) + amount);
        await ops.dataSet(scopeOf(b), scopeId(b), key, total);
        return setVar(b.name, total);
      }
      case 'dataDelete': return ops.dataDelete(scopeOf(b), scopeId(b), fill(b.key));

      case 'if': return execBlocks((await evalCond(b.cond)) ? (b.then as Block[]) : (b.else as Block[]));
      case 'repeat': {
        const times = Math.min(50, Math.max(1, Math.floor(Number(b.times))));
        for (let i = 0; i < times; i++) {
          vars.index = String(i + 1);
          await execBlocks(b.body as Block[]);
        }
        return;
      }
      case 'wait': {
        const seconds = Math.min(10, Math.max(1, Number(b.seconds)));
        state.waited += seconds;
        if (state.waited > limits.maxWaitSeconds) throw new ProgramError(`Attente totale trop longue (${limits.maxWaitSeconds} s maximum)`);
        return sleep(seconds * 1000);
      }
      case 'stop': throw new Stop();
      default: throw new ProgramError(`Bloc inconnu : ${b.type}`);
    }
  }

  async function execBlocks(blocks: Block[] | undefined): Promise<void> {
    for (const b of blocks ?? []) await execBlock(b);
  }

  try {
    await execBlocks(program);
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
  }
}
