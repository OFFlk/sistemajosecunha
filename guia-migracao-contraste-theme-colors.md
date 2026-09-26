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
guia de memória.

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
  width:min(260px, 70vw); padding:10px 12px; border-radius:10px;
  background:var(--card); border:1.5px solid var(--border); color:var(--text);
  box-shadow:0 8px 24px rgba(0,0,0,.18); font-size:13px; font-weight:400; line-height:1.4;
  white-space:normal; cursor:default;
}
.info-tip.open .info-tip-bubble{ display:block; }
```

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
1. Cola o bloco de CSS (`.info-tip`/`.info-tip-bubble`) sem alterar.
2. Cola o HTML do ícone ao lado do campo/rótulo certo, troca só o texto
   da dica.
3. Garante o listener de "fechar ao clicar fora" uma vez por página.
