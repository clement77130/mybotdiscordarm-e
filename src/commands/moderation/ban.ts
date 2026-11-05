import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { prisma } from '../../utils/prisma';
import { m } from '../../messages';


export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Bannir un membre')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Le membre à bannir')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('La raison du bannissement')
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

  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason', true);
  if (!interaction.guild) {
    return interaction.reply({ content: m(interaction.guildId, "common.guildOnly", "Cette commande doit être utilisée dans un serveur."), ephemeral: true });
  }
  const memberToBan = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!memberToBan) {
    return interaction.reply({
      content: m(interaction.guildId, "common.memberNotFound", "Membre introuvable."),
      ephemeral: true
    });
  }

  if (!memberToBan.bannable) {
    return interaction.reply({
      content: m(interaction.guildId, "ban.1", "Je ne peux pas bannir ce membre."),
      ephemeral: true
    });
  }

  const banEmbed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle(m(interaction.guildId, "ban.2", "🔨 Bannissement"))
    .setDescription(m(interaction.guildId, "ban.3", "**Membre banni:** {user_tag}\n**Raison:** {reason}\n**Modérateur:** {interaction_user_tag}", { user_tag: user.tag, reason, interaction_user_tag: interaction.user.tag }))
    .setTimestamp();

  await memberToBan.ban({ reason });

  if (guildData?.logChannelId) {
    if (!interaction.guild) return;
    const logChannel = interaction.guild.channels.cache.get(guildData.logChannelId);
    if (logChannel?.isTextBased()) {
      await logChannel.send({ embeds: [banEmbed] });
    }
  }

  await interaction.reply({
    content: m(interaction.guildId, "ban.4", "{user_tag} a été banni avec succès.", { user_tag: user.tag }),
    ephemeral: true
  });
} 