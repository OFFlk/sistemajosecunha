# Guia — adequar páginas ao `theme-colors.js` + ícone de dica (ⓘ) inline

Documento de referência pra qualquer chat que for aplicar, no restante das
páginas do sistema, as mudanças já feitas e testadas em `historico-aluno.html`
e refinadas nas páginas seguintes:

- **Parte 1** — ligar o card de destaque da página ao contraste
  centralizado em `theme-colors.js` (em vez de calcular localmente), e
  como criar um `.card-destaque` do zero em página que nunca teve um.
- **Parte 2** — adicionar o ícone de dica (ⓘ) com tooltip por
  toque/clique, no padrão já aprovado.
- **Parte 3** — cuidados extras quando o card de destaque tem uma
  **tabela** dentro (fundo de célula, cabeçalho, botões de ação, e um
  bug de `overflow`/`display:flex` que só aparece depois de mexer no
  contraste).

Sempre que possível, compare com os arquivos reais já migrados em vez de
confiar só neste guia de memória. Três referências, cada uma mostrando um
cenário diferente:
- `historico-aluno.html` — o original, card de destaque simples, sem tabela.
- `gestao-atas.html` — card de destaque já existia (só religou o contraste),
  tokens de balão diferentes do original (ver aviso abaixo).
- `schema_ata.html` — **dois** cards de destaque **criados do zero** (a
  página não tinha nada disso), um deles com uma tabela inteira dentro —
  é a referência mais completa pra casos parecidos, incluindo a Parte 3.

> ⚠️ **Antes de colar qualquer CSS deste guia**: os nomes de variável
> (`--card`, `--border`, `--text` etc.) **não são os mesmos em todas as
> páginas**. `historico-aluno.html` tem um design system próprio, mais
> antigo, que define `--card`/`--border`/`--text` no seu `:root`. Páginas
> mais novas (`gestao-atas.html`, `pesquisa-ata.html`) usam outros nomes
> (`--card-bg`, `--line`, etc.) vindos de `base.css`. Colar o CSS do guia
> ao pé da letra numa página que não tem essas três variáveis **não dá
> erro nenhum** — o navegador simplesmente ignora a declaração e cai em
> transparente/herdado, então o bug só aparece visualmente (balão
> invisível, ícone com cor errada), não no console. Ver seção 2.1.1 antes
> de copiar o CSS da Parte 2. **Mas checar não quer dizer que vai sempre
> precisar trocar** — em `schema_ata.html`, por exemplo, os três tokens já
> batiam certinho com o guia, sem remapear nada; o passo existe pra
> confirmar, não assume que vai sempre dar diferente.

---

# PARTE 1 — Ligar `.card-destaque` ao `ThemeColors.ajustarContraste()`

## 1.1 O que já está pronto em `theme-colors.js` (não mexer)

`window.ThemeColors` expõe:

```js
ThemeColors.ajustarContraste(seletor)   // seletor default: '.card-destaque'
ThemeColors.calcularLuminancia(corCss)  // uso interno
```

`ajustarContraste(seletor)`:
- roda `document.querySelectorAll(seletor)`;
- pra cada elemento encontrado, lê o `background-color` computado, calcula
  a luminância (WCAG) e alterna a classe `contraste-claro` nesse elemento
  (`> 0.5` → aplica; senão remove);
- se nenhum elemento bater com o seletor, não faz nada e não dá erro.

`theme-colors.js` também já registra sozinho:

```js
document.addEventListener('colorchange', () => ajustarContraste());
```

Ou seja: quando a pessoa troca de cor em `perfil.html`, o reajuste
automático **já acontece sem a página fazer nada** — mas só pro seletor
padrão `.card-destaque`. É por isso que a classe no HTML **precisa** ser
exatamente essa (ver 1.4).

**Não crie de novo nenhuma função de luminância/contraste em nenhuma
página.**

## 1.2 Página que JÁ tem o cálculo inline (duplicado)

Caso de `gestao-atas.html` e `pesquisa-ata.html`, que hoje têm algo
equivalente a:

```js
function ajustarContrasteDestaque(){
  const el = document.querySelector('.card-destaque');
  if (!el) return;
  const luminancia = calcularLuminancia(getComputedStyle(el).backgroundColor);
  if (luminancia === null) return;
  el.classList.toggle('contraste-claro', luminancia > 0.5);
}
document.addEventListener('colorchange', ajustarContrasteDestaque);
```

**Remover:**
- a função inteira;
- a função auxiliar de luminância local, **se** só existir pra servir essa
  função (confira se não é usada em outro lugar antes de apagar);
- a linha `document.addEventListener('colorchange', <nomeDaFuncao>)`.

**Manter:**
- o CSS de `.card-destaque` e `.card-destaque.contraste-claro` — não muda,
  a função só decidia quando aplicar a classe;
- a chamada única de inicialização, dentro do `init()`/boot da página,
  depois que o card já existe no DOM:

```js
// antes
ajustarContrasteDestaque();

// depois
if (window.ThemeColors) ThemeColors.ajustarContraste();
```

`theme-colors.js` roda no `<head>`, antes do `<body>` existir — por isso
essa chamada única continua sendo responsabilidade de cada página, não dá
pra centralizar.

## 1.3 Página que NUNCA teve esse cálculo (vai ganhar agora)

Duas situações bem diferentes se escondem atrás desse mesmo título — checar
qual é a real antes de começar:

**(a) O card de destaque já existe visualmente**, com o CSS de
`.card-destaque`/`.contraste-claro` pronto, só faltando ligar ao
`ThemeColors.ajustarContraste()` central (era o caso de `gestao-atas.html`
e `pesquisa-ata.html`):

1. Confirmar que `theme-colors.js` está carregado no `<head>`, antes de
   qualquer CSS de cor: `<script src="../theme-colors.js"></script>`.
   **Sempre um nível (`../`)** — o projeto não tem pasta dentro de pasta,
   então nunca é `../../`.
2. Confirmar que o CSS de `.card-destaque.contraste-claro` existe. Se não
   existir, ver o caso (b) abaixo.
3. Adicionar, no `init()`/boot, depois que o elemento já está no DOM:

```js
if (window.ThemeColors) ThemeColors.ajustarContraste();
```

**(b) A página nunca teve NENHUM card de destaque** — não existe CSS de
`.card-destaque` em lugar nenhum ali (era o caso de `schema_ata.html`, que
ganhou dois cards de destaque na mesma migração). Aqui não tem só uma
chamada de JS pra ligar — tem que **criar o CSS inteiro**, replicando o
padrão de `gestao-atas.html`, adaptado pros tokens locais da página
(mesma checagem da seção 2.1.1, mas pro fundo do card em vez do balão):

```css
.card.card-destaque {
  --dest-fg: #ffffff;
  --dest-btn-bg: rgba(255,255,255,.18);
  --dest-btn-bd: rgba(255,255,255,.40);
  --dest-btn-hover: rgba(255,255,255,.28);
  --dest-panel-bg: rgba(255,255,255,.10);
  background: var(--btn-home-bg); border-color: var(--btn-home-border);
}
html[data-theme="dark"] .card.card-destaque { background: var(--btn-home-bg); border-color: var(--btn-home-border); }
.card.card-destaque.contraste-claro {
  --dest-fg: #0f172a;
  --dest-btn-bg: rgba(0,0,0,.08);
  --dest-btn-bd: rgba(0,0,0,.25);
  --dest-btn-hover: rgba(0,0,0,.16);
  --dest-panel-bg: rgba(0,0,0,.06);
  border-color: var(--border ou --line, o que a página usar);
}
.card-destaque h3 { color: var(--dest-fg); }
.card-destaque label { color: var(--dest-fg); } /* qualquer <label> solto direto no fundo, sem caixa própria */
```

`--btn-home-bg`/`--btn-home-border` vêm de `header.css` (global, mesma cor
do botão "Início" no header) — isso **não muda de página pra página**,
sempre esses dois nomes.

**Sobre os botões soltos direto no fundo do card** (não os que já ficam
dentro de um input/tabela com fundo próprio): não dá pra tratar `.btn`
genérico igual pra todos os tipos — a primeira tentativa em
`schema_ata.html` fez isso e o resultado ficou ruim (o botão "Excluir",
que é `.btn-danger`/vermelho, perdeu a cor de aviso e ficou igual aos
outros). Trata por variante, escondendo os botões de dentro de tabela
(que têm tratamento à parte, ver Parte 3):

```css
/* Primário — preenchido, com o "filtro" claro/escuro em vez da cor pura
   (que fica quase invisível em cima do próprio fundo da mesma cor). */
.card-destaque .btn-primary:not(table .btn) {
  background: var(--dest-btn-bg); border-color: var(--dest-btn-bd); color: var(--dest-fg);
}
.card-destaque .btn-primary:not(table .btn):hover:not(:disabled) {
  background: var(--dest-btn-hover); border-color: var(--dest-fg); color: var(--dest-fg);
}
/* Outline — sem preenchimento, só borda + texto na cor de contraste. */
.card-destaque .btn-outline:not(table .btn) {
  background: transparent; border-color: var(--dest-fg); color: var(--dest-fg);
}
.card-destaque .btn-outline:not(table .btn):hover:not(:disabled) {
  background: var(--dest-btn-hover); border-color: var(--dest-fg); color: var(--dest-fg);
}
/* Danger — de propósito SEM regra aqui. Cai na própria .btn-danger global
   (vermelho sólido) — continua parecendo um aviso de ação destrutiva
   mesmo dentro do card de destaque, em vez de virar um botão neutro. */
```

Se a página tiver outros elementos "soltos" no fundo do card (chips,
ícones avulsos, texto solto fora de label/h3/.muted), o mesmo raciocínio
vale: qualquer coisa sem caixa/fundo próprio precisa de `color:
var(--dest-fg)` explícito, porque o texto padrão da página não foi
pensado pra ficar legível em cima de uma cor de marca variável.

Depois de criar o CSS (casos a ou b), adicionar a chamada de
inicialização:

```js
if (window.ThemeColors) ThemeColors.ajustarContraste();
```

## 1.4 Regra de nome de classe — sem exceção

O elemento de destaque da página **tem que se chamar `.card-destaque` no
HTML**, ponto. Se a página usa outro nome (`.card-topo`, `.hero-card`
etc.), **renomeia a classe no HTML e no CSS pra `.card-destaque`** — não
existe caminho de "manter o nome antigo e passar um seletor customizado
pra `ajustarContraste()`". O motivo é o listener automático de
`colorchange` em `theme-colors.js`: ele é fixo no seletor padrão, então
qualquer nome diferente perde o reajuste em tempo real quando a pessoa
troca de cor sem recarregar a página. Padronizar o nome resolve isso de
graça, sem escrever nenhum listener extra por página.

Se houver **mais de um** elemento de destaque na mesma página, todos que
precisarem desse comportamento também levam a classe `.card-destaque` —
`querySelectorAll` já cobre todos de uma vez.

## 1.5 Checklist rápido — Parte 1

- [ ] O elemento usa `--brand`/`--btn-home-bg` (ou equivalente) como
      `background`? Se o fundo é fixo, não precisa de nada disso.
- [ ] A classe no HTML é exatamente `.card-destaque`? Se não for, renomear
      (seção 1.4).
- [ ] O CSS de `.card-destaque`/`.card-destaque.contraste-claro` já
      existia (caso a, 1.3) ou precisou ser criado do zero (caso b, 1.3)?
      Se foi criado agora, os botões soltos no fundo foram tratados por
      variante (primary/outline/danger), não com um `.btn` genérico?
- [ ] Chamada `if (window.ThemeColors) ThemeColors.ajustarContraste();`
      está no `init()`, depois do elemento existir no DOM?
- [ ] Função antiga de cálculo (se havia) foi removida por completo, junto
      com o `addEventListener('colorchange', ...)` dela?

---

# PARTE 2 — Ícone de dica (ⓘ) inline, com tooltip por toque/clique

Padrão já implementado e aprovado em `historico-aluno.html`, ao lado do
rótulo "Nome do aluno". Mecanismo **inline por página** (copiado, não
centralizado num arquivo à parte) — decisão consciente, porque texto e
posição da dica mudam a cada uso.

## 2.1.1 Antes de copiar — checar se os tokens da página batem com o guia

O CSS da seção 2.1 foi escrito em cima dos tokens de `historico-aluno.html`:
`--card` (fundo do balão), `--border` (borda do balão), `--text` (texto do
balão). **Esses três nomes só existem de verdade nessa página.** O resto do
sistema herda de `base.css`, que usa outros nomes.

Antes de colar o CSS da 2.1 em qualquer página nova:

1. Rodar um grep na própria página por `--card`, `--border` e `--text`
   (ex.: `grep -n -- "--card\b\|--border\b\|--text\b" pagina.html`).
2. Se os três aparecerem definidos (ou usados sem `var(..., fallback)`,
   sinal de que já são tokens estáveis do sistema) → colar o CSS da 2.1
   sem alterar nada.
3. Se **não** aparecerem (ou só aparecerem com fallback defensivo, tipo
   `var(--card-bg, #fff)`) → **não colar cego**. Mapear pros tokens reais
   que a própria página já usa pra fundo de card / borda / texto — eles
   quase sempre existem sob outro nome, só grepar `--card-bg`, `--line`,
   `--chip-bg`, `--muted` etc. e ver qual cobre cada papel.

Dois casos reais já vistos:

- **`pesquisa-ata.html`** (bug, corrigido depois de já publicado): o CSS
  do guia foi colado sem checar. Resultado: fundo do balão ficou
  transparente (`var(--card)` não existe ali → cai em transparente) e o
  ícone trocava de cor sozinho ao mudar de tema (estava dentro de
  `.filter-actions`, que nenhuma regra de `--dest-fg` cobre — problema de
  *onde* o ícone foi colocado, não só de token). Corrigido mapeando pra
  `--card-bg`/`--card-border` (tokens reais dessa página) + cor de texto
  fixa por tema via `html[data-theme="dark"]`.
- **`gestao-atas.html`** (feito certo direto): grep confirmou que a
  página usa `--card-bg` (com fallback `#fff`, já usado em outros pontos
  do próprio arquivo) e `--line`, não `--card`/`--border`. O CSS foi colado
  já com `var(--card-bg, #fff)` / `var(--line)` / `var(--text, #1e293b)`
  no lugar de `var(--card)` / `var(--border)` / `var(--text)`, sem
  precisar de correção depois.

**Sobre o ícone especificamente** (a parte `color:inherit` / `currentColor`
da 2.1): isso funciona sozinho *desde que* o ícone fique dentro de um
elemento que já tem a cor certa aplicada — normalmente o `<h3>` do card
(que already recebe `color:var(--dest-fg)` dentro de `.card-destaque`) ou
um `label`/`.muted` comum. Se o ícone for colocado dentro de outro
container (uma barra de ações, um footer, etc.) que nenhuma regra de
contraste cobre, ele herda a cor de texto ambiente da página — que muda
com o tema — em vez da cor fixa do card. Antes de colar o ícone em um
lugar novo, checar rapidamente se aquele container já tem uma cor de texto
resolvida pro card de destaque; se não tiver, ou mover o ícone pra dentro
do `<h3>`/label mais próximo, ou adicionar uma regra específica tipo
`.card-destaque .info-tip{ color: var(--dest-fg); }`.

**Sobre o balão ficar grande** (o próprio texto da dica, não o CSS): se o
texto da dica for longo (parágrafo técnico completo, por exemplo), vale
adicionar `max-height` + `overflow-y:auto` no `.info-tip-bubble` — não
tinha isso na primeira versão da 2.1 porque a dica de exemplo
(`historico-aluno.html`) era curta. Adicionado no bloco de CSS abaixo como
padrão novo, mesmo quando a dica é curta (não atrapalha, só entra em ação
se o texto passar do espaço).

## 2.1 CSS (copiar dentro do `<style>` da página)

```css
/* ===== Ícone de dica (ⓘ) — tooltip por toque/clique, funciona igual em
   desktop e mobile (sem depender de hover). Texto mora inline, dentro do
   próprio .info-tip-bubble, junto de onde é usado. Bloco pensado pra ser
   copiado igual em outras páginas do módulo quando entrarem na fila. ===== */
.info-tip{
  position:relative; display:inline-flex; align-items:center; justify-content:center;
  width:16px; height:16px; margin-left:6px; border-radius:50%;
  border:1.5px solid currentColor; color:inherit; opacity:.72;
  font-size:11px; font-weight:700; font-style:italic; font-family:Georgia, "Times New Roman", serif;
  line-height:1; cursor:pointer; user-select:none; vertical-align:middle;
}
.info-tip:hover, .info-tip.open{ opacity:1; background:rgba(127,127,127,.18); }
.info-tip-bubble{
  display:none; position:absolute; z-index:60; left:0; top:calc(100% + 8px);
  width:min(260px, 70vw); max-height:180px; overflow-y:auto; padding:10px 12px; border-radius:10px;
  background:var(--card); border:1.5px solid var(--border); color:var(--text);
  box-shadow:0 8px 24px rgba(0,0,0,.18); font-size:13px; font-weight:400; line-height:1.4;
  white-space:normal; cursor:default;
}
.info-tip.open .info-tip-bubble{ display:block; }
/* Variante larga: cards com bastante largura sobrando e uma dica grande
   (ex.: explicação de card inteiro) não precisam ficar espremidos em
   260px só porque o padrão da maioria das dicas é curto. */
.info-tip-bubble.wide{ width:min(520px, 90vw); max-height:280px; }
/* Variante alinhada à direita: pra ícone perto da borda direita do card/
   tabela (ex.: última coluna de uma tabela), abrir pra esquerda em vez de
   pra direita evita o balão estourar pra fora do card. */
.info-tip-bubble.align-right{ left:auto; right:0; }
```

> Use `.wide` quando o texto da dica for longo E o card tiver espaço de
> sobra (não force os dois — se o card for estreito, deixa no tamanho
> padrão e confia no `max-height`+scroll). Use `.align-right` sempre que
> o ícone ficar perto da borda direita do container (coluna final de
> tabela, canto direito de um header) — sem isso o balão pode estourar
> pra fora do card/da tela.

> ⚠️ **`overflow: hidden` em qualquer ancestral corta o balão**, mesmo o
> ícone estando `position:relative` — o balão é filho dele e herda o
> clipping da caixa que tem `overflow:hidden`, não importa a posição.
> Isso já pegou o tooltip de um cabeçalho de tabela (`<th>`) numa `<table>`
> que tinha `overflow:hidden` só pra arredondar os cantos. Se for colar um
> ícone dentro de um container que usa `overflow:hidden` só por causa de
> cantos arredondados, troca por arredondamento célula-a-célula em vez de
> clipar a tabela inteira (ver Parte 3) — não dá pra simplesmente tirar o
> `overflow:hidden` sem repor o arredondamento de outro jeito.

> `--card`/`--border`/`--text` acima são os nomes usados em
> `historico-aluno.html`. **Não copiar esses três nomes literalmente sem
> checar a seção 2.1.1 antes** — na maioria das páginas do sistema eles
> vão precisar virar os equivalentes reais daquela página (ex.:
> `--card-bg`/`--line`/`--text` com fallback, como em `gestao-atas.html`).
> `max-height`+`overflow-y:auto` é novo nesta versão do guia (não existia
> quando `historico-aluno.html` foi feito) — mantém o balão utilizável
> mesmo se o texto da dica for longo, sem precisar decidir caso a caso.

**Por que não é emoji (ⓘ) nem cor fixa:**
- O emoji ⓘ já vem com um círculo desenhado dentro do próprio glifo, e
  fica com o círculo de fora duplicado, além de não centralizar igual em
  todas as fontes/plataformas. Por isso o ícone é um `i` de texto mesmo
  (itálico, serifado), centralizado via flexbox dentro do círculo
  desenhado em CSS.
- A borda/cor do círculo usa `currentColor` (herda a cor do texto ao
  redor) em vez de uma cor fixa tipo `--chip-bg`. Isso é o que faz o
  ícone se adaptar sozinho a qualquer fundo de card — inclusive cards
  coloridos tipo `.card-destaque` — sem precisar de uma regra CSS
  separada por página ou por cor de card.
- O balão (`.info-tip-bubble`) já usa cor própria (`var(--card)`/
  `var(--text)`), então não herda a cor do card de fundo — sempre legível
  em qualquer contexto.

## 2.2 HTML (copiar ao lado do rótulo/campo que vai ganhar a dica)

```html
<label>Nome do aluno
  <span class="info-tip" tabindex="0" onclick="event.stopPropagation(); document.querySelectorAll('.info-tip.open').forEach(o=>{ if(o!==this) o.classList.remove('open'); }); this.classList.toggle('open');">
    i
    <span class="info-tip-bubble">TEXTO DA DICA AQUI.</span>
  </span>
</label>
```

**Ao adaptar pra outra página:**
- trocar o texto dentro de `.info-tip-bubble` pelo texto real daquela
  dica;
- o ícone pode ir ao lado de qualquer rótulo, campo ou título — não
  precisa ser sempre dentro de um `<label>`;
- `tabindex="0"` mantém o ícone acessível por teclado (Tab + Enter/Espaço
  também abre, já que é um elemento focável — navegadores ativam `click`
  em elementos focáveis com Enter/Espaço por padrão).

## 2.3 JS — fechar ao clicar fora (uma vez por página)

Adicionar no boot/init da página, junto de outros listeners globais
(mesmo padrão do dropdown "Exportar ▾" já usado em `historico-aluno.html`):

```js
// Ícone(s) de dica (ⓘ) — fecha qualquer um aberto ao clicar fora.
document.addEventListener("click", ()=>{
  document.querySelectorAll(".info-tip.open").forEach(el => el.classList.remove("open"));
});
```

Só precisa **um** desses por página, mesmo que a página tenha vários
ícones de dica — o `querySelectorAll(".info-tip.open")` já fecha todos que
estiverem abertos.

## 2.4 Checklist rápido — Parte 2

- [ ] Antes de colar: grep na página por `--card`/`--border`/`--text` (seção
      2.1.1). Se não existirem (ou só com fallback defensivo), o CSS foi
      colado com os tokens reais da página no lugar desses três?
- [ ] O ícone `.info-tip` ficou dentro de um elemento que já tem a cor de
      texto certa resolvida pro contexto (h3 do card, label, `.muted`)? Se
      for um container sem cor resolvida (barra de ações, footer), foi
      adicionada uma regra específica de cor ou o ícone foi movido?
- [ ] CSS de `.info-tip`/`.info-tip-bubble` copiado pro `<style>` da
      página (sem alterar as regras, só colar)?
- [ ] Ícone `<span class="info-tip">` com o `onclick` de toggle, texto
      real da dica dentro do `.info-tip-bubble`?
- [ ] Listener de "fechar ao clicar fora" adicionado no boot da página
      (uma vez só, mesmo com vários ícones)?
- [ ] Testado em desktop (clique) e mobile (toque) — não depende de
      hover?
- [ ] Testado com o card/fundo real da página (a cor do ícone deve
      acompanhar a cor do texto ao redor automaticamente, sem CSS extra)?

---

# PARTE 3 — Card de destaque com uma tabela dentro

Visto pela primeira vez em `schema_ata.html` (card "Colunas de notas"). O
pedido de referência foi: **só o fundo do card muda pra cor de marca — a
tabela continua com a cara de sempre**, só ajustando o suficiente pra não
ficar tudo com a mesma cor.

## 3.1 Fundo de célula (`td`) e cabeçalho (`th`)

Sem nenhum ajuste, `td`/`th` sem `background` próprio deixam o fundo do
card (a cor de marca) aparecer por trás — a tabela inteira fica colorida
igual ao card, menos os `<input>` que já tinham fundo opaco próprio.

```css
/* No .card.card-destaque e no .contraste-claro, junto dos outros --dest-*: */
--table-cell-bg: #ffffff;                 /* dentro de .card.card-destaque */
/* html[data-theme="dark"] .card.card-destaque { --table-cell-bg: #0a1426; } */

.card-destaque td { background: var(--table-cell-bg); }
.card-destaque th {
  background: var(--dest-panel-bg);  /* o mesmo overlay translúcido, não um tom novo */
  color: var(--dest-fg);
  font-weight: 900; font-size: 14px; /* cabeçalho ganha destaque: mais bold, ~2pt maior que o padrão */
}
```

Duas cores com papéis diferentes, não confundir:
- **`--table-cell-bg`** (célula de dado): precisa ser uma cor **neutra**
  que já exista na página pro "fundo normal" (chip/input escuro no tema
  escuro, branco no tema claro) — **não** um tom novo inventado. Ela segue
  o **tema da página** (`html[data-theme="dark"]`), não o
  `.contraste-claro` do card (são duas coisas independentes: uma é sobre
  claro/escuro da página, a outra é sobre a cor de marca escolhida).
- **`--dest-panel-bg`** (cabeçalho): um véu translúcido (branco ou preto,
  baixa opacidade) **por cima da própria cor de marca** — não troca de
  cor com o tema da página, só clareia/escurece o suficiente pra
  diferenciar do resto do card. Por isso ela segue o `.contraste-claro`
  do card (branco translúcido quando o texto é branco, preto translúcido
  quando o texto é escuro), do jeito que `--dest-btn-bg` já fazia pros
  botões.

## 3.2 Cantos arredondados sem `overflow:hidden`

Como o aviso da Parte 2 explica, `overflow:hidden` no `<table>` (truque
comum pra arredondar cantos) corta qualquer tooltip que exista dentro de
um `<th>`/`<td>`. Troca por arredondar célula a célula:

```css
table { border-radius: 10px; /* sem overflow:hidden */ }
thead tr:first-child th:first-child { border-top-left-radius: 9px; }
thead tr:first-child th:last-child  { border-top-right-radius: 9px; }
tbody tr:last-child td:first-child  { border-bottom-left-radius: 9px; }
tbody tr:last-child td:last-child   { border-bottom-right-radius: 9px; }
```
(raio interno ~1px menor que o do `table` pra não vazar por cima da
borda externa)

## 3.3 Nunca `display:flex` direto num `<td>`/`<th>`

Bug real visto em `schema_ata.html`: a coluna "Ações" tinha
`<td style="display:flex; ...">` pra alinhar os botões (↑ ↓ Remover) lado
a lado. Isso **tira a célula do modelo de layout de tabela** — o
navegador passa a tratar aquele elemento como uma caixa flex solta em vez
de uma célula normal, e a borda/fundo da "célula" real (uma caixa anônima
por baixo) fica desalinhada com o conteúdo visível. Só existia uma coisa
escondendo esse problema: o fundo da tabela inteira era a mesma cor do
card, então a borda desalinhada era invisível — no instante em que a
célula ganhou um fundo diferente do card (seção 3.1), a borda torta
apareceu.

**Regra geral, vale pra qualquer página, não só card de destaque:** nunca
aplicar `display:flex`/`display:grid` direto num `<td>` ou `<th>`. Se
precisar alinhar coisas lado a lado dentro de uma célula, o flex vai numa
`<div>` **dentro** da célula:

```html
<!-- errado -->
<td style="display:flex; gap:8px; justify-content:center;">
  <button>...</button>
</td>

<!-- certo -->
<td>
  <div style="display:flex; gap:8px; justify-content:center;">
    <button>...</button>
  </div>
</td>
```

Vale rodar um grep (`style="display:flex` ou `display:grid` dentro de
`<td`/`<th`) em qualquer tabela que for entrar na fila da Parte 3, mesmo
que o bug não esteja visível ainda — ele só aparece quando o fundo da
célula deixa de coincidir com o fundo ao redor, e isso pode não ter
acontecido ainda naquela página específica.

## 3.4 Botões que já vivem dentro da tabela

As setas ↑/↓ e o "Remover" de dentro da tabela **não** entram nas regras
de botão da seção 1.3 (`:not(table .btn)` já exclui eles de propósito) —
eles têm o próprio fundo de célula por baixo agora (seção 3.1), então
continuam com a classe global deles (`.btn-gray`, `.btn-danger` etc.) sem
mexer. Só vale checar se a versão **tema escuro** dessas classes usa um
tom realmente neutro/escuro (tipo o mesmo dos inputs da página) — se
usar uma variação translúcida da cor de marca (`--brand-faded-d` ou
parecido), ela pode ficar "invisível" bem do mesmo jeito que os botões
soltos do card ficavam antes da seção 1.3, só que por um motivo diferente
(a cor de marca do botão coincidindo com a da linha/coluna ao fundo, não
com o card).

## 3.5 Checklist rápido — Parte 3

- [ ] `td`/`th` do card de destaque têm `background` explícito
      (`--table-cell-bg`/`--dest-panel-bg`), em vez de deixar a cor do
      card aparecer por trás?
- [ ] Cantos arredondados da tabela são por célula (3.2), não por
      `overflow:hidden` no `<table>`?
- [ ] Nenhum `<td>`/`<th>` tem `display:flex`/`display:grid` direto nele
      (3.3) — todo alinhamento interno está numa `<div>` dentro da célula?
- [ ] Botões que já vivem dentro da tabela (setas, remover) foram
      conferidos no tema escuro, procurando cor de marca translúcida que
      possa "sumir" contra o fundo ao redor (3.4)?



**Parte 1 — contraste:**
1. Página com função duplicada → apaga a função e o `addEventListener`
   dela; troca a chamada por `if (window.ThemeColors) ThemeColors.ajustarContraste();`.
2. Página sem nada → garante `<script src="../theme-colors.js">` no
   `<head>`, garante CSS de `.contraste-claro`, adiciona a mesma chamada
   no `init()`.
3. Classe do elemento **sempre** vira `.card-destaque` no HTML — sem
   exceção, sem seletor customizado.

**Parte 2 — tooltip ⓘ:**
1. Antes de colar o CSS: grep na página por `--card`/`--border`/`--text`
   (seção 2.1.1). Se não existirem do jeito que `historico-aluno.html`
   define, troca esses três nomes pelos tokens reais da página de destino
   (ex.: `--card-bg`/`--line`/`--text` com fallback) antes de colar.
2. Cola o bloco de CSS (`.info-tip`/`.info-tip-bubble`) — regras iguais,
   só os três nomes de variável do balão ajustados se necessário. Usa
   `.wide` se a dica for grande e o card tiver espaço; usa `.align-right`
   se o ícone ficar perto da borda direita do container.
3. Cola o HTML do ícone ao lado do campo/rótulo certo (de preferência
   dentro de um elemento que já tem cor de texto resolvida pro card),
   troca só o texto da dica.
4. Garante o listener de "fechar ao clicar fora" uma vez por página.
5. Se o ícone for entrar dentro de algo com `overflow:hidden` (tabela
   arredondada, por exemplo), resolve isso ANTES — o balão vai aparecer
   cortado (ver Parte 3.2).

**Parte 3 — tabela dentro de card de destaque:**
1. `td` ganha fundo neutro que já existe na página (`--table-cell-bg`,
   segue o tema claro/escuro); `th` ganha o mesmo véu translúcido dos
   botões (`--dest-panel-bg`, segue o `.contraste-claro`), fonte maior e
   mais bold.
2. Cantos arredondados da tabela: célula a célula, nunca `overflow:hidden`
   no `<table>`.
3. Confere se algum `<td>`/`<th>` tem `display:flex`/`grid` direto nele —
   se tiver, move pra uma `<div>` interna antes de mais nada.
4. Botões que já vivem na tabela (setas, remover) ficam de fora das regras
   de botão da Parte 1 — só confere o tema escuro deles à parte.

---

# Páginas já adequadas (status)

| Página | Parte 1 (contraste) | Parte 2 (tooltip) | Parte 3 (tabela) | Observação |
|---|---|---|---|---|
| `historico-aluno.html` | ✅ original | ✅ original | — | Referência-base do guia inteiro. |
| `gestao-atas.html` | ✅ religado ao central | ✅ | — | Card de destaque já existia, só a função de contraste era duplicada. |
| `pesquisa-ata.html` | ✅ | ✅ (corrigido) | — | Bug de tokens do balão (fundo transparente) corrigido depois de já publicado — motivou a seção 2.1.1. |
| `schema_ata.html` | ✅ **criado do zero** (2 cards) | ✅ (10 ícones) | ✅ **novo, motivou a Parte 3** | Página mais completa como referência: cards de destaque inéditos, botões por variante, tabela inteira dentro de um deles. |

**Pendente no módulo de atas:** `cadastro-turmas.html` — ainda não
adequada (nem Parte 1 nem Parte 2/3), é a próxima da fila.
