// header-logic.js
(function () {
  'use strict';

  // Aplica o tema salvo imediatamente, antes do fetch do header (evita flash nos hubs)
  try {
    document.documentElement.setAttribute(
      'data-theme', localStorage.getItem('ui_theme_v1') === 'dark' ? 'dark' : 'light'
    );
  } catch (_) {}

  // Páginas sem botões (index, login, cadastro)
  var PAGES_NONE = [
    '/index',
    '/',
    '/login',
    '/cadastro_usuario'
  ];

  // Páginas só com Home (hubs raiz — sem btn-back)
  var PAGES_HOME_ONLY = [
    '/ano-ativo/ano-ativo',
    '/atas/atas',
    '/admin/admin',
    '/paginas/escola',
    '/paginas/documentos',
    '/funcionarios/funcionarios'
  ];

  // Hubs filhos: btn-back aponta para o hub pai (link fixo, não history.back)
  var PAGES_PARENT = {
    '/ano-ativo/pesquisa-ano-ativo':     '/ano-ativo/ano-ativo.html',
    // Após editar, o cadastro redireciona para a pesquisa; o Voltar da pesquisa
    // deve ir SEMPRE ao hub (senão voltaria ao cadastro em modo edição).
    '/funcionarios/pesquisa-funcionario': '/funcionarios/funcionarios.html'
  };

  // Normaliza o pathname: remove .html do final e barra final (exceto raiz)
  function normalizePath(path) {
    var p = path.replace(/\.html$/, '');
    if (p !== '/') p = p.replace(/\/$/, '');
    return p;
  }

  function getPageMode() {
    var path = normalizePath(window.location.pathname);
    for (var i = 0; i < PAGES_NONE.length; i++) {
      if (path === PAGES_NONE[i]) return 'none';
    }
    for (var j = 0; j < PAGES_HOME_ONLY.length; j++) {
      if (path === PAGES_HOME_ONLY[j]) return 'home';
    }
    return 'both';
  }

  // ─── 1. Fetch e injeta o header-component.html ────────────────────────────
  function buildHeader(callback) {
    var placeholder = document.getElementById('header-placeholder');
    if (!placeholder) { if (callback) callback(); return; }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/header-component.html', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        placeholder.innerHTML = xhr.responseText;
      }
      if (callback) callback();
    };
    xhr.onerror = function () {
      if (callback) callback();
    };
    xhr.send();
  }

  // ─── 2. Aplica visibilidade dos botões conforme a página ─────────────────
  function applyButtonVisibility() {
    var mode    = getPageMode();
    var path    = normalizePath(window.location.pathname);
    var btnBack = document.getElementById('headerBtnBack');
    var btnHome = document.getElementById('headerBtnHome');

    if (!btnBack || !btnHome) return;

    if (mode === 'none') {
      btnBack.style.display = 'none';
      btnHome.style.display = 'none';
    } else if (mode === 'home') {
      btnBack.style.display = 'none';
      btnHome.style.display = 'inline-flex';
    } else {
      btnBack.style.display = 'inline-flex';
      btnHome.style.display = 'inline-flex';

      // Se a página tem um hub pai definido, btn-back usa link fixo
      // em vez de history.back(), evitando loop no histórico
      if (PAGES_PARENT[path]) {
        btnBack.href = PAGES_PARENT[path];
        btnBack.onclick = null;
        var label = btnBack.querySelector('.b-label');
        if (label) label.textContent = 'Voltar';
      }
    }
  }

  // ─── 3. Lógica de tema ────────────────────────────────────────────────────
  function setupTheme() {
    var btn  = document.getElementById('themeToggle');
    var btnC = document.getElementById('themeToggleCompact');
    if (!btn) return;

    function applyTheme(theme) {
      var t = (theme === 'dark') ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('ui_theme_v1', t);
      var emoji = (t === 'dark') ? '☀️' : '🌙';
      var label = (t === 'dark') ? 'Claro' : 'Escuro';
      var icon  = document.getElementById('themeIcon');
      var iconC = document.getElementById('themeIconCompact');
      var text  = document.getElementById('themeText');
      if (icon)  icon.textContent  = emoji;
      if (iconC) iconC.textContent = emoji;
      if (text)  text.textContent  = label;
      // linha de tema do painel (≤768px): mesmo texto de ação dos outros botões
      var rowIcon = document.getElementById('themeIconRow');
      var rowText = document.getElementById('themeTextRow');
      if (rowIcon) rowIcon.textContent = emoji;
      if (rowText) rowText.textContent = (t === 'dark') ? 'Tema claro' : 'Tema escuro';
    }

    var mode = getPageMode();
    var compact = (mode === 'both');
    btn.style.display          = compact ? 'none'        : 'inline-flex';
    if (btnC) btnC.style.display = compact ? 'inline-flex' : 'none';

    applyTheme(localStorage.getItem('ui_theme_v1') || 'light');

    function toggle() {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }
    btn.addEventListener('click', toggle);
    if (btnC) btnC.addEventListener('click', toggle);
  }

  // ─── 4. Chip de usuário + escola ──────────────────────────────────────────
  // Listeners do document são registrados UMA vez; renderContext só troca o alvo.
  var closeCurrentMenu = function () {};
  var activeSelect = null;
  var globalsBound = false;

  function styleSelectOptions() {
    var sel = activeSelect;
    if (!sel || !sel.isConnected) return;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var opts = Array.prototype.slice.call(sel.options);
    if (!dark) {
      opts.forEach(function (o) { o.style.background = ''; o.style.color = ''; });
      return;
    }
    // <option> ignora CSS em vários navegadores: precisa de inline style.
    var key = (window.ThemeColors && window.ThemeColors.get) ? window.ThemeColors.get() : 'violet';
    var palette = (window.ThemeColors && window.ThemeColors.palettes && window.ThemeColors.palettes[key])
                  || { '--brand-text-d': '#c4b5fd' };
    var bg = getComputedStyle(document.documentElement).getPropertyValue('--dropdown-bg').trim() || '#0f1829';
    var color = palette['--brand-text-d'] || '#c4b5fd';
    opts.forEach(function (o) { o.style.background = bg; o.style.color = color; });
  }

  function bindGlobalsOnce() {
    if (globalsBound) return;
    globalsBound = true;
    document.addEventListener('click', function () { closeCurrentMenu(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeCurrentMenu(); });
    document.addEventListener('colorchange', styleSelectOptions);
    new MutationObserver(styleSelectOptions)
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function safeParse(json, fallback) {
    try { var v = JSON.parse(json); return (v == null ? fallback : v); } catch (_) { return fallback; }
  }
  function getSession() {
    if (window.Auth && typeof Auth.getSession === 'function') return Auth.getSession();
    return safeParse(localStorage.getItem('auth_session_v2') || 'null', null);
  }
  function listSchools() {
    if (window.Auth && typeof Auth.listSchools === 'function') return Auth.listSchools() || [];
    return safeParse(localStorage.getItem('auth_schools_v1') || '[]', []);
  }
  // Nome de exibição de um cadastro de escola (o displayName é o oficial)
  function schoolLabel(x) {
    if (!x) return '';
    return (x.displayName || x.name || x.nome || x.schoolName || '').toString().trim();
  }
  function sameId(a, b) {
    return (a == null ? '' : String(a)).trim().toLowerCase() === (b == null ? '' : String(b)).trim().toLowerCase();
  }

  function getActiveSchoolId(session) {
    if (!session) return null;
    var sid = (session.schoolId || '').toString();
    if (sid.toUpperCase() !== 'ADMIN') return sid;
    return (localStorage.getItem('admin_active_school_v1') || '').trim() || 'ADMIN';
  }

  // Linha "Tema claro/escuro" do painel do menu (≤768px; oculta por CSS em telas maiores).
  // Reaproveita o botão #themeToggle (mesmo handler), então não duplica a lógica do tema.
  function buildThemeRow() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'ctx-theme-row';
    var ic = document.createElement('span');
    ic.id = 'themeIconRow';
    ic.textContent = dark ? '☀️' : '🌙';
    var tx = document.createElement('span');
    tx.id = 'themeTextRow';
    tx.textContent = dark ? 'Tema claro' : 'Tema escuro';
    row.appendChild(ic);
    row.appendChild(tx);
    row.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var t = document.getElementById('themeToggle');
      if (t) t.click();
    });
    return row;
  }

  function renderContext() {
    var host = document.getElementById('headerContext');
    if (!host) return;
    bindGlobalsOnce();
    activeSelect = null;
    var s = getSession();
    host.innerHTML = '';
    if (!s) { host.appendChild(buildThemeRow()); return; }   // login/cadastro: o painel só tem o tema

    var email    = (s.email || '').toString();
    var name     = (s.name || s.displayName || '').toString() || (email ? email.split('@')[0] : 'Usuário');
    var role     = (s.role || '').toString();
    var schoolId = (s.schoolId || '').toString();

    var user = document.createElement('div');
    user.className = 'ctx-chip ctx-clickable';
    user.setAttribute('role', 'button');
    user.setAttribute('tabindex', '0');
    user.setAttribute('aria-haspopup', 'true');
    user.setAttribute('aria-expanded', 'false');
    user.setAttribute('aria-label', 'Menu do usuário: ' + name);

    var avatar = document.createElement('div');
    avatar.className = 'avatar';
    if (s.photoURL) {
      var img = document.createElement('img');
      img.src = s.photoURL;
      img.style.cssText = 'width:100%;height:100%;border-radius:999px;object-fit:cover;';
      img.onerror = function () { avatar.textContent = '👤'; };
      avatar.appendChild(img);
    } else {
      avatar.textContent = '👤';
    }

    var textWrap = document.createElement('div');
    textWrap.className = 'text';
    var nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = name;
    var subEl = document.createElement('div');
    subEl.className = 'sub';
    subEl.textContent = email || role;
    textWrap.appendChild(nameEl);
    textWrap.appendChild(subEl);

    var menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.id = 'userMenu';

    // Nome e e-mail no topo do menu: em ≤1024px o chip vira só avatar e é aqui que se lê
    // quem está logado (o CSS oculta este bloco em tela larga).
    var info = document.createElement('div');
    info.className = 'menu-user';
    var infoName = document.createElement('div');
    infoName.className = 'mu-name';
    infoName.textContent = name;
    var infoSub = document.createElement('div');
    infoSub.className = 'mu-sub';
    infoSub.textContent = email || role;
    info.appendChild(infoName);
    info.appendChild(infoSub);
    menu.appendChild(info);

    var btnPerfil = document.createElement('button');
    btnPerfil.type = 'button';
    btnPerfil.className = 'menu-btn';
    btnPerfil.textContent = '👤 Meu perfil';

    var btnLogout = document.createElement('button');
    btnLogout.type = 'button';
    btnLogout.className = 'menu-btn danger';
    btnLogout.textContent = '🚪 Sair';

    menu.appendChild(btnPerfil);
    menu.appendChild(btnLogout);

    user.appendChild(avatar);
    user.appendChild(textWrap);
    user.appendChild(menu);

    function closeMenu()  { menu.classList.remove('open'); user.setAttribute('aria-expanded', 'false'); }
    function toggleMenu() { var open = menu.classList.toggle('open'); user.setAttribute('aria-expanded', open ? 'true' : 'false'); }

    user.addEventListener('click', function (ev) {
      if (ev.target && (ev.target === btnLogout || ev.target.closest('.ctx-menu'))) return;
      ev.stopPropagation(); toggleMenu();
    });
    user.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleMenu(); }
      if (ev.key === 'Escape') closeMenu();
    });
    closeCurrentMenu = closeMenu;

    btnPerfil.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      window.location.href = '/perfil.html';
    });
    btnLogout.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      try {
        if (window.Auth && typeof Auth.logout === 'function') Auth.logout();
        else { localStorage.removeItem('auth_session_v2'); localStorage.removeItem('auth_return_to_v2'); }
      } catch (_) {}
      window.location.href = '/login.html';
    });

    host.appendChild(user);

    var schools   = listSchools();
    var effective = getActiveSchoolId(s);
    var matched   = schools.find(function (x) { return x && sameId(x.schoolId, effective); })
                 || schools.find(function (x) { return x && sameId(x.id, effective); });
    var schoolName = schoolLabel(matched);

    var wrap = document.createElement('div');
    wrap.className = 'school-pill';
    var lbl = document.createElement('span');
    lbl.textContent = '◈';
    wrap.appendChild(lbl);

    if (schoolId.toUpperCase() === 'ADMIN' && Array.isArray(schools) && schools.length) {
      var sel = document.createElement('select');
      var optAll = document.createElement('option');
      optAll.value = 'ADMIN';
      optAll.textContent = 'Todas as escolas (ADMIN)';
      sel.appendChild(optAll);
      var seen = new Set();
      schools
        .map(function (x) { return { schoolId: (x.schoolId || x.id || '').toString(), name: schoolLabel(x) }; })
        .filter(function (o) { return o.schoolId && o.schoolId !== 'ADMIN' && !seen.has(o.schoolId) && seen.add(o.schoolId); })
        .sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); })
        .forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = o.schoolId;
          opt.textContent = o.name || o.schoolId;
          sel.appendChild(opt);
        });
      sel.value = effective;
      sel.addEventListener('change', function () {
        if (sel.value === 'ADMIN') localStorage.removeItem('admin_active_school_v1');
        else localStorage.setItem('admin_active_school_v1', sel.value);
        location.reload();
      });
      wrap.appendChild(sel);

      activeSelect = sel;
      styleSelectOptions();
    } else {
      var span = document.createElement('span');
      // Prioridade: displayName do cadastro de escolas > nome gravado na sessão > ID.
      // (Antes a sessão vinha primeiro; se ela guardava o ID em schoolName, o ID aparecia.)
      var sessionSchoolName = (s.schoolName || '').toString().trim();
      span.textContent = schoolName || sessionSchoolName || schoolId;
      wrap.appendChild(span);
    }
    host.appendChild(wrap);
    host.appendChild(buildThemeRow());
  }

  // ─── 5. Auth guard ────────────────────────────────────────────────────────
  function runAuthGuard() {
    if (window.Auth && typeof Auth.requireAuth === 'function') {
      Auth.requireAuth('/login.html');
    }
  }

  // ─── 5-A. Botão ☰ (≤768px): abre/fecha o painel com escola, usuário e tema ──
  // O painel é o próprio #headerContext (o CSS o posiciona); aqui só se alterna a
  // classe .menu-open no header. Fecha ao tocar fora, com Esc e ao voltar para tela larga.
  function setupMenuToggle() {
    var btn = document.getElementById('headerMenuBtn');
    var header = document.querySelector('.app-header');
    if (!btn || !header) return;
    function set(open) {
      header.classList.toggle('menu-open', !!open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      set(!header.classList.contains('menu-open'));
    });
    document.addEventListener('click', function (ev) {
      if (!ev.target.closest || !ev.target.closest('#headerContext')) set(false);
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') set(false); });
    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width: 769px)');
      var onChange = function (e) { if (e.matches) set(false); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  // ─── 5-B. Altura real do header → --header-height ───────────────────────
  // A altura varia (1 ou 2 linhas no celular). O base.css só traz um valor inicial;
  // aqui ele passa a acompanhar a medida, para scroll-padding e cálculos de modal
  // (que usam o topo útil da tela) ficarem certos em qualquer largura.
  function trackHeaderHeight() {
    var header = document.querySelector('.app-header');
    if (!header) return;
    function set() {
      // +2px = barra gradiente do topo (o header gruda em top:2px)
      document.documentElement.style.setProperty('--header-height', (header.offsetHeight + 2) + 'px');
    }
    set();
    if (window.ResizeObserver) new ResizeObserver(set).observe(header);
    else window.addEventListener('resize', set);
  }

  // ─── 6. Inicialização ────────────────────────────────────────────────────
  function init() {
    buildHeader(function () {
      applyButtonVisibility();
      setupTheme();
      renderContext();
      setupMenuToggle();
      trackHeaderHeight();
      runAuthGuard();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('auth:ready',          function () { renderContext(); });
  document.addEventListener('auth:sessionChanged', function () { renderContext(); });

})();
