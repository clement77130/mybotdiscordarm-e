import {
  ApplicationCommandDataResolvable,
  ApplicationCommandOptionType,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  Guild,
  GuildMember,
  PartialGuildMember,
  PermissionFlagsBits
} from 'discord.js';
import type { CustomAction } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { tr } from '../messages';
import { ProgramError, runProgram, sanitizeProgram } from './engine';
import { RunContext, createOps } from './actions';
import { MemberInfo, runScript } from './sandbox';
import { parseIdList } from '../utils/robloxConfig';
import { loadEventSettings } from '../utils/events';
import { formatDate, formatTime } from '../utils/zones';

// ───── Options des commandes ─────

export const OPTION_TYPES = {
  string: ApplicationCommandOptionType.String,
  integer: ApplicationCommandOptionType.Integer,
  number: ApplicationCommandOptionType.Number,
  boolean: ApplicationCommandOptionType.Boolean,
  user: ApplicationCommandOptionType.User,
  channel: ApplicationCommandOptionType.Channel,
  role: ApplicationCommandOptionType.Role
} as const;

export interface OptionDef {
  name: string;
  description: string;
  type: keyof typeof OPTION_TYPES;
  required: boolean;
}

export function parseOptions(raw: string): OptionDef[] {
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter(o => o && /^[a-z0-9_-]{1,32}$/.test(String(o.name)) && String(o.type) in OPTION_TYPES)
      .slice(0, 10)
      .map(o => ({ name: String(o.name), description: String(o.description ?? '').slice(0, 100), type: o.type, required: o.required === true }));
  } catch {
    return [];
  }
}

// ───── Dernières erreurs (affichées dans le panel) ─────

export const lastErrors = new Map<number, { at: string; message: string }>();

// ───── Droit d'utiliser des scripts JavaScript ─────

let ownerIds: Set<string> | null = null;

async function loadOwnerIds(client: Client): Promise<Set<string>> {
  const ids = new Set<string>();
  try {
    const app = await client.application!.fetch();
    const owner: any = app.owner;
    if (owner) {
      if (owner.members) for (const id of owner.members.keys()) ids.add(String(id));
      else if (owner.id) ids.add(String(owner.id));
    }
  } catch (error) {
    console.warn('⚠️ Impossible de lire le propriétaire du bot :', error);
  }
  return ids;
}

// Seuls le propriétaire du bot et les identifiants listés dans SCRIPT_EDITOR_IDS peuvent écrire du JavaScript
export async function canUseScripts(client: Client, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const listed = (process.env.SCRIPT_EDITOR_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (listed.includes(userId)) return true;
  if (!ownerIds) ownerIds = await loadOwnerIds(client);
  return ownerIds.has(userId);
}

// ───── Variables ─────

async function buildVars(guild: Guild, member: GuildMember | PartialGuildMember | null, channelId: string | null): Promise<Record<string, string>> {
  const settings = await loadEventSettings(guild.id);
  const now = new Date();
  const user = member?.user;
  const channel = channelId ? guild.channels.cache.get(channelId) : null;

  const vars: Record<string, string> = {
    'server.name': guild.name,
    'server.id': guild.id,
    'server.members': String(guild.memberCount),
    date: formatDate(now, settings.timezone),
    time: formatTime(now, settings.timezone)
  };

  if (user) {
    vars.user = `<@${user.id}>`;
    vars['user.mention'] = `<@${user.id}>`;
    vars['user.id'] = user.id;
    vars['user.name'] = user.username;
    vars['user.tag'] = user.tag ?? user.username;
    vars['user.nickname'] = (member as GuildMember | null)?.nickname ?? user.username;
  }

  if (channel) {
    vars.channel = `<#${channel.id}>`;
    vars['channel.id'] = channel.id;
    vars['channel.name'] = channel.name;
  }
  return vars;
}

function addOptionVars(vars: Record<string, string>, interaction: ChatInputCommandInteraction<'cached'>) {
  for (const option of interaction.options.data) {
    const base = `option.${option.name}`;
    if (option.user) {
      vars[base] = option.user.id;
      vars[`${base}.mention`] = `<@${option.user.id}>`;
      vars[`${base}.name`] = option.user.username;
    } else if (option.role) {
      vars[base] = option.role.id;
      vars[`${base}.mention`] = `<@&${option.role.id}>`;
      vars[`${base}.name`] = option.role.name;
    } else if (option.channel) {
      vars[base] = option.channel.id;
      vars[`${base}.mention`] = `<#${option.channel.id}>`;
      vars[`${base}.name`] = option.channel.name ?? '';
    } else if (option.value !== undefined && option.value !== null) {
      vars[base] = String(option.value);
    }
  }
}

function scriptContext(vars: Record<string, string>, trigger: string) {
  const options: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (key.startsWith('option.') && key.split('.').length === 2) options[key.slice(7)] = value;
  }
  return {
    user: { id: vars['user.id'] ?? '', name: vars['user.name'] ?? '', tag: vars['user.tag'] ?? '', nickname: vars['user.nickname'] ?? '', mention: vars.user ?? '' },
    server: { id: vars['server.id'], name: vars['server.name'], members: Number(vars['server.members']) || 0 },
    channel: { id: vars['channel.id'] ?? '', name: vars['channel.name'] ?? '' },
    options,
    vars,
    trigger
  };
}

// ───── Exécution ─────

function hasAccess(member: GuildMember, action: CustomAction): boolean {
  const allowed = parseIdList(action.allowedRoles);
  if (allowed.length === 0) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return allowed.some(id => member.roles.cache.has(id));
}

async function memberInfo(guild: Guild, userId: string): Promise<MemberInfo | null> {
  if (!/^\d{5,25}$/.test(userId)) return null;
  const found = await guild.members.fetch(userId).catch(() => null);
  if (!found) return null;
  return {
    id: found.id,
    name: found.user.username,
    tag: found.user.tag,
    nickname: found.nickname,
    roles: [...found.roles.cache.keys()].filter(id => id !== guild.id),
    isAdmin: found.permissions.has(PermissionFlagsBits.Administrator)
  };
}

async function execute(client: Client, action: CustomAction, ctx: RunContext, vars: Record<string, string>): Promise<void> {
  const gid = ctx.guild.id;
  const ops = createOps(ctx);

  try {
    if (action.mode === 'script') {
      if (!(await canUseScripts(client, action.createdBy))) throw new ProgramError(tr(gid, 'custom.scriptDenied'));
      await runScript(action.script, scriptContext(vars, action.trigger), {
        ops,
        memberInfo: id => memberInfo(ctx.guild, id),
        log: line => console.log(`[commande #${action.id}] ${line}`)
      });
    } else {
      await runProgram(sanitizeProgram(JSON.parse(action.program)), vars, ops);
    }
    lastErrors.delete(action.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    lastErrors.set(action.id, { at: new Date().toISOString(), message: message.slice(0, 300) });
    console.error(`❌ Commande personnalisée #${action.id} (${action.name}) :`, message);

    if (ctx.interaction) {
      const text = tr(gid, 'custom.error');
      if (!ctx.replied) await ctx.interaction.editReply({ content: text }).catch(() => {});
      else await ctx.interaction.followUp({ content: text, ephemeral: true }).catch(() => {});
      ctx.replied = true;
    }
  } finally {
    // Une interaction différée doit toujours recevoir une réponse
    if (ctx.interaction && !ctx.replied) {
      await ctx.interaction.editReply({ content: tr(gid, 'custom.emptyReply') }).catch(() => {});
    }
  }
}

function newContext(guild: Guild, member: GuildMember | null, interaction: RunContext['interaction'], ephemeral: boolean): RunContext {
  const channel = interaction?.channel;
  return {
    guild,
    trigger: member,
    channel: channel && channel.isTextBased() && !channel.isDMBased() ? (channel as RunContext['channel']) : null,
    interaction,
    ephemeral,
    replied: false,
    counters: { actions: 0, messages: 0 }
  };
}

// Commande slash créée dans le panel. Renvoie false si aucune commande personnalisée ne correspond.
export async function handleCustomSlash(interaction: ChatInputCommandInteraction<'cached'>): Promise<boolean> {
  const action = await prisma.customAction.findFirst({
    where: { guildId: interaction.guildId, trigger: 'slash', name: interaction.commandName, enabled: true }
  });
  if (!action) return false;

  if (!hasAccess(interaction.member, action)) {
    await interaction.reply({ content: tr(interaction.guildId, 'custom.noPermission'), ephemeral: true });
    return true;
  }

  await interaction.deferReply({ ephemeral: action.ephemeral });
  const vars = await buildVars(interaction.guild, interaction.member, interaction.channelId);
  addOptionVars(vars, interaction);
  await execute(interaction.client, action, newContext(interaction.guild, interaction.member, interaction, action.ephemeral), vars);
  return true;
}

// Bouton ajouté à un message par un bloc « Répondre » / « Envoyer dans un salon »
export async function handleCustomButton(interaction: ButtonInteraction<'cached'>): Promise<void> {
  const key = interaction.customId.slice(3);
  const action = await prisma.customAction.findFirst({
    where: { guildId: interaction.guildId, trigger: 'button', triggerKey: key, enabled: true }
  });

  if (!action) {
    await interaction.reply({ content: tr(interaction.guildId, 'custom.buttonGone'), ephemeral: true });
    return;
  }
  if (!hasAccess(interaction.member, action)) {
    await interaction.reply({ content: tr(interaction.guildId, 'custom.noPermission'), ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: action.ephemeral });
  const vars = await buildVars(interaction.guild, interaction.member, interaction.channelId);
  vars['button.key'] = key;
  await execute(interaction.client, action, newContext(interaction.guild, interaction.member, interaction, action.ephemeral), vars);
}

// Arrivée / départ d'un membre
export async function runMemberEvent(member: GuildMember | PartialGuildMember, trigger: 'memberJoin' | 'memberLeave'): Promise<void> {
  const actions = await prisma.customAction.findMany({ where: { guildId: member.guild.id, trigger, enabled: true }, orderBy: { id: 'asc' } });
  for (const action of actions) {
    const vars = await buildVars(member.guild, member, null);
    await execute(member.client, action, newContext(member.guild, member.partial ? null : (member as GuildMember), null, false), vars);
  }
}

// ───── Enregistrement des commandes slash du serveur ─────

export async function syncGuildCommands(guild: Guild): Promise<void> {
  const actions = await prisma.customAction.findMany({ where: { guildId: guild.id, trigger: 'slash', enabled: true }, orderBy: { id: 'asc' } });
  const data = actions.map(a => ({
    name: a.name,
    description: (a.description || a.name).slice(0, 100),
    dmPermission: false,
    options: parseOptions(a.options)
      .sort((x, y) => Number(y.required) - Number(x.required))
      .map(o => ({ name: o.name, description: o.description || o.name, type: OPTION_TYPES[o.type], required: o.required }))
  }));
  await guild.commands.set(data as ApplicationCommandDataResolvable[]);
}

export async function syncAllGuildCommands(client: Client): Promise<void> {
  const rows = await prisma.customAction.findMany({ where: { trigger: 'slash' }, select: { guildId: true }, distinct: ['guildId'] });
  for (const { guildId } of rows) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    try {
      await syncGuildCommands(guild);
    } catch (error) {
      console.error(`❌ Enregistrement des commandes personnalisées impossible (${guild.name}) :`, error);
    }
  }
}
