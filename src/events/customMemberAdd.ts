import { Events, GuildMember } from 'discord.js';
import { runMemberEvent } from '../custom/runtime';

export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember) {
  if (member.user.bot) return;
  await runMemberEvent(member, 'memberJoin');
}
