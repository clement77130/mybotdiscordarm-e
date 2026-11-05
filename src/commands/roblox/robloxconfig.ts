import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js';
import { prisma } from '../../utils/prisma';
import { getGroup, RobloxApiError } from '../../utils/roblox';
import { unverifiedRoleIds, verifiedRoleIds } from '../../utils/robloxConfig';
import { m } from '../../messages';

interface ConfigUpdate {
  nicknameTemplate?: string;
  verifiedRoles?: string;
  unverifiedRoles?: string;
  verifiedRoleId?: string | null;
  unverifiedRoleId?: string | null;
  mainGroupId?: string | null;
  autoUpdateOnJoin?: boolean;
}

export const data = new SlashCommandBuilder()
  .setName('robloxconfig')
  .setDescription('Configurer la liaison Roblox du serveur')
  .addSubcommand(sub =>
    sub
      .setName('nickname')
      .setDescription('Modèle de pseudo Discord')
      .addStringOption(o =>
        o
          .setName('template')
          .setDescription('Modèle du pseudo (variables : voir /robloxconfig view)')
          .setRequired(true)
          .setMaxLength(100)))
  .addSubcommand(sub =>
    sub
      .setName('verified-role')
      .setDescription('Rôle donné à tous les membres vérifiés (vide = désactivé)')
      .addRoleOption(o => o.setName('role').setDescription('Le rôle')))
  .addSubcommand(sub =>
    sub
      .setName('unverified-role')
      .setDescription('Rôle donné aux membres non vérifiés (vide = désactivé)')
      .addRoleOption(o => o.setName('role').setDescription('Le rôle')))
  .addSubcommand(sub =>
    sub
      .setName('main-group')
      .setDescription('Groupe Roblox utilisé pour {group-rank} (vide = désactivé)')
      .addIntegerOption(o => o.setName('group_id').setDescription('ID du groupe Roblox').setMinValue(1)))
  .addSubcommand(sub =>
    sub
      .setName('auto-update')
      .setDescription('Mettre à jour automatiquement les membres vérifiés quand ils rejoignent')
      .addBooleanOption(o => o.setName('enabled').setDescription('Activer ou désactiver').setRequired(true)))
  .addSubcommand(sub => sub.setName('view').setDescription('Voir la configuration actuelle'))
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

  const guildId = interaction.guildId;
  const subcommand = interaction.options.getSubcommand();

  const save = (update: ConfigUpdate) =>
    prisma.robloxConfig.upsert({ where: { guildId }, create: { guildId, ...update }, update });

  switch (subcommand) {
    case 'nickname': {
      const template = interaction.options.getString('template', true);
      await save({ nicknameTemplate: template });
      return interaction.reply({ content: m(interaction.guildId, "robloxconfig.1", "✅ Modèle de pseudo défini sur `{template}`.", { template }), flags: MessageFlags.Ephemeral });
    }

    case 'verified-role':
    case 'unverified-role': {
      const role = interaction.options.getRole('role');
      const list = JSON.stringify(role ? [role.id] : []);
      await save(
        subcommand === 'verified-role'
          ? { verifiedRoles: list, verifiedRoleId: null }
          : { unverifiedRoles: list, unverifiedRoleId: null }
      );
      return interaction.reply({
        content: role ? `✅ Rôle défini sur ${role}.` : '✅ Rôle désactivé.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      });
    }

    case 'main-group': {
      const groupId = interaction.options.getInteger('group_id');
      if (groupId === null) {
        await save({ mainGroupId: null });
        return interaction.reply({ content: m(interaction.guildId, "robloxconfig.2", "✅ Groupe principal désactivé."), flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const group = await getGroup(groupId);
        if (!group) return interaction.editReply({ content: m(interaction.guildId, "robloxconfig.3", "❌ Le groupe Roblox **{groupId}** est introuvable.", { groupId }) });
        await save({ mainGroupId: String(groupId) });
        return interaction.editReply({ content: m(interaction.guildId, "robloxconfig.4", "✅ Groupe principal défini sur **{group_name}**.", { group_name: group.name }) });
      } catch (error) {
        const message = error instanceof RobloxApiError ? error.message : 'Erreur inconnue';
        return interaction.editReply({ content: m(interaction.guildId, "robloxconfig.5", "❌ {message}.", { message }) });
      }
    }

    case 'auto-update': {
      const enabled = interaction.options.getBoolean('enabled', true);
      await save({ autoUpdateOnJoin: enabled });
      return interaction.reply({
        content: `✅ Mise à jour automatique à l'arrivée : **${enabled ? 'activée' : 'désactivée'}**.`,
        flags: MessageFlags.Ephemeral
      });
    }

    case 'view': {
      const [config, bindCount] = await Promise.all([
        prisma.robloxConfig.findUnique({ where: { guildId } }),
        prisma.robloxBind.count({ where: { guildId } })
      ]);

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(m(interaction.guildId, "robloxconfig.6", "⚙️ Configuration Roblox"))
        .addFields(
          { name: m(interaction.guildId, "robloxconfig.7", "Modèle de pseudo"), value: `\`${config?.nicknameTemplate ?? '{roblox-username}'}\``, inline: false },
          {
            name: 'Rôles vérifiés',
            value: verifiedRoleIds(config ?? null).map(id => `<@&${id}>`).join(', ') || 'Aucun',
            inline: true
          },
          {
            name: 'Rôles non vérifiés',
            value: unverifiedRoleIds(config ?? null).map(id => `<@&${id}>`).join(', ') || 'Aucun',
            inline: true
          },
          { name: m(interaction.guildId, "robloxconfig.8", "Groupe principal"), value: config?.mainGroupId ?? 'Aucun', inline: true },
          { name: m(interaction.guildId, "robloxconfig.9", "Mise à jour à l'arrivée"), value: (config?.autoUpdateOnJoin ?? true) ? 'Activée' : 'Désactivée', inline: true },
          { name: m(interaction.guildId, "robloxconfig.10", "Associations"), value: String(bindCount), inline: true },
          {
            name: 'Variables du pseudo',
            value: '`{roblox-username}` `{display-name}` `{discord-name}` `{roblox-id}` `{group-rank}` `{group-rank-number}`',
            inline: false
          }
        );

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    }
  }
}
