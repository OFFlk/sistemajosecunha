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
       * @param {Object} [opts] { limit }
       */
      async whereRange(field, start, end, opts = {}) {
        await waitAuth();
        let q = col(colName).where(field, '>=', start).where(field, '<', end);
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
     * Limpeza única da coleção schemasCH: remove documentos duplicados da
     * mesma regra (mesmo campo `id` de negócio) mantendo só o mais completo,
     * e remove documentos órfãos/de formato legado (sem `id`/`cargas`/`anos`
     * — sobras de outro formato antigo que o app já ignora, mas que ficam
     * ocupando espaço na coleção). Rode uma vez pelo console:
     *   await DB.schemas.cleanupDuplicates()
     * Retorna um resumo do que foi removido/mantido, sem apagar nada por
     * engano: documentos que já parecem únicos e válidos não são tocados.
     */
    async cleanupDuplicates() {
      await waitAuth();
      cacheClear('schemasCH');
      const snap = await col('schemasCH').get();
      const all = snap.docs.map(d => ({ _id: d.id, ref: d.ref, data: d.data() }));

      const isValidRule = (data) => {
        const temCargas = data && typeof data.cargas === 'object' && data.cargas && Object.keys(data.cargas).length > 0;
        const temAnos = Array.isArray(data.anos) && data.anos.length > 0;
        return !!data.id && (temCargas || temAnos);
      };

      const orphans = all.filter(d => !isValidRule(d.data));
      const valid = all.filter(d => isValidRule(d.data));

      // Agrupa os válidos por id de negócio (campo `id`, minúsculo)
      const groups = new Map();
      valid.forEach(d => {
        const key = String(d.data.id);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(d);
      });

      const completeness = (data) => {
        const nCargas = data && typeof data.cargas === 'object' ? Object.keys(data.cargas).length : 0;
        const nAnos = Array.isArray(data.anos) ? data.anos.length : 0;
        return nCargas + nAnos;
      };

      const toDelete = [...orphans];
      const kept = [];
      groups.forEach(docs => {
        if (docs.length === 1) { kept.push(docs[0]); return; }
        // mantém o mais completo (mais cargas/anos preenchidos); em empate, o último (_id mais recente costuma ordenar depois)
        docs.sort((a, b) => completeness(b.data) - completeness(a.data));
        kept.push(docs[0]);
        toDelete.push(...docs.slice(1));
      });

      if (toDelete.length) {
        const db = window.Auth.db;
        for (let i = 0; i < toDelete.length; i += 400) {
          const batch = db.batch();
          toDelete.slice(i, i + 400).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }
      cacheClear('schemasCH');

      const resumo = {
        totalAntes: all.length,
        duplicatasRemovidas: toDelete.length - orphans.length,
        orfaosRemovidos: orphans.length,
        totalDepois: kept.length,
      };
      console.log('[DB.schemas.cleanupDuplicates] resumo:', resumo);
      return resumo;
    },
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

    // ── Módulo de Funcionários (Educacenso) ──
    funcionarios: makeCollection('funcionarios'),

    // ── Módulo de Notas Trimestrais (bridge p/ colar no Access) ──
    // Isolado dos demais módulos, sem interação com turmas/alunos/atas.
    notasTrimestrais: makeCollection('notasTrimestrais'),
    notasSchemas: makeCollection('notasSchemas'),

    // ── Compartilhados ──
    escola:    escolaStore,
    schemas:   schemasStore,
    migrate,

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
