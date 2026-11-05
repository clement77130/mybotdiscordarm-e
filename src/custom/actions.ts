import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  GuildMember,
  GuildTextBasedChannel,
  PermissionFlagsBits
} from 'discord.js';
import { prisma } from '../utils/prisma';
import { ButtonDef, MessagePayload, Ops, ProgramError, Scope } from './engine';

// Actions Discord des commandes personnalisées (blocs ET scripts passent par ici : mêmes vérifications et mêmes limites)

export interface RunContext {
  guild: Guild;
  trigger: GuildMember | null;
  channel: GuildTextBasedChannel | null;
  interaction: ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'> | null;
  ephemeral: boolean;
  replied: boolean;
  counters: { actions: number; messages: number };
}

const MAX_ACTIONS = 40;
const MAX_MESSAGES = 15;
const MAX_DATA_ROWS = 20_000;
const ID_RE = /^\d{5,25}$/;
const KEY_RE = /^[A-Za-z0-9_.-]{1,50}$/;
const BUTTON_KEY_RE = /^[a-z0-9_-]{1,40}$/;
const REASON_PREFIX = '[Commande personnalisée] ';

const STYLES: Record<ButtonDef['style'], ButtonStyle> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger
};

// Nettoie un message venant d'un script (donnée non fiable)
export function sanitizePayload(raw: unknown): MessagePayload {
  if (typeof raw === 'string') return { content: raw.slice(0, 2000) };
  if (!raw || typeof raw !== 'object') throw new ProgramError('Message invalide');
  const r = raw as any;
  const payload: MessagePayload = {};
  if (typeof r.content === 'string' && r.content) payload.content = r.content.slice(0, 2000);

  if (r.embed && typeof r.embed === 'object') {
    const e = r.embed;
    payload.embed = {
      title: typeof e.title === 'string' ? e.title.slice(0, 256) : undefined,
      description: typeof e.description === 'string' ? e.description.slice(0, 4000) : undefined,
      color: typeof e.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(e.color) ? e.color : undefined,
      footer: typeof e.footer === 'string' ? e.footer.slice(0, 200) : undefined
    };
  }

  if (Array.isArray(r.buttons)) {
    payload.buttons = r.buttons.slice(0, 5).map((b: any) => {
      const key = String(b?.key ?? '');
      if (!BUTTON_KEY_RE.test(key)) throw new ProgramError(`Identifiant de bouton invalide : « ${key} »`);
      return {
        label: String(b?.label ?? '').slice(0, 80) || 'Bouton',
        style: ['primary', 'secondary', 'success', 'danger'].includes(b?.style) ? b.style : 'primary',
        key
      };
    });
  }
  return payload;
}

function buildMessage(payload: MessagePayload) {
  const hasEmbed = !!payload.embed && !!(payload.embed.title || payload.embed.description);
  if (!payload.content && !hasEmbed) throw new ProgramError('Le message est vide');

  const body: {
    content?: string;
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<ButtonBuilder>[];
    allowedMentions: { parse: ('users')[] };
  } = {
    // Jamais de @everyone, @here ni de mention de rôle ; les mentions de membres notifient normalement
    allowedMentions: { parse: ['users'] }
  };

  if (payload.content) body.content = payload.content;
  if (hasEmbed && payload.embed) {
    const embed = new EmbedBuilder();
    if (payload.embed.title) embed.setTitle(payload.embed.title);
    if (payload.embed.description) embed.setDescription(payload.embed.description);
    if (payload.embed.color) embed.setColor(payload.embed.color as `#${string}`);
    if (payload.embed.footer) embed.setFooter({ text: payload.embed.footer });
    body.embeds = [embed];
  }
  if (payload.buttons?.length) {
    body.components = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        payload.buttons.map(b => new ButtonBuilder().setCustomId(`ca:${b.key}`).setLabel(b.label).setStyle(STYLES[b.style]))
      )
    ];
  }
  return body;
}

export function createOps(ctx: RunContext): Ops {
  const guild = ctx.guild;

  const countAction = () => {
    if (++ctx.counters.actions > MAX_ACTIONS) throw new ProgramError(`Trop d'actions Discord dans une même commande (${MAX_ACTIONS} maximum)`);
  };
  const countMessage = () => {
    if (++ctx.counters.messages > MAX_MESSAGES) throw new ProgramError(`Trop de messages envoyés par une même commande (${MAX_MESSAGES} maximum)`);
  };

  async function member(userId: string): Promise<GuildMember> {
    if (!ID_RE.test(userId)) throw new ProgramError(`Identifiant de membre invalide : « ${userId} »`);
    const found = await guild.members.fetch(userId).catch(() => null);
    if (!found) throw new ProgramError('Membre introuvable sur le serveur');
    return found;
  }

  function role(roleId: string) {
    const found = guild.roles.cache.get(roleId);
    if (!found || found.managed || found.id === guild.id) throw new ProgramError('Rôle introuvable ou impossible à gérer');
    if (!found.editable) throw new ProgramError(`Je ne peux pas gérer le rôle « ${found.name} » (il est au-dessus de mon rôle)`);
    return found;
  }

  function checkKey(key: string) {
    if (!KEY_RE.test(key)) throw new ProgramError(`Clé de mémoire invalide : « ${key} » (lettres, chiffres, . - _)`);
  }

  const scopeKey = (scope: Scope, scopeId: string) => {
    if (scope === 'user') {
      if (!ID_RE.test(scopeId)) throw new ProgramError('Identifiant de membre invalide pour la mémoire du membre');
      return scopeId;
    }
    return '';
  };

  return {
    async reply(payload) {
      if (!ctx.interaction) return; // déclencheur sans interaction (arrivée/départ) : rien à répondre
      countMessage();
      const body = buildMessage(payload);
      if (!ctx.replied) {
        ctx.replied = true;
        await ctx.interaction.editReply({ ...body, content: body.content ?? '' });
      } else {
        await ctx.interaction.followUp({ ...body, ephemeral: ctx.ephemeral });
      }
    },

    async send(channelId, payload) {
      countAction();
      countMessage();
      const channel = ID_RE.test(channelId) ? guild.channels.cache.get(channelId) : undefined;
      if (!channel || !channel.isTextBased() || !('send' in channel)) throw new ProgramError('Salon introuvable');
      const me = guild.members.me;
      if (!me || !channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
        throw new ProgramError(`Je ne peux pas écrire dans #${channel.name}`);
      }
      await channel.send(buildMessage(payload));
    },

    async dm(userId, text) {
      countAction();
      const target = await member(userId);
      try {
        await target.send({ content: text.slice(0, 2000) || '—', allowedMentions: { parse: [] } });
      } catch {
        // MP bloqués : ce n'est pas une erreur de la commande
      }
    },

    async addRole(userId, roleId) {
      countAction();
      await (await member(userId)).roles.add(role(roleId), `${REASON_PREFIX}ajout de rôle`);
    },

    async removeRole(userId, roleId) {
      countAction();
      await (await member(userId)).roles.remove(role(roleId), `${REASON_PREFIX}retrait de rôle`);
    },

    async timeout(userId, minutes, reason) {
      countAction();
      const target = await member(userId);
      if (!target.moderatable) throw new ProgramError(`Je ne peux pas exclure ${target.user.username} (rôle trop haut ou administrateur)`);
      const ms = Math.min(Math.max(Math.floor(minutes), 1), 40320) * 60_000;
      await target.timeout(ms, (REASON_PREFIX + reason).slice(0, 500));
    },

    async kick(userId, reason) {
      countAction();
      const target = await member(userId);
      if (!target.kickable) throw new ProgramError(`Je ne peux pas expulser ${target.user.username}`);
      await target.kick((REASON_PREFIX + reason).slice(0, 500));
    },

    async ban(userId, reason) {
      countAction();
      const target = await member(userId);
      if (!target.bannable) throw new ProgramError(`Je ne peux pas bannir ${target.user.username}`);
      await target.ban({ reason: (REASON_PREFIX + reason).slice(0, 500) });
    },

    async nickname(userId, nickname) {
      countAction();
      const target = await member(userId);
      if (!target.manageable) throw new ProgramError(`Je ne peux pas changer le pseudo de ${target.user.username}`);
      await target.setNickname(nickname.slice(0, 32) || null, `${REASON_PREFIX}changement de pseudo`);
    },

    async hasRole(userId, roleId) {
      if (!ID_RE.test(userId)) return false;
      const found = await guild.members.fetch(userId).catch(() => null);
      return !!found && found.roles.cache.has(roleId);
    },

    async isAdmin(userId) {
      if (!ID_RE.test(userId)) return false;
      const found = await guild.members.fetch(userId).catch(() => null);
      return !!found && found.permissions.has(PermissionFlagsBits.Administrator);
    },

    async dataGet(scope, scopeId, key) {
      checkKey(key);
      const row = await prisma.customData.findUnique({
        where: { guildId_scope_scopeId_key: { guildId: guild.id, scope, scopeId: scopeKey(scope, scopeId), key } }
      });
      return row ? row.value : null;
    },

    async dataSet(scope, scopeId, key, value) {
      checkKey(key);
      const id = { guildId: guild.id, scope, scopeId: scopeKey(scope, scopeId), key };
      const existing = await prisma.customData.findUnique({ where: { guildId_scope_scopeId_key: id } });
      if (!existing && (await prisma.customData.count({ where: { guildId: guild.id } })) >= MAX_DATA_ROWS) {
        throw new ProgramError('La mémoire du serveur est pleine');
      }
      await prisma.customData.upsert({
        where: { guildId_scope_scopeId_key: id },
        create: { ...id, value: value.slice(0, 1000) },
        update: { value: value.slice(0, 1000) }
      });
    },

    async dataDelete(scope, scopeId, key) {
      checkKey(key);
      await prisma.customData.deleteMany({ where: { guildId: guild.id, scope, scopeId: scopeKey(scope, scopeId), key } });
    }
  };
}
