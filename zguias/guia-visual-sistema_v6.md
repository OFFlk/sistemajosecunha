# Guia do visual do sistema (v6)

> **Leia este guia ANTES de mexer no visual de qualquer página.**
> Ele substitui o CSS que os guias antigos mandavam colar inline em cada página
> (`guia-toasts.md` seção 3, `guia-migracao-contraste-theme-colors.md` partes 1, 2, 5 e 7).
> Aqueles guias continuam valendo para a **lógica** (JS, regras de negócio, Firestore).
> Para o **CSS**, a fonte da verdade agora são os arquivos globais. Ver seção 17.

Referências de arquivo: `base.css`, `components.css`, `hub.css` (alterados),
`header.css` (**não alterar por enquanto**) e `theme-colors.js`.

**O que a v6 mudou (pós-piloto com `cadastro-turmas.html`):** placeholder de select (`disabled hidden selected`, seção 5);
exemplos de chip marcados como ilustração e duas telas com ordens diferentes, contagem e caixa de orientação (5-A e 6.2);
`.help`/`.subnote` soltos sobre o destaque (4.2); `outline` antigo de marca na tabela 3.2; `\n` e cores hex antigas no
`_confirmModal` (8.3); largura do `.field` e critério prático de `.wide` (5 e 6.1); toasts de leitura suprimidos sem escola (19);
D22 e D23.

**O que a v5 mudou (pós-piloto com `cadastro-atas.html`):** toast "carregando" **sem expirar** (8.2); `.dest-painel` descrito,
texto solto sobre o destaque coberto, painel × aviso e sub-card (4.2); `.input` sem largura própria e regra do select de série (5);
fronteira global × página nos modais e `--modal-w` inline (9, 14.3-A); regra de `primary` lado a lado (3.1); chip único = nível 1 (5-A);
seção 19 (admin sem escola: só avisa); `_toastLimpar()` só remove o "carregando"; D17 a D21 na seção 16.

**O que a v4 mudou (pós-piloto com `gestao-atas.html`):** chip dentro de `.aviso-warn` (5-A); `.dest-painel` e `.dest-tit`
globais e regra de conteúdo de leitura sobre o destaque (4.2); critério de tamanho do ⓘ e critério **tooltip × aviso** (6.2);
seção 18 (leitura de dados sob demanda); variáveis locais de status trocadas por `--ui-st-*` (2.2 e 14.3);
D14 a D16 na seção 16. D11, D12 e D13 estão fechadas.

**O que a v3 mudou (pós-piloto com `gerir-dados-ano-ativo.html`):** botão `danger` sólido; hover forte nos botões;
`.card` com `overflow:visible` e `--card-pad-x/-y`; classes avulsas de campo (`.input`, `.lbl`, `.check`);
tokens de status (`--ui-st-*`) e o **sistema de chips de 5 cores** (`.badge`, seção 5-A); `--ui-cell-bg`; modal com `--modal-h:none`,
`.scroll-body` e `.flush`; `table.left`; atributo `hidden`; convenção de prefixo; regra de inline (14.3-A).

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
  causa do logo roxo, guia antigo 5.8.)
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
| `.btn.danger` | vermelho **sólido** (texto branco) | ação destrutiva. ⚠️ Na paleta Vermelho tem a mesma cor do `primary`: não os coloque lado a lado |
| `.btn.success` | verde | aprovar, confirmar positivo |
| `.btn.cancel` | neutro com texto apagado | cancelar |
| `.btn.small` (modificador) | tamanho menor | botão em linha de tabela, em item de lista |

Estados já inclusos: hover, `:active`, `:focus-visible`, `:disabled` e `[aria-disabled="true"]`.
Hover dos botões neutro, `secondary`, `outline`, `neutral` e `cancel`: preenchimento de marca (22%) + anel de 3px, não só a troca do tom da borda. `primary`, `danger` e `success` escurecem sem anel. No tema **escuro**, o hover do `outline` usa o tom claro de texto da marca (a cor de marca escura quase não aparecia); isso já está no CSS, a página não faz nada.
`<label class="btn ...">` (ex.: carregar arquivo) já tem cursor de botão: **não** repetir `cursor:pointer` inline, e dois botões lado a lado no mesmo papel (exportar/importar) usam a **mesma** variante.

### 3.2 Tabela de troca de classes

| Classe antiga | Classe nova | Observação |
|---|---|---|
| `btn btn-primary`, `btn primary` | `btn primary` | |
| `btn-gray`, `btn ghost`, `btn secondary` | `btn secondary` | `btn-gray` não é cinza: era de marca |
| `btn-ghost` (transparente) | `btn quiet` | **não** confundir com `btn ghost` (chip) |
| `btn-outline` | `btn outline` | |
| `btn outline` local com **fundo claro de marca e texto de marca** | `btn outline` global (aceito; o visual muda, é o esperado) |
| `btn outline` do cadastro (era neutro: fundo de card, borda cinza) | `btn neutral` | conferir o visual da página original |
| `btn-danger`, `btn danger`, `btn ldanger`, `btn-danger-sm` | `btn danger` | vermelho **sólido**, como no global antigo (o translúcido foi abandonado: pouco indicativo) |
| `btn-approve` | `btn success` | |
| `btn-brand-sm` | `btn primary small` | |
| `btn-neutral` (local) | `btn neutral` | |
| `btn cancel` | `btn cancel` | |
| `btn-file`, `btn.success`/`btn.cancel` locais | **analisar** (seção 13) | vêm de CSS local; confirmar o papel antes de trocar |

### 3.3 Proibido no `<style>` da página

- Declarar `.btn`, `.btn.algo` ou `.btn-algo` (nem "só um ajuste de tamanho").
- `color:#fff` fixo em fundo de marca.
- Repetir hover/dark de botão com `html[data-theme="dark"]`.
- `!important` para vencer o global. Se foi preciso, algo está errado: **pergunte**.
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
(`Loading.esconder()`): ver guia de contraste 7.1 (lógica, continua valendo).

**Fica na página** (é visual próprio, ver seção 13), usando `--dest-*`:
stepper dentro do destaque, chips marcáveis dentro do destaque, campo desabilitado dentro do destaque.
As receitas estão no guia de contraste 5.5 e 5.6. **Troque os tokens `--pf-*` pelos `--ui-*`
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
**filhos diretos do destaque ou do `.card-head`** já ficam na cor do destaque. Texto solto em `span`/`div` (contagem, "Nenhuma turma") usa `.subnote` ou, se a página já o tem, a mensagem local `.help`: as duas ficam
na cor do destaque. Qualquer outro texto corrido vai em `.dest-painel`; não pinte cor na página.

**`.dest-painel` × `.aviso-warn`:** os dois são válidos sobre o destaque. `.aviso-warn` quando é **aviso** (informação necessária
ou importante, 6.2); `.dest-painel` quando é informação de **contexto** (ex.: "Metas da turma").

**Sub-card (`.item`):** card dentro de card, com fundo e texto próprios (`--ui-surface`, `--ui-text`, borda `--ui-border`).
Botões dentro dele **não** recebem o estilo do destaque (seção 3.5). Ainda não é global (D19): se a página precisar, defina uma
classe local com esses tokens, sem repintar `.card`.

Cuidados que continuam valendo na tabela dentro do destaque: nunca `overflow:hidden` no `<table>`
(corta o balão do ⓘ) e nunca `display:flex` direto em `<td>`/`<th>` (guia de contraste 3.2 e 3.3).

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
Elas têm a mesma aparência do `.field`. **O `.input` avulso não tem largura própria**: quem define é a página (`width:100%` em coluna, largura fixa em linha de filtros). Não apague o `width` ao migrar um campo que já o tinha. A posição também é da página:

```html
<label class="lbl" for="gaTurma">Turma</label>
<select class="input" id="gaTurma">...</select>

<label class="check"><input type="checkbox"> Todas as escolas</label>
```

**Largura:** dentro de `.field` o controle **já ocupa 100% da largura do `.field`**; a largura do campo é a do `.field` (layout da página). Não declare `width` no `input`/`select`.

**Select sem escolha:** não tem uma opção selecionável "Selecione…". Enquanto não há escolha, fica em branco. Se o select precisa de **dica**
(ex.: catálogo com botão "Adicionar", em que a pessoa não adivinha o que escolher), use um placeholder que **aparece no campo mas não na lista**:

```html
<select id="serie" class="input">
  <option value="" disabled hidden selected>Escolha a série…</option>
  <option>1º ano</option> ...
</select>
```

Não crie `.xxx-in`/`.xxx-chk` na página com o visual de campo (foi o que o piloto fez antes de existirem).
O que **ainda** não está no global: `h2`, `h3`, `label` genérico e placeholder escuro como regras de base (D6).

---

## 5-A. Chips de informação (5 cores)

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
**Contagem** ("N aluno(s)") também recebe nível: ali ficou **neutro** quando é maior que 0 e **cinza** quando é 0 (aprovado nessa tela).

### Regras

- **A página não declara cor de chip.** Nada de `.badge-serie`, `.status-inativa`, `.pill` com cor própria: é `badge` + uma das classes acima.
- Ao migrar, **remova `pill`** (o CSS local do `.pill` vence o `.badge` global) e apague os `.badge.xxx` locais.
- Se todos os chips da tela ficam variáveis, nada se destaca: use os 3 níveis.
- Espaço entre chips é do container (`gap`), não do chip. (O `.badge` ainda tem margem esquerda de 4px **legada** na seção 9 do `components.css`, só para não quebrar páginas antigas.)
- Chip **removível** (com ×), contador (`.count`) e mensagem de status de ação (CEP, upload) **não** são `.badge`: ficam na página (D3).
- Chip **dentro de `.aviso-warn`**: automático. O chip variável ganha fundo sólido de card (o aviso usa o fundo de chip e o chip sumiria); as outras cores já têm tinta própria. Não declare nada na página.
- Contador com número em destaque (`.sum-chip`: "3 novas", "0 suspeitas") **não** é `.badge`: é `.count`, fica na página, e usa `--ui-st-*` para ok/aviso.
- Chip solto **direto no fundo do card de destaque**: o variável pode perder contraste. Em listagem, o chip fica dentro do `.item` (fundo próprio), como em turmas. Se for preciso chip no fundo do destaque, **pergunte**.

### Trocas de classes antigas

`pill badge` → `badge` (nível 1) · `badge.status-inativa` → `badge bad` · `badge-serie` → `badge neutral` (se a série é nível 2 naquela tela) ·
`badge.ok` / `badge.danger` (gestão) → `badge ok` / `badge bad` · `badge.warn` e `badge-completude.amarelo` → **sem 6ª cor**:
classifique pelo nível de prioridade (variável, neutro ou cinza); se for verdadeiro/falso, `ok`/`bad`; se não encaixar, pergunte.

---

## 6. Tooltip (ⓘ)

CSS: **só no `components.css`** (`.info-tip`, `.info-tip-bubble`, `.wide`, `.align-right`).
Não copie o bloco para a página, e a checagem de tokens do guia antigo 2.1.1 deixou de existir.

HTML (igual ao guia antigo 2.2; o `preventDefault` não é enfeite):

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

### 6.1 Tamanho e posição do balão

| Situação | Classe do balão |
|---|---|
| ⓘ em bloco de **largura cheia** (um card por linha, cabeçalho de seção) e texto longo | `.wide` |
| ⓘ em colunas **lado a lado** (ex.: Exportar e Importar) | padrão (estreito) |
| ⓘ perto da **borda direita** da tela ou do card | `.align-right` (combina com o padrão e com `.wide`) |

Regra prática para "texto longo": se o texto passa de cerca de **140 caracteres** (4 linhas no balão estreito), use `.wide`.

Exemplo da `gestao-atas`: "Exportar" e "Importar" lado a lado são estreitos (o de Importar, na coluna direita, usa `.align-right`);
as seções de largura cheia (Schemas, índice de anos, Apagar turmas) usam `.wide`.

### 6.2 Tooltip × aviso (critério aprovado)

**Tooltip é dica**: orienta como a função do card funciona. **Aviso é informação necessária**: para o funcionamento pleno
ou porque é importante (ou urgente) a pessoa saber.

- **Tooltip (ⓘ)** = dica sobre o que a função **faz**, **por que existe** ou uma **precaução** que não impede a função nem é urgente.
  A pessoa usa a tela sem ler. Ex.: "Schema é a lista de matérias de uma ata…", "Os números só são lidos quando você aperta
  Carregar dados", "Isso apaga a turma, faça um backup por precaução".
- **Aviso** (`.aviso-warn`; ou texto visível da página, como `.muted`/`.help`) = informação **necessária** para o funcionamento pleno
  ou **importante/urgente**, e também o **estado atual**. Ex.: "Índice vazio — a pesquisa usa a lista fixa de anos",
  "Última reconstrução: …".
- Caixa de **orientação de fluxo** ("Fluxo: 1. escolha… 2. clique…") também é **aviso** (necessária para o funcionamento pleno): `.aviso-warn`. Já os tooltips de **precaução** (série, ID) continuam tooltips.
- Teste rápido: *a tela funciona e a pessoa entende sem essa informação? É tooltip. A informação é necessária para o
  funcionamento pleno ou é importante/urgente saber? É aviso.*
- Não classifique por assunto (apagar, importar...) e sim por **necessidade e urgência**: uma dica de precaução sobre apagar continua sendo tooltip.

---

## 7. Aviso dentro de card (não é toast)

`.aviso-warn`: fundo neutro, faixa esquerda âmbar, sem fundo amarelo. Dentro do destaque usa o véu do card.
O sinal de atenção é o ⚠️ do texto. Mensagem **momentânea** é toast (seção 8), não `.aviso-warn`.

---

## 8. Toast e modal de confirmação

### 8.1 O que mudou

O **CSS** agora é global (`.toast*`, `.modal-backdrop`, `.cm-*`). O **JS** deixa de montar estilo:
só cria elementos com classe. **Apague** os `style.cssText` do toast e do modal, o `@keyframes toastSubir`
e os `.cm-*`/`.modal-backdrop` do `<style>` da página.

As **4 cores** e o mapeamento de `setMsg` não mudaram (guia de toasts, seção 1 e 4):

| Situação | Cor | `kind` |
|---|---|---|
| Sucesso | verde | `"ok"` |
| Aviso / cancelar | âmbar | `"warn"` |
| Carregando | azul (**sem expirar**) | `"loading"` |
| Erro | vermelho | `"err"` |

Situação que não encaixa em nenhuma das 4: **não escolha cor, pergunte**. O padrão seguro é `warn`.

### 8.2 JS padrão (substitui a seção 2 do `guia-toasts.md`)

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

### 8.2-A Toast "carregando" (sem expirar)

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

> Padrão descrito a partir do relato do piloto `cadastro-atas`; confira contra o código dessa página.

> Toda chamada direta antiga `_showToast(msg, '#166534', '...', 2500)` precisa virar `_toastSucesso(msg)` etc.
> Procure por `_showToast(` com `grep`: assinatura mudou.
> O toast é **único** (`#_toastGlobal`, o próximo substitui) e `setMsg('')` não limpa nada.

### 8.3 Modal de confirmação (substitui `confirm()` e `prompt()`)

`corpo` é **HTML**: escape tudo que for dinâmico com `_escHtml`. Cancelar = Esc, clique no fundo ou botão.
O foco inicial vai para **Cancelar** (lado seguro). `digitar` troca o `prompt()` de "digite X para confirmar".

```javascript
function _escHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// corDestaque: 'danger' = ação destrutiva (botão vermelho); qualquer outro = cor de marca.
function _confirmModal({ titulo, corpo, corDestaque, textoConfirmar, textoCancelar, digitar }){
  return new Promise((resolve) => {
    const perigo = corDestaque === 'danger';
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML =
      `<div class="cm-box" role="dialog" aria-modal="true">`+
        `<h3 class="cm-titulo${perigo ? ' perigo' : ''}">${_escHtml(titulo || 'Confirmar ação')}</h3>`+
        `<p class="cm-corpo">${corpo || ''}</p>`+
        (digitar ? `<input type="text" class="cm-input" id="_confirmModalInput" autocomplete="off" placeholder="${_escHtml(digitar)}">` : '')+
        `<div class="cm-acoes">`+
          `<button type="button" class="btn secondary" id="_confirmModalCancelar">${_escHtml(textoCancelar || 'Cancelar')}</button>`+
          `<button type="button" class="cm-ok${perigo ? ' perigo' : ''}" id="_confirmModalOk"${digitar ? ' disabled' : ''}>${_escHtml(textoConfirmar || 'Continuar')}</button>`+
        `</div>`+
      `</div>`;
    document.body.appendChild(backdrop);
    const ok = backdrop.querySelector('#_confirmModalOk');
    const cancelar = backdrop.querySelector('#_confirmModalCancelar');
    const input = backdrop.querySelector('#_confirmModalInput');
    function fechar(r){ document.removeEventListener('keydown', onKey); backdrop.remove(); resolve(r); }
    function onKey(ev){ if(ev.key === 'Escape') fechar(false); }
    document.addEventListener('keydown', onKey);
    ok.addEventListener('click', () => fechar(true));
    cancelar.addEventListener('click', () => fechar(false));
    backdrop.addEventListener('click', (ev) => { if(ev.target === backdrop) fechar(false); });
    if(input) input.addEventListener('input', () => { ok.disabled = (input.value !== digitar); });
    cancelar.focus();
  });
}
```

**Quebra de linha:** `corpo` é HTML, mas `\n` **quebra linha** (o `.cm-corpo` global tem `white-space: pre-line`). Não escreva `white-space` inline; para estrutura maior use tags (`<br>`, `<strong>`), sempre com valor dinâmico escapado por `_escHtml`.

**Chamadas antigas com `corDestaque` em hex:** `'#991b1b'` / `'#b91c1c'` (vermelho) → `corDestaque:'danger'`. `'#b45309'` (âmbar padrão) ou omitido →
**omita** (vira a cor de marca; é a mudança esperada, o acento padrão deixa de ser âmbar). Outro hex: pergunte.

Uso: `const sim = await _confirmModal({ titulo:'Apagar?', corpo:'Não dá para desfazer.', corDestaque:'danger' }); if(!sim) return;`.
Regra prática: decisão do usuário (sim/não) → `_confirmModal`; informação → `setMsg`.
`confirm()`, `prompt()` e `alert()` nativos não devem sobrar (exceto `alert()` antes de redirecionar por acesso negado).

Outras regras do guia de toasts que continuam: `refresh()`/`renderMeta()` não dispara toast de "Carregando…"
(trocaria o toast de sucesso que acabou de aparecer); todo `catch` de ação tem `console.error` com contexto.

---

## 9. Modais "grandes"

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

## 10. Tabelas (**em aberto**, ver D1)

O global ainda tem `table`, `th`, `td` como seletores de elemento (texto **centralizado**, borda em todas as células).
Várias páginas usam outro desenho (alinhado à esquerda, só borda inferior, cabeçalho fixo).
**Até a decisão D1:** não apague regras de tabela do `<style>` da página e não crie regra nova de aparência global.
Regras que continuam: sem `overflow:hidden` no `<table>`, sem `display:flex` em `<td>`.

⚠️ `text-align` **no `<tr>` não funciona**: o `th`/`td` global (centralizado) vence a herança. Em tabela alinhada à esquerda
use `<table class="left">` (vale também para tabela montada em template de JS). Aplicar `style="text-align:left"` na linha
não resolve e deve ser apagado.

---

## 11. Hubs

`hub.css` é dono do grid de cards-link, da moldura, do texto interno, do raio, do padding e do badge de acesso restrito.
Cada hub só troca o texto. Pontos de atenção:

- No hub, `.card` é **card-link** (outra coisa que o `.card` de conteúdo). O `hub.css` carrega depois do `components.css`
  e vence nas propriedades que declara. Duas propriedades vazariam do global: `margin-bottom` e `box-shadow` em repouso;
  o `hub.css` agora zera as duas.
- `--card-bg` e `--card-border` estão declarados no `hub.css` **e** no `base.css` com valores idênticos.
  Só remova do hub depois de confirmar que **todos** os hubs carregam `base.css`.
- Hub não usa `.btn` nem `.card-destaque`, exceto o hub `admin` (card `.config-card.card-destaque`, guia de contraste 7.1).
- `.card-desc` e `.card-title` existem no `hub.css`. Em página de conteúdo, não reutilize esses nomes com outro visual.

---

## 12. O que fica na página (e só isso)

Layout e componentes exclusivos. Exemplos reais do cadastro de alunos: `.wrap`, `.grid`/`.grid-3`/`.grid2`/`.form-grid`,
`.inline`, `.split`, `.topbar`, `.actions`, `.wz-stepper`/`.wz-step`, `.foto-box`, `.docs-drop-area`, `.nee-*`, `.turno-btn`,
`.id-banner`, `.nat-*` (autocomplete), `.cep-status`, `.modo-edicao-banner`, `.campo-semilock-*`.

Mesmo esses usam `--ui-*`, e **não** declaram `html[data-theme="dark"]` para cor que os tokens já resolvem.
Dark manual só para cor fixa de status (verde/vermelho/âmbar). Cor fixa de status **precisa de par claro/escuro com contraste**. Esse par já existe no global:
`--ui-st-ok-*`, `--ui-st-warn-*`, `--ui-st-bad-*`, `--ui-st-info-*` (cada um com `-fg`, `-bg`, `-bd`).
Para **chip** (dado curto exibido) o componente é o `.badge` com as 5 cores (seção 5-A). **Use-os antes de declarar cor própria.** Se a página precisar de uma cor de
status que **não** é uma dessas quatro, declare o par (claro e escuro) em variáveis da página (`--gd-xxx-*`), nunca o hex solto
na regra. Referência do escuro: texto claro, fundo ~16%, borda ~55%. Não repita `#92400e` ou `#166534` no escuro: ficam ilegíveis.

---

## 13. Funções e trechos com visual próprio — **análise obrigatória**

> A migração **não termina no CSS**. Várias páginas têm **JS que desenha ou pinta elementos**:
> o visual está dentro da função, e um `grep` só no `<style>` não o encontra. Antes de apagar qualquer
> classe, procure onde ela é usada **também em JS** (arquivo `.js` externo, template literal, `classList`).
> Apagar a classe sem olhar a função quebra o visual de forma silenciosa (nada no console).

### 13.1 Padrões a procurar

| Onde está o visual | Por que merece análise | O que fazer |
|---|---|---|
| `style.cssText`, `el.style.x = ...` | cor/borda escrita no JS escapa de qualquer CSS global | trocar por classe; se for valor dinâmico (largura, posição), pode ficar |
| `innerHTML` / template literal com `style="..."` ou `class="..."` | HTML de modal, linha de lista, card montado em JS | conferir cada classe e cada `style=` contra esta tabela |
| `createElement` + `className = 'btn ...'` | botão criado por JS | trocar pela classe nova (seção 3.2) |
| `classList.add/remove/toggle` (`selected`, `checked`, `open`, `over`, `show`, `ativa`) | a classe é o **estado** de um componente da página | **não apagar** a regra CSS; só trocar tokens e remover dark duplicado |
| `querySelectorAll('.btn ...')` com seletor de classe | o JS depende do nome da classe | se renomear a classe, atualizar o seletor |
| Modal/banner/aviso criado por JS | pode ter CSS próprio inline | ver se cabe em `.modal`/`.cm-*`/`.aviso-warn`; senão é visual próprio (seção 12) |
| Lista ou card desenhado por JS (pesquisa, escola do gestor) | todo o item vive no template | usar `.card`/`.item` + variáveis; botões do item são `.btn small`; destaque criado por JS chama `ajustarContraste()` **depois** de inserir |
| Mapa de cor/hex no JS (`{violet:'#7c3aed',...}`) | quebra quando entra paleta nova | ler de `ThemeColors.palettes` (guia de contraste 1.11) |
| Função que decide cor por regra de negócio (verde/amarelo/vermelho de completude, status) | cor semântica fixa | manter, usar `--ui-success-*`/`--ui-danger-*` quando existir; âmbar é cor fixa por enquanto |
| `confirm()`, `alert()`, `prompt()`, spans de status | feedback nativo ou inline | seção 8 |
| Ids/elementos removidos do HTML que o JS ainda escreve | `TypeError` e página em branco | guia de contraste 5.1 (conferir ids) |

### 13.2 Exemplos vistos no `cadastro-aluno-ativo.html`

Confirme com `grep` antes de agir; são o mapa do que precisa de olho:

- `_showToast`, `_toastSucesso/Erro/Aviso/Carregando`: visual montado com `style.cssText` → trocar pelo JS da seção 8.2.
- `_confirmModal`: já usa `.cm-*` (agora globais), mas o CSS `.cm-*` ainda está no `<style>` da página → apagar o CSS, manter a função (acrescentar `digitar` só se for usar).
- Modais montados por JS ("Encerrar matrícula" e "Trocar de turma"): usam `.cm-box` com `style="max-width:420px"`, `.cm-opcao`, `.cm-ok` e `.dz-btn`. O `max-width` inline é layout (pode ficar); `.dz-btn` é visual próprio (pílula vermelha) e **fica** na página.
- Botão criado por JS com `className = 'btn ghost'`: continua funcionando (`ghost` é alias de `secondary`); pode atualizar para `btn secondary`.
- `querySelectorAll('.grid-3 > .field, .foto-box, .actions-wizard .btn, .nee-block:not(.danger)')` (travar/destravar o formulário): depende dos nomes `.btn`, `.field`, `.foto-box`. **Não renomear esses nomes** sem atualizar o seletor.
- Alternância de estado por classe: `selected-sim` (`integral-btn`), `checked`, `open`, `sim`/`nao` (`nee-sim-nao`), `show` (banners), `ativa` (etapas do wizard), `bloqueada`. **Regras CSS desses estados ficam.**
- Elementos criados por JS com CSS local: `.modo-edicao-banner*`, `.campo-semilock-*`, `.id-banner*`, `.nat-dropdown`. São visuais próprios; só trocar tokens.
- Mensagens de status com cor fixa (`.cep-status`, `.docs-status`, `.badge-completude`, `.help.ok/.err`, `.warn`, `.ok-msg`): três famílias com o mesmo desenho de status (ok/erro/carregando). Chip de **dado** (ok/não/inativo) já é o `.badge` (seção 5-A); mensagem de **status de ação** (CEP, upload) segue como candidata (D3) e fica na página.

### 13.3 Regra de decisão

Para cada trecho com visual dentro de função, classifique em uma de quatro caixas e registre no relatório:

1. **Coberto pelo global** → trocar pela classe global e apagar o CSS local.
2. **Visual próprio da página** → manter, trocando só tokens (`--ui-*`) e removendo dark duplicado.
3. **Candidato a global** (se outra página tem o mesmo) → manter e **listar** no relatório (seção 14.5).
4. **Dúvida** → **pergunte antes** de apagar ou trocar. Não decida cor sozinho.

---

## 14. Procedimento de migração de uma página

### 14.1 Inventário (antes de editar)

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

# feedback
grep -n "confirm(\|prompt(\|alert(\|_showToast(\|setMsg(\|_confirmModal(" pagina.html pagina.js
```

Se a página tem `.css` e `.js` externos, **rode também neles** (e peça o arquivo se não o viu).

### 14.2 Classificar cada regra do `<style>`

| Caixa | Exemplo | Ação |
|---|---|---|
| **A. Duplica o global** | `.btn*`, `.card`, `.card-head`, `.field label/input`, `.modal*`, `.cm-*`, `.info-tip*`, `.card-destaque` (tokens/fundo), `@keyframes toastSubir` | **apagar** |
| **B. Layout da página** | grids, `.wrap`, `.actions`, `.topbar`, larguras | manter |
| **C. Componente próprio** | stepper, `.turno-btn`, `.nee-*`, `.foto-box` | manter; trocar tokens (2.2); remover dark manual |
| **D. Candidato a global** | mensagem de status de ação, `.chip` removível (com ×), `.count` | manter e registrar |
| **E. Dúvida** | qualquer coisa que não encaixa | perguntar |

### 14.3-A Style inline no HTML e nos templates de JS

Só entra `style="..."` quando **não existe** a regra em CSS **e** é estado alternado por JS (ex.: `display:none` inicial de um bloco que o JS mostra) ou valor realmente dinâmico (largura, posição calculada).
1. Já existe classe no global (`.btn`, `.card`, `.lbl`, `.input`, `.check`, `.badge`...)? Troque a tag/classe e apague o inline. (`.muted`, `.console` e `.stat-*` **não** são globais: vivem na página.)
2. Não existe, mas se repete? Crie **uma classe** no `<style>` da página (`.mt-12`, `.prev-tit`) e use nela.
3. Já é o padrão do elemento (`margin-top:0` em `h3`, `width:100%` em `table`)? Apague.
4. Vale também para o HTML montado em JS (`innerHTML`, template literal).
5. Aparência (cor, borda, fundo) nunca fica inline. **Exceção aceita:** valor **dinâmico de tamanho** passado por variável, como `style="--modal-w:720px"`, porque é medida e não aparência.
6. **Mostrar/esconder por JS:** em código novo prefira o atributo `hidden` (`el.hidden = true/false`): o `base.css` garante `[hidden]{display:none !important}`, então a classe de layout do elemento não o desfaz. `display:none` inline com `style.display=''` deixa de ser necessário.
   Uma classe `.hidden` **local** que o JS já alterna em vários pontos pode ficar; só não crie `.hidden` novo.
   Não reescreva o que já funciona só para trocar. Antes de subir o `base.css`, rode `grep -n "hidden" pagina.html` e confirme que nenhum elemento usa `hidden` esperando aparecer por CSS.

### 14.3 Ordem de edição

1. Trocar tokens (tabela 2.2, **inclusive as variáveis locais de status** pelos `--ui-st-*`) em `<style>`, **em JS e em templates**. Só então apagar o `:root` local.
2. Trocar classes de botão (tabela 3.2) em HTML **e** JS.
3. Apagar regras da caixa A.
4. Trocar o JS de toast e modal (seção 8) e apagar `confirm/prompt/alert`.
5. Remover ⓘ/CSS de dica duplicado (seção 6); manter o HTML e o listener.
6. Conferir os ids que o JS usa (guia de contraste 5.1).
7. `ThemeColors.ajustarContraste()` em `try/catch`, depois de o card existir.
8. Subir **HTML + JS + CSS juntos** com `?v=N` nos `<link>` e `<script src>`.

### 14.4 Teste mínimo

Claro e escuro, com **uma paleta clara (Tan)** e **uma escura (Azul Escuro ou Verde)**; um toast de cada cor;
cada modal da página; cada botão (hover, desabilitado); card de destaque; `<a class="btn">` no escuro.

### 14.5 Relatório que o chat entrega ao final

1. Regras **apagadas** (caixa A), com a linha ou o seletor.
2. Regras **trocadas** (tokens e classes).
3. Regras **mantidas** e por quê (caixas B e C).
4. **Candidatos a global** (caixa D).
5. **Funções analisadas** (seção 13): nome, o que pintam, decisão.
6. **Dúvidas** que ficaram.

---

## 15. Piloto: `cadastro-aluno-ativo.html`

Primeira página a seguir este guia. Lista baseada no arquivo enviado; confirme cada item com `grep` antes de apagar.

**Apagar do `<style>` principal**
- Do `:root` e do `html[data-theme="dark"]` locais: `--card`, `--text`, `--border`, `--shadow`, `--danger`, `--field-bg`, `--field-border`, `--accent`.
  **Antes disso**, trocar os usos (tabela 2.2). Manter `--radius`/`--radius2` se ainda forem usados (ex.: `.item`).
- `.card, .panel{...}` e `.card-head`. `class="panel"` no HTML vira `class="card"`.
- O bloco inteiro `/* ── Botões ── */` (`.btn`, `.btn.primary`, `.btn.danger`, `.btn.ghost/.secondary`, `.btn.outline:hover`, `.btn.small`, `.btn.cancel`).
- `.field label`, `.field input, .field select`, o `:focus` e o bloco dark de campos.
- `.modal-backdrop`, `.modal`, `.modal-head`, `.modal-head h3`, `.modal-body`.
- `@keyframes toastSubir` (manter `fadeSlide`, que o `.nee-panel` usa).

**Apagar do `<style id="padrao-visual-ano-ativo">`**
- Bloco `:root{--pf-*}` e o dark dele. Trocar os usos por `--ui-*`. Manter `--pf-brand-sutil` renomeado (ex.: `--cad-brand-sutil`), pois não existe no global.
- `.card.card-destaque{...}` (fundo, tokens `--dest-*`, `.contraste-claro`) e as regras de `h2/h3/.field > label/.req/.subnote` do destaque. **Manter** `.card-destaque .inline > div > label` (só existe aqui).
- `.info-tip`, `.info-tip-bubble`, `.info-tip.open ...`.
- `.cm-box`, `.cm-titulo`, `.cm-corpo`, `.cm-acoes`, `.cm-ok`, `.cm-ok.perigo`, `.cm-opcao`.

**Manter, trocando tokens e removendo dark manual**
`.wz-*` (stepper), `.foto-box`, `.docs-*`, `.nee-*`, `.integral-btn`, `.turno-btn`, `.dz-*`, `.id-*`, `.nat-*`, `.modo-edicao-banner*`, `.campo-semilock-*`, `.cep-status`, `.badge-completude`, grids e layout.

**Manter e registrar como candidato (D)**
`.chip` (removível, com ×), `.chips`, `.count`; `.pill` e o `.badge` local **viram** o `.badge` global (seção 5-A, D2 resolvida); `.help`, `.warn`, `.ok-msg`, `.cep-status`/`.docs-status`/`.badge-completude`, tabela (D1), `.card select, .card input[type=...]` (D6).

**Analisar com cuidado (seção 13)**
`.wz-etapa2-aviso` (JS alterna `.show`; tem o mesmo desenho do `.aviso-warn`), `.id-banner`, os modais montados por JS, o `querySelectorAll` que trava o formulário e o `_confirmModal`.

**JS**
Substituir `_showToast`/`_toast*` pela seção 8.2 e `_confirmModal` pela seção 8.3 (a versão atual já usa `.cm-*`; acrescentar `digitar` é opcional).
Procurar `_showToast(` chamado direto com cor.

---

## 16. Decisões em aberto

Enquanto uma decisão está aberta, **não mexa** no item. Se a página esbarrar nele, siga o "enquanto isso".

| # | Tema | Recomendação | Enquanto isso |
|---|---|---|---|
| D1 | Tabela: centralizado + borda total (global) × alinhado à esquerda + borda inferior (cadastro). Reapareceu no piloto (inline no `<tr>` que nunca funcionou) | esquerda como padrão, centralizado como opção | manter a tabela como está; alinhamento à esquerda só com `table.left` |
| D2 | **Resolvida**: `.badge` é o chip de informação, com as 5 cores (seção 5-A). `.chip` removível (com ×), `.chips` e `.count` seguem na página | — | ao migrar, trocar `pill badge` por `badge` e apagar o CSS local do chip |
| D3 | Famílias de status repetidas (`.cep-status`, `.docs-status`, `.badge-completude`, `.badge.ok/warn/danger`, `.migr-item.*`) | **chips de dado**: `.badge` (5-A). **Mensagem de status de ação** (loading/ok/erro de CEP, upload): ainda local, com `--ui-st-*` | usar `.badge` em código novo; o existente migra caso a caso |
| D4 | `header.css` tem `#fff` fixo em `.btn-home` e `.theme-toggle:hover` (ilegível na paleta Tan) | trocar por `var(--brand-fg, #fff)` ao reformular o header | não mexer no header |
| D5 | `.panel` × `.card` | trocar `panel` por `card` | trocar a classe no HTML |
| D6 | **Resolvido em parte**: controle avulso (`.input`), rótulo solto (`.lbl`) e caixa de marcar (`.check`) agora são globais. **Em aberto**: `h2`, `h3`, `label` genérico e placeholder escuro como regras de `base.css`; `accent-color` de `input[type=checkbox]` solto (recomendação: `accent-color` do `html` no `base.css`, com a cor de marca) | tipografia e `accent-color` em `base.css` | manter `h2/h3` e o `accent-color` locais |
| D7 | Cores âmbar fixas (banner de edição, semilock) | usar `--ui-st-warn-*` | usar `--ui-st-warn-*` em código novo |
| D8 | `--card-bg`/`--card-border` duplicados em `hub.css` | remover do hub após confirmar `base.css` em todos os hubs | manter |
| D9 | `danger` sólido × paleta Vermelho (`primary` e `danger` com a mesma cor) | aceitar; `danger` sólido **fica**. `primary` e `danger` na mesma linha são aceitos quando há `outline` entre eles (cadastro-atas); evitar os dois **colados** | evitar `primary` + `danger` colados |
| D10 | Fundo liso sobre o destaque (célula de tabela, `stat-box`): token `--ui-cell-bg` (alias antigo `--ui-table-cell-bg` mantido). **"Neutro" no guia = só a cor de chip da 5-A** | usar `--ui-cell-bg` | — |
| D11 | **Resolvida**: as 5 cores cobrem tudo. `.badge.warn` e `.badge-completude.amarelo` se adequam ao CSS global, classificados pelo nível de prioridade (5-A). Sem 6ª cor | — | classificar; se não encaixar, perguntar |
| D12 | **Resolvida**: em Tan e Amarelo o neutro mantém o destaque (o tom do chip variável é um pouco diferente do âmbar); em Laranja as cores são mais próximas, mas não é problema | — | — |
| D13 | **Aceita**: valores do cinza (`--ui-chip-gray-*`) são proposta nossa e já estão em uso. Se ficarem ruins, o usuário indica o visual exato | — | — |
| D14 | `.stat-box`/`.stat-num`/`.stat-lbl` (bloco de números) e `.console` aparecem em mais de uma página, com definições que podem divergir | comparar as definições antes de promover | manter local |
| D15 | **Resolvida**: critério tooltip (dica) × aviso (informação necessária ou importante) aprovado (6.2). Dica de precaução que não impede a função nem é urgente (ex.: "faça um backup por precaução" em Apagar turmas) **fica em tooltip**; nenhuma mudança na `gestao-atas` | — | — |
| D16 | `.sum-chip` (contador) e `.merge-item.*` (nova/igual/suspeita) usam cor de status própria | trocar por `--ui-st-*`; contador continua `.count` local | manter local com `--ui-st-*` |
| D17 | **Resolvida**: toast "carregando" não expira; fecha pelo próximo toast ou por `_toastLimpar()`, que só remove o "carregando" (8.2-A) | — | — |
| D18 | **Resolvida**: texto solto sobre o destaque. `p`/`strong` filhos diretos do destaque ou do `.card-head` são cobertos; o resto vai em `.dest-painel` ou `.subnote` (4.2) | — | — |
| D19 | Sub-card (`.item` do cadastro e do cadastro de turmas, `.import-item`, `.scans-item`, `.merge-item`): cinco definições locais para o mesmo papel | promover **uma** classe global (`.subcard`) depois de comparar as definições | manter local, com `--ui-surface`/`--ui-border`/`--ui-text` |
| D20 | Área de upload (`.scans-drop` da cadastro-atas, `.docs-drop-area` do cadastro de alunos): existe em mais de uma página | promover `.drop-area` global depois de comparar | manter local |
| D21 | **Resolvida**: admin global sem escola só recebe aviso no carregamento; leitura já bloqueada pelos scripts/regras; nenhum botão desabilitado; "Nenhuma escola cadastrada" suprimido (seção 19) | — | — |
| D22 | `.help` (mensagem local) solto sobre o destaque, em 2 páginas (cadastro-atas, cadastro-turmas) | **feito**: `.help` e `.subnote` ficam na cor do destaque (4.2). Falta decidir se `.help` vira global | manter `.help` local |
| D23 | `.form-section-label` (título de seção com linha ao lado) do cadastro de turmas × `.l-section/.l-slabel/.l-sline` do `hub.css` | comparar e, se forem o mesmo papel, promover um só | manter local |

---

## 17. Relação com os guias antigos

| Guia antigo | O que continua valendo | O que está substituído |
|---|---|---|
| `guia-toasts.md` | as 4 cores, `kind`, `setMsg`, regra "pergunte se não encaixa", modal vs toast | seção 2 (JS com estilo inline) → seção 8.2/8.3; seção 3 (CSS para colar) → **apagar**, o CSS é global |
| contraste, parte 1 | lógica de `ajustarContraste()`, nome `.card-destaque`, `try/catch`, chamada depois do DOM | todo o CSS de `.card-destaque` e dos botões soltos (1.3b, 1.8.1) → global |
| contraste, parte 2 | HTML do ⓘ, listener de fechar fora, regras de `overflow`, `.wide`, `.align-right` | CSS do ⓘ e a checagem de tokens (2.1, 2.1.1) → global |
| contraste, partes 3 e 4 | regras de tabela e sub-cards dentro do destaque (3.2, 3.3, 4.1, 4.2) | fundo de `td`/`th` → global |
| contraste, parte 5 | 5.1 (ids), 5.4 a 5.7 (estados marcados, stepper, chips no destaque) como **receita de visual próprio** | 5.2/5.3 (`--pf-*`, `.btn.primary`) → tokens `--ui-*` e botões globais |
| contraste, parte 6 | badge de hub, papéis | — |
| contraste, parte 7 | 7.1 a 7.3, 7.7 a 7.14 (lógica, Firestore, regras) | 7.4 a 7.6 (CSS de botão) → seção 3 |

Em dúvida entre o guia antigo e este: **vale este**. Se este não cobre o caso: **pergunte**.

---

## 18. Leitura de dados sob demanda (lógica, não visual)

Padrão de páginas de **gestão** que leem coleções inteiras do banco (visto em `gestao-atas.html`; **confirmar em
`gerir-dados-ano-ativo.html`** antes de tratar como regra do sistema). Cada leitura custa, então:

1. `inicializar()` **não** lê coleções inteiras. No máximo uma leitura barata de que a tela depende (ex.: índice de anos, 1 documento).
2. Dados caros só são lidos por **ação da pessoa** (botão `🔄 Carregar dados`, `.btn.secondary`) ou por uma função que **precisa** deles (exportar, importar, reconstruir índice).
3. Uma função única (`_garantirTurmas(forcar)`) lê uma vez, guarda uma flag (`_turmasCarregadas`) e reutiliza a memória
   (`forcar=false` → 0 leituras). `forcar=true` só no botão e antes de operação sensível a dado velho (importar, apagar).
4. **Antes da primeira carga**, os números mostram "—", nunca 0 (zero é uma informação verdadeira).
5. Falha de leitura: `setMsg(..., 'err')` (ou `'warn'` se o botão é uma ação opcional) + a função dependente **aborta** dizendo o que não aconteceu
   ("o backup não foi gerado").
6. A tela avisa isso por **tooltip no título** (seção 6): "Os números só são lidos quando você aperta Carregar dados".
7. `Loading.esconder()` roda no fim de `inicializar()` mesmo sem dados, porque a página já é utilizável.

Os nomes das variáveis e funções são da página; o padrão independe deles.

---

## 19. Admin global sem escola (lógica, não visual)

Vale para **toda página protegida por `schoolID`**, não só para atas. O admin global pode estar com **"Todas as escolas"**,
ou seja, sem uma escola definida; usuário de escola nunca fica nesse estado.
Comportamento adotado em `cadastro-atas.html` (padrão do sistema até uma página precisar de outro):

1. **Só avisa.** `.aviso-warn` visível (informação necessária, 6.2), **no carregamento** da página e **só para o admin global**
   (nunca para usuário de escola). Não é toast nem tooltip.
2. **A leitura já fica bloqueada** pelos scripts e pelas regras do banco: sem escola, o select de turma não carrega.
   A página **não** precisa bloquear nada por conta própria.
3. **Nenhum botão é desabilitado** por causa desse estado.
4. O aviso **"Nenhuma escola cadastrada"** fica **suprimido** nesse estado: seria enganoso (a escola existe; só não foi escolhida).
5. Os **toasts de falha de leitura** também ficam suprimidos nesse estado (a leitura está bloqueada por desenho, não por erro).
   Botões de gravar (ex.: "Salvar turma") **não** são desabilitados: só avisa.
