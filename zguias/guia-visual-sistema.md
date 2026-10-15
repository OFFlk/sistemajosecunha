# Guia do visual do sistema

> **Leia este guia ANTES de mexer no visual de qualquer página.**
> Ele é **autossuficiente**: reúne o padrão visual (CSS e componentes) e a lógica de página que depende dele
> (boot, loading, toast, modais, escola ativa). Lógica de banco (coleções, regras do Firestore) não entra aqui.

## Índice

- 1. Princípio
- 2. Tokens
- 3. Botões
- 4. Card e card de destaque
- 5. Campos
- 6. Chips de informação (5 cores)
- 7. Tooltip (ⓘ)
- 8. Popover e dropdown (menu suspenso)
- 9. Aviso dentro de card (não é toast)
- 10. Toast e modal de confirmação
- 11. Modais "grandes"
- 12. Tabelas
- 13. Hubs
- 14. O que fica na página (e só isso)
- 15. Funções e trechos com visual próprio — **análise obrigatória**
- 16. Procedimento de migração de uma página
- 17. CSS externo compartilhado de módulo (`pesquisa.css`, `cadastro_admin.css`...)
- 18. Lógica ligada ao visual
- 19. Páginas de admin e de configuração
- 20. Pendências

## Como usar

- **Escopo:** vale para todas as páginas. **Hubs:** o `hub.css` é o dono do visual; use o guia só como comparação (seção 13).
  **Perfil, login, cadastro, configuração e admin:** aplique quase tudo.
- **Arquivos:** `base.css`, `components.css`, `hub.css`, `header.css` e `theme-colors.js`. O `header.css` é carregado por `fetch` em todas as páginas
  e é alterado uma única vez: página nenhuma mexe nele nem usa as classes dele.
- **Leitura:** seções 1 e 2 (princípio e tokens); depois o componente que a página usa. A seção 16 é o procedimento de migração e a 15 trata das funções
  que carregam visual dentro do JS.
- **Em dúvida, pergunte ao usuário.** Nunca invente cor, classe global ou tooltip.

---

## 1. Princípio

Cada página repintava os mesmos componentes no próprio `<style>`. Como o
`<style>` da página carrega **depois** dos CSS globais, ele vence qualquer
empate, e foi assim que o visual passou a divergir entre páginas.

A regra que corrige isso, em uma frase:

> **A página manda no LAYOUT. O global manda na APARÊNCIA.**

- **Aparência** = cor, fundo, borda, raio, sombra, tipografia, estados (hover, foco, desabilitado).
- **Layout** = largura, colunas, orientação, margens, lado a lado, o que aparece e quando.

A página pode ajustar a aparência por **variáveis que o global oferece**
(`--card-pad`, `--card-radius`, `--card-gap`, `--modal-w`, `--modal-h`).
Ela **nunca** repinta cor, borda ou fundo de um componente global.

### 1.1 Quem é dono de quê

| Item | Dono |
|---|---|
| Reset, fonte padrão, fundo da página, cor do texto | `base.css` |
| Cores do tema claro/escuro (texto, bordas, campos, fundo de card) | `base.css` |
| Links (`a`), rolagem de âncora | `base.css` |
| Paleta de marca (`--brand*`, `--brand-fg`) | `theme-colors.js` |
| Header, barra do topo, botão de tema, chips de usuário/escola | `header.css` |
| Grid de cards-link dos hubs, moldura, badge de acesso restrito | `hub.css` |
| Aparência de: card, card de destaque, botão, campo, badge, lista, tooltip ⓘ, aviso de card, toast, modais | `components.css` |
| Layout: largura, colunas, `.wrap`, grids, espaçamentos | `<style>` da página |
| Componente que só existe naquela página (stepper, chips de turno, bloco NEE, foto, drop de documentos) | `<style>` da página |

### 1.2 Ordem de carga (nunca inverter)

```html
<link rel="stylesheet" href="/css/base.css">
<link rel="stylesheet" href="/css/header.css">
<link rel="stylesheet" href="/css/components.css">
<!-- hubs: hub.css entra depois do components.css -->
<style> ...só o que é da página... </style>
```


### 1.3 Nomes globais reservados

Estas classes existem no global. **Não crie uma classe local com o mesmo nome e outro sentido**: ela passaria a conviver com a global
(foi o caso de `.lbl` na `readmitir-aluno`, que ficou `.ficha-rot`). Se a página já tem uma local homônima, **renomeie a local** (papel ou prefixo da página).

`.btn` · `.card` · `.card-head` · `.card-destaque` · `.section-title` · `.field` · `.lbl` · `.input` · `.check` · `.help` · `.badge` · `.badge-ativo` · `.list` · `.list-item` ·
`.drop-area` · `.drop-icon` · `.drop-text` · `.dest-painel` · `.dest-tit` · `.subcard` · `.stat-box` · `.stat-num` · `.stat-lbl` · `.sec-header` · `.sec-toggle` · `.sec-body` · `.subnote` · `.req` · `.aviso-warn` · `.info-tip` · `.info-tip-bubble` · `.rel-inline` · `.popover` ·
`.pop-div` · `.menu-item` · `.toast` · `.modal` · `.modal-backdrop` · `.modal-head` · `.modal-body` · `.modal-foot` · `.cm-*` · `.table-scroll` e os seletores de elemento `table`, `th`, `td`.
Modificadores com escopo (`.small`, `.wide`, `.left`, `.open`, `.over`, `.menu`, `.align-right`, `.flush`, `.scroll-body`) só valem junto do componente, mas evite reutilizar o nome solto.

---

## 2. Tokens

### 2.1 Em CSS de página, use `--ui-*`

O `components.css` expõe `--ui-*`. Eles já trocam sozinhos entre claro e escuro,
então **não é preciso escrever `html[data-theme="dark"]`** para cores que usam esses tokens.

| Token | Papel |
|---|---|
| `--ui-brand` | preenchimento sólido de marca (fundo de botão, item marcado) |
| `--ui-brand-fg` | texto sobre preenchimento de marca (calculado: preto ou branco) |
| `--ui-brand-hover` | hover de preenchimento de marca |
| `--ui-brand-faded` | fundo leve de marca (hover suave, painel) |
| `--ui-brand-text` | **texto** em cor de marca (nunca use `--ui-brand` para texto) |
| `--ui-brand-border` | borda leve de marca |
| `--ui-surface` | fundo de card, modal, balão |
| `--ui-border` | borda de card, modal, divisória |
| `--ui-text` / `--ui-muted` | texto normal / texto apagado |
| `--ui-chip-bg` / `--ui-chip-border` / `--ui-chip-color` | chip neutro |
| `--ui-danger-*` | perigo (vermelho translúcido) |
| `--ui-success-*` | sucesso (verde) |
| `--ui-table-cell-bg` | fundo de célula de dado dentro do card de destaque |

### 2.2 Tabela de troca (tokens antigos → atuais)

| Antigo (visto nas páginas) | Atual |
|---|---|
| `var(--card)` | `var(--ui-surface)` |
| `var(--border)` (do `:root` local da página) | `var(--ui-border)` |
| `var(--text)` / `var(--ink)` | `var(--ui-text)` |
| `var(--muted)` | `var(--ui-muted)` (equivalente) |
| `var(--line)` | `var(--ui-border)` |
| `var(--chip-bg)` / `--chip-border` / `--chip-color` | `var(--ui-chip-bg)` / `--ui-chip-border` / `--ui-chip-color` (equivalentes) |
| `var(--field-bg)` / `var(--field-border)` | **podem ficar**: são tokens globais do `base.css` (já trocam entre claro e escuro) |
| `var(--title-color)`, `var(--header-bg)`, `var(--bg)` | **podem ficar** (globais do `header.css`/`base.css`); em CSS novo prefira `--ui-*` |
| `var(--accent)` | `var(--ui-brand)` |
| `var(--pf-brand)` | `var(--ui-brand)` |
| `var(--pf-brand-text)` | `var(--ui-brand-text)` |
| `var(--pf-brand-faded)` | `var(--ui-brand-faded)` |
| `var(--pf-brand-border)` | `var(--ui-brand-border)` |
| `var(--pf-body-bg)` | `var(--bg)` |
| `var(--brand-fg, #fff)` | `var(--ui-brand-fg)` |
| `var(--danger)` | `var(--ui-danger-fg)` |
| variáveis de status da página (`--ga-ok-*`, `--gd-ok-*`...) | `--ui-st-ok-*` / `--ui-st-warn-*` / `--ui-st-bad-*` (cada um com `-fg`, `-bg`, `-bd`) |
| `var(--primary*)` | `var(--ui-brand*)` (o `--primary` existe no `base.css`, mas não use em página nova) |
| `color:#fff` sobre fundo de marca | `color:var(--ui-brand-fg)` |

> ⚠️ **Cuidado com `--border`.** O `--border` do `base.css` é **cinza** (`#e5e7eb`). O `--border`
> que várias páginas declaram no próprio `:root` é a cor de marca clara. Ao apagar o `:root` local,
> todo `var(--border)` passa a resolver para o cinza. **Troque por `var(--ui-border)` antes de apagar.**
> Isso vale também para `var(--border)` escrito dentro de templates de JS.

### 2.3 O que a página NÃO faz com variáveis

- Não redeclara no `:root`: `--card`, `--text`, `--border`, `--danger`, `--field-bg`, `--field-border`,
  `--shadow`, `--bg`, `--mark-*`, `--btn-home-*`, `--brand*`, `--ui-*`. (Colisão de variável foi a
  foi a causa do logo roxo: a página redeclarava uma variável do header.)
- Variável própria da página leva **prefixo da página**: a **sigla de 2 a 3 letras do nome do arquivo**
  (`gerir-dados-ano-ativo` → `--gd-*`; `cadastro-aluno-ativo` → `--cad-*`). Declare a sigla em um comentário no topo do
  `:root` da página. `--pf-*` só existe em páginas antigas; não use em página nova.
- Não escreve roxo à mão (`#7c3aed`, `#6d28d9`, `#c4b5fd`, `124,58,237`) fora de um fallback `var(--x, #7c3aed)`.

---

## 3. Botões

Família única, **composta**: `<button class="btn primary">`. Cada variante só troca
tokens `--btn-*`; uma única regra pinta o botão. Por isso há sempre borda, o escuro vem dos tokens,
e `<a class="btn">` mantém a cor certa (o `base.css` exclui `.btn` das regras de link).

### 3.1 Catálogo

| Classe | Papel | Quando usar |
|---|---|---|
| `.btn` (sem variante) | neutro: fundo de card, borda neutra | ação comum |
| `.btn.primary` | preenchimento de marca | **a** ação principal da área. Dois `primary` **lado a lado** não; separados por botões `outline` são aceitos, cada um com seu destaque |
| `.btn.secondary` | chip (fundo e borda de chip) | ação secundária. `.ghost` é alias aceito |
| `.btn.outline` | contorno de marca, sem fundo | ação alternativa com ênfase de marca |
| `.btn.neutral` | contorno neutro, sem fundo | voltar, limpar, ações discretas |
| `.btn.quiet` | sem borda nem fundo até o hover | ação terciária, ícone-botão |
| `.btn.danger` | vermelho **sólido** (texto branco) | ação destrutiva. ⚠️ Na paleta Vermelho tem a mesma cor do `primary`: colado a um `primary`, use `danger-soft` |
| `.btn.danger-soft` | vermelho **translúcido** (fundo, borda e texto do mesmo tom) | o `danger` discreto, para não competir com um `primary` vizinho |
| `.btn.success` | verde **sólido** (texto branco): cópia do `danger` em verde | **contraponto** do `danger`: reativar, aprovar, confirmar positivo |
| `.btn.success-soft` | verde **translúcido** | o `success` discreto; par do `danger-soft` |
| `.btn.cancel` | neutro com texto apagado | cancelar |
| `.btn.small` (modificador) | tamanho menor | botão em linha de tabela, em item de lista |

**Regra do par (danger × success).** Ações **opostas** (ativar/desativar, reativar/inativar, aprovar/reprovar) são **contrapontos**:
se uma é vermelha, a outra é **verde**. E as duas são da **mesma família**: ambas sólidas (`danger` + `success`) ou ambas discretas
(`danger-soft` + `success-soft`). Nunca uma sólida e outra soft, e nunca `danger` ao lado de um `primary` fazendo o papel do verde.
Padrão = sólido; **soft quando o par fica colado a um `primary`**. Dentro do card de destaque os dois lados ficam em
vermelho-escuro e verde-escuro translúcidos (a página não escreve nada).
Mudança: `.btn.success` era verde translúcido e agora é **sólido**; quem queria o translúcido usa `success-soft`.

**`<a>` como botão:** `<a class="btn secondary small">` é válido (o `base.css` exclui `.btn` das regras de link). Use para navegação com cara de botão (ex.: "Ver" um documento).

**`danger` ao lado de `primary`** (ex.: Excluir e Salvar): `danger-soft`, **mesmo sem um `success` no par**. Confira as duas regras: a do par (mesma família) e a da adjacência.

**Dois `primary` no mesmo card, ambos necessários:** agrupe por **função** e separe os grupos (ex.: ações **externas** ao objeto à esquerda, **internas** à direita), com **um `primary` por grupo**.
O outro botão de cada grupo vira `secondary` ou `outline`.

**Botão ao lado de campo** (ex.: select + "Adicionar"): `<button class="btn secondary field-h">`. A classe dá a altura do `.input`/`select` (`--field-h`, 43px). Não escreva `style="height:43px"`.

Estados já inclusos: hover, `:active`, `:focus-visible`, `:disabled` e `[aria-disabled="true"]`.
Hover dos botões neutro, `secondary`, `outline`, `neutral` e `cancel`: preenchimento de marca (22%) + anel de 3px, não só a troca do tom da borda. `primary`, `danger` e `success` escurecem sem anel. No tema **escuro**, o hover do `outline` usa o tom claro de texto da marca (a cor de marca escura quase não aparecia); isso já está no CSS, a página não faz nada.
`<label class="btn ...">` (ex.: carregar arquivo) já tem cursor de botão: **não** repetir `cursor:pointer` inline, e dois botões lado a lado no mesmo papel (exportar/importar) usam a **mesma** variante.

### 3.2 Tabela de troca de classes

| Classe antiga | Classe nova | Observação |
|---|---|---|
| `btn btn-primary`, `btn primary` | `btn primary` | |
| `btn-gray`, `btn ghost`, `btn secondary` | `btn secondary` | `btn-gray` não é cinza: era de marca |
| `btn` puro (sem variante) | continua `btn` (neutro) | só vira `secondary` se o CSS local o pintava como chip de marca |
| `btn-ghost` (transparente) | `btn quiet` | **não** confundir com `btn ghost` (chip) |
| `btn-outline` | `btn outline` | |
| `btn outline` local com **fundo claro de marca e texto de marca** | `btn outline` global (aceito; o visual muda, é o esperado) |
| `btn` sem variante que o CSS local pintava como chip | fica `.btn` (neutro) ou vira `btn secondary` se o papel é de chip de verdade |
| `btn outline` do cadastro (era neutro: fundo de card, borda cinza) | `btn neutral` | conferir o visual da página original |
| `btn-danger`, `btn danger`, `btn ldanger`, `btn-danger-sm` | `btn danger` | vermelho **sólido**, como no global antigo (o translúcido foi abandonado: pouco indicativo) |
| `btn-approve` | `btn success` | agora sólido; para o translúcido antigo, `btn success-soft` |
| `btn` com cor inline para o lado oposto do `danger` (ex.: "Reativar" inline translúcido) | `btn success` (par sólido) ou `btn success-soft` (par soft) | usar a mesma família do `danger` ao lado |
| `btn-brand-sm` | `btn primary small` | |
| `btn-neutral` (local) | `btn neutral` | |
| `btn cancel` | `btn cancel` | |
| `btn-file`, `btn.success`/`btn.cancel` locais | **analisar** (seção 15) | vêm de CSS local; confirmar o papel antes de trocar |

**Como decidir:** mapeie pela **aparência e papel que o botão tinha**, não só pelo nome. A tabela acima vale para o que **já existe**;
o catálogo da 3.1 (ex.: "limpar" = `neutral`) vale para botão **novo**. Em dúvida, pergunte.

### 3.3 Proibido no `<style>` da página

- Declarar `.btn`, `.btn.algo` ou `.btn-algo` (nem "só um ajuste de tamanho").
- `color:#fff` fixo em fundo de marca.
- Repetir hover/dark de botão com `html[data-theme="dark"]`.
- `!important` para vencer o global. Se foi preciso, algo está errado: **pergunte**.

**Largura de botão é layout.** Para fixar largura (ex.: botão de largura igual em uma lista), crie uma **classe de layout** e aplique **junto** do `.btn`
(`<button class="btn small w-90">`, com `.w-90{ width:90px }` no `<style>` da página). Não redeclare `.btn` nem `.btn.small` para isso.
- `style="..."` inline de aparência ou de espaçamento que já existe como classe (global ou da página). Ver 14.3-A.

### 3.4 Botão específico da página

Se o botão tem um visual realmente próprio (pílula Sim/Não, toggle de turno), ele **não** é `.btn`.
Declare uma classe própria usando tokens `--ui-*` (sem dark manual):

```css
.turno-btn{ border:1.5px solid var(--ui-border); background:var(--ui-surface); color:var(--ui-muted); }
.turno-btn:hover{ border-color:var(--ui-brand); color:var(--ui-brand-text); }
.turno-btn.selected{ background:var(--ui-brand); border-color:var(--ui-brand); color:var(--ui-brand-fg); }
```

Se o botão é um `.btn` com uma única diferença, **reatribua os tokens** em vez de repintar:

```css
.btn.meu-caso{ --btn-bg:var(--ui-chip-bg); --btn-bd:var(--ui-brand); }   /* só isso */
```

Tokens disponíveis: `--btn-bg`, `--btn-bd`, `--btn-fg`, as versões de hover `--btn-bg-h`, `--btn-bd-h`, `--btn-fg-h` e o anel de hover `--btn-ring` (`none` para desligar).

### 3.5 Dentro do card de destaque

O `components.css` já reatribui os tokens para botões soltos no fundo do destaque
(primário translúcido, os demais só contorno, perigo vermelho-escuro, desabilitado cinza).
**A página não escreve nada.** Ficam de fora, de propósito, botões dentro de `table` e de `.item`
(sub-card), que já têm fundo neutro próprio.

---

## 4. Card e card de destaque

### 4.1 Card

`.card` dá fundo, borda, sombra, raio e padding, e já traz `overflow:visible` (nunca `hidden`: cortaria o balão do ⓘ), então a página **não** repete essa regra. A página decide tamanho, posição e orientação.

```css
/* certo: ajuste por variável */
.card-compacto{ --card-pad:12px; --card-gap:10px; }
.card-quadrado{ --card-radius:8px; }

/* errado: repintar */
.card{ background:#fff; border:1px solid #ddd; }
```

`--card-pad` (padrão 18px, nos quatro lados), `--card-radius` (14px), `--card-gap` (margem inferior, 16px).
Padding diferente na vertical e na horizontal: `--card-pad-y` e `--card-pad-x`
(ex.: `.meu-card{ --card-pad-y:22px; --card-pad-x:26px; }`). Se a página só tinha `padding: 22px 26px`, use os dois,
em vez de aceitar 22px nos quatro lados.
**Se a página tinha outro padding, preserve com `--card-pad`** (ou `-x`/`-y`); não padronize para 18px por conta própria.

**Título do card com ação à direita** (título e ⓘ à esquerda, botões à direita): é o `.card-head` global. Não crie `.dest-topo` ou parecido.
Layout do card (largura, grids, lado a lado) é do `<style>` da página, sem exceção.

> `.panel` não existe no global. Se a página usa `class="panel"` com a mesma aparência do card,
> troque a classe para `card`.

### 4.2 Card de destaque

Um card por área que usa a cor de marca como fundo. Classe **sempre** `.card-destaque`
(em `.card` ou `.config-card`). O `components.css` já cobre:

- as variáveis `--dest-fg`, `--dest-btn-bg`, `--dest-btn-bd`, `--dest-btn-hover`, `--dest-panel-bg`
  e a versão `.contraste-claro`;
- fundo, borda (claro e escuro), `h2`, `h3`, `.field > label`, `.req`, `.subnote`;
- botões soltos (seção 3.5), tabela dentro do destaque (`td` neutro, `th` com véu) e `.aviso-warn`.

**A página só faz duas coisas:** coloca a classe e chama o contraste depois de o card existir:

```js
try{
  if(window.ThemeColors && typeof ThemeColors.ajustarContraste === 'function') ThemeColors.ajustarContraste();
}catch(e){ console.warn('ajustarContraste:', e); }
```

Card criado por JS: chamar **depois** de inserir no DOM. Boot com `finally`
(`Loading.esconder()`): seção 18.1.

**Fica na página** (é visual próprio, ver seção 15), usando `--dest-*`:
stepper dentro do destaque, chips marcáveis dentro do destaque, campo desabilitado dentro do destaque.
As receitas estão na seção 4.5. **Não copie o bloco `.card.card-destaque{...}` de volta e use os tokens `--ui-*`
(seção 2.2) e não copie o bloco `.card.card-destaque{...}` de volta.**

**Conteúdo de leitura sobre o destaque** (lista de itens, resultado de merge, bloco de números, parágrafo): não fica solto
no fundo de marca. Coloque em `<div class="dest-painel">` (fundo liso `--ui-cell-bg`, legível nos dois temas) e use
`<div class="dest-tit">` para o título do bloco. Itens que precisam de cor própria (nova, igual, suspeita) ficam **dentro**
do painel. O que não vai em painel: `h2`/`h3`, `label` de campo e botões (já cobertos, seção 3.5 e acima).
Fundo liso sobre o destaque é sempre `--ui-cell-bg`; não crie outro token para isso.

O `.dest-painel` já traz tudo: **fundo** `--ui-cell-bg`, **texto** `--ui-text`, borda `--ui-border`, **raio 12px** e **padding 14px**.
A página só dá layout (grid, colunas, margem) e, se precisar, uma classe própria por cima para o conteúdo
(ex.: `.dest-painel.info-turma`). Não redeclare cor, fundo nem borda.

**Texto solto sobre o destaque:** `h2`, `h3`, `.field > label`, `.req`, `.subnote` e `p`/`strong` que sejam
**filhos diretos do destaque ou do `.card-head`** já ficam na cor do destaque. Texto solto em `span`/`div` (contagem, "Nenhuma turma") usa `.subnote` ou `.help` (global, 5.1): as duas ficam
na cor do destaque. Qualquer outro texto corrido vai em `.dest-painel`; não pinte cor na página.

**`.dest-painel` × `.aviso-warn`:** os dois são válidos sobre o destaque. `.aviso-warn` quando é **aviso** (informação necessária
ou importante, 7.2); `.dest-painel` quando é informação de **contexto** (ex.: "Metas da turma").

**Sub-card (`.subcard`, global):** cada **item de resultado** dentro do card de listagem de uma pesquisa (ex.: a turma encontrada, com os campos de informação
e o botão "Abrir"). A classe dá só a **aparência da caixa**: fundo `--ui-surface`, texto `--ui-text`, borda `--ui-border`, raio 10px e padding `--subcard-pad` (14px).
O conteúdo (esquerda/direita, título, linha de informações) é **layout da página**.

```html
<div class="item subcard">        <!-- .item = layout local (display:flex; gap...); .subcard = aparência global -->
  <div class="left"> … campos … </div>
  <div class="right"><button class="btn secondary small">Abrir</button></div>
</div>
```

- Ao migrar, **apague de `.item` local** as declarações de aparência (`border`, `border-radius`, `background`, `color`, `padding`); sobram só `display`, `gap` e alinhamento.
- `.subcard.selected` (fundo `--ui-brand-faded` e borda `--ui-brand`) é o item escolhido, ativado por JS. Seleção pelo estado do checkbox (`:has(:checked)`) continua **local**.
- Botões dentro do sub-card **não** recebem o estilo do destaque (3.5): o `components.css` já exclui `.subcard .btn` e `.item .btn`.
- O `.list-item` global é **linha de lista** (borda inferior), não sub-card. Se a página usa o `.list-item` repintado como card em CSS externo, **relate**.
- **Não são sub-card:** fila de arquivos, linha de importação e resultado de merge (`.scans-item`, `.import-item`, `.merge-item`); ficam locais.

Cuidados que continuam valendo na tabela dentro do destaque: nunca `overflow:hidden` no `<table>`
(corta o balão do ⓘ) e nunca `display:flex` direto em `<td>`/`<th>` (seção 12).


### 4.3 Card recolhível

Card cujo corpo pode ser recolhido (ex.: "Índice de anos", seções da visão geral). O CSS é **global** (`.sec-header`, `.sec-toggle`, `.sec-body`); a página escreve o HTML e o JS de alternar:

```html
<div class="card">
  <div class="sec-header" onclick="secHeaderClick('secFiltros', event)">
    <h3>Filtros</h3>
    <button type="button" class="sec-toggle" id="togSecFiltros" aria-expanded="true" aria-controls="secFiltros" aria-label="Recolher">▼</button>
  </div>
  <div class="sec-body" id="secFiltros"> … conteúdo … </div>
</div>
```
```javascript
function toggleSec(id){
  const body = document.getElementById(id);
  const tog  = document.getElementById('tog' + id.charAt(0).toUpperCase() + id.slice(1));   // 'secFiltros' → 'togSecFiltros'
  if(!body) return;
  const col = body.classList.toggle('collapsed');
  if(tog){ tog.classList.toggle('collapsed', col); tog.setAttribute('aria-expanded', String(!col)); }
  const hdr = body.previousElementSibling;
  if(hdr) hdr.classList.toggle('fechada', col);
}
// Aberto: só a seta recolhe. Fechado: o cabeçalho inteiro abre.
function secHeaderClick(id, ev){
  const body = document.getElementById(id);
  if(!body) return;
  const fechado = body.classList.contains('collapsed');
  if(fechado || (ev && ev.target && ev.target.closest && ev.target.closest('.sec-toggle'))) toggleSec(id);
}
```

Comportamento (vale para todos):

- **Recolher só pela seta.** Clicar no resto do cabeçalho não recolhe (evita recolher sem querer ao clicar no título).
- **Expandir pela seta ou pelo cabeçalho inteiro.** Recolhido, qualquer clique no cabeçalho abre.
- **Hover do título só quando recolhido** (cursor de mão e cor), porque só então o cabeçalho é clicável. **Nunca** dentro de `.card-destaque`.
- A seta é um **`<button type="button">`** (foco por teclado e leitor de tela), com `aria-expanded` e `aria-controls`. Não use `<span onclick>`.
- A área clicável da seta é maior que o desenho (padding compensado com margem negativa), e o layout não muda.
- O estado é a classe `.collapsed` (no corpo e na seta) e `.fechada` (no cabeçalho). O estado inicial é da página.

### 4.4 Caixa de número (`.stat-box`)

Número grande com rótulo embaixo (ex.: Turmas, Alunos, Matrículas na visão geral). A linha que agrupa as caixas é **layout da página**:

```html
<div class="stats-row">   <!-- .stats-row{ display:flex; gap:14px; flex-wrap:wrap } na página -->
  <div class="stat-box"><div class="stat-num" id="statTurmas">—</div><div class="stat-lbl">Turmas</div></div>
  <div class="stat-box"><div class="stat-num" id="statAlunos">—</div><div class="stat-lbl">Alunos</div></div>
</div>
```

Antes de carregar, o número mostra "—", nunca 0 (seção 18.2). Sobre o card de destaque a caixa ganha fundo liso (`--ui-cell-bg`) sozinha. Não confunda com chip (seção 6): a caixa mostra **um número isolado**; o chip mostra um **dado curto** de uma listagem.

### 4.5 Receitas de visual próprio dentro do destaque

O global cobre botões, tabela, painel e aviso sobre o destaque. O que é **só da página** (chip marcável, stepper, número em destaque) a página escreve com os tokens `--dest-*`:

**Chips marcáveis** (ex.: turnos). A borda `--ui-brand` some contra o próprio card. Desmarcado = contorno translúcido; marcado = **preenchimento sólido `--dest-fg`** com o texto na cor do card (`--btn-home-bg`; o par já tem contraste calculado):

```css
.card-destaque .chip{ background:transparent; border-color:var(--dest-btn-bd); color:var(--dest-fg); }
.card-destaque .chip:hover{ background:var(--dest-btn-hover); border-color:var(--dest-fg); color:var(--dest-fg); }
.card-destaque .chip.checked{ background:var(--dest-fg); border-color:var(--dest-fg); color:var(--btn-home-bg); }
.card-destaque .chip.checked input[type="checkbox"]{ accent-color:var(--btn-home-bg); }
```
- `.checked` **depois** de `:hover` (empate de especificidade).
- Rótulo do campo: o global usa `.card-destaque .field > label` (e não `label`), para não alcançar o `<label>` **dentro** do chip, que herda a cor dele.

**Stepper / controle segmentado** (etapas 1/2). Perde a caixa própria e usa o véu: duas colunas iguais (`display:grid; grid-template-columns:1fr 1fr; gap:12px`), sem linha entre etapas. Etapa ativa = quadrado arredondado na cor do **body** (`--bg`); hover das demais = o mesmo quadrado translúcido:

```css
.step{ padding:8px 18px 8px 10px; border-radius:12px; cursor:pointer; }
.step:hover{ background:var(--dest-btn-hover); }
.step.active, .step.active:hover{ background:var(--bg); }
.step.active .step-num{ background:var(--ui-brand); border-color:var(--ui-brand); color:var(--ui-brand-fg); }
.step.active .step-title{ color:var(--ui-text); }
.step.active .step-label{ color:var(--ui-muted); opacity:1; }
.step:not(.active) .step-num.aviso{ border-style:dashed; }   /* etapa incompleta: tracejado + ⚠️, nunca amarelo */
```
Se o JS mexe no separador (`stepSep.classList...`), mantenha o elemento com `display:none` em vez de apagá-lo (seção 18.4).

**Destaque por caixa, não por tamanho.** Um número com `font-size` maior "para dar destaque" distorce o card. Use uma caixa com o véu do card e a fonte padrão:

```css
.ano-badge{ display:inline-flex; align-items:center; justify-content:center; min-width:76px; padding:9px 16px;
  border-radius:10px; font-size:14px; font-weight:800;
  background:var(--dest-btn-bg); border:1px solid var(--dest-btn-bd); color:var(--dest-fg); }
```

**Qual card vira destaque** numa página com cards lado a lado: o que a pessoa olha primeiro ou mais vezes (não precisa ser o de filtro/ação). Em dúvida, **pergunte**.

---

## 5. Campos

`.field` dá a aparência do rótulo e dos controles (`input`, `select`, `textarea`): borda, fundo, foco,
placeholder, desabilitado. **A disposição** (largura, colunas) é da página.

```html
<div class="field">
  <label for="turma">Turma</label>
  <select id="turma">...</select>
</div>
```

O `components.css` mantém uma regra de layout legada para `.field` (seção 9 do arquivo). Em página
migrada, defina o layout no seu `<style>` (`.field{ min-width:0 }`, grids etc.).

**Fora de `.field`** (select em barra de filtro, rótulo solto, caixa de marcar), use as classes avulsas.
`.check` é `inline-flex` (caixa + texto alinhados): pode ficar dentro de uma linha de ação ou de filtros; o espaço em volta (gap, margem) é da página.
Elas têm a mesma aparência do `.field`. **O `.input` avulso não tem largura própria**: quem define é a página (`width:100%` em coluna, largura fixa em linha de filtros). Não apague o `width` ao migrar um campo que já o tinha. A posição também é da página:

```html
<label class="lbl" for="gaTurma">Turma</label>
<select class="input" id="gaTurma">...</select>

<label class="check"><input type="checkbox"> Todas as escolas</label>
```

**Largura:** dentro de `.field` o controle **já ocupa 100% da largura do `.field`**; a largura do campo é a do `.field` (layout da página). Não declare `width` no `input`/`select`.
Isso vale para controles de **texto** (`input` de texto, `select`, `textarea`). **Checkbox, radio, file e range** dentro de `.field` ficam nativos, e um `<label class="check">` dentro de `.field` é válido: não leva o estilo de rótulo do campo.

**Select sem escolha:** não tem uma opção selecionável "Selecione…". Enquanto não há escolha, fica em branco. Se o select precisa de **dica**
(ex.: catálogo com botão "Adicionar", em que a pessoa não adivinha o que escolher), use um placeholder que **aparece no campo mas não na lista**:

```html
<select id="serie" class="input">
  <option value="" disabled hidden selected>Escolha a série…</option>
  <option>1º ano</option> ...
</select>
```

**Rótulo com ⓘ seguido de uma linha de controles** (ex.: série: select + botão "Adicionar"): o rótulo fica num `.field` e a linha é **layout local**:

```html
<div class="field">
  <label for="serie">Série <span class="info-tip" ...>i<span class="info-tip-bubble">…</span></span></label>
  <div class="linha-serie">   <!-- layout da PÁGINA: display:flex; gap:8px -->
    <select id="serie" class="input">…</select>
    <button class="btn secondary" type="button">Adicionar</button>
  </div>
</div>
```

O controle dentro de `.field` já tem `width:100%`; na linha flex dê `flex:1; min-width:0` (na página) para o botão não ser espremido.

**Select dependente** (turma → série) ou **input desabilitado até a escolha anterior:** sem texto de dica no campo ("(selecione a turma primeiro)").
Fica em branco ou desabilitado; o fluxo se explica sozinho. O placeholder `disabled hidden selected` é para o catálogo com botão "Adicionar".

**Controles dentro de `<td>`:** use `.input` (e `<input type="checkbox">` nativo para caixa de marcar solta). A largura é **layout da página** (`td .input{ width:100% }`).
O checkbox nativo já usa a cor da paleta (`accent-color` no `base.css`); não declare `accent-color` na página.

Todo `.input`/`.field` tem altura mínima `--field-h` (43px), para botão e campo lado a lado ficarem alinhados.

Não crie `.xxx-in`/`.xxx-chk` na página com o visual de campo.
**Tipografia** (`h1` a `h4`, `label` genérico, placeholder) fica **local** na página: não há regra global.

`.help` e `.drop-area` são **globais**; a página não os redefine.

### 5.1 Mensagem de campo (`.help`)

Mensagem curta abaixo de um campo (dica, validação, status). A página troca a classe por JS:

```html
<small class="help" id="cpfMsg" aria-live="polite"></small>
```
```javascript
el.textContent = msg;
el.className = msg ? 'help err' : 'help';   // 'help ok' para confirmação
```

| Classe | Uso | Cor |
|---|---|---|
| `.help` | dica ou texto neutro | `--ui-muted` |
| `.help.err` | erro de validação | `--ui-st-bad-*` (vermelho, negrito) |
| `.help.ok` | confirmação | `--ui-st-ok-*` (verde, negrito) |

Reserva uma linha (`min-height:14px`), para o formulário não pular. Solto sobre o **card de destaque** fica na cor do destaque;
dentro de `.dest-painel`, `.item`, tabela ou `.aviso-warn` mantém a cor normal. **Não é aviso** (7.2): mensagem de estado de uma lista usa `.aviso-warn`.
Estado que não é erro nunca usa `.help.err`.

### 5.2 Área de upload (`.drop-area`)

Arrastar e soltar arquivos. Mesmo visual em todas as páginas:

```html
<div class="drop-area" id="dropArea">
  <input type="file" id="fileInput" multiple accept=".pdf,.jpg,.png"/>
  <div class="drop-icon">📂</div>
  <div class="drop-text">Arraste arquivos aqui ou <span onclick="document.getElementById('fileInput').click()">clique para selecionar</span></div>
</div>
```

O JS só alterna `.over` no `dragover`/`dragleave`/`drop`. O `<input type="file">` fica escondido. Ao migrar: `docs-drop-area` → `drop-area`,
`docs-drop-icon` → `drop-icon`, `docs-drop-text` → `drop-text`, `.scans-drop` → `drop-area` (e seus filhos para os equivalentes); os nomes antigos
`.docs-drop-*` continuam funcionando no global até a migração. Texto auxiliar abaixo (formatos, tamanho máximo) é `.help` ou `.subnote`, nunca `style` inline.
A **fila de arquivos** que aparece depois é item de lista da página (local); não é o sub-card de resultado (4.2).
Caixa tracejada para **escolher ou soltar arquivo** (foto, documento): avalie `.drop-area` **antes** de criar classe local. Se for só um bloco de pré-visualização com botões "Escolher/Remover" (sem arrastar), é componente da página.

---

## 6. Chips de informação (5 cores)

Chip é um **dado curto exibido** (não clicável; clicável é botão). Componente único: `.badge`.
A cor diz o **grau de prioridade do dado naquela tela**, em **3 níveis**, mais um par à parte para verdadeiro/falso.

| Nível | Cor | Classe | Quando usar | Exemplo (listagem de turmas) | Cor vem de |
|---|---|---|---|---|---|
| **1 · alta** | Variável | `.badge` (padrão) | informação de indicação/identificação mais importante da tela; **segue a paleta** do usuário | Ano: 2026, Turno | `--ui-chip-*` |
| **2 · média** | Neutro | `.badge.neutral` | segunda prioridade; âmbar **fixo**, não segue o `theme-colors` | série | `--ui-chip-neutral-*` |
| **3 · baixa** | Cinza | `.badge.gray` | sem destaque, mas precisa ser exposto | nome do(a) professor(a), ID da turma | `--ui-chip-gray-*` |
| **fora da escala** | Verde / Vermelho | `.badge.ok` / `.badge.bad` | leitura que pode retornar **verdadeiro ou falso**; sempre o par | "Sim"/"Não" na exclusão de aluno; INATIVA | `--ui-st-ok-*` / `--ui-st-bad-*` |

`.badge.small` é a versão compacta (11px).

### Como escolher a cor

1. **A prioridade é da TELA, não do tipo de dado.** A série é neutra (média) na listagem de turmas, mas pode ser variável
   (alta) numa página em que ela seja o dado principal. O mesmo vale para CPF, ID do aluno etc.
2. Antes de colorir, **ordene os dados daquela tela em até 3 níveis**: o mais importante é variável, o seguinte neutro, o resto cinza.
3. **Verde e vermelho não entram nessa ordem.** Usam-se só quando a leitura pode dar verdadeiro **ou** falso, sempre como par
   (se aparece o verde "Sim", o "Não" é vermelho). Nunca como enfeite.
4. **Chip único na tela** (ex.: "Página X de Y") é nível 1 (variável) por obrigação: não há outro para comparar.
5. A tela tem mais de 3 níveis, ou o dado não é nem prioridade nem verdadeiro/falso? **Pergunte.** Não crie uma 6ª cor.

**Exemplo ilustrativo** (listagem de turmas): a ordem abaixo é **dessa tela**, não uma regra. Cada tela decide a sua.

```html
<div class="chips">   <!-- classe de LAYOUT da página: display:flex; flex-wrap:wrap; gap:6px (nada de style inline) -->
  <span class="badge small">Ano: 2026</span>            <!-- 1 · variável -->
  <span class="badge small">Turno: MATUTINO</span>      <!-- 1 · variável -->
  <span class="badge small neutral">3º ANO</span>       <!-- 2 · neutro -->
  <span class="badge small gray">Prof.: Maria</span>    <!-- 3 · cinza -->
  <span class="badge small bad">INATIVA</span>          <!-- falso -->
</div>
```

Outra tela, outra ordem. No **cadastro de turmas**, com os mesmos dados: **Ano** e **série** variáveis (nível 1), **Turno** cinza (nível 3).
No **cadastro de turma do ano ativo**: **Ano** nível 1, **série** neutra (nível 2), **turno** cinza (nível 3) e **INATIVA** vermelho (`bad`).
**Contagem** ("N aluno(s)") também recebe nível: o padrão é **neutro** quando é maior que 0 e **cinza** quando é 0.

### Dado categórico com muitos valores (resultado do aluno)

Dado com **vários valores fixos** não se resolve só por prioridade: o usuário define o **mapa valor → cor**. O chip de **resultado do aluno**
(`historico-aluno`) usa este mapa:

| Código | Cor | Classe |
|---|---|---|
| `AP`, `AND` (andamento) | verde | `badge ok` |
| `REP`, `CON` (conservado) | vermelho | `badge bad` |
| `FAL`, `DEST` | cinza | `badge gray` |
| `TRA` | neutro | `badge neutral` |

O mapa vale **por valor**, em toda tela que mostrar esse resultado. Um valor **que não está no mapa** ou outro dado categórico novo:
**pergunte** o mapa; não improvise cor por valor. No JS, mantenha o mapa em **um objeto só** (`{ AP:'ok', AND:'ok', REP:'bad', CON:'bad', FAL:'gray', DEST:'gray', TRA:'neutral' }`)
e gere `class="badge small ${mapa[valor] || ''}"` (valor desconhecido cai no variável e deve ser relatado).

### Regras

- **A página não declara cor de chip.** Nada de `.badge-serie`, `.status-inativa`, `.pill` com cor própria: é `badge` + uma das classes acima.
- Ao migrar, **remova `pill`** (o CSS local do `.pill` vence o `.badge` global) e apague os `.badge.xxx` locais.
- Se todos os chips da tela ficam variáveis, nada se destaca: use os 3 níveis.
- Espaço entre chips é do container (`gap`), não do chip. (O `.badge` ainda tem margem esquerda de 4px **legada** na seção 11 do `components.css`, só para não quebrar páginas antigas.)
- Chip **removível** (com ×) e contador com número em destaque **não** são `.badge`: ficam na página.
- Chip **dentro de `.aviso-warn`**: automático. O chip variável ganha fundo sólido de card (o aviso usa o fundo de chip e o chip sumiria); as outras cores já têm tinta própria. Não declare nada na página.
- Contador com número em destaque (`.sum-chip`: "3 novas", "0 suspeitas") **não** é `.badge`: é `.count`, fica na página, e usa `--ui-st-*` para ok/aviso.
- **Chip removível (com ×) sobre o destaque**: resposta padrão = fundo `--ui-cell-bg`, texto `--ui-text`, borda `--ui-border` (fundo liso), como nas telas de turmas e de pesquisa. O chip removível fica local em cada página.
- Chip solto **direto no fundo do card de destaque**: o variável pode perder contraste. Em listagem, o chip fica dentro do `.item` (fundo próprio), como em turmas. Se for preciso chip no fundo do destaque, **pergunte**.

### Status de busca em campo (CEP e semelhantes)

Quando um campo dispara uma **busca assíncrona** cujo resultado a pessoa precisa esperar, o estado aparece num **chip ao lado do campo**:

| Estado | Chip |
|---|---|
| buscando | `badge small` (variável, nível 1): "Buscando CEP…" |
| encontrou | `badge small ok`: "CEP encontrado" |
| não encontrou | `badge small bad`: "CEP não encontrado" |

```html
<span class="badge small" id="cepStatus" hidden aria-live="polite"></span>
```
```javascript
function setStatusCampo(el, estado, texto){          // estado: 'buscando' | 'ok' | 'erro' | ''
  el.hidden = !estado;
  el.className = 'badge small' + (estado === 'ok' ? ' ok' : estado === 'erro' ? ' bad' : '');
  el.textContent = estado ? texto : '';
}
```

Só existe indicador por campo quando **as três condições** valem: (1) a pessoa dispara a busca (digitar ou sair do campo); (2) o resultado preenche outros campos ou libera a próxima ação; (3) a espera é perceptível.
**Não** use indicador por campo para: escolher ou enviar imagem (a imagem só é enviada ao salvar, e o toast "Salvando…" geral já cobre), salvar, carregar a página (overlay) ou qualquer coisa que já tenha toast ou overlay.
Cada página identifica essas esperas de um jeito; **na dúvida se um campo precisa de status, pergunte ao usuário**. Mensagem de validação (formato inválido) é `.help.err`, não chip.

### Trocas de classes antigas

`pill badge` → `badge` (nível 1) · `badge.status-inativa` → `badge bad` · `badge-serie` → `badge neutral` (se a série é nível 2 naquela tela) ·
`badge.ok` / `badge.danger` (gestão) → `badge ok` / `badge bad` · `badge.warn` e `badge-completude.amarelo` → **sem 6ª cor**:
classifique pelo nível de prioridade (variável, neutro ou cinza); se for verdadeiro/falso, `ok`/`bad`; se não encaixar, pergunte.

---

## 7. Tooltip (ⓘ)

CSS: **só no `components.css`** (`.info-tip`, `.info-tip-bubble`, `.wide`, `.align-right`).
Não copie o bloco para a página.

HTML (o `preventDefault` não é enfeite):

```html
<label>Nome do aluno
  <span class="info-tip" tabindex="0" onclick="event.stopPropagation(); event.preventDefault(); document.querySelectorAll('.info-tip.open').forEach(o=>{ if(o!==this) o.classList.remove('open'); }); this.classList.toggle('open');">
    i
    <span class="info-tip-bubble">TEXTO DA DICA.</span>
  </span>
</label>
```

JS, uma vez por página:

```js
document.addEventListener("click", ()=>{
  document.querySelectorAll(".info-tip.open").forEach(el => el.classList.remove("open"));
});
```

Regras que continuam: ⓘ em `<label>` de checkbox fica **fora** do label; `overflow:hidden` em qualquer
ancestral corta o balão.

### 7.1 Tamanho e posição do balão

| Situação | Classe do balão |
|---|---|
| ⓘ em bloco de **largura cheia** (um card por linha, cabeçalho de seção) e texto longo | `.wide` |
| ⓘ em colunas **lado a lado** (ex.: Exportar e Importar) | padrão (estreito) |
| ⓘ perto da **borda direita** da tela ou do card | `.align-right` (combina com o padrão e com `.wide`) |

Regra prática para "texto longo": se o texto passa de cerca de **140 caracteres** (4 linhas no balão estreito), use `.wide`.

**Precedência:** o **tamanho do texto** decide o `.wide` em qualquer lugar (inclusive em grade de várias colunas); a **posição** decide o `.align-right`.
"Lado a lado → estreito" vale só para texto curto. O balão é absoluto e pode passar da coluna sem problema.
**Posição por tela:** ⓘ que fica na borda direita só em grade de colunas (e à esquerda no celular, com 1 coluna) usa `.align-right-md` (alinha à direita só a partir de 640px);
`.align-right` fixo é para ⓘ que está sempre na borda direita (ex.: última coluna de cabeçalho de tabela).

**Dois ⓘ no mesmo título** são aceitos quando explicam **coisas diferentes** (ex.: um do título, outro de um termo). Cada um abre só o seu
(o `onclick` do 6 fecha os outros); o segundo, perto da borda direita, leva `.align-right`. Mais de dois: pergunte.

Exemplo da `gestao-atas`: "Exportar" e "Importar" lado a lado são estreitos (o de Importar, na coluna direita, usa `.align-right`);
as seções de largura cheia (Schemas, índice de anos, Apagar turmas) usam `.wide`.

### 7.2 Tooltip × aviso

**Tooltip é dica**: orienta como a função do card funciona. **Aviso é informação necessária**: para o funcionamento pleno
ou porque é importante (ou urgente) a pessoa saber.

- **Tooltip (ⓘ)** = dica sobre o que a função **faz**, **por que existe** ou uma **precaução** que não impede a função nem é urgente.
  A pessoa usa a tela sem ler. Ex.: "Schema é a lista de matérias de uma ata…", "Os números só são lidos quando você aperta
  Carregar dados", "Isso apaga a turma, faça um backup por precaução".
- **Aviso** (`.aviso-warn`; ou texto visível da página, como `.muted`) = informação **necessária** para o funcionamento pleno
  ou **importante/urgente**, e também o **estado atual**. Ex.: "Índice vazio — a pesquisa usa a lista fixa de anos",
  "Última reconstrução: …".
- **Estado de lista** (carregando, vazio, sem resultado): é aviso (estado atual): `.aviso-warn`, **sem** o `.list-item` envolvendo. Estado que **não é erro nunca sai em vermelho** (nem `var(--danger)`): "Buscando…" e "Nenhuma ocorrência" não são falha.
- **`.aviso-warn` não vai dentro de contêiner com borda** (`.list`, tabela, `.item`): fica como **irmão**, fora dele. Envolva a lista com o contêiner só quando há resultados.
- **Estado de painel** (carregando, vazio, falha ao carregar): também é `.aviso-warn`, como o estado de lista. Na **falha** de verdade, além do aviso, `setMsg('…','err')` (o vermelho fica no toast, não no painel).
- **Mensagem duplicada:** a mesma mensagem **nunca** aparece em toast **e** em bloco inline. Momentânea → só toast.
- **Sucesso seguido de redirecionamento:** só toast (`setMsg('…','ok')` e redireciona); sem bloco inline "aguarde o redirecionamento".
- **Erro que substitui o conteúdo da página** (aluno não informado, falha ao carregar, não encontrado): **não é duplicata.** Mostre o card com `.aviso-warn` ⚠️ **e** o toast de erro;
  sem o card, a tela ficaria vazia ou presa em "Carregando…".
- Caixa de **orientação de fluxo** ("Fluxo: 1. escolha… 2. clique…") também é **aviso** (necessária para o funcionamento pleno): `.aviso-warn`. Já os tooltips de **precaução** (série, ID) continuam tooltips.
- Teste rápido: *a tela funciona e a pessoa entende sem essa informação? É tooltip. A informação é necessária para o
  funcionamento pleno ou é importante/urgente saber? É aviso.*
- Não classifique por assunto (apagar, importar...) e sim por **necessidade e urgência**: uma dica de precaução sobre apagar continua sendo tooltip.

---

## 8. Popover e dropdown (menu suspenso)

**Dropdown** é o botão que abre uma caixa de opções ("Exportar PDF ▾"). Tecnicamente é um **popover** (caixa flutuante) com uma lista de botões.
O padrão vem da `pesquisa-ano-ativo` e é **global** (existe em vários módulos).

```html
<div class="rel-inline">
  <button class="btn primary" type="button" data-dropdown="menuExportar" aria-haspopup="menu" aria-expanded="false">Exportar PDF ▾</button>
  <div class="popover menu align-right" id="menuExportar" hidden>
    <button class="btn quiet menu-item" type="button">📋 Lista de alunos</button>
    <button class="btn quiet menu-item" type="button">🏫 Separado por turma</button>
    <div class="pop-div"></div>
    <button class="btn quiet menu-item" type="button">📊 CSV completo</button>
  </div>
</div>
```

| Classe | Papel |
|---|---|
| `.rel-inline` | âncora: `position:relative`, `inline-block` |
| `.popover` | a **caixa** (fundo `--ui-surface`, borda `--ui-border`, raio 12px, sombra). Serve também para conteúdo que **não** é lista de botões (filtro avançado, seletor de colunas): tamanho e posição ficam na página (`.pop-avancada`, `.pop-cols`) |
| `.popover.menu` | dropdown: lista vertical, `min-width:200px`, abre logo abaixo do botão (alinhado à esquerda) |
| `.align-right` | com `.menu`: alinha a borda direita da caixa à do botão (use perto da borda direita da tela) |
| `.btn.quiet.menu-item` | item: largura total, alinhado à esquerda, sem raio. O hover vem do `.btn.quiet` |
| `.pop-div` | divisória entre grupos de itens. Margem de **12px** em cima e embaixo num `.popover` comum (conteúdo livre) e de **6px** dentro de `.popover.menu` |

**Abrir e fechar** — JS padrão, **uma vez por página**, por **delegação de evento**. Vale para popover escrito no HTML **e** para o criado por
JS/template (ex.: "☰ Colunas" dentro de um modal montado por JS): não há nada para "inicializar" depois de inserir o elemento.
O botão aponta para o menu pelo atributo `data-dropdown="id-do-menu"`. Abre ao clicar no botão, fecha ao clicar fora, ao clicar num item
(`.menu-item`) e com **Esc**; só um aberto por vez. Estado por atributo `hidden`:

```javascript
function _fecharDropdowns(exceto){
  document.querySelectorAll('[data-dropdown]').forEach(b => {
    const m = document.getElementById(b.dataset.dropdown);
    if(m && m !== exceto){ m.hidden = true; b.setAttribute('aria-expanded', 'false'); }
  });
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-dropdown]');
  if(btn){
    const menu = document.getElementById(btn.dataset.dropdown);
    if(!menu) return;
    const abrir = menu.hidden;
    _fecharDropdowns(menu);
    menu.hidden = !abrir;
    btn.setAttribute('aria-expanded', String(abrir));
    return;
  }
  if(e.target.closest('.popover')){                         // clique dentro do popover
    if(e.target.closest('.menu-item')) _fecharDropdowns();  // item de lista fecha; filtro/colunas ficam abertos
    return;
  }
  _fecharDropdowns();                                       // clique fora
});
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') _fecharDropdowns(); });
```

Só mexe em popover **registrado** por um botão com `data-dropdown`. Os que não têm esse atributo (legado) não são tocados.

Regras:
- **Legado aceito:** o padrão antigo (`display:none` inline no HTML e `style.display = 'flex'` para abrir, porque o menu é coluna) continua funcionando e **não precisa ser reescrito**.
  **Não misture no mesmo popover:** um que o JS legado abre com `style.display` **não** recebe `data-dropdown`, e um que recebeu `hidden` só reabre com `hidden = false` (o `base.css` usa `!important`; `style.display` não o mostra).
  `.pop-export` é o nome antigo de `.popover.menu.align-right` e segue valendo.
- O item **fecha o menu** quando clicado (a delegação já faz isso; o clique do item roda primeiro, a ação acontece e o menu fecha em seguida).
- `overflow:hidden` em qualquer ancestral **corta** o popover (igual ao balão do ⓘ).
- `.popover` dentro de modal funciona (o `z-index` 200 vale dentro do contexto do modal).
- Dropdown é **ação** (lista de botões). Dica de uso é tooltip (seção 7); informação necessária é aviso (7.2).
- Trocas de nome: `.drop-wrap` → `.rel-inline`, `.drop-menu` → `.popover.menu` (e `.align-right` se abria à direita); itens `btn quiet menu-item`.
  A sombra fixa que a `pesquisa-ata` mantinha na página já está no `.popover`.

---

## 9. Aviso dentro de card (não é toast)

`.aviso-warn`: fundo neutro, faixa esquerda âmbar, sem fundo amarelo. Dentro do destaque usa o véu do card.
O sinal é o **emoji do texto**, o que comunica a situação: ⚠️ atenção, 🔒 bloqueio, ℹ️ orientação. Mensagem **momentânea** é toast (seção 10), não `.aviso-warn`.

---

## 10. Toast e modal de confirmação

### 10.1 Cores e `setMsg`

O **CSS** do toast e do modal é global (`.toast*`, `.modal-backdrop`, `.cm-*`). O **JS** só cria elementos com classe: não monta estilo.
Se a página ainda tem `style.cssText` de toast ou modal, `@keyframes toastSubir` ou `.cm-*`/`.modal-backdrop` no `<style>`, **apague** (seção 16).

As **4 cores** e o mapeamento de `setMsg` são a regra única do sistema:

| Situação | Cor | `kind` |
|---|---|---|
| Sucesso | verde | `"ok"` |
| Aviso / cancelar | âmbar | `"warn"` |
| Carregando | azul (**sem expirar**) | `"loading"` |
| Erro | vermelho | `"err"` |

Situação que não encaixa em nenhuma das 4: **não escolha cor, pergunte**. O padrão seguro é `warn`.
**Cor nunca é argumento:** função de status passa o **tipo** (`ok`, `err`, `warn`, `loading`), não um hex nem `var(--x)` (`setStatus(txt,'ok')`, e não `setStatus(txt,'#166534')`).

### 10.2 JS padrão

Se a página já tem um `setMsg`, **funda a lógica** (mantenha as validações específicas, troque só o roteamento final).

```javascript
// ── Toasts (visual em components.css: .toast .toast-ok|err|warn|loading) ──
const _TOAST = {
  ok:      { cls:'toast-ok',      ms:2500 },
  err:     { cls:'toast-err',     ms:4500 },
  warn:    { cls:'toast-warn',    ms:4000 },
  loading: { cls:'toast-loading', ms:0 },       // 0 = sem expirar: fecha quando a operação termina
};
function _showToast(msg, tipo){
  const existing = document.getElementById('_toastGlobal');
  if(existing) existing.remove();
  const cfg = _TOAST[tipo] || _TOAST.warn;
  const toast = document.createElement('div');
  toast.id = '_toastGlobal';
  toast.className = 'toast ' + cfg.cls;
  toast.setAttribute('role', tipo === 'err' ? 'alert' : 'status');
  const span = document.createElement('span');
  span.className = 'toast-msg';
  span.textContent = msg;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toast-close';
  btn.textContent = '✕';
  btn.setAttribute('aria-label','Fechar aviso');
  btn.onclick = () => toast.remove();
  toast.append(span, btn);
  document.body.appendChild(toast);
  if(cfg.ms) setTimeout(() => { if(toast.isConnected) toast.remove(); }, cfg.ms);
}
// só remove o "carregando": nunca apaga um sucesso/erro/aviso que apareceu no meio do caminho
function _toastLimpar(){
  const t = document.getElementById('_toastGlobal');
  if(t && t.classList.contains('toast-loading')) t.remove();
}
function _toastSucesso(m){ _showToast(m,'ok'); }
function _toastErro(m){ _showToast(m,'err'); }
function _toastAviso(m){ _showToast(m,'warn'); }
function _toastCarregando(m){ _showToast(m,'loading'); }

function setMsg(text, kind){
  const t = (text||"").toString();
  if(!t) return;
  if(kind === "err") _toastErro('⚠️ ' + t);
  else if(kind === "ok") _toastSucesso('✅ ' + t);
  else if(kind === "warn") _toastAviso('⚠️ ' + t);
  else if(kind === "loading") _toastCarregando('⏳ ' + t);
  else { console.warn('[toast] kind desconhecido:', JSON.stringify(kind)); _toastAviso(t); }
}
```

### 10.3 Toast "carregando" (sem expirar)

O toast azul **não tem tempo limite**: fica até a operação terminar. Ele é fechado por **qualquer um** de:
o próximo toast (sucesso, erro ou aviso, que o substitui) ou `_toastLimpar()`, que **só remove o "carregando"**
(se um sucesso, erro ou aviso apareceu no meio do caminho, ele fica).
Toda ação que abre um "carregando" **precisa fechá-lo em todos os caminhos**:

```javascript
async function salvar(){
  setMsg('Salvando…', 'loading');
  try{
    await window.DB.algumaColecao.save(dados);
    setMsg('Salvo!', 'ok');            // substitui o azul
  }catch(e){
    console.error('salvar:', e);
    setMsg('Não foi possível salvar.', 'err');   // substitui o azul
  }
}
// operação que termina sem mensagem (ex.: só atualiza a tela): _toastLimpar() no finally
// (seguro: se um erro/aviso já substituiu o azul, ele não é apagado)
```

**Rede de segurança** (uma vez por página): se uma promise falhar sem `catch` enquanto há um "carregando" aberto,
troca o azul por um erro em vez de deixá-lo preso para sempre.

```javascript
window.addEventListener('unhandledrejection', () => {
  const t = document.getElementById('_toastGlobal');
  if(t && t.classList.contains('toast-loading')) _toastErro('⚠️ Não foi possível concluir a operação.');
});
```

**Auditoria obrigatória:** ao usar um "carregando" sem expirar, **revise toda chamada** `setMsg(…, 'loading')` da página e confira que **todo caminho de saída** o fecha:
sucesso, erro, `return` antecipado, **abrir um modal de confirmação** (não deixe o azul aberto atrás dele) e o **"Cancelar"** do modal (`_toastLimpar()`).
Na `gestao-atas` esse exame achou um caso em que o toast ficava preso depois de "Cancelar".

> Toda chamada direta antiga `_showToast(msg, '#166534', '...', 2500)` precisa virar `_toastSucesso(msg)` etc.
> Procure por `_showToast(` com `grep`: assinatura mudou.
> O toast é **único** (`#_toastGlobal`, o próximo substitui) e `setMsg('')` não limpa nada.

### 10.4 Modal de confirmação (substitui `confirm()` e `prompt()`)

`corpo` é **HTML**: escape tudo que for dinâmico com `_escHtml`. Cancelar = Esc, clique no fundo ou botão.
O foco inicial vai para **Cancelar** (lado seguro). `digitar` troca o `prompt()` de "digite X para confirmar".

```javascript
function _escHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// corDestaque: 'danger' = ação destrutiva (título e botão vermelhos); 'ok' = contraponto positivo, ex.: reativar (verde);
// qualquer outro = cor de marca.
function _confirmModal({ titulo, corpo, corDestaque, textoConfirmar, textoCancelar, digitar }){
  return new Promise((resolve) => {
    const perigo = corDestaque === 'danger';
    const positivo = corDestaque === 'ok';
    const variante = perigo ? ' perigo' : positivo ? ' ok' : '';
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML =
      `<div class="cm-box" role="${perigo ? 'alertdialog' : 'dialog'}" aria-modal="true">`+
        `<h3 class="cm-titulo${variante}">${_escHtml(titulo || 'Confirmar ação')}</h3>`+
        `<p class="cm-corpo">${corpo || ''}</p>`+
        (digitar ? `<input type="text" class="cm-input" id="_confirmModalInput" autocomplete="off" placeholder="${_escHtml(digitar)}">` : '')+
        `<div class="cm-acoes">`+
          `<button type="button" class="btn secondary" id="_confirmModalCancelar">${_escHtml(textoCancelar || 'Cancelar')}</button>`+
          `<button type="button" class="cm-ok${variante}" id="_confirmModalOk"${digitar ? ' disabled' : ''}>${_escHtml(textoConfirmar || 'Continuar')}</button>`+
        `</div>`+
      `</div>`;
    document.body.appendChild(backdrop);
    const ok = backdrop.querySelector('#_confirmModalOk');
    const cancelar = backdrop.querySelector('#_confirmModalCancelar');
    const input = backdrop.querySelector('#_confirmModalInput');
    function fechar(r){ document.removeEventListener('keydown', onKey, true); backdrop.remove(); resolve(r); }
    // Esc em CAPTURA + stopPropagation: com um modal da página aberto por baixo, o Esc fecha só este
    function onKey(ev){ if(ev.key === 'Escape'){ ev.stopPropagation(); fechar(false); } }
    document.addEventListener('keydown', onKey, true);
    ok.addEventListener('click', () => fechar(true));
    cancelar.addEventListener('click', () => fechar(false));
    backdrop.addEventListener('click', (ev) => { if(ev.target === backdrop) fechar(false); });
    if(input) input.addEventListener('input', () => { ok.disabled = (input.value !== digitar); });
    cancelar.focus();
  });
}
```

**Quebra de linha:** `corpo` é HTML, mas `\n` **quebra linha** (o `.cm-corpo` global tem `white-space: pre-line`). Não escreva `white-space` inline; para estrutura maior use tags (`<br>`, `<strong>`), sempre com valor dinâmico escapado por `_escHtml`.

**Acessibilidade:** a confirmação **destrutiva** usa `role="alertdialog"` (leitor de tela a anuncia como alerta); as demais, `role="dialog"`. O Esc fecha só o modal de confirmação (captura), nunca o modal da página que está por baixo.

**Par no modal:** a confirmação de uma ação **destrutiva** (excluir, remover, apagar, inativar) usa `corDestaque:'danger'` (vermelho) e a do **contraponto** (reativar, restaurar) usa `corDestaque:'ok'` (verde), o mesmo par dos botões (3.1).

**Chamadas antigas com `corDestaque` em hex:** `'#991b1b'` / `'#b91c1c'` (vermelho) → `corDestaque:'danger'`. `'#b45309'` (âmbar padrão) ou omitido →
**omita** (vira a cor de marca; é a mudança esperada, o acento padrão deixa de ser âmbar). Verde (`#166534`, `#15803d`) → `'ok'`. Outro hex: pergunte.

Uso: `const sim = await _confirmModal({ titulo:'Apagar?', corpo:'Não dá para desfazer.', corDestaque:'danger' }); if(!sim) return;`.
Regra prática: decisão do usuário (sim/não) → `_confirmModal`; informação → `setMsg`.
`confirm()`, `prompt()` e `alert()` nativos não devem sobrar (exceto `alert()` antes de redirecionar por acesso negado).

Outras regras: `refresh()`/`renderMeta()` não dispara toast de "Carregando…"
(trocaria o toast de sucesso que acabou de aparecer); todo `catch` de ação tem `console.error` com contexto.


### 10.5 Modal que pede texto (substitui `prompt()`)

Devolve o texto digitado (`string`, já com `trim`) ou `null` se cancelar. Mesmas classes `.cm-*` do `_confirmModal`. Enter confirma, Esc cancela, o botão fica
desabilitado enquanto o campo está vazio. `corpo` é HTML: escape o que for dinâmico.

```javascript
function _promptModal({ titulo, corpo, valorInicial, placeholder, textoConfirmar, textoCancelar }){
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML =
      `<div class="cm-box" role="dialog" aria-modal="true">`+
        `<h3 class="cm-titulo">${_escHtml(titulo || 'Informe')}</h3>`+
        (corpo ? `<p class="cm-corpo">${corpo}</p>` : '')+
        `<input type="text" class="cm-input" id="_promptModalInput" autocomplete="off" value="${_escHtml(valorInicial || '')}" placeholder="${_escHtml(placeholder || '')}">`+
        `<div class="cm-acoes">`+
          `<button type="button" class="btn secondary" id="_promptModalCancelar">${_escHtml(textoCancelar || 'Cancelar')}</button>`+
          `<button type="button" class="cm-ok" id="_promptModalOk">${_escHtml(textoConfirmar || 'Confirmar')}</button>`+
        `</div>`+
      `</div>`;
    document.body.appendChild(backdrop);
    const input = backdrop.querySelector('#_promptModalInput');
    const ok = backdrop.querySelector('#_promptModalOk');
    const cancelar = backdrop.querySelector('#_promptModalCancelar');
    function fechar(r){ document.removeEventListener('keydown', onKey, true); backdrop.remove(); resolve(r); }
    function confirmar(){ const v = input.value.trim(); if(v) fechar(v); }
    function onKey(ev){ if(ev.key === 'Escape'){ ev.stopPropagation(); fechar(null); } }
    document.addEventListener('keydown', onKey, true);
    ok.disabled = !input.value.trim();
    input.addEventListener('input', () => { ok.disabled = !input.value.trim(); });
    input.addEventListener('keydown', (ev) => { if(ev.key === 'Enter'){ ev.preventDefault(); confirmar(); } });
    ok.addEventListener('click', confirmar);
    cancelar.addEventListener('click', () => fechar(null));
    backdrop.addEventListener('click', (ev) => { if(ev.target === backdrop) fechar(null); });
    input.focus(); input.select();
  });
}
```

Uso: `const nome = await _promptModal({ titulo:'Nome do schema' }); if(nome === null) return;`.

---

## 11. Modais "grandes"

Cada modal do sistema é único (tabela, três botões em colunas, só mensagem). Por isso o global dá só o
**esqueleto**; o conteúdo é da página.

**Fronteira:** o **visual geral** (fundo, borda, raio, sombra, cabeçalho, tipografia, botões) vem do CSS externo.
A **página e o JS** mandam em **tamanho, margem e orientação** do conteúdo (grids, colunas, largura por `--modal-w`).
Modal montado por JS usa as mesmas classes (`.modal-backdrop`, `.modal`, `.modal-head`...): o JS não escreve cor nem borda.
Controles dentro do modal seguem as regras normais (select = `.input`, botão = `.btn`).

```html
<div class="modal-backdrop" id="meuModal">
  <div class="modal">
    <div class="modal-head"><h3>Título</h3><button class="btn quiet small" id="fechar">✕</button></div>
    <div class="modal-body"> ...conteúdo da página... </div>
    <div class="modal-foot"><button class="btn secondary">Cancelar</button><button class="btn primary">Salvar</button></div>
  </div>
</div>
```

```css
/* página: só tamanho e conteúdo */
#meuModal .modal{ --modal-w:640px; --modal-h:80vh; }
.meu-modal-colunas{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }

/* altura definida pelo JS (ex.: abaixo do header): tira o teto, a altura inline manda */
#modalPesquisa .modal{ --modal-h:none; }
```

- Abrir/fechar: `backdrop.classList.add('open')` / `remove('open')`. Abrir com `style.display='flex'` também funciona, mas prefira a classe.
- `z-index` do backdrop é 1000 (acima do header, que usa 99/100). **Não** declare outro na página.
- `.modal` limita a altura por `max-height: var(--modal-h, 86vh)`. Modal cuja **altura o JS calcula** declara `--modal-h:none`
  (não `100vh`) e deixa o JS definir a altura inline.
- **Só o corpo rola** (cabeçalho e rodapé fixos): `<div class="modal scroll-body">`. Não escreva `overflow:hidden` + `flex` na página.
- **Tabela de borda a borda** dentro do modal: `<div class="modal-body flush">` (sem o padding de 14px).
- Cabeçalho com título e botões usa `.modal-head` (não crie `.xxx-head` com o mesmo visual). Ele já quebra linha quando falta espaço.
- `.modal-foot` é opcional.

---

## 12. Tabelas

O `components.css` estiliza `table`, `th` e `td` direto (seletores de elemento), então toda tabela já nasce com o desenho do sistema.

- **Alinhamento à esquerda é o padrão.** Para centralizar: `<table class="center">`. O alinhamento vai **na classe da tabela**, nunca no `<tr>`
  (um `text-align` na linha não vence o `th`/`td`); vale também para tabela montada em template de JS. `table.left` é o nome antigo e continua aceito.
- Largura, colunas, rolagem (`overflow-x`) e cabeçalho fixo (`position:sticky`) são **layout da página**.
- **Sem `overflow:hidden` no `<table>`:** corta o balão do ⓘ e popovers dentro de `th`/`td`. Para cantos arredondados, arredonde célula a célula:

```css
.minha-tabela{ border-collapse:separate; border-spacing:0; }
.minha-tabela thead tr:first-child th:first-child{ border-top-left-radius:12px; }
.minha-tabela thead tr:first-child th:last-child{ border-top-right-radius:12px; }
.minha-tabela tbody tr:last-child td:first-child{ border-bottom-left-radius:12px; }
.minha-tabela tbody tr:last-child td:last-child{ border-bottom-right-radius:12px; }
```

- **Nunca `display:flex`/`display:grid` direto em `<td>`/`<th>`:** tira a célula do modelo de tabela e a borda e o fundo ficam desalinhados.
  O flex vai numa `<div>` dentro da célula: `<td><div class="acoes-linha">…</div></td>`.
- **Controles dentro de `<td>`:** `.input` e checkbox nativo (seção 5). A largura (`td .input{ width:100% }`) é da página.
- **Botões de linha** (↑ ↓ Remover): `.btn small`. Ficam fora das regras de destaque (seção 3.5).
- **Tabela dentro do card de destaque:** o global já dá a célula `--ui-cell-bg` e o cabeçalho com o véu do card; a página não pinta.
- **Borda:** grade completa por padrão (a revisão entre grade completa e só borda inferior está nas pendências, seção 20).

---

## 13. Hubs

`hub.css` é dono do grid de cards-link, da moldura, do texto interno, do raio, do padding e do badge de acesso restrito.
Cada hub só troca o texto. Pontos de atenção:

- **`hub.css` é exclusivo dos hubs.** Página que não é hub (cadastro-turmas, pesquisas, gestão...) não carrega esse arquivo e **não recebe regra nele**; o que for compartilhado entre páginas vai para o `components.css`, o que for de uma página fica no `<style>` dela. Também não reaproveite as classes `.l-*` do hub em página comum.
- No hub, `.card` é **card-link** (outra coisa que o `.card` de conteúdo). O `hub.css` carrega depois do `components.css`
  e vence nas propriedades que declara. Duas propriedades vazariam do global: `margin-bottom` e `box-shadow` em repouso;
  o `hub.css` agora zera as duas.
- `--card-bg` e `--card-border` estão declarados no `hub.css` **e** no `base.css` com valores idênticos.
  Só remova do hub depois de confirmar que **todos** os hubs carregam `base.css`.
- Hub não usa `.btn` nem `.card-destaque`, exceto o hub `admin` (card `.config-card.card-destaque`).
- **Badge de acesso restrito** (`<span class="card-badge">Admin</span>`): estilo único no `hub.css`; cada hub só troca o texto, que deve refletir os papéis reais.
- **Bloqueio por papel no hub é só interface** (esconde o link e mostra "Sem acesso"); a barreira real fica nas regras do servidor. O balão "Sem acesso" lê `--brand-fg` para a cor do texto, com fallback.
- **Grid de 4 cards:** `class="grid grid-atas"` (2×2). O `grid` junto é o que vira 1 coluna no celular. Não sobrescreva `grid-template-columns` na página. Card escondido por papel (`display:none`) não conta na grade.
- Texto em cor de marca nunca usa `--brand` puro: o hover do título do card usa `--brand-text` (seção 2.1).
- `.card-desc` e `.card-title` existem no `hub.css`. Em página de conteúdo, não reutilize esses nomes com outro visual.

---

## 14. O que fica na página (e só isso)

Layout e componentes exclusivos. Exemplos reais do cadastro de alunos: `.wrap`, `.grid`/`.grid-3`/`.grid2`/`.form-grid`,
`.inline`, `.split`, `.topbar`, `.actions`, `.wz-stepper`/`.wz-step`, `.foto-box`, `.docs-drop-area`, `.nee-*`, `.turno-btn`,
`.id-banner`, `.nat-*` (autocomplete), `.cep-status`, `.modo-edicao-banner`, `.campo-semilock-*`.

Mesmo esses usam `--ui-*`, e **não** declaram `html[data-theme="dark"]` para cor que os tokens já resolvem.
Dark manual só para cor fixa de status (verde/vermelho/âmbar). Cor fixa de status **precisa de par claro/escuro com contraste**. Esse par já existe no global:
`--ui-st-ok-*`, `--ui-st-warn-*`, `--ui-st-bad-*`, `--ui-st-info-*` (cada um com `-fg`, `-bg`, `-bd`).
Para **chip** (dado curto exibido) o componente é o `.badge` com as 5 cores (seção 6). **Use-os antes de declarar cor própria.** Se a página precisar de uma cor de
status que **não** é uma dessas quatro, declare o par (claro e escuro) em variáveis da página (`--gd-xxx-*`), nunca o hex solto
na regra. Referência do escuro: texto claro, fundo ~16%, borda ~55%. Não repita `#92400e` ou `#166534` no escuro: ficam ilegíveis.

Cores de **PDF/impressão** (RGB fixo em gerador de PDF) **não são UI**: ficam fora deste guia e não se trocam por `--ui-*`.
A linha que agrupa os chips (ex.: `.chips`; o nome é livre) é **layout da página**, não classe global.
**Cabeçalho de página** (`h1`, com ou sem emoji, e o subtítulo `.sub`): fica **local**, com tokens `--ui-*`. Título de card no padrão do sistema: 15px, peso 800, cor `--title-color` (é o `.section-title`).
**Bloco de foto** (círculo, pré-visualização, botões Escolher/Remover): componente da página (`.foto-*`).

---

## 15. Funções e trechos com visual próprio — **análise obrigatória**

> A migração **não termina no CSS**. Várias páginas têm **JS que desenha ou pinta elementos**:
> o visual está dentro da função, e um `grep` só no `<style>` não o encontra. Antes de apagar qualquer
> classe, procure onde ela é usada **também em JS** (arquivo `.js` externo, template literal, `classList`).
> Apagar a classe sem olhar a função quebra o visual de forma silenciosa (nada no console).

### 15.1 Padrões a procurar

| Onde está o visual | Por que merece análise | O que fazer |
|---|---|---|
| `style.cssText`, `el.style.x = ...` | cor/borda escrita no JS escapa de qualquer CSS global | trocar por classe; se for valor dinâmico (largura, posição), pode ficar |
| `innerHTML` / template literal com `style="..."` ou `class="..."` | HTML de modal, linha de lista, card montado em JS | conferir cada classe e cada `style=` contra esta tabela |
| `createElement` + `className = 'btn ...'` | botão criado por JS | trocar pela classe nova (seção 3.2) |
| `classList.add/remove/toggle` (`selected`, `checked`, `open`, `over`, `show`, `ativa`) | a classe é o **estado** de um componente da página | **não apagar** a regra CSS; só trocar tokens e remover dark duplicado |
| `querySelectorAll('.btn ...')` com seletor de classe | o JS depende do nome da classe | se renomear a classe, atualizar o seletor |
| Modal/banner/aviso criado por JS | pode ter CSS próprio inline | ver se cabe em `.modal`/`.cm-*`/`.aviso-warn`; senão é visual próprio (seção 14) |
| Lista ou card desenhado por JS (pesquisa, escola do gestor) | todo o item vive no template | usar `.card`/`.item` + variáveis; botões do item são `.btn small`; destaque criado por JS chama `ajustarContraste()` **depois** de inserir |
| Mapa de cor/hex no JS (`{violet:'#7c3aed',...}`) | quebra quando entra paleta nova | ler de `ThemeColors.palettes` (seção 18.4) |
| Função que decide cor por regra de negócio (verde/amarelo/vermelho de completude, status) | cor semântica fixa | manter; usar `--ui-st-ok-*`, `--ui-st-warn-*` e `--ui-st-bad-*` (já com par claro/escuro) |
| `confirm()`, `alert()`, `prompt()`, spans de status | feedback nativo ou inline | seção 10 |
| Ids/elementos removidos do HTML que o JS ainda escreve | `TypeError` e página em branco | seção 18.4 (conferir ids) |

### 15.2 Exemplos vistos no `cadastro-aluno-ativo.html`

Confirme com `grep` antes de agir; são o mapa do que precisa de olho:

- `_showToast`, `_toastSucesso/Erro/Aviso/Carregando`: visual montado com `style.cssText` → trocar pelo JS da seção 10.2.
- `_confirmModal`: já usa `.cm-*` (agora globais), mas o CSS `.cm-*` ainda está no `<style>` da página → apagar o CSS, manter a função (acrescentar `digitar` só se for usar).
- Modais montados por JS ("Encerrar matrícula" e "Trocar de turma"): usam `.cm-box` com `style="max-width:420px"`, `.cm-opcao`, `.cm-ok` e `.dz-btn`. O `max-width` inline é layout (pode ficar); `.dz-btn` é visual próprio (pílula vermelha) e **fica** na página.
- Botão criado por JS com `className = 'btn ghost'`: continua funcionando (`ghost` é alias de `secondary`); pode atualizar para `btn secondary`.
- `querySelectorAll('.grid-3 > .field, .foto-box, .actions-wizard .btn, .nee-block:not(.danger)')` (travar/destravar o formulário): depende dos nomes `.btn`, `.field`, `.foto-box`. **Não renomear esses nomes** sem atualizar o seletor.
- Alternância de estado por classe: `selected-sim` (`integral-btn`), `checked`, `open`, `sim`/`nao` (`nee-sim-nao`), `show` (banners), `ativa` (etapas do wizard), `bloqueada`. **Regras CSS desses estados ficam.**
- Elementos criados por JS com CSS local: `.modo-edicao-banner*`, `.campo-semilock-*`, `.id-banner*`, `.nat-dropdown`. São visuais próprios; só trocar tokens.
- Mensagens de status com cor fixa (`.cep-status`, `.docs-status`, `.badge-completude`, `.warn`, `.ok-msg`): três famílias com o mesmo desenho (ok/erro/carregando). **Busca em campo** (CEP) vira o chip da seção 6 ("Status de busca em campo"); enviar imagem e salvar não têm indicador por campo (toast geral); `.badge-completude` é chip de dado (`.badge`).

### 15.3 Regra de decisão

Para cada trecho com visual dentro de função, classifique em uma de quatro caixas e registre no relatório:

1. **Coberto pelo global** → trocar pela classe global e apagar o CSS local.
2. **Visual próprio da página** → manter, trocando só tokens (`--ui-*`) e removendo dark duplicado.
3. **Candidato a global** (se outra página tem o mesmo) → manter e **listar** no relatório (seção 16.6).
4. **Dúvida** → **pergunte antes** de apagar ou trocar. Não decida cor sozinho.

---

## 16. Procedimento de migração de uma página

### 16.1 Inventário (antes de editar)

```bash
# CSS e tokens
grep -n "<link\|<style\|</style>" pagina.html
grep -n ":root\|html\[data-theme" pagina.html
grep -n -- "--card\b\|--border\b\|--text\b\|--accent\|--pf-\|--primary\|--danger\b" pagina.html pagina.js pagina.css

# botões e classes
grep -n "\.btn\|btn-\|class=\"btn\|className *= *['\"\`]btn" pagina.html pagina.js

# cores escritas à mão
grep -n "#7c3aed\|#6d28d9\|#c4b5fd\|124,58,237\|color: *#fff\|color: *#ffffff" pagina.html pagina.js pagina.css

# visual dentro de JS (seção 13)
grep -n "style\.cssText\|\.style\.\|style=\"\|innerHTML\|createElement\|classList\|className" pagina.html pagina.js

# cor passada como argumento ou guardada em string/variável de JS (setStatus(txt,'#b91c1c'), 'var(--muted)')
grep -n "'#[0-9a-fA-F]\{3,8\}'\|\"#[0-9a-fA-F]\{3,8\}\"\|'var(--\|\"var(--" pagina.html pagina.js

# feedback
grep -n "confirm(\|prompt(\|alert(\|_showToast(\|setMsg(\|_confirmModal(" pagina.html pagina.js
```

Se a página tem `.css` e `.js` externos, **rode também neles** (e peça o arquivo se não o viu).

### 16.2 Classificar cada regra do `<style>`

| Caixa | Exemplo | Ação |
|---|---|---|
| **A. Duplica o global** | `.btn*`, `.card`, `.card-head`, `.field label/input`, `.modal*`, `.cm-*`, `.info-tip*`, `.card-destaque` (tokens/fundo), `@keyframes toastSubir` | **apagar** |
| **B. Layout da página** | grids, `.wrap`, `.actions`, `.topbar`, larguras | manter |
| **C. Componente próprio** | stepper, `.turno-btn`, `.nee-*`, `.foto-box` | manter; trocar tokens (2.2); remover dark manual |
| **D. Candidato a global** | mensagem de status de ação, `.chip` removível (com ×), `.count` | manter e registrar |
| **E. Dúvida** | qualquer coisa que não encaixa | perguntar |

**Antes de apagar, duas conferências:**
- **Seletor de elemento** (`label{}`, `input{}`, `select{}`, `table{}`, `h2{}`, `button{}`): vai além da página. O **header** (carregado por `fetch`) e os **scripts externos** (`header-logic`, `identidade-aluno.js`...) também geram `label`, `input`, `select`.
  Só apague se `grep` nos arquivos externos mostrar que nenhum gera esse elemento **sem** classe própria (ex.: dentro de `.field`); do contrário, mantenha e relate.
- **Classe de layout sem uso na página** (`.row`, `.form-grid`, `.actions`, `.hidden`): pode ser usada por arquivo externo. **Mantenha**, relate como "sem uso na página" e deixe a limpeza para a passada do módulo (seção 17).
- **Classe local com o mesmo nome de uma global** (seção 1.3): renomeie a local; não deixe as duas conviverem.

### 16.3 Style inline no HTML e nos templates de JS

Só entra `style="..."` quando **não existe** a regra em CSS **e** é estado alternado por JS (ex.: `display:none` inicial de um bloco que o JS mostra) ou valor realmente dinâmico (largura, posição calculada).
1. Já existe classe no global (`.btn`, `.card`, `.lbl`, `.input`, `.check`, `.badge`...)? Troque a tag/classe e apague o inline. (`.muted`, `.console` e `.stat-*` **não** são globais: vivem na página.)
2. Não existe, mas se repete? Crie **uma classe** no `<style>` da página (`.mt-12`, `.prev-tit`) e use nela. Em dúvida sobre o nome ou sobre valer para outras páginas, **pergunte ao usuário**.
3. Já é o padrão do elemento (`margin-top:0` em `h3`, `width:100%` em `table`)? Apague.
4. Vale também para o HTML montado em JS (`innerHTML`, template literal).
5. Aparência (cor, borda, fundo) nunca fica inline. **Exceção aceita:** valor **dinâmico de tamanho** passado por variável, como `style="--modal-w:720px"`, porque é medida e não aparência.
6. **Mostrar/esconder por JS:** em código novo prefira o atributo `hidden` (`el.hidden = true/false`): o `base.css` garante `[hidden]{display:none !important}`, então a classe de layout do elemento não o desfaz. `display:none` inline com `style.display=''` deixa de ser necessário.
   Uma classe `.hidden` **local** que o JS já alterna em vários pontos pode ficar; só não crie `.hidden` novo.
   ⚠️ Elemento que recebeu `hidden` só reaparece com `el.hidden = false`: `style.display` **não** o mostra (o `base.css` usa `!important`). Não alterne os dois no mesmo elemento.
   Não reescreva o que já funciona só para trocar. Antes de subir o `base.css`, rode `grep -n "hidden" pagina.html` e confirme que nenhum elemento usa `hidden` esperando aparecer por CSS.

### 16.4 Ordem de edição

1. Trocar tokens (tabela 2.2, **inclusive as variáveis locais de status** pelos `--ui-st-*`) em `<style>`, **em JS e em templates**. Só então apagar o `:root` local.
2. Trocar classes de botão (tabela 3.2) em HTML **e** JS.
3. Apagar regras da caixa A.
4. Trocar o JS de toast e modal (seção 10) e apagar `confirm/prompt/alert`.
5. Remover ⓘ/CSS de dica duplicado (seção 7); manter o HTML e o listener. **Não crie ⓘ novos por conta própria:** pergunte em quais cards ou campos o usuário quer tooltip.
6. Conferir os ids que o JS usa (seção 18.4).
7. `ThemeColors.ajustarContraste()` em `try/catch`, depois de o card existir.
8. Subir **HTML, JS e CSS juntos**: JS antigo com HTML novo dá `TypeError` e página em branco.

### 16.5 Teste mínimo

Claro e escuro, com as duas paletas **extremas**: **Tan** (clara) e **Azul** (escura); um toast de cada cor;
cada modal da página; cada botão (hover, desabilitado); card de destaque; `<a class="btn">` no escuro; **checkbox e radio dentro de `.field`** (um `.check` com o texto ao lado, sem quebra de linha).

### 16.6 Relatório que o chat entrega ao final

1. Regras **apagadas** (caixa A), com a linha ou o seletor.
2. Regras **trocadas** (tokens e classes).
3. Regras **mantidas** e por quê (caixas B e C).
4. **Candidatos a global** (caixa D).
5. **Funções analisadas** (seção 15): nome, o que pintam, decisão.
6. **Dúvidas** que ficaram.
7. **Módulo** da página (atas, ano ativo ou outro) e quais itens do relatório são específicos dele.

---

## 17. CSS externo compartilhado de módulo (`pesquisa.css`, `cadastro_admin.css`...)

Algumas páginas carregam um `.css` de módulo além do `<style>`. Ele segue as **mesmas regras** do `<style>` da página (seção 1):
não repinta componente global. Na prática:

1. **Antes de apagar** qualquer regra desse arquivo, confirme com `grep` em **todas as páginas que o carregam** que nenhuma a usa
   (a página migrada pode não usar mais, outra pode). Código morto de uma página não é código morto do módulo.
2. Se o arquivo compartilhado **repinta** um componente da página migrada (ex.: `#card-direita input[type="text"]` pintando um campo que já é
   `.input`), a especificidade dele pode vencer o global. **Não use `!important` nem repinte na página**: relate a regra para quem
   limpa o arquivo compartilhado, com o seletor e a linha.
3. Tokens antigos nesses arquivos (`--primary`, `--border`, `--text`, `--bg`, `--danger`, `#fff` fixo) seguem a tabela 2.2.
   Atenção a `--border` (vira cinza do `base.css`) e a `--danger` (vermelho para o que **não** é erro, como "Buscando…").
4. A limpeza do arquivo compartilhado é uma **passada própria**, depois que as páginas do módulo foram migradas; a página
   só **relata** o que encontrou nele.

---

## 18. Lógica ligada ao visual

Estas regras são de comportamento, mas decidem o que a pessoa **vê** (loading, estados, avisos). Valem junto das seções visuais.

### 18.1 Boot da página, loading e contraste

1. Inclua `loading-overlay.js` **antes** dos scripts globais, no mesmo ponto das outras páginas. O overlay aparece sozinho ao carregar.
   Não invente um texto local "Carregando…" para a página inteira; texto de estado **dentro de um card** segue a seção 9.
2. **Espere o Auth pronto** antes de ler o banco: `Auth.getSession()` responde na hora, mas `Auth.db` ainda não existe e dá `TypeError` na primeira carga.

```javascript
function _authPronto(){
  return new Promise((resolve) => {
    if(window.Auth && Auth.getSession && Auth.getSession()) return resolve();   // sessão em cache
    if(window.Auth && Auth.onReady) Auth.onReady(resolve); else resolve();
  });
}
```

3. **Boot com `try … finally`.** O `finally` esconde o overlay e ajusta o contraste mesmo se algo falhar. Sem ele, o sintoma é loading infinito sem nada no console:

```javascript
async function init(){
  try{
    await _authPronto();
    await carregarTela();                 // lê só o que a tela precisa (18.2)
  } finally {
    try{ if(window.ThemeColors && typeof ThemeColors.ajustarContraste === 'function') ThemeColors.ajustarContraste(); }
    catch(e){ console.warn('ajustarContraste:', e); }
    try{ Loading.esconder(); }catch(_){}
  }
}
init().catch((e) => { console.error('init:', e); setMsg('Erro ao carregar a página.', 'err'); });
```

4. **`ajustarContraste()`** sempre dentro de `try/catch` (nunca no caminho crítico) e **depois** de o card de destaque existir. Card criado por JS: chame
   **depois de inseri-lo** (o evento `colorchange` só reajusta os que já estão no DOM). Card escondido por papel (`display:none`) pode ficar assim.
5. **Erro que impede a página de aparecer** (não informado, falha ao carregar, não encontrado): card com `.aviso-warn` ⚠️ **e** toast de erro (seção 7.2); o `finally` esconde o overlay do mesmo jeito.

### 18.2 Leitura de dados sob demanda

Páginas de **gestão** que leem coleções inteiras do banco (cada leitura custa) seguem este padrão. Ele vale nos dois módulos
(atas: `_garantirTurmas()` e `_turmasCarregadas`; ano ativo: `_visaoCarregada`). Os nomes são da página; o padrão independe deles.

1. `inicializar()` **não** lê coleções inteiras. No máximo uma leitura barata de que a tela depende (ex.: o índice de anos, 1 documento).
2. Dados caros só por **ação da pessoa** (botão `🔄 Carregar dados`, `.btn.secondary`) ou por uma função que **precisa** deles (exportar, importar, reconstruir índice).
3. Uma função única (`_garantirTurmas(forcar)`) lê uma vez, guarda uma flag e reutiliza a memória (`forcar=false` → 0 leituras). `forcar=true` só no botão e antes de
   operação sensível a dado velho (importar, apagar).
4. **Antes da primeira carga**, os números mostram "—", nunca 0 (zero é uma informação verdadeira).
5. Falha de leitura: `setMsg(..., 'err')` (ou `'warn'` se o botão é opcional) e a função dependente **aborta** dizendo o que não aconteceu ("o backup não foi gerado").
6. A tela explica isso por **tooltip no título** (seção 7): "Os números só são lidos quando você aperta Carregar dados".
7. `Loading.esconder()` roda no fim do boot mesmo sem dados, porque a página já é utilizável (18.1).

### 18.3 Admin global sem escola

O admin global pode estar com **"Todas as escolas"**, ou seja, sem escola definida. Nesse estado `Auth.getActiveSchoolId()` devolve o marcador **`'ADMIN'`**, que **não é uma escola**.
O `db.firebase.js` usa essa mesma função em todo lugar: bloqueia a escrita nesse estado e a leitura volta vazia, sem erro.

**Quando se aplica:** à maioria das páginas. **Não** se aplica a hubs, páginas de gestão, páginas de configuração de usuário (perfil, login, cadastro de usuário)
nem às do módulo admin. Pode haver exceção: em dúvida, **pergunte**.

**Detecção (uma forma só, em todas as páginas):**

```javascript
function _semEscola(){
  const sid = (window.Auth && Auth.getActiveSchoolId) ? Auth.getActiveSchoolId() : '';
  return !sid || String(sid).trim().toUpperCase() === 'ADMIN';
}
```

Não use `__schoolId()` nem leitura direta do `localStorage` ou do banco local: a fonte é `Auth.getActiveSchoolId()`.

**Comportamento:**

1. **Só avisa.** `.aviso-warn` visível no carregamento (id `avisoSemEscola`), **só para o admin global** (nunca para usuário de escola). Não é toast nem tooltip.
2. **Texto (modelo único; só a ação muda):** "Escolha uma escola no topo da página para <ação>." (ex.: "pesquisar alunos", "cadastrar atas").
3. **A leitura já fica bloqueada** pelos scripts e pelas regras do banco (o select de turma não carrega). A página **não** bloqueia nada por conta própria.
4. **Nenhum botão é desabilitado** por causa desse estado (ex.: "Salvar turma" continua habilitado; a escrita já é barrada).
5. O aviso **"Nenhuma escola cadastrada"** e os **toasts de falha de leitura** ficam **suprimidos** nesse estado: seriam enganosos (a escola existe; só não foi escolhida).

### 18.4 Ids, mapas de cor e teste sem navegador

- **Antes de remover ou trocar um elemento do HTML, confira os ids que o JS usa.** `getElementById` de um id que sumiu devolve `null`, e o próximo `.textContent =` dá `TypeError`: página em branco.
  Liste com `grep -o "getElementById('[^']*')"` e confira que cada id continua no HTML (ou é criado por JS). Elemento que o JS mexe e que deixa de ser visível fica com `display:none`/`hidden`; nunca se apaga.
- **Mapa de cor/hex no JS** (`{violet:'#7c3aed', ...}`) quebra quando entra paleta nova: leia de `ThemeColors.palettes`. Cor passada como argumento também conta (seção 10.1).
- **Teste sem navegador** (jsdom): `Auth`, `Loading` e `DB` falsos; um toast de cada tipo; cada modal (cancelar, confirmar, Esc, clique no fundo, `digitar` certo e errado); coleção negada; admin sem escola.
  O jsdom **não reproduz** o repasse de clique do `<label>`: o bug do ⓘ dentro de `label for` só se confirma no navegador.

---

## 19. Páginas de admin e de configuração

Decisões visuais já tomadas para o módulo admin (e válidas para perfil, login e configuração):

- **Destaque em elemento que não é `.card`** (`.config-card.card-destaque`) já é coberto pelo global; o nome da classe é sempre `.card-destaque`.
- **Nome de seção com linha** (`.l-section` e semelhantes) **sai** das páginas do módulo admin; o hub da raiz mantém o dele. Subtítulo que só repete o título também sai.
- **Legenda descritiva de card** (`.card-desc`, `<p class="desc">`, "Dica: …") **vira tooltip** no título (seção 7). Valor dinâmico dentro do balão (ex.: `<code id="origin">`) é preenchido por JS.
- **O tooltip não pode contradizer o comportamento:** se diz "não pode ser editado", o campo é `readonly` de verdade.
- **Nome da escola no título** quando a tela só mostra uma escola (gestor): sai.
- **Duas telas no mesmo arquivo** (admin global × gestor): o JS decide o papel e esconde o que não vale; o que é exclusivo do admin global fica **depois** do retorno antecipado do gestor.

---

## 20. Pendências

1. **Limpeza do CSS global ao fim da migração.** Quando **todas** as páginas estiverem migradas, apague do `components.css` os aliases e o legado de layout, **só depois** de o `grep` abaixo dar zero em todas as páginas e nos `.css`/`.js` externos:

```bash
grep -rnE "btn-(primary|gray|ghost|outline|danger|approve)|ldanger|pop-export|docs-drop-|table-cell-bg|table class=\"left\"" --include=*.html --include=*.js --include=*.css .
grep -rnE "class=\"[^\"]*\b(filters|filter-actions|table-scroll)\b|detalhe-actions" --include=*.html --include=*.js --include=*.css .
```

   Aliases: `.btn-primary`, `.btn-gray`, `.btn-ghost`, `.btn-outline`, `.btn-danger`, `.ldanger`, `.btn-approve`, `.pop-export`, `.docs-drop-*`, `--ui-table-cell-bg`, `table.left`.
   Legado de layout (seção 9 do arquivo): `.filters`, `.filter-actions`, o `flex` do `.field`, `.table-scroll`, a margem esquerda do `.badge` e `#card-direita .detalhe-actions`.
2. **Borda de tabela:** grade completa (global) × só borda inferior (cadastro de alunos). Decidir ao migrar o cadastro de alunos.
3. **Helper de escola:** a comparação com `'ADMIN'` existe duplicada (em cada página e no `db.firebase.js`). Sugestão: expor `Auth.semEscola()` no `auth.firebase.js` e trocar o `_semEscola()` da seção 18.3 por ele.