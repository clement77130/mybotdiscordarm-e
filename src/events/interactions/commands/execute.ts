import { CommandInteraction } from 'discord.js';
import { m } from '../../../messages';

export async function handleCommand(interaction: CommandInteraction<'cached'>) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const errorMessage = {
      content: m(interaction.guildId, "execute.1", "Une erreur est survenue lors de l'exécution de la commande."),
      ephemeral: true
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
} 