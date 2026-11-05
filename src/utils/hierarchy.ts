import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { tr } from '../messages';

// Texte d'erreur si le membre visé ne peut pas être ciblé par cette commande, sinon null
export function targetProblem(interaction: ChatInputCommandInteraction<'cached'>, target: GuildMember): string | null {
  const gid = interaction.guildId;
  if (target.id === interaction.user.id) return tr(gid, 'hierarchy.self');
  if (target.id === interaction.client.user.id) return tr(gid, 'hierarchy.bot');
  if (target.id === interaction.guild.ownerId) return tr(gid, 'hierarchy.owner');

  const me = interaction.guild.members.me;
  if (me && me.roles.highest.comparePositionTo(target.roles.highest) <= 0) return tr(gid, 'hierarchy.tooLow');

  if (interaction.user.id !== interaction.guild.ownerId && interaction.member.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    return tr(gid, 'hierarchy.invokerTooLow');
  }
  return null;
}
