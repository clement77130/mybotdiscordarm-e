import { ChannelType, ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { m, tr } from '../../messages';
import { isStaff } from '../../utils/ticketUtils';
import { unlockChannel } from '../../utils/lock';

export const data = new SlashCommandBuilder()
  .setName('unlock')
  .setDescription('Déverrouiller un salon verrouillé avec /lock')
  .addChannelOption(o => o.setName('salon').setDescription('Salon à déverrouiller (par défaut : celui-ci)').addChannelTypes(ChannelType.GuildText))
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

  await interaction.deferReply({ ephemeral: true });

  try {
    const done = await unlockChannel(interaction.guild, channel, false);
    await interaction.editReply({ content: tr(gid, done ? 'lock.unlocked' : 'lock.notLocked', { channel: `<#${channel.id}>` }) });
  } catch (error) {
    console.error('❌ Déverrouillage impossible:', error);
    await interaction.editReply({ content: tr(gid, 'lock.noPerms') });
  }
}
