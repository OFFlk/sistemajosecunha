# Guia — adequar páginas ao `theme-colors.js` + ícone de dica (ⓘ) inline

Documento de referência pra qualquer chat que for aplicar, no restante das
páginas do sistema, duas mudanças já feitas e testadas em
`historico-aluno.html`:

- **Parte 1** — ligar o card de destaque da página ao contraste
  centralizado em `theme-colors.js` (em vez de calcular localmente).
- **Parte 2** — adicionar o ícone de dica (ⓘ) com tooltip por
  toque/clique, no padrão já aprovado.

Sempre que possível, compare com os arquivos reais já migrados
(`historico-aluno.html` + `theme-colors.js`) em vez de confiar só neste
guia de memória. `gestao-atas.html` também já foi migrado (Parte 1 e 2) e
serve de segunda referência — inclusive pro ponto do aviso abaixo, porque
foi a página onde ele foi checado preventivamente.

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
> de copiar o CSS da Parte 2.

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

Página com um card que usa a cor de marca como fundo, mas hoje não ajusta
contraste dinamicamente.

1. Confirmar que `theme-colors.js` está carregado no `<head>`, antes de
   qualquer CSS de cor: `<script src="../theme-colors.js"></script>`.
   **Sempre um nível (`../`)** — o projeto não tem pasta dentro de pasta,
   então nunca é `../../`.
2. Confirmar que o CSS de `.card-destaque.contraste-claro` existe. Se não
   existir, copiar/adaptar de `historico-aluno.html`.
3. Adicionar, no `init()`/boot, depois que o elemento já está no DOM:

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
- [ ] CSS de `.card-destaque.contraste-claro` existe e cobre texto,
      ícones e botões daquele card?
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
```

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

# Resumo rápido (cola e usa)

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
   só os três nomes de variável do balão ajustados se necessário.
3. Cola o HTML do ícone ao lado do campo/rótulo certo (de preferência
   dentro de um elemento que já tem cor de texto resolvida pro card),
   troca só o texto da dica.
4. Garante o listener de "fechar ao clicar fora" uma vez por página.
