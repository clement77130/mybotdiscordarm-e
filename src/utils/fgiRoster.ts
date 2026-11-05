import { randomBytes } from 'crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageComponentInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  UserSelectMenuInteraction
} from 'discord.js';
import type { EventPanel } from '@prisma/client';
import { prisma } from './prisma';
import { tr } from '../messages';
import {
  EventSettings,
  buildLogEmbed,
  canWriteIn,
  closePanelMessage,
  getLogChannel,
  getResponses
} from './events';

interface Attendee {
  id: string;
  roblox: string;
  regiment: number;
}

interface Session {
  token: string;
  guildId: string;
  eventId: number;
  ownerId: string;
  answers: [string, string][];
  settings: EventSettings;
  attendees: Attendee[];
  curUser: string | null;
  curRoblox: string | null;
  curRegiment: number | null;
  busy: boolean;
}

const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 30 * 60 * 1000;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function cleanRoblox(value: string): string {
  return value.trim().replace(/^@+/, '').replace(/`/g, "'").slice(0, 50);
}

function chunkLines(lines: string[], limit = 3800): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if (current && current.length + line.length + 1 > limit) {
      chunks.push(current);
      current = '';
    }
    current += (current ? '\n' : '') + line;
  }
  if (current) chunks.push(current);
  return chunks;
}

function rosterLine(s: Session, a: Attendee, dm?: boolean): string {
  const regiment = s.settings.regiments[a.regiment]?.name ?? '?';
  const base = tr(s.guildId, 'fgi.rosterLine', { id: a.id, roblox: a.roblox, regiment });
  if (dm === undefined) return base;
  return base + tr(s.guildId, dm ? 'fgi.dmOk' : 'fgi.dmFail');
}

function render(s: Session) {
  const gid = s.guildId;
  const regiments = s.settings.regiments;

  const embed = new EmbedBuilder()
    .setTitle(tr(gid, 'fgi.title'))
    .setDescription(tr(gid, 'fgi.help'))
    .setColor(0x5865f2)
    .addFields({
      name: tr(gid, 'fgi.current'),
      value: tr(gid, 'fgi.currentValue', {
        discord: s.curUser ? `<@${s.curUser}>` : '—',
        roblox: s.curRoblox ? `\`${s.curRoblox}\`` : '—',
        regiment: s.curRegiment !== null ? regiments[s.curRegiment]?.name ?? '—' : '—'
      }),
      inline: false
    });

  if (s.attendees.length) {
    const lines = s.attendees.map(a => rosterLine(s, a));
    embed.addFields({ name: tr(gid, 'fgi.added', { count: s.attendees.length }), value: lines.join('\n').slice(-1000) || '—', inline: false });
  }

  const ready = !!s.curUser && !!s.curRoblox && s.curRegiment !== null;
  const id = (action: string) => `fgiR:${s.token}:${action}`;

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder().setCustomId(id('user')).setPlaceholder(tr(gid, 'fgi.selectUser').slice(0, 150)).setMinValues(1).setMaxValues(1)
      ),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(id('regiment'))
          .setPlaceholder(tr(gid, 'fgi.selectRegiment').slice(0, 150))
          .addOptions(regiments.map((r, i) => ({ label: r.name.slice(0, 100), value: String(i), default: s.curRegiment === i })))
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(id('roblox')).setLabel(tr(gid, 'fgi.btnRoblox').slice(0, 80)).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(id('add')).setLabel(tr(gid, 'fgi.btnAdd').slice(0, 80)).setStyle(ButtonStyle.Success).setDisabled(!ready),
        new ButtonBuilder().setCustomId(id('undo')).setLabel(tr(gid, 'fgi.btnUndo').slice(0, 80)).setStyle(ButtonStyle.Secondary).setDisabled(s.attendees.length === 0)
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(id('finish')).setLabel(tr(gid, 'fgi.btnFinish').slice(0, 80)).setStyle(ButtonStyle.Primary).setDisabled(s.attendees.length === 0),
        new ButtonBuilder().setCustomId(id('cancel')).setLabel(tr(gid, 'fgi.btnCancel').slice(0, 80)).setStyle(ButtonStyle.Danger)
      )
    ]
  };
}

// Premier écran de l'assistant, après le formulaire de fin
export async function startRoster(
  interaction: ModalSubmitInteraction<'cached'>,
  event: EventPanel,
  answers: [string, string][],
  settings: EventSettings
): Promise<void> {
  const gid = interaction.guildId;
  if (settings.regiments.length === 0) {
    await interaction.reply({ content: tr(gid, 'fgi.noRegiments'), ephemeral: true });
    return;
  }

  const session: Session = {
    token: randomBytes(5).toString('hex'),
    guildId: gid,
    eventId: event.id,
    ownerId: interaction.user.id,
    answers,
    settings,
    attendees: [],
    curUser: null,
    curRoblox: null,
    curRegiment: null,
    busy: false
  };
  sessions.set(session.token, session);
  setTimeout(() => sessions.delete(session.token), SESSION_TTL_MS).unref();

  await interaction.reply({ ...render(session), ephemeral: true });
}

type RosterInteraction = ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'> | UserSelectMenuInteraction<'cached'> | ModalSubmitInteraction<'cached'>;

export async function handleRosterInteraction(interaction: RosterInteraction): Promise<void> {
  const gid = interaction.guildId;
  const [, token, action] = interaction.customId.split(':');
  const s = sessions.get(token);

  if (!s) {
    await interaction.reply({ content: tr(gid, 'fgi.sessionExpired'), ephemeral: true });
    return;
  }
  if (interaction.user.id !== s.ownerId) {
    await interaction.reply({ content: tr(gid, 'fgi.notYours'), ephemeral: true });
    return;
  }

  // Les composants du message modifient le message ; la fenêtre de saisie du pseudo aussi (isFromMessage)
  const refresh = async () => {
    if (interaction.isModalSubmit()) {
      if (interaction.isFromMessage()) await interaction.update(render(s));
      else await interaction.reply({ ...render(s), ephemeral: true });
    } else {
      await (interaction as MessageComponentInteraction).update(render(s));
    }
  };

  switch (action) {
    case 'user': {
      const user = (interaction as UserSelectMenuInteraction).users.first();
      if (!user) return;
      if (user.bot) {
        await interaction.reply({ content: tr(gid, 'fgi.botNotAllowed'), ephemeral: true });
        return;
      }
      s.curUser = user.id;
      return refresh();
    }

    case 'regiment': {
      const index = Number((interaction as StringSelectMenuInteraction).values[0]);
      if (!Number.isInteger(index) || !s.settings.regiments[index]) return;
      s.curRegiment = index;
      return refresh();
    }

    case 'roblox': {
      const modal = new ModalBuilder().setCustomId(`fgiR:${s.token}:robloxmodal`).setTitle(tr(gid, 'fgi.robloxModal').slice(0, 45));
      const input = new TextInputBuilder()
        .setCustomId('pseudo')
        .setLabel(tr(gid, 'fgi.robloxLabel').slice(0, 45))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);
      if (s.curRoblox) input.setValue(s.curRoblox);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      await (interaction as ButtonInteraction).showModal(modal);
      return;
    }

    case 'robloxmodal': {
      s.curRoblox = cleanRoblox((interaction as ModalSubmitInteraction).fields.getTextInputValue('pseudo')) || null;
      return refresh();
    }

    case 'add': {
      if (!s.curUser || !s.curRoblox || s.curRegiment === null) {
        await interaction.reply({ content: tr(gid, 'fgi.missingFields'), ephemeral: true });
        return;
      }
      if (s.attendees.some(a => a.id === s.curUser)) {
        await interaction.reply({ content: tr(gid, 'fgi.alreadyInList'), ephemeral: true });
        return;
      }
      s.attendees.push({ id: s.curUser, roblox: s.curRoblox, regiment: s.curRegiment });
      s.curUser = null;
      s.curRoblox = null;
      s.curRegiment = null;
      return refresh();
    }

    case 'undo': {
      s.attendees.pop();
      return refresh();
    }

    case 'cancel': {
      sessions.delete(s.token);
      await (interaction as ButtonInteraction).update({ content: tr(gid, 'fgi.cancelled'), embeds: [], components: [] });
      return;
    }

    case 'finish':
      return finish(interaction as ButtonInteraction<'cached'>, s);
  }
}

async function finish(interaction: ButtonInteraction<'cached'>, s: Session): Promise<void> {
  const gid = s.guildId;
  const guild = interaction.guild;

  if (s.attendees.length === 0) {
    await interaction.reply({ content: tr(gid, 'fgi.listEmpty'), ephemeral: true });
    return;
  }
  if (s.busy) return;

  const event = await prisma.eventPanel.findFirst({ where: { id: s.eventId, guildId: gid } });
  if (!event || event.status !== 'open') {
    sessions.delete(s.token);
    await interaction.update({ content: tr(gid, 'fgi.alreadyDone'), embeds: [], components: [] });
    return;
  }

  const regiments = s.settings.regiments;
  const used = [...new Set(s.attendees.map(a => a.regiment))];
  const missing = used.filter(i => !regiments[i]?.discord || !regiments[i]?.roblox).map(i => regiments[i]?.name ?? '?');
  if (missing.length) {
    await interaction.reply({ content: tr(gid, 'fgi.missingLinks', { regiments: missing.join(', ') }), ephemeral: true });
    return;
  }

  const logChannel = getLogChannel(guild, s.settings.fgi);
  if (!logChannel) {
    await interaction.reply({ content: tr(gid, 'eventsEnd.logChannelMissing'), ephemeral: true });
    return;
  }
  if (!canWriteIn(guild, logChannel)) {
    await interaction.reply({ content: tr(gid, 'eventsEnd.logChannelPerms'), ephemeral: true });
    return;
  }

  s.busy = true;
  await interaction.update({ content: tr(gid, 'fgi.sending'), embeds: [], components: [] });

  // 1. MP à chaque présent avec les liens de son régiment
  const dmResult = new Map<string, boolean>();
  for (const a of s.attendees) {
    const regiment = regiments[a.regiment];
    const text = s.settings.dmTemplate
      .split('{membre}').join(`<@${a.id}>`)
      .split('{titre}').join(event.title)
      .split('{regiment}').join(regiment.name)
      .split('{discord}').join(regiment.discord)
      .split('{roblox}').join(regiment.roblox)
      .slice(0, 2000);

    try {
      const user = await interaction.client.users.fetch(a.id);
      await user.send({ content: text, allowedMentions: { parse: [] } });
      dmResult.set(a.id, true);
    } catch {
      dmResult.set(a.id, false);
    }
    await sleep(500);
  }

  const sent = [...dmResult.values()].filter(Boolean).length;
  const failed = s.attendees.filter(a => !dmResult.get(a.id));

  // 2. Compte rendu dans le salon de logs
  try {
    const responses = await getResponses(event.id);
    const main = buildLogEmbed(gid, event, responses, s.answers, interaction.user, s.settings)
      .addFields(
        { name: tr(gid, 'fgi.logPresent'), value: String(s.attendees.length), inline: true },
        { name: tr(gid, 'fgi.logDms'), value: `${sent}/${s.attendees.length}`, inline: true }
      );
    if (failed.length) {
      main.addFields({ name: tr(gid, 'fgi.logFailed'), value: failed.map(a => `<@${a.id}>`).join(' ').slice(0, 1000), inline: false });
    }
    await logChannel.send({ embeds: [main] });

    const chunks = chunkLines(s.attendees.map(a => rosterLine(s, a, dmResult.get(a.id))));
    for (let i = 0; i < chunks.length; i++) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(tr(gid, 'fgi.logRoster') + (i > 0 ? tr(gid, 'fgi.logRosterMore') : ''))
            .setDescription(chunks[i])
            .setColor(0x2ecc71)
        ],
        allowedMentions: { parse: [] }
      });
    }

    await prisma.eventPanel.update({ where: { id: event.id }, data: { status: 'closed' } });
    await closePanelMessage(guild, event, responses, s.settings);
  } catch (error) {
    console.error('❌ Compte rendu de la FGI impossible:', error);
    s.busy = false;
    await interaction.editReply({ content: tr(gid, 'fgi.reportFailed') });
    return;
  }

  sessions.delete(s.token);
  let summary = tr(gid, 'fgi.summary', { channel: `<#${logChannel.id}>`, sent, total: s.attendees.length });
  if (failed.length) summary += tr(gid, 'fgi.summaryFailed', { users: failed.map(a => `<@${a.id}>`).join(' ') });
  await interaction.editReply({ content: summary.slice(0, 2000) });
}
