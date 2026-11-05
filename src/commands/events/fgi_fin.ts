import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { autocompleteEvents, startEnd } from '../../utils/events';
import { m } from '../../messages';

export const data = new SlashCommandBuilder()
  .setName('fgi_fin')
  .setDescription('Terminer une FGI et envoyer le compte rendu')
  .addIntegerOption(o => o.setName('evenement').setDescription('FGI à terminer').setRequired(true).setAutocomplete(true))
  .setDMPermission(false);

export async function autocomplete(interaction: AutocompleteInteraction) {
  await autocompleteEvents(interaction, 'fgi', true);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: m(interaction.guildId, 'common.guildOnly', 'Cette commande doit être utilisée dans un serveur.'), ephemeral: true });
  }
  await startEnd(interaction, 'fgi');
}
