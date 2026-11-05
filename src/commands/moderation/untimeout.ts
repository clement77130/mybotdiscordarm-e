import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { m, tr } from '../../messages';
import { isStaff } from '../../utils/ticketUtils';
import { targetProblem } from '../../utils/hierarchy';

export const data = new SlashCommandBuilder()
  .setName('untimeout')
  .setDescription("Lever l'exclusion temporaire d'un membre")
  .addUserOption(o => o.setName('membre').setDescription('Le membre').setRequired(true))
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: m(interaction.guildId, 'common.guildOnly', 'Cette commande doit être utilisée dans un serveur.'), ephemeral: true });
  }
  const gid = interaction.guildId;
  if (!(await isStaff(interaction.member))) {
    return interaction.reply({ content: m(gid, 'common.noPermission', "Vous n'avez pas la permission d'utiliser cette commande."), ephemeral: true });
  }

  const user = interaction.options.getUser('membre', true);
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) return interaction.reply({ content: m(gid, 'common.memberNotFound', 'Membre introuvable.'), ephemeral: true });

  const problem = targetProblem(interaction, member);
  if (problem) return interaction.reply({ content: problem, ephemeral: true });

  const vars = { member: `<@${member.id}>` };
  if (!member.isCommunicationDisabled()) {
    return interaction.reply({ content: tr(gid, 'untimeout.notTimedOut', vars), ephemeral: true, allowedMentions: { parse: [] } });
  }

  try {
    await member.timeout(null, `Levé par ${interaction.user.tag}`);
  } catch {
    return interaction.reply({ content: tr(gid, 'untimeout.denied'), ephemeral: true });
  }
  return interaction.reply({ content: tr(gid, 'untimeout.done', vars), allowedMentions: { parse: [] } });
}
