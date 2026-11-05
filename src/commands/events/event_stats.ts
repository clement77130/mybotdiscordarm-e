import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { autocompleteEvents, sendStats } from '../../utils/events';
import { m } from '../../messages';

export const data = new SlashCommandBuilder()
  .setName('event_stats')
  .setDescription('Voir les réponses d\'un événement')
  .addIntegerOption(o => o.setName('evenement').setDescription('Événement concerné(e)').setRequired(true).setAutocomplete(true))
  .setDMPermission(false);

export async function autocomplete(interaction: AutocompleteInteraction) {
  await autocompleteEvents(interaction, 'event', false);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: m(interaction.guildId, 'common.guildOnly', 'Cette commande doit être utilisée dans un serveur.'), ephemeral: true });
  }
  await sendStats(interaction, 'event');
}
