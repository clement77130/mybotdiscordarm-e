import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { m, tr } from '../../messages';
import { isStaff } from '../../utils/ticketUtils';

export const data = new SlashCommandBuilder()
  .setName('role')
  .setDescription('Donner ou retirer un rôle à un membre')
  .addStringOption(o =>
    o.setName('action').setDescription('Donner ou retirer').setRequired(true).addChoices({ name: 'Donner', value: 'add' }, { name: 'Retirer', value: 'remove' })
  )
  .addUserOption(o => o.setName('membre').setDescription('Le membre').setRequired(true))
  .addRoleOption(o => o.setName('role').setDescription('Le rôle').setRequired(true))
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: m(interaction.guildId, 'common.guildOnly', 'Cette commande doit être utilisée dans un serveur.'), ephemeral: true });
  }
  const gid = interaction.guildId;
  if (!(await isStaff(interaction.member))) {
    return interaction.reply({ content: m(gid, 'common.noPermission', "Vous n'avez pas la permission d'utiliser cette commande."), ephemeral: true });
  }

  const action = interaction.options.getString('action', true);
  const user = interaction.options.getUser('membre', true);
  const roleOption = interaction.options.getRole('role', true);

  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) return interaction.reply({ content: m(gid, 'common.memberNotFound', 'Membre introuvable.'), ephemeral: true });

  const role = interaction.guild.roles.cache.get(roleOption.id);
  if (!role || role.managed || role.id === interaction.guild.id) {
    return interaction.reply({ content: tr(gid, 'role.unmanageable'), ephemeral: true });
  }

  const me = interaction.guild.members.me;
  const invokerTooLow = interaction.user.id !== interaction.guild.ownerId && role.comparePositionTo(interaction.member.roles.highest) >= 0;
  if (!me || role.comparePositionTo(me.roles.highest) >= 0 || invokerTooLow) {
    return interaction.reply({ content: tr(gid, 'role.tooHigh'), ephemeral: true });
  }

  const vars = { member: `<@${member.id}>`, role: `<@&${role.id}>` };
  try {
    if (action === 'add') {
      if (member.roles.cache.has(role.id)) return interaction.reply({ content: tr(gid, 'role.alreadyHas', vars), ephemeral: true, allowedMentions: { parse: [] } });
      await member.roles.add(role, `Ajouté par ${interaction.user.tag}`);
      return interaction.reply({ content: tr(gid, 'role.added', vars), allowedMentions: { parse: [] } });
    }
    if (!member.roles.cache.has(role.id)) return interaction.reply({ content: tr(gid, 'role.notHas', vars), ephemeral: true, allowedMentions: { parse: [] } });
    await member.roles.remove(role, `Retiré par ${interaction.user.tag}`);
    return interaction.reply({ content: tr(gid, 'role.removed', vars), allowedMentions: { parse: [] } });
  } catch (error) {
    console.error('❌ /role :', error);
    return interaction.reply({ content: tr(gid, 'role.denied'), ephemeral: true });
  }
}
