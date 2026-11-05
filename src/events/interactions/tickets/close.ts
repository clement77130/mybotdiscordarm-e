import {
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ChannelType
} from 'discord.js';
import { prisma } from '../../../utils/prisma';
import { isStaff } from '../../../utils/ticketUtils';
import { closeTicket } from '../../../utils/ticketActions';
import { m } from '../../../messages';

// Retourne le ticket si l'utilisateur a le droit de le fermer (propriétaire ou staff), sinon répond et renvoie null
async function getClosableTicket(interaction: ButtonInteraction<'cached'>) {
  const ticket = await prisma.ticket.findFirst({
    where: { OR: [{ id: interaction.channelId }, { channelId: interaction.channelId }] }
  });

  if (!ticket) {
    await interaction.editReply({ content: m(interaction.guildId, "ticketClose.1", "Ce ticket n'existe pas dans la base de données.") });
    return null;
  }

  if (ticket.status === 'closed') {
    await interaction.editReply({ content: m(interaction.guildId, "ticketClose.2", "Ce ticket est déjà fermé.") });
    return null;
  }

  const allowed = ticket.userId === interaction.user.id || (await isStaff(interaction.member));
  if (!allowed) {
    await interaction.editReply({ content: m(interaction.guildId, "ticketClose.3", "Vous n'avez pas la permission de fermer ce ticket.") });
    return null;
  }

  return ticket;
}

export async function handleClose(interaction: ButtonInteraction<'cached'>) {
  await interaction.deferReply({ ephemeral: true });

  const ticket = await getClosableTicket(interaction);
  if (!ticket) return;

  const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Confirmer la fermeture').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({
    content: m(interaction.guildId, "ticketClose.4", "Êtes-vous sûr de vouloir fermer ce ticket ?"),
    components: [confirmRow]
  });
}

export async function handleCloseConfirm(interaction: ButtonInteraction<'cached'>) {
  await interaction.deferReply({ ephemeral: true });

  const ticket = await getClosableTicket(interaction);
  if (!ticket) return;

  const channel = interaction.channel as TextChannel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.editReply({ content: m(interaction.guildId, "ticketClose.5", "Ce salon n'est pas un salon de ticket valide.") });
  }

  try {
    await closeTicket(channel, ticket, interaction.user.tag);
    await interaction.editReply({ content: m(interaction.guildId, "ticketClose.6", "Le ticket a été fermé.") });
  } catch (error) {
    console.error('[ERROR] Error during ticket close:', error);
    await interaction.editReply({ content: m(interaction.guildId, "ticketClose.7", "Une erreur est survenue lors de la fermeture du ticket.") });
  }
}

export async function handleCloseCancel(interaction: ButtonInteraction<'cached'>) {
  await interaction.update({
    content: m(interaction.guildId, "ticketClose.8", "Fermeture du ticket annulée."),
    components: []
  });
}
