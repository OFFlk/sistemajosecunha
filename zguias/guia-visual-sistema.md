# Guia do visual do sistema (v2)

> **Leia este guia ANTES de mexer no visual de qualquer página.**
> Ele substitui o CSS que os guias antigos mandavam colar inline em cada página
> (`guia-toasts.md` seção 3, `guia-migracao-contraste-theme-colors.md` partes 1, 2, 5 e 7).
> Aqueles guias continuam valendo para a **lógica** (JS, regras de negócio, Firestore).
> Para o **CSS**, a fonte da verdade agora são os arquivos globais. Ver seção 17.

Referências de arquivo: `base.css`, `components.css`, `hub.css` (alterados),
`header.css` (**não alterar por enquanto**) e `theme-colors.js`.

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
- Variável própria da página leva **prefixo da página** (`--cad-*`, `--pf-*` só em páginas antigas).
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
| `.btn.primary` | preenchimento de marca | **a** ação principal da área (uma por área) |
| `.btn.secondary` | chip (fundo e borda de chip) | ação secundária. `.ghost` é alias aceito |
| `.btn.outline` | contorno de marca, sem fundo | ação alternativa com ênfase de marca |
| `.btn.neutral` | contorno neutro, sem fundo | voltar, limpar, ações discretas |
| `.btn.quiet` | sem borda nem fundo até o hover | ação terciária, ícone-botão |
| `.btn.danger` | vermelho **translúcido** | ação destrutiva |
| `.btn.success` | verde | aprovar, confirmar positivo |
| `.btn.cancel` | neutro com texto apagado | cancelar |
| `.btn.small` (modificador) | tamanho menor | botão em linha de tabela, em item de lista |

Estados já inclusos: hover, `:active`, `:focus-visible`, `:disabled` e `[aria-disabled="true"]`.

### 3.2 Tabela de troca de classes

| Classe antiga | Classe nova | Observação |
|---|---|---|
| `btn btn-primary`, `btn primary` | `btn primary` | |
| `btn-gray`, `btn ghost`, `btn secondary` | `btn secondary` | `btn-gray` não é cinza: era de marca |
| `btn-ghost` (transparente) | `btn quiet` | **não** confundir com `btn ghost` (chip) |
| `btn-outline` | `btn outline` | |
| `btn outline` do cadastro (era neutro: fundo de card, borda cinza) | `btn neutral` | conferir o visual da página original |
| `btn-danger`, `btn danger`, `btn ldanger`, `btn-danger-sm` | `btn danger` | o vermelho **sólido** do global antigo deixa de existir |
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

Tokens disponíveis: `--btn-bg`, `--btn-bd`, `--btn-fg` e as versões de hover `--btn-bg-h`, `--btn-bd-h`, `--btn-fg-h`.

### 3.5 Dentro do card de destaque

O `components.css` já reatribui os tokens para botões soltos no fundo do destaque
(primário translúcido, os demais só contorno, perigo vermelho-escuro, desabilitado cinza).
**A página não escreve nada.** Ficam de fora, de propósito, botões dentro de `table` e de `.item`
(sub-card), que já têm fundo neutro próprio.

---

## 4. Card e card de destaque

### 4.1 Card

`.card` dá fundo, borda, sombra, raio e padding. A página decide tamanho, posição e orientação.

```css
/* certo: ajuste por variável */
.card-compacto{ --card-pad:12px; --card-gap:10px; }
.card-quadrado{ --card-radius:8px; }

/* errado: repintar */
.card{ background:#fff; border:1px solid #ddd; }
```

`--card-pad` (padrão 18px), `--card-radius` (14px), `--card-gap` (margem inferior, 16px).
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

> Inputs que **não** estão dentro de `.field` (por exemplo `.card select`, `.card input[type="text"]`)
> **não** são cobertos hoje. Veja a decisão D6 (seção 16) antes de apagar essas regras da página.

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
ancestral corta o balão; `.wide` para texto longo; `.align-right` perto da borda direita.

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
| Carregando | azul | `"loading"` |
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
  loading: { cls:'toast-loading', ms:8000 },
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
  setTimeout(() => { if(toast.isConnected) toast.remove(); }, cfg.ms);
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

Uso: `const sim = await _confirmModal({ titulo:'Apagar?', corpo:'Não dá para desfazer.', corDestaque:'danger' }); if(!sim) return;`.
Regra prática: decisão do usuário (sim/não) → `_confirmModal`; informação → `setMsg`.
`confirm()`, `prompt()` e `alert()` nativos não devem sobrar (exceto `alert()` antes de redirecionar por acesso negado).

Outras regras do guia de toasts que continuam: `refresh()`/`renderMeta()` não dispara toast de "Carregando…"
(trocaria o toast de sucesso que acabou de aparecer); todo `catch` de ação tem `console.error` com contexto.

---

## 9. Modais "grandes"

Cada modal do sistema é único (tabela, três botões em colunas, só mensagem). Por isso o global dá só o
**esqueleto**; o conteúdo é da página.

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
```

- Abrir/fechar: `backdrop.classList.add('open')` / `remove('open')`. Abrir com `style.display='flex'` também funciona, mas prefira a classe.
- `z-index` do backdrop é 1000 (acima do header, que usa 99/100). **Não** declare outro na página.
- `.modal-foot` é opcional.

---

## 10. Tabelas (**em aberto**, ver D1)

O global ainda tem `table`, `th`, `td` como seletores de elemento (texto **centralizado**, borda em todas as células).
Várias páginas usam outro desenho (alinhado à esquerda, só borda inferior, cabeçalho fixo).
**Até a decisão D1:** não apague regras de tabela do `<style>` da página e não crie regra nova de aparência global.
Regras que continuam: sem `overflow:hidden` no `<table>`, sem `display:flex` em `<td>`.

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
Dark manual só para cor fixa de status (verde/vermelho/âmbar).

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
- Mensagens de status com cor fixa (`.cep-status`, `.docs-status`, `.badge-completude`, `.help.ok/.err`, `.warn`, `.ok-msg`): três famílias com o mesmo desenho de status (ok/erro/carregando). **Candidatas a componente global** (D3). Até lá, ficam na página.

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
| **D. Candidato a global** | status chips, `.pill`/`.chip`/`.count` | manter e registrar |
| **E. Dúvida** | qualquer coisa que não encaixa | perguntar |

### 14.3 Ordem de edição

1. Trocar tokens (tabela 2.2) em `<style>`, **em JS e em templates**. Só então apagar o `:root` local.
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
`.pill`, `.chip`, `.chips`, `.count`, `.badge` (versão neutra, **diferente** do `.badge` global, ver D2), `.help`, `.warn`, `.ok-msg`, `.cep-status`/`.docs-status`/`.badge-completude`, tabela (D1), `.card select, .card input[type=...]` (D6).

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
| D1 | Tabela: centralizado + borda total (global) × alinhado à esquerda + borda inferior (cadastro) | esquerda como padrão, centralizado como opção | manter a tabela como está na página |
| D2 | `.badge` do global (tingido de marca) × `.badge` do cadastro (neutro). `.pill`, `.chip`, `.count` só existem em páginas | `.badge` neutro + `.badge.brand`; `.pill/.chip/.count` no global | manter local; não usar `.badge` global em página que redefine |
| D3 | Chips de status (ok/erro/carregando/aviso) repetidos em 3 famílias | componente `.status.ok/.err/.loading/.warn` | manter local |
| D4 | `header.css` tem `#fff` fixo em `.btn-home` e `.theme-toggle:hover` (ilegível na paleta Tan) | trocar por `var(--brand-fg, #fff)` ao reformular o header | não mexer no header |
| D5 | `.panel` × `.card` | trocar `panel` por `card` | trocar a classe no HTML |
| D6 | Inputs fora de `.field` (`.card select`, `.card input[type=text]`) e `label`, `h2`, `h3`, placeholder escuro como regras globais | cobrir em `components.css` (campos) e `base.css` (tipografia) | manter local |
| D7 | Cores âmbar fixas (banner de edição, semilock) | token `--ui-warn-*` | manter local |
| D8 | `--card-bg`/`--card-border` duplicados em `hub.css` | remover do hub após confirmar `base.css` em todos os hubs | manter |

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
