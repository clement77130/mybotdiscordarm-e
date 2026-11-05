import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { runMemberEvent } from '../custom/runtime';

export const name = Events.GuildMemberRemove;

export async function execute(member: GuildMember | PartialGuildMember) {
  if (member.user?.bot) return;
  await runMemberEvent(member, 'memberLeave');
}
