/**
 * db.firebase.js — substitui o localStorage como banco de dados
 * Depende de auth.firebase.js já carregado antes deste script.
 *
 * Expõe window.DB com a mesma estrutura que o sistema já usa:
 *   DB.turmas, DB['alunos-atas'], DB.matriculas, DB.atas, DB.escola, DB.schemas
 *   DB.alunos agora é só o elo de confirmação cross-módulo (ver
 *   redesenho de identidade — identidade-aluno.js v2), não mais o
 *   catálogo de dados do módulo Atas.
 *
 * Cada coleção fica sob o schoolId ativo, isolando os dados por escola:
 *   /schools/{schoolId}/turmas/{docId}
 *   /schools/{schoolId}/alunos/{docId}
 *   ... etc
 *
 * Uso:
 *   <script src="../auth.firebase.js"></script>
 *   <script src="../db.firebase.js"></script>
 */
(function () {
  'use strict';

  /* ─── Aguarda Auth estar pronto para acessar Firestore ─── */
  function waitAuth() {
    return new Promise(res => {
      if (window.Auth && window.Auth.db) { res(); return; }
      document.addEventListener('auth:ready', () => res(), { once: true });
    });
  }

  /* ─── Retorna a referência da coleção isolada pela escola ─── */
  function col(name) {
    const schoolId = window.Auth.getActiveSchoolId();
    if (!schoolId) throw new Error('Nenhuma escola ativa. Faça login primeiro.');
    return window.Auth.db.collection('schools').doc(schoolId).collection(name);
  }

  /* ─── Guarda de ESCRITA ───────────────────────────────────────────────
   * 'ADMIN' NÃO é uma escola: é só o marcador de "admin global sem escola
   * selecionada" (seletor do header). Leituras com ele voltam vazias (ok),
   * mas qualquer ESCRITA criaria schools/ADMIN/{coleção}. Toda operação
   * que grava/apaga passa por aqui antes de tocar no Firestore.
   * O erro traz a pilha (console.trace) pra revelar qual página tentou.
   */
  function isAdminMarker(schoolId) {
    return String(schoolId || '').trim().toUpperCase() === 'ADMIN';
  }

  function guardWrite(op, colName) {
    const schoolId = window.Auth.getActiveSchoolId();
    if (!schoolId) throw new Error('Nenhuma escola ativa. Faça login primeiro.');
    if (isAdminMarker(schoolId)) {
      const msg = `[db.firebase] Escrita BLOQUEADA: ${op}${colName ? ' em "' + colName + '"' : ''} ` +
        `sem escola selecionada (schoolId="ADMIN" é só um marcador). Selecione uma escola.`;
      console.error(msg);
      console.trace('[db.firebase] quem tentou gravar:');
      throw new Error(msg);
    }
    // Diagnóstico opcional: window.DB.traceWrites = ['alunos'] loga pilha
    // de toda escrita nessas coleções (pra caçar gravações indevidas).
    const watch = window.DB && window.DB.traceWrites;
    if (colName && Array.isArray(watch) && watch.includes(colName)) {
      console.warn(`[db.firebase][trace] ${op} em "${colName}" (escola ${schoolId})`);
      console.trace();
    }
  }

  /* ─── Converte snapshot do Firestore em array de objetos ─── */
  function snap2arr(snapshot) {
    return snapshot.docs.map(d => ({ _id: d.id, ...d.data() }));
  }

  /* ─── Helpers de cache (evita re-buscar dados não alterados) ─── */
  const _cache = {};
  function cacheSet(key, data) { _cache[key] = { ts: Date.now(), data }; }
  function cacheGet(key, maxAgeMs = 30000) {
    const c = _cache[key];
    if (c && Date.now() - c.ts < maxAgeMs) return c.data;
    return null;
  }
  function cacheClear(key) { delete _cache[key]; }

  /* ─── Factory de coleção com CRUD completo ─── */
  function makeCollection(colName) {
    return {
      /** Retorna todos os documentos da coleção. */
      async list() {
        await waitAuth();
        const cached = cacheGet(colName);
        if (cached) return cached;
        const snap = await col(colName).get();
        const data = snap2arr(snap);
        cacheSet(colName, data);
        return data;
      },

      /** Retorna um documento pelo _id. */
      async get(id) {
        await waitAuth();
        const snap = await col(colName).doc(id).get();
        if (!snap.exists) return null;
        return { _id: snap.id, ...snap.data() };
      },

      /**
       * Salva um documento.
       * - Se o objeto tiver _id → atualiza (merge).
       * - Se não tiver _id → cria novo com ID automático.
       * Retorna o objeto com _id preenchido.
       */
      async save(obj) {
        await waitAuth();
        guardWrite('save', colName);
        cacheClear(colName);
        const { _id, ...data } = obj;
        data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        if (colName === 'anoAtivoAlunos') {
          console.log('[DEBUG-FOTO] DB.anoAtivoAlunos.save() vai gravar (merge:true) _id=', _id, 'data=', data);
        }
        if (_id) {
          await col(colName).doc(_id).set(data, { merge: true });
          return { _id, ...data };
        } else {
          data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          const ref = await col(colName).add(data);
          return { _id: ref.id, ...data };
        }
      },

      /**
       * Salva vários documentos em batch (máx. 500 por chamada).
       * Retorna o array de objetos salvos, cada um com o _id real do
       * documento no Firestore preenchido — inclusive os que não tinham
       * _id antes (upsert por chave de negócio). Isso permite que quem
       * chamou saveAll() sempre saiba o _id verdadeiro de cada item,
       * mesmo sem precisar de um reload.
       */
      async saveAll(arr) {
        await waitAuth();
        guardWrite('saveAll', colName);
        cacheClear(colName);
        const db = window.Auth.db;
        const ts = firebase.firestore.FieldValue.serverTimestamp();
        const saved = [];
        // Divide em lotes de 400
        for (let i = 0; i < arr.length; i += 400) {
          const batch = db.batch();
          const refs = [];
          arr.slice(i, i + 400).forEach(obj => {
            const { _id, ...data } = obj;
            data.updatedAt = ts;
            // Usa _id explícito ou chave de negócio como ID do documento.
            // Isso garante upsert real: sem isso, col().doc() gera ID novo
            // aleatório a cada saveAll(), duplicando o mesmo registro lógico
            // a cada salvamento. `id` (minúsculo) é a chave de negócio usada
            // por regras de CH e outros registros gerados na UI antes de
            // passarem pelo Firestore pela primeira vez.
            const businessKey = _id || obj.id || obj.alunoId || obj.turmaId || obj.matriculaId || null;
            const ref = businessKey ? col(colName).doc(String(businessKey)) : col(colName).doc();
            batch.set(ref, data, { merge: true });
            refs.push({ ref, data });
          });
          await batch.commit();
          refs.forEach(({ ref, data }) => saved.push({ _id: ref.id, ...data }));
        }
        return saved;
      },

      /** Remove um documento pelo _id. */
      async remove(id) {
        await waitAuth();
        guardWrite('remove', colName);
        cacheClear(colName);
        await col(colName).doc(id).delete();
      },

      /**
       * Busca pontual por intervalo num campo (ex.: prefixo de nome
       * normalizado). NÃO usa cache (a query muda a cada chamada) e NÃO
       * carrega a coleção inteira — só os docs que caem no intervalo.
       * Usado por identidade-aluno.js (buscarAtasPorNome) pra evitar
       * repetir o padrão de leitura excessiva que motivou essa reescrita.
       *
       * @param {string} field  campo indexado (ex.: 'nomeBusca')
       * @param {*} start       valor inicial do intervalo (inclusive)
       * @param {*} end         valor final do intervalo (exclusive)
       * @param {Object} [opts] { limit, and: [[campo, valor], ...] }
       */
      async whereRange(field, start, end, opts = {}) {
        await waitAuth();
        let q = col(colName);
        (opts.and || []).forEach(([f, v]) => { q = q.where(f, '==', v); });   // igualdades extras (exigem índice composto com o campo do intervalo)
        q = q.where(field, '>=', start).where(field, '<', end);
        if (opts.limit) q = q.limit(opts.limit);
        const snap = await q.get();
        return snap2arr(snap);
      },

      /**
       * Busca pontual por igualdade num campo, sem carregar a coleção
       * inteira. Complementa whereRange() para os casos de match exato.
       *
       * @param {string} field
       * @param {*} value
       * @param {Object} [opts] { limit }
       */
      async whereEquals(field, value, opts = {}) {
        await waitAuth();
        let q = col(colName).where(field, '==', value);
        (opts.and || []).forEach(([f, v]) => { q = q.where(f, '==', v); });   // igualdades extras (sem índice composto)
        if (opts.limit) q = q.limit(opts.limit);
        const snap = await q.get();
        return snap2arr(snap);
      },

      /**
       * Busca pontual por uma LISTA de valores num campo (ex.: vários
       * alunoId de uma vez), sem carregar a coleção inteira e sem fazer
       * uma leitura por item. Divide em lotes de 10 (limite do operador
       * `in` do Firestore) e junta os resultados.
       * Usado por identidade-aluno.js (recalcularUltimoAnoRegistroBatch)
       * pra buscar as matrículas de vários alunos numa única leva de
       * queries, em vez de uma leitura por aluno.
       *
       * @param {string} field    campo a comparar (ex.: 'alunoId')
       * @param {Array} values    valores aceitos (duplicados/nulos são ignorados)
       * @param {Object} [opts]   { limit } — aplicado a CADA lote, não ao total
       */
      async whereIn(field, values, opts = {}) {
        await waitAuth();
        const vals = Array.from(new Set((values || []).filter(v => v != null && v !== '')));
        if (!vals.length) return [];
        const CHUNK = 10;
        const resultados = [];
        for (let i = 0; i < vals.length; i += CHUNK) {
          const chunk = vals.slice(i, i + CHUNK);
          let q = col(colName).where(field, 'in', chunk);
          if (opts.limit) q = q.limit(opts.limit);
          const snap = await q.get();
          resultados.push(...snap2arr(snap));
        }
        return resultados;
      },

      /**
       * Remove TODOS os documentos onde field == value.
       * Útil para limpar duplicatas e alunos mesclados no Firestore.
       */
      async removeWhere(field, value) {
        await waitAuth();
        guardWrite('removeWhere', colName);
        cacheClear(colName);
        const snap = await col(colName).where(field, '==', value).get();
        if (snap.empty) return;
        const db = window.Auth.db;
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      },

      /**
       * Escuta mudanças em tempo real.
       * Retorna função para cancelar o listener.
       * @param {Function} callback fn(array)
       */
      onSnapshot(callback) {
        let unsub = () => {};
        waitAuth().then(() => {
          unsub = col(colName).onSnapshot(snap => {
            cacheClear(colName);
            callback(snap2arr(snap));
          });
        });
        return () => unsub();
      },
    };
  }

  /* ─── Consulta entre TODAS as escolas (ADMIN global, modo "Todas as
     escolas" — nenhuma escola específica selecionada no header) ───
     col() é sempre escopado a uma única escola; para juntar dados de
     todas, usamos collectionGroup() do Firestore, que varre a subcoleção
     de mesmo nome em qualquer escola de uma vez. */
  async function collectionGroupList(name) {
    await waitAuth();
    const snap = await window.Auth.db.collectionGroup(name).get();
    return snap.docs.map(d => ({
      _id: d.id,
      ...d.data(),
      // schoolId por último de propósito: precisa vencer qualquer campo de
      // mesmo nome que porventura já exista salvo no documento — a escola
      // de origem real é o caminho do doc (schools/{schoolId}/...), nunca
      // um campo de dado que pode nem existir nos documentos antigos.
      schoolId: d.ref.parent.parent.id,
    }));
  }

  /** Mapa schoolId → nome de exibição, para montar chips de escola na UI. */
  async function loadSchoolsMap() {
    await waitAuth();
    const snap = await window.Auth.db.collection('schools').get();
    const map = {};
    snap.docs.forEach(d => {
      if (d.id.toUpperCase() === 'ADMIN') return; // sentinel, não é escola real
      const data = d.data();
      map[d.id] = (data.displayName || data.name || data.nome || d.id).toString().trim();
    });
    return map;
  }

  /* ─── Coleção especial: dadosEscola (documento único por escola) ─── */
  const escolaStore = {
    async get() {
      await waitAuth();
      const schoolId = window.Auth.getActiveSchoolId();
      const snap = await window.Auth.db.collection('schools').doc(schoolId).get();
      return snap.exists ? snap.data() : {};
    },
    async save(dados) {
      await waitAuth();
      guardWrite('escola.save', 'dadosEscola');
      const schoolId = window.Auth.getActiveSchoolId();
      await window.Auth.db.collection('schools').doc(schoolId).set(dados, { merge: true });
      // Sincroniza cache da Auth (nome/cidade usados em outros módulos)
      if (window.Auth.saveSchool) await window.Auth.saveSchool(schoolId, dados);
    },
  };

  /* ─── Coleção especial: schemas CH (sub-coleção com regras) ─── */
  const schemasStore = {
    ...makeCollection('schemasCH'),

    /** Atalho: retorna array puro compatível com o formato do sistema */
    async listRules() {
      const docs = await this.list();
      return docs.map(d => ({ id: d._id, ...d }));
    },

    /**
     * Limpeza da coleção schemasCH. SEMPRE rode primeiro em modo simulação:
     *   await DB.schemas.cleanupDuplicates({ dryRun: true })   // só mostra, não apaga
     *   await DB.schemas.cleanupDuplicates()                    // apaga de verdade
     * Remove: (1) regras em branco (nenhuma carga horária > 0 — a tela não deixa
     * salvar assim, então são sementes/lixo); (2) duplicatas da mesma regra, seja
     * pela chave de negócio (`id`, ou o próprio _id se não houver `id`), seja pela
     * assinatura nome + anos + séries; mantém a mais completa.
     */
    async cleanupDuplicates(opts = {}) {
      const dryRun = !!opts.dryRun;
      await waitAuth();
      if (!dryRun) guardWrite('cleanupDuplicates', 'schemasCH');
      cacheClear('schemasCH');
      const snap = await col('schemasCH').get();
      const all = snap.docs.map(d => ({ _id: d.id, ref: d.ref, data: d.data() }));

      const nCh = (m) => (m && typeof m === 'object') ? Object.values(m).filter(v => Number(v) > 0).length : 0;
      const nCargas = (d) => nCh(d.cargas) + nCh(d.cargasT2);
      const completeness = (d) => nCargas(d) * 10 + (Array.isArray(d.anos) ? d.anos.length : 0) + (Array.isArray(d.series) ? d.series.length : 0);
      const norm = (t) => String(t || '').trim().toLowerCase();
      const signature = (d) => [norm(d.nome), (d.anos || []).map(String).sort().join(','), (d.series || []).map(norm).sort().join(',')].join('|');

      const motivo = new Map(); // _id -> motivo da remoção
      const vivos = [];
      all.forEach(d => { if (nCargas(d.data) === 0) motivo.set(d._id, 'em branco (sem carga horária)'); else vivos.push(d); });

      const dedupe = (lista, keyFn, rotulo) => {
        const g = new Map();
        lista.forEach(d => { const k = keyFn(d); if (!g.has(k)) g.set(k, []); g.get(k).push(d); });
        const sobra = [];
        g.forEach(docs => {
          docs.sort((a, b) => completeness(b.data) - completeness(a.data));
          sobra.push(docs[0]);
          docs.slice(1).forEach(x => motivo.set(x._id, `duplicata (${rotulo}) de ${docs[0]._id}`));
        });
        return sobra;
      };
      const pos1 = dedupe(vivos, d => String(d.data.id || d._id), 'mesmo id');
      const mantidos = dedupe(pos1, d => signature(d.data), 'mesmo nome/anos/séries');

      const detalhes = all.map(d => ({
        _id: d._id, id: d.data.id || '(sem id)', nome: d.data.nome || '(sem nome)',
        anos: (d.data.anos || []).join(','), series: (d.data.series || []).join(','),
        cargas: nCargas(d.data), acao: motivo.has(d._id) ? 'REMOVER: ' + motivo.get(d._id) : 'manter',
      }));
      console.table(detalhes);

      const toDelete = all.filter(d => motivo.has(d._id));
      if (!dryRun && toDelete.length) {
        const db = window.Auth.db;
        for (let i = 0; i < toDelete.length; i += 400) {
          const batch = db.batch();
          toDelete.slice(i, i + 400).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        cacheClear('schemasCH');
      }
      const resumo = { dryRun, totalAntes: all.length, aRemover: toDelete.length, totalDepois: mantidos.length };
      console.log('[DB.schemas.cleanupDuplicates] resumo:', resumo);
      return resumo;
    },
  };

  /* ─── Funcionários: grupos de campos do modelo pessoa × ano ───
   * identidade = quem a pessoa é; copiada para TODAS as matrículas dela quando muda (e a foto idem).
   * perfil     = situação datada (NEE, endereço, formação): a matrícula guarda o retrato daquele ano e o
   *              doc da pessoa guarda o do ano mais recente.
   * ano        = só existe na matrícula.
   */
  const FUNC_CAMPOS = {
    identidade: ['cpf', 'cpfNum', 'rgCnh', 'nome', 'dataNascimento', 'filiacaoMae', 'filiacaoPai', 'sexo', 'corRaca',
                 'naturalidadeEstrangeiro', 'naturalidadeUF', 'naturalidadeCidade', 'fotoUrl', 'fotoFileId'],
    perfil:     ['deficiencia', 'cep', 'endUF', 'endCidade', 'zonaResidencia', 'escolaridade', 'tipoEnsino',
                 'graduacoes', 'posGraduacoes', 'complementacoes', 'outrosCursos'],
    ano:        ['funcao', 'profissionalApoio', 'cargaHoraria', 'status', 'turnos'],
  };

  /* ─── Utilitário: migração do localStorage para o Firestore ─── */
  const migrate = {
    /**
     * Importa um dump do localStorage (gerado por admin_backup.html)
     * para o Firestore da escola ativa.
     * @param {Object} dump  objeto com chaves turmasDB, alunosDB, etc.
     */
    async fromDump(dump) {
      await waitAuth();
      const colMap = {
        // módulo de atas
        turmasDB:     'turmas',
        alunosDB:     'alunos',
        matriculasDB: 'matriculas',
        atasDB:       'atas',
        // módulo de ano-ativo
        anoAtivoTurmasDB:     'anoAtivoTurmas',
        anoAtivoAlunosDB:     'anoAtivoAlunos',
        anoAtivoMatriculasDB: 'anoAtivoMatriculas',
      };
      for (const [key, colName] of Object.entries(colMap)) {
        const arr = dump[key];
        if (Array.isArray(arr) && arr.length) {
          console.log(`Migrando ${arr.length} registros de ${key} → ${colName}...`);
          await window.DB[colName].saveAll(arr);
        }
      }
      if (dump.dadosEscola) {
        await window.DB.escola.save(dump.dadosEscola);
      }
      console.log('Migração concluída.');
    },

    /**
     * Migra os funcionários do array funcionariosDB (dentro do doc da
     * escola) pra documentos individuais na coleção `funcionarios` —
     * mesmo padrão que anoAtivoAlunos já usa. Rode uma vez, pelo console:
     *   await window.DB.migrate.migrarFuncionariosDoc()
     * Ao final, apaga o funcionariosDB antigo do doc da escola — não fica
     * método legado duplicado rodando em paralelo.
     */
    async migrarFuncionariosDoc() {
      await waitAuth();
      guardWrite('migrarFuncionariosDoc', 'funcionarios');
      const dadosEscola = await escolaStore.get();
      const arr = Array.isArray(dadosEscola?.funcionariosDB) ? dadosEscola.funcionariosDB : [];
      if (!arr.length) {
        console.log('Nenhum funcionário em funcionariosDB pra migrar.');
        return;
      }
      console.log(`Migrando ${arr.length} funcionários pra coleção "funcionarios"...`);
      await window.DB.funcionarios.saveAll(arr.map(f => ({ _id: f.funcId, ...f })));

      const schoolId = window.Auth.getActiveSchoolId();
      await window.Auth.db.collection('schools').doc(schoolId).update({
        funcionariosDB: firebase.firestore.FieldValue.delete(),
      });

      console.log(`Migração concluída: ${arr.length} funcionários migrados e funcionariosDB removido do doc da escola.`);
    },

    /**
     * Converte `funcionarios` do formato antigo (1 doc por funcionário POR ANO, com funcId + anoLetivo) para o
     * modelo pessoa × ano:  funcionarios (pessoa) + funcionariosAnos + funcionariosMatriculas.
     *
     *   await DB.migrate.migrarFuncionariosParaMatriculas()                 // SIMULAÇÃO (padrão): só mostra o que faria
     *   await DB.migrate.migrarFuncionariosParaMatriculas({ dryRun:false }) // grava de verdade
     *
     * Regras:
     *  - agrupa os docs antigos pelo CPF (11 dígitos); sem CPF válido, cada doc vira uma pessoa;
     *  - o ID da pessoa é o funcId do cadastro MAIS RECENTE (a foto e os documentos no Cloudinary seguem esse ID);
     *    os funcId dos anos mais antigos somem do Firestore — a mídia deles, se houver, continua no Cloudinary
     *    sob o ID antigo (aparece no relatório em `idsAntigosComMidia`);
     *  - cada doc antigo vira uma matrícula 'FMAT|{ano}|{funcId}' com o retrato daquele ano (anoLetivo vira número);
     *  - dois docs do mesmo CPF no mesmo ano: fica o primeiro; o outro é listado em `descartados` e ganha
     *    `migracaoDescartado:true` (NÃO é apagado: confira e apague à mão);
     *  - docs no formato novo (sem anoLetivo/ano) e os marcados `migracaoDescartado` são ignorados; pode rodar de novo sem duplicar.
     * Cada pessoa é gravada num único batch (atômico). Rode a simulação primeiro e confira o relatório.
     */
    async migrarFuncionariosParaMatriculas(opts = {}) {
      const dryRun = opts.dryRun !== false;
      await waitAuth();
      if (!dryRun) guardWrite('migrarFuncionariosParaMatriculas', 'funcionarios');
      const dig = v => String(v == null ? '' : v).replace(/\D/g, '');
      const anoDe = d => Number(d.anoLetivo != null ? d.anoLetivo : d.ano);

      const snap = await col('funcionarios').get();
      const todos = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      const legados = todos.filter(d => (d.anoLetivo != null || d.ano != null) && !d.migracaoDescartado);
      if (!legados.length) {
        console.log('[migrarFuncionarios] Nada a migrar (' + todos.length + ' docs, nenhum no formato antigo).');
        return { dryRun, legados: 0, pessoas: 0, matriculas: 0 };
      }

      const grupos = new Map();
      legados.forEach(d => {
        const cpf = dig(d.cpf);
        const k = cpf.length === 11 ? 'CPF|' + cpf : 'ID|' + d._id;
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k).push(d);
      });

      const agora = new Date().toISOString();
      const C = FUNC_CAMPOS;
      const anos = new Set();
      const lotes = [];            // cada item = ops de UMA pessoa
      const relatorio = [];
      const descartados = [];
      const idsAntigosComMidia = [];
      let nMat = 0;

      grupos.forEach((docs, k) => {
        docs.sort((a, b) => (anoDe(b) || 0) - (anoDe(a) || 0));
        const recente = docs[0];
        const funcId = recente._id;
        const cpfNum = k.startsWith('CPF|') ? k.slice(4) : '';
        const comFoto = docs.find(d => d.fotoUrl);

        const pessoa = { funcId, criadoEm: recente.criadoEm || agora };
        [...C.identidade, ...C.perfil].forEach(f => { if (recente[f] !== undefined) pessoa[f] = recente[f]; });
        if (cpfNum) pessoa.cpfNum = cpfNum;
        if (comFoto) { pessoa.fotoUrl = comFoto.fotoUrl; pessoa.fotoFileId = comFoto.fotoFileId || null; }

        const ops = [{ col: 'funcionarios', op: 'set', id: funcId, data: pessoa, merge: false }];   // substitui o doc antigo (sem anoLetivo/funcao/...)
        const vistos = new Set();
        const anosDaPessoa = [];
        docs.forEach(d => {
          const ano = anoDe(d);
          const descartar = motivo => {      // não apaga: marca, para a migração não tratá-lo como pessoa nova numa 2ª execução
            descartados.push({ _id: d._id, nome: d.nome, motivo });
            ops.push({ col: 'funcionarios', op: 'set', id: d._id, data: { migracaoDescartado: true, migracaoMotivo: motivo } });
          };
          if (!Number.isFinite(ano)) { descartar('ano inválido'); return; }
          const matId = 'FMAT|' + ano + '|' + funcId;
          if (vistos.has(matId)) { descartar('mesmo CPF e mesmo ano (' + ano + ') de outro doc'); return; }
          vistos.add(matId);
          const mat = { matriculaId: matId, funcId, anoLetivo: ano, criadoEm: d.criadoEm || agora };
          [...C.identidade, ...C.perfil, ...C.ano].forEach(f => { if (d[f] !== undefined) mat[f] = d[f]; });
          if (cpfNum) mat.cpfNum = cpfNum;
          if (pessoa.fotoUrl) { mat.fotoUrl = pessoa.fotoUrl; mat.fotoFileId = pessoa.fotoFileId; }
          ops.push({ col: 'funcionariosMatriculas', op: 'set', id: matId, data: mat });
          anos.add(ano); anosDaPessoa.push(ano); nMat++;
          if (d._id !== funcId) {
            ops.push({ col: 'funcionarios', op: 'delete', id: d._id });
            if (d.fotoFileId) idsAntigosComMidia.push({ idAntigo: d._id, nome: d.nome, fotoFileId: d.fotoFileId });
          }
        });
        lotes.push(ops);
        relatorio.push({ chave: k, nome: recente.nome || '(sem nome)', funcId, anos: anosDaPessoa.join(','), docsAntigos: docs.length });
      });

      const resumo = { dryRun, legados: legados.length, pessoas: lotes.length, matriculas: nMat, anos: [...anos].sort(),
                       descartados, idsAntigosComMidia };
      console.table(relatorio);
      console.log('[migrarFuncionarios] resumo:', resumo);
      if (dryRun) { console.log('[migrarFuncionarios] SIMULAÇÃO — nada foi gravado. Rode com { dryRun:false } para aplicar.'); return resumo; }

      // grava: junta pessoas em batches de até 450 ops (cada pessoa inteira no mesmo batch)
      let atual = [];
      const flush = async () => { if (atual.length) { await window.DB.batchWrite(atual); atual = []; } };
      for (const ops of lotes) {
        if (atual.length + ops.length > 450) await flush();
        atual.push(...ops);
      }
      for (const a of anos) {
        if (atual.length >= 450) await flush();
        atual.push({ col: 'funcionariosAnos', op: 'set', id: String(a), data: { anoLetivo: a, criadoEm: agora } });
      }
      await flush();
      console.log('[migrarFuncionarios] Migração concluída.');
      return resumo;
    },

    /**
     * Importa direto do localStorage do navegador atual.
     * Útil para quem tem dados no sistema antigo e quer subir pro Firebase.
     */
    async fromLocalStorage() {
      function getLS(k) {
        try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
      }
      const dump = {
        turmasDB:     getLS('turmasDB')     || [],
        alunosDB:     getLS('alunosDB')     || [],
        matriculasDB: getLS('matriculasDB') || [],
        atasDB:       getLS('atasDB')       || [],
        dadosEscola:  getLS('dadosEscola')  || null,
      };

      // Tenta também chave com schoolId
      const schoolId = window.Auth?.getActiveSchoolId?.();
      if (schoolId) {
        const chave = `schools:${schoolId}:dadosEscola`;
        const local = getLS(chave);
        if (local) dump.dadosEscola = local;
      }

      const total = dump.turmasDB.length + dump.alunosDB.length +
                    dump.matriculasDB.length + dump.atasDB.length;
      if (total === 0 && !dump.dadosEscola) {
        console.warn('Nenhum dado encontrado no localStorage para migrar.');
        return;
      }
      console.log(`Migrando ${total} registros do localStorage...`);
      await this.fromDump(dump);
    },
  };

  /* ─── Expõe window.DB ─── */
  window.DB = {
    // ── Módulo de Atas (histórico / importações XLSX) ──
    turmas:    makeCollection('turmas'),
    matriculas: makeCollection('matriculas'),
    atas:      makeCollection('atas'),
    // Dados legíveis do módulo Atas (nome, ultimoAnoRegistro). Substitui o
    // uso antigo de `alunos` como catálogo do módulo — ver redesenho.
    'alunos-atas': makeCollection('alunos-atas'),

    // Schema de matérias/colunas da ata (editado em schema_ata.html, lido
    // por cadastro-turmas.html e gravado em turma.schemaSnapshot). Coleção
    // própria, isolada de `schemas`/`schemasCH` (regras de Carga Horária,
    // usadas só em histórico — módulo diferente, formato diferente).
    atasSchemas: makeCollection('atasSchemas'),

    // Elo de confirmação cross-módulo: {alunoId, atasId, anoAtivoId,
    // idEngolido, nome, nomeBusca, cpf, vinculadoEm}. Só existe doc aqui
    // depois de fusão confirmada — exclusivamente em idaluno.html (decisão
    // de alinhamento: cadastro-aluno-ativo.html só detecta candidato via
    // leitura, nunca escreve aqui). NÃO é mais o catálogo de dados do
    // módulo Atas — isso agora é `alunos-atas` (acima).
    alunos:    makeCollection('alunos'),

    // ── Módulo de Ano-Ativo (coleções separadas) ──
    anoAtivoTurmas:    makeCollection('anoAtivoTurmas'),
    anoAtivoAlunos:    makeCollection('anoAtivoAlunos'),
    anoAtivoMatriculas: makeCollection('anoAtivoMatriculas'),

    // ── Módulo de Funcionários (Educacenso) — mesmo desenho do Ano-Ativo dos alunos ──
    //   funcionarios            = a PESSOA (1 doc por funcionário, ID FUN-000001): identidade + perfil + foto.
    //                             Equivale a anoAtivoAlunos. Busca por CPF: whereEquals('cpfNum', ...).
    //   funcionariosAnos        = os ANOS LETIVOS (1 doc por ano, ID = '2026'). Equivale a anoAtivoTurmas.
    //   funcionariosMatriculas  = o VÍNCULO pessoa × ano (ID 'FMAT|{ano}|{funcId}'). Equivale a anoAtivoMatriculas,
    //                             mas guarda uma CÓPIA de todos os dados pessoais: a pesquisa lê SÓ esta coleção
    //                             (ex.: whereEquals('anoLetivo', 2026)). Quem edita dados pessoais grava os dois lados.
    funcionarios: makeCollection('funcionarios'),
    funcionariosAnos: makeCollection('funcionariosAnos'),
    funcionariosMatriculas: makeCollection('funcionariosMatriculas'),

    // ── Módulo de Notas Trimestrais (bridge p/ colar no Access) ──
    // Isolado dos demais módulos, sem interação com turmas/alunos/atas.
    notasTrimestrais: makeCollection('notasTrimestrais'),
    notasSchemas: makeCollection('notasSchemas'),

    // ── Histórico de exportações do historico_auto.html ──
    // Guarda só as últimas 4 por escola: a cada exportação nova, a página grava a nova e apaga as que passam
    // do limite no mesmo DB.batchWrite (atômico). Ler a coleção inteira custa no máximo 4 documentos.
    // Campos: { nome, tipo, anoRef, schemaCH, ts }  (ts = Date.now(); ID 'EXP-{ts}-{rand}')
    exportacoes: makeCollection('exportacoes'),

    // ── Compartilhados ──
    escola:    escolaStore,
    schemas:   schemasStore,
    migrate,

    /**
     * Grava VÁRIOS documentos, de coleções diferentes, de forma ATÔMICA:
     * ou todas as operações são aplicadas, ou nenhuma (um único batch do
     * Firestore). Use quando um cadastro toca mais de uma coleção (ex.:
     * anoAtivoAlunos + anoAtivoMatriculas + alunos) pra não deixar aluno
     * sem matrícula ou elo órfão se a segunda gravação falhar.
     *
     * Passa pela MESMA guarda de escrita do save()/remove() (schoolId
     * "ADMIN" é bloqueado) e limpa o cache de cada coleção tocada.
     * Tudo é validado ANTES de tocar no Firestore.
     *
     * @param {Array<Object>} ops  máx. 500 itens, cada um:
     *   { col: 'anoAtivoAlunos',        // nome da coleção (chave de window.DB)
     *     op:  'set' | 'update' | 'delete',
     *     id:  'ALU-000123',            // ID do documento (obrigatório)
     *     data: { ... },                // set/update; aceita FieldValue.delete()
     *     merge: true }                 // só 'set'; padrão true (igual ao save())
     *   - 'set'    cria ou mescla (upsert); grava updatedAt.
     *   - 'update' exige que o doc já exista (senão o batch inteiro falha).
     *   - 'delete' apaga o doc.
     * @returns {Promise<Array<{col,id,op}>>} as operações aplicadas, na ordem.
     */
    async batchWrite(ops) {
      await waitAuth();
      if (!Array.isArray(ops) || !ops.length) throw new Error('DB.batchWrite: informe ao menos 1 operação.');
      if (ops.length > 500) throw new Error('DB.batchWrite: máximo de 500 operações por chamada (recebeu ' + ops.length + ').');

      // 1) Validação completa antes de qualquer escrita
      const vistos = new Set();
      ops.forEach((o, i) => {
        const onde = 'DB.batchWrite: operação #' + (i + 1);
        if (!o || typeof o !== 'object') throw new Error(onde + ' inválida.');
        if (!o.col || !window.DB[o.col] || typeof window.DB[o.col].get !== 'function')
          throw new Error(onde + ': coleção desconhecida "' + o.col + '".');
        if (!['set', 'update', 'delete'].includes(o.op))
          throw new Error(onde + ': op deve ser "set", "update" ou "delete" (recebeu "' + o.op + '").');
        const id = o.id == null ? '' : String(o.id).trim();
        if (!id || id.includes('/')) throw new Error(onde + ': id obrigatório e sem "/" (recebeu "' + o.id + '").');
        if (o.op !== 'delete' && (!o.data || typeof o.data !== 'object' || Array.isArray(o.data)))
          throw new Error(onde + ': "data" (objeto) é obrigatório em ' + o.op + '.');
        const chave = o.col + '/' + id;
        if (vistos.has(chave)) throw new Error(onde + ': documento repetido no mesmo batch (' + chave + ').');
        vistos.add(chave);
      });

      // 2) Guarda de escrita (bloqueia "ADMIN") por coleção distinta
      [...new Set(ops.map(o => o.col))].forEach(c => guardWrite('batchWrite', c));

      // 3) Um único batch, um único commit
      const db = window.Auth.db;
      const ts = firebase.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();
      ops.forEach(o => {
        const ref = col(o.col).doc(String(o.id).trim());
        if (o.op === 'delete') { batch.delete(ref); return; }
        const { _id, ...data } = o.data;
        data.updatedAt = ts;
        if (o.op === 'update') batch.update(ref, data);
        else batch.set(ref, data, { merge: o.merge !== false });
      });
      await batch.commit();

      [...new Set(ops.map(o => o.col))].forEach(cacheClear);
      return ops.map(o => ({ col: o.col, id: String(o.id).trim(), op: o.op }));
    },

    /**
     * Atalho: carrega todas as coleções do módulo de ATAS.
     * Retorna objeto no mesmo formato que state.db já espera.
     *
     * alunosDB vem de `alunos-atas` (catálogo legível do módulo) — NÃO de
     * `alunos`, que virou só o elo de confirmação cross-módulo (ver
     * redesenho: relatório de leituras excessivas + identidade-aluno.js v2).
     */
    async loadAll() {
      const [turmasDB, alunosDB, matriculasDB, atasDB, dadosEscola] = await Promise.all([
        this.turmas.list(),
        this['alunos-atas'].list(),
        this.matriculas.list(),
        this.atas.list(),
        this.escola.get(),
      ]);
      return { turmasDB, alunosDB, matriculasDB, atasDB, dadosEscola };
    },

    /**
     * Atalho: carrega todas as coleções do módulo de ANO-ATIVO.
     * Use este em vez de loadAll() nas páginas do ano-ativo.
     *
     * Quando o ADMIN global está em modo "Todas as escolas" (nenhuma
     * escola específica selecionada no header — getActiveSchoolId()
     * retorna o sentinel "ADMIN"), col() apontaria pra um doc de escola
     * que não existe (schools/ADMIN/...) e sempre voltaria vazio. Nesse
     * caso, delega pra loadAllAnoAtivoTodasEscolas() em vez disso.
     */
    async loadAllAnoAtivo() {
      if (window.Auth.getActiveSchoolId() === 'ADMIN') {
        return this.loadAllAnoAtivoTodasEscolas();
      }
      const [turmasDB, alunosDB, matriculasDB, dadosEscola] = await Promise.all([
        this.anoAtivoTurmas.list(),
        this.anoAtivoAlunos.list(),
        this.anoAtivoMatriculas.list(),
        this.escola.get(),
      ]);
      return { turmasDB, alunosDB, matriculasDB, dadosEscola };
    },

    /**
     * Variante de loadAllAnoAtivo() pra "Todas as escolas": junta turmas,
     * alunos e matrículas de TODAS as escolas via collectionGroup, cada
     * item marcado com o schoolId de origem, mais um mapa schoolId→nome
     * (schoolsMap) pra UI montar chip de escola. `dadosEscola` volta
     * vazio de propósito — não existe um "ano ativo" único quando são
     * várias escolas ao mesmo tempo, cada uma pode ter o seu.
     */
    async loadAllAnoAtivoTodasEscolas() {
      const [turmasDB, alunosDB, matriculasDB, schoolsMap] = await Promise.all([
        collectionGroupList('anoAtivoTurmas'),
        collectionGroupList('anoAtivoAlunos'),
        collectionGroupList('anoAtivoMatriculas'),
        loadSchoolsMap(),
      ]);
      return { turmasDB, alunosDB, matriculasDB, dadosEscola: {}, schoolsMap };
    },
  };

  console.log('[db.firebase.js] Pronto. window.DB disponível.');
})();
