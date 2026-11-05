import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { m, tr } from '../../messages';
import { isStaff } from '../../utils/ticketUtils';
import { targetProblem } from '../../utils/hierarchy';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Avertir un membre (message privé)')
  .addUserOption(o => o.setName('membre').setDescription('Le membre à avertir').setRequired(true))
  .addStringOption(o => o.setName('raison').setDescription("Raison de l'avertissement").setMaxLength(500))
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

  const reason = interaction.options.getString('raison') ?? tr(gid, 'warn.noReason');
  let dmFailed = false;
  try {
    await user.send({ content: tr(gid, 'warn.dm', { server: interaction.guild.name, reason }).slice(0, 2000), allowedMentions: { parse: [] } });
  } catch {
    dmFailed = true;
  }

  const suffix = dmFailed ? tr(gid, 'warn.dmFailed') : '';
  return interaction.reply({ content: tr(gid, 'warn.done', { member: `<@${member.id}>`, suffix }), allowedMentions: { parse: [] } });
}
