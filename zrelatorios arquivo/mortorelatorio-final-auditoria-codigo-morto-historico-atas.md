# Relatório final — Auditoria de código morto · Módulo Histórico + Atas

| | |
|---|---|
| **Data** | 10/10/2026 |
| **Tipo** | Documentação para conferência futura (não é parte do sistema) |
| **Escopo** | 7 páginas editadas + 4 arquivos compartilhados (somente leitura) |
| **Resultado** | **609 linhas removidas** (11.137 → 10.528), nenhuma edição aumentou leituras do Firestore, 4 pontos reduzem leituras |
| **Princípio** | Só remover duplicações e código morto; não adicionar funcionalidade; não mudar comportamento (exceções listadas na seção 7) |

> **Numeração de linhas:** todas as linhas citadas neste relatório são as do arquivo **como foi recebido, antes da edição**. Use-as para localizar o trecho no histórico do git, não no arquivo atual.

---

## 1. Resumo

| Arquivo | Recebido | Entregue | Diferença |
|---|---:|---:|---:|
| `cadastro-atas.html` | 3100 | 2924 | −176 |
| `cadastro-turmas.html` | 1191 ¹ | 1153 | −38 |
| `gestao-atas.html` | 1516 | 1442 | −74 |
| `pesquisa-ata.html` | 1644 | 1556 | −88 |
| `schema_ata.html` | 947 | 939 | −8 |
| `schema_ch.html` | 940 | 851 | −89 |
| `historico_auto.html` | 1799 | 1663 | −136 |
| **Total** | **11.137** | **10.528** | **−609** |

¹ Versão reenviada pelo usuário após um ajuste feito em chat paralelo (a 1ª versão recebida tinha 1189 linhas). Detalhes na seção 6.2.

Todos os scripts inline dos 7 arquivos entregues passam em `node --check`. Em cada arquivo foi feita uma nova busca pelos nomes removidos (nenhuma referência órfã) e uma reauditoria de alcançabilidade (nenhuma função ou variável sem uso restante, exceto falsos positivos documentados na seção 12).

**Pontos mais relevantes**
- Removido o bloco de `localStorage` que `cadastro-atas` ainda carregava (133 linhas) e que contrariava a regra "nada de localStorage para dados".
- Removido o histórico local de exportações do `historico_auto` (também `localStorage`).
- Quatro reduções de leitura no Firestore (seção 8).
- A coleção `atas` não tem nenhum leitor em todo o módulo; o veredito final depende de uma busca no projeto inteiro (seção 11, item 1).
- Há uma divergência de séries (Eixo 4 e 5) a ser resolvida com a documentação oficial (seção 11, item 2).

---

## 2. Premissas e regras usadas

Premissas que embasaram as remoções. Se alguma deixar de valer, os itens ligados a ela devem ser revistos.

1. **O banco de testes será apagado.** Por isso foi removida a compatibilidade com formatos antigos de dado (colunas, regras de CH, turmas sem snapshot).
2. **Toda turma tem `schemaSnapshot`** e só é criada declarando o schema (a criação acontece em `cadastro-turmas`). Schemas sem colunas existem como exceção legítima e continuam funcionando.
3. **IDs de documento são determinísticos:** turma = `turmaId`; ata = `ATA|{turmaId}`; matrícula = `MAT|{turmaId}|{alunoId}`.
4. **Matrícula sem turma é inconsistência**, não fluxo normal. Ao apagar uma turma pelo sistema, as matrículas são apagadas juntas.
5. **`?edit=` na URL é do módulo Ano-Ativo**; nada do módulo de atas o usa (o módulo usa `?turma=`).
6. **Existe um único template DOCX** (o embutido em `historico_auto`); não há upload de template alternativo.
7. **Ensino Fundamental, 1º ao 9º ano**; Ensino Médio descontinuado.

Regras do usuário aplicadas: respostas em português; nenhum `localStorage` para dados (só preferência de tela e `sessionStorage` de toast pós-reload); tudo gratuito (sem Cloud Function/Blaze); entrega com o nome original do arquivo; **regra mor: nenhuma alteração pode tornar o sistema mais caro em leituras do Firestore**.

---

## 3. Escopo

**Editados (com aprovação item a item):** `cadastro-atas`, `cadastro-turmas`, `gestao-atas`, `pesquisa-ata`, `schema_ata`, `schema_ch`, `historico_auto`.

**Somente leitura (consultados para saber o que o módulo consome):** `db_firebase.js`, `identidade-aluno.js`, `auth.firebase.js`, `theme-colors.js`.

**Não enviados / não auditados**
- `admin_escolas.html` e `documentos.html` (listados no contexto original, mas não analisados).
- `loading-overlay.js` (só uma chamada e saída, já testado), `header-logic.js` (carregado por `fetch` em todas as páginas), `matricula-utils.js` (nenhuma referência a ele foi encontrada em nenhuma das 7 páginas).

**Fora do escopo:** módulo Ano-Ativo (`cadastro-aluno-ativo`, `pesquisa-ano-ativo`), usado só como referência de padrão.

---

## 4. Método

Fase 1: inventário e relatório sem editar. Fase 2: aprovação do usuário, item a item. Fase 3: remoção, um arquivo por vez.

**Ferramentas de análise (em cada página)**
- Análise de AST (acorn) dos scripts inline para listar toda declaração (função, `const/let/var`), inclusive nas funções aninhadas.
- **Alcançabilidade:** grafo "quem referencia quem", partindo de tudo que não está dentro de uma função nomeada (HTML, handlers inline, listeners, IIFE). Código só chamado por outro código morto aparece como "não alcançado". Comentários JS e HTML são removidos antes da busca.
- Conferência de ids (declarados × referenciados), de ids buscados que não existem, de classes CSS do `<style>` sem uso, de variáveis CSS declaradas e nunca usadas e de exports em `window.*`.
- Leitura manual do código restante, para o que a análise automática não pega (ramos sem efeito, `try/catch` que nunca dispara, comentários desatualizados).
- Validação por arquivo editado: `node --check` dos scripts, nova busca por nomes removidos, reauditoria, diff.

**Armadilhas verificadas antes de declarar algo "não usado":** chamada em template string e atributos inline (`onclick=` etc.); export em `window.*`; nome dinâmico (`'togSec'+...`); listeners de boot; função que o compartilhado oferece e outra página consome (nunca removida dali); leitura de campo antigo do Firestore; guardas `if(!el) return`.

---

## 5. Itens por categoria

- **Seguro:** zero referências vivas em qualquer arquivo do escopo.
- **Provável:** só referenciado por código morto, por compatibilidade, ou por texto. Dependeu de decisão do usuário.
- **Mantido:** parece morto mas é usado (ou é decisão consciente do usuário).

---

## 6. Detalhe por arquivo

### 6.1 `cadastro-atas.html` (3100 → 2924)

**Removido — seguro**

| Item | Linhas | Evidência |
|---|---|---|
| Bloco `const DB = (() => {…})()` local (`SESSION_KEY`, `ADMIN_ACTIVE_SCHOOL_KEY`, `SAFE_KEYS`, `safeParse`, `getSession`, `activeSchoolId`, `key`, `migrateIfNeeded`, `read`, `write`, `remove`, `FIRESTORE_MAP`, `writeFirestore`, `writeBoth`) | 404–535 | Nenhum `DB.read/write/remove/key/activeSchoolId` fora do bloco; todo uso de `DB` no resto da página era `window.DB.*`. Gravava em `localStorage`. |
| `lerTurmasDB()`, `_turmasCache`, `_invalidarCacheTurmas()` e a chamada dentro de `salvarTurmasDB` | 1250–1263, 1269 | Nunca chamadas / cache nunca lido (o código usa `TURMAS_CACHE_ATAS`). |
| CSS `.series-wrap`, `.series-linha` (+ `select`, `:focus`, dark), `.preview-serie` | 130–135 | 0 usos. |
| CSS `.info-tip-bubble.align-right` | 275 | 0 usos. |
| ids `btnDescartar`, `atas-scans-js` | — | Sem referência. |

**Removido — por decisão do usuário**

| Item | Linhas | Motivo |
|---|---|---|
| `else` com `console.warn` em `excluirAlunoEmEdicao` | 931–933 | `matriculas.remove` existe no `db_firebase.js`. |
| Fallback para turma sem `schemaSnapshot` (`: normalizeSchema(getDefaultConfig())`) | 1596 | Premissa 2. |
| Alias `?edit=ID` | 2635 | Premissa 5. |
| Bloco "Modo edição" no `DOMContentLoaded` do script de scans | 3081–3092 | Carregava a lista de scans uma 2ª vez (a 1ª vem de `selecionarTurmaPorId`). Reduz um `fetch` redundante. |
| Parâmetro `modoEdit` e ramo `if(!modoEdit)` em `initScans` | 2859–2870 | Sempre chamada com `true`. |
| Chamada `initScans("", false)` | 1586 | Era no-op (a função retornava na 1ª linha). |
| `style="display:none"` do `#btnContinuarScans` | 378 | Na prática o botão já aparecia sempre. |

**Alterado (comportamento)**
- **Busca de nome com mínimo de 3 letras** (`nome.length < 3`, aviso "Digite ao menos 3 letras do nome antes de buscar.") e tooltip (linha 625) ajustado. O limite é só da página; `Identidade.buscarAtasPorNome` não tem mínimo.
- **Mensagem do Scans:** "💡 Selecione ano e turma para habilitar o envio de scans." (2876); comentários "modo criação" atualizados.
- **Botão "Excluir aluno desta turma":** de `class="btn"` + `style="background:#991b1b…"` para `class="btn btn-danger"`. Assumido que `.btn-danger` (global, em `components.css`, que não foi enviado) é o vermelho sólido padrão. Conferir visualmente.
- **`.btn-secondary` (ex.: botão Scans):** texto e borda passaram a usar tokens de texto (`--brand-text`, `--brand-text-d`, `--brand-border-d`) em vez de `--brand`/`--brand-d` (tons de preenchimento sólido). Corrige texto ilegível no tema escuro com Azul e Verde (e, no claro, a paleta Tan). Afeta todos os `.btn-secondary` da página (Scans, Importar, Descartar, Buscar, PDF).
- Comentário da linha 2332 reescrito (citava a função removida).

**Mantido:** `getDefaultConfig()` (alimenta o formulário e o cabeçalho da tabela vazios via `getSchemaAtivoParaTela()`), `normalizeSchema`, exports `window.*` de scans (usados pelo script principal), `_toastGlobal` e `_importAtaModal` (ids criados dinamicamente), tooltip "Importar" (linha 368, o exemplar será anexado lá), aviso de trajetória para Multisseriada (salvaguarda), pdf.js/jsPDF/xlsx (usados), `#header-placeholder`, `.contraste-claro`.

### 6.2 `cadastro-turmas.html` (1191 → 1153)

**Observação sobre a versão recebida:** o usuário reenviou o arquivo depois de um ajuste em chat paralelo. O diff exato não foi possível (o arquivo anterior foi sobrescrito); o que se identificou:
- `registrarAnoNoIndice` passou a usar `idx.atualizadoEm` como marcador de "índice já criado" (antes `anos.length`), o que corrige o caso de índice reconstruído e vazio. Continua **1 leitura** (`ref.get()`).
- `serieOptions()` havia perdido **Eixo 4 e Eixo 5** (provável cópia antiga). **Foram restaurados** nesta auditoria, pois a `pesquisa-ata` tem até o Eixo 5.

**Removido — seguro**

| Item | Linhas | Evidência |
|---|---|---|
| `_toastLimpar()` (+ comentário) | 419–422 | Zero chamadas. O toast do "Limpar formulário" é `setMsg(…, "warn")` com `_confirmModal`; o fechamento automático é o `setTimeout` do `_showToast`. |
| CSS `.card-head`, `.sub/.muted`, `.grid2` (+ `@media`), `.field` e filhos, `.btn.secondary`, `.input.readonly` | 89, 92, 94/98, 115–132, 146–151, 128 | 0 usos. Onde o seletor era compartilhado, só o lado morto saiu (`.label`, `.input`, `.btn.ghost` ficam). |
| `<input id="turmaId" class="input readonly" style="display:none">` e a linha que escrevia nele | 323, 808 | Só escrito, nunca lido; o ID aparece em `#turmaIdBadge`. |

**Removido — por decisão do usuário**

| Item | Linhas | Motivo |
|---|---|---|
| Chip "DB: turmas=N" (`#dbInfo`), `updateDbInfo()` e 2 chamadas; linha dos botões com `justify-content:flex-end` | 337, 827, 1106, 1161 | A contagem já existe no card de turmas, que interage com os filtros. |
| `getDefaultConfig()` e fallbacks do `normalizeSchema` | 479–516 | Premissa 2. Defaults agora: `colunas: []`, `serieAtiva` e `resultadoAtivo` verdadeiros, `nome` vazio (o select cai para o `id`). O padrão embutido usava chaves antigas (`port, hist, cien, fis, arte, relig`). |

**Mantido:** `ensureFirstGetsA` / `id === base` / `turmaIdBaseFromFull` (a **primeira** turma de uma base nasce sem sufixo; vira `\|A` quando chega a segunda), `registrarAnoNoIndice`, `normalizeSerie`, `extractYear`, `dataset.loading` + `unhandledrejection`, `loadSchemas()` (só devolve `SCHEMAS_CACHE`, **não custa leitura**; a leitura é 1 vez no boot em `carregarSchemasCache()`), ramo "schema removido do sistema" em `mostrarSchemaDaTurma`, `sessionStorage` de `CHAVE_MSG_POS_RELOAD`, tooltips (não verificáveis os caminhos "Gestão de dados → …").

### 6.3 `gestao-atas.html` (1516 → 1442)

**Removido — seguro**

| Item | Linhas | Evidência |
|---|---|---|
| Array `metas` / `turmasMetaDB` (construção, `dbWrite`, `_mem`, campo no `return`) em `reconstruirAuxiliares` e `_reconstruirAuxLocalmente` | 497, 507–510, 523–524, 887, 896–899, 913–914 | `turmasMetaDB` não está no `map` do `dbWrite` (nunca ia ao Firestore), ninguém lia `dbRead('turmasMetaDB')` nem `aux.metas`. |
| `try { delete window.DB.turmas._cache; } catch(_){}` e comentários | 603–605 | No-op: o `_cache` do `db.firebase.js` é variável privada da closure. |
| Comentários que falavam com o chat | 1303, 1499–1500 | Texto desatualizado. |

**Removido — por decisão do usuário**

| Item | Linhas | Motivo |
|---|---|---|
| `_reconstruirAuxLocalmente()` inteira + chamada + `console.log "[apagar] Bancos reconstruídos…"` | 882–916, 1047–1050 | Só escrevia em chaves de memória que ninguém lia (`atasDB`, `matriculasDB`, `turmasMetaDB`). |
| Tentativas 2 e 3 de apagar turma (`remove` por `_id` e `turmas.removeWhere('turmaId')`) | ~988–1009 | Premissa 3. Um `delete` de documento inexistente não gera erro, então os fallbacks só rodariam numa falha real (em que também falhariam). A tentativa 3 fazia query. |
| `atas.removeWhere('turmaId', …)` | ~1019 | Redundante com `atas.remove(ataId)` logo acima. Depois do delete, a query ainda cobrava **≥1 leitura por turma apagada**. |
| `console.info('[gestao-atas] build 2026-09-30 …')` | 28 | Marcador de depuração parado numa data. |
| ids `lblJSON`, `fileJSON`, `btnAplicarMerge`, `btnExportJSON`, `btnExportCSV` | — | Sem referência (os botões usam `onclick=`). |

**Mantido:** `reconstruirAuxiliares` (grava `matriculas` no Firestore; necessário para `recalcularUltimoAnoRegistroBatch`), `matriculas.removeWhere('turmaId')` (**único** trecho que apaga as matrículas da turma), `_saveAllFull`, `dbWrite/dbRead/_mem/dbKey` (espelho em memória usado por `lerTurmasDB()`), `limparAlunosSemMatricula`, `_gcAviso`, `window.Identidade?.eloId ? … : 'ELO|'+id` (defensivo), ids `togSec*` (dinâmicos), `suspeitasIncluir`/`schemasConflitosIncluir` (falso positivo: spread).

**Contrato do índice confirmado:** "Reconstruir" grava `atasIndice: { anos, atualizadoEm }` (linha ~724).

### 6.4 `pesquisa-ata.html` (1644 → 1556)

**Removido — seguro**

| Item | Linhas | Evidência |
|---|---|---|
| `_confirmModal()` | 503–527 | Zero chamadas. |
| CSS `.modal-backdrop` | 267–272 | Só usada por `_confirmModal`. |
| `window.obterTurmas` e `window.nomeAtual` (+ comentário) | 593–598 | O script de pesquisa por aluno não usa; nenhuma outra página carrega este arquivo. |
| CSS `.btn.danger` (4 regras) e `:not(.danger):not(.ldanger)` dos 4 seletores `.btn:not(...)` | 79, 84, 89, 94, 133–137 | Nenhum elemento usa `danger`/`ldanger`. |
| `id="wrapExportAta"` | 383 | Sem referência. |

**Removido — por decisão do usuário**
- `getDefaultConfig()` e os fallbacks do `normalizeSchema`; `schemaDaTurmaSelecionada()` virou `normalizeSchema(turmaSelecionada?.schemaSnapshot)` (premissa 2).
- `try/catch` + `falhaTurmas` em `carregar()` (1429–1439 e mensagem da 1500): o único `await` era uma promise que só resolve, então o `catch` nunca rodava.

**Comentários corrigidos (aprovados):** 537–545 (dizia que `atas`/`matriculas` não eram coleções), 547–553 (cabeçalho "Catálogo de identidade", agora "Nome oficial (alunos-atas)"), 763 (agora "ano, turno e série viram query"), 602–603 e 943 (órfãos), 1028–1031 (histórico), 1162–1165 (dizia que o CSV estava desabilitado; não está), 1522 ("SCRIPT 5").

**Mantido:** `_toastLimpar` (aqui é usado, linha 1198), `pesquisarAluno`/`limparPesquisaAluno`/`abrirTurmaPorId` (handlers inline), `escapeHtml` do script de pesquisa por aluno (decisão: equivalente a `_escHtml`, mesmo resultado e custo), `.btn.secondary`, `.card-head`, `.field` (usados aqui), jsPDF + autotable, variáveis CSS `--chip-neutral-*`, `--danger`, `--field-*`, `--shadow` (não usadas no arquivo, mas podem vir de `/css/pesquisa.css` ou `components.css`, não enviados), `SERIES_FILTRO` com Eixo 1–5, mínimo de 3 letras na pesquisa por aluno.

### 6.5 `schema_ata.html` (947 → 939)

**Removido:** CSS `.muted` (142), `.ok` (158), `.aviso-warn a` + variantes dark (149–151) e `.aviso-warn .btn` (156) (os avisos só recebem `<b>`, nunca `<a>`/botão); comentário `// ← linha adicionada` (932); e, por decisão do usuário, `_toastCarregando()` e o ramo `loading` do `setMsg` (680, 688; nenhuma chamada passa `"loading"` nesta página).

**Mantido:** `getDefaultConfig()` (**não** é só fallback: `novoSchema()` cria o schema novo com as 9 matérias dele), fallbacks do `normalizeConfig` (página de edição; `salvarConfig` exige ≥1 matéria), `_confirmModal`/`_promptModal`/`_modalBase` (usados), as três funções de escape `escapeHtml`/`escapeAttr`/`_escHtml` (equivalentes, decisão de manter), `loadSchemas/saveSchema/removeSchema/uid`, `localStorage` `ui_theme_v1` (preferência de tela), `Auth.requireRole('admin')`.

**Contrato confirmado:** `CATALOGO_PADRAO` tem exatamente `lp, edf, art, mat, his, geo, cie, er, ing`.

### 6.6 `schema_ch.html` (940 → 851)

Página de outro módulo, auditada porque o `historico_auto` depende dela. **Ela não acessa `atas`, `turmas`, `matriculas` nem `atasSchemas`**: usa só `DB.schemas` (coleção `schemasCH`) e `Auth`. A ligação com o módulo é pelos **códigos** das disciplinas.

**Removido — seguro:** bloco CSS duplicado "Específico: Histórico Escolar" (135–190 + comentário órfão; cópia do bloco "Schema CH" logo abaixo, 53 de ~55 linhas idênticas); `.grid2`, o `@media` de `.cols`, `.item` e variantes, `.warn`, `.hidden`; `@media` de `#topFieldsRow` e comentários órfãos (o id não existe); ids `cardCHCadastro` e `cardCHAplicacao`.

**Removido — por decisão do usuário**

| Item | Linhas | Motivo |
|---|---|---|
| `DB.schemas.removeWhere('id', id)` após `remove(chDocId(regra))` | 767 | O `save` é upsert por `_id`; não existem cópias. Cada exclusão pagava uma query (**−1 leitura por exclusão**). |
| Compatibilidade com formato antigo de regra: `disciplina` + `ch` e `etapaTexto` → `series` em `chNormalizeRuleShape` | 557–559, 571–575 | Premissa 1. |
| Guardas `window.DB && DB.schemas` (3) e o `else { setMsg('Regra excluída.') }` | 610, 642, 762–773 | `db.firebase.js` é carregado na própria página. |

**Mantido:** `chDisciplinas()`/`DISC` (label sempre igual ao code; simplificação opcional, decisão de deixar), `anterior` (falso positivo: spread), `_toastCarregando` (aqui é usado), `_escHtml` e `esc` (equivalentes), `chCanonSerie`, `localStorage.removeItem('historicoCHSchemas_v1')` (limpa cópia antiga), variáveis CSS `--chip`, `--dest-panel-bg` (podem vir do `components.css`).

**Divergência registrada (não é código morto):** o select de séries tem Alfabetização, Eixo 1–3, 1ª–8ª série e 1º–9º ano — **sem Eixo 4, Eixo 5 e Multisseriada**. Ver seção 11, item 2.

### 6.7 `historico_auto.html` (1799 → 1663)

**Removido — seguro**

| Item | Linhas | Evidência |
|---|---|---|
| `_atualizarDbInfo()` e sua chamada | 549, 587 | No-op assumido pelo próprio comentário. |
| `atasDB` dentro de `state.db` | 440, 577 | Só inicializado e zerado; nunca lido. |
| `validarSemExportar()` | 1467–1477 | Zero chamadas, nenhum botão. |
| `recarregarDB()` | 1572–1586 | Zero chamadas. |
| `escHtml` do 2º script | 1610 | Zero chamadas. |
| Propriedades `etapaTexto`, `etapaRegex`, `_raw` do objeto de `readCHRulesRaw` | 1643–1648 | Definidas e nunca lidas. (A leitura do campo **cru** `r.etapaTexto`, na migração de regra antiga, foi mantida.) |
| ~20 classes CSS: `.container .top-actions .btn-gray .btn-edit .btn-serie .form-grid .actions .table-wrap .th-vertical .th-num .th-nome .col-nome .th-nota .col-nota .hrow .gray .out .mono .campo` e `.info-tip-bubble.align-right` | no `<style>` | Nenhum elemento, template ou `classList` as usa. |
| ids `cardDefinicoes`, `btnSchemaCH` | 371, 393 | Sem referência. |
| Textos: placeholder do campo Escola ("Se vazio usa dadosEscola/localStorage", **visível**, agora "Se vazio usa os dados da escola"); comentários 1596 e 1604 | 376, 1596, 1604 | Localstorage não é mais fonte de nada. |

**Removido — por decisão do usuário**

| Item | Linhas | Motivo |
|---|---|---|
| `DB.turmas.whereIn('turmaId', faltando)` em `carregarTurmasDoAluno` | 651–654 | Premissa 4: matrícula sem turma deve dar **erro direto**, não segunda busca. Agora lança erro e a tela mostra "Este aluno tem matrícula em turma inexistente (ids…). Verifique em Gestão de Atas." (**reduz leituras** no caso de órfã). |
| Apelidos antigos do `CODIGO_POR_CHAVE` (`port, cien, hist, arte, fis, relig, rel, efi`) e ramo "sem `schemaSnapshot`" de `lerNotasDaLinha` | 663–668, 687–689 | Premissas 1 e 2. Fica só `lp, mat, cie, his, geo, art, edf, er, ing`. |
| `patchTemplateZip()` e sua chamada | 1210–1220, 1518 | Desativado "temporariamente" havia muito tempo; só devolvia o zip. |
| Card "Histórico local de exportações (últimas 6)", `carregarHistoricoExport`, `salvarHistoricoExportItem`, `renderHistoricoExport`, o bloco de log dentro de `exportarDOCX` e o uso de `localStorage` `historicoAutoExports_v1` | 406–409, 1478–1500, 1553–1563, 1598 | Não necessário; era dado em `localStorage`. |
| Wrapper `<div class="cols">` do card Diagnóstico | 401, 410 | O card **"Diagnóstico e validação de exportação"** passou a ter a largura dos demais. Mantido o `id="cardDiagExport"` para o recolhimento futuro. |

**Comentário adicionado (decisão: deixar e anotar):** acima de `dpDeArmazenado` (749–761) registra que os apelidos `CPF, rg, nascimento, dtNascimento, naturalidade, uf, nomeMae, nomePai` podem ser nomes reais no `anoAtivoAlunos`, e que se deve conferir em `cadastro-aluno-ativo.html` antes de remover.

**Mantido (decisões):**
- `enrichAluno`: as buscas de CPF/RG/NIS/nascimento/etc. dentro dele devolvem sempre vazio hoje (o `alunosDB` só tem `{alunoId, nome}` e as matrículas só carregam `id, turmaId, ataId, alunoId, nomeRaw, serie, resultado, anoLetivo`). **Os dados do Ano-Ativo não passam por ele:** entram por `carregarPessoalDoAluno` → `Identidade.buscarElo` → `DB.anoAtivoAlunos.get(elo.anoAtivoId)` → `dpDeArmazenado` → `pessoal.dados`, que se sobrepõe ao `enrich`. Mesmo assim foi deixado como está (fluxo que cruza os dois módulos).
- **Patch de `buildPlaceholders` no 2º script** (1742–1767, `__chBuildPatched`): recalcula as CH que o `buildPlaceholders` principal já calcula (mesmo resolvedor, mesmo `sanitizeCH`); provavelmente redundante, mas é o único item que mexe no caminho do DOCX. Só removeria com teste de exportação.
- **Aliases de placeholder** (`_CHB`, `CHB`, `_CH_BASICA`, `_CH_TOTAL_BASICA`, `CHTOTAL`, `_CARGA_HORARIA_*`, `A{n}EFIN/EDFN/EFIC/EDFC/RELN/ERN/RELC/ERC`, `_EDF_*`/`_ER_*`): o DOCX embutido foi decodificado e usa só `_EFI_CH/_NC`, `_REL_CH/_NC`, `_CH_TOTAL`, `_CH_GERAL`, `_CH_COMPLEMENTAR` e os de `LP…ING`. Pelo contrato (placeholders alimentam DOCX, validações e diagnóstico) e por segurança, **foram mantidos**.
- `buildPlaceholders`, `ETAPA`, `RESULTADO`, `RESULTADO_TABELA`, `CERT_ANO_LETIVO_FINAL`, `DISC` com `['EFI','EDF']` e `['REL','ER']` (o template usa EFI/REL), soma de CH incluindo ER (aceito), `window.DISC` (sempre `undefined`, pois `const` não vira propriedade de `window`; cai na lista fixa), `_toastFecharCarregando`, `_infoModal` (ainda usado), PizZip/docxtemplater, `localStorage` de preferência (`ui_theme_v1`, `historicoCHModo_v1`, `historicoAutoExportOpts_v1`).

---

## 7. Mudanças com efeito visível ou comportamental (checklist de conferência)

Tudo o mais é código que deixou de existir. Estes itens merecem um olhar na primeira vez em tela:

| Onde | O que mudou | Como conferir |
|---|---|---|
| `cadastro-atas` | Busca de nome exige ≥3 letras | Digitar 1–2 letras e buscar: deve avisar, sem consultar o banco. |
| `cadastro-atas` | Botão "Excluir aluno desta turma" agora é `.btn.btn-danger` | Deve ficar com o vermelho do sistema (como o "Sim, encerrar"). Se não, o `components.css` precisa ser consultado. |
| `cadastro-atas` | `.btn-secondary` com cores de texto/borda por token | Botão Scans (e Importar, Descartar, Buscar, PDF) legível no escuro com Azul/Verde e no claro com Tan. |
| `cadastro-atas` | Mensagem do Scans sem turma | "Selecione ano e turma para habilitar o envio de scans." |
| `cadastro-turmas` | Chip "DB: turmas=N" removido | Linha de botões alinhada à direita. |
| `cadastro-turmas` | Eixo 4 e 5 restaurados | Aparecem no seletor de série. |
| `gestao-atas` | Exclusão de turma sem fallbacks | Apagar uma turma continua removendo turma, ata e matrículas. |
| `historico_auto` | Matrícula sem turma agora dá erro direto | Abrir aluno com matrícula órfã: mostra a mensagem de turma inexistente em vez de seguir em silêncio. |
| `historico_auto` | Card "Histórico local de exportações" removido; Diagnóstico com largura cheia | Visual da página. |
| `historico_auto` | Coluna do schema com chave antiga (ex.: `port`) | Passa a aparecer como "matéria fora do catálogo" em vez de virar LP (só afetaria schema legado). |
| `schema_ch` | Exclusão de regra sem `removeWhere` | Excluir uma regra e recarregar: ela não deve reaparecer. |

---

## 8. Impacto em leituras do Firestore

**Nenhuma alteração aumentou leituras.** Reduções:

| Onde | Antes | Depois |
|---|---|---|
| `gestao-atas`, apagar turma | `atas.removeWhere('turmaId')` após `atas.remove(ataId)`: **≥1 leitura por turma apagada** | Removido |
| `schema_ch`, excluir regra | `schemas.removeWhere('id')` após o `remove`: **≥1 leitura por exclusão** | Removido |
| `historico_auto`, aluno com matrícula de turma inexistente | `turmas.whereIn(...)` por turma órfã | Erro direto, sem consulta |
| `cadastro-atas`, busca por nome | Consultava com 1–2 letras | Exige ≥3 letras |

**Observações de custo existentes, não alteradas (informativo):**
- `gestao-atas`, `_atualizarStatAlunosAtas`: `DB['alunos-atas'].list()` só para contar identidades (coleção inteira; o cache do `db.firebase.js` ameniza).
- `gestao-atas`, `matriculas.removeWhere('turmaId')`: lê todas as matrículas da turma para apagá-las. Como o ID é determinístico, daria para apagar por IDs com `DB.batchWrite` com **zero leituras**; o risco é uma matrícula criada com outro formato de ID ficar órfã. Não aplicado.
- `pesquisa-ata`, `carregarNomesDaTurma`: 1 leitura em `alunos-atas` por aluno ainda não consultado ao abrir uma turma.
- `historico_auto`, regras de CH: `listRules()` seguido de `onSnapshot` (as regras são lidas duas vezes na abertura; com a persistência ligada em `auth.firebase.js` a 2ª tende a custar pouco).
- `db_firebase.js`, `DB.loadAll()`: inclui `atas.list()`; nenhuma página do módulo o chama (ver 11.1).

---

## 9. Contratos verificados

| Contrato | Situação |
|---|---|
| Schema padrão `atasSchemas/padrao`: `lp, edf, art, mat, his, geo, cie, er, ing` | **OK** (`schema_ata`, `CATALOGO_PADRAO`; `CODIGO_POR_CHAVE` do `historico_auto` agora só com esses códigos). |
| Séries (lista fixa) | **Divergente** entre páginas. Ver 11.2. O `.md` de contexto ("Eixo 1–3") está desatualizado. |
| Índice de anos `schools/{escola}.atasIndice.anos` | **OK.** `cadastro-turmas` acrescenta; `gestao-atas` reconstrói; `pesquisa-ata` lê (1 `DB.escola.get()`). **Novo campo de contrato:** `atasIndice.atualizadoEm` (usado por `cadastro-turmas` como marcador de "índice criado"; gravado pelo "Reconstruir" do `gestao-atas`). |
| Coleções `turmas`, `matriculas`, `alunos-atas`, `alunos` (elos), `anoAtivoAlunos` | **OK.** IDs determinísticos (premissa 3). A coleção `atas` não consta do contrato e não tem leitor (11.1). |
| `historico_auto`: `state.placeholders`/`buildPlaceholders()` | **Não alterados** (mantidos como contrato). |
| Ensino Religioso: carga horária opcional (código soma; texto do template diz que não entra) | Aceito pelo usuário; mantido. |

---

## 10. Consumo dos arquivos compartilhados

### 10.1 Por página (após as edições)

| Página | `Auth` | `window.DB` | `Identidade` | Outros |
|---|---|---|---|---|
| `cadastro-atas` | `requireRole`, `onReady` | `escola.get`, `turmas.list/save`, `atas.save`, `matriculas.saveAll/remove` | `recalcularUltimoAnoRegistroBatch`, `buscarAtasPorNome` | `ThemeColors.ajustarContraste`; pdf.js, jsPDF, xlsx |
| `cadastro-turmas` | `requireAuth`, `onReady`, `getSession`, `getActiveSchoolId`, `db` | `turmas.list/save`, `atasSchemas.list` | — | `ThemeColors.ajustarContraste`, `Loading.esconder` |
| `gestao-atas` | `getSession`, `getActiveSchoolId`, `db` (+ evento `auth:ready`) | `turmas.list/remove`, `atas.remove/saveAll`, `matriculas.removeWhere/whereIn/saveAll`, `alunos-atas.list`, `atasSchemas.list/save`, `escola.get`, `batchWrite` | `eloId`, `recalcularUltimoAnoRegistroBatch` | `ThemeColors.ajustarContraste` |
| `pesquisa-ata` | `getSession`, `getActiveSchoolId`, `db` (query direta em `turmas`) | `turmas.list/get`, `matriculas.whereIn`, `escola.get` | `buscarAtasPorId`, `buscarAtasPorNome` | `ThemeColors.ajustarContraste`; jsPDF + autotable |
| `schema_ata` | `requireRole`, `getSession` | `atasSchemas.list/save/remove` | — | `ThemeColors.ajustarContraste`, `Loading.esconder` |
| `schema_ch` | `requireRole`, `getSession` | `schemas.listRules/save/remove` (coleção `schemasCH`) | — | `ThemeColors.ajustarContraste`, `Loading.esconder` |
| `historico_auto` | `requireRole`, `getSession` | `escola.get`, `turmas.get`, `matriculas.whereIn`, `anoAtivoAlunos.get`, `schemas.listRules/onSnapshot` | `buscarAtasPorNome`, `buscarAtasPorId`, `buscarElo`, `salvarElo` | `ThemeColors.ajustarContraste`, `Loading.esconder`; PizZip, docxtemplater |

### 10.2 O que os compartilhados oferecem e o módulo **não** consome

Informativo apenas. Outros módulos (Ano-Ativo, administração, notas) podem usar; **nada disso é candidato a remoção** sem auditar o sistema todo.

- **`db_firebase.js`:** `loadAll`, `exportAll`, `migrate`, `schemas.cleanupDuplicates`, as coleções `anoAtivo*`, `funcionarios`, `notas*`, e (agora sem uso no módulo) `turmas.removeWhere`, `atas.removeWhere`, `turmas.whereIn`, `schemas.removeWhere`. O `removeWhere` continua em uso em `matriculas`.
- **`identidade-aluno.js`:** `criarAtas`, `criarAtasBatch`, `vincularAtasExplicito`, `salvarAtas`, `removerAtas`, `recalcularUltimoAnoRegistro` (versão unitária), `prepararElo`, `campoRemover`, `buscarElo*` (exceto `buscarElo`), `normalizarAtas`, `normalizarElo`, `CHAVE_ATAS`, `CHAVE_ELO`.
- **`theme-colors.js`:** `apply`, `get`, `palettes`, `calcularLuminancia` (o módulo só chama `ajustarContraste` e escuta `colorchange` via o próprio arquivo).
- **`auth.firebase.js`:** `createUser`, `deleteUser`, `listUsers`, `listPendingUsers`, `approveUser`, `loginEmail`, `loginGoogle`, `upsertSchool`, `deleteSchool`, `saveSchool`, `updateProfile`, `refreshSession`, `listSchools`, `logout`.

---

## 11. Pendências e decisões em aberto

1. **Coleção `atas` (maior pendência).** Nas 7 páginas auditadas e nos arquivos compartilhados, **ninguém lê `DB.atas`, `DB.loadAll()` nem `state.db.atasDB`.** Escrevem nela só `cadastro-atas` (`atas.save`) e `gestao-atas` (`reconstruirAuxiliares` → `atas.saveAll`, e `atas.remove`). O único leitor é o atalho `DB.loadAll()` do `db_firebase.js`, que nenhuma página auditada chama. Antes de decidir, rodar no repositório:
   ```
   git grep -nE "DB\.atas|loadAll\(|\.atas\.(list|get)|'atas'|\"atas\"" -- '*.html' '*.js'
   ```
   Se só aparecerem `cadastro-atas`, `gestao-atas` e o `db_firebase.js`, a coleção é só escrita (escritas e deletes pagos sem uso). O corte seria: tirar `atas.save` de `cadastro-atas`; a parte de `atas` do `reconstruirAuxiliares` e o `atas.remove` de `gestao-atas`; e tratar o `loadAll()` no `db_firebase.js` (arquivo de outro chat). O campo `ataId` das matrículas é só uma string de referência e também ficaria sem sentido.
2. **Eixos 4 e 5 (aguardando a documentação oficial).** O usuário precisa confirmar se Eixo 4 e 5 usam este modelo de histórico. Estado atual (deixado como está): **Eixo 1–5** em `cadastro-turmas` (restaurado) e `pesquisa-ata`; **Eixo 1–3** no select de séries do `schema_ch`, em `schema_ata` e no `SERIES_REAIS` do `cadastro-atas` (esta última aparece na trajetória de turma Multisseriada). Se a documentação disser que Eixo 4 e 5 **não** usam, o correto é retirá-los de `cadastro-turmas` e `pesquisa-ata`, não acrescentar nas outras. O contrato do `.md` ("Eixo 1–3") fica desatualizado em qualquer dos dois casos.
3. **Apelidos antigos em `dpDeArmazenado`** (`historico_auto`, 749–761): confirmar em `cadastro-aluno-ativo.html` quais nomes de campo o `anoAtivoAlunos` usa (`mae`/`pai` ou `nomeMae`/`nomePai`, `cpf` ou `CPF`, etc.). Comentário já deixado no código.
4. **Card "Diagnóstico e validação de exportação" recolhido por padrão**, expandido só por clique: funcionalidade nova a implementar quando o usuário enviar a página-modelo desse tipo de card.
5. **Resto causado pela remoção do histórico local** (`historico_auto`): `#schemaCHResumo` (escondido, `display:none !important`) agora só é escrito, nunca lido (quem lia era o log removido). Candidatos a sair: o elemento, `atualizarSchemaCHResumo()` e a escrita do 2º script. Não alterado.
6. **Compat de regra antiga ainda presente em `historico_auto`:** `readCHRulesRaw` lê `disciplina`/`ch` e `etapaTexto` de regras no formato antigo (o mesmo tipo de compat removido em `schema_ch`). Não estava na lista de decisões; mantido.
7. **`enrichAluno`**: simplificação possível para `{id, nome}` (efeito zero), mantida por prudência (seção 6.7).
8. **Patch de `buildPlaceholders`** e **aliases de placeholder** do `historico_auto`: manter até haver teste de exportação / certeza de que não haverá outro template.
9. **`matriculas.removeWhere` → `batchWrite` por IDs** (zero leituras): opcional, não aplicado.
10. **Não auditados:** `admin_escolas.html` e `documentos.html`. Sem o primeiro, ficam sem confirmação duas afirmações do `schema_ata`: que existe o botão "Schema padrão" e que o catálogo é duplicado de forma idêntica em `atasSchemaPadraoInicial`.
11. **Variáveis CSS que podem pertencer a CSS externos** (`--chip-neutral-*`, `--danger`, `--field-*`, `--shadow`, `--chip`, `--dest-panel-bg`): não removidas porque `/css/pesquisa.css` e `components.css` não foram enviados.
12. **Fora dos 7 arquivos:** `components.css` não foi lido. O botão "Excluir aluno" depende de `.btn-danger` existir ali.

---

## 12. Falsos positivos conhecidos (para auditorias futuras)

Coisas que parecem código morto e **não são**, ou que a análise automática acusou por engano:

- **Spread (`...nome`):** a busca por "nome não precedido de ponto" ignora `...x`, então variáveis usadas só em spread aparecem com 0 usos (`suspeitasIncluir`, `schemasConflitosIncluir` em `gestao-atas`; `anterior` em `schema_ch`).
- **Ids montados dinamicamente:** `'togSec' + …` em `gestao-atas` (`togSecJSON`, `togSecExport`, `togSecApagar`); `_toastGlobal` e `_importAtaModal` (criados via `el.id = …`).
- **Classes aplicadas por script externo:** `.contraste-claro` (aplicada por `ThemeColors.ajustarContraste()`).
- **Palavras que coincidem com classes:** `w3`/`org` (de `www.w3.org` dentro de um SVG em CSS), `ok` (do `kind === "ok"` do `setMsg`), `out` (variável JS).
- **Biblioteca minificada embutida:** o `historico_auto.html` contém o PizZip inteiro em uma linha enorme; buscas por palavras curtas (`_raw`, `escHtml`) acertam dentro dela. Filtrar por linhas curtas ao conferir.
- **`window.DISC`:** `const` no escopo global não vira propriedade de `window`; testes `Array.isArray(window.DISC)` sempre dão falso.
- **Funções "mortas" em IIFE:** nada vaza para `window`; handlers inline só enxergam o que está em `window`/escopo global.
- **Defensivos intencionais:** guardas `if (window.initScans)` e `typeof Auth.getSession === 'function'`; inofensivos.
- **Comentário que diz "fallback" mas é fluxo normal:** a primeira turma de uma base nasce sem sufixo (`turmaId = base`), por isso `ensureFirstGetsA` e `id === base` em `cadastro-turmas` não são compat legada.

---

## 13. Como conferir uma mudança depois

**Visão geral**
```
git log --oneline -- <caminho>/cadastro-atas.html   # localizar o commit da auditoria
git diff --stat <commit>^ <commit>                  # confere o total (~609 linhas removidas)
git diff <commit>^ <commit> -- <caminho>/<arquivo>  # revisa um arquivo
```

**Busca de ausência por arquivo.** Cada comando deve retornar **vazio** no arquivo entregue (se aparecer algo, a remoção foi revertida ou refeita):

| Arquivo | Expressão (use com `grep -nE`) |
|---|---|
| `cadastro-atas` | `_turmasCache\|lerTurmasDB\|_invalidarCacheTurmas\|SAFE_KEYS\|FIRESTORE_MAP\|writeBoth\|migrateIfNeeded\|series-wrap\|preview-serie\|btnDescartar\|atas-scans-js\|modoEdit` |
| `cadastro-turmas` | `_toastLimpar\|getDefaultConfig\|updateDbInfo\|dbInfo\|id="turmaId"\|\.card-head\|\.grid2\|\.btn\.secondary\|\.input\.readonly` |
| `gestao-atas` | `_reconstruirAuxLocalmente\|turmasMetaDB\|docIdSecundario\|turmas\.removeWhere\|atas\.removeWhere\|turmas\._cache\|console\.info\|btnExportJSON\|btnExportCSV` |
| `pesquisa-ata` | `_confirmModal\|modal-backdrop\|obterTurmas\|window\.nomeAtual\|getDefaultConfig\|falhaTurmas\|\.btn\.danger\|wrapExportAta` |
| `schema_ata` | `_toastCarregando\|kind === "loading"\|\.aviso-warn a\|\.aviso-warn \.btn` |
| `schema_ch` | `removeWhere\|etapaTexto\|oldDisc\|topFieldsRow\|Específico: Histórico\|cardCHCadastro\|cardCHAplicacao\|window\.DB && DB\.schemas` |
| `historico_auto` ² | `_atualizarDbInfo\|atasDB\|validarSemExportar\|recarregarDB\|HistoricoExport\|historicoAutoExports\|exportHistoryBox\|cardExportHist\|patchTemplateZip\|whereIn\('turmaId'\|btn-gray\|btn-edit\|btn-serie\|\.table-wrap` |

² No `historico_auto`, filtrar a linha gigante do PizZip (por exemplo `awk 'length($0)<400' arquivo \| grep -nE …`). A ocorrência de `etapaTexto` em `readCHRulesRaw` é legítima (leitura do campo cru; pendência 11.6).

**Para reverter um item:** localizar a linha original pela numeração desta documentação no commit anterior à auditoria e restaurar só o trecho. Itens com efeito em cascata, se restaurados: o bloco `DB` local de `cadastro-atas` (reintroduz `localStorage`), o histórico local do `historico_auto` (idem) e `getDefaultConfig` (reintroduz chaves antigas `port, hist, cien…` no `cadastro-turmas`).

---

## Apêndice — Decisões do usuário (resumo)

- Aprovados em bloco os itens "seguro apagar" de cada página.
- `cadastro-atas`: remover bloco `DB` local; remover duplicação da carga de scans; busca de nome com **mínimo de 3 letras** (campo e tooltip); manter tooltip "Importar"; atualizar a mensagem do Scans; ajustar botão Excluir e contraste do Scans.
- `cadastro-turmas`: remover chip "DB"; remover `getDefaultConfig`; manter `loadSchemas`; manter Eixo 1–5 (e restaurar 4 e 5).
- `gestao-atas`: remover `_reconstruirAuxLocalmente`; remover fallbacks de exclusão e `atas.removeWhere`; remover `console.info` e ids soltos.
- `pesquisa-ata`: remover `getDefaultConfig` e o `try/catch` morto; **manter** `escapeHtml` duplicado; corrigir os comentários.
- `schema_ata`: remover `_toastCarregando`.
- `schema_ch`: remover `removeWhere`, compat de formato antigo e guardas; **manter** `chDisciplinas`/`DISC`; deixar a divergência de Eixos como está até conferir a documentação.
- `historico_auto`: remover `whereIn` de turma órfã (erro direto), compat de colunas, `patchTemplateZip`, histórico local de exportações; Diagnóstico com largura cheia; **manter** `enrichAluno`, apelidos de `dpDeArmazenado` (com comentário), patch de `buildPlaceholders` e aliases de placeholder.
