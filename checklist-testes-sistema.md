# Checklist de Testes — Sistema Escolar (pré-auditoria) — v7

> v1 tinha o levantamento inicial. v2 corrigiu escopo/contagem/RBAC/localStorage.
> v3 refletia a primeira rodada real de testes. v4 refletia a rodada de fixes
> em `cadastro_usuario.html` e `perfil.html`. v5 refletia a rodada de fixes em
> `cadastro-aluno-ativo.html`. v6 refletia a primeira rodada de testes do
> **módulo Admin**: `admin.html` e `schema_ata.html` testados sem erros,
> `admin_escolas.html` com 2 bugs achados e corrigidos, `cadastro_admin.html`
> com o bug já conhecido confirmado (email não atualizava na tela), e
> `idaluno.html` testado visualmente sem erros mas pendente de revisão de
> código. Esta **v7** reflete a investigação do bug de email do
> `cadastro_admin.html`: causa raiz achada em `auth.firebase.js` (corrigido —
> bug #3 sai da lista e vai pra **✅ Fixes aplicados**) e, como efeito
> colateral da investigação, uma **falha grave de segurança** achada nas
> Firestore Security Rules (escalonamento de privilégio via `users.update`,
> já corrigida) e uma **falha de exclusão** achada em `Auth.deleteUser()`
> (contas "excluídas" pelo painel continuavam válidas no Firebase
> Authentication — mitigada por ora, fix definitivo fica pendente).

---

## 🐛 Bugs encontrados (a corrigir)

### `perfil.html`
1. **Troca de email não chega no email antigo.** Ao trocar o email, a
   confirmação diz que o novo email será validado antes da troca no banco —
   mas o código de confirmação não chegou no primeiro email testado.
   Testando com um segundo email, chegou normalmente. Pode ser
   caso isolado do primeiro endereço — testar de novo com mais 1-2 emails
   diferentes antes de tratar como bug de código.
2. **Código de confirmação sempre cai no spam** — provável configuração de
   remetente (SPF/DKIM/domínio), não bug de página. Investigar depois, à
   parte, se decidir que vale a pena.

*(sem bugs abertos no momento — ver **✅ Fixes aplicados** pro que foi
resolvido nesta rodada)*

---

## ✅ Decisões já tomadas (não são mais perguntas em aberto)

- **`admin_backup.html` gerar backup a partir do cache local é inadmissível.**
  Decidido: precisa reescrever para ler direto do Firestore no momento do
  export. O teste de comparação backup-vs-Firestore-ao-vivo da v2 fica
  redundante — vou aguardar o fix pra reescrever a função de export.
- **`oldcadastro-funcionario.html` confirmado sem uso** — órfã, pode ser
  removida quando fizer sentido (não é urgente).

---

## 🆕 Achado novo nesta rodada

- **`config.html` (hub de Configurações) parece órfã/sem uso** — você marcou
  como tal ao preencher a lista. Antes de remover, vale confirmar: nenhuma
  outra página linka pra ela? Ela deveria estar acessível a partir de algum
  lugar (`index.html`?) e simplesmente não está, ou o módulo inteiro ficou
  obsoleto?

---

## ⏳ Pendências (ainda não testado)

- **🔴 Gestão real de contas no Firebase Authentication (prioridade alta).**
  Achado ao investigar o bug de email: `Auth.deleteUser(uid)` (usado pelo
  botão Excluir/Reprovar em `cadastro_admin.html`) só apaga o documento em
  `users/{uid}` no Firestore — **nunca apagou a conta no Firebase
  Authentication**. Resultado: uma conta "excluída" pelo painel continua
  logando normalmente pra sempre (inclusive redefinindo senha via "esqueci
  minha senha"), só que com sessão caindo pra `role: 'user'` por falta de
  perfil no Firestore — a não ser que o doc seja recriado depois, aí ela
  volta a ter o role antigo. Confirmado em produção: existiam contas de
  teste antigas, já "excluídas" há muito tempo, ainda ativas no
  Authentication, uma delas inclusive de admin.
  **Mitigação atual:** o wipe do banco planejado pro fim da fase de testes
  apaga os documentos do Firestore, mas **não apaga nada do Authentication**
  — contas fantasmas de teste continuariam válidas pra login mesmo depois do
  wipe, a não ser que sejam apagadas manualmente pelo Console
  (Authentication → Users) antes ou depois do wipe.
  **Fix definitivo (combinado, ainda não implementado):** trocar
  `Auth.deleteUser()` por uma Cloud Function com Admin SDK
  (`admin.auth().deleteUser(uid)` + apagar o doc do Firestore), chamada pelo
  botão de excluir em vez do client SDK direto — só assim a exclusão apaga
  dos dois lugares de uma vez. Fica pendente pra quando a fase de testes
  acabar (hoje dá pra contornar apagando manualmente pelo Console quando
  necessário).
- **Observações menores nas Firestore Security Rules** (achadas na mesma
  revisão que corrigiu o `users.update` — nenhuma é urgente, nenhuma foi
  mexida ainda):
  - `schools/{schoolId}` tem `allow read: if true` — leitura 100% pública,
    sem login. Provavelmente intencional (dropdown de escola no
    autocadastro precisa disso antes do login), mas vale confirmar que os
    docs de `schools` nunca vão guardar campo sensível, já que hoje
    qualquer um lê tudo deles.
  - `changeRequests.create` não valida que o campo `requestedBy` bate com
    `request.auth.uid` — um admin de escola logado consegue gravar uma
    solicitação alegando ter sido pedida por outra pessoa. Baixo risco,
    mas polui auditoria.
  - Funções `isPendingSignup()` e `resource_uid()` no arquivo de Rules são
    definidas mas nunca chamadas — a regra de `create` reimplementa a mesma
    lógica inline. Código morto, sem risco, só limpeza futura.
- **Restante do módulo Admin** (`admin_backup.html`, `idaluno.html`) —
  `admin.html`, `admin_escolas.html` e `schema_ata.html` já testados nesta
  rodada (ver detalhes abaixo). `admin_backup.html` aguarda o fix combinado
  (reescrever export pra ler do Firestore ao vivo). `idaluno.html` passou no
  teste visual, mas por ser a página mais complexa do módulo, ainda quer uma
  revisão de código à parte antes de dar como concluída — sem previsão
  definida ainda.
- **`historico_auto.html`** e **`schema_ch.html`** — aguardando os fixes que
  você já está desenvolvendo (mencionado antes de começar os testes).
- **Firestore Security Rules** — ainda não escritas/revisadas. Você vai me
  pedir pra fazer as regras adaptadas ao RBAC do sistema — combinado,
  fica pra quando você tiver o próximo token do GitHub.
- **Levantamento completo de localStorage por página** — vou refazer a
  varredura (mais a fundo dessa vez, já mirando os bugs de cache que
  apareceram no teste, como o do email em `cadastro_admin.html`) assim que
  tiver acesso ao repo de novo.
- **Checagem de erros no console** no fluxo crítico (login → cadastro →
  pesquisa → exportação) — não testado ainda.

---

## Testes pulados intencionalmente (sem necessidade de repetir)

- `pesquisa-ano-ativo.html` e `readmitir-aluno.html` — já testados logo após
  os fixes anteriores; cobertura considerada suficiente por você.

---

## ✅ Fixes aplicados

### Rodada de hoje — `auth.firebase.js` + `firestore.rules`

- **Bug #3 (`cadastro_admin.html`: email não atualiza na tela) — corrigido
  na raiz.** Não era bug da página — `cadastro_admin.html` só exibe o que
  `Auth.listUsers()` devolve, sem cache próprio. A causa real: o sistema
  guarda o email em dois lugares (Firebase Auth, que é o que de fato loga a
  pessoa, e o campo `email` do doc `users/{uid}` no Firestore, que é o que a
  tela do admin lê) e nada sincronizava um com o outro depois da troca.
  `perfil.html` troca o email só via `verifyBeforeUpdateEmail()`, que
  atualiza o Firebase Auth de forma assíncrona (só depois que o usuário
  clica no link de confirmação, fora da sessão do navegador) — e nunca
  escreve no Firestore. Corrigido em `loadProfile()` (roda a cada login/
  refresh de sessão): compara o email atual do Firebase Auth com o que está
  salvo no Firestore e, se divergem, regrava o Firestore com o valor
  correto. Só sincroniza se o doc já existir (`snap.exists`), pra não tentar
  `update` num perfil que ainda está sendo criado (corrida possível durante
  o cadastro novo em `cadastro_usuario.html` — inofensiva antes do fix,
  gerava só um warning no console).
  **Efeito colateral aceito, sem fix:** a sincronização só acontece no
  próximo login depois da confirmação, não no instante em que o link é
  clicado (não tem como — o navegador nem está aberto nesse momento).
  Considerado suficiente; Cloud Function pra sync instantâneo foi avaliada e
  descartada por ser desproporcional pro sistema.
- **🔴 Falha de segurança corrigida nas Firestore Rules — escalonamento de
  privilégio via `users.update`.** Achada só de revisar as Rules durante a
  investigação acima, sem relação direta com o bug de email. A regra de
  `update` em `users/{uid}` deixava o próprio usuário alterar **qualquer**
  campo do próprio documento, incluindo `role` e `schoolId` — ou seja,
  qualquer conta (mesmo uma `pending` recém-criada, nunca aprovada) podia se
  promover a admin global sozinha, direto pelo Firestore, sem passar pelo
  app nem precisar de nenhum bug de tela (bastava um `update()` chamado pelo
  console do navegador). Corrigido: usuário comum agora só edita o próprio
  doc se `role` e `schoolId` do documento novo forem idênticos aos já
  salvos — só admin altera esses dois campos. Resto do doc (nome, foto etc.)
  continua editável pelo próprio dono normalmente.
- **Achado, mas não corrigido nesta rodada:** `Auth.deleteUser()` só apaga o
  doc do Firestore, nunca a conta no Firebase Authentication — contas
  "excluídas" continuam válidas pra login. Ver pendência **🔴 Gestão real de
  contas no Firebase Authentication** acima.

**Arquivos entregues nessa rodada:** `auth.firebase.js`, `firestore.rules`.

---

### Rodada anterior — `admin_escolas.html`

- **`ADMIN` aparecendo como escola nas listagens — corrigido.** O doc
  `ADMIN` no Firestore (marcador de admin global, não é uma escola de
  verdade) estava sendo listado normalmente por `fetchSchools()` — entrava
  na tabela e contava no "X escola(s)". O filtro de `ADMIN` que já existia
  no select do `cadastro_usuario.html` não é reaproveitado aqui, por ser
  outra tela/função — corrigido filtrando na fonte (`fetchSchools()`), pra
  cobrir tabela, contagem e qualquer outro uso da função.
- **Solicitações de alteração não apareciam pro ADMIN global — corrigido
  (causa raiz + índice + regra de segurança).** A gravação (`btnSendReq`)
  sempre gravou certo no Firestore, em `schools/{sid}/changeRequests`. O
  problema era a leitura: `refreshApprovals()` lia de uma chave de
  localStorage (`auth_school_change_requests_v1`) que nunca era escrita por
  nada no sistema — leitura e escrita apontando pra lugares diferentes.
  Reescrito pra ler do Firestore via `collectionGroup('changeRequests')`,
  que é o mesmo lugar onde já era gravado. Precisou de mais dois ajustes de
  infra, fora do código: (1) regra do Firestore em escopo de **collection
  group** — a regra aninhada em `schools/{schoolId}/changeRequests` só vale
  pra leitura de uma escola por vez, então foi somada `match
  /{path=**}/changeRequests/{docId}` fora do bloco de `schools`; (2) um
  índice de campo único (`changeRequests`/`status`) com exceção de escopo
  "grupo de coleção" habilitada no console do Firestore, exigido pela
  própria query.
- **Botões Aprovar/Reprovar sem funcionalidade — corrigido.** Existiam no
  HTML mas não tinham nenhum listener no script — clicar não fazia nada.
  Implementados: Aprovar aplica os campos de `changes` (`name`/
  `displayName`) diretamente no doc da escola e marca a solicitação como
  `approved`; Reprovar só marca como `rejected` (com confirmação antes).
- **Solicitação mandando os dois campos mesmo editando só um —
  corrigido.** O formulário de solicitação já vem pré-preenchido com os
  valores atuais de `name`/`displayName`, então o envio sempre incluía os
  dois no `changes`, mesmo quando só um foi alterado. Corrigido pra
  comparar com o valor original e só incluir no `changes` (e por
  consequência na tela do ADMIN global) o que de fato mudou. Bônus: se
  nada for alterado, agora avisa "Nenhuma alteração para enviar" em vez de
  mandar uma solicitação vazia.
- **Legenda removida** do card de "Solicitações de alteração" a pedido.

**Testado e confirmado funcionando** (fluxo completo: solicitar edição como
admin restrito de escola → aparecer certo pro ADMIN global → aprovar →
refletir na escola).

**Arquivos entregues nessa rodada:** `admin_escolas.html`.

---

### Rodada anterior — `cadastro-aluno-ativo.html`

- **Naturalidade sem maiúsculo — corrigido.** O campo usa o mesmo
  autocomplete de cidade do endereço; um `.toUpperCase()` solto quebraria a
  seleção via dropdown (o valor voltaria pro texto salvo no banco assim que
  o usuário escolhesse uma sugestão). Adicionada uma opção `uppercase` na
  fábrica `criarAutocompleteCidade`, ativada só na instância de Naturalidade
  — o campo de Cidade do endereço não foi mexido, continua igual (alimentado
  por ViaCEP/autocomplete em texto normal, sem maiúsculo forçado).
- **NEE — especificidade não vinha marcada ao editar: causa raiz nº1
  (nomes de campo trocados) — corrigido.** Ao salvar, "Deficiência física"
  grava como `defFisica` e "Deficiência intelectual" como `defIntelectual`,
  mas o pré-preenchimento da edição lia `aluno.fisica`/`aluno.intelectual` —
  campos que não existem no documento salvo. "TEA" funcionava por
  coincidência, por não levar prefixo `def`. Corrigido o mapeamento pra usar
  os nomes reais salvos em vez de assumir que batiam com as chaves internas.
- **NEE — especificidade ainda não vinha marcada em Deficiência
  visual/auditiva: causa raiz nº2 (achada só depois do fix acima) —
  corrigido.** Depois do fix nº1, os checkboxes principais passaram a marcar
  certo, mas os rádios de subtipo (ex. "Baixa visão") continuavam com o
  círculo vazio — mesmo com o estilo de "selecionado" aplicado (linha
  destacada, badge preenchido). Causa: `_neeSelectSub` só adicionava a
  classe CSS `.selected` na linha, nunca setava `radio.checked = true` no
  input de verdade. Passava despercebido no uso normal porque um clique
  manual do usuário já marca o radio nativamente antes do `onchange`
  disparar — só a chamada programática do pré-preenchimento expunha o
  problema. Corrigido pra marcar o `.checked` de fato.
- **Bônus, achado no mesmo teste: badge de subtipo mostrando valor cru.**
  O badge mostrava `BAIXA_VISAO` em vez de "Baixa visão" — o
  pré-preenchimento passava o mesmo valor salvo como `value` e como
  `label` ao mesmo tempo. Criado um helper (`_neeSubLabel`) que busca o
  texto legível direto do radio correspondente no DOM, em vez de duplicar a
  lista de labels em outro lugar do código.

**Arquivos entregues nessa rodada:** `cadastro-aluno-ativo.html`.

---

### Duas rodadas atrás — `cadastro_usuario.html`, `perfil.html`, `theme-colors.js`

#### `cadastro_usuario.html`
- **Header reduzido implementado.** Ficou header inline na própria página
  (não usa `header-logic.js`/`#header-placeholder`) — decisão tomada depois
  de ver o `header-logic.js` real: o `runAuthGuard()` dele chama
  `Auth.requireAuth()` sem exceção pra páginas do `PAGES_NONE`, e você não
  quis abrir mão do auth guard no `index.html` só por causa disso. Então o
  header ficou estático, usando as classes/variáveis já existentes em
  `header.css` (sem duplicar CSS), só que sem chip e sem o botão "Voltar" —
  o link pra login já existe no corpo do card, então não ficou órfão.
- **Filtro do `ADMIN` no select de escola** — `ADMIN` não aparece mais como
  opção.
- **Select mostrando só `displayName`** — trocado `nome (ID)` por
  `sc.displayName || sc.name || sc.nome` (mesmo fallback usado no resto do
  sistema), sem o ID exposto no texto.

#### `perfil.html`
- **Migrado pro header padrão de verdade** — `<div id="header-placeholder">`
  + `header-logic.js` + `header.css`/`base.css`/`components.css`. Os scripts
  inline de tema e de chip de usuário/escola foram removidos (o
  `header-logic.js` já cobre isso), assim como o `Auth.requireAuth()` solto
  no topo da página.

#### `theme-colors.js` (não era bug do checklist, mas mexemos naquela rodada)
- Paleta **"Não Clique!!" (troll)** removida.
- Paleta **"Branco"** adicionada no lugar, pra não deixar o grid de cores
  vazio — segue o mesmo formato das outras 11 paletas (só `--brand*`, sem
  mexer em `--bg`/`--ink`). Uma ideia de "alto contraste" (fundo preto,
  texto branco/amarelo) foi tentada e depois revertida a pedido seu, por
  causar problemas no fluxo do sistema que não existem no sistema de
  referência (a faculdade).

**Arquivos entregues nessa rodada:** `cadastro_usuario.html`, `perfil.html`,
`theme-colors.js`.

