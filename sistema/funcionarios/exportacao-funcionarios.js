/* ══════════════════════════════════════════════════════════
   EXPORTACAO-FUNCIONARIOS.JS
   Exportação da pesquisa de funcionários:
     1. Ficha geral (PDF)  — tabela enxuta, respeita filtro/ordenação da tela
     2. Tabela completa (DOCX) — todos os campos, em Word (softwares de RH
        específicos só abrem Word)
     3. CSV completo — todos os campos, exceto imagem/documento

   PENDENTE (não implementado ainda, propositalmente): Ficha individual
   (PDF, 1 por funcionário) — será adicionada depois, seguindo o padrão que
   está sendo construído na página de aluno. O botão já existe no HTML,
   desabilitado.

   Fonte dos dados: window.PesquisaFuncionarios (exposto em
   pesquisa-funcionario.js):
     - getFiltrados()    -> todos que passam pelo filtro atual, já ordenados
     - getParaExportar() -> regra de seleção já aplicada:
         nenhum card marcado  = getFiltrados()
         1+ cards marcados    = só os marcados, mantendo a ordem
   Os 3 exports abaixo usam sempre getParaExportar().
   ══════════════════════════════════════════════════════════ */
(function(){

  /* ══════════════════════════════════════════
     Helpers
     (duplicados dos que já existem em pesquisa-funcionario.js — são
     arquivos/escopos separados, não dá pra reaproveitar direto; o guia do
     projeto já previa isso)
  ══════════════════════════════════════════ */
  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  }

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
    if(!Array.isArray(arr) || !arr.length) return '—';
    return arr.map(t => t==='MAT'?'Matutino':t==='VES'?'Vespertino':'Noturno').join(', ');
  }

  const STATUS_LABEL = { CE:'Contrato Emergencial', PS:'Processo Seletivo', EF:'Concursado/Efetivo', OUTRO:'Outro' };
  const SEXO_LABEL   = { F:'Feminino', M:'Masculino', O:'Outro' };
  const ESCOLARIDADE_LABEL = {
    SEM_ESCOLARIDADE:    'Sem escolaridade',
    FUND_INCOMPLETO:     'Ensino fundamental incompleto',
    FUND_COMPLETO:       'Ensino fundamental completo',
    MEDIO_INCOMPLETO:    'Ensino médio incompleto',
    MEDIO_COMPLETO:      'Ensino médio completo',
    SUPERIOR_INCOMPLETO: 'Ensino superior incompleto',
    SUPERIOR_COMPLETO:   'Ensino superior completo',
  };

  function neeResumo(f){
    const d = f.deficiencia || {};
    const itens = [];
    if(d.tea)              itens.push('TEA');
    if(d.altasHabilidades) itens.push('Altas habilidades');
    if(d.defFisica)        itens.push('Def. física');
    if(d.defIntelectual)   itens.push('Def. intelectual');
    if(d.defVisual)        itens.push('Def. visual' + (d.defVisualSub ? ` (${d.defVisualSub})` : ''));
    if(d.defAuditiva)      itens.push('Def. auditiva' + (d.defAuditivaSub ? ` (${d.defAuditivaSub})` : ''));
    return itens.join('; ') || 'Nenhuma';
  }

  // Achata um array de objetos (graduações, pós, cursos...) num texto único
  function formacaoResumo(lista, campoPrincipal){
    if(!Array.isArray(lista) || !lista.length) return '';
    return lista.map(item => {
      const nome = item[campoPrincipal] || item.nome || item.curso || item.area || '—';
      return item.ano ? `${nome} (${item.ano})` : nome;
    }).join('; ');
  }

  function complementacoesResumo(f){
    const lista = Array.isArray(f.complementacoes) && f.complementacoes.length
      ? f.complementacoes
      : (f.complementacaoPedagogica && f.complementacaoNome ? [{ nome: f.complementacaoNome }] : []);
    return formacaoResumo(lista, 'nome');
  }

  // Enriquece o funcionário com campos derivados/textuais, usados nos 3 exports
  function enriquecerFuncionario(f){
    return {
      ...f,
      _nasc:                 formatDate(f.dataNascimento),
      _idade:                calcAge(f.dataNascimento),
      _sexoTexto:            SEXO_LABEL[f.sexo] || f.sexo || '',
      _statusTexto:          STATUS_LABEL[f.status] || f.status || '',
      _turnosTexto:          turnosTexto(f.turnos),
      _naturalidadeTexto:    [f.naturalidadeCidade || f.naturalidade, f.naturalidadeUF].filter(Boolean).join(' / '),
      _escolaridadeTexto:    ESCOLARIDADE_LABEL[f.escolaridade] || f.escolaridade || '',
      _graduacoesTexto:      formacaoResumo(f.graduacoes, 'curso'),
      _posGraduacoesTexto:   formacaoResumo(f.posGraduacoes, 'area'),
      _complementacoesTexto: complementacoesResumo(f),
      _outrosCursosTexto:    formacaoResumo(f.outrosCursos, 'nome'),
      _neeTexto:             neeResumo(f),
    };
  }

  /* ══════════════════════════════════════════
     Colunas
  ══════════════════════════════════════════ */

  // Ficha geral (PDF) — colunas essenciais, legíveis numa tabela impressa
  const COLS_ESSENCIAIS = [
    {key:'nome',         label:'NOME',       width:130},
    {key:'funcao',       label:'FUNÇÃO',     width:95},
    {key:'cargaHoraria', label:'CARGA H.',   width:55},
    {key:'_turnosTexto', label:'TURNO',      width:75},
    {key:'_statusTexto', label:'VÍNCULO',    width:95},
    {key:'cpf',          label:'CPF',        width:90},
    {key:'_nasc',        label:'NASCIMENTO', width:70},
    {key:'_idade',       label:'IDADE',      width:40},
  ];

  // Tabela completa (DOCX) e CSV — todos os campos, exceto imagem/documento
  const COLS_COMPLETO = [
    {key:'funcId',                 label:'ID'},
    {key:'anoLetivo',              label:'ANO LETIVO'},
    {key:'nome',                   label:'NOME'},
    {key:'cpf',                    label:'CPF'},
    {key:'rgCnh',                  label:'RG/CNH'},
    {key:'_nasc',                  label:'DATA DE NASCIMENTO'},
    {key:'_idade',                 label:'IDADE'},
    {key:'_sexoTexto',             label:'SEXO'},
    {key:'corRaca',                label:'COR/RAÇA'},
    {key:'_naturalidadeTexto',     label:'NATURALIDADE'},
    {key:'naturalidadePais',       label:'PAÍS'},
    {key:'filiacaoMae',            label:'MÃE'},
    {key:'filiacaoPai',            label:'PAI'},
    {key:'funcao',                 label:'FUNÇÃO'},
    {key:'cargaHoraria',           label:'CARGA HORÁRIA'},
    {key:'_turnosTexto',           label:'TURNOS'},
    {key:'_statusTexto',           label:'VÍNCULO'},
    {key:'cep',                    label:'CEP'},
    {key:'endCidade',              label:'CIDADE'},
    {key:'endUF',                  label:'UF'},
    {key:'zonaResidencia',         label:'ZONA'},
    {key:'_escolaridadeTexto',     label:'ESCOLARIDADE'},
    {key:'tipoEnsino',             label:'TIPO DE ENSINO'},
    {key:'_graduacoesTexto',       label:'GRADUAÇÕES'},
    {key:'_posGraduacoesTexto',    label:'PÓS-GRADUAÇÕES'},
    {key:'_complementacoesTexto',  label:'COMPLEMENTAÇÕES PEDAGÓGICAS'},
    {key:'_outrosCursosTexto',     label:'OUTROS CURSOS'},
    {key:'_neeTexto',              label:'NEE / DEFICIÊNCIA'},
  ];

  function linhaColunas(f, cols){
    return cols.map(c => String(f[c.key] ?? '') || '—');
  }

  /* ══════════════════════════════════════════
     Dados da escola (cabeçalho institucional) — mesmo padrão do aluno
  ══════════════════════════════════════════ */
  async function _carregarDadosEscola(){
    try{
      if(window.DB && window.DB.escola && window.DB.escola.get){
        const e = await window.DB.escola.get();
        if(e && e.nome) return e;
      }
    }catch(_){}
    try{
      const schoolId = window.Auth?.getActiveSchoolId?.() || '';
      const key = schoolId ? `schools:${schoolId}:dadosEscola` : 'dadosEscola';
      const cached = localStorage.getItem(key);
      if(cached) return JSON.parse(cached);
    }catch(_){}
    return null;
  }

  function _getSchoolDisplayName(escola){
    try{
      const s = window.Auth?.getSession?.() || JSON.parse(localStorage.getItem('auth_session_v2')||'null');
      if(!s) return (escola && escola.nome) || '';
      const schools = (window.Auth?.listSchools?.() || JSON.parse(localStorage.getItem('auth_schools_v1')||'[]'));
      const effective = (s.schoolId||'').toString().toUpperCase() === 'ADMIN'
        ? (localStorage.getItem('admin_active_school_v1')||'').trim() || 'ADMIN'
        : (s.schoolId||'').toString();
      const matched = schools.find(x => (x.schoolId||x.id||'').toString() === effective);
      return matched ? (matched.displayName || matched.name || matched.nome || '').toString().trim() : ((escola && escola.nome) || '');
    }catch(_){ return (escola && escola.nome) || ''; }
  }

  // Monta nome de arquivo: [prefixo]_[escola]_[DD-MM-AAAA].[ext]
  function _buildFilename(prefixo, escola, ext){
    const hoje = new Date();
    const d = String(hoje.getDate()).padStart(2,'0');
    const m = String(hoje.getMonth()+1).padStart(2,'0');
    const a = hoje.getFullYear();
    const rawName = _getSchoolDisplayName(escola);
    const nomeEscola = rawName
      ? rawName.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
          .toUpperCase().replace(/[^\w\d]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'').slice(0,40)
      : '';
    const partes = [prefixo, nomeEscola, `${d}-${m}-${a}`].filter(Boolean);
    return partes.join('_') + '.' + ext;
  }

  function _baixarBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /* ══════════════════════════════════════════
     1) Ficha geral (PDF) — tabela enxuta, autotable, paisagem
  ══════════════════════════════════════════ */
  const _TABLE_STYLES = {
    styles:     { fontSize: 8.5, cellPadding: {top:3,bottom:3,left:4,right:4}, overflow: 'linebreak', lineColor: [210,220,240], lineWidth: 0.3 },
    headStyles: { fillColor: [11,63,191], textColor: 255, fontStyle: 'bold', fontSize: 8.5, cellPadding: {top:4,bottom:4,left:4,right:4} },
    alternateRowStyles: { fillColor: [243,246,255] },
    bodyStyles: { textColor: [30,30,50] },
    margin: { left: 20, right: 20 },
  };

  function _desenharCabecalhoEscola(doc, escola, titulo, pageWidth){
    const L = 28, R = pageWidth - 28;
    let y = 20;

    let logoW = 0;
    if(escola && escola.escudo){
      try{
        const imgW = 48, imgH = 48;
        doc.addImage(escola.escudo, 'PNG', L, y, imgW, imgH);
        logoW = imgW + 10;
      }catch(_){}
    }

    const tx = L + logoW;
    if(escola && escola.nome){
      doc.setFontSize(13); doc.setFont(undefined,"bold"); doc.setTextColor(11,63,191);
      doc.text(escola.nome.toUpperCase(), tx, y + 13);
      doc.setFont(undefined,"normal"); doc.setTextColor(60);
      let subY = y + 24;
      const partes = [];
      if(escola.endereco) partes.push(escola.endereco);
      const cidade = [escola.cidade||escola.municipio, escola.uf||escola.UF].filter(Boolean).join('/');
      if(cidade) partes.push(cidade);
      if(escola.inep||escola.codigoInep) partes.push(`INEP: ${escola.inep||escola.codigoInep}`);
      if(escola.email) partes.push(`E-mail: ${escola.email}`);
      if(escola.telefone||escola.tel) partes.push(`Tel: ${escola.telefone||escola.tel}`);
      if(partes.length){
        doc.setFontSize(8);
        const linha = doc.splitTextToSize(partes.join('  •  '), R - tx - 10);
        doc.text(linha, tx, subY);
        subY += linha.length * 10;
      }
      y = Math.max(y + 50, subY + 4);
    } else {
      y = y + (logoW ? 52 : 0);
    }

    doc.setDrawColor(11,63,191); doc.setLineWidth(1.2);
    doc.line(L, y, R, y);
    y += 8;

    doc.setFontSize(11); doc.setFont(undefined,"bold"); doc.setTextColor(20);
    doc.text(titulo, L, y + 8);
    doc.setFont(undefined,"normal"); doc.setTextColor(0);
    y += 18;

    return y;
  }

  async function exportFichaGeralPdf(titulo, lista){
    if(!lista.length){ alert('Nenhum funcionário para exportar.'); return; }
    const { jsPDF } = window.jspdf || {};
    if(!jsPDF){ alert('Falha ao carregar jsPDF. Verifique sua conexão.'); return; }

    const escola = await _carregarDadosEscola();
    const enriquecidos = lista.map(enriquecerFuncionario);

    const doc = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const startY = _desenharCabecalhoEscola(doc, escola, titulo, pw);

    doc.autoTable({
      head: [COLS_ESSENCIAIS.map(c => c.label)],
      body: enriquecidos.map(f => linhaColunas(f, COLS_ESSENCIAIS)),
      startY,
      ..._TABLE_STYLES,
      columnStyles: Object.fromEntries(COLS_ESSENCIAIS.map((c,i) => [i, { cellWidth: c.width }])),
    });

    doc.save(_buildFilename('Ficha_Geral_Funcionarios', escola, 'pdf'));
  }

  /* ══════════════════════════════════════════
     2) Tabela completa (DOCX) — todos os campos, em Word
  ══════════════════════════════════════════ */
  async function exportTabelaDocx(titulo, lista){
    if(!lista.length){ alert('Nenhum funcionário para exportar.'); return; }
    const docxLib = window.docx;
    if(!docxLib){ alert('Falha ao carregar a biblioteca de exportação Word. Verifique sua conexão.'); return; }
    const { Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun,
            WidthType, HeadingLevel, AlignmentType } = docxLib;

    const escola = await _carregarDadosEscola();
    const enriquecidos = lista.map(enriquecerFuncionario);

    const headerRow = new TableRow({
      tableHeader: true,
      children: COLS_COMPLETO.map(c => new TableCell({
        shading: { fill: '0B3FBF' },
        children: [new Paragraph({
          children: [new TextRun({ text: c.label, bold: true, color: 'FFFFFF', size: 15 })],
        })],
      })),
    });

    const bodyRows = enriquecidos.map((f, i) => new TableRow({
      children: COLS_COMPLETO.map(c => new TableCell({
        shading: i % 2 === 1 ? { fill: 'F3F6FF' } : undefined,
        children: [new Paragraph({
          children: [new TextRun({ text: String(f[c.key] ?? '') || '—', size: 15 })],
        })],
      })),
    }));

    const nomeEscola = _getSchoolDisplayName(escola) || (escola && escola.nome) || '';

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { orientation: 'landscape' },
            margin: { top: 500, bottom: 500, left: 500, right: 500 },
          },
        },
        children: [
          ...(nomeEscola ? [new Paragraph({
            children: [new TextRun({ text: nomeEscola.toUpperCase(), bold: true, size: 26, color: '0B3FBF' })],
          })] : []),
          new Paragraph({
            children: [new TextRun({ text: titulo, bold: true, size: 22 })],
            spacing: { after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...bodyRows],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    _baixarBlob(blob, _buildFilename('Tabela_Completa_Funcionarios', escola, 'docx'));
  }

  /* ══════════════════════════════════════════
     3) CSV completo — todos os campos, exceto imagem/documento
  ══════════════════════════════════════════ */
  async function exportCsvCompleto(lista){
    if(!lista.length){ alert('Nenhum funcionário para exportar.'); return; }
    const enriquecidos = lista.map(enriquecerFuncionario);
    const linhas = [
      COLS_COMPLETO.map(c => c.label),
      ...enriquecidos.map(f => linhaColunas(f, COLS_COMPLETO)),
    ];
    const csv = linhas
      .map(cols => cols.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(';'))
      .join('\r\n');

    const escola = await _carregarDadosEscola();
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    _baixarBlob(blob, _buildFilename('Completo_Funcionarios', escola, 'csv'));
  }

  /* ══════════════════════════════════════════
     Wiring — dropdown "Exportar" + botões
  ══════════════════════════════════════════ */
  function _tituloContexto(){
    const ano = (window.PesquisaFuncionarios && window.PesquisaFuncionarios.getAnoAtivo()) || '';
    return `Ano Ativo ${ano || ''}`.trim();
  }

  document.addEventListener('DOMContentLoaded', function(){
    const btnExportar = document.getElementById('btnExportarFuncionarios');
    const drop         = document.getElementById('dropExportFuncionarios');
    if(!btnExportar || !drop) return; // página ainda não tem o dropdown

    btnExportar.addEventListener('click', function(e){
      e.stopPropagation();
      const aberto = drop.style.display !== 'none';
      drop.style.display = aberto ? 'none' : 'flex';
    });
    document.addEventListener('click', function(){ drop.style.display = 'none'; });
    drop.addEventListener('click', function(e){ e.stopPropagation(); });

    document.getElementById('btnExportFichaGeral').addEventListener('click', function(){
      drop.style.display = 'none';
      const lista = window.PesquisaFuncionarios.getParaExportar();
      exportFichaGeralPdf(`${_tituloContexto()} • Ficha Geral de Funcionários`, lista);
    });

    document.getElementById('btnExportDocx').addEventListener('click', function(){
      drop.style.display = 'none';
      const lista = window.PesquisaFuncionarios.getParaExportar();
      exportTabelaDocx(`${_tituloContexto()} • Tabela Completa de Funcionários`, lista);
    });

    document.getElementById('btnExportCsv').addEventListener('click', function(){
      drop.style.display = 'none';
      const lista = window.PesquisaFuncionarios.getParaExportar();
      exportCsvCompleto(lista);
    });

    // btnExportFichaIndividual fica desabilitado de propósito — pendente.
  });

})();
