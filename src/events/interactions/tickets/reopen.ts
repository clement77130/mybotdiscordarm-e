import { ButtonInteraction, TextChannel, ChannelType } from 'discord.js';
import { prisma } from '../../../utils/prisma';
import { isStaff } from '../../../utils/ticketUtils';
import { reopenTicket } from '../../../utils/ticketActions';
import { m } from '../../../messages';

export async function handleReopen(interaction: ButtonInteraction<'cached'>) {
  await interaction.deferReply({ ephemeral: true });

  // Seul le staff peut réouvrir ou supprimer un ticket fermé
  if (!(await isStaff(interaction.member))) {
    return interaction.editReply({ content: m(interaction.guildId, "ticketReopen.1", "Seul le staff peut réouvrir un ticket.") });
  }

  const ticket = await prisma.ticket.findFirst({
    where: { OR: [{ id: interaction.channelId }, { channelId: interaction.channelId }] }
  });

  if (!ticket) {
    return interaction.editReply({ content: m(interaction.guildId, "ticketReopen.2", "Ce ticket n'existe pas dans la base de données.") });
  }

  if (ticket.status === 'open') {
    return interaction.editReply({ content: m(interaction.guildId, "ticketReopen.3", "Ce ticket est déjà ouvert.") });
  }

  const channel = interaction.channel as TextChannel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.editReply({ content: m(interaction.guildId, "ticketReopen.4", "Ce salon n'est pas un salon de ticket valide.") });
  }

  try {
    await reopenTicket(channel, ticket, interaction.user.tag);
    await interaction.editReply({ content: m(interaction.guildId, "ticketReopen.5", "Le ticket a été réouvert.") });
  } catch (error) {
    console.error('[ERROR] Error during ticket reopen:', error);
    await interaction.editReply({ content: m(interaction.guildId, "ticketReopen.6", "Une erreur est survenue lors de la réouverture du ticket.") });
  }
}
