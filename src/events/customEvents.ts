import { Client, Events } from 'discord.js';
import { syncAllGuildCommands } from '../custom/runtime';

export const name = Events.ClientReady;
export const once = true;

// Réenregistre les commandes créées dans le panel au démarrage
export async function execute(client: Client) {
  await syncAllGuildCommands(client);
}
