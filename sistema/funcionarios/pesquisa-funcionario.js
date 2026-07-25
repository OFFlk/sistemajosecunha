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
  let pagAtual     = 1;
  const POR_PAG    = 20;
  let _anoAtivo    = '';   // controlado pelo select

  // Ordenação: campo selecionado no <select> + botão de alternar direção
  let currentSortField = 'nome';
  let currentSortOrder = 'asc'; // 'asc' | 'desc'

  /* ══════════════════════════════════════════
     Exportar dados filtrados para outras funções
  ══════════════════════════════════════════ */
  window.PesquisaFuncionarios = {
    getFiltrados: () => filtrados,
    getTodos: () => funcionarios,
    getAnoAtivo: () => _anoAtivo
  };

  /* ══════════════════════════════════════════
     Ano Ativo — Firestore
  ══════════════════════════════════════════ */
  const selectAnoAtivo = document.getElementById('selectAnoAtivo');
  const anoAtivoMsg    = document.getElementById('anoAtivoMsg');

  (function populaSelectAnos(){
    const cy = new Date().getFullYear();
    selectAnoAtivo.innerHTML = '';
    // opção "Todos os anos"
    const optTodos = document.createElement('option');
    optTodos.value = ''; optTodos.textContent = 'Todos os anos';
    selectAnoAtivo.appendChild(optTodos);
    for(let y = cy + 1; y >= 2020; y--){
      const opt = document.createElement('option');
      opt.value = String(y); opt.textContent = String(y);
      selectAnoAtivo.appendChild(opt);
    }
    selectAnoAtivo.value = '';
  })();

  async function carregarAnoAtivo(){
    try{
      await new Promise(res=>{
        if(window.Auth && window.Auth.getSession && window.Auth.getSession()) return res();
        document.addEventListener('auth:ready', res, {once:true});
      });
      const dados = await window.DB.loadAll();
      const ano = (dados.dadosEscola?.configAnoAtivo || '').toString().replace(/"/g,'').trim();
      if(ano && !isNaN(Number(ano))){
        selectAnoAtivo.value = ano;
        _anoAtivo = ano;
        anoAtivoMsg.textContent = `Ano ativo: ${ano}.`;
      } else {
        _anoAtivo = '';
        anoAtivoMsg.textContent = 'Ano ativo não definido — mostrando todos.';
      }
      popularSelects();
      atualizarPill();
    }catch(e){
      console.warn('carregarAnoAtivo:', e);
      anoAtivoMsg.textContent = 'Não foi possível carregar o ano ativo.';
    }
  }

  selectAnoAtivo.addEventListener('change', function(){
    _anoAtivo = selectAnoAtivo.value;
    anoAtivoMsg.textContent = _anoAtivo
      ? `Filtrando pelo ano ${_anoAtivo}.`
      : 'Exibindo funcionários de todos os anos.';
    popularSelects();
    atualizarPill();
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
      const dados = await window.DB.loadAll();
      // Tenta coleção dedicada primeiro; fallback para campo dentro do documento da escola
      if(Array.isArray(dados.funcionariosDB) && dados.funcionariosDB.length){
        funcionarios = dados.funcionariosDB;
      } else if(Array.isArray(dados.dadosEscola?.funcionariosDB)){
        funcionarios = dados.dadosEscola.funcionariosDB;
      } else {
        funcionarios = [];
      }
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
  const pillTotal  = document.getElementById('pillTotal');
  const subRes     = document.getElementById('subResultados');
  const statsRow   = document.getElementById('statsRow');
  const pagRow     = document.getElementById('pagRow');
  const pagInfo    = document.getElementById('pagInfo');
  const btnAnterior = document.getElementById('btnPagAnterior');
  const btnProximo  = document.getElementById('btnPagProximo');
  const sortFieldEl = document.getElementById('sortField');
  const btnToggleSort = document.getElementById('btnToggleSort');

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

    pagAtual = 1;
    aplicarOrdenacao();
    atualizarStats();
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
     Stats
  ══════════════════════════════════════════ */
  function atualizarPill(){
    const base = getFuncionariosDoAno();
    const label = _anoAtivo ? ` (${_anoAtivo})` : '';
    pillTotal.textContent = `Total${label}: ${base.length} funcionário(s)`;
  }

  function atualizarStats(){
    const total = filtrados.length;
    document.getElementById('statExib').textContent = total;
    document.getElementById('statMat').textContent = filtrados.filter(f=>Array.isArray(f.turnos)&&f.turnos.includes('MAT')).length;
    document.getElementById('statVes').textContent = filtrados.filter(f=>Array.isArray(f.turnos)&&f.turnos.includes('VES')).length;
    document.getElementById('statNot').textContent = filtrados.filter(f=>Array.isArray(f.turnos)&&f.turnos.includes('NOT')).length;
    document.getElementById('statCE').textContent  = filtrados.filter(f=>f.status==='CE').length;
    document.getElementById('statPS').textContent  = filtrados.filter(f=>f.status==='PS').length;
    document.getElementById('statEF').textContent  = filtrados.filter(f=>f.status==='EF').length;
    statsRow.style.display = total > 0 ? 'flex' : 'none';

    const total_func = getFuncionariosDoAno().length;
    if(total_func === 0){
      subRes.textContent = 'Nenhum funcionário cadastrado ainda.';
    } else if(total === total_func){
      subRes.textContent = `${total} funcionário(s) encontrado(s).`;
    } else {
      subRes.textContent = `${total} de ${total_func} funcionário(s) corresponde(m) aos filtros.`;
    }
  }

  /* ══════════════════════════════════════════
     Render lista (cards) — padrão do sistema
  ══════════════════════════════════════════ */
  function renderLista(){
    const query    = elBusca.value.trim();
    const inicio   = (pagAtual - 1) * POR_PAG;
    const pagina   = filtrados.slice(inicio, inicio + POR_PAG);
    const totalPags = Math.ceil(filtrados.length / POR_PAG);

    countEl.textContent = filtrados.length;

    if(!filtrados.length){
      lista.innerHTML = '<div class="muted" style="grid-column:1/-1;">Nenhum funcionário encontrado para os filtros aplicados.</div>';
      pagRow.style.display = 'none';
      return;
    }

    lista.innerHTML = '';
    pagina.forEach(f => {
      const nat   = [f.naturalidade, f.naturalidadeUF].filter(Boolean).join(' / ') || '—';
      const nasc  = formatDate(f.dataNascimento) || '—';
      const idade = calcAge(f.dataNascimento) || '—';
      const el    = document.createElement('div');
      el.className = 'item';
      el.innerHTML = `
        <div class="left">
          <div class="title">
            <span>${highlight(f.nome, query) || 'Sem nome'}</span>
            <span class="badge">${highlight(f.funcao, query) || 'Sem função'}</span>
            ${f.cargaHoraria ? `<span class="badge">${escapeHtml(f.cargaHoraria)}H</span>` : ''}
            <span class="badge badge-status ${f.status ? f.status.toLowerCase() : ''}">${escapeHtml(STATUS_LABEL[f.status]||f.status||'—')}</span>
          </div>
          <div class="meta">
            CPF: ${highlight(f.cpf, query) || '—'} • RG/CNH: ${highlight(f.rgCnh, query) || '—'} •
            Nasc: ${escapeHtml(nasc)} • Idade: ${escapeHtml(idade)} • Sexo: ${escapeHtml(SEXO_LABEL[f.sexo]||f.sexo||'—')}
            <br>Naturalidade: ${highlight(nat, query)} • Cor/Raça: ${escapeHtml(f.corRaca||'—')} •
            Turnos: ${escapeHtml(turnosTexto(f.turnos))}
          </div>
        </div>
        <div class="right">
          <a class="btn-edit" href="cadastro-funcionario.html?editar=${encodeURIComponent(f.funcId)}">✏️ Editar</a>
        </div>
      `;
      lista.appendChild(el);
    });

    if(totalPags > 1){
      pagRow.style.display = 'flex';
      pagInfo.textContent = `Página ${pagAtual} de ${totalPags}`;
      btnAnterior.disabled = pagAtual <= 1;
      btnAnterior.style.opacity = pagAtual <= 1 ? '0.4' : '1';
      btnProximo.disabled  = pagAtual >= totalPags;
      btnProximo.style.opacity  = pagAtual >= totalPags ? '0.4' : '1';
    } else {
      pagRow.style.display = 'none';
    }
  }

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
    sortState = { col: null, dir: 0 };
    document.querySelectorAll('th.sortable').forEach(h => {
      h.classList.remove('asc','desc');
      h.querySelector('.sort-icon').textContent = '↕';
    });
    atualizarTurnoHint();
    aplicarFiltros(); // ano permanece o mesmo
  });

  btnAnterior.addEventListener('click', function(){
    if(pagAtual > 1){ pagAtual--; renderLista(); window.scrollTo({top:0,behavior:'smooth'}); }
  });
  btnProximo.addEventListener('click', function(){
    const totalPags = Math.ceil(filtrados.length / POR_PAG);
    if(pagAtual < totalPags){ pagAtual++; renderLista(); window.scrollTo({top:0,behavior:'smooth'}); }
  });

  /* ══════════════════════════════════════════
     Init
  ══════════════════════════════════════════ */
  (async function init(){
    await carregarDB();
    await carregarAnoAtivo();
    // garantia: aplicarFiltros depois de ambos estarem prontos
    aplicarFiltros();
  })();
})();
