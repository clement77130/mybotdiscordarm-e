import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { tr } from '../../messages';

export const data = new SlashCommandBuilder().setName('ping').setDescription('Vérifier que le bot répond');

export async function execute(interaction: ChatInputCommandInteraction) {
  const latency = Math.max(0, Math.round(interaction.client.ws.ping));
  return interaction.reply({ content: tr(interaction.guildId, 'ping.pong', { latency }), ephemeral: true });
}
