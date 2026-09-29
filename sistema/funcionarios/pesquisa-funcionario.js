/* ══════════════════════════════════════════════════════════
   PESQUISA-FUNCIONARIO.JS
   Script principal para a página de pesquisa de funcionários
   
   Funcionalidades:
   - Busca e filtros dinâmicos
   - Ordenação de colunas
   - Paginação
   - Integração com Firebase
   - Filtro por ano ativo
   ══════════════════════════════════════════════════════════ */

(function(){
  /* ══════════════════════════════════════════
     Helpers
  ══════════════════════════════════════════ */
  function formatDate(str){
    if(!str) return '';
    const d = new Date(str + 'T00:00:00');
    if(isNaN(d)) return str;
    return d.toLocaleDateString('pt-BR');
  }

  function calcAge(dateStr){
    if(!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if(isNaN(d)) return '';
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if(m < 0 || (m===0 && today.getDate() < d.getDate())) age--;
    return age < 0 ? '' : String(age);
  }

  function turnosTexto(arr){
    if(!Array.isArray(arr)||!arr.length) return '—';
    return arr.map(t => t==='MAT'?'🌅 Mat':t==='VES'?'☀️ Ves':'🌙 Not').join(' ');
  }

  function normalize(s){
    return (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }

  function highlight(text, query){
    if(!query||!text) return escapeHtml(text||'—');
    const escaped = escapeHtml(text);
    const q = query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    try {
      const re = new RegExp('(' + q + ')', 'gi');
      return escaped.replace(re, '<mark>$1</mark>');
    } catch(e) { return escaped; }
  }

  function escapeHtml(s){
    return (s||'').toString()
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  const STATUS_LABEL = { CE:'CE', PS:'PS', EF:'EF', OUTRO:'Outro' };
  const SEXO_LABEL   = { F:'Feminino', M:'Masculino', O:'Outro' };

  /* ══════════════════════════════════════════
     Estado Global
  ══════════════════════════════════════════ */
  let funcionarios = [];
  let filtrados    = [];
  let _anoAtivo    = '';   // controlado pelo select

  // Ordenação: campo selecionado no <select> + botão de alternar direção
  let currentSortField = 'nome';
  let currentSortOrder = 'asc'; // 'asc' | 'desc'

  /* ══════════════════════════════════════════
     Exportar dados filtrados para outras funções
  ══════════════════════════════════════════ */
  function funcionariosMarcadosIds(){
    return new Set(Array.from(document.querySelectorAll('.chkFuncionario:checked')).map(c => c.dataset.func));
  }

  window.PesquisaFuncionarios = {
    getFiltrados: () => filtrados,
    getTodos: () => funcionarios,
    getAnoAtivo: () => _anoAtivo,
    getSelecionados: funcionariosMarcadosIds,
    // Regra de exportação: nenhum marcado -> todos os filtrados (na ordem
    // atual); 1+ marcados -> só os marcados (mantendo a ordem de filtrados).
    getParaExportar: () => {
      const ids = funcionariosMarcadosIds();
      return ids.size ? filtrados.filter(f => ids.has(f.funcId)) : filtrados;
    }
  };

  /* ══════════════════════════════════════════
     Ano Ativo — Firestore (mesmo padrão de pesquisa-ano-ativo)
  ══════════════════════════════════════════ */
  const selectAnoAtivo = document.getElementById('selectAnoAtivo');
  const anoAtivoMsg    = document.getElementById('anoAtivoMsg');
  let anoAtivoReal = ''; // ano ativo real, configurado no sistema

  function atualizarAnoEfetivo(){
    _anoAtivo = selectAnoAtivo.value || anoAtivoReal;
  }

  async function carregarAnoAtivo(){
    try{
      await new Promise(res=>{
        if(window.Auth && window.Auth.getSession && window.Auth.getSession()) return res();
        document.addEventListener('auth:ready', res, {once:true});
      });
      const dados = await window.DB.loadAll();
      anoAtivoReal = (dados.dadosEscola?.configAnoAtivo || '').toString().replace(/"/g,'').trim();

      // Monta as opções do select só com anos que realmente têm dados
      // (mesma lógica de pesquisa-ano-ativo: nada de intervalo fixo)
      const anosSet = new Set();
      funcionarios.forEach(f => { if(f.anoLetivo) anosSet.add(String(f.anoLetivo).trim()); });
      if(anoAtivoReal) anosSet.add(anoAtivoReal);
      const anos = Array.from(anosSet).filter(Boolean).sort((a,b) => Number(a) - Number(b));

      selectAnoAtivo.innerHTML = '';
      anos.forEach(y => {
        const o = document.createElement('option');
        o.value = y; o.textContent = y;
        selectAnoAtivo.appendChild(o);
      });
      // Abre já no ano ativo (não existe mais a opção "(usar ano ativo)");
      // sem ano ativo configurado, cai no mais recente.
      selectAnoAtivo.value = anos.includes(anoAtivoReal) ? anoAtivoReal : (anos[anos.length - 1] || '');

      atualizarAnoEfetivo();
      popularSelects();
    }catch(e){
      console.warn('carregarAnoAtivo:', e);
      anoAtivoMsg.textContent = '⚠️ Não foi possível carregar o ano ativo.';
      anoAtivoMsg.style.display = 'block';
    }
  }

  selectAnoAtivo.addEventListener('change', function(){
    atualizarAnoEfetivo();
    popularSelects();
    aplicarFiltros();
  });

  /* ══════════════════════════════════════════
     Firestore - Carregar Dados
  ══════════════════════════════════════════ */
  async function carregarDB(){
    try{
      await new Promise(res=>{
        if(window.Auth && window.Auth.getSession && window.Auth.getSession()) return res();
        document.addEventListener('auth:ready', res, {once:true});
      });
      funcionarios = await window.DB.funcionarios.list();
    }catch(e){
      console.warn('carregarDB pesquisa funcionarios:', e);
      funcionarios = [];
    }
  }

  /* ══════════════════════════════════════════
     Popular selects dinâmicos (Função e C.H.)
  ══════════════════════════════════════════ */
  function getFuncionariosDoAno(){
    if(!_anoAtivo) return funcionarios;
    return funcionarios.filter(f => String(f.anoLetivo || '') === _anoAtivo);
  }

  function popularSelects(){
    const base = getFuncionariosDoAno();

    const funcoes = [...new Set(
      base.map(f => (f.funcao||'').trim()).filter(Boolean)
    )].sort((a,b) => a.localeCompare(b,'pt-BR'));

    const selFuncao = document.getElementById('fFuncao');
    selFuncao.innerHTML = '<option value="">Todas</option>';
    funcoes.forEach(fn => {
      const o = document.createElement('option');
      o.value = fn; o.textContent = fn;
      selFuncao.appendChild(o);
    });

    const cargas = [...new Set(
      base.map(f => (f.cargaHoraria||'').toString().trim()).filter(Boolean)
    )].sort((a,b) => Number(a) - Number(b));

    const selCarga = document.getElementById('fCargaH');
    selCarga.innerHTML = '<option value="">Todas</option>';
    cargas.forEach(ch => {
      const o = document.createElement('option');
      o.value = ch; o.textContent = ch + 'H';
      selCarga.appendChild(o);
    });
  }

  /* ══════════════════════════════════════════
     UI refs
  ══════════════════════════════════════════ */
  const elBusca    = document.getElementById('fBusca');
  const elStatus   = document.getElementById('fStatus');
  const elFuncao   = document.getElementById('fFuncao');
  const elCargaH   = document.getElementById('fCargaH');
  const elSexo     = document.getElementById('fSexo');
  const chkMat     = document.getElementById('fMat');
  const chkVes     = document.getElementById('fVes');
  const chkNot     = document.getElementById('fNot');
  const turnoHint  = document.getElementById('turnoHint');
  const lista      = document.getElementById('listaFuncionarios');
  const countEl    = document.getElementById('countFuncionarios');
  const sortFieldEl = document.getElementById('sortField');
  const btnToggleSort = document.getElementById('btnToggleSort');
  const chkAllFuncionarios  = document.getElementById('chkAllFuncionarios');
  const countSelecionadosEl = document.getElementById('countSelecionados');

  /* ── Turno toggles visual ── */
  [chkMat, chkVes, chkNot].forEach(chk => {
    chk.addEventListener('change', function(){
      const lbl = chk.closest('.turno-checkbox-wrap');
      lbl.classList.toggle('checked', chk.checked);
      atualizarTurnoHint();
      aplicarFiltros();
    });
  });

  function getTurnosSelecionados(){
    const t = [];
    if(chkMat.checked) t.push('MAT');
    if(chkVes.checked) t.push('VES');
    if(chkNot.checked) t.push('NOT');
    return t;
  }

  function atualizarTurnoHint(){
    const t = getTurnosSelecionados();
    if(!t.length){
      turnoHint.textContent = 'Sem filtro de turno aplicado.';
    } else if(t.length === 1){
      turnoHint.textContent = 'Modo OU — exibe funcionários que atuam neste turno (mesmo que atuem em outros também).';
    } else {
      turnoHint.textContent = 'Modo E — exibe apenas funcionários que atuam em TODOS os turnos selecionados.';
    }
  }

  /* ══════════════════════════════════════════
     Filtros
  ══════════════════════════════════════════ */
  function aplicarFiltros(){
    const busca   = normalize(elBusca.value);
    const status  = elStatus.value;
    const funcao  = elFuncao.value;
    const cargaH  = elCargaH.value;
    const turnos  = getTurnosSelecionados();
    const base    = getFuncionariosDoAno();

    filtrados = base.filter(f => {
      // busca geral
      if(busca){
        const campos = [
          f.nome, f.cpf, f.rgCnh, f.funcao, f.naturalidade,
          f.naturalidadeUF, f.corRaca, f.cargaHoraria,
          STATUS_LABEL[f.status]||f.status
        ].map(x => normalize(x||'')).join(' ');
        if(!campos.includes(busca)) return false;
      }
      // status
      if(status && f.status !== status) return false;
      // função
      if(funcao && (f.funcao||'').trim() !== funcao) return false;
      // carga horária — compara como string pois pode ser número ou string no banco
      if(cargaH && String(f.cargaHoraria||'').trim() !== cargaH) return false;
      // sexo
      if(elSexo && elSexo.value && f.sexo !== elSexo.value) return false;
      // turnos: 1 selecionado = OU, 2+ = E
      if(turnos.length){
        const ft = Array.isArray(f.turnos) ? f.turnos : [];
        if(turnos.length === 1){
          // OU: basta ter o turno
          if(!ft.includes(turnos[0])) return false;
        } else {
          // E: precisa ter TODOS os turnos selecionados
          if(!turnos.every(t => ft.includes(t))) return false;
        }
      }
      return true;
    });

    aplicarOrdenacao();
    renderLista();
  }

  /* ══════════════════════════════════════════
     Ordenação
  ══════════════════════════════════════════ */
  function getSortVal(f, col){
    if(col === '_idade')  return parseInt(calcAge(f.dataNascimento)||'0', 10);
    if(col === '_nat')    return normalize([f.naturalidade, f.naturalidadeUF].filter(Boolean).join(' '));
    if(col === '_nTurnos') return Array.isArray(f.turnos) ? f.turnos.length : 0;
    if(col === 'dataNascimento') return f.dataNascimento || '';
    return normalize(f[col]||'');
  }

  function aplicarOrdenacao(){
    const col = currentSortField;
    const dir = currentSortOrder === 'asc' ? 1 : -1;
    filtrados.sort((a, b) => {
      const va = getSortVal(a, col);
      const vb = getSortVal(b, col);
      if(typeof va === 'number' && typeof vb === 'number'){
        return (va - vb) * dir;
      }
      if(va < vb) return -1 * dir;
      if(va > vb) return  1 * dir;
      return 0;
    });
  }

  sortFieldEl.addEventListener('change', function(){
    currentSortField = sortFieldEl.value;
    aplicarOrdenacao();
    renderLista();
  });
  btnToggleSort.addEventListener('click', function(){
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    btnToggleSort.textContent = currentSortOrder === 'asc' ? '↑↓' : '↓↑';
    aplicarOrdenacao();
    renderLista();
  });

  /* ══════════════════════════════════════════
     Render lista (cards) — padrão do sistema, sem paginação
     (lista sempre exibe todos os filtrados, igual ao módulo de aluno)
  ══════════════════════════════════════════ */
  function renderLista(){
    const query = elBusca.value.trim();

    countEl.textContent = filtrados.length;

    if(!filtrados.length){
      lista.innerHTML = '<div class="muted" style="grid-column:1/-1;">Nenhum funcionário encontrado para os filtros aplicados.</div>';
      syncCheckAllFuncionarios();
      atualizarContadorSelecionados();
      return;
    }

    lista.innerHTML = '';
    filtrados.forEach(f => {
      try{
      const nasc  = formatDate(f.dataNascimento) || '—';
      const idade = calcAge(f.dataNascimento) || '—';
      const ch    = f.cargaHoraria ? escapeHtml(f.cargaHoraria) + 'H' : '—';
      const vinc  = escapeHtml(STATUS_LABEL[f.status] || f.status || '—');
      // Resumo do card: só o essencial. Sexo, cor/raça e naturalidade ficam só na ficha (Visualizar).
      const meta = [
        `Nasc: ${escapeHtml(nasc)}`,
        `RG/CNH: ${highlight(f.rgCnh, query)}`,
        `Idade: ${escapeHtml(idade)}`,
        `Turnos: ${escapeHtml(turnosTexto(f.turnos))}`,
        `C.H.: ${ch}`,
        `Vínculo: ${vinc}`
      ].map(t => `<span class="meta-i">${t}</span>`).join(' • ');
      const el    = document.createElement('div');
      el.className = 'item selecionavel';
      el.innerHTML = `
        <div class="selo-selecionado">✓</div>
        <div class="left">
          <div class="title">
            <span class="nome">${highlight(f.nome, query) || 'Sem nome'}</span>
            <div class="badges">
              <span class="badge">${highlight(f.funcao, query) || 'Sem função'}</span>
              <span class="badge badge-cpf">CPF: ${highlight(f.cpf, query)}</span>
            </div>
          </div>
          <div class="meta">${meta}</div>
        </div>
        <div class="right">
          <a class="btn small secondary" href="cadastro-funcionario.html?editar=${encodeURIComponent(f.funcId)}">✏️ Editar</a>
          <button type="button" class="btn small neutral" data-view-func="${escapeHtml(f.funcId)}">👁️ Visualizar</button>
          <label class="check">
            <input type="checkbox" class="chkFuncionario" data-func="${escapeHtml(f.funcId)}" />
            <span>Selecionar</span>
          </label>
        </div>
      `;
      lista.appendChild(el);
      }catch(err){ console.error('renderLista: erro no registro', f && f.funcId, err); }
    });

    bindFuncionarioSelectionHandlers();
  }

  /* ══════════════════════════════════════════
     Seleção (checkbox) — mesmo padrão do módulo de aluno:
     checkbox escondido, clique em qualquer área vazia do card alterna,
     selo-selecionado (✓) aparece quando marcado, estado lido direto do DOM
     (sem Set — a lista inteira já está sempre renderizada, sem paginação).
     Nenhum card vem marcado por padrão.
  ══════════════════════════════════════════ */
  function bindFuncionarioSelectionHandlers(){
    document.querySelectorAll('.chkFuncionario').forEach(c => {
      c.addEventListener('change', function(){
        syncCheckAllFuncionarios();
        atualizarContadorSelecionados();
      });
    });
    lista.querySelectorAll('.item.selecionavel').forEach(el => {
      el.addEventListener('click', function(e){
        // só conta clique "seco" em área vazia — não em botão/link/checkbox,
        // nem quando o usuário só estava selecionando texto do card.
        if(e.target.closest('button, a, input, label')) return;
        if((window.getSelection()?.toString() || '').length > 0) return;
        const chk = el.querySelector('.chkFuncionario');
        if(!chk) return;
        chk.checked = !chk.checked;
        chk.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    syncCheckAllFuncionarios();
    atualizarContadorSelecionados();
  }

  function syncCheckAllFuncionarios(){
    const chks = Array.from(document.querySelectorAll('.chkFuncionario'));
    if(!chks.length){
      chkAllFuncionarios.checked = false;
      chkAllFuncionarios.indeterminate = false;
      return;
    }
    const checked = chks.filter(c => c.checked).length;
    chkAllFuncionarios.checked = checked === chks.length;
    chkAllFuncionarios.indeterminate = checked > 0 && checked < chks.length;
  }

  function atualizarContadorSelecionados(){
    const n = document.querySelectorAll('.chkFuncionario:checked').length;
    countSelecionadosEl.textContent = `${n} selecionado(s)`;
    countSelecionadosEl.style.display = n > 0 ? 'inline-block' : 'none';
  }

  chkAllFuncionarios.addEventListener('change', function(){
    document.querySelectorAll('.chkFuncionario').forEach(c => { c.checked = chkAllFuncionarios.checked; });
    syncCheckAllFuncionarios();
    atualizarContadorSelecionados();
  });

  /* ══════════════════════════════════════════
     Eventos
  ══════════════════════════════════════════ */
  elBusca.addEventListener('input',   aplicarFiltros);
  elStatus.addEventListener('change', aplicarFiltros);
  elFuncao.addEventListener('change', aplicarFiltros);
  elCargaH.addEventListener('change', aplicarFiltros);
  if(elSexo) elSexo.addEventListener('change', aplicarFiltros);

  document.getElementById('btnLimparFiltros').addEventListener('click', function(){
    elBusca.value  = '';
    elStatus.value = '';
    elFuncao.value = '';
    elCargaH.value = '';
    if(elSexo) elSexo.value = '';
    chkMat.checked = false; document.getElementById('lblFMat').classList.remove('checked');
    chkVes.checked = false; document.getElementById('lblFVes').classList.remove('checked');
    chkNot.checked = false; document.getElementById('lblFNot').classList.remove('checked');
    currentSortField = 'nome';
    currentSortOrder  = 'asc';
    sortFieldEl.value = 'nome';
    btnToggleSort.textContent = '↑↓';
    atualizarTurnoHint();
    aplicarFiltros(); // ano permanece o mesmo
  });

  /* ══════════════════════════════════════════
     Modal — Ficha do funcionário
  ══════════════════════════════════════════ */
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle     = document.getElementById('modalTitle');
  const modalBody       = document.getElementById('modalBody');

  const ESCOLARIDADE_LABEL = {
    SEM_ESCOLARIDADE:    'Sem escolaridade',
    FUND_INCOMPLETO:     'Ensino fundamental incompleto',
    FUND_COMPLETO:       'Ensino fundamental completo',
    MEDIO_INCOMPLETO:    'Ensino médio incompleto',
    MEDIO_COMPLETO:      'Ensino médio completo',
    SUPERIOR_INCOMPLETO: 'Ensino superior incompleto',
    SUPERIOR_COMPLETO:   'Ensino superior completo',
  };

  function abrirModal(titulo, htmlBody){
    modalTitle.textContent = titulo;
    modalBody.innerHTML = htmlBody;
    modalBackdrop.classList.add('open');
  }
  function fecharModal(){
    modalBackdrop.classList.remove('open');
  }
  document.getElementById('btnFecharModal').addEventListener('click', fecharModal);
  modalBackdrop.addEventListener('click', function(e){
    if(e.target === modalBackdrop) fecharModal();
  });

  function montarNeeDetalhado(f){
    const d = f.deficiencia || {};
    const itens = [];
    if(d.tea)              itens.push('🧩 TEA');
    if(d.altasHabilidades) itens.push('⭐ Altas habilidades / superdotação');
    if(d.defFisica)        itens.push('♿ Deficiência física');
    if(d.defIntelectual)   itens.push('🧠 Deficiência intelectual');
    if(d.defVisual)        itens.push('👁️ Deficiência visual' + (d.defVisualSub ? ` (${escapeHtml(d.defVisualSub)})` : ''));
    if(d.defAuditiva)      itens.push('👂 Deficiência auditiva / surdez' + (d.defAuditivaSub ? ` (${escapeHtml(d.defAuditivaSub)})` : ''));
    if(!itens.length){
      return `<div style="font-size:13px;color:var(--muted);">Nenhuma</div>`;
    }
    return `<div style="display:flex;flex-wrap:wrap;gap:6px;">` +
      itens.map(t => `<span class="badge">${t}</span>`).join('') +
      `</div>`;
  }

  function montarFormacao(f){
    const blocos = [];
    if(Array.isArray(f.graduacoes) && f.graduacoes.length){
      blocos.push(`<div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:10px 0 4px;">Graduações</div>` +
        f.graduacoes.map(g => `<div style="font-size:13px;">• ${escapeHtml(g.curso||g.nome||'—')}${g.ano?' · '+escapeHtml(String(g.ano)):''}</div>`).join(''));
    }
    if(Array.isArray(f.posGraduacoes) && f.posGraduacoes.length){
      blocos.push(`<div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:10px 0 4px;">Pós-graduações</div>` +
        f.posGraduacoes.map(p => `<div style="font-size:13px;">• ${escapeHtml(p.area||'—')}${p.ano?' · '+escapeHtml(String(p.ano)):''}</div>`).join(''));
    }
    // Complementações — array novo OU o campo único legado (registros mais antigos)
    const complementacoes = Array.isArray(f.complementacoes) && f.complementacoes.length
      ? f.complementacoes
      : (f.complementacaoPedagogica && f.complementacaoNome ? [{ nome: f.complementacaoNome }] : []);
    if(complementacoes.length){
      blocos.push(`<div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:10px 0 4px;">Complementações pedagógicas</div>` +
        complementacoes.map(c => `<div style="font-size:13px;">• ${escapeHtml(c.nome||'—')}${c.ano?' · '+escapeHtml(String(c.ano)):''}</div>`).join(''));
    }
    if(Array.isArray(f.outrosCursos) && f.outrosCursos.length){
      blocos.push(`<div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:10px 0 4px;">Outros cursos</div>` +
        f.outrosCursos.map(o => `<div style="font-size:13px;">• ${escapeHtml(o.nome||o.curso||'—')}</div>`).join(''));
    }
    return blocos.length ? blocos.join('') : `<div style="font-size:13px;color:var(--muted);">Nenhuma formação adicional registrada.</div>`;
  }

  function abrirFichaFuncionario(funcId){
    const f = funcionarios.find(x => x.funcId === funcId);
    if(!f) return;
    const nat  = [f.naturalidadeCidade || f.naturalidade, f.naturalidadeUF].filter(Boolean).join(' / ') || '—';
    const nasc = formatDate(f.dataNascimento) || '—';
    const idade = calcAge(f.dataNascimento) || '—';

    const fotoHtml = f.fotoUrl
      ? `<img src="${escapeHtml(f.fotoUrl)}" alt="Foto do funcionário" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--card-border,var(--border));" onerror="this.replaceWith(Object.assign(document.createElement('div'),{innerHTML:'🧑',style:'width:56px;height:56px;border-radius:50%;flex-shrink:0;background:var(--chip-bg);display:flex;align-items:center;justify-content:center;font-size:22px;border:2px solid var(--card-border,var(--border));'}))">`
      : `<div style="width:56px;height:56px;border-radius:50%;flex-shrink:0;background:var(--chip-bg);display:flex;align-items:center;justify-content:center;font-size:22px;border:2px solid var(--card-border,var(--border));">🧑</div>`;

    const cabecalho = `
      <div style="margin-bottom:14px;padding:12px 14px;border:1px solid var(--card-border,var(--border));border-radius:10px;background:var(--chip-bg);display:flex;align-items:center;gap:12px;">
        ${fotoHtml}
        <div>
          <b>${escapeHtml(f.nome || 'Sem nome')}</b> &nbsp;•&nbsp; ID: ${escapeHtml(f.funcId||'—')}
          &nbsp;•&nbsp; Vínculo: ${escapeHtml(STATUS_LABEL[f.status]||f.status||'—')}
        </div>
      </div>`;

    const camposBasicos = [
      ['CPF', f.cpf], ['RG/CNH', f.rgCnh], ['Nascimento', nasc], ['Idade', idade],
      ['Sexo', SEXO_LABEL[f.sexo]||f.sexo], ['Cor/Raça', f.corRaca],
      ['Naturalidade', nat], ['Mãe', f.filiacaoMae], ['Pai', f.filiacaoPai],
      ['Função', f.funcao], ['Carga horária', f.cargaHoraria ? f.cargaHoraria+'H' : ''],
      ['Turnos', turnosTexto(f.turnos)],
      ['CEP', f.cep], ['Cidade', f.endCidade], ['UF', f.endUF], ['Zona', f.zonaResidencia],
      ['Escolaridade', ESCOLARIDADE_LABEL[f.escolaridade] || f.escolaridade],
    ];
    const campos = camposBasicos.map(([label, v]) => `
      <div style="padding:8px 10px;border:1px solid var(--card-border,var(--border));border-radius:8px;">
        <div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(label)}</div>
        <div style="font-size:13px;margin-top:2px;">${escapeHtml(String(v || '—'))}</div>
      </div>`).join('');

    const docsPlaceholderId = `docsFicha_${funcId.replace(/[^a-zA-Z0-9_-]/g,'')}`;

    const rows = `${cabecalho}
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">${campos}</div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">NEE / Deficiência</div>
        ${montarNeeDetalhado(f)}
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Formação</div>
        ${montarFormacao(f)}
      </div>
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Documentos</div>
        <div id="${docsPlaceholderId}" style="font-size:13px;color:var(--muted);">Carregando documentos…</div>
      </div>
    `;
    abrirModal('Ficha do funcionário', rows);
    carregarDocsFicha(funcId, docsPlaceholderId);
  }

  async function carregarDocsFicha(funcId, targetId){
    const el = document.getElementById(targetId);
    if(!el) return;
    try{
      const resp = await fetch(`/api/drive-list-funcionario?funcionarioId=${encodeURIComponent(funcId)}`);
      const data = await resp.json();
      if(!resp.ok) throw new Error(data.error || 'Erro ao buscar documentos');
      const files = data.files || [];
      if(!files.length){
        el.innerHTML = `<div style="font-size:13px;color:var(--muted);">Nenhum documento anexado</div>`;
        return;
      }
      el.innerHTML = files.map(f => {
        const icon = (f.mimeType||'').startsWith('image/') ? '🖼️' : '📄';
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--card-border,var(--border));">
          <span>${icon}</span>
          <span style="flex:1;font-size:13px;">${escapeHtml(f.label||f.fileName)}</span>
          <a href="${f.webViewLink}" target="_blank" rel="noopener" class="link-doc-ver">👁️ Ver</a>
        </div>`;
      }).join('');
    }catch(e){
      el.innerHTML = `<div style="font-size:13px;color:#b91c1c;">Erro ao carregar documentos.</div>`;
    }
  }

  lista.addEventListener('click', function(e){
    const btn = e.target.closest('[data-view-func]');
    if(!btn) return;
    abrirFichaFuncionario(btn.dataset.viewFunc);
  });

  /* ══════════════════════════════════════════
     Init
  ══════════════════════════════════════════ */
  // Ícone(s) de dica (ⓘ) — fecha qualquer um aberto ao clicar fora.
  document.addEventListener('click', () => {
    document.querySelectorAll('.info-tip.open').forEach(el => el.classList.remove('open'));
  });

  // Contraste do texto do card de destaque (cálculo centralizado em theme-colors.js).
  // Isolado em try/catch: um problema visual nunca pode impedir o carregamento da lista.
  try{
    if(window.ThemeColors && typeof ThemeColors.ajustarContraste === 'function') ThemeColors.ajustarContraste();
  }catch(e){ console.warn('ajustarContraste:', e); }

  (async function init(){
    try{
      await carregarDB();
      await carregarAnoAtivo();
      // garantia: aplicarFiltros depois de ambos estarem prontos
      aplicarFiltros();
    } finally {
      if(window.Loading) Loading.esconder();
    }
  })();
})();
