import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  GuildMember,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  User
} from 'discord.js';
import type { EventPanel } from '@prisma/client';
import { prisma } from './prisma';
import { tr } from '../messages';
import { isStaff } from './ticketUtils';
import { formatDate, formatTime, isValidZone, parseLocalDateTime, zoneLabel } from './zones';
import { parseIdList } from './robloxConfig';

export type Kind = 'event' | 'fgi';

export interface Question {
  id: string;
  label: string;
  style: 'short' | 'long';
  required: boolean;
}

export interface Regiment {
  name: string;
  discord: string;
  roblox: string;
}

export interface KindSettings {
  label: string;
  icon: string;
  roleId: string | null;
  channelId: string | null;
  logChannelId: string | null;
  ping: string;
  questions: Question[];
}

export interface EventSettings {
  timezone: string;
  lockAllowedRoles: string[];
  regiments: Regiment[];
  dmTemplate: string;
  event: KindSettings;
  fgi: KindSettings;
}

export const DEFAULT_QUESTIONS: Question[] = [
  { id: 'pax', label: 'Nombre de pax présents', style: 'short', required: true },
  { id: 'deroulement', label: "Comment ça s'est passé ?", style: 'long', required: true }
];

export const DEFAULT_DM_TEMPLATE =
  "Bonjour {membre},\n\nMerci d'avoir participé à la FGI **{titre}** !\nTu as été orienté vers le **{regiment}**.\n\n" +
  '🔗 Discord du régiment : {discord}\n🎮 Groupe Roblox du régiment : {roblox}';

export const MAX_QUESTIONS = 5;
export const MAX_REGIMENTS = 25;

// ───── Configuration ─────

export function parseQuestions(raw: string | null | undefined): Question[] {
  try {
    const parsed = JSON.parse(raw || '');
    if (!Array.isArray(parsed)) return DEFAULT_QUESTIONS;
    const list: Question[] = [];
    for (const q of parsed.slice(0, MAX_QUESTIONS)) {
      if (!q || typeof q.label !== 'string' || !q.label.trim()) continue;
      const id = typeof q.id === 'string' && /^[a-z0-9_]{1,30}$/.test(q.id) ? q.id : `q${list.length + 1}`;
      list.push({ id, label: q.label.trim().slice(0, 45), style: q.style === 'long' ? 'long' : 'short', required: q.required !== false });
    }
    return list.length ? list : DEFAULT_QUESTIONS;
  } catch {
    return DEFAULT_QUESTIONS;
  }
}

export function parseRegiments(raw: string | null | undefined): Regiment[] {
  try {
    const parsed = JSON.parse(raw || '');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(r => r && typeof r.name === 'string' && r.name.trim())
      .slice(0, MAX_REGIMENTS)
      .map(r => ({
        name: r.name.trim().slice(0, 100),
        discord: typeof r.discord === 'string' ? r.discord.trim().slice(0, 300) : '',
        roblox: typeof r.roblox === 'string' ? r.roblox.trim().slice(0, 300) : ''
      }));
  } catch {
    return [];
  }
}

export async function loadEventSettings(guildId: string): Promise<EventSettings> {
  const c = await prisma.eventConfig.findUnique({ where: { guildId } });
  return {
    timezone: c && isValidZone(c.timezone) ? c.timezone : 'Europe/Paris',
    lockAllowedRoles: parseIdList(c?.lockAllowedRoles),
    regiments: parseRegiments(c?.regiments),
    dmTemplate: c?.fgiDmTemplate?.trim() ? c.fgiDmTemplate : DEFAULT_DM_TEMPLATE,
    event: {
      label: 'Événement',
      icon: '📅',
      roleId: c?.eventRoleId ?? null,
      channelId: c?.eventChannelId ?? null,
      logChannelId: c?.eventLogChannelId ?? null,
      ping: c?.pingEvent ?? '',
      questions: parseQuestions(c?.eventEndQuestions)
    },
    fgi: {
      label: 'FGI',
      icon: '🎯',
      roleId: c?.fgiRoleId ?? null,
      channelId: c?.fgiChannelId ?? null,
      logChannelId: c?.fgiLogChannelId ?? null,
      ping: c?.pingFgi ?? '',
      questions: parseQuestions(c?.fgiEndQuestions)
    }
  };
}

// ───── Permissions ─────

// Le rôle indiqué OU n'importe quel rôle placé au-dessus dans la hiérarchie
function hasMinRole(member: GuildMember, roleId: string | null): boolean {
  if (!roleId) return false;
  const role = member.guild.roles.cache.get(roleId);
  return !!role && member.roles.highest.comparePositionTo(role) >= 0;
}

export async function canManage(member: GuildMember, ks: KindSettings): Promise<boolean> {
  return (await isStaff(member)) || hasMinRole(member, ks.roleId);
}

export async function canEnd(member: GuildMember, event: EventPanel, ks: KindSettings): Promise<boolean> {
  if (event.hostId === member.id || event.cohostId === member.id) return true;
  return canManage(member, ks);
}

// ───── Réponses ─────

const ANSWERS = [
  { key: 'present', emoji: '✅', style: ButtonStyle.Success, msg: 'events.answerPresent' },
  { key: 'pending', emoji: '⏳', style: ButtonStyle.Secondary, msg: 'events.answerPending' },
  { key: 'absent', emoji: '❌', style: ButtonStyle.Danger, msg: 'events.answerAbsent' }
] as const;

type AnswerKey = (typeof ANSWERS)[number]['key'];
export type Responses = Record<AnswerKey, string[]>;

export async function getResponses(eventId: number): Promise<Responses> {
  const result: Responses = { present: [], pending: [], absent: [] };
  const rows = await prisma.eventResponse.findMany({ where: { eventId }, orderBy: { updatedAt: 'asc' } });
  for (const row of rows) {
    if (row.answer in result) result[row.answer as AnswerKey].push(row.userId);
  }
  return result;
}

export function formatIds(ids: string[], limit = 900): string {
  if (ids.length === 0) return '—';
  const parts: string[] = [];
  let length = 0;
  for (let i = 0; i < ids.length; i++) {
    const mention = `<@${ids[i]}>`;
    if (length + mention.length + 3 > limit) {
      parts.push(`… +${ids.length - i}`);
      break;
    }
    parts.push(mention);
    length += mention.length + 3;
  }
  return parts.join(' · ');
}

const mentionOrDash = (id: string | null) => (id ? `<@${id}>` : '—');

// ───── Embeds ─────

export function buildPanelEmbed(guildId: string, event: EventPanel, responses: Responses, settings: EventSettings): EmbedBuilder {
  const ks = settings[event.kind === 'fgi' ? 'fgi' : 'event'];
  const closed = event.status === 'closed';
  const tz = settings.timezone;
  const ts = Math.floor(event.startsAt.getTime() / 1000);

  const embed = new EmbedBuilder()
    .setTitle(`${closed ? '🔒 ' : ''}${ks.icon} ${event.title}`)
    .setDescription(closed ? tr(guildId, 'events.panelClosed') : tr(guildId, 'events.explanation'))
    .setColor(closed ? 0x607d8b : 0x3498db)
    .addFields(
      {
        name: tr(guildId, 'events.fieldDate'),
        value: tr(guildId, 'events.fieldDateValue', {
          date: formatDate(event.startsAt, tz),
          time: formatTime(event.startsAt, tz),
          zone: zoneLabel(tz),
          relative: `<t:${ts}:R>`
        }),
        inline: false
      },
      { name: tr(guildId, 'events.fieldHost'), value: mentionOrDash(event.hostId), inline: true },
      { name: tr(guildId, 'events.fieldCohost'), value: mentionOrDash(event.cohostId), inline: true }
    );

  for (const a of ANSWERS) {
    const ids = responses[a.key];
    embed.addFields({ name: `${a.emoji} ${tr(guildId, a.msg)} (${ids.length})`, value: formatIds(ids), inline: false });
  }

  return embed.setFooter({ text: tr(guildId, 'events.footer', { label: ks.label, id: event.id }) });
}

export function buildStatsEmbed(guildId: string, event: EventPanel, responses: Responses, settings: EventSettings): EmbedBuilder {
  const ks = settings[event.kind === 'fgi' ? 'fgi' : 'event'];
  const total = ANSWERS.reduce((sum, a) => sum + responses[a.key].length, 0);

  const embed = new EmbedBuilder()
    .setTitle(tr(guildId, 'events.statsTitle', { title: event.title }))
    .setDescription(tr(guildId, 'events.statsTotal', { total }))
    .setColor(0x5865f2);

  for (const a of ANSWERS) {
    const ids = responses[a.key];
    embed.addFields({ name: `${a.emoji} ${tr(guildId, a.msg)} (${ids.length})`, value: formatIds(ids), inline: false });
  }

  const state = tr(guildId, event.status === 'closed' ? 'events.stateClosed' : 'events.stateOpen');
  return embed.setFooter({ text: tr(guildId, 'events.statsFooter', { label: ks.label, id: event.id, state }) });
}

export function buildLogEmbed(
  guildId: string,
  event: EventPanel,
  responses: Responses,
  answers: [string, string][],
  closer: User,
  settings: EventSettings
): EmbedBuilder {
  const ks = settings[event.kind === 'fgi' ? 'fgi' : 'event'];
  const tz = settings.timezone;

  const embed = new EmbedBuilder()
    .setTitle(tr(guildId, 'eventsEnd.logTitle', { icon: ks.icon, title: event.title }))
    .setColor(0x2ecc71)
    .setTimestamp()
    .addFields(
      {
        name: tr(guildId, 'eventsEnd.logDate'),
        value: `${formatDate(event.startsAt, tz)} à ${formatTime(event.startsAt, tz)}`,
        inline: true
      },
      { name: tr(guildId, 'events.fieldHost'), value: mentionOrDash(event.hostId), inline: true },
      { name: tr(guildId, 'events.fieldCohost'), value: mentionOrDash(event.cohostId), inline: true },
      {
        name: tr(guildId, 'eventsEnd.logButtons'),
        value: ANSWERS.map(a => `${a.emoji} ${responses[a.key].length}`).join(' · '),
        inline: false
      }
    );

  for (const [label, value] of answers) {
    embed.addFields({ name: label.slice(0, 256), value: (value || '—').slice(0, 1024), inline: false });
  }

  return embed.setFooter({ text: tr(guildId, 'eventsEnd.logFooter', { label: ks.label, id: event.id, closer: closer.username }) });
}

export function buildButtons(guildId: string, eventId: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ANSWERS.map(a =>
      new ButtonBuilder()
        .setCustomId(`att:${eventId}:${a.key}`)
        .setLabel(tr(guildId, a.msg).slice(0, 80))
        .setEmoji(a.emoji)
        .setStyle(a.style)
    )
  );
}

// ───── Création d'un panel ─────

function buildPing(ks: KindSettings, host: User, cohost: User | null) {
  const parts: string[] = [];
  const roles: string[] = [];
  let everyone = false;
  const raw = ks.ping.trim();

  if (/^@?everyone$/i.test(raw)) {
    parts.push('@everyone');
    everyone = true;
  } else if (/^@?here$/i.test(raw)) {
    parts.push('@here');
    everyone = true;
  } else if (/^\d{5,25}$/.test(raw)) {
    parts.push(`<@&${raw}>`);
    roles.push(raw);
  }

  const users = [host.id, ...(cohost ? [cohost.id] : [])];
  parts.push(...users.map(id => `<@${id}>`));

  const parse: 'everyone'[] = everyone ? ['everyone'] : [];
  return {
    content: parts.join(' ') || undefined,
    allowedMentions: { parse, roles, users }
  };
}

export async function createPanel(interaction: ChatInputCommandInteraction<'cached'>, kind: Kind): Promise<void> {
  const guild = interaction.guild;
  const gid = guild.id;
  const settings = await loadEventSettings(gid);
  const ks = settings[kind];

  if (!(await canManage(interaction.member, ks))) {
    await interaction.reply({ content: tr(gid, 'events.noPermission'), ephemeral: true });
    return;
  }

  const title = interaction.options.getString('titre', true).trim();
  const start = parseLocalDateTime(interaction.options.getString('date', true), interaction.options.getString('heure', true), settings.timezone);
  if (!start) {
    await interaction.reply({ content: tr(gid, 'events.dateInvalid'), ephemeral: true });
    return;
  }
  if (start.getTime() <= Date.now()) {
    await interaction.reply({ content: tr(gid, 'events.datePast'), ephemeral: true });
    return;
  }

  const channel = ks.channelId ? guild.channels.cache.get(ks.channelId) : null;
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: tr(gid, 'events.channelMissing'), ephemeral: true });
    return;
  }
  const perms = guild.members.me ? channel.permissionsFor(guild.members.me) : null;
  if (!perms?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
    await interaction.reply({ content: tr(gid, 'events.channelPerms', { channel: `<#${channel.id}>` }), ephemeral: true });
    return;
  }

  const host = interaction.options.getUser('host', true);
  const cohost = interaction.options.getUser('cohost');

  await interaction.deferReply({ ephemeral: true });

  const event = await prisma.eventPanel.create({
    data: {
      guildId: gid,
      kind,
      title,
      startsAt: start,
      hostId: host.id,
      cohostId: cohost?.id ?? null,
      creatorId: interaction.user.id,
      channelId: channel.id
    }
  });

  const ping = buildPing(ks, host, cohost);
  try {
    const message = await (channel as TextChannel).send({
      content: ping.content,
      embeds: [buildPanelEmbed(gid, event, await getResponses(event.id), settings)],
      components: [buildButtons(gid, event.id)],
      allowedMentions: ping.allowedMentions
    });
    await prisma.eventPanel.update({ where: { id: event.id }, data: { messageId: message.id } });
    await interaction.editReply({
      content: tr(gid, 'events.published', { label: ks.label, channel: `<#${channel.id}>`, link: message.url })
    });
  } catch (error) {
    console.error('❌ Envoi du panel impossible:', error);
    await prisma.eventPanel.delete({ where: { id: event.id } }).catch(() => {});
    await interaction.editReply({ content: tr(gid, 'events.sendFailed', { channel: `<#${channel.id}>` }) });
  }
}

// ───── Boutons de présence ─────

export async function handleAttendanceButton(interaction: ButtonInteraction<'cached'>): Promise<void> {
  const gid = interaction.guildId;
  const [, idText, answer] = interaction.customId.split(':');
  const eventId = Number(idText);

  const event = Number.isInteger(eventId) ? await prisma.eventPanel.findFirst({ where: { id: eventId, guildId: gid } }) : null;
  if (!event || !ANSWERS.some(a => a.key === answer)) {
    await interaction.reply({ content: tr(gid, 'events.buttonNotFound'), ephemeral: true });
    return;
  }
  if (event.status !== 'open') {
    await interaction.reply({ content: tr(gid, 'events.buttonClosed'), ephemeral: true });
    return;
  }

  await prisma.eventResponse.upsert({
    where: { eventId_userId: { eventId, userId: interaction.user.id } },
    create: { eventId, userId: interaction.user.id, answer },
    update: { answer, updatedAt: new Date() }
  });

  const settings = await loadEventSettings(gid);
  await interaction.update({ embeds: [buildPanelEmbed(gid, event, await getResponses(eventId), settings)] });
}

// ───── Statistiques ─────

export async function sendStats(interaction: ChatInputCommandInteraction<'cached'>, kind: Kind): Promise<void> {
  const gid = interaction.guildId;
  const settings = await loadEventSettings(gid);
  const ks = settings[kind];

  if (!(await canManage(interaction.member, ks))) {
    await interaction.reply({ content: tr(gid, 'events.noPermission'), ephemeral: true });
    return;
  }

  const event = await prisma.eventPanel.findFirst({ where: { id: interaction.options.getInteger('evenement', true), guildId: gid, kind } });
  if (!event) {
    await interaction.reply({ content: tr(gid, 'events.notFound', { label: ks.label }), ephemeral: true });
    return;
  }

  await interaction.reply({ embeds: [buildStatsEmbed(gid, event, await getResponses(event.id), settings)], ephemeral: true });
}

// ───── Autocomplétion ─────

export async function autocompleteEvents(interaction: AutocompleteInteraction, kind: Kind, openOnly: boolean): Promise<void> {
  if (!interaction.guildId) return;
  const settings = await loadEventSettings(interaction.guildId);
  const events = await prisma.eventPanel.findMany({
    where: { guildId: interaction.guildId, kind, ...(openOnly ? { status: 'open' } : {}) },
    orderBy: { id: 'desc' },
    take: 50
  });

  const typed = interaction.options.getFocused().toLowerCase();
  const choices = events
    .map(e => ({
      name: `#${e.id} · ${e.title.slice(0, 55)} · ${formatDate(e.startsAt, settings.timezone).slice(0, 5)} ${formatTime(e.startsAt, settings.timezone)}`.slice(0, 100),
      value: e.id
    }))
    .filter(c => c.name.toLowerCase().includes(typed))
    .slice(0, 25);

  await interaction.respond(choices);
}

// ───── Fin d'un événement ─────

export function getLogChannel(guild: Guild, ks: KindSettings): TextChannel | null {
  const channel = ks.logChannelId ? guild.channels.cache.get(ks.logChannelId) : null;
  return channel && channel.type === ChannelType.GuildText ? (channel as TextChannel) : null;
}

export function canWriteIn(guild: Guild, channel: TextChannel): boolean {
  const me = guild.members.me;
  return !!me && !!channel.permissionsFor(me)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]);
}

// Commande /event_fin et /fgi_fin : contrôles puis formulaire de fin
export async function startEnd(interaction: ChatInputCommandInteraction<'cached'>, kind: Kind): Promise<void> {
  const gid = interaction.guildId;
  const settings = await loadEventSettings(gid);
  const ks = settings[kind];

  const event = await prisma.eventPanel.findFirst({ where: { id: interaction.options.getInteger('evenement', true), guildId: gid, kind } });
  if (!event) {
    await interaction.reply({ content: tr(gid, 'events.notFound', { label: ks.label }), ephemeral: true });
    return;
  }
  if (!(await canEnd(interaction.member, event, ks))) {
    await interaction.reply({ content: tr(gid, 'eventsEnd.cannotEnd'), ephemeral: true });
    return;
  }
  if (event.status !== 'open') {
    await interaction.reply({ content: tr(gid, 'eventsEnd.alreadyClosed'), ephemeral: true });
    return;
  }
  const logChannel = getLogChannel(interaction.guild, ks);
  if (!logChannel) {
    await interaction.reply({ content: tr(gid, 'eventsEnd.logChannelMissing'), ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`evtend:${kind}:${event.id}`)
    .setTitle(tr(gid, kind === 'fgi' ? 'eventsEnd.modalFgi' : 'eventsEnd.modalEvent').slice(0, 45));

  for (const q of ks.questions) {
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(q.id)
          .setLabel(q.label)
          .setStyle(q.style === 'long' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(q.required)
          .setMaxLength(q.style === 'long' ? 1000 : 200)
      )
    );
  }

  await interaction.showModal(modal);
}

// Grise le panel d'origine et retire les boutons
export async function closePanelMessage(guild: Guild, event: EventPanel, responses: Responses, settings: EventSettings): Promise<void> {
  const channel = event.channelId ? guild.channels.cache.get(event.channelId) : null;
  if (!channel || channel.type !== ChannelType.GuildText || !event.messageId) return;
  try {
    const message = await (channel as TextChannel).messages.fetch(event.messageId);
    await message.edit({ embeds: [buildPanelEmbed(guild.id, { ...event, status: 'closed' }, responses, settings)], components: [] });
  } catch {
    console.warn(`⚠️ Impossible de modifier le panel de l'événement #${event.id}`);
  }
}

// Formulaire de fin envoyé : pour un événement on termine tout de suite, pour une FGI on lance l'assistant des présents
export async function handleEndModal(interaction: ModalSubmitInteraction<'cached'>): Promise<void> {
  const gid = interaction.guildId;
  const [, kindText, idText] = interaction.customId.split(':');
  const kind: Kind = kindText === 'fgi' ? 'fgi' : 'event';

  const settings = await loadEventSettings(gid);
  const ks = settings[kind];
  const event = await prisma.eventPanel.findFirst({ where: { id: Number(idText), guildId: gid, kind } });

  if (!event || event.status !== 'open') {
    await interaction.reply({ content: tr(gid, 'eventsEnd.alreadyClosed'), ephemeral: true });
    return;
  }
  if (!(await canEnd(interaction.member, event, ks))) {
    await interaction.reply({ content: tr(gid, 'eventsEnd.cannotEnd'), ephemeral: true });
    return;
  }

  const answers: [string, string][] = ks.questions.map(q => {
    let value = '';
    try {
      value = interaction.fields.getTextInputValue(q.id);
    } catch {
      // question ajoutée/retirée entre-temps
    }
    return [q.label, value || '—'];
  });

  if (kind === 'fgi') {
    const { startRoster } = await import('./fgiRoster');
    await startRoster(interaction, event, answers, settings);
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const logChannel = getLogChannel(interaction.guild, ks);
  if (!logChannel) {
    await interaction.editReply({ content: tr(gid, 'eventsEnd.logChannelMissing') });
    return;
  }
  if (!canWriteIn(interaction.guild, logChannel)) {
    await interaction.editReply({ content: tr(gid, 'eventsEnd.logChannelPerms') });
    return;
  }

  const responses = await getResponses(event.id);
  await logChannel.send({ embeds: [buildLogEmbed(gid, event, responses, answers, interaction.user, settings)] });
  await prisma.eventPanel.update({ where: { id: event.id }, data: { status: 'closed' } });
  await closePanelMessage(interaction.guild, event, responses, settings);

  await interaction.editReply({ content: tr(gid, 'eventsEnd.closed', { label: ks.label, channel: `<#${logChannel.id}>` }) });
}
