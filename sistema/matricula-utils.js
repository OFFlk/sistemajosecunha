/**
 * matricula-utils.js — utilitários centralizados de matrícula (ano-ativo)
 *
 * Depende de auth.firebase.js e db.firebase.js já carregados antes deste script.
 * Uso:
 *   <script src="../auth.firebase.js"></script>
 *   <script src="../db.firebase.js"></script>
 *   <script src="../matricula-utils.js"></script>
 *
 * Expõe window.MatriculaUtils com:
 *   - buildMatriculaId(turmaId, alunoId, ano)
 *   - validarMatricula(mat)      → guarda de integridade (síncrona)
 *   - getMatriculaAtual(alunoId, ano) → busca centralizada (assíncrona)
 */
(function () {
  'use strict';

  const SITUACOES_VALIDAS = ['TRANSFERIDO', 'DESISTENTE', 'FALECIDO', 'APROVADO', 'REPROVADO'];

  /**
   * Monta o matriculaId no formato padrão do sistema.
   * Formato decidido e fechado: MAT|turmaId|alunoId|ano
   */
  function buildMatriculaId(turmaId, alunoId, ano) {
    return `MAT|${turmaId}|${alunoId}|${ano}`;
  }

  /**
   * Guarda de segurança: valida a combinação status/situacao de uma matrícula
   * ANTES de gravar. Deve ser chamada em todo lugar que grava matrícula
   * (readmissão, encerramento individual, encerramento em lote no futuro).
   *
   * Regras (fechadas):
   *   - status === 'ATIVO'   → situacao tem que ser null (nunca '', nunca outro valor)
   *   - status === 'INATIVO' → situacao é obrigatória e uma destas 5:
   *       TRANSFERIDO, DESISTENTE, FALECIDO, APROVADO, REPROVADO
   *
   * @param {Object} mat objeto com pelo menos { status, situacao }
   * @returns {Object} o mesmo objeto, com status/situacao normalizados (uppercase, trim)
   * @throws {Error} se a combinação for inválida
   */
  function validarMatricula(mat) {
    if (!mat || typeof mat !== 'object') {
      throw new Error('validarMatricula: matrícula inválida (esperado um objeto).');
    }

    const status = (mat.status || '').toString().trim().toUpperCase();
    if (status !== 'ATIVO' && status !== 'INATIVO') {
      throw new Error(`validarMatricula: status deve ser "ATIVO" ou "INATIVO" (recebido: "${mat.status}").`);
    }

    let situacao;
    if (status === 'ATIVO') {
      if (mat.situacao !== null && mat.situacao !== undefined && String(mat.situacao).trim() !== '') {
        throw new Error(`validarMatricula: matrícula ATIVO não pode ter situacao (recebido: "${mat.situacao}"). Deve ser null.`);
      }
      situacao = null;
    } else {
      const situacaoNorm = (mat.situacao || '').toString().trim().toUpperCase();
      if (!SITUACOES_VALIDAS.includes(situacaoNorm)) {
        throw new Error(
          `validarMatricula: matrícula INATIVO exige situacao válida (${SITUACOES_VALIDAS.join(', ')}). Recebido: "${mat.situacao}".`
        );
      }
      situacao = situacaoNorm;
    }

    return { ...mat, status, situacao };
  }

  /**
   * Busca centralizada da matrícula vigente de um aluno num ano letivo.
   * Substitui os `mats.find(...)` soltos e mal filtrados espalhados hoje
   * pelo sistema (causa raiz de pegar a matrícula errada quando há mais
   * de uma para o mesmo aluno, ex.: após mudança de turma).
   *
   * - Consulta no servidor só as matrículas do aluno e filtra o ano aqui
   *   (anoLetivo pode estar gravado como texto ou número).
   * - Filtra sempre por alunoId + ano (nunca só por alunoId).
   * - Se por algum motivo houver mais de uma matrícula pro mesmo aluno+ano
   *   (resíduo de bug antigo), prioriza a que estiver ATIVO; se nenhuma
   *   estiver ATIVO, retorna a mais recente por updatedAt.
   *
   * @param {string} alunoId
   * @param {string|number} ano
   * @returns {Promise<Object|null>} a matrícula encontrada, ou null
   */
  async function getMatriculaAtual(alunoId, ano) {
    if (!alunoId) return null;
    const idNorm = String(alunoId).trim();
    const anoNorm = ano ? String(ano).trim() : '';

    // só as matrículas deste aluno (antes: list() da coleção inteira a cada chamada); o ano é filtrado abaixo
    const todas = await window.DB.anoAtivoMatriculas.whereEquals('alunoId', idNorm);
    const doAlunoNoAno = todas.filter(m => {
      const mAluno = String(m.alunoId || '').trim();
      const mAno = String(m.anoLetivo || m.ano || '').trim();
      return mAluno === idNorm && (!anoNorm || mAno === anoNorm);
    });

    if (doAlunoNoAno.length === 0) return null;
    if (doAlunoNoAno.length === 1) return doAlunoNoAno[0];

    // Mais de uma matrícula pro mesmo aluno+ano — não deveria acontecer,
    // mas por segurança prioriza a ATIVO; senão, a mais recente.
    const ativa = doAlunoNoAno.find(m => (m.status || '').toString().trim().toUpperCase() === 'ATIVO');
    if (ativa) return ativa;

    return doAlunoNoAno.slice().sort((a, b) => {
      const ta = (a.updatedAt && a.updatedAt.seconds) || 0;
      const tb = (b.updatedAt && b.updatedAt.seconds) || 0;
      return tb - ta;
    })[0];
  }

  window.MatriculaUtils = {
    buildMatriculaId,
    validarMatricula,
    getMatriculaAtual,
    SITUACOES_VALIDAS,
  };

  console.log('[matricula-utils.js] Pronto. window.MatriculaUtils disponível.');
})();
