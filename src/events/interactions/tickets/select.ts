import { m } from '../../../messages';
import { 
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js';

export async function handleSelect(interaction: StringSelectMenuInteraction<'cached'>) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${interaction.values[0]}`)
    .setTitle(m(interaction.guildId, "ticketSelect.1", "Création de ticket"));

  const pseudoInput = new TextInputBuilder()
    .setCustomId('pseudo')
    .setLabel('Votre pseudo')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const explanationInput = new TextInputBuilder()
    .setCustomId('explanation')
    .setLabel('Explication')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(pseudoInput);
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(explanationInput);

  modal.addComponents(firstRow, secondRow);
  await interaction.showModal(modal);
} 