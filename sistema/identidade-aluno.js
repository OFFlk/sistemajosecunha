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
 * - `alunos` — ELO entre o aluno de Atas e o aluno de Ano-Ativo (mesma pessoa).
 *   Cada módulo tem o SEU ID por pessoa (ALU-xxxxxx, mesmo contador, nunca
 *   repetem) e NENHUM ID é reescrito ou "engolido": o elo só liga os dois.
 *   ID do documento: `ELO|{atasId}` (determinístico: 1 aluno de Atas = no
 *   máximo 1 elo; backup/restauração regrava o mesmo doc, sem duplicar).
 *   Schema: { atasId, anoAtivoId, nome, nomeBusca, cpf, vinculadoEm,
 *   dadosPessoais? }
 *     - `anoAtivoId` fica '' enquanto o aluno só existe em Atas;
 *     - `cpf` é SEMPRE só dígitos (é o que as buscas comparam);
 *     - `dadosPessoais` é um objeto livre (o schema é de quem grava — hoje
 *       historico-auto.html) e só existe ENQUANTO `anoAtivoId` está vazio:
 *       ao vincular ao Ano-Ativo os dados passam a viver em `anoAtivoAlunos`
 *       e o campo é removido (use campoRemover() dentro do batch).
 *   Quem grava o elo: cadastro-aluno-ativo.html, historico-auto.html,
 *   idaluno.html (ainda no formato antigo — pendência) e as páginas de gestão
 *   (importação/restauração de backup). Este arquivo só monta/lê o doc; a
 *   decisão de vincular é sempre de quem chama. Para gravar o elo JUNTO com
 *   outros docs de forma atômica, use prepararElo() + DB.batchWrite().
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

  /**
   * Versão em lote de recalcularUltimoAnoRegistro() — busca as matrículas
   * de VÁRIOS alunos numa leva de queries (whereIn(), chunks de 10 — ver
   * db.firebase.js) em vez de uma leitura por aluno, e grava tudo com um
   * único saveAll() em alunos-atas. Depende de `anoLetivo` estar
   * denormalizado em cada doc de `matriculas` (decisão do redesenho: evita
   * o join matrícula→ata/turma só pra descobrir o ano) — matrículas criadas
   * antes dessa denormalização (ex.: import legado em gestão-atas.html que
   * ainda não foi atualizado) não entram na conta.
   *
   * Chamar depois que as matrículas da leva já estiverem salvas — o
   * recálculo lê o estado atual de `matriculas`, então uma matrícula ainda
   * não persistida não entra na conta.
   *
   * @param {string[]} alunoIds
   * @param {number|string} anoAtivoAtual  ano letivo ativo do sistema (ex.: dadosEscola.configAnoAtivo)
   * @returns {Promise<Array<{alunoId, ultimoAnoRegistro}>>}
   */
  async function recalcularUltimoAnoRegistroBatch(alunoIds, anoAtivoAtual) {
    const ids = Array.from(new Set((alunoIds || []).map(_str).filter(Boolean)));
    if (!ids.length) return [];
    if (!window.DB?.matriculas?.whereIn) {
      throw new Error('Identidade.recalcularUltimoAnoRegistroBatch: DB.matriculas.whereIn indisponível (db.firebase.js desatualizado?).');
    }
    await _waitAuth();

    const matriculas = await window.DB.matriculas.whereIn('alunoId', ids);

    const anosPorAluno = new Map(ids.map(id => [id, []]));
    for (const m of matriculas) {
      const id = _str(m?.alunoId);
      const ano = Number(m?.anoLetivo);
      if (anosPorAluno.has(id) && Number.isFinite(ano)) anosPorAluno.get(id).push(ano);
    }

    const agora = new Date().toISOString();
    const patches = ids.map(id => ({
      _id: id,
      alunoId: id,
      ultimoAnoRegistro: _anoMaisProximo(anosPorAluno.get(id), anoAtivoAtual),
      atualizadoEm: agora,
    }));

    await window.DB[CHAVE_ATAS].saveAll(patches);
    return patches.map(p => ({ alunoId: p.alunoId, ultimoAnoRegistro: p.ultimoAnoRegistro }));
  }

  /* ────────────────────────────────────────────
     Elo cross-módulo (`alunos`) — ver cabeçalho do arquivo.
     ID do doc: `ELO|{atasId}`. Escrita sempre por prepararElo() (que só
     inclui os campos informados — merge nunca zera o que já existe).
  ──────────────────────────────────────────── */

  const PREFIXO_ELO = 'ELO|';

  function _somenteDigitos(v) { return _str(v).replace(/\D/g, ''); }

  /** ID do documento do elo para um aluno de Atas. */
  function eloId(atasId) {
    const id = _str(atasId);
    if (!id) throw new Error('Identidade.eloId: atasId obrigatório.');
    if (id.includes('/')) throw new Error('Identidade.eloId: atasId inválido ("' + id + '").');
    if (id.startsWith(PREFIXO_ELO)) throw new Error('Identidade.eloId: recebeu um ID de elo ("' + id + '"); passe o atasId.');
    return PREFIXO_ELO + id;
  }

  /** Remove um campo do doc (use em dadosPessoais ao vincular; vale em batchWrite/salvarElo). */
  function campoRemover() { return firebase.firestore.FieldValue.delete(); }

  /** Normaliza um doc de `alunos` LIDO do Firestore. Só leitura — não use pra gravar. */
  function normalizarElo(obj) {
    if (!obj) return null;
    const nome = _str(obj.nome || '');
    const out = {
      eloId: _str(obj._id || ''),
      atasId: _str(obj.atasId || ''),
      anoAtivoId: _str(obj.anoAtivoId || ''),
      nome,
      nomeBusca: _normNome(nome),
      cpf: _somenteDigitos(obj.cpf),
      vinculadoEm: obj.vinculadoEm || null,
    };
    if (obj.dadosPessoais && typeof obj.dadosPessoais === 'object') out.dadosPessoais = obj.dadosPessoais;
    return out;
  }

  /**
   * Monta a operação de escrita do elo (formato de DB.batchWrite) — NÃO grava.
   * Só entram no doc os campos que você informar (merge: o que já existe e
   * não foi informado permanece). `nomeBusca` é derivado de `nome`; `cpf` vira
   * só dígitos (11, ou '' pra limpar); `dadosPessoais` passa sem validação
   * (objeto livre, ou campoRemover() pra apagar). Se informar `anoAtivoId`
   * e não informar `vinculadoEm`, grava a data/hora atual.
   *
   * @param {Object} dados { atasId (obrigatório), anoAtivoId?, nome?, cpf?, vinculadoEm?, dadosPessoais? }
   * @returns {{col:string, op:'set', id:string, data:Object}}
   */
  function prepararElo(dados) {
    const d = dados || {};
    const data = { atasId: _str(d.atasId) };
    const id = eloId(data.atasId);
    if (d.anoAtivoId !== undefined) data.anoAtivoId = _str(d.anoAtivoId);
    if (d.nome !== undefined) {
      data.nome = _str(d.nome);
      data.nomeBusca = _normNome(data.nome);
    }
    if (d.cpf !== undefined) {
      const dig = _somenteDigitos(d.cpf);
      if (dig && dig.length !== 11) throw new Error('Identidade.prepararElo: CPF deve ter 11 dígitos (recebeu ' + dig.length + ').');
      data.cpf = dig;
    }
    if (d.dadosPessoais !== undefined) data.dadosPessoais = d.dadosPessoais;
    if (d.vinculadoEm !== undefined) data.vinculadoEm = d.vinculadoEm;
    else if (data.anoAtivoId) data.vinculadoEm = new Date().toISOString();
    return { col: CHAVE_ELO, op: 'set', id, data };
  }

  /** Busca o elo de um aluno de Atas (1 leitura). null se não houver. */
  async function buscarElo(atasId) {
    await _waitAuth();
    const doc = await window.DB[CHAVE_ELO].get(eloId(atasId));
    return normalizarElo(doc);
  }

  /**
   * Busca os elos de VÁRIOS alunos de Atas de uma vez (whereIn, lotes de 10).
   * Custo = nº de elos encontrados (mín. 1 leitura). Usada pra marcar quais
   * candidatos de uma busca por nome já estão vinculados ao Ano-Ativo.
   */
  async function buscarEloPorAtasIds(atasIds) {
    await _waitAuth();
    const ids = Array.from(new Set((atasIds || []).map(_str).filter(Boolean)));
    if (!ids.length) return [];
    const docs = await window.DB[CHAVE_ELO].whereIn('atasId', ids);
    return docs.map(normalizarElo).filter(Boolean);
  }

  /** Busca o elo pelo ID do aluno de Ano-Ativo. null se esse aluno não tem elo. */
  async function buscarEloPorAnoAtivoId(anoAtivoId) {
    await _waitAuth();
    const id = _str(anoAtivoId);
    if (!id) return null;
    const docs = await window.DB[CHAVE_ELO].whereEquals('anoAtivoId', id, { limit: 1 });
    return docs.length ? normalizarElo(docs[0]) : null;
  }

  /** Busca elos por prefixo de nome (query pontual via nomeBusca; acento/caixa-insensível). */
  async function buscarEloPorNome(nome, limit = 15) {
    await _waitAuth();
    const termo = _normNome(nome);
    if (!termo) return [];
    const fim = termo + '\uf8ff';
    const docs = await window.DB[CHAVE_ELO].whereRange('nomeBusca', termo, fim, { limit });
    return docs.map(normalizarElo).filter(Boolean);
  }

  /** Busca elo por CPF exato (só dígitos; aceita com máscara). null se não houver. */
  async function buscarEloPorCpf(cpf) {
    await _waitAuth();
    const alvo = _somenteDigitos(cpf);
    if (!alvo) return null;
    const docs = await window.DB[CHAVE_ELO].whereEquals('cpf', alvo, { limit: 1 });
    return docs.length ? normalizarElo(docs[0]) : null;
  }

  /**
   * Grava SOZINHO o elo (um único documento). Quando o elo for gravado junto
   * com outros docs (cadastro de aluno, backup), NÃO use esta função: use
   * prepararElo() e passe a operação ao DB.batchWrite() pra ser atômico.
   * @returns {Promise<{id:string, data:Object}>}
   */
  async function salvarElo(dados) {
    await _waitAuth();
    const op = prepararElo(dados);
    await window.DB[CHAVE_ELO].save({ _id: op.id, ...op.data });
    return { id: op.id, data: op.data };
  }

  /**
   * Monta as operações (pra DB.batchWrite) que aplicam UM nome oficial a um
   * aluno de Atas em todo lugar: alunos-atas (nome + nomeBusca), nomeRaw de
   * TODAS as matrículas dele, `nome` do aluno em cada turmas/{turmaId}.alunos[]
   * e, se o elo for só de histórico (sem anoAtivoId), elo.nome. Elo vinculado ao
   * Ano-Ativo NÃO é tocado: lá o nome é o do cadastro do Ano-Ativo.
   * Regra do sistema: a matrícula tem sempre o nome do alunoId.
   * Faz leituras (matrículas, turmas, elo) mas NÃO grava.
   */
  async function opsRenomearAtas(alunoId, nome) {
    await _waitAuth();
    const id = _str(alunoId), n = _str(nome);
    if (!id) throw new Error('Identidade.opsRenomearAtas: alunoId obrigatório.');
    if (!n)  throw new Error('Identidade.opsRenomearAtas: nome obrigatório.');
    const existente = await buscarAtasPorId(id);
    if (!existente) throw new Error(`Identidade.opsRenomearAtas: alunoId "${id}" não encontrado em alunos-atas.`);

    const ops = [{ col: CHAVE_ATAS, op: 'set', id, data: { alunoId: id, nome: n, nomeBusca: _normNome(n), atualizadoEm: new Date().toISOString() } }];
    const mats = await window.DB.matriculas.whereEquals('alunoId', id);
    mats.forEach(m => ops.push({ col: 'matriculas', op: 'set', id: m._id, data: { nomeRaw: n } }));

    for (const tid of new Set(mats.map(m => _str(m.turmaId)).filter(Boolean))) {
      const t = await window.DB.turmas.get(tid);
      if (!t || !Array.isArray(t.alunos) || !t.alunos.some(a => _str(a && a.alunoId) === id)) continue;
      ops.push({ col: 'turmas', op: 'set', id: tid, data: { alunos: t.alunos.map(a => _str(a && a.alunoId) === id ? { ...a, nome: n } : a) } });
    }

    const elo = await buscarElo(id);
    if (elo && !elo.anoAtivoId) ops.push(prepararElo({ atasId: id, nome: n }));
    return ops;
  }

  /** Aplica opsRenomearAtas() num único batch atômico. */
  async function renomearAtas(alunoId, nome) {
    const ops = await opsRenomearAtas(alunoId, nome);
    if (ops.length > 500) throw new Error('Identidade.renomearAtas: operações demais para um batch (' + ops.length + ').');
    await window.DB.batchWrite(ops);
    return { operacoes: ops.length };
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
    recalcularUltimoAnoRegistroBatch,
    opsRenomearAtas,    // monta as ops de renomeação (nome oficial em todo lugar)
    renomearAtas,       // aplica em 1 batch atômico

    // Elo cross-módulo (`alunos`, ID `ELO|{atasId}`) — sem decisão de matching
    eloId,
    prepararElo,        // monta a operação (pra DB.batchWrite) — não grava
    salvarElo,          // grava só o elo (1 doc)
    campoRemover,       // FieldValue.delete() (ex.: dadosPessoais ao vincular)
    buscarElo,
    buscarEloPorAtasIds,
    buscarEloPorAnoAtivoId,
    buscarEloPorNome,
    buscarEloPorCpf,

    // Utilidades
    normalizarAtas,
    normalizarElo,
    normNome(s) { return _normNome(s); },

    /** Reserva e devolve um alunoId novo. ASYNC — sempre aguarde com await.
     *  CONSOME o número ao ser chamado (não existe "só espiar sem gastar"). */
    async proximoId() { return _proximoId(); },
  };

  console.log('[identidade-aluno.js] Pronto (v2.1 — alunos-atas + elo ELO|atasId). Sem auto-boot, sem catálogo em memória.');
})();
