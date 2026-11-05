import { SlashCommandBuilder, EmbedBuilder, version as discordVersion, MessageFlags } from 'discord.js';
import { m } from '../../messages';
// require() : évite l'erreur TS6059 (package.json hors de rootDir) lors de `tsc`
const { version: botVersion } = require('../../../package.json') as { version: string };

export const data = new SlashCommandBuilder()
  .setName('about')
  .setDescription('Affiche les informations sur le bot');

export async function execute(interaction: any) {
  const startTime = Date.now();
  
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  const uptimeString = `${days}j ${hours}h ${minutes}m ${seconds}s`;
  
  const apiPing = interaction.client.ws.ping <= 0 ? "< 1" : interaction.client.ws.ping;
  const botPing = Date.now() - startTime <= 0 ? "< 1" : Date.now() - startTime;

  const embed = new EmbedBuilder()
    .setColor('#FF69B4')
    .setTitle(m(interaction.guildId, "about.1", "📊 À propos d'Armée de Terre RBLX"))
    .setDescription(m(interaction.guildId, "about.2", "Bot multifonctionnel de l'Armée de Terre RBLX : tickets, giveaways, modération, invitations, bienvenue et liaison Roblox."))
    .addFields([
      { name: m(interaction.guildId, "about.3", "👑 Créateur"), value: m(interaction.guildId, "about.4", "[xdLulux](https://discord.com/users/295515087731556362)"), inline: true },
      { name: m(interaction.guildId, "about.5", "⚙️ Version"), value: m(interaction.guildId, "about.6", "v{botVersion}", { botVersion }), inline: true },
      { name: m(interaction.guildId, "about.7", "🔼 Uptime"), value: uptimeString, inline: true },
      { name: m(interaction.guildId, "about.8", "📚 Discord.js"), value: m(interaction.guildId, "about.9", "v{discordVersion}", { discordVersion }), inline: true },
      { name: m(interaction.guildId, "about.10", "📡 Node.js"), value: `${process.version}`, inline: true },
      { name: m(interaction.guildId, "about.11", "🏓 Latence API"), value: m(interaction.guildId, "about.12", "{apiPing}ms", { apiPing }), inline: true },
      { name: m(interaction.guildId, "about.13", "⚡ Latence Bot"), value: m(interaction.guildId, "about.14", "{botPing}ms", { botPing }), inline: true },
      { name: m(interaction.guildId, "about.15", "🌐 Serveurs"), value: `${interaction.client.guilds.cache.size}`, inline: true },
      // { name: m(interaction.guildId, "about.16", "👥 Utilisateurs"), value: `${interaction.client.users.cache.size}`, inline: true },
      { name: m(interaction.guildId, "about.17", "💬 Commandes"), value: `${interaction.client.commands.size}`, inline: true }
    ])
    .setTimestamp()
    .setFooter({ text: m(interaction.guildId, "about.18", "Tous droits réservés © 2024") });

  await interaction.reply({ 
    embeds: [embed], 
    flags: MessageFlags.Ephemeral 
  });
} 