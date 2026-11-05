// Fichier généré à partir des textes du code (ne pas modifier à la main) : clé -> texte par défaut.
// Les textes des nouvelles fonctionnalités sont déclarés dans defaults.ts.
export interface MessageDef {
  group: string;
  text: string;
  vars: string[];
  kind: string;
}

export const GENERATED_GROUPS: Record<string, string> = {
  "ban": "Modération · /ban",
  "kick": "Modération · /kick",
  "mute": "Modération · /mute",
  "unban": "Modération · /unban",
  "mod": "Modération · /mod",
  "logs": "Modération · /logs",
  "gstart": "Giveaways · /gstart",
  "greroll": "Giveaways · /greroll",
  "giveawayEnter": "Giveaways · participation",
  "invites": "Invitations · /invites",
  "leaderboard": "Invitations · /leaderboard",
  "admininvites": "Invitations · /admininvites",
  "embedcreator": "Embeds · /embed",
  "setWelcomeChannel": "Bienvenue · /setwelcome",
  "ticket": "Tickets · /ticket",
  "ticketCreate": "Tickets · création",
  "ticketClose": "Tickets · fermeture",
  "ticketReopen": "Tickets · réouverture",
  "ticketDelete": "Tickets · suppression",
  "ticketActions": "Tickets · actions",
  "ticketPanel": "Tickets · message de création",
  "ticketSelect": "Tickets · menu",
  "bind": "Roblox · /bind",
  "robloxconfig": "Roblox · /robloxconfig",
  "unverify": "Roblox · /unverify",
  "update": "Roblox · /update",
  "updateall": "Roblox · /updateall",
  "verify": "Roblox · /verify",
  "whois": "Roblox · /whois",
  "robloxVerify": "Roblox · vérification",
  "robloxUpdate": "Roblox · bouton de mise à jour",
  "guildMemberAdd": "Bienvenue · arrivée",
  "guildMemberRemove": "Départs",
  "giveaways": "Giveaways · création",
  "common": "Messages communs",
  "about": "À propos · /about",
  "execute": "Erreurs de commandes"
};

export const GENERATED_MESSAGES: Record<string, MessageDef> = {
  "guildMemberAdd.1": {
    "group": "guildMemberAdd",
    "text": "Bienvenue sur {member_guild_name}",
    "vars": [
      "member_guild_name"
    ],
    "kind": "Titre d'embed"
  },
  "guildMemberRemove.1": {
    "group": "guildMemberRemove",
    "text": "👋 Membre parti",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "giveawayEnter.1": {
    "group": "giveawayEnter",
    "text": "Ce giveaway n'existe plus.",
    "vars": [],
    "kind": "Message"
  },
  "giveawayEnter.2": {
    "group": "giveawayEnter",
    "text": "Ce giveaway est terminé.",
    "vars": [],
    "kind": "Message"
  },
  "giveawayEnter.3": {
    "group": "giveawayEnter",
    "text": "Vous ne participez plus à ce giveaway.",
    "vars": [],
    "kind": "Message"
  },
  "giveawayEnter.4": {
    "group": "giveawayEnter",
    "text": "Vous participez maintenant à ce giveaway!",
    "vars": [],
    "kind": "Message"
  },
  "giveawayEnter.5": {
    "group": "giveawayEnter",
    "text": "🏆 Gagnants",
    "vars": [],
    "kind": "Nom de champ"
  },
  "giveawayEnter.6": {
    "group": "giveawayEnter",
    "text": "⌛ Fin",
    "vars": [],
    "kind": "Nom de champ"
  },
  "giveawayEnter.7": {
    "group": "giveawayEnter",
    "text": "👥 Participants",
    "vars": [],
    "kind": "Nom de champ"
  },
  "giveawayEnter.8": {
    "group": "giveawayEnter",
    "text": "🎮 Host",
    "vars": [],
    "kind": "Nom de champ"
  },
  "ticketClose.1": {
    "group": "ticketClose",
    "text": "Ce ticket n'existe pas dans la base de données.",
    "vars": [],
    "kind": "Message"
  },
  "ticketClose.2": {
    "group": "ticketClose",
    "text": "Ce ticket est déjà fermé.",
    "vars": [],
    "kind": "Message"
  },
  "ticketClose.3": {
    "group": "ticketClose",
    "text": "Vous n'avez pas la permission de fermer ce ticket.",
    "vars": [],
    "kind": "Message"
  },
  "ticketClose.4": {
    "group": "ticketClose",
    "text": "Êtes-vous sûr de vouloir fermer ce ticket ?",
    "vars": [],
    "kind": "Message"
  },
  "ticketClose.5": {
    "group": "ticketClose",
    "text": "Ce salon n'est pas un salon de ticket valide.",
    "vars": [],
    "kind": "Message"
  },
  "ticketClose.6": {
    "group": "ticketClose",
    "text": "Le ticket a été fermé.",
    "vars": [],
    "kind": "Message"
  },
  "ticketClose.7": {
    "group": "ticketClose",
    "text": "Une erreur est survenue lors de la fermeture du ticket.",
    "vars": [],
    "kind": "Message"
  },
  "ticketClose.8": {
    "group": "ticketClose",
    "text": "Fermeture du ticket annulée.",
    "vars": [],
    "kind": "Message"
  },
  "ticketCreate.1": {
    "group": "ticketCreate",
    "text": "La catégorie des tickets n'a pas été configurée.",
    "vars": [],
    "kind": "Message"
  },
  "ticketCreate.2": {
    "group": "ticketCreate",
    "text": "La catégorie des tickets est introuvable.",
    "vars": [],
    "kind": "Message"
  },
  "ticketCreate.3": {
    "group": "ticketCreate",
    "text": "Ticket - {user_tag}",
    "vars": [
      "user_tag"
    ],
    "kind": "Titre d'embed"
  },
  "ticketCreate.4": {
    "group": "ticketCreate",
    "text": "Votre ticket a été créé: {ticketChannel}",
    "vars": [
      "ticketChannel"
    ],
    "kind": "Message"
  },
  "ticketDelete.1": {
    "group": "ticketDelete",
    "text": "Seul le staff peut supprimer un ticket.",
    "vars": [],
    "kind": "Message"
  },
  "ticketDelete.2": {
    "group": "ticketDelete",
    "text": "Ce ticket n'existe pas dans la base de données.",
    "vars": [],
    "kind": "Message"
  },
  "ticketDelete.3": {
    "group": "ticketDelete",
    "text": "Ticket Archivé",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "ticketDelete.4": {
    "group": "ticketDelete",
    "text": "Le ticket va être supprimé...",
    "vars": [],
    "kind": "Message"
  },
  "ticketDelete.5": {
    "group": "ticketDelete",
    "text": "Une erreur est survenue lors de la suppression du ticket.",
    "vars": [],
    "kind": "Message"
  },
  "ticketReopen.1": {
    "group": "ticketReopen",
    "text": "Seul le staff peut réouvrir un ticket.",
    "vars": [],
    "kind": "Message"
  },
  "ticketReopen.2": {
    "group": "ticketReopen",
    "text": "Ce ticket n'existe pas dans la base de données.",
    "vars": [],
    "kind": "Message"
  },
  "ticketReopen.3": {
    "group": "ticketReopen",
    "text": "Ce ticket est déjà ouvert.",
    "vars": [],
    "kind": "Message"
  },
  "ticketReopen.4": {
    "group": "ticketReopen",
    "text": "Ce salon n'est pas un salon de ticket valide.",
    "vars": [],
    "kind": "Message"
  },
  "ticketReopen.5": {
    "group": "ticketReopen",
    "text": "Le ticket a été réouvert.",
    "vars": [],
    "kind": "Message"
  },
  "ticketReopen.6": {
    "group": "ticketReopen",
    "text": "Une erreur est survenue lors de la réouverture du ticket.",
    "vars": [],
    "kind": "Message"
  },
  "ticketSelect.1": {
    "group": "ticketSelect",
    "text": "Création de ticket",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "execute.1": {
    "group": "execute",
    "text": "Une erreur est survenue lors de l'exécution de la commande.",
    "vars": [],
    "kind": "Message"
  },
  "robloxUpdate.1": {
    "group": "robloxUpdate",
    "text": "❌ {message}.",
    "vars": [
      "message"
    ],
    "kind": "Message"
  },
  "robloxVerify.1": {
    "group": "robloxVerify",
    "text": "❌ La vérification a expiré. Relancez `/verify`.",
    "vars": [],
    "kind": "Message"
  },
  "robloxVerify.2": {
    "group": "robloxVerify",
    "text": "❌ {message}. Réessayez dans quelques instants.",
    "vars": [
      "message"
    ],
    "kind": "Message"
  },
  "robloxVerify.3": {
    "group": "robloxVerify",
    "text": "❌ Ce compte Roblox est introuvable.",
    "vars": [],
    "kind": "Message"
  },
  "robloxVerify.4": {
    "group": "robloxVerify",
    "text": "✅ Compte vérifié",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "robloxVerify.5": {
    "group": "robloxVerify",
    "text": "Votre compte Discord est maintenant lié à **{user_name}**.",
    "vars": [
      "user_name"
    ],
    "kind": "Description d'embed"
  },
  "robloxVerify.6": {
    "group": "robloxVerify",
    "text": "Compte lié, mais la mise à jour a échoué : {message}. Utilisez /update.",
    "vars": [
      "message"
    ],
    "kind": "Pied d'embed"
  },
  "robloxVerify.7": {
    "group": "robloxVerify",
    "text": "Vérification annulée.",
    "vars": [],
    "kind": "Message"
  },
  "giveaways.1": {
    "group": "giveaways",
    "text": "🏆 Gagnants",
    "vars": [],
    "kind": "Nom de champ"
  },
  "giveaways.2": {
    "group": "giveaways",
    "text": "⌛ Fin",
    "vars": [],
    "kind": "Nom de champ"
  },
  "giveaways.3": {
    "group": "giveaways",
    "text": "👥 Participants",
    "vars": [],
    "kind": "Nom de champ"
  },
  "giveaways.4": {
    "group": "giveaways",
    "text": "🎮 Host",
    "vars": [],
    "kind": "Nom de champ"
  },
  "giveaways.5": {
    "group": "giveaways",
    "text": "Cliquez sur le bouton ci-dessous pour participer!",
    "vars": [],
    "kind": "Pied d'embed"
  },
  "ticketActions.1": {
    "group": "ticketActions",
    "text": "Ticket Fermé",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "ticketActions.2": {
    "group": "ticketActions",
    "text": "Ticket fermé par {closedByTag}",
    "vars": [
      "closedByTag"
    ],
    "kind": "Description d'embed"
  },
  "ticketActions.3": {
    "group": "ticketActions",
    "text": "Ticket Réouvert",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "ticketActions.4": {
    "group": "ticketActions",
    "text": "Ticket réouvert par {reopenedByTag}",
    "vars": [
      "reopenedByTag"
    ],
    "kind": "Description d'embed"
  },
  "ticketActions.5": {
    "group": "ticketActions",
    "text": "Ticket",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "ticketPanel.1": {
    "group": "ticketPanel",
    "text": "🎫 Création de ticket",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "ticketPanel.2": {
    "group": "ticketPanel",
    "text": "Sélectionnez une catégorie pour créer un ticket",
    "vars": [],
    "kind": "Description d'embed"
  },
  "common.guildOnly": {
    "group": "common",
    "text": "Cette commande doit être utilisée dans un serveur.",
    "vars": [],
    "kind": "Message"
  },
  "common.adminOnly": {
    "group": "common",
    "text": "Vous devez être administrateur pour utiliser cette commande.",
    "vars": [],
    "kind": "Message"
  },
  "greroll.1": {
    "group": "greroll",
    "text": "Giveaway introuvable.",
    "vars": [],
    "kind": "Message"
  },
  "greroll.2": {
    "group": "greroll",
    "text": "Ce giveaway n'est pas encore terminé.",
    "vars": [],
    "kind": "Message"
  },
  "greroll.3": {
    "group": "greroll",
    "text": "Aucun participant dans ce giveaway.",
    "vars": [],
    "kind": "Message"
  },
  "greroll.4": {
    "group": "greroll",
    "text": "🎉 Nouveaux Gagnants",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "gstart.1": {
    "group": "gstart",
    "text": "Canal introuvable.",
    "vars": [],
    "kind": "Message"
  },
  "gstart.2": {
    "group": "gstart",
    "text": "Format de durée invalide. Utilisez par exemple: 1h, 1d, 1w",
    "vars": [],
    "kind": "Message"
  },
  "gstart.3": {
    "group": "gstart",
    "text": "Le giveaway a été créé avec succès!",
    "vars": [],
    "kind": "Message"
  },
  "common.noPermission": {
    "group": "common",
    "text": "Vous n'avez pas la permission d'utiliser cette commande.",
    "vars": [],
    "kind": "Message"
  },
  "common.memberNotFound": {
    "group": "common",
    "text": "Membre introuvable.",
    "vars": [],
    "kind": "Message"
  },
  "ban.1": {
    "group": "ban",
    "text": "Je ne peux pas bannir ce membre.",
    "vars": [],
    "kind": "Message"
  },
  "ban.2": {
    "group": "ban",
    "text": "🔨 Bannissement",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "ban.3": {
    "group": "ban",
    "text": "**Membre banni:** {user_tag}\n**Raison:** {reason}\n**Modérateur:** {interaction_user_tag}",
    "vars": [
      "user_tag",
      "reason",
      "interaction_user_tag"
    ],
    "kind": "Description d'embed"
  },
  "ban.4": {
    "group": "ban",
    "text": "{user_tag} a été banni avec succès.",
    "vars": [
      "user_tag"
    ],
    "kind": "Message"
  },
  "kick.1": {
    "group": "kick",
    "text": "Je ne peux pas expulser ce membre.",
    "vars": [],
    "kind": "Message"
  },
  "kick.2": {
    "group": "kick",
    "text": "👢 Expulsion",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "kick.3": {
    "group": "kick",
    "text": "**Membre expulsé:** {user_tag}\n**Raison:** {reason}\n**Modérateur:** {interaction_user_tag}",
    "vars": [
      "user_tag",
      "reason",
      "interaction_user_tag"
    ],
    "kind": "Description d'embed"
  },
  "kick.4": {
    "group": "kick",
    "text": "{user_tag} a été expulsé avec succès.",
    "vars": [
      "user_tag"
    ],
    "kind": "Message"
  },
  "logs.1": {
    "group": "logs",
    "text": "Le salon des logs a été défini sur {channel}",
    "vars": [
      "channel"
    ],
    "kind": "Message"
  },
  "mod.1": {
    "group": "mod",
    "text": "Ce rôle est déjà un rôle de modération.",
    "vars": [],
    "kind": "Message"
  },
  "mod.2": {
    "group": "mod",
    "text": "{role_name} a été ajouté aux rôles de modération.",
    "vars": [
      "role_name"
    ],
    "kind": "Message"
  },
  "mod.3": {
    "group": "mod",
    "text": "Aucun rôle de modération n'est configuré.",
    "vars": [],
    "kind": "Message"
  },
  "mod.4": {
    "group": "mod",
    "text": "Ce rôle n'est pas un rôle de modération.",
    "vars": [],
    "kind": "Message"
  },
  "mod.5": {
    "group": "mod",
    "text": "{role_name} a été retiré des rôles de modération.",
    "vars": [
      "role_name"
    ],
    "kind": "Message"
  },
  "mod.6": {
    "group": "mod",
    "text": "Aucun rôle de modération n'est configuré.",
    "vars": [],
    "kind": "Message"
  },
  "mod.7": {
    "group": "mod",
    "text": "🛡️ Rôles de modération",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "mute.1": {
    "group": "mute",
    "text": "Format de durée invalide. Utilisez par exemple: 60s, 5m, 1h, 1d, 1w",
    "vars": [],
    "kind": "Message"
  },
  "mute.2": {
    "group": "mute",
    "text": "Je ne peux pas exclure temporairement ce membre.",
    "vars": [],
    "kind": "Message"
  },
  "mute.3": {
    "group": "mute",
    "text": "⏰ Exclusion temporaire",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "mute.4": {
    "group": "mute",
    "text": "**Membre:** {user_tag}\n**Durée:** {duration}\n**Raison:** {reason}\n**Modérateur:** {interaction_user_tag}",
    "vars": [
      "user_tag",
      "duration",
      "reason",
      "interaction_user_tag"
    ],
    "kind": "Description d'embed"
  },
  "mute.5": {
    "group": "mute",
    "text": "{user_tag} a été exclu temporairement pour {duration}.",
    "vars": [
      "user_tag",
      "duration"
    ],
    "kind": "Message"
  },
  "unban.1": {
    "group": "unban",
    "text": "Cet utilisateur n'est pas banni.",
    "vars": [],
    "kind": "Message"
  },
  "unban.2": {
    "group": "unban",
    "text": "🔓 Débannissement",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "unban.3": {
    "group": "unban",
    "text": "**Membre débanni:** {bannedUser_user_tag}\n**Modérateur:** {user_tag}",
    "vars": [
      "bannedUser_user_tag",
      "user_tag"
    ],
    "kind": "Description d'embed"
  },
  "unban.4": {
    "group": "unban",
    "text": "{bannedUser_user_tag} a été débanni avec succès.",
    "vars": [
      "bannedUser_user_tag"
    ],
    "kind": "Message"
  },
  "unban.5": {
    "group": "unban",
    "text": "Une erreur est survenue lors du débannissement.",
    "vars": [],
    "kind": "Message"
  },
  "common.error": {
    "group": "common",
    "text": "❌ Une erreur est survenue lors de l'exécution de la commande.",
    "vars": [],
    "kind": "Message"
  },
  "invites.1": {
    "group": "invites",
    "text": "📊 Statistiques d'invitations",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "invites.2": {
    "group": "invites",
    "text": "Voici les statistiques d'invitations de {targetUser}:",
    "vars": [
      "targetUser"
    ],
    "kind": "Description d'embed"
  },
  "invites.3": {
    "group": "invites",
    "text": "📥 Invitations actives",
    "vars": [],
    "kind": "Nom de champ"
  },
  "invites.4": {
    "group": "invites",
    "text": "📋 Invitations totales",
    "vars": [],
    "kind": "Nom de champ"
  },
  "invites.5": {
    "group": "invites",
    "text": "❌ Membres partis",
    "vars": [],
    "kind": "Nom de champ"
  },
  "invites.6": {
    "group": "invites",
    "text": "🤖 Comptes suspects",
    "vars": [],
    "kind": "Nom de champ"
  },
  "invites.7": {
    "group": "invites",
    "text": "🎁 Invitations bonus",
    "vars": [],
    "kind": "Nom de champ"
  },
  "leaderboard.1": {
    "group": "leaderboard",
    "text": "📊 Classement des invitations",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "leaderboard.2": {
    "group": "leaderboard",
    "text": "Aucune invitation n'a été enregistrée pour le moment.",
    "vars": [],
    "kind": "Description d'embed"
  },
  "embedcreator.1": {
    "group": "embedcreator",
    "text": "Le salon cible doit être un salon textuel.",
    "vars": [],
    "kind": "Message"
  },
  "embedcreator.2": {
    "group": "embedcreator",
    "text": "La couleur doit être au format hexadécimal (ex: #FF0000)",
    "vars": [],
    "kind": "Message"
  },
  "embedcreator.3": {
    "group": "embedcreator",
    "text": "L'embed a été envoyé dans {targetChannel}",
    "vars": [
      "targetChannel"
    ],
    "kind": "Message"
  },
  "embedcreator.4": {
    "group": "embedcreator",
    "text": "L'embed a été envoyé dans {targetChannel}",
    "vars": [
      "targetChannel"
    ],
    "kind": "Message"
  },
  "embedcreator.5": {
    "group": "embedcreator",
    "text": "Erreur lors de la lecture du JSON. Assurez-vous qu'il est valide et au bon format.\n\nPour créer un embed facilement :\n1. Allez sur https://discohook.org\n2. Créez votre embed\n3. Cliquez sur \"JSON Data\" en haut\n4. Copiez le JSON et utilisez-le avec cette commande",
    "vars": [],
    "kind": "Message"
  },
  "setWelcomeChannel.1": {
    "group": "setWelcomeChannel",
    "text": "Le salon de bienvenue a été défini sur {channel}",
    "vars": [
      "channel"
    ],
    "kind": "Message"
  },
  "ticket.1": {
    "group": "ticket",
    "text": "Vous devez sélectionner une catégorie.",
    "vars": [],
    "kind": "Message"
  },
  "ticket.2": {
    "group": "ticket",
    "text": "La catégorie des tickets a été définie sur {category_name}",
    "vars": [
      "category_name"
    ],
    "kind": "Message"
  },
  "ticket.3": {
    "group": "ticket",
    "text": "Vous devez sélectionner un salon textuel.",
    "vars": [],
    "kind": "Message"
  },
  "ticket.4": {
    "group": "ticket",
    "text": "Le message de création de ticket a été envoyé",
    "vars": [],
    "kind": "Message"
  },
  "ticket.5": {
    "group": "ticket",
    "text": "Cette commande doit être utilisée dans un ticket.",
    "vars": [],
    "kind": "Message"
  },
  "ticket.6": {
    "group": "ticket",
    "text": "Cette commande doit être utilisée dans un ticket.",
    "vars": [],
    "kind": "Message"
  },
  "ticket.7": {
    "group": "ticket",
    "text": "Vous n'avez pas la permission de gérer ce ticket.",
    "vars": [],
    "kind": "Message"
  },
  "ticket.8": {
    "group": "ticket",
    "text": "Ce ticket est déjà fermé.",
    "vars": [],
    "kind": "Message"
  },
  "ticket.9": {
    "group": "ticket",
    "text": "Ce ticket est déjà ouvert.",
    "vars": [],
    "kind": "Message"
  },
  "ticket.10": {
    "group": "ticket",
    "text": "Le ticket a été fermé.",
    "vars": [],
    "kind": "Message"
  },
  "ticket.11": {
    "group": "ticket",
    "text": "Le ticket a été réouvert.",
    "vars": [],
    "kind": "Message"
  },
  "ticket.12": {
    "group": "ticket",
    "text": "Une erreur est survenue lors de l'opération sur le ticket.",
    "vars": [],
    "kind": "Message"
  },
  "about.1": {
    "group": "about",
    "text": "📊 À propos d'Armée de Terre RBLX",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "about.2": {
    "group": "about",
    "text": "Bot multifonctionnel de l'Armée de Terre RBLX : tickets, giveaways, modération, invitations, bienvenue et liaison Roblox.",
    "vars": [],
    "kind": "Description d'embed"
  },
  "about.3": {
    "group": "about",
    "text": "👑 Créateur",
    "vars": [],
    "kind": "Nom de champ"
  },
  "about.4": {
    "group": "about",
    "text": "[xdLulux](https://discord.com/users/295515087731556362)",
    "vars": [],
    "kind": "Valeur de champ"
  },
  "about.5": {
    "group": "about",
    "text": "⚙️ Version",
    "vars": [],
    "kind": "Nom de champ"
  },
  "about.6": {
    "group": "about",
    "text": "v{botVersion}",
    "vars": [
      "botVersion"
    ],
    "kind": "Valeur de champ"
  },
  "about.7": {
    "group": "about",
    "text": "🔼 Uptime",
    "vars": [],
    "kind": "Nom de champ"
  },
  "about.8": {
    "group": "about",
    "text": "📚 Discord.js",
    "vars": [],
    "kind": "Nom de champ"
  },
  "about.9": {
    "group": "about",
    "text": "v{discordVersion}",
    "vars": [
      "discordVersion"
    ],
    "kind": "Valeur de champ"
  },
  "about.10": {
    "group": "about",
    "text": "📡 Node.js",
    "vars": [],
    "kind": "Nom de champ"
  },
  "about.11": {
    "group": "about",
    "text": "🏓 Latence API",
    "vars": [],
    "kind": "Nom de champ"
  },
  "about.12": {
    "group": "about",
    "text": "{apiPing}ms",
    "vars": [
      "apiPing"
    ],
    "kind": "Valeur de champ"
  },
  "about.13": {
    "group": "about",
    "text": "⚡ Latence Bot",
    "vars": [],
    "kind": "Nom de champ"
  },
  "about.14": {
    "group": "about",
    "text": "{botPing}ms",
    "vars": [
      "botPing"
    ],
    "kind": "Valeur de champ"
  },
  "about.15": {
    "group": "about",
    "text": "🌐 Serveurs",
    "vars": [],
    "kind": "Nom de champ"
  },
  "about.16": {
    "group": "about",
    "text": "👥 Utilisateurs",
    "vars": [],
    "kind": "Nom de champ"
  },
  "about.17": {
    "group": "about",
    "text": "💬 Commandes",
    "vars": [],
    "kind": "Nom de champ"
  },
  "about.18": {
    "group": "about",
    "text": "Tous droits réservés © 2024",
    "vars": [],
    "kind": "Pied d'embed"
  },
  "bind.1": {
    "group": "bind",
    "text": "Utilisez soit `rank`, soit `min_rank` / `max_rank`, pas les deux.",
    "vars": [],
    "kind": "Message"
  },
  "bind.2": {
    "group": "bind",
    "text": "`min_rank` doit être inférieur ou égal à `max_rank`.",
    "vars": [],
    "kind": "Message"
  },
  "bind.3": {
    "group": "bind",
    "text": "❌ {message}. Réessayez dans quelques instants.",
    "vars": [
      "message"
    ],
    "kind": "Message"
  },
  "bind.4": {
    "group": "bind",
    "text": "❌ Le groupe Roblox **{groupId}** est introuvable.",
    "vars": [
      "groupId"
    ],
    "kind": "Message"
  },
  "bind.5": {
    "group": "bind",
    "text": "❌ Rôle introuvable.",
    "vars": [],
    "kind": "Message"
  },
  "bind.6": {
    "group": "bind",
    "text": "Aucune association configurée. Utilisez `/bind group`.",
    "vars": [],
    "kind": "Message"
  },
  "bind.7": {
    "group": "bind",
    "text": "🔗 Associations Roblox",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "robloxconfig.1": {
    "group": "robloxconfig",
    "text": "✅ Modèle de pseudo défini sur `{template}`.",
    "vars": [
      "template"
    ],
    "kind": "Message"
  },
  "robloxconfig.2": {
    "group": "robloxconfig",
    "text": "✅ Groupe principal désactivé.",
    "vars": [],
    "kind": "Message"
  },
  "robloxconfig.3": {
    "group": "robloxconfig",
    "text": "❌ Le groupe Roblox **{groupId}** est introuvable.",
    "vars": [
      "groupId"
    ],
    "kind": "Message"
  },
  "robloxconfig.4": {
    "group": "robloxconfig",
    "text": "✅ Groupe principal défini sur **{group_name}**.",
    "vars": [
      "group_name"
    ],
    "kind": "Message"
  },
  "robloxconfig.5": {
    "group": "robloxconfig",
    "text": "❌ {message}.",
    "vars": [
      "message"
    ],
    "kind": "Message"
  },
  "robloxconfig.6": {
    "group": "robloxconfig",
    "text": "⚙️ Configuration Roblox",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "robloxconfig.7": {
    "group": "robloxconfig",
    "text": "Modèle de pseudo",
    "vars": [],
    "kind": "Nom de champ"
  },
  "robloxconfig.8": {
    "group": "robloxconfig",
    "text": "Groupe principal",
    "vars": [],
    "kind": "Nom de champ"
  },
  "robloxconfig.9": {
    "group": "robloxconfig",
    "text": "Mise à jour à l'arrivée",
    "vars": [],
    "kind": "Nom de champ"
  },
  "robloxconfig.10": {
    "group": "robloxconfig",
    "text": "Associations",
    "vars": [],
    "kind": "Nom de champ"
  },
  "unverify.1": {
    "group": "unverify",
    "text": "Vous n'avez pas la permission de délier un autre membre.",
    "vars": [],
    "kind": "Message"
  },
  "unverify.2": {
    "group": "unverify",
    "text": "{targetUser} n'a pas de compte Roblox lié.",
    "vars": [
      "targetUser"
    ],
    "kind": "Message"
  },
  "unverify.3": {
    "group": "unverify",
    "text": "✅ Le compte Roblox **{link_robloxUsername}** a été délié de {targetUser}.",
    "vars": [
      "link_robloxUsername",
      "targetUser"
    ],
    "kind": "Message"
  },
  "update.1": {
    "group": "update",
    "text": "Vous n'avez pas la permission de mettre à jour un autre membre.",
    "vars": [],
    "kind": "Message"
  },
  "update.2": {
    "group": "update",
    "text": "Membre introuvable sur ce serveur.",
    "vars": [],
    "kind": "Message"
  },
  "update.3": {
    "group": "update",
    "text": "❌ {message}.",
    "vars": [
      "message"
    ],
    "kind": "Message"
  },
  "updateall.1": {
    "group": "updateall",
    "text": "Une synchronisation est déjà en cours sur ce serveur.",
    "vars": [],
    "kind": "Message"
  },
  "updateall.2": {
    "group": "updateall",
    "text": "🔄 Synchronisation lancée. Cela peut prendre plusieurs minutes ; je préviendrai ici à la fin.",
    "vars": [],
    "kind": "Message"
  },
  "verify.1": {
    "group": "verify",
    "text": "Indiquez votre pseudo Roblox : `/verify username:VotrePseudo` (un code à coller dans votre profil vous sera donné).",
    "vars": [],
    "kind": "Message"
  },
  "verify.2": {
    "group": "verify",
    "text": "🔗 Vérification de votre compte Roblox",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "verify.3": {
    "group": "verify",
    "text": "❌ {message}. Réessayez dans quelques instants.",
    "vars": [
      "message"
    ],
    "kind": "Message"
  },
  "verify.4": {
    "group": "verify",
    "text": "❌ Aucun compte Roblox trouvé avec le pseudo **{username}**.",
    "vars": [
      "username"
    ],
    "kind": "Message"
  },
  "verify.5": {
    "group": "verify",
    "text": "🔗 Vérification de votre compte Roblox",
    "vars": [],
    "kind": "Titre d'embed"
  },
  "whois.1": {
    "group": "whois",
    "text": "❌ Aucun compte Roblox nommé **{robloxName}**.",
    "vars": [
      "robloxName"
    ],
    "kind": "Message"
  },
  "whois.2": {
    "group": "whois",
    "text": "{target} n'a pas de compte Roblox lié (`/verify`).",
    "vars": [
      "target"
    ],
    "kind": "Message"
  },
  "whois.3": {
    "group": "whois",
    "text": "❌ Ce compte Roblox est introuvable.",
    "vars": [],
    "kind": "Message"
  },
  "whois.4": {
    "group": "whois",
    "text": "Pseudo affiché",
    "vars": [],
    "kind": "Nom de champ"
  },
  "whois.5": {
    "group": "whois",
    "text": "ID Roblox",
    "vars": [],
    "kind": "Nom de champ"
  },
  "whois.6": {
    "group": "whois",
    "text": "⚠️ Ce compte Roblox est banni",
    "vars": [],
    "kind": "Pied d'embed"
  },
  "whois.7": {
    "group": "whois",
    "text": "❌ {message}.",
    "vars": [
      "message"
    ],
    "kind": "Message"
  }
};
