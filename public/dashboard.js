'use strict';

(function () {
  const app = document.getElementById('app');
  const toasts = document.getElementById('toasts');

  const state = { me: null, guildId: null, meta: null, page: 'overview' };
  let renderToken = 0;

  const PAGES = [
    { id: 'overview', label: 'Aperçu', icon: '🏠', group: 'Liaison Roblox' },
    { id: 'binds', label: 'Binds', icon: '🔗', group: 'Liaison Roblox' },
    { id: 'denylists', label: 'Listes de refus', icon: '⛔', group: 'Liaison Roblox' },
    { id: 'audit', label: "Journal d'audit", icon: '📜', group: 'Liaison Roblox' },
    { id: 'general', label: 'Général', icon: '⚙️', group: 'Bot' },
    { id: 'messages', label: 'Messages', icon: '📝', group: 'Bot' },
    { id: 'events', label: 'Événements & FGI', icon: '🎯', group: 'Bot' },
    { id: 'custom', label: 'Commandes perso', icon: '🧩', group: 'Bot' },
    { id: 'tickets', label: 'Tickets', icon: '🎫', group: 'Bot' },
    { id: 'giveaways', label: 'Giveaways', icon: '🎉', group: 'Bot' },
    { id: 'invites', label: 'Invitations', icon: '📨', group: 'Bot' }
  ];

  const TEMPLATE_VARS = '{roblox-username} {display-name} {smart-name} {discord-name} {discord-id} {roblox-id} {group-rank} {group-rank-number}';

  // ───── Utilitaires DOM ─────

  function append(el, children) {
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
  }

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    append(el, children);
    return el;
  }

  function toast(message, type) {
    const el = h('div', { class: 'toast ' + (type || '') }, message);
    toasts.append(el);
    setTimeout(() => el.remove(), type === 'error' ? 6000 : 3500);
  }

  async function api(method, path, body) {
    const response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'dashboard' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (response.status === 401) {
      renderLogin();
      throw new Error('Non connecté');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Erreur ' + response.status);
    return data;
  }

  // Exécute une action en affichant le résultat dans un toast
  async function run(button, action, successMessage) {
    if (button) button.disabled = true;
    try {
      const result = await action();
      if (successMessage) toast(successMessage, 'success');
      return result;
    } catch (error) {
      toast(error.message, 'error');
      return undefined;
    } finally {
      if (button) button.disabled = false;
    }
  }

  const fmtDate = iso => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

  function roleById(id) {
    return state.meta.roles.find(r => r.id === id);
  }

  function channelName(id) {
    const c = state.meta.channels.find(ch => ch.id === id);
    return c ? c.name : id;
  }

  // Remplace les mentions Discord du journal par des noms lisibles
  function readable(text) {
    return String(text)
      .replace(/<@&(\d+)>/g, (m, id) => '@' + (roleById(id) ? roleById(id).name : 'rôle'))
      .replace(/<#(\d+)>/g, (m, id) => '#' + channelName(id))
      .replace(/<@(\d+)>/g, (m, id) => '@' + id);
  }

  // ───── Composants ─────

  function card(title, desc, ...children) {
    return h('div', { class: 'card' }, h('h3', null, title), desc ? h('p', { class: 'desc' }, desc) : null, ...children);
  }

  function toggle(checked, onChange) {
    const input = h('input', { type: 'checkbox', checked: !!checked });
    input.addEventListener('change', () => onChange(input.checked));
    return h('label', { class: 'switch' }, input, h('span'));
  }

  function roleDot(role) {
    return h('span', { class: 'dot', style: role && role.color ? 'background:' + role.color : null });
  }

  function roleChips(ids) {
    return h(
      'div',
      { style: 'display:flex;flex-wrap:wrap;gap:6px' },
      ids.map(id => {
        const r = roleById(id);
        return h('span', { class: 'chip' }, roleDot(r), r ? r.name : 'rôle supprimé');
      })
    );
  }

  function roleSelect(initial, onChange) {
    let selected = [...initial];
    let query = '';
    let open = false;

    const chipsBox = h('span', { style: 'display:contents' });
    const input = h('input', { type: 'text' });
    const field = h('div', { class: 'field' }, chipsBox, input);
    const menu = h('div', { class: 'menu hidden' });
    const root = h('div', { class: 'multi' }, field, menu);

    function renderChips() {
      chipsBox.replaceChildren(
        ...selected.map(id => {
          const r = roleById(id);
          return h(
            'span',
            { class: 'chip' },
            roleDot(r),
            r ? r.name : id,
            h(
              'button',
              {
                type: 'button',
                title: 'Retirer',
                onclick: e => {
                  e.stopPropagation();
                  selected = selected.filter(x => x !== id);
                  renderChips();
                  onChange(selected);
                }
              },
              '×'
            )
          );
        })
      );
      input.placeholder = selected.length ? '' : 'Sélectionner des rôles…';
    }

    function renderMenu() {
      menu.classList.toggle('hidden', !open);
      root.classList.toggle('open', open);
      if (!open) return;

      const q = query.toLowerCase();
      const items = state.meta.roles.filter(r => !selected.includes(r.id) && r.name.toLowerCase().includes(q));
      menu.replaceChildren(
        ...(items.length
          ? items.map(r =>
              h(
                'div',
                {
                  onclick: () => {
                    selected = [...selected, r.id];
                    query = '';
                    input.value = '';
                    renderChips();
                    renderMenu();
                    onChange(selected);
                    input.focus();
                  }
                },
                roleDot(r),
                r.name,
                !r.assignable ? h('span', { class: 'warn' }, r.managed ? 'géré par une intégration' : 'au-dessus du bot') : null
              )
            )
          : [h('div', { class: 'empty' }, 'Aucun rôle')])
      );
    }

    input.addEventListener('input', () => {
      query = input.value;
      open = true;
      renderMenu();
    });
    input.addEventListener('focus', () => {
      open = true;
      renderMenu();
    });
    field.addEventListener('click', () => input.focus());

    function outside(e) {
      if (!root.isConnected) {
        document.removeEventListener('click', outside);
        return;
      }
      if (open && !root.contains(e.target)) {
        open = false;
        renderMenu();
      }
    }
    document.addEventListener('click', outside);

    renderChips();
    return root;
  }

  function channelSelect(value, type, onChange, placeholder) {
    const sel = h(
      'select',
      { class: 'input' },
      h('option', { value: '' }, placeholder || '— Aucun —'),
      ...state.meta.channels.filter(c => c.type === type).map(c => h('option', { value: c.id }, (type === 'text' ? '# ' : '📁 ') + c.name))
    );
    sel.value = value || '';
    sel.addEventListener('change', () => onChange(sel.value || null));
    return sel;
  }

  function textInput(value, onChange, props) {
    const input = h('input', Object.assign({ type: 'text', value: value || '' }, props || {}));
    input.addEventListener('input', () => onChange(input.value));
    return input;
  }

  function numberInput(value, onChange, props) {
    const input = h('input', Object.assign({ type: 'number', value: value === null || value === undefined ? '' : value }, props || {}));
    input.addEventListener('input', () => onChange(input.value));
    return input;
  }

  function empty(title, text) {
    return h('div', { class: 'empty-state' }, h('b', null, title), text || '');
  }

  function pageHeader(title, sub) {
    return h('div', null, h('h1', null, title), h('p', { class: 'sub' }, sub));
  }

  // ───── Connexion / disposition ─────

  function renderLogin() {
    app.replaceChildren(
      h(
        'div',
        { class: 'login' },
        h(
          'div',
          { class: 'box' },
          h('h1', null, 'Armée de Terre RBLX'),
          h('p', { class: 'sub' }, 'Panel de configuration du bot. Connectez-vous avec Discord pour gérer vos serveurs.'),
          h('a', { class: 'btn', href: '/dashboard/login' }, 'Se connecter avec Discord')
        )
      )
    );
  }

  function guildInitial(name) {
    const match = String(name || '').match(/[A-Za-zÀ-ÿ0-9]/);
    return match ? match[0].toUpperCase() : '?';
  }

  function renderLayout() {
    const guild = state.meta.guild;
    const guildBox = h(
      'div',
      { class: 'guild-box' },
      guild.icon ? h('img', { src: guild.icon, alt: '' }) : h('div', { class: 'ph' }, guildInitial(guild.name)),
      h('div', { class: 'guild-name' }, guild.name)
    );

    if (state.me.guilds.length > 1) {
      const select = h('select', null, ...state.me.guilds.map(g => h('option', { value: g.id }, g.name)));
      select.value = state.guildId;
      select.addEventListener('change', () => {
        location.hash = '#/' + select.value + '/' + state.page;
      });
      guildBox.append(select);
    }

    const nav = h('div', { class: 'nav' });
    let lastGroup = null;
    for (const p of PAGES) {
      if (p.group !== lastGroup) {
        nav.append(h('div', { class: 'nav-title' }, p.group));
        lastGroup = p.group;
      }
      nav.append(
        h(
          'a',
          {
            class: p.id === state.page ? 'active' : '',
            href: '#/' + state.guildId + '/' + p.id
          },
          h('span', null, p.icon),
          p.label
        )
      );
    }

    const user = state.me.user;
    const userBox = h(
      'div',
      { class: 'userbox' },
      user.avatar ? h('img', { src: user.avatar, alt: '' }) : null,
      h('div', { class: 'name' }, user.username),
      h(
        'button',
        {
          class: 'link-btn',
          onclick: async () => {
            await api('POST', '/api/logout', {}).catch(() => {});
            state.me = null;
            renderLogin();
          }
        },
        'Déconnexion'
      )
    );

    app.replaceChildren(
      h(
        'div',
        { class: 'layout' },
        h(
          'aside',
          { class: 'sidebar' },
          h('div', { class: 'brand' }, h('div', { class: 'logo' }, '🪖'), 'Armée de Terre RBLX'),
          guildBox,
          nav,
          h('div', { class: 'spacer' }),
          userBox
        ),
        h('main', { class: 'main', id: 'main' })
      )
    );
  }

  // ───── Pages : Roblox ─────

  async function pageOverview() {
    const gid = state.guildId;
    const [settings, embed, sync] = await Promise.all([
      api('GET', `/api/guilds/${gid}/roblox/settings`),
      api('GET', `/api/guilds/${gid}/roblox/embed`),
      api('GET', `/api/guilds/${gid}/roblox/sync`)
    ]);

    const form = Object.assign({}, settings);
    const saveButton = h('button', { class: 'btn' }, 'Enregistrer');
    saveButton.addEventListener('click', () =>
      run(
        saveButton,
        async () => {
          Object.assign(form, await api('PUT', `/api/guilds/${gid}/roblox/settings`, form));
        },
        'Paramètres enregistrés'
      )
    );

    const settingsCard = h(
      'div',
      { class: 'card' },
      h('h3', null, 'Paramètres du serveur'),
      h('p', { class: 'desc' }, 'Définissez le comportement de la liaison Roblox sur votre serveur.'),

      h(
        'div',
        { class: 'row', style: 'margin-top:14px' },
        h('div', { class: 'grow' }, h('b', null, "Mise à jour à l'arrivée"), h('div', { class: 'hint' }, 'Met à jour les membres déjà liés quand ils rejoignent le serveur.')),
        toggle(form.updateOnJoin, v => (form.updateOnJoin = v))
      ),

      h('label', { class: 'lbl' }, 'Rôles non vérifiés'),
      h('div', { class: 'hint', style: 'margin:-2px 0 6px' }, 'Donnés aux membres sans compte Roblox lié.'),
      roleSelect(form.unverifiedRoles, v => (form.unverifiedRoles = v)),

      h('label', { class: 'lbl' }, 'Rôles vérifiés'),
      h('div', { class: 'hint', style: 'margin:-2px 0 6px' }, 'Donnés à tous les membres dont le compte Roblox est lié.'),
      roleSelect(form.verifiedRoles, v => (form.verifiedRoles = v)),

      h('label', { class: 'lbl' }, 'Rôles persistants'),
      h('div', { class: 'hint', style: 'margin:-2px 0 6px' }, 'Ces rôles ne sont jamais retirés lors d\'une mise à jour.'),
      roleSelect(form.stickyRoles, v => (form.stickyRoles = v)),

      h('label', { class: 'lbl' }, 'Rôles bypass'),
      h('div', { class: 'hint', style: 'margin:-2px 0 6px' }, 'Les membres ayant un de ces rôles ne sont jamais modifiés (rôles ni pseudo).'),
      roleSelect(form.bypassRoles, v => (form.bypassRoles = v)),

      h('label', { class: 'lbl' }, 'Salon de logs'),
      h('div', { class: 'hint', style: 'margin:-2px 0 6px' }, 'Reçoit le journal d\'audit de la liaison Roblox.'),
      channelSelect(form.logChannelId, 'text', v => (form.logChannelId = v)),

      h(
        'div',
        { class: 'grid2' },
        h(
          'div',
          null,
          h('label', { class: 'lbl' }, 'Modèle de pseudo par défaut'),
          textInput(form.nicknameTemplate, v => (form.nicknameTemplate = v), { maxlength: '100' }),
          h('div', { class: 'hint' }, 'Utilisé quand aucun bind avec modèle ne correspond. Variables : ', h('code', null, TEMPLATE_VARS))
        ),
        h(
          'div',
          null,
          h('label', { class: 'lbl' }, 'Groupe principal (ID Roblox)'),
          textInput(form.mainGroupId || '', v => (form.mainGroupId = v.trim() || null), { placeholder: 'ex : 34870129' }),
          h('div', { class: 'hint' }, 'Sert à la variable {group-rank} du modèle par défaut.')
        )
      ),

      h(
        'div',
        { class: 'row', style: 'margin-top:16px' },
        h('div', { class: 'grow' }, h('b', null, 'Détection automatique'), h('div', { class: 'hint' }, 'Garde les membres synchronisés périodiquement (fréquence réglée dans le .env du bot).')),
        toggle(form.autoDetection, v => (form.autoDetection = v))
      ),

      h('div', { class: 'actions' }, saveButton)
    );

    return h('div', null, pageHeader('Aperçu', 'Configuration de la liaison Roblox'), settingsCard, embedCard(gid, embed), syncCard(gid, sync.running));
  }

  function embedCard(gid, initial) {
    const form = Object.assign({}, initial);

    const emb = h('div', { class: 'emb' });
    const preview = h('div', { class: 'preview' }, emb, h('div', { class: 'btns' }, h('span', null, 'Lier mon compte ↗'), h('span', { class: 'g' }, 'Mettre à jour mes rôles')));

    function renderPreview() {
      emb.style.borderLeftColor = form.color;
      emb.replaceChildren(h('b', null, form.title || '{Titre}'), form.description || '{Description}');
    }
    renderPreview();

    const colorInput = h('input', { type: 'color', value: form.color, style: 'width:60px;height:36px;padding:2px;background:var(--bg);border:1px solid var(--border);border-radius:8px' });
    colorInput.addEventListener('input', () => {
      form.color = colorInput.value;
      renderPreview();
    });

    const sendButton = h('button', { class: 'btn' }, 'Envoyer');
    sendButton.addEventListener('click', () =>
      run(
        sendButton,
        async () => {
          if (!form.channelId) throw new Error('Choisissez un salon');
          await api('POST', `/api/guilds/${gid}/roblox/embed/send`, form);
        },
        'Embed envoyé dans le salon'
      )
    );

    return card(
      'Embed de vérification',
      "Envoie un message avec les boutons « Lier mon compte » et « Mettre à jour mes rôles » dans un salon.",
      h('label', { class: 'lbl' }, 'Titre'),
      textInput(form.title, v => {
        form.title = v;
        renderPreview();
      }, { maxlength: '256' }),
      h('label', { class: 'lbl' }, 'Description'),
      (() => {
        const area = h('textarea', { maxlength: '2000' }, form.description);
        area.addEventListener('input', () => {
          form.description = area.value;
          renderPreview();
        });
        return area;
      })(),
      h('label', { class: 'lbl' }, 'Couleur'),
      colorInput,
      h('label', { class: 'lbl' }, 'Salon'),
      h('div', { class: 'hint', style: 'margin:-2px 0 6px' }, 'Le salon dans lequel envoyer le message.'),
      channelSelect(form.channelId, 'text', v => (form.channelId = v), 'Sélectionner un salon'),
      h('label', { class: 'lbl' }, 'Aperçu'),
      preview,
      h('div', { class: 'actions' }, sendButton)
    );
  }

  function syncCard(gid, running) {
    const status = h('div', { class: 'hint' }, running ? 'Synchronisation en cours…' : '');
    const button = h('button', { class: 'btn ghost' }, 'Mettre à jour tous les membres');
    let timer = null;

    function poll() {
      clearInterval(timer);
      timer = setInterval(async () => {
        if (!status.isConnected) return clearInterval(timer);
        try {
          const s = await api('GET', `/api/guilds/${gid}/roblox/sync`);
          if (!s.running) {
            clearInterval(timer);
            status.textContent = 'Terminé (le détail est dans le journal d\'audit).';
            button.disabled = false;
          }
        } catch (e) {
          clearInterval(timer);
        }
      }, 3000);
    }

    if (running) {
      button.disabled = true;
      poll();
    }

    button.addEventListener('click', async () => {
      if (!confirm('Mettre à jour les rôles et pseudos de tous les membres ? Cela peut prendre plusieurs minutes.')) return;
      const result = await run(button, () => api('POST', `/api/guilds/${gid}/roblox/sync`, {}));
      if (result) {
        button.disabled = true;
        status.textContent = 'Synchronisation en cours…';
        poll();
      }
    });

    return card('Synchronisation', 'Applique les binds à tous les membres du serveur (utile après avoir modifié des binds).', button, status);
  }

  // Binds -------------------------------------------------------------

  const BIND_TABS = [
    { id: 'rank', label: 'Rankbinds' },
    { id: 'group', label: 'Groupbinds' },
    { id: 'custom', label: 'Custombinds' },
    { id: 'asset', label: 'Assetbinds' }
  ];

  async function pageBinds() {
    const gid = state.guildId;
    const container = h('div');
    let binds = (await api('GET', `/api/guilds/${gid}/roblox/binds`)).binds;
    let groups = {};
    let tab = 'rank';
    let editing; // undefined = liste, null = création, objet = modification
    const selected = new Set();

    async function loadGroups() {
      const ids = [...new Set(binds.map(b => b.groupId).filter(Boolean))];
      groups = {};
      if (ids.length) {
        try {
          groups = (await api('GET', '/api/roblox/groups?ids=' + ids.join(','))).groups;
        } catch (e) {
          groups = {};
        }
      }
    }

    function groupCell(id) {
      const g = groups[id];
      return h(
        'div',
        { class: 'gcell' },
        g && g.icon ? h('img', { src: g.icon, alt: '' }) : h('div', { class: 'ph' }),
        h('div', null, h('div', null, g ? g.name : 'Groupe'), h('div', { class: 'hint', style: 'margin:0' }, id))
      );
    }

    function rankLabel(b) {
      if (b.rank !== null) return b.rank === 0 ? '0 (non-membre)' : String(b.rank);
      return `${b.minRank ?? 1} – ${b.maxRank ?? 255}`;
    }

    function renderList() {
      const items = binds.filter(b => b.type === tab);
      const trash = h('button', { class: 'btn danger sm', title: 'Supprimer la sélection', disabled: selected.size === 0 }, '🗑');
      trash.addEventListener('click', async () => {
        if (!confirm(`Supprimer ${selected.size} association(s) ?`)) return;
        const done = await run(trash, () => api('POST', `/api/guilds/${gid}/roblox/binds/delete`, { ids: [...selected] }), 'Associations supprimées');
        if (done) {
          binds = binds.filter(b => !selected.has(b.id));
          selected.clear();
          await loadGroups();
          renderList();
        }
      });

      const add = h('button', { class: 'btn ghost sm', title: 'Créer une association' }, '＋ Nouveau');
      add.addEventListener('click', () => {
        editing = null;
        renderForm();
      });

      const columns = {
        rank: ['Groupe', 'Rang', 'Modèle', 'Priorité', 'Rôles Discord'],
        group: ['Groupe', 'Modèle', 'Priorité', 'Rôles Discord'],
        custom: ['ID', 'Code', 'Modèle', 'Priorité', 'Rôles Discord'],
        asset: ['ID', 'Type', 'Modèle', 'Priorité', 'Rôles Discord']
      }[tab];

      const allBox = h('input', { type: 'checkbox', checked: items.length > 0 && items.every(b => selected.has(b.id)) });
      allBox.addEventListener('change', () => {
        items.forEach(b => (allBox.checked ? selected.add(b.id) : selected.delete(b.id)));
        renderList();
      });

      function cells(b) {
        const tpl = b.template ? h('span', { class: 'mono' }, b.template) : h('span', { class: 'hint' }, 'n/a');
        const roles = roleChips(b.roleIds);
        if (tab === 'rank') return [groupCell(b.groupId), rankLabel(b), tpl, b.priority, roles];
        if (tab === 'group') return [groupCell(b.groupId), tpl, b.priority, roles];
        if (tab === 'custom') return [b.id, h('span', { class: 'mono' }, (b.code || '').slice(0, 60)), tpl, b.priority, roles];
        return [b.assetId, b.assetType, tpl, b.priority, roles];
      }

      const rows = items.map(b => {
        const box = h('input', { type: 'checkbox', checked: selected.has(b.id) });
        box.addEventListener('click', e => e.stopPropagation());
        box.addEventListener('change', () => {
          box.checked ? selected.add(b.id) : selected.delete(b.id);
          trash.disabled = selected.size === 0;
        });
        const tr = h('tr', { class: 'clickable' }, h('td', { class: 'center' }, box), ...cells(b).map(c => h('td', null, c)));
        tr.addEventListener('click', () => {
          editing = b;
          renderForm();
        });
        return tr;
      });

      container.replaceChildren(
        pageHeader('Binds', 'Associez des ressources Roblox (rangs, groupes, objets…) à des rôles Discord.'),
        h(
          'div',
          { class: 'tabs' },
          BIND_TABS.map(t => {
            const btn = h('button', { class: t.id === tab ? 'active' : '' }, t.label);
            btn.addEventListener('click', () => {
              tab = t.id;
              selected.clear();
              renderList();
            });
            return btn;
          })
        ),
        h(
          'div',
          { class: 'card' },
          h('div', { class: 'toolbar' }, trash, add),
          items.length
            ? h('table', null, h('thead', null, h('tr', null, h('th', { class: 'center', style: 'width:36px' }, allBox), columns.map(c => h('th', null, c)))), h('tbody', null, rows))
            : empty('Aucune association', 'Créez-en une avec le bouton « Nouveau ».')
        )
      );
    }

    function renderForm() {
      const isEdit = !!editing;
      const form = isEdit
        ? {
            groupId: editing.groupId || '',
            rank: editing.rank !== null ? editing.rank : editing.minRank !== null ? editing.minRank : '',
            rankMax: editing.rank === null && editing.maxRank !== null ? editing.maxRank : '',
            code: editing.code || '',
            assetId: editing.assetId || '',
            assetType: editing.assetType || 'Asset',
            template: editing.template || '',
            priority: editing.priority,
            roleIds: [...editing.roleIds]
          }
        : { groupId: '', rank: '', rankMax: '', code: '', assetId: '', assetType: 'Asset', template: '', priority: 0, roleIds: [] };

      const fields = [];

      if (tab === 'rank' || tab === 'group') {
        const info = h('div', { class: 'hint' });
        const rankChips = h('div', { class: 'rank-chips' });
        const rankInput = numberInput(form.rank, v => (form.rank = v), { min: '0', max: '255', placeholder: 'Numéro du rang (0 = non-membre)' });

        async function lookupGroup() {
          const id = String(form.groupId).trim();
          info.textContent = '';
          rankChips.replaceChildren();
          if (!/^\d{1,15}$/.test(id)) return;
          try {
            const [g, r] = await Promise.all([api('GET', '/api/roblox/groups?ids=' + id), tab === 'rank' ? api('GET', `/api/roblox/groups/${id}/roles`) : Promise.resolve({ roles: [] })]);
            info.textContent = g.groups[id] ? 'Groupe : ' + g.groups[id].name : 'Groupe introuvable';
            for (const role of r.roles) {
              const chip = h('button', { type: 'button', title: 'Utiliser ce rang' }, `${role.rank} · ${role.name}`);
              chip.addEventListener('click', () => {
                form.rank = role.rank;
                rankInput.value = role.rank;
              });
              rankChips.append(chip);
            }
          } catch (e) {
            info.textContent = e.message;
          }
        }

        const groupInput = textInput(form.groupId, v => (form.groupId = v), { placeholder: 'ID du groupe Roblox' });
        groupInput.addEventListener('blur', lookupGroup);
        fields.push(h('label', { class: 'lbl' }, 'Groupe'), groupInput, info);
        if (isEdit) lookupGroup();

        if (tab === 'rank') {
          fields.push(
            h('label', { class: 'lbl' }, 'Rang'),
            rankInput,
            rankChips,
            h('label', { class: 'lbl' }, 'Rang maximum (facultatif)'),
            numberInput(form.rankMax, v => (form.rankMax = v), { min: '0', max: '255', placeholder: 'Pour une plage de rangs : de « Rang » à « Rang maximum »' })
          );
        }
      }

      if (tab === 'custom') {
        const area = h('textarea', { maxlength: '500', placeholder: 'ex : RankAtLeast(34870129, 10) and not InGroup(111)' }, form.code);
        area.addEventListener('input', () => (form.code = area.value));
        fields.push(
          h('label', { class: 'lbl' }, 'Code'),
          area,
          h(
            'div',
            { class: 'hint' },
            'Fonctions : InGroup(groupe), HasRank(groupe, rang), RankAtLeast(groupe, rang), RankAtMost(groupe, rang), HasAsset(id), HasBadge(id), HasGamepass(id). Opérateurs : and, or, not et parenthèses.'
          )
        );
      }

      if (tab === 'asset') {
        const typeSelect = h('select', { class: 'input' }, h('option', { value: 'Asset' }, 'Objet (Asset)'), h('option', { value: 'Badge' }, 'Badge'), h('option', { value: 'GamePass' }, 'Gamepass'));
        typeSelect.value = form.assetType;
        typeSelect.addEventListener('change', () => (form.assetType = typeSelect.value));
        fields.push(h('label', { class: 'lbl' }, 'ID de l\'objet'), textInput(form.assetId, v => (form.assetId = v), { placeholder: 'ex : 123456789' }), h('label', { class: 'lbl' }, 'Type'), typeSelect);
      }

      fields.push(
        h('label', { class: 'lbl' }, 'Modèle de pseudo'),
        textInput(form.template, v => (form.template = v), { placeholder: 'ex : [SDT] {roblox-username}', maxlength: '100' }),
        h('div', { class: 'hint' }, 'Facultatif. Variables : ', h('code', null, TEMPLATE_VARS)),
        h('label', { class: 'lbl' }, 'Priorité'),
        numberInput(form.priority, v => (form.priority = v), { min: '-1000', max: '1000' }),
        h('div', { class: 'hint' }, 'Quand plusieurs binds avec un modèle correspondent, celui qui a la priorité la plus haute décide du pseudo.'),
        h('label', { class: 'lbl' }, 'Rôles Discord'),
        roleSelect(form.roleIds, v => (form.roleIds = v))
      );

      const back = h('button', { class: 'btn ghost' }, '← Retour');
      back.addEventListener('click', () => {
        editing = undefined;
        renderList();
      });

      const save = h('button', { class: 'btn' }, 'Enregistrer');
      save.addEventListener('click', async () => {
        const payload = Object.assign({ type: tab }, form);
        const result = await run(save, () =>
          isEdit ? api('PUT', `/api/guilds/${gid}/roblox/binds/${editing.id}`, payload) : api('POST', `/api/guilds/${gid}/roblox/binds`, payload),
          'Association enregistrée'
        );
        if (result) {
          binds = (await api('GET', `/api/guilds/${gid}/roblox/binds`)).binds;
          await loadGroups();
          editing = undefined;
          renderList();
        }
      });

      const title = { rank: 'rankbind', group: 'groupbind', custom: 'custombind', asset: 'assetbind' }[tab];
      container.replaceChildren(
        h('div', { class: 'crumbs' }, back),
        h('div', { class: 'card' }, h('h3', null, (isEdit ? 'Modifier le ' : 'Créer un ') + title), ...fields, h('div', { class: 'actions' }, save))
      );
    }

    await loadGroups();
    renderList();
    return container;
  }

  // Listes de refus ---------------------------------------------------

  const DENY_TYPES = { user: 'Utilisateur', group: 'Groupe', custom: 'Condition' };
  const DENY_ACTIONS = { none: 'Bloquer la mise à jour', kick: 'Expulser', ban: 'Bannir' };

  async function pageDenylists() {
    const gid = state.guildId;
    const container = h('div');
    let items = (await api('GET', `/api/guilds/${gid}/roblox/denylists`)).denylists;
    const selected = new Set();
    let creating = false;

    function renderList() {
      const trash = h('button', { class: 'btn danger sm', disabled: selected.size === 0, title: 'Supprimer la sélection' }, '🗑');
      trash.addEventListener('click', async () => {
        if (!confirm(`Supprimer ${selected.size} entrée(s) ?`)) return;
        const done = await run(trash, () => api('POST', `/api/guilds/${gid}/roblox/denylists/delete`, { ids: [...selected] }), 'Entrées supprimées');
        if (done) {
          items = items.filter(i => !selected.has(i.id));
          selected.clear();
          renderList();
        }
      });
      const add = h('button', { class: 'btn ghost sm' }, '＋ Nouveau');
      add.addEventListener('click', () => {
        creating = true;
        renderForm();
      });

      const rows = items.map(i => {
        const box = h('input', { type: 'checkbox', checked: selected.has(i.id) });
        box.addEventListener('change', () => {
          box.checked ? selected.add(i.id) : selected.delete(i.id);
          trash.disabled = selected.size === 0;
        });
        return h(
          'tr',
          null,
          h('td', { class: 'center' }, box),
          h('td', null, i.type === 'custom' ? h('span', { class: 'mono' }, i.value.slice(0, 50)) : i.value),
          h('td', null, DENY_TYPES[i.type] || i.type),
          h('td', null, h('span', { class: 'pill ' + i.action }, DENY_ACTIONS[i.action] || i.action)),
          h('td', null, i.reason || h('span', { class: 'hint' }, '—'))
        );
      });

      container.replaceChildren(
        pageHeader('Listes de refus', 'Bloquez l\'accès à certains comptes ou groupes Roblox. La sanction s\'applique à la prochaine mise à jour du membre.'),
        h(
          'div',
          { class: 'card' },
          h('div', { class: 'toolbar' }, trash, add),
          items.length
            ? h('table', null, h('thead', null, h('tr', null, h('th', { class: 'center', style: 'width:36px' }), ['Identifiant', 'Type', 'Action', 'Raison'].map(c => h('th', null, c)))), h('tbody', null, rows))
            : empty('Aucune entrée', 'Ajoutez un compte ou un groupe avec le bouton « Nouveau ».')
        )
      );
    }

    function renderForm() {
      const form = { type: 'user', value: '', action: 'none', reason: '' };
      const hint = h('div', { class: 'hint' });
      const valueInput = textInput('', v => (form.value = v));

      function updateHint() {
        hint.textContent = {
          user: 'ID Roblox ou pseudo du compte à refuser.',
          group: 'ID du groupe Roblox : tous ses membres seront refusés.',
          custom: 'Condition (voir la syntaxe des custombinds), ex : InGroup(123) and RankAtLeast(456, 5)'
        }[form.type];
      }
      updateHint();

      const typeSelect = h('select', { class: 'input' }, Object.entries(DENY_TYPES).map(([v, l]) => h('option', { value: v }, l)));
      typeSelect.addEventListener('change', () => {
        form.type = typeSelect.value;
        updateHint();
      });
      const actionSelect = h('select', { class: 'input' }, Object.entries(DENY_ACTIONS).map(([v, l]) => h('option', { value: v }, l)));
      actionSelect.addEventListener('change', () => (form.action = actionSelect.value));

      const back = h('button', { class: 'btn ghost' }, '← Retour');
      back.addEventListener('click', () => {
        creating = false;
        renderList();
      });
      const save = h('button', { class: 'btn' }, 'Enregistrer');
      save.addEventListener('click', async () => {
        const created = await run(save, () => api('POST', `/api/guilds/${gid}/roblox/denylists`, form), 'Entrée ajoutée');
        if (created) {
          items.push(created);
          creating = false;
          renderList();
        }
      });

      container.replaceChildren(
        h('div', { class: 'crumbs' }, back),
        h(
          'div',
          { class: 'card' },
          h('h3', null, 'Nouvelle entrée'),
          h('label', { class: 'lbl' }, 'Type'),
          typeSelect,
          h('label', { class: 'lbl' }, 'Valeur'),
          valueInput,
          hint,
          h('label', { class: 'lbl' }, 'Action'),
          actionSelect,
          h('label', { class: 'lbl' }, 'Raison'),
          textInput('', v => (form.reason = v), { maxlength: '200', placeholder: 'Facultatif' }),
          h('div', { class: 'actions' }, save)
        )
      );
    }

    renderList();
    return container;
  }

  // Journal d'audit ---------------------------------------------------

  async function pageAudit() {
    const gid = state.guildId;
    const body = h('tbody');
    const more = h('button', { class: 'btn ghost' }, 'Charger plus');
    let lastId = null;

    async function load() {
      const data = await api('GET', `/api/guilds/${gid}/roblox/audit?limit=50` + (lastId ? '&before=' + lastId : ''));
      for (const log of data.logs) {
        body.append(
          h(
            'tr',
            null,
            h('td', { style: 'white-space:nowrap' }, fmtDate(log.createdAt)),
            h('td', null, log.actorName || h('span', { class: 'hint' }, 'Système')),
            h('td', null, h('b', null, log.action)),
            h('td', null, readable(log.details))
          )
        );
        lastId = log.id;
      }
      more.classList.toggle('hidden', data.logs.length < 50);
      return data.logs.length;
    }

    const count = await load();
    more.addEventListener('click', () => run(more, load));

    return h(
      'div',
      null,
      pageHeader("Journal d'audit", 'Historique des actions de la liaison Roblox et des modifications faites depuis le panel.'),
      h(
        'div',
        { class: 'card' },
        count
          ? h('table', null, h('thead', null, h('tr', null, ['Date', 'Acteur', 'Action', 'Détails'].map(c => h('th', null, c)))), body)
          : empty('Aucune entrée', 'Les actions apparaîtront ici.'),
        h('div', { class: 'actions' }, more)
      )
    );
  }

  // ───── Pages : bot ─────

  async function pageGeneral() {
    const gid = state.guildId;
    const form = await api('GET', `/api/guilds/${gid}/general`);
    const save = h('button', { class: 'btn' }, 'Enregistrer');
    save.addEventListener('click', () =>
      run(
        save,
        async () => {
          Object.assign(form, await api('PUT', `/api/guilds/${gid}/general`, form));
        },
        'Paramètres enregistrés'
      )
    );

    return h(
      'div',
      null,
      pageHeader('Général', 'Salons et rôles utilisés par les systèmes du bot.'),
      card('Salon de bienvenue', "Le salon où le message d'arrivée des nouveaux membres est envoyé.", channelSelect(form.welcomeChannelId, 'text', v => (form.welcomeChannelId = v))),
      card('Salon de logs de modération', 'Reçoit les logs des bans, kicks, mutes et départs.', channelSelect(form.logChannelId, 'text', v => (form.logChannelId = v))),
      card(
        'Rôles de modération',
        'Les membres avec ces rôles peuvent utiliser les commandes de modération et gérer les tickets (en plus des administrateurs).',
        roleSelect(form.moderationRoles, v => (form.moderationRoles = v))
      ),
      h('div', { class: 'actions' }, save)
    );
  }

  async function pageTickets() {
    const gid = state.guildId;
    const form = await api('GET', `/api/guilds/${gid}/general`);
    let channelId = null;

    const save = h('button', { class: 'btn' }, 'Enregistrer la catégorie');
    save.addEventListener('click', () =>
      run(
        save,
        async () => {
          Object.assign(form, await api('PUT', `/api/guilds/${gid}/general`, form));
        },
        'Catégorie enregistrée'
      )
    );

    const send = h('button', { class: 'btn' }, 'Envoyer le message');
    send.addEventListener('click', () =>
      run(
        send,
        async () => {
          if (!channelId) throw new Error('Choisissez un salon');
          await api('POST', `/api/guilds/${gid}/tickets/send`, { channelId });
        },
        'Message envoyé'
      )
    );

    return h(
      'div',
      null,
      pageHeader('Tickets', 'Les membres ouvrent un ticket depuis un menu ; un salon privé est créé pour eux et pour le staff.'),
      card(
        'Catégorie des tickets',
        'La catégorie Discord dans laquelle les salons de tickets sont créés.',
        channelSelect(form.ticketCategoryId, 'category', v => (form.ticketCategoryId = v), '— Choisir une catégorie —'),
        h('div', { class: 'actions' }, save)
      ),
      card(
        'Message de création de ticket',
        'Envoie le menu « Création de ticket » dans un salon (Bug, Réclamation de récompense, Signalement).',
        channelSelect(null, 'text', v => (channelId = v), 'Sélectionner un salon'),
        h('div', { class: 'actions' }, send)
      )
    );
  }

  async function pageGiveaways() {
    const gid = state.guildId;
    const container = h('div');
    const form = { title: '', description: '', winners: 1, amount: 1, unit: '1440', channelId: null };

    async function render() {
      const list = (await api('GET', `/api/guilds/${gid}/giveaways`)).giveaways;

      const unit = h('select', { class: 'input' }, h('option', { value: '1' }, 'minutes'), h('option', { value: '60' }, 'heures'), h('option', { value: '1440' }, 'jours'));
      unit.value = form.unit;
      unit.addEventListener('change', () => (form.unit = unit.value));

      const create = h('button', { class: 'btn' }, 'Lancer le giveaway');
      create.addEventListener('click', async () => {
        const payload = {
          title: form.title,
          description: form.description,
          winners: form.winners,
          durationMinutes: Number(form.amount) * Number(form.unit),
          channelId: form.channelId
        };
        const done = await run(create, () => api('POST', `/api/guilds/${gid}/giveaways`, payload), 'Giveaway lancé');
        if (done) {
          form.title = '';
          form.description = '';
          await render();
        }
      });

      const rows = list.map(g => {
        const end = h('button', { class: 'btn danger sm' }, 'Terminer');
        end.addEventListener('click', async () => {
          if (!confirm('Terminer ce giveaway maintenant et tirer les gagnants ?')) return;
          const done = await run(end, () => api('POST', `/api/guilds/${gid}/giveaways/${g.id}/end`, {}), 'Le giveaway va se terminer');
          if (done) setTimeout(render, 2500);
        });
        return h(
          'tr',
          null,
          h('td', null, h('a', { href: g.url, target: '_blank', rel: 'noopener' }, g.title)),
          h('td', null, '#' + channelName(g.channelId)),
          h('td', null, g.winners),
          h('td', null, g.participants),
          h('td', null, fmtDate(g.endTime)),
          h('td', null, g.ended ? h('span', { class: 'pill' }, 'Terminé') : h('span', { class: 'pill', style: 'background:#14391f;color:#86efac' }, 'En cours')),
          h('td', null, g.ended ? null : end)
        );
      });

      container.replaceChildren(
        pageHeader('Giveaways', 'Créez et gérez les giveaways du serveur.'),
        card(
          'Nouveau giveaway',
          null,
          h('label', { class: 'lbl' }, 'Titre'),
          textInput(form.title, v => (form.title = v), { maxlength: '100' }),
          h('label', { class: 'lbl' }, 'Description'),
          (() => {
            const area = h('textarea', { maxlength: '1000' }, form.description);
            area.addEventListener('input', () => (form.description = area.value));
            return area;
          })(),
          h(
            'div',
            { class: 'grid2' },
            h('div', null, h('label', { class: 'lbl' }, 'Gagnants'), numberInput(form.winners, v => (form.winners = v), { min: '1', max: '50' })),
            h('div', null, h('label', { class: 'lbl' }, 'Durée'), h('div', { style: 'display:flex;gap:8px' }, numberInput(form.amount, v => (form.amount = v), { min: '1' }), unit))
          ),
          h('label', { class: 'lbl' }, 'Salon'),
          channelSelect(form.channelId, 'text', v => (form.channelId = v), 'Sélectionner un salon'),
          h('div', { class: 'actions' }, create)
        ),
        h(
          'div',
          { class: 'card' },
          h('h3', null, 'Giveaways récents'),
          list.length
            ? h('table', null, h('thead', null, h('tr', null, ['Titre', 'Salon', 'Gagnants', 'Participants', 'Fin', 'État', ''].map(c => h('th', null, c)))), h('tbody', null, rows))
            : empty('Aucun giveaway', '')
        )
      );
    }

    await render();
    return container;
  }

  async function pageInvites() {
    const gid = state.guildId;
    const container = h('div');
    const form = { userId: '', amount: '' };

    async function render() {
      const { leaderboard } = await api('GET', `/api/guilds/${gid}/invites`);

      const apply = h('button', { class: 'btn' }, 'Appliquer');
      apply.addEventListener('click', async () => {
        const done = await run(apply, () => api('POST', `/api/guilds/${gid}/invites/bonus`, form), 'Invitations bonus mises à jour');
        if (done) {
          form.amount = '';
          await render();
        }
      });

      const rows = leaderboard.map((r, i) =>
        h(
          'tr',
          null,
          h('td', null, i + 1),
          h('td', null, r.name || h('span', { class: 'mono' }, r.userId)),
          h('td', null, h('b', null, r.total)),
          h('td', null, r.uses),
          h('td', null, r.left),
          h('td', null, r.fake),
          h('td', null, r.bonus)
        )
      );

      container.replaceChildren(
        pageHeader('Invitations', 'Classement des invitations et gestion des invitations bonus.'),
        card(
          'Invitations bonus',
          'Ajoutez (nombre positif) ou retirez (nombre négatif) des invitations bonus à un membre.',
          h(
            'div',
            { class: 'grid2' },
            h('div', null, h('label', { class: 'lbl' }, 'ID Discord du membre'), textInput(form.userId, v => (form.userId = v.trim()), { placeholder: 'ex : 123456789012345678' })),
            h('div', null, h('label', { class: 'lbl' }, 'Nombre'), numberInput(form.amount, v => (form.amount = v), { placeholder: 'ex : 5 ou -2' }))
          ),
          h('div', { class: 'actions' }, apply)
        ),
        h(
          'div',
          { class: 'card' },
          h('h3', null, 'Classement'),
          leaderboard.length
            ? h('table', null, h('thead', null, h('tr', null, ['#', 'Membre', 'Total', 'Invitations', 'Partis', 'Suspects', 'Bonus'].map(c => h('th', null, c)))), h('tbody', null, rows))
            : empty('Aucune invitation enregistrée', '')
        )
      );
    }

    await render();
    return container;
  }

  // ───── Page : messages du bot ─────

  async function pageMessages() {
    const gid = state.guildId;
    const container = h('div');
    let data = await api('GET', `/api/guilds/${gid}/messages`);
    let query = '';

    function messageItem(item) {
      const area = h('textarea', { maxlength: '2000', style: 'min-height:70px' }, item.value !== null ? item.value : item.default);
      const save = h('button', { class: 'btn sm hidden' }, 'Enregistrer');
      const reset = h('button', { class: 'btn ghost sm' + (item.value === null ? ' hidden' : '') }, 'Réinitialiser');
      const badge = h('span', { class: 'pill' + (item.value === null ? ' hidden' : ''), style: 'background:#1e3a8a' }, 'modifié');

      area.addEventListener('input', () => save.classList.toggle('hidden', area.value === (item.value !== null ? item.value : item.default)));

      save.addEventListener('click', async () => {
        const result = await run(save, () => api('PUT', `/api/guilds/${gid}/messages`, { key: item.key, text: area.value }), 'Message enregistré');
        if (result) {
          item.value = result.value;
          if (result.value === null) area.value = item.default;
          save.classList.add('hidden');
          reset.classList.toggle('hidden', item.value === null);
          badge.classList.toggle('hidden', item.value === null);
        }
      });

      reset.addEventListener('click', async () => {
        const result = await run(reset, () => api('PUT', `/api/guilds/${gid}/messages`, { key: item.key, text: null }), 'Message réinitialisé');
        if (result) {
          item.value = null;
          area.value = item.default;
          save.classList.add('hidden');
          reset.classList.add('hidden');
          badge.classList.add('hidden');
        }
      });

      const vars = item.vars.length
        ? h(
            'div',
            { class: 'rank-chips' },
            item.vars.map(v => {
              const chip = h('button', { type: 'button', title: 'Insérer la variable' }, '{' + v + '}');
              chip.addEventListener('click', () => {
                const start = area.selectionStart === undefined ? area.value.length : area.selectionStart;
                area.value = area.value.slice(0, start) + '{' + v + '}' + area.value.slice(area.selectionEnd === undefined ? start : area.selectionEnd);
                area.dispatchEvent(new Event('input'));
                area.focus();
              });
              return chip;
            })
          )
        : null;

      return h(
        'div',
        { class: 'msg-item' },
        h('div', { class: 'msg-head' }, h('span', { class: 'pill' }, item.kind), badge),
        area,
        vars,
        h('div', { class: 'actions', style: 'margin-top:8px' }, reset, save)
      );
    }

    function render() {
      const q = query.trim().toLowerCase();
      const sections = data.groups
        .map(g => {
          const items = g.items.filter(i => !q || i.default.toLowerCase().includes(q) || (i.value || '').toLowerCase().includes(q) || g.label.toLowerCase().includes(q));
          if (!items.length) return null;
          const customized = items.filter(i => i.value !== null).length;
          const resetAll = h('button', { class: 'link-btn', style: 'margin-left:auto' }, 'Tout réinitialiser');
          resetAll.addEventListener('click', async e => {
            e.preventDefault();
            if (!confirm('Réinitialiser tous les messages de cette section ?')) return;
            const done = await run(null, () => api('POST', `/api/guilds/${gid}/messages/reset`, { group: g.id }), 'Section réinitialisée');
            if (done) {
              data = await api('GET', `/api/guilds/${gid}/messages`);
              render();
            }
          });
          const details = h(
            'details',
            { class: 'card msg-group', open: q ? true : null },
            h('summary', null, h('b', null, g.label), h('span', { class: 'hint', style: 'margin-left:8px' }, `${items.length} message(s)` + (customized ? ` · ${customized} modifié(s)` : '')), customized ? resetAll : null),
            ...items.map(messageItem)
          );
          return details;
        })
        .filter(Boolean);

      list.replaceChildren(...(sections.length ? sections : [empty('Aucun message trouvé', 'Essayez un autre mot.')]));
    }

    const list = h('div');
    const search = h('input', { type: 'text', placeholder: 'Rechercher un message…', style: 'margin-bottom:14px' });
    search.addEventListener('input', () => {
      query = search.value;
      render();
    });

    container.append(
      pageHeader('Messages', 'Modifiez tous les textes envoyés par le bot. Les {variables} sont remplacées automatiquement ; supprimez le texte personnalisé avec « Réinitialiser » pour revenir à celui d\'origine.'),
      search,
      list
    );
    render();
    return container;
  }

  // ───── Page : événements, FGI et verrouillage ─────

  function roleSelectOne(value, onChange, placeholder) {
    const sel = h('select', { class: 'input' }, h('option', { value: '' }, placeholder || '— Aucun —'), ...state.meta.roles.map(r => h('option', { value: r.id }, r.name)));
    sel.value = value || '';
    sel.addEventListener('change', () => onChange(sel.value || null));
    return sel;
  }

  function pingSelect(value, onChange) {
    const isRole = value && value !== 'everyone' && value !== 'here';
    const mode = h('select', { class: 'input' }, h('option', { value: '' }, 'Aucune mention'), h('option', { value: 'everyone' }, '@everyone'), h('option', { value: 'here' }, '@here'), h('option', { value: 'role' }, 'Un rôle…'));
    mode.value = isRole ? 'role' : value || '';
    const roleBox = h('div', { style: 'margin-top:6px' });

    function renderRole() {
      roleBox.replaceChildren();
      if (mode.value === 'role') roleBox.append(roleSelectOne(isRole ? value : '', v => onChange(v || ''), 'Choisir un rôle'));
    }
    mode.addEventListener('change', () => {
      onChange(mode.value === 'role' ? '' : mode.value);
      renderRole();
    });
    renderRole();
    return h('div', null, mode, roleBox);
  }

  function questionsEditor(list) {
    const box = h('div');
    function render() {
      box.replaceChildren(
        ...list.map((q, i) => {
          const label = textInput(q.label, v => (q.label = v), { maxlength: '45', placeholder: 'Question' });
          const style = h('select', { class: 'input', style: 'width:140px' }, h('option', { value: 'short' }, 'Réponse courte'), h('option', { value: 'long' }, 'Réponse longue'));
          style.value = q.style;
          style.addEventListener('change', () => (q.style = style.value));
          const req = h('input', { type: 'checkbox', checked: q.required });
          req.addEventListener('change', () => (q.required = req.checked));
          const del = h('button', { class: 'btn danger sm', title: 'Supprimer' }, '✕');
          del.addEventListener('click', () => {
            list.splice(i, 1);
            render();
          });
          return h('div', { class: 'row', style: 'margin-bottom:8px;gap:8px' }, h('div', { class: 'grow' }, label), style, h('label', { class: 'hint', style: 'white-space:nowrap' }, req, ' obligatoire'), del);
        })
      );
      if (list.length < 5) {
        const add = h('button', { class: 'btn ghost sm' }, '＋ Ajouter une question');
        add.addEventListener('click', () => {
          list.push({ id: '', label: '', style: 'short', required: true });
          render();
        });
        box.append(add);
      }
    }
    render();
    return box;
  }

  function regimentsEditor(list) {
    const box = h('div');
    function render() {
      box.replaceChildren(
        ...list.map((r, i) => {
          const del = h('button', { class: 'btn danger sm', title: 'Supprimer' }, '✕');
          del.addEventListener('click', () => {
            list.splice(i, 1);
            render();
          });
          return h(
            'div',
            { class: 'regiment' },
            h('div', { class: 'row', style: 'gap:8px' }, h('div', { class: 'grow' }, textInput(r.name, v => (r.name = v), { placeholder: 'Nom du régiment', maxlength: '100' })), del),
            h('div', { class: 'grid2', style: 'margin-top:6px' }, textInput(r.discord, v => (r.discord = v), { placeholder: 'Lien Discord du régiment', maxlength: '300' }), textInput(r.roblox, v => (r.roblox = v), { placeholder: 'Lien du groupe Roblox', maxlength: '300' }))
          );
        })
      );
      if (list.length < 25) {
        const add = h('button', { class: 'btn ghost sm' }, '＋ Ajouter un régiment');
        add.addEventListener('click', () => {
          list.push({ name: '', discord: '', roblox: '' });
          render();
        });
        box.append(add);
      }
    }
    render();
    return box;
  }

  async function pageEvents() {
    const gid = state.guildId;
    const form = await api('GET', `/api/guilds/${gid}/events`);

    const save = h('button', { class: 'btn' }, 'Enregistrer');
    save.addEventListener('click', () =>
      run(
        save,
        async () => {
          Object.assign(form, await api('PUT', `/api/guilds/${gid}/events`, form));
        },
        'Configuration enregistrée'
      )
    );

    const dm = h('textarea', { maxlength: '1500', style: 'min-height:140px' }, form.dmTemplate);
    dm.addEventListener('input', () => (form.dmTemplate = dm.value));
    const dmReset = h('button', { class: 'link-btn' }, 'Remettre le message par défaut');
    dmReset.addEventListener('click', () => {
      form.dmTemplate = form.defaults.dmTemplate;
      dm.value = form.dmTemplate;
    });

    const kindCard = (title, desc, prefix) =>
      card(
        title,
        desc,
        h('div', { class: 'grid2' },
          h('div', null, h('label', { class: 'lbl' }, 'Rôle minimum pour créer'), roleSelectOne(form[prefix + 'RoleId'], v => (form[prefix + 'RoleId'] = v)), h('div', { class: 'hint' }, 'Ce rôle et ceux au-dessus. Les administrateurs et les rôles de modération peuvent toujours créer.')),
          h('div', null, h('label', { class: 'lbl' }, 'Mention à la publication'), pingSelect(form['ping' + (prefix === 'event' ? 'Event' : 'Fgi')], v => (form['ping' + (prefix === 'event' ? 'Event' : 'Fgi')] = v)))
        ),
        h('div', { class: 'grid2' },
          h('div', null, h('label', { class: 'lbl' }, 'Salon des panels'), channelSelect(form[prefix + 'ChannelId'], 'text', v => (form[prefix + 'ChannelId'] = v), 'Sélectionner un salon')),
          h('div', null, h('label', { class: 'lbl' }, 'Salon des comptes rendus'), channelSelect(form[prefix + 'LogChannelId'], 'text', v => (form[prefix + 'LogChannelId'] = v), 'Sélectionner un salon'))
        ),
        h('label', { class: 'lbl' }, 'Questions posées à la fin'),
        h('div', { class: 'hint', style: 'margin:-2px 0 8px' }, '5 questions maximum, posées dans le formulaire de fin.'),
        questionsEditor(form[prefix + 'Questions'])
      );

    return h(
      'div',
      null,
      pageHeader('Événements & FGI', 'Panels de présence, comptes rendus de fin, assistant des présents (FGI) et verrouillage des salons.'),
      card('Fuseau horaire', 'Utilisé pour lire les dates et heures saisies dans /event et /fgi (exemple : Europe/Paris).', textInput(form.timezone, v => (form.timezone = v), { maxlength: '60' })),
      kindCard('Événements', 'Commandes /event, /event_stats et /event_fin.', 'event'),
      kindCard('FGI', 'Commandes /fgi, /fgi_stats et /fgi_fin.', 'fgi'),
      card(
        'Régiments (FGI)',
        "Proposés dans l'assistant de fin de FGI : chaque présent reçoit en message privé les liens de son régiment.",
        regimentsEditor(form.regiments),
        h('label', { class: 'lbl' }, 'Message privé envoyé à chaque présent'),
        dm,
        h('div', { class: 'hint' }, 'Variables : ', h('code', null, '{membre} {titre} {regiment} {discord} {roblox}'), ' · ', dmReset)
      ),
      card(
        'Verrouillage de salons',
        'Avec /lock, seuls ces rôles (en plus des administrateurs) peuvent continuer à écrire dans le salon verrouillé.',
        roleSelect(form.lockAllowedRoles, v => (form.lockAllowedRoles = v))
      ),
      h('div', { class: 'actions' }, save)
    );
  }

  // ───── Page : commandes personnalisées ─────

  let SCHEMA = null;

  const TRIGGER_LABELS = {
    slash: { icon: '／', label: 'Commande slash' },
    memberJoin: { icon: '👋', label: "Quand un membre arrive" },
    memberLeave: { icon: '🚪', label: 'Quand un membre part' },
    button: { icon: '🔘', label: 'Quand on clique sur un bouton' }
  };

  const CATEGORY_COLORS = { Messages: '#2563eb', Membres: '#ea580c', Variables: '#9333ea', 'Mémoire': '#0d9488', Logique: '#52525b' };

  function defaultFor(field) {
    if (field.default !== undefined) return field.default;
    switch (field.kind) {
      case 'bool': return false;
      case 'number': return 0;
      case 'buttons': return [];
      case 'cond': return { mode: 'all', items: [] };
      case 'select': return field.options[0].value;
      case 'color': return '#5865f2';
      default: return '';
    }
  }

  function newBlock(type) {
    const def = SCHEMA.blocks.find(b => b.type === type);
    const block = { type };
    for (const f of def.fields) block[f.key] = defaultFor(f);
    for (const s of def.slots || []) block[s.key] = [];
    return block;
  }

  function fieldVisible(field, block) {
    if (!field.showIf) return true;
    if (field.showIf === 'scopeIsUser') return block.scope !== 'guild';
    return !!block[field.showIf];
  }

  function buttonsEditor(block, key) {
    const box = h('div');
    function render() {
      const list = block[key];
      box.replaceChildren(
        ...list.map((b, i) => {
          const style = h('select', { class: 'input', style: 'width:120px' }, SCHEMA.buttonStyles.map(s => h('option', { value: s }, { primary: 'Bleu', secondary: 'Gris', success: 'Vert', danger: 'Rouge' }[s])));
          style.value = b.style;
          style.addEventListener('change', () => (b.style = style.value));
          const del = h('button', { class: 'btn danger sm' }, '✕');
          del.addEventListener('click', () => {
            list.splice(i, 1);
            render();
          });
          return h('div', { class: 'row', style: 'gap:6px;margin-bottom:6px' }, h('div', { class: 'grow' }, textInput(b.label, v => (b.label = v), { placeholder: 'Texte du bouton', maxlength: '80' })), style, textInput(b.key, v => (b.key = v), { placeholder: 'identifiant', maxlength: '40', style: 'width:130px' }), del);
        })
      );
      if (list.length < 5) {
        const add = h('button', { class: 'btn ghost sm', type: 'button' }, '＋ Ajouter un bouton');
        add.addEventListener('click', () => {
          list.push({ label: 'Bouton', style: 'primary', key: 'bouton_' + (list.length + 1) });
          render();
        });
        box.append(add);
        if (list.length) box.append(h('div', { class: 'hint' }, 'Pour qu\'un clic déclenche quelque chose, créez un déclencheur « bouton » avec le même identifiant.'));
      }
    }
    render();
    return box;
  }

  function condEditor(cond) {
    const box = h('div', { class: 'cond' });

    function itemEditor(item, i) {
      const type = h('select', { class: 'input' }, SCHEMA.conditionTypes.map(t => h('option', { value: t.type }, t.label)));
      type.value = item.type;
      type.addEventListener('change', () => {
        const fresh = { type: type.value, not: item.not };
        if (type.value === 'compare') Object.assign(fresh, { left: '', op: '==', right: '' });
        if (type.value === 'hasRole') Object.assign(fresh, { user: '{user.id}', role: '' });
        if (type.value === 'isAdmin') Object.assign(fresh, { user: '{user.id}' });
        if (type.value === 'chance') Object.assign(fresh, { percent: 50 });
        if (type.value === 'exists') Object.assign(fresh, { name: '' });
        cond.items[i] = fresh;
        render();
      });

      const not = h('input', { type: 'checkbox', checked: !!item.not });
      not.addEventListener('change', () => (item.not = not.checked));
      const del = h('button', { class: 'btn danger sm' }, '✕');
      del.addEventListener('click', () => {
        cond.items.splice(i, 1);
        render();
      });

      let body = null;
      if (item.type === 'compare') {
        const op = h('select', { class: 'input', style: 'width:210px' }, SCHEMA.compareOps.map(o => h('option', { value: o.value }, o.label)));
        op.value = item.op;
        op.addEventListener('change', () => (item.op = op.value));
        body = h('div', { class: 'row', style: 'gap:6px' }, h('div', { class: 'grow' }, textInput(item.left, v => (item.left = v), { placeholder: '{score}' })), op, h('div', { class: 'grow' }, textInput(item.right, v => (item.right = v), { placeholder: '10' })));
      } else if (item.type === 'hasRole') {
        body = h('div', { class: 'row', style: 'gap:6px' }, h('div', { class: 'grow' }, textInput(item.user, v => (item.user = v), { placeholder: '{user.id}' })), roleSelectOne(item.role, v => (item.role = v || ''), 'Choisir un rôle'));
      } else if (item.type === 'isAdmin') {
        body = textInput(item.user, v => (item.user = v), { placeholder: '{user.id}' });
      } else if (item.type === 'chance') {
        body = numberInput(item.percent, v => (item.percent = Number(v)), { min: '0', max: '100' });
      } else if (item.type === 'exists') {
        body = textInput(item.name, v => (item.name = v), { placeholder: 'nom_de_variable' });
      }

      return h('div', { class: 'cond-item' }, h('div', { class: 'row', style: 'gap:8px;margin-bottom:6px' }, h('div', { class: 'grow' }, type), h('label', { class: 'hint', style: 'white-space:nowrap' }, not, ' inverser'), del), body);
    }

    function render() {
      const mode = h('select', { class: 'input', style: 'width:auto' }, h('option', { value: 'all' }, 'toutes'), h('option', { value: 'any' }, 'au moins une'));
      mode.value = cond.mode;
      mode.addEventListener('change', () => (cond.mode = mode.value));

      const add = h('button', { class: 'btn ghost sm', type: 'button' }, '＋ Ajouter une condition');
      add.addEventListener('click', () => {
        cond.items.push({ type: 'compare', not: false, left: '', op: '==', right: '' });
        render();
      });

      box.replaceChildren(h('div', { class: 'row', style: 'justify-content:flex-start;gap:8px;margin-bottom:8px' }, 'Si', mode, 'des conditions suivantes sont vraies :'), ...cond.items.map(itemEditor), add);
    }
    render();
    return box;
  }

  function fieldEditor(field, block, rerender) {
    let input;
    const key = field.key;

    switch (field.kind) {
      case 'text':
      case 'name':
        input = textInput(block[key], v => (block[key] = v), { maxlength: String(field.max || 500), placeholder: field.placeholder || '' });
        break;
      case 'textarea': {
        input = h('textarea', { maxlength: String(field.max || 2000), placeholder: field.placeholder || '', style: 'min-height:70px' }, block[key]);
        input.addEventListener('input', () => (block[key] = input.value));
        break;
      }
      case 'number':
        input = numberInput(block[key], v => (block[key] = v === '' ? 0 : Number(v)), { min: field.min !== undefined ? String(field.min) : null, max: field.maxValue !== undefined ? String(field.maxValue) : null });
        break;
      case 'select': {
        input = h('select', { class: 'input' }, field.options.map(o => h('option', { value: o.value }, o.label)));
        input.value = block[key];
        input.addEventListener('change', () => {
          block[key] = input.value;
          if (key === 'scope') rerender();
        });
        break;
      }
      case 'role':
        input = roleSelectOne(block[key], v => (block[key] = v || ''), 'Choisir un rôle');
        break;
      case 'channel':
        input = channelSelect(block[key], 'text', v => (block[key] = v || ''), 'Choisir un salon');
        break;
      case 'bool': {
        const box = h('input', { type: 'checkbox', checked: !!block[key] });
        box.addEventListener('change', () => {
          block[key] = box.checked;
          rerender();
        });
        return h('label', { class: 'check' }, box, ' ' + field.label);
      }
      case 'color': {
        input = h('input', { type: 'color', value: block[key], style: 'width:60px;height:34px;padding:2px;background:var(--bg);border:1px solid var(--border);border-radius:8px' });
        input.addEventListener('input', () => (block[key] = input.value));
        break;
      }
      case 'buttons':
        input = buttonsEditor(block, key);
        break;
      case 'cond':
        input = condEditor(block[key]);
        break;
      default:
        input = h('span');
    }
    return h('div', { class: 'field-row' }, h('label', { class: 'lbl small' }, field.label), input);
  }

  function blockList(list, rerender) {
    const box = h('div', { class: 'blocklist' });

    list.forEach((block, i) => {
      const def = SCHEMA.blocks.find(b => b.type === block.type);
      if (!def) return;

      const move = (delta, label, title) => {
        const btn = h('button', { class: 'icon-btn', type: 'button', title }, label);
        btn.addEventListener('click', () => {
          const j = i + delta;
          if (j < 0 || j >= list.length) return;
          [list[i], list[j]] = [list[j], list[i]];
          rerender();
        });
        return btn;
      };
      const dup = h('button', { class: 'icon-btn', type: 'button', title: 'Dupliquer' }, '⧉');
      dup.addEventListener('click', () => {
        list.splice(i + 1, 0, JSON.parse(JSON.stringify(block)));
        rerender();
      });
      const del = h('button', { class: 'icon-btn danger', type: 'button', title: 'Supprimer' }, '✕');
      del.addEventListener('click', () => {
        list.splice(i, 1);
        rerender();
      });

      const body = h('div', { class: 'block-body' });
      for (const f of def.fields) if (fieldVisible(f, block)) body.append(fieldEditor(f, block, rerender));
      for (const slot of def.slots || []) {
        body.append(h('div', { class: 'slot' }, h('div', { class: 'slot-title' }, slot.label), blockList(block[slot.key], rerender)));
      }

      box.append(
        h(
          'div',
          { class: 'block', style: '--bc:' + (CATEGORY_COLORS[def.category] || '#52525b') },
          h('div', { class: 'block-head' }, h('span', null, def.icon + ' ' + def.label), h('span', { class: 'block-tools' }, move(-1, '↑', 'Monter'), move(1, '↓', 'Descendre'), dup, del)),
          def.help ? h('div', { class: 'hint', style: 'margin:0 0 6px' }, def.help) : null,
          body
        )
      );
    });

    // Menu d'ajout de bloc
    const menu = h('div', { class: 'addmenu hidden' });
    const categories = [...new Set(SCHEMA.blocks.map(b => b.category))];
    for (const cat of categories) {
      menu.append(h('div', { class: 'cat-title', style: '--bc:' + (CATEGORY_COLORS[cat] || '#52525b') }, cat));
      for (const def of SCHEMA.blocks.filter(b => b.category === cat)) {
        const item = h('button', { class: 'menu-item', type: 'button' }, def.icon + ' ' + def.label);
        item.addEventListener('click', () => {
          list.push(newBlock(def.type));
          rerender();
        });
        menu.append(item);
      }
    }
    const add = h('button', { class: 'btn ghost sm', type: 'button' }, '＋ Ajouter un bloc');
    add.addEventListener('click', () => menu.classList.toggle('hidden'));
    box.append(h('div', { class: 'add-wrap' }, add, menu));
    return box;
  }

  function programEditor(program) {
    const host = h('div');
    function rerender() {
      host.replaceChildren(blockList(program, rerender));
    }
    rerender();
    return host;
  }

  function optionsEditor(list) {
    const box = h('div');
    function render() {
      box.replaceChildren(
        ...list.map((o, i) => {
          const type = h('select', { class: 'input', style: 'width:130px' }, SCHEMA.optionTypes.map(t => h('option', { value: t }, { string: 'Texte', integer: 'Entier', number: 'Nombre', boolean: 'Oui/Non', user: 'Membre', channel: 'Salon', role: 'Rôle' }[t])));
          type.value = o.type;
          type.addEventListener('change', () => (o.type = type.value));
          const req = h('input', { type: 'checkbox', checked: o.required });
          req.addEventListener('change', () => (o.required = req.checked));
          const del = h('button', { class: 'btn danger sm' }, '✕');
          del.addEventListener('click', () => {
            list.splice(i, 1);
            render();
          });
          return h('div', { class: 'row', style: 'gap:6px;margin-bottom:6px' }, textInput(o.name, v => (o.name = v.toLowerCase()), { placeholder: 'nom', maxlength: '32', style: 'width:140px' }), h('div', { class: 'grow' }, textInput(o.description, v => (o.description = v), { placeholder: 'Description', maxlength: '100' })), type, h('label', { class: 'hint', style: 'white-space:nowrap' }, req, ' obligatoire'), del);
        })
      );
      if (list.length < 10) {
        const add = h('button', { class: 'btn ghost sm', type: 'button' }, '＋ Ajouter une option');
        add.addEventListener('click', () => {
          list.push({ name: 'option' + (list.length + 1), description: '', type: 'string', required: false });
          render();
        });
        box.append(add);
        box.append(h('div', { class: 'hint' }, 'Dans les blocs, utilisez {option.nom} (ex. {option.membre} donne son identifiant).'));
      }
    }
    render();
    return box;
  }

  const SCRIPT_TEMPLATE = `// Variables : user, server, channel, options, vars, trigger
// Fonctions (toutes asynchrones, à utiliser avec await) :
//   reply(texte | {content, embed:{title, description, color}, buttons:[{label, style, key}]})
//   send(salonId, message)   dm(membreId, texte)
//   addRole(membreId, roleId)   removeRole(membreId, roleId)
//   timeout(membreId, minutes, raison)   kick(membreId, raison)   ban(membreId, raison)
//   setNickname(membreId, pseudo)   member(membreId)  ->  {id, name, tag, nickname, roles, isAdmin}
//   data.get(cle) / data.set(cle, valeur) / data.delete(cle)                  (mémoire du serveur)
//   userData.get(membreId, cle) / userData.set(membreId, cle, valeur)         (mémoire d'un membre)
//   sleep(ms)   random(min, max)   log(...)

await reply('Bonjour ' + user.name + ' !');
`;

  async function pageCustom() {
    const gid = state.guildId;
    if (!SCHEMA) SCHEMA = await api('GET', '/api/custom/schema');
    const container = h('div');
    let info = await api('GET', `/api/guilds/${gid}/custom`);

    function renderList() {
      const menu = h('div', { class: 'addmenu hidden', style: 'right:0;left:auto;min-width:280px' });
      for (const [trigger, t] of Object.entries(TRIGGER_LABELS)) {
        const item = h('button', { class: 'menu-item', type: 'button' }, t.icon + ' ' + t.label);
        item.addEventListener('click', () => openEditor(null, trigger));
        menu.append(item);
      }
      const newButton = h('button', { class: 'btn' }, '＋ Nouvelle');
      newButton.addEventListener('click', () => menu.classList.toggle('hidden'));

      const rows = info.actions.map(a => {
        const t = TRIGGER_LABELS[a.trigger];
        const sw = toggle(a.enabled, async v => {
          const result = await run(null, () => api('PUT', `/api/guilds/${gid}/custom/${a.id}`, Object.assign({}, a, { enabled: v })));
          if (result) {
            a.enabled = v;
            if (result.warning) toast(result.warning, 'error');
          } else {
            a.enabled = !v;
            renderList();
          }
        });
        const edit = h('button', { class: 'btn ghost sm' }, 'Modifier');
        edit.addEventListener('click', () => openEditor(a, a.trigger));
        const del = h('button', { class: 'btn danger sm' }, '🗑');
        del.addEventListener('click', async () => {
          if (!confirm('Supprimer « ' + a.name + ' » ?')) return;
          const done = await run(del, () => api('DELETE', `/api/guilds/${gid}/custom/${a.id}`), 'Commande supprimée');
          if (done) {
            info.actions = info.actions.filter(x => x.id !== a.id);
            renderList();
          }
        });
        const title = a.trigger === 'slash' ? '/' + a.name : a.trigger === 'button' ? a.name + ' (' + a.triggerKey + ')' : a.name;
        return h(
          'tr',
          null,
          h('td', null, h('b', null, title), a.description ? h('div', { class: 'hint', style: 'margin:0' }, a.description) : null),
          h('td', null, t.icon + ' ' + t.label),
          h('td', null, a.mode === 'script' ? h('span', { class: 'pill' }, 'JavaScript') : h('span', { class: 'pill' }, 'Blocs')),
          h('td', null, a.lastError ? h('span', { class: 'pill ban', title: a.lastError.message }, 'Erreur : ' + a.lastError.message.slice(0, 40)) : h('span', { class: 'hint' }, '—')),
          h('td', { class: 'center' }, sw),
          h('td', { style: 'white-space:nowrap' }, edit, ' ', del)
        );
      });

      container.replaceChildren(
        pageHeader('Commandes personnalisées', 'Créez vos propres commandes et automatisations sans programmer, avec des blocs (ou en JavaScript pour les développeurs).'),
        h(
          'div',
          { class: 'card' },
          h('div', { class: 'toolbar' }, h('div', { class: 'add-wrap', style: 'position:relative' }, newButton, menu)),
          info.actions.length
            ? h('table', null, h('thead', null, h('tr', null, ['Nom', 'Déclencheur', 'Type', 'État', 'Actif', ''].map(c => h('th', null, c)))), h('tbody', null, rows))
            : empty('Aucune commande', 'Cliquez sur « Nouvelle » pour créer votre première commande.'),
          h('div', { class: 'hint', style: 'margin-top:10px' }, `${info.actions.length}/${info.limit} commandes`)
        )
      );
    }

    function openEditor(existing, trigger) {
      const draft = existing
        ? JSON.parse(JSON.stringify(existing))
        : { name: '', description: '', trigger, triggerKey: trigger === 'button' ? '' : null, mode: 'blocks', program: [], script: SCRIPT_TEMPLATE, options: [], allowedRoles: [], ephemeral: true, enabled: true };
      if (draft.mode === 'blocks' && !draft.script) draft.script = SCRIPT_TEMPLATE;

      const t = TRIGGER_LABELS[trigger];
      const back = h('button', { class: 'btn ghost' }, '← Retour');
      back.addEventListener('click', async () => {
        info = await api('GET', `/api/guilds/${gid}/custom`);
        renderList();
      });

      const fields = [];

      if (trigger === 'slash') {
        fields.push(
          h('div', { class: 'grid2' },
            h('div', null, h('label', { class: 'lbl' }, 'Nom de la commande'), h('div', { class: 'row', style: 'gap:6px;justify-content:flex-start' }, '/', h('div', { class: 'grow' }, textInput(draft.name, v => (draft.name = v.toLowerCase()), { maxlength: '32', placeholder: 'bonjour' }))), h('div', { class: 'hint' }, 'Minuscules, chiffres, - et _.')),
            h('div', null, h('label', { class: 'lbl' }, 'Description'), textInput(draft.description, v => (draft.description = v), { maxlength: '100', placeholder: 'Ce que fait la commande' }))
          ),
          h('label', { class: 'lbl' }, 'Options de la commande'),
          optionsEditor(draft.options)
        );
      } else {
        fields.push(
          h('div', { class: 'grid2' },
            h('div', null, h('label', { class: 'lbl' }, 'Nom (pour vous repérer)'), textInput(draft.name, v => (draft.name = v), { maxlength: '50', placeholder: trigger === 'memberJoin' ? "Message d'accueil" : 'Mon automatisation' })),
            trigger === 'button' ? h('div', null, h('label', { class: 'lbl' }, 'Identifiant du bouton'), textInput(draft.triggerKey, v => (draft.triggerKey = v.toLowerCase()), { maxlength: '40', placeholder: 'accepter' }), h('div', { class: 'hint' }, 'À reprendre dans le bloc qui crée le bouton.')) : null
          )
        );
      }

      if (trigger === 'slash' || trigger === 'button') {
        fields.push(
          h('label', { class: 'lbl' }, 'Qui peut l\'utiliser ?'),
          h('div', { class: 'hint', style: 'margin:-2px 0 6px' }, 'Laissez vide pour tout le monde.'),
          roleSelect(draft.allowedRoles, v => (draft.allowedRoles = v)),
          h('label', { class: 'check', style: 'margin-top:12px' }, (() => { const c = h('input', { type: 'checkbox', checked: draft.ephemeral }); c.addEventListener('change', () => (draft.ephemeral = c.checked)); return c; })(), ' Les réponses ne sont visibles que par la personne qui utilise la commande')
        );
      } else {
        fields.push(h('div', { class: 'hint', style: 'margin-top:8px' }, 'Les blocs « Répondre » n\'ont pas d\'effet ici : utilisez « Envoyer dans un salon » ou « Envoyer un message privé ». {user} désigne le membre concerné.'));
      }

      // Zone de contenu : blocs ou JavaScript
      const content = h('div');
      const tabBlocks = h('button', { class: 'active' }, '🧩 Blocs');
      const tabScript = h('button', null, '</> JavaScript');

      function showContent() {
        tabBlocks.className = draft.mode === 'blocks' ? 'active' : '';
        tabScript.className = draft.mode === 'script' ? 'active' : '';
        if (draft.mode === 'blocks') {
          const vars = SCHEMA.variables.map(([v, d]) => h('div', null, h('code', null, v), ' ' + d));
          content.replaceChildren(
            h('details', { class: 'hint', style: 'margin-bottom:10px' }, h('summary', { style: 'cursor:pointer' }, 'Variables utilisables dans les champs texte'), h('div', { style: 'margin-top:6px' }, ...vars)),
            programEditor(draft.program)
          );
        } else if (!info.canScript || !info.scriptAvailable) {
          content.replaceChildren(h('div', { class: 'empty-state' }, h('b', null, 'JavaScript indisponible'), !info.scriptAvailable ? 'Le serveur du bot doit utiliser Node.js 20 ou plus récent.' : "Seuls le propriétaire du bot et les personnes listées dans SCRIPT_EDITOR_IDS peuvent écrire des scripts."));
        } else {
          const area = h('textarea', { class: 'code', spellcheck: 'false', style: 'min-height:340px' }, draft.script);
          area.addEventListener('input', () => (draft.script = area.value));
          area.addEventListener('keydown', e => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const s = area.selectionStart;
              area.value = area.value.slice(0, s) + '  ' + area.value.slice(area.selectionEnd);
              area.selectionStart = area.selectionEnd = s + 2;
              draft.script = area.value;
            }
          });
          content.replaceChildren(
            h('div', { class: 'hint', style: 'margin-bottom:8px' }, "Le script tourne dans un environnement isolé (pas de fichiers, pas de modules, 20 secondes maximum). Il agit sur Discord uniquement avec les fonctions ci-dessous."),
            area
          );
        }
      }

      tabBlocks.addEventListener('click', () => {
        draft.mode = 'blocks';
        showContent();
      });
      tabScript.addEventListener('click', () => {
        draft.mode = 'script';
        showContent();
      });
      showContent();

      const save = h('button', { class: 'btn' }, 'Enregistrer');
      save.addEventListener('click', async () => {
        const result = await run(save, () => (existing ? api('PUT', `/api/guilds/${gid}/custom/${existing.id}`, draft) : api('POST', `/api/guilds/${gid}/custom`, draft)), 'Commande enregistrée');
        if (result) {
          if (result.warning) toast(result.warning, 'error');
          existing = result.action;
          draft.name = result.action.name;
        }
      });

      const enabled = toggle(draft.enabled, v => (draft.enabled = v));

      container.replaceChildren(
        h('div', { class: 'crumbs' }, back),
        h('div', { class: 'card' },
          h('div', { class: 'row' }, h('h3', null, (existing ? 'Modifier' : 'Créer') + ' · ' + t.icon + ' ' + t.label), h('div', { class: 'row', style: 'gap:8px' }, h('span', { class: 'hint' }, 'Active'), enabled)),
          ...fields
        ),
        h('div', { class: 'card' }, h('div', { class: 'tabs' }, tabBlocks, tabScript), content),
        h('div', { class: 'actions' }, save)
      );
    }

    renderList();
    return container;
  }

  const RENDERERS = {
    overview: pageOverview,
    binds: pageBinds,
    denylists: pageDenylists,
    audit: pageAudit,
    general: pageGeneral,
    messages: pageMessages,
    events: pageEvents,
    custom: pageCustom,
    tickets: pageTickets,
    giveaways: pageGiveaways,
    invites: pageInvites
  };

  // ───── Routage ─────

  async function showPage() {
    const token = ++renderToken;
    const main = document.getElementById('main');
    if (!main) return;
    main.replaceChildren(h('div', { class: 'loading' }, 'Chargement…'));
    try {
      const node = await RENDERERS[state.page]();
      if (token === renderToken) main.replaceChildren(node);
    } catch (error) {
      if (token === renderToken) main.replaceChildren(card('Erreur', error.message));
    }
  }

  async function route() {
    if (!state.me) return;

    const guilds = state.me.guilds;
    if (guilds.length === 0) {
      app.replaceChildren(
        h(
          'div',
          { class: 'login' },
          h(
            'div',
            { class: 'box' },
            h('h1', null, 'Aucun serveur disponible'),
            h('p', { class: 'sub' }, 'Pour utiliser le panel, il faut avoir la permission « Gérer le serveur » sur un serveur où le bot est présent.')
          )
        )
      );
      return;
    }

    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const gid = guilds.some(g => g.id === parts[0]) ? parts[0] : guilds[0].id;
    const page = RENDERERS[parts[1]] ? parts[1] : 'overview';

    const guildChanged = gid !== state.guildId || !state.meta;
    state.guildId = gid;
    state.page = page;

    if (guildChanged) {
      app.replaceChildren(h('div', { class: 'loading' }, 'Chargement…'));
      try {
        state.meta = await api('GET', `/api/guilds/${gid}/meta`);
      } catch (error) {
        app.replaceChildren(h('div', { class: 'login' }, h('div', { class: 'box' }, h('h1', null, 'Erreur'), h('p', { class: 'sub' }, error.message))));
        return;
      }
    }

    renderLayout();
    showPage();
  }

  window.addEventListener('hashchange', route);

  (async function boot() {
    try {
      state.me = await api('GET', '/api/me');
    } catch (error) {
      renderLogin();
      return;
    }
    route();
  })();
})();
