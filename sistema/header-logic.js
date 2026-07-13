// header-logic.js
(function () {
  'use strict';

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
    '/ano-ativo/pesquisa-ano-ativo': '/ano-ativo/ano-ativo.html',
    '/config/schema_ata':      '/config/config.html',
    '/config/idaluno':         '/config/config.html'
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
  function getActiveSchoolId(session) {
    if (!session) return null;
    var sid = (session.schoolId || '').toString();
    if (sid.toUpperCase() !== 'ADMIN') return sid;
    return (localStorage.getItem('admin_active_school_v1') || '').trim() || 'ADMIN';
  }

  function renderContext() {
    var host = document.getElementById('headerContext');
    if (!host) return;
    var s = getSession();
    host.innerHTML = '';
    if (!s) return;

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
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeMenu(); });

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
    var matched   = schools.find(function (x) { return x && (x.schoolId || '').toString() === effective; })
                 || schools.find(function (x) { return x && (x.id || '').toString()       === effective; });
    var schoolName = matched ? (matched.displayName || matched.name || matched.nome || '').toString().trim() : '';

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
        .map(function (x) { return { schoolId: (x.schoolId || x.id || '').toString(), name: (x.displayName || x.name || x.nome || '').toString() }; })
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
    } else {
      var span = document.createElement('span');
      var sessionSchoolName = (s.schoolName || '').toString().trim();
      span.textContent = sessionSchoolName || schoolName || schoolId;
      wrap.appendChild(span);
    }
    host.appendChild(wrap);
  }

  // ─── 5. Auth guard ────────────────────────────────────────────────────────
  function runAuthGuard() {
    if (window.Auth && typeof Auth.requireAuth === 'function') {
      Auth.requireAuth('/login.html');
    }
  }

  // ─── 6. Inicialização ────────────────────────────────────────────────────
  function init() {
    buildHeader(function () {
      applyButtonVisibility();
      setupTheme();
      renderContext();
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
