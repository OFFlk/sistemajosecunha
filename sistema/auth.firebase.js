/**
 * auth.firebase.js — substitui auth.local.js em todo o sistema
 * Carrega o Firebase SDK via CDN e expõe window.Auth com a mesma API
 * que o sistema já usa (getSession, logout, requireAuth, listSchools...).
 *
 * CORREÇÃO: window.Auth é exposto IMEDIATAMENTE (síncrono) para que
 * requireAuth() funcione mesmo antes dos SDKs do Firebase carregarem.
 *
 * Uso: <script src="/auth.firebase.js"></script>   (raiz)
 *      <script src="../auth.firebase.js"></script>  (subpastas)
 */
(function () {
  'use strict';

  /* ─── Configuração do projeto Firebase ─── */
  const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyBr_ZZGDHh9292TWK7agvAYCx72990M7ro",
    authDomain:        "sistema-jose-cunha.firebaseapp.com",
    projectId:         "sistema-jose-cunha",
    storageBucket:     "sistema-jose-cunha.firebasestorage.app",
    messagingSenderId: "587805492569",
    appId:             "1:587805492569:web:85830aa277cf6c75ecf848"
  };

  const FB_VER = '10.12.0';
  const FB_CDN = `https://www.gstatic.com/firebasejs/${FB_VER}`;

  /* ─── Estado interno ─── */
  let _db, _auth;
  let _session  = null;
  let _schools  = null;
  let _ready    = false;
  let _readyCbs = [];

  /* ─── Helpers ─── */
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function safeParse(json, fb) {
    try { const v = JSON.parse(json); return v == null ? fb : v; } catch { return fb; }
  }

  function onReady(cb) {
    if (_ready) { try { cb(); } catch(e) {} }
    else _readyCbs.push(cb);
  }

  function fireReady() {
    _ready = true;
    const cbs = _readyCbs.splice(0);
    cbs.forEach(cb => { try { cb(); } catch(e) {} });
    document.dispatchEvent(new CustomEvent('auth:ready', { detail: _session }));
  }

  function activeSchoolId(session) {
    if (!session) return null;
    const sid = String(session.schoolId || '');
    if (sid.toUpperCase() !== 'ADMIN') return sid;
    return (localStorage.getItem('admin_active_school_v1') || '').trim() || 'ADMIN';
  }

  /* ─── Carrega perfil do Firestore e monta _session ─── */
  async function loadProfile(user) {
    const snap = await _db.collection('users').doc(user.uid).get();
    const p    = snap.data() || {};
    _session = {
      uid:         user.uid,
      email:       user.email || '',
      name:        p.name || user.displayName || (user.email || '').split('@')[0],
      displayName: p.name || user.displayName || '',
      role:        p.role    || 'user',
      schoolId:    p.schoolId || '',
      photoURL:    p.photoURL || user.photoURL || null,
    };
    try { localStorage.setItem('auth_session_v2', JSON.stringify(_session)); } catch {}

    // Autocura: perfil.html troca o email só via verifyBeforeUpdateEmail(),
    // que atualiza o Firebase Auth (assíncrono, após o usuário clicar no
    // link de confirmação) mas nunca escreve no doc users/{uid} do Firestore.
    // Isso deixava o Firestore com o email antigo para sempre — e é o que
    // cadastro_admin.html lê via listUsers(). Aqui, toda vez que a sessão é
    // carregada (login, refresh de página, refreshSession()), comparamos com
    // o email atual do Auth — que essa altura já é o correto, pós-confirmação
    // — e sincronizamos o Firestore se estiverem diferentes.
    if (snap.exists && user.email && p.email !== user.email) {
      try {
        await _db.collection('users').doc(user.uid).update({ email: user.email });
      } catch (e) {
        console.warn('Auth: falha ao sincronizar email no Firestore', e);
      }
    }

    if (_session.role === 'admin' || _session.schoolId?.toUpperCase() === 'ADMIN') {
      try {
        const ss = await _db.collection('schools').get();
        _schools = ss.docs.map(d => ({ schoolId: d.id, id: d.id, ...d.data() }));
        localStorage.setItem('auth_schools_v1', JSON.stringify(_schools));
      } catch {
        _schools = safeParse(localStorage.getItem('auth_schools_v1'), []);
      }
    } else if (_session.schoolId) {
      // Usuário comum: busca o nome da escola no Firestore e salva na sessão
      try {
        const schoolSnap = await _db.collection('schools').doc(_session.schoolId).get();
        if (schoolSnap.exists) {
          const sd = schoolSnap.data();
          _session.schoolName = (sd.displayName || sd.name || sd.nome || '').toString().trim();
          localStorage.setItem('auth_session_v2', JSON.stringify(_session));
        }
      } catch {}
    }
  }

  /* ══════════════════════════════════════════════════════
     window.Auth é exposto AGORA, de forma SÍNCRONA.
     Todos os métodos fecham sobre as variáveis do escopo
     (_session, _ready, _readyCbs) que existem imediatamente.
     Assim requireAuth() funciona mesmo antes do Firebase
     terminar de carregar os SDKs.
  ══════════════════════════════════════════════════════ */
  window.Auth = {

    /** Retorna a sessão atual (síncrono — usa cache). */
    getSession() {
      if (_session) return _session;
      return safeParse(localStorage.getItem('auth_session_v2'), null);
    },

    /** Lista de escolas cadastradas (só visível para admin). */
    listSchools() {
      if (_schools) return _schools;
      return safeParse(localStorage.getItem('auth_schools_v1'), []);
    },

    /** Lista todos os usuários (só admin). */
    async listUsers() {
      const snap = await _db.collection('users').get();
      return snap.docs.map(d => {
        const data = d.data();
        delete data.uid; // garante que o uid sempre vem do ID do documento
        return { uid: d.id, _id: d.id, ...data };
      });
    },

    /** Lista usuários com role='pending' (solicitações). */
    async listPendingUsers() {
      const snap = await _db.collection('users').where('role', '==', 'pending').get();
      return snap.docs.map(d => {
        const data = d.data();
        delete data.uid; // garante que o uid sempre vem do ID do documento
        return { uid: d.id, _id: d.id, ...data };
      });
    },

    /** Aprova um usuário pendente definindo role='user'. */
    async approveUser(uid) {
      // Usa set+merge ao invés de update para não falhar se o doc tiver alguma inconsistência
      await _db.collection('users').doc(uid).set({ role: 'user' }, { merge: true });
    },

    /** Reprova/remove um usuário. */
    async deleteUser(uid) {
      await _db.collection('users').doc(uid).delete();
    },

    /** Aguarda o Firebase Auth inicializar e chama o callback. */
    onReady,

    /**
     * Redireciona para login se não houver sessão ativa.
     * Funciona imediatamente — se Firebase ainda não carregou,
     * enfileira o check para quando carregar.
     */
    requireAuth(redirectTo) {
      const dest = redirectTo || '/login.html';
      onReady(() => {
        if (!_session) {
          const ret = encodeURIComponent(location.href);
          window.location.replace(dest + '?next=' + ret);
        } else if (_session.role === 'pending') {
          window.location.replace(dest + '?erro=conta-pendente');
        }
      });
    },

    /** Requer role específica (admin). Redireciona se não tiver. */
    requireRole(role, redirectTo) {
      const dest = redirectTo || '/login.html';
      onReady(() => {
        if (!_session || _session.role !== role) {
          window.location.replace(dest + '?erro=acesso-negado');
        }
      });
    },

    /** Faz logout completo. */
    async logout() {
      try { if (_auth) await _auth.signOut(); } catch {}
      _session = null;
      _schools = null;
      try {
        localStorage.removeItem('auth_session_v2');
        localStorage.removeItem('auth_schools_v1');
        localStorage.removeItem('admin_active_school_v1');
      } catch {}
      window.location.replace('/login.html');
    },

    /* ── Métodos de login (usados por login.html) ── */

    async loginEmail(email, password) {
      const cred = await _auth.signInWithEmailAndPassword(email, password);
      await loadProfile(cred.user);
      if (_session && _session.role === 'pending') {
        await _auth.signOut();
        _session = null;
        try { localStorage.removeItem('auth_session_v2'); } catch {}
        throw new Error('Sua conta ainda está aguardando aprovação de um administrador.');
      }
      return _session;
    },

    async loginGoogle() {
      const provider = new firebase.auth.GoogleAuthProvider();
      const cred = await _auth.signInWithPopup(provider);
      const snap = await _db.collection('users').doc(cred.user.uid).get();
      if (!snap.exists) {
        await _auth.signOut();
        throw new Error('Esta conta Google não está cadastrada no sistema. Contate o administrador.');
      }
      await loadProfile(cred.user);
      if (_session && _session.role === 'pending') {
        await _auth.signOut();
        _session = null;
        try { localStorage.removeItem('auth_session_v2'); } catch {}
        throw new Error('Sua conta ainda está aguardando aprovação de um administrador.');
      }
      return _session;
    },

    /* ── Métodos administrativos ── */

    async createUser({ email, password, pass, name, role, schoolId }) {
      const pwd = password || pass;
      const appName = 'secondary_' + Date.now();
      const secondaryApp = firebase.initializeApp(FIREBASE_CONFIG, appName);
      try {
        const cred = await secondaryApp.auth().createUserWithEmailAndPassword(email, pwd);
        await _db.collection('users').doc(cred.user.uid).set({
          name:      name     || '',
          email:     email    || '',
          role:      role     || 'user',
          schoolId:  schoolId || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        await secondaryApp.auth().signOut();
        return { ok: true, uid: cred.user.uid };
      } finally {
        try { await secondaryApp.delete(); } catch {}
      }
    },

    // Alias para compatibilidade com cadastro_admin.html
    get createAdmin() { return this.createUser.bind(this); },

    async upsertSchool(dados) {
      const sid = dados.schoolId || dados.id;
      if (!sid) throw new Error('schoolId obrigatório');
      await _db.collection('schools').doc(sid).set(dados, { merge: true });
      _schools = null;
      try { localStorage.removeItem('auth_schools_v1'); } catch {}
      return dados;
    },

    async deleteSchool(sid) {
      await _db.collection('schools').doc(sid).delete();
      _schools = null;
      try { localStorage.removeItem('auth_schools_v1'); } catch {}
    },

    async saveSchool(schoolId, dados) {
      await _db.collection('schools').doc(schoolId).set(dados, { merge: true });
      _schools = null;
      try { localStorage.removeItem('auth_schools_v1'); } catch {}
    },

    async updateProfile(updates) {
      if (!_session) throw new Error('Não autenticado.');
      await _db.collection('users').doc(_session.uid).update(updates);
      Object.assign(_session, updates);
      try { localStorage.setItem('auth_session_v2', JSON.stringify(_session)); } catch {}
    },

    getActiveSchoolId() {
      return activeSchoolId(this.getSession());
    },

    /** Recarrega o perfil do usuário autenticado e atualiza a sessão. */
    async refreshSession() {
      const user = _auth && _auth.currentUser;
      if (!user) return;
      await user.reload();
      await loadProfile(user);
      document.dispatchEvent(new CustomEvent('auth:sessionChanged', { detail: _session }));
    },

    /* ── Instâncias Firebase (usadas por db.firebase.js) ── */
    get firebase() { return firebase; },
    get db()       { return _db; },
    get auth()     { return _auth; },
    get storage()  { return firebase.storage(); },
  };

  /* ─── Inicialização assíncrona do Firebase ─── */
  async function init() {
    await loadScript(`${FB_CDN}/firebase-app-compat.js`);
    await loadScript(`${FB_CDN}/firebase-auth-compat.js`);
    await loadScript(`${FB_CDN}/firebase-firestore-compat.js`);
    await loadScript(`${FB_CDN}/firebase-storage-compat.js`);

    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);

    _auth = firebase.auth();
    _db   = firebase.firestore();

    try { await _db.enablePersistence({ synchronizeTabs: true }); } catch {}

    /* Ouve mudanças de autenticação — fireReady() só dispara uma vez */
    _auth.onAuthStateChanged(async user => {
      if (user) {
        try {
          await loadProfile(user);
        } catch (e) {
          console.warn('Auth: erro ao carregar perfil', e);
          _session = safeParse(localStorage.getItem('auth_session_v2'), null);
        }
      } else {
        _session = null;
        _schools = null;
        try {
          localStorage.removeItem('auth_session_v2');
          localStorage.removeItem('auth_schools_v1');
        } catch {}
      }

      if (!_ready) fireReady();

      document.dispatchEvent(new CustomEvent('auth:sessionChanged', { detail: _session }));
    });
  }

  init().catch(e => console.error('[auth.firebase.js] Erro na inicialização:', e));

})();
