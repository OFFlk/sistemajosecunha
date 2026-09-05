/**
 * identidade-aluno.js — v2 (redesenho: leituras excessivas + módulo de Atas)
 *
 * Depende de: auth.firebase.js, db.firebase.js (carregados antes deste script)
 *
 * FONTE DE DADOS: Firestore exclusivamente. Sem localStorage, sem catálogo em
 * memória, sem auto-boot. Cada operação é uma leitura/escrita pontual.
 *
 * MUDANÇA DE MODELO (ver relatório de leituras excessivas + redesenho de Atas):
 * - `alunos-atas` — dados legíveis do módulo Atas: { alunoId, nome, nomeBusca,
 *   ultimoAnoRegistro, criadoEm, atualizadoEm }. Sem CPF/nascimento/mãe/pai —
 *   Atas nunca manda esses dados; quando apareciam na coleção antiga `alunos`,
 *   vinham só de fusão manual (isso agora vive só no elo, ver abaixo).
 * - `alunos` — elo de confirmação entre um alunoId de Atas e um de Ano-Ativo
 *   já fundidos: { alunoId, atasId, anoAtivoId, idEngolido, nome, nomeBusca,
 *   cpf, vinculadoEm }. `alunoId` é sempre o menor entre atasId/anoAtivoId
 *   (o canônico); `idEngolido` é o maior, apagado da coleção de origem
 *   depois de copiado. Só existe doc aqui depois de fusão confirmada —
 *   EXCLUSIVAMENTE em idaluno.html (decisão de alinhamento: fundir() não
 *   vira função compartilhada, por histórico de bugs de matching rodando em
 *   páginas de cadastro). Este arquivo só expõe CRUD desse doc — nunca
 *   decide qual ID sobrevive nem reescreve referências; isso é 100% de
 *   idaluno.html. cadastro-aluno-ativo.html só LÊ (buscarAtasPorNome /
 *   buscarEloPorNome) pra detectar candidato e redirecionar pra
 *   idaluno.html — nunca escreve aqui.
 * - `anoAtivoAlunos` — módulo Ano-Ativo, inalterado, não é tocado aqui.
 *
 * SEM MATCHING EMBUTIDO: criarAtas()/criarAtasBatch() sempre reservam um
 * alunoId novo — nunca tentam "achar se já existe" sozinhos. Decidir se um
 * nome repetido é a mesma pessoa é responsabilidade de quem chama (a análise
 * de importação de gestao-atas.html, com checagem de trajetória), usando
 * buscarAtasPorNome() pra levantar candidatos e vincularAtasExplicito() pra
 * confirmar. Isso evita o bug antigo de casar por nome sozinho sem revisão
 * humana.
 */
(function () {
  'use strict';

  const CHAVE_ATAS = 'alunos-atas'; // coleção de dados legíveis do módulo Atas
  const CHAVE_ELO  = 'alunos';      // coleção do elo de confirmação cross-módulo

  /* ────────────────────────────────────────────
     Aguarda Auth + DB estarem prontos
  ──────────────────────────────────────────── */
  function _sistemaPronto() {
    return !!(window.Auth?.getSession?.() && window.DB?.[CHAVE_ATAS]);
  }

  function _waitAuth() {
    return new Promise(res => {
      if (_sistemaPronto()) { res(); return; }
      document.addEventListener('auth:ready', function handler() {
        if (_sistemaPronto()) { res(); return; }
        Promise.resolve().then(() => res());
      }, { once: true });
    });
  }

  /* ── Normalização ── */
  function _str(v) { return (v == null ? '' : String(v)).trim(); }
  function _normNome(s) {
    return _str(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  }
  function _melhorNome(a, b) {
    if (!a) return b || ''; if (!b) return a;
    const temAcento = s => /[\u00C0-\u00FF]/.test(s);
    return (b.length + (temAcento(b) ? 10 : 0)) > (a.length + (temAcento(a) ? 10 : 0)) ? b : a;
  }

  function normalizarAtas(obj) {
    if (!obj) return null;
    const alunoId = _str(obj.alunoId || obj._id || '');
    const nome = _str(obj.nomeOficial || obj.nome || '');
    return {
      alunoId,
      nome,
      nomeBusca: _normNome(nome),
      ultimoAnoRegistro: obj.ultimoAnoRegistro != null ? obj.ultimoAnoRegistro : null,
      criadoEm: _str(obj.criadoEm || ''),
      atualizadoEm: _str(obj.atualizadoEm || ''),
    };
  }

  /* ────────────────────────────────────────────
     Contador atômico de alunoId — inalterado da v1.
     Um único contador pro sistema inteiro (system/contadores), nunca
     reaproveita número, mesmo depois de exclusões. Ver comentário extenso
     na v1 sobre o motivo (mídia órfã no Cloudinary por schoolId).
  ──────────────────────────────────────────── */
  function _formatarAlunoId(n) {
    return 'ALU-' + String(n).padStart(6, '0');
  }

  async function _reservarBlocoIds(quantidade) {
    if (!quantidade || quantidade <= 0) return [];
    if (!window.Auth?.db) throw new Error('Identidade: Auth.db indisponível pra gerar alunoId.');
    const ref = window.Auth.db.collection('system').doc('contadores');
    const novoMax = await window.Auth.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const atual = (snap.exists && typeof snap.data()?.alunoId === 'number') ? snap.data().alunoId : 0;
      const novo = atual + quantidade;
      tx.set(ref, { alunoId: novo, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return novo;
    });
    const base = novoMax - quantidade;
    const ids = [];
    for (let i = 1; i <= quantidade; i++) ids.push(_formatarAlunoId(base + i));
    return ids;
  }

  async function _proximoId() {
    const [id] = await _reservarBlocoIds(1);
    return id;
  }

  /* ────────────────────────────────────────────
     Atas — CRUD puro em `alunos-atas`, sem matching embutido
  ──────────────────────────────────────────── */

  /** Busca um registro de alunos-atas pelo alunoId. Leitura pontual. */
  async function buscarAtasPorId(alunoId) {
    await _waitAuth();
    const doc = await window.DB[CHAVE_ATAS].get(_str(alunoId));
    return normalizarAtas(doc);
  }

  /**
   * Busca candidatos por nome (prefixo, acento/caixa-insensível), via query
   * pontual no campo `nomeBusca` — nunca carrega a coleção inteira.
   * Usado tanto pro autocomplete de cadastro-aluno-ativo.html (fluxo
   * "começar pelo nome") quanto por uma futura checagem de nomes
   * semelhantes na análise de importação de gestao-atas.html.
   *
   * @param {string} nome    termo de busca (prefixo)
   * @param {number} [limit] máx. de resultados (default 15)
   */
  async function buscarAtasPorNome(nome, limit = 15) {
    await _waitAuth();
    const termo = _normNome(nome);
    if (!termo) return [];
    // Query de intervalo (prefixo): [termo, termo+\uf8ff) — padrão comum
    // pra "começa com" no Firestore, sem precisar de índice de texto.
    const fim = termo + '\uf8ff';
    const docs = await window.DB[CHAVE_ATAS].whereRange('nomeBusca', termo, fim, { limit });
    return docs.map(normalizarAtas).filter(Boolean);
  }

  /**
   * Cria um registro NOVO em alunos-atas — sempre reserva um alunoId novo,
   * nunca tenta achar se já existe. A decisão de "é a mesma pessoa" é de
   * quem chama (ver buscarAtasPorNome + vincularAtasExplicito).
   *
   * @param {Object} campos  { nome, ultimoAnoRegistro? }
   * @returns {Promise<{alunoId, aluno, isNew:true}>}
   */
  async function criarAtas(campos) {
    await _waitAuth();
    const agora = new Date().toISOString();
    const alunoId = await _proximoId();
    const aluno = normalizarAtas({ ...campos, alunoId, criadoEm: agora, atualizadoEm: agora });
    await window.DB[CHAVE_ATAS].save({ _id: alunoId, ...aluno });
    return { alunoId, aluno, isNew: true };
  }

  /**
   * Versão em lote de criarAtas() — reserva um bloco de IDs numa única
   * transação e grava tudo via saveAll(). SEM matching: cada item da lista
   * vira um alunoId novo, na ordem em que aparece.
   *
   * @param {Array} lista  Array de { nome, ultimoAnoRegistro? }
   * @returns {Promise<Array<{alunoId, aluno, isNew:true}>>}
   */
  async function criarAtasBatch(lista) {
    if (!Array.isArray(lista) || !lista.length) return [];
    await _waitAuth();

    const ids = await _reservarBlocoIds(lista.length);
    const agora = new Date().toISOString();
    const alunos = lista.map((campos, i) =>
      normalizarAtas({ ...campos, alunoId: ids[i], criadoEm: agora, atualizadoEm: agora })
    );

    await window.DB[CHAVE_ATAS].saveAll(alunos.map(a => ({ _id: a.alunoId, ...a })));

    return alunos.map(aluno => ({ alunoId: aluno.alunoId, aluno, isNew: true }));
  }

  /**
   * Vincula dados a um alunoId JÁ DECIDIDO por quem chama (ex.: candidato
   * escolhido a partir de buscarAtasPorNome(), confirmado manualmente ou
   * pela checagem de trajetória). NÃO redescobre o match sozinho.
   *
   * @param {string} alunoId  ID já existente em alunos-atas
   * @param {Object} campos   Dados novos a mesclar (nome mais completo vence)
   */
  async function vincularAtasExplicito(alunoId, campos) {
    await _waitAuth();
    const idNorm = _str(alunoId);
    if (!idNorm) throw new Error('Identidade.vincularAtasExplicito: alunoId obrigatório.');

    const existente = await buscarAtasPorId(idNorm);
    if (!existente) throw new Error(`Identidade.vincularAtasExplicito: alunoId "${idNorm}" não encontrado em alunos-atas.`);

    const candidato = normalizarAtas(campos) || {};
    const atualizado = {
      ...existente,
      nome: _melhorNome(existente.nome, candidato.nome),
      atualizadoEm: new Date().toISOString(),
    };
    atualizado.nomeBusca = _normNome(atualizado.nome);
    await window.DB[CHAVE_ATAS].save({ _id: idNorm, ...atualizado });
    return { alunoId: idNorm, aluno: atualizado, isNew: false };
  }

  /** Salva um registro de alunos-atas diretamente (merge parcial). */
  async function salvarAtas(aluno) {
    await _waitAuth();
    const idNorm = _str(aluno?.alunoId);
    if (!idNorm) throw new Error('Identidade.salvarAtas: alunoId ausente');
    const patch = { ...aluno, atualizadoEm: new Date().toISOString() };
    if (patch.nome != null) patch.nomeBusca = _normNome(patch.nome);
    await window.DB[CHAVE_ATAS].save({ _id: idNorm, ...patch });
    return patch;
  }

  /** Remove um registro de alunos-atas (usado pela GC de identidades órfãs). */
  async function removerAtas(alunoId) {
    await _waitAuth();
    await window.DB[CHAVE_ATAS].remove(_str(alunoId));
  }

  /* ────────────────────────────────────────────
     ultimoAnoRegistro — denormalizado (decisão confirmada)
     Recalculado nos pontos combinados: ao confirmar import, ao apagar
     turma, e ao fundir em idaluno.html. Este arquivo só expõe o cálculo +
     persistência; quem chama é responsável por buscar os anosLetivos
     (matrículas do aluno) e o ano ativo do sistema antes de chamar.
  ──────────────────────────────────────────── */

  /**
   * "Mais próximo" = mais próximo ANTERIOR OU IGUAL ao ano ativo (Atas é
   * sempre anterior ao ano corrente, exceto em testes). Se nenhum ano for
   * <= anoAtivoAtual (situação só esperada em teste), cai pro mais próximo
   * em qualquer direção como fallback, em vez de não gravar nada.
   */
  function _anoMaisProximo(anosLetivos, anoAtivoAtual) {
    const validos = (anosLetivos || []).map(Number).filter(Number.isFinite);
    if (!validos.length) return null;
    const ativo = Number(anoAtivoAtual);
    const anteriores = Number.isFinite(ativo) ? validos.filter(a => a <= ativo) : [];
    if (anteriores.length) return Math.max(...anteriores);
    if (!Number.isFinite(ativo)) return Math.max(...validos);
    return validos.reduce((melhor, a) => Math.abs(a - ativo) < Math.abs(melhor - ativo) ? a : melhor);
  }

  /**
   * Recalcula e persiste ultimoAnoRegistro de um aluno.
   * @param {string} alunoId
   * @param {number[]} anosLetivos    anoLetivo de cada matrícula do aluno
   * @param {number|string} anoAtivoAtual  ano letivo ativo do sistema
   */
  async function recalcularUltimoAnoRegistro(alunoId, anosLetivos, anoAtivoAtual) {
    const ano = _anoMaisProximo(anosLetivos, anoAtivoAtual);
    await salvarAtas({ alunoId: _str(alunoId), ultimoAnoRegistro: ano });
    return ano;
  }

  /* ────────────────────────────────────────────
     Elo cross-módulo (`alunos`) — confirmação de que um alunoId de Atas
     e um de Ano-Ativo são a mesma pessoa.

     Schema fechado (decisão de alinhamento, sem código, registrada em
     separado): { alunoId, atasId, anoAtivoId, idEngolido, nome, nomeBusca,
     cpf, vinculadoEm }. `alunoId` == o menor entre atasId/anoAtivoId (o
     canônico); `idEngolido` é o maior, que teve os dados copiados pra
     `alunoId` e foi apagado da coleção de origem. `nome`/`nomeBusca`/`cpf`
     são cópias pra permitir que historico_auto.html busque direto aqui
     (nome/ID/CPF) sem tocar `alunos-atas`/`anoAtivoAlunos` na busca inicial.

     ESTE ARQUIVO SÓ FAZ CRUD DESSE DOC. A decisão de qual ID vira canônico,
     o que copiar de qual coleção e a reescrita de referências em
     matriculas/turmas/anoAtivoMatriculas são responsabilidade exclusiva de
     `idaluno.html` (decisão de alinhamento: fundir() não vira função
     compartilhada, por causa de bugs anteriores de matching rodando em
     páginas de cadastro). Este arquivo nunca decide, só grava o que
     idaluno.html já decidiu.
  ──────────────────────────────────────────── */

  function normalizarElo(obj) {
    if (!obj) return null;
    const nome = _str(obj.nome || '');
    return {
      alunoId: _str(obj.alunoId || obj._id || ''),
      atasId: _str(obj.atasId || ''),
      anoAtivoId: _str(obj.anoAtivoId || ''),
      idEngolido: _str(obj.idEngolido || ''),
      nome,
      nomeBusca: _normNome(nome),
      cpf: _str(obj.cpf || ''),
      vinculadoEm: obj.vinculadoEm || null,
    };
  }

  /** Busca o elo pelo alunoId canônico. null se esse aluno não foi fundido. */
  async function buscarElo(alunoId) {
    await _waitAuth();
    const doc = await window.DB[CHAVE_ELO].get(_str(alunoId));
    return normalizarElo(doc);
  }

  /**
   * Busca elos por prefixo de nome (query pontual, via nomeBusca).
   * Usado por historico_auto.html: busca primeiro em `alunos`, só cai pra
   * `alunos-atas` se não achar nada aqui.
   */
  async function buscarEloPorNome(nome, limit = 15) {
    await _waitAuth();
    const termo = _normNome(nome);
    if (!termo) return [];
    const fim = termo + '\uf8ff';
    const docs = await window.DB[CHAVE_ELO].whereRange('nomeBusca', termo, fim, { limit });
    return docs.map(normalizarElo).filter(Boolean);
  }

  /** Busca elo por CPF exato (match único, CPF só existe aqui pós-fusão). */
  async function buscarEloPorCpf(cpf) {
    await _waitAuth();
    const alvo = _str(cpf).replace(/\D/g, '');
    if (!alvo) return null;
    const docs = await window.DB[CHAVE_ELO].whereEquals('cpf', alvo, { limit: 1 });
    return docs.length ? normalizarElo(docs[0]) : null;
  }

  /**
   * Grava o doc do elo, no schema fechado. idaluno.html já decidiu tudo
   * (canônico, engolido, nome/cpf finais) antes de chamar — esta função
   * só persiste. Idempotente: pode ser chamada de novo pra atualizar.
   *
   * @param {Object} dados  { alunoId, atasId, anoAtivoId, idEngolido, nome, cpf }
   */
  async function salvarElo(dados) {
    await _waitAuth();
    const registro = normalizarElo(dados);
    if (!registro.alunoId) throw new Error('Identidade.salvarElo: alunoId obrigatório.');
    if (!registro.vinculadoEm) registro.vinculadoEm = new Date().toISOString();
    await window.DB[CHAVE_ELO].save({ _id: registro.alunoId, ...registro });
    return registro;
  }

  /* ────────────────────────────────────────────
     API pública
  ──────────────────────────────────────────── */
  window.Identidade = {
    CHAVE_ATAS,
    CHAVE_ELO,

    // Atas — CRUD puro, sem matching embutido
    buscarAtasPorId,
    buscarAtasPorNome,
    criarAtas,
    criarAtasBatch,
    vincularAtasExplicito,
    salvarAtas,
    removerAtas,
    recalcularUltimoAnoRegistro,

    // Elo cross-módulo — CRUD puro, sem decisão (fundir() é de idaluno.html)
    buscarElo,
    buscarEloPorNome,
    buscarEloPorCpf,
    salvarElo,

    // Utilidades
    normalizarAtas,
    normalizarElo,
    normNome(s) { return _normNome(s); },

    /** Reserva e devolve um alunoId novo. ASYNC — sempre aguarde com await.
     *  CONSOME o número ao ser chamado (não existe "só espiar sem gastar"). */
    async proximoId() { return _proximoId(); },
  };

  console.log('[identidade-aluno.js] Pronto (v2 — alunos-atas + elo). Sem auto-boot, sem catálogo em memória.');
})();
