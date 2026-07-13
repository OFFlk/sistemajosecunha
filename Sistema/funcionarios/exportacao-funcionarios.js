/* ══════════════════════════════════════════════════════════
   EXPORTACAO-FUNCIONARIOS.JS - VERSÃO CORRIGIDA
   Funções de exportação para DOCX e XLSX com formatação
   
   Dependências: docx, xlsx (bibliotecas CDN)
   ══════════════════════════════════════════════════════════ */
const scriptExcelJS = document.createElement('script');
scriptExcelJS.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';

scriptExcelJS.onload = () => {
  console.log('✅ ExcelJS carregado');
};

document.head.appendChild(scriptExcelJS);
(function(){
  
  /* ══════════════════════════════════════════
     Flags de carregamento das bibliotecas
  ══════════════════════════════════════════ */
  let docxCarregado = false;
  let xlsxCarregado = false;

  /* ══════════════════════════════════════════
     Carregar bibliotecas via CDN
  ══════════════════════════════════════════ */
  const scriptDocx = document.createElement('script');
  scriptDocx.src = 'https://unpkg.com/docx@8.5.0/build/index.umd.js';

scriptDocx.onload = () => {
  console.log(window.docx);

  docxCarregado = !!window.docx;

  if(docxCarregado){
    console.log('✅ Biblioteca DOCX carregada');
  } else {
    console.error('❌ DOCX carregou mas window.docx não existe');
  }
};
  scriptDocx.onerror = () => {
    console.error('❌ Erro ao carregar biblioteca DOCX');
  };
  document.head.appendChild(scriptDocx);

  const scriptXlsx = document.createElement('script');
  scriptXlsx.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
  scriptXlsx.onload = () => {
    xlsxCarregado = true;
    console.log('✅ Biblioteca XLSX carregada');
  };
  scriptXlsx.onerror = () => {
    console.error('❌ Erro ao carregar biblioteca XLSX');
  };
  document.head.appendChild(scriptXlsx);

  /* ══════════════════════════════════════════
     Helpers
  ══════════════════════════════════════════ */
  function formatarDataBR(str){
    if(!str) return '—';
    const d = new Date(str + 'T00:00:00');
    if(isNaN(d)) return str;
    return d.toLocaleDateString('pt-BR');
  }

  function calcularIdade(dateStr){
    if(!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    if(isNaN(d)) return '—';
    const hoje = new Date();
    let idade = hoje.getFullYear() - d.getFullYear();
    const m = hoje.getMonth() - d.getMonth();
    if(m < 0 || (m===0 && hoje.getDate() < d.getDate())) idade--;
    return idade < 0 ? '—' : String(idade);
  }

  function turnosTexto(arr){
    if(!Array.isArray(arr) || !arr.length) return '—';
    const map = { MAT: 'Matutino', VES: 'Vespertino', NOT: 'Noturno' };
    return arr.map(t => map[t] || t).join(', ');
  }

  const STATUS_LABEL = { CE: 'Contrato Emergencial', PS: 'Processo Seletivo', EF: 'Efetivo' };
  const SEXO_LABEL   = { F: 'Feminino', M: 'Masculino', O: 'Outro' };

  function setLoading(btnId, isLoading){
    const btn = document.getElementById(btnId);
    if(!btn) return;
    if(isLoading){
      btn.classList.add('loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  /* ══════════════════════════════════════════
     EXPORTAÇÃO XLSX COM FORMATAÇÃO
  ══════════════════════════════════════════ */
  async function exportarXLSX(){

  if(!window.ExcelJS){
    alert('Biblioteca ExcelJS ainda não carregou.');
    return;
  }

  setLoading('btnExportXLSX', true);

  try {

    const dados = window.PesquisaFuncionarios.getFiltrados();
    const ano = window.PesquisaFuncionarios.getAnoAtivo();

    if(!dados || dados.length === 0){
      alert('Nenhum funcionário para exportar.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Funcionários');

    worksheet.columns = [
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'CPF', key: 'cpf', width: 18 },
      { header: 'RG/CNH', key: 'rg', width: 18 },
      { header: 'Nascimento', key: 'nasc', width: 15 },
      { header: 'Idade', key: 'idade', width: 10 },
      { header: 'Sexo', key: 'sexo', width: 12 },
      { header: 'Naturalidade', key: 'nat', width: 20 },
      { header: 'UF', key: 'uf', width: 8 },
      { header: 'Cor/Raça', key: 'cor', width: 15 },
      { header: 'Função', key: 'funcao', width: 25 },
      { header: 'C.H.', key: 'ch', width: 10 },
      { header: 'Turnos', key: 'turnos', width: 25 },
      { header: 'Vínculo', key: 'vinculo', width: 22 },
      { header: 'Ano', key: 'ano', width: 10 }
    ];

    dados.forEach(f => {

      worksheet.addRow({
        nome: f.nome || '—',
        cpf: f.cpf || '—',
        rg: f.rgCnh || '—',
        nasc: formatarDataBR(f.dataNascimento),
        idade: calcularIdade(f.dataNascimento),
        sexo: SEXO_LABEL[f.sexo] || f.sexo || '—',
        nat: f.naturalidade || '—',
        uf: f.naturalidadeUF || '—',
        cor: f.corRaca || '—',
        funcao: f.funcao || '—',
        ch: f.cargaHoraria || '—',
        turnos: turnosTexto(f.turnos),
        vinculo: STATUS_LABEL[f.status] || f.status || '—',
        ano: f.anoLetivo || '—'
      });

    });

    /* CABEÇALHO */

    worksheet.getRow(1).eachCell(cell => {

      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 12
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' }
      };

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };

      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

    });

    /* LINHAS */

    worksheet.eachRow((row, rowNumber) => {

      if(rowNumber === 1) return;

      row.eachCell(cell => {

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        cell.alignment = {
          vertical: 'middle',
          wrapText: true
        };

        if(rowNumber % 2 === 0){

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F2F2F2' }
          };

        }

      });

    });

    worksheet.views = [
      { state: 'frozen', ySplit: 1 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob(
      [buffer],
      {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    );

    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);

    link.download = ano
      ? `funcionarios_${ano}.xlsx`
      : `funcionarios.xlsx`;

    link.click();

  } catch(err){

    console.error(err);
    alert('Erro ao exportar XLSX.');

  } finally {

    setLoading('btnExportXLSX', false);

  }

}
  /* ══════════════════════════════════════════
     EXPORTAÇÃO DOCX - VERSÃO CORRIGIDA
  ══════════════════════════════════════════ */
  async function exportarDOCX(){
    if(!window.docx || !docxCarregado){
      alert('Biblioteca DOCX ainda não carregou. Aguarde alguns segundos e tente novamente.');
      return;
    }

    setLoading('btnExportDOCX', true);

    try {
      const dados = window.PesquisaFuncionarios.getFiltrados();
      const ano = window.PesquisaFuncionarios.getAnoAtivo();

      if(!dados || dados.length === 0){
        alert('Nenhum funcionário para exportar com os filtros atuais.');
        setLoading('btnExportDOCX', false);
        return;
      }

      // ═══════════════════════════════════════════════════════
      // IMPORTANTE: A biblioteca docx expõe tudo no objeto global window.docx
      // ═══════════════════════════════════════════════════════
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
              AlignmentType, WidthType, ShadingType, BorderStyle, HeadingLevel } = window.docx;

      // Configurar bordas
      const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
      const borders = { top: border, bottom: border, left: border, right: border };

      // Criar células do cabeçalho
      const headers = [
        'Nome', 'CPF', 'RG/CNH', 'Nasc.', 'Idade', 'Sexo', 
        'Naturalidade', 'Cor/Raça', 'Função', 'C.H.', 'Turnos', 'Vínculo'
      ];

      const headerRow = new TableRow({
        children: headers.map(h => new TableCell({
          borders,
          width: { size: 780, type: WidthType.DXA },
          shading: { fill: "4472C4", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF" })]
          })]
        }))
      });

      // Criar linhas de dados com cores alternadas
      const dataRows = dados.map((f, index) => {
        const nat = [f.naturalidade, f.naturalidadeUF].filter(Boolean).join('/') || '—';
        const cells = [
          f.nome || '—',
          f.cpf || '—',
          f.rgCnh || '—',
          formatarDataBR(f.dataNascimento),
          calcularIdade(f.dataNascimento),
          SEXO_LABEL[f.sexo] || f.sexo || '—',
          nat,
          f.corRaca || '—',
          f.funcao || '—',
          (f.cargaHoraria || '—') + '',
          turnosTexto(f.turnos),
          STATUS_LABEL[f.status] || f.status || '—'
        ];

        // Cores alternadas: linhas pares com fundo cinza claro
        const corFundo = index % 2 === 0 ? "F2F2F2" : "FFFFFF";

        return new TableRow({
          children: cells.map(texto => new TableCell({
            borders,
            width: { size: 780, type: WidthType.DXA },
            shading: { fill: corFundo, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({
              children: [new TextRun({ text: String(texto), size: 18 })]
            })]
          }))
        });
      });

      // Criar tabela
      const tabela = new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: headers.map(() => 780),
        rows: [headerRow, ...dataRows]
      });

      // Criar documento
      const titulo = ano 
        ? `Lista de Funcionários - Ano Letivo ${ano}`
        : `Lista de Funcionários`;

      const doc = new Document({
        styles: {
          default: { document: { run: { font: "Arial", size: 22 } } },
          paragraphStyles: [
            {
              id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
              run: { size: 32, bold: true, font: "Arial" },
              paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 }
            }
          ]
        },
        sections: [{
          properties: {
            page: {
              size: { width: 15840, height: 12240 }, // Paisagem Letter
              margin: { top: 720, right: 720, bottom: 720, left: 720 }
            }
          },
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              children: [new TextRun(titulo)]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: `Total: ${dados.length} funcionário(s)`,
                size: 20,
                italics: true
              })]
            }),
            new Paragraph({ text: "" }), // Espaço
            tabela
          ]
        }]
      });

      // Gerar e baixar
      const buffer = await Packer.toBlob(doc);
      const nomeArquivo = ano
        ? `funcionarios_${ano}_${dados.length}_registros.docx`
        : `funcionarios_${dados.length}_registros.docx`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(buffer);
      link.download = nomeArquivo;
      link.click();

      console.log(`✅ Exportação DOCX concluída: ${dados.length} funcionários`);

    } catch(erro){
      console.error('Erro na exportação DOCX:', erro);
      alert('Erro ao exportar DOCX. Verifique o console para detalhes.');
    } finally {
      setLoading('btnExportDOCX', false);
    }
  }

  /* ══════════════════════════════════════════
     Event Listeners
  ══════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function(){
    const btnXLSX = document.getElementById('btnExportXLSX');
    const btnDOCX = document.getElementById('btnExportDOCX');

    if(btnXLSX) btnXLSX.addEventListener('click', exportarXLSX);
    if(btnDOCX) btnDOCX.addEventListener('click', exportarDOCX);

    // Mostrar status de carregamento no console
    console.log('📦 Carregando bibliotecas de exportação...');
  });

})();
