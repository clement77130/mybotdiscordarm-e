import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { prisma } from '../../utils/prisma';
import { m } from '../../messages';


export const data = new SlashCommandBuilder()
  .setName('unban')
  .setDescription('Débannir un membre')
  .addStringOption(option =>
    option.setName('userid')
      .setDescription('L\'ID du membre à débannir')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

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

  const userId = interaction.options.getString('userid', true);
  if (!interaction.guild) {
    return interaction.reply({ content: m(interaction.guildId, "common.guildOnly", "Cette commande doit être utilisée dans un serveur."), ephemeral: true });
  }

  try {
    const banList = await interaction.guild.bans.fetch();
    const bannedUser = banList.find((ban: { user: { id: string } }) => ban.user.id === userId);

    if (!bannedUser) {
      return interaction.reply({
        content: m(interaction.guildId, "unban.1", "Cet utilisateur n'est pas banni."),
        ephemeral: true
      });
    }

    const unbanEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle(m(interaction.guildId, "unban.2", "🔓 Débannissement"))
      .setDescription(m(interaction.guildId, "unban.3", "**Membre débanni:** {bannedUser_user_tag}\n**Modérateur:** {user_tag}", { bannedUser_user_tag: bannedUser.user.tag, user_tag: interaction.user.tag }))
      .setTimestamp();

    await interaction.guild.members.unban(userId);

    if (guildData?.logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(guildData.logChannelId);
      if (logChannel?.isTextBased()) {
        await logChannel.send({ embeds: [unbanEmbed] });
      }
    }

    await interaction.reply({
      content: m(interaction.guildId, "unban.4", "{bannedUser_user_tag} a été débanni avec succès.", { bannedUser_user_tag: bannedUser.user.tag }),
      ephemeral: true
    });
  } catch (error) {
    await interaction.reply({
      content: m(interaction.guildId, "unban.5", "Une erreur est survenue lors du débannissement."),
      ephemeral: true
    });
  }
} 