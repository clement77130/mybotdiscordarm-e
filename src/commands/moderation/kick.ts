import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { prisma } from '../../utils/prisma';
import { m } from '../../messages';


export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Expulser un membre')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Le membre à expulser')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('La raison de l\'expulsion')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: m(interaction.guildId, "common.guildOnly", "Cette commande doit être utilisée dans un serveur."), ephemeral: true });
  }

  const guildData = await prisma.guild.findUnique({
    where: { id: interaction.guildId }
  });

  const moderationRoles = guildData?.moderationRoles ? JSON.parse(guildData.moderationRoles) as string[] : [];
  const member = interaction.member as GuildMember;
  
  const hasPermission = member.roles.cache.some((role) => 
    moderationRoles.includes(role.id)
  );

  if (!hasPermission) {
    return interaction.reply({
      content: m(interaction.guildId, "common.noPermission", "Vous n'avez pas la permission d'utiliser cette commande."),
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason', true);
  if (!interaction.guild) {
    return interaction.reply({ content: m(interaction.guildId, "common.guildOnly", "Cette commande doit être utilisée dans un serveur."), ephemeral: true });
  }
  const memberToKick = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!memberToKick) {
    return interaction.reply({
      content: m(interaction.guildId, "common.memberNotFound", "Membre introuvable."),
      ephemeral: true
    });
  }

  if (!memberToKick.kickable) {
    return interaction.reply({
      content: m(interaction.guildId, "kick.1", "Je ne peux pas expulser ce membre."),
      ephemeral: true
    });
  }

  const kickEmbed = new EmbedBuilder()
    .setColor('#ffa500')
    .setTitle(m(interaction.guildId, "kick.2", "👢 Expulsion"))
    .setDescription(m(interaction.guildId, "kick.3", "**Membre expulsé:** {user_tag}\n**Raison:** {reason}\n**Modérateur:** {interaction_user_tag}", { user_tag: user.tag, reason, interaction_user_tag: interaction.user.tag }))
    .setTimestamp();

  await memberToKick.kick(reason);

  if (guildData?.logChannelId) {
    if (!interaction.guild) return;
    const logChannel = interaction.guild.channels.cache.get(guildData.logChannelId);
    if (logChannel?.isTextBased()) {
      await logChannel.send({ embeds: [kickEmbed] });
    }
  }

  await interaction.reply({
    content: m(interaction.guildId, "kick.4", "{user_tag} a été expulsé avec succès.", { user_tag: user.tag }),
    ephemeral: true
  });
} 