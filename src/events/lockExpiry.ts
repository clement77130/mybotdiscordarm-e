import { ChannelType, Client, Events, TextChannel } from 'discord.js';
import { prisma } from '../utils/prisma';
import { unlockChannel } from '../utils/lock';

export const name = Events.ClientReady;
export const once = true;

// Déverrouille automatiquement les salons dont la durée est écoulée (vérification toutes les 30 secondes)
export async function execute(client: Client) {
  const check = async () => {
    try {
      const due = await prisma.channelLock.findMany({ where: { until: { lte: new Date() } } });
      for (const lock of due) {
        const guild = client.guilds.cache.get(lock.guildId);
        const channel = guild?.channels.cache.get(lock.channelId);
        if (!guild || !channel || channel.type !== ChannelType.GuildText) {
          await prisma.channelLock.delete({ where: { channelId: lock.channelId } }).catch(() => {});
          continue;
        }
        try {
          await unlockChannel(guild, channel as TextChannel, true);
        } catch (error) {
          console.error(`❌ Déverrouillage automatique impossible (${lock.channelId}):`, error);
        }
      }
    } catch (error) {
      console.error('❌ Vérification des verrouillages:', error);
    }
  };

  await check();
  setInterval(check, 30_000);
}
