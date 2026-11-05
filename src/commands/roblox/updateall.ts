import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { isSyncing, syncGuild } from '../../utils/robloxSync';
import { m } from '../../messages';

export const data = new SlashCommandBuilder()
  .setName('updateall')
  .setDescription('Mettre à jour les rôles et pseudos de tous les membres selon Roblox')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: m(interaction.guildId, "common.guildOnly", "Cette commande doit être utilisée dans un serveur."), flags: MessageFlags.Ephemeral });
  }

  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: m(interaction.guildId, "common.adminOnly", "Vous devez être administrateur pour utiliser cette commande."),
      flags: MessageFlags.Ephemeral
    });
  }

  if (isSyncing(interaction.guildId)) {
    return interaction.reply({ content: m(interaction.guildId, "updateall.1", "Une synchronisation est déjà en cours sur ce serveur."), flags: MessageFlags.Ephemeral });
  }

  await interaction.reply({
    content: m(interaction.guildId, "updateall.2", "🔄 Synchronisation lancée. Cela peut prendre plusieurs minutes ; je préviendrai ici à la fin."),
    flags: MessageFlags.Ephemeral
  });

  const channel = interaction.channel;
  const userId = interaction.user.id;

  syncGuild(interaction.guild)
    .then(summary => {
      if (channel?.isSendable()) {
        return channel.send({
          content:
            `✅ <@${userId}> synchronisation terminée : ${summary.total} membres traités, ` +
            `${summary.changed} modifiés, ${summary.failed} erreurs.`,
          allowedMentions: { users: [userId] }
        });
      }
    })
    .catch(error => console.error('❌ Erreur dans /updateall:', error));
}
