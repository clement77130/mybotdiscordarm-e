import { 
  Events, 
  ButtonInteraction, 
} from 'discord.js';
import * as ticketHandlers from './interactions/tickets';
import * as giveawayHandlers from './interactions/giveaways';
import * as robloxHandlers from './interactions/roblox';
import { handleAttendanceButton } from '../utils/events';
import { handleRosterInteraction } from '../utils/fgiRoster';
import { handleCustomButton } from '../custom/runtime';

export const name = Events.InteractionCreate;

export async function execute(interaction: ButtonInteraction<'cached'>) {
  if (!interaction.isButton()) return;

  // Boutons à identifiant dynamique : présence aux événements, assistant FGI, boutons des commandes personnalisées
  const id = interaction.customId;
  if (id.startsWith('att:')) return handleAttendanceButton(interaction);
  if (id.startsWith('fgiR:')) return handleRosterInteraction(interaction);
  if (id.startsWith('ca:')) {
    await handleCustomButton(interaction);
    return;
  }

  switch (interaction.customId) {
    case 'ticket_close':
      await ticketHandlers.handleClose(interaction);
      break;
    case 'ticket_close_confirm':
      await ticketHandlers.handleCloseConfirm(interaction);
      break;
    case 'ticket_close_cancel':
      await ticketHandlers.handleCloseCancel(interaction);
      break;
    case 'ticket_reopen':
      await ticketHandlers.handleReopen(interaction);
      break;
    case 'ticket_delete':
      await ticketHandlers.handleDelete(interaction);
      break;
    case 'giveaway_enter':
      await giveawayHandlers.handleEnter(interaction);
      break;
    case 'roblox_verify_done':
      await robloxHandlers.handleVerifyDone(interaction);
      break;
    case 'roblox_verify_cancel':
      await robloxHandlers.handleVerifyCancel(interaction);
      break;
    case 'roblox_update_roles':
      await robloxHandlers.handleUpdateRoles(interaction);
      break;
  }
} 