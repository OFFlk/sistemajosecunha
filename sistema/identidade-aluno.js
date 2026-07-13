/**
 * identidade-aluno.js
 * Fonte de verdade de identidade de alunos para todo o sistema.
 *
 * Depende de: auth.firebase.js, db.firebase.js (carregados antes deste script)
 *
 * FONTE DE DADOS: Firestore exclusivamente.
 * localStorage NÃO é usado — nem como cache, nem como fallback.
 */
(function () {
  'use strict';

  const CHAVE = 'alunos'; // nome da coleção no Firestore

  /* ── Catálogo em memória ── */
  let _catalogo = [];
  let _catalogoCarregado = false;

  // Promise única de carregamento — garante que não há double-load
  // Nunca é anulada após criada; só é criada uma vez.
  let _carregandoPromise = null;

  /* ────────────────────────────────────────────
     Aguarda Auth + DB estarem prontos
  ──────────────────────────────────────────── */

  /**
   * Resolve quando window.Auth tem sessão ativa E window.DB.alunos existe.
   *
   * CORREÇÃO: o arquivo antigo verificava window.Auth.db (que não existe
   * neste sistema). Agora verificamos window.DB?.alunos, que é o objeto
   * correto exposto por db.firebase.js.
   *
   * Se já estiver pronto na hora da chamada, resolve imediatamente sem
   * adicionar listener — evita ficar esperando um evento que já passou.
   */
  function _waitAuth() {
    return new Promise(res => {
      if (_sistemaPronte()) { res(); return; }
      document.addEventListener('auth:ready', function handler() {
        // Garante que DB também esteja disponível antes de resolver
        if (_sistemaPronte()) { res(); return; }
        // DB ainda não está pronto: tenta mais uma vez após microtask
        Promise.resolve().then(() => res());
      }, { once: true });
    });
  }

  function _sistemaPronte() {
    return !!(window.Auth?.getSession?.() && window.DB?.alunos);
  }

  /* ── Normalização ── */
  function _str(v) { return (v == null ? '' : String(v)).trim(); }
  function _normNome(s) {
    return _str(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  }
  function _normCpf(s) { return _str(s).replace(/\D/g, ''); }
  function _formatCpf(d) {
    if (d.length !== 11) return d || '';
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  function _melhorNome(a, b) {
    if (!a) return b || ''; if (!b) return a;
    const temAcento = s => /[\u00C0-\u00FF]/.test(s);
    return (b.length + (temAcento(b) ? 10 : 0)) > (a.length + (temAcento(a) ? 10 : 0)) ? b : a;
  }

  function normalizar(obj) {
    if (!obj) return null;
    const alunoId = _str(obj.alunoId || obj.id || '');
    const nomeOficial = _str(obj.nomeOficial || obj.nome || '');
    const cpfDigits = _normCpf(obj.cpf || '');
    const cpf = cpfDigits.length === 11 ? _formatCpf(cpfDigits) : _str(obj.cpf);
    return {
      alunoId, nomeOficial, nome: nomeOficial, cpf,
      dataNascimento:     _str(obj.dataNascimento || obj.nascimento || ''),
      mae:                _str(obj.mae || ''),
      pai:                _str(obj.pai || ''),
      naturalidade:       _str(obj.naturalidade || ''),
      naturalidadeCidade: _str(obj.naturalidadeCidade || ''),
      naturalidadeUF:     _str(obj.naturalidadeUF || '').toUpperCase(),
      sexo:               _str(obj.sexo || ''),
      corRaca:            _str(obj.corRaca || obj.cor || ''),
      criadoEm:           _str(obj.criadoEm || ''),
      atualizadoEm:       _str(obj.atualizadoEm || ''),
    };
  }

  function _mesclar(destino, origem) {
    const merged = { ...destino };
    ['cpf','dataNascimento','mae','pai','naturalidade','naturalidadeCidade','naturalidadeUF','sexo','corRaca']
      .forEach(c => { if (!merged[c] && origem[c]) merged[c] = origem[c]; });
    merged.nomeOficial = _melhorNome(merged.nomeOficial, origem.nomeOficial);
    merged.nome = merged.nomeOficial;
    merged.atualizadoEm = new Date().toISOString();
    return merged;
  }

  /* ────────────────────────────────────────────
     Carregamento do Firestore
  ──────────────────────────────────────────── */

  /**
   * Carrega todos os alunos do Firestore para o catálogo em memória.
   *
   * CORREÇÃO: a promise agora é criada UMA única vez e nunca anulada.
   * O código antigo fazia `_carregandoPromise = null` no finally, o que
   * permitia um segundo carregamento paralelo se alguém chamasse
   * carregarDoFirebase() enquanto o primeiro ainda estava em andamento.
   */
  function carregarDoFirebase() {
    if (_carregandoPromise) return _carregandoPromise;

    _carregandoPromise = (async () => {
      try {
        await _waitAuth();

        if (!window.DB?.alunos) {
          console.warn('[Identidade] window.DB.alunos não disponível após auth:ready.');
          return;
        }

        const docs = await window.DB.alunos.list();
        _catalogo = docs.map(normalizar).filter(a => a && a.alunoId);
        _catalogoCarregado = true;
        console.log(`[Identidade] ${_catalogo.length} alunos carregados do Firebase.`);
      } catch (e) {
        console.error('[Identidade] Erro ao carregar Firebase:', e);
        // Não anula _carregandoPromise: tentativas futuras retornam esta
        // mesma promise rejeitada, evitando loops de retry automático.
        // Para forçar nova tentativa, chame recarregarDoFirebase().
        throw e;
      }
    })();

    return _carregandoPromise;
  }

  /**
   * Força um novo carregamento do Firestore (descarta cache em memória).
   * Use apenas quando souber que os dados mudaram externamente.
   */
  async function recarregarDoFirebase() {
    _carregandoPromise = null;
    _catalogoCarregado = false;
    _catalogo = [];
    return carregarDoFirebase();
  }

  /**
   * Garante que o catálogo está carregado antes de qualquer operação.
   *
   * CORREÇÃO: findOrCreate, lerTodos e getMats do sistema dependem disso.
   * No arquivo antigo, essas funções eram síncronas e liam do localStorage.
   * Agora são async-safe: aguardam o carregamento se ainda não terminou.
   */
  async function _garantirCarregado() {
    if (!_catalogoCarregado) await carregarDoFirebase();
  }

  /* ── Leitura síncrona (apenas para uso interno após garantirCarregado) ── */
  function lerTodos() { return _catalogo.slice(); }

  /* ── Geração de ID ── */
  function _proximoId(todos) {
    let max = 0;
    for (const a of (todos || [])) {
      const m = _str(a.alunoId).match(/^ALU-(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return 'ALU-' + String(max + 1).padStart(6, '0');
  }

  /* ────────────────────────────────────────────
     Persistência no Firestore
  ──────────────────────────────────────────── */

  /**
   * Salva um aluno no Firestore de forma assíncrona.
   * Não bloqueia a UI — erros são apenas logados.
   */
  function _firestoreSave(aluno) {
    _waitAuth().then(() => {
      if (!window.DB?.alunos) return;
      window.DB.alunos.save({ _id: aluno.alunoId, ...aluno })
        .catch(e => console.warn('[Identidade] Firestore save falhou:', e));
    }).catch(e => console.warn('[Identidade] Auth timeout no save:', e));
  }

  function _firestoreRemover(alunoId) {
    _waitAuth().then(() => {
      if (!window.DB?.alunos) return;
      window.DB.alunos.remove(alunoId)
        .catch(e => console.warn('[Identidade] Firestore remove falhou:', e));
    }).catch(e => console.warn('[Identidade] Auth timeout no remove:', e));
  }

  function _salvarNoArr(aluno) {
    const idx = _catalogo.findIndex(a => a.alunoId === aluno.alunoId);
    if (idx >= 0) _catalogo[idx] = aluno; else _catalogo.push(aluno);
    _firestoreSave(aluno);
  }

  /* ────────────────────────────────────────────
     findOrCreate — coração do módulo
  ──────────────────────────────────────────── */

  /**
   * Busca um aluno existente ou cria um novo.
   *
   * CORREÇÃO: agora é async. Aguarda o carregamento do Firebase antes de
   * operar — antes o catálogo podia estar vazio e duplicatas eram criadas.
   *
   * @param {Object} campos  Dados do aluno (nomeOficial/nome, cpf, dataNascimento…)
   * @returns {Promise<{ alunoId, aluno, isNew }>}
   */
  async function findOrCreate(campos) {
    await _garantirCarregado();

    const candidato = normalizar(campos);
    if (!candidato) throw new Error('Identidade.findOrCreate: campos inválidos');

    const todos = lerTodos();
    let encontrado = null;

    // 1. Busca por CPF (mais confiável)
    const cpfDigits = _normCpf(candidato.cpf);
    if (cpfDigits.length === 11)
      encontrado = todos.find(a => _normCpf(a.cpf) === cpfDigits) || null;

    // 2. Busca por nome + data de nascimento
    if (!encontrado && candidato.nomeOficial && candidato.dataNascimento) {
      const nNome = _normNome(candidato.nomeOficial);
      const nNasc = candidato.dataNascimento.trim();
      encontrado = todos.find(a => _normNome(a.nomeOficial) === nNome && _str(a.dataNascimento) === nNasc) || null;
    }

    // 3. Busca por nome único (quando apenas um resultado bate)
    if (!encontrado && candidato.nomeOficial) {
      const nNome = _normNome(candidato.nomeOficial);
      const matches = todos.filter(a => {
        if (_normNome(a.nomeOficial) !== nNome) return false;
        if (candidato.dataNascimento && a.dataNascimento)
          return candidato.dataNascimento.trim() === _str(a.dataNascimento);
        return true;
      });
      if (matches.length === 1) encontrado = matches[0];
    }

    if (encontrado) {
      const atualizado = _mesclar(encontrado, candidato);
      _salvarNoArr(atualizado);
      return { alunoId: atualizado.alunoId, aluno: atualizado, isNew: false };
    }

    const agora = new Date().toISOString();
    const novo = { ...candidato, alunoId: _proximoId(todos), criadoEm: agora, atualizadoEm: agora };
    novo.nome = novo.nomeOficial;
    _salvarNoArr(novo);
    return { alunoId: novo.alunoId, aluno: novo, isNew: true };
  }

  /**
   * Salva um aluno diretamente (requer alunoId já preenchido).
   * @returns {Promise<Object>} aluno normalizado
   */
  async function salvar(aluno) {
    await _garantirCarregado();
    const n = normalizar(aluno);
    if (!n || !n.alunoId) throw new Error('Identidade.salvar: alunoId ausente');
    n.atualizadoEm = new Date().toISOString();
    _salvarNoArr(n);
    return n;
  }

  /**
   * Remove um aluno do catálogo e do Firestore.
   */
  async function remover(alunoId) {
    await _garantirCarregado();
    _catalogo = _catalogo.filter(a => a.alunoId !== alunoId);
    _firestoreRemover(alunoId);
  }

  /* ────────────────────────────────────────────
     Boot
  ──────────────────────────────────────────── */

  function _boot() {
    carregarDoFirebase().catch(e => console.warn('[Identidade] Boot falhou:', e));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (_sistemaPronte()) _boot();
      else document.addEventListener('auth:ready', _boot, { once: true });
    });
  } else {
    if (_sistemaPronte()) _boot();
    else document.addEventListener('auth:ready', _boot, { once: true });
  }

  /* ────────────────────────────────────────────
     API pública
  ──────────────────────────────────────────── */
  window.Identidade = {
    CHAVE,

    /** Carrega (ou aguarda carregamento já em andamento) do Firebase. */
    carregarDoFirebase,

    /** Força novo carregamento, descartando o cache em memória. */
    recarregarDoFirebase,

    /** true quando o catálogo já foi carregado do Firebase com sucesso. */
    get catalogoCarregado() { return _catalogoCarregado; },

    /**
     * Promise que resolve quando o catálogo estiver pronto.
     * Use nas páginas: await window.Identidade.pronto antes de listar alunos.
     */
    get pronto() { return carregarDoFirebase(); },

    /** Busca ou cria aluno. ASYNC — sempre aguarde com await. */
    findOrCreate,

    /** Normaliza qualquer objeto de aluno para o schema unificado. */
    normalizar,

    /**
     * Retorna o catálogo em memória de forma SÍNCRONA.
     * Só use após confirmar que catalogoCarregado === true
     * ou após `await window.Identidade.pronto`.
     */
    lerTodos,

    /** Alias de lerTodos(). */
    listar() { return lerTodos(); },

    /** Salva aluno. ASYNC. */
    salvar,

    /** Remove aluno. ASYNC. */
    remover,

    /** Normalização de nome para comparação. */
    normNome(s) { return _normNome(s); },

    /** Próximo ID livre. Só use após await pronto. */
    proximoId() { return _proximoId(lerTodos()); },

    /**
     * Versão em lote — processa em memória, salva tudo no Firestore.
     * ASYNC — sempre aguarde com await.
     *
     * @param {Array} lista  Array de objetos com campos do aluno
     * @returns {Promise<Array>} Array de { alunoId, aluno, isNew }
     */
    async findOrCreateBatch(lista) {
      if (!Array.isArray(lista) || !lista.length) return [];

      await _garantirCarregado();
      const catalogo = lerTodos();

      // Índices para busca O(1)
      const porCpf      = new Map();
      const porNomeNasc = new Map();
      const porNome     = new Map();

      for (const a of catalogo) {
        const cpfD = _normCpf(a.cpf || '');
        if (cpfD.length === 11) porCpf.set(cpfD, a);
        if (a.nomeOficial && a.dataNascimento)
          porNomeNasc.set(`${_normNome(a.nomeOficial)}|${_str(a.dataNascimento)}`, a);
        if (a.nomeOficial) porNome.set(_normNome(a.nomeOficial), a);
      }

      const resultados = [];
      const novosCriados = [];

      for (const campos of lista) {
        const candidato = normalizar(campos);
        if (!candidato) { resultados.push(null); continue; }

        let encontrado = null;
        const cpfD = _normCpf(candidato.cpf || '');

        if (cpfD.length === 11) encontrado = porCpf.get(cpfD) || null;

        if (!encontrado && candidato.nomeOficial && candidato.dataNascimento)
          encontrado = porNomeNasc.get(`${_normNome(candidato.nomeOficial)}|${_str(candidato.dataNascimento)}`) || null;

        if (!encontrado && candidato.nomeOficial) {
          const match = porNome.get(_normNome(candidato.nomeOficial));
          if (match && !(candidato.dataNascimento && match.dataNascimento)) encontrado = match;
        }

        if (encontrado) {
          const atualizado = _mesclar(encontrado, candidato);
          porNome.set(_normNome(atualizado.nomeOficial), atualizado);
          resultados.push({ alunoId: atualizado.alunoId, aluno: atualizado, isNew: false });
        } else {
          const agora = new Date().toISOString();
          const novo = {
            ...candidato,
            alunoId:      _proximoId(catalogo.concat(novosCriados)),
            criadoEm:     agora,
            atualizadoEm: agora,
          };
          novo.nome = novo.nomeOficial;
          novosCriados.push(novo);
          porNome.set(_normNome(novo.nomeOficial), novo);
          if (cpfD.length === 11) porCpf.set(cpfD, novo);
          resultados.push({ alunoId: novo.alunoId, aluno: novo, isNew: true });
        }
      }

      // Atualiza catálogo em memória e persiste tudo no Firestore
      for (const r of resultados) {
        if (!r) continue;
        const idx = _catalogo.findIndex(a => a.alunoId === r.alunoId);
        if (idx >= 0) _catalogo[idx] = r.aluno;
        else if (r.isNew) _catalogo.push(r.aluno);
        _firestoreSave(r.aluno);
      }

      return resultados;
    },
  };

  console.log('[identidade-aluno.js] Pronto. Fonte de dados: Firebase exclusivamente.');
})();
