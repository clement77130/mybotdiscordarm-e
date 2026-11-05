import { prisma } from '../utils/prisma';
import { GENERATED_GROUPS, GENERATED_MESSAGES, MessageDef } from './registry.generated';
import { MANUAL_GROUPS, MANUAL_MESSAGES } from './defaults';

// Surcharges de texte par serveur, gardées en mémoire (chargées au démarrage, mises à jour par le panel)
const overrides = new Map<string, Map<string, string>>();

export const ALL_MESSAGES: Record<string, MessageDef> = { ...GENERATED_MESSAGES, ...MANUAL_MESSAGES };
export const ALL_GROUPS: Record<string, string> = { ...GENERATED_GROUPS, ...MANUAL_GROUPS };

export async function loadMessageOverrides(): Promise<void> {
  overrides.clear();
  const rows = await prisma.messageOverride.findMany();
  for (const row of rows) setCached(row.guildId, row.key, row.text);
}

function setCached(guildId: string, key: string, text: string | null) {
  let map = overrides.get(guildId);
  if (text === null) {
    map?.delete(key);
    return;
  }
  if (!map) overrides.set(guildId, (map = new Map()));
  map.set(key, text);
}

export function getOverrides(guildId: string): Record<string, string> {
  return Object.fromEntries(overrides.get(guildId) ?? []);
}

export async function saveOverride(guildId: string, key: string, text: string | null): Promise<void> {
  if (text === null) {
    await prisma.messageOverride.deleteMany({ where: { guildId, key } });
  } else {
    await prisma.messageOverride.upsert({
      where: { guildId_key: { guildId, key } },
      create: { guildId, key, text },
      update: { text }
    });
  }
  setCached(guildId, key, text);
}

export async function resetOverrides(guildId: string, keys?: string[]): Promise<number> {
  const result = await prisma.messageOverride.deleteMany({ where: { guildId, ...(keys ? { key: { in: keys } } : {}) } });
  const map = overrides.get(guildId);
  if (map) for (const key of keys ?? [...map.keys()]) map.delete(key);
  return result.count;
}

function fill(template: string, vars?: Record<string, unknown>): string {
  if (!vars) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name] ?? '') : match
  );
}

/**
 * Texte d'un message du bot : la version modifiée dans le panel si elle existe, sinon le texte par défaut.
 * Les {variables} sont remplacées par leur valeur.
 */
export function m(guildId: string | null | undefined, key: string, fallback: string, vars?: Record<string, unknown>): string {
  const override = guildId ? overrides.get(guildId)?.get(key) : undefined;
  return fill(override ?? fallback, vars);
}

// Pour les messages déclarés dans defaults.ts : le texte par défaut vient du registre
export function tr(guildId: string | null | undefined, key: string, vars?: Record<string, unknown>): string {
  const def = MANUAL_MESSAGES[key];
  return m(guildId, key, def ? def.text : key, vars);
}
