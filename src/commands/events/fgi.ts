import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { createPanel } from '../../utils/events';
import { m } from '../../messages';

export const data = new SlashCommandBuilder()
  .setName('fgi')
  .setDescription('Créer un panel de présence pour une FGI')
  .addStringOption(o => o.setName('titre').setDescription('Titre').setRequired(true).setMaxLength(100))
  .addStringOption(o => o.setName('date').setDescription('Date au format JJ/MM/AAAA').setRequired(true).setMaxLength(10))
  .addStringOption(o => o.setName('heure').setDescription('Heure au format HH:MM').setRequired(true).setMaxLength(5))
  .addUserOption(o => o.setName('host').setDescription('Host').setRequired(true))
  .addUserOption(o => o.setName('cohost').setDescription('Co-host (facultatif)'))
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: m(interaction.guildId, 'common.guildOnly', 'Cette commande doit être utilisée dans un serveur.'), ephemeral: true });
  }
  await createPanel(interaction, 'fgi');
}
