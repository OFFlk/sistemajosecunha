# Checklist de Testes — Sistema Escolar (pré-auditoria) — v5

> v1 tinha o levantamento inicial. v2 corrigiu escopo/contagem/RBAC/localStorage.
> v3 refletia a primeira rodada real de testes. v4 refletia a rodada de fixes
> em `cadastro_usuario.html` e `perfil.html`. Esta v5 reflete a rodada de fixes
> em `cadastro-aluno-ativo.html` (itens 4 e 5 da lista de bugs) — saíram da
> lista de bugs e foram pra aba **✅ Fixes aplicados**, no final do arquivo,
> com o que foi feito e as decisões tomadas em cada um.

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

### `cadastro_admin.html`
3. **Email do usuário não atualiza na tela após troca.** Nome atualiza
   normalmente, mas o email continua mostrando o valor antigo mesmo após o
   usuário já conseguir logar com o novo. Suspeita: mesma raiz do problema
   de cache local (localStorage) da seção de achados — tela pode estar lendo
   de uma lista em cache não invalidada, em vez do Firestore ao vivo.

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

- **Módulo Admin inteiro** (`admin.html`, `admin_escolas.html`,
  `cadastro_admin.html`, `admin_backup.html`, `idaluno.html`,
  `schema_ata.html`) — combinado: vai ganhar um **guia à parte, bem
  detalhado**, pra testar tim-tim por tim-tim quando você tiver mais tempo.
  Me avisa quando quiser montar esse guia.
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

### Rodada de hoje — `cadastro-aluno-ativo.html`

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

### Rodada anterior — `cadastro_usuario.html`, `perfil.html`, `theme-colors.js`

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

