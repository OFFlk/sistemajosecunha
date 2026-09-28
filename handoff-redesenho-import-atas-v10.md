# Handoff — Redesenho do módulo de Atas (v10 — consolidado)

> **Este documento junta seis rodadas**: as Partes 1 e 2 vêm direto do v6
> (Cloudinary/`atasSchemas`/auditoria da pendência 1, depois toasts +
> remoção de painel legado + identidade visual + PDF + `theme-colors.js`),
> a **Parte 3** vem do v7/v7_beta (auditoria de RBAC em
> `cadastro-turmas.html` e no hub `atas.html`, ajustes de UX em
> `gestao-atas.html`, e o redesenho de arquitetura completo em
> `historico-aluno.html`), e a **Parte 4** é do v8 (trava de "aluno em
> edição/formulário não salvo" em `cadastro-atas.html`, schema travado na
> edição de `cadastro-turmas.html` com hard refresh pós-save, e em
> `pesquisa-ata.html` — escape de HTML, aviso de catálogo de nomes falho,
> CSV export, correção da largura do cabeçalho "Resultado" no PDF; fechou
> também, por decisão/confirmação do usuário sem código, as pendências 1,
> 2, 4, 6(c) e 12) — Partes 1 a 4 reproduzidas sem alteração, são a fonte
> de verdade sobre esse trabalho. A **Parte 5** (v9) trouxe: bug do botão
> "Ver turma" corrigido em `historico-aluno.html` (card inline, sem
> navegação), primeira implementação real do ícone ⓘ de dica (mecanismo
> decidido: inline por página, texto inline no HTML, toque/clique em vez
> de hover), migração de `historico-aluno.html` pro cálculo de contraste
> centralizado em `theme-colors.js` (feita por um chat paralelo, auditada
> ali), e o guia `guia-migracao-contraste-theme-colors.md` pra replicar as
> duas coisas no resto do sistema — Parte 5 também reproduzida sem
> alteração. A **Parte 6 é nova**: rollout completo do guia no resto do
> módulo de atas — `gestao-atas.html` e `pesquisa-ata.html` migrados pro
> contraste central (mais um bug de tokens de balão corrigido em
> `pesquisa-ata.html` já em produção), `cadastro-turmas.html` migrado do
> zero (contraste + tooltip + card de destaque escolhido em layout lado a
> lado + redesenho do mini-card de turma + 3 bugs de contraste
> encontrados/corrigidos em produção), o guia ganhou uma **Parte 4 nova**
> (card de destaque com lista de sub-cards dentro) e as seções 1.6/1.7/1.8,
> e em `theme-colors.js` a paleta **Branco foi trocada por Tan** (primeira
> paleta genuinamente clara do sistema) com uma nova custom property
> **`--brand-fg`** centralizando o texto de contraste também pra botões
> sólidos de marca (não só o card de destaque) — o que abriu uma pendência
> nova, sistema-inteiro. Fechou, nesta rodada, a pendência 2 por completo
> (módulo de atas) e corrigiu de quebra um bug real em `perfil.html`
> (mapa de cores duplicado, sem a paleta nova).
>
> **Recomendação de sempre**: cole este handoff inteiro num chat novo antes
> de pedir qualquer coisa — é a única fonte de verdade sobre "o que já está
> implantado e testado" vs. "o que ainda falta". As **pendências
> consolidadas**, no fim, já reconciliam as seis partes. **Se a pendência
> for tooltip ⓘ, card de destaque ou centralização de contraste em
> `theme-colors.js`, peça também o arquivo
> `guia-migracao-contraste-theme-colors.md`** antes de começar — ele tem o
> passo a passo copiar-e-colar de tudo isso, incluindo os casos de card
> lado a lado e lista de sub-cards vistos em `cadastro-turmas.html`.

---

# PARTE 1 — Herdado da v5.1 (Cloudinary + `atasSchemas` + auditoria)

> Nada nesta parte foi tocado neste chat nem nos anteriores desde a v6.
> Reproduzido como veio, para não se perder na consolidação.

## ✅ Resolvido na rodada da v5.1

### Bug do scan órfão no Cloudinary — os dois caminhos, resolvidos

**Causa raiz confirmada** (lendo `atas-upload.js`/`atas-list.js`/
`atas-delete.js`, que são **Cloudflare Pages Functions**, não Cloud
Functions do Firebase): cada turma tem sua própria pasta no Cloudinary,
`atas/{turmaId_slug}` (slug feito por `slugTurma()`, duplicada em cada
arquivo). Não existe nenhum identificador de scan guardado no Firestore —
tudo é buscado ao vivo do Cloudinary via `/api/atas-list`.

**Caminho 1 — apagar a turma inteira** (`gestao-atas.html` →
`apagarSelecionadas()`): antes não tocava no Cloudinary de jeito nenhum.
Corrigido com:
- **Novo arquivo**: `functions/api/atas-delete-turma.js` — `DELETE
  /api/atas-delete-turma`, body `{ turmaId }`. Apaga todos os arquivos com
  prefixo `atas/{slug}` (Admin API, `delete_resources_by_prefix`) e depois
  a pasta em si. Trata "pasta não existe" (turma sem scan) como sucesso.
  Limite conhecido, não tratado: cobre só até 1000 recursos por chamada
  (`partial:true` se sobrar mais — não esperado no volume real de uso).
- **`gestao-atas.html`**: nova função `_apagarScansCloudinary(turmaId)`,
  chamada dentro do loop de `apagarSelecionadas()`, logo após a limpeza de
  atas/matrículas. **Best-effort, não bloqueante**: falha no Cloudinary não
  impede a exclusão da turma no Firestore — só gera aviso no log
  estruturado existente (`avisos[]` / `logEl`), sem virar toast.

**Caminho 2 — apagar 1 scan individual** (`cadastro-atas.html`, botão 🗑️ em
modo edição, via `atas-delete.js`): já apagava o arquivo certinho, mas
nunca verificava se sobrava pasta vazia. Corrigido **só no backend**, sem
tocar em `cadastro-atas.html`:
- **`atas-delete.js` atualizado**: depois de apagar o arquivo, deriva a
  pasta a partir do próprio `fileId` (o `public_id` do Cloudinary já vem
  com o caminho da pasta embutido, ex.:
  `atas/1994_SEM-TURNO_1_SERIE/nome_123` → pasta =
  `atas/1994_SEM-TURNO_1_SERIE`). Checa via Admin API se sobrou mais algum
  arquivo com esse prefixo; se não sobrou nada, apaga a pasta também.
  Best-effort: falha nessa checagem não desfaz a exclusão do arquivo (que
  já aconteceu antes).
- Não precisou de `turmaId` explícito pra isso — só o `fileId` que o
  cliente já manda hoje.

**Ainda faltando pra fechar de vez**:
- Deploy dos dois arquivos (`atas-delete-turma.js` novo, `atas-delete.js`
  atualizado).
- Teste real nos dois caminhos: apagar turma com scan e conferir Cloudinary
  (arquivo + pasta somem); apagar o último scan individual de uma turma e
  conferir que a pasta some também.

### Confirmado: merge de `atasSchemas` existe de verdade (com um alerta sério no meio)

**Episódio de regressão fantasma**: uma rodada anterior dava esse merge
como concluído (só faltando teste). Quando o arquivo foi pedido de novo, a
primeira versão reenviada **não tinha nada disso** — idêntica a uma
versão anterior, `versao:2`, sem `atasSchemas`. O usuário voltou no chat
que fez a mudança; ele disse "já te enviei". O usuário insistiu pra
reenviar mesmo assim, e **dessa vez sim veio com `versao:3` e toda a
lógica de `atasSchemas`** (export, merge com 3 casos, `aplicarMerge()`
salvando via `window.DB.atasSchemas.save(s)`).

**Conclusão**: a mudança existe e parece coerente — mas ela **nunca tinha
saído do ambiente interno daquele chat** até essa insistência. **Lição de
processo, não só nota de rodapé**: daqui pra frente, sempre pedir o
arquivo de volta e conferir de fato (grep pelo que deveria ter mudado)
antes de dar uma mudança como "salva", mesmo quando o chat afirma ter
enviado.

O arquivo entregue naquela rodada (`gestao-atas.html`) já é a versão
**consolidada**: `atasSchemas` + Cloudinary. Um único arquivo, os dois
juntos. **Este chat não tocou em `gestao-atas.html` — só leu, como
referência pro item de cor do card (ver Parte 2).**

**Ainda pendente**: testar os 3 casos do merge de schemas (novo, idêntico,
conflito — principalmente conflito no `padrao`, checkbox desmarcado por
padrão). Ninguém rodou esse teste ainda.

---

## 🔴 Auditoria da pendência 1 (`cadastro-atas.html`) — pior do que o esperado

Uma pendência antiga (a de tratar `cadastro-atas.html`) foi auditada e o
resultado é misto:

- ✅ **`alunoIdVinculado` pré-preenchido**: implementado e parece correto,
  tanto no cadastro manual quanto no import.
- ❌ **Trava do `padrao` no import**: **não existe**. Essa página nunca
  consulta o Firestore pra checar se `padrao` existe — o schema usado é
  sempre `turma.schemaSnapshot` (snapshot gravado em `cadastro-turmas.html`
  na criação da turma). Confirmado pelo próprio comentário no código:
  > "Nesta página o schema é SEMPRE o snapshot da turma escolhida... não
  > existe mais 'schema ativo global' aqui."
- ⚠️ **Achado, mais sério que a ausência de trava**: quando
  `turma.schemaSnapshot` é nulo/ausente, `getSchemaAtivoParaTela()` cai
  silenciosamente para `getDefaultConfig()` — um **schema embutido,
  hardcoded**, nome `"Padrão (arquivo original)"`, com 8 matérias fixas
  (`port`, `mat`, `hist`, `geo`, `cien`, `fis`, `arte`, `relig`). Isso é o
  mesmo tipo de cópia embutida que já se via em `cadastro-turmas.html` —
  só que aqui ela **é usada de verdade durante o import**, não é só uma
  referência morta. Se uma turma não tiver `schemaSnapshot` por qualquer
  motivo, o import mapeia as colunas contra esse schema fixo sem avisar
  nem bloquear nada — o oposto do que o modelo do schema padrão pede
  ("ninguém cria cópia própria do padrão fora de `admin_escolas.html`").

**Não corrigido ainda** — só auditado.

> **⚠️ Atualização deste chat (Parte 2)**: esse mesmíssimo par
> `getDefaultConfig()`/`normalizeSchema()` — os mesmos 8 campos, os mesmos
> defaults, o mesmo comportamento de cair pro fixo quando
> `schemaSnapshot` está ausente — foi **copiado de propósito** pra
> `pesquisa-ata.html` neste chat, pra resolver um bug diferente (schema
> fixo indo pra tela em vez do schema real da turma — ver Parte 2). Isso
> foi uma decisão consciente de manter consistência entre as páginas do
> módulo, mas tem uma consequência direta pra esta pendência: **se/quando
> a trava do `padrao` e a remoção do fallback embutido forem feitas em
> `cadastro-atas.html`, o mesmo precisa ser espelhado em
> `pesquisa-ata.html`**, ou as duas páginas voltam a divergir no mesmo
> jeito que já causou problema antes neste projeto.

---

## Achados fechados sem ação necessária (v5.1)

- **`atas-list.js` (`max_results=50` sem paginação)**: confirmado que não
  é problema real — volume de scans por turma é baixíssimo (1 a 4,
  raramente mais). Fechado.
- **`atas-delete.js` (`resourceType` recebido do cliente mas ignorado,
  sempre força `'image'`)**: confirmado intencional. Cloudinary corrompe
  arquivos importados com extensão que não seja de imagem (vira `.mor` ou
  similar, sem conseguir abrir/baixar certo). Por isso todo import é
  convertido pro formato imagem antes de subir. Comportamento correto, só
  documentando o motivo.

---

## Pendência (v5.1): limite de scans + reconstrução de PDF pro download

Existe, no **módulo de ano-ativo** (fora de escopo do módulo de atas, só
referência): limite de 12 scans por aluno, import de PDF convertido em
páginas PNG numeradas (`_p01`, `_p02`...), e no download um mecanismo que
reconstrói o PDF original a partir dessas páginas usando o identificador —
ao invés de baixar cada página solta.

**Conferido em `cadastro-atas.html`** (antes deste chat):
- Tem a conversão de PDF em páginas (`baseName_p01.jpg`, `_p02.jpg`...,
  via PDF.js, `MAX_PAGES=20` por arquivo) — isso sim está lá.
- Mas **não tem limite total de scans** por turma (import continua
  ilimitado).
- E **não tem reconstrução pro download** — o botão "👁️ Ver" só abre
  `webViewLink` (a imagem individual) numa aba nova. Não existe opção de
  baixar as páginas remontadas como um PDF único.

Ainda sem prioridade definida. **Este chat não mexeu nisso.**

---

## Arquivos entregues na rodada da v5.1

1. **`functions/api/atas-delete-turma.js`** — novo.
2. **`functions/api/atas-delete.js`** — atualizado (limpeza de pasta vazia
   após excluir o último scan).
3. **`gestao-atas.html`** — consolidado: `atasSchemas` + Cloudinary.

Nenhuma mudança em `cadastro-atas.html`, `cadastro-turmas.html`,
`schema_ata.html`, `admin_escolas.html`, `firestore.rules`,
`db.firebase.js` **naquela** rodada — só leitura/auditoria. (Este chat,
Parte 2, mexeu em três desses arquivos — ver abaixo.)

---

# PARTE 2 — Herdado do v6 (feito no chat da v6)

> Este chat ficou responsável por `cadastro-atas.html`,
> `cadastro-turmas.html`, `pesquisa-ata.html`, `schema_ata.html` (esta
> última acabou não sendo tocada — o outro chat a fechou sozinho, ver
> nota abaixo) e `theme-colors.js`. Não tocou em `gestao-atas.html`,
> `admin_escolas.html`, `firestore.rules`, `db.firebase.js` ou nas
> Cloudflare Functions — isso é tudo Parte 1.

## ✅ Toasts padronizados (`guia-toasts.md`) nas 3 páginas

Análise linha a linha + aplicação do padrão de toasts (`setMsg`,
`_toastSucesso/_toastErro/_toastAviso/_toastCarregando`, `_confirmModal`)
em `cadastro-atas.html`, `cadastro-turmas.html` e `pesquisa-ata.html`.
Testado com suíte automatizada (jsdom) a cada rodada, não só sintaxe —
mais de 50 casos cobrindo os três arquivos ao final. **Não testado no
navegador de verdade em nenhum dos três** — só a suíte automatizada.

Detalhes por arquivo:

### `cadastro-atas.html`
- Toast de "carregando" sem auto-dismiss (fica até virar sucesso/erro/
  aviso ou ser fechado no ✕) — decisão do usuário: o toast de salvamento
  "deve ficar o tempo que for necessário".
- **Bugs reais corrigidos** (iam além de só trocar `alert`/`console.warn`
  por toast):
  1. **Alunos ganhavam `alunoId` novo a cada re-salvamento.**
     `garantirIdsESistemaParaTurma()` tratava como "novo" todo aluno sem
     `alunoIdVinculado`, mesmo quem já tinha `alunoId` de um salvamento
     anterior — e a tela nunca recarregava esse ID de volta pro array
     local. Corrigido: quem já tem `alunoId` é mantido; editar um aluno
     salvo (Editar → Atualizar) também preserva o `alunoId`; depois de
     salvar, a lista da tela é reconstruída em memória com os IDs
     gerados, sem leitura extra no Firestore.
  2. **Scans vazavam de uma turma pra outra** ao trocar de turma sem
     salvar. Corrigido: troca de turma agora limpa a fila de scans e a
     lista da turma anterior; virou parte da trava de "dados não salvos"
     (ver abaixo).
  3. **`lerTurmasDB()` no import fazia uma leitura completa e paralela da
     coleção de turmas**, redundante com o cache que a página já mantém
     (`TURMAS_CACHE_ATAS`), e devolvia `[]` em silêncio se falhasse
     (trajetória de aluno saía toda 🟢 sem comparar nada de verdade).
     Corrigido: usa o cache existente; erro de leitura agora aparece.
  4. **Erros internos do `garantirIds` eram engolidos** (`catch` que só
     logava no console). Agora a função devolve `{ falhas: [...] }` e o
     toast final relata o que não deu certo, mesmo com a turma salva.
  5. **Import duplicava alunos** se rodado duas vezes, e não checava
     contra quem já estava na tabela manualmente. Corrigido: o botão de
     import trava depois do primeiro uso (destrava ao salvar ou ao clicar
     em **"↩️ Descartar alterações"**, botão novo); dedupe por nome
     normalizado tanto no import quanto no cadastro manual (este último
     pede confirmação, pro caso de homônimos de verdade).
- **Nova trava de "dados não salvos"** ao trocar de ano/turma: modal com
  3 saídas (Voltar / Descartar e continuar / Salvar e continuar).
  Considera "sujo" qualquer alteração não salva — aluno lançado/editado/
  importado, ou scan na fila.
- **Risco novo, encontrado mas não corrigido**: clicar em "Editar" tira o
  aluno da tabela até clicar em "Adicionar/Atualizar". Se o usuário clicar
  direto em "Salvar no banco" nesse meio-tempo, o aluno some da turma (a
  matrícula que já existia no banco não é apagada, só fica órfã da lista
  da turma). A trava de "dados não salvos" cobre trocar de turma nesse
  estado, mas **não cobre clicar em Salvar diretamente**. Perguntado ao
  usuário se queria uma trava pra esse caso — sem resposta ainda.
- **Não corrigido, por decisão do usuário**: nomes de aluno (vindos de
  planilha) entram sem escape em alguns `innerHTML` — usuário disse "não
  precisa".
- **Ponto cego**: `identidade-aluno.js` (chamado por `garantirIds` via
  `vincularAtasExplicito`/`criarAtasBatch`/
  `recalcularUltimoAnoRegistroBatch`) nunca foi lido neste chat. Os bugs
  de duplicidade foram atacados do lado de `cadastro-atas.html`, mas o
  comportamento real desse arquivo externo é uma suposição, não uma
  conferência.

### `cadastro-turmas.html`
- Mesmo padrão de toast; adicionados os casos `warn`/`loading` que a
  página não tinha (só tinha `err`/`ok`).
- **Bug real corrigido**: `carregarTurmasCache()` e
  `carregarSchemasCache()` só logavam erro no console e zeravam a lista em
  silêncio. Efeito colateral: se a leitura de schemas falhasse por rede, a
  tela mostrava "Esta escola ainda não tem o schema padrão" — mensagem
  enganosa, já que na verdade a leitura falhou. Agora distingue "erro ao
  carregar" de "carregou certinho e está vazio".
- **Bug real corrigido**: salvar com sucesso mas a releitura da lista
  falhar depois disso mostrava "Turma salva!" incondicional, escondendo o
  problema. Agora avisa que salvou mas não conseguiu atualizar a lista.
- **Tela de loading de página inteira, adicionada** (`loading-overlay.js`
  + `Loading.esconder()` no `finally` do boot) — **esta página não tinha
  isso antes**, ao contrário de `cadastro-atas.html`. Feito por analogia
  com o padrão de lá, **sem ter o código-fonte de `loading-overlay.js` em
  mãos** — a integração (tag `<script>` + chamada `.esconder()`) é
  estruturalmente idêntica à de `cadastro-atas.html` e passou no teste
  automatizado (a tela libera mesmo se o boot quebrar no meio, graças ao
  `try/finally` novo), mas **a renderização visual nunca foi confirmada
  pelo usuário depois do deploy**.
- "Limpar formulário" ganhou um toast de aviso (antes limpava em
  silêncio) — aditivo, fácil de reverter se não for desejado.

### `pesquisa-ata.html`
Página que teve mais mudança de todas nesta parte — não tinha nenhum
toast (só `alert()` nativo), teve um painel inteiro removido, ganhou
identidade visual nova, e o export em PDF foi refeito quase do zero.

- **Toasts do zero**: bloco padrão + todos os 6 `alert()` trocados por
  `setMsg(..., "err")`. Boot passou a distinguir "erro ao carregar
  turmas" de "não tem turma nenhuma" (antes, um erro de rede virava
  silenciosamente "0 turmas").
- **Painel "Inserir notas" removido por completo** (HTML, CSS e um script
  inteiro): funcionalidade legada, usada só pelas atas antigas geradas
  pelo módulo de Ano Ativo, hoje sem uso porque a edição de notas passou a
  viver em `cadastro-atas.html`. Saiu: botão "✏️ Inserir notas", o painel
  `#painelNotas`, a detecção de `isAnoAtivo`/badge "Gerada pelo Ano
  Ativo", e as funções `abrirPainelNotas`, `renderTabelaEdit`,
  `_salvarTurmaNoFirestore`, `salvarNotas`. Isso também resolveu, por
  eliminação, duas preocupações de arquitetura que tinham sido levantadas
  sobre essa mesma função (escrita direta no Firestore sem `merge:true`;
  edição não passava por `DB.atas`/`DB.matriculas`) — não são mais
  relevantes porque a função não existe mais.
- **Bug real corrigido — schema fixo na tabela e no PDF**: a tabela de
  alunos (e o export em PDF) tinham **9 colunas de matéria fixas no
  HTML/JS** (`a.port`, `a.mat`, `a.hist`...), que por coincidência batem
  com o schema padrão legado — então turmas com um `schemaSnapshot`
  diferente mostravam colunas vazias e nunca exibiam as matérias reais da
  turma. Corrigido lendo `turmaSelecionada.schemaSnapshot` de verdade,
  com os mesmos helpers de `cadastro-atas.html`
  (`getDefaultConfig`/`normalizeSchema`/`getColunasAtivas`, copiados pra
  manter os dois arquivos consistentes — **ver o alerta na Parte 1 sobre
  a pendência 1**: esse mesmo fallback embutido, se for removido de
  `cadastro-atas.html`, precisa ser removido aqui também). A correção foi
  além das matérias: `schema.serieAtiva`/`schema.resultadoAtivo` também
  passaram a ser respeitados (a coluna Série ou Resultado some se o
  schema da turma não usar).
- **Bug real corrigido — cabeçalho da tabela em tela mostrava o nome
  completo da matéria (`label`), não o ID (`key`)**, estourando a largura
  da tabela quando o nome era longo. Corrigido só na tela por enquanto — o
  PDF tinha sido propositalmente deixado com `label` numa primeira rodada
  (documento pra impressão/arquivo, achei que ID cru degradaria a
  qualidade), mas depois, a pedido do usuário, **o PDF também passou a
  usar `key`** (ver abaixo).
- **Checkbox "Exibir atas inativas" removido** — funcionalidade legada
  sem uso. Saiu do HTML e do JS (`recomputarTurmasBase()`,
  `onchange` do boot). O filtro que já era o *padrão* (só turmas com
  `status !== "INATIVA"`) foi mantido — só a opção de alternar pra ver as
  inativas foi embora.
- **Identidade visual — item 2 aplicado** (card na cor do usuário): o
  card "Filtros" virou `card-destaque`, replicando o mecanismo que o
  usuário já tinha construído em `gestao-atas.html` — variáveis
  `--btn-home-bg`/`--dest-fg`/`--dest-btn-*`, decisão de contraste
  (WCAG, luminância real da cor computada) via `ajustarContrasteDestaque()`,
  reagindo ao evento `colorchange` que `theme-colors.js` dispara.
  Estendido pra cobrir texto direto sobre o fundo colorido que
  `gestao-atas.html` não tinha (`.section-title`, `label`, `.muted`,
  checkbox) — extrapolação deste chat, não veio de nenhum lugar pronto.
- **Bug de tema escuro corrigido — botão "Pesquisar" ficava invisível**:
  causa raiz era um empate de especificidade CSS
  (`html[data-theme="dark"] .btn.primary`, que já existia no sistema,
  tinha mais peso que `.card-destaque .btn`). Corrigido reforçando com a
  mesma especificidade, posicionado depois no arquivo (desempate por
  ordem).
- **Bug de tema escuro NÃO corrigido nesta página — resolvido na raiz,
  em `theme-colors.js`** (ver seção própria abaixo): o card ficava mais
  claro/pastel no escuro. A causa não estava em nenhum CSS desta página.
- **Export virou dropdown** ("Exportar ▾"): PDF (funcional) + CSV
  (**existe só como botão desabilitado no HTML, sem nenhum script** — a
  pedido explícito do usuário, que quer analisar o schema antes de decidir
  o formato de coluna do CSV).
- **PDF de atas — reescrito quase por completo**, em duas rodadas, a
  partir de feedback visual do usuário (prints de tela):
  1. **Orientação**: retrato → paisagem (`{orientation:"l", unit:"pt",
     format:"a4"}`).
  2. **Larguras de coluna**: antes, todas as colunas tentavam ficar do
     mesmo tamanho. Agora: Nº fixo e estreito, Nome **flexível** (absorve
     o espaço que sobra — a soma de todas as colunas sempre bate
     exatamente com a margem, testado até com 12 colunas de matéria),
     Série e Resultado calculados pelo texto real via `doc.getTextWidth()`
     (Resultado com só ~2pt de respiro de cada lado, como pedido). As
     colunas de matéria continuam em largura fixa (44pt nota / 80pt
     texto) **de propósito** — o usuário pediu pra não mexer nelas ainda,
     pra avaliar como ficam com o ID (`key`) antes de decidir se precisam
     encolher mais.
  3. **Identificação da escola não aparecia** (saía sempre o texto de
     exemplo "Nome da Escola"/"Endereço da Escola"): causa raiz era
     `carregarDadosEscola()` chamando `window.DB.escola.list()` — método
     que **não existe**, já que `DB.escola` é uma API de documento único
     (`.get()`/`.save()`, confirmado contra as outras páginas do módulo).
     A checagem `typeof .list === "function"` sempre dava falso e a
     função caía direto no texto de exemplo, sem nunca tentar ler o
     Firestore de verdade. Trocado pra `.get()`; aproveitado pra também
     ler cidade/UF/INEP/e-mail/telefone se existirem no documento.
  4. **Design**: adotado o mesmo layout institucional de
     `pesquisa-ano-ativo.html` (logo + nome em azul/negrito + linha de
     contato + separador, cabeçalho de tabela azul com texto branco,
     linhas zebradas). Cor institucional fixa (`rgb(11,63,191)`), não
     ligada à cor que o usuário escolhe em `perfil.html` — o PDF não tem
     como puxar variável CSS de dentro do jsPDF.
  5. **Nome do arquivo** vinha de `turmaSelecionada.aba`, que em turmas
     **criadas manualmente** (não importadas de planilha) guarda a
     *origem* do cadastro (`"MANUAL"`), não um nome — resultando em
     `ata_MANUAL.pdf` pra qualquer turma manual. Corrigido pra montar o
     nome a partir de série + ano + turno (ex.:
     `ATA_5º_ano_2025_MATUTINO.pdf`), com `aba` como último recurso se
     esses três campos estiverem vazios.
  - **Confirmado funcionando pelo usuário** após as duas rodadas de
    ajuste ("agora sim, perfeito!").

## ✅ `theme-colors.js` — cor pastel no tema escuro corrigida

O usuário reportou que, ao trocar pro tema escuro, todas as cores do
sistema (não só desta página) ficavam visivelmente mais claras/pastel —
por exemplo, um azul forte no claro virava um azul-lilás claro no escuro.

**Causa raiz, não era fórmula nenhuma**: `--brand-d` (variante de cada
paleta pro tema escuro) é um **segundo hexadecimal escrito à mão**, por
paleta, dentro do objeto `palettes` — não existe nenhum cálculo de
HSL/`lighten`/`color-mix` em tempo real. Em 11 das 12 paletas, o valor do
tema escuro era deliberadamente mais claro que o do tema claro (ex.: Azul
`navy`: `--brand: '#120a8f'` vs `--brand-d: '#4f52e8'`).

O usuário decidiu que essa diferenciação não é necessária — a cor do tema
claro já contrasta bem o suficiente contra um fundo escuro. **Corrigido**:
`--brand-d` = mesmo valor de `--brand`, `--brand-hover-d` = mesmo valor de
`--brand-hover`, nas 12 paletas. Testado (Node, sem navegador): as 12
paletas confirmam a igualdade, e `apply()`/evento `colorchange` continuam
funcionando.

**Deixado de propósito, por decisão explícita do usuário** ("não precisa
do [unificar]"): `--brand-faded-d`, `--brand-border-d` e `--brand-text-d`
não foram tocados. São mecanismos diferentes (overlay translúcido via
`rgba()`, e cor de texto que precisa ficar clara sobre fundo escuro pra
não ficar ilegível) — não é o mesmo problema do botão/card sólido ficando
pastel. **Isso é uma decisão fechada, não uma pendência.**

> **Nota pra não confundir com a pendência "centralizar cálculo de
> contraste no `theme-colors.js`"** (ver pendências consolidadas, item
> 5): são coisas diferentes. O que foi corrigido aqui foram os **valores**
> de `--brand-d`/`--brand-hover-d`. A pendência antiga é sobre
> **centralizar a lógica de decidir texto claro/escuro** (a fórmula WCAG
> que hoje está duplicada em `ajustarContrasteDestaque()`, presente em
> `gestao-atas.html` e agora também em `pesquisa-ata.html`) dentro do
> próprio `theme-colors.js`, em vez de cada página reimplementar a mesma
> conta. Essa pendência **continua aberta**, sem relação com o fix feito
> aqui.

## Discussão de identidade visual (sem código, registrado pra continuidade)

Três ideias foram discutidas antes de qualquer implementação:

1. **Ícone 🛈 com tooltip** pra reduzir a quantidade de texto de descrição
   inline nas páginas. **Só ideia, nada implementado em lugar nenhum.**
   Pontos ainda em aberto antes de qualquer página adotar isso: tooltip de
   verdade (hover, sem timer) em vez de toast (que compete com os toasts
   de ação); comportamento em mobile (sem hover — tap pra abrir/fechar?);
   onde os textos moram (inline no HTML vs. objeto JS central por
   página); e um levantamento, página por página, de quais campos
   precisam do ícone — a pedido do usuário, isso deveria ser levantado e
   aprovado antes de qualquer implementação, não decidido campo por campo
   durante o código.
2. **Card na cor do usuário** — já era o que o usuário tinha implementado
   em `gestao-atas.html`; replicado em `pesquisa-ata.html` (ver acima).
3. **Export em CSV com uma célula por coluna** (não tudo numa célula só
   separado por vírgula, como `gestao-atas.html` faz hoje) — comparado
   contra `pesquisa-ano-ativo.html`, que já faz isso certo. **Achado
   concreto da comparação**: a diferença não é conceitual, é o
   **separador**. `gestao-atas.html` usa `,` (vírgula); no padrão
   regional pt-BR, o Excel reserva a vírgula pra separador decimal e
   espera `;` (ponto-e-vírgula) pra separar colunas de um CSV — por isso
   o CSV de `gestao-atas.html` não vira colunas de verdade quando aberto
   no Excel em pt-BR, só uma célula de texto corrido por linha.
   `pesquisa-ano-ativo.html` já usa `;` + `\r\n` + BOM UTF-8 + campos
   entre aspas, e funciona certo. **Nada disso foi implementado ainda** —
   o botão "📊 Exportar CSV" existe no dropdown de `pesquisa-ata.html`,
   desabilitado, sem nenhum script, aguardando o usuário definir as
   colunas depois de analisar o schema.

## Nota de escopo/propriedade dos arquivos (pra não repetir o problema da v3)

Neste chat, `admin_escolas.html`/criação de escola (incluindo a criação do
`padrao` junto da escola), `schema_ata.html`, `firestore.rules` e
`db.firebase.js` ficaram **fora** — outro chat cuidou desses. Segundo o
que foi relatado por esse outro chat (não conferido por aqui, mesmo
cuidado que a v5.1 já recomendava): o modelo de schema padrão mudou de
"campo `atasSchemaAtivoId` no doc da escola" pra "doc fixo
`atasSchemas/padrao`"; `cadastro-turmas.html` (**antes das mudanças de
toast feitas aqui**) teria sido ajustado pra não gravar mais esse campo e
pra achar o padrão pela lista já carregada; `schema_ata.html` teria
passado a criar o `padrao` se não existir. **Isso não foi visto nem
auditado neste chat** — as mudanças que fiz em `cadastro-turmas.html`
foram só de toast/tela de loading, sem tocar na lógica de schema. Vale
conferir se esse relato bate com o arquivo real antes de dar como certo,
seguindo a mesma lição de processo que a v5.1 registrou sobre o merge de
`atasSchemas`.

---

# PARTE 3 — Feito neste chat

## ✅ Auditoria de RBAC: `cadastro-turmas.html` + hub `atas.html`

- **`cadastro-turmas.html`** não tinha nenhuma trava de role — `Auth.requireAuth()` deixava passar qualquer usuário logado, inclusive `user` comum (só travava depois, na hora de salvar, via erro do Firestore). Corrigido: bloco extra depois do `requireAuth()` que redireciona `role==='user'` pro hub (`atas.html`), liberando `admin`+`gestor`. `requireRole()` do `auth.firebase.js` não suporta múltiplos roles (só `_session.role !== role`, comparação única), por isso o check é feito na mão.
- **Hub `atas.html`**: dois problemas achados e corrigidos juntos —
  1. O card real de "cadastro de turmas" **não tinha nenhuma trava** (nem visual nem de fato) — únicos dois cards travados eram "Cadastro de atas" e "Gestão de dados", e mesmo esses só liberavam `admin`, **excluindo gestor** — inconsistente com o resto do sistema, já que gestor tem acesso confirmado às 4 páginas do módulo.
  2. **Corrida de 1–1.5s**: os cards ficavam clicáveis (sem trava visual) até o evento `auth:ready` disparar, porque a checagem de role só rodava dentro desse listener. Corrigido usando `Auth.getSession()` — que é **síncrono** (usa cache do `localStorage` antes do Firebase confirmar) — pra rodar a checagem imediatamente, com o HTML já vindo travado (`class="card disabled"`, sem `href` real, só `data-href`) por padrão, e uma segunda rodada de checagem no `auth:ready` pra reconciliar (cache desatualizado, sessão revogada, primeiro login no navegador). Resultado: os 3 cards restritos (`cadastro-atas.html`, `cadastro-turmas.html`, `gestao-atas.html`) agora liberam **admin+gestor**, bloqueando só `user`/pending/sem sessão, sem nenhuma janela clicável.
  - `hub.css` foi auditado: a classe `.disabled` já usada no projeto **não** usa `pointer-events:none` (só opacidade/grayscale/cursor), então é compatível com o hover do tooltip — não precisou de nenhuma mudança nesse arquivo.

## ✅ Pendência 13 fechada: loading em `cadastro-turmas.html` confirmado correto

A pendência 13 do v6 registrava que a tela de loading em `cadastro-turmas.html` tinha sido adicionada pelo chat paralelo "por analogia", sem o código-fonte de `loading-overlay.js` em mãos, e nunca confirmada visualmente. Nesta rodada, com o `loading-overlay.js` real em mãos (usado corretamente em `gestao-atas.html` e `historico-aluno.html`, ver abaixo), audité a implementação existente em `cadastro-turmas.html`: `<script src="../loading-overlay.js">` no `<head>` (overlay aparece sozinho ao carregar) + `Loading.esconder()` no `finally` do boot. **Bate certinho com a API real.** Pendência fechada — só falta a confirmação visual de sempre (abrir a página e ver), mas não há mais risco de bug de integração.

## ✅ `gestao-atas.html` — UX da área de apagar

Três ajustes na seção "Apagar turmas":
1. `confirm()` nativo do navegador → `_confirmModal()` (helper que já existia no próprio arquivo, só não estava sendo usado ali).
2. Log de delete, que ficava fixo e sempre visível no final do card → painel flutuante fechável (`#logApagarWrap`, canto inferior direito, botão ✖). `logEl()`/`clearLogEl()` foram generalizadas de forma retrocompatível (só ganham esse comportamento quando existe um elemento `{id}Wrap`; `logJSON` do merge de schemas não é afetado).
3. Tela de loading adicionada (`loading-overlay.js` + `Loading.esconder()` no fim de `inicializar()`, depois de `atualizarStats()`/`renderTabelaTurmas()` já terem rodado, pra não expor o placeholder "Carregando..." por baixo do overlay que some).

## 🔴 Redesenho de arquitetura: `historico-aluno.html`

Esta página **nunca fez parte do escopo da remodelagem do módulo de atas** — por isso ainda operava 100% no modelo antigo, e acabou sendo o único lugar do módulo onde o problema original (leituras excessivas no Firestore) ainda existia de verdade.

### Bugs encontrados e corrigidos (antes do redesenho)

- **Loading infinito**: `construirIndex()` e os listeners que vinham depois não tinham nenhum `try/catch` — só a etapa de pré-carga do Firestore tinha proteção. Qualquer erro dali em diante deixava a tela de loading presa pra sempre, sem nunca mostrar o motivo. Corrigido com `try/catch/finally` envolvendo o boot inteiro (`Loading.esconder()` sempre no `finally`), mesmo padrão já usado em `cadastro-turmas.html`.
- **Crash `TypeError: window.Identidade.lerTodos is not a function`**: o `try/catch` acima revelou esse erro, que antes ficava mascarado pelo loading infinito. Causa: `identidade-aluno.js` foi redesenhado pra v2 ("SEM CATÁLOGO EM MEMÓRIA... cada operação é uma leitura pontual") e **`lerTodos()` não existe mais, por decisão de arquitetura** — não é uma função que sumiu por acidente. O código de `historico-aluno.html` fazia `window.Identidade ? window.Identidade.lerTodos() : lerAlunosDB()`, que checava só se `window.Identidade` existia (existe!), não se `.lerTodos` existia como função — por isso caía direto no erro em vez de usar o fallback. Esse guard quebrado foi corrigido como um curativo inicial, mas o problema de fundo (a página inteira ainda depender do modelo v1) só foi resolvido de verdade pelo redesenho abaixo.

### Achado relacionado: causa raiz da pendência 16 do v6 (`pesquisa-ata.html`)

`carregarCatalogoNomes()` em `pesquisa-ata.html` **também** chama `window.Identidade.lerTodos` — só que lá o guard já é `typeof === "function"` (correto), então em vez de quebrar a página, falha em silêncio: `_mapaNomes` fica sempre vazio, e o nome "oficial" do aluno nunca é resolvido, caindo sempre no nome cru importado da planilha. É exatamente a pendência 16, cuja causa raiz agora está identificada — mas **não foi corrigida** (fora do escopo desta rodada, que foi sobre `historico-aluno.html`). Fica registrada com a causa raiz documentada, não mais como "falha desconhecida".

### O problema de leituras (motivo do redesenho)

O boot de `historico-aluno.html` chamava `window.DB.loadAll()`, que dispara **4 leituras completas de coleção em paralelo, sem filtro**: `turmas.list()`, `alunos-atas.list()`, `matriculas.list()`, `atas.list()`. Dessas quatro:
- `turmas.list()` e `alunos-atas.list()` eram efetivamente usadas (viravam `turmasDB`/`alunosDB` em `localStorage`, base do índice local).
- **`matriculas.list()` e `atas.list()` eram lidas e nunca usadas** — a linha que deveria aproveitar `matriculas` checava o nome de campo errado (`dados.matriculas` em vez de `dados.matriculasDB`, que é o que `loadAll()` de fato retorna), então essa condição nunca disparava; `atasDB` não é referenciado em lugar nenhum do arquivo. Pura leitura desperdiçada, toda vez que a página era aberta — e `matriculas`/`atas` são, por natureza (1 doc por aluno×ano / por ata), as coleções que mais escalam com o tamanho da escola. É plausível que essa página sozinha já respondesse por uma fatia grande dos 25k de leituras relatados pelo usuário (plano Spark do Firestore, ~50% do limite diário numa única pesquisa de turmas).

### Solução implementada: busca 100% pontual, sem índice local, sem `localStorage`

Trocado o modelo inteiro por buscas sob demanda, alinhado com o resto do módulo já redesenhado:

1. **Buscar por nome/ID** → `Identidade.buscarAtasPorNome(termo)` (query por prefixo em `nomeBusca`, coleção `alunos-atas`) ou `Identidade.buscarAtasPorId(termo)` quando o texto bate com o padrão `ALU-\d+` — nenhuma leitura em massa.
2. **Aluno selecionado** → `window.DB.matriculas.whereEquals('alunoId', id)` (query filtrada, só as matrículas daquele aluno — turmaId + anoLetivo de cada ano).
3. **Pra cada matrícula** → `window.DB.turmas.get(turmaId)` (leitura pontual, 1 doc), com fallback defensivo via `whereEquals('id'/'turmaId', turmaId)` caso o `turmaId` salvo em `matriculas` não seja o `_id` real do documento no Firestore (convenção legada `t.id || t.turmaId || t._id` já vista em `gestao-atas.html` — turmas podem ter um campo `id` próprio, diferente do ID do documento).
4. Dentro de cada turma encontrada, localiza a linha do aluno em `turma.alunos[]` com o mesmo fallback de 3 níveis já usado nas exportações (alunoId exato → nome normalizado exato → nome normalizado "contém").
5. **Zero `localStorage` de dados**: removido o objeto `DB` de cache local inteiro (lia/gravava `schools:{escola}:{chave}`), sobrando só um `getActiveSchoolId()` mínimo que não guarda nenhum dado do Firestore. Dados da escola (nome/endereço pro cabeçalho do PDF) passaram a vir de `window.DB.escola.get()` — 1 leitura pontual, feita 1x no boot, guardada só em memória (`_escolaCache`), nunca em disco.

Custo por busca, no pior caso: 1 query pequena (nome/ID) + 1 query pequena (matrículas) + N leituras pontuais (N = só as turmas que aquele aluno específico cursou, tipicamente poucas) — nada de escanear a escola inteira.

### Trade-offs aceitos explicitamente pelo usuário

1. **Busca deixou de ser "contém" e virou "prefixo"**: digitar "silva" não acha mais "Maria da Silva" (só acha nomes que **começam** com "silva"). Limitação inerente de query indexada no Firestore sem um serviço de busca de texto dedicado.
2. **Alunos sem `alunoId` vinculado numa matrícula antiga podem sumir da busca** — a busca depende do vínculo em `matriculas`; turmas muito antigas que nunca passaram pelo fluxo novo de vinculação podem não aparecer. Mesmo trade-off que o próprio `identidade-aluno.js` já assume em `recalcularUltimoAnoRegistroBatch()`.

### Alternativas de busca por nome discutidas e adiadas (pra registro, não implementadas)

Perguntado se dava pra recuperar a busca "contém" de algum jeito:
1. **Tokens de palavra** (`nomeTokens: ["maria","da","silva"]` + query `array-contains`) — funcionaria, custo de leitura baixo, mas exige mexer em `identidade-aluno.js` (arquivo compartilhado com `cadastro-atas.html`/`pesquisa-ata.html`) pra gravar esse campo em toda criação/edição de aluno, **mais uma migração** pros alunos já existentes.
2. **Tokens por prefixo de cada palavra** — mesma ideia, indexando prefixos parciais de cada palavra ("sil", "silv", "silva"), pra achar por começo de qualquer palavra do nome, não só a palavra inteira. Mesmo porém do item 1.
3. **Serviço de busca de terceiro** (Algolia/Typesense) — busca de texto de verdade, mas complexidade e possivelmente custo extra — na contramão do motivo do redesenho (plano Spark).
4. **Busca ampla opt-in**, só na coleção `alunos-atas` (menor que `matriculas`), sob clique explícito de um botão tipo "🔍 Busca ampla" quando o prefixo não achar nada — leria a coleção inteira 1 vez, só quando pedido, sem salvar nada. Só é seguramente barata se `alunos-atas` for uma coleção pequena; não confirmado quantos alunos a escola tem no total.

**Decisão do usuário**: manter busca por prefixo como está. Vai ser mitigado com um aviso na UI (ver pendência do ⓘ, abaixo) direcionando pra `pesquisa-ata.html` quando o nome exato não for conhecido.

### Identidade visual aplicada (`card-destaque`) + bugs achados depois

Aplicado o mesmo padrão de `pesquisa-ata.html`/`gestao-atas.html` (card na cor escolhida pelo usuário, contraste calculado por luminância real via `ajustarContrasteDestaque()`, reagindo ao evento `colorchange`) no card "Buscar aluno". Depois de testado pelo usuário, dois bugs visuais apareceram e foram corrigidos:

1. **Botão "Pesquisar" invisível** (mesma cor do fundo do card, em claro **e** escuro — não só no escuro como no caso já visto em `pesquisa-ata.html`). Causa: o sistema reforça `.btn-primary` com o seletor `button.btn.btn-primary` (tipo `button` + 2 classes), especificamente pra não ser sobrescrito por `.btn` sozinho — isso também vence `.card-destaque .btn` (só 2 classes, sem tipo), em qualquer tema. Corrigido igualando esse mesmo reforço de tipo dentro do escopo do card (`.card-destaque button.btn.btn-primary`), ficando estritamente mais específico — não depende de ordem no arquivo dessa vez (diferente do fix de `pesquisa-ata.html`, que empatava por especificidade e resolvia por ordem).
2. **Cards "Resultados" e "Detalhes" com alturas diferentes** antes de receber dado (visual "torto"). Causa: `.split { align-items:start; }` desligava o esticamento padrão do CSS Grid. Corrigido trocando pra `stretch` — os dois cards passam a ter sempre a altura do maior, em qualquer estado, sem precisar calcular nada em JS.
3. **Textos técnicos vazando pra UI**: `dbInfo` mostrava o `schoolId` cru em vez do nome de exibição da escola — corrigido usando `_escolaCache.displayName || .name || .nome` (mesma cadeia de fallback que `auth.firebase.js` já usa pra isso). A dica do card "Resultados" mencionava `turmasDB` (detalhe técnico interno) — removida a menção.

## 🆕 Pendência nova: ícone ⓘ no campo de busca (prioridade definida pelo usuário)

Primeira implementação real da ideia de "ícone 🛈 com tooltip" discutida (e nunca implementada) no v6. **Ainda não codada** — só aprovada e especificada, aguardando o usuário terminar de testar a página antes de eu mexer em código de novo. Especificação combinada:
- Ícone ⓘ do lado do rótulo "Nome do aluno", em `historico-aluno.html`.
- Tooltip de verdade: hover no desktop, e também abre/fecha com toque no mobile (cobre as duas pontas em aberto que o v6 registrava sobre esse mecanismo).
- Texto exato: *"Caso não saiba exatamente o nome do aluno, pesquise-o na página anterior (pesquisa de atas) e volte aqui com o nome completo."*
- Escopo: só essa página, por enquanto — não é a decisão de sistema-inteiro (onde o texto mora, se vira um componente reutilizável) que o v6 deixou em aberto pras outras páginas.

## 🔴 Bug do botão "Ver turma" em `historico-aluno.html` — não é só o link

Achado pelo usuário ao testar. Investigação (sem código ainda, por pedido explícito do usuário — tudo abaixo é só diagnóstico e direção combinada):

**Sintoma**: clicar em "Ver turma" quebra a página e volta pro `index` (comportamento de erro de rota).

**Causa aparente, mas errada** (primeira hipótese, descartada pelo usuário): a URL gerada é `cadastro-turma.html?edit=...` — nome de arquivo errado (singular; o arquivo real é `cadastro-turmas.html`, plural). Esse typo existe e é real, mas **corrigir só isso não resolveria o problema**, pelos dois motivos abaixo.

**Causa real, em duas camadas**:
1. `cadastro-turmas.html` hoje só cadastra dados de **identificação** da turma (ano letivo, série, turno, schema) — **sem dados de aluno/notas**. Não é (e nunca foi) a página certa pra "ver a turma" no sentido de ver notas.
2. A página certa pra isso é `cadastro-atas.html` — mas essa página tem RBAC de **gestor/admin**, enquanto `historico-aluno.html` é acessível a **`user` comum**. Ou seja, mesmo corrigindo o nome do arquivo e apontando pra `cadastro-atas.html`, um `user` comum seria barrado pelo RBAC — voltaria pro index de qualquer forma, só que por outro motivo (permissão, não rota inexistente).

**Comparação com `pesquisa-ata.html`** (investigado, sem editar nada): essa página tem **dois** botões diferentes relacionados a turma, e só um deles tem o mesmo propósito do "Ver turma" do histórico:
- **"Editar cadastro completo"**: redireciona pra `cadastro-atas.html?turma=...` (edição de verdade) — **já é ocultado por RBAC** pra quem não é gestor/admin. Esse já está certo, não é o modelo a seguir aqui.
- **"Ver"**, no card "Pesquisa por aluno": **não navega pra lugar nenhum** — só abre a turma específica, inline, numa tabela dentro da própria `pesquisa-ata.html`. Esse é o padrão análogo ao "Ver turma" do histórico, e é o que funciona sem esbarrar em RBAC.

**Direção combinada com o usuário para o fix (ainda não implementado)**:
Replicar o padrão inline de `pesquisa-ata.html`, em vez de navegar:
- Um card novo, abaixo dos dois últimos da página, naturalmente oculto (`display:none` ou equivalente) até "Ver turma" ser clicado.
- Ao clicar, revela esse card renderizando os dados que a página **já tem em memória** — o objeto `turma` completo (com `turma.alunos[]`) já é buscado como parte de `montarAlunoComOcorrencias()` pra montar o histórico do aluno. **Custo zero de leitura adicional no Firestore.**
- Sem navegação, sem depender do RBAC de `cadastro-atas.html` — resolve o problema de permissão e o de leitura ao mesmo tempo.
- Só-leitura (sem edição), coerente com o nível de acesso do `user` comum: só mostra a turma de um aluno que ele já pesquisou legitimamente, não deixa navegar por qualquer turma da escola à toa.

**Motivo de ainda não estar implementado**: usuário pediu explicitamente pra não codar nada nesta rodada — só discutir e registrar no handoff, testes em andamento.

---

## Arquivos entregues nesta rodada (Parte 3)

1. **`cadastro-turmas.html`** — trava de RBAC (bloqueia `user`, libera
   admin+gestor).
2. **`atas.html`** (hub) — RBAC corrigido nos 3 cards restritos + fix da
   corrida de 1–1.5s.
3. **`gestao-atas.html`** — `_confirmModal()` em vez de `confirm()`, log
   de delete virou painel flutuante fechável, loading overlay adicionado.
4. **`historico-aluno.html`** — reescrita quase completa: fix do loading
   infinito, fix do crash do `Identidade.lerTodos()`, identidade visual
   (`card-destaque`) com os bugs visuais decorrentes corrigidos, e o
   redesenho de arquitetura inteiro (busca pontual, sem `localStorage`,
   sem `loadAll()`).

Nenhuma mudança em `cadastro-atas.html`, `pesquisa-ata.html`,
`schema_ata.html`, `admin_escolas.html`, `firestore.rules`,
`db.firebase.js`, `identidade-aluno.js` nesta rodada — `pesquisa-ata.html`,
`identidade-aluno.js` e `db.firebase.js` foram lidos/auditados
(parcialmente, no caso dos dois últimos), mas não alterados.

---

# PARTE 4 — Feito neste chat (v8)

> Chat de continuação depois do v7/v7_beta, colado no início da conversa.
> Ficou responsável por `cadastro-atas.html`, `cadastro-turmas.html` e
> `pesquisa-ata.html`. Não tocou em `gestao-atas.html`,
> `historico-aluno.html`, `schema_ata.html`, `admin_escolas.html`,
> `atas.html` (hub), `identidade-aluno.js`, `firestore.rules`,
> `db.firebase.js` nem nas Cloudflare Functions.
>
> Todas as mudanças abaixo foram validadas rodando o **código real
> extraído do arquivo** em jsdom (não pseudocódigo reescrito à parte) —
> na maioria dos casos, carregando a página inteira e clicando nos
> elementos de verdade, não só chamando funções isoladas. Onde a
> biblioteca permitia (o bug do PDF), o teste rodou contra o `jsPDF`/
> `jspdf-autotable` reais, instalados via npm, não contra um cálculo no
> papel. Em nenhum caso houve teste no navegador de verdade — o usuário
> testou manualmente por conta própria os itens que ele confirmou abaixo
> (pendência 10 e pendência 6b); os demais (CSV, `pesquisa-ata.html`
> escape, aviso do catálogo, largura do "Resultado") ainda não têm
> confirmação manual do usuário.

## ✅ Pendência 10 fechada: trava de "aluno em edição / formulário não salvo" em `cadastro-atas.html`

`salvarNoBanco()` agora bloqueia, sem opção de ignorar, quando:
- um aluno foi tirado da tabela via "Editar" e ainda não voltou por
  "Adicionar/Atualizar" (o risco que a pendência 10 descrevia: salvar
  nesse meio-tempo apagava o aluno da turma); ou
- há algo digitado no formulário que nunca virou linha da tabela — nome,
  qualquer nota preenchida (só espaço não conta), ou resultado diferente
  de "Não informado". Série não conta (fica pré-selecionada de propósito
  em turma de série única) nem colunas desabilitadas no schema da turma.

Toast de erro focando o campo Nome; se for edição, cita o nome do aluno.
A trava fica no único ponto de entrada de salvamento, então também vale
pro "Salvar e continuar" do modal de "dados não salvos" (Parte 2) — nesse
caso o modal fecha, a turma não muda, e o toast explica o motivo.

**Decisões deixadas em aberto, não implementadas por não terem sido
pedidas**: não existe botão de "cancelar edição" isolado (hoje só
"Descartar alterações", que joga fora a sessão inteira, ou excluir o
aluno); e texto solto no formulário (sem estar em edição) não abre o
modal de "dados não salvos" ao trocar de turma — só a edição em
andamento abre isso.

**Teste**: 20 casos em jsdom com as funções reais extraídas do arquivo e
o formulário gerado pelo `renderFormularioDinamico()` de verdade — cobrem
formulário limpo, nome só, nota só, só espaços, resultado alterado, aluno
em edição (com/sem nome), saída da edição, sem turma selecionada, e
schema sem resultado. **Usuário testou manualmente e aprovou.**

## ✅ Pendência 6(b) fechada: schema travado na edição de `cadastro-turmas.html`

Decisão do usuário, mais forte que a proposta original deste chat:
**o schema de uma turma nunca pode ser trocado depois de criada** — nem
o comportamento silencioso de cair no padrão quando o schema foi
excluído (o bug que a pendência 6b descrevia), nem uma troca deliberada.

- Em modo edição, `#schemaSelect` vira um mostrador **travado** com o
  schema real da turma (lido do `schemaSnapshot`, não da lista atual de
  schemas) — se ele foi excluído, o rótulo diz
  `<nome> (schema removido do sistema — mantido na turma)`; se a turma
  não tem schema nenhum (caso legado), mostra "Sem schema registrado".
  A trava do schema padrão obrigatório (`temSchemaPadrao()`) passou a
  valer só na criação — editar uma turma não depende mais de o padrão
  existir.
- `salvarTurma()` nunca lê nem regrava schema em edição: copia
  `schemaId`/`schemaSnapshot`/`aba`/`origemArquivo` direto do documento
  original. Se a edição muda o ID da turma (ex.: trocar o turno), o
  documento novo nasce com o schema do original — não fica sem
  `schemaSnapshot`. **Efeito colateral, além do pedido**: `aba` e
  `origemArquivo` também passaram a ser preservados na edição — a versão
  anterior regravava `"MANUAL"` por cima desses campos e apagava a pista
  de que uma turma tinha sido importada de planilha.
- **Hard refresh só na edição** (replicando o mesmo padrão que o usuário
  já usa em `cadastro-atas.html`, que resolve a página ficando estática
  depois de salvar): a página recarrega, e o toast de confirmação
  sobrevive ao reload guardado em `sessionStorage`, lido uma vez no
  `init()` e apagado. Se o ID mudou, a mensagem é um aviso (não "ok")
  citando o ID antigo e o novo. **Na criação não há reload** — só reseta
  o formulário e atualiza a lista local, como já era antes.

**Teste**: 40 checagens em jsdom carregando a `cadastro-turmas.html`
inteira (com `Auth`/`Loading`/`DB` simulados) e clicando de verdade em
Editar/Salvar/Limpar/Criar — cobre edição com schema excluído, edição
com mudança de ID, turma legada sem schema nenhum (sem mandar
`undefined` pro Firestore), criação sem reload, e reabilitação do select
ao limpar o formulário. Rodada também contra o arquivo **original**, pra
confirmar que a suíte de fato pega o bug antes do fix. **Usuário testou
manualmente e aprovou** ("testado e aprovado!").

## ✅ Pendência 13 fechada, só em `pesquisa-ata.html` — nomes/dados sem escape em `innerHTML`

**Causa e exemplo concreto**: `renderAlunos()` montava a linha do aluno
com `nomeAtual(a)` puro dentro de `innerHTML`. Um nome com `<`/`>` (ex.:
digitado com a série colada por engano) não dá erro nenhum — o navegador
descarta o trecho que parece tag, e o nome aparece truncado na tela, sem
nenhum aviso.

Corrigido com as duas funções de escape que já existiam no arquivo
(`_escHtml`/`escapeHtml`, já usadas em outros pontos), em três lugares:
`nomeAtual(a)` em `renderAlunos()`; título e badges (ano/série/turno/qtd.
de alunos) em `renderListaTurmas()`; e os mesmos campos, mais
`origemArquivo`, em `selecionarTurma()` (`detalhesMeta`). Achado extra,
fora do que o handoff v7 registrava: o card de turma também estava
exposto pelo mesmo motivo (`aba` de uma turma pode ser texto livre de
planilha).

**`cadastro-atas.html` não foi tocado** — decisão do usuário já registrada
no v7 ("não precisa") continua valendo, e não é mais tratada como a
mesma pendência de `pesquisa-ata.html`: aqui fechada, lá é decisão
fechada de não mexer.

**Teste**: funções reais extraídas dos dois arquivos (antes/depois) rodadas
em jsdom com dado sujo (`<Pequeno>` no nome, `<img onerror=...>` na
`aba`). Contra o arquivo **original**, a suíte reproduziu o bug de
verdade (nome truncado, `<img>` virando elemento real no DOM). Contra o
corrigido, os 3 pontos passam. 11/11. **Sem teste manual do usuário.**

## ✅ Pendência 14 fechada, com uma ressalva de texto importante — aviso quando `carregarCatalogoNomes()` falha

Decisão do usuário: se o catálogo de identidade falhar ao carregar, a
página não trava — só avisa, via `setMsg(..., "warn")`, dentro do
`catch` que já existia (que zera `_mapaNomes`, comportamento inalterado).

**⚠️ Ressalva que precisa de atenção na próxima rodada**: o texto do
aviso, do jeito que foi implementado, diz algo como *"nomes exibidos
podem estar desatualizados para **algum aluno corrigido recentemente**"*
— isso dá a entender que o sistema detectou um caso específico, o que é
**falso**. O aviso dispara quando o catálogo inteiro falha, então o
código não consegue checar **nenhum** aluno contra ele — não é uma
inconsistência encontrada, é uma incapacidade de confirmar, pra **todo
mundo** com `alunoId`. Na esmagadora maioria das vezes que isso dispara,
provavelmente nenhum aluno foi de fato renomeado. Esse ponto foi
levantado e discutido com o usuário nesta rodada, uma redação mais fiel
foi proposta (algo como *"não foi possível confirmar se os nomes estão
atualizados... se algum aluno foi corrigido recentemente, o nome antigo
pode aparecer até a próxima atualização"*), mas **o usuário só confirmou
que entendeu a diferença — não confirmou trocar o texto**, e o código
final ficou com a redação original (a que superestima o que foi
detectado). Definir o texto final é a única coisa que falta aqui.

**Teste**: `carregarCatalogoNomes()` real extraída e rodada em jsdom nos
dois cenários (`Identidade.lerTodos()` ok e lançando erro) — confirma 1
aviso `warn` só no cenário quebrado, mapa vazio sem quebrar `nomeAtual()`
depois. 6/6. **Sem teste manual do usuário.**

## ✅ Pendência 8 fechada: CSV export em `pesquisa-ata.html`

Baseado no `exportCsvCompleto()` de `pesquisa-ano-ativo.html` — mesmo
formato já decidido no v7 (`;`, `\r\n`, tudo entre aspas, BOM UTF-8),
adaptado pra dado de nota/resultado em vez de dado pessoal. Colunas vêm
do schema real da turma selecionada (`schemaDaTurmaSelecionada()`), igual
à tela e ao PDF — não é um layout fixo: `Nº`, `Nome`, `Série` (se
`serieAtiva`), uma coluna por matéria ativa (cabeçalho = **`key`**, não
`label` — mesmo critério já usado no cabeçalho da tela e no PDF, pra
manter as três saídas consistentes entre si — assumido pelo chat, sem
pergunta explícita ao usuário sobre isso), `Resultado` (se
`resultadoAtivo`).

Nome do arquivo: extraí a lógica que já existia dentro do export de PDF
pra uma função nova, `_nomeArquivoAta(turma, extensao)`, e o PDF passou a
usar essa mesma função — CSV e PDF agora sempre saem com a mesma base de
nome, só trocando a extensão (assumido pelo chat como resposta à pergunta
que ficou em aberto pro usuário; ele não respondeu explicitamente, só
aprovou o conjunto do trabalho no fim da rodada).

**Teste**: `_exportarCSVDaTurmaInterno()` real extraída e rodada em jsdom
— 12 casos cobrindo aspas internas no nome (`""` escapado), `;` dentro de
um campo (não quebra coluna, fica dentro das aspas), coluna desabilitada
no schema não aparecendo, resultado ausente virando "Não informado",
schema sem série/resultado, e turma sem nenhum aluno (só cabeçalho). No
caminho, descoberto que o `Blob.text()` do jsdom remove o BOM sozinho
(comportamento padrão do `TextDecoder`, não bug do código) — o teste do
BOM foi ajustado pra checar os bytes crus via `arrayBuffer()`. **Sem
teste manual do usuário** — não foi aberto no Excel/LibreOffice de
verdade pra conferir acentuação.

## ✅ Bug real encontrado e corrigido: cabeçalho "Resultado" quebrando linha no PDF de `pesquisa-ata.html`

**Não é a pendência 12 histórica** (largura das colunas de *matéria*,
44pt/80pt) — o usuário confirmou nesta rodada que aquilo está resolvido e
não precisa de ajuste. O bug real, achado e relatado pelo próprio
usuário, é outro: o cabeçalho da coluna "Resultado" imprimia quebrado em
duas linhas (`"Resultad" / "o"`).

**Causa raiz real** (só descoberta rodando o `jspdf-autotable` de
verdade, não calculando no papel — a primeira tentativa deste chat, só
somar +2pt de folga, **não resolvia o bug**, confirmado empiricamente
antes de trocar de abordagem): a coluna tinha um `cellPadding`
customizado (2pt de cada lado) em `columnStyles`, que **o autoTable
aplica na célula do corpo mas ignora na célula do cabeçalho** — o
cabeçalho sempre cai no padding padrão da tabela (5pt de cada lado). A
largura antiga foi calculada assumindo 2pt, então sobrava só ~0.7pt de
área de texto de verdade para uma palavra de ~43.3pt — qualquer
diferença mínima de medição bastava pra quebrar.

**Fix**: removido o `cellPadding` customizado (a coluna passa a usar o
padding padrão, igual a todas as outras); largura recalculada em cima do
padding real (5pt de cada lado) + 3pt de folga, valor achado por busca
binária contra o `autoTable` de verdade (mínimo real sem quebra: 53pt;
ficou em 57pt).

**Teste**: `jsPDF`/`jspdf-autotable` reais instalados via npm e rodados —
reproduzida a quebra com a largura antiga (confirmando o bug de verdade,
não só no papel), confirmado que a fórmula nova gera 1 linha só, e
checado que o corpo da tabela não regrediu (o wrap de "Não informado" no
corpo já existia antes, não é o escopo, e nem piorou). **Sem teste
visual do PDF gerado nem confirmação do usuário.**

## Pendências 1 e 2 fechadas — não por código, por decisão/confirmação do usuário

Investigação em `cadastro-turmas.html` (Parte 3 deste handoff, antes
desta rodada) já apontava que o único caminho de criação de turma pelo
sistema sempre grava `schemaSnapshot`. O usuário confirmou nesta rodada,
resolvendo em chat paralelo: **é impossível existir turma sem
`schemaSnapshot`** pelo fluxo normal do sistema (só documento criado
direto no Firebase teria esse problema, fora de escopo). Portanto:
- O fallback embutido de 8 matérias em `cadastro-atas.html` (pendência 1)
  e a cópia equivalente em `cadastro-turmas.html` (pendência 2) são
  código morto/inatingível pelo fluxo normal — não um bug ativo.
- **Nenhum arquivo foi alterado por causa disso.** A cópia do mesmo
  fallback em `pesquisa-ata.html` (citada no alerta da Parte 1) também
  não precisa de mudança — confirmado pelo usuário: "nada foi alterado
  na página de pesquisa! então a última versão que te enviei é a mais
  atualizada".

## Pendências 4 e 6(c) — testes confirmados pelo usuário nesta rodada, herdados de trabalho anterior

Nenhum código foi escrito por este chat pra nenhum dos dois — só
confirmação verbal do usuário, feita nesta rodada:
- **Pendência 4** (deploy + teste manual do fix do Cloudinary): usuário
  confirmou que já testou.
- **Pendência 6(c)** (`schema_ata` como gestor não-admin-global): usuário
  confirmou que já testou "há tempos" — o gestor consegue fazer tudo em
  `schema_ata.html`, exceto excluir o schema padrão (comportamento
  esperado).

**Pendência 6(a)** (escola nova cria `padrao` junto) segue sem
confirmação — não foi mencionada nesta rodada.

## Decisão do usuário: não auditar `identidade-aluno.js` de forma preventiva

A pendência 11 (ponto cego parcial em `identidade-aluno.js`) não foi
atacada por decisão explícita do usuário: a página é relativamente
grande, e resumi-la no handoff arriscaria inflar o documento e causar
divergência entre chats (histórico de "regressão fantasma" já registrado
na Parte 1). Decisão: quando alguma mudança precisar mexer nesse
arquivo, o usuário manda o arquivo direto no chat que for fazer a
mudança, em vez de descrever o conteúdo aqui.

## Arquivos entregues nesta rodada (Parte 4)

1. **`cadastro-atas.html`** — trava de "aluno em edição / formulário não
   salvo" no `salvarNoBanco()` (pendência 10).
2. **`cadastro-turmas.html`** — schema travado na edição, payload de
   edição preserva schema/`aba`/`origemArquivo` do documento original,
   hard refresh só na edição com toast pós-reload (pendência 6b).
3. **`pesquisa-ata.html`** — escape de HTML em 3 pontos (pendência 13),
   aviso quando o catálogo de nomes falha (pendência 14, com a ressalva
   de texto acima), CSV export (pendência 8), correção da largura do
   cabeçalho "Resultado" no PDF, e `_nomeArquivoAta()` extraída como
   helper compartilhado entre PDF e CSV.

Nenhuma mudança em `gestao-atas.html`, `historico-aluno.html`,
`schema_ata.html`, `admin_escolas.html`, `atas.html` (hub),
`identidade-aluno.js`, `firestore.rules`, `db.firebase.js`, nem nas
Cloudflare Functions nesta rodada.

---

# PARTE 5 — Feito neste chat (v9)

## Pendência 8 — Bug do botão "Ver turma" em `historico-aluno.html` — corrigido e testado

Implementada a direção já combinada na Parte 3: em vez de navegar pra
`cadastro-turma.html?edit=...` (arquivo errado + `cadastro-atas.html`,
página certa, é gestor/admin-only enquanto `historico-aluno.html` é
acessível a `user` comum), o botão "Ver turma" agora abre um card na
própria página (`#cardTurmaAberta`), naturalmente oculto, revelado ao
clicar.

- Renderiza o `turma` que já está em memória, dentro de
  `_alunoSelecionado.ocorrencias[].turma` — **zero leitura adicional** no
  Firestore.
- Colunas pelo schema real da turma, via `mergeSchemaColumns([{turma: t}])`
  — reaproveita a mesma função já usada pra exportação, em vez de duplicar
  a lógica de ler `schemaSnapshot`/fallback.
- Reaproveita também `tituloTurma()`, `escapeHtml()` e `normNome()`, já
  existentes no arquivo.
- Destaca em negrito a linha do próprio aluno cujo histórico está aberto
  (mesmo critério de match em 2 níveis — `alunoId` exato, senão nome
  normalizado — já usado em `_construirHeadBodyHistorico`).
- **Só leitura**: sem botão de editar, com aviso explícito na tela ("nada
  aqui é editado ou salvo").
- O card fecha sozinho ao trocar de aluno ou limpar a busca, pra nunca
  mostrar uma turma de um aluno diferente do selecionado.
- CSS de tabela (`.table-scroll`, `table`) não precisou de nada novo — já
  vem do `components.css` global, que a página já carrega.

**Usuário testou manualmente e aprovou.**

## Pendência 9 (absorvida pela pendência do tooltip) — Ícone ⓘ implementado em `historico-aluno.html`

Primeira implementação real do ícone de dica, ao lado do rótulo "Nome do
aluno", com o texto já aprovado no handoff: *"Caso não saiba exatamente o
nome do aluno, pesquise-o na página anterior (pesquisa de atas) e volte
aqui com o nome completo."*

**Decisões de mecanismo tomadas nesta rodada** (fecham o "em aberto" que
a pendência 5/9 antiga deixava sobre isso):
- **Não centralizado** num arquivo `.js`/`.css` à parte — inline, copiado
  em cada página conforme ela entrar na fila. Decisão do usuário:
  centralizar seria mais trabalho que economia, já que texto e posição da
  dica mudam a cada uso.
- **Texto inline no HTML**, dentro do próprio elemento da dica — não um
  dicionário JS central.
- **Toque/clique pra abrir e fechar**, não hover — funciona igual em
  desktop e mobile sem precisar detectar tipo de dispositivo.

**Duas iterações de bug visual, corrigidas e aprovadas:**
1. Ícone inicial era o emoji ⓘ com fundo/borda em cor fixa
   (`--chip-bg`/`--chip-border`) — o emoji já vem com um círculo dentro do
   próprio glifo (círculo duplicado visualmente) e não centraliza de forma
   confiável entre fontes/plataformas; a cor fixa também ficava com
   contraste ruim em cards coloridos (`card-destaque`, fundo vermelho).
2. Corrigido: ícone virou um "i" de texto (itálico, serifado), centralizado
   via flexbox dentro de um círculo desenhado em CSS puro, com borda/cor
   em `currentColor` — herda a cor do texto ao redor, então se adapta
   sozinho a qualquer cor de fundo de card, sem precisar de regra CSS por
   página ou por cor de marca escolhida em `perfil.html`. O balão do
   tooltip (`.info-tip-bubble`) usa cor própria (`var(--card)`/
   `var(--text)`), não herda do card de fundo — sempre legível.

**Usuário testou manualmente (inclusive em cima do `card-destaque`
vermelho) e aprovou.**

## Pendência 2 (centralizar contraste) — `historico-aluno.html` migrado pro `theme-colors.js`

Feito por um **chat paralelo** (não este), a pedido do usuário, depois de
receber `historico-aluno.html` já com o ícone ⓘ. Auditado neste chat
lendo os dois arquivos reais antes de aceitar como fechado — sem repetir
o erro da regressão fantasma da Parte 1.

- Em `theme-colors.js`: nova `ThemeColors.ajustarContraste(seletor)`
  (default `.card-destaque`) e `ThemeColors.calcularLuminancia(corCss)` —
  mesma conta WCAG que já existia, generalizada por seletor em vez de
  fixada num único `querySelector`. O listener de `colorchange` também
  migrou pra dentro do próprio `theme-colors.js` — reajusta sozinho no
  seletor padrão quando a cor muda, sem cada página precisar registrar o
  próprio listener.
- Em `historico-aluno.html`: removida a função inline inteira
  (`ajustarContrasteDestaque()`) e o `addEventListener('colorchange', ...)`
  dela. A chamada de inicialização virou
  `if (window.ThemeColors) ThemeColors.ajustarContraste();`, mantida no
  mesmo ponto do `init()` (depois que o card já existe no DOM — isso não
  dá pra centralizar, já que `theme-colors.js` roda no `<head>`, antes do
  `<body>`). CSS de `.card-destaque`/`.card-destaque.contraste-claro`
  intocado.

**`gestao-atas.html` e `pesquisa-ata.html` continuam com a função
duplicada** — pendência 2 permanece aberta pra essas duas páginas.

## Novo: guia `guia-migracao-contraste-theme-colors.md`

A pedido do usuário, criado um guia (arquivo `.md` separado, entregue
junto com este handoff) pra facilitar os próximos chats a replicar as
duas mudanças acima no resto do sistema. Duas partes:

- **Parte 1 do guia** — como adequar qualquer página ao
  `ThemeColors.ajustarContraste()`: o que remover em página que já tinha
  cálculo duplicado, o que adicionar em página que nunca teve nada, e uma
  regra sem exceção — **o elemento sempre vira `.card-destaque` no HTML**
  (renomear a classe se for diferente), porque o listener automático de
  `colorchange` em `theme-colors.js` só cobre o seletor padrão; um nome
  de classe diferente perde o reajuste em tempo real na troca de cor.
  Confirma também que `<script src="../theme-colors.js">` é sempre um
  nível (`../`) — o projeto não tem pasta dentro de pasta, então nunca
  precisa de `../../`.
- **Parte 2 do guia** — receita copiar-e-colar do ícone ⓘ: bloco de CSS,
  padrão de HTML, e o listener de "fechar ao clicar fora" — com a
  explicação do "porquê" de cada escolha (não usar emoji, usar
  `currentColor`), pra quem for aplicar em outra página não precisar
  adivinhar ou reabrir esta conversa.

**Qualquer chat que for mexer na pendência de tooltip ⓘ ou na
centralização de contraste deve pedir esse guia junto com o handoff.**

## Decisões e fechamentos relatados pelo usuário (chat paralelo, sem código neste chat)

- **Pendência 3 (escola nova cria `padrao` junto)** — usuário confirmou:
  já testado e aprovado; o teste na verdade roda em `schema_ata.html`, não
  em `cadastro-turmas.html`. Fechada.
- **Pendência 7 (nota de propriedade de arquivos, `admin_escolas.html`/
  `schema_ata.html`)** — usuário confirmou: o próprio chat que fez as
  mudanças de schema auditou a página duas vezes, a pedido do usuário; não
  achou erros, só não detalhou isso no handoff anterior (só marcou
  "auditado"). Fechada — sem nenhum chat desta série ter lido o arquivo
  real, mas com a auditoria do chat responsável confirmada e reportada
  pelo usuário.

## Duas pendências novas, sistema-inteiro, sem prioridade definida

Relatadas pelo usuário depois de conversa com o chat paralelo sobre
`theme-colors.js`:

1. **Ícone ⓘ com tooltip, sistema-inteiro** — deixa de ser só a
   instância de `historico-aluno.html` (pendência 9 antiga) e passa a
   valer pra toda página que tiver dicas, começando pelo módulo de atas.
   Mecanismo e implementação de referência: ver seção acima e o guia.
   Usuário sinalizou que há outras pendências com prioridade antes dela.
2. **Destaque de card via `theme-colors.js`** — pelo menos 1 card
   principal por página "com funções" ganha o background com a variação
   de cor do `theme-colors.js`. **Não é mudança direta no `.js`** — é
   adequar as outras páginas a ele (mesma ideia de "ligar os elementos"
   do guia, mas pra destaque visual, não pra contraste de texto). Mesma
   prioridade baixa do item 1, combinado pra ser feito junto com o resto
   do rollout da pendência 2 (centralizar contraste).

## Arquivos entregues nesta rodada (Parte 5)

1. **`historico-aluno.html`** — botão "Ver turma" corrigido (pendência 8)
   e ícone ⓘ implementado (pendência 9/tooltip). A migração pro
   `theme-colors.js` (pendência 2) veio pronta de um chat paralelo e foi
   só auditada aqui, não refeita.
2. **`theme-colors.js`** — recebido pronto do chat paralelo
   (`ajustarContraste`/`calcularLuminancia` + listener central), auditado
   aqui.
3. **`guia-migracao-contraste-theme-colors.md`** (novo) — guia de
   replicação das pendências 2 e do tooltip pro resto do sistema.

Nenhuma mudança em `cadastro-atas.html`, `cadastro-turmas.html`,
`pesquisa-ata.html`, `gestao-atas.html`, `schema_ata.html`,
`admin_escolas.html`, `atas.html` (hub), `identidade-aluno.js`,
`firestore.rules`, `db.firebase.js`, nem nas Cloudflare Functions nesta
rodada. **`cadastro-atas.html`** (pendência 4, limite de scans + PDF)
está sendo produzida num chat paralelo, deliberadamente não tocada aqui
pra não misturar os dois chats na mesma pendência.

---

# PARTE 6 — Feito neste chat (v10)

## Pendência 2 (centralizar contraste) — módulo de atas 100% migrado

`gestao-atas.html` e `pesquisa-ata.html` já vinham migrados de fora deste
chat (usuário confirmou: "aqui ou no chat paralelo"); `cadastro-turmas.html`
foi migrado nesta rodada, do zero (nunca tinha tido `.card-destaque`). Os
cinco arquivos do módulo (`historico-aluno.html`, `gestao-atas.html`,
`pesquisa-ata.html`, `schema_ata.html`, `cadastro-turmas.html`) estão
migrados e testados — **pendência 2 fechada pro módulo de atas**. Detalhe
por página no guia (`guia-migracao-contraste-theme-colors.md`, tabela de
status no fim).

**Bug de produção corrigido em `pesquisa-ata.html`**: o CSS do balão de
dica foi colado usando os nomes de variável de `historico-aluno.html`
(`--card`/`--border`/`--text`) sem checar se existiam ali — não existiam.
Resultado, só visível depois do deploy: fundo do balão transparente, ícone
trocando de cor sozinho com o tema (estava dentro de `.filter-actions`,
que nenhuma regra de contraste cobria). Corrigido mapeando pros tokens
reais da página (`--card-bg`/`--card-border` + cor de texto fixa por
tema). Motivou a seção 2.1.1 do guia (checar tokens antes de colar).

## `cadastro-turmas.html` — migrado do zero (contraste + tooltip + redesenho do mini-card)

Primeira página do módulo com **dois cards lado a lado** (não um em cima
do outro) — decisão de qual vira `.card-destaque` não seguiu o padrão das
páginas anteriores (sempre o card de ação/filtro); aqui foi o card de
**listagem** ("Turmas cadastradas"). Motivou a seção 1.6 do guia.

**Tooltips** (6 ícones): duas legendas fixas viraram tooltip com texto
reduzido ("Adicionar série", com aviso sobre editar série de turma com ata
vinculada — texto repetido também no tooltip do "ID da turma", por pedido
do usuário); "Schema de notas" e "Nome da turma" também viraram tooltip;
"ID da turma" perdeu a legenda de formato fixa e ganhou tooltip completo;
os dois ícones do cabeçalho "Turmas cadastradas" (uso do filtro de ano +
aviso sobre o botão Editar) foram colocados dentro do próprio `<h2>` pra
herdar a cor de contraste do card automaticamente. Cinco legendas antigas,
sem uso mais, foram só removidas (sem virar tooltip).

**Redesenho do mini-card de turma** (não fazia parte do pedido original de
migração — foi um ajuste à parte, pedido pelo usuário depois de notar o
card alto demais com espaço em branco): de ~5 linhas de texto (nome +
4 badges + linha de ID + linha de séries) pra 3 linhas — nome / badges de
Ano+Turno+Séries (uma badge por série, não uma badge só concatenada) /
badge de Alunos + link "Detalhes ▾" expansível (Schema + ID, escondidos
por padrão). Botão "Editar" também passou a ficar centralizado
verticalmente no card, não colado no topo.

**Três bugs de contraste encontrados e corrigidos, todos depois de já
publicado** (o usuário testou em produção e voltou com prints/descrição):

1. **Botões "Adicionar"/"Editar" (`.btn.outline`) pouco visíveis em
   paletas claras**: usavam `var(--brand)` na borda/texto sem nenhum
   fundo — em paletas como a antiga "Branco" (e a atual Tan, mais tarde),
   isso soma quase invisível contra o card. Corrigido dando um fundo fixo
   com os tokens de badge do próprio sistema (`--brand-faded`/
   `--brand-text`/`--brand-border`, com as variantes `-d` no tema escuro)
   — contraste garantido em qualquer paleta. Motivou a seção 1.7 do guia
   (regra geral: nunca `--brand`/`--brand-d` puro em texto).
2. **Link "Detalhes ▾" ilegível em paletas escuras no tema escuro**: tinha
   sido colorido com `var(--brand-d)` — em paletas onde essa cor já é
   escura de propósito (Verde, Vermelho, Azul Escuro), texto escuro sobre
   card também escuro. Corrigido trocando pra `var(--brand-text-d)`.
3. **Texto do painel "Detalhes" fixo em branco, invisível no tema claro**:
   a regra `.card-destaque .help { color: ... var(--dest-fg) ... }`
   (pensada pro contador do cabeçalho, que fica direto sobre o fundo
   colorido) vazava pro texto de dentro do `.item` — um card neutro, não
   fica sobre o fundo de marca. Corrigido com uma exceção
   `.card-destaque .item .help { color: var(--muted); }`. Motivou a
   **Parte 4 nova do guia** (card de destaque com lista de sub-cards
   dentro — botão e texto de dentro dos itens não podem herdar as regras
   pensadas pro fundo colorido direto).

**Achado à parte, sem relação com a migração**: o hover de
`.btn.ghost`/`.btn.secondary` no tema escuro tinha roxo escrito na mão
(`rgba(124,58,237,.18)` + `#c4b5fd`) em vez de `var(--brand-faded-d)`/
`var(--brand-text-d)` — bug legado, só visível ao trocar pra uma paleta
diferente de roxo. Corrigido.

## Guia `guia-migracao-contraste-theme-colors.md` — atualizado com o rollout

- **Seção 1.6** (nova): como decidir qual card vira `.card-destaque`
  quando a página tem dois lado a lado.
- **Seção 1.7** (nova): nunca usar `--brand`/`--brand-d` puro em texto —
  usar `--brand-text`/`--brand-text-d`, com o exemplo do bug do "Detalhes
  ▾" documentado.
- **Seção 1.8** (nova): registra a troca Branco→Tan e o `--brand-fg` em
  `theme-colors.js` (detalhe abaixo), incluindo o cuidado com o corte de
  luminância (`> 0.5`) ao escolher o tom exato de uma paleta clara nova.
- **PARTE 4 do guia** (nova, paralela à Parte 3 que já existia pra
  tabelas): card de destaque com uma **lista de sub-cards** dentro — não
  deixar o override de botão genérico alcançar botões que já estão em
  fundo neutro (dentro do item), e sempre criar a exceção pra `--dest-fg`
  não vazar pro texto de dentro dos itens.
- Novo aviso no topo do guia: cor de marca escrita na mão em CSS legado
  (o achado do hover roxo) pode ser confundida com bug da migração — grep
  sugerido antes de começar numa página nova.
- Tabela de status (fim do guia) atualizada com `cadastro-turmas.html` e
  uma 4ª coluna (Parte 4). Nenhuma pendência conhecida no módulo de atas
  no momento.

## `theme-colors.js` — paleta Branco trocada por Tan, `--brand-fg` novo

A pedido do usuário: a paleta `white` (adicionada originalmente só pra
fechar 2 fileiras de 5 cores, nunca teve uma cor real que coubesse) foi
removida. Motivo pra tirar: branco é redundante — tema claro já dá
branco+cinza (via a paleta "Cinza"), tema escuro já dá preto+cinza do
mesmo jeito.

**Substituta: `tan`** (`#dbc09c`) — primeira paleta **genuinamente clara e
colorida** do sistema. Todas as outras, mesmo as de nome "claro" (ex.:
"gold"/Amarelo, que na real é um mostarda escuro, piada do próprio
usuário), são tons escondidamente escuros, escolhidos assim de propósito
pra combinar com texto branco fixo nos lugares que ainda não calculavam
contraste. Processo de escolha da cor: usuário sugeriu Bege ou Tan, Claude
recomendou Tan (Bege ficava parecido demais com o Branco removido); tom
exato ajustado de `#d2b48c` (clássico, luminância `0.482`) pra `#dbc09c`
(luminância `0.552`) — o clássico ficava **abaixo** do corte de `0.5` do
cálculo de contraste, o que faria o sistema escolher texto branco bem na
cor que devia provar que dá pra usar texto escuro.

**Duas mudanças de mecanismo, não só a paleta:**
- `calcularLuminancia()` passou a aceitar **hex** além de `rgb(...)`
  (antes só lia `getComputedStyle(...).backgroundColor`, que o navegador
  sempre devolve em `rgb()`).
- Nova custom property **`--brand-fg`**, calculada dentro do próprio
  `apply()`: mesmo cálculo do `--dest-fg` do card de destaque, mas
  **genérico pra qualquer botão com preenchimento sólido de marca**, não
  só o card — decisão do usuário, pra reaproveitar o mesmo cálculo em vez
  de duplicar lógica. `apply()` já conhece o valor cru do `--brand`/
  `--brand-d` ativo, então computa ali mesmo, sem precisar ler nenhum
  elemento do DOM.

**Pendência que essa mudança abriu — parcialmente resolvida**: botões
sólidos de marca com `color:#fff` fixo ficariam ilegíveis no Tan. Um chat
paralelo aplicou `var(--brand-fg, #fff)` em `components.css` (3 regras) e
nos overrides locais das páginas do módulo de atas (guia 1.8.1; o fix
global sozinho não bastou porque o `<style>` da página carrega depois e
vence). **Falta o resto do sistema** (pendência 7).

## `perfil.html` — bug achado e corrigido: mapa de cores duplicado

Depois do deploy do `theme-colors.js` novo, o usuário reportou que o nome
"Tan" já aparecia certo e a cor já funcionava nas outras páginas, mas a
bolinha de pré-visualização em `perfil.html` continuava roxa (a cor
default). Causa: `perfil.html` mantinha um objeto `swatchColors` **próprio,
no JS da página**, com o hex de cada paleta copiado à mão — mesmo padrão
de duplicação da função de contraste (Parte 1 do guia), só que pra cor em
vez de contraste. `tan` não estava nesse mapa (só existia em
`theme-colors.js`), então caía no fallback `|| '#7c3aed'`. Corrigido
removendo o mapa duplicado e lendo o hex direto de
`ThemeColors.palettes[key]['--brand']` — a fonte real, já existente,
elimina a necessidade de tocar em `perfil.html` toda vez que uma paleta for
adicionada/removida em `theme-colors.js`.

## Arquivos entregues nesta rodada (Parte 6)

1. **`pesquisa-ata.html`** — migrado pro contraste central + tooltip (6
   ícones); bug de tokens do balão corrigido depois de já publicado.
2. **`cadastro-turmas.html`** — migrado do zero (contraste + tooltip, 6
   ícones + card-destaque escolhido em layout lado a lado); mini-card de
   turma redesenhado (3 linhas + "Detalhes" expansível); 3 bugs de
   contraste corrigidos depois de já publicado.
3. **`guia-migracao-contraste-theme-colors.md`** — seções 1.6/1.7/1.8 e
   Parte 4 novas, aviso sobre cor legada, tabela de status atualizada.
4. **`theme-colors.js`** — paleta `white` removida, `tan` adicionada;
   `calcularLuminancia()` aceita hex; nova custom property `--brand-fg`.
5. **`perfil.html`** — removido o mapa de cores duplicado (`swatchColors`),
   agora lê o hex direto de `ThemeColors.palettes`.

`gestao-atas.html` e `historico-aluno.html` não precisaram de mudança
nesta rodada (já confirmados migrados, "aqui ou no chat paralelo", por
palavras do usuário — não reabertos/relidos neste chat). Nenhuma mudança
em `cadastro-atas.html`, `schema_ata.html`, `admin_escolas.html`,
`atas.html` (hub), `identidade-aluno.js`, `firestore.rules`,
`db.firebase.js`, nem nas Cloudflare Functions nesta rodada.

---

# Pendências consolidadas (Parte 1 + Parte 2 + Parte 3 + Parte 4 + Parte 5 + Parte 6, reconciliadas)

1. **Cache local mostrando dado desatualizado** (era a pendência 3 no v7)
   — sem urgência confirmada, herdado de rodadas anteriores. Nota:
   `historico-aluno.html` deixou de ter esse risco — não usa mais
   `localStorage` pra dado nenhum (ver Parte 3).
2. ~~**Centralizar cálculo de contraste no `theme-colors.js`**~~ (era a
   pendência 5 no v7) — **fechada na Parte 6**: os cinco arquivos do
   módulo de atas (`historico-aluno.html`, `gestao-atas.html`,
   `pesquisa-ata.html`, `schema_ata.html`, `cadastro-turmas.html`) estão
   migrados pro `ThemeColors.ajustarContraste()` central. Ver tabela de
   status no fim de `guia-migracao-contraste-theme-colors.md` pro detalhe
   por página.
3. **Limite de scans + reconstrução de PDF pro download em
   `cadastro-atas.html`** (era a pendência 7 no v7) — **sendo produzida
   num chat paralelo** no momento deste handoff; não tocar aqui sem
   confirmar com o usuário, pra não misturar dois chats na mesma
   pendência. Achados já levantados pelo usuário: falta opção de baixar o
   PDF original (hoje só dá pra ver as imagens web) e falta indicativo na
   interface de que aquelas imagens vieram de um PDF; limite de "50"
   considerado irreal, decisão de trocar por "8" (igual ao módulo
   `ano-ativo`), comportamento no limite em si ainda não testado por
   cautela com a API do Cloudinary.
4. **Ícone ⓘ com tooltip, sistema-inteiro** (era a pendência 9 no v7,
   agora ampliada) — **módulo de atas 100% coberto na Parte 6**
   (`historico-aluno.html`, `gestao-atas.html`, `pesquisa-ata.html`,
   `schema_ata.html`, `cadastro-turmas.html` — todas com tooltip). **Segue
   aberta pro resto do sistema**, fora do módulo de atas — sem página
   identificada ainda pra ser a próxima. **Antes de aplicar em outra
   página, ler `guia-migracao-contraste-theme-colors.md` (Parte 2)** — tem
   o CSS/HTML/JS prontos pra copiar, e a seção 2.1.1 (checar tokens da
   página de destino antes de colar — já pegou um bug de produção em
   `pesquisa-ata.html`).
5. **Destaque de card via `theme-colors.js`** (nova, Parte 5) — **módulo
   de atas 100% coberto na Parte 6**: todas as 5 páginas do módulo têm
   pelo menos 1 `.card-destaque` (incluindo 2 casos criados do zero em
   `schema_ata.html` e 1 em `cadastro-turmas.html`, esse último com um
   layout de dois cards lado a lado — ver seção 1.6 do guia sobre como
   decidir qual card vira o destaque nesse caso). **Segue aberta pro resto
   do sistema**, mesma situação do item 4.
6. **`identidade-aluno.js`** (era a pendência 11 no v7): continua
   parcialmente auditado (v2, "sem catálogo em memória",
   `buscarAtasPorId`/`buscarAtasPorNome`/`normalizarAtas`/API pública, só
   as partes relevantes pro redesenho de `historico-aluno.html`).
   `garantirIdsESistemaParaTurma()` e as outras funções batch usadas por
   `cadastro-atas.html` (`vincularAtasExplicito`, `criarAtasBatch`,
   `recalcularUltimoAnoRegistroBatch`) seguem não auditadas — **decisão
   do usuário na Parte 4, reafirmada na Parte 5: não auditar de forma
   preventiva** (arquivo grande, risco de inflar o handoff e divergir
   entre chats; baixa prioridade). Quando alguma mudança precisar mexer
   nele, o usuário manda o arquivo direto no chat que for fazer a
   mudança.
7. **Receita `--brand-fg` (guia 1.8.1) + grep de mapa de hex (guia 1.11)
   fora do módulo de atas** (nova, Parte 6) — `theme-colors.js` calcula
   `--brand-fg`; a adoção em botão sólido de marca **já foi feita no módulo
   de atas** (por um chat paralelo, via `components.css` + overrides locais
   por página — detalhe no guia 1.8.1, não reauditado aqui). **Falta rodar a
   receita nas páginas fora do módulo** antes de considerar o Tan seguro em
   produção; nenhuma página fora do módulo foi identificada ainda. É a
   **única pendência aberta do guia**.

## Fechado, não é mais pendência

- ~~Pendências abertas do chat paralelo sobre `.btn.outline:hover` em `cadastro-turmas.html`, `.btn-gray:hover` local em `cadastro-atas.html`, e as seções 1.9/1.10 do guia nas outras páginas~~ — **fechadas por decisão do usuário (Parte 6)**: botões conferidos e ok; a única página com aviso dentro de card em vez de toast é `schema_ata.html`, que não recebe a adequação.

- ~~Bug do scan órfão no Cloudinary~~ — resolvido (Parte 1). **Teste/deploy
  confirmado pelo usuário na Parte 4** (era a pendência 4) — sem detalhe
  de como foi testado, só a confirmação verbal.
- ~~Schema fixo na tabela/PDF de `pesquisa-ata.html`~~ — resolvido (Parte
  2).
- ~~Painel "Inserir notas" legado em `pesquisa-ata.html`~~ — removido por
  completo (Parte 2). Resolve também, por eliminação, as preocupações de
  arquitetura que existiam sobre essa função (escrita sem `merge`, não
  atualizava `DB.atas`/`DB.matriculas`).
- ~~Cor pastel no tema escuro~~ — resolvido em `theme-colors.js` (Parte
  2). Não confundir com a pendência 2 (era a pendência 5 no v7,
  centralizar o cálculo de contraste), que é outra coisa e continua
  aberta.
- ~~Checkbox "Exibir atas inativas"~~ — removido (Parte 2).
- ~~Botão "Pesquisar" invisível no tema escuro~~ — resolvido (Parte 2).
- ~~PDF de `pesquisa-ata.html` (orientação, identificação da escola,
  design, nome de arquivo)~~ — resolvido e confirmado pelo usuário (Parte
  2). A largura das colunas de matéria (antiga pendência 12) foi
  confirmada como resolvida pelo usuário na Parte 4, sem precisar de
  ajuste — ver o bug real diferente que apareceu no lugar (cabeçalho
  "Resultado"), logo abaixo.
- ~~Teste real do merge de `atasSchemas`~~ (3 casos: novo, idêntico,
  conflito no `padrao`) — **testado e confirmado pelo usuário** (Parte 3,
  início da sessão): merge automático em caso idêntico, checkbox +
  decisão do gestor em caso de conflito, inclusive no campo `padrao`.
  Funcionando normalmente.
- ~~RBAC ausente em `cadastro-turmas.html`~~ (acessível via URL por
  `user` comum) — corrigido (Parte 3): bloqueia `user`, libera
  admin+gestor, redireciona pro hub.
- ~~RBAC inconsistente no hub `atas.html`~~ — corrigido (Parte 3): card de
  "cadastro de turmas" sem trava nenhuma, e os outros dois cards restritos
  excluindo gestor incorretamente. Também corrigida a corrida de 1–1.5s
  onde os cards ficavam clicáveis antes da checagem de auth terminar.
- ~~Loading em `cadastro-turmas.html` nunca confirmado~~ (era a
  pendência 13 na numeração do v6) — auditado com o `loading-overlay.js`
  real em mãos (Parte 3): a implementação feita "por analogia" pelo chat
  paralelo está correta, bate certinho com a API. Fechada.
- ~~Pendências 1 e 2 (fallback embutido de schema)~~ — fechadas por
  decisão/confirmação do usuário (Parte 4): é impossível existir turma
  sem `schemaSnapshot` pelo fluxo normal do sistema, então o fallback em
  `cadastro-atas.html`/`cadastro-turmas.html`/`pesquisa-ata.html` é
  código morto. Nenhum arquivo alterado.
- ~~Pendência 6(b) (`cadastro-turmas` editando turma cujo schema foi
  excluído)~~ — corrigido e testado nesta rodada (Parte 4): schema
  travado na edição (nunca mais lido/regravado do select, sempre copiado
  do documento original), payload preserva `schemaId`/`schemaSnapshot`/
  `aba`/`origemArquivo` originais mesmo se o ID da turma mudar, hard
  refresh só na edição com toast de confirmação sobrevivendo ao reload.
  40 testes em jsdom com a página inteira carregada e cliques reais.
  **Usuário testou manualmente e aprovou.**
- ~~Pendência 6(c) (`schema_ata` como gestor não-admin-global)~~ —
  usuário confirmou nesta rodada (Parte 4) que já testou há tempos:
  gestor consegue tudo, exceto excluir o schema padrão.
- ~~Pendência 8 (CSV export em `pesquisa-ata.html`)~~ — implementado
  nesta rodada (Parte 4): colunas pelo schema real da turma, mesmo
  formato de `pesquisa-ano-ativo.html`. 12 testes em jsdom. **Sem teste
  manual do usuário** (não aberto no Excel/LibreOffice de verdade).
- ~~Pendência 10 (risco em `cadastro-atas.html`: editar sem atualizar)~~
  — corrigido nesta rodada (Parte 4): `salvarNoBanco()` bloqueia com
  aluno em edição ou formulário com conteúdo não salvo. 20 testes em
  jsdom. **Usuário testou manualmente e aprovou.**
- ~~Pendência 12 (PDF de `pesquisa-ata.html`, largura das colunas de
  matéria, 44pt/80pt)~~ — usuário confirmou nesta rodada (Parte 4) que
  está resolvido, sem necessidade de ajuste. **Achado um bug real
  diferente no caminho** (cabeçalho "Resultado" quebrando em 2 linhas,
  causa raiz no `cellPadding` de `columnStyles` sendo ignorado no
  cabeçalho pelo `jspdf-autotable`) — corrigido e validado contra a
  biblioteca real. Sem teste visual do PDF pelo usuário.
- ~~Pendência 13 (nomes sem escape em `innerHTML`), só em
  `pesquisa-ata.html`~~ — corrigido nesta rodada (Parte 4) em 3 pontos
  (`renderAlunos`, `renderListaTurmas`, `selecionarTurma`). 11 testes em
  jsdom, reproduzindo o bug no arquivo original antes de confirmar o
  fix. **`cadastro-atas.html` continua com a decisão de não mexer**
  (usuário disse "não precisa", v7) — não é mais tratada como a mesma
  pendência das duas páginas juntas.
- ~~Pendência 14 (`carregarCatalogoNomes()` falha em silêncio em
  `pesquisa-ata.html`)~~ — implementado nesta rodada (Parte 4): aviso
  `warn` no `catch` existente. **Ressalva não resolvida**: o texto do
  aviso dá a entender que um aluno específico foi identificado como
  desatualizado, o que é impreciso — o aviso na verdade significa "não
  foi possível confirmar nomes de ninguém". Usuário entendeu a diferença
  discutida em conversa, mas não confirmou trocar o texto — o texto
  impreciso é o que está no arquivo entregue. Vale revisitar.
- **Busca "contém" (parte do nome) em `historico-aluno.html`** — não é
  pendência, é decisão fechada: usuário avaliou as alternativas (tokens
  de palavra, tokens de prefixo, serviço de busca de terceiro, busca
  ampla opt-in) e decidiu manter só busca por prefixo, mitigando com o
  ícone ⓘ (pendência 9, era a pendência 17 no v7) em vez de mudar a
  arquitetura de dados.
- **Unificar `--brand-faded-d`/`--brand-border-d`/`--brand-text-d`** —
  não é pendência, é decisão fechada: o usuário decidiu não fazer.
- ~~Pendência 6(a)/3 (escola nova cria `padrao` junto)~~ — usuário
  confirmou na Parte 5: já testado e aprovado; o teste roda em
  `schema_ata.html`, não em `cadastro-turmas.html`.
- ~~Pendência 15/7 (nota de propriedade de arquivos, `admin_escolas.html`/
  `schema_ata.html`)~~ — usuário confirmou na Parte 5: o chat que fez as
  mudanças de schema auditou a página duas vezes a pedido do usuário, sem
  achar erros — só não tinha detalhado isso no handoff anterior.
- ~~Pendência 16/8 (bug do botão "Ver turma" em `historico-aluno.html`)~~
  — implementado na Parte 5: card inline com a tabela completa da turma,
  sem navegação, renderizando dado já em memória. **Usuário testou
  manualmente e aprovou.**
- ~~Pendência 17/9 (ícone ⓘ no campo de busca de `historico-aluno.html`)~~
  — implementado e aprovado na Parte 5. Deixa de ser uma pendência
  isolada: passa a fazer parte da pendência 4 consolidada (tooltip
  sistema-inteiro), que continua aberta pro resto das páginas.

---

## Toasts, nota de comportamento e "não fazer nesse formato"

- O guia `guia-toasts.md` está aplicado em **4 páginas**:
  `cadastro-aluno-ativo.html` (original, base do guia),
  `cadastro-atas.html`, `cadastro-turmas.html` e `pesquisa-ata.html`
  (essas 3 últimas, feitas no chat da v6). `gestao-atas.html` já usava
  `_confirmModal()`/toasts próprios antes desta rodada — só passou a
  *usar* o `_confirmModal()` na ação de apagar turmas, que antes usava
  `confirm()` nativo (Parte 3).
- Tela de loading (`loading-overlay.js`, `Loading.esconder()` sempre no
  `finally` do boot) agora confirmada correta em **4 páginas**:
  `cadastro-atas.html` (original), `cadastro-turmas.html` (auditada e
  fechada nesta rodada — era a antiga pendência 13 do v6),
  `gestao-atas.html` (adicionada nesta rodada) e `historico-aluno.html`
  (já tinha o `<script>`, ganhou o `try/finally` que faltava nesta
  rodada).
- A nota de comportamento sobre `schema_ata.html` (loading infinito é
  proposital, não esconder atrás de um `try/catch` genérico) segue
  valendo — não foi tocada em nenhuma rodada até agora.
- **Reforçando a lição de processo, agora com mais exemplos** (a
  regressão fantasma do merge de schemas na v5.1; a falta de auditoria
  cruzada sobre o que o chat paralelo fez em `admin_escolas.html`/
  `schema_ata.html`; o crash de `historico-aluno.html` que só apareceu
  depois de um `try/catch` deixar de esconder o erro real — um sintoma
  "resolvido" às vezes só estava mascarado, não corrigido; e agora, na
  Parte 4, um caso na direção contrária ao das outras: um teste
  **calculado no papel deu certo, mas o mesmo cálculo rodado contra a
  biblioteca de verdade (`jspdf-autotable`) mostrou que o cabeçalho
  "Resultado" continuava quebrando linha** — a causa real só apareceu
  rodando a coisa de verdade, não fazendo conta em cima da fórmula. E
  ainda na Parte 4, uma mensagem de toast implementada corretamente do
  ponto de vista técnico, mas com **redação que superestima o que o
  código de fato detectou** — dizer "este aluno pode estar com nome
  desatualizado" quando o código só sabe dizer "não consegui confirmar
  nome de ninguém" é tecnicamente "funciona", mas engana quem lê):
  sempre que um chat relatar "já fiz X" sobre um arquivo que outro chat
  não vai abrir, o chat que não abriu deveria marcar isso como **não
  confirmado**, não como fechado — mesmo que o relato pareça coerente. E
  sempre que um `try/catch` genérico for adicionado pra parar um sintoma
  (tela travada, por exemplo), vale perguntar se o erro que ele passou a
  engolir já foi de fato entendido, não só silenciado. Reforço novo desta
  rodada: sempre que possível, **testar contra a implementação real**
  (a biblioteca, a página inteira carregada, o clique de verdade) em vez
  de só validar a lógica isolada ou uma conta no papel — e revisar o
  **texto exato** de qualquer mensagem nova pro usuário, não só se ela
  aparece na hora certa.

