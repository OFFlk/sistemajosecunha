/* ════════════════════════════════════════════════════════════════
   log.js — registro de gravações (criar / editar / excluir)

   Carregar DEPOIS do auth.firebase.js e do db.firebase.js:
     <script src="../log.js"></script>

   Usa o mesmo Firestore das páginas (SDK compat: window.Auth.db).
   Os registros ficam na coleção de topo `logs`, um documento por ação:

     acao        'criar' | 'editar' | 'excluir' | 'restaurar' | 'limpeza'
     schoolId    escola afetada (ou null)
     colecao     nome da coleção alterada (ou null)
     docId       id do documento alterado (ou null)
     pagina      arquivo da página que fez a ação
     uid/email/nome   quem fez
     resumo      texto curto (usado em ações em massa)
     campos      lista dos campos que mudaram (editar/criar)
     antes       JSON (texto) — só os campos alterados; na exclusão, o documento inteiro
     depois      JSON (texto) — só os campos alterados; na criação, o documento inteiro
     criadoEm    serverTimestamp
     expiraEm    criadoEm + RETENCAO_DIAS (a política de TTL apaga sozinha)

   `antes` e `depois` são gravados como TEXTO (JSON) de propósito: assim o
   Firestore não cria um índice para cada subcampo e não reclama de
   undefined, arrays aninhados etc.
   ════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var COLECAO = 'logs';
  var RETENCAO_DIAS = 365;            // quanto tempo o log fica (TTL em `expiraEm`)
  var LIMITE_JSON = 60000;            // caracteres por campo antes/depois
  var IGNORAR = { updatedAt: 1, createdAt: 1, _id: 1 };   // não contam como alteração

  /* ── utilitários ── */
  function _db() { return global.Auth && global.Auth.db; }
  function _fv() { return global.firebase.firestore.FieldValue; }

  function _pagina() {
    try { return (location.pathname.split('/').pop() || '') || null; } catch (_e) { return null; }
  }

  function _usuario() {
    var uid = null, email = null, nome = null;
    try {
      var u = global.firebase.auth().currentUser;
      if (u) { uid = u.uid || null; email = u.email || null; nome = u.displayName || null; }
    } catch (_e) {}
    try {
      var s = global.Auth && global.Auth.getSession && global.Auth.getSession();
      if (s) {
        uid = uid || s.uid || null;
        email = email || s.email || null;
        nome = nome || s.displayName || s.nome || s.name || null;
      }
    } catch (_e) {}
    return { uid: uid, email: email, nome: nome };
  }

  // Converte qualquer valor em algo que cabe em JSON (Timestamp → ISO, sentinela → some).
  function _plano(v, nivel) {
    if (v === undefined || typeof v === 'function') return undefined;
    if (v === null || typeof v !== 'object') return v;
    if (typeof v.toDate === 'function') {                       // Timestamp do Firestore
      try { return v.toDate().toISOString(); } catch (_e) { return undefined; }
    }
    if (v instanceof Date) return v.toISOString();
    if (typeof v._methodName === 'string') return undefined;    // FieldValue (serverTimestamp etc.)
    if ((nivel || 0) > 12) return '[profundo demais]';
    var i, out;
    if (Array.isArray(v)) {
      out = [];
      for (i = 0; i < v.length; i++) {
        var p = _plano(v[i], (nivel || 0) + 1);
        out.push(p === undefined ? null : p);
      }
      return out;
    }
    out = {};
    Object.keys(v).forEach(function (k) {
      var x = _plano(v[k], (nivel || 0) + 1);
      if (x !== undefined) out[k] = x;
    });
    return out;
  }

  function _json(v) {
    var s = JSON.stringify(v);
    if (s.length > LIMITE_JSON) {
      return JSON.stringify({ _truncado: true, tamanho: s.length, chaves: Object.keys(v || {}) });
    }
    return s;
  }

  // Só o que mudou (nível dos campos do documento).
  function _diff(antes, depois) {
    var a = _plano(antes || {}, 0) || {};
    var d = _plano(depois || {}, 0) || {};
    var chaves = {};
    Object.keys(a).concat(Object.keys(d)).forEach(function (k) { chaves[k] = 1; });
    var campos = [], ta = {}, td = {};
    Object.keys(chaves).forEach(function (k) {
      if (IGNORAR[k]) return;
      if (JSON.stringify(a[k]) === JSON.stringify(d[k])) return;
      campos.push(k);
      if (k in a) ta[k] = a[k];
      if (k in d) td[k] = d[k];
    });
    return { campos: campos, antes: ta, depois: td };
  }

  // Deduz escola/coleção/id pelo caminho do documento (schools/{escola}/{coleção}/{id}).
  function _doRef(ref) {
    var out = {};
    try {
      out.docId = ref.id;
      out.colecao = ref.parent.id;
      var m = /^schools\/([^/]+)\//.exec(ref.path);
      if (m) out.schoolId = m[1];
    } catch (_e) {}
    return out;
  }

  /* ── montagem do registro ── */
  // Devolve o objeto pronto para gravar, ou null quando não há nada a registrar
  // (edição sem nenhuma diferença → não gasta gravação).
  function montar(e) {
    e = e || {};
    var acao = e.acao;
    var antes = null, depois = null, campos = null;

    if (acao === 'editar') {
      var d = _diff(e.antes, e.depois);
      if (!d.campos.length) return null;
      campos = d.campos; antes = d.antes; depois = d.depois;
    } else if (acao === 'criar') {
      depois = _plano(e.depois || {}, 0) || {};
      campos = Object.keys(depois).filter(function (k) { return !IGNORAR[k]; });
    } else if (acao === 'excluir') {
      antes = _plano(e.antes || {}, 0) || {};
    }

    var u = _usuario();
    return {
      acao: acao || null,
      schoolId: e.schoolId ? String(e.schoolId) : null,
      colecao: e.colecao || null,
      docId: e.docId ? String(e.docId) : null,
      pagina: e.pagina || _pagina(),
      uid: u.uid,
      email: u.email,
      nome: u.nome,
      resumo: e.resumo || null,
      campos: campos,
      antes: antes !== null ? _json(antes) : null,
      depois: depois !== null ? _json(depois) : null,
      criadoEm: _fv().serverTimestamp(),
      expiraEm: global.firebase.firestore.Timestamp.fromMillis(Date.now() + RETENCAO_DIAS * 86400000)
    };
  }

  /* ── 1) Dentro de um batch (atômico com a alteração) ── */
  // Uso:  const b = Auth.db.batch();
  //       b.set(ref, dados, { merge:true });
  //       Log.noBatch(b, { acao:'editar', schoolId, colecao:'turmas', docId, antes, depois });
  //       await b.commit();
  function noBatch(batch, e) {
    var dados = montar(e);
    if (!dados) return null;
    var ref = _db().collection(COLECAO).doc();
    batch.set(ref, dados);
    return ref;
  }

  /* ── 2) Registro avulso (não derruba a operação se falhar) ── */
  // Uso em ações em massa (restaurar, limpar): um registro por ação, sem cópia dos documentos.
  async function registrar(e) {
    try {
      var dados = montar(e);
      if (!dados) return false;
      await _db().collection(COLECAO).add(dados);
      return true;
    } catch (err) {
      console.error('[log] não foi possível registrar:', err);
      return false;
    }
  }

  /* ── 3) Atalhos para um documento só ── */
  // Salva e registra no mesmo batch. `antes` = como o documento estava (se tiver);
  // sem `antes` o registro é 'criar', com `antes` é 'editar'.
  async function salvarDoc(ref, dados, opts) {
    opts = opts || {};
    var b = _db().batch();
    if (opts.merge) b.set(ref, dados, { merge: true }); else b.set(ref, dados);
    var base = _doRef(ref);
    noBatch(b, {
      acao: opts.antes ? 'editar' : 'criar',
      schoolId: opts.schoolId || base.schoolId,
      colecao: opts.colecao || base.colecao,
      docId: base.docId,
      antes: opts.antes,
      depois: dados,
      resumo: opts.resumo
    });
    await b.commit();
  }

  // Exclui e guarda uma cópia do documento no log. Sem `antes`, lê o documento (1 leitura).
  async function excluirDoc(ref, opts) {
    opts = opts || {};
    var antes = opts.antes;
    if (antes === undefined) {
      var snap = await ref.get();
      antes = snap.exists ? snap.data() : {};
    }
    var b = _db().batch();
    b.delete(ref);
    var base = _doRef(ref);
    noBatch(b, {
      acao: 'excluir',
      schoolId: opts.schoolId || base.schoolId,
      colecao: opts.colecao || base.colecao,
      docId: base.docId,
      antes: antes,
      resumo: opts.resumo
    });
    await b.commit();
  }

  global.Log = {
    COLECAO: COLECAO,
    RETENCAO_DIAS: RETENCAO_DIAS,
    montar: montar,
    noBatch: noBatch,
    registrar: registrar,
    salvarDoc: salvarDoc,
    excluirDoc: excluirDoc
  };
})(window);
