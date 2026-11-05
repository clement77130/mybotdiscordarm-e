import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { autocompleteEvents, sendStats } from '../../utils/events';
import { m } from '../../messages';

export const data = new SlashCommandBuilder()
  .setName('fgi_stats')
  .setDescription('Voir les réponses d\'une FGI')
  .addIntegerOption(o => o.setName('evenement').setDescription('FGI concerné(e)').setRequired(true).setAutocomplete(true))
  .setDMPermission(false);

export async function autocomplete(interaction: AutocompleteInteraction) {
  await autocompleteEvents(interaction, 'fgi', false);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: m(interaction.guildId, 'common.guildOnly', 'Cette commande doit être utilisée dans un serveur.'), ephemeral: true });
  }
  await sendStats(interaction, 'fgi');
}
