import { ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';
import { m, tr } from '../../messages';
import { isStaff } from '../../utils/ticketUtils';
import { loadEventSettings } from '../../utils/events';
import { MAX_LOCK_MS, isLockedOutsideBot, lockChannel, parseDuration } from '../../utils/lock';
import { prisma } from '../../utils/prisma';

export const data = new SlashCommandBuilder()
  .setName('lock')
  .setDescription('Verrouiller un salon (seuls les rôles autorisés peuvent écrire)')
  .addStringOption(o => o.setName('duree').setDescription('Durée : 30m, 2h, 1j… (vide = jusqu\'au /unlock)').setMaxLength(10))
  .addStringOption(o => o.setName('raison').setDescription('Raison affichée dans le salon').setMaxLength(300))
  .addChannelOption(o => o.setName('salon').setDescription('Salon à verrouiller (par défaut : celui-ci)').addChannelTypes(ChannelType.GuildText))
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: m(interaction.guildId, 'common.guildOnly', 'Cette commande doit être utilisée dans un serveur.'), ephemeral: true });
  }
  const gid = interaction.guildId;

  if (!(await isStaff(interaction.member))) {
    return interaction.reply({ content: m(gid, 'common.noPermission', "Vous n'avez pas la permission d'utiliser cette commande."), ephemeral: true });
  }

  const target = interaction.options.getChannel('salon') ?? interaction.channel;
  if (!target || target.type !== ChannelType.GuildText) {
    return interaction.reply({ content: tr(gid, 'lock.notText'), ephemeral: true });
  }
  const channel = target as TextChannel;
  const mention = `<#${channel.id}>`;

  let until: Date | null = null;
  const durationText = interaction.options.getString('duree');
  if (durationText) {
    const ms = parseDuration(durationText);
    if (ms === null || ms <= 0) return interaction.reply({ content: tr(gid, 'lock.durationInvalid'), ephemeral: true });
    if (ms > MAX_LOCK_MS) return interaction.reply({ content: tr(gid, 'lock.durationMax'), ephemeral: true });
    until = new Date(Date.now() + ms);
  }

  const alreadyLocked = (await prisma.channelLock.findUnique({ where: { channelId: channel.id } })) || (await isLockedOutsideBot(channel));
  if (alreadyLocked) return interaction.reply({ content: tr(gid, 'lock.alreadyLocked', { channel: mention }), ephemeral: true });

  const me = interaction.guild.members.me;
  const perms = me ? channel.permissionsFor(me) : null;
  if (!perms?.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages])) {
    return interaction.reply({ content: tr(gid, 'lock.noPerms'), ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const settings = await loadEventSettings(gid);
  try {
    await lockChannel(channel, interaction.user.id, until, interaction.options.getString('raison'), settings.lockAllowedRoles);
  } catch (error) {
    console.error('❌ Verrouillage impossible:', error);
    await prisma.channelLock.deleteMany({ where: { channelId: channel.id } });
    return interaction.editReply({ content: tr(gid, 'lock.noPerms') });
  }

  const suffix = until ? ` jusqu'à <t:${Math.floor(until.getTime() / 1000)}:F>` : '';
  const note = settings.lockAllowedRoles.length === 0 ? tr(gid, 'lock.noRoles') : '';
  await interaction.editReply({ content: tr(gid, 'lock.done', { channel: mention, suffix, note }) });
}
