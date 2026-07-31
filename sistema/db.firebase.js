/**
 * db.firebase.js — substitui o localStorage como banco de dados
 * Depende de auth.firebase.js já carregado antes deste script.
 *
 * Expõe window.DB com a mesma estrutura que o sistema já usa:
 *   DB.turmas, DB.alunos, DB.matriculas, DB.atas, DB.escola, DB.schemas
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

      /** Salva vários documentos em batch (máx. 500 por chamada). */
      async saveAll(arr) {
        await waitAuth();
        cacheClear(colName);
        const db = window.Auth.db;
        const ts = firebase.firestore.FieldValue.serverTimestamp();
        // Divide em lotes de 500
        for (let i = 0; i < arr.length; i += 400) {
          const batch = db.batch();
          arr.slice(i, i + 400).forEach(obj => {
            const { _id, ...data } = obj;
            data.updatedAt = ts;
            // Usa _id explícito ou chave de negócio como ID do documento
            // Isso garante upsert correto — sem _id, col().doc() gera ID novo a cada saveAll
            const businessKey = _id || obj.alunoId || obj.turmaId || obj.matriculaId || null;
            const ref = businessKey ? col(colName).doc(String(businessKey)) : col(colName).doc();
            batch.set(ref, data, { merge: true });
          });
          await batch.commit();
        }
      },

      /** Remove um documento pelo _id. */
      async remove(id) {
        await waitAuth();
        cacheClear(colName);
        await col(colName).doc(id).delete();
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
    alunos:    makeCollection('alunos'),
    matriculas: makeCollection('matriculas'),
    atas:      makeCollection('atas'),

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
     */
    async loadAll() {
      const [turmasDB, alunosDB, matriculasDB, atasDB, dadosEscola] = await Promise.all([
        this.turmas.list(),
        this.alunos.list(),
        this.matriculas.list(),
        this.atas.list(),
        this.escola.get(),
      ]);
      return { turmasDB, alunosDB, matriculasDB, atasDB, dadosEscola };
    },

    /**
     * Atalho: carrega todas as coleções do módulo de ANO-ATIVO.
     * Use este em vez de loadAll() nas páginas do ano-ativo.
     */
    async loadAllAnoAtivo() {
      const [turmasDB, alunosDB, matriculasDB, dadosEscola] = await Promise.all([
        this.anoAtivoTurmas.list(),
        this.anoAtivoAlunos.list(),
        this.anoAtivoMatriculas.list(),
        this.escola.get(),
      ]);
      return { turmasDB, alunosDB, matriculasDB, dadosEscola };
    },
  };

  console.log('[db.firebase.js] Pronto. window.DB disponível.');
})();
