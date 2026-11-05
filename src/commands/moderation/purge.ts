import { ChatInputCommandInteraction, GuildTextBasedChannel, SlashCommandBuilder } from 'discord.js';
import { m, tr } from '../../messages';
import { isStaff } from '../../utils/ticketUtils';

export const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Supprimer des messages récents du salon')
  .addIntegerOption(o => o.setName('nombre').setDescription('Nombre de messages (1 à 100)').setRequired(true).setMinValue(1).setMaxValue(100))
  .addUserOption(o => o.setName('membre').setDescription('Ne supprimer que les messages de ce membre'))
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: m(interaction.guildId, 'common.guildOnly', 'Cette commande doit être utilisée dans un serveur.'), ephemeral: true });
  }
  const gid = interaction.guildId;
  if (!(await isStaff(interaction.member))) {
    return interaction.reply({ content: m(gid, 'common.noPermission', "Vous n'avez pas la permission d'utiliser cette commande."), ephemeral: true });
  }

  const channel = interaction.channel as GuildTextBasedChannel | null;
  if (!channel || !('bulkDelete' in channel)) {
    return interaction.reply({ content: tr(gid, 'purge.badChannel'), ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const amount = interaction.options.getInteger('nombre', true);
    const user = interaction.options.getUser('membre');
    let messages = await channel.messages.fetch({ limit: amount });
    if (user) messages = messages.filter(msg => msg.author.id === user.id);
    const deleted = await channel.bulkDelete(messages, true);
    return interaction.editReply({ content: tr(gid, 'purge.done', { count: deleted.size }) });
  } catch (error) {
    console.error('❌ /purge :', error);
    return interaction.editReply({ content: tr(gid, 'purge.denied') });
  }
}
