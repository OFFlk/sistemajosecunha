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
- **Parte 4** — card de destaque com uma **lista de sub-cards** dentro.
- **Seções 1.8 → 1.11** — o que veio depois: botões de preenchimento sólido
  de marca (`--brand-fg`, com o catálogo de onde cada página redeclara o
  botão), avisos de card sem fundo amarelo e hover com `--brand-faded` que
  precisa de par escuro, e mapa de hex de paleta copiado à mão no JS de uma
  página (que quebra quando uma paleta nova entra).
- **Parte 5** — lições do módulo de funcionários (cadastro + pesquisa):
  páginas **nunca repaginadas**, com CSS externo próprio e JS que desenha a
  lista. Quase tudo é caso novo das partes anteriores; ali ficam só as
  diferenças e as armadilhas (remover elemento que o JS usa, `--primary`
  inexistente, estados "marcado" dentro do destaque, stepper, tooltip dentro
  de `<label>`, variável do header sobrescrita por CSS de página).
- **Parte 6** — hubs: o badge de acesso restrito mora no `hub.css`
  compartilhado; cada hub só troca o texto.

Sempre que possível, compare com os arquivos reais já migrados em vez de
confiar só neste guia de memória. Quatro referências, cada uma mostrando um
cenário diferente:
- `historico-aluno.html` — o original, card de destaque simples, sem tabela.
- `gestao-atas.html` — card de destaque já existia (só religou o contraste),
  tokens de balão diferentes do original (ver aviso abaixo).
- `schema_ata.html` — **dois** cards de destaque **criados do zero** (a
  página não tinha nada disso), um deles com uma tabela inteira dentro —
  é a referência mais completa pra casos parecidos, incluindo a Parte 3.
- `cadastro-turmas.html` — dois cards **lado a lado** (não um em cima do
  outro), e o card escolhido como destaque tem uma **lista de sub-cards**
  dentro (um mini-card por turma, cada um com seu próprio fundo neutro) —
  motivou a Parte 4 e a seção 1.6.
- `cadastro-atas.html` — card de destaque **criado do zero** (o 1º card da
  página, com dados da escola + selects), nenhum botão declarado
  localmente (herda tudo do `components.css`), tooltips inclusive em rótulo
  gerado por JS, e a referência das seções 1.9 (aviso) e 1.10 (hover escuro).
- `cadastro-funcionario.html` (+ `.css`) — **dois** cards de destaque criados
  do zero (topo: ano letivo + etapas do cadastro; rodapé: botões de ação),
  sem tabela. Referência das seções 5.4 a 5.7.
- `pesquisa-funcionario.html/.js/.css` — destaque nos filtros e lista de
  sub-cards **desenhada pelo JS**. Referência das seções 5.1, 5.8 e 5.9.
- `funcionarios.html` + `hub.css` — hub com badge de acesso restrito
  (Parte 6).

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

> ⚠️ **Cor de marca escrita na mão, escondida em CSS legado que ninguém
> mexeu**: em `cadastro-turmas.html`, o hover de `.btn.ghost`/`.btn.secondary`
> no tema escuro tinha `rgba(124,58,237,.18)` (roxo) e `#c4b5fd` escritos
> direto no CSS, em vez de `var(--brand-faded-d)`/`var(--brand-text-d)` —
> bug **pré-existente**, sem relação com a migração, que só aparece quando
> alguém troca pra uma paleta diferente de roxo (nesse caso só ficava
> visível no tema escuro, porque a versão clara da mesma regra já usava
> `var()` corretamente). Isso é fácil de confundir com "bug que a migração
> causou" quando na verdade já estava lá. Antes de mexer numa página nova,
> rodar um grep pelos valores de roxo padrão do sistema **fora** de
> `var(...)`:
> ```
> grep -n "124,58,237\|#7c3aed\|#6d28d9\|#c4b5fd" pagina.html
> ```
> Toda ocorrência **dentro** de `var(--algo, #7c3aed)` (fallback) é normal
> e não precisa mexer. Ocorrência **fora** de `var()`, sozinha, é o mesmo
> bug — troca pelo token de marca equivalente (`--brand`/`--brand-d` pra
> preenchimento sólido, `--brand-faded`/`--brand-faded-d` pra fundo leve,
> `--brand-text`/`--brand-text-d` pra texto — ver 1.7 abaixo sobre qual
> usar em cada caso).

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

## 1.6 Cards lado a lado — qual vira `.card-destaque`?

Até `cadastro-turmas.html`, todo card de destaque era o único protagonista
da página (um card no topo, o resto embaixo). Numa página com dois cards
**lado a lado** (`.split-grid`/`.grid2`, um formulário de um lado e uma
lista do outro, por exemplo) isso deixa de ser óbvio — os dois têm o mesmo
peso visual. Não tem regra fixa, é decisão de produto, mas a pergunta que
ajuda é: **qual dos dois a pessoa olha primeiro/mais vezes?** Em
`cadastro-turmas.html` foi o card de **listagem** ("Turmas cadastradas"),
não o formulário — o card de destaque não precisa ser sempre o de
ação/filtro, como tinha sido em todas as páginas anteriores.

**Se o card escolhido tiver uma lista de sub-cards dentro** (um mini-card
por item, cada um com fundo próprio, tipo `.item` em `cadastro-turmas.html`)
— isso tem cuidados específicos, próprios, que não são os mesmos de uma
tabela. Ver **Parte 4**.

## 1.7 Cor de marca em TEXTO solto (fora de badge/botão) — nunca `--brand`/`--brand-d` puro

Regra nova, de aplicação geral (não só dentro de `.card-destaque`): sempre
que for colorir um **texto** (não um fundo) com a cor de marca — um link,
um "Detalhes ▾" clicável, um `<span>` de destaque — usar
`--brand-text`/`--brand-text-d`, **nunca** `--brand`/`--brand-d` puro.

O motivo: `--brand`/`--brand-d` são pensados pra **preenchimento sólido**
(fundo de botão primário, por exemplo), onde o texto por cima é branco. Em
paletas escuras — Verde, Vermelho, Azul Escuro — o próprio valor de
`--brand-d` já é uma cor escura de propósito (pra combinar com texto
branco em cima). Usado direto como cor de **texto** sobre um fundo neutro
(um card branco/escuro comum, não a própria cor de marca), esse mesmo tom
escuro fica com contraste ruim — texto escurinho sobre card também escuro
no tema escuro. `--brand-text`/`--brand-text-d` são as variantes desenhadas
exatamente pra essa função (é o mesmo par que os badges/chips do sistema
já usam) e existem em toda paleta, então é só trocar o nome da variável,
sem criar nada novo.

Bug real visto em `cadastro-turmas.html`: o link "Detalhes ▾" (JS novo,
não vinha do guia) foi colorido com `var(--brand-d)` — ficou ilegível nas
paletas Verde/Vermelho/Azul Escuro no tema escuro, ok nas outras. Corrigido
trocando pra `var(--brand-text-d)`.

## 1.8 `theme-colors.js`: paleta "Branco" virou "Tan", e `--brand-fg` é novo

Mudança feita direto em `theme-colors.js` (não é sobre uma página
específica, afeta o sistema inteiro que usa o seletor de cor):

- **Paleta `white` foi removida, `tan` entrou no lugar.** Motivo: com o
  texto do card de destaque calculado dinamicamente (`ajustarContraste`),
  branco parou de ser a única cor "segura" pra card claro — e branco em si
  é redundante (tema claro já dá branco+cinza via a paleta "Cinza", tema
  escuro já dá preto+cinza do mesmo jeito). `tan` (`#dbc09c`) é a primeira
  paleta **genuinamente clara e colorida** do sistema (todas as outras,
  mesmo as de nome "claro" tipo "gold"/Amarelo, são na real tons escuros —
  `gold` é um mostarda escuro, não amarelo de verdade — escolhidos assim
  de propósito pra combinar com texto branco fixo nos lugares que ainda não
  calculam contraste).
- **Cuidado ao escolher o tom exato de uma paleta genuinamente clara**: o
  corte de `ajustarContraste`/`calcularLuminancia` é `> 0.5`. O tom
  "tan" clássico (`#d2b48c`) dá luminância `0.482` — **abaixo** do corte,
  então o cálculo escolheria texto branco bem na cor que devia provar que
  dá pra usar texto escuro. Foi clareado um pouco (`#dbc09c`, luminância
  `0.552`) pra ficar com folga segura acima do corte. Ao criar qualquer
  paleta nova nessa faixa (clara o bastante pra precisar de texto escuro),
  computar a luminância do `--brand` escolhido **antes** de fechar o valor
  final, não só olhar a cor "no olho".
- **`calcularLuminancia()` agora aceita hex além de `rgb(...)`** — antes só
  lia `getComputedStyle(...).backgroundColor` (sempre vem em `rgb()`/
  `rgba()` do navegador); precisava também funcionar direto com uma string
  de paleta tipo `'#dbc09c'`, sem precisar montar um elemento no DOM só
  pra ler o computed style de volta.
- **Nova custom property `--brand-fg`, calculada dentro do próprio
  `apply()`**: mesmo cálculo do `--dest-fg` do card de destaque, mas pra
  **qualquer botão com preenchimento sólido de marca**, não só o card.
  `apply()` já sabe o valor cru do `--brand`/`--brand-d` da paleta ativa
  (e o tema claro/escuro atual), então calcula a luminância ali mesmo e
  seta `--brand-fg` pra `#1e293b` (escuro) ou `#ffffff` (claro) — sem
  precisar ler nenhum elemento do DOM, ao contrário do `ajustarContraste`
  original (que existe porque o fundo real de um elemento específico pode,
  em teoria, não bater 100% com o valor cru da variável).

**Pendência que isso abre pra quem for migrar páginas daqui pra frente**:
qualquer botão que hoje faz preenchimento sólido de marca com texto fixo —
o padrão mais comum é algo como
`.btn.primary { background: var(--brand); color: #fff; }` — precisa trocar
`color: #fff` por `color: var(--brand-fg, #fff)`. Sem essa troca, a paleta
Tan (ou qualquer paleta clara futura) vai deixar esse botão com texto
branco ilegível em cima de um fundo já claro, em qualquer página que ainda
não tiver sido corrigida — isso **não é** um bug da migração
tooltip/contraste em si, é uma dívida nova que a introdução do Tan cria em
todo o sistema, não só no módulo de atas. Ao entrar numa página nova,
grepar por `background:\s*var(--brand)` (ou `--btn-home-bg`) combinado com
um `color:#fff`/`color: #ffffff` fixo na mesma regra, e trocar por
`var(--brand-fg, #fff)`.

**Status**: aplicado em `components.css` e nas páginas do módulo de atas —
ver 1.8.1 logo abaixo. Falta conferir o resto do sistema (única pendência
aberta; ver tabela de status no fim). Ao adicionar/remover uma paleta, ver
também 1.11 (mapa de hex duplicado em `perfil.html`).

## 1.8.1 Correção aplicada — por que o fix global sozinho não bastou

**O que foi trocado em `components.css`** (`color:#fff` → `color: var(--brand-fg, #fff)`):
- `.btn.primary`
- `.btn-primary`
- `[data-theme="dark"] .btn-gray:hover` (no hover escuro o `.btn-gray` vira
  preenchimento sólido `--brand-d`, então cai na mesma regra)

`.btn-danger` **não** foi tocado: é vermelho sólido fixo, não usa `--brand`,
então não sofre com a paleta. O mesmo vale pras cores fixas de toast
(verde/vermelho/âmbar) e pros botões de confirmação com cor de sistema.

**Sintoma que revelou o problema**: depois do deploy, só a
`cadastro-atas.html` ficou certa; as outras páginas continuaram com o texto
do botão na cor errada, inclusive as já adequadas pelas Partes 1–4. Causa: o
`<style>` da página carrega **depois** do `components.css` e, com
especificidade igual ou maior, a cópia local de `color:#fff` vence o fix
global. A `cadastro-atas.html` só funcionou porque não redeclara botão nenhum.

**Receita por página** (rodar antes de mexer):
```
grep -n "btn-primary\|btn\.primary\|color:\s*#fff\|color:\s*#ffffff" pagina.html
```
1. Achar toda regra local com preenchimento sólido de marca
   (`var(--brand)`, `var(--brand-d)`, `var(--btn-home-bg)`) + `color:#fff` fixo.
2. Trocar **só o valor** por `var(--brand-fg, #fff)`. Não remover a regra: ela
   pode existir por outro motivo (ex.: vencer uma regra mais específica).
3. Ver se o override dark redeclara `color`. Se não redeclara, uma troca na
   regra base já cobre os dois temas (é o caso mais comum).
4. Ignorar: `.btn-danger`, toasts, botões dentro de `.card-destaque` que já usam
   `--dest-fg`, e itens de dropdown que são `.btn` puro (sem preenchimento de marca).
5. **Rodar o mesmo grep no `.css` externo da página**, não só no `<style>`
   inline. Em `cadastro-funcionario.css` e `pesquisa-funcionario.css` o
   `.btn.primary { color:#fff }` estava no arquivo externo, que carrega depois
   do `components.css` e desfaz o fix global (mesmo mecanismo descrito acima).
   Ver 5.3.

**Os quatro padrões encontrados** (um por página do módulo):

| Página | Como declara botão de marca | Onde estava o bug | Botões afetados |
|---|---|---|---|
| `cadastro-atas.html` | Não redeclara nada, herda 100% do `components.css` | Nenhum local | Adicionar/Atualizar, Salvar no banco |
| `pesquisa-ata.html` | `.btn.primary` (2 classes), sem override claro, com override **dark** local | `html[data-theme="dark"] .btn.primary { color:#fff }` | Pesquisar (card de pesquisa por aluno), Abrir, Exportar ▾ |
| `gestao-atas.html` | `.btn.btn-primary` em `<button>` sem override; só o `<a>` tem override de especificidade | `a.btn.btn-primary, a.btn.btn-primary:hover { color:#fff }` | Gerenciar schemas (`<a>`); Exportar JSON e Aplicar merge já herdavam certo |
| `cadastro-turmas.html` | `.btn.primary` redeclarado inteiro; o dark só troca `background`/`border-color` | `.btn.primary { color:#fff }` (uma linha cobre os dois temas) | Salvar turma |
| `historico-aluno.html` | `.btn.btn-primary` com seletores reforçados (tipo + 2 classes); dark só troca fundo/borda | `color:#fff` no bloco base | Exportar ▾, Exportar ano (o botão "Pesquisar" fica no `.card-destaque` e já usa `--dest-fg`) |
| `cadastro-funcionario.css` | `.btn.primary` redeclarado inteiro no **CSS externo**; dark só troca fundo/borda | `color:#fff` no bloco base (uma linha cobre os dois temas) | "✓ Adicionar" (graduação, complementar, pós). Próximo/Salvar ficam no `.card-destaque` e usam `--dest-fg` |
| `pesquisa-funcionario.css` | idem (cópia do mesmo padrão, no CSS externo) | `color:#fff` no bloco base | Exportar ▾ (único `primary` da página) |
| `hub.css` | `.card-badge` com fundo `--brand-faded` e texto `--brand` (não é `.btn`) | texto em cor de marca sobre fundo tingido de marca | Badge de acesso restrito, de todos os hubs (ver Parte 6) |

**Cuidado com `<a class="btn btn-primary">`**: `base.css` tem
`html[data-theme="dark"] a { color: var(--brand-d) }`, mais específico que
`.btn-primary`. Por isso o override `a.btn.btn-primary` existe e **precisa
continuar existindo** — só o valor muda pra `var(--brand-fg, #fff)`.

## 1.9 Avisos de card (não toast): nunca fundo amarelo

`.aviso-warn` com `background: rgba(251,191,36,.12)` empilha o âmbar
translúcido sobre a cor de marca do card e o texto (e o link) some — visto na
paleta Tan, dentro do `.card-destaque`. Toasts **não** entram nesta regra
(seguem com cor fixa de sistema).

Regra: o aviso deixa de ter cor própria e herda o contexto. O sinal de
"atenção" fica no ⚠️ do texto e numa faixa esquerda de 4px.

```css
/* fora do destaque: fundo neutro da página */
.aviso-warn { background: var(--chip-bg); border: 1px solid var(--chip-border);
              border-left: 4px solid #d97706; color: var(--ink);
              padding: 12px 14px; border-radius: 12px; margin-bottom: 12px; font-size: 13px; }
.aviso-warn a,
html[data-theme="dark"] .aviso-warn a,
html[data-theme="dark"] .aviso-warn a:hover { color: inherit; font-weight: 700; text-decoration: underline; }

/* dentro do card de destaque: painel derivado do próprio card (colocar DEPOIS
   do bloco .card-destaque, com a mesma lógica dos botões) */
.card-destaque .aviso-warn { background: var(--dest-panel-bg); border-color: var(--dest-btn-bd);
                             border-left-color: var(--dest-fg); color: var(--dest-fg); }
```

- **Link dentro do aviso, tema escuro**: o `html[data-theme="dark"] a` do
  `base.css` pinta o link com `--brand-d`, quase igual ao fundo do aviso. Por
  isso as duas linhas com `html[data-theme="dark"]` (incluindo `:hover`) são
  obrigatórias, não redundância.
- A faixa esquerda é o único ponto de cor fixa. No destaque ela usa
  `--dest-fg` porque âmbar sobre tan praticamente não aparece.
- Tokens `--chip-bg`/`--chip-border` são os de `cadastro-atas.html`; nas outras
  páginas conferir o equivalente (mesma checagem da seção 2.1.1).
- Onde procurar: `grep -n "251,191,36\|aviso-warn" pagina.html`.

## 1.10 Hover/drag com `--brand-faded` precisa de par escuro

Achado na área de scans da `cadastro-atas.html`: o hover da drop-zone usava
`background: var(--brand-faded)` **sem** regra para o tema escuro. Esse token é
o tom claro (pensado para ficar sobre fundo branco); em paletas claras ou
cinza ele vira quase branco puro no escuro.

```css
.scans-drop:hover, .scans-drop.drag-over { border-color: var(--brand); background: var(--brand-faded); }
html[data-theme="dark"] .scans-drop:hover,
html[data-theme="dark"] .scans-drop.drag-over { border-color: var(--brand-d); background: var(--brand-faded-d); }
```

Checagem: `grep -n "brand-faded" pagina.html` e ver se **cada** uso em
`:hover`/`.drag-over`/`:focus` tem uma regra `html[data-theme="dark"]` com
`--brand-faded-d` (fundo) e `--brand-d` (borda). Regra sem par escuro é o
mesmo tipo de bug da cor de roxo escrita na mão (aviso no topo deste guia).

---

## 1.11 Mapa de cor/hex copiado à mão no JS da página (visto em `perfil.html`)

Achado ao trocar `white` por `tan`: depois do deploy do `theme-colors.js`, o
nome "Tan" já aparecia certo no seletor e a cor já funcionava em todas as
outras páginas, mas a bolinha de pré-visualização em `perfil.html` ficava
**roxa** (a cor default).

**Causa**: `perfil.html` mantinha um objeto `swatchColors` próprio, dentro do
JS da página, com o hex de cada paleta copiado à mão (`{ violet: '#7c3aed',
... white: '#ffffff' }`). É o mesmo padrão da função de contraste duplicada
(1.2), só que pra cor em vez de contraste. `tan` só existia em
`theme-colors.js`, então `swatchColors['tan']` vinha `undefined` e caía no
fallback `|| '#7c3aed'`. Nada quebrava no console — só a cor errada na tela.

**Correção**: remover o mapa local e ler o hex da fonte real, que já existe:

```js
// antes
swatch.style.background = swatchColors[key] || '#7c3aed';
// depois
swatch.style.background = palette['--brand'] || '#7c3aed';   // palette = ThemeColors.palettes[key]
```

No `buildColorGrid()` o `palette` já vem de
`Object.entries(ThemeColors.palettes)`; em `updateHeader(key)` vem de
`ThemeColors.palettes[key]`. Com isso `perfil.html` não precisa mais ser
tocada quando uma paleta entra ou sai de `theme-colors.js` (o `white` que
sobrou no mapa antigo era letra morta, mas o `tan` ausente era o bug).

**Checagem preventiva** em qualquer página que mostre a cor escolhida ou
liste paletas (seletores, previews, legendas):

```
grep -n "violet\|deepblue\|#7c3aed" pagina.html
```

Objeto com nomes de paleta como chave e hex como valor, dentro do JS da
página = mesmo bug esperando a próxima paleta nova. Trocar por leitura de
`ThemeColors.palettes`.

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
  <span class="info-tip" tabindex="0" onclick="event.stopPropagation(); event.preventDefault(); document.querySelectorAll('.info-tip.open').forEach(o=>{ if(o!==this) o.classList.remove('open'); }); this.classList.toggle('open');">
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
- ⚠️ o `event.preventDefault()` do `onclick` **não é enfeite**: dentro de um
  `<label for="campo">`, sem ele o clique no ⓘ é repassado ao campo (o cursor
  de texto aparece no input) e esse clique repassado sobe até o listener de
  "fechar ao clicar fora", que **fecha o balão na hora**. Se o ⓘ acompanha um
  `<label>` de checkbox, prefira colocá-lo **fora** do label (ver 5.7);
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
- [ ] O ícone está dentro de um `<label for>`? O `onclick` tem
      `event.preventDefault()` (5.7)? Se o label é de checkbox, o ícone foi
      colocado fora dele?
- [ ] Testado em desktop (clique) e mobile (toque) — não depende de
      hover?
- [ ] Testado com o card/fundo real da página (a cor do ícone deve
      acompanhar a cor do texto ao redor automaticamente, sem CSS extra)?

## 2.5 Casos vistos em `cadastro-atas.html`

- **Rótulo gerado por JS** (template literal): o mesmo HTML da seção 2.2 funciona
  dentro do template; só cuidar pra não usar crases dentro do texto da dica.
- **Dica que explica vários botões**: quando o card tem uma fila de botões e a
  dica é sobre todos, colocar o ícone no `<h3>` do card (ex.: "Alunos"), não em
  um botão específico. Usa `.wide` e `<b>`/`<br>` pra virar mini-lista.
- **Legenda `.help` que vira tooltip**: remover o `.help` antigo ao mover o texto
  pro balão, senão a informação fica duplicada.
- **Ícone dentro de `.card-destaque`**: como usa `currentColor`, herda o
  `--dest-fg` do `<label>` sem regra extra.
- **Tokens do balão nessa página**: `--card-bg`/`--card-border`/`--ink` (com
  fallback), no lugar de `--card`/`--border`/`--text`.

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

---

# PARTE 4 — Card de destaque com uma lista de sub-cards (itens) dentro

Visto pela primeira vez em `cadastro-turmas.html` (card "Turmas
cadastradas"). Diferente da Parte 3 (uma **tabela**, `<td>`/`<th>`), aqui
o conteúdo é uma lista de **mini-cards** — cada item tem o próprio fundo
neutro (`var(--card)` ou equivalente), border-radius e padding próprios,
sentado em cima do fundo colorido do `.card-destaque`. O problema é o
mesmo em espírito (regras genéricas do card de destaque vazando pra dentro
de uma área que já resolveu a própria cor sozinha), mas a correção é
diferente da tabela.

## 4.1 Não aplicar override de `.btn` genérico nos botões de dentro dos itens

Um botão que mora dentro de um item da lista (ex.: "Editar") **já está**
sobre um fundo neutro, não direto sobre a cor de marca — diferente de um
botão solto no card (Parte 1.3b), que precisa do tratamento translúcido
(`--dest-btn-bg`/`--dest-btn-bd`) pra não sumir contra a própria cor de
marca. Se o `.card-destaque .btn` genérico (ou qualquer variante dele)
alcançar também os botões de dentro dos itens, o resultado é um botão
translúcido-sobre-marca só que aplicado num fundo que já é neutro/branco —
em paletas claras isso pode ficar quase invisível (branco translúcido
sobre um card já branco). **Antes de escrever a regra, checar se ela
alcançaria também os botões de dentro dos itens** — se sim, não escrever
um `.btn` genérico pro card inteiro; ou escopar o override só pros botões
que realmente ficam soltos direto no fundo (ex.: `.card-destaque >
.actions .btn`, não `.card-destaque .btn`).

## 4.2 Regras de `--dest-fg` (h3/label/.muted/.help) vazam pra dentro dos itens — precisa de exceção

O mesmo raciocínio da 4.1 vale pro texto: uma regra tipo
`.card-destaque .help { color: color-mix(in srgb, var(--dest-fg) 75%,
transparent); }` (pensada pro texto que fica **direto** sobre a cor de
marca, tipo um contador no cabeçalho do card) alcança **qualquer**
descendente com aquela classe — inclusive um `.help`/`.muted` que esteja
dentro de um item da lista, num fundo neutro. Como `--dest-fg` depende da
luminância da **cor de marca** (não do tema claro/escuro da página), o bug
resultante é sutil: o texto fica com a cor certa só quando a paleta
escolhida "combina" por acaso com o tema ativo, e ilegível no caso
contrário — mais difícil de notar em teste rápido do que um erro que
sempre aparece igual.

Bug real visto em `cadastro-turmas.html`: o texto dentro do painel
"Detalhes" (expansível, dentro de cada item) usava `.help`, e a regra do
parágrafo acima o deixava branco fixo (porque a marca escolhida era
escura) — legível por coincidência no tema escuro da página, invisível no
tema claro (o item, nesse caso, é branco).

**Correção**: adicionar uma exceção, mais específica, que reseta a cor pra
dentro do container do item:

```css
.card-destaque .help { color: color-mix(in srgb, var(--dest-fg) 75%, transparent); }
/* Exceção: dentro de um item da lista (fundo neutro próprio, não a cor de
   marca), o texto volta a ser o --muted normal da página. */
.card-destaque .item .help { color: var(--muted); }
```

Mesma lógica vale pra qualquer outra regra de `--dest-fg` que a página
tenha (h3, label, etc.) — se o seletor genérico `.card-destaque X` puder
alcançar algo dentro do item, precisa da mesma exceção `.card-destaque
.item X { color: var(--normal-da-página); }`.

## 4.3 Checklist rápido — Parte 4

- [ ] Os botões de dentro dos itens da lista foram conferidos — o
      override de botão do card de destaque (4.1) não está alcançando eles
      por engano?
- [ ] Toda regra `.card-destaque X { color: var(--dest-fg) ... }` foi
      conferida contra o conteúdo de dentro dos itens — precisa de uma
      exceção `.card-destaque .item X { color: var(--normal); }` (4.2)?
- [ ] Testado nos dois temas (claro/escuro) **e** com pelo menos uma
      paleta clara e uma escura — o bug da 4.2 só aparece em combinações
      específicas de tema × paleta, não em todas.

---

# PARTE 5 — Lições do módulo de funcionários (cadastro + pesquisa)

Visto em `cadastro-funcionario.html` e `pesquisa-funcionario.*`. Eram duas
páginas que **nunca tinham sido repaginadas**: design system antigo, CSS
externo próprio (`cadastro-funcionario.css`, `pesquisa-funcionario.css`) e, na
pesquisa, uma lista desenhada por JS. Quase tudo que apareceu é caso novo das
partes anteriores; aqui ficam só as diferenças e as armadilhas.

## 5.1 Antes de remover um elemento do HTML: quem escreve nele?

Tirar do HTML um badge, uma legenda, uma linha de contagem ou um log de
resultado **sem olhar o JS** dá `TypeError: Cannot set properties of null` e a
página fica em branco (a lista nem chega a ser desenhada, porque o erro
acontece antes). Casos reais: `pillCount`, `lblAnoAtivo`, `statsRow`/`statExib`,
`subResultados`.

Receita: para cada `id` que sai do HTML, achar quem o usa e remover **também**
a função e as chamadas dela. Conferência automática dos ids que o JS procura:

```
grep -o "getElementById('[^']*')" pagina.js | sort -u | sed "s/.*('\(.*\)')/\1/" \
  | while read id; do grep -q "id=\"$id\"" pagina.html || echo "FALTA no HTML: $id"; done
```

- Mensagem de erro que sobra num elemento removido (ex.: `anoAtivoMsg`): **não
  apague**, mantenha oculto (`display:none`) e mostre só quando o erro
  acontecer. Não use a classe `.help` para isso: o `min-height` dela deixa um
  vão em branco.
- **HTML, JS e CSS sobem juntos.** JS antigo com HTML novo dá o mesmo
  `TypeError`. Como o navegador guarda cache, coloque `?v=N` no `<script src>`
  e no `<link>` da página e suba o N a cada entrega.
- `ThemeColors.ajustarContraste()` vai **isolado em `try/catch`**, nunca no
  caminho de carga dos dados. Se ela falhar (ou ainda não existir), a página
  inteira deixa de carregar por causa de um detalhe visual:
```js
try{
  if(window.ThemeColors && typeof ThemeColors.ajustarContraste === 'function') ThemeColors.ajustarContraste();
}catch(e){ console.warn('ajustarContraste:', e); }
```
- Sem navegador à mão, dá para reproduzir erro de JS montando o HTML num
  `jsdom` (`npm i jsdom`), com `Auth`/`DB` falsos e dados de mentira, e contando
  os itens desenhados. Serve para comparar "arquivos antigos x novos" e
  achar a combinação que quebra.

## 5.2 `--primary` não existe no sistema

O CSS antigo dessas páginas usava `var(--primary, #7c3aed)` em dezenas de
lugares. **`--primary` não é definido em nenhum arquivo do sistema**, então o
fallback roxo valia **sempre**, em qualquer paleta. É a mesma família do bug
de "roxo escrito à mão" da introdução, mas o grep pelo hex não pega, porque o
roxo está dentro de `var()`. Rodar também:

```
grep -n -- "--primary" pagina.html pagina.css
```

Correção: um bloco de **aliases** por página (ou por módulo) com o par
claro/escuro resolvido em uma linha por token, e trocar todo `--primary` por eles.
Assim não se espalham regras `html[data-theme="dark"]` pelo CSS:

```css
:root{
  --pf-brand:var(--brand,#7c3aed);
  --pf-brand-text:var(--brand-text,#6d28d9);
  --pf-brand-faded:var(--brand-faded,#f5f3ff);
  --pf-brand-border:var(--brand-border,#ddd6fe);
}
html[data-theme="dark"]{
  --pf-brand:var(--brand-d,#8b5cf6);
  --pf-brand-text:var(--brand-text-d,#c4b5fd);
  --pf-brand-faded:var(--brand-faded-d,rgba(124,58,237,.18));
  --pf-brand-border:var(--brand-border-d,#7c3aed);
}
```

Usos: `--pf-brand` em preenchimento e borda, `--pf-brand-text` em **texto** (1.7),
`--pf-brand-faded` em hover leve (1.10). As duas páginas do módulo usam o
mesmo prefixo `--pf-*`. O fallback roxo aqui dentro de `var()` é normal.

## 5.3 CSS externo: `.btn.primary`, hover roxo e hover do ghost

No `.css` externo de cada página (`cadastro-funcionario.css`, `pesquisa-funcionario.css`):

1. `.btn.primary { color:#fff }` → `color: var(--brand-fg, #fff)` (receita 1.8.1).
2. O hover era `var(--brand-hover, #6d28d9)`. `--brand-hover` e `--brand-hover-d`
   **existem** nas paletas (o header usa os dois em `--btn-home-hover`), então
   o correto é manter o token e trocar só o **fallback** roxo por algo derivado
   da própria marca. No tema escuro o hover nem existia (a regra dark de fundo
   vencia a do hover por especificidade):
```css
.btn.primary:hover{ background:var(--brand-hover, color-mix(in srgb, var(--brand,#7c3aed) 88%, #000)); border-color:var(--brand-hover, color-mix(in srgb, var(--brand,#7c3aed) 88%, #000)); }
html[data-theme="dark"] .btn.primary:hover{ background:var(--brand-hover-d, color-mix(in srgb, var(--brand-d,#7c3aed) 88%, #000)); border-color:var(--brand-hover-d, color-mix(in srgb, var(--brand-d,#7c3aed) 88%, #000)); }
```
   (Nos dois CSS já entregues, o dark usa só o `color-mix`, visualmente
   equivalente; o token `--brand-hover-d` é a forma exata.)
3. `.btn.ghost:hover`/`.btn.secondary:hover` só tinham o par claro
   (`--brand-faded`, `--brand`, `--brand-text`). Adicionar o par escuro
   (`--brand-faded-d`, `--brand-d`, `--brand-text-d`) — é a 1.10.
4. Roxo fixo fora de `var()` que o grep da introdução acha: sombra de foco
   `rgba(124,58,237,.1)` → `color-mix(in srgb, var(--brand) 18%, transparent)`;
   destaque de busca `<mark>` no escuro → `--brand-faded-d`/`--brand-text-d`.

## 5.4 Estados "selecionado" fora do destaque: preenchimento sólido + `--brand-fg`

Botões Sim/Não, itens de checkbox/radio marcados, badge de categoria: o antigo
"marcado" era **texto em cor de marca sobre fundo tingido de marca** — some em
paleta clara (1.7). Padrão: desmarcado = contorno neutro; marcado = fundo de
marca + texto calculado; hover leve com par escuro.

```css
.opcao{ background:transparent; border:1.5px solid var(--border); color:var(--muted); }
.opcao:hover{ background:var(--pf-brand-faded); border-color:var(--pf-brand); color:var(--text); }
.opcao.marcada{ background:var(--pf-brand); border-color:var(--pf-brand); color:var(--brand-fg,#fff); }
.opcao.marcada input[type="checkbox"],
.opcao.marcada input[type="radio"]{ accent-color:var(--brand-fg,#fff); }
```

- Declarar o **hover antes** do `.marcada` (mesma especificidade: o último
  ganha, e o marcado não pode virar "faded" ao passar o mouse).
- `accent-color` do checkbox/radio **dentro** do item marcado precisa ser
  `--brand-fg`; com `--brand` o controle some contra o próprio fundo.
- Sim e Não devem ter **exatamente** o mesmo visual quando marcados (a versão
  antiga só diferenciava um dos dois).

## 5.5 Botões e chips **dentro** do `.card-destaque`

Fundo de marca contra fundo de marca não existe. Dentro do destaque:

```css
/* primário (Próximo/Salvar): véu translúcido + borda cheia + texto calculado */
.card.card-destaque .btn.primary{ background:var(--dest-btn-bg); border:1.5px solid var(--dest-fg); color:var(--dest-fg); font-weight:800; }
.card.card-destaque .btn.primary:hover:not(:disabled){ background:var(--dest-btn-hover); }
/* secundário/ghost (Limpar/Voltar/Cancelar): só contorno */
.card.card-destaque .btn.secondary,.card.card-destaque .btn.ghost{ background:transparent; border:1.5px solid var(--dest-btn-bd); color:var(--dest-fg); }
.card.card-destaque .btn.secondary:hover:not(:disabled),.card.card-destaque .btn.ghost:hover:not(:disabled){ background:var(--dest-btn-hover); border-color:var(--dest-fg); }
/* desabilitado: cinza fixo, igual nos dois temas, sem hover */
.card.card-destaque .btn:disabled,.card.card-destaque .btn:disabled:hover{ background:rgba(128,128,128,.28); border:1.5px solid rgba(128,128,128,.5); color:#6b7280; opacity:1; cursor:not-allowed; filter:none; box-shadow:none; }
```
- O prefixo `.card.card-destaque` (3–4 classes) é o que vence os overrides
  `html[data-theme="dark"] .btn.primary` do CSS da página.
- Um botão que era `.danger` (ex.: "Limpar filtros") e passa a viver no
  destaque vira `.ghost`: o vermelho sólido também briga com a cor de marca.

**Chips marcáveis** (ex.: turnos, que eram `--field-bg` com borda `--brand` no
marcado): dentro do destaque a borda `--brand` **some contra o próprio card**.
Padrão: desmarcado = contorno translúcido; marcado = **preenchimento sólido
`--dest-fg` com o texto na cor do card** (`--btn-home-bg` é a cor do card, e o
par `--dest-fg` × `--btn-home-bg` já tem o contraste calculado):

```css
.card.card-destaque .chip{ background:transparent; border-color:var(--dest-btn-bd); color:var(--dest-fg); }
.card.card-destaque .chip:hover{ background:var(--dest-btn-hover); border-color:var(--dest-fg); color:var(--dest-fg); }
.card.card-destaque .chip.checked{ background:var(--dest-fg); border-color:var(--dest-fg); color:var(--btn-home-bg); }
.card.card-destaque .chip.checked input[type="checkbox"]{ accent-color:var(--btn-home-bg); }
```
- `.checked` **depois** de `:hover` (empate de especificidade).
- **Chip de aviso** ("Sem filtro de turno aplicado."): `--chip-bg` parecia a cor
  do body no claro e a cor do card no escuro. Dentro do destaque usar o véu:
  `background:var(--dest-panel-bg); border:1px solid var(--dest-btn-bd); color:var(--dest-fg);`
- **Escopo do rótulo**: use `.card-destaque .field > label`, não
  `.card-destaque label`. O seletor amplo alcança também os `<label>` **dentro
  dos chips**, que precisam herdar a cor do chip (mesma família do vazamento da 4.2).
- Um `<label>` solto com `style="color:var(--muted)"` no HTML: trocar o valor
  inline por `var(--dest-fg)` (a variável resolve dentro do card).

## 5.6 Stepper / controle segmentado dentro do destaque

Quando o destaque leva um stepper (etapas 1/2), ele perde a caixa própria e
usa o véu. Desenho aprovado:

- **Duas colunas iguais que preenchem o card**: `display:grid; grid-template-columns:1fr 1fr; gap:12px` — o `gap` é a separação, centralizada. Sem linha
  entre etapas (o quadrado já separa). Se o JS mexe na classe do separador
  (`stepSep.classList...`), **mantenha o elemento** com `display:none` em vez
  de apagá-lo (5.1).
- **Etapa ativa** = "square" arredondado na cor do **body** (`--pf-body-bg`),
  com texto normal (`--text`/`--muted`) e o número em `--pf-brand` + `--brand-fg`.
  **Hover** das demais = o mesmo square, translúcido (`--dest-btn-hover`).
```css
:root{ --pf-body-bg:var(--bg,#ffffff); }
html[data-theme="dark"]{ --pf-body-bg:var(--bg,#0a0e1a); }
.step{ padding:8px 18px 8px 10px; border-radius:12px; cursor:pointer; }
.step:hover{ background:var(--dest-btn-hover); }
.step.active,.step.active:hover{ background:var(--pf-body-bg); }
.step.active .step-num{ background:var(--pf-brand); border-color:var(--pf-brand); color:var(--brand-fg,#fff); }
.step.active .step-title{ color:var(--text); } .step.active .step-label{ color:var(--muted); opacity:1; }
```
  `--bg` é o fundo do body (`#f4f3ff` no claro, `#0a0e1a` no escuro).
- **Aviso** de etapa incompleta: sem amarelo (1.9): borda tracejada + ⚠️.
  Escopar como `.step:not(.active) .step-num.aviso`: ao voltar para a etapa 1 a
  classe `.aviso` continua no número, e sem o `:not(.active)` ela vence o
  estilo de ativo (número branco sobre square branco = invisível).

## 5.7 Tooltip (ⓘ) dentro de `<label>`

Dois casos, ambos vistos no cadastro:
- `<label for="anoLetivo">Ano letivo <ⓘ></label>`: sem `event.preventDefault()`
  no `onclick`, o clique focava o campo e o balão fechava na hora (ver 2.2).
- `<label>` de **checkbox**: o clique no ⓘ marcaria/desmarcaria a caixa. Colocar
  o ícone **fora** do label, num `<div style="display:flex;align-items:center">`
  que agrupa `label` + ícone.
- Legenda `.help` que vira tooltip: remover a legenda antiga (2.5). Se o campo
  ficava desalinhado **por causa** da legenda (ex.: checkbox ao lado de um
  select), o alinhamento passa a ser possível: usar um `<label style="visibility:hidden">&nbsp;</label>` de espaçador (esconder no mobile) + `min-height`
  igual à altura do input.

## 5.8 CSS de página que redeclara variável do header

**Sintoma**: o logo do header ("IM") ficou roxo **só numa página e só no tema
escuro**. **Causa**: o `.mark` do header usa `--mark-bg`; o CSS da página
redeclarava `--mark-bg` no `:root` (para o destaque de busca `<mark>`, que nem
usava a variável). O CSS da página carrega **depois** do `header.css` e vence.
No claro o valor coincidia com o do header; no escuro era um roxo fixo.

- Regra: CSS de página **não redeclara variável de header** (`--mark-*`,
  `--btn-home-*`, e qualquer outra que o `header.css`/`header.html` defina).
  Variável própria da página leva prefixo próprio.
- Achar: `grep -n -- "--mark-\|--btn-home" *.css`. Bug que aparece só numa
  página e só num tema quase sempre é colisão de variável. No DevTools, clicar
  no elemento e ler no painel *Styles* qual declaração de `--variável` vence.
- Referência de camadas: o header tem `z-index: 99` (barra de gradiente: 100).
  Modal com `position:fixed` precisa de `z-index` acima disso (usamos `1000`),
  senão o topo dele fica por baixo do header.

## 5.9 Lista de sub-cards desenhada por JS (`pesquisa-funcionario`)

A Parte 4 vale igual; o que muda é que o HTML do item está **num template do JS**:
- **Botões do item** são `.btn small` do sistema (não classes próprias como
  `.btn-edit`/`.btn-view`, que tinham roxo escrito à mão): "Editar" =
  `.btn.secondary`, "Visualizar" = `.btn.neutral` (contorno neutro com hover de
  marca), empilhados com a mesma largura. Botão dentro do item **não** recebe
  o override do destaque (4.1).
- **Badges**: um tingido de marca (cargo) e outro **neutro** para se destacar
  dele (`background: color-mix(in srgb, var(--text) 8%, transparent)`).
  O resto do resumo vira texto separado por `•`, com `white-space:nowrap` em
  cada item para não quebrar no meio.
- Campos secundários (sexo, cor/raça, naturalidade) saem do resumo e ficam só
  na ficha (modal).
- **Contador de resultados**: em vez de badge + log repetindo o número, um
  só badge maior, com fundo `--pf-brand` e texto `--brand-fg`.
- **Estado vazio que explica o motivo**: em vez de "Nenhum resultado", diga
  *por que* (falha de leitura, banco sem funcionários para a escola ativa,
  modo `ADMIN` sem escola escolhida, ano sem cadastros + anos existentes).
  Nesse módulo, "todas as escolas" (`getActiveSchoolId() === 'ADMIN'`) faz
  `DB.*.list()` devolver vazio **sem erro**; a mensagem evita horas de
  diagnóstico. O filtro de ano deve aceitar o campo legado
  (`f.anoLetivo || f.ano`), como o cadastro já fazia.
- Espere a escola ativa existir antes de ler (`Auth.getActiveSchoolId()`) e
  tente uma segunda leitura se a primeira falhar.

## 5.10 Checklist rápido — Parte 5

- [ ] Todo `id` removido do HTML foi conferido contra o JS (5.1), e a página
      sobe HTML + JS + CSS juntos, com `?v=N` atualizado?
- [ ] `ThemeColors.ajustarContraste()` está num `try/catch` isolado (5.1)?
- [ ] `grep -- "--primary"` e o grep de roxo fixo rodados no HTML **e** no `.css` (5.2, 5.3)?
- [ ] `.btn.primary` do CSS externo usa `--brand-fg`; hover sem roxo fixo; hover do ghost com par escuro (5.3)?
- [ ] Estados "marcado" fora do destaque: sólido + `--brand-fg`, `accent-color` ajustado (5.4)?
- [ ] Dentro do destaque: primário translúcido, secundário só contorno, desabilitado cinza, chips marcáveis com `--dest-fg` (5.5)?
- [ ] ⓘ dentro de `<label>` com `preventDefault`, ou fora do label de checkbox (5.7)?
- [ ] `grep -- "--mark-\|--btn-home"` nos CSS de página: nenhuma redeclaração (5.8)?
- [ ] Modal acima do header (`z-index` > 100) (5.8)?

---

# PARTE 6 — Hubs (páginas de menu com cards de navegação)

Visto em `funcionarios.html` (hub do módulo) e no `hub.css`, **compartilhado por
todos os hubs**. Aqui não há card de destaque, tooltip nem tabela.

## 6.1 Badge de acesso restrito mora no `hub.css`

Cards que levam a páginas com restrição de papel (RBAC) ganham
`<span class="card-badge">…</span>`. O estilo é único, no `hub.css`; **cada hub
só troca o texto** (ex.: "Admin", "Admin/Gestor"). O visual antigo era fundo
`--brand-faded` + texto `--brand` (baixo contraste em paletas claras). Agora:

```css
.card-badge{ background:var(--brand); color:var(--brand-fg,#fff); /* …resto igual */ }
html[data-theme="dark"] .card-badge{ background:var(--brand-d); color:var(--brand-fg,#fff); }
```

Como o arquivo é compartilhado, a mudança vale para **todos** os hubs de uma vez.

## 6.2 Bloqueio por papel no hub (só interface)

O hub esconde o link e mostra "Sem acesso" para quem não pode. Isso é **apenas
interface**: a barreira real precisa estar nas regras do servidor/Firestore
(nas páginas do módulo não há checagem de papel no cliente).

```js
var ROLES_PERMITIDOS = ['admin', 'gestor'];   // só o usuário comum fica de fora
['cardCadastroFunc', 'cardPesquisaFunc'].forEach(function (id) {
  var card = document.getElementById(id);
  if (card && ROLES_PERMITIDOS.indexOf(role) === -1) {
    card.removeAttribute('href'); card.classList.add('disabled');
    card.setAttribute('data-tooltip', 'Sem acesso');
  }
});
```
O texto do badge deve refletir a lista real de papéis; conferir o valor exato
do papel gravado na sessão (aqui assumido `gestor`, minúsculo).

## 6.3 Outros pontos do `hub.css` e do bloco de tooltip "Sem acesso"

- `.card:hover .card-title` usava `--brand` como cor de **texto** (1.7):
  agora `--brand-text` (claro) e `--brand-text-d` (escuro).
- O bloco de script que cria o balão "Sem acesso" (repetido no HTML de cada
  hub) pintava o texto com `#fff` fixo sobre `--brand`. Corrigido em
  `funcionarios.html` lendo `--brand-fg`, com o valor antigo como fallback:
```js
var fg = getComputedStyle(document.documentElement).getPropertyValue('--brand-fg').trim();
b.style.color = fg || (bc.dark ? '#f0f0f8' : '#ffffff');
```
  **Replicar nos demais hubs** que tenham esse bloco (idealmente, extrair
  para um arquivo compartilhado).

## 6.4 Checklist rápido — Parte 6

- [ ] Hub com página restrita tem o `<span class="card-badge">` no card, com o texto certo?
- [ ] A lista de papéis do script bate com o texto do badge?
- [ ] O balão "Sem acesso" do hub usa `--brand-fg`?

---

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

**Parte 4 — lista de sub-cards dentro de card de destaque:**
1. Antes de escrever `.card-destaque .btn`/qualquer override de botão
   genérico, confere se ele alcançaria também os botões de dentro dos
   itens da lista (já sobre fundo neutro próprio) — se sim, escopa pra
   fora deles.
2. Toda regra `.card-destaque X { color: var(--dest-fg) ... }` precisa de
   uma exceção `.card-destaque .item X { color: var(--normal-da-página); }`
   pro mesmo seletor, senão o texto de dentro dos itens fica com a cor do
   fundo colorido (certo só por coincidência de tema × paleta).
3. Testar com paleta clara **e** escura, nos dois temas — o bug da Parte 4
   é combinatório, não aparece igual em todo mundo.

**Parte 5 — páginas antigas com CSS/JS próprio:**
1. Conferir os `id`s removidos contra o JS; subir HTML + JS + CSS juntos com `?v=N`;
   `ajustarContraste()` sempre em `try/catch` isolado.
2. `grep -- "--primary"` (não existe no sistema) e trocar pelos aliases
   `--pf-*`; receita 1.8.1 também no `.css` externo.
3. "Marcado" fora do destaque = sólido + `--brand-fg`; dentro do destaque =
   `--dest-fg` sólido com texto `--btn-home-bg`; ⓘ em `<label>` com `preventDefault`.
4. CSS de página **nunca** redeclara variável do header (`--mark-*`, `--btn-home-*`).

**Parte 6 — hubs:**
1. Badge de acesso restrito é estilo do `hub.css`; o hub só troca o texto.
2. Lista de papéis do script e texto do badge precisam bater; o bloqueio real é no servidor.

---

# Páginas já adequadas (status)

| Página | Parte 1 (contraste) | Parte 2 (tooltip) | Parte 3 (tabela) | Parte 4 (lista de sub-cards) | Observação |
|---|---|---|---|---|---|
| `historico-aluno.html` | ✅ original | ✅ original | — | — | Referência-base do guia inteiro. |
| `gestao-atas.html` | ✅ religado ao central | ✅ | — | — | Card de destaque já existia, só a função de contraste era duplicada. |
| `pesquisa-ata.html` | ✅ | ✅ (corrigido) | — | — | Bug de tokens do balão (fundo transparente) corrigido depois de já publicado — motivou a seção 2.1.1. |
| `schema_ata.html` | ✅ **criado do zero** (2 cards) | ✅ (10 ícones) | ✅ **novo, motivou a Parte 3** | — | Página mais completa como referência: cards de destaque inéditos, botões por variante, tabela inteira dentro de um deles. |
| `cadastro-turmas.html` | ✅ **criado do zero**, card escolhido é o de listagem, não o de ação (ver 1.6) | ✅ (6 ícones + legendas antigas removidas) | — | ✅ **novo, motivou a Parte 4** | Dois cards lado a lado; bug de `--brand-d` puro em texto (1.7) e de `--dest-fg` vazando pra lista de itens (4.2); achado à parte, sem relação com a migração: roxo fixo herdado em `.btn.ghost/.secondary` hover no tema escuro. |
| `cadastro-funcionario.html` | ✅ **criado do zero** (2 cards: topo com ano letivo + stepper; rodapé com as ações) | ✅ (5 ícones; legendas `.help` removidas) | — | — | Página nunca repaginada (Parte 5). Stepper no destaque (5.6), chips e botões dentro do destaque (5.5), estados marcados (5.4), ⓘ em label (5.7). |
| `pesquisa-funcionario.html/.js/.css` | ✅ **criado do zero** (card de filtros) | ✅ (1 ícone, texto adaptado à pesquisa) | — | ✅ lista de sub-cards desenhada por JS (5.9) | Colisão de `--mark-bg` com o logo do header (5.8). Elementos removidos que o JS usava (5.1). Estado vazio com diagnóstico. |
| `funcionarios.html` (hub) | — não se aplica | — | — | — | Badge "Admin/Gestor" nos dois cards; papéis `admin` e `gestor` (Parte 6). |
| `cadastro-atas.html` | ✅ **criado do zero** (1º card: dados da escola + selects) | ✅ (4 ícones: Turma, Nome do aluno, Scans de documentos, título Alunos; legenda `.help` removida) | — | — | Card "Scans" renomeado para "Scans de documentos"; aviso sem amarelo (1.9); hover escuro da drop-zone (1.10). |

## Status das seções 1.8 → 1.11, por página

| Página | 1.8 `--brand-fg` | 1.9 aviso sem amarelo | 1.10 hover com par escuro | 1.11 mapa de hex duplicado | Observação |
|---|---|---|---|---|---|
| `components.css` (global) | ✅ 3 regras | — | — | — | `.btn.primary`, `.btn-primary`, `[data-theme=dark] .btn-gray:hover`. |
| `cadastro-atas.html` | ✅ herda do global | ✅ | ✅ `.scans-drop` | — | Referência das seções 1.9 e 1.10. |
| `pesquisa-ata.html` | ✅ override dark | — não se aplica | ✅ verificado pelo usuário | — | Sem aviso dentro de card (usa toast). |
| `gestao-atas.html` | ✅ `a.btn.btn-primary` | — não se aplica | ✅ verificado pelo usuário | — | Sem aviso dentro de card (usa toast). |
| `cadastro-turmas.html` | ✅ `.btn.primary` base | — não se aplica | ✅ verificado pelo usuário | — | Botões `.btn.outline` (Adicionar/Editar) conferidos pelo usuário: ok. |
| `historico-aluno.html` | ✅ bloco reforçado | — não se aplica | ✅ verificado pelo usuário | — | Sem aviso dentro de card (usa toast). |
| `schema_ata.html` | — fora | — não recebe a adequação | — | — | Única página com aviso dentro de card em vez de toast; por decisão do usuário não recebe a 1.9. Não usa botão com fundo de marca. |
| `cadastro-funcionario.html/.css` | ✅ `.btn.primary` no CSS externo; Próximo/Salvar no destaque via `--dest-fg` | ✅ aviso do stepper sem amarelo | ✅ hover do ghost com par escuro | — | `--primary` (inexistente) trocado por `--pf-*` (5.2). |
| `pesquisa-funcionario.html/.css` | ✅ `.btn.primary`, `.selo-selecionado`, hover do `.sort-control` | — não tem aviso em card | ✅ hover do ghost e `.btn.neutral` | — | `--mark-bg` removido do `:root` (5.8); `<mark>` no escuro sem roxo fixo. |
| `hub.css` (global dos hubs) | ✅ `.card-badge` com `--brand-fg` | — | ✅ título do card no hover com `--brand-text`/`-d` | — | Vale para todos os hubs (Parte 6). |
| `funcionarios.html` (hub) | ✅ balão "Sem acesso" com `--brand-fg` | — | — | — | Replicar o balão nos outros hubs. |
| `perfil.html` | — | — | — | ✅ corrigido | `swatchColors` local removido; lê `ThemeColors.palettes[key]['--brand']`. Achado ao trocar Branco→Tan. |

**Decisões do usuário que fecharam pendências antigas:**
- `.btn.outline:hover` em `cadastro-turmas.html` e `.btn-gray:hover` local em
  `cadastro-atas.html`: **não precisam de correção** — botões conferidos e ok.
- Seções 1.9 e 1.10 nas outras páginas do módulo: **não se aplicam**. A única
  página com aviso dentro de card (em vez de toast) é `schema_ata.html`, que
  justamente não recebe essa adequação; os hovers com `--brand-faded` foram
  conferidos pelo usuário.

**Pendências abertas:**
- **Fora do módulo de atas**, a receita da 1.8.1 (`--brand-fg`) e o grep da 1.11
  foram feitos apenas nas duas páginas do módulo de funcionários, no hub dele e
  no `hub.css`. Falta rodar nas demais páginas antes de considerar o Tan seguro
  em produção.
- **Greps novos, em todas as páginas e CSS do sistema:**
  `grep -n -- "--primary"` (5.2) e `grep -n -- "--mark-\|--btn-home" *.css` (5.8).
- **Bloco do balão "Sem acesso"** dos demais hubs: aplicar a leitura de
  `--brand-fg` (6.3) ou extrair para um arquivo compartilhado.
- `exportacao-funcionarios.js`: conferir se ele lê algum elemento removido da
  pesquisa (`lblAnoAtivo`, `statExib`, `subResultados`, `statsRow`); não foi enviado.
- Os dois CSS do módulo usam `color-mix` no hover **escuro** do `.btn.primary`;
  o token exato é `--brand-hover-d` (5.3).
