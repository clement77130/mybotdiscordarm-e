import { Guild, PermissionFlagsBits, PermissionOverwrites, TextChannel } from 'discord.js';
import { prisma } from './prisma';
import { tr } from '../messages';

const SEND = PermissionFlagsBits.SendMessages;
const THREADS = PermissionFlagsBits.SendMessagesInThreads;
const MAX_LOCK_MS = 30 * 24 * 60 * 60 * 1000;

// État d'un droit dans un overwrite : 1 = autorisé, 0 = refusé, null = hérité
type Tri = 1 | 0 | null;

function tri(overwrite: PermissionOverwrites | undefined, flag: bigint): Tri {
  if (!overwrite) return null;
  if (overwrite.allow.has(flag)) return 1;
  if (overwrite.deny.has(flag)) return 0;
  return null;
}

const toPerm = (value: Tri | undefined): boolean | null => (value === 1 ? true : value === 0 ? false : null);

// « 30m », « 2h », « 1j », « 45s » -> millisecondes ; null si le format est invalide
export function parseDuration(text: string): number | null {
  const match = /^(\d{1,6})\s*(s|m|min|h|j|d)$/i.exec(text.trim());
  if (!match) return null;
  const unit = match[2].toLowerCase();
  const factor = unit === 's' ? 1000 : unit === 'm' || unit === 'min' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return Number(match[1]) * factor;
}

export { MAX_LOCK_MS };

async function setFlags(channel: TextChannel, target: string, send: boolean | null, threads: boolean | null) {
  await channel.permissionOverwrites.edit(target, { SendMessages: send, SendMessagesInThreads: threads });
}

// Supprime l'overwrite s'il est devenu vide
async function dropIfEmpty(channel: TextChannel, target: string) {
  const overwrite = channel.permissionOverwrites.cache.get(target);
  if (overwrite && overwrite.allow.bitfield === 0n && overwrite.deny.bitfield === 0n) {
    await overwrite.delete().catch(() => {});
  }
}

export async function isLockedOutsideBot(channel: TextChannel): Promise<boolean> {
  const everyone = channel.permissionOverwrites.cache.get(channel.guild.id);
  return tri(everyone, SEND) === 0;
}

export async function lockChannel(
  channel: TextChannel,
  lockedBy: string,
  until: Date | null,
  reason: string | null,
  allowedRoleIds: string[]
): Promise<void> {
  const guild = channel.guild;
  const everyone = channel.permissionOverwrites.cache.get(guild.id);

  const prevRoles: Record<string, [Tri, Tri]> = {};
  const roles = allowedRoleIds.filter(id => guild.roles.cache.has(id));
  for (const id of roles) {
    const ow = channel.permissionOverwrites.cache.get(id);
    prevRoles[id] = [tri(ow, SEND), tri(ow, THREADS)];
  }

  await prisma.channelLock.upsert({
    where: { channelId: channel.id },
    create: {
      channelId: channel.id,
      guildId: guild.id,
      prevSend: tri(everyone, SEND),
      prevThreads: tri(everyone, THREADS),
      prevRoles: JSON.stringify(prevRoles),
      until,
      lockedBy
    },
    update: { until, lockedBy }
  });

  await setFlags(channel, guild.id, false, false);
  for (const id of roles) await setFlags(channel, id, true, true);

  let notice = until ? tr(guild.id, 'lock.noticeUntil', { ts: Math.floor(until.getTime() / 1000) }) : tr(guild.id, 'lock.notice');
  if (reason) notice += tr(guild.id, 'lock.noticeReason', { reason });
  if (roles.length) notice += tr(guild.id, 'lock.noticeRoles', { roles: roles.map(id => `<@&${id}>`).join(', ') });
  await channel.send({ content: notice.slice(0, 2000), allowedMentions: { parse: [] } }).catch(() => {});
}

export async function unlockChannel(guild: Guild, channel: TextChannel, auto: boolean): Promise<boolean> {
  const lock = await prisma.channelLock.findUnique({ where: { channelId: channel.id } });
  if (!lock) return false;

  await setFlags(channel, guild.id, toPerm(lock.prevSend as Tri), toPerm(lock.prevThreads as Tri));
  await dropIfEmpty(channel, guild.id);

  let prevRoles: Record<string, [Tri, Tri]> = {};
  try {
    prevRoles = JSON.parse(lock.prevRoles);
  } catch {
    prevRoles = {};
  }
  for (const [roleId, [send, threads]] of Object.entries(prevRoles)) {
    if (!guild.roles.cache.has(roleId)) continue;
    await setFlags(channel, roleId, toPerm(send), toPerm(threads)).catch(() => {});
    await dropIfEmpty(channel, roleId);
  }

  await prisma.channelLock.delete({ where: { channelId: channel.id } });
  await channel
    .send({ content: tr(guild.id, auto ? 'lock.autoUnlockNotice' : 'lock.unlockNotice') })
    .catch(() => {});
  return true;
}
